/* Shared, persistent display choices. Source datasets and model inputs are unchanged. */
window.InfraWatchFilters=(()=>{
  'use strict';
  const storageKey='iw-map-filters-v1',event='iw:map-filters-change';
  const choices={
    plantTypes:{thermal:'Cieplne / paliwowe',hydro:'Wodne',wind:'Wiatrowe',solar:'Fotowoltaiczne',bio:'Biomasa / biogaz / odpady',nuclear:'Jądrowe',other:'Inne / nieokreślone'},
    voltages:{'400':'400 kV','220':'220 kV','110':'110 kV',other:'Pozostałe napięcia',unknown:'Brak danych o napięciu'},
    forms:{overhead:'Napowietrzne',cable:'Kablowe'},
    details:{stations:'Stacje',devices:'Transformatory i urządzenia',supports:'Słupy i podpory'}
  };
  const basic={plantTypes:['thermal','hydro'],majorOnly:true,voltages:['400','220'],forms:['overhead'],details:[]};
  const all={plantTypes:Object.keys(choices.plantTypes),majorOnly:false,voltages:Object.keys(choices.voltages),forms:Object.keys(choices.forms),details:Object.keys(choices.details)};
  const empty={plantTypes:[],majorOnly:false,voltages:[],forms:[],details:[]};
  const keys=field=>field==='voltages'?['400','220','110','other','unknown']:Object.keys(choices[field]);
  const copy=value=>JSON.parse(JSON.stringify(value));
  function normalize(value,base=basic){
    value=value&&typeof value==='object'?value:{};const out={};
    for(const field of Object.keys(choices)){const selected=Array.isArray(value[field])?value[field]:base[field];out[field]=keys(field).filter(key=>selected.includes(key))}
    out.majorOnly=typeof value.majorOnly==='boolean'?value.majorOnly:base.majorOnly;return out;
  }
  let state=normalize(basic);
  try{const saved=localStorage.getItem(storageKey);if(saved)state=normalize(JSON.parse(saved))}catch(_){}
  const get=()=>copy(state);
  function set(patch){state=normalize(patch,state);try{localStorage.setItem(storageKey,JSON.stringify(state))}catch(_){}document.dispatchEvent(new CustomEvent(event,{detail:get()}));return get()}
  function preset(name){return set(name==='all'?all:name==='empty'?empty:basic)}
  function voltageKeys(properties){
    const values=String(properties.voltage||'').split(';').map(v=>v.trim()).filter(Boolean).map(Number).filter(v=>Number.isFinite(v)&&v>0);
    return values.length?[...new Set(values.map(v=>v===400000?'400':v===220000?'220':v===110000?'110':'other'))]:['unknown'];
  }
  function matchesLine(feature,filter=state){
    const p=feature.properties||feature;if(!['line','minor_line','cable'].includes(p.power))return false;
    return filter.forms.includes(p.power==='cable'?'cable':'overhead')&&voltageKeys(p).some(key=>filter.voltages.includes(key));
  }
  function matchesNetwork(feature,filter=state){
    const p=feature.properties||{};if(p.kind==='line'||['line','minor_line','cable'].includes(p.power))return matchesLine(feature,filter);
    if(p.kind==='support'||['tower','pole'].includes(p.power))return filter.details.includes('supports');
    if(p.kind==='substation'||p.power==='substation')return filter.details.includes('stations');
    return (p.kind==='device'||['transformer','switch','compensator','converter'].includes(p.power))&&filter.details.includes('devices');
  }
  function matchesPlant(plant,filter=state){
    const api=window.InfraWatchPlants;if(!api)return false;
    return filter.plantTypes.includes(api.type(plant))&&(!filter.majorOnly||(api.capacity(plant)||0)>=500);
  }
  function apply(fc){return {...fc,features:fc.features.filter(f=>matchesNetwork(f)),loading_scope:{...fc.loading_scope,display_filters:get(),filters_applied:true,unfiltered_loaded_count:fc.features.length}}}
  function syncLegacyControls(){
    const line=state.forms.includes('overhead')&&state.voltages.length>0,cable=state.forms.includes('cable')&&state.voltages.length>0;
    const values={showRealLines:line,showGISLines:line,showRealMinor:line,showGISMinor:line,showRealCables:cable,showGISCables:cable,showRealStations:state.details.includes('stations'),showGISStations:state.details.includes('stations'),showRealDevices:state.details.includes('devices'),showGISDevices:state.details.includes('devices'),showRealSupports:state.details.includes('supports'),showGISSupports:state.details.includes('supports')};
    for(const [id,checked] of Object.entries(values)){const input=document.getElementById(id);if(input){input.checked=checked;input.closest('label')?.classList.add('iw-filter-managed')}}
    document.body.classList.add('iw-map-filter-enabled');
  }
  function description(){
    const plants=state.plantTypes.map(k=>choices.plantTypes[k]).join(', ')||'żadne';
    const lines=state.voltages.map(k=>choices.voltages[k]).join(', ')||'żadne';
    return {plants:plants+(state.majorOnly?' · od 500 MW':''),lines:lines+(state.forms.length?' · '+state.forms.map(k=>choices.forms[k].toLowerCase()).join(', '):' · żaden rodzaj linii')};
  }
  function install(container){
    const existing=document.getElementById('iwMapFilters');if(existing){container.prepend(existing);return existing}
    const panel=document.createElement('section');panel.id='iwMapFilters';panel.className='iw-map-filters';
    const quick=document.createElement('button');quick.type='button';quick.id='quickMapFilters';quick.textContent='Filtry';quick.setAttribute('aria-controls','iwMapFilters');document.querySelector('.panel-buttons')?.prepend(quick);
    quick.onclick=()=>{const layers=document.getElementById('toggleLayers')||document.getElementById('openLayers');if(layers?.getAttribute('aria-expanded')!=='true')layers?.click();document.querySelector('[data-side="layers"],[data-deform-side="layers"]')?.click();requestAnimationFrame(()=>panel.scrollIntoView({block:'nearest'}))};
    panel.innerHTML='<strong>Wybierz zawartość mapy</strong><p id="iwFilterSummary" role="status"></p><div class="iw-filter-presets"><button type="button" data-filter-preset="basic">Podstawowy</button><button type="button" data-filter-preset="all">Wszystko</button><button type="button" data-filter-preset="empty">Wyczyść</button></div><details class="iw-filter-section"><summary>Typy elektrowni <small id="iwPlantFilterSummary"></small></summary><fieldset id="iwPlantTypeChoices"><legend class="visually-hidden">Typy elektrowni na mapie</legend></fieldset><label class="iw-filter-major"><input type="checkbox" id="iwOnlyMajorPlants"> Tylko duże obiekty · od 500 MW</label><p>Wyłącz ograniczenie mocy, aby pokazać także małe obiekty i wpisy bez podanej mocy.</p></details><details class="iw-filter-section"><summary>Rodzaje linii <small id="iwLineFilterSummary"></small></summary><fieldset id="iwVoltageChoices"><legend>Napięcie według OSM</legend></fieldset><fieldset id="iwLineFormChoices"><legend>Przebieg linii</legend></fieldset><p>Linia z kilkoma napięciami jest widoczna, gdy pasuje co najmniej jedno wybrane napięcie.</p></details><details class="iw-filter-section"><summary>Szczegóły infrastruktury <small id="iwDetailFilterSummary"></small></summary><fieldset id="iwDetailChoices"><legend class="visually-hidden">Dodatkowe obiekty infrastruktury</legend></fieldset><p>Sieć lokalna i urządzenia są dostępne po zbliżeniu lub wskazaniu obszaru.</p></details>';
    const fieldsets={plantTypes:'iwPlantTypeChoices',voltages:'iwVoltageChoices',forms:'iwLineFormChoices',details:'iwDetailChoices'};
    for(const [field,id] of Object.entries(fieldsets))for(const value of keys(field)){const label=choices[field][value],row=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');input.type='checkbox';input.dataset.filterField=field;input.value=value;text.textContent=label;row.append(input,text);panel.querySelector('#'+id).append(row);input.onchange=()=>{const selected=[...panel.querySelectorAll(`[data-filter-field="${field}"]:checked`)].map(input=>input.value);set({[field]:selected})}}
    panel.querySelector('#iwOnlyMajorPlants').onchange=e=>set({majorOnly:e.target.checked});
    panel.querySelectorAll('[data-filter-preset]').forEach(button=>button.onclick=()=>preset(button.dataset.filterPreset));
    function refresh(){
      panel.hidden=document.body.classList.contains('demo-mode');quick.hidden=panel.hidden;const desc=description();
      panel.querySelectorAll('[data-filter-field]').forEach(input=>input.checked=state[input.dataset.filterField].includes(input.value));panel.querySelector('#iwOnlyMajorPlants').checked=state.majorOnly;
      const equal=value=>JSON.stringify(normalize(value))===JSON.stringify(state),mode=equal(basic)?'Widok podstawowy':equal(all)?'Pełny zakres danych':equal(empty)?'Warstwy wyłączone':'Własny wybór';
      panel.querySelector('#iwFilterSummary').textContent=mode+' · wybór wspólny dla paneli';
      panel.querySelector('#iwPlantFilterSummary').textContent=desc.plants;panel.querySelector('#iwLineFilterSummary').textContent=desc.lines;panel.querySelector('#iwDetailFilterSummary').textContent=state.details.map(k=>choices.details[k]).join(', ')||'wyłączone';
      panel.querySelectorAll('[data-filter-preset]').forEach(button=>button.setAttribute('aria-pressed',String(equal(button.dataset.filterPreset==='all'?all:button.dataset.filterPreset==='empty'?empty:basic))));syncLegacyControls();
    }
    container.prepend(panel);document.addEventListener(event,refresh);document.addEventListener('iw:gis-mode-change',refresh);refresh();return panel;
  }
  return {get,set,preset,normalize,choices,voltageKeys,matchesLine,matchesNetwork,matchesPlant,apply,syncLegacyControls,description,install,event};
})();
