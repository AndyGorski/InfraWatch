const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const box={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/line-analysis.js','utf8'),box);const {isLine,createStore}=box.window.InfraWatchLineAnalysis;
const line=(id=1,power='line')=>({type:'Feature',id:'way/'+id,properties:{power,kind:'line',voltage:'400000'},geometry:{type:'LineString',coordinates:[[18,51],[18.1,51.2]]}});
const plain=value=>JSON.parse(JSON.stringify(value));
async function run(){
 assert(isLine(line()));assert(isLine(line(2,'cable')));assert(isLine(line(3,'minor_line')));assert(!isLine(line(4,'substation')));assert(!isLine({...line(),geometry:{type:'Point',coordinates:[18,51]}}));assert(!isLine({...line(),geometry:{type:'LineString',coordinates:{length:2}}}));assert(!isLine({...line(),geometry:{type:'LineString',coordinates:[[NaN,51],[18,52]]}}));
 const overview={...line(),properties:{...line().properties,generalized:true}},full=line();full.geometry.coordinates.splice(1,0,[18.05,51.12]);
 let saved=null,changes=0,before=0;const store=createStore({snapshot:'2026-11-14',resolve:async()=>full,persist:r=>{saved=r},onChange:()=>changes++,beforeCommit:()=>before++});
 assert.equal((await store.select(overview)).status,'selected');assert.deepEqual(plain(store.get().feature.geometry),full.geometry,'Use full source geometry, not overview');assert.equal(before,1);assert.equal(changes,1);assert.equal(saved.selection_unit,'osm_feature');
 const selected=store.get();selected.feature.geometry.coordinates[0][0]=0;assert.equal(store.get().feature.geometry.coordinates[0][0],18,'Do not mutate target through a caller');
 const reload=createStore({snapshot:'2026-11-14',resolve:async f=>f,saved});assert.equal(reload.get().feature.id,full.id);assert.equal(createStore({snapshot:'next-snapshot',saved}).get(),null,'Do not reuse a target from another snapshot');
 assert.equal((await store.select({...line(),geometry:{type:'Point',coordinates:[18,51]}})).status,'invalid');assert.equal(store.get().feature.id,full.id,'Non-lines cannot replace target');
 const unresolved=createStore({snapshot:'2026-11-14',saved,resolve:async f=>f});assert.equal((await unresolved.select(overview)).status,'error');assert.equal(unresolved.get().feature.id,full.id,'Failed detailed load retains previous selection');
 const failed=createStore({snapshot:'2026-11-14',saved,resolve:async()=>{throw Error('network')}});assert.equal((await failed.select(line(2))).status,'error');assert.equal(failed.get().feature.id,full.id);
 const queue=[];const racing=createStore({snapshot:'2026-11-14',saved,resolve:f=>new Promise(resolve=>queue.push(()=>resolve(f)))});
 const a=racing.select(line(2)),b=racing.select(line(3));queue[1]();assert.equal((await b).status,'selected');queue[0]();assert.equal((await a).status,'stale');assert.equal(racing.get().feature.id,'way/3','Latest click wins');
 const c=racing.select(line(4));racing.cancel();queue[2]();assert.equal((await c).status,'stale');assert.equal(racing.get().feature.id,'way/3','Cancel leaves previous target');
 const d=racing.select(line(5));racing.clear();queue[3]();assert.equal((await d).status,'stale');assert.equal(racing.get(),null,'Clear cannot resurrect a pending target');
 store.clear();assert.equal(saved,null,'Clear persists');
 // Run the actual report/export adapter with a target outside the filtered viewport.
 const downloads=[],stubs={window:{InfraWatchLineAnalysis:{get:()=>reload.get()}},localStorage:{getItem:()=>null},state:{layer:'rgb',year:2024},effectiveImagery:'aerial',fmt:n=>String(n),download:(name,text)=>downloads.push({name,text}),InfraWatchArea:{getReport:()=>null}};
 for(const name of ['renderList','renderDetail','renderActions','renderAnalysis','fit','refreshScenario','updateMarkers','renderImageryStatus','showSources','exportGeo','exportCsv','exportHtml'])stubs[name]=()=>{};
 vm.createContext(stubs);vm.runInContext(fs.readFileSync(__dirname+'/real-gis.js','utf8').replace(/\ninit\(\);\s*$/,''),stubs);vm.runInContext('realPower={type:"FeatureCollection",features:[]};realMeta={snapshot:"2026-11-14"};exportGeo()',stubs);
 const exported=JSON.parse(downloads[0].text);assert.equal(exported.features.length,0);assert.equal(exported.analysis_target.feature.id,full.id,'Export target even when display filters exclude it');assert.deepEqual(exported.analysis_target.feature.geometry,full.geometry);assert.equal(exported.analysis_target.assessment_status,'not_computed');assert.equal(exported.analysis_target.imagery_context.displayed_layer,'aerial');assert.equal(exported.analysis_target.imagery_context.sentinel_year,2024);
 const card=vm.runInContext('realLineAnalysisCard()',stubs);assert(card.includes('way/1'));assert(card.includes('pełna geometria jednego odcinka OSM'));assert(card.includes('nie wykonano pomiaru'));
 console.log('PASS: full-geometry line selection, line-only validation, persistence/snapshot invalidation, latest-click wins, cancellation and network failure.');
}
run().catch(error=>{console.error(error);process.exitCode=1});
