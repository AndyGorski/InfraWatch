"""Add attributed HV cable overviews from existing national detail partitions; no new source data."""
import argparse,gzip,json,pathlib,hashlib,sys
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--geo-libs',type=pathlib.Path);a=p.parse_args()
if a.geo_libs:sys.path.insert(0,str(a.geo_libs))
from shapely.geometry import shape,mapping
root=pathlib.Path(__file__).resolve().parent/'national-power';meta_path=root/'metadata.json';meta=json.loads(meta_path.read_text(encoding='utf8'));overview_path=root/'overview.json.gz'
overview=json.loads(gzip.decompress(overview_path.read_bytes()));existing={f['id'] for f in overview['features']};added=0
for name in sorted(meta['tiles']):
    if not name.startswith('network/'):continue
    fc=json.loads(gzip.decompress((root/name).read_bytes()))
    for f in fc['features']:
        p=f['properties'];voltages=[float(v) for v in p.get('voltage','').split(';') if v.strip().isdigit()]
        if p.get('power')!='cable' or not voltages or max(voltages)<110000 or f['id'] in existing:continue
        f={**f,'properties':{k:v for k,v in p.items() if k!='node_ids'},'geometry':mapping(shape(f['geometry']).simplify(.0005,preserve_topology=True))};f['properties'].update(generalized=True,detail_tile=name)
        overview['features'].append(f);existing.add(f['id']);added+=1
payload=json.dumps(overview,ensure_ascii=False,separators=(',',':')).encode();overview_path.write_bytes(gzip.compress(payload,compresslevel=9,mtime=0))
meta['overview_count']=len(overview['features']);meta['overview']={'bytes':overview_path.stat().st_size,'sha256':hashlib.sha256(overview_path.read_bytes()).hexdigest()}
meta['overview_includes_hv_cables']=True;meta['overview_cable_count']=sum(f['properties']['power']=='cable' for f in overview['features']);meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'added':added,'overview_count':meta['overview_count'],'hv_cables':meta['overview_cable_count'],'bytes':meta['overview']['bytes']}))
