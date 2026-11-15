"""Build the extended 2D demonstrator from Terrain Tiles and the cached Polish OSM extract.

python prepare_wisla_model.py --cache /cache/wisla --pbf /cache/poland.osm.pbf --geo-libs /libs
No hydraulic calibration is implied. The 3D model and archive v2 remain unchanged.
"""
import argparse,concurrent.futures,datetime,gzip,hashlib,heapq,io,json,math,pathlib,sys,urllib.request
import numpy as np
from PIL import Image

BBOX=[21.08,51.34,22.04,52.04]
WIDTH,HEIGHT,ZOOM=560,650,11
ROOT=pathlib.Path(__file__).resolve().parent
def tile(lon,lat,z):
    n=2**z
    return (lon+180)/360*n,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n
def digest(b):return hashlib.sha256(b).hexdigest()
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--cache',type=pathlib.Path,required=True);p.add_argument('--pbf',type=pathlib.Path,required=True);p.add_argument('--geo-libs',type=pathlib.Path,required=True);a=p.parse_args();a.cache.mkdir(parents=True,exist_ok=True)
    sys.path.insert(0,str(a.geo_libs));import osmium
    from shapely.geometry import LineString,box,mapping
    x0,y0=tile(BBOX[0],BBOX[3],ZOOM);x1,y1=tile(BBOX[2],BBOX[1],ZOOM)
    paths=[(x,y)for x in range(math.floor(x0),math.floor(x1)+1)for y in range(math.floor(y0),math.floor(y1)+1)]
    def read_tile(xy):
        x,y=xy;target=a.cache/f'{ZOOM}-{x}-{y}.png';url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{ZOOM}/{x}/{y}.png'
        if not target.exists():
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'InfraWatch-demonstrator/1.0'}),timeout=45)as r:raw=r.read()
            im=Image.open(io.BytesIO(raw));assert im.size==(256,256);target.write_bytes(raw)
        raw=target.read_bytes();v=np.asarray(Image.open(io.BytesIO(raw)).convert('RGB'),dtype=np.float32);return xy,v[:,:,0]*256+v[:,:,1]+v[:,:,2]/256-32768,{'url':url,'sha256':digest(raw)}
    tiles={};sources=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4)as pool:
        for xy,z,source in pool.map(read_tile,paths):tiles[xy]=z;sources.append(source)
    print(f'Downloaded/verified {len(tiles)} terrain tiles',flush=True)
    dem=np.empty((HEIGHT,WIDTH),dtype=np.int16)
    # Decode elevations before sampling. Never resize the encoded RGB channels.
    for row,lat in enumerate(np.linspace(BBOX[3],BBOX[1],HEIGHT)):
        for col,lon in enumerate(np.linspace(BBOX[0],BBOX[2],WIDTH)):
            x,y=tile(lon,lat,ZOOM);tx,ty=math.floor(x),math.floor(y);dem[row,col]=round(float(tiles[tx,ty][min(255,int((y-ty)*256)),min(255,int((x-tx)*256))])*10)
    river_cache=a.cache/'wisla-osm.json'
    if river_cache.exists():river=json.loads(river_cache.read_text(encoding='utf-8'))
    else:
        ways=[];wanted=set();print('Reading Wisła ways from the cached OSM snapshot',flush=True)
        for w in osmium.FileProcessor(a.pbf,entities=osmium.osm.WAY).with_filter(osmium.filter.TagFilter(('waterway','river'))):
            if w.tags.get('name')=='Wisła':
                ids=[n.ref for n in w.nodes];wanted.update(ids);ways.append((w.id,ids))
        coords={}
        for n in osmium.FileProcessor(a.pbf,entities=osmium.osm.NODE).with_filter(osmium.filter.IdFilter(wanted)):coords[n.id]=(n.location.lon,n.location.lat)
        clipped=[];domain=box(*BBOX)
        for wid,ids in ways:
            if not all(n in coords for n in ids):continue
            line=LineString([coords[n]for n in ids]);part=line.intersection(domain)
            if not part.is_empty and part.geom_type in ('LineString','MultiLineString'):clipped.append({'type':'Feature','id':f'way/{wid}','properties':{'name':'Wisła','waterway':'river'},'geometry':mapping(part)})
        reader=osmium.io.Reader(a.pbf);snapshot=reader.header().get('osmosis_replication_timestamp');reader.close()
        river={'type':'FeatureCollection','features':clipped,'snapshot':snapshot,'source':'© OpenStreetMap contributors / Geofabrik','license':'ODbL 1.0'};river_cache.write_text(json.dumps(river,ensure_ascii=False),encoding='utf-8')
    seeds=set();length=0
    def xy(p):return ((p[0]-BBOX[0])/(BBOX[2]-BBOX[0])*(WIDTH-1),(BBOX[3]-p[1])/(BBOX[3]-BBOX[1])*(HEIGHT-1))
    for f in river['features']:
        lines=[f['geometry']['coordinates']]if f['geometry']['type']=='LineString'else f['geometry']['coordinates']
        for line in lines:
            for p,q in zip(line,line[1:]):
                length+=math.hypot((q[0]-p[0])*111.32*math.cos(math.radians(p[1])),(q[1]-p[1])*111.32)
                x,y=xy(p);X,Y=xy(q);steps=max(1,math.ceil(max(abs(X-x),abs(Y-y))*2))
                for t in np.linspace(0,1,steps+1):seeds.add((min(HEIGHT-1,max(0,round(y+(Y-y)*t))),min(WIDTH-1,max(0,round(x+(X-x)*t)))))
    assert len(seeds)>500 and length>60,(len(seeds),length)
    ordered=sorted(seeds);ry=np.array([p[0]for p in ordered],dtype=np.float32);rx=np.array([p[1]for p in ordered],dtype=np.float32);rz=dem[ry.astype(int),rx.astype(int)]
    ref=np.empty_like(dem);cols=np.arange(WIDTH,dtype=np.float32)[:,None]
    dx=111320*math.cos(math.radians(sum(BBOX[1::2])/2))*(BBOX[2]-BBOX[0])/(WIDTH-1);dy=111320*(BBOX[3]-BBOX[1])/(HEIGHT-1)
    for y in range(HEIGHT):ref[y]=rz[np.argmin(((cols-rx)*dx)**2+((y-ry)*dy)**2,axis=1)]
    # Minimax connection threshold is equivalent to repeated four-neighbour flood fill.
    costs=(dem.astype(np.int32)-ref).ravel();threshold=np.full(WIDTH*HEIGHT,32767,dtype=np.int16);heap=[]
    for y,x in ordered:i=y*WIDTH+x;threshold[i]=max(0,int(costs[i]));heapq.heappush(heap,(int(threshold[i]),i))
    while heap:
        level,i=heapq.heappop(heap)
        if level!=threshold[i]:continue
        x,y=i%WIDTH,i//WIDTH
        for j in ([i-1]if x else [])+([i+1]if x<WIDTH-1 else [])+([i-WIDTH]if y else [])+([i+WIDTH]if y<HEIGHT-1 else []):
            candidate=max(level,int(costs[j]))
            if candidate<threshold[j]:threshold[j]=candidate;heapq.heappush(heap,(candidate,j))
    # Use the same attributed national snapshot as the rest of InfraWatch.
    supports={};root=ROOT.parents[1]/'shared/national-power';ax,ay=tile(BBOX[0],BBOX[3],10);bx,by=tile(BBOX[2],BBOX[1],10)
    for x in range(int(ax),int(bx)+1):
        for y in range(int(ay),int(by)+1):
            file=root/f'supports/10/{x}/{y}.json.gz'
            if not file.exists():continue
            for f in json.loads(gzip.decompress(file.read_bytes()))['features']:
                lon,lat=f['geometry']['coordinates'][:2]
                if f['properties']['power']=='tower'and BBOX[0]<=lon<=BBOX[2]and BBOX[1]<=lat<=BBOX[3]:supports[f['id']]={'id':int(f['id'].split('/')[-1]),'lon':lon,'lat':lat,'tags':f['properties']}
    metadata=json.loads((root/'metadata.json').read_text(encoding='utf-8'))
    model={'version':1,'name':'Wisła · Puławy–Góra Kalwaria','bbox':BBOX,'width':WIDTH,'height':HEIGHT,'encoding':'integer decimetres; row-major, north first','height_dm':dem.ravel().tolist(),'reference_dm':ref.ravel().tolist(),'connection_dm':threshold.tolist(),'seed_indices':[y*WIDTH+x for y,x in ordered],'river':river,'towers':list(supports.values()),'metadata':{'prepared_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'terrain_source':'https://registry.opendata.aws/terrain-tiles/','terrain_zoom':ZOOM,'terrain_tiles':sources,'osm_snapshot':metadata['snapshot'],'river_length_km':round(length,2),'cell_width_m':round(dx,2),'cell_height_m':round(dy,2),'algorithm':'Nearest river DEM reference; four-neighbour connected bathtub flood; precomputed minimax threshold. No hydraulic calibration, flow, levees or rainfall.','units':'m; heights stored in dm','model_3d':'Separate original Kozienice model, unchanged'}}
    raw=json.dumps(model,ensure_ascii=False,separators=(',',':')).encode();out=ROOT/'assets/wisla-2d.json.gz';out.write_bytes(gzip.compress(raw,mtime=0))
    (ROOT/'assets/wisla-2d-manifest.json').write_text(json.dumps({'bbox':BBOX,'width':WIDTH,'height':HEIGHT,'river_length_km':round(length,2),'tower_count':len(supports),'sha256':digest(out.read_bytes()),'bytes':out.stat().st_size,'source':model['metadata'],'river_osm_ways':[f['id']for f in river['features']]},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'READY: {length:.1f} km river, {len(supports)} towers, {WIDTH}×{HEIGHT}, {out.stat().st_size} bytes',flush=True)
if __name__=='__main__':main()
