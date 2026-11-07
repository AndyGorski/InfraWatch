/* Workspace adapter. The flood model and its geographic limits stay in app.js. */
function installFloodWorkspace(){
  function showWorkspaceView(view){
    for(const key of ['map','asset','analysis']){
      document.getElementById(key==='map'?'mapView':key==='asset'?'assetView':'analysisView').hidden=key!==view;
      const button=document.querySelector(`[data-flood-view="${key}"]`);button.setAttribute('aria-selected',String(key===view));
    }
    InfraWatchUI.closePanels();
    requestAnimationFrame(()=>{map.invalidateSize({pan:false});if(state.view==='3d')draw3d()});
  }
  document.querySelectorAll('[data-flood-view]').forEach(button=>button.onclick=()=>showWorkspaceView(button.dataset.floodView));
  document.querySelectorAll('[data-flood-side]').forEach(button=>button.onclick=()=>{
    const layers=button.dataset.floodSide==='layers';$('floodLayers').hidden=!layers;$('floodObjects').hidden=layers;
    document.querySelectorAll('[data-flood-side]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button))});
  });
  function mirror(){
    const source=$('floodGISDetails')&&!$('floodGISDetails').hidden?$('floodGISDetails'):$('floodNativeDetail');
    $('floodObjectCard').replaceChildren(...Array.from(source.childNodes,n=>n.cloneNode(true)));
    $('floodObjectCard').querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
  }
  new MutationObserver(mirror).observe(document.querySelector('.detail-panel'),{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});mirror();
  window.placeFloodPanels=(status,detail)=>{$('floodDataStatus').append(status);document.querySelector('.detail-panel').append(detail)};
  window.openFloodGISDetails=()=>{$('floodNativeDetail').hidden=true;InfraWatchUI.openDetails()};
  const oldSelect=select;select=p=>{if($('floodGISDetails'))$('floodGISDetails').hidden=true;$('floodNativeDetail').hidden=false;oldSelect(p);InfraWatchUI.openDetails()};
  InfraWatchUI.install({layersButton:'#openLayers',detailsButton:'#openDetail',isMap:()=>!$('mapView').hidden,showMap:()=>showWorkspaceView('map'),resize:()=>{map.invalidateSize({pan:false});if(state.view==='3d'&&!$('mapView').hidden)draw3d()}});
  const tools=InfraWatchUI.installMapTools(map,{legend:()=>$('floodSourceLegend'),title:'GIS i scenariusz zalania'});
  window.refreshFloodWorkspace=()=>tools.refresh();
  $('configureFlood').onclick=()=>{showWorkspaceView('map');$('openLayers').click();document.querySelector('[data-flood-side="layers"]').click();$('floodModelSettings').open=true;$('floodModelSettings').scrollIntoView({block:'nearest'})};
  $('showFloodF401').onchange=()=>{const available=!window.floodModelAvailable||window.floodModelAvailable();for(const layer of [line,towerLayer])available&&$('showFloodF401').checked?layer.addTo(map):map.removeLayer(layer)};
  document.querySelector('.leaflet-control-zoom-in').setAttribute('aria-label','Przybliż');document.querySelector('.leaflet-control-zoom-out').setAttribute('aria-label','Oddal');
  const extent=document.createElement('button');extent.type='button';extent.textContent='⌗';extent.title='Pokaż wybrany obszar';extent.setAttribute('aria-label',extent.title);extent.onclick=()=>{$('zoom').click()};map.zoomControl.getContainer().append(extent);
  const originalZoom=$('zoom').onclick;$('zoom').onclick=()=>{if(state.view==='2d'&&InfraWatchArea.getBox())InfraWatchArea.focus();else originalZoom()};
}
