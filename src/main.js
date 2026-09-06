import{S,today,addDays,MEALS,fmtDate,daysUntil,onChange,persist,normalizeImport,toast,prepItemsFor,prepUpcoming,onLocalChange as store_onLocalChange,defrostItemsFor,defrostNames}from'./store.js';
import{ico,esc}from'./ui.js';
import{hydrateImages,cloneWithInlineImages}from'./images.js';
import*as sync from'./sync.js';
window.__syncDebug=sync;
import{render as renderRecipes,setType}from'./recipes.js';
import{renderWeek,renderFridge,renderShopping,renderDaily,notifyExpiring,notifyPrep,dailyReminderCheck,morningDefrostCheck,reminderLists,requestNotify}from'./kitchen.js';
import{renderDining,renderJournal,renderHealth,renderRecommend}from'./life.js';
import{openSettings}from'./settings.js';

const BUILD_ID=typeof __BUILD_ID__!=='undefined'?__BUILD_ID__:'dev';
function pageUrl(){return new URL(location.href)}
function pathWith(u){const q=u.searchParams.toString();return u.pathname+(q?`?${q}`:'')+u.hash}
function stripBuildQuery(){
  try{
    const u=pageUrl();
    if(u.searchParams.get('_b')!==BUILD_ID)return;
    u.searchParams.delete('_b');
    history.replaceState(null,'',pathWith(u));
  }catch{}
}
let freshAt=0;
async function ensureFresh(){
  if(BUILD_ID==='dev'||import.meta.env.DEV)return;
  const now=Date.now();
  if(now-freshAt<15000)return;
  freshAt=now;
  try{
    const r=await fetch(`./version.json?t=${now}`,{cache:'no-store'});
    if(!r.ok)return;
    const id=(await r.json()).id;
    if(!id||id===BUILD_ID){try{sessionStorage.removeItem('shiji-fresh')}catch{}return}
    const u=pageUrl();
    if(u.searchParams.get('_b')===id)return;
    let n=0;try{n=Number(sessionStorage.getItem('shiji-fresh')||0)}catch{}
    if(n>=2)return;
    try{sessionStorage.setItem('shiji-fresh',String(n+1));localStorage.setItem('shiji-build',id)}catch{}
    u.searchParams.set('_b',id);
    location.replace(pathWith(u));
  }catch{}
}
try{localStorage.setItem('shiji-build',BUILD_ID)}catch{}
stripBuildQuery();
ensureFresh();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')ensureFresh()});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();else ensureFresh()});

const NAV=[['#/recipes','book','菜谱'],['#/dining','utensils','外出就餐'],['#/week','calendar','本周菜单'],['#/fridge','fridge','冰箱'],['#/shopping','cart','购买清单'],['#/health','flame','热量记录'],['#/recommend','sparkle','菜品推荐'],['#/journal','grid','就餐记录'],['#/daily','grid','日用品库存']];
const TITLES=Object.fromEntries(NAV.map(([h,,l])=>[h,l]));

function route(){const h=location.hash||'#/recipes';return NAV.some(n=>n[0]===h)?h:'#/recipes'}

