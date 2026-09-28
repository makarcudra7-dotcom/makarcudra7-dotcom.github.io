(()=>{
  'use strict';
  if(window.__pvWorkflowHardening)return;window.__pvWorkflowHardening=true;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const QUEUE='.github/scheduled-posts.json', POSTS='data/posts.json', RAW='https://raw.githubusercontent.com/makarcudra7-dotcom/makarcudra7-dotcom.github.io/main/';
  const decode=f=>new TextDecoder().decode(Uint8Array.from(atob((f?.content||'').replace(/\n/g,'')),c=>c.charCodeAt(0)));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say=s=>typeof window.flash==='function'?window.flash(s):console.log(s);
  const queued=()=>window.__pvScheduledSnapshot||window.store?.scheduled||[];
  const posts=()=>window.store?.posts||[];
  const AUTHORS={
    'Илья Титюлькин':{url:'author-ilya.html',photo:'assets/authors/ilya.jpg',role:'Редактор направления «Продукты и выбор»'},
    'Эльвира Шайберт':{url:'author-elvira.html',photo:'assets/authors/elvira-generated.jpg',role:'Редактор направления «Дом и хранение»'},
    'Екатерина Рукопляс':{url:'author-ekaterina.html',photo:'assets/authors/ekaterina.jpg',role:'Редактор направления «Еда и безопасность»'}
  };
  let busy=false,lastDataOk=0,renderTimer=0;

  async function fileJson(path,fallback){const f=await window.getFile(path);return f?.content?JSON.parse(decode(f)):fallback}
  function slugFromRow(tr){const a=tr.querySelector('a[href*="/articles/"]');try{return(new URL(a?.href||'',location.href).pathname.split('/').pop()||'').replace(/\.html$/,'')}catch{return''}}
  function statusBadge(cell,state,label,title=''){
    if(!cell)return;cell.innerHTML=`<span class="status pv-status ${esc(state)}"${title?` title="${esc(title)}"`:''}>${esc(label)}</span>`;
  }
  function readyDraft(data={}){return !!(data.headline&&data.description&&data.lead&&data.slug&&data.author&&data.imageAlt&&(data.image||data._uploadedImage)&&String(data.content||'').replace(/<[^>]+>/g,' ').trim())}

  function decorateStatuses(){
    const drafts=(()=>{try{return JSON.parse(localStorage.getItem('provkusCmsDraftsV2')||'[]')}catch{return[]}})();
    for(const tr of $$('#postsTable tr')){
      if(tr.querySelector('td[colspan]'))continue;
      const item=queued().find(x=>x.slug===tr.dataset.scheduledSlug),slug=slugFromRow(tr),statusCell=tr.children[1];
      if(item){
        const explicit=item.status||item.post?.status||'';
        const state=explicit==='error'?'error':explicit==='publishing'?'publishing':new Date(item.publishAt).getTime()<=Date.now()?'publishing':'queued';
        const label=state==='error'?'Ошибка':state==='publishing'?'Публикуется':'В очереди';
        const reason=item.errorMessage||item.error||item.lastError||'';
        statusBadge(statusCell,state,label,reason);
        tr.dataset.pvStatus=state;
        let note=tr.querySelector('.pv-error-reason');
        if(state==='error'&&reason){if(!note){note=document.createElement('div');note.className='pv-error-reason';tr.children[0]?.appendChild(note)}note.textContent='Причина: '+reason}else note?.remove();
        const cell=tr.querySelector('.row-actions')||tr.lastElementChild;
        let retry=cell?.querySelector('[data-pv-retry]');
        if(state==='error'&&!retry)cell?.insertAdjacentHTML('beforeend',`<button type="button" class="btn soft" data-pv-retry="${esc(item.slug)}">Повторить</button>`);
        if(state!=='error')retry?.remove();
        if(cell&&!cell.querySelector('[data-pv-mobile-preview]'))cell.insertAdjacentHTML('beforeend',`<button type="button" class="btn soft" data-pv-mobile-preview="${esc(item.slug)}">Мобильный вид</button>`);
        continue;
      }
      if(tr.classList.contains('draft-row')){
        const id=tr.dataset.draftId,rec=drafts.find(x=>x.id===id),ready=readyDraft(rec?.data||{});
        statusBadge(statusCell,ready?'ready':'draft',ready?'Готов':'Черновик');tr.dataset.pvStatus=ready?'ready':'draft';continue;
      }
      if(slug){statusBadge(statusCell,'published','Опубликовано');tr.dataset.pvStatus='published'}
    }
  }

  async function retryPublication(slug){
    if(busy)return;busy=true;
    try{
      const list=await fileJson(QUEUE,[]),item=list.find(x=>x.slug===slug);if(!item)throw new Error('Материал уже вышел или отсутствует в очереди');
      item.status='queued';item.post=item.post||{};item.post.status='queued';item.retryRequestedAt=new Date().toISOString();item.attempts=Number(item.attempts||0);
      delete item.error;delete item.errorMessage;delete item.lastError;delete item.failedAt;
      await window.putFile(QUEUE,JSON.stringify(list.sort((a,b)=>new Date(a.publishAt)-new Date(b.publishAt)),null,2)+'\n','Retry scheduled publication: '+slug);
      await window.refreshScheduledNow?.();say('Повтор публикации поставлен в очередь');decorateStatuses();
    }catch(e){say(e.message||'Не удалось повторить публикацию')}finally{busy=false}
  }

  function rawPreview(html){return String(html||'').replace(/https:\/\/provkus-media\.ru\/assets\/uploads\//g,RAW+'assets/uploads/').replace(/src=["']\/assets\/uploads\//g,m=>m.replace('/assets/uploads/',RAW+'assets/uploads/'))}
  async function mobilePreview(slug){
    let modal=$('#pvMobilePreview');if(!modal){modal=document.createElement('div');modal.id='pvMobilePreview';modal.className='pv-mobile-modal';document.body.appendChild(modal)}
    modal.innerHTML='<div class="pv-mobile-shell"><div class="pv-mobile-head"><strong>Мобильный предпросмотр · 390px</strong><button type="button" class="btn soft" data-pv-mobile-close>Закрыть</button></div><div class="pv-mobile-loading" role="status">Загружаю материал…</div><iframe title="Мобильный предпросмотр"></iframe></div>';
    modal.classList.add('open');modal.querySelector('[data-pv-mobile-close]').onclick=()=>modal.classList.remove('open');
    try{
      let item=queued().find(x=>x.slug===slug);
      if(typeof window.getFile==='function'&&window.getToken?.())try{const f=await window.getFile(QUEUE);if(f?.content){const list=JSON.parse(decode(f));item=list.find(x=>x.slug===slug)||item}}catch(e){console.warn('mobile preview: using loaded queue',e)}
      if(!item)throw new Error('Материал отсутствует в очереди');if(typeof window.articleHTML!=='function')throw new Error('Генератор предпросмотра ещё загружается');
      const html=rawPreview(window.articleHTML({...item.material,publishedAt:item.publishAt},item.post?.image||item.material?.image||''));
      if(!modal.classList.contains('open'))return;
      modal.querySelector('.pv-mobile-loading')?.remove();modal.querySelector('iframe').srcdoc=html;
    }catch(e){const loading=modal.querySelector('.pv-mobile-loading');if(loading)loading.textContent=e.message||'Не удалось открыть материал';say(e.message||'Не удалось открыть мобильный предпросмотр')}
  }

  function sourceCount(o){const s=String(o.sourceHtml||o.source||'').trim();return s?(s.match(/https?:\/\//gi)||[]).length||1:0}
  function preflight(){
    const o=window.collect?.()||{},block=[],warn=[],slug=(o.slug||'').trim(),editing=o._editingSlug||'',editingQueued=window.__pvEditingScheduledSlug||'';
    if(!o.author)block.push('не выбран автор');
    if(!o.headline?.trim())block.push('нет заголовка');
    if(!o.seoTitle?.trim()&& !o.headline?.trim())block.push('нет SEO title');
    if(!o.lead?.trim())block.push('нет лида');
    if(!o.description?.trim())block.push('нет description');
    if(!slug)block.push('нет slug');
    if(!o.canonical?.trim())block.push('нет canonical');
    if(!o.publishedAt||!Number.isFinite(new Date(o.publishedAt).getTime()))block.push('неверная дата');
    const hasFile=!!$('#imageFile')?.files?.length;if(!hasFile&&!o.image?.trim())block.push('нет главного изображения');
    if(!o.imageAlt?.trim())block.push('нет alt изображения');
    if(!hasFile&&o.image&&!/^https:\/\//i.test(o.image))block.push('URL изображения должен быть HTTPS');
    if(window.editorialGenderValid&&!window.editorialGenderValid())block.push('проверьте согласование текста с автором');
    if(slug&&posts().some(p=>p.slug===slug)&&editing!==slug)block.push('slug уже занят опубликованным материалом');
    if(slug&&queued().some(q=>q.slug===slug)&&editingQueued!==slug)block.push('slug уже есть в очереди');
    const factHeavy=/безопас|новост/i.test(String(o.category||''))||/news/i.test(String(o.type||''));
    if(factHeavy&&!sourceCount(o))warn.push('для факт-чувствительной темы проверьте, нужны ли внешние источники');
    if(o.description&&o.description.trim().length<70)warn.push('description короче 70 знаков');
    const body=document.createElement('div');body.innerHTML=String(o.content||'');
    const badLinks=[...body.querySelectorAll('a[href]')].filter(a=>!/^https?:\/\//i.test(a.getAttribute('href')||'')&&!/^\//.test(a.getAttribute('href')||''));if(badLinks.length)warn.push(`сомнительных ссылок: ${badLinks.length}`);
    return {block,warn,o}
  }
  function renderPreflight(){
    const box=$('#pvPreflight');if(!box)return;const r=preflight();
    box.innerHTML=`<div class="pv-preflight-head"><strong>Проверка перед публикацией</strong><span class="${r.block.length?'bad':'ok'}">${r.block.length?'Блокирует: '+r.block.length:'Можно публиковать'}</span></div>${r.block.length?`<div class="pv-preflight-errors">${r.block.map(x=>'• '+esc(x)).join('<br>')}</div>`:''}${r.warn.length?`<div class="pv-preflight-warn">Предупреждения:<br>${r.warn.map(x=>'• '+esc(x)).join('<br>')}</div>`:''}`;
  }
  function installPreflight(){
    if(!$('#pvPreflight')){const aside=$('#material .grid > aside');if(aside){const box=document.createElement('div');box.id='pvPreflight';box.className='card pv-preflight';aside.appendChild(box)}}
    document.addEventListener('input',e=>{if(e.target.closest?.('#material')){clearTimeout(renderTimer);renderTimer=setTimeout(renderPreflight,120)}});
    document.addEventListener('change',e=>{if(e.target.closest?.('#material'))renderPreflight()});
    for(const id of ['publishBtn','scheduleBtn','savePublishedBtn']){const el=$('#'+id);if(!el||el.dataset.pvPreflightGuard)continue;el.dataset.pvPreflightGuard='1';el.addEventListener('click',e=>{const r=preflight();renderPreflight();if(r.block.length){e.preventDefault();e.stopImmediatePropagation();say('Публикация остановлена: '+r.block[0])}},true)}
    renderPreflight();
  }

  function installBulkUi(){
    const bulk=$('.pv-bulk');if(!bulk||$('#pvBulkAuthor'))return;
    bulk.insertAdjacentHTML('beforeend','<button type="button" class="btn soft" id="pvBulkAuthor">Выбранные: назначить автора</button><button type="button" class="btn soft" id="pvBulkCategory">Выбранные: сменить рубрику</button>');
    $('#pvBulkAuthor').onclick=()=>bulkChange('author');$('#pvBulkCategory').onclick=()=>bulkChange('category');
  }
  function selected(){return $$('[data-pv-select]:checked').map(x=>x.dataset.pvSelect).filter(Boolean)}
  function patchArticle(html,kind,value){
    const doc=new DOMParser().parseFromString(html,'text/html');
    if(kind==='author'){
      const a=AUTHORS[value];if(!a)throw new Error('Неизвестный автор');
      const link=doc.querySelector('.article-author a[href*="author-"]');if(link){link.textContent=value;link.setAttribute('href','../'+a.url)}
      const img=doc.querySelector('.article-author img');if(img){img.setAttribute('src','../'+a.photo);img.setAttribute('alt',value)}
      const role=doc.querySelector('.article-author .author-info span');if(role)role.textContent=a.role;
    }else{const k=doc.querySelector('.article-kicker');if(k)k.textContent=value}
    for(const s of doc.querySelectorAll('script[type="application/ld+json"]')){try{const root=JSON.parse(s.textContent),nodes=root?.['@graph']||[root];for(const n of nodes){if(!['Article','NewsArticle','Recipe','BlogPosting'].includes(n?.['@type']))continue;if(kind==='author'){const a=AUTHORS[value];n.author={'@type':'Person','@id':`https://provkus-media.ru/${a.url}#person`,name:value,url:`https://provkus-media.ru/${a.url}`} }else n.articleSection=value}s.textContent=JSON.stringify(root)}catch{}}
    return '<!doctype html>'+doc.documentElement.outerHTML
  }
  async function bulkChange(kind){
    const slugs=selected();if(!slugs.length)return say('Выберите материалы');
    let value='';
    if(kind==='author'){
      const names=Object.keys(AUTHORS),choice=prompt('Новый автор:\n'+names.map((x,i)=>`${i+1}. ${x}`).join('\n'),'1');if(choice===null)return;value=names[Number(choice)-1]||names.find(x=>x.toLowerCase()===choice.trim().toLowerCase())||'';if(!value)return say('Автор не распознан');
    }else{value=(prompt('Новая рубрика для выбранных материалов:','Продукты')||'').trim();if(!value)return}
    if(busy)return;busy=true;
    let batched=false;
    try{
      const currentPosts=await fileJson(POSTS,[]),currentQueue=await fileJson(QUEUE,[]);let postsChanged=false,queueChanged=false;const files=[];
      for(const slug of slugs){
        const p=currentPosts.find(x=>x.slug===slug);if(p){p[kind]=value;postsChanged=true;const f=await window.getFile(`articles/${slug}.html`);if(f?.content)files.push({path:`articles/${slug}.html`,content:patchArticle(decode(f),kind,value),message:`Bulk ${kind}: ${slug}`})}
        const q=currentQueue.find(x=>x.slug===slug);if(q){q.post=q.post||{};q.material=q.material||{};q.post[kind]=value;q.material[kind]=value;queueChanged=true}
      }
      if(!postsChanged&&!queueChanged)throw new Error('Выбранные материалы не найдены');
      batched=typeof window.beginPublishBatch==='function'&&window.beginPublishBatch();
      for(const f of files)await window.putFile(f.path,f.content,f.message);
      if(postsChanged){window.__pvListMutation=true;try{await window.putFile(POSTS,JSON.stringify(currentPosts,null,2)+'\n',`Bulk ${kind}: published materials`)}finally{window.__pvListMutation=false}}
      if(queueChanged)await window.putFile(QUEUE,JSON.stringify(currentQueue.sort((a,b)=>new Date(a.publishAt)-new Date(b.publishAt)),null,2)+'\n',`Bulk ${kind}: scheduled materials`);
      if(batched)await window.commitPublishBatch?.(`Bulk ${kind}: ${slugs.join(', ')}`);
      if(window.store)window.store.posts=currentPosts;await window.refreshScheduledNow?.();window.renderPosts?.();say(`Обновлено материалов: ${slugs.length}`)
    }catch(e){if(batched)window.cancelPublishBatch?.();say(e.message||'Массовое изменение не выполнено')}finally{busy=false}
  }

  async function dataState(){
    const el=$('#pvDataState');if(!el)return;
    try{const r=await fetch('/data/posts.json?pv-state='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);await r.json();lastDataOk=Date.now();el.textContent='Данные: свежие · '+new Date(lastDataOk).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});el.classList.remove('pv-state-error')}
    catch(e){el.textContent=`Данные: кэш · ошибка связи${lastDataOk?' · последняя связь '+new Date(lastDataOk).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):''}`;el.classList.add('pv-state-error')}
  }

  function installStyles(){if($('#pvWorkflowStyles'))return;const s=document.createElement('style');s.id='pvWorkflowStyles';s.textContent=`.status.pv-status.queued{background:#e8f1ff;color:#245b91}.status.pv-status.publishing{background:#fff4d7;color:#7f5d06}.status.pv-status.error{background:#ffe7e3;color:#a3342a}.status.pv-status.ready{background:#e5f5e9;color:#286844}.status.pv-status.draft{background:#f3efe4;color:#74684e}.pv-error-reason{margin-top:5px;color:#a3342a;font-size:11px;max-width:440px}.pv-preflight{padding:14px;margin-top:12px}.pv-preflight-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.pv-preflight-head .ok{color:#247044}.pv-preflight-head .bad,.pv-preflight-errors{color:#a3342a}.pv-preflight-errors,.pv-preflight-warn{margin-top:8px;font-size:12px;line-height:1.45}.pv-preflight-warn{color:#81600d}.pv-state-error{color:#a3342a!important}.pv-mobile-modal{display:none;position:fixed;inset:0;background:#000b;z-index:1500;padding:18px;overflow:auto}.pv-mobile-modal.open{display:block}.pv-mobile-shell{width:min(430px,100%);margin:0 auto;background:#fff;border-radius:18px;padding:12px}.pv-mobile-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.pv-mobile-shell iframe{display:block;width:390px;max-width:100%;height:844px;margin:auto;border:1px solid #bbb;border-radius:16px;background:#fff}`;document.head.appendChild(s)}

  document.addEventListener('click',e=>{
    const retry=e.target.closest?.('[data-pv-retry]');if(retry){e.preventDefault();e.stopPropagation();void retryPublication(retry.dataset.pvRetry);return}
    const mobile=e.target.closest?.('[data-pv-mobile-preview]');if(mobile){e.preventDefault();e.stopPropagation();void mobilePreview(mobile.dataset.pvMobilePreview);return}
    const edit=e.target.closest?.('[data-edit-scheduled],[data-live-edit-scheduled]');if(edit){window.__pvEditingScheduledSlug=edit.dataset.editScheduled||edit.dataset.liveEditScheduled||''}
    if(e.target.closest?.('#newArticleBtn'))window.__pvEditingScheduledSlug='';
  },true);
  function patch(){decorateStatuses();installPreflight();installBulkUi()}
  const tb=$('#postsTable');if(tb)new MutationObserver(()=>{clearTimeout(renderTimer);renderTimer=setTimeout(decorateStatuses,0)}).observe(tb,{childList:true,subtree:true});
  installStyles();let tries=0,t=setInterval(()=>{patch();if(++tries>220)clearInterval(t)},100);setInterval(()=>{decorateStatuses();dataState()},15000);setTimeout(dataState,600);
  window.addEventListener('focus',()=>{decorateStatuses();dataState()});window.addEventListener('pv-scheduled-updated',()=>setTimeout(decorateStatuses,0));
})();
