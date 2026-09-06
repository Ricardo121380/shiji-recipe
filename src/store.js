// 食记数据层：单一状态对象 + localStorage 持久化 + 兼容迁移
const KEY='shiji-state-v2', OLD_KEY='shiji-recipes-v1';
export const MEALS=[['breakfast','早餐'],['lunch','午餐'],['dinner','晚餐'],['extra','加餐']];
export const PET={ok:'能吃',care:'谨慎',no:'不能',na:'—'};
export const EXPIRY_FILTERS=[['all','全部'],['fresh','新鲜（>7天）'],['soon','快过期（1-7天）'],['expired','已过期']];
export const dstr=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const today=()=>dstr(new Date());
export const addDays=(s,n)=>{const[y,m,d]=s.split('-').map(Number);return dstr(new Date(y,m-1,d+n))};
export const mondayOf=s=>{const[y,m,d]=s.split('-').map(Number);const dt=new Date(y,m-1,d);return addDays(s,(dt.getDay()+6)%7*-1)};
export const monthOf=s=>s.slice(0,7);
export const fmtDate=s=>`${Number(s.slice(5,7))}月${Number(s.slice(8,10))}日`;
export const weekday=s=>'日一二三四五六'[new Date(s+'T00:00:00').getDay()];
export const daysUntil=exp=>Math.round((Date.parse(exp+'T00:00:00')-Date.parse(today()+'T00:00:00'))/86400000);
export const fmtTime=r=>{const h=Number(r.hours)||0,m=Number(r.minutes)||0;if(h&&m)return`${h}小时${m}分钟`;if(h)return`${h}小时`;return`${m||0}分钟`};
export const uid=()=>crypto.randomUUID();
const norm=s=>String(s||'').replace(/[\s，。、,]/g,'').toLowerCase();
export const nameMatch=(a,b)=>{a=norm(a);b=norm(b);return a.length>1&&b.length>1&&(a===b||a.includes(b)||b.includes(a))};
export const parseAmount=n=>{const m=String(n||'').trim().match(/^(\d+(?:\.\d+)?)/);return m?Number(m[1]):null};
export function parseAmountInfo(n){const m=String(n||'').trim().match(/^(\d+(?:\.\d+)?)\s*([^\d\s].*)?$/);return m?{num:Number(m[1]),unit:(m[2]||'').trim()}:null}
const unitMatch=(a,b)=>{a=norm(a);b=norm(b);return!!a&&!!b&&(a===b||a.includes(b)||b.includes(a))};

const seedPhoto=id=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;