async function exportBackup(){try{const state=await cloneWithInlineImages(S);const blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`饭Fun-备份-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}catch{toast('导出备份失败')}}

function importBackup(){const inp=document.createElement('input');inp.type='file';inp.accept='application/json,.json';inp.onchange=async()=>{const f=inp.files[0];if(!f)return;try{const next=normalizeImport(JSON.parse(await f.text()));if(!next){toast('备份文件格式不正确，未导入');return}if(!window.confirm(`导入将覆盖当前的全部数据（共 ${next.recipes.length} 条菜谱记录）。确定继续？`))return;Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,next);await hydrateImages(S);if(persist()){toast('备份已导入');renderApp()}else toast('导入失败：浏览器空间不足')}catch{toast('读取备份失败，请确认选择的是 JSON 备份文件')}};inp.click()}

function showSync(refresh=true){const dlg=document.querySelector('#dialog-root');const bound=sync.isBound();
if(!bound){dlg.innerHTML=`<div class="editor"><div class="modal-heading"><div><span class="eyebrow">CLOUD SYNC</span><h2>云端同步</h2></div><button class="icon-button" data-close aria-label="关闭">${ico('close')}</button></div><div class="editor-content"><p style="margin-top:0">绑定同步码后，本机数据自动与云端保持一致——其他设备输入同一个码即可互通。</p><label class="field">同步码 <span class="optional">建议使用生成的随机码，切勿使用简单词</span><input id="sync-code" maxlength="48" placeholder="例如：fanfun-8f3k2m9x"></label><p class="muted">同步码是数据的唯一凭证，请勿泄露；所有设备的饮食数据将存入 Cloudflare。</p></div><div class="modal-footer"><span></span><div><button class="secondary" id="gen-code">生成随机码</button><button class="primary" id="bind-go">绑定并开始同步</button></div></div></div>`}
else{dlg.innerHTML=`<div class="editor"><div class="modal-heading"><div><span class="eyebrow">CLOUD SYNC</span><h2>云端同步</h2></div><button class="icon-button" data-close aria-label="关闭">${ico('close')}</button></div><div class="editor-content"><p style="margin-top:0">同步码：<strong>······${sync.getCode().slice(-4)}</strong>（完整码仅存于各设备浏览器）</p><p>本机：<strong>${S.recipes.length}</strong> 道菜谱 · 云端：<strong>${sync.lastCloudRecipes()}</strong> 道菜谱<br>云端最后更新：${sync.lastCloudAt()||'尚无'}<br>本地上次同步：${sync.lastSyncAt()||'尚无'}</p><label class="prep-line"><input type="checkbox" id="sync-pause" ${sync.isPaused()?'checked':''}> 暂停自动同步（改动只保留在本机）</label><p class="muted">自动同步：打开网站时、改动后约 4 秒、以及网页打开期间每 30 秒检查一次。弹窗编辑时不会打扰。</p></div><div class="modal-footer"><span></span><div><button class="secondary danger-button" id="sync-unbind">解除绑定</button><button class="primary" id="sync-now">立即同步</button></div></div></div>`}
if(!dlg.open)dlg.showModal();
const refreshPanel=()=>{if(!dlg.open)return;sync.tick(true).then(()=>{if(dlg.querySelector('#sync-now')&&dlg.open)showSync(false)}).catch(()=>{})};
dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close());
dlg.querySelector('#gen-code')?.addEventListener('click',()=>{dlg.querySelector('#sync-code').value=sync.generateCode()});
dlg.querySelector('#bind-go')?.addEventListener('click',()=>{try{sync.bindCode(dlg.querySelector('#sync-code').value)}catch(e){toast(e.message);return}dlg.close();toast('同步码已绑定，开始首次同步');sync.tick(true).then(()=>{renderApp();showSync(false)})});
dlg.querySelector('#sync-now')?.addEventListener('click',()=>{dlg.close();sync.tick(true).then(()=>{renderApp();showSync(false)})});
dlg.querySelector('#sync-pause')?.addEventListener('change',e=>{sync.setPaused(e.target.checked);renderApp()});
dlg.querySelector('#sync-unbind')?.addEventListener('click',()=>{if(confirm('解除绑定后本机不再自动同步（数据保留在本机）。确定？')){sync.unbind();dlg.close();renderView()}});
if(bound&&refresh)refreshPanel()}

function showReminders(){const dlg=document.querySelector('#dialog-root');const{prep,exp,low}=reminderLists();const defrost=defrostItemsFor(addDays(today(),1));const defrostToday=defrostItemsFor(today());
dlg.innerHTML=`<div class="editor"><div class="modal-heading"><div><span class="eyebrow">GET READY</span><h2>提醒中心</h2></div><button class="icon-button" data-close aria-label="关闭">${ico('close')}</button></div><div class="editor-content">${defrost.length?`<h3 class="match-title">❄ 解冻提醒（明天要做的菜）</h3><div>${defrost.map(({date,item})=>{const r=S.recipes.find(x=>x.id===item.refId);return`<span class="journal-item defrost-item"><em>${fmtDate(date)}</em>${esc(item.name)}${item.qty>1?` ×${item.qty}`:''}<small>解冻：${defrostNames(r).join('、')}</small></span>`}).join('')}</div>`:''}${defrostToday.length?`<h3 class="match-title">❄ 今天要解冻</h3><div>${defrostToday.map(({item})=>{const r=S.recipes.find(x=>x.id===item.refId);return`<span class="journal-item defrost-item"><em>今天</em>${esc(item.name)}<small>解冻：${defrostNames(r).join('、')}</small></span>`}).join('')}</div>`:''}${prep.length?`<h3 class="match-title">${ico('clock',14)} 备菜提醒（勾选已吃后自动移除）</h3><div class="journal-list" style="margin-top:8px">${prep.map(({date,meal,item})=>{const r=(item.refType==='dining'?null:S.recipes.find(x=>x.id===item.refId));const pr=(r?.steps||[]).filter(s2=>s2.prep).map(s2=>s2.text);return`<div class="journal-day"><header><strong>${fmtDate(date)} 周${'日一二三四五六'[new Date(date+'T00:00:00').getDay()]} · ${MEALS.find(m=>m[0]===meal)[1]}</strong><span>${date===addDays(today(),1)?'明天':date===today()?'今天':''}</span></header><span class="journal-item"><em>${esc(item.name)}${item.qty>1?` ×${item.qty}`:''}</em>${esc(pr[0]||'需要提前准备')}</span></div>`}).join('')}</div>`:''}${exp.length?`<h3 class="match-title">${ico('bell',14)} 临期食材（2 天内到期）</h3><div>${exp.map(p=>`<span class="journal-item"><em>${daysUntil(p.expiryDate)<0?'已过期':daysUntil(p.expiryDate)===0?'今天到期':`剩${daysUntil(p.expiryDate)}天`}</em>${esc(p.name)}<small>剩 ${esc(p.qty)} ${esc(p.unit)}</small></span>`).join('')}</div>`:''}${low.length?`<h3 class="match-title">${ico('cart',14)} 低库存日用品</h3><div>${low.map(d=>`<span class="journal-item"><em>余量不足</em>${esc(d.name)}<small>剩 ${esc(d.qty)} ${esc(d.unit)}</small></span>`).join('')}</div>`:''}${!prep.length&&!defrost.length&&!defrostToday.length&&!exp.length&&!low.length?`<div class="empty"><div>${ico('bell')}</div><h3>暂无提醒</h3><p>备菜、解冻、临期食材和低库存日用品会出现在这里。</p></div>`:''}</div><div class="modal-footer"><span class="muted">每天 18:00 汇总通知一次（需允许浏览器通知；iOS 请先加到主屏幕）</span><div><button class="secondary" data-close>关闭</button></div></div></div>`;dlg.showModal();
dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close())}

function fillView(view,r){
if(r==='#/recipes')renderRecipes(view);
else if(r==='#/week')renderWeek(view);
else if(r==='#/fridge')renderFridge(view);
else if(r==='#/dining')renderDining(view);
else if(r==='#/shopping')renderShopping(view);
else if(r==='#/journal')renderJournal(view);
else if(r==='#/health')renderHealth(view);
else if(r==='#/recommend')renderRecommend(view);
else if(r==='#/daily')renderDaily(view)}
function bindTopbar(){
(document.querySelector('#export')??document.createElement('button')).onclick=exportBackup;
(document.querySelector('#cloud')??document.createElement('button')).onclick=()=>showSync();
(document.querySelector('#import')??document.createElement('button')).onclick=importBackup;
(document.querySelector('#cats')??document.createElement('button')).onclick=()=>openSettings();
(document.querySelector('#notify')??document.createElement('button')).onclick=()=>{showReminders();requestNotify()}}
function renderView(){const r=route();const view=document.querySelector('#view');if(!view){renderApp();return}
document.querySelectorAll('a.nav-item').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===r));
const bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML=`我的厨房 <span>/</span> ${TITLES[r]}`;
const notify=document.querySelector('#notify');if(notify)notify.innerHTML=`${ico('bell',15)}${prepBellCount()?`<span class="bell-badge">${prepBellCount()}</span>`:''} 提醒`;
fillView(view,r)}
function renderApp(){const r=route();
document.querySelector('#app').innerHTML=`
<aside class="sidebar"><a class="brand" href="#/recipes"><span class="brand-symbol">${ico('bowl',26)}</span><span>饭Fun<span class="brand-en">好好吃饭小助手</span></span></a><div class="space-label">我的厨房</div><nav>${NAV.map(([h,icon,label])=>`<a class="nav-item ${r===h?'active':''}" href="${h}">${ico(icon)}<span>${label}</span></a>`).join('')}</nav><div class="sidebar-note"><span class="little-sprig">${ico('bowl')}</span><strong>好好吃饭，好好生活。</strong><p>菜谱、菜单、冰箱和热量，<br>都在这里慢慢积累。</p></div><div class="sidebar-bottom"><span class="avatar">我</span><div>本地保存<small>数据仅存于当前浏览器</small></div><span class="status-dot"></span></div></aside>
<div class="workspace"><header class="topbar"><div class="breadcrumb">我的厨房 <span>/</span> ${TITLES[r]}</div><div class="top-actions"><button class="text-button" id="notify">${ico('bell',15)}${prepBellCount()?`<span class="bell-badge">${prepBellCount()}</span>`:''} 提醒</button><span class="top-divider"></span><button class="text-button" id="cats">${ico('settings',15)} 分类</button><span class="top-divider"></span><button class="text-button" id="cloud">${ico('cloud',15)} 云同步</button><span class="top-divider"></span><button class="text-button" id="import">导入备份</button><span class="top-divider"></span><button class="text-button" id="export">导出备份</button></div></header><main id="view"></main></div>`;
bindTopbar();
fillView(document.querySelector('#view'),r)}

function prepBellCount(){return prepUpcoming(2).length}

window.addEventListener('hashchange',renderView);
onChange(renderView);
(async()=>{
  try{const{moved,compressed}=await hydrateImages(S);if(moved||compressed){if(persist()){if(compressed)toast('已压缩 '+compressed+' 张旧配图，节省存储空间');sync.onLocalChange()}}}catch{}
  renderApp();
  notifyExpiring();
  notifyPrep();
  sync.start();
  store_onLocalChange(()=>sync.onLocalChange());
  setInterval(()=>{notifyPrep();dailyReminderCheck();morningDefrostCheck();notifyExpiring()},60000);
})();
