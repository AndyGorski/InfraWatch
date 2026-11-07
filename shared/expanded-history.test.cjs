const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const regions={silesia:read('demos/05-electricity-vegetation/assets/scenes.json'),kozienice:read('demos/03-insar-multisensor-v2/assets/imagery-history.json')};
const catalog=read('shared/analysis-facilities.json');
const sandbox={window:{}};require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname,'study-area.js'),'utf8'),sandbox);
const area=sandbox.window.InfraWatchArea;
for(const [region,meta] of Object.entries(regions)){
 assert.equal(meta.width,3072);assert.deepEqual(meta.scenes.map(s=>s.year),[2020,2022,2024,2025]);
 assert(meta.bbox[0]<meta.previous_bbox[0]&&meta.bbox[1]<meta.previous_bbox[1]&&meta.bbox[2]>meta.previous_bbox[2]&&meta.bbox[3]>meta.previous_bbox[3]);
 const expanded=(meta.bbox[2]-meta.bbox[0])*(meta.bbox[3]-meta.bbox[1]),old=(meta.previous_bbox[2]-meta.previous_bbox[0])*(meta.previous_bbox[3]-meta.previous_bbox[1]);
 assert(expanded>old*3,'Coverage must grow geographically, not by stretching the old image');
 for(const plant of catalog.items.filter(x=>x.kind==='plant'&&x.region===region)){
  assert.equal(area.coverage(area.boxFromDimensions(plant.lat,plant.lon,60,60),meta.bbox),'full',plant.name+' must have Sentinel coverage for 30 km radius');
 }
 for(const scene of meta.scenes){
  assert(scene.coverage_fraction>=.9999);assert(scene.sources.length>=2);
  assert.equal(scene.sources.reduce((n,s)=>n+s.output_pixel_count,0)+scene.nodata_pixel_count,meta.width*meta.height);
  for(const source of scene.sources){
   assert.equal(source.date.slice(0,10),scene.date.slice(0,10));
   assert.equal(source.id.split('_')[0],scene.id.split('_')[0]);
   assert.equal(source.relative_orbit,scene.sources[0].relative_orbit);
   assert(Number.isInteger(source.relative_orbit));
   assert.equal(source.datatake_id.split('_N')[0],scene.sources[0].datatake_id.split('_N')[0]);
   assert(source.geometry&&source.assets.visual&&source.assets.red&&source.assets.nir&&source.assets.scl);
  }
 }
}
assert(fs.readFileSync(path.join(root,'demos/03-insar-multisensor-v2/imagery.js'),'utf8').includes('const sarArea=[[51.57,21.32],[51.73,21.61]]'));
assert(!fs.readFileSync(path.join(root,'demos/04-flood-2d-3d/index.html'),'utf8').includes('expandMap'));
console.log('PASS: expanded same-pass mosaics, >99.99% raster coverage with documented nodata, provenance, all nine plants at 30 km, unchanged SAR extent.');
