const {chromium}=require('playwright');
const [slug,out]=process.argv.slice(2);
(async()=>{
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:900,height:1200}});
await p.addInitScript(()=>{try{localStorage.setItem('reader:mode','scroll');localStorage.setItem('reader:theme','light')}catch{}});
await p.goto(`http://localhost:3100/read/${slug}`); await p.waitForSelector('[data-reader-ready]'); if(!(await p.$('[data-mode=scroll]'))) await p.getByRole('button',{name:'Switch to scroll mode'}).click(); await p.waitForSelector('[data-mode=scroll][data-reader-ready]');
await p.evaluate(async()=>{
  const src=document.querySelector('[data-mode=scroll] .bk-content');
  const cs=getComputedStyle(src); const vars=['--bk-ink','--bk-muted','--bk-accent','--bk-paper'].map(v=>`${v}:${cs.getPropertyValue(v)}`).join(';');
  const flow=src.cloneNode(true); flow.className='bk-content'; flow.removeAttribute('style');
  flow.querySelector('.bk-end')?.remove();
  const cover=flow.querySelector('.bk-cover'); cover.className='pdf-cover'; cover.removeAttribute('style');
  flow.querySelectorAll('[style]').forEach(e=>e.removeAttribute('style'));
  const st=document.createElement('style');
  st.textContent=`@page{size:A5;margin:16mm 15mm 18mm}
  @page cover{margin:0}
  html,body{background:#fff!important;margin:0!important;padding:0!important;width:118mm!important;min-width:0!important;max-width:118mm!important;overflow:visible!important;height:auto!important}
  .bk-content{${vars};box-sizing:border-box!important;width:100%!important;max-width:none!important;padding:0!important;margin:0!important;--bk-size:11pt;width:auto;column-count:auto;columns:auto;height:auto;color:#22201c;text-align:justify}
  .pdf-cover{page:cover;margin:0;width:148mm;height:209mm;display:flex;align-items:center;justify-content:center;break-after:page;overflow:hidden}
  .pdf-cover img{width:100%;height:100%;object-fit:cover;box-shadow:none;border-radius:0;max-width:none;max-height:none}
  .bk-title{height:170mm;break-before:page;break-after:page}
  .bk-frontmatter{break-before:page;break-after:page}
  .bk-h1{break-before:page;margin-top:18mm}
  .bk-h2{break-before:page;margin-top:6mm}
  .bk-h2.bk-nobreak{break-before:auto}
  .bk-h1+.bk-h2{break-before:auto}`;
  document.head.appendChild(st);
  document.body.replaceChildren(flow);
  await document.fonts.ready; await Promise.all([...document.images].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));
});
await p.setViewportSize({width:446,height:630}); await p.emulateMedia({media:'print'}); console.log(await p.evaluate(()=>{const f=document.querySelector('.bk-content');const r=f.getBoundingClientRect();return [r.width,getComputedStyle(f).columnCount,getComputedStyle(f).columnWidth,f.scrollWidth, getComputedStyle(document.body).width]}));
await p.pdf({path:out,format:'A5',printBackground:false,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<span></span>',
 footerTemplate:'<div style="width:100%;text-align:center;font-size:8px;color:#8a8275;font-family:serif"><span class="pageNumber"></span></div>'});
await b.close();})();
