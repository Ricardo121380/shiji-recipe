// 饭Fun 云同步：整份快照。上传/下载由用户点选；自动同步只在云端未更新时备份本机改动，从不自动覆盖本机
import{S,normalizeImport,persist,toast,notify}from'./store.js';
import{hydrateImages,liveImageIds,hasInlineImages,readImageBlob,saveImageBlob,canonicalizeImages,localImageIds}from'./images.js';
import{ico}from'./ui.js';
const AT='shiji-sync-at';
let dirty=false,timer=null,running=false,started=false,lastPlan=null,toldNewer=false;
export const apiBase=()=>location.hostname.endsWith('pages.dev')?'':'https://shiji-recipe.pages.dev';
export const getCode=()=>localStorage.getItem('shiji-sync-code')||'';
export const isBound=()=>!!getCode();
export const lastSyncAt=()=>localStorage.getItem(AT)||'';
let lastCloudAtVal='';let cloudNewerFlag=false;let lastCloudRecipesVal=null;
export const lastCloudAt=()=>lastCloudAtVal;
export const lastCloudRecipes=()=>lastCloudRecipesVal??0;
export const lastPlanHint=()=>lastPlan?planLabel(lastPlan):'';
export function dot(){if(!isBound()||isPaused())return 0;return cloudNewerFlag?1:0}
export const bindCode=c=>{c=String(c||'').trim().toLowerCase();if(!/^[a-z0-9-]{8,48}$/.test(c))throw new Error('同步码需为 8-48 位小写字母、数字或连字符');localStorage.setItem('shiji-sync-code',c)};
export const unbind=()=>{localStorage.removeItem('shiji-sync-code');localStorage.removeItem(AT);dirty=false;lastPlan=null};
export const isPaused=()=>S.settings.autoSyncPause===true;
export const setPaused=v=>{S.settings.autoSyncPause=!!v;persist()};
export const generateCode=()=>'fanfun-'+[...crypto.getRandomValues(new Uint8Array(4))].map(b=>b.toString(16).padStart(2,'0')).join('');
export function markDirty(){if(!isBound()||isPaused())return;dirty=true;clearTimeout(timer);timer=setTimeout(()=>tick(),4000)}
function stamp(s){return s?String(s).slice(0,19).replace('T',' '):'尚无'}
function snapshot(meta){
  const localN=S.recipes.length;
  const cloudN=Number(meta.recipes??meta.data?.state?.recipes?.length)||0;
  const empty=meta.empty===true||(!meta.updatedAt&&!meta.data&&!cloudN);
  const cloudNewer=!!(meta.updatedAt&&meta.updatedAt>lastSyncAt());
  const plan={meta,localN,cloudN,cloudNewer,localDirty:dirty,empty};
  cloudNewerFlag=cloudNewer;
  lastCloudAtVal=meta.updatedAt||'';
  lastCloudRecipesVal=cloudN;
  lastPlan=plan;
  return plan;
}
export function planLabel(d){
  if(!d)return '';
  if(d.empty)return `云端还是空的。点「上传到云端」会把本机 ${d.localN} 道菜谱存上去。`;
  if(d.cloudNewer)return `云端较新（${d.cloudN} 道，${stamp(d.meta.updatedAt)}）。若其他设备改过，请先「下载到本机」；本机 ${d.localN} 道${d.localDirty?'，且有未上传改动':''}。`;
  if(d.localDirty)return `本机有未上传改动（${d.localN} 道）。点「上传到云端」会覆盖云端目前的 ${d.cloudN} 道。`;
  return `两边看起来一致。上传会用本机 ${d.localN} 道覆盖云端；下载会用云端 ${d.cloudN} 道覆盖本机。不会自动合并。`;
}
async function fetchJson(path){
  const ctrl=new AbortController();
  const t=setTimeout(()=>ctrl.abort(),45000);
  try{
    const r=await fetch(apiBase()+path,{cache:'no-store',signal:ctrl.signal});
    if(!r.ok)throw new Error('同步服务暂不可用');
    return await r.json();
  }catch(e){
    if(e&&e.name==='AbortError')throw new Error('云端响应超时，请检查网络后重试');
    throw e;
  }finally{clearTimeout(t)}
}
async function fetchMeta(light=false){return fetchJson('/api/sync/'+getCode()+(light?'?meta=1':''))}
async function pool(items,n,fn){
  const ret=[];let i=0;
  const worker=async()=>{while(i<items.length){const j=i++;ret[j]=await fn(items[j],j)}};
  await Promise.all(Array.from({length:Math.min(n,items.length)||0},worker));
  return ret;
}
async function pullImages(ids){
  if(!ids.length)return 0;
  const have=await localImageIds();
  const missing=ids.filter(id=>!have.has(id));
  if(!missing.length)return 0;
  toast('正在下载缺失配图（'+missing.length+' 张）…');
  let n=0;
  await pool(missing,4,async id=>{
    try{
      const ctrl=new AbortController();
      const t=setTimeout(()=>ctrl.abort(),30000);
      const r=await fetch(apiBase()+'/api/sync/'+getCode()+'/img/'+encodeURIComponent(id),{cache:'no-store',signal:ctrl.signal});
      clearTimeout(t);
      if(!r.ok)return;
      const blob=await r.blob();
      if(!blob||blob.size<16)return;
      await saveImageBlob(id,blob);
      n++;
    }catch{}
  });
  return n;
}
async function pushImages(ids){
  if(!ids.length)return 0;
  let n=0;
  await pool(ids,4,async id=>{
    const blob=await readImageBlob(id);
    if(!blob||blob.size<16)return;
    if(blob.size>900*1024)throw new Error('有配图过大，请换一张更小的照片后重试');
    const ctrl=new AbortController();
    const t=setTimeout(()=>ctrl.abort(),30000);
    const r=await fetch(apiBase()+'/api/sync/'+getCode()+'/img/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':blob.type||'image/jpeg'},body:blob,signal:ctrl.signal});
    clearTimeout(t);
    if(!r.ok)throw new Error(r.status===413?'单张配图过大':'配图上传失败');
    n++;
  });
  return n;
}
async function remoteImageIds(){
  const light=await fetchMeta(true);
  if(light.empty||light.bulky||Number(light.version||0)<3)return new Set();
  const full=await fetchMeta(false);
  return new Set(full.data?.imageIds||[]);
}
async function doPull(meta){
  const payload=meta.data;const next=normalizeImport(payload);if(!next)throw new Error('云端数据格式异常');
  toast('正在写入本机…');
  Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,next);
  const v3=Number(payload.version)>=3||Array.isArray(payload.imageIds);
  if(v3&&!hasInlineImages(S)){
    await pullImages(payload.imageIds||[...liveImageIds(S)]);
  }else{
    await hydrateImages(S,{skipCompress:true});
    await canonicalizeImages(S);
    try{await doPush()}catch{}
  }
  await canonicalizeImages(S);
  if(!persist())throw new Error('本机空间不足，云端数据未能保存');
  localStorage.setItem(AT,meta.updatedAt);dirty=false;toldNewer=false;notify();
}
async function doPush(){
  const n=await canonicalizeImages(S);
  if(n)persist();
  const state=JSON.parse(JSON.stringify(S));
  const ids=[...liveImageIds(state)];
  const remote=await remoteImageIds();
  const missing=ids.filter(id=>!remote.has(id));
  if(missing.length)toast('正在上传新增配图（'+missing.length+' 张'+(ids.length>missing.length?'，已有 '+(ids.length-missing.length)+' 张跳过':'')+'）…');
  else if(ids.length)toast('配图均已在云端，只更新菜谱数据…');
  await pushImages(missing);
  const body=JSON.stringify({version:4,state,imageIds:ids,pushedAt:new Date().toISOString()});
  if(body.length>8*1024*1024)throw new Error('数据过大，请减少配图后重试');
  const r=await fetch(apiBase()+'/api/sync/'+getCode(),{method:'PUT',headers:{'Content-Type':'application/json'},body});
  if(!r.ok)throw new Error(r.status===413?'数据过大，请减少配图后重试':'上传失败（'+r.status+'）');
  const j=await r.json();localStorage.setItem(AT,j.updatedAt);dirty=false;
}
function fillDialog(html){const d=document.querySelector('#dialog-root');d.innerHTML=html;if(!d.open)d.showModal();return d}
function askOverwrite(title,body,goLabel){return new Promise(res=>{
  const dlg=fillDialog(`<div class="editor"><div class="modal-heading"><div><span class="eyebrow">SYNC</span><h2>${title}</h2></div><button type="button" class="icon-button" data-close aria-label="关闭">${ico('close')}</button></div><div class="editor-content">${body}<p class="muted">这是整份覆盖，不是两边合并。不确定时先取消，去导出备份。</p></div><div class="modal-footer"><span></span><div><button type="button" class="secondary" data-close>取消</button><button type="button" class="primary" id="c-go">${goLabel}</button></div></div></div>`);
  dlg.querySelector('[data-close]').onclick=()=>res(false);
  dlg.querySelector('#c-go').onclick=()=>res(true);
})}
export async function inspect(){
  if(!isBound())return null;
  return snapshot(await fetchMeta(true));
}
export async function pushNow(){
  if(!isBound())return;
  if(running){toast('正在处理，请稍候');return}
  running=true;try{
    const d=snapshot(await fetchMeta(true));
    const ok=await askOverwrite('上传到云端',d.empty
      ?`<p>云端还是空的，将上传本机 <strong>${d.localN}</strong> 道菜谱（含菜单、冰箱等全部数据）。</p>`
      :`<p>将用本机 <strong>${d.localN}</strong> 道菜谱覆盖云端目前的 <strong>${d.cloudN}</strong> 道（${stamp(d.meta.updatedAt)}）。</p><p>云端现有数据会整份被替换。</p>`,`上传本机（${d.localN} 道），覆盖云端`);
    if(!ok)return'cancelled';
    await doPush();
    toast(d.empty?'云端为空，已上传本机数据':'已用本机数据覆盖云端');
    return'pushed';
  }catch(e){toast(e&&e.message?e.message:'上传失败');return'error'}finally{running=false}
}
export async function pullNow(){
  if(!isBound())return;
  if(running){toast('正在处理，请稍候');return}
  running=true;try{
    const d=snapshot(await fetchMeta(true));
    if(d.empty){toast('云端还没有数据。请先在有完整记录的设备上点「上传到云端」');return'empty'}
    const ok=await askOverwrite('下载到本机',`<p>将用云端 <strong>${d.cloudN||'备份'}</strong> 道菜谱（${stamp(d.meta.updatedAt)}）覆盖本机目前的 <strong>${d.localN}</strong> 道。</p><p>本机现有数据会整份被替换。配图多时下载会多等一会儿。</p>`,`下载云端${d.cloudN?`（${d.cloudN} 道）`:''}，覆盖本机`);
    if(!ok)return'cancelled';
    toast('正在从云端下载…');
    await doPull(await fetchMeta(false));
    toast('已用云端数据覆盖本机');
    return'pulled';
  }catch(e){toast(e&&e.message?e.message:'下载失败');return'error'}finally{running=false}
}
export async function afterBind(){
  if(!isBound())return;
  try{
    const d=await inspect();
    if(d.empty){
      if(running){toast('正在处理，请稍候');return}
      running=true;try{await doPush();toast('云端为空，已上传本机数据');return'pushed'}finally{running=false}
    }
    toast('云端已有备份，请确认是否下载到本机');
    return pullNow();
  }catch(e){toast(e&&e.message?e.message:'同步失败');return'error'}
}
export async function tick(){
  if(!isBound()||running||isPaused())return;
  if(document.querySelector('#dialog-root')?.open)return;
  running=true;try{
    const d=snapshot(await fetchMeta(true));
    if(d.empty){await doPush();return'pushed'}
    if(!lastSyncAt()&&!d.empty){
      toast('正在从云端恢复备份…');
      await doPull(await fetchMeta(false));
      toast('已从云端恢复备份');
      return'pulled';
    }
    if(d.cloudNewer){if(!toldNewer){toldNewer=true;toast('云端有新备份，请打开「云同步」点下载到本机')}return'needs-pull'}
    if(d.localDirty&&d.localN>=d.cloudN){await doPush();return'pushed'}
    return'latest';
  }catch(e){return'error'}finally{running=false}
}
export function start(){if(started)return;started=true;
setTimeout(()=>tick(),1500);
setInterval(()=>tick(),30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
window.addEventListener('online',()=>tick())}
export function onLocalChange(){dirty=true;markDirty()}
