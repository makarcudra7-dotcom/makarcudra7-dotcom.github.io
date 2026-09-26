(()=>{
  if(window.__pvHomeDynamicLoaded)return;window.__pvHomeDynamicLoaded=true;
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateLabel=v=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return''}};
  const img=p=>p?.image||p?.images?.[0]||'/assets/fallback-cover.svg';
  const href=p=>p?.url?new URL(p.url,location.origin).pathname:`/articles/${p.slug}.html`;
  const badge=p=>p?.type==='quiz'?'Тест':(p?.category||p?.typeLabel||'Материал');
  const published=p=>{const t=new Date(p?.publishedAt||0).getTime();return !Number.isFinite(t)||t<=Date.now()+15000};
  const adCta=()=>`<aside class="pv-ad-cta" aria-label="Реклама и спецпроекты"><div class="pv-ad-copy"><span class="pv-ad-kicker">Для брендов</span><h2>Реклама и спецпроекты в ProVkus</h2><p>Нативные интеграции, обзоры продуктов и специальные проекты для аудитории, которая интересуется едой, покупками и домом.</p></div><a class="pv-ad-button" href="/contacts.html">Обсудить размещение →</a></aside>`;
  const worldBlock=()=>`<section class="pv-world-home"><div class="container"><div class="pv-world-head"><div><span class="pv-world-kicker">Новый раздел</span><h2>Кухни мира</h2><p>95 домашних рецептов из 19 кулинарных направлений — от Китая и Грузии до Японии, Индии и русской кухни.</p></div><a class="pv-world-more" href="/world-cuisines.html">Все кухни →</a></div><div class="pv-world-grid"><a href="/world-cuisines.html#kitay"><strong>Китай</strong><span>5 рецептов</span></a><a href="/world-cuisines.html#italiya"><strong>Италия</strong><span>5 рецептов</span></a><a href="/world-cuisines.html#gruziya"><strong>Грузия</strong><span>5 рецептов</span></a><a href="/world-cuisines.html#yaponiya"><strong>Япония</strong><span>5 рецептов</span></a><a href="/world-cuisines.html#koreya"><strong>Корея</strong><span>5 рецептов</span></a><a href="/world-cuisines.html#indiya"><strong>Индия</strong><span>5 рецептов</span></a><a href="/world-cuisines.html#polsha"><strong>Польша</strong><span>5 рецептов</span></a><a href="/world-cuisines.html#russkaya"><strong>Русская</strong><span>5 рецептов</span></a></div></div></section>`;
  function ensureWorldBlock(){if(document.querySelector('.pv-world-home'))return;const tools=document.querySelector('.home-tools-section');if(tools)tools.insertAdjacentHTML('afterend',worldBlock());else document.querySelector('.hero')?.insertAdjacentHTML('afterend',worldBlock())}
  const card=(p,lead=false,priority=false)=>lead?`<a class="lead-card" href="${esc(href(p))}"><img fetchpriority="high" decoding="async" width="1600" height="900" src="${esc(img(p))}" alt="${esc(p.imageAlt||p.headline)}"><div class="lead-copy"><div class="eyebrow">${esc(badge(p))}</div><h1>${esc(p.headline)}</h1><p>${esc(p.description||'')}</p><div class="meta-row"><span>${esc(p.author||'')}</span><span>•</span><time datetime="${esc(p.publishedAt||'')}">${esc(dateLabel(p.publishedAt))}</time></div></div></a>`:`<a class="stack-card" href="${esc(href(p))}"><img loading="${priority?'eager':'lazy'}" decoding="async" src="${esc(img(p))}" width="1600" height="900" alt="${esc(p.imageAlt||p.headline)}"><div class="stack-copy"><span class="badge">${esc(badge(p))}</span><h3>${esc(p.headline)}</h3><div class="story-meta"><span>${esc(p.author||'')}</span><span>•</span><time datetime="${esc(p.publishedAt||'')}">${esc(dateLabel(p.publishedAt))}</time></div></div></a>`;
  const feedCard=p=>`<a class="story-card feed-card" href="${esc(href(p))}"><img src="${esc(img(p))}" width="1600" height="900" loading="lazy" decoding="async" alt="${esc(p.imageAlt||p.headline)}"><div class="story-body"><span class="badge">${esc(badge(p))}</span><h3>${esc(p.headline)}</h3><div class="story-meta"><span>${esc(p.author||'')}</span><span>•</span><time datetime="${esc(p.publishedAt||'')}">${esc(dateLabel(p.publishedAt))}</time></div></div></a>`;
  const popularRow=(p,i)=>`<a class="popular-row" href="${esc(href(p))}"><span class="popular-num">${i+1}</span><div><span class="popular-badge">${esc(badge(p))}</span><strong>${esc(p.headline)}</strong></div></a>`;
  function render(posts){
    const good=(posts||[]).filter(p=>p&&p.slug&&p.headline&&published(p)).sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
    if(!good.length){ensureWorldBlock();return;}
    const featured=good.find(p=>p.featured)||good[0];
    const side=good.filter(p=>p.slug!==featured.slug).slice(0,3);
    const heroUsed=new Set([featured.slug,...side.map(p=>p.slug)]);
    const hero=document.querySelector('.hero .hero-grid');if(hero)hero.innerHTML=`<div class="hero-main">${card(featured,true)}${adCta()}</div><div class="hero-side">${side.map((p,i)=>card(p,false,i===0)).join('')}</div>`;
    ensureWorldBlock();
    const freshCandidates=good.filter(p=>!heroUsed.has(p.slug)).slice(0,12);
    const marked=good.filter(p=>p.popular).slice(0,7),popular=[...marked];
    for(const p of good){if(popular.length>=7)break;if(popular.some(x=>x.slug===p.slug))continue;popular.push(p)}
    const section=document.querySelector('.section .container'),grid=section?.querySelector('.story-grid');if(!section||!grid)return;
    let lower=section.querySelector('.home-lower-grid');
    if(!lower){lower=document.createElement('div');lower.className='home-lower-grid';grid.parentNode.insertBefore(lower,grid);const pop=document.createElement('aside');pop.className='popular-panel';pop.innerHTML='<div class="popular-kicker">Выбор редакции</div><h2 class="popular-title">Популярное</h2><div class="popular-list"></div>';const fresh=document.createElement('div');fresh.className='fresh-wrap';lower.append(pop,fresh);fresh.appendChild(grid)}
    lower.querySelector('.popular-list').innerHTML=popular.slice(0,7).map(popularRow).join('');
    lower.querySelector('.story-grid').innerHTML=freshCandidates.map(feedCard).join('');
    window.__pvHomeRendered=true;
  }
  const source=window.__pvPostsPromise||fetch('/data/posts.json',{cache:'no-cache'}).then(r=>r.ok?r.json():[]);
  Promise.resolve(source).then(render).catch(()=>{ensureWorldBlock()}).finally(()=>{document.documentElement.classList.remove('pv-home-loading');document.documentElement.classList.add('pv-home-ready')});
})();
