(()=>{
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const QUEUE_PATH='.github/scheduled-posts.json';
  const fmt=v=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return v||''}};
  const decode=f=>{if(!f?.content)return'';return new TextDecoder().decode(Uint8Array.from(atob(f.content.replace(/\n/g,'')),c=>c.charCodeAt(0)))};
  const future=o=>{const t=new Date(o?.publishedAt||0).getTime();return Number.isFinite(t)&&t>Date.now()+30000};
  const typeLabel=t=>({guide:'Инструкция / как сделать',explainer:'Разбор / объяснение',recipe:'Рецепт',selection:'Подборка',review:'Обзор',story:'История / опыт',news:'Новость',quiz:'Тест / викторина'})[t]||'Материал';

  async function readQueue(){
    try{const f=await window.getFile(QUEUE_PATH);return f?.content?JSON.parse(decode(f)):[]}catch(e){console.warn('scheduled queue read',e);return []}
  }
  async function writeQueue(items,message='Update scheduled publications'){
    const next=[...items].sort((a,b)=>new Date(a.publishAt)-new Date(b.publishAt));
    await window.putFile(QUEUE_PATH,JSON.stringify(next,null,2),message);
    if(typeof store!=='undefined'){store.scheduled=next;saveStore?.()}
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
  async function schedule(exitAfter=false){
    const btn=$('#publishBtn');
    try{
      if(location.protocol!=='https:')throw new Error('Отложенная публикация доступна только через HTTPS');
      if(typeof getToken==='function'&&!getToken())throw new Error('Сначала подключите сервер публикации или GitHub в Настройках');
      const o=window.collect?.()||{};const err=validate(o);if(err)throw new Error(err);
      if(!o.slug)o.slug=slugify(o.headline);if(!o.seoTitle)o.seoTitle=o.headline;if(!o.canonical)o.canonical=`https://provkus-media.ru/articles/${o.slug}.html`;if(!o.updatedAt)o.updatedAt=o.publishedAt;
      if(!future(o))throw new Error('Для отложенной публикации выберите дату и время в будущем');
      btn.disabled=true;btn.textContent='Ставлю в очередь…';const pr=$('#publishProgress');if(pr)pr.style.width='15%';
      if(typeof window.processInlineImagesInHtml==='function'){
        o.content=await window.processInlineImagesInHtml(o.content||'',o.slug);
        if(o.quiz?.afterContent)o.quiz.afterContent=await window.processInlineImagesInHtml(o.quiz.afterContent,o.slug+'-quiz');
      }
      let img=(o.image||'').trim(),images=img?[img]:[],file=$('#imageFile')?.files?.[0];
      if(file){images=await uploadCover(file,o.slug);img=images[0]}else if(!img)throw new Error('Добавьте главное изображение');
      if(pr)pr.style.width='55%';
      o.image=img;o.images=images;
      const post=makePost(o,img,images),item={slug:o.slug,publishAt:post.publishedAt,createdAt:new Date().toISOString(),material:o,post};
      const queue=await readQueue(),next=[item,...queue.filter(x=>x.slug!==o.slug)];
      await writeQueue(next,`Schedule: ${o.headline}`);
      if(typeof store!=='undefined'){store.draft=null;saveStore?.()}
      if(pr)pr.style.width='100%';flash?.(`Запланировано на ${fmt(item.publishAt)}`);
      if(exitAfter||true)document.querySelector('.nav-btn[data-target="publications"]')?.click();
      return true
    }catch(e){flash?.(e.message||'Не удалось запланировать публикацию');return false}
    finally{btn.disabled=false;paintButton()}
  }
  async function removeScheduled(slug,ask=true){
    const queue=await readQueue(),item=queue.find(x=>x.slug===slug);if(!item)return;
    if(ask&&!confirm(`Удалить из очереди «${item.post?.headline||slug}»?`))return;
    await writeQueue(queue.filter(x=>x.slug!==slug),`Unschedule: ${item.post?.headline||slug}`);flash?.('Публикация снята с очереди')
  }
  async function editScheduled(slug){
    const queue=await readQueue(),item=queue.find(x=>x.slug===slug);if(!item)return;
    window.fill?.({...item.material,_editingSlug:''});
    document.querySelector('.nav-btn[data-target="material"]')?.click();
    flash?.('Запланированный материал открыт для редактирования')
  }
  function paintButton(){
    const b=$('#publishBtn'),o=window.collect?.()||{};if(!b)return;
    if(future(o))b.textContent=`Запланировать на ${fmt(new Date(o.publishedAt))}`;else b.textContent='Опубликовать сейчас'
  }
  function enhanceList(){
    if(typeof window.renderPosts!=='function'||window.renderPosts.__scheduledWrapped)return;
    const base=window.renderPosts;
    const wrapped=function(){
      base();const tb=$('#postsTable'),items=store?.scheduled||[];if(!tb||!items.length)return;
      const placeholder=tb.querySelector('tr td[colspan]');if(placeholder)placeholder.closest('tr')?.remove();
      const rows=items.map(x=>`<tr class="scheduled-row"><td><strong>${String(x.post?.headline||x.slug).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong></td><td><span class="status" style="background:#e8f4ff;color:#1e5d8a">Запланировано</span></td><td>${x.post?.author||''}</td><td>${fmt(x.publishAt)}</td><td>—</td><td><div class="row-actions"><button type="button" class="btn soft" data-edit-scheduled="${x.slug}">Редактировать</button><button type="button" class="btn danger-btn" data-delete-scheduled="${x.slug}">Удалить</button></div></td></tr>`).join('');
      tb.insertAdjacentHTML('afterbegin',rows);
      $$('[data-edit-scheduled]').forEach(b=>b.onclick=()=>editScheduled(b.dataset.editScheduled));
      $$('[data-delete-scheduled]').forEach(b=>b.onclick=()=>removeScheduled(b.dataset.deleteScheduled,true));
    };wrapped.__scheduledWrapped=true;window.renderPosts=wrapped;window.renderPosts()
  }
  async function loadQueue(){const q=await readQueue();if(typeof store!=='undefined'){store.scheduled=q;saveStore?.();window.renderPosts?.()}}
  function install(){
    const btn=$('#publishBtn');if(!btn||btn.dataset.schedulerWrapped==='1')return;
    const base=btn.onclick;btn.dataset.schedulerWrapped='1';
    btn.onclick=async function(e){const o=window.collect?.()||{};if(future(o))return schedule(false);const result=await base?.call(this,e);if(result===true&&o.slug){try{await removeScheduled(o.slug,false)}catch(err){console.warn('unschedule after immediate publish',err)}}return result};
    $('#publishedAt')?.addEventListener('input',paintButton);paintButton();enhanceList();loadQueue();
    document.querySelector('.nav-btn[data-target="publications"]')?.addEventListener('click',()=>loadQueue(),true);
  }
  let n=0,t=setInterval(()=>{n++;if(typeof window.collect==='function'&&typeof window.getFile==='function'&&typeof window.putFile==='function'&&typeof $('#publishBtn')?.onclick==='function'&&$('#pvCmsExtrasStyles')&&$('#placementCard')){clearInterval(t);install()}else if(n>240)clearInterval(t)},50)
})();
