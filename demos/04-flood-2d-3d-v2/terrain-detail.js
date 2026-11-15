/* Bounded detail-image cache; stale requests never replace the current selected object. */
window.InfraWatchTerrainDetail=(()=>{
  'use strict';
  const script=typeof document!=='undefined'?document.currentScript:null,root=script?new URL('assets/detail-ortho/',script.src):null,version=script?new URL(script.src).searchParams.get('v'):'';
  function valid(entry,id){const b=entry?.bbox;return entry?.osm_id===String(id)&&entry.file===String(id)+'.jpg'&&entry.crs==='EPSG:4326'&&Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[0]<b[2]&&b[1]<b[3]&&b[0]>=-180&&b[2]<=180&&b[1]>=-90&&b[3]<=90&&entry.width>0&&entry.height>0}
  function uvBounds(entry,b){const e=entry.bbox;return [(e[0]-b[0])/(b[2]-b[0]),(b[3]-e[3])/(b[3]-b[1]),(e[2]-b[0])/(b[2]-b[0]),(b[3]-e[1])/(b[3]-b[1])]}
  function createLoader({fetchManifest,fetchImage,onChange=()=>{},release=image=>image.close?.(),capacity=3}){
    let manifest=null,generation=0,controller=null,inflight=null,state={id:null,status:'idle',entry:null,image:null};const cache=new Map();
    const get=()=>({...state});
    function clear(){generation++;controller?.abort();controller=null;state={id:null,status:'idle',entry:null,image:null};onChange(get())}
    function touch(id,value){cache.delete(id);cache.set(id,value);while(cache.size>capacity){const oldest=cache.keys().next().value,old=cache.get(oldest);cache.delete(oldest);release(old.image)}}
    function index(){return manifest??=Promise.resolve().then(fetchManifest).catch(error=>{manifest=null;throw error})}
    function request(id,{retry=false}={}){
      id=String(id);if(state.id===id&&!retry&&state.status!=='idle')return inflight||Promise.resolve(get());
      const own=++generation;controller?.abort();controller=new AbortController();const signal=controller.signal;state={id,status:'loading',entry:null,image:null};onChange(get());
      inflight=(async()=>{try{
        const data=await index();if(own!==generation)return {status:'stale'};const entry=data.items?.find(item=>item.osm_id===id);if(!valid(entry,id))throw Error('Brak przygotowanego detalu dla tego obiektu.');
        let result=cache.get(id);if(!result){const image=await fetchImage(entry,{signal});if(own!==generation){release(image);return {status:'stale'}}result={entry,image}}
        touch(id,result);state={id,status:'ready',...result};onChange(get());return get();
      }catch(error){if(own!==generation)return {status:'stale'};state={id,status:'error',entry:null,image:null,error:error.message};onChange(get());return get()}})();return inflight;
    }
    return {get,request,clear,cacheSize:()=>cache.size};
  }
  function browserLoader(onChange){
    const asset=name=>{const url=new URL(name,root);if(version)url.searchParams.set('v',version);return url};
    return createLoader({onChange,fetchManifest:async()=>{const response=await fetch(asset('index.json'));if(!response.ok)throw Error('Nie udało się pobrać indeksu zdjęć.');return response.json()},fetchImage:async(entry,{signal})=>{const response=await fetch(asset(entry.file),{signal});if(!response.ok)throw Error('Nie udało się pobrać zdjęcia szczegółowego.');const blob=await response.blob();if(typeof createImageBitmap==='function')return createImageBitmap(blob);const url=URL.createObjectURL(blob),image=new Image();try{image.src=url;await image.decode();return image}finally{URL.revokeObjectURL(url)}}});
  }
  return {valid,uvBounds,createLoader,browserLoader};
})();
