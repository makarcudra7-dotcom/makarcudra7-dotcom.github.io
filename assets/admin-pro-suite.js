(()=>{
  if(window.__pvAdminProLoaded)return;window.__pvAdminProLoaded=true;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const decode=f=>{if(!f?.content)return'';return new TextDecoder().decode(Uint8Array.from(atob(f.content.replace(/\n/g,'')),c=>c.charCodeAt(0)))};
  let authorsData=[];
  let authorsLoadedFromPublic=false;
  const postsStore=()=>typeof store!=='undefined'?store:null;

  function addStyles(){if($('#pvAdminProStyles'))return;const s=document.createElement('style');s.id='pvAdminProStyles';s.textContent=`
    .cms-searchbar{display:flex;gap:10px;align-items:center;margin:0 0 14px}.cms-searchbar input{flex:1;min-width:220px;padding:11px 13px;border:1px solid #d9d2c8;border-radius:10px;font:inherit}.cms-search-count{font-size:12px;color:#777;white-space:nowrap}.author-admin-grid{display:grid;gap:14px}.author-admin-card{border:1px solid #e4ddd3;border-radius:16px;padding:16px;background:#fff}.author-admin-head{display:flex;gap:12px;align-items:center;margin-bottom:14px}.author-admin-head img{width:64px;height:64px;border-radius:50%;object-fit:cover;background:#eee}.author-admin-head h3{margin:0 0 4px}.author-admin-form{display:grid;gap:10px}.author-admin-form .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.author-admin-form label{display:grid;gap:5px;font-size:11px;font-weight:800;color:#665f58}.author-admin-form input,.author-admin-form textarea{width:100%;border:1px solid #d7d0c6;border-radius:9px;padding:10px 11px;font:inherit;background:#fff}.author-admin-form textarea{min-height:84px;resize:vertical}.author-save-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.author-load-note{margin:0 0 14px;padding:10px 12px;border-radius:10px;background:#f7f3ec;color:#665f58;font-size:12px;line-height:1.45}.author-load-note.warn{background:#fff3dc;color:#7a5717}.related-exclude-check{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid #ece8df;cursor:pointer}.related-exclude-check input{width:18px;height:18px;margin-top:2px}.related-exclude-check span{display:grid;gap:3px}.related-exclude-check small{color:#777;line-height:1.3}.newsletter-send-btn{white-space:nowrap}.newsletter-sent{font-size:10px;color:#34745d;font-weight:800}.ctrlk-hint{margin-top:6px;font-size:10px;color:#7d756d}.row-actions{align-items:center}.newsletter-group-select{display:block;width:100%;margin:10px 0;padding:10px;border:1px solid #cad4dd;border-radius:8px;background:#fff;font:inherit}`;document.head.appendChild(s)}

  function installRelatedFlag(){
    const card=$('#placementCard .card-body');if(card&&!$('#excludeRelatedFlag'))card.insertAdjacentHTML('beforeend',`<label class="related-exclude-check"><input id="excludeRelatedFlag" type="checkbox"><span><strong>Исключить из «Читайте также»</strong><small>Материал не будет предлагаться в автоматическом блоке из трёх предыдущих публикаций.</small></span></label>`);
    if(typeof window.collect==='function'&&!window.collect.__proRelated){const base=window.collect;const wrapped=function(){const o=base();o.excludeRelated=!!$('#excludeRelatedFlag')?.checked;return o};wrapped.__proRelated=true;window.collect=wrapped}
    if(typeof window.fill==='function'&&!window.fill.__proRelated){const base=window.fill;const wrapped=function(o={}){base(o);if($('#excludeRelatedFlag'))$('#excludeRelatedFlag').checked=!!o.excludeRelated};wrapped.__proRelated=true;window.fill=wrapped}
  }

  function installNewsletterField(){
    const aside=$('#material .grid > aside');
    if(aside&&!$('#newsletterGroup')){
      const card=document.createElement('div');
      card.className='card';
      card.innerHTML='<div class="card-title">Рассылка</div><div class="card-body"><label for="newsletterGroup">Для какой подборки материал</label><select id="newsletterGroup" class="newsletter-group-select"><option value="0">Не включать</option><option value="1">1 материал</option><option value="3">3 материала</option><option value="5">5 материалов</option></select><p class="hint">После публикации нажмите «Отправить в рассылку». Подборка за день появится после заполнения.</p></div>';
      aside.insertBefore(card,aside.firstChild);
    }
    if(typeof window.collect==='function'&&!window.collect.__newsletterGroup){
      const base=window.collect;
      const wrapped=function(){const post=base();post.newsletterGroup=Number($('#newsletterGroup')?.value)||0;return post};
      wrapped.__newsletterGroup=true;window.collect=wrapped;
    }
    if(typeof window.fill==='function'&&!window.fill.__newsletterGroup){
      const base=window.fill;
      const wrapped=function(post={}){base(post);if($('#newsletterGroup'))$('#newsletterGroup').value=String([1,3,5].includes(Number(post.newsletterGroup))?post.newsletterGroup:0)};
      wrapped.__newsletterGroup=true;window.fill=wrapped;
    }
    const actions=$('.top .actions');
    if(actions&&!$('#sendCurrentNewsletter')){
      const button=document.createElement('button');button.type='button';button.className='btn soft';button.id='sendCurrentNewsletter';button.textContent='Отправить в рассылку';
      button.onclick=()=>sendNewsletter($('#slug')?.value.trim());
      actions.appendChild(button);
    }
  }

  function wrapPersistence(){
    if(typeof window.putFile!=='function'||window.putFile.__proSuite)return;
    const base=window.putFile;
    const wrapped=async function(path,content,message,encoding='utf-8'){
      if(encoding!=='base64'&&path==='data/posts.json'){
        try{const posts=JSON.parse(content),o=window.collect?.()||{};const p=posts.find(x=>x.slug===o.slug);if(p){p.excludeRelated=!!o.excludeRelated;p.newsletterGroup=Number(o.newsletterGroup)||0}content=JSON.stringify(posts,null,2)}catch(e){console.warn('related metadata',e)}
      }
      if(encoding!=='base64'&&path==='.github/scheduled-posts.json'){
        try{const items=JSON.parse(content);for(const item of items){if(item?.material&&item?.post)item.post.excludeRelated=!!item.material.excludeRelated}content=JSON.stringify(items,null,2)}catch(e){console.warn('scheduled related metadata',e)}
      }
      return base(path,content,message,encoding)
    };
    wrapped.__proSuite=true;window.putFile=wrapped
  }

  function installSearch(){
    const body=$('#publications .card-body');if(!body||$('#postSearch'))return;
    body.insertAdjacentHTML('afterbegin',`<div class="cms-searchbar"><input id="postSearch" type="search" placeholder="Поиск по заголовку или ссылке…" autocomplete="off"><span class="cms-search-count" id="postSearchCount"></span></div>`);
    const filter=()=>{const q=($('#postSearch')?.value||'').trim().toLowerCase(),rows=$$('#postsTable tr'),real=rows.filter(tr=>!tr.querySelector('td[colspan]'));let visible=0;for(const tr of real){const href=tr.querySelector('a[href]')?.href||'',hay=(tr.textContent+' '+href).toLowerCase(),show=!q||hay.includes(q);tr.hidden=!show;if(show)visible++}const c=$('#postSearchCount');if(c)c.textContent=q?`Найдено: ${visible}`:`Всего: ${real.length}`};
    $('#postSearch').addEventListener('input',filter);const mo=new MutationObserver(filter);mo.observe($('#postsTable'),{childList:true,subtree:true});filter()
  }

  function findSlug(tr){const a=tr.querySelector('a[href*="/articles/"]');if(!a)return'';try{return(new URL(a.href,location.href).pathname.split('/').pop()||'').replace(/\.html$/,'')}catch{return''}}
  async function sendNewsletter(slug){
    const post=(postsStore()?.posts||[]).find(x=>x.slug===slug);if(!post)return flash?.('Сначала опубликуйте материал на сайте');
    const group=Number(post.newsletterGroup)||0;
    if(![1,3,5].includes(group))return flash?.('Сначала выберите подборку 1, 3 или 5 и сохраните материал');
    if(!confirm(`Добавить «${post.headline}» в подборку на ${group} материалов?\n\nПосле заполнения подборка появится в отдельной RSS-ленте.`))return;
    try{
      const result=await window.sendNewsletterArticle(slug);
      flash?.(result.ready?`Подборка на ${group} материалов заполнена и появилась в RSS-ленте`:`Материал добавлен: ${result.count} из ${group}. Подборка появится после заполнения.`);
      enhanceRows()
    }catch(e){flash?.(e.message||'Не удалось отправить материал в рассылку')}
  }
  async function enhanceRows(){
    const pushes=await (async()=>{try{const f=await window.getFile('data/newsletter-pushes.json');return f?.content?JSON.parse(decode(f)):[]}catch{return[]}})();const pushed=new Map(pushes.map(x=>[x.slug,x]));
    $$('#postsTable tr').forEach(tr=>{const slug=findSlug(tr);if(!slug)return;let cell=tr.querySelector('.row-actions');if(!cell)return;const post=(postsStore()?.posts||[]).find(x=>x.slug===slug),group=Number(post?.newsletterGroup)||0;if(!cell.querySelector('[data-newsletter-send]'))cell.insertAdjacentHTML('beforeend',`<button type="button" class="btn soft newsletter-send-btn" data-newsletter-send="${esc(slug)}">Отправить в рассылку</button>`);const button=cell.querySelector('[data-newsletter-send]');button.title=group?`Подборка на ${group} материалов`:'Выберите подборку при редактировании материала';const hit=pushed.get(slug);let status=cell.querySelector('.newsletter-sent');if(hit){if(!status){status=document.createElement('span');status.className='newsletter-sent';cell.appendChild(status)}status.textContent=`Подборка ${hit.group||'?'} · ${new Date(hit.sentAt).toLocaleDateString('ru-RU')}`}else status?.remove()});
    $$('[data-newsletter-send]').forEach(b=>b.onclick=()=>sendNewsletter(b.dataset.newsletterSend))
  }

  function installCtrlK(){
    const rich=$('#richEditor');if(rich&&!rich.dataset.ctrlk){rich.dataset.ctrlk='1';rich.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='k')return;e.preventDefault();const sel=getSelection(),text=sel?.toString()||'',url=prompt('URL ссылки','https://');if(!url)return;rich.focus();if(text)document.execCommand('createLink',false,url);else{const label=prompt('Текст ссылки','Ссылка');if(label)document.execCommand('insertHTML',false,`<a href="${esc(url)}">${esc(label)}</a>`)}});rich.insertAdjacentHTML('afterend','<div class="ctrlk-hint">Ctrl+K — добавить ссылку к выделенному тексту</div>')}
    for(const id of ['source','photoSource']){const input=$('#'+id);if(!input||input.dataset.ctrlk)continue;input.dataset.ctrlk='1';input.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='k')return;e.preventDefault();const url=prompt('URL источника',/^https?:\/\//i.test(input.value)?input.value:'https://');if(url){input.value=url.trim();input.dispatchEvent(new Event('input',{bubbles:true}));flash?.('Ссылка источника добавлена')}});if(id==='source')input.insertAdjacentHTML('afterend','<div class="ctrlk-hint">Ctrl+K — быстро вставить кликабельный URL источника</div>')}
  }

  function syncGlobalAuthors(data){
    try{if(typeof AUTHORS!=='undefined'&&Array.isArray(AUTHORS)){AUTHORS.splice(0,AUTHORS.length,...data.map(a=>({name:a.name,role:a.role,photo:a.photo+(a.photoVersion?'?v='+a.photoVersion:''),url:a.url,bio:a.bio})));typeof renderAuthors==='function'&&renderAuthors()}}catch(e){console.warn('sync authors',e)}
  }
  async function loadAuthors(){
    const body=$('#authors .card-body');if(body)body.innerHTML='<div class="author-load-note">Загружаем профили авторов…</div>';
    let serverError=null;authorsLoadedFromPublic=false;authorsData=[];
    try{const f=await window.getFile('data/authors.json');if(f?.content)authorsData=JSON.parse(decode(f))}catch(e){serverError=e}
    if(!Array.isArray(authorsData)||!authorsData.length){
      try{const r=await fetch('/data/authors.json?'+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);authorsData=await r.json();authorsLoadedFromPublic=true}catch(e){if(body)body.innerHTML=`<div class="author-load-note warn"><strong>Не удалось загрузить авторов.</strong><br>${esc(serverError?.message||e.message||'Неизвестная ошибка')}</div>`;flash?.('Не удалось загрузить авторов');return}
    }
    syncGlobalAuthors(authorsData);renderAuthorEditor()
  }
  function field(a,i,key,label,area=false){const v=Array.isArray(a[key])?a[key].join(', '):(a[key]||'');return `<label>${label}${area?`<textarea data-author-field="${key}">${esc(v)}</textarea>`:`<input data-author-field="${key}" value="${esc(v)}">`}</label>`}
  function renderAuthorEditor(){
    const body=$('#authors .card-body');if(!body)return;
    const note=authorsLoadedFromPublic?'Профили загружены с сайта. Редактирование доступно; при сохранении CMS проверит сервер публикации.':'Изменения сохраняются в общий файл авторов и после деплоя появляются в карточках и профилях сайта.';
    body.innerHTML=`<div class="author-load-note${authorsLoadedFromPublic?' warn':''}">${esc(note)}</div><div class="author-admin-grid">${authorsData.map((a,i)=>`<article class="author-admin-card" data-author-index="${i}"><div class="author-admin-head"><img src="/${esc((a.photo||'assets/fallback-cover.svg').replace(/^\//,'')+(a.photoVersion?'?v='+a.photoVersion:''))}" alt=""><div><h3>${esc(a.name)}</h3><div class="hint">${esc(a.role)}</div></div></div><div class="author-admin-form"><div class="two">${field(a,i,'name','Имя и фамилия')}${field(a,i,'dativeFirst','Имя в дательном падеже')}</div><div class="two">${field(a,i,'role','Должность')}${field(a,i,'photo','Фото URL / путь')}</div><label>Заменить фото с компьютера<input type="file" accept="image/jpeg,image/png,image/webp" data-author-upload="${i}"><span class="hint">После сохранения фото появится на страницах сайта.</span></label>${field(a,i,'lead','Короткое позиционирование',true)}${field(a,i,'bio','Описание автора',true)}${field(a,i,'topics','Темы через запятую')}${field(a,i,'method','Как работает с темами',true)}${field(a,i,'useful','Когда обращаться к автору',true)}${field(a,i,'ask','Подсказка для формы вопроса',true)}<div class="author-save-row"><button type="button" class="btn green" data-save-author="${i}">Сохранить автора</button><span class="hint">Публичная страница: /${esc(a.url||'')}</span></div></div></article>`).join('')}</div>`;
    $$('[data-save-author]').forEach(b=>b.onclick=()=>saveAuthor(Number(b.dataset.saveAuthor)));
    $$('[data-author-upload]').forEach(input=>input.addEventListener('change',()=>{const file=input.files?.[0],img=input.closest('.author-admin-card')?.querySelector('.author-admin-head img');if(!file||!img)return;const url=URL.createObjectURL(file);img.onload=()=>URL.revokeObjectURL(url);img.src=url}))
  }
  async function saveAuthor(i){
    const card=$(`[data-author-index="${i}"]`),a=authorsData[i];if(!card||!a)return;const oldPhoto=a.photo;card.querySelectorAll('[data-author-field]').forEach(el=>{const k=el.dataset.authorField,v=el.value.trim();a[k]=k==='topics'?v.split(',').map(x=>x.trim()).filter(Boolean):v});
    if(a.photo!==oldPhoto)a.photoVersion=Date.now();
    if(!a.name||!a.role)return flash?.('У автора должны быть имя и должность');
    const btn=card.querySelector('[data-save-author]');if(btn){btn.disabled=true;btn.textContent='Сохраняем…'}
    try{
      const photoFile=card.querySelector('[data-author-upload]')?.files?.[0];
      if(photoFile){
        if(photoFile.size>12*1024*1024)throw new Error('Фото должно быть меньше 12 МБ');
        const bitmap=await createImageBitmap(photoFile),canvas=document.createElement('canvas');
        canvas.width=800;canvas.height=800;
        const size=Math.min(bitmap.width,bitmap.height),x=(bitmap.width-size)/2,y=(bitmap.height-size)/2;
        canvas.getContext('2d').drawImage(bitmap,x,y,size,size,0,0,800,800);bitmap.close?.();
        const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Не удалось обработать фото')),'image/jpeg',.88));
        const path=/^assets\/authors\/[a-z0-9-]+\.jpg$/.test(a.photo||'')?a.photo:'assets/authors/'+String(a.id||'author').replace(/[^a-z0-9-]/g,'')+'-profile.jpg';
        await window.putFile(path,bytesToB64(await blob.arrayBuffer()),'Update photo: '+a.name,'base64');
        a.photo=path;a.photoVersion=Date.now();
        card.querySelector('[data-author-field="photo"]').value=path;
      }
      await window.putFile('data/authors.json',JSON.stringify(authorsData,null,2),'Update author: '+a.name);authorsLoadedFromPublic=false;syncGlobalAuthors(authorsData);renderAuthorEditor();flash?.('Профиль автора сохранён')}catch(e){const msg=e.message||'Не удалось сохранить автора';let n=card.querySelector('.author-save-error');if(!n){n=document.createElement('div');n.className='author-load-note warn author-save-error';card.querySelector('.author-save-row')?.insertAdjacentElement('afterend',n)}if(n)n.textContent='Не удалось сохранить: '+msg;flash?.(msg)}finally{if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent='Сохранить автора'}}
  }

  function install(){addStyles();installRelatedFlag();installNewsletterField();wrapPersistence();installSearch();installCtrlK();loadAuthors();const tb=$('#postsTable');if(tb){const mo=new MutationObserver(()=>setTimeout(enhanceRows,0));mo.observe(tb,{childList:true,subtree:true});enhanceRows()}}
  let n=0,t=setInterval(()=>{n++;if(typeof window.getFile==='function'&&typeof window.putFile==='function'&&typeof window.collect==='function'&&typeof window.fill==='function'&&$('#postsTable')&&$('#authorsList')&&$('#placementCard')){clearInterval(t);install()}else if(n>300)clearInterval(t)},50)
})();
