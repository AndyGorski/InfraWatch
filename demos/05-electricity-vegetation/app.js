'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const route=[[50.45,18.41],[50.415,18.457],[50.389,18.479],[50.365,18.49],[50.34,18.528],[50.318,18.544],[50.29,18.54],[50.253,18.558],[50.22,18.545],[50.179,18.524],[50.145,18.505],[50.104,18.461],[50.065,18.46]];
const locations=[
 {id:1,name:'Skraj lasu · północ',lat:50.415,lon:18.457,risk:'high',type:'Korony przy przewodach',clearance:[7.8,5.9,3.7,2.4],cover:[12,20,31,38],description:'Scenariusz: korony drzew rozszerzają się od krawędzi lasu w stronę pasa linii. Przy wietrze gałęzie mogą zbliżać się do przewodów.',recommendation:'Zweryfikuj skrajne korony w terenie lub nalotem LiDAR. Ustal prześwit z uwzględnieniem zwisu przewodów i wychylenia drzew.',action:'Inspekcja priorytetowa',span:'S-018 — S-021'},
 {id:2,name:'Zadrzewienie · zachód',lat:50.318,lon:18.544,risk:'high',type:'Ryzyko upadku drzewa',clearance:[11.4,9.1,6.8,5.1],cover:[10,16,28,34],description:'Scenariusz: wysokie drzewa rosną poza pasem technologicznym, lecz ich potencjalny zasięg upadku przecina linię. Sam prześwit poziomy nie wyklucza zagrożenia.',recommendation:'Sprawdź wysokość, kondycję i kierunek pochylenia drzew. Porównaj zasięg upadku z modelem przewodów; zaplanuj ocenę arborystyczną.',action:'Ocena drzew i nalot',span:'S-042 — S-045'},
 {id:3,name:'Samosiewy · polana',lat:50.253,lon:18.558,risk:'medium',type:'Zarastanie pasa linii',clearance:[9.6,8.2,6.9,6.2],cover:[7,12,20,26],description:'Scenariusz: samosiewy stopniowo zajmują otwartą część pasa. Przyrost biomasy jest sygnałem do oględzin, ale nie określa wysokości roślin.',recommendation:'Porównaj aktualną ortofotomapę z inspekcją terenową. Zweryfikuj wysokość samosiewów i plan utrzymania pasa.',action:'Przegląd pasa linii',span:'S-063 — S-066'},
 {id:4,name:'Brzeg lasu · południe',lat:50.179,lon:18.524,risk:'medium',type:'Boczny przyrost koron',clearance:[10.5,9.3,8,7.1],cover:[15,19,25,29],description:'Scenariusz: boczne korony stopniowo zajmują pas ochronny. Zmiany na granicy lasu mogą zwiększać ekspozycję przewodów podczas silnego wiatru.',recommendation:'Zleć kontrolę granicy pasa i dokumentację fotograficzną. Zestaw geometrię koron z aktualnym zwisem przewodów.',action:'Inspekcja planowa',span:'S-087 — S-090'},
 {id:5,name:'Przecinka · Rudy',lat:50.104,lon:18.461,risk:'low',type:'Odrastanie po pielęgnacji',clearance:[8.8,10.5,9.7,9.1],cover:[22,8,12,16],description:'Scenariusz: po pielęgnacji z 2022 r. roślinność odrasta, ale model demonstracyjny wskazuje większy zapas niż w pozostałych lokalizacjach.',recommendation:'Kontynuuj obserwację kolejnych sezonów i sprawdź termin następnej pielęgnacji. Historia prac w tym przykładzie jest symulowana.',action:'Obserwacja sezonowa',span:'S-109 — S-112'}
];
const riskNames={high:'Wysoki',medium:'Umiarkowany',low:'Obserwacja'};
let state={selected:1,year:2025,layer:'rgb',filter:'all',search:'',view:'map'};
let scheduled={};try{scheduled=JSON.parse(localStorage.getItem('infrawatch-inspections-v1')||'{}')}catch(e){}
let data,orthos=[],map,baseOverlay,ndviOverlay,aerialOverlay,routeLayer,bufferLayer,markerGroup,markers=new Map();
let toastTimer;
const fmt=(n,d=1)=>Number(n).toLocaleString('pl-PL',{minimumFractionDigits:d,maximumFractionDigits:d});
const date=s=>new Date(s).toLocaleDateString('pl-PL',{day:'2-digit',month:'long',year:'numeric',timeZone:'Europe/Warsaw'});
const selected=()=>locations.find(p=>p.id===state.selected);
const currentScene=()=>data.scenes.find(s=>s.year===state.year);
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4300)}
function riskTag(p){return `<span class="risk-label ${p.risk}">${riskNames[p.risk]}</span>`}
function distance(a,b){return L.latLng(a).distanceTo(L.latLng(b))}
function chainage(p){let total=0;for(let i=0;i<route.length;i++){if(route[i][0]===p.lat)return total;if(i<route.length-1)total+=distance(route[i],route[i+1])}return total}
function renderList(){
 const visible=locations.filter(p=>(state.filter==='all'||(state.filter==='high'?scenarioRisk(p,state.year)==='high':scenarioRisk(p,state.year)!=='high'))&&(`${p.name} ${p.type} ${p.span} P-0${p.id}`).toLocaleLowerCase('pl').includes(state.search));
 $('#locationCount').textContent=visible.length;$('#planCount').textContent=Object.keys(scheduled).length;
 $('[data-filter="high"] span').textContent=locations.filter(p=>scenarioRisk(p,state.year)==='high').length;
 $('.risk-number').textContent=locations.filter(p=>scenarioRisk(p,state.year)==='high').length;
 $('#locationList').innerHTML=visible.length?visible.map(p=>`<button class="location ${p.id===state.selected?'selected':''}" data-id="${p.id}" aria-pressed="${p.id===state.selected}"><div class="location-top"><span>P-0${p.id} · KM ${fmt(chainage(p)/1000)}</span>${riskTag({...p,risk:scenarioRisk(p,state.year)})}</div><strong>${p.name}</strong><p>${p.type}<span>${scheduled[p.id]?'✓':'↗'}</span></p></button>`).join(''):'<div class="empty-state">Brak pasujących lokalizacji.</div>';
 $('#quickLocations').innerHTML=locations.map(p=>`<button class="quick-location ${p.id===state.selected?'selected':''}" data-quick="${p.id}" aria-pressed="${p.id===state.selected}"><span>0${p.id}</span><span><strong>${p.name}</strong><small>KM ${fmt(chainage(p)/1000)} · ${p.span}</small></span><i class="${scenarioRisk(p,state.year)}"></i></button>`).join('');
 $$('[data-id]').forEach(b=>b.onclick=()=>selectLocation(+b.dataset.id,true));$$('[data-quick]').forEach(b=>b.onclick=()=>selectLocation(+b.dataset.quick,true));
}
function chart(values,{sim=false,large=false}={}){const w=260,h=large?126:92,pad=14,max=sim?45:1,min=sim?0:-.1;const yy=v=>h-pad-(v-min)/(max-min)*(h-pad*2);const xx=i=>pad+i*(w-pad*2)/3;const pts=values.map((v,i)=>v===null?null:[xx(i),yy(v)]);let segments=[],seg=[];pts.forEach(p=>{if(p)seg.push(p.join(','));else{if(seg.length)segments.push(seg);seg=[]}});if(seg.length)segments.push(seg);const color=sim?'#c18c55':'#6f9162';return `<svg class="mini-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${sim?'Symulowany udział roślinności w pasie':'Rzeczywista mediana NDVI'}"><line x1="${pad}" x2="${w-pad}" y1="${yy(sim?20:.5)}" y2="${yy(sim?20:.5)}" stroke="#e9eee1" stroke-dasharray="3 4"/>${segments.map(s=>`<polyline points="${s.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`).join('')}${pts.map((p,i)=>p?`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${color}" stroke="white" stroke-width="1.4"/><text x="${p[0]}" y="${p[1]-9}" text-anchor="middle" style="font:8px Arial;fill:#839575;stroke:none">${sim?values[i]+'%':fmt(values[i],2)}</text>`:`<text x="${xx(i)}" y="${h-20}" text-anchor="middle" style="font:8px Arial;fill:#aaa;stroke:none">brak</text>`).join('')}</svg><div class="chart-axis">${data.scenes.map(s=>`<span>${s.year}</span>`).join('')}</div>`}
function renderDetail(){
 const p=selected(),idx=data.scenes.findIndex(s=>s.year===state.year),cover=p.cover[idx],n=currentScene().points[p.id-1].ndvi,risk=scenarioRisk(p,state.year),circ=2*Math.PI*52;
 $('#detailPanel').innerHTML=`<div class="detail-head"><div class="detail-eyebrow"><span>PAS LINII / P-0${p.id}</span>${riskTag({...p,risk})}</div><h2>${p.name}</h2><div class="detail-sub">${p.span} · kilometraż ${fmt(chainage(p)/1000)} km</div><span class="data-source-badge">SCENARIUSZ DEMONSTRACYJNY · ${state.year}</span></div>
 <table class="attributes" aria-label="Atrybuty wybranej lokalizacji"><tbody><tr><td>ID lokalizacji</td><td>P-0${p.id} / WN 110 kV</td></tr><tr><td>Rodzaj zagrożenia</td><td>${p.type}</td></tr><tr><td>Prześwit poziomy<small>korona → oś linii, symulacja</small></td><td><span class="attr-value">${fmt(p.clearance[idx])} m</span></td></tr><tr><td>Status inspekcji</td><td>${scheduled[p.id]?'✓ W planie':'Do weryfikacji'}</td></tr><tr><td>Wysokość drzew / gatunek</td><td class="not-measured">Brak pomiaru<small>Wymaga LiDAR / inspekcji</small></td></tr><tr><td>NDVI otoczenia<small>rzeczywisty · okno ~320 × 320 m</small></td><td>${n===null?'Brak danych':fmt(n,3)}</td></tr><tr><td>Scena optyczna</td><td>${new Date(currentScene().date).toLocaleDateString('pl-PL')}<small>Sentinel-2 L2A · źródło 10 m</small></td></tr></tbody></table>
 <div class="detail-donut"><div class="detail-section">ROŚLINNOŚĆ W PASIE <span class="sim-tag">SYMULACJA</span></div><div class="donut-wrap"><svg class="donut-chart" viewBox="0 0 148 148" role="img" aria-label="Symulowany udział roślinności w pasie: ${cover}%"><circle cx="74" cy="74" r="52" stroke="#e3e9d9"/><circle cx="74" cy="74" r="52" stroke="#90b273" stroke-dasharray="${circ*cover/100} ${circ}"/></svg><div class="donut-total"><strong>${cover}%</strong><span>udział w pasie</span></div></div><div class="donut-legend"><span><i></i>Roślinność ${cover}%</span><span><i></i>Pozostałe ${100-cover}%</span></div></div>
 <div class="detail-trend"><div class="detail-section">ZMIANA POKRYCIA 2020–2025 <span class="sim-tag">SYMULACJA</span></div>${chart(p.cover,{sim:true})}<p class="data-note">${p.description}</p></div><div class="detail-actions"><div class="recommendation"><strong>↗ ${p.action}</strong><p>${p.recommendation}</p></div><button class="inspection-button ${scheduled[p.id]?'scheduled':''}" id="scheduleButton">${scheduled[p.id]?'✓ W planie · usuń z planu':'+ Dodaj do planu inspekcji'}</button><div class="detail-coordinate">${p.lat.toFixed(5)}° N, ${p.lon.toFixed(5)}° E</div></div><p class="detail-note">Prześwit do osi linii nie jest odstępem od przewodów. Kolory i geometrie ryzyka są symulacją; ocena bezpieczeństwa wymaga pomiarów operatora.</p>`;
 $('#scheduleButton').onclick=()=>toggleSchedule(p.id);
}
function selectLocation(id,zoom=false){
 state.selected=id;renderList();renderDetail();updateMarkers();
 if(zoom){const p=selected();map.flyTo([p.lat,p.lon],16,{duration:.6})}
 InfraWatchUI.openDetails();
}
function toggleSchedule(id){if(scheduled[id])delete scheduled[id];else scheduled[id]={addedAt:new Date().toISOString(),status:'Do inspekcji'};try{localStorage.setItem('infrawatch-inspections-v1',JSON.stringify(scheduled))}catch(e){toast('Status zachowany w tej sesji; pamięć przeglądarki jest niedostępna.')}renderList();renderDetail();renderActions();toast(scheduled[id]?'Dodano do lokalnego planu inspekcji.':'Usunięto z lokalnego planu inspekcji.')}
function updateMarkers(){
 markers.forEach((m,id)=>m.setIcon(pointIcon(locations[id-1],state.year)));
}
function makeBuffer(){// 30 m half-width, local metric approximation for this short corridor.
 const sides=[[],[]];route.forEach((p,i)=>{const a=route[Math.max(0,i-1)],b=route[Math.min(route.length-1,i+1)],c=Math.cos(p[0]*Math.PI/180),dx=(b[1]-a[1])*111320*c,dy=(b[0]-a[0])*111320,len=Math.hypot(dx,dy),ox=-dy/len*30/(111320*c),oy=dx/len*30/111320;sides[0].push([p[0]+oy,p[1]+ox]);sides[1].push([p[0]-oy,p[1]-ox])});return [...sides[0],...sides[1].reverse()]}
