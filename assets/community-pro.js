(()=>{
  if(window.__pvCommunityProLoaded)return;window.__pvCommunityProLoaded=true;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const slug=()=> (location.pathname.split('/').pop()||'').replace(/\.html$/,'');
  const authorsPromise=fetch('/data/authors.json?v=20260922-pro5',{cache:'no-cache'}).then(r=>r.ok?r.json():[]).catch(()=>[]);
  window.__pvAuthorsPromise=authorsPromise;
  const fmt=v=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(v))}catch{return''}};
  const href=p=>p?.url?new URL(p.url,location.origin).pathname:`/articles/${p.slug}.html`;
  const img=p=>p?.image||p?.images?.[0]||'/assets/fallback-cover.svg';
  function topics(items){return `<div class="author-topics">${(items||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div>`}

  function updateDirectory(authors){
    const grid=$('.author-directory-grid,.author-grid');if(!grid)return;
    grid.querySelectorAll('.author-card').forEach(card=>{
      const key=(card.getAttribute('href')||'').split('/').pop();const a=authors.find(x=>x.url===key);if(!a)return;
      const pic=card.querySelector('img');
      card.innerHTML=`<div class="author-card-top"><img src="/${esc(a.photo||'assets/fallback-cover.svg')}" width="112" height="112" alt="${esc(a.name)}"><div><div class="author-card-role">${esc(a.role)}</div><h3>${esc(a.name)}</h3></div></div><p class="author-card-lead">${esc(a.lead||a.bio)}</p>${topics((a.topics||[]).slice(0,5))}<div class="author-card-promise">В профиле — все публикации автора, его темы и возможность задать вопрос редакции.</div><div class="author-card-footer"><span data-author-count="${esc(a.name)}">Материалы автора</span><strong>Открыть профиль →</strong></div>`;
      const n=card.querySelector('img');if(pic?.getAttribute('src')&&!a.photo)n.src=pic.getAttribute('src');
    })
  }
  function updateProfile(authors){
    const a=authors.find(x=>x.url===page);if(!a)return;
    const hero=$('.author-profile-hero,.author-hero');if(hero){
      const info=hero.querySelector(':scope > div');if(info){const note=info.querySelector('.photo-credit')?.outerHTML||'';info.innerHTML=`<div class="eyebrow">Автор ProVkus</div><h1>${esc(a.name)}</h1><div class="author-role">${esc(a.role)}</div>${note}<p class="author-lead">${esc(a.lead||'')}</p><p class="author-bio">${esc(a.bio||'')}</p>${topics(a.topics)}<div class="author-profile-facts"><div class="author-method"><strong>Как работает с темами</strong><span>${esc(a.method||'')}</span></div><div class="author-method"><strong>Когда к автору</strong><span>${esc(a.useful||'')}</span></div></div><a class="ask-author-link profile-ask-cta" href="#ask-author">Задать вопрос ${esc(a.dativeFirst||a.name.split(' ')[0])} ↓</a>`}
      const photo=hero.querySelector('.author-photo');if(photo&&a.photo)photo.src='/'+a.photo.replace(/^\//,'')
    }
    const ask=$('.ask-author-box');if(ask){const h=ask.querySelector('h2'),p=ask.querySelector(':scope > p'),form=ask.querySelector('form');if(h)h.textContent=`Задать вопрос ${a.dativeFirst||a.name.split(' ')[0]}`;if(p)p.textContent=a.ask||'';if(form)form.dataset.author=a.name}
  }
  function newsletterCopy(){
    $$('.newsletter-box').forEach(box=>{const p=box.querySelector(':scope > p');if(p)p.textContent='Оставьте e-mail — будем присылать новые материалы ProVkus после их выхода. Частоту писем можно выбрать при подтверждении подписки.';const note=box.querySelector('.form-note');if(note)note.textContent='Подписка добровольная и оформляется отдельно. Отписаться можно по ссылке в любом письме.'})
  }
  function footer(){
    const f=$('.site-footer');if(!f)return;
    let bottom=f.querySelector('.pv-footer-bottom');if(!bottom){bottom=document.createElement('div');bottom.className='container pv-footer-bottom';f.appendChild(bottom)}
    bottom.innerHTML=`<span>© ${new Date().getFullYear()} ProVkus</span><span>Практичное медиа о еде, продуктах и доме</span><span><a href="/editorial.html">Редакция</a> · <a href="/privacy.html">Конфиденциальность</a></span>`
  }
  function hideUpdated(){
    $$('.article-date span').forEach(x=>{if(/^\s*Обновлено/i.test(x.textContent||''))x.remove()})
  }
  function relatedCard(p){return `<a class="pv-related-card" href="${esc(href(p))}"><img src="${esc(img(p))}" width="480" height="270" loading="lazy" decoding="async" alt="${esc(p.imageAlt||p.headline)}"><div><span>${esc(p.category||'Материал')}</span><h3>${esc(p.headline)}</h3><small>${esc(fmt(p.publishedAt))}</small></div></a>`}
  function related(posts){
    if(!/\/articles\/[^/]+\.html$/.test(location.pathname)||$('#pvReadAlso'))return;
    const current=posts.find(p=>p.slug===slug());if(!current)return;
    const t=new Date(current.publishedAt||0).getTime();
    const prev=posts.filter(p=>p.slug!==current.slug&&!p.excludeRelated&&new Date(p.publishedAt||0).getTime()<t).sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0)).slice(0,3);
    if(!prev.length)return;
    const article=$('.article-wrap');if(!article)return;const sec=document.createElement('section');sec.id='pvReadAlso';sec.className='pv-read-also';sec.innerHTML=`<div class="pv-read-also-head"><div><span>Продолжить чтение</span><h2>Читайте также</h2></div><small>Предыдущие материалы ProVkus</small></div><div class="pv-related-grid">${prev.map(relatedCard).join('')}</div>`;const body=article.querySelector('.article-body');body?body.insertAdjacentElement('afterend',sec):article.appendChild(sec)
  }
  function countAuthors(posts){$$('[data-author-count]').forEach(el=>{const n=el.dataset.authorCount,count=posts.filter(p=>p.author===n||(Array.isArray(p.coauthors)&&p.coauthors.includes(n))).length;el.textContent=`${count} ${count%10===1&&count%100!==11?'материал':(count%10>=2&&count%10<=4&&(count%100<12||count%100>14)?'материала':'материалов')}`})}
  authorsPromise.then(authors=>{updateDirectory(authors);updateProfile(authors);newsletterCopy();if(window.__pvPostsPromise)window.__pvPostsPromise.then(countAuthors)});
  if(window.__pvPostsPromise)window.__pvPostsPromise.then(related);
  footer();hideUpdated();
  const mo=new MutationObserver(()=>{hideUpdated();newsletterCopy()});mo.observe(document.body,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),6000)
})();
