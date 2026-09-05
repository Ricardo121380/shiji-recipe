import{S,today,addDays,MEALS,fmtDate,onChange,pruneLog,persist,normalizeImport,toast,prepItemsFor,prepUpcoming}from'./store.js';
import{ico,esc}from'./ui.js';
import{render as renderRecipes,setType}from'./recipes.js';
import{renderWeek,renderFridge,renderShopping,renderDaily,notifyExpiring,notifyPrep,requestNotify}from'./kitchen.js';
import{renderDining,renderJournal,renderHealth,renderRecommend}from'./life.js';
import{openSettings}from'./settings.js';

const NAV=[['#/recipes','book','菜谱'],['#/dining','utensils','外出就餐'],['#/week','calendar','本周菜单'],['#/fridge','fridge','冰箱'],['#/shopping','cart','购买清单'],['#/health','flame','热量记录'],['#/recommend','sparkle','菜品推荐'],['#/journal','grid','就餐记录'],['#/daily','grid','日用品库存']];
const TITLES=Object.fromEntries(NAV.map(([h,,l])=>[h,l]));

function route(){const h=location.hash||'#/recipes';return NAV.some(n=>n[0]===h)?h:'#/recipes'}

function exportBackup(){const blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),state:S},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`食记-备份-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

function importBackup(){const inp=document.createElement('input');inp.type='file';inp.accept='application/json,.json';inp.onchange=async()=>{const f=inp.files[0];if(!f)return;try{const next=normalizeImport(JSON.parse(await f.text()));if(!next){toast('备份文件格式不正确，未导入');return}if(!window.confirm(`导入将覆盖当前的全部数据（共 ${next.recipes.length} 条菜谱记录）。确定继续？`))return;Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,next);if(persist()){toast('备份已导入')}else toast('导入失败：浏览器空间不足')}catch{toast('读取备份失败，请确认选择的是 JSON 备份文件')}};inp.click()}

function showReminders(){const dlg=document.querySelector('#dialog-root');const list=prepUpcoming(7);
dlg.innerHTML=`<div class="editor"><div class="modal-heading"><div><span class="eyebrow">GET READY</span><h2>提前准备提醒</h2></div><button class="icon-button" data-close aria-label="关闭">${ico('close')}</button></div><div class="editor-content"><p class="muted" style="margin-top:0">有「需要提前准备」步骤的菜品，会在就餐前一天 18:00 发送通知；菜品勾选「已吃」后自动从这里移除。</p><div class="journal-list" style="margin-top:14px">${list.map(({date,meal,item})=>{const r=(item.refType==='dining'?null:S.recipes.find(x=>x.id===item.refId));const prep=(r?.steps||[]).filter(s=>s.prep).map(s=>s.text);return`<div class="journal-day"><header><strong>${fmtDate(date)} 周${'日一二三四五六'[new Date(date+'T00:00:00').getDay()]} · ${MEALS.find(m=>m[0]===meal)[1]}</strong><span>${date===addDays(today(),1)?'明天':date===today()?'今天':''}</span></header><span class="journal-item"><em>${esc(item.name)}${item.qty>1?` ×${item.qty}`:''}</em>${esc(prep[0]||'需要提前准备')}</span></div>`}).join('')||`<div class="empty"><div>${ico('bell')}</div><h3>近 7 天没有备菜提醒</h3><p>点菜后，含「提前准备」步骤的菜品会出现在这里。</p></div>`}</div></div><div class="modal-footer"><span></span><div><button class="secondary" data-close>关闭</button></div></div></div>`;dlg.showModal();
dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close())}

function renderApp(){const r=route();
document.querySelector('#app').innerHTML=`
<aside class="sidebar"><a class="brand" href="#/recipes"><span class="brand-symbol">${ico('leaf',27)}</span><span>食记<span class="brand-en">SHIJI / KITCHEN COMPANION</span></span></a><div class="space-label">我的厨房</div><nav>${NAV.map(([h,icon,label])=>`<a class="nav-item ${r===h?'active':''}" href="${h}">${ico(icon)}<span>${label}</span></a>`).join('')}</nav><div class="sidebar-note"><span class="little-sprig">${ico('leaf')}</span><strong>好好吃饭，好好生活。</strong><p>菜谱、菜单、冰箱和热量，<br>都在这里慢慢积累。</p></div><div class="sidebar-bottom"><span class="avatar">我</span><div>本地保存<small>数据仅存于当前浏览器</small></div><span class="status-dot"></span></div></aside>
<div class="workspace"><header class="topbar"><div class="breadcrumb">我的厨房 <span>/</span> ${TITLES[r]}</div><div class="top-actions"><button class="text-button" id="notify">${ico('bell',15)}${prepBellCount()?`<span class="bell-badge">${prepBellCount()}</span>`:''} 提醒</button><span class="top-divider"></span><button class="text-button" id="cats">${ico('settings',15)} 分类</button><span class="top-divider"></span><button class="text-button" id="import">导入备份</button><span class="top-divider"></span><button class="text-button" id="export">导出备份</button></div></header><main id="view"></main></div>`;
const view=document.querySelector('#view');
if(r==='#/recipes')renderRecipes(view);
else if(r==='#/week')renderWeek(view);
else if(r==='#/fridge')renderFridge(view);
else if(r==='#/dining')renderDining(view);
else if(r==='#/shopping')renderShopping(view);
else if(r==='#/journal')renderJournal(view);
else if(r==='#/health')renderHealth(view);
else if(r==='#/recommend')renderRecommend(view);
else if(r==='#/daily')renderDaily(view);
document.querySelector('#export').onclick=exportBackup;
document.querySelector('#import').onclick=importBackup;
document.querySelector('#cats').onclick=()=>openSettings();
document.querySelector('#notify').onclick=()=>{showReminders();requestNotify()}}

function prepBellCount(){return prepUpcoming(2).length}

window.addEventListener('hashchange',renderApp);
onChange(renderApp);
pruneLog();
renderApp();
notifyExpiring();
notifyPrep();
setInterval(()=>{notifyPrep();notifyExpiring()},60000);
if('Notification'in window&&Notification.permission==='default')setTimeout(()=>{if(confirm('想让食记在食材临期、需要提前备菜时弹窗提醒吗？'))requestNotify()},1500);