function seedState(){const t=today();
const dish=(n,cat,h,mi,serv,desc,img,ings,steps,fav,cal,specs=[],prep=false,defrost=false)=>({id:uid(),type:'dish',name:n,category:cat,hours:h,minutes:mi,servings:serv,calories:cal,description:desc,image:img,ingredients:ings,steps:steps.map(s=>({text:s,image:''})),favorite:fav,specs,prep,defrost});
return {
recipes:[
dish('番茄罗勒意面','主食',0,25,2,'酸甜的番茄遇上新鲜罗勒。',seedPhoto('photo-1473093226795-af9932fe5856'),[{name:'意大利面',amount:'200g',role:'main'},{name:'樱桃番茄',amount:'200g',role:'main'},{name:'新鲜罗勒',amount:'适量',role:'side'},{name:'大蒜',amount:'3瓣',role:'side'},{name:'橄榄油',amount:'2勺',role:'season'},{name:'盐',amount:'适量',role:'season'}],['锅中加入足量清水和一小勺盐，煮沸后放入意大利面，按包装时间煮至自己喜欢的软硬度。留半碗煮面水备用。','番茄洗净对半切，大蒜切片。平底锅倒入橄榄油，小火炒香蒜片，加入番茄翻炒至变软出汁。','加入意面和少量煮面水，翻拌均匀。用盐和黑胡椒调味，最后放入新鲜罗勒，装盘即可。'],true,520,[{name:'口味',options:['清淡','微辣','中辣'],enabled:true}]),
dish('牛油果鲜虾沙拉','轻食',0,15,1,'一碗清爽，也是一份认真照顾自己的心意。',seedPhoto('photo-1512621776951-a57141f2eefd'),[{name:'牛油果',amount:'1个',role:'main'},{name:'虾仁',amount:'100g',role:'main'},{name:'生菜',amount:'适量',role:'side'},{name:'小番茄',amount:'6个',role:'side'},{name:'柠檬',amount:'半个',role:'season'}],['洗净蔬菜并沥干，牛油果切片，小番茄对半切。','虾仁煮熟，和蔬菜放入碗中。','加入橄榄油、柠檬汁和少许盐，轻轻拌匀。'],false,320,[{name:'忌口',options:['无海鲜','无花生'],enabled:true}]),
dish('香煎三文鱼','家常菜',0,20,2,'外皮微脆，内里柔嫩。',seedPhoto('photo-1467003909585-2f8a72700288'),[{name:'三文鱼',amount:'300g',role:'main'},{name:'柠檬',amount:'半个',role:'season'},{name:'芦笋',amount:'6根',role:'side'},{name:'盐',amount:'适量',role:'season'}],['三文鱼擦干水分，两面撒盐和黑胡椒。','平底锅加油，鱼皮朝下煎至金黄，翻面继续煎熟。','芦笋煎熟配在旁边，挤上柠檬汁。'],true,410,[],true,true),
dish('周末松饼','烘焙甜点',0,30,2,'慢一点的早晨。',seedPhoto('photo-1528207776546-365bb710ee93'),[{name:'低筋面粉',amount:'150g',role:'main'},{name:'鸡蛋',amount:'1个',role:'main'},{name:'牛奶',amount:'150ml',role:'main'},{name:'泡打粉',amount:'4g',role:'season'},{name:'蜂蜜',amount:'适量',role:'side'}],['面粉、泡打粉过筛，与鸡蛋和牛奶混合成面糊。','不粘锅小火预热，倒入面糊，表面冒泡后翻面。','煎至两面金黄，搭配水果和蜂蜜。'],false,380),
{...dish('酸奶水果杯','零食',0,5,1,'五分钟搞定的下午加餐。',seedPhoto('photo-1488477181946-6428a0291777'),[{name:'酸奶',amount:'1杯',role:'main'},{name:'香蕉',amount:'1根',role:'main'},{name:'燕麦脆',amount:'适量',role:'side'}],['香蕉切片，与酸奶分层装入杯中。','撒上燕麦脆即可。'],false,180),type:'snack'},
{...dish('即食鸡胸肉','速食',0,2,1,'开袋即食的蛋白质补充。','',[{name:'鸡胸肉',amount:'1袋'}],['微波加热 30 秒口感更好。'],false,150,[{name:'口味',options:['原味','黑椒'],enabled:true}]),type:'snack'}],
dining:[{id:uid(),name:'番茄牛腩面',place:'楼下面馆',category:'面食',calories:650,hours:0,minutes:40,servings:1,description:'常点的外卖，汤头浓郁。',image:seedPhoto('photo-1555126634-323283e090fa')},{id:uid(),name:'两荤一素',place:'公司食堂',category:'食堂',calories:700,hours:0,minutes:30,servings:1,description:'工作日午餐主力。',image:''}],
cats:{dish:['家常菜','主食','轻食','汤羹','烘焙甜点','饮品'],snack:['零食','速食','甜品','饮料'],fridge:['蔬菜','肉类','水果','水产','乳制品','主食冻品','蛋奶','其他'],fridgeSnack:['零食饮料','宠物食品','其他'],dining:['面食','火锅','轻食','甜点','饮品','快餐','食堂','其他'],daily:['清洁用品','纸品','厨房用品','洗护','其他']},
pantry:[
{id:uid(),name:'鸡蛋',kind:'ingredient',brand:'',flavor:'',category:'肉类',qty:10,unit:'个',prodDate:addDays(t,-6),expiryDate:addDays(t,14),lowAt:2,petCat:'care',petDog:'ok',keep:'冷藏存放',notes:'煮熟后猫狗都可以少量吃'},
{id:uid(),name:'番茄',kind:'ingredient',brand:'',flavor:'',category:'蔬菜',qty:4,unit:'个',prodDate:addDays(t,-4),expiryDate:addDays(t,1),lowAt:1,petCat:'na',petDog:'na',keep:'室温避光，熟透后冷藏',notes:''},
{id:uid(),name:'牛奶',kind:'ingredient',brand:'',flavor:'',category:'乳制品',qty:1,unit:'盒',prodDate:addDays(t,-3),expiryDate:addDays(t,4),lowAt:1,petCat:'care',petDog:'no',keep:'冷藏',notes:'大部分猫狗乳糖不耐受'},
{id:uid(),name:'鸡胸肉',kind:'ingredient',brand:'',flavor:'',category:'肉类',qty:2,unit:'袋',prodDate:addDays(t,-10),expiryDate:addDays(t,-1),lowAt:1,petCat:'ok',petDog:'ok',keep:'冷冻保存，吃前冷藏解冻',notes:''},
{id:uid(),name:'卤味鸭脖',kind:'snack',brand:'周黑鸭',flavor:'甜辣',category:'零食饮料',qty:2,unit:'盒',prodDate:addDays(t,-2),expiryDate:addDays(t,5),lowAt:1,petCat:'no',petDog:'no',keep:'开袋后冷藏',notes:''},
{id:uid(),name:'猫条',kind:'snack',brand:'伟嘉',flavor:'金枪鱼味',category:'宠物食品',qty:6,unit:'支',prodDate:addDays(t,-20),expiryDate:addDays(t,300),lowAt:2,petCat:'ok',petDog:'care',notes:''}],
pantryHistory:[{name:'鸡蛋',category:'肉类',unit:'个',shelfDays:20,petCat:'care',petDog:'ok',keep:'冷藏存放',notes:'煮熟后猫狗都可以少量吃'},{name:'牛奶',category:'乳制品',unit:'盒',shelfDays:7,petCat:'care',petDog:'no',keep:'冷藏',notes:''},{name:'番茄',category:'蔬菜',unit:'个',shelfDays:5,petCat:'na',petDog:'na',keep:'室温避光',notes:''}],
menu:{},log:{},nutrition:{goal:2000},shopping:[],
daily:[{id:uid(),name:'洗衣液',brand:'蓝月亮',category:'洗护',qty:0.6,unit:'瓶',lowAt:1,notes:''},{id:uid(),name:'厨房纸',category:'纸品',qty:1,unit:'卷',lowAt:2,notes:''},{id:uid(),name:'垃圾袋',category:'清洁用品',qty:10,unit:'只',lowAt:15,notes:''}],
settings:{lastNotify:'',lastPrepNotify:''}};
}

