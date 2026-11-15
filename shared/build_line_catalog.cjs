/* Build the compact nationwide line search index from generated network tiles. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.join(__dirname,'national-power'),metaPath=path.join(root,'metadata.json');
const meta=JSON.parse(fs.readFileSync(metaPath,'utf8'));
const tile=(lon,lat,z=10)=>{const n=2**z;return [Math.floor((lon+180)/360*n),Math.floor((1-Math.asinh(Math.tan(Math.max(-85,Math.min(85,lat))*Math.PI/180))/Math.PI)/2*n)]};
const props=['power','kind','name','ref','voltage','operator','circuits','cables','osm_type','osm_id','length_km_in_aoi'];
const items=new Map();
for(const [relative,entry] of Object.entries(meta.tiles)){
 if(!relative.startsWith('network/'))continue;
 const file=path.join(root,relative),fc=JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
 for(const f of fc.features){
  if(!['line','minor_line','cable'].includes(f.properties.power)||items.has(f.id))continue;
  const b=f.bbox,parts=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
  if(!parts?.length||parts[0].length<2)continue;
  const [x,y]=tile(b[0],b[3]),coords=[parts[0][0],parts.at(-1).at(-1)];
  const p={};for(const key of props)if(f.properties[key]!==undefined)p[key]=f.properties[key];
  p.generalized=true;p.detail_tile=`network/10/${x}/${y}.json.gz`;
  items.set(f.id,{type:'Feature',id:f.id,properties:p,geometry:{type:'LineString',coordinates:coords},bbox:b});
 }
}
const payload=Buffer.from(JSON.stringify({type:'FeatureCollection',features:[...items.values()],snapshot:meta.snapshot}));
const compressed=zlib.gzipSync(payload,{level:9,mtime:0}),catalogPath=path.join(root,'line-catalog.json.gz');
fs.writeFileSync(catalogPath,compressed);
meta.line_catalog={bytes:compressed.length,sha256:crypto.createHash('sha256').update(compressed).digest('hex')};
meta.line_catalog_count=items.size;
fs.writeFileSync(metaPath,JSON.stringify(meta,null,2)+'\n');
console.log(JSON.stringify({count:items.size,bytes:compressed.length,sha256:meta.line_catalog.sha256}));
