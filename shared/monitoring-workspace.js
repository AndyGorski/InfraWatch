/* Shared navigation, panel behaviour and keyboard controls for monitoring apps. */
window.InfraWatchUI = (() => {
  let settings,layersOpen=false,detailsOpen=false;
  const q=selector=>document.querySelector(selector);
  function sync(){
    if(!settings)return;
    const isMap=settings.isMap();document.body.dataset.iwView=isMap?'map':'other';
    document.body.classList.toggle('iw-layers-collapsed',!layersOpen);
    document.body.classList.toggle('iw-details-collapsed',!detailsOpen);
    document.body.classList.toggle('iw-open-layers',isMap&&layersOpen);
    document.body.classList.toggle('iw-open-details',isMap&&detailsOpen);
    q(settings.layersButton).setAttribute('aria-expanded',String(isMap&&layersOpen));
    q(settings.detailsButton).setAttribute('aria-expanded',String(isMap&&detailsOpen));
    document.querySelectorAll('.view-tabs [role="tab"]').forEach(b=>b.tabIndex=b.getAttribute('aria-selected')==='true'?0:-1);
    requestAnimationFrame(()=>settings.resize());
  }
  function openDetails(){if(!settings)return;if(!settings.isMap())settings.showMap();detailsOpen=true;layersOpen=false;sync()}
  function closePanels(){layersOpen=false;detailsOpen=false;sync()}
  function install(config){
    settings=config;
    const layers=q('.locations-panel,.layer-panel'),details=q('.detail-panel');layers.id||='workspaceLayers';details.id||='workspaceDetails';
    q(config.layersButton).setAttribute('aria-controls',layers.id);q(config.detailsButton).setAttribute('aria-controls',details.id);
    q(config.layersButton).onclick=()=>{const wasMap=config.isMap();if(!wasMap)config.showMap();layersOpen=wasMap?!layersOpen:true;detailsOpen=false;sync()};
    q(config.detailsButton).onclick=()=>{const wasMap=config.isMap();if(!wasMap)config.showMap();detailsOpen=wasMap?!detailsOpen:true;layersOpen=false;sync()};
    document.querySelectorAll('[data-close-workspace]').forEach(b=>b.onclick=closePanels);
    const expand=document.createElement('button');expand.id='expandMap';expand.type='button';expand.textContent='Duża mapa';expand.setAttribute('aria-pressed','false');expand.title='Powiększ mapę, zachowując oś czasu poniżej obrazu';
    function focusMap(on){if(on&&!config.isMap())config.showMap();document.body.classList.toggle('iw-map-focus',on);expand.textContent=on?'Przywróć układ':'Duża mapa';expand.setAttribute('aria-pressed',String(on));closePanels()}
    expand.onclick=()=>focusMap(!document.body.classList.contains('iw-map-focus'));q('.panel-buttons').append(expand);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePanels();if(document.body.classList.contains('iw-map-focus'))focusMap(false)}});
    const identity=document.createElement('span');identity.className='workspace-identity';identity.textContent=document.body.classList.contains('iw-flood')?'Zalanie infrastruktury':document.body.classList.contains('iw-deformation')?'Deformacja terenu':'Roślinność przy liniach';q('.workspace-toolbar').prepend(identity);
    document.querySelectorAll('.timeline>p,.timeline>.note').forEach(note=>{const fold=document.createElement('details');fold.className='timeline-source';const summary=document.createElement('summary');summary.textContent='Źródła i zakres danych';note.before(fold);fold.append(summary,note)});
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
  function installMapTools(map,config){
    const scale=L.control.scale({position:'bottomleft',metric:true,imperial:false,maxWidth:100}).addTo(map);
    const scaleRoot=scale.getContainer();scaleRoot.classList.add('iw-distance-scale');scaleRoot.title='Skala odległości w terenie (m / km)';
    const caption=document.createElement('span');caption.className='iw-scale-title';caption.textContent='Skala odległości';scaleRoot.prepend(caption);
    let container,panel,button,opened=false;
    function toggle(on){opened=on;panel.hidden=!on;button.setAttribute('aria-expanded',String(on));button.setAttribute('aria-pressed',String(on))}
    function refresh(){
      const available=!config.available||config.available();container.hidden=!available;if(!available)toggle(false);
      const source=config.legend();panel.replaceChildren();
      const title=document.createElement('h3');title.textContent=config.title||'Napięcie wg OSM';panel.append(title);
      if(source)for(const child of source.children){if(child.tagName==='SUMMARY'||child.classList.contains('legend-title'))continue;const copy=child.cloneNode(true);copy.removeAttribute('id');panel.append(copy)}
    }
    function createLegend(){
      container=L.DomUtil.create('div','iw-gis-map-legend');
      panel=document.createElement('section');panel.className='iw-gis-map-legend-content';panel.id='mapGISLegend';panel.hidden=true;panel.setAttribute('aria-label','Legenda warstw GIS');
      button=document.createElement('button');button.type='button';button.id='toggleMapGISLegend';button.textContent='Legenda GIS';button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');button.setAttribute('aria-pressed','false');
      button.onclick=()=>toggle(!opened);container.append(panel,button);
      L.DomEvent.disableClickPropagation(container);L.DomEvent.disableScrollPropagation(container);
      return container;
    };
    map.getContainer().parentElement.append(createLegend());refresh();
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){toggle(false);button.focus()}});
    const attribution=map.attributionControl?.getContainer();
    const resize=()=>{
      const scaleBottom=(attribution?.offsetHeight||0)+8;
      scaleRoot.style.setProperty('margin-bottom',scaleBottom+'px','important');
      const legendBottom=scaleBottom+scaleRoot.offsetHeight+8;container.style.bottom=legendBottom+'px';
      container.style.setProperty('--iw-legend-max-height',Math.max(48,map.getContainer().clientHeight-legendBottom-45)+'px');
    };
    const observer=new ResizeObserver(resize);observer.observe(map.getContainer());observer.observe(scaleRoot);if(attribution)observer.observe(attribution);resize();
    return {refresh};
  }
  return {install,sync,openDetails,closePanels,installMapTools};
})();
