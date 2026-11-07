/* Facility-first analysis: reference object -> spatial radius -> nearby network. */
window.InfraWatchFacility=(()=>{
  const catalogURL=new URL('analysis-facilities.json',document.currentScript.src);
  const normalize=s=>String(s).toLocaleLowerCase('pl').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/ł/g,'l');
  async function install(map,config){
    const byId=id=>document.getElementById(id),make=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e};
    const manual=byId('studyAreaButton'),open=make('button','Wybierz obiekt');open.type='button';open.id='facilityPickerButton';open.setAttribute('aria-haspopup','dialog');manual.before(open);
    const dialog=make('dialog');dialog.id='facilityDialog';dialog.setAttribute('aria-labelledby','facilityDialogTitle');
    dialog.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">Obiekt → otoczenie → linie</span><h2 id="facilityDialogTitle">Wybierz obiekt do analizy</h2></div><button type="button" id="closeFacilityDialog" class="close-dialog" aria-label="Zamknij">×</button></div>
      <div class="dialog-body facility-body"><section><p id="facilityCatalogStatus" role="status">Wczytywanie katalogu…</p><label for="facilitySearch">Nazwa lub identyfikator obiektu</label><input type="search" id="facilitySearch" placeholder="Np. elektrownia, GPZ, numer OSM…"><label for="facilityType">Rodzaj obiektu</label><select id="facilityType"><option value="plant" selected>Elektrownie / elektrociepłownie / OZE</option><option value="all">Elektrownie i stacje</option><option value="substation">Stacje elektroenergetyczne</option></select><label for="facilityRegion">Region danych</label><select id="facilityRegion"><option value="all">Wszystkie regiony</option><option value="silesia">Śląsk</option><option value="kozienice">Kozienice</option></select><div id="facilityResults" class="facility-results" aria-label="Dostępne obiekty"></div><button type="button" id="facilityRetry" hidden>Spróbuj ponownie</button></section>
      <section><div id="facilityPreview" class="facility-summary"></div><label for="facilityRadius">Promień od punktu obiektu</label><select id="facilityRadius"><option value="1">1 km</option><option value="2">2 km</option><option value="5">5 km</option><option value="10" selected>10 km</option><option value="20">20 km</option><option value="30">30 km</option></select><label class="facility-local"><input type="checkbox" id="facilityIncludeMinor" checked> Uwzględnij lokalne linie</label><p id="facilityNearbyCount" role="status"></p><div id="facilityNearbyList" class="facility-nearby"></div><p class="note">Wybór obejmuje linie przecinające koło wokół punktu referencyjnego OSM. Odległość nie potwierdza połączenia elektrycznego ani kierunku zasilania. Pełne geometrie mogą wykraczać poza koło.</p></section></div>
      <div class="facility-footer"><button type="button" id="applyFacility" disabled>Analizuj okoliczne linie</button><span id="facilityManualSlot"></span></div>`;
    document.body.append(dialog);manual.textContent='Obszar ręcznie';byId('facilityManualSlot').append(manual);
    const oldManual=manual.onclick;manual.onclick=()=>{dialog.close();oldManual()};
    const nearbyButton=make('button','Pobliskie linie');nearbyButton.type='button';nearbyButton.id='facilityNearbyButton';nearbyButton.hidden=true;byId('studyAreaBar').querySelector('.study-area-actions').prepend(nearbyButton);
    let items=[],chosen=null,lines=[],distances=new Map(),catalog=null,loading=true,busy=false;
    const cases={vegetation:['Roślinność','05-electricity-vegetation'],deformation:['Deformacje','03-insar-multisensor-v2'],flood:['Zalanie','04-flood-2d-3d']};
    function caseURL(mode,f,r,local){const u=new URL(`demos/${cases[mode][1]}/`,InfraWatchData.root);if(f){u.searchParams.set('facility',f.id);u.searchParams.set('radius',r);u.searchParams.set('local',local?'1':'0')}return u.href}
    const marker=L.marker([0,0],{icon:L.divIcon({className:'facility-map-pin',html:'<span aria-hidden="true">⚡</span>',iconSize:[30,30],iconAnchor:[15,15]}),keyboard:true,title:'Obiekt analizy'});
    const name=f=>f.properties.name||f.properties.ref||'Linia · OSM '+f.properties.osm_id;
    const label=f=>f.kind==='plant'?'Obiekt wytwarzania energii':'Stacja elektroenergetyczna';
    const number=(n,d=0)=>n.toLocaleString('pl-PL',{maximumFractionDigits:d});
    function renderResults(){
      const q=normalize(byId('facilitySearch').value),type=byId('facilityType').value;
      const region=byId('facilityRegion').value;
      const matches=items.filter(f=>(region==='all'||region===f.region)&&(type==='all'||type===f.kind)&&normalize(`${f.name} ${f.source_name||''} ${f.id} ${f.operator}`).includes(q));
      const root=byId('facilityResults');root.replaceChildren();
      byId('facilityCatalogStatus').textContent=`Wspólna lista · 9 obiektów wytwarzania energii · dopasowania: ${number(matches.length)}${matches.length>24?' · pierwsze 24':''}`;
      if(!matches.length)root.append(make('p','Brak dopasowań. Zmień nazwę lub rodzaj obiektu.','note'));
      for(const f of matches.slice(0,24)){
        const b=make('button');b.type='button';b.dataset.facilityId=f.id;b.setAttribute('aria-pressed',String(f.id===chosen?.id));b.append(make('strong',f.name),make('small',`${InfraWatchData.regions[f.region].name} · ${label(f)} · ${f.id}`));b.onclick=()=>{chosen=f;distances.clear();renderResults();renderPreview()};root.append(b);
      }
    }
    function renderPreview(){
      if(!chosen)return;const preview=byId('facilityPreview');preview.replaceChildren();
      preview.append(make('span','WYBRANY OBIEKT','eyebrow'),make('h3',chosen.name),make('p',`${label(chosen)} · ${chosen.id}`));
      if(chosen.operator)preview.append(make('p','Operator wg OSM: '+chosen.operator));
      const link=make('a','Źródło OSM ↗');link.href=chosen.source_url;link.target='_blank';link.rel='noopener';preview.append(link,make('p',`Snapshot OSM: ${chosen.snapshot.slice(0,10)} · ${chosen.lat.toFixed(5)}°N, ${chosen.lon.toFixed(5)}°E · ${chosen.reference}`,'note'));
      const radius=Number(byId('facilityRadius').value),local=byId('facilityIncludeMinor').checked;
      preview.append(make('p',InfraWatchData.coverage(chosen,radius,config.mode),'facility-coverage'));
      const nav=make('nav',undefined,'facility-cases');nav.setAttribute('aria-label','Funkcjonalności dla wybranego obiektu');
      for(const [mode,[text]] of Object.entries(cases)){const a=make('a',text);a.href=caseURL(mode,chosen,radius,local);if(mode===config.mode)a.setAttribute('aria-current','page');nav.append(a)}preview.append(nav);
      lines=config.getFeatures(chosen).filter(f=>f.properties.power==='line'||local&&f.properties.power==='minor_line').map(f=>{
        if(!distances.has(f.id))distances.set(f.id,InfraWatchArea.distanceToGeometry(f.geometry,chosen.lat,chosen.lon));return {feature:f,distance:distances.get(f.id)};
      }).filter(x=>x.distance<=radius*1000+1e-6).sort((a,b)=>a.distance-b.distance||a.feature.id.localeCompare(b.feature.id));
      const main=lines.filter(x=>x.feature.properties.power==='line').length;
      byId('facilityNearbyCount').textContent=`W promieniu ${radius} km: ${number(lines.length)} odcinków · linie energetyczne ${main}, sieć lokalna ${lines.length-main}.`;
      const root=byId('facilityNearbyList');root.replaceChildren();
      for(const {feature:f,distance} of lines.slice(0,6)){
        const b=make('button');b.type='button';b.dataset.nearbyId=f.id;b.append(make('strong',name(f)),make('small',`${f.id} · ${number(distance/1000,2)} km od punktu obiektu`));b.onclick=async()=>{if(await apply())config.selectLine(f.id)};root.append(b);
      }
      if(!lines.length)root.append(make('p','Brak linii w przygotowanym zbiorze dla tego promienia. Zwiększ promień lub wybierz inny obiekt.','note'));
      else if(lines.length>6)root.append(make('p','Pierwsze 6 wg odległości. Pozostałe są dostępne po zastosowaniu wyboru w zakładce Obiekty.','note'));
      byId('applyFacility').disabled=loading||busy;
    }
    async function apply(){
      if(!chosen||loading||busy)return false;const local=byId('facilityIncludeMinor').checked,f=chosen,radius=Number(byId('facilityRadius').value);busy=true;byId('applyFacility').disabled=true;
      try{await config.beforeApply?.(f);config.prepareLayers(local);InfraWatchArea.setFacility(f,radius,local);config.showLines();dialog.close();return true}
      catch(error){byId('facilityNearbyCount').textContent='Nie udało się przełączyć danych. Spróbuj ponownie.';return false}
      finally{busy=false;byId('applyFacility').disabled=loading}
    }
    function show(){
      const active=InfraWatchArea.getReport();if(active?.facility){chosen=items.find(f=>f.id===active.facility.id)||chosen;byId('facilityRadius').value=String(active.radius_km);byId('facilityIncludeMinor').checked=active.include_local_lines;distances.clear()}
      if(chosen){renderResults();renderPreview()}dialog.showModal();
    }
    function sync(){
      const active=InfraWatchArea.getReport();nearbyButton.hidden=!active?.facility;
      if(active?.facility){const f=active.facility;marker.setLatLng([f.lat,f.lon]);const text=make('span',f.name+' · punkt obiektu analizy');marker.unbindTooltip().bindTooltip(text,{direction:'top'}).addTo(map);open.title='Zmień obiekt: '+f.name}
      else {map.removeLayer(marker);open.removeAttribute('title')}
      const u=new URL(location.href);for(const key of ['facility','radius','local'])u.searchParams.delete(key);
      if(active?.facility){u.searchParams.set('facility',active.facility.id);u.searchParams.set('radius',active.radius_km);u.searchParams.set('local',active.include_local_lines?'1':'0')}history.replaceState(null,'',u);
      const shadow=document.querySelector('infrawatch-header')?.shadowRoot;
      shadow?.querySelectorAll('a').forEach(a=>{for(const [mode,[,folder]] of Object.entries(cases)){const base=new URL(`demos/${folder}/`,InfraWatchData.root);if(new URL(a.href).pathname===base.pathname)a.href=caseURL(mode,active?.facility,active?.radius_km,active?.include_local_lines)}});
    }
    async function load(){
      loading=true;byId('facilityRetry').hidden=true;byId('facilityCatalogStatus').textContent='Wczytywanie katalogu obiektów i sieci…';
      try{
        const [response]=await Promise.all([fetch(catalogURL),config.ready||Promise.resolve()]);if(!response.ok)throw Error('Brak katalogu');catalog=await response.json();
        const priority={'relation/12825526':0,'way/386883572':0,'way/85146997':1};
        const voltage=f=>Math.max(0,...String(f.voltage||'').split(';').map(Number).filter(Number.isFinite));
        items=catalog.items.sort((a,b)=>(a.kind==='plant'?0:1)-(b.kind==='plant'?0:1)||(priority[a.id]??10)-(priority[b.id]??10)||Number(!!b.named)-Number(!!a.named)||voltage(b)-voltage(a)||a.name.localeCompare(b.name,'pl'));
        loading=false;chosen=items.find(f=>f.kind==='plant'&&f.region===config.region)||items[0]||null;renderResults();renderPreview();
        const params=new URL(location.href).searchParams,f=items.find(f=>f.id===params.get('facility'));
        if(f){chosen=f;const r=Number(params.get('radius'));byId('facilityRadius').value=String([1,2,5,10,20,30].includes(r)?r:10);byId('facilityIncludeMinor').checked=params.get('local')!=='0';renderResults();renderPreview();await apply()}
      }catch(error){loading=false;byId('facilityCatalogStatus').textContent='Nie udało się wczytać katalogu lub sieci. Możesz ponowić próbę albo ustawić obszar ręcznie.';byId('facilityRetry').hidden=false;byId('applyFacility').disabled=true}
    }
    open.onclick=show;nearbyButton.onclick=show;byId('closeFacilityDialog').onclick=()=>dialog.close();byId('applyFacility').onclick=apply;byId('facilityRetry').onclick=load;
    byId('facilitySearch').oninput=renderResults;byId('facilityType').onchange=renderResults;byId('facilityRegion').onchange=renderResults;byId('facilityRadius').onchange=renderPreview;byId('facilityIncludeMinor').onchange=renderPreview;
    document.addEventListener('iw:study-area-change',sync);await load();return {show};
  }
  return {install};
})();
