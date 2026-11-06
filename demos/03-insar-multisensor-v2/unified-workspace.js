InfraWatchUI.install({layersButton:'#openLayers',detailsButton:'#openDetail',isMap:()=>!$('mapView').hidden,showMap:()=>showWorkspaceView('map'),resize:()=>map.invalidateSize({pan:false})});
document.querySelectorAll('[data-deform-side]').forEach(b=>b.onclick=()=>{
  const layers=b.dataset.deformSide==='layers';$('deformLayers').hidden=!layers;$('deformObjects').hidden=layers;
  document.querySelectorAll('[data-deform-side]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});
});
$('export').onclick=()=>$('exportDialog').showModal();
$('closeExport').onclick=()=>$('exportDialog').close();
$('downloadSchema').onclick=()=>$('sample').click();
const extent=document.createElement('button');extent.type='button';extent.textContent='⌗';extent.title='Pokaż obszar GIS';extent.setAttribute('aria-label','Pokaż obszar GIS');extent.onclick=event=>{event.stopPropagation();$('fitGIS').click()};map.zoomControl.getContainer().append(extent);
document.querySelector('.leaflet-control-zoom-in').setAttribute('aria-label','Przybliż');document.querySelector('.leaflet-control-zoom-out').setAttribute('aria-label','Oddal');
