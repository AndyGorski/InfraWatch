'use strict';
// Public GIS snapshot. Source attributes are escaped; no risks or clearances are inferred.
let realPower,realMeta,realGroups,realSelected='way/171537807',demoMode=false,realFeatureIndex=new Map(),realLayerIndex=new Map(),realPlan={};
try{realPlan=JSON.parse(localStorage.getItem('infrawatch-real-plan-v1')||'{}')}catch(e){}
const gisEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gisText=v=>v===undefined||v===null||v===''?'Brak w OSM':gisEsc(v);
const gisCount=n=>Number(n).toLocaleString('pl-PL');
const oldDemo={renderList,renderDetail,renderActions,renderAnalysis,fit,refreshScenario,updateMarkers,renderImageryStatus,showSources,exportGeo,exportCsv,exportHtml};
async function loadRealPowerData(){
 const responses=await Promise.all([fetch('assets/real-power.geojson'),fetch('assets/real-power-metadata.json')]);
 if(responses.some(r=>!r.ok))throw Error('Nie można wczytać rzeczywistych danych GIS.');
 [realPower,realMeta]=await Promise.all(responses.map(r=>r.json()));
 if(realPower.type!=='FeatureCollection'||!realPower.features.length)throw Error('Niepoprawny zbiór GIS.');
 realPower.features.forEach(f=>realFeatureIndex.set(f.id,f));
}
function realVoltage(p){return (p.voltage||'').split(';').filter(Boolean).map(v=>Number(v)).filter(Number.isFinite)}
function realVoltageLabel(p){const vs=realVoltage(p);return vs.length?vs.map(v=>fmt(v/1000,v%1000?1:0)+' kV').join(' / '):'Brak w OSM'}
function realColor(p){const v=Math.max(0,...realVoltage(p));return v>=300000?'#c69aee':v>=200000?'#ef9c73':v>=100000?'#e0cf7b':v>0?'#91bb7d':'#a2b2a3'}
function realKind(f){return f.properties.kind==='line'?(f.properties.power==='minor_line'?'Sieć lokalna':'Linia napowietrzna'):f.properties.kind==='support'?(f.properties.power==='tower'?'Słup kratowy / wieża':'Słup'):'Stacja elektroenergetyczna'}
function realName(f){return f.properties.name||f.properties.ref||`${realKind(f)} · OSM ${f.properties.osm_id}`}
function realBounds(f){return L.geoJSON(f).getBounds()}
function realCenter(f){return f.geometry.type==='Point'?L.latLng(f.geometry.coordinates[1],f.geometry.coordinates[0]):realBounds(f).getCenter()}
function realLineStyle(f){return {color:f.id===realSelected?'#7ae7dc':realColor(f.properties),weight:f.id===realSelected?4:2,opacity:f.id===realSelected?1:.78}}
function mountRealPowerGIS(){
 map.createPane('realStructures');map.getPane('realStructures').style.zIndex=470;
 const vector=L.canvas({padding:.3}),pointRenderer=L.canvas({padding:.3,pane:'realStructures'});
 function onFeature(f,layer){realLayerIndex.set(f.id,layer);layer.on('click',()=>selectRealFeature(f.id,false));layer.bindTooltip(gisEsc(realName(f)),{sticky:true,direction:'top',className:'real-tooltip'})}
 realGroups={lines:L.geoJSON(realPower,{renderer:vector,filter:f=>f.properties.power==='line',style:realLineStyle,onEachFeature:onFeature}),minor:L.geoJSON(realPower,{renderer:vector,filter:f=>f.properties.power==='minor_line',style:realLineStyle,onEachFeature:onFeature}),supports:L.layerGroup(),stations:L.geoJSON(realPower,{renderer:vector,filter:f=>f.properties.kind==='substation',style:{color:'#89cdd1',weight:1.4,fillColor:'#89cdd1',fillOpacity:.18},pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:3,color:'#9bd9dc',weight:1,fillColor:'#3b8f96',fillOpacity:.8,renderer:vector}),onEachFeature:onFeature}),selection:L.layerGroup()};
 window.realPointRenderer=pointRenderer;
 [['showRealLines','lines'],['showRealMinor','minor'],['showRealSupports','supports'],['showRealStations','stations']].forEach(([id,key])=>$('#'+id).onchange=()=>{if(demoMode)return;$('#'+id).checked?realGroups[key].addTo(map):map.removeLayer(realGroups[key]);renderRealSupports()});
 $('#demoMode').onchange=e=>setGISMode(e.target.checked);
 $('#realSearch').oninput=()=>renderRealList();
 $('#realFit').onclick=()=>{if(demoMode)setGISMode(false);fit()};
 map.on('moveend zoomend',()=>{if(!demoMode)renderRealSupports()});
 map.attributionControl.addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · ODbL');
 setGISMode(false);
 // Actual OSM node 1825505028 on way 171537807, inside a wooded corridor.
 map.setView([50.2496972,18.5377944],16,{animate:false});
 renderRealSupports();
}
function setGISMode(demo){
 demoMode=demo;document.body.classList.toggle('demo-mode',demo);$('#demoMode').checked=demo;
 $('.sidebar-heading .eyebrow').textContent=demo?'SCENARIUSZ DEMONSTRACYJNY':'RZECZYWISTE DANE GIS';
 $('#layersPanel > .section-caption').hidden=demo;
 $('label[for="timeSlider"]').textContent=demo?'Rok obserwacji i scenariusza':'Rok zobrazowania Sentinel';
 if(realGroups)Object.values(realGroups).forEach(g=>map.removeLayer(g));
 Object.values(mainGIS).forEach(g=>map.removeLayer(g));
 if(demo){[['showRoute','route'],['showBuffer','buffer'],['showAlerts','points'],['showRisk','risk'],['showEncroach','crowns']].forEach(([id,key])=>{if($('#'+id).checked)mainGIS[key].addTo(map)});oldDemo.refreshScenario();}
 else if(realGroups){[['showRealLines','lines'],['showRealMinor','minor'],['showRealSupports','supports'],['showRealStations','stations']].forEach(([id,key])=>{if($('#'+id).checked)realGroups[key].addTo(map)});realGroups.selection.addTo(map)}
 $('.sidebar-heading h1').textContent=demo?'Korytarz demonstracyjny':'Sieć energetyczna · Śląsk';
 $('#datasetSubtitle').textContent=demo?'47,7 km · scenariusz 110 kV':'Geometrie publiczne · OpenStreetMap';
 $('.geometry-note').textContent=demo?'Linia, alerty i korony są symulowane':'Snapshot 06.11.2026 · dane spoza operatora';
 $('.map-risk-legend').hidden=!demo||!$('#showRisk').checked;$('#realLegend').hidden=demo;
 $('.map-status').innerHTML=demo?'<i></i> Scenariusz demonstracyjny · linia i zagrożenia symulowane':'<i></i> GIS © OpenStreetMap contributors · snapshot 06.11.2026 · brak pomiarów prześwitu i oceny zagrożeń';
 renderList();renderDetail();renderActions();renderAnalysis();renderImageryStatus();if(!demo)highlightRealSelection();
}
function selectRealFeature(id,zoom=true){
 const f=realFeatureIndex.get(id);if(!f)return;realSelected=id;
 renderRealList();renderRealDetail();highlightRealSelection();
 if(zoom){const c=id==='way/171537807'?L.latLng(50.2496972,18.5377944):realCenter(f);map.flyTo(c,16,{duration:.5})}
 InfraWatchUI.openDetails();
}
function highlightRealSelection(){
 if(!realGroups||demoMode)return;realGroups.lines.setStyle(realLineStyle);realGroups.minor.setStyle(realLineStyle);realGroups.selection.clearLayers();
 const f=realFeatureIndex.get(realSelected);if(!f)return;
 if(f.properties.kind!=='line')L.geoJSON(f,{style:{color:'#7ae7dc',weight:3,fillOpacity:.15},pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:9,color:'#7ae7dc',weight:3,fillOpacity:.1})}).addTo(realGroups.selection);
 renderRealSupports();
}
function renderRealSupports(){
 if(!realGroups||demoMode)return;realGroups.supports.clearLayers();
 if(map.getZoom()<13||!$('#showRealSupports').checked)return;
 const bounds=map.getBounds().pad(.1),focus=realFeatureIndex.get(realSelected),linked=new Set(focus?.properties.node_ids||[]),z=map.getZoom();
 for(const f of realPower.features){const p=f.properties;if(p.kind!=='support'||(p.power==='pole'&&z<16))continue;const c=f.geometry.coordinates,ll=L.latLng(c[1],c[0]);if(!bounds.contains(ll))continue;
 const isLinked=linked.has(p.osm_id),isSelected=f.id===realSelected;
 L.circleMarker(ll,{renderer:window.realPointRenderer,pane:'realStructures',radius:isSelected?7:isLinked?5:p.power==='tower'?3.5:2.3,color:isSelected?'#7ae7dc':isLinked?'#e1fff6':'#f1e1ae',weight:isSelected?3:1.3,fillColor:isLinked?'#478d85':'#776e48',fillOpacity:.95}).on('click',()=>selectRealFeature(f.id,false)).bindTooltip(gisEsc(`${p.ref?'Słup '+p.ref:realKind(f)} · OSM ${p.osm_id}`),{direction:'top',className:'real-tooltip'}).addTo(realGroups.supports);
 }
}
function renderRealList(){
 if(!realMeta)return;const c=InfraWatchArea.countByPower(realPower.features);
 $('#locationCount').textContent=gisCount(realPower.features.length);
 $('#realLineCount').textContent=gisCount(c.line);$('#realSupportCount').textContent=gisCount(c.tower+c.pole);$('#realStationCount').textContent=gisCount(c.substation);
 $('#planCount').textContent=Object.keys(realPlan).length;
 const favorites=['way/171537807','way/182863859','way/306655947','way/171724615','way/40946796'].map(id=>realFeatureIndex.get(id)).filter(f=>f&&InfraWatchArea.intersectsFeature(f));
 $('#realQuick').innerHTML=favorites.map(f=>`<button class="quick-location real-quick ${f.id===realSelected?'selected':''}" data-real-id="${f.id}"><span>ϟ</span><span><strong>${gisEsc(realName(f))}</strong><small>${realVoltageLabel(f.properties)} · ${fmt(f.properties.length_km_in_aoi)} km w zbiorze źródłowym</small></span></button>`).join('');
 const q=$('#realSearch').value.toLocaleLowerCase('pl');
 const matches=realPower.features.filter(f=>(q||f.properties.kind==='line')&&`${realName(f)} ${f.id} ${f.properties.voltage||''}`.toLocaleLowerCase('pl').includes(q));
 $('#realResults').innerHTML=`<p class="real-result-count">Dopasowania: ${gisCount(matches.length)} · pokazano ${Math.min(35,matches.length)}</p>`+matches.slice(0,35).map(f=>`<button class="location ${f.id===realSelected?'selected':''}" data-real-id="${f.id}"><div class="location-top"><span>OSM ${f.properties.osm_id}</span><span>${realVoltageLabel(f.properties)}</span></div><strong>${gisEsc(realName(f))}</strong><p>${f.properties.kind==='line'?fmt(f.properties.length_km_in_aoi)+' km w zbiorze źródłowym':gisEsc(realKind(f))} <span>↗</span></p></button>`).join('');
 $$('[data-real-id]').forEach(b=>b.onclick=()=>selectRealFeature(b.dataset.realId,true));
}
function renderRealDetail(){
 const f=realFeatureIndex.get(realSelected);if(!f){$('#detailPanel').innerHTML='<div class="real-empty">Brak obiektów GIS w wybranym obszarze. Zmień obszar lub wyłącz wybór.</div>';return}const p=f.properties,linked=p.node_ids?realPower.features.filter(n=>n.properties.kind==='support'&&p.node_ids.includes(n.properties.osm_id)).length:null;
 const fields=[['Identyfikator OSM',`${p.osm_type}/${p.osm_id}`],['Rodzaj obiektu',realKind(f)],['Napięcie wg OSM',realVoltageLabel(p)],['Operator wg OSM',gisText(p.operator)],['Numer / ref',gisText(p.ref)],['Liczba obwodów',gisText(p.circuits)],['Przewody / cables',gisText(p.cables)],...(p.kind==='line'?[['Długość w obszarze danych',`${fmt(p.length_km_in_aoi,3)} km`],['Podpory z węzłów linii',`${linked} w pobranym obszarze`]]:[]),['Ostatnia edycja OSM',p.osm_last_edit?new Date(p.osm_last_edit).toLocaleDateString('pl-PL'):'Brak'],['Wersja obiektu',p.osm_version??'Brak']];
 $('#detailPanel').innerHTML=`<div class="detail-head"><div class="detail-eyebrow"><span>RZECZYWISTE DANE GIS</span><span class="real-source-tag">OSM · ODbL</span></div><h2>${p.kind==='line'?'Linia '+realVoltageLabel(p):realKind(f)}</h2><p class="real-feature-name">${gisEsc(realName(f))}</p><span class="real-provenance">Źródło publiczne · niezweryfikowane przez operatora</span></div><table class="attributes"><tbody>${fields.map(([k,v])=>`<tr><td>${gisEsc(k)}</td><td>${v}</td></tr>`).join('')}</tbody></table><div class="real-data-note"><strong>Brak pomiaru zagrożeń</strong><p>Nie wyznaczono prześwitu, wysokości drzew ani kolizji z roślinnością. Dotychczasowe alerty i korony demo nie są oceną tej infrastruktury.</p></div><div class="detail-actions"><a class="real-osm-link" href="${p.source_url}" target="_blank" rel="noopener">Otwórz oryginalny obiekt w OSM ↗</a><button class="inspection-button" id="realObjectFit">Pokaż cały obiekt</button><button class="inspection-button ${realPlan[f.id]?'scheduled':''}" id="realPlanButton">${realPlan[f.id]?'✓ W planie · usuń z planu':'+ Dodaj do planu weryfikacji'}</button><p class="data-note">Edycja OSM nie jest datą pomiaru ani potwierdzeniem aktualności. Długość obliczono z geometrii przyciętej do obszaru zapytania.</p></div>`;
 $('#realObjectFit').onclick=()=>map.fitBounds(realBounds(f).pad(.1),{maxZoom:17});$('#realPlanButton').onclick=()=>toggleRealPlan(f.id);
}
function toggleRealPlan(id){if(realPlan[id])delete realPlan[id];else realPlan[id]={addedAt:new Date().toISOString()};try{localStorage.setItem('infrawatch-real-plan-v1',JSON.stringify(realPlan))}catch(e){}renderList();renderDetail();renderActions();toast(realPlan[id]?'Dodano rzeczywisty obiekt do lokalnego planu weryfikacji.':'Usunięto obiekt z planu.')}
function renderRealActions(){const fs=Object.keys(realPlan).map(id=>realFeatureIndex.get(id)).filter(Boolean);$('#actionsView').innerHTML=`<h2>Plan weryfikacji GIS</h2><p>${fs.length} rzeczywistych obiektów OSM w lokalnym planie. Brak automatycznej oceny zagrożeń i brak wysyłki zleceń.</p>${fs.length?`<div class="table-wrap"><table><thead><tr><th>OBIEKT</th><th>ID OSM</th><th>NAPIĘCIE WG OSM</th><th></th></tr></thead><tbody>${fs.map(f=>`<tr><td>${gisEsc(realName(f))}</td><td>${f.id}</td><td>${realVoltageLabel(f.properties)}</td><td><button class="table-button" data-real-remove="${f.id}">Usuń z planu</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="real-empty">Wybierz linię, słup lub stację na mapie i dodaj obiekt do planu.</div>'}`;$$('[data-real-remove]').forEach(b=>b.onclick=()=>toggleRealPlan(b.dataset.realRemove))}
function renderRealAnalysis(){$('#analysisView').innerHTML=`<h2>Rzeczywista geometria, jawne granice analizy.</h2><p>Na mapie są rzeczywiste obiekty OpenStreetMap. Obrazy Sentinel-2 i NDVI można zmieniać osią czasu pod mapą. Bieżący snapshot GIS pozostaje niezależny od daty obrazu.</p><div class="analysis-grid"><article class="analysis-card"><h3>Pełny zbiór źródłowy</h3><p>${gisCount(realMeta.counts.line)} odcinków power=line, ${gisCount(realMeta.counts.minor_line)} power=minor_line, ${gisCount(realMeta.counts.tower)} wież/słupów kratowych, ${gisCount(realMeta.counts.pole)} słupów oraz ${gisCount(realMeta.counts.substation)} stacji. Obiekty mogą nie tworzyć kompletnej inwentaryzacji sieci.</p><h3>Co oznacza oś czasu?</h3><p>W widoku ogólnym zmienia pełne zobrazowanie Sentinel lub NDVI. W zbliżeniu pozostaje niezależna mozaika lotnicza GUGiK. Nie posiadamy historycznych snapshotów GIS dla lat 2020–2025.</p></article><article class="analysis-card"><h3>Nie przypisano fikcyjnych pomiarów</h3><p>Pięć punktów i wskaźniki wcześniejszego demo nie zostały przeniesione na rzeczywiste linie. Dla obiektów OSM nie obliczono prześwitu ani pokrycia pasa. Do oceny potrzebne są dane przewodów, LiDAR i walidacja operatora.</p><h3>Źródło i kontrola</h3><p>Snapshot bazy OSM: ${gisEsc(realMeta.snapshot)}. Każdy obiekt ma link do oryginału, identyfikator i ostatnią edycję. Eksport zawiera atrybucję ODbL i informację o przycięciu linii do obszaru.</p></article></div>`}
renderList=function(){if(realPower&&!demoMode)renderRealList();else oldDemo.renderList()};
renderDetail=function(){if(realPower&&!demoMode)renderRealDetail();else oldDemo.renderDetail()};
renderActions=function(){if(realPower&&!demoMode)renderRealActions();else oldDemo.renderActions()};
renderAnalysis=function(){if(realPower&&!demoMode)renderRealAnalysis();else oldDemo.renderAnalysis()};
fit=function(){if(InfraWatchArea.getBox()){InfraWatchArea.focus();return}if(realMeta&&!demoMode){const b=realMeta.aoi_bbox;map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{padding:[25,25]})}else oldDemo.fit()};
refreshScenario=function(){if(demoMode)oldDemo.refreshScenario()};
updateMarkers=function(){if(demoMode)oldDemo.updateMarkers()};
renderImageryStatus=function(){oldDemo.renderImageryStatus();if(realPower&&!demoMode){$('.timeline-info .eyebrow').textContent=effectiveImagery==='aerial'?'ORTOFOTOMAPA / SNAPSHOT GIS':'HISTORIA OBRAZÓW / SNAPSHOT GIS';$('#timelineNote').textContent=effectiveImagery==='aerial'?'Lotnicze: mozaika GUGiK, data nalotu do weryfikacji. GIS: snapshot OSM 06.11.2026, niezależny od wybranego roku.':'Oś zmienia obraz Sentinel / NDVI. Geometria GIS to snapshot OSM z 06.11.2026; nie jest stanem sieci z wybranego roku.'}};
showSources=function(){oldDemo.showSources();$('#sourceContent').insertAdjacentHTML('afterbegin',`<h3><span class="source-chip">RZECZYWISTE DANE GIS</span> OpenStreetMap</h3><p>Źródło: © OpenStreetMap contributors, licencja <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">ODbL 1.0</a>. Snapshot bazy: ${gisEsc(realMeta.snapshot)}. Dane pobrano przez Overpass dla obszaru ${realMeta.aoi_bbox.join(', ')}. Linie przycięto do granicy obszaru. Zachowano identyfikatory, wersje, daty edycji i dostępne atrybuty źródłowe. Nie dodano sztucznych słupów ani przebiegów.</p><p>To publiczna mapa społecznościowa — nie dokumentacja powykonawcza ani dane potwierdzone przez operatora. Atrybut operatora/napięcia pochodzi z OSM. Braki nie są uzupełniane domysłami. Jedną relację stacji pominięto; zbiór nie gwarantuje kompletności sieci. Domyślnie nie pokazujemy fikcyjnych alertów, koron ani pasa technologicznego; wcześniejszy scenariusz można włączyć oddzielnie.</p>`)};
function realCsv(){const fields=['osm_type','osm_id','name','power','voltage','operator','ref','circuits','cables','length_km_in_aoi','osm_last_edit','source','source_license','operator_verified','source_url'];const rows=[fields,...realPower.features.map(f=>fields.map(k=>f.properties[k]??''))];download('InfraWatch_rzeczywiste_GIS_OSM.csv','\ufeff'+rows.map(r=>r.map(c=>'"'+String(c).replaceAll('"','""')+'"').join(';')).join('\r\n'),'text/csv;charset=utf-8')}
function realHtml(){const f=realFeatureIndex.get(realSelected);if(!f){toast('Brak wybranego obiektu GIS.');return}const p=f.properties;download('InfraWatch_obiekt_GIS_OSM.html',`<!doctype html><html lang="pl"><meta charset="utf-8"><title>InfraWatch · rzeczywisty obiekt GIS</title><style>body{font:14px Arial;max-width:900px;margin:40px auto;line-height:1.7;color:#244436}td{padding:7px 12px;border-bottom:1px solid #ddd}h1{font-size:26px}</style><h1>${gisEsc(realName(f))}</h1><p>Rzeczywisty obiekt z publicznej mapy OpenStreetMap. Snapshot: ${gisEsc(realMeta.snapshot)}. Dane niepotwierdzone przez operatora.</p><table>${Object.entries(p).filter(([k])=>k!=='node_ids').map(([k,v])=>`<tr><td>${gisEsc(k)}</td><td>${gisEsc(v)}</td></tr>`).join('')}</table><p>Nie wyznaczono zagrożenia, prześwitu ani wysokości roślin. OSM edit timestamp nie jest datą pomiaru. Linie przycięto do obszaru zapytania.</p><p><a href="${p.source_url}">Oryginalny obiekt OSM</a> · © OpenStreetMap contributors · <a href="https://www.openstreetmap.org/copyright">ODbL 1.0</a></p></html>`,'text/html;charset=utf-8')}
exportGeo=function(){if(demoMode)return oldDemo.exportGeo();download('InfraWatch_rzeczywiste_GIS_OSM.geojson',JSON.stringify({...realPower,metadata:realMeta,study_area:InfraWatchArea.getReport()}),'application/geo+json')};
exportCsv=function(){if(demoMode)return oldDemo.exportCsv();realCsv()};
exportHtml=function(){if(demoMode)return oldDemo.exportHtml();realHtml()};
init();
