"""Create an attributed, clipped OpenStreetMap snapshot; does not infer hazards."""
import pathlib,json,math,datetime,collections,argparse,urllib.request,urllib.parse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('input',type=pathlib.Path,help='Raw Overpass JSON response')
parser.add_argument('--output',type=pathlib.Path,required=True,help='Output directory for GeoJSON and metadata')
parser.add_argument('--fetch',action='store_true',help='Download a fresh Overpass response to input before preparing')
args=parser.parse_args()
bbox=[21.24,51.48,21.86,51.78]
query='[out:json][timeout:120];(way["power"="line"](51.48,21.24,51.78,21.86);way["power"="minor_line"](51.48,21.24,51.78,21.86);node["power"~"^(tower|pole)$"](51.48,21.24,51.78,21.86);nwr["power"="substation"](51.48,21.24,51.78,21.86););out meta geom;'
if args.fetch:
 req=urllib.request.Request('https://overpass-api.de/api/interpreter',data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'InfraWatchDemo/1.0 (public energy GIS snapshot)','Content-Type':'application/x-www-form-urlencoded'})
 with urllib.request.urlopen(req,timeout=150) as response:raw=json.load(response)
 if raw.get('remark'):raise RuntimeError(raw['remark'])
 if not raw.get('elements'):raise RuntimeError('Empty Overpass response')
 args.input.parent.mkdir(parents=True,exist_ok=True)
 args.input.write_text(json.dumps(raw,ensure_ascii=False),encoding='utf8')
else:raw=json.loads(args.input.read_text(encoding='utf8'))
if raw.get('remark'):raise RuntimeError(raw['remark'])

allowed=['power','name','ref','voltage','operator','operator:short','circuits','cables','wires','frequency','location','height','material','design','structure','tower:type','substation']
def dist(a,b):
 lon1,lat1,lon2,lat2=map(math.radians,[a[0],a[1],b[0],b[1]])
 return 6371008.8*2*math.asin(min(1,math.sqrt(math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2)))
def clip(a,b):
 dx,dy=b[0]-a[0],b[1]-a[1];u,v=0,1
 for p,q in [(-dx,a[0]-bbox[0]),(dx,bbox[2]-a[0]),(-dy,a[1]-bbox[1]),(dy,bbox[3]-a[1])]:
  if p==0:
   if q<0:return None
  elif p<0:u=max(u,q/p)
  else:v=min(v,q/p)
  if u>v:return None
 return [[round(a[0]+u*dx,7),round(a[1]+u*dy,7)],[round(a[0]+v*dx,7),round(a[1]+v*dy,7)]]
def clip_line(coords):
 parts=[];part=[]
 for a,b in zip(coords,coords[1:]):
  seg=clip(a,b)
  if seg and seg[0]!=seg[1]:
   if part and part[-1]==seg[0]:part.append(seg[1])
   else:
    if len(part)>1:parts.append(part)
    part=seg
  elif part:
   if len(part)>1:parts.append(part)
   part=[]
 if len(part)>1:parts.append(part)
 return parts
features=[];excluded=collections.Counter()
for e in raw['elements']:
 t=e.get('tags',{});power=t.get('power');p={k:t[k] for k in allowed if k in t}
 p.update({'source':'OpenStreetMap contributors','source_license':'ODbL 1.0','source_url':f"https://www.openstreetmap.org/{e['type']}/{e['id']}",'osm_type':e['type'],'osm_id':str(e['id']),'osm_version':e.get('version'),'osm_last_edit':e.get('timestamp'),'demo':False,'operator_verified':False})
 if power in ['line','minor_line'] and e['type']=='way':
  coords=[[v['lon'],v['lat']] for v in e.get('geometry',[]) if 'lat'in v]
  parts=clip_line(coords)
  if not parts:excluded['lines_without_aoi_geometry']+=1;continue
  geometry={'type':'LineString','coordinates':parts[0]} if len(parts)==1 else {'type':'MultiLineString','coordinates':parts}
  p.update({'kind':'line','length_km_in_aoi':round(sum(dist(a,b) for part in parts for a,b in zip(part,part[1:]))/1000,3),'geometry_processing':'Clipped to AOI bbox; OSM geometry preserved inside AOI','node_ids':[str(n) for n in e.get('nodes',[])]})
 elif power in ['tower','pole'] and e['type']=='node':
  geometry={'type':'Point','coordinates':[e['lon'],e['lat']]};p['kind']='support'
 elif power=='substation':
  p['kind']='substation'
  if e['type']=='node':geometry={'type':'Point','coordinates':[e['lon'],e['lat']]}
  elif e['type']=='way':
   coords=[[v['lon'],v['lat']] for v in e.get('geometry',[]) if 'lat'in v]
   if len(coords)>3 and coords[0]==coords[-1]:geometry={'type':'Polygon','coordinates':[coords]}
   else:excluded['unclosed_station_ways']+=1;continue
  else:excluded['substation_relations']+=1;continue
 else:excluded['unsupported']+=1;continue
 features.append({'type':'Feature','id':f"{e['type']}/{e['id']}",'properties':p,'geometry':geometry})
features.sort(key=lambda f:(f['properties']['kind'],f['properties']['osm_id']))
counts=collections.Counter(f['properties']['power'] for f in features)
out=args.output
out.mkdir(parents=True,exist_ok=True)
meta={'source':'OpenStreetMap contributors','license':'ODbL 1.0','copyright_url':'https://www.openstreetmap.org/copyright','api':'https://overpass-api.de/api/interpreter','snapshot':raw.get('osm3s',{}).get('timestamp_osm_base'),'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'aoi_bbox':bbox,'counts':dict(counts),'excluded':dict(excluded),'scope':'Objects returned by Overpass for AOI; lines clipped to AOI. Not an exhaustive or operator-certified inventory.','date_note':'OSM edit timestamp is not a field survey date or commissioning date. GIS snapshot is independent of imagery year.','geometry_note':'No synthetic line, pole or station geometry added. No clearance, canopy or risk measurements inferred.','query':query}
(out/'real-power.geojson').write_text(json.dumps({'type':'FeatureCollection','name':'InfraWatch Kozienice — public power GIS snapshot','attribution':'© OpenStreetMap contributors','license':'ODbL 1.0','features':features},ensure_ascii=False,separators=(',',':')),encoding='utf8')
(out/'real-power-metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
print('Counts',dict(counts),'excluded',dict(excluded))
top=sorted([f for f in features if f['properties']['power']=='line'],key=lambda f:f['properties']['length_km_in_aoi'],reverse=True)[:15]
print(json.dumps([{k:f['properties'].get(k) for k in ['osm_id','name','voltage','length_km_in_aoi']} for f in top],ensure_ascii=True,indent=2))