function convertV1Recipes(raw){return raw.map(r=>({id:r.id,type:'dish',name:r.name,category:r.category||'家常菜',hours:Math.floor((r.time||30)/60),minutes:(r.time||30)%60,servings:r.servings||2,calories:null,description:r.description||'',image:r.image||'',ingredients:String(r.ingredients||'').split('\n').filter(x=>x.trim()).map(line=>{const parts=line.trim().split(/\s+/);return{name:parts[0],amount:parts.slice(1).join(' ')}}),steps:(r.steps||[]).map(x=>({text:x,image:'',prep:false})),favorite:!!r.favorite,specGroupIds:[]}))}

function normalizeState(s){const def=seedState();const seeded=!s.settings?.dailySeeded;
if(!Array.isArray(s.daily)||(seeded&&!s.daily.length))s.daily=def.daily;
if(s.settings&&!s.settings.dailySeeded)s.settings.dailySeeded=true;
const legacyGroups=Array.isArray(s.specGroups)?s.specGroups:null;
s.recipes=(s.recipes||[]).map(r=>{
const base={specs:[],prep:false,defrost:false,...r,steps:(r.steps||[]).map(x=>({image:'',...x}))};
base.ingredients=(base.ingredients||[]).map(i=>({role:'main',...i}));
if(!Array.isArray(base.specs)||!base.specs.length){const ids=Array.isArray(r.specGroupIds)?r.specGroupIds:[];if(ids.length&&legacyGroups)base.specs=legacyGroups.filter(g=>ids.includes(g.id)).map(g=>({name:g.name,options:[...g.options],enabled:true}))}
if(!base.prep)base.prep=(r.steps||[]).some(x=>x.prep);
delete base.specGroupIds;
return base});
s.dining=(s.dining||[]).map(d=>({type:'dining',place:'',...d}));
s.pantry=(s.pantry||[]).map(p=>({kind:'ingredient',brand:'',flavor:'',keep:'',...p}));
s.shopping=(s.shopping||[]).map(x=>{const base={category:'',board:'food',...x};if(!x.board&&base.category&&(s.cats?.daily||[]).includes(base.category))base.board='daily';return base});
delete s.specGroups;
for(const k of Object.keys(def))if(s[k]===undefined)s[k]=def[k];
for(const g of Object.keys(def.cats))if(!Array.isArray(s.cats[g])||!s.cats[g].length)s.cats[g]=def.cats[g];
s.menu=s.menu||{};s.log=s.log||{};
for(const d of Object.keys(s.menu))for(const m of Object.keys(s.menu[d]))s.menu[d][m]=(s.menu[d][m]||[]).map(it=>({qty:1,specs:{},note:'',deducted:[],...it}));
return s}

