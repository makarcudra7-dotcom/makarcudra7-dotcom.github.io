(()=>{
  if(window.__pvFeedLoaded)return;window.__pvFeedLoaded=true;
  const fmt=iso=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso))}catch(e){return iso||''}};
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const published=p=>{const t=new Date(p?.publishedAt||0).getTime();return !Number.isFinite(t)||t<=Date.now()+15000};
  const norm=s=>String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim().toLocaleLowerCase('ru-RU');
  function slug(href){try{return new URL(href,location.href).pathname.split('/').pop().replace(/\.html$/,'')}catch(e){return''}}
  function card(p){return `<a class="story-card feed-card" href="/articles/${encodeURIComponent(p.slug)}.html"><img src="${esc(p.image||'/assets/fallback-cover.svg')}" width="1600" height="900" loading="lazy" decoding="async" alt="${esc(p.imageAlt||p.headline||'')}"><div class="story-body"><span class="badge">${esc(p.type==='quiz'?'Тест':(p.category||'Материал'))}</span><h3>${esc(p.headline||'')}</h3><div class="story-meta"><span>${esc(p.author||'')}</span><span>•</span><time datetime="${esc(p.publishedAt||'')}">${fmt(p.publishedAt)}</time></div></div></a>`}
  const rubrics=[['all','Все'],['products','Продукты'],['recipes','Рецепты'],['home','Дом'],['safety','Безопасность'],['season','Сезонное и советы']];
  function matchRubric(p,r){const c=p.category||'';if(r==='all')return true;if(r==='products')return /Продукт|Покупки/.test(c);if(r==='recipes')return /Рецепт|Десерт|Напит/.test(c);if(r==='home')return /Дом|Хранение|Кухонная техника/.test(c);if(r==='safety')return /Безопасность|Здоровое/.test(c);if(r==='season')return /Сезон|Совет|Новости|Люди/.test(c);return true}
  function publicNav(){
    const links=[['/calculators.html','Калькуляторы'],['/authors.html','Авторы'],['/archive.html','Архив']];
    document.querySelectorAll('.main-nav').forEach(nav=>{
      nav.innerHTML=links.map(([href,label])=>`<a href="${href}">${label}</a>`).join('');
      nav.querySelectorAll('a').forEach(a=>{try{const u=new URL(a.href,location.href);const here=new URL(location.href);if(u.pathname===here.pathname)a.setAttribute('aria-current','page')}catch(e){}});
    });
  }
  function authorCounts(posts){
    const counts=new Map();
    for(const p of posts.filter(published)){
      const names=new Set([p.author,...(Array.isArray(p.coauthors)?p.coauthors:[])].map(norm).filter(Boolean));
      names.forEach(name=>counts.set(name,(counts.get(name)||0)+1));
    }
    document.querySelectorAll('[data-author-count]').forEach(el=>{
      const count=counts.get(norm(el.dataset.authorCount));
      if(Number.isFinite(count)&&count>0)el.textContent=`${count} ${count%10===1&&count%100!==11?'публикация':count%10>=2&&count%10<=4&&(count%100<12||count%100>14)?'публикации':'публикаций'}`;
    });
  }
  function repairAuthorProfile(posts){
    const byPage={'author-ekaterina.html':'Екатерина Рукопляс','author-elvira.html':'Эльвира Шайберт','author-ilya.html':'Илья Титюлькин'};
    const author=byPage[(location.pathname.split('/').pop()||'').toLowerCase()];if(!author)return;
    const authored=posts.filter(p=>published(p)&&(norm(p.author)===norm(author)||(Array.isArray(p.coauthors)&&p.coauthors.some(x=>norm(x)===norm(author)))));
    if(!authored.length)return;
    const section=[...document.querySelectorAll('main .section')].find(x=>/Материалы автора/i.test(x.querySelector('.section-title')?.textContent||''));if(!section)return;
    const sub=section.querySelector('.section-sub');if(sub){const n=authored.length;sub.textContent=`${n} ${n%10===1&&n%100!==11?'публикация':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'публикации':'публикаций'}`}
    const grid=section.querySelector('.story-grid');if(grid&&(!grid.querySelector('a.story-card')||/^\s*0\s/.test(sub?.textContent||'')))grid.innerHTML=authored.sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt)).map(card).join('');
  }
  function categoryPage(posts){if(location.pathname!='/category.html')return false;const root=document.querySelector('main.container, main .container');if(!root)return true;const aliases={'Рецепты':'recipes','Продукты и выбор':'products','Дом и хранение':'home','Безопасность еды':'safety'},raw=new URLSearchParams(location.search).get('rubric')||'all',param=aliases[raw]||raw,valid=rubrics.some(x=>x[0]===param)?param:'all';const filtered=posts.filter(p=>published(p)&&matchRubric(p,valid)).sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));const title=root.querySelector('.section-title'),sub=root.querySelector('.section-sub');if(title)title.textContent=rubrics.find(x=>x[0]===valid)?.[1]||'Все материалы';if(sub)sub.textContent=`${filtered.length} материалов — с авторством, датой и источниками.`;let chips=root.querySelector('.chips');if(!chips){chips=document.createElement('div');chips.className='chips';(sub||title).insertAdjacentElement('afterend',chips)}chips.innerHTML=rubrics.map(([v,l])=>`<a class="chip ${v===valid?'active':''}" href="/category.html?rubric=${v}">${l}</a>`).join('');let grid=root.querySelector('.story-grid');if(!grid){grid=document.createElement('div');grid.className='story-grid';root.appendChild(grid)}grid.innerHTML=filtered.map(card).join('');let sentinel=root.querySelector('#feedSentinel');if(!sentinel){sentinel=document.createElement('div');sentinel.id='feedSentinel';sentinel.className='feed-sentinel';root.appendChild(sentinel)}sentinel.textContent=filtered.length?'Все материалы рубрики':'В этой рубрике пока нет публикаций';return true}
  function articleFeed(posts){if(!/^\/articles\/[^/]+\.html$/.test(location.pathname))return;const used=new Set([...document.querySelectorAll('a[href*="/articles/"]').values()].map(a=>slug(a.href)).filter(Boolean));used.add(location.pathname.split('/').pop().replace('.html',''));const list=posts.filter(p=>published(p)&&!used.has(p.slug)).sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt)).slice(0,6);if(!list.length)return;const sec=document.createElement('section');sec.className='section infinite-section';sec.innerHTML='<div class="container"><div class="section-head"><div><h2 class="section-title">Читайте дальше</h2><div class="section-sub">Свежие материалы ProVkus</div></div></div><div class="story-grid">'+list.map(card).join('')+'</div></div>';document.querySelector('main')?.appendChild(sec)}
  function discoverMeta(){const cover=document.querySelector('.article-cover');if(!cover)return;const url=new URL(cover.src,location.href).href;let og=document.querySelector('meta[property="og:image"]');if(!og){og=document.createElement('meta');og.setAttribute('property','og:image');document.head.appendChild(og)}og.content=url;[['og:image:width','1600'],['og:image:height','900']].forEach(([p,v])=>{let m=document.querySelector(`meta[property="${p}"]`);if(!m){m=document.createElement('meta');m.setAttribute('property',p);document.head.appendChild(m)}m.content=v})}
  const css=document.createElement('style');css.textContent='.feed-sentinel{text-align:center;color:var(--muted);padding:28px 0;font-size:13px}.feed-card img{aspect-ratio:16/9;object-fit:cover}.infinite-section{content-visibility:auto;contain-intrinsic-size:750px}@media(max-width:640px){.infinite-section .story-grid{grid-template-columns:1fr}}';document.head.appendChild(css);
  publicNav();discoverMeta();
  const shared=window.__pvPostsPromise||Promise.resolve([]);
  Promise.resolve(shared).then(posts=>Array.isArray(posts)&&posts.length?posts:fetch('/data/posts.json?v=20260927-author-count-fix1',{cache:'no-store'}).then(r=>r.ok?r.json():[])).then(posts=>{
    const clean=(window.__pvVisiblePosts?window.__pvVisiblePosts(posts):posts.filter(published));
    authorCounts(clean);repairAuthorProfile(clean);
    if(!categoryPage(clean))articleFeed(clean);
  }).catch(()=>{});
})();