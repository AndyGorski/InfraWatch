"""Cache attributed, georeferenced GUGiK detail frames for the 30 existing F401 nodes."""
import argparse, concurrent.futures, datetime, hashlib, io, json, math, time, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image, ImageStat

ROOT=Path(__file__).resolve().parent
SERVICE='https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'assets/detail-ortho');parser.add_argument('--limit',type=int);args=parser.parse_args()
    points=json.loads((ROOT/'assets/infrastructure.json').read_text(encoding='utf-8'))['elements'];points=points[:args.limit] if args.limit else points;args.output.mkdir(parents=True,exist_ok=True)
    def prepare(point):
        dy=750/111320;dx=dy/math.cos(math.radians(point['lat']));bbox=[point['lon']-dx,point['lat']-dy,point['lon']+dx,point['lat']+dy]
        query={'SERVICE':'WMS','REQUEST':'GetMap','VERSION':'1.1.1','SRS':'EPSG:4326','LAYERS':'Raster','STYLES':'','FORMAT':'image/jpeg','BBOX':','.join(f'{v:.9f}' for v in bbox),'WIDTH':2048,'HEIGHT':2048}
        url=SERVICE+'?'+urllib.parse.urlencode(query);path=args.output/f"{point['id']}.jpg"
        if not path.exists():
            for attempt in range(3):
                try:
                    request=urllib.request.Request(url,headers={'User-Agent':'InfraWatch-demo-data-preparation/1.0'})
                    with urllib.request.urlopen(request,timeout=75) as response: payload=response.read()
                    with Image.open(io.BytesIO(payload)) as image:
                        image.load();assert image.size==(2048,2048),'Unexpected frame dimensions'
                        assert max(ImageStat.Stat(image.convert('RGB').resize((64,64))).stddev)>4,'Blank/no-data frame'
                    path.write_bytes(payload);break
                except Exception:
                    if attempt==2: raise
                    time.sleep(2+attempt)
        with Image.open(path) as image: assert image.size==(2048,2048)
        payload=path.read_bytes();print(f"Prepared {point['id']}: {len(payload):,} bytes",flush=True)
        return {'osm_id':str(point['id']),'file':path.name,'bbox':bbox,'crs':'EPSG:4326','center':[point['lon'],point['lat']],'width':2048,'height':2048,'footprint_approx_m':[1500,1500],'sampling_approx_m':1500/2048,'acquisition_date':None,'source_url':url,'source':'GUGiK / Geoportal · Ortofotomapa StandardResolution','sha256':hashlib.sha256(payload).hexdigest(),'bytes':len(payload)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: items=list(pool.map(prepare,points))
    manifest={'name':'F401 / local aerial detail','prepared_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'GUGiK / Geoportal','source_page':'https://www.geoportal.gov.pl/pl/dane/ortofotomapa-orto/','service':SERVICE,'crs':'EPSG:4326','acquisition_dates_verified':False,'scope':'Existing OSM F401 point locations; image texture only; DEM and flood calculations unchanged.','items':items}
    (args.output/'index.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f"Saved {len(items)} georeferenced frames, {sum(i['bytes'] for i in items)/1024/1024:.1f} MiB",flush=True)

if __name__=='__main__': main()
