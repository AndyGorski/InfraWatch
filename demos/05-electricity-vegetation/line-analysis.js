/* A selected source geometry is an analysis target, not a computed risk assessment. */
window.InfraWatchLineAnalysis=(()=>{
  'use strict';
  const storageKey='iw-analysis-line-v1',copy=value=>JSON.parse(JSON.stringify(value));
  function isLine(f){
    if(f?.type!=='Feature'||!/^way\/\d+$/.test(f.id)||!['line','minor_line','cable'].includes(f.properties?.power))return false;
    const g=f.geometry,parts=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:null;
    return Array.isArray(parts)&&parts.length>0&&parts.every(part=>Array.isArray(part)&&part.length>=2&&part.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90));
  }
  function createStore({snapshot,resolve,persist=()=>{},onChange=()=>{},beforeCommit=()=>{},saved=null}){
    let record=saved?.snapshot===snapshot&&isLine(saved.feature)&&!saved.feature.properties.generalized?copy(saved):null,generation=0;
    const get=()=>record?copy(record):null;
    function publish(){try{persist(get())}catch(e){}onChange(get())}
    async function select(feature){
      const token=++generation;if(!isLine(feature))return {status:'invalid'};
      try{
        const full=await resolve(feature);if(token!==generation)return {status:'stale'};
        if(!isLine(full)||full.id!==feature.id||full.properties.generalized)throw Error('Nie pobrano pełnej geometrii linii. Spróbuj ponownie.');
        beforeCommit(full);if(token!==generation)return {status:'stale'};
        record={feature:copy(full),snapshot,selected_at:new Date().toISOString(),selection_unit:'osm_feature'};publish();return {status:'selected'};
      }catch(error){return {status:token===generation?'error':'stale',error}}
    }
    function clear(){generation++;record=null;publish()}
    return {get,select,clear,cancel:()=>{generation++}};
  }
  let ui=null;
  function install(map,config){
    let picking=false,pending=0,request=0,error='';
    const button=document.createElement('button');button.type='button';button.id='pickAnalysisLine';button.className='real-only';button.textContent='Wybierz linię';button.setAttribute('aria-pressed','false');
    document.querySelector('.panel-buttons').prepend(button);
    const bar=document.createElement('section');bar.id='analysisLineBar';bar.className='analysis-line-bar real-only';bar.setAttribute('aria-label','Linia do analizy');
    bar.innerHTML='<div class="analysis-line-copy"><small>LINIA DO ANALIZY</small><strong id="analysisLineName"></strong><span id="analysisLineHint" role="status" aria-live="polite"></span></div><div class="analysis-line-actions"><button type="button" id="analysisLineFit">Pokaż</button><button type="button" id="analysisLineOpen">Analizuj</button><button type="button" id="analysisLineClear" aria-label="Usuń wybór linii">×</button></div>';
    document.querySelector('.gis-app').before(bar);
    const find=id=>document.getElementById(id),outline=L.layerGroup().addTo(map);
    let saved=null;try{saved=JSON.parse(localStorage.getItem(storageKey))}catch(e){}
    const store=createStore({snapshot:config.snapshot,resolve:f=>InfraWatchNationalPower.detail(f),saved,
      persist:record=>record?localStorage.setItem(storageKey,JSON.stringify(record)):localStorage.removeItem(storageKey),
      beforeCommit:()=>{if(InfraWatchArea.getBox())InfraWatchArea.clear()},
      onChange:record=>{error='';setPicking(false);draw();render();config.onChange?.(record)}
    });
    function draw(){
      outline.clearLayers();const record=store.get();if(!record||!config.available())return;
      L.geoJSON(record.feature,{interactive:false,style:{color:'#14282d',weight:10,opacity:.95}}).addTo(outline);
      L.geoJSON(record.feature,{interactive:false,style:{color:'#73ffe0',weight:5,opacity:1}}).addTo(outline);
    }
    function render(){
      const record=store.get(),f=record?.feature;
      bar.hidden=!f&&!picking&&!pending&&!error;
      bar.classList.toggle('is-picking',picking);button.setAttribute('aria-pressed',String(picking));
      button.textContent=picking?'Anuluj wybór':'Wybierz linię';
      find('analysisLineName').textContent=f?config.name(f)+' · '+config.voltage(f.properties):'Kliknij linię na mapie';
      find('analysisLineHint').textContent=error|| (pending?'Pobieranie pełnej geometrii…':picking?'Kliknij widoczny odcinek. Esc anuluje. Rodzaje linii zmienisz w filtrach.':f?f.id+' · jeden odcinek OSM · '+(window.InfraWatchFilters&&!InfraWatchFilters.matchesLine(f)?'ukryty w filtrach; wyróżniony jako wybór':'wyróżniony miętowym kolorem'):'');
      find('analysisLineHint').setAttribute('role',error?'alert':'status');
      find('analysisLineFit').hidden=!f;find('analysisLineOpen').hidden=!f;find('analysisLineOpen').disabled=!!pending;
      find('analysisLineClear').setAttribute('aria-label',picking&&!f?'Anuluj wybór linii':'Usuń wybór linii');
      requestAnimationFrame(()=>{const node=map.getContainer();if(node.offsetWidth&&node.offsetHeight)map.invalidateSize({pan:false})});
    }
    function setPicking(active){picking=active;map.getContainer().classList.toggle('is-line-picking',active);render();config.onPicking?.(active)}
    async function choose(f){
      if(!config.available())return;const token=++request;error='';pending=1;render();
      const result=await store.select(f);if(token!==request)return result;pending=0;
      if(result.status==='error')error=result.error.message||'Nie udało się wybrać linii. Spróbuj ponownie.';
      render();return result;
    }
    function cancel(){request++;store.cancel();pending=0;error='';setPicking(false)}
    function start(){config.showMap();if(picking)cancel();else setPicking(true)}
    function clear(){request++;pending=0;store.clear()}
    function fit(){const record=store.get();if(record){config.showMap();map.fitBounds(L.geoJSON(record.feature).getBounds().pad(.12),{maxZoom:15})}}
    button.onclick=start;find('analysisLineFit').onclick=fit;find('analysisLineOpen').onclick=()=>{cancel();config.showAnalysis()};find('analysisLineClear').onclick=clear;
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&picking)cancel()});
    document.addEventListener('iw:map-filters-change',render);
    document.addEventListener('iw:study-area-change',()=>{if(InfraWatchArea.getBox())clear()});
    document.addEventListener('iw:gis-mode-change',()=>{cancel();draw()});
    ui={get:store.get,choose,clear,fit,start,cancel,isPicking:()=>picking,click:f=>{if(!picking||!isLine(f))return false;choose(f);return true}};
    draw();render();config.onChange?.(store.get());return ui;
  }
  return {isLine,createStore,install,get:()=>ui?.get()||null,choose:f=>ui?.choose(f),clear:()=>ui?.clear(),fit:()=>ui?.fit(),start:()=>ui?.start(),cancel:()=>ui?.cancel(),isPicking:()=>ui?.isPicking()||false,click:f=>ui?.click(f)||false};
})();
