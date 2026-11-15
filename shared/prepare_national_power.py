"""Build an attributed, spatially partitioned Polish electricity snapshot from OSM.

Requires osmium and shapely. The large PBF and working NDJSON stay outside Git.
Example: python shared/prepare_national_power.py --input /cache/poland.osm.pbf --cache /cache/power
"""
import argparse, collections, datetime, gzip, hashlib, json, math, pathlib, sys, time

P = argparse.ArgumentParser(description=__doc__)
P.add_argument('--input', type=pathlib.Path, required=True)
P.add_argument('--cache', type=pathlib.Path, required=True)
P.add_argument('--geo-libs', type=pathlib.Path)
P.add_argument('--repack', action='store_true', help='Reuse the extracted NDJSON')
A = P.parse_args()
if A.geo_libs:
    sys.path.insert(0, str(A.geo_libs))
import osmium
from shapely.geometry import shape, mapping, Point, box
from shapely import prepare, intersects, make_valid

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT/'national-power'
OUT.mkdir(exist_ok=True)
A.cache.mkdir(parents=True, exist_ok=True)
RAW = A.cache/'features.ndjson'
POWERS = ['line', 'minor_line', 'cable', 'tower', 'pole', 'substation', 'transformer', 'switch', 'compensator', 'converter']
ATTRS = ['power', 'name', 'ref', 'voltage', 'operator', 'operator:short', 'circuits', 'cables', 'wires', 'frequency', 'location', 'height', 'material', 'design', 'structure', 'tower:type', 'substation', 'transformer', 'line']
boundary = json.loads((ROOT/'poland-boundary.geojson').read_text(encoding='utf8'))
country = make_valid(shape(boundary['features'][0]['geometry']))
prepare(country)
counts = collections.Counter()
excluded = collections.Counter()
header = osmium.io.Reader(str(A.input)).header()
snapshot = header.get('osmosis_replication_timestamp') or header.get('timestamp')
source_meta = {'source': '© OpenStreetMap contributors', 'license': 'ODbL 1.0', 'provider': 'Geofabrik',
               'download_url': 'https://download.geofabrik.de/europe/poland-latest.osm.pbf',
               'snapshot': snapshot, 'prepared_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'source_bytes': A.input.stat().st_size}

def distance(a,b):
    x,y,X,Y=map(math.radians,[*a,*b])
    return 12742.0176*math.asin(min(1,math.sqrt(math.sin((Y-y)/2)**2+math.cos(y)*math.cos(Y)*math.sin((X-x)/2)**2)))

def line_length(g):
    parts = [list(g.coords)] if g.geom_type=='LineString' else [list(p.coords) for p in g.geoms]
    return round(sum(distance(a,b) for p in parts for a,b in zip(p,p[1:])),3)

def normalize(g):
    # Seven decimal places preserve the native OSM coordinate precision.
    def rec(c):
        return [round(v,7) for v in c] if c and isinstance(c[0],(int,float)) else [rec(v) for v in c]
    return {'type':g.geom_type,'coordinates':rec(mapping(g)['coordinates'])}

if not A.repack:
    factory = osmium.geom.GeoJSONFactory()
    filt = osmium.filter.TagFilter(*[('power', p) for p in POWERS])
    processor = osmium.FileProcessor(str(A.input)).with_locations('sparse_mem_array').with_areas(filt).with_filter(filt)
    t = time.monotonic()
    with RAW.open('w',encoding='utf8') as output:
        for o in processor:
            p = dict(o.tags)
            power = p.get('power')
            if power not in POWERS: continue
            typ = 'node' if o.is_node() else 'relation' if o.is_area() and not o.from_way() else 'way'
            oid = o.orig_id() if o.is_area() else o.id
            isline = power in ['line','minor_line','cable']
            if o.is_relation():
                if p.get('type') not in ['multipolygon','boundary']: excluded['non_area_relations']+=1
                continue
            if isline and not o.is_way(): continue
            if not isline and o.is_way() and o.is_closed(): continue  # emitted by the area assembler
            try:
                if o.is_node(): g=Point(o.lon,o.lat)
                elif o.is_area(): g=shape(json.loads(factory.create_multipolygon(o)))
                else: g=shape(json.loads(factory.create_linestring(o)))
                if not g.is_valid: g=make_valid(g)
                if g.is_empty or not intersects(country,g): excluded['outside_prg_boundary']+=1;continue
                # Retain full source geometries at the border. Do not cut OSM topology.
                kind = 'line' if isline else 'support' if power in ['tower','pole'] else 'substation' if power=='substation' else 'device'
                props = {k:p[k] for k in ATTRS if k in p}
                props.update(kind=kind,osm_type=typ,osm_id=str(oid),osm_version=o.version,osm_last_edit=str(o.timestamp))
                if isline:
                    props['length_km_in_aoi']=line_length(g)
                    props['node_ids']=[str(n.ref) for n in o.nodes]
                f={'type':'Feature','id':f'{typ}/{oid}','properties':props,'geometry':normalize(g),'bbox':list(g.bounds)}
                output.write(json.dumps(f,ensure_ascii=False,separators=(',',':'))+'\n')
                counts[power]+=1
                if sum(counts.values())%100000==0: print('Extracted',sum(counts.values()),'objects;',round(time.monotonic()-t),'seconds',flush=True)
            except (RuntimeError,ValueError,KeyError) as error:
                excluded['invalid_or_incomplete_geometry']+=1
    (A.cache/'extraction.json').write_text(json.dumps({'counts':counts,'excluded':excluded,'source':source_meta},indent=2),encoding='utf8')
    del processor
    import gc
    gc.collect()

extraction=json.loads((A.cache/'extraction.json').read_text(encoding='utf8'))
source_meta=extraction['source'];counts=extraction['counts'];excluded=extraction['excluded']

def tile(lon,lat,z=10):
    return int((lon+180)/360*2**z),int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z)

