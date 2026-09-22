(()=>{
  try{if(typeof store!=='undefined'&&!window.store)window.store=store}catch(e){console.warn('CMS store bridge',e)}
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-edit-published]');if(!b)return;
    const slug=b.dataset.editPublished;setTimeout(()=>{try{const p=(window.store?.posts||[]).find(x=>x.slug===slug),flag=document.getElementById('excludeRelatedFlag');if(flag&&p)flag.checked=!!p.excludeRelated}catch(_){}},500)
  },true)
})();
