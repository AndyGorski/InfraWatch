"""Build small, georeferenced overview mosaics; detailed tiles stay online.
Run with the bundled Python (Pillow). No credentials required.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image
import urllib.request, urllib.parse, urllib.error, json, math, io, time

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'national-sentinel';OUT.mkdir(exist_ok=True)
CACHE=ROOT.parents[2]/'tmp/national-sentinel/tiles';CACHE.mkdir(parents=True,exist_ok=True)
API='https://planetarycomputer.microsoft.com/api/data/v1'
BOX=[14,49,24.3,55];Z=9;N=2**Z;SIZE=128
def tile(lon,lat):return int((lon+180)/360*N),int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*N)
X0,Y1=tile(BOX[0],BOX[1]);X1,Y0=tile(BOX[2],BOX[3])
def lat(y):return math.degrees(math.atan(math.sinh(math.pi*(1-2*y/N))))
BOUNDS=[X0/N*360-180,lat(Y1+1),(X1+1)/N*360-180,lat(Y0)]
def request(url,data=None):
    req=urllib.request.Request(url,data=json.dumps(data).encode() if data else None,headers={'Content-Type':'application/json','User-Agent':'InfraWatch-national-overview'})
    with urllib.request.urlopen(req,timeout=50) as r:return r.read()
manifest={'bbox':BOUNDS,'requested_bbox':BOX,'source_zoom':Z,'overview_tile_pixels':SIZE,'years':[],'provider':'Copernicus Sentinel-2 L2A / Microsoft Planetary Computer','selection':'June-August, whole-scene cloud cover <10%, ascending cloud cover, first valid pixel. Not single-date imagery.','ndvi':'Unscaled B08/B04 normalized index; no per-pixel SCL cloud mask.'}
if (OUT/'metadata.json').exists():manifest['years']=json.loads((OUT/'metadata.json').read_text())['years']
print('Grid',X0,X1,Y0,Y1,'bounds',BOUNDS,flush=True)
for year in [2025,2020,2022,2024]:
    if any(item['year']==year for item in manifest['years']) and all((OUT/f'{mode}-{year}.webp').stat().st_size>0 for mode in ['rgb','ndvi']):
        print('Already saved',year,flush=True);continue
    query={'collections':['sentinel-2-l2a'],'bbox':BOX,'datetime':f'{year}-06-01T00:00:00Z/{year}-08-31T23:59:59Z','query':{'eo:cloud_cover':{'lt':10}},'sortby':[{'field':'eo:cloud_cover','direction':'asc'}]}
    result=json.loads(request(API+'/mosaic/register',query));sid=result.get('searchid') or result['id']
    canvases={mode:Image.new('RGBA',((X1-X0+1)*SIZE,(Y1-Y0+1)*SIZE)) for mode in ['rgb','ndvi']}
    def download(job):
        mode,x,y=job;path=CACHE/f'{year}-{mode}-{x}-{y}.png'
        if path.exists():
            image=Image.open(path).convert('RGBA');return mode,x,y,image,image.getchannel('A').getbbox() is None
        params={'collection':'sentinel-2-l2a','nodata':0,'scan_limit':300,'items_limit':80,'pixel_selection':'first'}
        if mode=='rgb':params['assets']='visual'
        else:params.update(expression='(B08-B04)/(B08+B04)',asset_as_band='true',unscale='true',rescale='-1,1',colormap_name='rdylgn')
        url=f'{API}/mosaic/{sid}/tiles/WebMercatorQuad/{Z}/{x}/{y}.png?'+urllib.parse.urlencode(params)
        for attempt in range(3):
            try:
                data=request(url)
                if not data:
                    image=Image.new('RGBA',(256,256));image.save(path);return mode,x,y,image,True
                image=Image.open(io.BytesIO(data)).convert('RGBA');assert image.size==(256,256)
                path.write_bytes(data)
                return mode,x,y,image,False
            except Exception:
                if attempt==2:raise
                time.sleep(1+attempt)
    jobs=[(mode,x,y) for mode in canvases for y in range(Y0,Y1+1) for x in range(X0,X1+1)]
    count=0;empty=[]
    with ThreadPoolExecutor(max_workers=8) as pool:
        for future in as_completed([pool.submit(download,j) for j in jobs]):
            mode,x,y,image,nodata=future.result();canvases[mode].paste(image.resize((SIZE,SIZE),Image.Resampling.LANCZOS),((x-X0)*SIZE,(y-Y0)*SIZE));count+=1
            if nodata:empty.append({'mode':mode,'x':x,'y':y,'z':Z})
            if count%80==0:print(year,count,'/',len(jobs),flush=True)
    for mode,image in canvases.items():
        image.save(OUT/f'{mode}-{year}.webp',quality=83 if mode=='rgb' else 88,method=6)
    manifest['years'].append({'year':year,'period':query['datetime'],'tiles':len(jobs)//2,'rgb':f'rgb-{year}.webp','ndvi':f'ndvi-{year}.webp','empty_tiles':empty})
    (OUT/'metadata.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print('Saved',year,flush=True)
