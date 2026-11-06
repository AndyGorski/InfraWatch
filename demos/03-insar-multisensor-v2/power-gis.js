/* Attributed regional OSM snapshot, independent of imagery and modelled InSAR. */
function createInfraWatchPowerGIS(map, byId, options) {
  let data,meta,focusLine,focusTowers,focusInfra,selectedFeature;
  const features=new Map(),focusNodes=new Set(),corridor=L.layerGroup();
  map.createPane('networkGIS');map.getPane('networkGIS').style.zIndex=380;
  map.createPane('networkSupports');map.getPane('networkSupports').style.zIndex=420;
  const renderer=L.canvas({pane:'networkGIS',padding:.2}),supportsRenderer=L.canvas({pane:'networkSupports',padding:.2});
  const groups={lines:L.layerGroup(),minor:L.layerGroup(),supports:L.layerGroup(),stations:L.layerGroup(),selection:L.layerGroup()};
  const controls=[['showGISLines','lines'],['showGISMinor','minor'],['showGISSupports','supports'],['showGISStations','stations']];
  const voltage=p=>(p.voltage||'').split(';').map(Number).filter(v=>Number.isFinite(v)&&v>0);
  const color=p=>{const v=Math.max(0,...voltage(p));return v>=300000?'#c69aee':v>=200000?'#ef9c73':v>=100000?'#e0cf7b':v>0?'#91bb7d':'#a2b2a3'};
  const voltageLabel=p=>voltage(p).length?voltage(p).map(v=>(v/1000).toLocaleString('pl-PL')+' kV').join(' / '):'Brak w OSM';
  const kind=p=>p.kind==='line'?(p.power==='minor_line'?'Sieć lokalna':'Linia napowietrzna'):p.kind==='support'?(p.power==='tower'?'Słup kratowy / wieża':'Słup'):'Stacja elektroenergetyczna';
  const name=f=>f.properties.name||f.properties.ref||kind(f.properties)+' · OSM '+f.properties.osm_id;
  const date=value=>value?new Date(value).toLocaleString('pl-PL'):'Brak w OSM';
  const style=f=>({color:color(f.properties),weight:f.id===selectedFeature?.id?3.5:1.8,opacity:f.id===selectedFeature?.id?1:.75});
  function renderSearch(){
    const root=byId('gisResults');root.replaceChildren();if(!data)return;
    const q=byId('gisSearch').value.trim().toLocaleLowerCase('pl');
    let matches=q?data.features.filter(f=>(name(f)+' '+f.id+' '+(f.properties.voltage||'')).toLocaleLowerCase('pl').includes(q)):data.features.filter(f=>f.properties.power==='line').sort((a,b)=>b.properties.length_km_in_aoi-a.properties.length_km_in_aoi);
    const note=document.createElement('p');note.textContent=q?'Dopasowania: '+matches.length.toLocaleString('pl-PL')+' · maks. 8 na liście':'Najdłuższe odcinki w obszarze';root.append(note);
    for(const f of matches.slice(0,8)){const b=document.createElement('button'),small=document.createElement('small');b.type='button';b.className='gis-result';b.dataset.osmId=f.id;b.textContent=name(f);small.textContent=f.id+' · '+voltageLabel(f.properties);b.append(small);b.onclick=()=>{select(f);map.fitBounds(L.geoJSON(f).getBounds().pad(.15),{maxZoom:17})};root.append(b)}
  }
  function bind(f,layer){layer.bindTooltip(()=>{const e=document.createElement('span');e.textContent=name(f);return e},{sticky:true});layer.on('click',()=>select(f))}
  function clearSelection(){selectedFeature=null;groups.selection.clearLayers();byId('gisDetails').hidden=true;byId('analysisDetails').hidden=false;byId('regionalAsset').hidden=true;byId('assetView').querySelector('.assetPanel').hidden=false;for(const key of ['lines','minor'])groups[key].eachLayer(g=>g.setStyle(style))}
  function select(f){
    selectedFeature=f;groups.selection.clearLayers();for(const key of ['lines','minor'])groups[key].eachLayer(g=>g.setStyle(style));
    L.geoJSON(f,{pane:'networkSupports',style:{color:'#9af1dd',weight:3,fillOpacity:.12},pointToLayer:(_,ll)=>L.circleMarker(ll,{radius:9,color:'#9af1dd',weight:3,fillOpacity:.1,pane:'networkSupports'})}).addTo(groups.selection);
    const root=byId('gisAttributes');root.replaceChildren();const p=f.properties;
    byId('gisObjectTitle').textContent=name(f);
    const fields=[['Rodzaj',kind(p)],['Identyfikator',f.id],['Napięcie wg OSM',voltageLabel(p)],['Operator wg OSM',p.operator||'Brak w OSM'],['Numer / ref',p.ref||'Brak w OSM'],['Ostatnia edycja OSM',date(p.osm_last_edit)],['Snapshot bazy',date(meta.snapshot)]];
    if(p.kind==='line')fields.push(['Długość w obszarze',p.length_km_in_aoi.toLocaleString('pl-PL')+' km']);
    for(const [label,value] of fields){const row=document.createElement('div'),small=document.createElement('small'),strong=document.createElement('strong');small.textContent=label;strong.textContent=value;row.append(small,strong);root.append(row)}
    byId('regionalAssetTitle').textContent=name(f);byId('regionalAssetAttributes').replaceChildren(...Array.from(root.children,n=>n.cloneNode(true)));
    byId('regionalAssetSourceLink').href=p.source_url;byId('regionalAsset').hidden=false;byId('assetView').querySelector('.assetPanel').hidden=true;
    byId('regionalAssetFit').onclick=()=>{options.showMap();map.fitBounds(L.geoJSON(f).getBounds().pad(.15),{maxZoom:17})};
    byId('gisSourceLink').href=p.source_url;byId('gisDetails').hidden=false;byId('analysisDetails').hidden=true;
    byId('gisObjectFit').onclick=()=>map.fitBounds(L.geoJSON(f).getBounds().pad(.15),{maxZoom:17});
    options.onSelect();
  }
  function renderSupports(){
    groups.supports.clearLayers();if(!data||!byId('showGISSupports').checked||map.getZoom()<13)return;
    const bounds=map.getBounds().pad(.1);
    for(const f of data.features){const p=f.properties;if(p.kind!=='support'||(p.power==='pole'&&map.getZoom()<16)||(byId('showFocusGIS').checked&&focusNodes.has(p.osm_id)))continue;
      const ll=L.latLng(f.geometry.coordinates[1],f.geometry.coordinates[0]);if(!bounds.contains(ll))continue;
      const layer=L.circleMarker(ll,{renderer:supportsRenderer,pane:'networkSupports',radius:p.power==='tower'?3.5:2.5,color:'#f3e3ba',weight:1.3,fillColor:'#726846',fillOpacity:.95});bind(f,layer);layer.addTo(groups.supports);
    }
  }
  function sync(){
    for(const [id,key] of controls)byId(id).checked?groups[key].addTo(map):map.removeLayer(groups[key]);
    for(const layer of [focusLine,focusTowers])if(layer)byId('showFocusGIS').checked?layer.addTo(map):map.removeLayer(layer);
    byId('showCorridor').checked?corridor.addTo(map):map.removeLayer(corridor);
    if(selectedFeature){const p=selectedFeature.properties,id=p.kind==='line'?(p.power==='minor_line'?'showGISMinor':'showGISLines'):p.kind==='support'?'showGISSupports':'showGISStations';if(!byId(id).checked)clearSelection()}
    renderSupports();
  }
  for(const [id] of controls)byId(id).onchange=sync;
  byId('showFocusGIS').onchange=sync;byId('showCorridor').onchange=sync;
  byId('gisSearch').oninput=renderSearch;
  byId('gisBackToAnalysis').onclick=clearSelection;
  byId('fitGIS').onclick=()=>{if(meta){const b=meta.aoi_bbox;map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{padding:[15,15],maxZoom:11})}};
  byId('exportGIS').onclick=()=>{if(!data)return;const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({...data,metadata:meta})],{type:'application/geo+json'}));a.href=url;a.download='InfraWatch_Kozienice_GIS_OSM.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  map.on('moveend zoomend',renderSupports);groups.selection.addTo(map);sync();
  async function load(){
    try{
      const responses=await Promise.all([fetch('assets/real-power.geojson'),fetch('assets/real-power-metadata.json')]);if(responses.some(r=>!r.ok))throw Error('Brak zbioru GIS');
      [data,meta]=await Promise.all(responses.map(r=>r.json()));if(data.type!=='FeatureCollection'||!data.features.length)throw Error('Niepoprawny zbiór GIS');
      data.features.forEach(f=>features.set(f.id,f));
      for(const [key,power] of [['lines','line'],['minor','minor_line']])L.geoJSON(data,{pane:'networkGIS',renderer,filter:f=>f.properties.power===power,style,onEachFeature:bind}).addTo(groups[key]);
      L.geoJSON(data,{pane:'networkGIS',renderer,filter:f=>f.properties.kind==='substation',style:{color:'#89cdd1',weight:1.4,fillColor:'#89cdd1',fillOpacity:.18},pointToLayer:(_,ll)=>L.circleMarker(ll,{radius:4,color:'#b6eef1',fillColor:'#3b8f96',weight:1.3,fillOpacity:.8,renderer,pane:'networkGIS'}),onEachFeature:bind}).addTo(groups.stations);
      const c=meta.counts,fmt=n=>Number(n||0).toLocaleString('pl-PL');
      for(const [id,value] of [['gisLineCount',c.line],['gisMinorCount',c.minor_line],['gisSupportCount',(c.tower||0)+(c.pole||0)],['gisStationCount',c.substation]])byId(id).textContent=fmt(value);
      byId('gisSnapshot').textContent='OSM · snapshot '+date(meta.snapshot);
      byId('gisDataStatus').textContent='Rzeczywiste geometrie · kliknij obiekt na mapie. Podpory pojawiają się po zbliżeniu, lokalne słupy po dalszym powiększeniu.';
      byId('gisSourceSummary').textContent=`Regionalny GIS: ${fmt(c.line)} odcinków power=line, ${fmt(c.minor_line)} power=minor_line, ${fmt(c.tower)} tower, ${fmt(c.pole)} pole, ${fmt(c.substation)} stacji. Snapshot bazy: ${date(meta.snapshot)}. Obszar: ${meta.aoi_bbox.join(', ')}. Linie przycięto do obszaru. Pominięte geometrie: ${JSON.stringify(meta.excluded)}. Publiczne dane OpenStreetMap / ODbL 1.0, niepotwierdzone przez operatora. Edycja OSM nie jest datą pomiaru. Regionalne obiekty nie mają przypisanych pomiarów InSAR. Odrębna warstwa F401 zachowuje snapshot 26.10.2026 powiązany ze scenariuszem.`;
      byId('exportGIS').disabled=false;renderSearch();sync();
    }catch(error){console.error(error);byId('gisDataStatus').textContent='Nie udało się wczytać regionalnego GIS. Odśwież stronę; warstwa F401 pozostaje dostępna.'}
  }
  function setFocusLayers(line,towers,infra){
    focusLine=line;focusTowers=towers;focusInfra=infra;focusNodes.clear();infra.elements.forEach(n=>focusNodes.add(String(n.id)));corridor.clearLayers();
    const nodes=new Map(infra.elements.map(n=>[n.id,n])),coords=infra.way.nodes.map(id=>nodes.get(id)).filter(Boolean);
    const style={color:'#7dbad9',weight:.8,dashArray:'4 4',fillColor:'#7dbad9',fillOpacity:.12,interactive:false,pane:'networkGIS'};
    for(let i=1;i<coords.length;i++){
      const a=coords[i-1],b=coords[i],mx=111320*Math.cos((a.lat+b.lat)/2*Math.PI/180),my=111320,dx=(b.lon-a.lon)*mx,dy=(b.lat-a.lat)*my,len=Math.hypot(dx,dy);if(!len)continue;
      const nx=-dy/len*30/mx,ny=dx/len*30/my;
      L.polygon([[a.lat+ny,a.lon+nx],[b.lat+ny,b.lon+nx],[b.lat-ny,b.lon-nx],[a.lat-ny,a.lon-nx]],style).addTo(corridor);
    }
    for(const n of coords)L.circle([n.lat,n.lon],{...style,radius:30,stroke:false}).addTo(corridor);
    sync();
  }
  const ready=load();
  return {ready,setFocusLayers,clearSelection,getReport:()=>({source:meta?.source||null,snapshot:meta?.snapshot||null,license:'ODbL 1.0',aoi_bbox:meta?.aoi_bbox||null,counts:meta?.counts||null,selected_osm_feature:selectedFeature?.id||null,visible_layers:Object.fromEntries([...controls.map(([id,key])=>[key,byId(id).checked]),['focus_F401',byId('showFocusGIS').checked],['modelled_buffer_30m',byId('showCorridor').checked]]),focus_snapshot:focusInfra?.downloaded_at||null,insar_association:'Regional GIS has no assigned InSAR measurement. F401 nearby point associations are illustrative synthetic demo only.'})};
}
