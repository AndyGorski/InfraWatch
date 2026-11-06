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
  setGISMode=function(demo){if(demo&&InfraWatchArea.getBox())InfraWatchArea.clear();oldMode(demo);if(demo)oldDemo.fit();updateSummary();mapTools.refresh()};
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
  const allPower=realPower;
  function availability(){
    const unavailable=InfraWatchArea.coverage(InfraWatchArea.getBox(),data.bbox)==='none';
    document.querySelectorAll('[data-layer="rgb"],[data-layer="ndvi"],#showHistory,#playHistory,#timeSlider,#yearTrack button').forEach(b=>{b.disabled=unavailable;b.title=unavailable?'Brak przygotowanego archiwum dla wybranego obszaru':''});
    if(unavailable)document.getElementById('timelineNote').textContent='Dla tego obszaru nie przygotowano historii Sentinel-2. Mapa pokazuje niezależną mozaikę lotniczą GUGiK.';
  }
  map.setMaxBounds(null);map.setMinZoom(6);aerialTiles.options.minZoom=6;
  InfraWatchArea.install(map,{
    name:'Śląsk',imageryBox:data.bbox,gisBox:realMeta.aoi_bbox,showMap:()=>switchView('map'),stats:()=>({total:realPower.features.length}),
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
  });
  document.getElementById('fitMap').onclick=()=>{if(InfraWatchArea.getBox())InfraWatchArea.focus();else {if(state.layer==='aerial')state.layer='rgb';fit();updateLayer();renderTimeline()}};
  updateSummary();renderImageryStatus();
}
