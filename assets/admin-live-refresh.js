(()=>{
  'use strict';
  if(window.__pvAdminLiveRefresh)return;
  window.__pvAdminLiveRefresh=true;
  const QUEUE='.github/scheduled-posts.json';
  const decode=f=>{if(!f?.content)return'';return new TextDecoder().decode(Uint8Array.from(atob(f.content.replace(/\n/g,'')),c=>c.charCodeAt(0)))};
  let refreshing=false,timer=null;

  async function refreshPublished(){
    const r=await fetch(`data/posts.json?pv-live=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw new Error('Не удалось обновить список публикаций');
    const posts=await r.json();
    if(window.store){window.store.posts=Array.isArray(posts)?posts:[];try{localStorage.setItem('provkusCms',JSON.stringify(window.store))}catch(_){}}
  }

  async function refreshScheduled(){
    if(typeof window.getFile!=='function')return;
    try{
      const f=await window.getFile(QUEUE);
      const q=f?.content?JSON.parse(decode(f)):[];
      if(window.store)window.store.scheduled=Array.isArray(q)?q:[];
    }catch(e){
      // Without a connected publishing token, keep the last known queue instead of clearing it.
      console.warn('scheduled live refresh',e);
    }
  }

  async function refreshAll(showMessage=false){
    if(refreshing)return;
    refreshing=true;
    try{
      await refreshPublished();
      await refreshScheduled();
      window.renderPosts?.();
      const count=window.store?.posts?.length||0;
      const stat=document.getElementById('statPosts');if(stat)stat.textContent=String(count);
      if(showMessage&&typeof window.flash==='function')window.flash(`Список обновлён: ${count} публикаций`);
    }catch(e){console.warn('publications live refresh',e)}
    finally{refreshing=false}
  }

  function active(){return document.getElementById('publications')?.classList.contains('active')}
  function start(){
    clearInterval(timer);
    timer=setInterval(()=>{if(active())refreshAll(false)},12000);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.nav-btn[data-target="publications"],#allMaterialsBtn'))setTimeout(()=>refreshAll(false),0);
  },true);
  window.addEventListener('focus',()=>{if(active())refreshAll(false)});
  window.addEventListener('pv-admin-runtime-ready',()=>refreshAll(false),{once:true});
  window.refreshPublications=()=>refreshAll(true);
  setTimeout(()=>refreshAll(false),800);
  start();
})();
