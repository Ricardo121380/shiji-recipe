// 简易静态检查：src/*.js 引用的模块导出是否已导入
import fs from 'node:fs';
const files=fs.readdirSync('src').filter(f=>f.endsWith('.js')).map(f=>`src/${f}`);
const src=f=>fs.readFileSync(f,'utf8');
const exportsOf={};
for(const f of files){
  const m=src(f).matchAll(/export (?:function|const|let|class) (\w+)/g);
  exportsOf[f]=new Set([...m].map(x=>x[1]));
}
let bad=0;
const GLOBALS=new Set(['window','document','JSON','Object','Array','Number','String','Math','Date','Promise','navigator','localStorage','sessionStorage','console','Error','FormData','location','crypto','Notification','Blob','URL','parseInt','parseFloat','isNaN','setTimeout','setInterval','clearTimeout','confirm','alert','undefined','Boolean','structuredClone']);
for(const f of files){
  const code=src(f);
  const imports=new Set();
  for(const m of code.matchAll(/import\s*\{([^}]+)\}\s*from/g))
    for(const name of m[1].split(','))imports.add(name.trim().split(' as ')[0].trim());
  const declared=new Set([...code.matchAll(/(?:function|const|let|var|class)\s+(\w+)/g)].map(x=>x[1]));
  for(const m of code.matchAll(/(?<![.\w'"])\b([A-Z][A-Za-z_]+|\w{5,})\b/g)){
    const id=m[1];
    if(imports.has(id)||declared.has(id)||GLOBALS.has(id))continue;
    const owner=[...Object.entries(exportsOf)].find(([f2,set])=>set.has(id)&&f2!==f);
    if(owner){bad++;console.log(`${f}: 使用了 ${id} 但未从 ${owner[0]} 导入`)}
  }
}
console.log(bad?`发现 ${bad} 处疑似缺失导入`:'未发现缺失导入');