function migrateV1(){try{const raw=JSON.parse(localStorage.getItem(OLD_KEY));if(!Array.isArray(raw))return null;const s=seedState();const t=today();s.recipes=convertV1Recipes(raw);
s.menu={[t]:{dinner:raw.filter(r=>r.menu).map(r=>({refType:'recipe',refId:r.id,name:r.name,done:false,qty:1,specs:{},deducted:[]}))}};return normalizeState(s)}catch{return null}}

export function load(){let raw=null;try{raw=localStorage.getItem(KEY)}catch{}
if(raw){try{const s=JSON.parse(raw);if(Array.isArray(s.recipes)&&Array.isArray(s.pantry))return normalizeState(s)}catch{}}
try{const arr=JSON.parse(localStorage.getItem(OLD_KEY));if(Array.isArray(arr)&&arr.length){const m=migrateV1();if(m){try{localStorage.setItem(KEY,JSON.stringify(m))}catch{};return m}}}catch{}
const n=normalizeState(seedState());try{localStorage.setItem(KEY,JSON.stringify(n))}catch{}
return n}

export function normalizeImport(data){try{
let base=null;
if(Array.isArray(data))base={recipes:convertV1Recipes(data)};
else if(data&&Array.isArray(data.state?.recipes))base=data.state;
else if(data&&Array.isArray(data.recipes)){
if(data.version===1)base={recipes:convertV1Recipes(data.recipes)};
else if(data.cats&&data.pantry)base=data;
else if(data.recipes.every(r=>typeof r.time==='number'))base={recipes:convertV1Recipes(data.recipes)};
}
if(!base||!Array.isArray(base.recipes))return null;
const s=normalizeState({...seedState(),...base});
if(!Array.isArray(s.recipes)||!Array.isArray(s.pantry))return null;
return s}catch{return null}}

export let S=load();
const listeners=new Set();
export function persist(){try{localStorage.setItem(KEY,JSON.stringify(S));return true}catch{toast('保存失败：浏览器空间不足，请清理图片或导出备份。');return false}}
export function update(fn){const backup=JSON.stringify(S);fn();if(persist()){listeners.forEach(f=>f());return true}S=JSON.parse(backup);return false}
export function onChange(fn){listeners.add(fn)}
export function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3000)}

export const findRecipe=id=>S.recipes.find(r=>r.id===id);
export const findDining=id=>S.dining.find(r=>r.id===id);
export const refOf=item=>item.refType==='dining'?findDining(item.refId):findRecipe(item.refId);
export const itemSpecText=item=>Object.entries(item.specs||{}).filter(([,v])=>v).map(([k,v])=>`${k}:${v}`).join(' · ');
export const refHasPrep=r=>!!r&&r.type!=='dining'&&(!!r.prep||(r.steps||[]).some(s=>s.prep));
const DEFROST_KEYS=/肉|鸡|鸭|鹅|牛|羊|猪|鱼|虾|蟹|贝|冻|排|丸|海鲜|内脏/;
export const refNeedsDefrost=r=>!!r&&r.type!=='dining'&&(!!r.defrost||(r.ingredients||[]).some(i=>DEFROST_KEYS.test(i.name)));
export const defrostNames=r=>{const hits=(r?.ingredients||[]).filter(i=>DEFROST_KEYS.test(i.name)).map(i=>i.name);return hits.length?hits:[(r?.ingredients||[])[0]?.name].filter(Boolean)};
export const enabledSpecs=r=>(r?.specs||[]).filter(sp=>sp.enabled&&sp.name&&sp.options?.length);

