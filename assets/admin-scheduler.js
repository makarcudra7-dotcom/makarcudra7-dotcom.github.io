(()=>{
  'use strict';
  if(window.__pvSchedulerLoaded)return;window.__pvSchedulerLoaded=true;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const QUEUE_PATH='.github/scheduled-posts.json';
  const QUEUE_RAW='https://raw.githubusercontent.com/makarcudra7-dotcom/makarcudra7-dotcom.github.io/main/.github/scheduled-posts.json';
  const fmt=v=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return v||''}};
  const decode=f=>{if(!f?.content)return'';return new TextDecoder().decode(Uint8Array.from(atob(f.content.replace(/\n/g,'')),c=>c.charCodeAt(0)))};
  const future=o=>{const t=new Date(o?.publishedAt||0).getTime();return Number.isFinite(t)&&t>Date.now()+30000};
  const typeLabel=t=>({guide:'Инструкция / как сделать',explainer:'Разбор / объяснение',recipe:'Рецепт',selection:'Подборка',review:'Обзор',story:'История / опыт',news:'Новость',quiz:'Тест / викторина'})[t]||'Материал';

  async function readQueue(){
    try{
      const f=await window.getFile(QUEUE_PATH);
      if(f?.content)return JSON.parse(decode(f));
      if(f===null)return [];
    }catch(e){console.warn('scheduled queue server read',e)}
    try{
      const r=await fetch(QUEUE_RAW+'?t='+Date.now(),{cache:'no-store',headers:{Accept:'application/json'}});
      if(r.status===404)return [];
      if(!r.ok)throw new Error('GitHub raw '+r.status);
      const q=await r.json();
      return Array.isArray(q)?q:[];
    }catch(e){console.warn('scheduled queue public fallback',e);return null}
  }
  async function writeQueue(items,message='Update scheduled publications'){
    const next=[...items].sort((a,b)=>new Date(a.publishAt)-new Date(b.publishAt));
    await window.putFile(QUEUE_PATH,JSON.stringify(next,null,2),message);
    const visible=next.filter(x=>!x?.pausedRecovery);
    if(typeof store!=='undefined'){store.scheduled=visible;saveStore?.();window.store=store}
    window.__pvScheduledSnapshot=visible;
    window.dispatchEvent(new CustomEvent('pv-scheduled-updated',{detail:{items:next}}));
    window.renderPosts?.();
    return next
  }
  async function cropBlob(file,w,h,q=.86){
    const bmp=await createImageBitmap(file),scale=Math.max(w/bmp.width,h/bmp.height),sw=w/scale,sh=h/scale,sx=(bmp.width-sw)/2,sy=(bmp.height-sh)/2;
    const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(bmp,sx,sy,sw,sh,0,0,w,h);bmp.close?.();
    return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Не удалось подготовить изображение')),'image/jpeg',q))
  }
  async function uploadCover(file,slug){
    const specs=[['16x9',1600,900],['4x3',1200,900],['1x1',1200,1200]],urls=[];
    for(const [tag,w,h] of specs){const blob=await cropBlob(file,w,h),path=`assets/uploads/${slug}-${tag}.jpg`;await window.putFile(path,bytesToB64(await blob.arrayBuffer()),`Upload ${tag} cover: ${slug}`,'base64');urls.push(`https://provkus-media.ru/${path}`)}
    return urls
  }
  function validate(o){
    if(!o.headline||!o.description)return'Заполните заголовок и description';
    if(!o.lead)return'Добавьте лид';
    if(!o.imageAlt)return'Добавьте Alt к изображению';
    if(o.type==='quiz'){
      const qs=o.quiz?.questions||[];if(!qs.length)return'Добавьте хотя бы один вопрос в тест';
      for(let i=0;i<qs.length;i++){const q=qs[i];if(!q.question)return`Заполните текст вопроса ${i+1}`;if(!Array.isArray(q.options)||q.options.length!==4||q.options.some(x=>!String(x).trim()))return`Заполните все 4 варианта ответа у вопроса ${i+1}`}
    }
    return''
  }
  function makePost(o,img,images){
    return {slug:o.slug,headline:o.headline,description:o.description,author:o.author,coauthors:Array.isArray(o.coauthors)?o.coauthors.filter(Boolean):[],category:o.category,type:o.type,typeLabel:typeLabel(o.type),image:img,images,imageAlt:o.imageAlt,url:`https://provkus-media.ru/articles/${o.slug}.html`,publishedAt:new Date(o.publishedAt).toISOString(),updatedAt:new Date(o.updatedAt||o.publishedAt).toISOString(),tags:(o.tags||'').split(',').map(x=>x.trim()).filter(Boolean),photoSource:o.photoSource||'',featured:!!o.featured,popular:!!o.popular,quizCount:o.type==='quiz'?(o.quiz?.questions?.length||0):undefined}
  }
  function lockActions(on,label=''){
    const pub=$('#publishBtn'),plan=$('#scheduleBtn');
    if(pub)pub.disabled=on;if(plan)plan.disabled=on;
    if(on&&plan)plan.textContent=label||'Ставлю в очередь…';
    if(!on)paintButtons()
  }
  async function schedule(exitAfter=false){
    try{
      if(location.protocol!=='https:')throw new Error('Отложенная публикация доступна только через HTTPS');
      if(typeof getToken==='function'&&!getToken())throw new Error('Сначала подключите сервер публикации или GitHub в Настройках');
      const o=window.collect?.()||{},err=validate(o);if(err)throw new Error(err);
      if(!o.slug)o.slug=slugify(o.headline);if(!o.seoTitle)o.seoTitle=o.headline;if(!o.canonical)o.canonical=`https://provkus-media.ru/articles/${o.slug}.html`;if(!o.updatedAt)o.updatedAt=o.publishedAt;
      if(!future(o))throw new Error('Для планирования выберите дату и время хотя бы на минуту вперёд');
      lockActions(true,'Ставлю в очередь…');const pr=$('#publishProgress');if(pr)pr.style.width='15%';
      if(typeof window.processInlineImagesInHtml==='function'){
        o.content=await window.processInlineImagesInHtml(o.content||'',o.slug);
        if(o.quiz?.afterContent)o.quiz.afterContent=await window.processInlineImagesInHtml(o.quiz.afterContent,o.slug+'-quiz');
      }
      let img=(o.image||'').trim(),images=img?[img]:[],file=$('#imageFile')?.files?.[0];
      if(file){images=await uploadCover(file,o.slug);img=images[0]}else if(!img)throw new Error('Добавьте главное изображение');
      if(pr)pr.style.width='55%';
      o.image=img;o.images=images;
      const post=makePost(o,img,images),item={slug:o.slug,publishAt:post.publishedAt,createdAt:new Date().toISOString(),material:o,post};
      const queue=await readQueue();if(!Array.isArray(queue))throw new Error('Не удалось загрузить очередь публикаций. Повторите попытку.');
      const next=[item,...queue.filter(x=>x.slug!==o.slug)];
      await writeQueue(next,`Schedule: ${o.headline}`);
      if(typeof store!=='undefined'){store.draft=null;saveStore?.()}
      if(pr)pr.style.width='100%';flash?.(`Запланировано на ${fmt(item.publishAt)}`);
      document.querySelector('.nav-btn[data-target="publications"]')?.click();
      return true
    }catch(e){flash?.(e.message||'Не удалось запланировать публикацию');return false}
    finally{lockActions(false)}
  }
  async function removeScheduled(slug,ask=true){
    const queue=await readQueue();if(!Array.isArray(queue))return flash?.('Не удалось загрузить очередь');
    const item=queue.find(x=>x.slug===slug);if(!item)return;
    if(ask&&!confirm(`Удалить из очереди «${item.post?.headline||slug}»?`))return;
    await writeQueue(queue.filter(x=>x.slug!==slug),`Unschedule: ${item.post?.headline||slug}`);flash?.('Публикация снята с очереди')
  }
  async function editScheduled(slug){
    const queue=await readQueue();if(!Array.isArray(queue))return flash?.('Не удалось загрузить очередь');
    const item=queue.find(x=>x.slug===slug);if(!item)return;
    window.fill?.({...item.material,_editingSlug:''});
    document.querySelector('.nav-btn[data-target="material"]')?.click();
    flash?.('Запланированный материал открыт для редактирования')
  }
  function ensureScheduleButton(){
    let b=$('#scheduleBtn');if(b)return b;
    const pub=$('#publishBtn'),actions=pub?.parentElement;if(!pub||!actions)return null;
    b=document.createElement('button');b.type='button';b.id='scheduleBtn';b.className='btn schedule';b.textContent='Запланировать';b.title='Поставить материал в очередь на выбранную дату и время';actions.insertBefore(b,pub);return b
  }
  function paintButtons(){
    const pub=$('#publishBtn'),plan=ensureScheduleButton(),o=window.collect?.()||{};
    if(pub){pub.textContent='Опубликовать сейчас';pub.title='Опубликовать материал сразу'}
    if(!plan)return;
    if(future(o)){plan.textContent=`Запланировать · ${fmt(new Date(o.publishedAt))}`;plan.classList.add('is-ready');plan.title='Материал выйдет автоматически в выбранное время'}
    else{plan.textContent='Запланировать';plan.classList.remove('is-ready');plan.title='Сначала выберите дату и время публикации в будущем'}
  }
  function enhanceList(){
    if(typeof window.renderPosts!=='function'||window.renderPosts.__scheduledWrapped)return;
    const base=window.renderPosts;
    const wrapped=function(){
      base();const tb=$('#postsTable'),items=(typeof store!=='undefined'&&Array.isArray(store.scheduled))?store.scheduled.filter(x=>!x?.pausedRecovery):[];if(!tb||!items.length)return;
      const placeholder=tb.querySelector('tr td[colspan]');if(placeholder)placeholder.closest('tr')?.remove();
      const rows=items.map(x=>`<tr class="scheduled-row"><td><strong>${String(x.post?.headline||x.slug).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong></td><td><span class="status scheduled">Запланировано</span></td><td>${x.post?.author||''}</td><td>${fmt(x.publishAt)}</td><td>—</td><td><div class="row-actions"><button type="button" class="btn soft" data-edit-scheduled="${x.slug}">Редактировать</button><button type="button" class="btn danger-btn" data-delete-scheduled="${x.slug}">Удалить</button></div></td></tr>`).join('');
      tb.insertAdjacentHTML('afterbegin',rows);
      $$('[data-edit-scheduled]').forEach(b=>b.onclick=()=>editScheduled(b.dataset.editScheduled));
      $$('[data-delete-scheduled]').forEach(b=>b.onclick=()=>removeScheduled(b.dataset.deleteScheduled,true));
    };wrapped.__scheduledWrapped=true;window.renderPosts=wrapped;window.renderPosts()
  }
  async function loadQueue(){
    const q=await readQueue();
    if(!Array.isArray(q))return false;
    const visible=q.filter(x=>!x?.pausedRecovery);
    if(typeof store!=='undefined'){store.scheduled=visible;saveStore?.();window.store=store;window.__pvScheduledSnapshot=visible;window.renderPosts?.()}
    window.dispatchEvent(new CustomEvent('pv-scheduled-updated',{detail:{items:q}}));
    return true
  }
  window.reloadScheduledQueue=loadQueue;
  function install(){
    const pub=$('#publishBtn'),plan=ensureScheduleButton();if(!pub||!plan||pub.dataset.schedulerWrapped==='1')return;
    const base=pub.onclick;pub.dataset.schedulerWrapped='1';
    pub.onclick=async function(e){
      const o=window.collect?.()||{};
      if(future(o)){flash?.('Выбрано будущее время — нажмите «Запланировать» или измените дату на текущую');return false}
      const result=await base?.call(this,e);if(result===true&&o.slug){try{await removeScheduled(o.slug,false)}catch(err){console.warn('unschedule after immediate publish',err)}}return result
    };
    plan.onclick=()=>schedule(false);
    $('#publishedAt')?.addEventListener('input',paintButtons);$('#publishedAt')?.addEventListener('change',paintButtons);paintButtons();enhanceList();
    loadQueue();setTimeout(loadQueue,1200);setTimeout(loadQueue,3200);
    document.querySelector('.nav-btn[data-target="publications"]')?.addEventListener('click',()=>loadQueue(),true);
  }
  let n=0,t=setInterval(()=>{n++;if(typeof window.collect==='function'&&typeof window.getFile==='function'&&typeof window.putFile==='function'&&typeof $('#publishBtn')?.onclick==='function'&&$('#pvCmsExtrasStyles')&&$('#placementCard')){clearInterval(t);install()}else if(n>400)clearInterval(t)},50)
})();
