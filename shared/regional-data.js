/* Reuse attributed datasets at their actual coordinates across the three panels. */
window.InfraWatchData=(()=>{
  const root=new URL('../',document.currentScript.src),cache=new Map(),seeded=new Map();
  const regions={silesia:{name:'Śląsk',folder:'05-electricity-vegetation',history:'scenes.json'},kozienice:{name:'Kozienice',folder:'03-insar-multisensor-v2',history:'imagery-history.json'}};
  const url=path=>new URL(path,root).href;
  function seed(region,gis,meta){seeded.set(region,{gis,meta})}
  async function json(path){const response=await fetch(path);if(!response.ok)throw Error('Nie udało się pobrać danych regionu.');return response.json()}
  function load(region){
    if(!regions[region])return Promise.reject(Error('Nieznany region.'));
    if(!cache.has(region))cache.set(region,(async()=>{
      const r=regions[region],base=url(`demos/${r.folder}/assets/`),seed=seeded.get(region);
      const [gis,meta,history]=await Promise.all([seed?.gis||json(base+'real-power.geojson'),seed?.meta||json(base+'real-power-metadata.json'),json(base+r.history)]);
      if(gis.type!=='FeatureCollection'||!gis.features.length||history.scenes.length!==4)throw Error('Niepoprawny zbiór regionalny.');
      const imagery={...history,scenes:history.scenes.map(s=>({...s,cloud:s.cloud??s.cloud_scene_percent,rgbURL:new URL(s.rgb||`sentinel-${s.year}.jpg`,base).href,ndviURL:new URL(s.ndvi||`ndvi-${s.year}.png`,base).href}))};
      return {region,name:r.name,gis,meta,imagery};
    })().catch(error=>{cache.delete(region);throw error}));
    return cache.get(region);
  }
  function coverage(f,radius,mode){
    const box=InfraWatchArea.boxFromDimensions(f.lat,f.lon,2*radius,2*radius),extent=[21.32,51.57,21.61,51.73];
    if(mode==='flood'){const g={type:'Polygon',coordinates:[[[extent[0],extent[1]],[extent[2],extent[1]],[extent[2],extent[3]],[extent[0],extent[3]],[extent[0],extent[1]]]]};return InfraWatchArea.distanceToGeometry(g,f.lat,f.lon)>radius*1000?'Zalanie: brak przygotowanego modelu · GIS i obrazy dostępne':InfraWatchArea.coverage(box,extent)==='full'?'Zalanie: w zasięgu modelu demonstracyjnego':'Zalanie: model obejmuje część otoczenia'}
    return mode==='deformation'?'Deformacje: GIS i historia obrazów · rzeczywiste InSAR wymaga importu':'Roślinność: GIS i historia Sentinel-2 / NDVI';
  }
  return {root,url,regions,seed,load,coverage,all:()=>Promise.all(Object.keys(regions).map(load))};
})();
