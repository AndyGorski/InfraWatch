// A filter enabled while the initial GIS request is in flight must not lose its detail layer.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const handlers={},calls=[],published=[];let queued,releaseNetwork;
const selection={details:[]};
const filters={install(){},get:()=>selection,syncLegacyControls(){},apply:fc=>({...fc,features:fc.features.filter(f=>f.properties.kind!=='support'||selection.details.includes('supports'))})};
const element=()=>({append(){},prepend(){},setAttribute(){},classList:{toggle(){}}});
const sandbox={window:{InfraWatchFilters:filters},InfraWatchFilters:filters,URL,Response,DecompressionStream,document:{currentScript:{src:'https://example.test/shared/national-power.js?v=test-version'},createElement:element,addEventListener:(type,handler)=>(handlers[type]??=[]).push(handler)},setTimeout:fn=>{queued=fn;return 1},clearTimeout:()=>{queued=null},InfraWatchArea:{getBox:()=>null,intersectsFeature:()=>true,geometryIntersectsBox:()=>true,refresh(){}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'national-power.js'),'utf8'),sandbox);const api=sandbox.window.InfraWatchNationalPower;
const [x,y]=api.tileXY(21.001,52.001),network=`network/10/${x}/${y}.json.gz`,supports=`supports/10/${x}/${y}.json.gz`;
const metadata={feature_count:2,snapshot:'2026-11-14T21:20:41Z',detail_min_zoom:11,supports_min_zoom:14,tiles:{[network]:{},[supports]:{}}};
const line={type:'Feature',id:'way/1',properties:{power:'line',kind:'line'},geometry:{type:'LineString',coordinates:[[21.001,52.001],[21.002,52.002]]}};
const pole={type:'Feature',id:'node/2',properties:{power:'pole',kind:'support'},geometry:{type:'Point',coordinates:[21.001,52.001]}};
const response=feature=>new Response(zlib.gzipSync(JSON.stringify({type:'FeatureCollection',features:[feature]})));
sandbox.fetch=async url=>{const u=new URL(url),file=u.pathname.replace('/shared/national-power/','');assert.equal(u.searchParams.get('v'),'test-version','Version data requests with the script release');calls.push(file);if(file==='metadata.json')return new Response(JSON.stringify(metadata));if(file===network)return new Promise(resolve=>{releaseNetwork=()=>resolve(response(line))});if(file===supports)return response(pole);throw Error('Unexpected request: '+file)};
const bounds={pad(){return this},getWest:()=>21.001,getSouth:()=>52.001,getEast:()=>21.002,getNorth:()=>52.002};
(async()=>{
 const controller=api.install({on(){},getZoom:()=>14,getBounds:()=>bounds},{container:element(),onData:fc=>published.push(fc)});
 for(let i=0;i<20&&!releaseNetwork;i++)await new Promise(setImmediate);
 assert(releaseNetwork,'Initial network request should be in flight');
 selection.details=['supports'];for(const handler of handlers['iw:map-filters-change'])handler();assert(queued,'An early change must schedule a request with the current detail choices');
 const rerun=queued();releaseNetwork();await Promise.all([controller.ready,rerun]);
 assert(calls.includes(supports),'Fetch newly enabled supports');assert(controller.getData().features.some(f=>f.id==='node/2'),'Publish enabled supports without requiring another pan');assert.equal(published.length,1,'Discard the stale initial result');
 console.log('PASS: detail filters changed during initial loading, stale request isolation and versioned GIS asset URLs.');
})().catch(error=>{console.error(error);process.exitCode=1});
