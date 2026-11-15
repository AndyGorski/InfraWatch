"""Extract Polish power=plant landmarks from the existing OSM PBF (osmium, shapely)."""
import argparse,collections,datetime,gzip,json,pathlib,sys
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--input',type=pathlib.Path,required=True)
p.add_argument('--geo-libs',type=pathlib.Path)
a=p.parse_args()
if a.geo_libs:sys.path.insert(0,str(a.geo_libs))
import osmium
from shapely.geometry import shape,Point,box
from shapely import prepare,intersects,make_valid
root=pathlib.Path(__file__).resolve().parent
country=make_valid(shape(json.loads((root/'poland-boundary.geojson').read_text(encoding='utf8'))['features'][0]['geometry']));prepare(country)
reader=osmium.io.Reader(str(a.input));snapshot=reader.header().get('osmosis_replication_timestamp');reader.close()
filt=osmium.filter.TagFilter(('power','plant'))
factory=osmium.geom.GeoJSONFactory();items={};excluded=collections.Counter()
attrs=['plant:source','plant:method','plant:output:electricity','plant:output:hot_water','plant:output:steam','generator:source','generator:method','start_date']
for o in osmium.FileProcessor(str(a.input)).with_locations('sparse_mem_array').with_areas(filt).with_filter(filt):
    if o.is_relation():
        if o.tags.get('type') not in ['multipolygon','boundary']:excluded['non_area_relations']+=1
        continue
    if o.is_way() and o.is_closed():continue
    try:
        tags=dict(o.tags)
        if tags.get('plant:output:electricity','').strip().lower() in ['no','0','0 w','0 kw','0 mw']:
            excluded['explicit_no_electricity']+=1;continue
        geom=Point(o.lon,o.lat) if o.is_node() else shape(json.loads(factory.create_multipolygon(o) if o.is_area() else factory.create_linestring(o)))
        if not geom.is_valid:geom=make_valid(geom)
        if geom.is_empty or not intersects(country,geom):excluded['outside_poland']+=1;continue
        typ='node' if o.is_node() else 'relation' if o.is_area() and not o.from_way() else 'way'
        oid=o.orig_id() if o.is_area() else o.id;id=f'{typ}/{oid}'
        c=geom.representative_point();b=list(geom.bounds)
        region='silesia' if 18.34<=c.x<=18.84 and 50.035<=c.y<=50.46 else 'kozienice' if 21.24<=c.x<=21.86 and 51.48<=c.y<=51.78 else 'poland'
        items[id]={'id':id,'kind':'plant','power':'plant','name':tags.get('name') or tags.get('ref') or 'Obiekt wytwarzania energii · OSM '+str(oid),'source_name':tags.get('name',''),'named':bool(tags.get('name')),'region':region,'lat':round(c.y,7),'lon':round(c.x,7),'bbox':b,'operator':tags.get('operator',''),'source_url':'https://www.openstreetmap.org/'+id,'snapshot':snapshot,'osm_last_edit':o.timestamp.isoformat(),'reference':'Punkt na geometrii OSM; nie pomiar geodezyjny.','tags':{k:tags[k] for k in attrs if k in tags},'operator_verified':False}
    except (RuntimeError,ValueError):excluded['invalid_or_incomplete_geometry']+=1
# Site relations are collections of installations, not multipolygon areas.
# Resolve their member positions without inventing a footprint or electrical connectivity.
sites={};member_of=collections.defaultdict(list)
for relation in osmium.FileProcessor(str(a.input),osmium.osm.RELATION).with_filter(filt):
    if relation.tags.get('type') in ['multipolygon','boundary']:continue
    tags=dict(relation.tags)
    if tags.get('plant:output:electricity','').strip().lower() in ['no','0','0 w','0 kw','0 mw']:continue
    sites[relation.id]={'tags':tags,'members':[(m.type,m.ref) for m in relation.members],'last_edit':relation.timestamp.isoformat(),'positions':[],'resolved':set()}
    for member in relation.members:
        if member.type in ['n','w']:member_of[(member.type,member.ref)].append(relation.id)
