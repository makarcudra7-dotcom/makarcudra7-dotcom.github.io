(()=>{
'use strict';
if(window.__pvOperations)return;window.__pvOperations=true;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode=f=>new TextDecoder().decode(Uint8Array.from(atob(f.content.replace(/\n/g,'')),c=>c.charCodeAt(0)));
const posts=()=>window.store?.posts||[];
const queued=()=>window.__pvScheduledSnapshot||window.store?.scheduled||[];
const bySlug=s=>posts().find(p=>p.slug===s);
const slugFromRow=tr=>{const a=tr.querySelector('a[href*="/articles/"]');try{return new URL(a.href).pathname.split('/').pop().replace(/\.html$/,'')}catch{return''}};
const message=s=>window.flash?.(s);
let busy=false,filters={status:'all',author:'all',date:'',category:'all'},renderPending=false,newsletter=[],sitemapCache=null,healthReport={};
function showBusy(on){busy=on;$$('[data-pv-action],#pvBulkApply').forEach(b=>b.disabled=on)}
async function fileJson(path,fallback=[]){const f=await window.getFile(path);return f?.content?JSON.parse(decode(f)):fallback}
async function savePosts(mutator,label){
 if(busy)return;showBusy(true);
 try{
   const current=await fileJson('data/posts.json');if(!Array.isArray(current)||!current.length)throw new Error('Список статей недоступен. Ничего не изменено.');
   const next=mutator(current);if(!Array.isArray(next))return;
   window.__pvListMutation=true;
   try{await window.putFile('data/posts.json',JSON.stringify(next,null,2),label)}finally{window.__pvListMutation=false}
   if(window.store)window.store.posts=next;
   window.renderPosts?.();message('Сохранено. Главная страница обновится после сборки сайта.');
 }catch(e){message(e.message||'Не удалось сохранить изменение');console.warn('publication action',e)}
 finally{showBusy(false)}
}
async function setPlacement(slug,kind){
 const p=bySlug(slug);if(!p)return;
 await savePosts(list=>{
  const target=list.find(x=>x.slug===slug);if(!target)throw new Error('Статья отсутствует в свежем списке');
  const on=!target[kind];target[kind]=on;
  if(kind==='featured'&&on)list.forEach(x=>{if(x.slug!==slug)x.featured=false});
  if(kind==='popular'&&on){const selected=list.filter(x=>x.popular);if(selected.length>7)selected.filter(x=>x.slug!==slug).sort((a,b)=>new Date(a.publishedAt)-new Date(b.publishedAt)).slice(0,selected.length-7).forEach(x=>x.popular=false)}
  return list;
 },`${kind==='featured'?'Homepage hero':'Popular placement'}: ${p.headline}`)
}
async function sendMail(slugs){
 if(busy||!slugs.length)return;
 if(!confirm(`Поставить в email-ленту ${slugs.length} материал(ов)? Повторная отправка создаст новый RSS-сигнал.`))return;
 showBusy(true);
 try{
  const list=await fileJson('data/newsletter-pushes.json');const now=Date.now();
  const newItems=slugs.filter(s=>bySlug(s)).map((slug,i)=>({id:`${slug}-${now+i}`,slug,sentAt:new Date(now+i).toISOString()}));
  if(!newItems.length)throw new Error('Нет опубликованных материалов для рассылки');
  const next=[...newItems,...list].slice(0,60);
  await window.putFile('data/newsletter-pushes.json',JSON.stringify(next,null,2),'Newsletter: '+newItems.map(x=>x.slug).join(', '));
  newsletter=next;decorate();message('Сигнал добавлен в RSS. Доставка подписчикам зависит от follow.it.');
 }catch(e){message(e.message||'Не удалось поставить в рассылку')}
 finally{showBusy(false)}
}
async function loadHealthReport(){try{const r=await fetch('/data/publication-health.json?pv='+Date.now(),{cache:'no-store'});if(r.ok){healthReport=await r.json();decorate()}}catch(e){console.warn('health report',e)}}
async function loadNewsletter(){try{newsletter=await fileJson('data/newsletter-pushes.json')}catch{newsletter=[]}decorate()}
function enrichRow(tr,slug){
 const p=bySlug(slug);if(!p)return;
 const cell=tr.querySelector('.row-actions')||tr.lastElementChild;if(!cell)return;
 // The older newsletter control uses the same signal; keep one clear action.
 cell.querySelectorAll('[data-newsletter-send],.newsletter-sent').forEach(el=>el.remove());
 if(!cell.querySelector('[data-pv-action="featured"]'))cell.insertAdjacentHTML('beforeend',`<button type="button" class="btn soft" data-pv-action="featured" data-pv-slug="${esc(slug)}" aria-pressed="false">Главная</button><button type="button" class="btn soft" data-pv-action="popular" data-pv-slug="${esc(slug)}" aria-pressed="false">Популярное</button><button type="button" class="btn soft" data-pv-action="mail" data-pv-slug="${esc(slug)}">В рассылку</button><button type="button" class="btn soft" data-pv-action="health" data-pv-slug="${esc(slug)}">Проверить</button><button type="button" class="btn soft" data-pv-action="duplicate" data-pv-slug="${esc(slug)}">Копия</button><button type="button" class="btn soft" data-pv-action="note" data-pv-slug="${esc(slug)}">Заметка</button>`);
 for(const kind of ['featured','popular']){const b=cell.querySelector(`[data-pv-action="${kind}"]`);b.setAttribute('aria-pressed',String(!!p[kind]));b.classList.toggle('pv-selected',!!p[kind])}
 let marker=tr.querySelector('.pv-health-marker');const result=healthReport[slug];if(result){if(!marker){marker=document.createElement('small');marker.className='pv-health-marker';tr.children[0]?.appendChild(marker)}const label=result.errors?.length?' · Проверка: ошибка':' · Проверка: ОК';if(marker.textContent!==label)marker.textContent=label;marker.classList.toggle('pv-health-fail',!!result.errors?.length);marker.classList.toggle('pv-health-ok',!result.errors?.length);marker.title=(result.errors||[]).join('; ')||'Страница и фото доступны'}
 const mail=cell.querySelector('[data-pv-action="mail"]');if(mail)mail.title=newsletter.some(x=>x.slug===slug)?'Уже ставили в рассылку; можно отправить повторно':'Добавить сигнал в RSS для follow.it';
 if(!tr.querySelector('[data-pv-select]'))tr.children[0]?.insertAdjacentHTML('afterbegin',`<input type="checkbox" data-pv-select="${esc(slug)}" aria-label="Выбрать материал" class="pv-row-select"> `);
}
function decorate(){
 if(renderPending)return;renderPending=true;
 requestAnimationFrame(()=>{renderPending=false;for(const tr of $$('#postsTable tr')){const slug=slugFromRow(tr);if(slug)enrichRow(tr,slug);else if(tr.dataset.scheduledSlug&&!tr.querySelector('[data-pv-reschedule]')){tr.children[0]?.insertAdjacentHTML('afterbegin',`<input type="checkbox" data-pv-select="${esc(tr.dataset.scheduledSlug)}" aria-label="Выбрать запланированный материал" class="pv-row-select"> `);tr.querySelector('.row-actions')?.insertAdjacentHTML('beforeend',`<button type="button" class="btn soft" data-pv-reschedule="${esc(tr.dataset.scheduledSlug)}">Перенести</button><button type="button" class="btn soft" data-pv-publish-now="${esc(tr.dataset.scheduledSlug)}">Выпустить сейчас</button>`)} }applyFilters()})
}
function applyFilters(){
 const q=($('#postSearch')?.value||'').trim().toLowerCase();let visible=0,total=0;
 for(const tr of $$('#postsTable tr')){
  if(tr.querySelector('td[colspan]'))continue;total++;
  const slug=slugFromRow(tr),p=bySlug(slug),item=queued().find(x=>x.slug===tr.dataset.scheduledSlug),isDraft=tr.classList.contains('draft-row');
  const status=tr.dataset.pvStatus||(isDraft?'draft':item?'queued':'published'),author=p?.author||item?.post?.author||tr.children[2]?.textContent||'',category=p?.category||item?.post?.category||item?.material?.category||'',date=(p?.publishedAt||item?.publishAt||'').slice(0,10);
  const match=(!q||(tr.textContent+' '+(p?.url||item?.post?.url||item?.material?.canonical||'')).toLowerCase().includes(q))&&(filters.status==='all'||filters.status===status)&&(filters.author==='all'||filters.author===author)&&(filters.category==='all'||filters.category===category)&&(!filters.date||filters.date===date);
  tr.hidden=!match;if(match)visible++;
 }
 const count=$('#postSearchCount');if(count)count.textContent=`Показано: ${visible} из ${total}`;
 const empty=$('#postSearchEmpty');if(empty)empty.hidden=!!visible||!total;
}
window.pvApplyFilters=applyFilters;
function filtersUi(){
 const bar=$('#publications .card-body .cms-searchbar');if(!bar||$('#pvFilters'))return;
 const authors=[...new Set(posts().map(x=>x.author).filter(Boolean))].sort();const categories=[...new Set([...posts().map(x=>x.category),...queued().map(x=>x.post?.category||x.material?.category)].filter(Boolean))].sort();
 bar.insertAdjacentHTML('afterend',`<div id="pvFilters" class="pv-filters"><select id="pvStatus"><option value="all">Все статусы</option><option value="published">Опубликованы</option><option value="publishing">Публикуются</option><option value="queued">В очереди</option><option value="ready">Готовы</option><option value="draft">Черновики</option><option value="error">Ошибки</option></select><select id="pvAuthor"><option value="all">Все авторы</option>${authors.map(x=>`<option>${esc(x)}</option>`).join('')}</select><select id="pvCategory"><option value="all">Все рубрики</option>${categories.map(x=>`<option>${esc(x)}</option>`).join('')}</select><input type="date" id="pvDate" aria-label="Фильтр по дате"><button type="button" class="btn soft" id="pvClearFilters">Сбросить фильтры</button><button type="button" class="btn soft" id="pvCalendarBtn">Календарь недели</button><button type="button" class="btn soft" id="pvAuditBtn">Проверить вышедшие</button><span id="pvDataState" class="hint"></span></div><div id="pvCalendar" hidden></div><div class="pv-bulk"><button type="button" class="btn soft" id="pvBulkApply">Выбранные: в популярное</button><button type="button" class="btn soft" id="pvBulkMail">Выбранные: в рассылку</button><button type="button" class="btn soft" id="pvBulkSchedule">Выбранные: сдвинуть очередь</button></div>`);
 $('#pvStatus').onchange=e=>{filters.status=e.target.value;applyFilters()};$('#pvAuthor').onchange=e=>{filters.author=e.target.value;applyFilters()};$('#pvCategory').onchange=e=>{filters.category=e.target.value;applyFilters()};$('#pvDate').onchange=e=>{filters.date=e.target.value;applyFilters()};
 $('#pvClearFilters').onclick=()=>{filters={status:'all',author:'all',date:'',category:'all'};$('#pvStatus').value='all';$('#pvAuthor').value='all';$('#pvCategory').value='all';$('#pvDate').value='';const input=$('#postSearch');if(input){input.value='';input.dispatchEvent(new Event('input'))}applyFilters()};
 $('#pvCalendarBtn').onclick=toggleCalendar;$('#pvAuditBtn').onclick=healthAll;
 $('#pvBulkApply').onclick=()=>{const slugs=$$('[data-pv-select]:checked').map(x=>x.dataset.pvSelect);if(!slugs.length)return message('Выберите статьи');savePosts(list=>{let n=0;for(const p of list)if(slugs.includes(p.slug)&&!p.popular){p.popular=true;n++}if(list.filter(x=>x.popular).length>7)throw new Error('В «Популярном» максимум 7 статей. Выберите меньше.');return list},'Bulk popular placement')};
 $('#pvBulkMail').onclick=()=>sendMail($$('[data-pv-select]:checked').map(x=>x.dataset.pvSelect).filter(x=>bySlug(x)));$('#pvBulkSchedule').onclick=bulkReschedule;
 const style=document.createElement('style');style.textContent='.pv-filters,.pv-bulk{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:9px 0}.pv-filters select,.pv-filters input{padding:8px;border:1px solid #ddd;border-radius:8px}.pv-selected{background:#dff3e7!important;border-color:#87b89c!important}.pv-row-select{margin-right:8px}.pv-calendar-day{padding:10px;border:1px solid #eee;border-radius:9px;margin:6px 0}.pv-calendar-item{display:flex;justify-content:space-between;gap:10px;padding:5px}.pv-health-fail{color:#ac3b2c}.pv-health-ok{color:#216f45}';document.head.appendChild(style);
 applyFilters()
}
function toggleCalendar(){const box=$('#pvCalendar');if(!box)return;box.hidden=!box.hidden;if(box.hidden)return;const now=new Date(),end=new Date(now.getTime()+7*86400000),items=[...queued().map(x=>({slug:x.slug,title:x.post?.headline||x.slug,date:x.publishAt,status:'Очередь'})),...posts().filter(x=>new Date(x.publishedAt)>=now&&new Date(x.publishedAt)<=end).map(x=>({slug:x.slug,title:x.headline,date:x.publishedAt,status:'Вышла'}))].filter(x=>new Date(x.date)<=end).sort((a,b)=>new Date(a.date)-new Date(b.date));const groups={};for(const x of items){const day=new Date(x.date).toLocaleDateString('ru-RU',{day:'numeric',month:'long',weekday:'short'});(groups[day]||=[]).push(x)}box.innerHTML=Object.entries(groups).map(([day,list])=>`<div class="pv-calendar-day"><strong>${esc(day)}</strong>${list.map(x=>`<div class="pv-calendar-item"><span>${esc(new Date(x.date).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}))} · ${esc(x.title)}</span><small>${x.status}</small></div>`).join('')}</div>`).join('')||'<p class="hint">На ближайшую неделю публикаций нет.</p>'}
async function reschedule(slug){
 const item=queued().find(x=>x.slug===slug);if(!item)return message('Материал уже вышел или отсутствует в очереди');
 const old=new Date(item.publishAt),local=new Date(old-old.getTimezoneOffset()*60000).toISOString().slice(0,16),value=prompt('Новые дата и время публикации (местное время браузера, ГГГГ-ММ-ДДTЧЧ:ММ)',local);
 if(value===null)return;const date=new Date(value);if(!Number.isFinite(date.getTime())||date<=new Date())return message('Выберите корректное будущее время');
 if(!confirm(`Перенести публикацию с ${old.toLocaleString('ru-RU')} на ${date.toLocaleString('ru-RU')}?`))return;
 if(busy)return;showBusy(true);
 try{const list=await fileJson('.github/scheduled-posts.json');const target=list.find(x=>x.slug===slug);if(!target)throw new Error('Статья уже отсутствует в очереди');target.publishAt=date.toISOString();target.post.publishedAt=target.publishAt;target.material.publishedAt=value;target.material.updatedAt=value;target.post.updatedAt=target.publishAt;await window.putFile('.github/scheduled-posts.json',JSON.stringify(list.sort((a,b)=>new Date(a.publishAt)-new Date(b.publishAt)),null,2),'Reschedule: '+slug);await window.refreshScheduledNow?.();toggleCalendar();toggleCalendar();message('Время в очереди изменено')}
 catch(e){message(e.message||'Не удалось перенести публикацию')}finally{showBusy(false)}
}
async function health(slug,announce=true){
 const p=bySlug(slug);if(!p)return null;const failures=[];let page;
 try{const r=await fetch(`/articles/${encodeURIComponent(slug)}.html?pv-check=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);page=new DOMParser().parseFromString(await r.text(),'text/html');if(page.querySelector('h1')?.textContent?.trim()!==p.headline)failures.push('заголовок не совпал');if(page.querySelector('meta[name="robots"]')?.content?.includes('noindex'))failures.push('noindex');if(page.title!==p.headline)failures.push('SEO title не совпал');}catch(e){failures.push('страница недоступна: '+e.message)}
 try{if(!sitemapCache||Date.now()-sitemapCache.at>300000){const r=await fetch('/sitemap.xml?pv-check='+Date.now(),{cache:'no-store'});if(r.ok)sitemapCache={at:Date.now(),text:await r.text()}}if(sitemapCache&&!sitemapCache.text.includes(`/articles/${slug}.html`))failures.push('URL отсутствует в sitemap')}catch{failures.push('sitemap не удалось проверить')}
 const urls=[p.image,...(page?[...page.querySelectorAll('.article-body img')].map(x=>x.src):[])].filter(Boolean);for(const url of urls){try{const img=new Image();await new Promise((ok,no)=>{const t=setTimeout(()=>no(Error('тайм-аут')),7000);img.onload=()=>{clearTimeout(t);img.naturalWidth?ok():no(Error('пустое изображение'))};img.onerror=()=>{clearTimeout(t);no(Error('не загрузилось'))};img.src=url});}catch{failures.push('фото не загрузилось: '+url)}}
 const result={slug,failures,at:new Date().toISOString()};try{const cache=JSON.parse(localStorage.getItem('pvHealth')||'{}');cache[slug]=result;localStorage.setItem('pvHealth',JSON.stringify(cache))}catch{}
 if(announce)message(failures.length?`Проверка: ${failures.join('; ')}`:'Страница, заголовок и фотографии доступны');return result
}
async function healthAll(){const btn=$('#pvAuditBtn');btn.disabled=true;const list=posts(),todo=[...list];let done=0,bad=0;async function worker(){while(todo.length){const p=todo.shift();const r=await health(p.slug,false);done++;if(r?.failures.length)bad++;btn.textContent=`Проверено ${done}/${list.length}`}}await Promise.all(Array.from({length:Math.min(4,list.length)},worker));btn.disabled=false;btn.textContent='Проверить вышедшие';message(`Проверено ${list.length}; проблемы: ${bad}. Результаты сохранены в этом браузере.`)}
async function bulkReschedule(){
 const slugs=$$('[data-pv-select]:checked').map(x=>x.dataset.pvSelect).filter(x=>queued().some(q=>q.slug===x));
 if(!slugs.length)return message('Выберите запланированные статьи');
 const input=prompt('На сколько минут сдвинуть выбранные публикации? Отрицательное число — раньше.','30');if(input===null)return;
 const minutes=Number(input);if(!Number.isFinite(minutes)||minutes===0)return message('Укажите число минут');
 if(busy)return;showBusy(true);
 try{const list=await fileJson('.github/scheduled-posts.json');for(const item of list.filter(x=>slugs.includes(x.slug))){const date=new Date(new Date(item.publishAt).getTime()+minutes*60000);if(date<=new Date())throw new Error('Получится дата в прошлом — ничего не изменено');item.publishAt=date.toISOString();item.post.publishedAt=item.publishAt;const local=new Date(date-date.getTimezoneOffset()*60000).toISOString().slice(0,16);item.material.publishedAt=local;item.material.updatedAt=local;item.post.updatedAt=item.publishAt}await window.putFile('.github/scheduled-posts.json',JSON.stringify(list.sort((a,b)=>new Date(a.publishAt)-new Date(b.publishAt)),null,2),'Bulk reschedule: '+slugs.join(', '));await window.refreshScheduledNow?.();message(`Перенесено ${slugs.length} публикаций`)}catch(e){message(e.message||'Не удалось перенести очередь')}finally{showBusy(false)}
}
async function publishNow(slug){
 const item=queued().find(x=>x.slug===slug);if(!item)return message('Материал уже не в очереди');
 if(!confirm(`Выпустить сейчас «${item.post?.headline||slug}»?`))return;
 if(busy)return;showBusy(true);
 try{const list=await fileJson('.github/scheduled-posts.json');const target=list.find(x=>x.slug===slug);if(!target)throw new Error('Материал уже вышел');target.publishAt=new Date(Date.now()-1000).toISOString();target.post.publishedAt=target.publishAt;target.material.publishedAt=target.publishAt;await window.putFile('.github/scheduled-posts.json',JSON.stringify(list,null,2),'Publish now: '+slug);message('Задача отправлена. Статус изменится после автоматической публикации.');setTimeout(()=>window.refreshPublications?.(),5000)}catch(e){message(e.message||'Не удалось запустить публикацию')}finally{showBusy(false)}
}
const TEMPLATES={
 recipe:'<h2>Ингредиенты</h2><ul><li>Укажите продукты и количество</li></ul><h2>Как приготовить</h2><ol><li>Опишите первый шаг</li></ol><h2>Подача и хранение</h2><p>Добавьте проверенные детали.</p>',
 guide:'<h2>Что понадобится</h2><p></p><h2>Порядок действий</h2><ol><li></li></ol><h2>Что проверить в конце</h2><p></p>',
 explainer:'<h2>Короткий ответ</h2><p></p><h2>Почему так происходит</h2><p></p><h2>Практический вывод</h2><p></p>',
 news:'<h2>Что произошло</h2><p></p><h2>Что это значит для читателя</h2><p></p><h2>Что известно и что уточняется</h2><p></p>'
};
function installTemplates(){const bar=$('#editorToolbar');if(!bar||$('#pvTemplate'))return;const s=document.createElement('select');s.id='pvTemplate';s.setAttribute('aria-label','Шаблон статьи');s.innerHTML='<option value="">Шаблон текста…</option><option value="recipe">Рецепт</option><option value="guide">Инструкция</option><option value="explainer">Разбор</option><option value="news">Новость</option>';bar.appendChild(s);s.onchange=()=>{const html=TEMPLATES[s.value];if(!html)return;const rich=$('#richEditor');if(rich?.innerText?.trim()&&!confirm('Заменить текущий текст шаблоном?')){s.value='';return}window.setEditorHTML?.(html);$('#type').value=s.value;s.value='';rich?.dispatchEvent(new Event('input',{bubbles:true}));message('Структура добавлена; заполните факты и детали')}}
function installMediaLibrary(){const card=$('#placementCard');if(!card||$('#pvMediaBtn'))return;const btn=document.createElement('button');btn.type='button';btn.id='pvMediaBtn';btn.className='btn soft';btn.textContent='Выбрать обложку из медиатеки';card.appendChild(btn);btn.onclick=()=>{const list=posts().filter(x=>x.image).slice(0,50);let modal=$('#pvMediaModal');if(!modal){modal=document.createElement('div');modal.id='pvMediaModal';modal.style.cssText='position:fixed;inset:0;background:#0009;z-index:1100;overflow:auto;padding:28px';document.body.appendChild(modal)}modal.innerHTML='<div style="background:#fff;padding:18px;border-radius:12px;max-width:900px;margin:auto"><button type="button" class="btn soft" id="pvMediaClose">Закрыть</button><h2>Медиатека опубликованных обложек</h2><div id="pvMediaGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px"></div></div>';$('#pvMediaGrid').innerHTML=list.map(x=>`<button type="button" data-pv-media="${esc(x.slug)}" style="text-align:left;border:1px solid #ddd;background:white;border-radius:9px;padding:8px"><img src="${esc(x.image)}" alt="" loading="lazy" style="width:100%;aspect-ratio:16/9;object-fit:cover"><small>${esc(x.headline)}</small><br><small>Фото: ${esc(x.photoSource||'не указан')}</small></button>`).join('');$('#pvMediaClose').onclick=()=>modal.remove();$$('[data-pv-media]').forEach(b=>b.onclick=()=>{const p=bySlug(b.dataset.pvMedia);$('#image').value=p.image;$('#imageAlt').value=p.imageAlt||'';$('#photoSource').value=p.photoSource||'';$('#image').dispatchEvent(new Event('input',{bubbles:true}));modal.remove();message('Обложка выбрана. Проверьте право на повторное использование.')})}}
async function duplicate(slug){
 const p=bySlug(slug);if(!p)return;
 try{
  const f=await window.getFile(`articles/${slug}.html`);if(!f?.content)throw new Error('Не удалось загрузить исходный текст');
  const doc=new DOMParser().parseFromString(decode(f),'text/html'),body=doc.querySelector('.article-body');
  body?.querySelectorAll('.note,.pv-quiz,.quiz-after-content').forEach(x=>x.remove());
  $('#newArticleBtn')?.click();
  $('#headline').value=p.headline+' — новая версия';$('#headline').dispatchEvent(new Event('input',{bubbles:true}));
  $('#lead').value=doc.querySelector('.article-dek')?.textContent||'';$('#description').value=p.description||'';
  $('#category').value=p.category||'Продукты';$('#type').value=p.type||'guide';$('#tags').value=Array.isArray(p.tags)?p.tags.join(', '):'';
  if(typeof window.setEditorHTML==='function')window.setEditorHTML(body?.innerHTML||'');
  $('#slug').value='';$('#image').value='';$('#imageAlt').value='';$('#publishedAt').value='';$('#updatedAt').value='';
  message('Копия текста открыта как новый черновик. Задайте новый URL, дату и обложку.');
 }catch(e){message(e.message||'Не удалось создать копию')}
}

function note(slug){const key='pvNotes:'+slug,old=localStorage.getItem(key)||'',value=prompt('Редакторская заметка (хранится в этом браузере)',old);if(value!==null){localStorage.setItem(key,value);message('Заметка сохранена локально')}}
const HISTORY_KEY='pvEditorHistory';function snapshot(){try{const o=window.collect?.();if(!o?.headline&&!o?.content)return;const list=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');list.unshift({at:new Date().toISOString(),data:o});localStorage.setItem(HISTORY_KEY,JSON.stringify(list.slice(0,15)))}catch(e){console.warn('version history',e)}}
function history(){const list=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');if(!list.length)return message('Сохранённых версий пока нет');const choice=prompt('Номер версии для восстановления в редактор:\n'+list.map((x,i)=>`${i+1}. ${new Date(x.at).toLocaleString('ru-RU')} · ${x.data.headline}`).join('\n'));const n=Number(choice);if(n>=1&&n<=list.length){snapshot();window.fill?.(list[n-1].data);document.querySelector('.nav-btn[data-target="material"]')?.click();message('Версия восстановлена в редакторе; изменения ещё не опубликованы')}}
function editorTools(){const actions=$('.actions');if(!actions||$('#pvHistoryBtn'))return;const b=document.createElement('button');b.type='button';b.id='pvHistoryBtn';b.className='btn soft';b.textContent='Версии';b.onclick=history;actions.appendChild(b);['saveBtn','scheduleBtn','savePublishedBtn','publishBtn'].forEach(id=>$('#'+id)?.addEventListener('click',snapshot,true));let n=$('#pvDuplicateHint');if(!n){n=document.createElement('div');n.id='pvDuplicateHint';n.className='hint';$('#headline')?.closest('.field')?.appendChild(n)}$('#headline')?.addEventListener('input',()=>{const title=$('#headline').value.toLowerCase().trim();if(title.length<14){n.textContent='';return}const common=posts().filter(p=>p.headline.toLowerCase().includes(title)||title.includes(p.headline.toLowerCase())).slice(0,3);n.textContent=common.length?'Похожие темы: '+common.map(x=>x.headline).join(' · '):''})}
function init(){filtersUi();editorTools();installTemplates();installMediaLibrary();loadNewsletter();loadHealthReport();const tb=$('#postsTable');if(tb){new MutationObserver(decorate).observe(tb,{childList:true,subtree:true});decorate()}document.addEventListener('click',e=>{const b=e.target.closest?.('[data-pv-action],[data-pv-reschedule],[data-pv-publish-now]');if(!b)return;if(b.dataset.pvReschedule){reschedule(b.dataset.pvReschedule);return}if(b.dataset.pvPublishNow){publishNow(b.dataset.pvPublishNow);return}const s=b.dataset.pvSlug;switch(b.dataset.pvAction){case'featured':case'popular':setPlacement(s,b.dataset.pvAction);break;case'mail':sendMail([s]);break;case'health':health(s);break;case'duplicate':duplicate(s);break;case'note':note(s)}},true);setInterval(loadHealthReport,300000);setInterval(()=>{$('#pvDataState')&&($('#pvDataState').textContent=`${posts().length} опубликовано · ${queued().length} в очереди · сверка ${window.__pvLastRefreshAt?new Date(window.__pvLastRefreshAt).toLocaleTimeString('ru-RU'):'ожидается'}`)},30000)}
let tries=0,t=setInterval(()=>{if(++tries>200)return clearInterval(t);if(window.store&&window.putFile&&$('#postSearch')&&$('#postsTable')){clearInterval(t);init()}},50);
})();
