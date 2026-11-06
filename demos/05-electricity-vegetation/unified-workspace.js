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
  setGISMode=function(demo){oldMode(demo);updateSummary();mapTools.refresh()};
  function updateSummary(){
    if(realMeta)document.getElementById('realMinorCount').textContent=Number(realMeta.counts.minor_line||0).toLocaleString('pl-PL');
    document.getElementById('workspaceBadge').textContent=demoMode?'Zobrazowania rzeczywiste · scenariusz symulowany':'Zobrazowania i GIS rzeczywiste';
    document.getElementById('scenarioHighCount').textContent=locations.filter(p=>scenarioRisk(p,state.year)==='high').length;
    document.getElementById('scenarioLength').textContent=routeLength.toLocaleString('pl-PL',{maximumFractionDigits:1})+' km';
  }
  const oldStatus=renderImageryStatus;
  renderImageryStatus=function(){oldStatus();document.getElementById('showHistory').hidden=effectiveImagery!=='aerial';document.querySelector('.timeline-info .eyebrow').textContent='Historia zobrazowań Sentinel-2';updateSummary()};
  document.getElementById('showHistory').onclick=()=>{
    stopHistory();state.layer=state.layer==='ndvi'?'ndvi':'rgb';const b=data.bbox;
    map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{padding:[18,18],maxZoom:11});updateLayer();renderTimeline();
  };
  document.getElementById('focusButton').onclick=()=>demoMode?selectLocation(state.selected,true):selectRealFeature(realSelected,true);
  document.getElementById('mobileLayers').onclick=()=>document.getElementById('toggleLayers').click();
  document.getElementById('mobileDetail').onclick=()=>document.getElementById('toggleDetail').click();
  document.querySelectorAll('[data-side]').forEach(b=>{b.setAttribute('aria-controls',b.dataset.side==='layers'?'layersPanel':'locationsTab');b.setAttribute('aria-pressed',String(b.classList.contains('selected')));b.addEventListener('click',()=>document.querySelectorAll('[data-side]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))))});
  updateSummary();renderImageryStatus();
}
