// 食记数据层：单一状态对象 + localStorage 持久化 + v1 迁移
const KEY='shiji-state-v2', OLD_KEY='shiji-recipes-v1';
export const MEALS=[['breakfast','早餐'],['lunch','午餐'],['dinner','晚餐'],['extra','加餐']];
export const PET={ok:'能吃',care:'谨慎',no:'不能',na:'—'};
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
function seedState(){const t=today();const base=(n,cat,h,mi,serv,desc,img,ings,steps,fav,cal)=>({id:uid(),type:'dish',name:n,category:cat,hours:h,minutes:mi,servings:serv,calories:cal,description:desc,image:img,ingredients:ings,steps:steps.map(s=>({text:s,image:'',prep:false})),favorite:fav});
return {
recipes:[
base('番茄罗勒意面','主食',0,25,2,'酸甜的番茄遇上新鲜罗勒，把简单的一餐，做得有滋有味。',seedPhoto('photo-1473093226795-af9932fe5856'),[{name:'意大利面',amount:'200g'},{name:'樱桃番茄',amount:'200g'},{name:'新鲜罗勒',amount:'适量'},{name:'大蒜',amount:'3瓣'},{name:'橄榄油',amount:'2勺'},{name:'盐',amount:'适量'}],['锅中加入足量清水和一小勺盐，煮沸后放入意大利面，按包装时间煮至自己喜欢的软硬度。留半碗煮面水备用。','番茄洗净对半切，大蒜切片。平底锅倒入橄榄油，小火炒香蒜片，加入番茄翻炒至变软出汁。','加入意面和少量煮面水，翻拌均匀。用盐和黑胡椒调味，最后放入新鲜罗勒，装盘即可。'],true,520),
base('牛油果鲜虾沙拉','轻食',0,15,1,'一碗清爽，也是一份认真照顾自己的心意。',seedPhoto('photo-1512621776951-a57141f2eefd'),[{name:'牛油果',amount:'1个'},{name:'虾仁',amount:'100g'},{name:'生菜',amount:'适量'},{name:'小番茄',amount:'6个'},{name:'柠檬',amount:'半个'}],['洗净蔬菜并沥干，牛油果切片，小番茄对半切。','虾仁煮熟，和蔬菜放入碗中。','加入橄榄油、柠檬汁和少许盐，轻轻拌匀。'],false,320),
base('香煎三文鱼','家常菜',0,20,2,'外皮微脆，内里柔嫩，简单调味就很美味。',seedPhoto('photo-1467003909585-2f8a72700288'),[{name:'三文鱼',amount:'300g'},{name:'柠檬',amount:'半个'},{name:'芦笋',amount:'6根'},{name:'盐',amount:'适量'}],['三文鱼擦干水分，两面撒盐和黑胡椒。','平底锅加油，鱼皮朝下煎至金黄，翻面继续煎熟。','芦笋煎熟配在旁边，挤上柠檬汁。'],true,410),
base('周末松饼','烘焙甜点',0,30,2,'慢一点的早晨，从一份热乎乎的松饼开始。',seedPhoto('photo-1528207776546-365bb710ee93'),[{name:'低筋面粉',amount:'150g'},{name:'鸡蛋',amount:'1个'},{name:'牛奶',amount:'150ml'},{name:'泡打粉',amount:'4g'},{name:'蜂蜜',amount:'适量'}],['面粉、泡打粉过筛，与鸡蛋和牛奶混合成面糊。','不粘锅小火预热，倒入面糊，表面冒泡后翻面。','煎至两面金黄，搭配水果和蜂蜜。'],false,380),
{...base('酸奶水果杯','零食',0,5,1,'五分钟搞定的下午加餐。',seedPhoto('photo-1488477181946-6428a0291777'),[{name:'酸奶',amount:'1杯'},{name:'香蕉',amount:'1根'},{name:'燕麦脆',amount:'适量'}],['香蕉切片，与酸奶分层装入杯中。','撒上燕麦脆即可。'],false,180),type:'snack'},
{...base('即食鸡胸肉','速食',0,2,1,'开袋即食的蛋白质补充。','',[{name:'鸡胸肉',amount:'1袋'}],['微波加热 30 秒口感更好。'],false,150),type:'snack'}],
dining:[{id:uid(),name:'楼下面馆 · 番茄牛腩面',category:'外卖',calories:650,hours:0,minutes:40,servings:1,description:'常点的外卖，汤头浓郁。',image:seedPhoto('photo-1555126634-323283e090fa')},{id:uid(),name:'公司食堂 · 两荤一素',category:'食堂',calories:700,hours:0,minutes:30,servings:1,description:'工作日午餐主力。',image:''}],
cats:{dish:['家常菜','主食','轻食','汤羹','烘焙甜点','饮品'],snack:['零食','速食','甜品','饮料'],fridge:['蔬菜','水果','肉蛋','乳制品','主食冻品','调味','零食饮料','宠物食品','其他'],dining:['外卖','饭店','食堂','其他']},
pantry:[
{id:uid(),name:'鸡蛋',category:'肉蛋',qty:10,unit:'个',prodDate:addDays(t,-6),expiryDate:addDays(t,14),lowAt:2,petCat:'care',petDog:'ok',notes:'煮熟后猫狗都可以少量吃'},
{id:uid(),name:'番茄',category:'蔬菜',qty:4,unit:'个',prodDate:addDays(t,-4),expiryDate:addDays(t,1),lowAt:1,petCat:'na',petDog:'na',notes:''},
{id:uid(),name:'牛奶',category:'乳制品',qty:1,unit:'盒',prodDate:addDays(t,-3),expiryDate:addDays(t,4),lowAt:1,petCat:'care',petDog:'no',notes:'大部分猫狗乳糖不耐受'},
{id:uid(),name:'鸡胸肉',category:'肉蛋',qty:2,unit:'袋',prodDate:addDays(t,-10),expiryDate:addDays(t,-1),lowAt:1,petCat:'ok',petDog:'ok',notes:''},
{id:uid(),name:'猫条',category:'宠物食品',qty:6,unit:'支',prodDate:addDays(t,-20),expiryDate:addDays(t,300),lowAt:2,petCat:'ok',petDog:'care',notes:''}],
pantryHistory:[{name:'鸡蛋',category:'肉蛋',unit:'个',shelfDays:20,petCat:'care',petDog:'ok',notes:'煮熟后猫狗都可以少量吃'},{name:'牛奶',category:'乳制品',unit:'盒',shelfDays:7,petCat:'care',petDog:'no',notes:''},{name:'番茄',category:'蔬菜',unit:'个',shelfDays:5,petCat:'na',petDog:'na',notes:''}],
menu:{[t]:{dinner:[{refType:'recipe',refId:'',name:'番茄罗勒意面',done:false}]}},
log:{},nutrition:{goal:2000},shopping:[],settings:{lastNotify:''}};
}

