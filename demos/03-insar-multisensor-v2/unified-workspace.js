InfraWatchUI.install({layersButton:'#openLayers',detailsButton:'#openDetail',isMap:()=>!$('mapView').hidden,showMap:()=>showWorkspaceView('map'),resize:()=>map.invalidateSize({pan:false})});
InfraWatchUI.installMapTools(map,{legend:()=>document.querySelector('#deformLayers .gis-legend')});
document.querySelectorAll('[data-deform-side]').forEach(b=>b.onclick=()=>{
  const layers=b.dataset.deformSide==='layers';$('deformLayers').hidden=!layers;$('deformObjects').hidden=layers;
  document.querySelectorAll('[data-deform-side]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});
});
$('export').onclick=()=>$('exportDialog').showModal();
$('closeExport').onclick=()=>$('exportDialog').close();
$('downloadSchema').onclick=()=>$('sample').click();
const extent=document.createElement('button');extent.type='button';extent.textContent='⌗';extent.title='Pokaż obszar GIS';extent.setAttribute('aria-label','Pokaż obszar GIS');extent.onclick=event=>{event.stopPropagation();$('fitGIS').click()};map.zoomControl.getContainer().append(extent);
document.querySelector('.leaflet-control-zoom-in').setAttribute('aria-label','Przybliż');document.querySelector('.leaflet-control-zoom-out').setAttribute('aria-label','Oddal');
let historyBox=[21.24,51.48,21.86,51.78],activeRegion='kozienice';const sources=new Map(),radarBox=[21.32,51.57,21.61,51.73];
map.setMinZoom(6);
function areaAvailability({sentinel,sar}){
  if(InfraWatchSentinel.national())sentinel=InfraWatchArea.coverage(InfraWatchArea.getBox(),InfraWatchSentinel.bbox);
  if(activeRegion!=='kozienice')sar='none';
  for(const id of ['optBtn','ndviBtn','showHistory','playHistory','historySlider']){$(id).disabled=sentinel==='none';$(id).title=sentinel==='none'?'Brak przygotowanego archiwum dla wybranego obszaru':''}
  document.querySelectorAll('#historyYears button').forEach(b=>b.disabled=sentinel==='none');
  for(const id of ['sarBtn','mixBtn','blend'])$(id).disabled=sar==='none'||(id==='mixBtn'&&sentinel==='none');
  if(sentinel==='none')$('historyNote').textContent='Dla tego obszaru nie przygotowano historii Sentinel-2. Dostępna jest niezależna mozaika lotnicza GUGiK.';
}
const areaConfig={
  name:'Kozienice',imageryBox:historyBox,gisBox:historyBox,sarBox:radarBox,showMap:()=>showWorkspaceView('map'),
  stats:()=>{const c=powerGIS.getReport().counts||{};return {total:Object.values(c).reduce((a,b)=>a+b,0),lines:(c.line||0)+(c.minor_line||0)+(c.cable||0)}},
  onChange:()=>{powerGIS.refreshStudyArea();powerGIS.refreshNational();render();imagery.refresh()},setAvailability:areaAvailability,
  onNavigate:coverage=>{if(!InfraWatchSentinel.national()&&coverage!=='full')imagery.setMode('ortho',true);else if(InfraWatchArea.coverage(InfraWatchArea.getBox(),radarBox)==='none'&&['sar','mix'].includes(imagery.getReport().requested_mode))imagery.setMode('optical',true)}
};InfraWatchArea.install(map,areaConfig);
const regionalReady=Promise.all([InfraWatchData.allImagery().then(items=>items.forEach(s=>sources.set(s.region,s))),powerGIS.ready,imagery.ready,initialInfrastructureReady]);
regionalReady.then(async()=>{const s=sources.get(activeRegion),meta=await InfraWatchNationalPower.metadata();historyBox=s.imagery.bbox;areaConfig.name='Polska';areaConfig.imageryBox=InfraWatchSentinel.national()?InfraWatchSentinel.bbox:historyBox;areaConfig.gisBox=meta.aoi_bbox;document.querySelector('#areaLocationPreset option[value=source]').textContent='Obszar danych GIS: Polska';InfraWatchArea.refresh()});
InfraWatchFacility.install(map,{mode:'deformation',region:'kozienice',name:'Cała Polska',ready:regionalReady,getFeatures:async(f,r)=>(await InfraWatchNationalPower.query(InfraWatchArea.boxFromDimensions(f.lat,f.lon,2*r,2*r))).features,
  beforeApply:async f=>{await regionalReady;const s=sources.get(f.region==='poland'?InfraWatchData.nearestRegion(f):f.region);activeRegion=s.region;historyBox=s.imagery.bbox;areaConfig.imageryBox=InfraWatchSentinel.national()?InfraWatchSentinel.bbox:historyBox;imagery.setDataset(s);document.querySelector('.sidebar-heading .eyebrow').textContent='Polska / GIS energetyczny';if(!imported)$('mode').textContent=s.region==='kozienice'?'36 syntetycznych epok miesięcznych':'Punkty demo: Kozienice · dla tego regionu użyj importu CSV'},
  prepareLayers:local=>{$('showGISLines').checked=true;$('showGISMinor').checked=local},
  showLines:()=>{$('gisSearch').value='';$('gisSearch').oninput();document.querySelector('[data-deform-side="objects"]').click()},selectLine:(id,f)=>powerGIS.selectFeature(id,f)
});
const fitOriginalGIS=$('fitGIS').onclick,fitOriginalLine=$('fitBtn').onclick;
$('fitGIS').onclick=()=>InfraWatchArea.getBox()?InfraWatchArea.focus():fitOriginalGIS();
$('fitBtn').onclick=()=>InfraWatchArea.getBox()?InfraWatchArea.focus():fitOriginalLine();
imagery.ready.then(()=>InfraWatchArea.refresh());
document.addEventListener('iw:sentinel-scope-change',()=>{areaConfig.imageryBox=InfraWatchSentinel.national()?InfraWatchSentinel.bbox:historyBox;InfraWatchArea.refresh();imagery.refresh()});
map.on('zoomend moveend',()=>{const b=InfraWatchArea.getBox();if(b)areaAvailability({sentinel:InfraWatchArea.coverage(b,historyBox),sar:InfraWatchArea.coverage(b,radarBox)})});
