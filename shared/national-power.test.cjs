// Actual country inventory plus spatial loading: node shared/national-power.test.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'national-power'),meta=JSON.parse(fs.readFileSync(path.join(root,'metadata.json'),'utf8'));
const sandbox={window:{},URL,Response,DecompressionStream,Math,Map,Set,Number,Error,Promise,Array,String,document:{currentScript:{src:'https://example.test/InfraWatch/shared/national-power.js'}}};
const requests=[];
sandbox.fetch=async url=>{const relative=new URL(url).pathname.replace('/InfraWatch/shared/national-power/','');requests.push(relative);const p=path.join(root,relative);return fs.existsSync(p)?new Response(fs.readFileSync(p)):new Response('missing',{status:404})};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'study-area.js'),'utf8'),sandbox);sandbox.InfraWatchArea=sandbox.window.InfraWatchArea;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'national-power.js'),'utf8'),sandbox);const api=sandbox.window.InfraWatchNationalPower;
(async()=>{
 assert(meta.feature_count>100000,'Country snapshot should substantially exceed old regional inventory');
 assert(meta.snapshot.startsWith('2026-'));assert.equal(meta.operator_verified,false);assert.equal(meta.source_license,'ODbL 1.0');
 const totals={},unique=new Map();let bytes=0;
 for(const [name,entry] of Object.entries(meta.tiles)){
  const data=fs.readFileSync(path.join(root,name));bytes+=data.length;assert.equal(data.length,entry.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),entry.sha256);
  const fc=JSON.parse(zlib.gunzipSync(data));assert.equal(fc.features.length,entry.count);
  for(const f of fc.features){assert(f.id===f.properties.osm_type+'/'+f.properties.osm_id);assert(meta.powers.includes(f.properties.power));assert(f.geometry.coordinates.length);unique.set(f.id,f)}
 }
 assert.equal(bytes,meta.total_partition_bytes);assert.equal(unique.size,meta.feature_count);
 for(const f of unique.values())totals[f.properties.power]=(totals[f.properties.power]||0)+1;
 for(const power of meta.powers)assert.equal(totals[power]||0,meta.counts[power]||0,power+' inventory counts');
 const ov=await api.overview();assert.equal(ov.features.length,meta.overview_count);assert(ov.features.every(f=>f.properties.generalized&&f.properties.source_license==='ODbL 1.0'));
 const nationalFacilities=await api.facilities();assert(nationalFacilities.items.length>1000);assert(nationalFacilities.items.every(f=>unique.has(f.id)&&f.region==='poland'));
 const regions={Warszawa:[52.2297,21.0122],Gdansk:[54.352,18.6466],Szczecin:[53.4285,14.5528],Poznan:[52.4064,16.9252],Wroclaw:[51.1079,17.0385],Krakow:[50.0647,19.945],Lublin:[51.2465,22.5684],Bialystok:[53.1325,23.1688],Rzeszow:[50.0412,21.9991]};
 for(const [name,[lat,lon]] of Object.entries(regions)){
  const box=sandbox.InfraWatchArea.boxFromDimensions(lat,lon,20,10),fc=await api.query(box,{supports:true});
  assert(fc.features.length>0,name+' should have real infrastructure');assert(fc.features.some(f=>f.properties.kind==='line'),name+' should have lines');
  assert.equal(new Set(fc.features.map(f=>f.id)).size,fc.features.length,'Deduplicate geometries spanning partitions');
  assert(fc.features.every(f=>sandbox.InfraWatchArea.geometryIntersectsBox(f.geometry,box)));assert(fc.features.every(f=>f.properties.operator_verified===false));
  console.log(name+': '+fc.features.length+' objects, '+fc.loading_scope.partitions+' partitions');
 }
 const exact=await api.detail(ov.features[0]);assert.equal(exact.id,ov.features[0].id);assert(!exact.properties.generalized);
 assert(api.cacheSize()<=96,'Bound browser cache');
 await assert.rejects(()=>api.query([14,49,24,55]),/zbyt duży/);
 const missing=await api.query([0,0,.01,.01]);assert.equal(missing.features.length,0,'No data is not an invented network');
 console.log('PASS: country inventory integrity, spatial loading across Poland, full detail lookup, attribution, deduplication, bounded cache and geographic limits.');
})().catch(error=>{console.error(error);process.exitCode=1});
