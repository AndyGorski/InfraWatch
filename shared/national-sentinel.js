/* Copernicus Sentinel-2 L2A, rendered on demand by Microsoft Planetary Computer.
 * No credentials or saved/expiring search IDs are shipped with the application. */
window.InfraWatchSentinel=(()=>{
  const api='https://planetarycomputer.microsoft.com/api/data/v1';
  const bbox=[13,48.9,25,56.2],countryFocus=[14,49,24.3,55.1],years=[2020,2022,2024,2025],searches=new Map();
  const overviewRoot=new URL('national-sentinel/',document.currentScript.src).href;
  const overviewBounds=[[48.45835188280865,12.65625],[56.55948248376224,25.3125]];
  const borderMaps=new WeakSet();let borderData;
  function installBorder(map){
    if(borderMaps.has(map))return;borderMaps.add(map);
    map.createPane('polandBoundary');map.getPane('polandBoundary').style.zIndex=375;map.getPane('polandBoundary').style.pointerEvents='none';
    if(!borderData)borderData=fetch(new URL('../poland-boundary.geojson',overviewRoot)).then(response=>{if(!response.ok)throw Error('Nie udało się wczytać granicy Polski.');return response.json()}).then(data=>{if(data.type!=='FeatureCollection'||data.features?.length!==1)throw Error('Niepoprawna geometria granicy Polski.');return data});
    borderData.then(data=>{
      const common={pane:'polandBoundary',interactive:false,fill:false,smoothFactor:.6,lineJoin:'round',lineCap:'round'};
      L.geoJSON(data,{...common,style:{...common,color:'#10232c',weight:4.5,opacity:.9}}).addTo(map);
      L.geoJSON(data,{...common,style:{...common,color:'#fff3ca',weight:2,opacity:1},attribution:'Granica Polski: <a href="https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/" target="_blank" rel="noopener">GUGiK / PRG</a>'}).addTo(map);
    }).catch(error=>{console.warn(error);const warning=L.control({position:'bottomleft'});warning.onAdd=()=>{const el=document.createElement('div');el.className='iw-boundary-warning';el.textContent='Nie wczytano granicy Polski. Odśwież stronę.';el.setAttribute('role','status');return el};warning.addTo(map)});
  }
  let scope='national';try{scope=localStorage.getItem('iw-sentinel-scope-v1')==='regional'?'regional':'national'}catch(_){}
  function search(year){
    if(!years.includes(Number(year)))throw Error('Nieobsługiwany rok Sentinel-2.');
    return {collections:['sentinel-2-l2a'],bbox:bbox.slice(),datetime:`${year}-06-01T00:00:00Z/${year}-08-31T23:59:59Z`,query:{'eo:cloud_cover':{lt:10}},sortby:[{field:'eo:cloud_cover',direction:'asc'}]};
  }
  async function register(year){
    if(!searches.has(year))searches.set(year,(async()=>{
      const response=await fetch(api+'/mosaic/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(search(year)),signal:AbortSignal.timeout(25000)});
      if(!response.ok)throw Error('Usługa Sentinel-2 jest chwilowo niedostępna.');
      const result=await response.json(),id=result.searchid||result.id;
      if(!id||typeof id!=='string')throw Error('Brak identyfikatora mozaiki Sentinel-2.');
      return id;
    })().catch(error=>{searches.delete(year);throw error}));
    return searches.get(year);
  }
  function tileURL(id,year,mode,coords){
    search(year);
    const params=new URLSearchParams({collection:'sentinel-2-l2a',nodata:'0',scan_limit:'300',items_limit:'80',pixel_selection:'first'});
    if(mode==='ndvi'){
      params.set('expression','(B08-B04)/(B08+B04)');params.set('asset_as_band','true');params.set('unscale','true');params.set('rescale','-1,1');params.set('colormap_name','rdylgn');
    }else params.set('assets','visual');
    return `${api}/mosaic/${encodeURIComponent(id)}/tiles/WebMercatorQuad/${coords.z}/${coords.x}/${coords.y}.png?${params}`;
  }
  function createLayer(year,mode='rgb',options={}){
    const overview=L.imageOverlay(`${overviewRoot}${mode}-${year}.webp`,overviewBounds,{attribution:'Contains modified Copernicus Sentinel data · Microsoft Planetary Computer',...options});
    const syncOverview=function(){if(this._map){if(this._map.getZoom()<9)overview.addTo(this._map);else this._map.removeLayer(overview)}};
    const Tiles=L.TileLayer.extend({
      onAdd(map){L.TileLayer.prototype.onAdd.call(this,map);map.on('zoomend',syncOverview,this);syncOverview.call(this)},
      onRemove(map){map.off('zoomend',syncOverview,this);map.removeLayer(overview);L.TileLayer.prototype.onRemove.call(this,map)},
      setOpacity(value){overview.setOpacity(value);return L.TileLayer.prototype.setOpacity.call(this,value)},
      bringToBack(){overview.bringToBack();return L.TileLayer.prototype.bringToBack.call(this)},
      createTile(coords,done){
        const tile=document.createElement('img');tile.alt='';tile.setAttribute('role','presentation');
        let finished=false;
        const timer=setTimeout(()=>finish(Error('Przekroczono czas pobierania Sentinel-2.')),35000);
        tile.iwCancel=()=>{finished=true;clearTimeout(timer)};
        const finish=error=>{if(finished)return;finished=true;clearTimeout(timer);if(error){tile.onload=null;tile.onerror=null;tile.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#173039"/><text x="128" y="128" text-anchor="middle" font-family="Arial" font-size="13" fill="#c6d7da">Brak kafla Sentinel-2</text></svg>')}done(error,tile)};
        tile.onload=()=>finish(null);tile.onerror=()=>finish(Error('Brak kafla Sentinel-2.'));
        register(year).then(id=>{if(!tile.iwCancelled)tile.src=tileURL(id,year,mode,coords)}).catch(error=>finish(error));
        return tile;
      }
    });
    const layer=new Tiles('',{minZoom:9,maxZoom:19,maxNativeZoom:14,noWrap:true,bounds:[[bbox[1],bbox[0]],[bbox[3],bbox[2]]],keepBuffer:1,updateWhenIdle:true,attribution:'Contains modified Copernicus Sentinel data · Microsoft Planetary Computer',...options});
    layer.iwStatus={loading:0,loaded:0,errors:0};
    const tiles=new Map(),key=c=>`${c.z}/${c.x}/${c.y}`;
    function refresh(){layer.iwStatus={loading:0,loaded:0,errors:0};for(const value of tiles.values())layer.iwStatus[value]++;layer.fire('iw:status')}
    layer.on('tileloadstart',e=>{tiles.set(key(e.coords),'loading');refresh()});
    layer.on('tileload',e=>{tiles.set(key(e.coords),'loaded');refresh()});
    layer.on('tileerror',e=>{tiles.set(key(e.coords),'errors');refresh()});
    layer.on('tileunload',e=>{e.tile.iwCancelled=true;e.tile.iwCancel?.();e.tile.onload=null;e.tile.onerror=null;e.tile.removeAttribute('src');tiles.delete(key(e.coords));refresh()});
    overview.on('load',()=>{layer.iwOverviewError=false;layer.fire('iw:status')});overview.on('error',()=>{layer.iwOverviewError=true;layer.fire('iw:status')});
    return layer;
  }
  const national=()=>scope==='national';
  function createAerialLayer(year=2025,options={}){
    const pane=options.pane||'tilePane';
    let fallback=createLayer(year,'rgb',{pane,zIndex:0}),layer;
    const forward=()=>layer.fire('iw:fallback-status');
    fallback.on('iw:status',forward);
    const Aerial=L.TileLayer.WMS.extend({
      onAdd(map){fallback.addTo(map);L.TileLayer.WMS.prototype.onAdd.call(this,map)},
      onRemove(map){map.removeLayer(fallback);L.TileLayer.WMS.prototype.onRemove.call(this,map)},
      setOpacity(value){fallback.setOpacity(value);return L.TileLayer.WMS.prototype.setOpacity.call(this,value)},
      bringToBack(){fallback.bringToBack();L.TileLayer.WMS.prototype.bringToBack.call(this);this.setZIndex(1);return this},
      setYear(value){
        if(!years.includes(Number(value)))throw Error('Nieobsługiwany rok uzupełnienia Sentinel-2.');
        if(Number(value)===year)return this;
        const map=this._map;if(map)map.removeLayer(fallback);year=Number(value);
        fallback=createLayer(year,'rgb',{pane,zIndex:0,opacity:this.options.opacity});fallback.on('iw:status',forward);if(map)fallback.addTo(map);return this;
      },
      getFallbackStatus(){return fallback.iwStatus},
      redraw(){fallback.redraw();return L.TileLayer.WMS.prototype.redraw.call(this)}
    });
    layer=new Aerial('https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution',{
      layers:'Raster',format:'image/png',transparent:true,version:'1.1.1',minZoom:5,maxZoom:19,maxNativeZoom:19,tileSize:256,keepBuffer:2,updateWhenIdle:true,
      errorTileUrl:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"></svg>'),
      attribution:'© GUGiK / Geoportal · zdjęcia lotnicze; morze i braki: Sentinel-2',...options,zIndex:1
    });
    return layer;
  }
  function decorateLegend(node){if(!node||node.dataset.sentinelLegend===scope)return;if(!node.iwRegionalHTML)node.iwRegionalHTML=node.innerHTML;node.innerHTML=national()?'NDVI −1<i style="background:linear-gradient(90deg,#a50026,#ffffbf,#006837)"></i>1':node.iwRegionalHTML;node.dataset.sentinelLegend=scope}
  function report(year){return {provider:'Copernicus Sentinel-2 L2A / Microsoft Planetary Computer',scope:scope,bbox:bbox.slice(),period:search(year).datetime,selection:'First available scene, sorted by whole-scene cloud cover <10%, June-August. Different pixels can have different acquisition dates; not a single-day image.',ndvi:'(B08-B04)/(B08+B04), internal scale/offset applied. No SCL pixel cloud mask in the online layer. Residual clouds and seams may remain; not an alert or clearance measurement.',resolution:'B04/B08 source 10 m; display depends on zoom',gis_scope_unchanged:true}}
  function status(layer){const s=layer?.iwStatus;if(layer?.iwOverviewError)return 'Nie udało się wczytać podglądu Sentinel-2. Spróbuj ponownie.';if(!s)return 'Sentinel-2 · mozaika z czerwca–sierpnia.';return s.errors?'Nie pobrano części kafli Sentinel-2. Użyj „Ponów kafle”; braki są oznaczone.':s.loading?'Wczytywanie kafli Sentinel-2 dla widocznego obszaru…':'Sentinel-2 · mozaika letnia. Możliwe chmury i różne daty zdjęć.'}
  function install({container,map,onChange}){
    installBorder(map);
    const root=document.createElement('div');root.className='national-sentinel-control';
    root.innerHTML='<label for="sentinelScope">Zasięg Sentinel-2</label><select id="sentinelScope"><option value="national">Cała Polska · mozaika letnia</option><option value="regional">Archiwum regionalne · konkretne daty</option></select><div><button type="button" id="sentinelPoland">Pokaż Polskę</button><button type="button" id="sentinelRetry">Ponów kafle</button></div><p>2020 · 2022 · 2024 · 2025. Mozaiki krajowe: czerwiec–sierpień, różne daty zdjęć.</p>';
    container.prepend(root);const select=root.querySelector('select');select.value=scope;
    const change=extent=>{scope=select.value;try{localStorage.setItem('iw-sentinel-scope-v1',scope)}catch(_){}onChange(extent);document.dispatchEvent(new CustomEvent('iw:sentinel-scope-change'));if(extent){map.setMinZoom(5);map.fitBounds([[countryFocus[1],countryFocus[0]],[countryFocus[3],countryFocus[2]]],{padding:[15,15],animate:false})}};
    select.onchange=()=>change(false);root.querySelector('#sentinelPoland').onclick=()=>{select.value='national';change(true)};root.querySelector('#sentinelRetry').onclick=()=>{searches.clear();onChange(false)};
    return root;
  }
  function sourceHTML(){return '<h3>Zdjęcia lotnicze i Bałtyk</h3><p>GUGiK WMS StandardResolution: przezroczyste kafle PNG. Tam, gdzie usługa nie ma zdjęć lotniczych (w tym nad morzem), widoczna jest mozaika Sentinel-2 z czerwca–sierpnia wybranego roku. Są to zdjęcia satelitarne o innej rozdzielczości i dacie niż naloty GUGiK. Zasięg Sentinel rozszerzono na północ do 56,2°N, a podgląd sięga około 56,56°N.</p><h3>Granica Polski</h3><p>GUGiK / Państwowy Rejestr Granic, warstwa A00_Granice_panstwa, pobrano 14.11.2026. Obrys obejmuje także polskie morze terytorialne. Geometrię uproszczono do celów wizualizacji (około 25 m); nie zastępuje dokumentacji geodezyjnej.</p><h3>Sentinel-2 · cała Polska</h3><p>Copernicus Sentinel-2 L2A / Microsoft Planetary Computer. Kafle online dla Polski; lata 2020, 2022, 2024 i 2025. Każdy rok to mozaika z okresu 1 czerwca–31 sierpnia, z preferencją scen o zachmurzeniu poniżej 10%. Poszczególne piksele mogą pochodzić z różnych dni. Nie jest to jedno zdjęcie całego kraju.</p><p>NDVI: (B08 − B04) / (B08 + B04), ze skalą i offsetem pasm. Warstwa online nie stosuje maski chmur SCL na poziomie pikseli; możliwe chmury, szwy i braki danych. Służy kontekstowi, nie pomiarowi prześwitu ani ocenie bezpieczeństwa. Regionalne próbki i analizy pozostają odrębnymi danymi.</p><p><a href="https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a" target="_blank" rel="noopener">Katalog i warunki dostępu Sentinel-2 ↗</a> · <a href="https://planetarycomputer.microsoft.com/api/data/v1/docs" target="_blank" rel="noopener">Dokumentacja usługi kafli ↗</a></p>'}
  return {bbox,years,search,register,tileURL,createLayer,createAerialLayer,national,decorateLegend,report,status,install,sourceHTML};
})();
