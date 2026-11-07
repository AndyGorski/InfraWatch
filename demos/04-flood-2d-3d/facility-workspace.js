/* Shared facility selection, with the existing flood model restricted to its real extent. */
async function installFloodFacilityWorkspace(){
  let source=await InfraWatchData.load('kozienice'),allSources=new Map(),activeGIS=[],modelAvailable=true;
  const modelPoints=infra.elements.slice(),legacyCoords=line.getLatLngs(),legacyBox=[...bbox];
  const ready=InfraWatchData.all().then(items=>items.forEach(s=>allSources.set(s.region,s)));
  const modelGeometry={type:'Polygon',coordinates:[[[bbox[0],bbox[1]],[bbox[2],bbox[1]],[bbox[2],bbox[3]],[bbox[0],bbox[3]],[bbox[0],bbox[1]]]]};
  const status=document.createElement('p');status.id='floodModelCoverage';status.className='flood-model-coverage';
  const detail=document.createElement('section');detail.id='floodGISDetails';detail.className='flood-gis-details';detail.hidden=true;
  document.querySelector('.map-column').append(status,detail);
  map.setMinZoom(6);map.setMaxZoom(19);map.createPane('floodRegionalGIS');map.getPane('floodRegionalGIS').style.zIndex=460;
  const network=L.layerGroup().addTo(map),renderer=L.canvas({pane:'floodRegionalGIS'});
  const oldSetBase=setBase;let requestedBase='optical';map.removeLayer(baseLayers.ortho);
  function updateSourceImagery(){
    const b=source.imagery.bbox,scene=source.imagery.scenes.at(-1);baseLayers.optical.setUrl(scene.rgbURL).setBounds([[b[1],b[0]],[b[3],b[2]]]);
    let section=$('floodImagerySources');if(!section){section=document.createElement('details');section.id='floodImagerySources';$('modal').querySelector('h2').after(section)}
    section.replaceChildren();const summary=document.createElement('summary');summary.textContent='Aktywny Sentinel-2 · '+source.name+' · '+scene.date.slice(0,10);section.append(summary);
    const info=document.createElement('p');info.textContent='Mozaika sąsiednich kafli tego samego przelotu. Zasięg W, S, E, N: '+b.join(', ')+'. Widok ogólny: '+source.imagery.width+' × '+source.imagery.height+' px; około '+source.imagery.approx_ground_pixel_m+' m/px. Model zalania i tekstury 3D zachowują pierwotny zasięg.';section.append(info);
    for(const tile of scene.sources||[scene]){const p=document.createElement('p'),a=document.createElement('a');a.href=tile.url;a.textContent=tile.id+' ↗';a.target='_blank';a.rel='noopener';p.append(a);section.append(p)}
  }
  updateSourceImagery();
  baseLayers.ortho=L.tileLayer('https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTOFOTOMAPA&STYLE=default&FORMAT=image/jpeg&TILEMATRIXSET=EPSG:3857&TILEMATRIX=EPSG:3857:{z}&TILEROW={y}&TILECOL={x}',{minZoom:6,maxZoom:19,attribution:'© GUGiK / Geoportal · ortofotomapa WMTS'});
  function applyBase(){const effective=state.view==='2d'&&map.getZoom()>=12?'ortho':requestedBase;for(const [key,layer] of Object.entries(baseLayers))key===effective?layer.addTo(map):map.removeLayer(layer);oldSetBase(effective)}
  setBase=base=>{requestedBase=base;applyBase()};map.on('zoomend',applyBase);
  const modelControls=['time','peak','peakTime','opacity','play','peakGo','low','medium','high','view3d','rotateLeft','rotateRight'];
  window.floodModelAvailable=()=>modelAvailable;
  window.refreshFloodAvailability=()=>{
    for(const id of modelControls){$(id).disabled=!modelAvailable;$(id).title=modelAvailable?'':'Brak przygotowanego modelu zalania dla tego obszaru'}
    if(!modelAvailable&&state.view==='3d')setView('2d');
    document.querySelector('.map-column .legend').hidden=!modelAvailable;document.querySelector('.mapWarning').hidden=!modelAvailable;
    $('viewTitle').textContent=modelAvailable?(state.view==='3d'?'Model terenu · 3D':'Mapa scenariusza · 2D'):'GIS i zobrazowania · brak modelu zalania';
    $('mapNote').textContent=modelAvailable?'◇ słup F401 · niebieski: symulowana woda':'Rzeczywisty GIS i obrazy · brak symulacji zalania dla tego obszaru';
    $('floodScenarioBadge').textContent=modelAvailable?'SYNTETYCZNY':'BRAK MODELU';
    $('floodScenarioIntro').textContent=modelAvailable?'Dobierz wysokość i czas kulminacji, a następnie prześledź zmiany w 2D lub 3D.':'Dla tego obszaru nie przygotowano modelu zalania. Dostępny jest GIS i podkład obrazowy. Model demonstracyjny możesz zobaczyć w otoczeniu Elektrowni Kozienice.';
  };
  function selectGIS(f){
    detail.hidden=false;detail.replaceChildren();const title=document.createElement('h3');title.textContent=f.properties.name||f.properties.ref||f.id;detail.append(title);
    for(const text of [f.id,'Napięcie wg OSM: '+(f.properties.voltage||'brak')+' V','Dla tej regionalnej geometrii nie przypisano pomiaru ani oceny uszkodzeń. Model odnosi się do siatki terenu i wybranych słupów F401.']){const p=document.createElement('p');p.textContent=text;detail.append(p)}
    const a=document.createElement('a');a.href=f.properties.source_url;a.textContent='Obiekt źródłowy OSM ↗';a.target='_blank';a.rel='noopener';detail.append(a);
  }
  function updateSelection(){
    const selection=InfraWatchArea.getReport();activeGIS=source.gis.features.filter(InfraWatchArea.intersectsFeature);network.clearLayers();detail.hidden=true;
    L.geoJSON({type:'FeatureCollection',features:activeGIS.filter(f=>['line','minor_line','substation'].includes(f.properties.power))},{pane:'floodRegionalGIS',renderer,style:f=>({color:f.properties.power==='substation'?'#89cdd1':f.properties.power==='minor_line'?'#8ebc81':'#dcca85',weight:1.7,fillOpacity:.1}),pointToLayer:(_,ll)=>L.circleMarker(ll,{radius:4,renderer,pane:'floodRegionalGIS'}),onEachFeature:(f,l)=>{const text=document.createElement('span');text.textContent=f.properties.name||f.properties.ref||f.id;l.bindTooltip(text);l.on('click',()=>selectGIS(f))}}).addTo(network);
    modelAvailable=source.region==='kozienice'&&(!selection||InfraWatchArea.intersectsFeature({geometry:modelGeometry}));
    points=modelAvailable?modelPoints.filter(p=>InfraWatchArea.contains(p.lat,p.lon)):[];
    if(!points.includes(state.selected))state.selected=points[0]||null;
    window.floodSelectionMask=new Uint8Array(dem.width*dem.height);
    for(let y=0;y<dem.height;y++)for(let x=0;x<dem.width;x++)window.floodSelectionMask[y*dem.width+x]=Number(InfraWatchArea.contains(bbox[3]-(bbox[3]-bbox[1])*y/(dem.height-1),bbox[0]+(bbox[2]-bbox[0])*x/(dem.width-1)));
    towerLayer.clearLayers();for(const p of points)L.marker([p.lat,p.lon],{icon:L.divIcon({className:'towerIcon',html:'◇',iconSize:[20,20],iconAnchor:[10,10]})}).bindTooltip('Słup F401 · OSM '+p.id).on('click',()=>select(p)).addTo(towerLayer);
    line.setLatLngs(selection?infra.way.nodes.map(id=>points.find(p=>p.id===id)).filter(Boolean).map(p=>[p.lat,p.lon]):legacyCoords);
    for(const layer of [line,towerLayer])modelAvailable?layer.addTo(map):map.removeLayer(layer);
    if(!modelAvailable&&waterOverlay)map.removeLayer(waterOverlay);
    status.classList.toggle('unavailable',!modelAvailable);
    status.textContent=!modelAvailable?'Brak przygotowanego modelu zalania dla wybranego otoczenia. Dostępne są rzeczywiste linie GIS, Sentinel-2 i ortofotomapa.':selection?'Model demonstracyjny Wisły koło Kozienic · '+(InfraWatchArea.coverage(selection.bbox,legacyBox)==='full'?'wybór w zasięgu modelu':'częściowe pokrycie otoczenia')+' · słupy F401 w wyborze: '+points.length:'Model demonstracyjny Wisły koło Kozienic · 30 słupów F401.';
    $('floodScopeLabel').textContent=selection?.facility?selection.facility.name+' · promień '+selection.radius_km+' km · '+(modelAvailable?'model demonstracyjny w dostępnym zasięgu':'brak przygotowanego modelu zalania'):'Wybierz elektrownię i jej otoczenie · model Wisły koło Kozienic / F401: scenariusze 72 h';
    window.refreshFloodAvailability();render();
  }
  const areaConfig={name:source.name,imageryBox:source.imagery.bbox,gisBox:source.meta.aoi_bbox,
    showMap:()=>setView('2d'),onChange:updateSelection,stats:()=>({total:activeGIS.length,lines:activeGIS.filter(f=>['line','minor_line'].includes(f.properties.power)).length}),
    onNavigate:()=>applyBase()
  };
  InfraWatchArea.install(map,areaConfig);map.getPane('studyArea').style.zIndex=480;
  const chooseRegion=async region=>{await ready;source=allSources.get(region);areaConfig.name=source.name;areaConfig.imageryBox=source.imagery.bbox;areaConfig.gisBox=source.meta.aoi_bbox;updateSourceImagery();document.querySelector('#areaLocationPreset option[value=source]').textContent='Obszar danych: '+source.name;setBase('optical')};
  await InfraWatchFacility.install(map,{mode:'flood',region:'kozienice',name:'Wszystkie regiony',ready,getFeatures:f=>allSources.get(f.region).gis.features,
    beforeApply:f=>chooseRegion(f.region),prepareLayers:()=>{},showLines:()=>{},selectLine:id=>{const f=source.gis.features.find(f=>f.id===id);if(f)selectGIS(f)}
  });
  const oldReset=$('reset').onclick;$('reset').onclick=async()=>{await chooseRegion('kozienice');InfraWatchArea.clear();oldReset()};
  $('export').onclick=()=>{
    const obj={generated_at:new Date().toISOString(),type:modelAvailable?'synthetic_scenario_not_a_forecast':'gis_context_no_flood_model',study_area:InfraWatchArea.getReport(),imagery:{sentinel_mosaic_bbox:source.imagery.bbox,width_px:source.imagery.width,height_px:source.imagery.height,overview_ground_pixel_m:source.imagery.approx_ground_pixel_m,region:source.region,effective_mode:state.base,sentinel_reference_scene:source.imagery.scenes.at(-1),gugik_acquisition_date:null},prepared_model_source:{dem:'Mapzen Terrain Tiles z12 Terrarium; grid 240x180; accessed 2026-10-27',infrastructure:'OSM F401 sample; snapshot 2026-10-26',hydrology:'synthetic; no hydrodynamic model'},model_coverage:{available:modelAvailable,bbox:legacyBox,scope:'Prepared Kozienice DEM and F401 samples only; no model relocated to another plant.'},scenario:modelAvailable?{time_hours:state.time,peak_m:state.peak,peak_time_hours:state.peakTime,water_m_above_approximate_local_river_dem:stage(state.time)}:null,gis:{source:source.meta,selected_count:activeGIS.length,selected_osm_features:activeGIS.map(f=>f.id)},towers:modelAvailable?points.map(p=>({osm_id:p.id,lat:p.lat,lon:p.lon,modeled_depth_m:+depths[indexPoint(p)].toFixed(2),note:'same grid cell only; no damage assessment'})):[]};
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.href=url;a.download='InfraWatch_zalanie_wybrany_obiekt.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  if(!InfraWatchArea.getBox()){status.textContent='Model demonstracyjny Wisły koło Kozienic · 30 słupów F401.';window.refreshFloodAvailability()}
}