// —— 冰箱 ——
export function pantryMatches(ingName){return S.pantry.filter(p=>p.kind==='ingredient'&&nameMatch(p.name,ingName))}
export function expiringItems(){return S.pantry.filter(p=>daysUntil(p.expiryDate)<=2).sort((a,b)=>daysUntil(a.expiryDate)-daysUntil(b.expiryDate))}
export function lowPantry(){return S.pantry.filter(p=>p.lowAt&&Number(p.qty)<=Number(p.lowAt))}
export function addPantryHistory(item){const h={name:item.name,category:item.category,unit:item.unit,shelfDays:Math.max(1,daysUntil(item.expiryDate)),petCat:item.petCat,petDog:item.petDog,keep:item.keep||'',notes:item.notes};S.pantryHistory=[h,...(S.pantryHistory||[]).filter(x=>x.name!==item.name)].slice(0,24)}

// 扣减一个食材（按用量与份数），返回扣减记录用于回退
export function deductIngredient(ingName,amount,factor=1){const p=pantryMatches(ingName).find(p=>(Number(p.qty)||0)>0);if(!p)return null;const info=parseAmountInfo(amount);const base=info&&(!info.unit||unitMatch(info.unit,p.unit))?info.num:1;const amt=Math.round(base*factor*10)/10;const before=Number(p.qty)||0;p.qty=Math.max(0,Math.round((before-amt)*10)/10);return{pantryId:p.id,name:p.name,amount:Math.min(before,amt),unit:p.unit}}
export function restoreDeducted(recs){for(const rec of recs||[]){const p=S.pantry.find(x=>x.id===rec.pantryId);if(p)p.qty=Math.round(((Number(p.qty)||0)+rec.amount)*10)/10}}

// —— 周菜单 / 点菜 ——
export function menuItems(date,meal){return(S.menu[date]?.[meal])||[]}
export function addToMenu(date,meal,ref,qty=1,specs={},note=''){if(!S.menu[date])S.menu[date]={};(S.menu[date][meal]=S.menu[date][meal]||[]).push({refType:ref.type==='dining'?'dining':'recipe',refId:ref.id,name:ref.name,done:false,qty,specs,note,deducted:[]})}
export function removeMenuItem(date,meal,idx){const it=menuItems(date,meal)[idx];if(!it)return;
if(it.done){restoreDeducted(it.deducted);it.deducted=[]}
S.menu[date]?.[meal]?.splice(idx,1)}
export function changeItemQty(date,meal,idx,delta){const it=menuItems(date,meal)[idx];if(!it)return;it.qty=Math.max(1,(Number(it.qty)||1)+delta)}

// 勾选「已吃」→ 记录 + 扣库存；取消 → 撤销记录 + 回补库存
export function setItemDone(date,meal,idx,done){const item=menuItems(date,meal)[idx];if(!item||item.done===done)return;const r=refOf(item);
if(done){const recs=[];if(r&&r.type!=='dining')for(const ing of r.ingredients||[]){const rec=deductIngredient(ing.name,ing.amount,item.qty||1);if(rec)recs.push(rec)}
item.done=true;item.deducted=recs}
else{item.done=false;restoreDeducted(item.deducted);item.deducted=[]}}

// —— 提前准备提醒 ——
export function prepItemsFor(date){const out=[];for(const[m]of MEALS)for(const item of menuItems(date,m))if(!item.done&&refHasPrep(refOf(item)))out.push({date,meal:m,item});return out}
export function defrostItemsFor(date){const out=[];for(const[m]of MEALS)for(const item of menuItems(date,m))if(!item.done&&refNeedsDefrost(refOf(item)))out.push({date,meal:m,item});return out}
export function prepUpcoming(days=7){const out=[];for(let i=0;i<days;i++){const d=addDays(today(),i);for(const x of prepItemsFor(d))out.push(x)}return out}

// —— 已吃记录：以本周菜单勾选状态为唯一事实来源，随时刷新 ——
export function derivedLog(){const out={};for(const d of Object.keys(S.menu))for(const m of Object.keys(S.menu[d]))for(const it of S.menu[d][m]){if(!it.done)continue;const r=refOf(it);(out[d]=out[d]||[]).push({meal:m,name:it.name,refId:it.refId,refType:it.refType,calories:Math.round((Number(r?.calories)||0)*(it.qty||1)),qty:it.qty||1,specs:it.specs||{}})}
return out}
export function dayIntake(date){return(derivedLog()[date]||[]).reduce((n,e)=>n+(Number(e.calories)||0),0)}

