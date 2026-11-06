/* Shared navigation, panel behaviour and keyboard controls for monitoring apps. */
window.InfraWatchUI = (() => {
  let settings,desktopLayers=true,desktopDetails=true,mobileLayers=false,mobileDetails=false;
  const small=()=>matchMedia('(max-width: 1000px)').matches;
  const q=selector=>document.querySelector(selector);
  function sync(){
    if(!settings)return;
    const isMap=settings.isMap();document.body.dataset.iwView=isMap?'map':'other';
    document.body.classList.toggle('iw-layers-collapsed',!desktopLayers);
    document.body.classList.toggle('iw-details-collapsed',!desktopDetails);
    document.body.classList.toggle('iw-open-layers',isMap&&small()&&mobileLayers);
    document.body.classList.toggle('iw-open-details',isMap&&small()&&mobileDetails);
    q(settings.layersButton).setAttribute('aria-expanded',String(isMap&&(small()?mobileLayers:desktopLayers)));
    q(settings.detailsButton).setAttribute('aria-expanded',String(isMap&&(small()?mobileDetails:desktopDetails)));
    document.querySelectorAll('.view-tabs [role="tab"]').forEach(b=>b.tabIndex=b.getAttribute('aria-selected')==='true'?0:-1);
    requestAnimationFrame(()=>settings.resize());
  }
  function openDetails(){if(!settings)return;if(!settings.isMap())settings.showMap();desktopDetails=true;mobileDetails=true;mobileLayers=false;sync()}
  function closePanels(){mobileLayers=false;mobileDetails=false;sync()}
  function install(config){
    settings=config;
    const layers=q('.locations-panel,.layer-panel'),details=q('.detail-panel');layers.id||='workspaceLayers';details.id||='workspaceDetails';
    q(config.layersButton).setAttribute('aria-controls',layers.id);q(config.detailsButton).setAttribute('aria-controls',details.id);
    q(config.layersButton).onclick=()=>{const wasMap=config.isMap();if(!wasMap)config.showMap();if(small()){mobileLayers=wasMap?!mobileLayers:true;mobileDetails=false}else desktopLayers=wasMap?!desktopLayers:true;sync()};
    q(config.detailsButton).onclick=()=>{const wasMap=config.isMap();if(!wasMap)config.showMap();if(small()){mobileDetails=wasMap?!mobileDetails:true;mobileLayers=false}else desktopDetails=wasMap?!desktopDetails:true;sync()};
    document.querySelectorAll('[data-close-workspace]').forEach(b=>b.onclick=closePanels);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanels()});
    document.querySelectorAll('.view-tabs').forEach(list=>list.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      const tabs=[...list.querySelectorAll('[role="tab"]')],current=tabs.indexOf(document.activeElement);if(current<0)return;
      const index=e.key==='Home'?0:e.key==='End'?tabs.length-1:(current+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      e.preventDefault();tabs[index].click();tabs[index].focus();sync();
    }));
    matchMedia('(max-width: 1000px)').addEventListener('change',closePanels);
    const map=q('#map');if(map)new ResizeObserver(()=>requestAnimationFrame(()=>config.resize())).observe(map);
    sync();
  }
  return {install,sync,openDetails,closePanels};
})();
