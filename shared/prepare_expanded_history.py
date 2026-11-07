"""Reproducible same-pass Sentinel-2 mosaics; keeps the real georeferencing of every tile.

Requires rasterio, numpy and Pillow. STAC responses and reprojected bands are cached
outside the repository. RGB and NDVI always use the same source item per pixel.
"""
import argparse,datetime,hashlib,json,math,re,sys,time,urllib.parse,urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--geo-libs',type=Path)
parser.add_argument('--cache',type=Path,required=True)
parser.add_argument('--region',choices=['silesia','kozienice','all'],default='all')
args=parser.parse_args()
if args.geo_libs:sys.path.insert(0,str(args.geo_libs))
import numpy as np
import rasterio
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from affine import Affine
from rasterio.warp import transform_bounds,reproject,Resampling
from PIL import Image

root=Path(__file__).resolve().parents[1];args.cache.mkdir(parents=True,exist_ok=True)
configs={'silesia':([17.8,49.75,19.6,50.75],'05-electricity-vegetation','scenes.json',''),
         'kozienice':([20.75,51.15,22.25,52.05],'03-insar-multisensor-v2','imagery-history.json','history/')}
points=[(18.457,50.415),(18.544,50.318),(18.558,50.253),(18.524,50.179),(18.461,50.104)]

def query_items(region,year,day,bbox):
 dest=args.cache/f'{region}-{year}-items.json'
 if not dest.exists():
  query={'collections':'sentinel-2-l2a','bbox':','.join(map(str,bbox)),'datetime':day+'T00:00:00Z/'+day+'T23:59:59Z','limit':100}
  with urllib.request.urlopen('https://earth-search.aws.element84.com/v1/search?'+urllib.parse.urlencode(query),timeout=90) as r:data=json.load(r)
  if data.get('links') and any(x.get('rel')=='next' for x in data['links']):raise RuntimeError('Unexpected paginated day; expand query implementation')
  dest.write_text(json.dumps(data),encoding='utf-8')
 return json.loads(dest.read_text(encoding='utf-8'))['features']

def relative_orbit(f):
 value=f['properties'].get('sat:relative_orbit')
 if value is not None:return int(value)
 match=re.search(r'_R(\d{3})_',f['properties'].get('s2:product_uri',''))
 if not match:raise RuntimeError('Missing orbit provenance: '+f['id'])
 return int(match.group(1))

def pass_key(f):return f['properties']['s2:datatake_id'].split('_N')[0]

def select_items(items,primary,bbox):
 first=next(f for f in items if f['id']==primary)
 # Same spacecraft and orbit; no temporal best-pixel composite across different days.
 candidates=[f for f in items if f['id'].split('_')[0]==primary.split('_')[0] and relative_orbit(f)==relative_orbit(first) and pass_key(f)==pass_key(first)]
 unique={}
 for f in candidates:
  tile=f['id'].split('_')[1]
  if tile not in unique or f['properties']['eo:cloud_cover']<unique[tile]['properties']['eo:cloud_cover']:unique[tile]=f
 unique[primary.split('_')[1]]=first
 masks={f['id']:rasterize([(f['geometry'],1)],out_shape=(512,512),transform=from_bounds(*bbox,512,512),dtype='uint8').astype(bool) for f in unique.values()}
 ordered=[first];covered=masks[first['id']].copy();remaining=[f for f in unique.values() if f['id']!=primary]
 while remaining:
  remaining.sort(key=lambda f:(-np.count_nonzero(masks[f['id']]&~covered),f['properties']['eo:cloud_cover'],f['id']))
  f=remaining.pop(0);ordered.append(f);covered|=masks[f['id']]
 # Include all intersecting same-pass tiles: real masks can differ at the footprint edge.
 if not covered.all():raise RuntimeError(f'Incomplete geometric coverage {covered.mean():.5f}: {primary}')
 return ordered

