function installUnifiedVegetation(){
  const oldSwitch=switchView;
  switchView=function(view){
    oldSwitch(view);document.getElementById('assetView').hidden=view!=='asset';
    InfraWatchUI.closePanels();
  };
  function mirrorObject(){
    const target=document.getElementById('assetContent'),source=document.getElementById('detailPanel');
    target.replaceChildren(...Array.from(source.childNodes,n=>n.cloneNode(true)));
    target.querySelectorAll('[id]').forEach(n=>{const original=n.id;n.id='asset-'+original;if(n.tagName==='BUTTON')n.onclick=()=>{if(original==='realObjectFit')switchView('map');document.getElementById(original)?.click()}});
  }
  new MutationObserver(mirrorObject).observe(document.getElementById('detailPanel'),{childList:true,subtree:true,characterData:true});mirrorObject();
  InfraWatchUI.install({layersButton:'#toggleLayers',detailsButton:'#toggleDetail',isMap:()=>state.view==='map',showMap:()=>switchView('map'),resize:()=>map?.invalidateSize({pan:false})});
  const mapTools=InfraWatchUI.installMapTools(map,{legend:()=>document.getElementById('realLegend'),available:()=>!demoMode});
  const oldMode=setGISMode;
  setGISMode=function(demo){if(demo&&InfraWatchArea.getBox())InfraWatchArea.clear();if(demo&&sources.has('silesia')){data=sources.get('silesia').imagery;activeRegion='silesia';areaConfig.imageryBox=InfraWatchSentinel.national()?InfraWatchSentinel.bbox:data.bbox}oldMode(demo);if(demo)oldDemo.fit();else nationalGIS?.refresh();updateSummary();mapTools.refresh()};
  function updateSummary(){
    if(realPower){const c=InfraWatchArea.countByPower(realPower.features);document.getElementById('realMinorCount').textContent=(c.minor_line+c.cable).toLocaleString('pl-PL')}
    document.getElementById('workspaceBadge').textContent=demoMode?'Zobrazowania rzeczywiste · scenariusz symulowany':'GIS: cała Polska · '+(InfraWatchSentinel.national()?'Sentinel-2: Polska':'archiwum regionalne');
    document.getElementById('scenarioHighCount').textContent=locations.filter(p=>scenarioRisk(p,state.year)==='high').length;
    document.getElementById('scenarioLength').textContent=routeLength.toLocaleString('pl-PL',{maximumFractionDigits:1})+' km';
  }
  const oldStatus=renderImageryStatus;
  renderImageryStatus=function(){oldStatus();document.getElementById('showHistory').hidden=effectiveImagery!=='aerial';document.querySelector('.timeline-info .eyebrow').textContent='Historia zobrazowań Sentinel-2';updateSummary();availability();if(effectiveImagery==='aerial')document.getElementById('timelineNote').textContent='Lotnicze GUGiK; morze i luki: Sentinel-2 z wybranego roku. Daty nalotów są niezależne od snapshotu ogólnopolskiego GIS.';else if(InfraWatchSentinel.national())document.getElementById('timelineNote').textContent='Mozaika czerwiec–sierpień; różne daty pikseli. NDVI online bez maski chmur SCL. Ogólnopolski GIS nie zawiera pomiarów zagrożeń.'};
  document.getElementById('showHistory').onclick=()=>{
    if(!InfraWatchSentinel.national()&&InfraWatchArea.coverage(InfraWatchArea.getBox(),data.bbox)==='none')return;
    stopHistory();state.layer=state.layer==='ndvi'?'ndvi':'rgb';const b=InfraWatchArea.getBox()||data.bbox;
    map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{padding:[18,18],maxZoom:11});updateLayer();renderTimeline();
  };
  document.getElementById('focusButton').onclick=()=>demoMode?selectLocation(state.selected,true):selectRealFeature(realSelected,true);
  document.getElementById('mobileLayers').onclick=()=>document.getElementById('toggleLayers').click();
  document.getElementById('mobileDetail').onclick=()=>document.getElementById('toggleDetail').click();
  document.querySelectorAll('[data-side]').forEach(b=>{b.setAttribute('aria-controls',b.dataset.side==='layers'?'layersPanel':'locationsTab');b.setAttribute('aria-pressed',String(b.classList.contains('selected')));b.addEventListener('click',()=>document.querySelectorAll('[data-side]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))))});
  let activeRegion='silesia',nationalGIS;const sources=new Map();
  const regionalReady=InfraWatchData.allImagery().then(async items=>{items.forEach(s=>sources.set(s.region,s));if(Object.values(realPlan).some(p=>!p.feature))for(const s of await InfraWatchData.all())s.gis.features.forEach(f=>{if(realPlan[f.id]&&!realFeatureIndex.has(f.id))realFeatureIndex.set(f.id,f)})});
  function availability(){
    const unavailable=!InfraWatchSentinel.national()&&InfraWatchArea.coverage(InfraWatchArea.getBox(),data.bbox)==='none';
    document.querySelectorAll('[data-layer="rgb"],[data-layer="ndvi"],#showHistory,#playHistory,#timeSlider,#yearTrack button').forEach(b=>{b.disabled=unavailable;b.title=unavailable?'Brak przygotowanego archiwum dla wybranego obszaru':''});
    if(unavailable)document.getElementById('timelineNote').textContent='Dla tego obszaru nie przygotowano historii Sentinel-2. Mapa pokazuje niezależną mozaikę lotniczą GUGiK.';
  }
  map.setMaxBounds(null);map.setMinZoom(5);aerialTiles.options.minZoom=5;
  const areaConfig={
    name:'Polska',imageryBox:data.bbox,gisBox:realMeta.aoi_bbox,showMap:()=>switchView('map'),stats:()=>({total:realPower.features.length,lines:realPower.features.filter(f=>f.properties.kind==='line').length}),
    onChange:b=>{
      stopHistory();if(b&&demoMode)setGISMode(false);
      nationalGIS?.refresh();availability();
    },setAvailability:availability,
    onNavigate:coverage=>{if(!InfraWatchSentinel.national()&&coverage!=='full'){stopHistory();state.layer='aerial';applyImageryPolicy(true)}}
  };InfraWatchArea.install(map,areaConfig);
  nationalGIS=InfraWatchNationalPower.install(map,{container:document.getElementById('layersPanel'),enabled:()=>!demoMode,onStatus:text=>{if(!demoMode)document.querySelector('.map-status').textContent='GIS OSM · '+text},onData:(fc,meta)=>{
    if(meta)realMeta=meta;realPower=fc;realLayerIndex.clear();
    for(const [id,key] of [['showRealLines','lines'],['showRealMinor','minor'],['showRealCables','cables'],['showRealStations','stations'],['showRealDevices','devices'],['showRealSupports','supports']])document.getElementById(id).checked?realGroups[key].addTo(map):map.removeLayer(realGroups[key]);
    const retained=[realSelected,...Object.keys(realPlan)].map(id=>realFeatureIndex.get(id)).filter(Boolean);realFeatureIndex.clear();retained.forEach(f=>realFeatureIndex.set(f.id,f));fc.features.forEach(f=>{if(f.id!==realSelected||!f.properties.generalized)realFeatureIndex.set(f.id,f)});
    for(const key of ['lines','minor','stations','cables','devices'])realGroups[key].clearLayers().addData(fc);
    if(realSelected&&!fc.features.some(f=>f.id===realSelected))realSelected=null;
    const c=InfraWatchArea.countByPower(fc.features);
    for(const [id,n] of [['showRealLines',c.line],['showRealMinor',c.minor_line],['showRealCables',c.cable],['showRealSupports',c.tower+c.pole],['showRealStations',c.substation],['showRealDevices',c.transformer+c.switch+c.compensator+c.converter]])document.querySelector(`label:has(#${id}) small`).textContent=n.toLocaleString('pl-PL')+' wczytanych obiektów';
    renderRealList();renderRealDetail();renderRealAnalysis();highlightRealSelection();updateSummary();
  }});
  InfraWatchFacility.install(map,{mode:'vegetation',region:'silesia',name:'Cała Polska',ready:regionalReady,getFeatures:async(f,r)=>{const fc=await InfraWatchNationalPower.query(InfraWatchArea.boxFromDimensions(f.lat,f.lon,2*r,2*r));return fc.features},
    beforeApply:async f=>{
      await regionalReady;const s=sources.get(f.region==='poland'?InfraWatchData.nearestRegion(f):f.region);stopHistory();if(demoMode)setGISMode(false);
      activeRegion=s.region;data=s.imagery;
      areaConfig.imageryBox=InfraWatchSentinel.national()?InfraWatchSentinel.bbox:data.bbox;
      state.layer=state.layer==='ndvi'?'ndvi':'rgb';applyImageryPolicy(true);renderTimeline();renderRealAnalysis();
    },
    prepareLayers:local=>{if(demoMode)setGISMode(false);document.getElementById('showRealLines').checked=true;realGroups.lines.addTo(map);document.getElementById('showRealMinor').checked=local;local?realGroups.minor.addTo(map):map.removeLayer(realGroups.minor)},
    showLines:()=>{document.getElementById('realSearch').value='';document.querySelector('[data-side="locations"]').click();renderRealList()},selectLine:async(id,f)=>{if(f)realFeatureIndex.set(f.id,f);await selectRealFeature(id,false)}
  });
  const oldPlayHistory=document.getElementById('playHistory').onclick;
  document.getElementById('playHistory').onclick=()=>{const b=InfraWatchArea.getBox();if(b&&!historyTimer&&(state.layer==='aerial'||isDetailView())){state.layer='rgb';map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{padding:[18,18],maxZoom:11,animate:false});updateLayer()}oldPlayHistory()};
  document.getElementById('fitMap').onclick=()=>{if(InfraWatchArea.getBox())InfraWatchArea.focus();else {if(state.layer==='aerial')state.layer='rgb';fit();updateLayer();renderTimeline()}};
  InfraWatchSentinel.install({container:document.getElementById('layersPanel'),map,onChange:extent=>{stopHistory();nationalSentinelKey=null;if(extent)state.layer='rgb';else if(!InfraWatchSentinel.national()&&InfraWatchArea.coverage(InfraWatchArea.getBox(),data.bbox)==='none')state.layer='aerial';areaConfig.imageryBox=InfraWatchSentinel.national()?InfraWatchSentinel.bbox:data.bbox;applyImageryPolicy(true);renderTimeline();InfraWatchArea.refresh();availability()}});
  areaConfig.imageryBox=InfraWatchSentinel.national()?InfraWatchSentinel.bbox:data.bbox;
  const oldSources=showSources;showSources=function(){oldSources();document.getElementById('sourceContent').insertAdjacentHTML('afterbegin',InfraWatchSentinel.sourceHTML())};
  ['sourcesButton','helpButton','aboutButton'].forEach(id=>document.getElementById(id).onclick=showSources);
  document.querySelectorAll('[data-layer]').forEach(button=>{button.onclick=()=>{state.layer=button.dataset.layer;if(state.layer==='aerial'){if(!isDetailView())map.setZoom(13)}else if(isDetailView()){if(InfraWatchSentinel.national())map.setZoom(11);else fit()}updateLayer();renderTimeline()}});
  document.querySelector('#studyAreaDialog .note').textContent='GIS: cała Polska, szczegóły pobierane dla wybranego obszaru. Sentinel-2 i NDVI: ogólnopolskie mozaiki letnie. Archiwum konkretnych dat i scenariusz roślinności pozostają regionalne. Wybór nie tworzy analizy bezpieczeństwa.';
  updateSummary();renderImageryStatus();
  requestAnimationFrame(()=>{map.invalidateSize({pan:false});if(!InfraWatchArea.getBox()&&!new URL(location.href).searchParams.has('facility'))fit()});
}
