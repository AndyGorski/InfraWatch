/* Persistent power-plant landmarks. Source tags, not imagery, determine the symbols. */
window.InfraWatchPlants=(()=>{
  'use strict';
  const url=new URL('power-plants.json.gz',document.currentScript.src);let pending;
  const symbols={
    thermal:{name:'Cieplne / paliwowe',color:'#f2b67e',path:'M4 21V11l7 4v-4l7 4V7h3v14H4Zm3-17h3v7H7Zm6-2h3v11h-3ZM7 18h2m3 0h2m3 0h2'},
    hydro:{name:'Wodne',color:'#83cfff',path:'M12 2s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11ZM3 22c3-3 6 3 9 0s6 3 9 0'},
    wind:{name:'Wiatrowe',color:'#8de6dd',path:'M12 11v11M12 11 9 2h4l-1 9Zm0 0 9 2-2 4-7-6Zm0 0-6 7-3-3 9-4Z'},
    solar:{name:'Fotowoltaiczne',color:'#f6dc81',path:'M5 7h14l3 12H2L5 7Zm3 0L6 19m10-12 2 12M4 13h16M12 19v3m-4 0h8M19 2v2m-4-2 1 2m7-2-1 2'},
    bio:{name:'Biomasa / biogaz / odpady',color:'#a4dda0',path:'M5 19C3 6 12 3 21 3c0 12-5 18-13 14M4 22 17 8'},
    nuclear:{name:'Jądrowe',color:'#c4b1f3',path:'M12 12h.01M12 2c6 0 6 20 0 20s-6-20 0-20ZM3 7c3-5 20 5 17 10S0 12 3 7Zm0 10C0 12 17 2 20 7S6 22 3 17Z'},
    other:{name:'Inne / źródło nieokreślone',color:'#d6dbe5',path:'m13 2-8 12h6l-1 8 9-13h-6l1-7Z'}
  };
  function type(f){
    const raw=String(f.tags?.['plant:source']||f.tags?.['generator:source']||'').toLowerCase().trim();
    const classify=value=>['hydro','water'].includes(value)?'hydro':value==='wind'?'wind':['solar','photovoltaic'].includes(value)?'solar':['biomass','biogas','waste','wood'].includes(value)?'bio':value==='nuclear'?'nuclear':['coal','gas','oil','diesel','lignite','peat','fossil'].includes(value)?'thermal':'other';
    const kinds=[...new Set(raw.split(';').map(v=>classify(v.trim())))];return kinds.length===1?kinds[0]:'other';
  }
  function capacity(f){const match=String(f.tags?.['plant:output:electricity']||'').replace(',','.').match(/^\s*(\d+(?:\.\d+)?)\s*(GW|MW|kW|W)\s*$/i);return match?Number(match[1])*({gw:1000,mw:1,kw:.001,w:.000001})[match[2].toLowerCase()]:null}
  function svg(key){return `<svg viewBox="0 0 24 26" aria-hidden="true" focusable="false"><path d="${symbols[key].path}"/></svg>`}
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function groups(plants,zoom,project,selected=null){
    if(zoom>=12)return plants.map(f=>({items:[f],lat:f.lat,lon:f.lon}));
    const prominent=plants.filter(f=>f.id===selected||(capacity(f)||0)>=(zoom<=7?500:100)),ids=new Set(prominent.map(f=>f.id));
    const cells=new Map(),size=zoom<=7?66:zoom<=9?48:32;
    for(const f of plants){if(ids.has(f.id))continue;const p=project(f),key=Math.floor(p.x/size)+':'+Math.floor(p.y/size);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(f)}
    return [...prominent.map(f=>({items:[f],lat:f.lat,lon:f.lon,prominent:true})),...[...cells.values()].map(items=>({items,lat:items.reduce((s,f)=>s+f.lat,0)/items.length,lon:items.reduce((s,f)=>s+f.lon,0)/items.length}))];
  }
  async function catalog(){
    if(!pending)pending=(async()=>{const r=await fetch(url);if(!r.ok)throw Error('Nie udało się wczytać katalogu elektrowni.');return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json()})().catch(e=>{pending=null;throw e});return pending;
  }
  function install(map,{plants,container,onChoose}){
    map.createPane('powerPlants');map.getPane('powerPlants').style.zIndex=520;
    const layer=L.layerGroup().addTo(map),panel=document.createElement('section');panel.className='plant-landmark-control';
    panel.innerHTML='<label class="plant-landmark-toggle"><input type="checkbox" id="showPowerPlants" checked><span>Elektrownie / elektrociepłownie / OZE<small>Osobne symbole i nazwy na mapie</small></span></label><p class="plant-landmark-status" role="status"></p><details><summary>Legenda obiektów wytwarzania</summary><div class="plant-landmark-key"></div><p>Typ i moc pochodzą z tagów OSM. Brak informacji pozostaje brakiem. Punkty referencyjne nie określają wysokości budynku ani terenu.</p></details>';
    container.prepend(panel);const toggle=panel.querySelector('input'),status=panel.querySelector('.plant-landmark-status'),key=panel.querySelector('.plant-landmark-key');
    for(const [id,symbol] of Object.entries(symbols)){const entry=document.createElement('span');entry.innerHTML=`<i style="--plant-color:${symbol.color}">${svg(id)}</i><span>${esc(symbol.name)}</span>`;key.append(entry)}
    let selected=null;const markers=new Map();
    function popup(f){
      const root=document.createElement('section');root.className='plant-landmark-card';root.style.maxHeight=Math.max(95,Math.min(280,map.getSize().y-90))+'px';root.style.overflowY='auto';
      const title=document.createElement('h3');title.textContent=f.name;root.append(title);
      for(const text of [symbols[type(f)].name,'Źródło energii wg OSM: '+(f.tags?.['plant:source']||f.tags?.['generator:source']||'brak danych'),'Operator wg OSM: '+(f.operator||'brak danych'),'Moc elektryczna wg OSM: '+(f.tags?.['plant:output:electricity']||'brak danych'),'OSM '+String(f.snapshot||'').slice(0,10)+' · pozycja referencyjna, stan pracy niepotwierdzony']){const p=document.createElement('p');p.textContent=text;root.append(p)}
      const link=document.createElement('a');link.href=f.source_url;link.target='_blank';link.rel='noopener';link.textContent='Źródłowy obiekt OSM ↗';root.append(link);
      const zoom=document.createElement('button');zoom.type='button';zoom.textContent='Przybliż obiekt';zoom.onclick=()=>{map.closePopup();map.flyTo([f.lat,f.lon],Math.max(13,map.getZoom()),{duration:.4})};root.append(zoom);
      const button=document.createElement('button');button.type='button';button.textContent='Wybierz obiekt do analizy';button.onclick=()=>{map.closePopup();onChoose(f)};root.append(button);return root;
    }
    function refresh(){
      const enabled=toggle.checked&&!document.body.classList.contains('demo-mode');
      if(!enabled){map.removeLayer(layer);status.textContent='Warstwa elektrowni wyłączona.';return}layer.addTo(map);
      const zoom=map.getZoom(),bounds=map.getBounds().pad(.06),visible=plants.filter(f=>bounds.contains([f.lat,f.lon]));
      const all=groups(visible,zoom,f=>map.project([f.lat,f.lon],zoom),selected).sort((a,b)=>Number(b.items.some(f=>f.id===selected))-Number(a.items.some(f=>f.id===selected))||Math.max(...b.items.map(f=>capacity(f)||0))-Math.max(...a.items.map(f=>capacity(f)||0))),retained=new Set(),labels=[];
      for(const group of all){
        const many=group.items.length>1,first=group.items.slice().sort((a,b)=>Number(b.id===selected)-Number(a.id===selected)||(capacity(b)||0)-(capacity(a)||0)||Number(!!b.named)-Number(!!a.named)||a.name.localeCompare(b.name,'pl'))[0],t=type(first);
        const isSelected=group.items.some(f=>f.id===selected),point=map.project([group.lat,group.lon],zoom),rect=[point.x+22,point.y-13,point.x+22+Math.min(zoom<8?105:zoom>=12?210:145,first.name.length*6),point.y+18];
        let labelled=!many&&(zoom>=8||isSelected||(capacity(first)||0)>=1000);
        if(labelled&&!isSelected&&labels.some(b=>rect[0]<b[2]+5&&rect[2]>b[0]-5&&rect[1]<b[3]+5&&rect[3]>b[1]-5))labelled=false;
        if(labelled)labels.push(rect);
        const key=zoom+'|'+selected+'|'+labelled+'|'+group.items.map(f=>f.id).sort().join(',');retained.add(key);if(markers.has(key))continue;
        const html=many?`<span class="plant-symbol plant-cluster">${svg('thermal')}<b>${group.items.length}</b></span>`:`<span class="plant-symbol plant-${t}">${svg(t)}</span>${labelled?`<span class="plant-map-name ${zoom>=12?'plant-map-name-detail':''}">${esc(first.name)}</span>`:''}`;
        const title=many?`${group.items.length} obiektów wytwarzania energii · przybliż, aby rozdzielić`:first.name+' · '+symbols[t].name;
        const marker=L.marker([group.lat,group.lon],{pane:'powerPlants',keyboard:true,title,alt:title,zIndexOffset:isSelected?1000:0,icon:L.divIcon({className:'plant-landmark-marker'+(isSelected?' plant-is-selected':'')+(zoom<=7?' plant-overview':''),html,iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-18]})});
        if(many)marker.on('add',()=>marker.getElement()?.setAttribute('aria-label',title));
        const tooltip=document.createElement('span');tooltip.textContent=many?title+': '+group.items.slice(0,4).map(f=>f.name).join(', ')+(group.items.length>4?'…':''):title;marker.bindTooltip(tooltip,{direction:'top',className:'plant-landmark-tooltip'});
        if(many)marker.on('click',()=>{const extent=L.latLngBounds(group.items.map(f=>[f.lat,f.lon]));map.fitBounds(extent.pad(.25),{maxZoom:Math.max(zoom+2,12),padding:[35,35]})});
        else marker.bindPopup(()=>popup(first),{className:'plant-landmark-popup',maxWidth:310});
        marker.addTo(layer);markers.set(key,marker);
      }
      for(const [key,marker] of markers)if(!retained.has(key)){layer.removeLayer(marker);markers.delete(key)}
      status.textContent=visible.length.toLocaleString('pl-PL')+' obiektów w kadrze · '+(zoom<12?'zbliż mapę, aby rozdzielić grupy':'osobne symbole i nazwy')+' · kliknij symbol';
    }
    function sync(){selected=window.InfraWatchArea?.getReport()?.facility?.id||null;refresh()}
    toggle.onchange=()=>{refresh();document.dispatchEvent(new CustomEvent('iw:plant-layer-change'))};map.on('moveend',refresh);document.addEventListener('iw:study-area-change',sync);document.addEventListener('iw:gis-mode-change',refresh);sync();
    return {refresh,setPlants:items=>{plants=items;refresh()},getCount:()=>plants.length,isVisible:()=>toggle.checked&&!document.body.classList.contains('demo-mode')};
  }
  return {catalog,install,type,capacity,groups,symbols};
})();
