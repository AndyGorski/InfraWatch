"""Prepare real Sentinel-2 history for Kozienice from Earth Search COG assets."""
import sys,os,json,math,urllib.request,datetime,argparse,hashlib
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--geo-libs',type=Path)
parser.add_argument('--cache',type=Path,required=True)
args=parser.parse_args()
if args.geo_libs:sys.path.insert(0,str(args.geo_libs))
import rasterio
import numpy as np
from affine import Affine
from rasterio.warp import transform_bounds,reproject,Resampling
from PIL import Image

root=Path(__file__).resolve().parent
out=root/'assets/history';out.mkdir(parents=True,exist_ok=True)
args.cache.mkdir(parents=True,exist_ok=True)
bbox=[21.24,51.48,21.86,51.78]
width=1440
merc=transform_bounds('EPSG:4326','EPSG:3857',*bbox)
height=round(width*(merc[3]-merc[1])/(merc[2]-merc[0]))
dst_transform=rasterio.transform.from_bounds(*merc,width,height)
def request(body):
 req=urllib.request.Request('https://earth-search.aws.element84.com/v1/search',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','User-Agent':'InfraWatch-demo/1.0'})
 with urllib.request.urlopen(req,timeout=90) as response:return json.load(response)
def read_asset(href,bands,method):
 cache=args.cache/(hashlib.sha256((href+str(bands)+str(method)+str(width)+str(bbox)).encode()).hexdigest()+'.npy')
 if cache.exists():return np.load(cache)
 dest=np.zeros((len(bands),height,width),dtype=np.float32)
 with rasterio.Env(GDAL_HTTP_MAX_RETRY=3,GDAL_HTTP_RETRY_DELAY=2,GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR'):
  with rasterio.open(href) as src:
   bb=transform_bounds('EPSG:3857',src.crs,*merc,densify_pts=21)
   win=rasterio.windows.from_bounds(*bb,transform=src.transform).round_offsets().round_lengths()
   data=src.read(bands,window=win,out_shape=(len(bands),height,width),boundless=True,resampling=method)
   src_transform=src.window_transform(win)*Affine.scale(win.width/width,win.height/height)
   for i in range(len(bands)):
    reproject(data[i],dest[i],src_transform=src_transform,src_crs=src.crs,dst_transform=dst_transform,dst_crs='EPSG:3857',resampling=method)
 np.save(cache,dest)
 return dest
scenes=[]
def inside_ring(ring,point):
 x,y=point;inside=False
 for a,b in zip(ring,ring[1:]+ring[:1]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:inside=not inside
 return inside
def covers_aoi(feature):
 geometry=feature['geometry']
 polygons=[geometry['coordinates']] if geometry['type']=='Polygon' else geometry['coordinates']
 sample=[(x,y) for x in [bbox[0],(bbox[0]+bbox[2])/2,bbox[2]] for y in [bbox[1],(bbox[1]+bbox[3])/2,bbox[3]]]
 return all(any(inside_ring(poly[0],point) and not any(inside_ring(hole,point) for hole in poly[1:]) for poly in polygons) for point in sample)
for year in [2020,2022,2024,2025]:
 query={'collections':['sentinel-2-l2a'],'bbox':bbox,'datetime':f'{year}-06-01T00:00:00Z/{year}-08-31T23:59:59Z','limit':100,'query':{'eo:cloud_cover':{'lte':5}},'sortby':[{'field':'properties.eo:cloud_cover','direction':'asc'}]}
 response=request(query)
 candidates=[f for f in response['features'] if '_34UEC_' in f['id'] and covers_aoi(f)]
 candidates.sort(key=lambda f:f['properties']['eo:cloud_cover'])
 if not candidates:raise RuntimeError(f'No matching real scene for {year}')
 f=candidates[0]
 (args.cache/f'{year}-stac.json').write_text(json.dumps(f,ensure_ascii=False,indent=2),encoding='utf-8')
 print('Processing',year,f['id'],'cloud',f['properties']['eo:cloud_cover'],flush=True)
 rgb=read_asset(f['assets']['visual']['href'],[1,2,3],Resampling.bilinear)
 Image.fromarray(np.clip(rgb.transpose(1,2,0),0,255).astype('uint8')).save(out/f'sentinel-{year}.jpg',quality=89,optimize=True)
 reflectance=[];offsets={}
 for key in ['red','nir']:
  asset=f['assets'][key];spec=asset.get('raster:bands',[{}])[0]
  raw=read_asset(asset['href'],[1],Resampling.bilinear)[0]
  offset=0 if f['properties'].get('earthsearch:boa_offset_applied',False) else spec.get('offset',0)
  reflectance.append(raw*spec.get('scale',.0001)+offset);offsets[key]=offset
 scl=read_asset(f['assets']['scl']['href'],[1],Resampling.nearest)[0]
 total=reflectance[1]+reflectance[0]
 valid=np.isin(scl,[4,5,6])&(reflectance[0]>0)&(reflectance[1]>0)&(total>0)
 ndvi=np.divide(reflectance[1]-reflectance[0],total,out=np.zeros_like(total),where=total>0)
 v=np.clip((ndvi+.1),0,1)
 colors=np.zeros((height,width,4),dtype='uint8')
 colors[:,:,0]=np.clip(210*(1-v)+20,0,255);colors[:,:,1]=np.clip(100+v*90,0,255);colors[:,:,2]=np.clip(65-v*30,0,255);colors[:,:,3]=np.where(valid,220,0)
 Image.fromarray(colors).save(out/f'ndvi-{year}.png',optimize=True)
 valid_fraction=float(valid.mean())
 if valid_fraction<.75:raise RuntimeError(f'Insufficient valid coverage: {year} {valid_fraction}')
 scenes.append({'year':year,'id':f['id'],'date':f['properties']['datetime'],'cloud_scene_percent':f['properties']['eo:cloud_cover'],'url':f'https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/{f["id"]}','rgb':f'history/sentinel-{year}.jpg','ndvi':f'history/ndvi-{year}.png','native_pixel_m':10,'valid_fraction':round(valid_fraction,5),'boa_offset_applied':f['properties'].get('earthsearch:boa_offset_applied'),'applied_offsets':offsets,'assets':{k:f['assets'][k]['href'] for k in ['visual','red','nir','scl']}})
 print('Finished',year,'valid_fraction',valid_fraction,flush=True)
meta={'provider':'Copernicus Sentinel-2 L2A / Earth Search / Element 84','collection':'sentinel-2-l2a','bbox':bbox,'width':width,'height':height,'projection':'EPSG:3857','approx_ground_pixel_m':round((merc[2]-merc[0])/width*math.cos(math.radians((bbox[1]+bbox[3])/2)),1),'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'selection':'Tile 34UEC; June-August; scene cloud <= 5%; AOI corners, edge midpoints and centre inside footprint; lowest scene cloud among returned covering candidates. Scene cloud is not local cloud.','ndvi_method':'(B08-B04)/(B08+B04), STAC scale and offset with earthsearch:boa_offset_applied; bilinear reprojection; SCL nearest-neighbour classes 4, 5, 6. Does not measure displacement, tree height or clearance.','date_note':'Imagery dates are independent of synthetic/imported InSAR epochs, current GIS and GUGiK mosaic acquisition dates.','scenes':scenes}
(root/'assets/imagery-history.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print('READY',width,height,flush=True)