if sites:
    ids={oid for typ,oid in member_of}
    processor=osmium.FileProcessor(str(a.input)).with_locations('sparse_mem_array').with_filter(osmium.filter.EntityFilter(osmium.osm.NODE|osmium.osm.WAY)).with_filter(osmium.filter.IdFilter(ids))
    for o in processor:
        typ='n' if o.is_node() else 'w';key=(typ,o.id)
        if key not in member_of:continue
        coords=[(o.lon,o.lat)] if o.is_node() else [(n.lon,n.lat) for n in o.nodes if n.location.valid()]
        if not coords:continue
        bounds=(min(c[0] for c in coords),min(c[1] for c in coords),max(c[0] for c in coords),max(c[1] for c in coords))
        for rid in member_of[key]:sites[rid]['positions'].append(bounds);sites[rid]['resolved'].add(key)
    del processor
    for _ in range(8):
        changed=False
        for rid,site in sites.items():
            for typ,ref in site['members']:
                if typ=='r' and ref in sites and sites[ref]['positions'] and (typ,ref) not in site['resolved']:
                    site['positions'].extend(sites[ref]['positions']);site['resolved'].add((typ,ref));changed=True
        if not changed:break
    for rid,site in sites.items():
        if not site['positions']:excluded['site_without_member_positions']+=1;continue
        b=[min(v[0] for v in site['positions']),min(v[1] for v in site['positions']),max(v[2] for v in site['positions']),max(v[3] for v in site['positions'])]
        g=box(*b) if b[0]!=b[2] and b[1]!=b[3] else Point(b[0],b[1])
        if not intersects(country,g):excluded['site_outside_poland']+=1;continue
        tags=site['tags'];id=f'relation/{rid}';lon=(b[0]+b[2])/2;lat=(b[1]+b[3])/2
        region='silesia' if 18.34<=lon<=18.84 and 50.035<=lat<=50.46 else 'kozienice' if 21.24<=lon<=21.86 and 51.48<=lat<=51.78 else 'poland'
        items[id]={'id':id,'kind':'plant','power':'plant','name':tags.get('name') or tags.get('ref') or 'Obiekt wytwarzania energii · OSM '+str(rid),'source_name':tags.get('name',''),'named':bool(tags.get('name')),'region':region,'lat':round(lat,7),'lon':round(lon,7),'bbox':b,'operator':tags.get('operator',''),'source_url':'https://www.openstreetmap.org/'+id,'snapshot':snapshot,'osm_last_edit':site['last_edit'],'reference':'Środek prostokąta członków relacji OSM; punkt orientacyjny, nie pomiar.','tags':{k:tags[k] for k in attrs if k in tags},'operator_verified':False,'relation_members':len(site['members']),'resolved_members':len(site['resolved'])}
    excluded.pop('non_area_relations',None)
catalog={'source':'© OpenStreetMap contributors','license':'ODbL 1.0','provider':'Geofabrik','source_url':'https://download.geofabrik.de/europe/poland.html','snapshot':snapshot,'prepared_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'count':len(items),'resolved_site_relations':sum('relation_members' in f for f in items.values()),'excluded':dict(excluded),'note':'OSM power=plant objects intersecting Poland. This tag includes energy production facilities; unknown electricity output or source is not inferred. No current operating status is established. Source geometry reference points, not building heights or measured elevations. Site-relation references are member bounding-box centres; unresolved members are recorded. Distinct OSM IDs need not represent separate physical facilities.','items':sorted(items.values(),key=lambda f:f['id'])}
payload=json.dumps(catalog,ensure_ascii=False,separators=(',',':')).encode()
with (root/'power-plants.json.gz').open('wb') as raw:
    with gzip.GzipFile(filename='',fileobj=raw,mode='wb',mtime=0) as output:output.write(payload)
print(json.dumps({'count':len(items),'snapshot':snapshot,'excluded':excluded,'bytes':(root/'power-plants.json.gz').stat().st_size},ensure_ascii=False),flush=True)
