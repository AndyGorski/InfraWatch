const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let requests=0,fail=false;
const context={window:{},URL,URLSearchParams,AbortSignal,document:{currentScript:{src:'https://example.test/shared/national-sentinel.js'}},localStorage:{getItem:()=>null},fetch:async(url,options)=>{
 requests++;assert(url.endsWith('/mosaic/register'));const query=JSON.parse(options.body);assert.equal(query.collections[0],'sentinel-2-l2a');
 return {ok:!fail,json:async()=>({searchid:'runtime-search'})};
}};
vm.runInNewContext(fs.readFileSync(__dirname+'/national-sentinel.js','utf8'),context);
const api=context.window.InfraWatchSentinel;
(async()=>{
 for(const [name,lon,lat] of [['Świnoujście',14.25,53.91],['Suwałki',22.93,54.11],['Gdańsk',18.65,54.35],['Warszawa',21.01,52.23],['Zgorzelec',15,51.15],['Przemyśl',22.77,49.78],['Zakopane',19.95,49.3]]){
  assert(lon>=api.bbox[0]&&lon<=api.bbox[2]&&lat>=api.bbox[1]&&lat<=api.bbox[3],name);
 }
 for(const year of api.years){const q=api.search(year);assert(q.datetime.startsWith(year+'-06-01'));assert(q.datetime.endsWith(year+'-08-31T23:59:59Z'));assert.equal(q.query['eo:cloud_cover'].lt,10)}
 assert.throws(()=>api.search(2010));
 const first=await Promise.all([api.register(2025),api.register(2025)]);assert.equal(requests,1,'RGB and NDVI share a runtime search');assert.equal(first[0],first[1]);
 const rgb=new URL(api.tileURL('expiring/id',2025,'rgb',{z:10,x:571,y:337}));assert(rgb.pathname.includes('/expiring%2Fid/tiles/WebMercatorQuad/10/571/337.png'));assert.equal(rgb.searchParams.get('assets'),'visual');
 const ndvi=new URL(api.tileURL('id',2022,'ndvi',{z:11,x:1100,y:600}));assert.equal(ndvi.searchParams.get('asset_as_band'),'true');assert.equal(ndvi.searchParams.get('unscale'),'true');assert.equal(ndvi.searchParams.get('expression'),'(B08-B04)/(B08+B04)');
 fail=true;await assert.rejects(api.register(2024));fail=false;assert.equal(await api.register(2024),'runtime-search','A failed registration must be retryable');
 const report=api.report(2025);assert(report.ndvi.includes('No SCL'));assert(report.selection.includes('Different pixels'));assert.equal(report.gis_scope_unchanged,true);
 console.log('PASS: national extent, four seasonal periods, runtime search cache and retry, RGB/NDVI parameters and provenance.');
})().catch(error=>{console.error(error);process.exitCode=1});