def write_gzip(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    payload=json.dumps(obj,ensure_ascii=False,separators=(',',':')).encode()
    with path.open('wb') as raw:
        with gzip.GzipFile(filename='',fileobj=raw,mode='wb',mtime=0,compresslevel=9) as f:f.write(payload)
    return {'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

# Keep each partition independently usable and deduplicate by OSM ID in the reader.
tiles=collections.defaultdict(list);overview=[];line_catalog=[];facilities=[];seen=set();dedup=collections.Counter()
for row in RAW.open(encoding='utf8'):
    f=json.loads(row)
    if f['id'] in seen:dedup[f['properties']['power']]+=1;continue
    seen.add(f['id'])
    p=f['properties'];g=shape(f['geometry']);b=f['bbox'];group='supports' if p['kind']=='support' else 'network'
    x0,y0=tile(b[0],b[3]);x1,y1=tile(b[2],b[1])
    for x in range(x0,x1+1):
        for y in range(y0,y1+1):
            # Bounding-box indexing is conservative: crossing lines are not lost.
            tiles[f'{group}/10/{x}/{y}.json.gz'].append(f)
    if p['power'] in ['line','minor_line','cable']:
        # Compact countrywide search index. Full geometry stays in the partition.
        parts=list(g.geoms) if g.geom_type=='MultiLineString' else [g]
        endpoints=[parts[0].coords[0],parts[-1].coords[-1]]
        catalog_props={k:v for k,v in p.items() if k in ['power','kind','name','ref','voltage','operator','circuits','cables','osm_type','osm_id','length_km_in_aoi']}
        catalog_props.update(generalized=True,detail_tile=f'network/10/{x0}/{y0}.json.gz')
        catalog_coords=[[round(float(v),7) for v in point] for point in endpoints]
        line_catalog.append({'type':'Feature','id':f['id'],'properties':catalog_props,'geometry':{'type':'LineString','coordinates':catalog_coords},'bbox':b})
    if p['power']=='line' or p['power'] in ['substation','cable'] and max([float(v) for v in p.get('voltage','').split(';') if v.strip().isdigit()]+[0])>=110000:
        simplified={**f,'properties':{k:v for k,v in p.items() if k!='node_ids'},'geometry':normalize(g.simplify(.0005,preserve_topology=True))}
        simplified['properties']['generalized']=True
        simplified['properties']['detail_tile']=f'network/10/{x0}/{y0}.json.gz'
        overview.append(simplified)
    if p['power']=='substation':
        c=g.representative_point();name=p.get('name') or p.get('ref') or 'Stacja · OSM '+p['osm_id']
        facilities.append({'id':f['id'],'kind':'substation','name':name,'source_name':p.get('name',''),'named':bool(p.get('name')),'region':'poland','lat':c.y,'lon':c.x,'operator':p.get('operator',''),'voltage':p.get('voltage',''),'source_url':'https://www.openstreetmap.org/'+f['id'],'snapshot':source_meta['snapshot'],'reference':'Punkt wewnątrz geometrii OSM; nie pomiar geodezyjny'})
index={}
for i,(name,features) in enumerate(sorted(tiles.items())):
    index[name]={**write_gzip(OUT/name,{'type':'FeatureCollection','features':features}),'count':len(features)}
    if i%500==0:print('Packed',i,'/',len(tiles),'partitions',flush=True)
overview_info=write_gzip(OUT/'overview.json.gz',{'type':'FeatureCollection','features':overview})
line_catalog_info=write_gzip(OUT/'line-catalog.json.gz',{'type':'FeatureCollection','features':line_catalog,'snapshot':source_meta['snapshot']})
facilities_info=write_gzip(OUT/'facilities.json.gz',{'items':facilities,'snapshot':source_meta['snapshot']})
meta={**source_meta,'aoi_bbox':list(country.bounds),'counts':counts,'feature_count':len(seen),'excluded':excluded,'deduplicated':dict(dedup),'powers':POWERS,'overview_includes_hv_cables':True,'overview_cable_count':sum(f['properties']['power']=='cable' for f in overview),
      'partition_zoom':10,'detail_min_zoom':11,'supports_min_zoom':14,'poles_min_zoom':16,'overview':overview_info,'overview_count':len(overview),'line_catalog':line_catalog_info,'line_catalog_count':len(line_catalog),'facilities':facilities_info,'tiles':index,
      'geometry_processing':'Original OSM geometries intersecting Poland PRG boundary; full geometries retained at borders. All coordinates remain in EPSG:4326. Overview is simplified by 0.0005 degrees; detail partitions preserve source coordinates.',
      'completeness':'Nationwide coverage of the selected public OSM tags, not a complete or operator-verified inventory. Unknown voltage/operator are left unknown. power=line includes transmission and distribution; voltage alone does not establish operator responsibility.',
      'source_license':'ODbL 1.0','source_url':'https://www.openstreetmap.org/copyright','operator_verified':False,
      'total_partition_bytes':sum(t['bytes'] for t in index.values())}
(OUT/'metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:meta[k] for k in ['snapshot','feature_count','counts','excluded','overview_count','total_partition_bytes']},ensure_ascii=False,indent=2),flush=True)
