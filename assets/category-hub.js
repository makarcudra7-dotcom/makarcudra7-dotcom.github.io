(()=>{
  const cfg={
    recipes:{title:'Рецепты',desc:'Проверенные домашние рецепты ProVkus: понятные шаги, доступные продукты и практичные советы.'},
    products:{title:'Продукты и выбор',desc:'Как выбирать продукты, читать маркировку, оценивать свежесть, состав и качество без переплаты за маркетинг.'},
    home:{title:'Дом и хранение',desc:'Хранение продуктов, холодильник, заморозка и практичная организация кухни без лишних потерь.'},
    safety:{title:'Безопасность еды',desc:'Безопасное хранение, размораживание, гигиена кухни и понятные ответы на спорные бытовые вопросы о еде.'}
  };
  const key=document.body.dataset.rubric;
  const meta=cfg[key];
  if(!meta)return;
  const match=p=>{
    const c=String(p.category||'').toLowerCase();
    if(key==='recipes')return c.includes('рецеп');
    if(key==='products')return c.includes('продукт')||c.includes('выбор');
    if(key==='home')return c.includes('дом')||c.includes('хран');
    if(key==='safety')return c.includes('безопас');
    return false;
  };
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(v))}catch{return''}};
  const card=p=>`<a class="story-card feed-card" href="/articles/${encodeURIComponent(p.slug)}.html"><img src="${esc(p.image||'/assets/fallback-cover.svg')}" width="1600" height="900" loading="lazy" decoding="async" alt="${esc(p.imageAlt||p.headline)}"><div class="story-body"><span class="badge">${esc(p.category||meta.title)}</span><h3>${esc(p.headline)}</h3><div class="story-meta"><span>${esc(p.author||'ProVkus')}</span><span>•</span><time datetime="${esc(p.publishedAt||'')}">${esc(fmt(p.publishedAt))}</time></div></div></a>`;
  (window.__pvPostsPromise||fetch('/data/posts.json',{cache:'no-cache'}).then(r=>r.json())).then(posts=>{
    const list=(window.__pvVisiblePosts?window.__pvVisiblePosts(posts):posts).filter(match);
    const grid=document.querySelector('#categoryHubGrid');
    const count=document.querySelector('#categoryHubCount');
    if(count)count.textContent=`${list.length} материалов`;
    if(grid)grid.innerHTML=list.length?list.map(card).join(''):'<p class="section-sub">В этой рубрике скоро появятся материалы.</p>';
  }).catch(()=>{});
})();
