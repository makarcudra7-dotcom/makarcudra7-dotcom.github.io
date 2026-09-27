(()=>{
  'use strict';
  if(window.__pvAdminPersistence)return;window.__pvAdminPersistence=true;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const PATH='.github/editorial-workflow.json';
  const decode=f=>new TextDecoder().decode(Uint8Array.from(atob((f?.content||'').replace(/\n/g,'')),c=>c.charCodeAt(0)));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say=s=>typeof window.flash==='function'?window.flash(s):console.log(s);
  let historyBusy=false,patchTimer=0;

  async function loadMeta(){
    if(typeof window.getFile!=='function'||typeof window.putFile!=='function')throw new Error('Для общих редакторских данных подключите GitHub в настройках');
    try{
      const f=await window.getFile(PATH);
      const raw=f?.content?JSON.parse(decode(f)):{articles:{},updatedAt:null};
      const meta=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{articles:{},updatedAt:null};
      if(!meta.articles||typeof meta.articles!=='object'||Array.isArray(meta.articles))meta.articles={};
      return meta;
    }catch(e){
      if(/подключ|GitHub/i.test(e?.message||''))throw e;
      return {articles:{},updatedAt:null};
    }
  }
  async function saveMeta(meta,label){
    meta.updatedAt=new Date().toISOString();
    await window.putFile(PATH,JSON.stringify(meta,null,2)+'\n',label);
  }
  function currentSlug(){return ($('#slug')?.value||'').trim()}
  function currentData(){return typeof window.collect==='function'?window.collect():null}

  async function sharedNote(slug){
    try{
      const meta=await loadMeta(),rec=meta.articles[slug]||(meta.articles[slug]={});
      const value=prompt('Редакторская заметка — общая для всех редакторов',rec.note||'');
      if(value===null)return;
      rec.note=value;rec.noteUpdatedAt=new Date().toISOString();
      await saveMeta(meta,'Editorial note: '+slug);
      say('Заметка сохранена в общей редакционной истории');
    }catch(e){say(e.message||'Не удалось сохранить заметку')}
  }

  async function sharedTasks(slug){
    try{
      const meta=await loadMeta(),rec=meta.articles[slug]||(meta.articles[slug]={});
      const old=(rec.tasks||[]).map(t=>`[${t.done?'x':' '}] ${t.text}`).join('\n');
      const value=prompt('Задачи по материалу. Каждая строка: [ ] задача или [x] выполнено',old);
      if(value===null)return;
      rec.tasks=value.split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{
        const m=line.match(/^\[([xX ])\]\s*(.+)$/);
        return {text:(m?m[2]:line).trim(),done:!!m&&/x/i.test(m[1])};
      }).filter(x=>x.text);
      rec.tasksUpdatedAt=new Date().toISOString();
      await saveMeta(meta,'Editorial tasks: '+slug);
      say(`Задачи сохранены: ${rec.tasks.filter(x=>x.done).length}/${rec.tasks.length} выполнено`);
    }catch(e){say(e.message||'Не удалось сохранить задачи')}
  }

  async function snapshot(reason='manual'){
    if(historyBusy)return;
    const data=currentData();if(!data?.headline&&!data?.content)return;
    const slug=currentSlug()||data.slug;if(!slug)return;
    const encoded=JSON.stringify(data);
    if(encoded.length>700000){say('Версия не сохранена: сначала загрузите встроенные фото, чтобы снимок не превышал лимит');return}
    historyBusy=true;
    try{
      const meta=await loadMeta(),rec=meta.articles[slug]||(meta.articles[slug]={});
      const versions=Array.isArray(rec.versions)?rec.versions:[];
      if(versions[0]&&JSON.stringify(versions[0].data)===encoded)return;
      versions.unshift({at:new Date().toISOString(),reason,data});
      rec.versions=versions.slice(0,20);rec.versionUpdatedAt=new Date().toISOString();
      await saveMeta(meta,'Editorial version: '+slug);
    }catch(e){console.warn('[ProVkus shared history]',e)}finally{historyBusy=false}
  }

  async function openHistory(){
    const slug=currentSlug();if(!slug)return say('Сначала задайте slug материала');
    try{
      const meta=await loadMeta(),versions=meta.articles[slug]?.versions||[];
      if(!versions.length)return say('Общих сохранённых версий пока нет');
      const choice=prompt('Номер версии для восстановления в редактор:\n'+versions.map((x,i)=>`${i+1}. ${new Date(x.at).toLocaleString('ru-RU')} · ${x.reason||'версия'} · ${x.data?.headline||''}`).join('\n'));
      const n=Number(choice);if(!(n>=1&&n<=versions.length))return;
      await snapshot('before-restore');
      window.fill?.(versions[n-1].data);
      document.querySelector('.nav-btn[data-target="material"]')?.click();
      say('Версия восстановлена в редактор; изменения ещё не опубликованы');
    }catch(e){say(e.message||'Не удалось открыть историю версий')}
  }

  function patchRows(){
    $$('[data-pv-action="note"]').forEach(b=>{
      const slug=b.dataset.pvSlug;if(!slug)return;
      b.removeAttribute('data-pv-action');b.removeAttribute('data-pv-slug');b.dataset.pvSharedNote=slug;b.title='Общая редакторская заметка в GitHub';
      if(!b.parentElement?.querySelector(`[data-pv-shared-tasks="${CSS.escape(slug)}"]`))b.insertAdjacentHTML('afterend',`<button type="button" class="btn soft" data-pv-shared-tasks="${esc(slug)}" title="Общий чек-лист задач">Задачи</button>`);
    });
    $$('#postsTable tr[data-scheduled-slug]').forEach(tr=>{
      const slug=tr.dataset.scheduledSlug,cell=tr.querySelector('.row-actions')||tr.lastElementChild;if(!slug||!cell)return;
      if(!cell.querySelector('[data-pv-shared-note]'))cell.insertAdjacentHTML('beforeend',`<button type="button" class="btn soft" data-pv-shared-note="${esc(slug)}" title="Общая редакторская заметка в GitHub">Заметка</button><button type="button" class="btn soft" data-pv-shared-tasks="${esc(slug)}" title="Общий чек-лист задач">Задачи</button>`);
    });
  }

  function patchHistory(){
    const b=$('#pvHistoryBtn');
    if(b&&!b.dataset.pvSharedHistory){b.onclick=null;b.dataset.pvSharedHistory='1';b.title='Общие версии из GitHub';b.addEventListener('click',openHistory)}
    for(const id of ['saveBtn','scheduleBtn','savePublishedBtn','publishBtn']){
      const el=$('#'+id);if(!el||el.dataset.pvSharedSnapshot)return;
      el.dataset.pvSharedSnapshot='1';el.addEventListener('click',()=>{void snapshot('before-'+id)},true);
    }
  }

  function patch(){patchRows();patchHistory()}
  document.addEventListener('click',e=>{
    const n=e.target.closest?.('[data-pv-shared-note]');if(n){e.preventDefault();e.stopPropagation();void sharedNote(n.dataset.pvSharedNote);return}
    const t=e.target.closest?.('[data-pv-shared-tasks]');if(t){e.preventDefault();e.stopPropagation();void sharedTasks(t.dataset.pvSharedTasks)}
  },true);
  const tb=$('#postsTable');if(tb)new MutationObserver(()=>{clearTimeout(patchTimer);patchTimer=setTimeout(patch,0)}).observe(tb,{childList:true,subtree:true});
  let tries=0,timer=setInterval(()=>{patch();if(++tries>200)clearInterval(timer)},100);
  window.addEventListener('pv-admin-runtime-ready',patch);
  window.__pvSharedEditorial={snapshot,openHistory,sharedNote,sharedTasks};
})();
