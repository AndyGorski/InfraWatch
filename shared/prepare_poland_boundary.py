"""Prepare a lightweight country outline from the public GUGiK PRG WFS.
EPSG:4326 GML axis order is latitude, longitude; GeoJSON is longitude, latitude.
Usage: python shared/prepare_poland_boundary.py [downloaded-country.gml]
"""
from pathlib import Path
import sys,urllib.request,urllib.parse,xml.etree.ElementTree as ET,json,math,datetime

URL='https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WFS/AdministrativeBoundaries'
PARAMS={'SERVICE':'WFS','VERSION':'2.0.0','REQUEST':'GetFeature','TYPENAMES':'ms:A00_Granice_panstwa','SRSNAME':'urn:ogc:def:crs:EPSG::4326','COUNT':2,'OUTPUTFORMAT':'application/gml+xml; version=3.2'}
SOURCE=URL+'?'+urllib.parse.urlencode(PARAMS)
if len(sys.argv)>1:data=Path(sys.argv[1]).read_bytes()
else:
    with urllib.request.urlopen(SOURCE,timeout=60) as response:data=response.read()
root=ET.fromstring(data)
ns={'gml':'http://www.opengis.net/gml/3.2','ms':'http://mapserver.gis.umn.edu/mapserver'}
features=root.findall('.//ms:A00_Granice_panstwa',ns)
assert len(features)==1,'Expected a single country feature'
feature=features[0]
assert feature.findtext('ms:JPT_NAZWA_',namespaces=ns)=='POLSKA'

def simplify(ring,tolerance=25):
    # Equirectangular metric approximation for rendering generalization only.
    xy=[(p[0]*111320*math.cos(math.radians(52)),p[1]*111320) for p in ring]
    keep={0,len(ring)-1};stack=[(0,len(ring)-1)]
    while stack:
        start,end=stack.pop();ax,ay=xy[start];bx,by=xy[end];dx,dy=bx-ax,by-ay;den=dx*dx+dy*dy
        best=-1;index=None
        for i in range(start+1,end):
            x,y=xy[i];t=max(0,min(1,((x-ax)*dx+(y-ay)*dy)/den)) if den else 0
            d=(x-ax-t*dx)**2+(y-ay-t*dy)**2
            if d>best:best=d;index=i
        if best>tolerance*tolerance:
            keep.add(index);stack.extend([(start,index),(index,end)])
    result=[[round(v,6) for v in ring[i]] for i in sorted(keep)]
    assert len(result)>=4 and result[0]==result[-1]
    return result

polygons=[];original_points=0
for polygon in feature.findall('.//gml:Polygon',ns):
    rings=[]
    for pos in polygon.findall('.//gml:posList',ns):
        values=list(map(float,pos.text.split()));assert len(values)%2==0
        ring=[[values[i+1],values[i]] for i in range(0,len(values),2)]
        original_points+=len(ring);rings.append(simplify(ring))
    if rings:polygons.append(rings)
assert polygons,'No country polygons in GML response'
points=[p for polygon in polygons for ring in polygon for p in ring]
bbox=[min(p[0] for p in points),min(p[1] for p in points),max(p[0] for p in points),max(p[1] for p in points)]
assert 14<bbox[0]<14.3 and 48.9<bbox[1]<49.2 and 24<bbox[2]<24.3 and 54.8<bbox[3]<55.5,bbox
props={'name':'Polska','source':'GUGiK / Państwowy Rejestr Granic (PRG)','source_url':SOURCE,'source_layer':'ms:A00_Granice_panstwa','source_feature_id':feature.attrib.get('{'+ns['gml']+'}id'), 'source_version':feature.findtext('ms:IIP_WERSJA',namespaces=ns),'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'generalization_m_approx':25,'notice':'Obrys poglądowy granicy państwa z PRG, obejmujący także morze terytorialne. Nie zastępuje dokumentacji geodezyjnej.'}
geo={'type':'FeatureCollection','name':'Granica Polski / PRG','bbox':bbox,'features':[{'type':'Feature','properties':props,'geometry':{'type':'MultiPolygon','coordinates':polygons}}]}
out=Path(__file__).parent/'poland-boundary.geojson';out.write_text(json.dumps(geo,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print('Poland boundary:',original_points,'->',len(points),'vertices; bbox',bbox,';',out.stat().st_size,'bytes')