// —— 购买清单 ——
export function pushToShopping(name,amount='',category='',board='food'){if(S.shopping.some(s=>s.name===name&&s.board===board))return;S.shopping.push({id:uid(),name,amount,checked:false,category,board})}
export function generateShopping(){const start=mondayOf(today());const groups=[];
for(let i=0;i<14;i++){const d=addDays(start,i);for(const[m]of MEALS)for(const item of menuItems(d,m)){if(item.done)continue;const r=refOf(item);if(!r||r.type==='dining')continue;
for(const ing of r.ingredients||[]){const k=ing.name.trim();if(!k)continue;const a=String(ing.amount||'').trim();const info=a?parseAmountInfo(a):null;const pm=pantryMatches(k)[0]?.name||null;
let g=groups.find(g=>g.names.some(n=>nameMatch(n,k)||(n.length>=2&&k.length>=2&&n.slice(-2)===k.slice(-2)))||(pm&&g.pantryNames.some(pn=>nameMatch(pn,k))));
if(!g){g={names:[],pantryNames:[],infos:[],texts:[]};groups.push(g)}
if(!g.names.some(n=>nameMatch(n,k)))g.names.push(k);
if(pm&&!g.pantryNames.some(pn=>nameMatch(pn,k)))g.pantryNames.push(pm);
if(!a)continue;if(info)g.infos.push({...info,factor:item.qty||1});else g.texts.push(a)}}}
return groups.map(g=>{let amount='';
if(g.infos.length){const byUnit={};for(const{num,unit,factor}of g.infos)byUnit[unit||'']=(byUnit[unit||'']||0)+num*factor;const parts=[];for(const[unit,num]of Object.entries(byUnit)){const stock=S.pantry.filter(p=>p.kind==='ingredient'&&nameMatch(p.name,g.names[0])&&(!unit||unitMatch(p.unit,unit))).reduce((n,p)=>n+(Number(p.qty)||0),0);const lack=Math.round((num-stock)*10)/10;parts.push(lack>0?`约差 ${lack}${unit}`:null)}const real=parts.filter(Boolean);if(!real.length)return null;amount=real.join(' + ')}
else if(g.texts.length)amount=g.texts.join(' / ');
else amount='按需购买';
const pm=S.pantry.find(p=>p.kind==='ingredient'&&nameMatch(p.name,g.names[0]));return{name:g.names[0],amount,category:pm?pm.category:'',board:'food'}}).filter(Boolean)}

// —— 随机选菜 ——
export const ING_ROLES={main:'主菜',side:'辅菜',season:'调料'};
export function randomPick(type,category,stock){const pool=S.recipes.filter(r=>r.type===type&&(category==='全部'||r.category===category));
const scored=pool.map(r=>{const ings=r.ingredients||[];const has=i=>pantryMatches(i.name).some(p=>(Number(p.qty)||0)>0);const missing=ings.filter(i=>!has(i));return{r,missing,total:ings.length}});
if(stock==='all')var cand=scored.filter(x=>x.total>0&&x.missing.length===0);
else if(stock==='some')cand=scored.filter(x=>x.missing.length>0&&x.missing.length<x.total);
else cand=scored;
if(!cand.length)return null;const pick=cand[Math.floor(Math.random()*cand.length)];return{r:pick.r,missing:pick.missing}}

// —— 选食材找菜谱：优先包含全部所选，其次部分匹配 ——
export function matchRecipes(selectedIds){const sel=S.pantry.filter(p=>selectedIds.includes(p.id)&&(Number(p.qty)||0)>0);
const scored=S.recipes.map(r=>{const hit=sel.filter(p=>(r.ingredients||[]).some(i=>nameMatch(i.name,p.name)));return{r,hit,all:sel.length>0&&hit.length===sel.length}}).filter(x=>x.hit.length)
.sort((a,b)=>b.hit.length-a.hit.length||Math.min(...a.hit.map(daysUntil))-Math.min(...b.hit.map(daysUntil)));
return{all:scored.filter(x=>x.all),some:scored.filter(x=>!x.all)}}
