// 配图存储：dataURL 迁入 IndexedDB，状态里只留 idb:<uuid>；http 外链保持原样
import{compressImage}from'./ui.js';

const DB='shiji-images',STORE='blobs',FAT=180000,PREFIX='idb:';
const cache=new Map();
let dbp=null,idbDisabled=false;

function openDb(){
  if(idbDisabled||!window.indexedDB)return Promise.reject(new Error('no-idb'));
  if(dbp)return dbp;
  dbp=new Promise((res,rej)=>{
    const r=indexedDB.open(DB,1);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>{dbp=null;rej(r.error)};
  }).catch(e=>{idbDisabled=true;throw e});
  return dbp;
}
function idbPut(id,blob){return openDb().then(db=>new Promise((res,rej)=>{
  const t=db.transaction(STORE,'readwrite');
  t.objectStore(STORE).put(blob,id);
  t.oncomplete=()=>res();
  t.onerror=()=>rej(t.error);
}))}
function idbGet(id){return openDb().then(db=>new Promise((res,rej)=>{
  const r=db.transaction(STORE,'readonly').objectStore(STORE).get(id);
  r.onsuccess=()=>res(r.result||null);
  r.onerror=()=>rej(r.error);
}))}
function idbDel(id){return openDb().then(db=>new Promise((res,rej)=>{
  const t=db.transaction(STORE,'readwrite');
  t.objectStore(STORE).delete(id);
  t.oncomplete=()=>res();
  t.onerror=()=>rej(t.error);
}))}
function idbKeys(){return openDb().then(db=>new Promise((res,rej)=>{
  const r=db.transaction(STORE,'readonly').objectStore(STORE).getAllKeys();
  r.onsuccess=()=>res(r.result||[]);
  r.onerror=()=>rej(r.error);
}))}

function cacheBlob(id,blob){
  const prev=cache.get(id);
  if(prev)URL.revokeObjectURL(prev);
  cache.set(id,URL.createObjectURL(blob));
}
export const imgSrc=ref=>{
  if(!ref)return'';
  if(ref.startsWith(PREFIX))return cache.get(ref.slice(PREFIX.length))||'';
  return ref;
};
export const isIdbRef=ref=>typeof ref==='string'&&ref.startsWith(PREFIX);

function walkImages(state,fn){
  for(const r of state.recipes||[]){
    fn(r,'image',1400);
    for(const s of r.steps||[])fn(s,'image',800);
  }
  for(const d of state.dining||[])fn(d,'image',1400);
}
export function liveImageIds(state){
  const ids=new Set();
  walkImages(state,(obj,key)=>{const v=obj[key];if(isIdbRef(v))ids.add(v.slice(PREFIX.length))});
  return ids;
}

async function blobToDataUrl(blob){
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob)});
}

export async function storeImage(dataUrl){
  if(!dataUrl)return'';
  if(isIdbRef(dataUrl)||!String(dataUrl).startsWith('data:image/'))return dataUrl;
  try{
    const blob=await(await fetch(dataUrl)).blob();
    const id=crypto.randomUUID();
    await idbPut(id,blob);
    cacheBlob(id,blob);
    return PREFIX+id;
  }catch{
    return dataUrl;
  }
}

export async function ingestFile(file,max=1400){
  const data=await compressImage(file,max);
  return storeImage(data);
}

export async function dropImage(ref){
  if(!isIdbRef(ref))return;
  const id=ref.slice(PREFIX.length);
  const u=cache.get(id);
  if(u){URL.revokeObjectURL(u);cache.delete(id)}
  try{await idbDel(id)}catch{}
}

export async function gcImages(state){
  try{
    const live=liveImageIds(state);
    const keys=await idbKeys();
    for(const k of keys){if(!live.has(k)){const u=cache.get(k);if(u){URL.revokeObjectURL(u);cache.delete(k)}await idbDel(k)}}
  }catch{}
}

async function compressDataUrl(url,max){
  const blob=await(await fetch(url)).blob();
  const file=new File([blob],'img',{type:blob.type||'image/jpeg'});
  const next=await compressImage(file,max);
  return next&&next.length<url.length?next:url;
}

export async function hydrateImages(state){
  if(!state)return{moved:0,compressed:0};
  let moved=0,compressed=0;
  const jobs=[];
  walkImages(state,(obj,key,max)=>jobs.push({obj,key,max}));
  for(const{obj,key,max}of jobs){
    const v=obj[key];
    if(typeof v==='string'&&v.startsWith('data:image/')){
      let data=v;
      if(v.length>FAT){
        try{const next=await compressDataUrl(v,max);if(next!==v){data=next;compressed++}}catch{}
      }
      const stored=await storeImage(data);
      if(stored!==data&&isIdbRef(stored)){obj[key]=stored;moved++}
      else obj[key]=stored;
    }else if(isIdbRef(v)){
      const id=v.slice(PREFIX.length);
      if(!cache.has(id)){
        try{
          const blob=await idbGet(id);
          if(blob)cacheBlob(id,blob);
          else obj[key]='';
        }catch{}
      }
    }
    await new Promise(r=>setTimeout(r,0));
  }
  await gcImages(state);
  return{moved,compressed};
}

export async function inlineImages(state){
  if(!state)return state;
  const jobs=[];
  walkImages(state,(obj,key)=>jobs.push({obj,key}));
  for(const{obj,key}of jobs){
    const v=obj[key];
    if(!isIdbRef(v))continue;
    const id=v.slice(PREFIX.length);
    try{
      const blob=await idbGet(id);
      if(!blob){obj[key]='';continue}
      obj[key]=await blobToDataUrl(blob);
    }catch{obj[key]=''}
  }
  return state;
}

export async function cloneWithInlineImages(state){
  const copy=JSON.parse(JSON.stringify(state));
  await inlineImages(copy);
  return copy;
}