def asset_array(item,key,bands,method,merc,width,height):
 href=item['assets'][key]['href']
 signature='window-v2'+href+str(bands)+str(method)+str(merc)+str(width)+str(height)
 cache=args.cache/(hashlib.sha256(signature.encode()).hexdigest()+'.npy')
 if cache.exists():return np.load(cache)
 # Reuse a previously completed finer grid at identical bounds when available.
 finer_h=round(4096*(merc[3]-merc[1])/(merc[2]-merc[0]))
 finer=args.cache/(hashlib.sha256(('window-v2'+href+str(bands)+str(method)+str(merc)+str(4096)+str(finer_h)).encode()).hexdigest()+'.npy')
 if width<4096 and finer.exists():
  old=np.load(finer);data=np.stack([np.array(Image.fromarray(b).resize((width,height),Image.Resampling.NEAREST if method==Resampling.nearest else Image.Resampling.BILINEAR)) for b in old]);np.save(cache,data);return data
 with rasterio.Env(GDAL_HTTP_MAX_RETRY=2,GDAL_HTTP_RETRY_DELAY=2,GDAL_HTTP_TIMEOUT=60,GDAL_HTTP_CONNECTTIMEOUT=15,GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',GDAL_CACHEMAX=134217728,CPL_VSIL_CURL_CHUNK_SIZE=8388608,CPL_VSIL_CURL_CACHE_SIZE=134217728):
  with rasterio.open(href) as src:
   bb=transform_bounds('EPSG:3857',src.crs,*merc,densify_pts=21)
   win=rasterio.windows.from_bounds(*bb,transform=src.transform).intersection(rasterio.windows.Window(0,0,src.width,src.height))
   # Read source overviews before reprojection, avoiding native-resolution remote warps.
   target_m=(merc[2]-merc[0])/width*math.cos(math.atan(math.sinh((merc[1]+merc[3])/2/6378137)))
   w=max(1,math.ceil(win.width*abs(src.transform.a)/target_m));h=max(1,math.ceil(win.height*abs(src.transform.e)/target_m))
   sampled=src.read(bands,window=win,out_shape=(len(bands),h,w),out_dtype='float32',resampling=method)
   sampled_transform=src.window_transform(win)*Affine.scale(win.width/w,win.height/h)
   data=np.zeros((len(bands),height,width),dtype=np.float32)
   for k in range(len(bands)):
    reproject(sampled[k],data[k],src_transform=sampled_transform,src_crs=src.crs,dst_transform=from_bounds(*merc,width,height),dst_crs='EPSG:3857',src_nodata=0,dst_nodata=0,resampling=method)
   if key in ['visual','scl']:data=np.clip(data,0,255).astype(np.uint8)
 np.save(cache,data)
 return data

def scene_source(f):
 return {'id':f['id'],'date':f['properties']['datetime'],'cloud_scene_percent':f['properties']['eo:cloud_cover'],
         'url':f'https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/{f["id"]}',
         'geometry':f['geometry'],'bbox':f['bbox'],'relative_orbit':relative_orbit(f),'datatake_id':f['properties']['s2:datatake_id'],'product_uri':f['properties']['s2:product_uri'],
         'boa_offset_applied':f['properties'].get('earthsearch:boa_offset_applied'),
         'assets':{key:f['assets'][key]['href'] for key in ['visual','red','nir','scl']},
         'applied_offsets':{key:0 if f['properties'].get('earthsearch:boa_offset_applied',False) else f['assets'][key].get('raster:bands',[{}])[0].get('offset',0) for key in ['red','nir']}}

for region,(bbox,folder,filename,prefix) in configs.items():
 if args.region not in [region,'all']:continue
 assets=root/'demos'/folder/'assets';meta_path=assets/filename
 backup=args.cache/f'{region}-original-metadata.json'
 if not backup.exists():backup.write_bytes(meta_path.read_bytes())
 original=json.loads(backup.read_text(encoding='utf-8'))
 width=3072;merc=transform_bounds('EPSG:4326','EPSG:3857',*bbox);height=round(width*(merc[3]-merc[1])/(merc[2]-merc[0]))
 pixel_m=(merc[2]-merc[0])/width*math.cos(math.radians((bbox[1]+bbox[3])/2))
 scenes=[]
 for old in original['scenes']:
  items=select_items(query_items(region,old['year'],old['date'][:10],bbox),old['id'],bbox)
  print(region,old['year'],'mosaic',width,height,'tiles',len(items),flush=True)
  image=np.zeros((3,height,width),dtype=np.uint8);index=np.zeros((height,width),dtype=np.uint8);used=np.zeros((height,width),dtype=bool)
  ndvi_all=np.zeros((height,width),dtype=np.float32);valid_all=np.zeros((height,width),dtype=bool);sources=[]
  for f in items:
   if used.all():break
   start=time.time();print(' reading',f['id'],flush=True)
   specs=[('visual',[1,2,3],Resampling.bilinear),('scl',[1],Resampling.nearest),('red',[1],Resampling.bilinear),('nir',[1],Resampling.bilinear)]
   with ThreadPoolExecutor(max_workers=4) as pool:
    arrays=list(pool.map(lambda spec:asset_array(f,*spec,merc,width,height),specs))
   rgb,scl=arrays[0],arrays[1][0]
   # SCL 0 is nodata; genuinely dark RGB (e.g. water) is still valid imagery.
   take=(scl>0)&~used
   if not take.any():continue
   reflectance=[]
   source=scene_source(f)
   for key in ['red','nir']:
    raw=arrays[['red','nir'].index(key)+2][0]
    spec=f['assets'][key].get('raster:bands',[{}])[0]
    reflectance.append(raw*spec.get('scale',.0001)+source['applied_offsets'][key])
   red,nir=reflectance;total=nir+red
   valid=np.isin(scl,[4,5,6])&(red>0)&(nir>0)&(total>0)
   ndvi=np.divide(nir-red,total,out=np.zeros_like(total),where=total>0)
   image[:,take]=rgb[:,take];used|=take;valid_all[take]=valid[take];ndvi_all[take]=ndvi[take]
   indices=(np.clip(ndvi+.1,0,1)*254).astype(np.uint8)+1
   index[take&valid]=indices[take&valid]
   source['output_pixel_count']=int(take.sum());sources.append(source)
   print(' ',f['id'],'pixels',source['output_pixel_count'],'covered',round(float(used.mean()),6),'seconds',round(time.time()-start,1),flush=True)
  if used.mean()<.9999:raise RuntimeError(f'Incomplete raster coverage: {region} {old["year"]}: {used.mean():.6f}')
  rgb_name=prefix+f'expanded-sentinel-{old["year"]}.jpg';ndvi_name=prefix+f'expanded-ndvi-{old["year"]}.png'
  Image.fromarray(image.transpose(1,2,0)).save(assets/rgb_name,quality=89,optimize=True)
  # Indexed colours preserve transparency while keeping regional NDVI downloads compact.
  palette=[0,0,0]
  for i in range(1,256):
   v=(i-1)/254;palette.extend([round(210*(1-v)+20),round(100+v*90),round(65-v*30)])
  pal=Image.fromarray(index,mode='P');pal.putpalette(palette);pal.info['transparency']=bytes([0]+[220]*255);pal.save(assets/ndvi_name,optimize=True)
  scene={**old,'rgb':rgb_name,'ndvi':ndvi_name,'mosaic':True,'sources':sources,'coverage_fraction':float(used.mean()),'nodata_pixel_count':int((~used).sum()),'valid_fraction':round(float(valid_all.mean()),6),'native_pixel_m':10}
  if region=='silesia':
   stats=[];transform=from_bounds(*merc,width,height);radius=round(160/pixel_m)
   for lon,lat in points:
    x=6378137*math.radians(lon);y=6378137*math.log(math.tan(math.pi/4+math.radians(lat)/2));col,row=~transform*(x,y);row=int(row);col=int(col)
    mask=valid_all[row-radius:row+radius+1,col-radius:col+radius+1];values=ndvi_all[row-radius:row+radius+1,col-radius:col+radius+1][mask]
    stats.append({'ndvi':round(float(np.median(values)),3) if len(values) else None,'validPixels':int(mask.sum()),'totalPixels':int(mask.size)})
   scene['points']=stats
  scenes.append(scene)
  del image,index,used,ndvi_all,valid_all
 meta={**original,'bbox':bbox,'previous_bbox':original.get('previous_bbox',original['bbox']),'width':width,'height':height,'projection':'EPSG:3857','approx_ground_pixel_m':round(pixel_m,1),
       'provider':'Copernicus Sentinel-2 L2A / Earth Search / Element 84','collection':'sentinel-2-l2a','retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
       'selection':'Same calendar day, spacecraft and relative orbit as each original reference scene. Adjacent MGRS tiles extend coverage. First non-nodata pixel in documented tile order; no temporal composite.',
       'coverage_definition':'Source SCL != 0; true black RGB is not treated as missing data.',
       'ndvi_method':'(B08-B04)/(B08+B04), STAC scale and per-item offset respecting earthsearch:boa_offset_applied. Bilinear RGB/reflectance; nearest SCL; classes 4,5,6 only. RGB and NDVI use the same source item per pixel.',
       'date_note':'Dates are independent of current GIS, GUGiK mosaics, InSAR epochs and flood scenarios. Cloud percentages describe individual source tiles, not the full mosaic.',
       'scenes':scenes}
 meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
 print('READY',region,'bbox',bbox,'pixel_m',round(pixel_m,1),flush=True)
