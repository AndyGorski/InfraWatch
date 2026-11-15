const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const sandbox={window:{},URL,Response,DecompressionStream,document:{currentScript:{src:'https://example.test/shared/plant-landmarks.js'}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'plant-landmarks.js'),'utf8'),sandbox);const api=sandbox.window.InfraWatchPlants;
const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'power-plants.json.gz'))));
assert(data.count>4000);assert.equal(data.items.length,data.count);assert.equal(new Set(data.items.map(f=>f.id)).size,data.count);assert.equal(data.license,'ODbL 1.0');
for(const f of data.items){assert(Number.isFinite(f.lat)&&Number.isFinite(f.lon));assert(f.source_url==='https://www.openstreetmap.org/'+f.id);assert.equal(f.operator_verified,false);assert(f.snapshot===data.snapshot);assert(api.symbols[api.type(f)])}
for(const name of ['Bełchatów','Kozienice','Opole','Turów','Żarnowiec'])assert(data.items.some(f=>f.name.includes(name)),'Major plant: '+name);
assert(data.items.some(f=>f.id==='relation/12825526'),'Keep relation-based Rybnik');
const make=source=>({tags:{'plant:source':source}});
assert.equal(api.type(make('solar')),'solar');assert.equal(api.type(make('coal;gas')),'thermal');assert.equal(api.type(make('solar;wind')),'other');assert.equal(api.type({name:'Elektrownia wiatrowa',tags:{}}),'other','Never infer source from a name');
assert.equal(api.capacity({tags:{'plant:output:electricity':'1,2 GW'}}),1200);assert.equal(api.capacity({tags:{'plant:output:electricity':'750 kW'}}),.75);assert.equal(api.capacity({tags:{}}),null);
const project=f=>({x:(f.lon-14)*120,y:(55-f.lat)*180});
for(const zoom of [5,7,9,11,12,16]){const groups=api.groups(data.items,zoom,project),ids=groups.flatMap(g=>g.items.map(f=>f.id));assert.equal(ids.length,data.count);assert.equal(new Set(ids).size,data.count);if(zoom>=12)assert(groups.every(g=>g.items.length===1));else assert(groups.some(g=>g.items.length>1))}
const same=[{id:'a',lat:52,lon:21},{id:'b',lat:52,lon:21}];assert.equal(api.groups(same,5,project).length,1);assert.equal(api.groups(same,12,project).length,2);
assert(api.groups(same,5,project,'a').some(g=>g.items.length===1&&g.items[0].id==='a'),'Selected small plant remains individually identifiable');
const major={id:'major',lat:52,lon:21,tags:{'plant:output:electricity':'1000 MW'}};assert(api.groups([...same,major],5,project).some(g=>g.items.length===1&&g.items[0].id==='major'),'Large plants remain individually identifiable in the country overview');
console.log('PASS: '+data.count+' attributed Polish plants, major facilities, source-based symbols, capacity parsing and lossless grouping at six zoom levels.');
