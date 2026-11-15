/* Shared facility selection, with the existing flood model restricted to its real extent. */
async function installFloodFacilityWorkspace(){
  let source=await InfraWatchData.loadImagery('kozienice'),allSources=new Map(),activeGIS=[],nationalData={type:'FeatureCollection',features:[]},nationalMeta=await InfraWatchNationalPower.metadata(),nationalGIS,modelAvailable=true;
  const modelPoints=infra.elements.slice(),legacyCoords=line.getLatLngs(),legacyBox=[...bbox];let selectedGIS=null;
  const ready=InfraWatchData.allImagery().then(items=>items.forEach(s=>allSources.set(s.region,s)));
  const modelGeometry={type:'Polygon',coordinates:[[[bbox[0],bbox[1]],[bbox[2],bbox[1]],[bbox[2],bbox[3]],[bbox[0],bbox[3]],[bbox[0],bbox[1]]]]};
  const status=document.createElement('p');status.id='floodModelCoverage';status.className='flood-model-coverage';
  const detail=document.createElement('section');detail.id='floodGISDetails';detail.className='flood-gis-details';detail.hidden=true;
  document.getElementById('layersPanel').append(status);document.getElementById('detailPanel').insertBefore(detail,document.getElementById('asset'));
  map.setMinZoom(6);map.setMaxZoom(19);map.createPane('floodRegionalGIS');map.getPane('floodRegionalGIS').style.zIndex=460;
  const network=L.layerGroup().addTo(map),renderer=L.canvas({pane:'floodRegionalGIS'});
  const oldSetBase=setBase;let requestedBase='optical',sentinelYear=2025,nationalLayer=null;const regionalOptical=baseLayers.optical;map.removeLayer(baseLayers.ortho);
  function updateSourceImagery(){
    const b=source.imagery.bbox,scene=source.imagery.scenes.at(-1);regionalOptical.setUrl(scene.rgbURL).setBounds([[b[1],b[0]],[b[3],b[2]]]);
    let section=$('floodImagerySources');if(!section){section=document.createElement('details');section.id='floodImagerySources';$('modal').querySelector('h2').after(section)}
    section.replaceChildren();const summary=document.createElement('summary');summary.textContent='Aktywny Sentinel-2 · '+source.name+' · '+scene.date.slice(0,10);section.append(summary);
    const info=document.createElement('p');info.textContent='Mozaika sąsiednich kafli tego samego przelotu. Zasięg W, S, E, N: '+b.join(', ')+'. Widok ogólny: '+source.imagery.width+' × '+source.imagery.height+' px; około '+source.imagery.approx_ground_pixel_m+' m/px. Model zalania i tekstury 3D zachowują pierwotny zasięg.';section.append(info);
    for(const tile of scene.sources||[scene]){const p=document.createElement('p'),a=document.createElement('a');a.href=tile.url;a.textContent=tile.id+' ↗';a.target='_blank';a.rel='noopener';p.append(a);section.append(p)}
  }
  updateSourceImagery();
  baseLayers.ortho=InfraWatchSentinel.createAerialLayer(sentinelYear);
  function applyBase(){
    baseLayers.ortho.setYear(sentinelYear);
    if($('sentinelFloodYear'))$('sentinelFloodYear').disabled=!InfraWatchSentinel.national()||state.view==='3d';
    const useNational=InfraWatchSentinel.national()&&state.view==='2d',next=useNational?nationalLayer:regionalOptical;
    if(baseLayers.optical!==next){map.removeLayer(baseLayers.optical);baseLayers.optical=next}
    const effective=state.view==='2d'&&map.getZoom()>=12?'ortho':requestedBase;for(const [key,layer] of Object.entries(baseLayers))key===effective?layer.addTo(map):map.removeLayer(layer);oldSetBase(effective);
    if(useNational&&effective==='optical')$('sentinelFloodStatus').textContent=`Czerwiec–sierpień ${sentinelYear} · `+InfraWatchSentinel.status(nationalLayer);
    else $('sentinelFloodStatus').textContent=state.view==='3d'?'Tekstura 3D: pierwotny lokalny obraz modelu Kozienic.':effective==='ortho'?'GUGiK: zdjęcia lotnicze; morze i luki: Sentinel-2, lato '+sentinelYear+'. Daty nalotów są niezależne.':'Regionalny Sentinel-2: '+source.imagery.scenes.at(-1).date.slice(0,10);
  }
  const nationalControls=document.createElement('section');document.querySelector('.mapbuttons').after(nationalControls);
  InfraWatchSentinel.install({container:nationalControls,map,onChange:extent=>{if(nationalLayer)map.removeLayer(nationalLayer);nationalLayer=InfraWatchSentinel.createLayer(sentinelYear);nationalLayer.on('iw:status',()=>{if(state.view==='2d'&&state.base==='optical'&&InfraWatchSentinel.national())$('sentinelFloodStatus').textContent=`Czerwiec–sierpień ${sentinelYear} · `+InfraWatchSentinel.status(nationalLayer)});if(extent){setView('2d');requestedBase='optical'}else if(!InfraWatchSentinel.national()&&InfraWatchArea.coverage(InfraWatchArea.getBox(),source.imagery.bbox)==='none')requestedBase='ortho';applyBase();areaConfig.imageryBox=InfraWatchSentinel.national()?InfraWatchSentinel.bbox:source.imagery.bbox;InfraWatchArea.refresh()}});
  const yearLabel=document.createElement('label');yearLabel.textContent='Rok mozaiki Sentinel-2 ';const yearSelect=document.createElement('select');yearSelect.id='sentinelFloodYear';for(const year of InfraWatchSentinel.years){const option=document.createElement('option');option.value=year;option.textContent=year;yearSelect.append(option)}yearSelect.value=sentinelYear;yearLabel.append(yearSelect);nationalControls.querySelector('.national-sentinel-control').append(yearLabel);
  const nationalStatus=document.createElement('p');nationalStatus.id='sentinelFloodStatus';nationalStatus.setAttribute('aria-live','polite');nationalControls.append(nationalStatus);
  yearSelect.onchange=()=>{sentinelYear=Number(yearSelect.value);$('sentinelRetry').click()};
  nationalLayer=InfraWatchSentinel.createLayer(sentinelYear);nationalLayer.on('iw:status',()=>{if(state.view==='2d'&&state.base==='optical'&&InfraWatchSentinel.national())nationalStatus.textContent=`Czerwiec–sierpień ${sentinelYear} · `+InfraWatchSentinel.status(nationalLayer)});
  $('modal').insertAdjacentHTML('afterbegin',InfraWatchSentinel.sourceHTML());
  setBase=base=>{requestedBase=base;applyBase()};map.on('zoomend',applyBase);const previousView=setView;setView=view=>{previousView(view);applyBase()};
  const modelControls=['time','peak','peakTime','opacity','play','peakGo','low','medium','high','view3d','rotateLeft','rotateRight'];
  window.floodModelAvailable=()=>modelAvailable;
  window.refreshFloodAvailability=()=>{
    for(const id of modelControls){$(id).disabled=!modelAvailable;$(id).title=modelAvailable?'':'Brak przygotowanego modelu zalania dla tego obszaru'}
    if(!modelAvailable&&state.view==='3d')setView('2d');
    document.querySelector('.map-column .legend').hidden=!modelAvailable;document.querySelector('.mapWarning').hidden=!modelAvailable;
    $('viewTitle').textContent=modelAvailable?(state.view==='3d'?'Model terenu · 3D':'Mapa scenariusza · 2D'):'GIS i zobrazowania · brak modelu zalania';
    $('mapNote').textContent=modelAvailable?(state.view==='3d'?'Przeciągnij: obrót · kółko: zbliżenie · symbole F401 / woda: scenariusz':'◇ słup F401 · niebieski: symulowana woda'):'Rzeczywisty GIS i obrazy · brak symulacji zalania dla tego obszaru';
    $('floodScenarioBadge').textContent=modelAvailable?'SYNTETYCZNY':'BRAK MODELU';
    $('floodScenarioIntro').textContent=modelAvailable?'Dobierz wysokość i czas kulminacji, a następnie prześledź zmiany w 2D lub 3D.':'Dla tego obszaru nie przygotowano modelu zalania. Dostępny jest GIS i podkład obrazowy. Model demonstracyjny możesz zobaczyć w otoczeniu Elektrowni Kozienice.';
  };
  window.clearFloodGISSelection=()=>{selectedGIS=null;detail.hidden=true};
  window.focusFloodGISSelection=()=>{if(!selectedGIS)return;setView('2d');map.fitBounds(L.geoJSON(selectedGIS).getBounds(),{padding:[24,24],maxZoom:16})};
  function selectGIS(f){
    selectedGIS=f;
    detail.hidden=false;detail.replaceChildren();const title=document.createElement('h3');title.textContent=f.properties.name||f.properties.ref||f.id;detail.append(title);
    for(const text of [f.id,'Rodzaj wg OSM: '+f.properties.power,'Napięcie wg OSM: '+(f.properties.voltage||'brak')+' V','Operator wg OSM: '+(f.properties.operator||'brak'),'Dla tej geometrii nie przypisano pomiaru ani oceny uszkodzeń. Model odnosi się do siatki terenu i wybranych słupów F401.']){const p=document.createElement('p');p.textContent=text;detail.append(p)}
    const a=document.createElement('a');a.href=f.properties.source_url;a.textContent='Obiekt źródłowy OSM ↗';a.target='_blank';a.rel='noopener';detail.append(a);window.InfraWatchFloodWorkspace?.selected('gis');
  }
  function updateSelection(){
    const selection=InfraWatchArea.getReport();activeGIS=nationalData.features.filter(InfraWatchArea.intersectsFeature);network.clearLayers();
    if(!selectedGIS||!InfraWatchArea.intersectsFeature(selectedGIS)||!InfraWatchFilters.matchesNetwork(selectedGIS)){selectedGIS=null;detail.hidden=true;window.InfraWatchFloodWorkspace?.clearGIS()}
    const shown=activeGIS.filter(f=>f.properties.kind!=='support'||map.getZoom()>=14&&(f.properties.power!=='pole'||map.getZoom()>=16));
    L.geoJSON({type:'FeatureCollection',features:shown},{pane:'floodRegionalGIS',renderer,style:f=>({color:f.properties.power==='substation'?'#89cdd1':f.properties.kind==='device'?'#c7b2e4':['minor_line','cable'].includes(f.properties.power)?'#8ebc81':'#dcca85',weight:1.7,fillOpacity:.1,...(f.properties.power==='cable'?{dashArray:'5 4'}:{})}),pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:f.properties.kind==='support'?2.5:4,renderer,pane:'floodRegionalGIS'}),onEachFeature:(f,l)=>{const text=document.createElement('span');text.textContent=f.properties.name||f.properties.ref||f.id;l.bindTooltip(text);l.on('click',async()=>{try{selectGIS(await InfraWatchNationalPower.detail(f))}catch(error){status.textContent='Nie udało się pobrać szczegółów obiektu GIS.'}})}}).addTo(network);
    modelAvailable=source.region==='kozienice'&&(!selection||InfraWatchArea.intersectsFeature({geometry:modelGeometry}));
    points=modelAvailable?modelPoints.filter(p=>InfraWatchArea.contains(p.lat,p.lon)):[];
    if(!points.includes(state.selected))state.selected=points[0]||null;
    window.floodSelectionMask=new Uint8Array(dem.width*dem.height);
    for(let y=0;y<dem.height;y++)for(let x=0;x<dem.width;x++)window.floodSelectionMask[y*dem.width+x]=Number(InfraWatchArea.contains(bbox[3]-(bbox[3]-bbox[1])*y/(dem.height-1),bbox[0]+(bbox[2]-bbox[0])*x/(dem.width-1)));
    towerLayer.clearLayers();for(const p of points){const wet=depths[indexPoint(p)]>0;L.marker([p.lat,p.lon],{icon:L.divIcon({className:'towerIcon '+(wet?'towerIcon-wet':''),html:wet?'◆':'◇',iconSize:[24,24],iconAnchor:[12,12]})}).bindTooltip((wet?'Słup F401 · ZALANY · ':'Słup F401 · ')+p.id).on('click',()=>select(p)).addTo(towerLayer)}
    line.setLatLngs(selection?infra.way.nodes.map(id=>points.find(p=>p.id===id)).filter(Boolean).map(p=>[p.lat,p.lon]):legacyCoords);
    const focusVisible=modelAvailable&&InfraWatchFilters.matchesLine({properties:{power:'line',voltage:'400000'}});
    focusVisible?line.addTo(map):map.removeLayer(line);
    focusVisible&&InfraWatchFilters.get().details.includes('supports')?towerLayer.addTo(map):map.removeLayer(towerLayer);
    if(!modelAvailable&&waterOverlay)map.removeLayer(waterOverlay);
    status.classList.toggle('unavailable',!modelAvailable);
    status.textContent=!modelAvailable?'Brak przygotowanego modelu zalania dla wybranego otoczenia. Dostępne są rzeczywiste linie GIS, Sentinel-2 i ortofotomapa.':selection?'Model demonstracyjny Wisły koło Kozienic · '+(InfraWatchArea.coverage(selection.bbox,legacyBox)==='full'?'wybór w zasięgu modelu':'częściowe pokrycie otoczenia')+' · słupy F401 w wyborze: '+points.length:'Model demonstracyjny Wisły koło Kozienic · 30 słupów F401.';
    $('floodScopeLabel').textContent=selection?.facility?selection.facility.name+' · promień '+selection.radius_km+' km · '+(modelAvailable?'model demonstracyjny w dostępnym zasięgu':'brak przygotowanego modelu zalania'):'Wybierz elektrownię i jej otoczenie · model Wisły koło Kozienic / F401: scenariusze 72 h';
    window.refreshFloodAvailability();render();
  }
  const areaConfig={name:'Polska',imageryBox:InfraWatchSentinel.national()?InfraWatchSentinel.bbox:source.imagery.bbox,gisBox:nationalMeta.aoi_bbox,
    showMap:()=>{window.InfraWatchFloodWorkspace?.show('map');setView('2d')},onChange:()=>{updateSelection();nationalGIS?.refresh()},stats:()=>({total:activeGIS.length,lines:activeGIS.filter(f=>f.properties.kind==='line').length}),
    onNavigate:()=>applyBase()
  };
  InfraWatchArea.install(map,areaConfig);map.getPane('studyArea').style.zIndex=480;
  nationalGIS=InfraWatchNationalPower.install(map,{container:document.getElementById('layersPanel'),onData:(fc,m)=>{nationalData=fc;if(m)nationalMeta=m;updateSelection()}});
  $('modal').insertAdjacentHTML('afterbegin',InfraWatchNationalPower.sourceHTML(nationalMeta));
  const chooseRegion=async region=>{await ready;source=allSources.get(region);areaConfig.imageryBox=InfraWatchSentinel.national()?InfraWatchSentinel.bbox:source.imagery.bbox;updateSourceImagery();setBase('optical')};
  await InfraWatchFacility.install(map,{mode:'flood',region:'kozienice',name:'Cała Polska',ready,getFeatures:async(f,r)=>(await InfraWatchNationalPower.query(InfraWatchArea.boxFromDimensions(f.lat,f.lon,2*r,2*r))).features,
    beforeApply:f=>chooseRegion(f.region==='poland'?InfraWatchData.nearestRegion(f):f.region),prepareLayers:()=>{},showLines:()=>{},selectLine:(id,f)=>{if(f)selectGIS(f)}
  });
  const oldReset=$('reset').onclick;$('reset').onclick=async()=>{await chooseRegion('kozienice');InfraWatchArea.clear();oldReset()};
  $('export').onclick=()=>{
    const obj={generated_at:new Date().toISOString(),rendering_3d:InfraWatchTerrain3D.report(),type:modelAvailable?'synthetic_scenario_not_a_forecast':'gis_context_no_flood_model',study_area:InfraWatchArea.getReport(),imagery:{sentinel_national:InfraWatchSentinel.national()&&state.view==='2d'?InfraWatchSentinel.report(sentinelYear):null,sentinel_mosaic_bbox:source.imagery.bbox,width_px:source.imagery.width,height_px:source.imagery.height,overview_ground_pixel_m:source.imagery.approx_ground_pixel_m,region:source.region,effective_mode:state.base,sentinel_reference_scene:source.imagery.scenes.at(-1),gugik_acquisition_date:null,aerial_supplement:'Sentinel-2 for sea and aerial nodata',aerial_supplement_year:sentinelYear},prepared_model_source:{dem:'Mapzen Terrain Tiles z12 Terrarium; grid 240x180; accessed 2026-10-27',infrastructure:'OSM F401 sample; snapshot 2026-10-26',hydrology:'synthetic; no hydrodynamic model'},model_coverage:{available:modelAvailable,bbox:legacyBox,scope:'Prepared Kozienice DEM and F401 samples only; no model relocated to another plant.'},scenario:modelAvailable?{time_hours:state.time,peak_m:state.peak,peak_time_hours:state.peakTime,water_m_above_approximate_local_river_dem:stage(state.time)}:null,gis:{source:nationalMeta,loading_scope:nationalData.loading_scope,selected_count:activeGIS.length,selected_osm_features:activeGIS.map(f=>f.id)},towers:modelAvailable?points.map(p=>({osm_id:p.id,lat:p.lat,lon:p.lon,modeled_depth_m:+depths[indexPoint(p)].toFixed(2),note:'same grid cell only; no damage assessment'})):[]};
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.href=url;a.download='InfraWatch_zalanie_wybrany_obiekt.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  if(!InfraWatchArea.getBox()){status.textContent='Model demonstracyjny Wisły koło Kozienic · 30 słupów F401.';window.refreshFloodAvailability()}
}