function fit(){map.fitBounds(L.latLngBounds(route),{padding:[30,25]})}
function initMap(){
 const b=data.bbox,bounds=[[b[1],b[0]],[b[3],b[2]]];
 map=L.map('map',{zoomControl:false,zoomSnap:.1,zoomDelta:.5,maxZoom:19,minZoom:9,maxBounds:L.latLngBounds(bounds).pad(.15),maxBoundsViscosity:.7});
 map.createPane('imagery');map.getPane('imagery').style.zIndex=200;
 map.attributionControl.setPrefix(false);
 baseOverlay=L.imageOverlay('assets/sentinel-2025.jpg',bounds,{pane:'imagery',attribution:'© Copernicus / Element 84'}).addTo(map);
 mainGIS=createGISLayers(map,state.year,true);routeLayer=mainGIS.route;bufferLayer=mainGIS.buffer;markerGroup=mainGIS.points;
 map.on('move zoom resize',()=>{resizeRiskSymbols()});fit();updateMarkers();
 $('#zoomIn').onclick=()=>map.zoomIn();$('#zoomOut').onclick=()=>map.zoomOut();$('#fitMap').onclick=()=>{if(state.layer==='aerial')state.layer='rgb';fit();updateLayer();renderTimeline()};
 [['showRoute','route'],['showBuffer','buffer'],['showAlerts','points'],['showRisk','risk'],['showEncroach','crowns']].forEach(([id,key])=>$('#'+id).onchange=()=>{$('#'+id).checked?mainGIS[key].addTo(map):map.removeLayer(mainGIS[key]);$('.map-risk-legend').hidden=!$('#showRisk').checked;resizeRiskSymbols()});
 new ResizeObserver(()=>{map.invalidateSize({animate:false});}).observe($('#mapArea'));installAerialImagery();
}
let routeLayerLabels;
function updateLayer(){applyImageryPolicy(true);refreshScenario()}
function setYear(y){
 if(!data.scenes.some(scene=>scene.year===y))return;
 state.year=y;updateLayer();renderTimeline();renderDetail();renderList();updateMarkers();
}

