/* Guided example: synthetic corridor/clearances; independently sourced regional NDVI. */
window.InfraWatchVegetationScenario=(()=>{
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stories={
    1:['Punkt wyjścia: korony przy skraju lasu. Zapisujemy stan odniesienia.','Korony rozszerzają się w stronę osi linii; rośnie udział roślinności w modelowym pasie.','Modelowy odstęp do osi maleje do 3,7 m. Scenariusz przechodzi do wysokiego priorytetu weryfikacji.','Korony zajmują 38% modelowego pasa; odstęp do osi wynosi 2,4 m. Dodaj punkt do planu inspekcji.'],
    2:['Stan odniesienia zadrzewienia poza pasem. Sam odstęp poziomy nie opisuje możliwości upadku drzewa.','Zadrzewienie zajmuje większą część modelowego pasa. Zaplanuj obserwację otoczenia.','Odstęp do osi dalej maleje. Weryfikacja wymaga także wysokości i kondycji drzew.','Scenariusz otrzymuje wysoki priorytet. Zlecenie w przykładzie dotyczy oceny drzew i nalotu.'],
    3:['Polana z niewielkim modelowym udziałem roślinności.','Samosiewy stopniowo zajmują otwartą część pasa.','Udział roślinności rośnie do 20%. Przykład wymaga przeglądu utrzymania pasa.','W modelu roślinność zajmuje 26% pasa. Przygotuj oględziny i weryfikację wysokości samosiewów.'],
    4:['Stan odniesienia granicy lasu i modelowego pasa.','Obserwujemy w przykładzie stopniowy boczny przyrost koron.','Malejący odstęp do osi uzasadnia zaplanowanie kontroli granicy pasa.','Umiarkowany priorytet scenariusza: inspekcja planowa i dokumentacja fotograficzna.'],
    5:['Przed modelową pielęgnacją: roślinność zajmuje 22% pasa.','Symulowana pielęgnacja: udział spada do 8%, a odstęp do osi wzrasta do 10,5 m. To założenie przykładu, nie potwierdzona historia prac.','Roślinność odrasta po modelowej pielęgnacji. Obserwujemy kolejne sezony.','Udział wzrasta do 16%, pozostając poniżej stanu początkowego. Scenariusz pokazuje obserwację po pielęgnacji.']
  };
  function history(point,scenes,priorities,year){
    return scenes.flatMap((scene,index)=>{
      if(scene.year>year)return [];
      const sample=scene.points?.[point.id-1];
      return [{year:scene.year,cover_pct_simulated:point.cover[index],axis_distance_m_simulated:point.clearance[index],priority_simulated:priorities[point.id][index],ndvi:typeof sample?.ndvi==='number'&&Number.isFinite(sample.ndvi)?sample.ndvi:null,valid_pixels:sample?.validPixels??null,total_pixels:sample?.totalPixels??null,optical_date:scene.date,optical_id:scene.id,optical_sources:(scene.sources||[scene]).map(s=>({id:s.id,date:s.date||scene.date,url:s.url||null})),story:stories[point.id]?.[index]||point.description}];
    });
  }
  function target(id,year,points,scenes){
    return {point:points.find(p=>p.id===Number(id))||points[0],year:scenes.some(s=>s.year===Number(year))?Number(year):scenes.at(-1).year};
  }
  function report({points,scenes,priorities,year,selectedId,plan}){
    const selection=target(selectedId,year,points,scenes);
    return {name:'Zarastanie pasa linii 110 kV · Śląsk',source:'synthetic_vegetation_example',generated_at:new Date().toISOString(),scenario_year:selection.year,selected_point_id:selection.point.id,geometry_status:'synthetic_corridor_and_locations_not_osm_assets',voltage_kv_simulated:110,buffer_half_width_m_assumed:30,not_an_operator_clearance_requirement:true,assessment_status:'demonstration_not_a_real_infrastructure_assessment',ndvi_context:{source:'Copernicus Sentinel-2 L2A / Earth Search / Element 84',sampling_window_approx_m:320,interpretation:'Independently sampled optical context; not a tree-height or wire-clearance measurement. Dates may differ from the displayed national summer mosaic.'},points:points.map(p=>({id:p.id,name:p.name,lat:p.lat,lon:p.lon,geometry_simulated:true,span_label_simulated:p.span,recommended_verification:p.recommendation,planned_locally:!!plan[p.id],observations:history(p,scenes,priorities,selection.year)}))};
  }
  function plot(rows,key,{unit='',color='#84e2c2',max=1,decimals=1,label=''}){
    const width=440,height=155,left=30,right=22,top=23,bottom=28,lo=key==='ndvi'?-.1:0,hi=max;
    const x=i=>rows.length===1?width/2:left+i*(width-left-right)/(rows.length-1),y=v=>height-bottom-(v-lo)/(hi-lo)*(height-top-bottom);
    let segment=[],segments=[];
    rows.forEach((row,i)=>{if(row[key]===null||!Number.isFinite(row[key])){if(segment.length)segments.push(segment);segment=[]}else segment.push(`${x(i)},${y(row[key])}`)});if(segment.length)segments.push(segment);
    const format=v=>v.toLocaleString('pl-PL',{maximumFractionDigits:decimals});
    return `<svg class="vegetation-example-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}"><path d="M${left} ${top}V${height-bottom}H${width-right}" fill="none" stroke="#4c6670"/><text x="4" y="${top+4}">${format(hi)}</text><text x="4" y="${height-bottom}">${format(lo)}</text>${segments.map(s=>`<polyline points="${s.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>`).join('')}${rows.map((row,i)=>`<text x="${x(i)}" y="${height-6}" text-anchor="middle">${row.year}</text>`+(row[key]===null||!Number.isFinite(row[key])?`<text x="${x(i)}" y="${height/2}" text-anchor="middle">brak</text>`:`<circle cx="${x(i)}" cy="${y(row[key])}" r="${i===rows.length-1?5:3}" fill="${color}"/><text x="${x(i)}" y="${y(row[key])-10}" text-anchor="middle">${format(row[key])}${esc(unit)}</text>`)).join('')}</svg>`;
  }
  function install(config){
    let previous=null,busy=false,request=0;
    const header=document.querySelector('infrawatch-header .iw-actions'),button=document.createElement('button');button.type='button';button.id='vegetationExampleButton';button.textContent='Przykład roślinności';header.prepend(button);
    const bar=document.createElement('section');bar.className='vegetation-example-bar demo-only';bar.setAttribute('aria-label','Sterowanie scenariuszem roślinności');
    bar.innerHTML=`<div class="vegetation-example-heading"><strong>Scenariusz roślinności · 110 kV</strong><span>SYMULACJA · Śląsk</span></div><div class="vegetation-example-controls"><label>Punkt przykładu<select id="vegetationExamplePoint">${locations.map(p=>`<option value="${p.id}">P-0${p.id} · ${esc(p.name)}</option>`).join('')}</select></label><label>Rok<select id="vegetationExampleYear">${data.scenes.map(s=>`<option>${s.year}</option>`).join('')}</select></label><button type="button" id="vegetationExampleFocus">Pokaż punkt</button><button type="button" id="vegetationExampleAnalysis">Analiza</button><button type="button" id="vegetationExampleExit">Wróć do GIS</button></div>`;
    document.querySelector('.gis-app').before(bar);
    const dialog=document.createElement('dialog');dialog.id='vegetationExampleDialog';dialog.setAttribute('aria-labelledby','vegetationExampleTitle');
    dialog.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">PRZYKŁAD ANALIZY ROŚLINNOŚCI</span><h2 id="vegetationExampleTitle">Zarastanie pasa linii 110 kV</h2></div><button type="button" class="close-dialog" aria-label="Zamknij opis scenariusza">×</button></div><div class="dialog-body"><p>Pięć przykładowych punktów na modelowym korytarzu na Śląsku. Prześledź lata 2020–2025, wybierz lokalizację i sprawdź jej historię — podobnie jak kartę słupa w demonstratorze InSAR.</p><ol class="vegetation-example-steps"><li><strong>Obejrzyj punkt.</strong> Zbliż mapę i wybierz jeden z pięciu przypadków.</li><li><strong>Porównaj lata.</strong> Sprawdź modelowe pokrycie pasa i odstęp koron do osi linii.</li><li><strong>Zaplanuj weryfikację.</strong> Dodaj lokalizację do lokalnego planu inspekcji lub pobierz raport JSON.</li></ol><label class="vegetation-example-start-label">Przypadek początkowy<select id="vegetationExampleStartPoint">${locations.map(p=>`<option value="${p.id}">P-0${p.id} · ${esc(p.name)} — ${esc(p.type)}</option>`).join('')}</select></label><p class="vegetation-example-disclaimer"><strong>Przebieg, punkty, pokrycie pasa, odstępy i priorytety są symulowane.</strong> Rzeczywiste próbki NDVI stanowią osobny kontekst optyczny. Odstęp do osi nie jest pomiarem odległości do przewodu ani progiem bezpieczeństwa operatora.</p><p id="vegetationExampleError" role="alert" hidden></p><div class="vegetation-example-dialog-actions"><button type="button" id="vegetationExampleLaunch">Uruchom przykład · 2025</button><button type="button" id="vegetationExampleFromStart">Prześledź od 2020</button></div></div>`;
    document.body.append(dialog);const get=id=>document.getElementById(id);
    function currentRows(){return history(selected(),data.scenes,riskHistory,state.year)}
    function setURL(){const url=new URL(location.href);if(demoMode){url.searchParams.set('scenario','vegetation');url.searchParams.set('point',state.selected);url.searchParams.set('year',state.year);url.searchParams.delete('start')}else for(const key of ['scenario','point','year'])url.searchParams.delete(key);window.history.replaceState(null,'',url)}
    function refresh(){
      if(!demoMode)return;
      get('vegetationExamplePoint').value=state.selected;get('vegetationExampleYear').value=state.year;setURL();
      document.querySelector('.timeline-info .eyebrow').textContent='Rok scenariusza / historia Sentinel-2';
      get('timelineNote').textContent='Pokrycie, odstęp do osi i priorytet: symulacja. NDVI w karcie: osobne próbki regionalne; daty mogą różnić się od mozaiki Polski. Lotnicze: niezależne daty nalotów.';
    }
    async function launch(id=1,year=2025){
      if(busy)return;const token=++request;busy=true;get('vegetationExampleLaunch').disabled=true;get('vegetationExampleFromStart').disabled=true;get('vegetationExampleError').hidden=true;
      try{
        await config.ready;
        if(token!==request)return;
        const choice=target(id,year,locations,data.scenes);
        if(!demoMode)previous={data,year:state.year,layer:state.layer,bounds:map.getBounds()};
        stopHistory();state.selected=choice.point.id;state.year=choice.year;state.filter='all';state.search='';get('search').value='';
        document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));
        for(const id of ['showRisk','showEncroach','showRoute','showBuffer','showAlerts'])get(id).checked=true;
        state.layer='rgb';setGISMode(true);dialog.close();switchView('map');InfraWatchUI.closePanels();
        setYear(choice.year);oldDemo.fit();updateLayer();renderTimeline();refresh();
      }catch(error){get('vegetationExampleError').textContent='Nie udało się uruchomić przykładu. Sprawdź połączenie i odśwież stronę, aby ponowić pobranie danych.';get('vegetationExampleError').hidden=false;if(!dialog.open)dialog.showModal()}
      finally{busy=false;get('vegetationExampleLaunch').disabled=false;get('vegetationExampleFromStart').disabled=false}
    }
    function exit(){
      request++;
      stopHistory();if(previous){data=previous.data;state.year=previous.year;state.layer=previous.layer}
      config.onExit?.();setGISMode(false);switchView('map');InfraWatchUI.closePanels();if(previous)map.fitBounds(previous.bounds,{animate:false});else fit();updateLayer();renderTimeline();setURL();previous=null;
    }
    function choose(id){const point=locations.find(p=>p.id===Number(id));if(!point)return;stopHistory();state.selected=point.id;renderList();renderDetail();updateMarkers();if(state.view==='analysis')renderAnalysis();else map.setView([point.lat,point.lon],14,{animate:false});refresh()}
    function jsonReport(){return report({points:locations,scenes:data.scenes,priorities:riskHistory,year:state.year,selectedId:state.selected,plan:scheduled})}
    function saveReport(){download('InfraWatch_scenariusz_roslinnosci_DEMO.json',JSON.stringify(jsonReport(),null,2),'application/json')}
    function renderExampleAnalysis(){
      const p=selected(),rows=currentRows(),first=rows[0],now=rows.at(-1),risk=riskNames[now.priority_simulated];
      get('analysisView').innerHTML=`<section class="vegetation-example-summary"><span class="vegetation-example-badge">SCENARIUSZ DEMONSTRACYJNY · ${state.year}</span><h2>P-0${p.id} · ${esc(p.name)}</h2><p>${esc(now.story)}</p><p class="vegetation-example-context">Modelowa linia 110 kV · ${esc(p.span)} · brak powiązania z wybraną linią OSM.</p><div class="vegetation-example-metrics"><div><small>Pokrycie pasa · symulacja</small><strong>${now.cover_pct_simulated}%</strong><span>${fmt(now.cover_pct_simulated-first.cover_pct_simulated,0)} p.p. od ${first.year}</span></div><div><small>Odstęp do osi · symulacja</small><strong>${fmt(now.axis_distance_m_simulated)} m</strong><span>${fmt(now.axis_distance_m_simulated-first.axis_distance_m_simulated)} m od ${first.year}</span></div><div><small>Priorytet przykładu</small><strong>${esc(risk)}</strong><span>Nie jest oceną bezpieczeństwa</span></div><div><small>Plan lokalny · przykład</small><strong>${scheduled[p.id]?'W planie':'Do weryfikacji'}</strong><span>Zapis w tej przeglądarce</span></div></div><div class="vegetation-example-dialog-actions"><button type="button" data-example-action="focus">Pokaż punkt na mapie</button><button type="button" data-example-action="schedule">${scheduled[p.id]?'Usuń z planu inspekcji':'Dodaj do planu inspekcji'}</button><button type="button" data-example-action="report">Raport scenariusza JSON</button></div></section><div class="vegetation-example-charts"><article><h3>Pokrycie modelowego pasa</h3><span class="vegetation-example-badge">SYMULACJA · %</span>${plot(rows,'cover_pct_simulated',{unit:'%',max:45,decimals:0,color:'#edbd7e',label:'Symulowane pokrycie pasa do roku '+state.year})}<p>Modelowy pas ±30 m od osi. Udział nie pochodzi z klasyfikacji obrazu.</p></article><article><h3>Korona → oś linii</h3><span class="vegetation-example-badge">SYMULACJA · m</span>${plot(rows,'axis_distance_m_simulated',{unit:' m',max:14,color:'#edbd7e',label:'Symulowany odstęp koron od osi do roku '+state.year})}<p>Odstęp poziomy do osi, bez modelu zwisu przewodów. Brak progów operatora.</p></article><article><h3>NDVI otoczenia</h3><span class="vegetation-example-observed">RZECZYWISTY KONTEKST OPTYCZNY</span>${plot(rows,'ndvi',{max:1,decimals:2,label:'Regionalne próbki NDVI do roku '+state.year})}<p>Mediana w oknie około 320 × 320 m. Maska SCL; różne terminy letnie. NDVI nie mierzy wysokości ani prześwitu.</p></article></div><section class="vegetation-example-story"><h3>Co pokazuje ten przypadek?</h3><p>${esc(p.description)}</p><p><strong>Zalecana weryfikacja:</strong> ${esc(p.recommendation)}</p><h3>Historia do wybranego roku</h3><div class="table-wrap"><table><thead><tr><th>Rok</th><th>Pokrycie · demo</th><th>Odstęp do osi · demo</th><th>Priorytet · demo</th><th>NDVI regionalne</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.year}</td><td>${r.cover_pct_simulated}%</td><td>${fmt(r.axis_distance_m_simulated)} m</td><td>${esc(riskNames[r.priority_simulated])}</td><td>${r.ndvi===null?'Brak danych':fmt(r.ndvi,3)}<small>${esc(String(r.optical_date).slice(0,10))} · ${r.valid_pixels??'—'}/${r.total_pixels??'—'} pikseli</small></td></tr>`).join('')}</tbody></table></div><h3>Wybierz inny punkt przykładu</h3><div class="vegetation-example-cases">${locations.map(q=>`<button type="button" data-example-point="${q.id}" aria-pressed="${q.id===p.id}">P-0${q.id} · ${esc(q.name)}</button>`).join('')}</div><p class="vegetation-example-disclaimer">Wyniki i geometrie scenariusza są syntetyczne. Nie są przypisywane do żadnej rzeczywistej linii, słupa ani elektrowni. Historia prac w P-05 również jest założeniem przykładu.</p></section>`;
      get('analysisView').querySelectorAll('[data-example-point]').forEach(b=>b.onclick=()=>choose(b.dataset.examplePoint));
      get('analysisView').querySelectorAll('[data-example-action]').forEach(b=>b.onclick=()=>{if(b.dataset.exampleAction==='focus'){switchView('map');selectLocation(state.selected,true)}else if(b.dataset.exampleAction==='report')saveReport();else{toggleSchedule(state.selected);renderAnalysis()}});
    }
    oldDemo.renderAnalysis=renderExampleAnalysis;
    const previousDetail=oldDemo.renderDetail;
    oldDemo.renderDetail=function(){previousDetail();const rows=currentRows(),now=rows.at(-1);const trend=get('detailPanel').querySelector('.detail-trend');trend.innerHTML='<div class="detail-section">POKRYCIE PASA DO '+state.year+' <span class="sim-tag">SYMULACJA</span></div>'+plot(rows,'cover_pct_simulated',{unit:'%',max:45,color:'#edbd7e',decimals:0,label:'Symulowane pokrycie pasa do roku '+state.year})+'<p class="data-note">Modelowy pas ±30 m; udział nie pochodzi z klasyfikacji obrazu.</p>';const extra=document.createElement('div');extra.className='vegetation-example-detail';extra.innerHTML=`<strong>Historia odstępu do osi · symulacja</strong>${plot(rows,'axis_distance_m_simulated',{unit:' m',max:14,color:'#edbd7e',label:'Symulowana historia odstępu koron od osi'})}<p>${esc(now.story)}</p><button type="button" id="vegetationExampleDetailAnalysis">Analiza tego punktu</button>`;get('detailPanel').querySelector('.detail-actions').before(extra);get('vegetationExampleDetailAnalysis').onclick=()=>switchView('analysis');refresh()};
    const previousStatus=renderImageryStatus;renderImageryStatus=function(){previousStatus();refresh()};
    button.onclick=()=>{get('vegetationExampleStartPoint').value=state.selected;dialog.showModal()};dialog.querySelector('.close-dialog').onclick=()=>dialog.close();
    get('vegetationExampleLaunch').onclick=()=>launch(get('vegetationExampleStartPoint').value,2025);get('vegetationExampleFromStart').onclick=()=>launch(get('vegetationExampleStartPoint').value,2020);
    get('vegetationExamplePoint').onchange=e=>choose(e.target.value);get('vegetationExampleYear').onchange=e=>{stopHistory();setYear(Number(e.target.value));if(state.view==='analysis')renderAnalysis()};
    get('vegetationExampleFocus').onclick=()=>{switchView('map');selectLocation(state.selected,true)};get('vegetationExampleAnalysis').onclick=()=>switchView('analysis');get('vegetationExampleExit').onclick=exit;
    get('demoMode').onchange=e=>e.target.checked?launch(state.selected,state.year):exit();
    document.addEventListener('iw:gis-mode-change',()=>{if(!demoMode){request++;setURL()}else refresh()});
    const entry=new URL(location.href).searchParams;if(entry.get('scenario')==='vegetation')launch(entry.get('point'),entry.get('year'));
    return {launch,exit,report:jsonReport};
  }
  return {history,target,report,plot,install};
})();
