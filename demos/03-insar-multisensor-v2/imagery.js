/* Real imagery history and live aerial detail; independent of InSAR epochs. */
function createInfraWatchImagery(map, byId) {
  let area=[[51.48,21.24],[51.78,21.86]];const sarArea=[[51.57,21.32],[51.73,21.61]],detailZoom=12;
  const wmts='https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTOFOTOMAPA&STYLE=default&FORMAT=image/jpeg&TILEMATRIXSET=EPSG:3857&TILEMATRIX=EPSG:3857:{z}&TILEROW={y}&TILECOL={x}';
  map.createPane('historyImagery');map.getPane('historyImagery').style.zIndex=250;
  const sar=L.imageOverlay('assets/sar-after.png',sarArea,{opacity:1,pane:'historyImagery'});
  const aerial=L.tileLayer(wmts,{minZoom:6,maxZoom:19,maxNativeZoom:19,tileSize:256,attribution:'© GUGiK / Geoportal · ortofotomapa WMTS'});
  let meta,sceneIndex=3,mode='optical',effective='optical',rgb,ndvi,timer=null,tileErrors=0,tileLoading=false,loadFailed=false;
  const date=value=>new Date(value).toLocaleDateString('pl-PL',{day:'2-digit',month:'long',year:'numeric'});
  const activeScene=()=>meta?.scenes[sceneIndex];
  map.attributionControl.addAttribution('Contains modified Copernicus Sentinel data · Earth Search / Element 84 · © OpenStreetMap contributors');
  aerial.on('loading',()=>{tileLoading=true;tileErrors=0;renderStatus()});
  aerial.on('load',()=>{tileLoading=false;renderStatus()});
  aerial.on('tileerror',()=>{tileErrors++;renderStatus()});
  function renderStatus(){
    const scene=activeScene(),isAerial=effective==='ortho';
    byId('imageryLabel').textContent=isAerial?'Ortofotomapa GUGiK · szczegół':effective==='sar'?'Sentinel-1 · 13.07.2025':effective==='mix'?`SAR + Sentinel-2 · ${scene?.year||'…'}`:`${effective==='ndvi'?'NDVI':'Sentinel-2'} · ${scene?.year||'…'}`;
    byId('imageryResolution').textContent=isAerial?'Mozaika lotnicza':effective==='sar'?'Jeden kadr radarowy':'Źródło 10 m · widok ogólny';
    byId('imageryNotice').textContent=isAerial?(tileErrors?'Brakuje części kafli GUGiK. Zmień widok lub spróbuj ponownie. Braki nie są zastępowane powiększonym Sentinel.':tileLoading?'Wczytywanie szczegółowych kafli ortofotomapy…':'Bieżąca mozaika GUGiK. Data nalotu do weryfikacji.') :loadFailed?'Nie udało się wczytać archiwum Sentinel-2. Odśwież stronę.':effective==='sar'?'Amplituda SAR jest kontekstem obrazu, nie pomiarem przemieszczenia.':'Daty obrazów i epoki analizy InSAR są niezależne.';
    byId('imageryNotice').classList.toggle('warning',!!tileErrors||loadFailed);
    byId('historyDate').textContent=scene?`${date(scene.date)} · ${scene.id.startsWith('S2A')?'S2A':scene.id.startsWith('S2B')?'S2B':'S2C'}`:loadFailed?'Archiwum niedostępne':'Wczytywanie archiwum…';
    byId('historyNote').textContent=isAerial?'Mapa pokazuje niezależną mozaikę lotniczą. Wybrany rok dotyczy archiwum Sentinel-2. Użyj „Pokaż archiwum”, aby zobaczyć historyczny obraz na całym obszarze.':effective==='sar'?'Mapa pokazuje jeden obraz SAR z 13.07.2025. Oś lat wybiera archiwum Sentinel-2; nie zmienia daty radaru ani epoki InSAR.':effective==='mix'?'Fuzja wizualna pojedynczego SAR z wybraną sceną Sentinel-2. Różne daty i przezroczystość nie stanowią analizy detekcji zmian.':'Oś zmienia całe zobrazowanie Sentinel-2 lub NDVI. Sezonowość i różne daty ograniczają porównywalność. GIS i epoka InSAR pozostają niezależne.';
    byId('showHistory').hidden=!isAerial&&effective!=='sar';
    byId('blendLabel').hidden=effective!=='mix';
    byId('ndviLegend').hidden=effective!=='ndvi';
    byId('historySlider').style.setProperty('--history-progress',`${sceneIndex/3*100}%`);
    if(scene)byId('historySlider').setAttribute('aria-valuetext',date(scene.date));
    for(const button of byId('historyYears').querySelectorAll('button'))button.setAttribute('aria-pressed',String(+button.dataset.index===sceneIndex));
    for(const [id,key] of [['optBtn','optical'],['ndviBtn','ndvi'],['sarBtn','sar'],['mixBtn','mix'],['orthoBtn','ortho']])byId(id).setAttribute('aria-pressed',String(effective===key));
    if(InfraWatchArea.coverage(InfraWatchArea.getBox(),meta?.bbox||[21.24,51.48,21.86,51.78])==='none')byId('historyNote').textContent='Dla tego obszaru nie przygotowano historii Sentinel-2. Dostępna jest niezależna mozaika lotnicza GUGiK.';
  }
  function update(){
    const next=mode==='ortho'||map.getZoom()>=detailZoom?'ortho':mode;
    for(const layer of [sar,rgb,ndvi,aerial])if(layer&&map.hasLayer(layer))map.removeLayer(layer);
    effective=next;
    if(next==='ortho')aerial.addTo(map);
    else if(next==='sar')sar.setOpacity(1).addTo(map);
    else if(next==='mix'){sar.setOpacity(1).addTo(map);if(rgb)rgb.setOpacity(+byId('blend').value/100).addTo(map)}
    else if(next==='ndvi'){if(rgb)rgb.setOpacity(.35).addTo(map);if(ndvi)ndvi.setOpacity(1).addTo(map)}
    else if(rgb)rgb.setOpacity(1).addTo(map);
    renderStatus();
  }
  function setMode(next,keepView=false){
    stop();mode=next;
    if(!keepView&&next==='ortho'&&map.getZoom()<detailZoom)map.setZoom(13);
    else if(!keepView&&next!=='ortho'&&map.getZoom()>=detailZoom){const b=InfraWatchArea.getBox();map.fitBounds(b?[[b[1],b[0]],[b[3],b[2]]]:area,{padding:[18,18],maxZoom:11})}
    update();
  }
  function setScene(index){
    if(!meta)return;
    sceneIndex=Math.max(0,Math.min(meta.scenes.length-1,Number(index)));
    const scene=activeScene();
    if(rgb)map.removeLayer(rgb);if(ndvi)map.removeLayer(ndvi);
    rgb=L.imageOverlay(scene.rgbURL,area,{opacity:1,pane:'historyImagery'});
    ndvi=L.imageOverlay(scene.ndviURL,area,{opacity:1,pane:'historyImagery'});
    byId('historySlider').value=String(sceneIndex);update();
  }
  function stop(){if(timer)clearInterval(timer);timer=null;byId('playHistory').textContent='▷';byId('playHistory').setAttribute('aria-pressed','false');byId('playHistory').setAttribute('aria-label','Odtwórz historię zobrazowań')}
  byId('historySlider').oninput=e=>{stop();setScene(e.target.value)};
  byId('showHistory').onclick=()=>setMode(mode==='ndvi'?'ndvi':'optical');
  byId('playHistory').onclick=()=>{
    if(timer){stop();return}if(!meta)return;
    setMode(mode==='ndvi'?'ndvi':'optical');setScene(0);
    byId('playHistory').textContent='Ⅱ';byId('playHistory').setAttribute('aria-pressed','true');byId('playHistory').setAttribute('aria-label','Zatrzymaj historię zobrazowań');
    timer=setInterval(()=>{if(sceneIndex>=meta.scenes.length-1){stop();return}setScene(sceneIndex+1)},2200);
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
  map.on('zoomend',update);
  map.on('movestart',()=>{if(timer&&map.getZoom()>=detailZoom)stop()});
  function setDataset(source){
    stop();meta=source.imagery;const b=meta.bbox;area=[[b[1],b[0]],[b[3],b[2]]];loadFailed=false;sceneIndex=Math.min(sceneIndex,meta.scenes.length-1);
    if(source.region!=='kozienice'&&['sar','mix'].includes(mode))mode='optical';
    byId('historyYears').replaceChildren();
    meta.scenes.forEach((scene,index)=>{const button=document.createElement('button');button.type='button';button.dataset.index=String(index);button.textContent=String(scene.year);button.title=date(scene.date);button.onclick=()=>{stop();setScene(index)};byId('historyYears').append(button)});
    byId('historySlider').disabled=false;byId('playHistory').disabled=false;byId('imagerySources').replaceChildren();
    const intro=document.createElement('p');intro.textContent=source.name+' · Sentinel-2 L2A / Earth Search / Element 84, kafel '+meta.scenes[0].id.split('_')[1]+'. Natywne pasma B04/B08: 10 m. Bbox: '+b.join(', ')+'.';byId('imagerySources').append(intro);
    meta.scenes.forEach(scene=>{const p=document.createElement('p'),a=document.createElement('a');a.href=scene.url;a.target='_blank';a.rel='noopener';a.textContent=scene.id+' ↗';p.append(a,document.createTextNode(' · '+date(scene.date)+' · chmury całej sceny '+Number(scene.cloud).toLocaleString('pl-PL',{maximumFractionDigits:3})+'%'));byId('imagerySources').append(p)});
    setScene(sceneIndex);
  }
  async function load(){try{setDataset(await InfraWatchData.load('kozienice'))}catch(error){loadFailed=true;console.error(error);renderStatus()}}
  update();const ready=load();
  return {setMode,setDataset,ready,refresh:update,getReport:()=>({requested_mode:mode,effective_mode:effective,sentinel_history_scene:activeScene()||null,sentinel_history_bbox:meta?.bbox||null,sar:{id:'Sentinel-1C IW GRDH VV',date:'2025-07-13',history_available:false},orthophoto:{provider:'GUGiK',service:'WMTS StandardResolution',acquisition_date:null,date_independent_of_timeline:true,automatic_detail_zoom:detailZoom},insar_epochs_independent:true})};
}
