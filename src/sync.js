// 饭Fun 云同步引擎：整份快照，按时间决定拉或推；不会把两台设备的菜谱合并
import{S,normalizeImport,persist,toast}from'./store.js';
import{hydrateImages,cloneWithInlineImages}from'./images.js';
import{ico}from'./ui.js';
const AT='shiji-sync-at';
let dirty=false,timer=null,running=false,started=false,lastPlan=null;
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
function cloudCount(meta){return(meta?.data?.state?.recipes||[]).length}
function stamp(s){return s?String(s).slice(0,19).replace('T',' '):'尚无'}
function decide(meta){
  const localN=S.recipes.length,cloudN=cloudCount(meta);
  const cloudNewer=!!(meta.updatedAt&&meta.updatedAt>lastSyncAt());
  const localDirty=dirty,empty=!meta.data;
  let action='latest';
  if(empty)action='push-empty';
  else if(cloudNewer&&localDirty)action='conflict';
  else if(cloudNewer&&cloudN<localN)action='conflict';
  else if(localDirty&&!cloudNewer&&localN<cloudN)action='conflict';
  else if(cloudNewer)action='pull';
  else if(localDirty)action='push';
  cloudNewerFlag=cloudNewer;
  lastCloudAtVal=meta.updatedAt||'';
  lastCloudRecipesVal=cloudN;
  const plan={meta,action,localN,cloudN,cloudNewer,localDirty,empty};
  lastPlan=plan;
  return plan;
}
export function planLabel(d){
  if(!d)return '';
  if(d.action==='latest')return '目前两边一致，点「立即同步」不会改数据。';
  if(d.action==='pull')return `云端较新。点「立即同步」会先请你确认，再用云端 ${d.cloudN} 道覆盖本机 ${d.localN} 道。`;
  if(d.action==='push')return `本机有未上传改动。点「立即同步」会先请你确认，再用本机 ${d.localN} 道覆盖云端 ${d.cloudN} 道。`;
  if(d.action==='push-empty')return `云端还是空的。点「立即同步」会先请你确认，再上传本机 ${d.localN} 道。`;
  return `两边对不上（本机 ${d.localN} 道 / 云端 ${d.cloudN} 道）。点「立即同步」会让你选择保留哪一份；不会自动合并。`;
}
async function fetchMeta(){const r=await fetch(apiBase()+'/api/sync/'+getCode());if(!r.ok)throw new Error('同步服务暂不可用');return r.json()}
async function doPull(meta){const next=normalizeImport(meta.data);if(!next)throw new Error('云端数据格式异常');
Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,next);
const{compressed}=await hydrateImages(S);
persist();
localStorage.setItem(AT,meta.updatedAt);dirty=false;
if(compressed){toast('已压缩云端同步下来的 '+compressed+' 张大图');dirty=true;try{await doPush()}catch{}}}
async function doPush(){const state=await cloneWithInlineImages(S);const body=JSON.stringify({version:2,state,pushedAt:new Date().toISOString()});
if(body.length>8*1024*1024)throw new Error('数据过大，请减少配图后重试');
const r=await fetch(apiBase()+'/api/sync/'+getCode(),{method:'PUT',headers:{'Content-Type':'application/json'},body});
if(!r.ok)throw new Error(r.status===413?'数据过大，请减少配图后重试':'上传失败（'+r.status+'）');const j=await r.json();localStorage.setItem(AT,j.updatedAt);dirty=false}
function fillDialog(html){const d=document.querySelector('#dialog-root');d.innerHTML=html;if(!d.open)d.showModal();return d}
function askConflict(d){return new Promise(res=>{
  const preferCloud=d.cloudN>=d.localN;
  const dlg=fillDialog(`<div class="editor"><div class="modal-heading"><div><span class="eyebrow">SYNC CONFLICT</span><h2>同步冲突</h2></div><button class="icon-button" data-close aria-label="关闭">${ico('close')}</button></div><div class="editor-content"><p>本机 <strong>${d.localN}</strong> 道菜谱，云端 <strong>${d.cloudN}</strong> 道菜谱。</p><p>两边对不上。同步是<strong>整份替换</strong>，不会把两台设备的菜谱合并在一起。</p><p class="muted">云端更新于 ${stamp(d.meta.updatedAt)} · 本机上次同步 ${stamp(lastSyncAt())}。覆盖前建议先导出备份。</p></div><div class="modal-footer"><span></span><div><button class="secondary" id="c-other">${preferCloud?`保留本机，覆盖云端（${d.localN} 道）`:`使用云端，覆盖本机（${d.cloudN} 道）`}</button><button class="primary" id="c-main">${preferCloud?`使用云端，覆盖本机（${d.cloudN} 道）`:`保留本机，覆盖云端（${d.localN} 道）`}</button></div></div></div>`);
  const done=v=>{dlg.close();res(v)};
  dlg.querySelector('[data-close]').onclick=()=>done('cancelled');
  dlg.querySelector('#c-main').onclick=()=>done(preferCloud?'cloud':'local');
  dlg.querySelector('#c-other').onclick=()=>done(preferCloud?'local':'cloud');
})}
function askOverwrite(title,body,goLabel){return new Promise(res=>{
  const dlg=fillDialog(`<div class="editor"><div class="modal-heading"><div><span class="eyebrow">SYNC</span><h2>${title}</h2></div><button class="icon-button" data-close aria-label="关闭">${ico('close')}</button></div><div class="editor-content">${body}<p class="muted">这是整份覆盖，不是两边合并。不确定时先点取消，去导出备份。</p></div><div class="modal-footer"><span></span><div><button class="secondary" data-close>取消</button><button class="primary" id="c-go">${goLabel}</button></div></div></div>`);
  dlg.querySelector('[data-close]').onclick=()=>{dlg.close();res(false)};
  dlg.querySelector('#c-go').onclick=()=>{dlg.close();res(true)};
})}
async function applyPull(meta){await doPull(meta);toast('已用云端数据覆盖本机');return'pulled'}
async function applyPush(manual,empty=false){await doPush();if(manual)toast(empty?'云端为空，已上传本机数据':'已用本机数据覆盖云端');return'pushed'}
export async function inspect(){
  if(!isBound())return null;
  return decide(await fetchMeta());
}
export async function tick(manual=false,opts={}){
  if(!isBound()||running)return;
  if(isPaused()&&!manual)return;
  if(document.querySelector('#dialog-root')?.open&&!manual)return;
  running=true;try{
    const d=decide(await fetchMeta());
    if(d.action==='latest'){if(manual)toast('已经是最新，没有覆盖任何数据');return'latest'}
    if(d.action==='conflict'){
      const choice=await askConflict(d);
      if(choice==='cloud')return applyPull(d.meta);
      if(choice==='local')return applyPush(true,d.empty);
      return'cancelled';
    }
    if(manual&&!(opts.allowEmptyPush&&d.action==='push-empty')){
      if(d.action==='pull'){
        const ok=await askOverwrite('从云端下载',`<p>云端较新：<strong>${d.cloudN}</strong> 道菜谱（${stamp(d.meta.updatedAt)}）。</p><p>本机目前 <strong>${d.localN}</strong> 道。下载后<strong>本机全部数据会被云端替换</strong>。</p>`,`下载云端（${d.cloudN} 道），覆盖本机`);
        if(!ok)return'cancelled';
        return applyPull(d.meta);
      }
      const empty=d.action==='push-empty';
      const ok=await askOverwrite('上传到云端',empty?`<p>云端还是空的，将上传本机 <strong>${d.localN}</strong> 道菜谱。</p>`:`<p>本机有未上传的改动：<strong>${d.localN}</strong> 道菜谱。</p><p>云端目前 <strong>${d.cloudN}</strong> 道（${stamp(d.meta.updatedAt)}）。上传后<strong>云端会被本机整份替换</strong>。</p>`,empty?`上传本机（${d.localN} 道）`:`上传本机（${d.localN} 道），覆盖云端`);
      if(!ok)return'cancelled';
      return applyPush(true,empty);
    }
    if(d.action==='pull')return applyPull(d.meta);
    return applyPush(manual,d.action==='push-empty');
  }catch(e){toast(e&&e.message?e.message:'同步失败，稍后重试');return'error'}finally{running=false}
}
export function start(){if(started)return;started=true;
setTimeout(()=>tick(),1500);
setInterval(()=>tick(),30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
window.addEventListener('online',()=>tick())}
export function onLocalChange(){dirty=true;markDirty()}
