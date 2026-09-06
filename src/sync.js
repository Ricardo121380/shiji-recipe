// 饭Fun 云同步引擎：同步码绑定后自动推送/拉取，冲突时由用户选择
import{S,normalizeImport,persist,toast}from'./store.js';
const AT='shiji-sync-at';
let dirty=false,timer=null,running=false,started=false;
export const apiBase=()=>location.hostname.endsWith('pages.dev')?'':'https://shiji-recipe.pages.dev';
export const getCode=()=>localStorage.getItem('shiji-sync-code')||'';
export const isBound=()=>!!getCode();
export const lastSyncAt=()=>localStorage.getItem(AT)||'';
let lastCloudAtVal='';let cloudNewerFlag=false;let lastCloudRecipesVal=null;
export const lastCloudAt=()=>lastCloudAtVal;
export const lastCloudRecipes=()=>lastCloudRecipesVal;
export function dot(){if(!isBound()||isPaused())return 0;return cloudNewerFlag?1:0}
export const bindCode=c=>{c=String(c||'').trim().toLowerCase();if(!/^[a-z0-9-]{8,48}$/.test(c))throw new Error('同步码需为 8-48 位小写字母、数字或连字符');localStorage.setItem('shiji-sync-code',c)};
export const unbind=()=>{localStorage.removeItem('shiji-sync-code');localStorage.removeItem(AT);dirty=false};
export const isPaused=()=>S.settings.autoSyncPause===true;
export const setPaused=v=>{S.settings.autoSyncPause=!!v;persist()};
export const generateCode=()=>'fanfun-'+[...crypto.getRandomValues(new Uint8Array(4))].map(b=>b.toString(16).padStart(2,'0')).join('');
export function markDirty(){if(!isBound()||isPaused())return;dirty=true;clearTimeout(timer);timer=setTimeout(()=>tick(),4000)}
async function fetchMeta(){const r=await fetch(apiBase()+'/api/sync/'+getCode());if(!r.ok)throw new Error('同步服务暂不可用');return r.json()}
async function doPull(meta){const next=normalizeImport(meta.data);if(!next)throw new Error('云端数据格式异常');
Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,next);persist();
localStorage.setItem(AT,meta.updatedAt);dirty=false}
async function doPush(){const body=JSON.stringify({version:2,state:S,pushedAt:new Date().toISOString()});
const r=await fetch(apiBase()+'/api/sync/'+getCode(),{method:'PUT',headers:{'Content-Type':'application/json'},body});
if(!r.ok)throw new Error('上传失败（'+r.status+'）');const j=await r.json();localStorage.setItem(AT,j.updatedAt);dirty=false}
function askConflict(updatedAt){return new Promise(res=>{const d=document.querySelector('#dialog-root');
d.innerHTML=`<div class="editor"><div class="modal-heading"><div><span class="eyebrow">SYNC CONFLICT</span><h2>同步冲突</h2></div><button class="icon-button" data-close aria-label="关闭">${''}</button></div><div class="editor-content"><p>云端有其他设备推送的新数据（${String(updatedAt).slice(0,10)}），本机也有未上传的改动。请选择保留哪一份：</p><p class="muted">另一台设备的数据会被覆盖，建议先在另一台设备上导出备份。</p></div><div class="modal-footer"><span></span><div><button class="secondary" id="c-local">保留本机，覆盖云端</button><button class="primary" id="c-cloud">使用云端，覆盖本机</button></div></div></div>`;
d.showModal();d.querySelector('#c-cloud').onclick=()=>{d.close();res('cloud')};d.querySelector('#c-local').onclick=()=>{d.close();res('local')}})}
export async function tick(manual=false){
if(!isBound()||running)return;
if(isPaused()&&!manual)return;
if(document.querySelector('#dialog-root')?.open&&!manual)return;
running=true;try{
const meta=await fetchMeta();
lastCloudAtVal=meta.updatedAt||'';lastCloudRecipesVal=(meta.data?.state?.recipes||[]).length;
const base=lastSyncAt();
const cloudNewer=!!(meta.updatedAt&&meta.updatedAt>base);
const localDirty=dirty;
if(cloudNewer&&localDirty){const choice=await askConflict(meta.updatedAt);
if(choice==='cloud'){await doPull(meta);toast('已用云端数据覆盖本机');return'pulled'}
if(choice==='local'){await doPush();toast('已用本机数据覆盖云端');return'pushed'}
return'cancelled'}
if(!meta.data){dirty=true;await doPush();return'pushed'}
if(cloudNewer){await doPull(meta);toast('已自动同步云端数据');return'pulled'}
if(localDirty){await doPush();return'pushed'}
return manual?'已是最新':'latest'
}catch(e){toast(e&&e.message?e.message:'同步失败，稍后重试');return'error'}finally{running=false}}
export function start(){if(started)return;started=true;
setTimeout(()=>tick(),1500);
setInterval(()=>tick(),30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
window.addEventListener('online',()=>tick())}
export function onLocalChange(){dirty=true;markDirty()}
