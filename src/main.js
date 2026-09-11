import{S,today,addDays,MEALS,fmtDate,daysUntil,onChange,persist,normalizeImport,toast,prepItemsFor,prepUpcoming,onLocalChange as store_onLocalChange,defrostItemsFor,defrostNames}from'./store.js';
import{ico,esc}from'./ui.js';
import{hydrateImages,cloneWithInlineImages,canonicalizeImages}from'./images.js';
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

let syncUi=0;
let syncPanel='home';
function accountBadge(){
  const u=sync.getUser();
  if(u)return `<span class="avatar">${esc(u.slice(0,1).toUpperCase())}</span><div>${esc(u)}<small>已登录 · 云端同步</small></div><span class="status-dot on"></span>`;
  if(sync.getCode())return `<span class="avatar">码</span><div>同步码<small>已绑定 ····${esc(sync.getCode().slice(-4))}</small></div><span class="status-dot on"></span>`;
  return `<span class="avatar">我</span><div>本地保存<small>数据仅存于当前浏览器</small></div><span class="status-dot"></span>`;
}
function syncShell(title,body,left,right){
  return `<div class="editor"><div class="modal-heading"><div><span class="eyebrow">CLOUD SYNC</span><h2>${title}</h2></div><button type="button" class="icon-button" data-close aria-label="关闭">${ico('close')}</button></div><div class="editor-content">${body}</div><div class="modal-footer">${left}<div>${right}</div></div></div>`;
}
function syncStats(){
  return `<p>本机：<strong>${S.recipes.length}</strong> 道菜谱 · 云端：<strong>${sync.lastCloudRecipes()}</strong> 道菜谱<br>云端最后更新：${sync.lastCloudAt()||'尚无'}<br>本地上次同步：${sync.lastSyncAt()||'尚无'}</p><p class="muted">${esc(sync.lastPlanHint()||'正在查看云端状态…')}</p><label class="prep-line"><input type="checkbox" id="sync-pause" ${sync.isPaused()?'checked':''}> 暂停自动备份（改动只保留在本机）</label><p class="muted">请自己选择方向：<strong>上传</strong>按本机记录更新云端（本机删掉的菜谱和未再引用的配图会从云端清掉），<strong>下载</strong>用云端覆盖本机，两边不会合并。打开本面板只查看、不改数据。后台自动备份只会在云端没有更新时上传本机改动，不会自动下载覆盖本机。</p>`;
}
function authTabs(cur){
  return `<div class="type-tabs auth-tabs" role="tablist"><button type="button" data-auth="login"${cur==='login'?' class="chosen"':''}>登录</button><button type="button" data-auth="register"${cur==='register'?' class="chosen"':''}>注册</button></div>`;
}
function showSync(refresh=true){
  const dlg=document.querySelector('#dialog-root');
  const ui=++syncUi;
  const logged=sync.isLoggedIn();
  let view=syncPanel;
  if(view==='home'){
    if(logged)view='account';
    else if(sync.getCode())view='codebound';
    else view='login';
  }
  if(view==='account'){
    dlg.innerHTML=syncShell('云端同步',`<p style="margin-top:0">账号：<strong>${esc(sync.getUser())}</strong></p>${syncStats()}`,`<button type="button" class="danger-button" id="sync-logout">退出登录</button>`,`<button type="button" class="secondary" id="sync-pull">下载到本机</button><button type="button" class="primary" id="sync-push">上传到云端</button>`);
  }else if(view==='codebound'){
    dlg.innerHTML=syncShell('云端同步',`<p style="margin-top:0">同步码：<strong>······${esc(sync.getCode().slice(-4))}</strong>（完整码仅存于各设备浏览器）</p>${syncStats()}<p class="muted">可以把这份同步码升级成账号，之后用用户名密码登录，不必再记同步码。升级后其他设备需登录同一账号。</p>`,`<button type="button" class="danger-button" id="sync-unbind">${ico('trash',14)} 解除绑定</button>`,`<button type="button" class="secondary" id="sync-upgrade">升级为账号</button><button type="button" class="secondary" id="sync-pull">下载到本机</button><button type="button" class="primary" id="sync-push">上传到云端</button>`);
  }else if(view==='code'){
    dlg.innerHTML=syncShell('同步码',`<p style="margin-top:0">绑定同步码后，其他设备输入同一个码即可互通。更推荐使用账号登录。</p><label class="field">同步码 <span class="optional">建议使用生成的随机码，切勿使用简单词</span><input id="sync-code" maxlength="48" placeholder="例如：fanfun-8f3k2m9x" autocomplete="off"></label><p class="muted">同步码是数据的唯一凭证，请勿泄露。已升级为账号的同步码无法再用码访问，需登录。</p><p class="auth-alt"><button type="button" class="text-button" id="to-account">返回账号登录</button></p>`,`<span></span>`,`<button type="button" class="secondary" id="gen-code">生成随机码</button><button type="button" class="primary" id="bind-go">绑定</button>`);
  }else if(view==='register'){
    const claim=!!sync.getCode()&&!logged;
    dlg.innerHTML=`<form id="auth-form" class="editor"><div class="modal-heading"><div><span class="eyebrow">CLOUD SYNC</span><h2>注册账号</h2></div><button type="button" class="icon-button" data-close aria-label="关闭">${ico('close')}</button></div><div class="editor-content">${authTabs('register')}<p style="margin-top:0">注册后，菜谱、菜单、冰箱等会存在你自己的云端空间。用户名为 3–24 位小写字母和数字，需以字母开头。</p><label class="field">用户名 <span class="optional">3–24 位，字母开头</span><input id="auth-user" name="username" maxlength="24" autocomplete="username" placeholder="例如：xiaoming" required></label><label class="field">密码 <span class="optional">至少 8 位</span><input id="auth-pass" name="password" type="password" maxlength="128" autocomplete="new-password" required></label><label class="field">确认密码<input id="auth-pass2" type="password" maxlength="128" autocomplete="new-password" required></label>${claim?`<p class="muted">将把当前同步码升级到此账号。升级后需用账号登录才能同步。</p>`:''}<p class="muted">本机数据不会因为注册而清空。登录后请选择上传或下载。</p><p class="auth-alt">${claim?`<button type="button" class="text-button" id="to-bound">返回同步</button>`:`<button type="button" class="text-button" id="to-code">使用同步码</button>`}</p></div><div class="modal-footer"><span></span><div><button type="submit" class="primary" id="auth-go">注册并登录</button></div></div></form>`;
  }else{
    dlg.innerHTML=`<form id="auth-form" class="editor"><div class="modal-heading"><div><span class="eyebrow">CLOUD SYNC</span><h2>登录账号</h2></div><button type="button" class="icon-button" data-close aria-label="关闭">${ico('close')}</button></div><div class="editor-content">${authTabs('login')}<p style="margin-top:0">用账号登录后，各设备的数据按你的账号隔离。上传按本机更新云端，下载用云端覆盖本机。</p><label class="field">用户名<input id="auth-user" name="username" maxlength="24" autocomplete="username" placeholder="小写字母和数字" required></label><label class="field">密码<input id="auth-pass" name="password" type="password" maxlength="128" autocomplete="current-password" required></label><p class="muted">没有账号？点上方「注册」。数据默认只保存在本机浏览器。</p><p class="auth-alt"><button type="button" class="text-button" id="to-code">使用同步码</button></p></div><div class="modal-footer"><span></span><div><button type="submit" class="primary" id="auth-go">登录</button></div></div></form>`;
  }
  if(!dlg.open)dlg.showModal();
  const refreshPanel=()=>{if(!dlg.open)return;sync.inspect().then(()=>{if(ui!==syncUi)return;if(dlg.querySelector('#sync-push')&&dlg.open)showSync(false)}).catch(e=>{if(ui!==syncUi)return;toast(e&&e.message?e.message:'无法查看云端');if(/升级为账号/.test(String(e&&e.message||''))){syncPanel='login';showSync(false)}else if(!sync.isLoggedIn()&&dlg.querySelector('#sync-logout')){syncPanel='home';showSync(false)}})};
  dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close());
  dlg.querySelectorAll('[data-auth]').forEach(b=>b.addEventListener('click',()=>{syncPanel=b.getAttribute('data-auth');showSync(false)}));
  dlg.querySelector('#to-account')?.addEventListener('click',()=>{syncPanel='login';showSync(false)});
  dlg.querySelector('#to-code')?.addEventListener('click',()=>{syncPanel='code';showSync(false)});
  dlg.querySelector('#to-bound')?.addEventListener('click',()=>{syncPanel='home';showSync(false)});
  dlg.querySelector('#sync-upgrade')?.addEventListener('click',()=>{syncPanel='register';showSync(false)});
  dlg.querySelector('#gen-code')?.addEventListener('click',()=>{dlg.querySelector('#sync-code').value=sync.generateCode()});
  dlg.querySelector('#bind-go')?.addEventListener('click',()=>{try{sync.bindCode(dlg.querySelector('#sync-code').value)}catch(e){toast(e.message);return}syncPanel='home';dlg.close();toast('同步码已绑定');sync.afterBind().then(()=>{renderApp();showSync(false)})});
  dlg.querySelector('#sync-push')?.addEventListener('click',()=>{syncUi++;sync.pushNow().then(()=>{renderApp();if(sync.isBound())showSync(false)})});
  dlg.querySelector('#sync-pull')?.addEventListener('click',()=>{syncUi++;sync.pullNow().then(()=>{renderApp();if(sync.isBound())showSync(false)})});
  dlg.querySelector('#sync-pause')?.addEventListener('change',e=>{sync.setPaused(e.target.checked);renderApp()});
  dlg.querySelector('#sync-unbind')?.addEventListener('click',()=>{if(confirm('解除绑定后本机不再自动同步（数据保留在本机）。确定？')){sync.unbind();syncPanel='home';dlg.close();renderApp()}});
  dlg.querySelector('#sync-logout')?.addEventListener('click',()=>{if(confirm('退出登录后本机不再自动同步（数据保留在本机）。确定？')){sync.logout().then(()=>{syncPanel='home';dlg.close();renderApp();toast('已退出登录')})}});
  const userInp=dlg.querySelector('#auth-user');
  userInp?.addEventListener('input',()=>{userInp.value=userInp.value.toLowerCase().replace(/[^a-z0-9]/g,'')});
  dlg.querySelector('#auth-form')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const username=(dlg.querySelector('#auth-user')?.value||'').trim().toLowerCase();
    const password=dlg.querySelector('#auth-pass')?.value||'';
    const pass2=dlg.querySelector('#auth-pass2')?.value;
    const go=dlg.querySelector('#auth-go');
    if(!/^[a-z][a-z0-9]{2,23}$/.test(username)){toast('用户名为 3-24 位，需以字母开头，只能含小写字母和数字');return}
    if(password.length<8){toast('密码至少 8 位');return}
    if(pass2!=null&&password!==pass2){toast('两次输入的密码不一致');return}
    if(go)go.disabled=true;
    try{
      if(view==='register'){
        const claim=!!sync.getCode()&&!sync.isLoggedIn();
        await sync.register(username,password,claim?sync.getCode():'');
        toast(claim?'账号已创建，同步码已升级到此账号':'账号已创建');
      }else{
        await sync.login(username,password);
        toast('已登录 '+username);
      }
      syncPanel='home';
      dlg.close();
      renderApp();
      await sync.afterBind();
      renderApp();
      showSync(false);
    }catch(err){toast(err&&err.message?err.message:(view==='register'?'注册失败':'登录失败'))}
    finally{if(go)go.disabled=false}
  });
  if((view==='account'||view==='codebound')&&refresh)refreshPanel();
}

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
(document.querySelector('#cloud')??document.createElement('button')).onclick=()=>{syncPanel='home';showSync()};
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
<aside class="sidebar"><a class="brand" href="#/recipes"><span class="brand-symbol">${ico('bowl',26)}</span><span>饭Fun<span class="brand-en">好好吃饭小助手</span></span></a><div class="space-label">我的厨房</div><nav>${NAV.map(([h,icon,label])=>`<a class="nav-item ${r===h?'active':''}" href="${h}">${ico(icon)}<span>${label}</span></a>`).join('')}</nav><div class="sidebar-note"><span class="little-sprig">${ico('bowl')}</span><strong>好好吃饭，好好生活。</strong><p>菜谱、菜单、冰箱和热量，<br>都在这里慢慢积累。</p></div><div class="sidebar-bottom">${accountBadge()}</div></aside>
<div class="workspace"><header class="topbar"><div class="breadcrumb">我的厨房 <span>/</span> ${TITLES[r]}</div><div class="top-actions"><button class="text-button" id="notify">${ico('bell',15)}${prepBellCount()?`<span class="bell-badge">${prepBellCount()}</span>`:''} 提醒</button><span class="top-divider"></span><button class="text-button" id="cats">${ico('settings',15)} 分类</button><span class="top-divider"></span><button class="text-button" id="cloud">${ico('cloud',15)} 云同步</button><span class="top-divider"></span><button class="text-button" id="import">导入<span class="wide-only">备份</span></button><span class="top-divider"></span><button class="text-button" id="export">导出<span class="wide-only">备份</span></button></div></header><main id="view"></main></div>`;
bindTopbar();
fillView(document.querySelector('#view'),r)}

function prepBellCount(){return prepUpcoming(2).length}

window.addEventListener('hashchange',renderView);
onChange(renderView);
(async()=>{
  try{const{moved,compressed}=await hydrateImages(S);const hashed=await canonicalizeImages(S);if(moved||compressed||hashed){if(persist()){if(compressed)toast('已压缩 '+compressed+' 张旧配图，节省存储空间');if(moved||hashed)sync.onLocalChange()}}}catch{}
  renderApp();
  notifyExpiring();
  notifyPrep();
  sync.start();
  store_onLocalChange(()=>sync.onLocalChange());
  setInterval(()=>{notifyPrep();dailyReminderCheck();morningDefrostCheck();notifyExpiring()},60000);
})();
