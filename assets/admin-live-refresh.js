(()=>{
  'use strict';
  if(window.__pvAdminLiveRefresh)return;
  window.__pvAdminLiveRefresh=true;

  const QUEUE='.github/scheduled-posts.json';
  const POSTS='data/posts.json';
  const RAW_ROOT='https://raw.githubusercontent.com/makarcudra7-dotcom/makarcudra7-dotcom.github.io/main/';
  const RAW_QUEUE=RAW_ROOT+'.github/scheduled-posts.json';
  const SITE_ROOT='https://provkus-media.ru/';
  const decode=f=>{if(!f?.content)return'';return new TextDecoder().decode(Uint8Array.from(atob(f.content.replace(/\n/g,'')),c=>c.charCodeAt(0)))};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const fmt=v=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return v||''}};
  let refreshing=false,timer=null,scheduled=[];

  function persist(){
    if(!window.store)return;
    try{localStorage.setItem('provkusCms',JSON.stringify(window.store))}catch(_){}
  }

  function applyPublished(posts){
    if(!Array.isArray(posts))return;
    if(window.store)window.store.posts=posts;
    persist();
  }

  function applyScheduled(items){
    scheduled=(Array.isArray(items)?items:[]).filter(x=>!x?.pausedRecovery);
    window.__pvScheduledSnapshot=scheduled;
    if(window.store)window.store.scheduled=scheduled;
    persist();
    return scheduled;
  }

  async function refreshPublished(){
    let posts=null;
    if(typeof window.getFile==='function'){
      try{
        const f=await window.getFile(POSTS);
        if(f?.content)posts=JSON.parse(decode(f));
        else if(f===null)posts=[];
      }catch(e){console.warn('posts source refresh',e)}
    }
    if(!Array.isArray(posts)){
      const r=await fetch(`${POSTS}?pv-live=${Date.now()}`,{cache:'no-store'});
      if(!r.ok)throw new Error('Не удалось обновить список публикаций');
      posts=await r.json();
    }
    applyPublished(Array.isArray(posts)?posts:[]);
    return posts;
  }

  async function refreshScheduled(){
    try{
      let q=null;
      if(typeof window.getFile==='function'){
        try{
          const f=await window.getFile(QUEUE);
          if(f?.content)q=JSON.parse(decode(f));
          else if(f===null)q=[];
        }catch(e){console.warn('scheduled API refresh',e)}
      }
      if(!Array.isArray(q)){
        const r=await fetch(`${RAW_QUEUE}?pv-live=${Date.now()}`,{cache:'no-store'});
        if(!r.ok)throw new Error('Не удалось прочитать очередь');
        q=await r.json();
      }
      return applyScheduled(q);
    }catch(e){
      console.warn('scheduled live refresh',e);
      return scheduled;
    }
  }

  function renderScheduledRows(items=scheduled){
    const tb=document.getElementById('postsTable');if(!tb)return;
    tb.querySelectorAll('tr[data-live-scheduled="1"],tr.scheduled-row').forEach(x=>x.remove());
    if(!Array.isArray(items)||!items.length)return;
    const html=items.map(x=>{
      const h=esc(x.post?.headline||x.material?.headline||x.slug);
      const a=esc(x.post?.author||x.material?.author||'—');
      return `<tr data-live-scheduled="1" data-scheduled-slug="${esc(x.slug)}"><td><strong>${h}</strong></td><td><span class="status scheduled">Запланировано</span></td><td>${a}</td><td>${esc(fmt(x.publishAt))}</td><td>—</td><td><div class="row-actions"><button type="button" class="btn soft" data-live-preview-scheduled="${esc(x.slug)}">Посмотреть</button><button type="button" class="btn soft" data-live-edit-scheduled="${esc(x.slug)}">Редактировать</button><button type="button" class="btn danger-btn" data-live-delete-scheduled="${esc(x.slug)}">Удалить</button></div></td></tr>`
    }).join('');
    tb.insertAdjacentHTML('afterbegin',html);
  }

  function repaint(){
    window.renderPosts?.();
    renderScheduledRows(scheduled);
    const count=window.store?.posts?.length||0;
    const stat=document.getElementById('statPosts');if(stat)stat.textContent=String(count);
  }

  function repoPreviewUrl(url,stamp){
    const value=String(url||'').trim();
    if(!value)return value;
    if(value.startsWith(SITE_ROOT+'assets/uploads/'))return RAW_ROOT+value.slice(SITE_ROOT.length)+`?pv=${stamp}`;
    if(value.startsWith('/assets/uploads/'))return RAW_ROOT+value.slice(1)+`?pv=${stamp}`;
    if(value.startsWith('assets/uploads/'))return RAW_ROOT+value+`?pv=${stamp}`;
    return value;
  }

  function rewritePreviewImages(html,stamp){
    return String(html||'')
      .replace(/(src=["'])(https:\/\/provkus-media\.ru\/assets\/uploads\/[^"']+)(["'])/gi,(_,a,u,b)=>a+repoPreviewUrl(u,stamp)+b)
      .replace(/(src=["'])(\/assets\/uploads\/[^"']+)(["'])/gi,(_,a,u,b)=>a+repoPreviewUrl(u,stamp)+b)
      .replace(/(src=["'])(assets\/uploads\/[^"']+)(["'])/gi,(_,a,u,b)=>a+repoPreviewUrl(u,stamp)+b);
  }

  async function latestScheduledItem(slug){
    let list=scheduled;
    if(typeof window.getFile==='function'){
      try{
        const f=await window.getFile(QUEUE);
        if(f?.content){
          const fresh=JSON.parse(decode(f));
          if(Array.isArray(fresh)){list=applyScheduled(fresh);repaint()}
        }
      }catch(e){console.warn('fresh scheduled item read',e)}
    }
    return (Array.isArray(list)?list:[]).find(x=>x.slug===slug)||null;
  }

  async function previewScheduled(slug){
    const w=window.open('','_blank');
    if(!w){
      if(typeof window.flash==='function')window.flash('Браузер заблокировал окно предпросмотра');
      return;
    }
    w.document.open();
    w.document.write('<!doctype html><meta charset="utf-8"><title>Загрузка предпросмотра…</title><body style="font-family:Arial,sans-serif;padding:32px">Загружаю свежую версию статьи…</body>');
    w.document.close();
    try{
      const item=await latestScheduledItem(slug);
      if(!item)throw new Error('Материал больше не найден в очереди');
      const build=window.articleHTML;
      if(typeof build!=='function')throw new Error('Предпросмотр пока недоступен. Обновите страницу админки.');
      const stamp=Date.now();
      const o={...(item.material||{})};
      if(!o.publishedAt)o.publishedAt=item.publishAt;
      if(!o.updatedAt)o.updatedAt=o.publishedAt||item.publishAt;
      o.content=rewritePreviewImages(o.content||'',stamp);
      if(o.quiz?.afterContent)o.quiz={...o.quiz,afterContent:rewritePreviewImages(o.quiz.afterContent,stamp)};
      const img=repoPreviewUrl(item.post?.image||o.image||'',stamp);
      o.image=img;
      o.ogImage=img;
      w.document.open();
      w.document.write(build(o,img));
      w.document.close();
    }catch(e){
      w.document.open();
      w.document.write(`<!doctype html><meta charset="utf-8"><title>Ошибка</title><body style="font-family:Arial,sans-serif;padding:32px"><h2>Не удалось открыть предпросмотр</h2><p>${esc(e?.message||'Неизвестная ошибка')}</p></body>`);
      w.document.close();
      if(typeof window.flash==='function')window.flash(e?.message||'Не удалось открыть предпросмотр');
    }
  }

  async function editScheduled(slug){
    const item=await latestScheduledItem(slug);if(!item)return;
    if(typeof window.fill==='function')window.fill({...item.material,_editingSlug:''});
    const file=document.getElementById('imageFile');if(file)file.value='';
    document.querySelector('.nav-btn[data-target="material"]')?.click();
    if(typeof window.flash==='function')window.flash('Открыта свежая версия запланированного материала');
  }

  async function deleteScheduled(slug){
    const item=await latestScheduledItem(slug);if(!item)return;
    if(!confirm(`Удалить из очереди «${item.post?.headline||item.material?.headline||slug}»?`))return;
    if(typeof window.putFile!=='function'){
      if(typeof window.flash==='function')window.flash('Для удаления подключите сервер публикации или GitHub');
      return;
    }
    try{
      let full=scheduled;
      if(typeof window.getFile==='function'){
        const f=await window.getFile(QUEUE);full=f?.content?JSON.parse(decode(f)):[];
      }
      const next=(Array.isArray(full)?full:[]).filter(x=>x.slug!==slug);
      await window.putFile(QUEUE,JSON.stringify(next,null,2),`Unschedule: ${item.post?.headline||item.material?.headline||slug}`);
      applyScheduled(next);repaint();
      if(typeof window.flash==='function')window.flash('Публикация снята с очереди');
    }catch(e){
      console.warn('delete scheduled',e);
      if(typeof window.flash==='function')window.flash('Не удалось удалить публикацию из очереди');
    }
  }

  async function refreshAll(showMessage=false){
    if(refreshing)return;
    refreshing=true;
    try{
      await Promise.all([refreshPublished(),refreshScheduled()]);
      repaint();
      const count=window.store?.posts?.length||0;
      if(showMessage&&typeof window.flash==='function')window.flash(`Список обновлён: ${count} опубликовано, ${scheduled.length} запланировано`);
    }catch(e){console.warn('publications live refresh',e)}
    finally{refreshing=false}
  }

  function scheduleVerify(){
    clearTimeout(scheduleVerify.t1);clearTimeout(scheduleVerify.t2);
    scheduleVerify.t1=setTimeout(()=>refreshAll(false),250);
    scheduleVerify.t2=setTimeout(()=>refreshAll(false),1000);
  }

  function wrapMutations(){
    if(typeof window.putFile!=='function'||window.putFile.__pvLiveWrapped)return;
    const base=window.putFile;
    const wrapped=async function(path,content,message,encoding='utf-8'){
      const result=await base(path,content,message,encoding);
      try{
        if(path===QUEUE&&encoding!=='base64'){
          const q=JSON.parse(content);applyScheduled(q);repaint();window.dispatchEvent(new CustomEvent('pv-scheduled-updated',{detail:{items:q}}));scheduleVerify();
        }else if(path===POSTS&&encoding!=='base64'){
          const posts=JSON.parse(content);applyPublished(posts);repaint();scheduleVerify();
        }
      }catch(e){console.warn('optimistic CMS refresh',e)}
      return result;
    };
    wrapped.__pvLiveWrapped=true;
    window.putFile=wrapped;
  }

  function active(){return document.getElementById('publications')?.classList.contains('active')}
  function start(){clearInterval(timer);timer=setInterval(()=>{if(active()&&!document.hidden)refreshAll(false)},2500)}

  document.addEventListener('click',e=>{
    const preview=e.target.closest?.('[data-live-preview-scheduled]');
    if(preview){previewScheduled(preview.dataset.livePreviewScheduled);return}
    const edit=e.target.closest?.('[data-live-edit-scheduled]');
    if(edit){editScheduled(edit.dataset.liveEditScheduled);return}
    const del=e.target.closest?.('[data-live-delete-scheduled]');
    if(del){deleteScheduled(del.dataset.liveDeleteScheduled);return}
    if(e.target.closest?.('.nav-btn[data-target="publications"],#allMaterialsBtn'))setTimeout(()=>refreshAll(false),0);
  },true);
  window.addEventListener('focus',()=>{if(active())refreshAll(false)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active())refreshAll(false)});
  window.addEventListener('pv-publications-mutated',()=>{repaint();scheduleVerify()});
  window.addEventListener('pv-scheduled-updated',e=>{if(Array.isArray(e.detail?.items)){applyScheduled(e.detail.items);repaint()}});
  window.addEventListener('pv-admin-runtime-ready',()=>{wrapMutations();refreshAll(false)},{once:true});
  window.refreshPublications=()=>refreshAll(true);
  window.refreshScheduledNow=async()=>{await refreshScheduled();repaint();return scheduled};
  window.renderScheduledRows=renderScheduledRows;

  wrapMutations();
  setTimeout(()=>refreshAll(false),100);
  setTimeout(()=>refreshAll(false),700);
  start();
})();
