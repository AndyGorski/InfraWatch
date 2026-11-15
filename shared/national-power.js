/* Nationwide OSM electricity snapshot. Spatial loading; no inferred network or measurements. */
window.InfraWatchNationalPower=(()=>{
  'use strict';
  const scriptURL=new URL(document.currentScript.src),root=new URL('national-power/',scriptURL),dataVersion=scriptURL.searchParams.get('v')||'20261116-national-lines1',cache=new Map();
  const source='© OpenStreetMap contributors',license='ODbL 1.0';
  let metadataPromise,overviewPromise,facilitiesPromise,lineCatalogPromise;
  async function read(path){
    const target=new URL(path,root);target.searchParams.set('v',dataVersion);const response=await fetch(target);
    if(!response.ok)throw Error('Nie udało się pobrać GIS ('+response.status+').');
    if(!path.endsWith('.gz'))return response.json();
    if(typeof DecompressionStream==='undefined')throw Error('Przeglądarka wymaga aktualizacji do obsługi skompresowanych danych GIS.');
    return new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
  }
  function metadata(){return metadataPromise??=(read('metadata.json').catch(e=>{metadataPromise=null;throw e}))}
  function inflate(fc){for(const f of fc.features){Object.assign(f.properties,{source,source_license:license,source_url:'https://www.openstreetmap.org/'+f.id,operator_verified:false,demo:false});if(f.properties.osm_last_edit)f.properties.osm_last_edit=f.properties.osm_last_edit.replace(' ','T')}return fc}
  function overview(){return overviewPromise??=read('overview.json.gz').then(inflate).catch(e=>{overviewPromise=null;throw e})}
  function facilities(){return facilitiesPromise??=read('facilities.json.gz').catch(e=>{facilitiesPromise=null;throw e})}
  function lineCatalog(){return lineCatalogPromise??=read('line-catalog.json.gz').then(inflate).catch(e=>{lineCatalogPromise=null;throw e})}
  function tileXY(lon,lat,z=10){const n=2**z;return [Math.floor((lon+180)/360*n),Math.floor((1-Math.asinh(Math.tan(Math.max(-85,Math.min(85,lat))*Math.PI/180))/Math.PI)/2*n)]}
  function pathsForBox(b,meta,groups=['network']){
    const a=tileXY(b[0],b[3]),c=tileXY(b[2],b[1]),paths=[];
    if((c[0]-a[0]+1)*(c[1]-a[1]+1)>350)throw Error('Obszar szczegółów jest zbyt duży. Przybliż mapę lub zmniejsz wybór.');
    for(const group of groups)for(let x=a[0];x<=c[0];x++)for(let y=a[1];y<=c[1];y++){const p=`${group}/10/${x}/${y}.json.gz`;if(meta.tiles[p])paths.push(p)}
    return paths;
  }
  function partition(path){
    if(cache.has(path)){const p=cache.get(path);cache.delete(path);cache.set(path,p);return p}
    const p=read(path).then(inflate).catch(e=>{cache.delete(path);throw e});cache.set(path,p);
    while(cache.size>96)cache.delete(cache.keys().next().value);
    return p;
  }
  const overlap=(f,b)=>!f.bbox||f.bbox[0]<=b[2]&&f.bbox[2]>=b[0]&&f.bbox[1]<=b[3]&&f.bbox[3]>=b[1];
  async function query(b,{supports=false,current=()=>true}={}){
    const meta=await metadata(),paths=pathsForBox(b,meta,supports?['network','supports']:['network']),found=new Map();let cursor=0;
    async function worker(){while(cursor<paths.length){if(!current())return;const path=paths[cursor++],fc=await partition(path);for(const f of fc.features)if(overlap(f,b)&&InfraWatchArea.geometryIntersectsBox(f.geometry,b))found.set(f.id,f)}}
    await Promise.all(Array.from({length:Math.min(6,paths.length)},worker));
    return {type:'FeatureCollection',features:[...found.values()],loading_scope:{bbox:b,detail:true,supports,partitions:paths.length,complete_country_inventory:false}};
  }
  async function detail(f){if(!f?.properties.generalized)return f;const fc=await partition(f.properties.detail_tile);return fc.features.find(x=>x.id===f.id)||f}
  function sourceHTML(meta){return `<h3>Ogólnopolska infrastruktura energetyczna · OSM</h3><p>© OpenStreetMap contributors · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">ODbL 1.0</a>. Wyciąg Polski: <a href="https://download.geofabrik.de/europe/poland.html" target="_blank" rel="noopener">Geofabrik</a>. Snapshot ${String(meta.snapshot||'').replace(/[<>&]/g,'')}.</p><p>Zasięg całej Polski; linie, linie lokalne, kable, słupy, wieże, stacje, transformatory, łączniki, kompensatory i przekształtniki według dostępnych tagów OSM. Przy granicy zachowano pełne geometrie przecinające Polskę. Przegląd kraju jest uproszczony; od z11 pobierane są szczegóły, od z14 podpory, od z16 słupy lokalne. W wybranym obszarze pobierane są wszystkie kategorie.</p><p>Dane publiczne mogą mieć braki. Nie są inwentaryzacją potwierdzoną przez operatora. power=line obejmuje przesył i dystrybucję; nieznany operator lub napięcie pozostaje nieznane. Daty GIS są niezależne od zobrazowań. Nie dodano ocen zagrożeń ani pomiarów. Listy, liczniki i eksport uwzględniają aktywne filtry i wczytany obszar lub przegląd, zgodnie z opisem zasięgu.</p>`}
  function install(map,{container,onData,enabled=()=>true,onStatus=()=>{}}){
    const panel=document.createElement('section');panel.className='national-power-control';
    const title=document.createElement('strong');title.textContent='Infrastruktura · cała Polska';
    const status=document.createElement('p');status.className='national-power-status';status.setAttribute('role','status');status.textContent='Wczytywanie ogólnopolskiego GIS…';
    const total=document.createElement('p');total.className='national-power-total';
    const retry=document.createElement('button');retry.type='button';retry.textContent='Ponów GIS';retry.hidden=true;
    panel.append(title,total,status,retry);container.prepend(panel);
    window.InfraWatchFilters?.install(container);
    let generation=0,timer,meta,lastData=null,lastRaw=null;
    const emit=(text,error=false)=>{status.textContent=text;panel.classList.toggle('has-error',error);retry.hidden=!error;onStatus(text,error)};
    function publish(fc){
      lastRaw=fc;lastData=window.InfraWatchFilters?InfraWatchFilters.apply(fc):fc;window.InfraWatchFilters?.syncLegacyControls();onData(lastData,meta);
      emit((fc.loading_scope?.detail?(InfraWatchArea.getBox()?'Wybrany obszar':'Szczegóły kadru'):'Przegląd sieci głównej · uproszczony')+' · '+lastData.features.length.toLocaleString('pl-PL')+' obiektów po filtrach');InfraWatchArea.refresh();
    }
    async function refresh(){
      const own=++generation;if(!enabled()){panel.hidden=true;return}panel.hidden=false;
      try{
        meta=await metadata();if(own!==generation)return;
        total.textContent=meta.feature_count.toLocaleString('pl-PL')+' obiektów w Polsce · OSM '+String(meta.snapshot||'').slice(0,10);
        const selection=InfraWatchArea.getBox(),bounds=map.getBounds().pad(.08),b=selection||[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()];
        const precise=!!selection||map.getZoom()>=meta.detail_min_zoom;
        emit(precise?'Wczytywanie infrastruktury dla obszaru…':'Wczytywanie przeglądu sieci głównej…');
        let fc;
        if(precise)fc=await query(b,{supports:(!window.InfraWatchFilters||InfraWatchFilters.get().details.includes('supports'))&&(!!selection||map.getZoom()>=meta.supports_min_zoom),current:()=>own===generation});
        else {const all=await overview();fc={type:'FeatureCollection',features:all.features.filter(f=>overlap(f,b)),loading_scope:{bbox:b,detail:false,supports:false,complete_country_inventory:false,generalized:true}}}
        if(own!==generation||!enabled())return;
        fc.features=fc.features.filter(InfraWatchArea.intersectsFeature);publish(fc);
      }catch(error){if(own!==generation)return;lastRaw=null;lastData={type:'FeatureCollection',features:[],loading_scope:{error:true,complete_country_inventory:false}};onData(lastData,meta);emit('Błąd GIS: '+error.message+' Użyj „Ponów GIS”.',true)}
    }
    const schedule=()=>{clearTimeout(timer);generation++;timer=setTimeout(refresh,180)};
    document.addEventListener('iw:map-filters-change',()=>{if(!enabled())return;if(lastRaw&&!lastRaw.loading_scope?.error){publish({...lastRaw,features:lastRaw.features.filter(InfraWatchArea.intersectsFeature)});if(InfraWatchFilters.get().details.includes('supports')&&lastRaw.loading_scope?.detail&&!lastRaw.loading_scope.supports&&(InfraWatchArea.getBox()||map.getZoom()>=meta.supports_min_zoom))schedule()}else if(!lastData?.loading_scope?.error)schedule()});
    map.on('moveend',schedule);document.addEventListener('iw:study-area-change',schedule);retry.onclick=refresh;
    const ready=refresh();return {ready,refresh:schedule,getData:()=>lastData,getMetadata:()=>meta,getStatus:()=>status.textContent};
  }
  return {metadata,overview,facilities,lineCatalog,query,detail,pathsForBox,tileXY,sourceHTML,install,cacheSize:()=>cache.size};
})();
