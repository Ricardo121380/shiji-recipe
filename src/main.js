import{S,update,onChange,today,expiringItems,daysUntil,pruneLog}from'./store.js';
import{ico,esc}from'./ui.js';
import{render as renderRecipes,setType}from'./recipes.js';
import{renderWeek,renderFridge,renderShopping,notifyExpiring,requestNotify}from'./kitchen.js';
import{renderDining,renderJournal,renderHealth,renderRecommend}from'./life.js';
import{openCategoryEditor}from'./settings.js';

const NAV=[['#/recipes','book','菜谱'],['#/week','calendar','本周菜单'],['#/fridge','fridge','冰箱'],['#/dining','utensils','外出就餐'],['#/shopping','cart','购买清单'],['#/journal','grid','吃过记录'],['#/health','flame','热量'],['#/recommend','sparkle','今天吃什么']];

function route(){const h=location.hash||'#/recipes';return NAV.some(n=>n[0]===h)?h:'#/recipes'}

function exportBackup(){const blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),state:S},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`食记-备份-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

function renderApp(){const r=route();const exp=expiringItems();const bell=exp.length?exp.filter(p=>daysUntil(p.expiryDate)<=2).length:0;
document.querySelector('#app').innerHTML=`
<aside class="sidebar"><a class="brand" href="#/recipes"><span class="brand-symbol">${ico('leaf',27)}</span><span>食记<span class="brand-en">SHIJI / KITCHEN COMPANION</span></span></a><div class="space-label">我的厨房</div><nav>${NAV.map(([h,icon,label])=>`<a class="nav-item ${r===h?'active':''}" href="${h}">${ico(icon)}<span>${label}</span>${h==='#/fridge'&&exp.length?`<span class="count warn">${exp.length}</span>`:''}</a>`).join('')}</nav><div class="sidebar-note"><span class="little-sprig">${ico('leaf')}</span><strong>好好吃饭，好好生活。</strong><p>菜谱、菜单、冰箱和热量，<br>都在这里慢慢积累。</p></div><div class="sidebar-bottom"><span class="avatar">我</span><div>本地保存<small>数据仅存于当前浏览器</small></div><span class="status-dot"></span></div></aside>
<div class="workspace"><header class="topbar"><div class="breadcrumb">我的厨房 <span>/</span> ${NAV.find(n=>n[0]===r)[2]}</div><div class="top-actions"><button class="text-button" id="notify">${ico('bell',15)}${bell?`<span class="bell-badge">${bell}</span>`:''} 提醒</button><span class="top-divider"></span><button class="text-button" id="cats">${ico('settings',15)} 分类</button><span class="top-divider"></span><button class="text-button" id="export">导出备份</button></div></header><main id="view"></main></div>`;
const view=document.querySelector('#view');
if(r==='#/recipes')renderRecipes(view,()=>{});
else if(r==='#/week')renderWeek(view);
else if(r==='#/fridge')renderFridge(view);
else if(r==='#/dining')renderDining(view);
else if(r==='#/shopping')renderShopping(view);
else if(r==='#/journal')renderJournal(view);
else if(r==='#/health')renderHealth(view);
else if(r==='#/recommend')renderRecommend(view);
document.querySelector('#export').onclick=exportBackup;
document.querySelector('#cats').onclick=()=>openCategoryEditor(()=>renderApp());
document.querySelector('#notify').onclick=()=>{requestNotify();const p='Notification'in window?Notification.permission:'na';if(p==='granted'){location.hash='#/fridge';renderApp()}else if(p==='denied'){alert('浏览器通知已被拒绝。可以在浏览器地址栏的站点设置里重新允许，或直接看「冰箱」页的预警横幅。')}else{location.hash='#/fridge';renderApp()}}}

window.addEventListener('hashchange',renderApp);
onChange(renderApp);
pruneLog();
renderApp();
notifyExpiring();
if('Notification'in window&&Notification.permission==='default')setTimeout(()=>{if(confirm('想让食记在食材快过期时弹窗提醒吗？'))requestNotify()},1500);
