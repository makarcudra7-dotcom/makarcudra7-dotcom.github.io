(()=>{
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const categories=['Продукты','Рецепты','Дом и быт','Хранение продуктов','Безопасность еды','Здоровое питание','Кухонная техника','Покупки и выбор','Сезонное','Напитки','Десерты и выпечка','Люди и истории','Новости и тренды','Советы и лайфхаки'];
  const types=[['guide','Инструкция / как сделать'],['explainer','Разбор / объяснение'],['recipe','Рецепт'],['selection','Подборка'],['review','Обзор'],['story','История / опыт'],['news','Новость']];
  const typeSchema={guide:'Article',explainer:'Article',selection:'Article',review:'Article',story:'Article',recipe:'Recipe',news:'NewsArticle'};
  const nowLocal=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
  const isoFromLocal=v=>v?new Date(v).toISOString():new Date().toISOString();
  function activate(target){
    $$('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.target===target));
    $$('.section').forEach(s=>s.classList.toggle('active',s.id===target));
    const t={material:'Новая публикация',publications:'Все материалы',authors:'Авторы',settings:'Настройки'}[target]||'ProVkus CMS';
    $('#pageTitle')&&($('#pageTitle').textContent=t);
    $('.crumb')&&($('.crumb').textContent=target==='material'?'Материалы / Новый материал':'Материалы / '+t);
  }
  function resetNew(){
    const defaults={category:'Продукты',type:'guide',robots:'index, follow, max-image-preview:large',publishedAt:nowLocal(),updatedAt:nowLocal(),author:'Илья Титюлькин'};
    ['headline','lead','seoTitle','description','slug','canonical','ogImage','source','tags','image','imageAlt','photoSource'].forEach(id=>{const el=$('#'+id);if(el)el.value=''});
    Object.entries(defaults).forEach(([id,v])=>{const el=$('#'+id);if(el)el.value=v});

    if(typeof setEditorHTML==='function')setEditorHTML('<p>Начните писать материал…</p><h2>Подзаголовок</h2><p>Текст статьи.</p>');
    const fp=$('#imageFile'); if(fp)fp.value='';
    const ip=$('#imagePreview'); if(ip)ip.src='assets/fallback-cover.svg';
    const can=$('#canonical'); if(can)can.dataset.auto='1';
    if(typeof sync==='function')sync(); if(typeof authorSync==='function')authorSync();
    activate('material');
    try{store.draft=null;saveStore()}catch(e){}
  }
  function setupSelectors(){
    const c=$('#category'); if(c){c.innerHTML=categories.map(x=>`<option>${x}</option>`).join('');c.value='Продукты'}
    const t=$('#type'); if(t){t.innerHTML=types.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');t.value='guide'}
  }
  function addTopButtons(){
    const actions=$('.actions'); if(!actions)return;
    if(!$('#allMaterialsBtn')){const b=document.createElement('button');b.className='btn';b.id='allMaterialsBtn';b.textContent='Все материалы';actions.insertBefore(b,actions.firstChild);b.onclick=()=>activate('publications')}
    if(!$('#newArticleBtn')){const b=document.createElement('button');b.className='btn';b.id='newArticleBtn';b.textContent='+ Добавить статью';actions.insertBefore(b,actions.firstChild);b.onclick=resetNew}
    const save=$('#saveBtn'); if(save){save.textContent='Сохранить черновик';save.title='Черновик не публикуется'}
    const pub=$('#publishBtn'); if(pub)pub.textContent='Опубликовать';
    if(!$('#saveExitBtn')){const b=document.createElement('button');b.className='btn green';b.id='saveExitBtn';b.textContent='Сохранить и выйти';actions.appendChild(b)}
  }
  function sourceMarkup(v){if(!v)return'';const s=String(v).trim();if(/^https?:\/\//i.test(s))return `<a href="${esc(s)}" target="_blank" rel="noopener nofollow">${esc(s)}</a>`;return esc(s)}
  function formatHuman(iso){try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso))}catch(e){return iso}}
  function enhancedArticleHTML(o,img,images){
    const auth=AUTHORS.find(a=>a.name===o.author)||AUTHORS[0];
    const schemaType=typeSchema[o.type]||'Article', published=isoFromLocal(o.publishedAt), modified=isoFromLocal(o.updatedAt||o.publishedAt), canon=o.canonical||`https://provkus-media.ru/articles/${o.slug}.html`, allImages=(images&&images.length?images:[img]).filter(Boolean);
    const jsonld={'@context':'https://schema.org','@type':schemaType,headline:o.headline,description:o.description,image:allImages,datePublished:published,dateModified:modified,articleSection:o.category,keywords:(o.tags||'').split(',').map(x=>x.trim()).filter(Boolean),mainEntityOfPage:{'@type':'WebPage','@id':canon},inLanguage:'ru-RU',isAccessibleForFree:true,author:{'@type':'Person',name:o.author,url:`https://provkus-media.ru/${auth.url}`},publisher:{'@type':'Organization',name:'ProVkus',url:'https://provkus-media.ru/',logo:{'@type':'ImageObject',url:'https://provkus-media.ru/favicon.png'}}};
    const base=o.imageResponsive&&/-16x9\.jpg(?:\?.*)?$/.test(img)?img.replace(/\.jpg(?:\?.*)?$/,''):'';
    const responsive=base?` srcset="${esc(base)}-640.webp 640w, ${esc(base)}-1600.webp 1600w" sizes="(max-width: 900px) calc(100vw - 24px), 880px"`:'';
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.seoTitle||o.headline)}</title><meta name="description" content="${esc(o.description)}"><meta name="robots" content="${esc(o.robots||'index, follow, max-image-preview:large')}"><link rel="canonical" href="${esc(canon)}"><link rel="icon" href="/favicon.ico?v=20260923" sizes="any"><link rel="icon" type="image/png" sizes="64x64" href="/favicon.png?v=20260923"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=20260923"><link rel="manifest" href="/site.webmanifest"><meta property="og:type" content="article"><meta property="og:title" content="${esc(o.headline)}"><meta property="og:description" content="${esc(o.description)}"><meta property="og:image" content="${esc(img)}"><meta property="og:image:width" content="1600"><meta property="og:image:height" content="900"><meta property="article:published_time" content="${published}"><meta property="article:modified_time" content="${modified}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(img)}"><link rel="stylesheet" href="/assets/public.css?v=20260923-speed1"><script type="application/ld+json">${JSON.stringify(jsonld).replace(/<\//g,'<\\/')}</script></head><body><header class="site-header"><div class="container topbar"><a class="brand" href="../index.html">Pro<b>Vkus</b></a><nav class="main-nav"><a href="../category.html">Материалы</a><a href="../authors.html">Авторы</a></nav></div></header><main class="container"><article class="article-wrap"><div class="article-kicker">${esc(o.category)}</div><h1 class="article-title">${esc(o.headline)}</h1><p class="article-dek">${esc(o.lead)}</p><div class="article-author"><img class="avatar" src="../${esc((auth.photo||'').replace('.svg','.jpg'))}" alt="${esc(o.author)}"><div class="author-info"><strong><a href="../${esc(auth.url)}">${esc(o.author)}</a></strong><span>${esc(auth.role)}</span></div></div><div class="article-date"><span>Опубликовано <time datetime="${published}">${formatHuman(published)}</time></span>${modified!==published?`<span>Обновлено <time datetime="${modified}">${formatHuman(modified)}</time></span>`:''}</div><img class="article-cover" src="${esc(img)}"${responsive} width="1600" height="900" fetchpriority="high" alt="${esc(o.imageAlt)}">${o.photoSource?`<div class="photo-credit">Фото: ${sourceMarkup(o.photoSource)}</div>`:''}<div class="article-body">${o.content}${o.sourceHtml||o.source?`<div class="note"><strong>${o.sourceHtml?.includes('<li>')?'Источники:':'Источник:'}</strong> ${o.sourceHtml||sourceMarkup(o.source)}</div>`:''}</div></article></main><script src="/assets/app.js?v=20260923-speed1"></script></body></html>`
  }
  window.enhancedArticleHTML=enhancedArticleHTML;
  async function cropBlob(file,w,h,q=.86,format='image/jpeg'){
    const bmp=await createImageBitmap(file), scale=Math.max(w/bmp.width,h/bmp.height), sw=w/scale, sh=h/scale, sx=(bmp.width-sw)/2, sy=(bmp.height-sh)/2;
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(bmp,sx,sy,sw,sh,0,0,w,h);bmp.close?.();
    return new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error('Не удалось подготовить изображение')),format,q));
  }
  async function blobB64(blob){return bytesToB64(await blob.arrayBuffer())}
  async function uploadVariants(file,slug){
    const specs=[['16x9',1600,900],['4x3',1200,900],['1x1',1200,1200]], urls=[];
    for(const [tag,w,h] of specs){const blob=await cropBlob(file,w,h),path=`assets/uploads/${slug}-${tag}.jpg`;await putFile(path,await blobB64(blob),`Upload ${tag} cover: ${slug}`,'base64');urls.push(`https://provkus-media.ru/${path}`)}
    for(const width of [640,1600]){const blob=await cropBlob(file,width,Math.round(width*9/16),.78,'image/webp');if(blob.type!=='image/webp')break;const path=`assets/uploads/${slug}-16x9-${width}.webp`;await putFile(path,await blobB64(blob),`Upload ${width}px cover: ${slug}`,'base64');urls.optimized=true}
    return urls;
  }
  async function publishV3(exitAfter=false){
    const btn=$('#publishBtn'), exitBtn=$('#saveExitBtn');
    try{
      if(location.protocol!=='https:')throw new Error('Публикация доступна только через HTTPS');
      if(!getToken())throw new Error('Сначала подключите GitHub в Настройках');
      const o=collect();
      if(!o.headline||!o.description)throw new Error('Заполните заголовок и description');
      if(!o.slug)o.slug=slugify(o.headline);
      if(!o.seoTitle)o.seoTitle=o.headline;
      if(!o.lead)throw new Error('Добавьте лид');
      if(!o.source)throw new Error('Укажите источник / первоисточник');
      if(!o.imageAlt)throw new Error('Добавьте Alt к изображению');
      if(!o.publishedAt)o.publishedAt=nowLocal(); if(!o.updatedAt)o.updatedAt=o.publishedAt;
      if(!o.canonical)o.canonical=`https://provkus-media.ru/articles/${o.slug}.html`;
      btn.disabled=true;if(exitBtn)exitBtn.disabled=true;btn.textContent='Публикация…';
      const pr=$('#publishProgress'); if(pr)pr.style.width='15%';
      let images=[],img=o.image||'',file=$('#imageFile')?.files?.[0];
      if(file){images=await uploadVariants(file,o.slug);img=images[0]} else if(img){images=[img]} else throw new Error('Добавьте главное изображение');
      o.imageResponsive=!!images.optimized||!!store.posts?.find(p=>p.slug===o.slug&&p.image===img&&p.imageResponsive);
      if(pr)pr.style.width='55%';
      await putFile(`articles/${o.slug}.html`,enhancedArticleHTML(o,img,images),`Publish: ${o.headline}`);
      let pf=await getFile('data/posts.json'),posts=[];if(pf?.content){try{posts=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(pf.content.replace(/\n/g,'')),c=>c.charCodeAt(0))))}catch(e){}}
      const rec={slug:o.slug,headline:o.headline,description:o.description,author:o.author,category:o.category,type:o.type,typeLabel:(types.find(x=>x[0]===o.type)||[])[1]||'Материал',image:img,images,imageResponsive:o.imageResponsive,imageAlt:o.imageAlt,url:`https://provkus-media.ru/articles/${o.slug}.html`,publishedAt:isoFromLocal(o.publishedAt),updatedAt:isoFromLocal(o.updatedAt),tags:(o.tags||'').split(',').map(x=>x.trim()).filter(Boolean),photoSource:o.photoSource||''};
      posts=[rec,...posts.filter(p=>p.slug!==o.slug)].sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));
      await putFile('data/posts.json',JSON.stringify(posts,null,2),`Update post index: ${o.headline}`);
      store.posts=posts;store.draft=null;saveStore();renderPosts();if(pr)pr.style.width='100%';flash('Материал опубликован');
      if(exitAfter){activate('publications');resetNew();activate('publications')}
      return true;
    }catch(e){flash(e.message);return false}finally{btn.disabled=false;if(exitBtn)exitBtn.disabled=false;btn.textContent='Опубликовать'}
  }
  function enhanceTable(){
    const old=renderPosts;window.renderPosts=function(){old();const th=$('#postsTable')?.closest('table')?.querySelector('thead tr');if(th&&!th.querySelector('.actions-col')){const x=document.createElement('th');x.className='actions-col';x.textContent='Действия';th.appendChild(x)}
      $$('#postsTable tr').forEach((tr,i)=>{if(tr.children.length<5)return;const p=store.posts?.[i];if(!p||tr.querySelector('.row-actions'))return;const td=document.createElement('td');td.className='row-actions';td.innerHTML=`<a class="btn soft" href="${esc(p.url)}" target="_blank">Открыть</a>`;tr.appendChild(td)})};renderPosts();
  }
  setupSelectors();addTopButtons();
  const ps=$('#photoSource'),psb=$('#photoSourceBtn');if(psb&&ps){psb.onclick=()=>{const v=prompt('Источник фото — введите вручную',ps.value||'');if(v!==null)ps.value=v.trim()}}
  $('#publishBtn').onclick=()=>publishV3(false);
  $('#saveExitBtn').onclick=()=>publishV3(true);
  $('#newArticleBtn').onclick=resetNew;$('#allMaterialsBtn').onclick=()=>activate('publications');
  $$('.nav-btn[data-target]').forEach(b=>b.onclick=()=>activate(b.dataset.target));
  enhanceTable();
  setTimeout(resetNew,0);
})();