function convertV1Recipes(raw){return raw.map(r=>({id:r.id,type:'dish',name:r.name,category:r.category||'家常菜',hours:Math.floor((r.time||30)/60),minutes:(r.time||30)%60,servings:r.servings||2,calories:null,description:r.description||'',image:r.image||'',ingredients:String(r.ingredients||'').split('\n').filter(x=>x.trim()).map(line=>{const parts=line.trim().split(/\s+/);return{name:parts[0],amount:parts.slice(1).join(' ')}}),steps:(r.steps||[]).map(x=>({text:x,image:'',prep:false})),favorite:!!r.favorite}))}

function migrateV1(){try{const raw=JSON.parse(localStorage.getItem(OLD_KEY));if(!Array.isArray(raw))return null;const s=seedState();const t=today();s.recipes=convertV1Recipes(raw);
s.menu={[t]:{dinner:raw.filter(r=>r.menu).map(r=>({refType:'recipe',refId:r.id,name:r.name,done:false}))}};return s}catch{return null}}

export function load(){let raw=null;try{raw=localStorage.getItem(KEY)}catch{}
if(raw){try{const s=JSON.parse(raw);if(Array.isArray(s.recipes)&&Array.isArray(s.pantry)){const def=seedState();for(const k of Object.keys(def))if(k!=='recipes'&&s[k]===undefined)s[k]=def[k];return s}}catch{}}
try{const arr=JSON.parse(localStorage.getItem(OLD_KEY));if(Array.isArray(arr)&&arr.length){const m=seedState();const t=today();m.recipes=convertV1Recipes(arr);m.menu={[t]:{dinner:arr.filter(r=>r.menu).map(r=>({refType:'recipe',refId:r.id,name:r.name,done:false}))}};try{localStorage.setItem(KEY,JSON.stringify(m))}catch{};return m}}catch{}
const s=seedState();try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}
return s}

// 导入备份：兼容 v2 完整备份 {version:2,state} 与 v1 旧格式 {version:1,recipes}，返回规范化状态或 null
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
const s={...seedState(),...base};
if(!Array.isArray(s.recipes)||!Array.isArray(s.pantry))return null;
return s}catch{return null}}

