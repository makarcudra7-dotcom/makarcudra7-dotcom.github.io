(()=>{
  const DATA='/data/posts.json';
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateLabel=v=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return''}};
  const img=p=>p?.image||p?.images?.[0]||'/assets/fallback-cover.svg';
  const href=p=>p?.url?new URL(p.url,location.origin).pathname:`/articles/${p.slug}.html`;
  const badge=p=>p?.type==='quiz'?'Тест':(p?.category||p?.typeLabel||'Материал');
  const card=(p,lead=false)=>lead?`<a class="lead-card" href="${esc(href(p))}"><img fetchpriority="high" width="1600" height="900" src="${esc(img(p))}" alt="${esc(p.imageAlt||p.headline)}"><div class="lead-copy"><div class="eyebrow">${esc(badge(p))}</div><h1>${esc(p.headline)}</h1><p>${esc(p.description||'')}</p><div class="meta-row"><span>${esc(p.author||'')}</span><span>•</span><span>${esc(dateLabel(p.publishedAt))}</span></div></div></a>`:`<a class="stack-card" href="${esc(href(p))}"><img src="${esc(img(p))}" width="1600" height="900" alt="${esc(p.imageAlt||p.headline)}"><div class="stack-copy"><span class="badge">${esc(badge(p))}</span><h3>${esc(p.headline)}</h3><div class="story-meta"><span>${esc(p.author||'')}</span><span>•</span><time>${esc(dateLabel(p.publishedAt))}</time></div></div></a>`;
  const feedCard=p=>`<a class="story-card feed-card" href="${esc(href(p))}"><img src="${esc(img(p))}" width="1600" height="900" loading="lazy" decoding="async" alt="${esc(p.imageAlt||p.headline)}"><div class="story-body"><span class="badge">${esc(badge(p))}</span><h3>${esc(p.headline)}</h3><div class="story-meta"><span>${esc(p.author||'')}</span><span>•</span><time>${esc(dateLabel(p.publishedAt))}</time></div></div></a>`;
  const popularRow=(p,i)=>`<a class="popular-row" href="${esc(href(p))}"><span class="popular-num">${i+1}</span><div><span class="popular-badge">${esc(badge(p))}</span><strong>${esc(p.headline)}</strong></div></a>`;
  function styles(){if(document.getElementById('homeDynamicStyles'))return;const s=document.createElement('style');s.id='homeDynamicStyles';s.textContent=`.home-lower-grid{display:grid;grid-template-columns:minmax(250px,310px) minmax(0,1fr);gap:28px;align-items:start}.popular-panel{border:1px solid #e3ded4;border-radius:18px;background:#fff;padding:18px;position:sticky;top:18px}.popular-title{font:800 25px/1.1 Georgia,serif;margin:0 0 14px}.popular-list{display:grid;gap:0}.popular-row{display:grid;grid-template-columns:30px 1fr;gap:10px;padding:13px 0;border-top:1px solid #ece7df;color:inherit;text-decoration:none}.popular-row:first-child{border-top:0;padding-top:2px}.popular-num{font:700 18px/1 Georgia,serif;color:#c14d2c}.popular-row strong{display:block;font:700 16px/1.18 Georgia,serif}.popular-badge{display:block;text-transform:uppercase;font-size:10px;font-weight:800;color:#a94a2e;margin-bottom:4px;letter-spacing:.04em}.fresh-wrap .story-grid{grid-template-columns:repeat(2,minmax(0,1fr))}@media(max-width:900px){.home-lower-grid{grid-template-columns:1fr}.popular-panel{position:static}.fresh-wrap .story-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.fresh-wrap .story-grid{grid-template-columns:1fr}}`;document.head.appendChild(s)}
  function render(posts){
    const good=(posts||[]).filter(p=>p&&p.slug&&p.headline).sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));if(!good.length)return;
    styles();
    const featured=good.find(p=>p.featured) || good[0];
    const side=good.filter(p=>p.slug!==featured.slug).slice(0,3);
    const hero=document.querySelector('.hero .hero-grid');if(hero)hero.innerHTML=card(featured,true)+`<div class="hero-side">${side.map(p=>card(p)).join('')}</div>`;
    const freshCandidates=good.filter(p=>p.slug!==featured.slug).slice(0,12);
    const marked=good.filter(p=>p.popular&&p.slug!==featured.slug).slice(0,7);
    const popular=[...marked];
    for(const p of good){if(popular.length>=Math.max(5,marked.length))break;if(p.slug===featured.slug||popular.some(x=>x.slug===p.slug))continue;popular.push(p)}
    const section=document.querySelector('.section .container');if(!section)return;
    const grid=section.querySelector('.story-grid');if(!grid)return;
    let lower=section.querySelector('.home-lower-grid');
    if(!lower){lower=document.createElement('div');lower.className='home-lower-grid';grid.parentNode.insertBefore(lower,grid);const pop=document.createElement('aside');pop.className='popular-panel';pop.innerHTML='<h2 class="popular-title">Популярное</h2><div class="popular-list"></div>';const fresh=document.createElement('div');fresh.className='fresh-wrap';lower.append(pop,fresh);fresh.appendChild(grid)}
    lower.querySelector('.popular-list').innerHTML=popular.slice(0,7).map(popularRow).join('');
    lower.querySelector('.story-grid').innerHTML=freshCandidates.map(feedCard).join('');
  }
  fetch(DATA+'?v='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(render).catch(()=>{});
})();
