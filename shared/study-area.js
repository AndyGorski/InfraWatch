/* Geographic study-area selection. Source geometries and measurements are never moved. */
window.InfraWatchArea = (() => {
  const R=6371000,rad=Math.PI/180;
  let box=null,ui=null,facilitySelection=null;
  const inside=(p,b)=>p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3];
  function segment(a,b,rect){
    let u=0,v=1;const dx=b[0]-a[0],dy=b[1]-a[1];
    for(const [p,q] of [[-dx,a[0]-rect[0]],[dx,rect[2]-a[0]],[-dy,a[1]-rect[1]],[dy,rect[3]-a[1]]]){
      if(p===0){if(q<0)return false}else if(p<0)u=Math.max(u,q/p);else v=Math.min(v,q/p);if(u>v)return false;
    }return true;
  }
  function inRing(p,ring){
    let result=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];
      if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;
    }return result;
  }
  function geometryIntersectsBox(g,b){
    if(!g||!b)return !b;
    const line=coords=>coords.some(p=>inside(p,b))||coords.slice(1).some((p,i)=>segment(coords[i],p,b));
    switch(g.type){
      case 'Point':return inside(g.coordinates,b);
      case 'MultiPoint':return g.coordinates.some(p=>inside(p,b));
      case 'LineString':return line(g.coordinates);
      case 'MultiLineString':return g.coordinates.some(line);
      case 'Polygon':{
        if(g.coordinates.some(line))return true;
        const p=[b[0],b[1]];return !!g.coordinates[0]&&inRing(p,g.coordinates[0])&&!g.coordinates.slice(1).some(r=>inRing(p,r));
      }
      case 'MultiPolygon':return g.coordinates.some(c=>geometryIntersectsBox({type:'Polygon',coordinates:c},b));
      case 'GeometryCollection':return g.geometries.some(geom=>geometryIntersectsBox(geom,b));
      default:return false;
    }
  }
  function boxFromDimensions(lat,lon,width,height){
    if(![lat,lon,width,height].every(Number.isFinite)||width<.1||height<.1||width>100||height>100)throw Error('Podaj wymiary od 0,1 do 100 km.');
    if(lat<49||lat>55||lon<14||lon>24.5)throw Error('Wybierz lokalizację w Polsce (49–55°N, 14–24,5°E).');
    const dy=height*1000/(2*R)/rad,dx=Math.asin(Math.sin(width*1000/(2*R))/Math.cos(lat*rad))/rad;
    return [lon-dx,lat-dy,lon+dx,lat+dy];
  }
  function dimensions(b){
    const lat=(b[1]+b[3])/2,lon=(b[0]+b[2])/2;
    return {lat,lon,width_km:2*R*Math.asin(Math.cos(lat*rad)*Math.sin((b[2]-b[0])*rad/2))/1000,height_km:R*(b[3]-b[1])*rad/1000,area_km2:R*R*(b[2]-b[0])*rad*(Math.sin(b[3]*rad)-Math.sin(b[1]*rad))/1e6};
  }
  function coverage(b,extent){return !b||b[0]>=extent[0]&&b[1]>=extent[1]&&b[2]<=extent[2]&&b[3]<=extent[3]?'full':b[2]>=extent[0]&&b[0]<=extent[2]&&b[3]>=extent[1]&&b[1]<=extent[3]?'partial':'none'}
  function pointDistance(a,b){const p=a[1]*rad,q=b[1]*rad,h=Math.sin((q-p)/2)**2+Math.cos(p)*Math.cos(q)*Math.sin((b[0]-a[0])*rad/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)))}
  function bearing(a,b){const p=a[1]*rad,q=b[1]*rad,d=(b[0]-a[0])*rad;return Math.atan2(Math.sin(d)*Math.cos(q),Math.cos(p)*Math.sin(q)-Math.sin(p)*Math.cos(q)*Math.cos(d))}
  function segmentDistance(p,a,b){
    const length=pointDistance(a,b);if(length<1e-8)return pointDistance(p,a);
    const d=pointDistance(a,p)/R,angle=bearing(a,p)-bearing(a,b),along=Math.atan2(Math.sin(d)*Math.cos(angle),Math.cos(d))*R;
    return along<0?pointDistance(p,a):along>length?pointDistance(p,b):Math.abs(Math.asin(Math.max(-1,Math.min(1,Math.sin(d)*Math.sin(angle))))*R);
  }
  function distanceToGeometry(g,lat,lon){
    if(!g)return Infinity;const p=[lon,lat],line=c=>c.length===1?pointDistance(p,c[0]):Math.min(...c.slice(1).map((b,i)=>segmentDistance(p,c[i],b)));
    switch(g.type){
      case 'Point':return pointDistance(p,g.coordinates);
      case 'MultiPoint':return Math.min(...g.coordinates.map(q=>pointDistance(p,q)));
      case 'LineString':return line(g.coordinates);
      case 'MultiLineString':return Math.min(...g.coordinates.map(line));
      case 'Polygon':return inRing(p,g.coordinates[0])&&!g.coordinates.slice(1).some(r=>inRing(p,r))?0:Math.min(...g.coordinates.map(line));
      case 'MultiPolygon':return Math.min(...g.coordinates.map(c=>distanceToGeometry({type:'Polygon',coordinates:c},lat,lon)));
      case 'GeometryCollection':return Math.min(...g.geometries.map(c=>distanceToGeometry(c,lat,lon)));
      default:return Infinity;
    }
  }
  function selectedGeometry(){
    if(!box)return null;
    if(!facilitySelection){const b=box;return {type:'Polygon',coordinates:[[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]],[b[0],b[1]]]]}}
    const {facility:f,radius_km}=facilitySelection,p=f.lat*rad,l=f.lon*rad,d=radius_km*1000/R,ring=[];
    for(let i=0;i<=128;i++){const angle=i/128*2*Math.PI,q=Math.asin(Math.sin(p)*Math.cos(d)+Math.cos(p)*Math.sin(d)*Math.cos(angle)),lon=l+Math.atan2(Math.sin(angle)*Math.sin(d)*Math.cos(p),Math.cos(d)-Math.sin(p)*Math.sin(q));ring.push([lon/rad,q/rad])}
    ring[ring.length-1]=ring[0].slice();return {type:'Polygon',coordinates:[ring]};
  }
  function contains(lat,lon){if(!box)return true;return facilitySelection?pointDistance([lon,lat],[facilitySelection.facility.lon,facilitySelection.facility.lat])<=facilitySelection.radius_km*1000+1e-6:inside([lon,lat],box)}
  function intersectsFeature(f){
    if(!box)return true;if(!facilitySelection)return geometryIntersectsBox(f.geometry,box);
    if(f.properties?.power==='minor_line'&&!facilitySelection.include_local_lines)return false;
    return distanceToGeometry(f.geometry,facilitySelection.facility.lat,facilitySelection.facility.lon)<=facilitySelection.radius_km*1000+1e-6;
  }
  function sortNearby(features){if(!facilitySelection)return features;const c=facilitySelection.facility;return features.map(f=>({f,d:distanceToGeometry(f.geometry,c.lat,c.lon)})).sort((a,b)=>a.d-b.d||String(a.f.id).localeCompare(String(b.f.id))).map(x=>x.f)}
  function counts(features){const result={line:0,minor_line:0,tower:0,pole:0,substation:0};for(const f of features)if(f.properties.power in result)result[f.properties.power]++;return result}
  function report(){return box?{bbox:box.slice(),...dimensions(box),shape:facilitySelection?'circle':'rectangle',...(facilitySelection?{...facilitySelection,area_km2:2*Math.PI*R*R*(1-Math.cos(facilitySelection.radius_km*1000/R))/1e6}:{}),selection_rule:facilitySelection?'Source features within geodesic radius of reference point; full geometries retained. Spatial proximity does not establish an electrical connection. Source lengths refer to original dataset AOI.':'Features intersecting the rectangle; full source geometries retained. Source lengths refer to original dataset AOI.',imagery_note:'Study area does not create new historical imagery or displacement measurements.'}:null}
  function install(map,config){
    const el=id=>document.getElementById(id),fmt=(v,n=1)=>v.toLocaleString('pl-PL',{maximumFractionDigits:n});
    const panelButtons=document.querySelector('.panel-buttons'),open=document.createElement('button');
    open.type='button';open.id='studyAreaButton';open.textContent='Obszar';open.setAttribute('aria-haspopup','dialog');panelButtons.prepend(open);
    const dialog=document.createElement('dialog');dialog.id='studyAreaDialog';dialog.setAttribute('aria-labelledby','studyAreaTitle');
    dialog.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">Zasięg monitoringu</span><h2 id="studyAreaTitle">Obszar badania</h2></div><button type="button" class="close-dialog" id="closeStudyArea" aria-label="Zamknij">×</button></div>
      <form id="studyAreaForm" class="dialog-body"><p>Wskaż lokalizację i rozmiar prostokąta. Wybór filtruje wczytany GIS oraz dostępne punkty analizy.</p>
      <label for="areaLocationPreset">Lokalizacja</label><select id="areaLocationPreset"><option value="custom">Własne współrzędne</option><option value="current">Bieżący środek mapy</option><option value="source">Obszar danych: ${config.name}</option><option value="52.2297,21.0122">Warszawa</option><option value="54.352,18.6466">Gdańsk</option><option value="51.1079,17.0385">Wrocław</option><option value="51.65,21.46">Kozienice</option><option value="50.25,18.54">Śląsk</option></select>
      <div class="study-area-fields"><label>Szerokość geogr. (°N)<input id="areaLat" type="number" min="49" max="55" step="0.00001" required></label><label>Długość geogr. (°E)<input id="areaLon" type="number" min="14" max="24.5" step="0.00001" required></label><label>Szerokość obszaru (km)<input id="areaWidth" type="number" min="0.1" max="100" step="0.1" required value="20"></label><label>Wysokość obszaru (km)<input id="areaHeight" type="number" min="0.1" max="100" step="0.1" required value="10"></label></div>
      <div class="study-area-presets" aria-label="Szybki wybór rozmiaru"><button type="button" data-area-size="1,1">1 × 1 km</button><button type="button" data-area-size="10,10">10 × 10 km</button><button type="button" data-area-size="25,10">25 × 10 km</button><button type="button" data-area-size="50,20">50 × 20 km</button></div>
      <p id="areaDraftSummary" class="study-area-draft"></p><p id="areaFormError" role="alert"></p>
      <div class="study-area-actions"><button type="submit" id="applyStudyArea">Zastosuj obszar</button><button type="button" id="pickAreaCenter">Wskaż środek na mapie</button><button type="button" id="drawStudyArea">Wskaż dwa narożniki</button><button type="button" id="useVisibleArea">Użyj widocznego kadru</button><button type="button" id="clearStudyArea">Wyłącz wybór</button><button type="button" id="exportStudyArea">Pobierz obszar · GeoJSON</button></div>
      <p class="note">Archiwum Sentinel-2 i GIS obejmuje przygotowane obszary Śląska i Kozienic. W nowej lokalizacji można przeglądać usługę lotniczą GUGiK; nie powstaje automatycznie nowa analiza ani historia satelitarna. Geometrie wybranych obiektów są zachowane w całości.</p></form>`;
    document.body.append(dialog);
    const bar=document.createElement('div');bar.className='study-area-bar';bar.id='studyAreaBar';bar.hidden=true;
    bar.innerHTML='<div><strong id="studyAreaSummary"></strong><p id="studyAreaCoverage"></p></div><div class="study-area-actions"><button type="button" id="editStudyArea">Zmień obszar</button><button type="button" id="fitStudyArea">Pokaż</button><button type="button" id="removeStudyArea" aria-label="Wyłącz wybór obszaru">×</button></div>';
    const column=document.querySelector('.map-column');column.insertBefore(bar,column.querySelector('.timeline'));
    const instruction=document.createElement('div');instruction.className='study-area-instruction';instruction.hidden=true;instruction.innerHTML='<span id="areaPickMessage"></span><button type="button" id="cancelAreaPick">Anuluj</button>';map.getContainer().parentElement.append(instruction);
    map.createPane('studyArea');map.getPane('studyArea').style.zIndex=390;
    const outline=L.rectangle([[0,0],[0,0]],{pane:'studyArea',color:'#88f0d3',weight:2,dashArray:'7 5',fillColor:'#66d5b4',fillOpacity:.04,interactive:false});
    const radiusOutline=L.circle([0,0],{pane:'studyArea',color:'#88f0d3',weight:2,dashArray:'7 5',fillOpacity:.04,interactive:false});
    function drawOutline(){if(facilitySelection){map.removeLayer(outline);radiusOutline.setLatLng([facilitySelection.facility.lat,facilitySelection.facility.lon]).setRadius(facilitySelection.radius_km*1000).addTo(map)}else {map.removeLayer(radiusOutline);if(box)outline.setBounds(leafletBounds(box)).addTo(map);else map.removeLayer(outline)}}
    let picking=null,anchor=null,draggingWasEnabled=false,doubleWasEnabled=false;
    const leafletBounds=b=>L.latLngBounds([[b[1],b[0]],[b[3],b[2]]]);
    const fromLeaflet=b=>[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];
    function read(){return boxFromDimensions(Number(el('areaLat').value),Number(el('areaLon').value),Number(el('areaWidth').value),Number(el('areaHeight').value))}
    function draft(){try{const d=dimensions(read());el('areaDraftSummary').textContent=`${fmt(d.width_km)} × ${fmt(d.height_km)} km · około ${fmt(d.area_km2,2)} km²`;el('areaFormError').textContent=''}catch(error){el('areaDraftSummary').textContent='';el('areaFormError').textContent=error.message}}
    function fill(b){const d=dimensions(b);el('areaLat').value=d.lat.toFixed(5);el('areaLon').value=d.lon.toFixed(5);el('areaWidth').value=d.width_km.toFixed(1);el('areaHeight').value=d.height_km.toFixed(1);draft()}
    function show(){const c=map.getCenter();fill(box||boxFromDimensions(Math.min(55,Math.max(49,c.lat)),Math.min(24.5,Math.max(14,c.lng)),20,10));el('exportStudyArea').disabled=!box;el('areaLocationPreset').value='custom';dialog.showModal()}
    function refresh(){
      bar.hidden=!box;document.body.classList.toggle('iw-has-study-area',!!box);el('exportStudyArea').disabled=!box;if(!box)return;
      const d=dimensions(box),s2=coverage(box,config.imageryBox),gis=coverage(box,config.gisBox),stats=config.stats?.();
      el('studyAreaSummary').textContent=facilitySelection?`${facilitySelection.facility.name} · promień ${fmt(facilitySelection.radius_km)} km`:`Obszar: ${fmt(d.width_km)} × ${fmt(d.height_km)} km · ${fmt(d.area_km2,2)} km² · ${d.lat.toFixed(4)}°N, ${d.lon.toFixed(4)}°E`;
      el('editStudyArea').textContent=facilitySelection?'Zmień obiekt':'Zmień obszar';
      const s2Text=s2==='full'?'Sentinel-2: w zasięgu archiwum':s2==='partial'?'Sentinel-2: archiwum obejmuje część obszaru':'Sentinel-2: brak archiwum dla tego obszaru';
      el('studyAreaCoverage').textContent=(facilitySelection&&stats?.lines!==undefined?`Pobliskie linie: ${stats.lines} · `:'')+s2Text+' · '+(gis==='none'?'GIS: poza przygotowanym zbiorem':`${gis==='partial'?'GIS: częściowe pokrycie':'Wczytany GIS'} · ${stats?.total??'…'} obiektów przecina wybór`)+'. Lotnicze: usługa GUGiK online.';
      bar.classList.toggle('coverage-warning',s2!=='full'||gis!=='full');
      config.setAvailability?.({sentinel:s2,sar:config.sarBox?coverage(box,config.sarBox):'none'});
    }
    function stopPick(){
      picking=null;anchor=null;instruction.hidden=true;document.body.classList.remove('iw-picking-area');
      if(draggingWasEnabled)map.dragging.enable();if(doubleWasEnabled)map.doubleClickZoom.enable();
      drawOutline();
    }
    function apply(b,navigate=true,selection=null){
      const d=dimensions(b);boxFromDimensions(d.lat,d.lon,Number(d.width_km.toFixed(8)),Number(d.height_km.toFixed(8)));facilitySelection=selection;box=b.slice();stopPick();
      config.showMap();config.onChange(box);refresh();
      config.onNavigate?.(coverage(box,config.imageryBox));
      drawOutline();dialog.close();document.dispatchEvent(new CustomEvent('iw:study-area-change'));
      requestAnimationFrame(()=>{map.invalidateSize({pan:false});if(navigate&&box)map.fitBounds(leafletBounds(b),{padding:[25,25],maxZoom:18,animate:false})});
    }
    function clear(){box=null;facilitySelection=null;stopPick();config.onChange(null);config.setAvailability?.({sentinel:'full',sar:'full'});refresh();dialog.close();document.dispatchEvent(new CustomEvent('iw:study-area-change'));requestAnimationFrame(()=>map.invalidateSize({pan:false}))}
    function startPick(mode){
      try{read()}catch(error){el('areaFormError').textContent=error.message;return}
      config.showMap();InfraWatchUI.closePanels();dialog.close();picking=mode;anchor=null;instruction.hidden=false;document.body.classList.add('iw-picking-area');
      el('areaPickMessage').textContent=mode==='center'?'Wskaż środek badanego obszaru.':'Wskaż pierwszy narożnik prostokąta.';
      draggingWasEnabled=map.dragging.enabled();doubleWasEnabled=map.doubleClickZoom.enabled();map.dragging.disable();map.doubleClickZoom.disable();
    }
    map.getContainer().addEventListener('click',event=>{
      if(!picking||event.target.closest('.leaflet-control'))return;
      event.preventDefault();event.stopImmediatePropagation();const p=map.mouseEventToLatLng(event);
      try{
        if(picking==='center'){el('areaLat').value=p.lat.toFixed(5);el('areaLon').value=p.lng.toFixed(5);apply(read(),false)}
        else if(!anchor){anchor=p;el('areaPickMessage').textContent='Wskaż przeciwległy narożnik prostokąta.'}
        else apply(fromLeaflet(L.latLngBounds(anchor,p)),false);
      }catch(error){el('areaPickMessage').textContent=error.message+' Wskaż obszar ponownie.'}
    },true);
    map.on('mousemove',event=>{if(picking==='corners'&&anchor)outline.setBounds(L.latLngBounds(anchor,event.latlng)).addTo(map)});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&picking)stopPick()});
    open.onclick=show;el('editStudyArea').onclick=()=>facilitySelection?el('facilityPickerButton').click():show();el('closeStudyArea').onclick=()=>dialog.close();el('cancelAreaPick').onclick=stopPick;
    el('studyAreaForm').onsubmit=event=>{event.preventDefault();try{apply(read())}catch(error){el('areaFormError').textContent=error.message}};
    el('pickAreaCenter').onclick=()=>startPick('center');el('drawStudyArea').onclick=()=>startPick('corners');
    el('useVisibleArea').onclick=()=>{try{apply(fromLeaflet(map.getBounds()),false)}catch(error){el('areaFormError').textContent=error.message}};
    el('clearStudyArea').onclick=clear;el('removeStudyArea').onclick=clear;el('fitStudyArea').onclick=()=>{config.onNavigate?.(coverage(box,config.imageryBox));map.fitBounds(leafletBounds(box),{padding:[25,25],maxZoom:18})};
    for(const id of ['areaLat','areaLon','areaWidth','areaHeight'])el(id).oninput=draft;
    dialog.querySelectorAll('[data-area-size]').forEach(b=>b.onclick=()=>{const [w,h]=b.dataset.areaSize.split(',');el('areaWidth').value=w;el('areaHeight').value=h;draft()});
    el('areaLocationPreset').onchange=event=>{let lat,lon;const value=event.target.value;if(value==='custom')return;if(value==='current'){const c=map.getCenter();lat=c.lat;lon=c.lng}else if(value==='source'){lat=(config.gisBox[1]+config.gisBox[3])/2;lon=(config.gisBox[0]+config.gisBox[2])/2}else [lat,lon]=value.split(',').map(Number);el('areaLat').value=lat.toFixed(5);el('areaLon').value=lon.toFixed(5);draft()};
    el('exportStudyArea').onclick=()=>{
      if(!box)return;const r=report(),fc={type:'FeatureCollection',name:'InfraWatch — wybrany obszar badania',features:[{type:'Feature',properties:r,geometry:selectedGeometry()}]};
      const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(fc,null,2)],{type:'application/geo+json'}));a.href=url;a.download='InfraWatch_obszar_badania.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    ui={refresh,clear,focus:()=>el('fitStudyArea').click(),setFacility:(facility,radius,includeLocal)=>{if(!Number.isFinite(radius)||radius<1||radius>30)throw Error('Wybierz promień od 1 do 30 km.');apply(boxFromDimensions(facility.lat,facility.lon,2*radius,2*radius),true,{facility,radius_km:radius,include_local_lines:includeLocal})}};return ui;
  }
  return {install,geometryIntersectsBox,boxFromDimensions,dimensions,coverage,pointDistance,distanceToGeometry,selectedGeometry,sortNearby,countByPower:counts,getReport:report,getBox:()=>box?.slice()||null,contains,intersectsFeature,refresh:()=>ui?.refresh(),clear:()=>ui?.clear(),focus:()=>ui?.focus(),setFacility:(f,r,local=true)=>ui?.setFacility(f,r,local)};
})();