export let S=load();
const listeners=new Set();
export function persist(){try{localStorage.setItem(KEY,JSON.stringify(S));return true}catch{toast('保存失败：浏览器空间不足，请清理图片或导出备份。');return false}}
export function update(fn){const backup=JSON.stringify(S);fn();if(persist()){listeners.forEach(f=>f());return true}S=JSON.parse(backup);return false}
export function onChange(fn){listeners.add(fn)}
export function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3000)}

// —— 菜谱 / 外出 查询 ——
export const findRecipe=id=>S.recipes.find(r=>r.id===id);
export const findDining=id=>S.dining.find(r=>r.id===id);
export const refOf=item=>item.refType==='dining'?findDining(item.refId):findRecipe(item.refId);

// —— 冰箱 ——
export function pantryMatches(ingName){return S.pantry.filter(p=>nameMatch(p.name,ingName))}
export function expiryInfo(p){const d=daysUntil(p.expiryDate);if(d<0)return{label:`已过期 ${-d} 天`,cls:'expired'};if(d===0)return{label:'今天到期',cls:'soon'};if(d<=2)return{label:`${d} 天后到期`,cls:'soon'};return{label:`剩 ${d} 天`,cls:'fresh'}}
export function expiringItems(){return S.pantry.filter(p=>daysUntil(p.expiryDate)<=2).sort((a,b)=>daysUntil(a.expiryDate)-daysUntil(b.expiryDate))}
export function lowItems(){return S.pantry.filter(p=>p.lowAt&&Number(p.qty)<=Number(p.lowAt))}
export function addPantryHistory(item){const h={name:item.name,category:item.category,unit:item.unit,shelfDays:daysUntil(item.expiryDate)>0?daysUntil(item.expiryDate):7,petCat:item.petCat,petDog:item.petDog,notes:item.notes};S.pantryHistory=[h,...S.pantryHistory.filter(x=>x.name!==item.name)].slice(0,24)}
export function deductPantry(ingName,amount){const p=pantryMatches(ingName)[0];if(!p)return false;const info=parseAmountInfo(amount);const n=info&&(!info.unit||unitMatch(info.unit,p.unit))?info.num:1;p.qty=Math.max(0,(Number(p.qty)||0)-n);return true}

// —— 周菜单 ——
export function menuItems(date,meal){return(S.menu[date]?.[meal])||[]}
export function addToMenu(date,meal,ref){if(!S.menu[date])S.menu[date]={};(S.menu[date][meal]=S.menu[date][meal]||[]).push({refType:ref.type==='dining'?'dining':'recipe',refId:ref.id,name:ref.name,done:false})}
export function removeMenuItem(date,meal,idx){S.menu[date]?.[meal]?.splice(idx,1)}

// —— 日志（吃过记录，按自然月） ——
export function logMeal(date,meal,ref){const calories=Number(ref.calories)||0;(S.log[date]=S.log[date]||[]).push({meal,name:ref.name,refId:ref.id,refType:ref.type==='dining'?'dining':'recipe',calories});pruneLog()}
export function dayIntake(date){return(S.log[date]||[]).reduce((n,e)=>n+(Number(e.calories)||0),0)}
export function pruneLog(){const cur=monthOf(today());const prev=monthOf(addDays(cur+'-01',-1));for(const d of Object.keys(S.log))if(monthOf(d)!==cur&&monthOf(d)!==prev)delete S.log[d]}

// —— 购买清单 ——
export function generateShopping(){const start=mondayOf(today());const need={};for(let i=0;i<7;i++){const d=addDays(start,i);for(const m of MEALS)for(const item of menuItems(d,m[0])){if(item.done)continue;const r=refOf(item);if(!r||r.type==='dining')continue;for(const ing of r.ingredients||[]){const k=ing.name.trim();if(!k)continue;if(!need[k])need[k]={name:k,infos:[],texts:[]};const a=String(ing.amount||'').trim();if(!a)continue;const info=parseAmountInfo(a);if(info)need[k].infos.push(info);else need[k].texts.push(a)}}}
return Object.values(need).map(x=>{let amount='';
if(x.infos.length){const byUnit={};for(const info of x.infos)byUnit[info.unit||'']=(byUnit[info.unit||'']||0)+info.num;const parts=[];for(const[unit,num]of Object.entries(byUnit)){const stock=S.pantry.filter(p=>nameMatch(p.name,x.name)&&(!unit||unitMatch(p.unit,unit))).reduce((n,p)=>n+(Number(p.qty)||0),0);const lack=Math.round((num-stock)*10)/10;parts.push(lack>0?`约差 ${lack}${unit}`:null)}const real=parts.filter(Boolean);amount=real.length?real.join(' + '):'库存充足'}
else if(x.texts.length)amount=x.texts.join(' / ');
else amount='按需购买';
return{name:x.name,amount}})}