function renderTimeline(){
 const index=data.scenes.findIndex(scene=>scene.year===state.year),slider=$('#timeSlider');
 slider.disabled=false;slider.max=data.scenes.length-1;slider.value=index;
 slider.setAttribute('aria-valuetext',`${state.year} · ${date(currentScene().date)}`);
 slider.style.setProperty('--time-progress',`${index/Math.max(1,data.scenes.length-1)*100}%`);
 $('#yearTrack').innerHTML=data.scenes.map(scene=>`<button class="year-button ${scene.year===state.year?'active':''}" data-year="${scene.year}" aria-pressed="${scene.year===state.year}" title="${date(scene.date)} · zachmurzenie całej sceny ${fmt(scene.cloud,2)}%">${scene.year}</button>`).join('');
 $$('[data-year]').forEach(b=>b.onclick=()=>{stopHistory();setYear(+b.dataset.year)});
 $('#currentDate').textContent=`${date(currentScene().date)} · ${currentScene().id.split('_')[0]}`;
 renderImageryStatus();
}

function renderAnalysis(){$('#analysisView').innerHTML=`<h2>Sygnały zmian, w ich kontekście.</h2><p>Rzeczywisty NDVI obrazuje kondycję i obecność roślinności w otoczeniu punktów. Nie wyznacza wysokości drzew ani odległości od przewodów.<br>Każda próbka to mediana ważnych pikseli w oknie około 320 × 320 m. Maska SCL wyklucza chmury i cienie; wartości po resamplingu ~36 m.</p><div class="analysis-grid">${locations.map(p=>`<article class="analysis-card"><h3>P-0${p.id} · ${p.name}</h3>${chart(data.scenes.map(s=>s.points[p.id-1].ndvi),{large:true})}<p>${data.scenes.map(s=>`${s.year}: ${s.points[p.id-1].validPixels}/${s.points[p.id-1].totalPixels} ważnych pikseli`).join(' · ')}</p><p>Daty scen różnią się w obrębie lata. Wilgotność, fenologia, sposób użytkowania i błędy współrejestracji mogą zmieniać NDVI. Wysoki NDVI nie oznacza automatycznie zagrożenia.</p><button class="table-button" data-open="${p.id}">Pokaż na mapie ↗</button></article>`).join('')}<article class="analysis-card"><h3>Co jest potrzebne do pomiaru prześwitu?</h3><p>Model przewodów od operatora, pomiar LiDAR lub fotogrametria, klasyfikacja koron, geometria słupów oraz warunki zwisu i wychylenia. Następnie walidacja terenowa i kryteria operatora dla konkretnej linii.</p><h3>Sentinel-1 SAR · kolejny etap</h3><p>Radar może dostarczać kontekstu zmian struktury i wilgotności również przy zachmurzeniu. W tym demo nie wczytano ani nie przetworzono danych SAR. Brak fikcyjnych warstw radarowych i alertów na ich podstawie.</p></article></div>`;$$('[data-open]').forEach(b=>b.onclick=()=>{switchView('map');selectLocation(+b.dataset.open,true)})}
function renderActions(){$('#actionsView').innerHTML=`<h2>Plan inspekcji</h2><p>${Object.keys(scheduled).length} z 5 lokalizacji w lokalnym planie. Status jest zapisywany w tej przeglądarce. To demonstracja obiegu pracy; nie wysyła zleceń do operatora.</p><div class="table-wrap"><table><thead><tr><th>LOKALIZACJA</th><th>PRIORYTET SCENARIUSZA</th><th>ZALECANA WERYFIKACJA</th><th>STATUS</th><th></th></tr></thead><tbody>${locations.map(p=>`<tr><td><strong>P-0${p.id} · ${p.name}</strong><br><small style="color:#9aa78d">KM ${fmt(chainage(p)/1000)} · ${p.span}</small></td><td>${riskTag(p)}</td><td>${p.action}</td><td>${scheduled[p.id]?'✓ W planie':'Do weryfikacji'}</td><td><button class="table-button" data-schedule="${p.id}">${scheduled[p.id]?'Usuń z planu':'+ Dodaj'}</button></td></tr>`).join('')}</tbody></table></div><div class="aerial-hint">Priorytety i historia zarastania są symulowane. Przed pracami wymagane są pomiary oraz ocena operatora; demo nie wydaje decyzji eksploatacyjnych.</div>`;$$('[data-schedule]').forEach(b=>b.onclick=()=>toggleSchedule(+b.dataset.schedule))}
function switchView(v){
 state.view=v;stopHistory();$('.workspace-grid').hidden=v!=='map';$('#analysisView').hidden=v!=='analysis';$('#actionsView').hidden=v!=='actions';$$('[data-view]').forEach(b=>{b.classList.toggle('selected',b.dataset.view===v);b.setAttribute('aria-selected',b.dataset.view===v)});
 if(v==='map'){map.invalidateSize();}if(v==='analysis')renderAnalysis();if(v==='actions')renderActions();
}
function showSources(){$('#sourceContent').innerHTML=`<h3><span class="source-chip">RZECZYWISTE DANE</span> Historyczne zobrazowania optyczne</h3><p>Sentinel-2 L2A, Earth Search / Element 84, kafel 33UYR. Pasma B04 i B08 mają natywną rozdzielczość 10 m. Mapy i obliczenia w demo są przeskalowane do około 36 m na ziemi (EPSG:3857, ${data.width} × ${data.height} px).</p>${data.scenes.map(s=>`<div class="scene-row"><a href="${s.url}" target="_blank" rel="noopener">${s.id} ↗</a><span>${date(s.date)} · chmury całej sceny ${fmt(s.cloud,2)}%</span></div>`).join('')}<p>NDVI = (B08 − B04) / (B08 + B04), ze skalą STAC i korektą offsetu zgodną z earthsearch:boa_offset_applied (bez ponownego odjęcia już zastosowanego offsetu). Maska SCL dopuszcza klasy 4, 5 i 6; odrzuca chmury, cienie, śnieg i brak danych. To uproszczony wskaźnik otoczenia punktu, nie klasyfikacja drzew w wąskim pasie.</p><h3><span class="source-chip">RZECZYWISTE DANE</span> Ortofotomapa lotnicza</h3><p>${orthos.length?'Zbliżenia automatycznie korzystają z publicznej ortofotomapy GUGiK WMTS StandardResolution (warstwa ORTOFOTOMAPA, układ EPSG:3857). Kafle pobierane są na bieżąco dla całego widocznego obszaru, również pomiędzy punktami demo. Dalsze powiększanie pobiera kolejne poziomy szczegółowości zamiast rozciągać obraz Sentinel lub dawny wycinek. Wymagane jest połączenie z internetem. Daty nalotów i natywna rozdzielczość różnią się przestrzennie i wymagają sprawdzenia w skorowidzach GUGiK. Nie przypisujemy mozaiki do roku scenariusza. Przy błędach usługi brakujące kafle są oznaczane; nie zastępujemy ich powiększonym obrazem Sentinel. Porównanie historyczne jest dostępne w widoku ogólnym. W repozytorium zachowano pięć dawnych wycinków referencyjnych; nie są podkładem zbliżeń.':'Usługa GUGiK nie była dostępna podczas przygotowania demo; warstwa lotnicza pozostaje niedostępna.'} <a href="https://www.geoportal.gov.pl/pl/dane/ortofotomapa-orto/" target="_blank" rel="noopener">Opis danych GUGiK ↗</a></p><h3><span class="source-chip simulated">DANE DEMONSTRACYJNE</span> Linia, alerty i prześwity</h3><p>Trasa ~${fmt(routeLength)} km, napięcie 110 kV, numery słupów, punkty ryzyka, udziały pokrycia roślinnością i prześwity są scenariuszem. Nie pochodzą od operatora i nie opisują potwierdzonych zagrożeń rzeczywistej linii. Bufor ±30 m to założenie demo, a nie wymagana prawem szerokość pasa. Kolorowe segmenty ryzyka i zielone obrysy koron są geometriami symulowanymi, niezależnymi od klasyfikacji zobrazowań. Kolory nie oznaczają progów bezpieczeństwa operatora. Szerokość symbolu ryzyka na ekranie jest schematyczna; rzeczywisty bufor ma ±30 m.</p><p>Prześwit poziomy korona → oś linii jest symulowany; nie jest odstępem korona → przewód. Do pomiarów bezpieczeństwa potrzebne są LiDAR lub dane fotogrametryczne, model przewodów i kryteria operatora. W tym demo nie wczytano chmury LiDAR.</p><h3>Radar SAR · zakres następnego etapu</h3><p>Sentinel-1 może uzupełnić obserwacje optyczne. W tej wersji nie ma wczytanych ani przetworzonych scen SAR. Nie są one podstawą pokazanych wskaźników.</p><h3>Źródła i licencje</h3><ul><li><a href="https://registry.opendata.aws/sentinel-2-l2a-cogs/" target="_blank" rel="noopener">Copernicus Sentinel-2 L2A na AWS</a> · Contains modified Copernicus Sentinel data 2020, 2022, 2024, 2025.</li><li><a href="https://element84.com/earth-search/" target="_blank" rel="noopener">Earth Search / Element 84</a> · publiczny katalog STAC.</li><li><a href="https://www.geoportal.gov.pl/pl/usluga/uslugi-przegladania-wms-i-wmts/" target="_blank" rel="noopener">GUGiK / Geoportal — WMS</a> · ortofotomapa.</li><li><a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet 1.9.4</a> · BSD-2-Clause.</li></ul>`;$('#sourceDialog').showModal()}
const routeLength=route.slice(1).reduce((v,p,i)=>v+distance(p,route[i]),0)/1000;
function download(name,body,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([body],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);toast('Plik został przygotowany do pobrania.')}
function exportCsv(){const rows=[['id','lokalizacja','lat','lon','km','priorytet_symulowany','status_lokalny','rodzaj_danych','ndvi_2020','ndvi_2022','ndvi_2024','ndvi_2025'],...locations.map(p=>[`P-0${p.id}`,p.name,p.lat,p.lon,fmt(chainage(p)/1000),riskNames[p.risk],scheduled[p.id]?'W planie':'Do weryfikacji','Geometria i ryzyko: DEMO; NDVI: Sentinel-2',...data.scenes.map(s=>s.points[p.id-1].ndvi??'brak')])];download('InfraWatch_lokalizacje_DEMO.csv','\ufeff'+rows.map(r=>r.map(c=>'"'+String(c).replaceAll('"','""')+'"').join(';')).join('\r\n'),'text/csv;charset=utf-8')}
function exportGeo(){
 const features=[{type:'Feature',properties:{name:'Korytarz zachodni',voltage_demo:110000,demo:true,buffer_m:30,length_km:routeLength},geometry:{type:'LineString',coordinates:route.map(p=>[p[1],p[0]])}},{type:'Feature',properties:{name:'Pas analizy ±30 m',demo:true},geometry:{type:'Polygon',coordinates:[[...makeBuffer(),makeBuffer()[0]].map(p=>[p[1],p[0]])]}},...locations.map(p=>({type:'Feature',properties:{id:p.id,name:p.name,priority_scenario:scenarioRisk(p,state.year),demo:true,year:state.year,chainage_km:chainage(p)/1000,status:scheduled[p.id]?'W planie':'Do weryfikacji',ndvi:data.scenes.map(s=>({year:s.year,value:s.points[p.id-1].ndvi}))},geometry:{type:'Point',coordinates:[p.lon,p.lat]}})),...riskSegments(state.year).map(s=>({type:'Feature',properties:{name:'Segment ryzyka',priority_scenario:s.risk,year:state.year,demo:true},geometry:{type:'LineString',coordinates:s.coords.map(p=>[p[1],p[0]])}})),...crownShapes(state.year).map(s=>({type:'Feature',properties:{name:'Korona — symulacja',location_id:s.id,year:state.year,demo:true},geometry:{type:'Polygon',coordinates:[[...s.coords,s.coords[0]].map(p=>[p[1],p[0]])]}}))];
 download('InfraWatch_warstwy_DEMO.geojson',JSON.stringify({type:'FeatureCollection',name:'InfraWatch — geometrie demonstracyjne',features},null,2),'application/geo+json');
}
function exportHtml(){const body=`<!doctype html><html lang="pl"><meta charset="utf-8"><title>InfraWatch — raport demonstracyjny</title><style>body{font:14px Arial;color:#1d3b2c;max-width:1000px;margin:45px auto;line-height:1.6}h1{font-size:30px}h2{margin-top:30px}small{color:#7f8a72}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #dde6d6;padding:10px}th{background:#f1f5ed}article{break-inside:avoid;padding:14px 0;border-bottom:1px solid #dde6d6}.badge{background:#faf0dc;padding:8px}a{color:#396c4c}@media print{body{margin:15px;font-size:10pt}button{display:none}}</style><h1>InfraWatch · Energia</h1><p>Raport demonstracyjny · wygenerowano ${new Date().toLocaleString('pl-PL',{timeZone:'Europe/Warsaw'})}</p><p class="badge">Linia i scenariusze zagrożeń są SYMULOWANE. Zobrazowania Sentinel-2 oraz obliczone NDVI są rzeczywiste. Raport nie stanowi oceny bezpieczeństwa rzeczywistej infrastruktury.</p><p>Korytarz zachodni · Śląsk · ${fmt(routeLength)} km · model 110 kV · pas analizy ±30 m (założenie demo).</p><h2>Lokalizacje do weryfikacji</h2>${locations.map(p=>`<article><h3>P-0${p.id} · ${p.name}</h3><p>${riskNames[p.risk]} priorytet scenariusza · KM ${fmt(chainage(p)/1000)} · ${p.lat}, ${p.lon} · ${scheduled[p.id]?'W planie inspekcji':'Do weryfikacji'}</p><p>${p.description}</p><p><b>Zalecana weryfikacja:</b> ${p.recommendation}</p><table><tr><th>Rok</th><th>NDVI rzeczywisty*</th><th>Prześwit do osi — SYMULACJA</th><th>Pokrycie pasa — SYMULACJA</th></tr>${data.scenes.map((s,i)=>`<tr><td>${s.year}</td><td>${s.points[p.id-1].ndvi===null?'brak danych':fmt(s.points[p.id-1].ndvi,3)}</td><td>${fmt(p.clearance[i])} m</td><td>${p.cover[i]}%</td></tr>`).join('')}</table></article>`).join('')}<h2>Rzeczywiste sceny historyczne</h2><ul>${data.scenes.map(s=>`<li><a href="${s.url}">${s.id}</a> · ${date(s.date)} · zachmurzenie całej sceny ${fmt(s.cloud,2)}%</li>`).join('')}</ul><h2>Metodologia i ograniczenia</h2><p>*NDVI to mediana w oknie około 320 × 320 m wokół punktu. Pasma B04/B08 ze skalą STAC i korektą offsetu zgodną z earthsearch:boa_offset_applied; resampling biliniowy do ok. 36 m; SCL nearest-neighbour, klasy 4/5/6. Maskowanie uproszczone, bez poszerzania masek chmur. Różne terminy letnie i fenologia ograniczają porównywalność. Wysoki NDVI nie mierzy wysokości drzew.</p><p>Prześwity, pokrycie, geometria i priorytety są symulacją. Brak modelu przewodów, danych LiDAR oraz analizy SAR. Rzeczywiste odstępy wymagają pomiarów lotniczych/terenowych, zwisu przewodów i kryteriów operatora. Zbliżenia: ortofotomapa GUGiK WMTS pobierana na bieżąco; data nalotu i natywna rozdzielczość wymagają sprawdzenia w skorowidzach. Mozaika jest niezależna od roku scenariusza. Porównanie historyczne dotyczy Sentinel-2 w widoku ogólnym.</p><p>Źródła: Contains modified Copernicus Sentinel data 2020, 2022, 2024, 2025 · Earth Search / Element 84 · <a href="https://www.geoportal.gov.pl/pl/dane/ortofotomapa-orto/">GUGiK / Geoportal</a>.</p><button onclick="window.print()">Drukuj / zapisz PDF</button></html>`;download('InfraWatch_raport_DEMO.html',body,'text/html;charset=utf-8')}
function bind(){
 $$('[data-side]').forEach(b=>b.onclick=()=>{$$('[data-side]').forEach(x=>x.classList.toggle('selected',x===b));$('#layersPanel').hidden=b.dataset.side!=='layers';$('#locationsTab').hidden=b.dataset.side!=='locations'});
 $$('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderList();updatePointVisibility()});
 $('#search').oninput=e=>{state.search=e.target.value.toLocaleLowerCase('pl');renderList();updatePointVisibility()};
 $$('[data-layer]').forEach(b=>b.onclick=()=>{state.layer=b.dataset.layer;if(state.layer==='aerial'){if(!isDetailView())map.setZoom(13)}else if(isDetailView())fit();updateLayer();renderTimeline()});$$('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
 $('#timeSlider').oninput=e=>{stopHistory();const scene=data.scenes[+e.target.value];if(scene)setYear(scene.year)};
 ['sourcesButton','helpButton','aboutButton'].forEach(id=>$('#'+id).onclick=showSources);$('#exportButton').onclick=()=>$('#reportDialog').showModal();$$('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}}));
 $('#downloadCsv').onclick=exportCsv;$('#downloadGeojson').onclick=exportGeo;$('#downloadHtml').onclick=exportHtml;
 $('#gridButton').onclick=()=>{const on=$('#mapGrid').hidden;$('#mapGrid').hidden=!on;$('#gridButton').setAttribute('aria-pressed',on)};$('#focusButton').onclick=()=>selectLocation(state.selected,true);
 $('#toggleDetail').onclick=()=>{if(window.innerWidth<=980)document.body.classList.toggle('show-detail');else document.body.classList.toggle('detail-collapsed');const on=window.innerWidth<=980?document.body.classList.contains('show-detail'):!document.body.classList.contains('detail-collapsed');$('#toggleDetail').setAttribute('aria-expanded',on);map.invalidateSize()};
 $('#mobileLayers').onclick=()=>{document.body.classList.toggle('show-layers');document.body.classList.remove('show-detail')};$('#mobileDetail').onclick=()=>{document.body.classList.toggle('show-detail');document.body.classList.remove('show-layers','detail-collapsed')};
 $('#playHistory').onclick=()=>{if(historyTimer){stopHistory();return}if(state.layer==='aerial'||isDetailView()){state.layer='rgb';fit();updateLayer()}let i=0;setYear(data.scenes[i].year);$('#playHistory').textContent='Ⅱ';$('#playHistory').setAttribute('aria-pressed','true');$('#playHistory').setAttribute('aria-label','Zatrzymaj historię zobrazowań');historyTimer=setInterval(()=>{i++;if(i>=data.scenes.length){stopHistory();return}setYear(data.scenes[i].year)},2200)};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopHistory()});window.addEventListener('resize',()=>InfraWatchUI.sync());
}
async function init(){try{const r=await fetch('assets/scenes.json');if(!r.ok)throw Error('Brak metadanych scen');data=await r.json();try{const o=await fetch('assets/ortho.json');if(o.ok)orthos=await o.json()}catch(e){}$('#routeLength').textContent=fmt(routeLength)+' km';await loadRealPowerData();routeLayerLabels=L.layerGroup();initMap();routeLayerLabels.addTo(map);renderList();renderDetail();renderTimeline();renderAnalysis();renderActions();bind();mountRealPowerGIS();installUnifiedVegetation();}catch(e){console.error(e);$('#currentDate').textContent='Nie udało się wczytać danych. Odśwież stronę.';toast('Błąd wczytywania mapy. Sprawdź połączenie i odśwież stronę.')}}





let mainGIS,historyTimer=null;
const riskPalette={high:'#e06b4b',medium:'#e9b553',low:'#8abe70'};
const riskHistory={1:['low','medium','high','high'],2:['low','medium','medium','high'],3:['low','low','medium','medium'],4:['low','low','medium','medium'],5:['medium','low','low','low']};
function scenarioRisk(p,year){return riskHistory[p.id][data.scenes.findIndex(s=>s.year===year)]}
function pointIcon(p,year){return L.divIcon({className:'',html:`<span class="map-marker ${scenarioRisk(p,year)} ${p.id===state.selected?'selected':''}">0${p.id}</span>`,iconSize:[27,27],iconAnchor:[13.5,13.5]})}
function riskSegments(year){
 const result=[];let start=0;
 for(let i=0;i<route.length-1;i++){const a=route[i],b=route[i+1],len=distance(a,b),parts=Math.ceil(len/250);for(let j=0;j<parts;j++){const p=[a[0]+(b[0]-a[0])*j/parts,a[1]+(b[1]-a[1])*j/parts],q=[a[0]+(b[0]-a[0])*(j+1)/parts,a[1]+(b[1]-a[1])*(j+1)/parts],km=start+(j+.5)/parts*len;let nearest=null,delta=2800;for(const loc of locations){const d=Math.abs(chainage(loc)-km);if(d<delta){nearest=loc;delta=d}}result.push({coords:[p,q],risk:nearest?scenarioRisk(nearest,year):'low',locationId:nearest?.id})}start+=len}
 return result;
}
function crownShapes(year){
 const idx=data.scenes.findIndex(s=>s.year===year),result=[];
 locations.forEach(p=>{const c=Math.cos(p.lat*Math.PI/180),factor=.55+p.cover[idx]/55;for(let side of [-1,1])for(let j=0;j<4;j++){const x=side*(35+Math.sin(j+1)*7),y=(j-1.5)*46,rx=(11+j%2*5)*factor,ry=(23+j*2)*factor,coords=[];for(let n=0;n<18;n++){const a=n/18*Math.PI*2;coords.push([p.lat+(y+Math.sin(a)*ry)/111320,p.lon+(x+Math.cos(a)*rx)/(111320*c)])}result.push({id:p.id,coords})}});return result;
}
function createGISLayers(target,year,interactive){
 const g={risk:L.featureGroup(),crowns:L.featureGroup(),route:L.polyline(route,{color:'#e66e50',weight:1.5,opacity:.95}),buffer:L.polygon(makeBuffer(),{color:'#d6c77a',weight:1,fillColor:'#d5c371',fillOpacity:.13}),points:L.layerGroup()};
 g.buffer.addTo(target);g.risk.addTo(target);g.crowns.addTo(target);g.route.addTo(target);g.points.addTo(target);
 locations.forEach(p=>{const m=L.marker([p.lat,p.lon],{icon:pointIcon(p,year),locationId:p.id,interactive,keyboard:interactive,title:`P-0${p.id} ${p.name}`}).addTo(g.points);if(interactive){markers.set(p.id,m);m.on('click',()=>selectLocation(p.id,true))}});
 fillScenario(g,year,interactive);return g;
}
function fillScenario(g,year,interactive){g.risk.clearLayers();g.crowns.clearLayers();riskSegments(year).forEach(s=>{const l=L.polyline(s.coords,{color:riskPalette[s.risk],weight:8,opacity:.8,lineCap:'butt',interactive:interactive&&!!s.locationId}).addTo(g.risk);if(interactive&&s.locationId)l.on('click',()=>selectLocation(s.locationId,true))});crownShapes(year).forEach(s=>{const l=L.polygon(s.coords,{color:'#c3db91',weight:.8,fillColor:'#a4ca63',fillOpacity:.5,interactive}).addTo(g.crowns);if(interactive)l.on('click',()=>selectLocation(s.id,true))})}
function refreshScenario(){if(!mainGIS)return;fillScenario(mainGIS,state.year,true);mainGIS.route.bringToFront();resizeRiskSymbols();updatePointVisibility()}
function resizeRiskSymbols(){if(!map||!mainGIS)return;const w=map.getZoom()>=13?11:7;mainGIS.risk.setStyle({weight:w});}
function updatePointVisibility(){if(!mainGIS)return;const visible=p=>(state.filter==='all'||(state.filter==='high'?scenarioRisk(p,state.year)==='high':scenarioRisk(p,state.year)!=='high'))&&(`${p.name} ${p.type} ${p.span} P-0${p.id}`).toLocaleLowerCase('pl').includes(state.search);mainGIS.points.eachLayer(m=>m.setOpacity(visible(locations[m.options.locationId-1])?1:.12))}




function stopHistory(){if(historyTimer)clearInterval(historyTimer);historyTimer=null;$('#playHistory').textContent='▷';$('#playHistory').setAttribute('aria-pressed','false');$('#playHistory').setAttribute('aria-label','Odtwórz historię zobrazowań')}

const AERIAL_DETAIL_ZOOM=12;
const AERIAL_WMTS='https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTOFOTOMAPA&STYLE=default&FORMAT=image/jpeg&TILEMATRIXSET=EPSG:3857&TILEMATRIX=EPSG:3857:{z}&TILEROW={y}&TILECOL={x}';
let aerialTiles,effectiveImagery=null,imageryYear=null,visibleAerialTiles=new Map(),imageryStatusFrame;
function isDetailView(){return map.getZoom()>=AERIAL_DETAIL_ZOOM}
function imageryMode(){return state.layer==='aerial'||isDetailView()?'aerial':state.layer}
function installAerialImagery(){
 const blank='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#24382e"/><path d="M0 0L256 256M256 0L0 256" stroke="#3c5344"/><text x="128" y="126" text-anchor="middle" fill="#a3b49b" font-family="Arial" font-size="10">BRAK DANYCH LOTNICZYCH</text></svg>');
 aerialTiles=L.tileLayer(AERIAL_WMTS,{pane:'imagery',attribution:'© GUGiK / Geoportal · ortofotomapa WMTS',minZoom:9,maxZoom:19,maxNativeZoom:19,tileSize:256,keepBuffer:2,updateWhenIdle:true,errorTileUrl:blank});
 const key=c=>`${c.z}/${c.x}/${c.y}`;
 aerialTiles.on('tileloadstart',e=>{e.tile.dataset.aerialFailed='';visibleAerialTiles.set(key(e.coords),{coords:e.coords,status:'loading'});queueImageryStatus()});
 aerialTiles.on('tileload',e=>{if(e.tile.dataset.aerialFailed!=='true')visibleAerialTiles.set(key(e.coords),{coords:e.coords,status:'loaded'});queueImageryStatus()});
 aerialTiles.on('tileerror',e=>{e.tile.dataset.aerialFailed='true';visibleAerialTiles.set(key(e.coords),{coords:e.coords,status:'error'});queueImageryStatus()});
 aerialTiles.on('tileunload',e=>{visibleAerialTiles.delete(key(e.coords));queueImageryStatus()});
 aerialTiles.on('loading load',queueImageryStatus);
 map.on('zoomend moveend',()=>applyImageryPolicy());
 $('#retryAerial').onclick=()=>{visibleAerialTiles.clear();aerialTiles.redraw();renderImageryStatus()};
 applyImageryPolicy(true);
}
function applyImageryPolicy(force=false){
 if(!aerialTiles)return;
 const mode=imageryMode();
 if(!force&&mode===effectiveImagery&&imageryYear===state.year){renderImageryStatus();return}
 const changed=mode!==effectiveImagery;effectiveImagery=mode;imageryYear=state.year;
 if(ndviOverlay){map.removeLayer(ndviOverlay);ndviOverlay=null}
 if(aerialOverlay){map.removeLayer(aerialOverlay);aerialOverlay=null}
 if(mode==='aerial'){

  if(map.hasLayer(baseOverlay))map.removeLayer(baseOverlay);
  if(!map.hasLayer(aerialTiles))aerialTiles.addTo(map);
 }else{
  if(map.hasLayer(aerialTiles))map.removeLayer(aerialTiles);
  baseOverlay.setUrl(`assets/sentinel-${state.year}.jpg`);if(!map.hasLayer(baseOverlay))baseOverlay.addTo(map);
  if(mode==='ndvi'){const b=data.bbox;ndviOverlay=L.imageOverlay(`assets/ndvi-${state.year}.png`,[[b[1],b[0]],[b[3],b[2]]],{pane:'imagery',opacity:.88}).addTo(map)}
 }
 $$('[data-layer]').forEach(b=>{const on=b.dataset.layer===mode;b.classList.toggle('active',on);b.classList.toggle('auto-selected',on&&mode==='aerial'&&state.layer!=='aerial');b.setAttribute('aria-pressed',on)});
 $('#ndviLegend').hidden=mode!=='ndvi';renderImageryStatus();if(changed)renderTimeline();
}
function queueImageryStatus(){if(imageryStatusFrame)return;imageryStatusFrame=requestAnimationFrame(()=>{imageryStatusFrame=null;renderImageryStatus()})}
function currentAerialStatus(){
 const z=Math.round(map.getZoom()),bounds=map.getBounds(),items=[];
 for(const v of visibleAerialTiles.values())if(v.coords.z===z){const a=map.unproject([v.coords.x*256,(v.coords.y+1)*256],z),b=map.unproject([(v.coords.x+1)*256,v.coords.y*256],z);if(bounds.intersects(L.latLngBounds(a,b)))items.push(v)}
 return {loaded:items.filter(v=>v.status==='loaded').length,loading:items.filter(v=>v.status==='loading').length,errors:items.filter(v=>v.status==='error').length,total:items.length};
}
function renderImageryStatus(){
 if(!data||!map||!$('#imageryNotice'))return;
 const aerial=effectiveImagery==='aerial',notice=$('#imageryNotice');notice.hidden=!aerial;
 $('.timeline-info .eyebrow').textContent=aerial?'ROK SCENARIUSZA / HISTORIA SENTINEL':'HISTORIA OBRAZOWANIA';
 if(aerial){
  const s=currentAerialStatus(),automatic=state.layer!=='aerial';
  $('#imageryLabel').textContent=`Lotnicze GUGiK · ${automatic?'auto':'WMTS'}`;
  $('#resolution').textContent='kafle szczegółowe';
  const problem=s.errors>0,pending=s.loading>0||s.total===0||aerialTiles.isLoading();
  notice.classList.toggle('imagery-error',problem);notice.classList.toggle('imagery-loading',!problem&&pending);$('#retryAerial').hidden=!problem;
  $('#imageryNoticeText').textContent=problem?'Nie pobrano części zdjęć lotniczych. Brakujące kafle są oznaczone.':pending?'Wczytywanie szczegółowej ortofotomapy GUGiK…':'Zbliżenie lotnicze · bieżąca mozaika. Data nalotu do weryfikacji.';
  $('#timelineNote').textContent='Rok dotyczy scenariusza i Sentinel-2. Podkład lotniczy to niezależna mozaika GUGiK; nie jest zdjęciem z wybranego roku.';
 }else{
  $('#imageryLabel').textContent=`${effectiveImagery==='ndvi'?'NDVI':'Sentinel-2'} · ${state.year}`;$('#resolution').textContent='źródło 10 m/px';
  $('#timelineNote').textContent='Zbliżenia automatycznie pobierają zdjęcia lotnicze. Sceny Sentinel służą analizie ogólnej i historycznej.';
 }
}
