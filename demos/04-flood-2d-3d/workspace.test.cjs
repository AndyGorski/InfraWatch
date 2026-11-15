const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
// Verify navigation against a minimal DOM boundary, without mocking flood calculations.
class Element{
  constructor(){this.hidden=false;this.dataset={};this.childNodes=[];this.attrs={};this.classList={toggle(){}}}
  setAttribute(k,v){this.attrs[k]=v} removeAttribute(k){delete this.attrs[k]}
  cloneNode(){return Object.assign(new Element(),{textContent:this.textContent})}
  replaceChildren(...nodes){this.childNodes=nodes} querySelectorAll(){return []}
}
const elements=new Map(),q=s=>{if(s==='#detailSubjectTitle')return q('#detailPanel h2');if(!elements.has(s))elements.set(s,new Element());return elements.get(s)};
q('#floodGISDetails').hidden=true;q('#asset').childNodes=[Object.assign(new Element(),{textContent:'tower card'})];
const tabs=['map','asset','analysis'].map(view=>Object.assign(new Element(),{dataset:{workspace:view}})),sides=['layers','locations'].map(side=>Object.assign(new Element(),{dataset:{side}}));
let settings,closedStage=0,draws=0,resizes=0,stopped=0,visible;
const ctx={document:{querySelector:q,querySelectorAll:s=>s==='[data-workspace]'?tabs:s==='[data-side]'?sides:[]},MutationObserver:class{observe(){}},requestAnimationFrame:fn=>fn(),state:{view:'3d',selected:{lat:51.6,lon:21.5}},timer:null,
  terrainRenderer:{closeStage(){closedStage++}},map:{invalidateSize(){resizes++},setView(ll,z){ctx.focus=[ll,z]}},draw3d(){draws++},select(p){ctx.state.selected=p},setView(v){ctx.state.view=v},
  InfraWatchTerrain3D:{setVisible(v){visible=v}},InfraWatchUI:{install(config){settings=config},closePanels(){},sync(){},openDetails(){if(!settings.isMap())settings.showMap()}}};ctx.window=ctx;q('#play').click=()=>{stopped++;ctx.timer=null};
vm.createContext(ctx);
const code=fs.readFileSync(path.join(__dirname,'unified-workspace.js'),'utf8');vm.runInContext(code.slice(code.indexOf('function installUnifiedFloodWorkspace()')),ctx);ctx.installUnifiedFloodWorkspace();
assert.equal(settings.isMap(),true);assert.ok(resizes&&draws);
ctx.timer=1;tabs[2].onclick();assert.equal(q('#analysisView').hidden,false);assert.equal(q('#mapView').hidden,true);assert.equal(ctx.state.view,'3d');assert.equal(stopped,1);assert.equal(visible,false);
tabs[1].onclick();assert.equal(q('#assetView').hidden,false);assert.equal(ctx.state.view,'3d');
tabs[0].onclick();assert.equal(visible,true);assert.equal(settings.isMap(),true);
sides[1].onclick();assert.equal(q('#layersPanel').hidden,true);assert.equal(q('#locationsTab').hidden,false);
sides[0].onclick();assert.equal(q('#layersPanel').hidden,false);
let gisFocus=0;ctx.focusFloodGISSelection=()=>gisFocus++;
q('#floodGISDetails').childNodes=[Object.assign(new Element(),{textContent:'GIS card'})];ctx.InfraWatchFloodWorkspace.selected('gis');assert.equal(q('#asset').hidden,true);assert.equal(q('#floodGISDetails').hidden,false);assert.equal(q('#objectOnMap').disabled,false);assert.equal(q('#assetContent').childNodes[1].textContent,'GIS card');
tabs[1].onclick();q('#objectOnMap').onclick();assert.equal(gisFocus,1);assert.equal(settings.isMap(),true);
ctx.select({lat:51.7,lon:21.4});assert.equal(q('#asset').hidden,false);assert.equal(q('#floodGISDetails').hidden,true);assert.equal(q('#objectOnMap').disabled,false);
tabs[1].onclick();q('#objectOnMap').onclick();assert.equal(settings.isMap(),true);assert.equal(ctx.state.view,'2d');assert.equal(ctx.focus[1],15);
assert.ok(closedStage>=5);
// The archived v2 owns every previous local asset and script, byte for byte.
const archive=path.resolve(__dirname,'../04-flood-2d-3d-v2'),manifest=JSON.parse(fs.readFileSync(path.join(archive,'snapshot.json')));
for(const [file,expected]of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(archive,file))).digest('hex'),expected,file);
assert.ok(Object.keys(manifest.files).length>=48);
console.log('PASS: independent 2D/3D and workspace navigation, playback stop, drawer tabs, GIS/tower detail isolation, object focus and complete v2 snapshot hashes.');
