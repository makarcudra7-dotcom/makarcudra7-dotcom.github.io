(()=>{
  'use strict';
  if(window.__pvAdminLiveRefresh)return;
  window.__pvAdminLiveRefresh=true;
  const QUEUE='.github/scheduled-posts.json';
  const RAW_QUEUE='https://raw.githubusercontent.com/makarcudra7-dotcom/makarcudra7-dotcom.github.io/main/.github/scheduled-posts.json';
  const decode=f=>{if(!f?.content)return'';return new TextDecoder().decode(Uint8Array.from(atob(f.content.replace(/\n/g,'')),c=>c.charCodeAt(0)))};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return v||''}};
  let refreshing=false,timer=null,scheduled=[];

  async function refreshPublished(){
    const r=await fetch(`data/posts.json?pv-live=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw new Error('Не удалось обновить список публикаций');
    const posts=await r.json();
    if(window.store){window.store.posts=Array.isArray(posts)?posts:[];try{localStorage.setItem('provkusCms',JSON.stringify(window.store))}catch(_){}}
  }

  async function refreshScheduled(){
    try{
      let q=null;
      if(typeof window.getFile==='function'){
        try{const f=await window.getFile(QUEUE);q=f?.content?JSON.parse(decode(f)):[]}catch(e){console.warn('scheduled API refresh',e)}
      }
      if(!Array.isArray(q)){
        const r=await fetch(`${RAW_QUEUE}?pv-live=${Date.now()}`,{cache:'no-store'});
        if(!r.ok)throw new Error('Не удалось прочитать очередь');
        q=await r.json();
      }
      scheduled=Array.isArray(q)?q:[];
      window.__pvScheduledSnapshot=scheduled;
      if(window.store)window.store.scheduled=scheduled;
      return scheduled;
    }catch(e){
      console.warn('scheduled live refresh',e);
      return scheduled;
    }
  }

  function renderScheduledRows(items=scheduled){
    const tb=document.getElementById('postsTable');if(!tb)return;
    tb.querySelectorAll('tr[data-live-scheduled="1"]').forEach(x=>x.remove());
    if(!Array.isArray(items)||!items.length)return;
    const html=items.map(x=>{
      const h=esc(x.post?.headline||x.material?.headline||x.slug);
      const a=esc(x.post?.author||x.material?.author||'—');
      const status=x.pausedRecovery?'Восстановлено':'Запланировано';
      const cls=x.pausedRecovery?'status warn':'status scheduled';
      return `<tr data-live-scheduled="1" data-scheduled-slug="${esc(x.slug)}"><td><strong>${h}</strong></td><td><span class="${cls}">${status}</span></td><td>${a}</td><td>${esc(fmt(x.publishAt))}</td><td>—</td><td><div class="row-actions"><button type="button" class="btn soft" data-live-edit-scheduled="${esc(x.slug)}">Редактировать</button></div></td></tr>`
    }).join('');
    tb.insertAdjacentHTML('afterbegin',html);
  }

  function editScheduled(slug){
    const item=scheduled.find(x=>x.slug===slug);if(!item)return;
    if(typeof window.fill==='function')window.fill({...item.material,_editingSlug:''});
    document.querySelector('.nav-btn[data-target="material"]')?.click();
    if(typeof window.flash==='function')window.flash('Запланированный материал открыт для редактирования');
  }

  async function refreshAll(showMessage=false){
    if(refreshing)return;
    refreshing=true;
    try{
      await refreshPublished();
      const q=await refreshScheduled();
      window.renderPosts?.();
      renderScheduledRows(q);
      const count=window.store?.posts?.length||0;
      const stat=document.getElementById('statPosts');if(stat)stat.textContent=String(count);
      if(showMessage&&typeof window.flash==='function')window.flash(`Список обновлён: ${count} опубликовано, ${q.length} запланировано`);
    }catch(e){console.warn('publications live refresh',e)}
    finally{refreshing=false}
  }

  function active(){return document.getElementById('publications')?.classList.contains('active')}
  function start(){clearInterval(timer);timer=setInterval(()=>{if(active())refreshAll(false)},8000)}

  document.addEventListener('click',e=>{
    const edit=e.target.closest?.('[data-live-edit-scheduled]');
    if(edit){editScheduled(edit.dataset.liveEditScheduled);return}
    if(e.target.closest?.('.nav-btn[data-target="publications"],#allMaterialsBtn'))setTimeout(()=>refreshAll(false),0);
  },true);
  window.addEventListener('focus',()=>{if(active())refreshAll(false)});
  window.addEventListener('pv-admin-runtime-ready',()=>refreshAll(false),{once:true});
  window.refreshPublications=()=>refreshAll(true);
  window.renderScheduledRows=renderScheduledRows;
  setTimeout(()=>refreshAll(false),500);
  setTimeout(()=>refreshAll(false),1800);
  start();
})();
