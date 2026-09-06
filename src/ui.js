// 共享 UI 工具：图标、转义、图片压缩、确认对话框
const icons={bowl:'<path d="M4 12h16a8 8 0 0 1-5.4 7.6c-.9.3-1.8.4-2.6.4s-1.7-.1-2.6-.4A8 8 0 0 1 4 12Z"/><path d="M9 8c0-1.6 1-1.6 1-3.2M13 8c0-1.6 1-1.6 1-3.2M15.5 8.5c.6-1.2 1.4-1.2 1.4-2.7"/>',book:'<path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4z"/><path d="M20 4h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h3z"/>',plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',edit:'<path d="m16 3 5 5-12 12-6 1 1-6zM14 5l5 5"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',leaf:'<path d="M20 3C7 2 2 8 5 15s16 6 15-12Z"/><path d="m4 21 11-12"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',check:'<path d="m5 12 4 4L19 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',print:'<path d="M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6z"/>',fridge:'<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M5 9.5h14M8.5 5.5v1.5M8.5 12.5v3"/>',calendar:'<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/>',cart:'<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.6 12h10.8L21 8H6"/>',flame:'<path d="M12 3c1 3-2 4.5-2 7a2 2 0 0 0 4 .3C15.5 11.5 18 10 18 7c2 2.5 3 4.8 3 7a9 9 0 0 1-18 0c0-4 3.5-6.5 6-8 .8 1.6 2 2.3 3 3Z"/>',sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9Z"/>',paw:'<circle cx="6" cy="9" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><circle cx="18" cy="9" r="1.8"/><path d="M12 11c2.5 0 5 2 5 4.6 0 1.6-1.2 2.9-2.8 2.9-.9 0-1.5-.4-2.2-.4s-1.3.4-2.2.4A2.8 2.8 0 0 1 7 15.6C7 13 9.5 11 12 11Z"/>',utensils:'<path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v5M9 3v5M17 3c-1.5 1-2 3-2 5.5 0 2 .8 3 2 3V21M17 3v8.5"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',bell:'<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/>'};
export const ico=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n]||icons.book}</svg>`;
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function encodeCanvas(c,q){
  let out='';
  try{out=c.toDataURL('image/webp',q)}catch{}
  if(!out.startsWith('data:image/webp')){
    try{out=c.toDataURL('image/jpeg',q)}catch{out=''}
  }
  return out;
}

export async function compressImage(file,max=1400,q=0.82){
  if(file.size>10*1024*1024)throw new Error('这张图片超过 10MB，请先适当缩小后再上传');
  let bmp=null;
  try{bmp=await createImageBitmap(file,{imageOrientation:'from-image'})}catch{}
  if(!bmp){try{bmp=await createImageBitmap(file)}catch{}}
  if(!bmp){
    try{bmp=await new Promise((res,rej)=>{const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{URL.revokeObjectURL(url);res(img)};img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('fail'))};img.src=url})}catch{}
  }
  if(!bmp)throw new Error('这张图片的格式当前浏览器无法解析（常见于 iPhone 的 HEIC 原图），请改用 JPG/PNG，或在手机设置里把相机格式改为「兼容性最佳」后重试');
  const srcW=bmp.width||bmp.naturalWidth,srcH=bmp.height||bmp.naturalHeight;
  if(!srcW||!srcH){if(bmp.close)bmp.close();throw new Error('图片处理失败，请换一张试试')}
  const cap=max>0?max:1400;
  const c=document.createElement('canvas');
  const ctx=c.getContext('2d');
  let side=Math.min(cap,Math.max(srcW,srcH));
  let quality=q;
  let out='';
  for(let i=0;i<5;i++){
    const ratio=Math.min(1,side/Math.max(srcW,srcH));
    c.width=Math.max(1,Math.round(srcW*ratio));
    c.height=Math.max(1,Math.round(srcH*ratio));
    ctx.drawImage(bmp,0,0,c.width,c.height);
    out=encodeCanvas(c,quality);
    if(out&&out.length<=180000)break;
    side=Math.max(480,Math.round(side*0.72));
    quality=Math.max(0.55,quality-0.1);
  }
  if(bmp.close)bmp.close();
  if(!out||out.length<64)throw new Error('图片处理失败，请换一张试试');
  if(out.length>450000)throw new Error('压缩后仍然太大，请换一张更小的照片');
  return out;
}

export function fileToDataUrl(input,cb,max=1400,q=0.82){
  if(!input)return;
  input.onchange=async()=>{
    const f=input.files[0];
    input.value='';
    if(!f)return;
    const{toast}=await import('./store.js');
    toast('正在处理图片…');
    try{cb(await compressImage(f,max,q))}
    catch(e){toast(e&&e.message?e.message:'图片处理失败，请换一张试试')}
  };
}

export function confirmDlg(message){return new Promise(res=>{if(window.confirm(message))res(true);else res(false)})}

export function zoomImage(src,alt=''){
  if(!src)return;
  let box=document.querySelector('#lightbox');
  if(!box){
    box=document.createElement('dialog');
    box.id='lightbox';
    box.setAttribute('aria-label','查看大图');
    box.innerHTML=`<button type="button" class="lightbox-close" aria-label="关闭">${ico('close',22)}</button><img alt="">`;
    document.body.appendChild(box);
    box.addEventListener('click',e=>{if(e.target===box||e.target.closest('.lightbox-close')||e.target.tagName==='IMG')closeLightbox()});
    box.addEventListener('close',()=>{
      const img=box.querySelector('img');
      if(img)img.removeAttribute('src');
      document.body.style.overflow='';
    });
  }
  const img=box.querySelector('img');
  img.src=src;img.alt=alt||'';
  if(!box.open)box.showModal();
  document.body.style.overflow='hidden';
}
export function closeLightbox(){
  const box=document.querySelector('#lightbox');
  if(box?.open)box.close();
}

document.addEventListener('click',e=>{
  const img=e.target.closest?.('img.zoomable');
  if(!img||!img.src||img.closest('#lightbox'))return;
  e.preventDefault();
  e.stopPropagation();
  zoomImage(img.currentSrc||img.src,img.alt);
},true);
