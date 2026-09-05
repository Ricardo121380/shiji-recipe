// 设置：菜单分类（四组）+ 规格分类（口味/忌口等，可自定义组与选项）
import{S,update,uid,toast}from'./store.js';
import{ico,esc}from'./ui.js';

const GROUPS=[['dish','烹饪菜分类'],['snack','零食速食分类'],['fridge','冰箱分类'],['dining','外出就餐分类'],['daily','日用品分类']];

export function openSettings(onDone){const dlg=document.querySelector('#dialog-root');
const catSection=GROUPS.map(([key,label])=>`<div class="field"><span class="cat-label">${label}</span><div class="cat-list" data-group="${key}">${S.cats[key].map((c,i)=>`<span class="cat-chip"><input value="${esc(c)}" data-i="${i}" aria-label="重命名分类 ${esc(c)}"><button class="icon-button cat-remove" data-i="${i}" aria-label="删除分类 ${esc(c)}">${ico('close',12)}</button></span>`).join('')}<span class="cat-chip cat-add"><input placeholder="新增分类" aria-label="新增分类"><button class="icon-button" data-add aria-label="添加分类">${ico('plus',13)}</button></span></div></div>`).join('');
dlg.innerHTML=`<div class="editor"><div class="modal-heading"><div><span class="eyebrow">MAKE IT YOURS</span><h2>分类管理</h2></div><button class="icon-button" data-close aria-label="关闭">${ico('close')}</button></div><div class="editor-content">${catSection}<p class="muted">删除分类/规格不会删除内容本身；改名会同步更新所有使用它的记录。</p></div><div class="modal-footer"><span></span><div><button class="secondary" data-close>关闭</button></div></div></div>`;
dlg.showModal();
dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{dlg.close();onDone?.()});
// —— 菜单分类编辑 ——
dlg.querySelectorAll('.cat-list[data-group]').forEach(list=>{const key=list.dataset.group;
list.querySelectorAll('.cat-chip input').forEach(inp=>{if(inp.closest('.cat-add'))return;inp.onchange=()=>{const i=Number(inp.dataset.i);const old=S.cats[key][i];const nv=inp.value.trim();if(!nv||nv===old)return;update(()=>{S.cats[key]=S.cats[key].map((c,j)=>j===i?nv:c);if(key==='dish'||key==='snack')S.recipes.forEach(r=>{if(r.type===key&&r.category===old)r.category=nv});if(key==='fridge')S.pantry.forEach(p=>{if(p.category===old)p.category=nv});if(key==='dining')S.dining.forEach(d=>{if(d.category===old)d.category=nv});if(key==='daily')S.daily.forEach(d=>{if(d.category===old)d.category=nv});S.shopping.forEach(s=>{if(s.category===old)s.category=nv})});toast('分类已重命名')}});
list.querySelectorAll('.cat-remove').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.i);if(S.cats[key].length<=1){toast('至少保留一个分类');return}update(()=>{const old=S.cats[key][i];S.cats[key]=S.cats[key].filter((_,j)=>j!==i);const first=S.cats[key][0];if(key==='dish'||key==='snack')S.recipes.forEach(r=>{if(r.type===key&&r.category===old)r.category=first});if(key==='fridge')S.pantry.forEach(p=>{if(p.category===old)p.category=first});if(key==='dining')S.dining.forEach(d=>{if(d.category===old)d.category=first});if(key==='daily')S.daily.forEach(d=>{if(d.category===old)d.category=first});S.shopping.forEach(s=>{if(s.category===old)s.category=first})});openSettings(onDone);toast('分类已删除')});
(list.querySelector('[data-add]')??document.createElement('button')).onclick=()=>{const inp=list.querySelector('.cat-add input');const nv=inp.value.trim();if(!nv)return;if(S.cats[key].includes(nv)){toast('分类已存在');return}update(()=>S.cats[key].push(nv));openSettings(onDone)}});

}