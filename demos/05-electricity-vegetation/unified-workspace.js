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
  setGISMode=function(demo){if(demo&&activeRegion!=='silesia'){toast('Scenariusz zarastania jest przygotowany tylko dla Śląska.');return}if(demo&&InfraWatchArea.getBox())InfraWatchArea.clear();oldMode(demo);if(demo)oldDemo.fit();updateSummary();mapTools.refresh()};
  function updateSummary(){
    if(realPower)document.getElementById('realMinorCount').textContent=InfraWatchArea.countByPower(realPower.features).minor_line.toLocaleString('pl-PL');
    document.getElementById('workspaceBadge').textContent=demoMode?'Zobrazowania rzeczywiste · scenariusz symulowany':'Zobrazowania i GIS rzeczywiste';
    document.getElementById('scenarioHighCount').textContent=locations.filter(p=>scenarioRisk(p,state.year)==='high').length;
    document.getElementById('scenarioLength').textContent=routeLength.toLocaleString('pl-PL',{maximumFractionDigits:1})+' km';
  }
  const oldStatus=renderImageryStatus;
  renderImageryStatus=function(){oldStatus();document.getElementById('showHistory').hidden=effectiveImagery!=='aerial';document.querySelector('.timeline-info .eyebrow').textContent='Historia zobrazowań Sentinel-2';updateSummary();availability()};
  document.getElementById('showHistory').onclick=()=>{
    if(InfraWatchArea.coverage(InfraWatchArea.getBox(),data.bbox)==='none')return;
    stopHistory();state.layer=state.layer==='ndvi'?'ndvi':'rgb';const b=InfraWatchArea.getBox()||data.bbox;
    map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{padding:[18,18],maxZoom:11});updateLayer();renderTimeline();
  };
  document.getElementById('focusButton').onclick=()=>demoMode?selectLocation(state.selected,true):selectRealFeature(realSelected,true);
  document.getElementById('mobileLayers').onclick=()=>document.getElementById('toggleLayers').click();
  document.getElementById('mobileDetail').onclick=()=>document.getElementById('toggleDetail').click();
  document.querySelectorAll('[data-side]').forEach(b=>{b.setAttribute('aria-controls',b.dataset.side==='layers'?'layersPanel':'locationsTab');b.setAttribute('aria-pressed',String(b.classList.contains('selected')));b.addEventListener('click',()=>document.querySelectorAll('[data-side]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))))});
  let allPower=realPower,activeRegion='silesia';const sources=new Map();
  InfraWatchData.seed('silesia',realPower,realMeta);
  const regionalReady=InfraWatchData.all().then(items=>{items.forEach(s=>{sources.set(s.region,s);s.gis.features.forEach(f=>realFeatureIndex.set(f.id,f))});if(state.view==='actions')renderRealActions()});
  function availability(){
    const unavailable=InfraWatchArea.coverage(InfraWatchArea.getBox(),data.bbox)==='none';
    document.querySelectorAll('[data-layer="rgb"],[data-layer="ndvi"],#showHistory,#playHistory,#timeSlider,#yearTrack button').forEach(b=>{b.disabled=unavailable;b.title=unavailable?'Brak przygotowanego archiwum dla wybranego obszaru':''});
    if(unavailable)document.getElementById('timelineNote').textContent='Dla tego obszaru nie przygotowano historii Sentinel-2. Mapa pokazuje niezależną mozaikę lotniczą GUGiK.';
  }
  map.setMaxBounds(null);map.setMinZoom(6);aerialTiles.options.minZoom=6;
  const areaConfig={
    name:'Śląsk',imageryBox:data.bbox,gisBox:realMeta.aoi_bbox,showMap:()=>switchView('map'),stats:()=>({total:realPower.features.length,lines:realPower.features.filter(f=>f.properties.kind==='line').length}),
    onChange:b=>{
      stopHistory();if(b&&demoMode)setGISMode(false);
      realPower={...allPower,features:allPower.features.filter(InfraWatchArea.intersectsFeature)};realLayerIndex.clear();
      for(const key of ['lines','minor','stations'])realGroups[key].clearLayers().addData(realPower);
      if(!realPower.features.some(f=>f.id===realSelected))realSelected=realPower.features.find(f=>f.properties.power==='line')?.id||realPower.features[0]?.id||null;
      renderRealList();renderRealDetail();highlightRealSelection();updateSummary();
      const c=InfraWatchArea.countByPower(realPower.features);
      for(const [id,n] of [['showRealLines',c.line],['showRealMinor',c.minor_line],['showRealSupports',c.tower+c.pole],['showRealStations',c.substation]])document.querySelector(`label:has(#${id}) small`).textContent=n.toLocaleString('pl-PL')+' obiektów w zbiorze';
      availability();
    },setAvailability:availability,
    onNavigate:coverage=>{if(coverage!=='full'){stopHistory();state.layer='aerial';applyImageryPolicy(true)}}
  };InfraWatchArea.install(map,areaConfig);
  InfraWatchFacility.install(map,{mode:'vegetation',region:'silesia',name:'Wszystkie regiony',ready:regionalReady,getFeatures:f=>sources.get(f.region).gis.features,
    beforeApply:async f=>{
      await regionalReady;const s=sources.get(f.region);stopHistory();if(demoMode)setGISMode(false);
      activeRegion=s.region;allPower=s.gis;realMeta=s.meta;data=s.imagery;allPower.features.forEach(f=>realFeatureIndex.set(f.id,f));
      areaConfig.name=s.name;areaConfig.imageryBox=data.bbox;areaConfig.gisBox=realMeta.aoi_bbox;
      document.querySelector('#areaLocationPreset option[value=source]').textContent='Obszar danych: '+s.name;
      document.querySelector('.sidebar-heading h1').textContent='Sieć energetyczna · '+s.name;
      document.getElementById('demoMode').disabled=s.region!=='silesia';document.getElementById('demoMode').title=s.region!=='silesia'?'Scenariusz zarastania dostępny na Śląsku':'';
      state.layer=state.layer==='ndvi'?'ndvi':'rgb';applyImageryPolicy(true);renderTimeline();renderRealAnalysis();
    },
    prepareLayers:local=>{if(demoMode)setGISMode(false);document.getElementById('showRealLines').checked=true;realGroups.lines.addTo(map);document.getElementById('showRealMinor').checked=local;local?realGroups.minor.addTo(map):map.removeLayer(realGroups.minor)},
    showLines:()=>{document.getElementById('realSearch').value='';document.querySelector('[data-side="locations"]').click();renderRealList()},selectLine:id=>selectRealFeature(id,false)
  });
  const oldPlayHistory=document.getElementById('playHistory').onclick;
  document.getElementById('playHistory').onclick=()=>{const b=InfraWatchArea.getBox();if(b&&!historyTimer&&(state.layer==='aerial'||isDetailView())){state.layer='rgb';map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{padding:[18,18],maxZoom:11,animate:false});updateLayer()}oldPlayHistory()};
  document.getElementById('fitMap').onclick=()=>{if(InfraWatchArea.getBox())InfraWatchArea.focus();else {if(state.layer==='aerial')state.layer='rgb';fit();updateLayer();renderTimeline()}};
  updateSummary();renderImageryStatus();
}
