(()=>{
  const SITE='https://provkus-media.ru';
  const fmt=iso=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso))}catch(e){return iso||''}};
  function slug(href){try{return new URL(href,location.href).pathname.split('/').pop().replace(/\.html$/,'')}catch(e){return''}}
  function card(p){return `<a class="story-card feed-card" href="/articles/${encodeURIComponent(p.slug)}.html"><img src="${p.image||'/assets/fallback-cover.svg'}" width="1600" height="900" loading="lazy" decoding="async" alt="${(p.imageAlt||p.headline||'').replace(/"/g,'&quot;')}"><div class="story-body"><span class="badge">${p.category||'Материал'}</span><h3>${p.headline||''}</h3><div class="story-meta"><span>${p.author||''}</span><span>•</span><time datetime="${p.publishedAt||''}">${fmt(p.publishedAt)}</time></div></div></a>`}
  async function infiniteFeed(){
    if(!/^(\/|\/index\.html|\/category\.html|\/articles\/[^/]+\.html)$/.test(location.pathname))return;
    let posts=[];try{const r=await fetch('/data/posts.json?feed='+Date.now(),{cache:'no-store'});if(!r.ok)return;posts=await r.json()}catch(e){return}
    const used=new Set([...document.querySelectorAll('a[href*="/articles/"],a[href^="articles/"]')].map(a=>slug(a.href)).filter(Boolean));
    const current=location.pathname.startsWith('/articles/')?location.pathname.split('/').pop().replace('.html',''):'';if(current)used.add(current);
    posts=posts.filter(p=>!used.has(p.slug)).sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));
    if(!posts.length)return;
    let host=document.getElementById('infiniteFeed');
    if(!host){const sec=document.createElement('section');sec.className='section infinite-section';sec.innerHTML='<div class="container"><div class="section-head"><div><h2 class="section-title">Читайте дальше</h2><div class="section-sub">Новые материалы подгружаются автоматически</div></div></div><div id="infiniteFeed" class="story-grid"></div><div id="feedSentinel" class="feed-sentinel">Загружаем ещё…</div></div>';const main=document.querySelector('main');if(main)main.appendChild(sec);else document.body.insertBefore(sec,document.querySelector('footer'));host=sec.querySelector('#infiniteFeed')}
    const sentinel=document.getElementById('feedSentinel'),batch=6;let i=0;
    const more=()=>{const part=posts.slice(i,i+batch);if(!part.length){if(sentinel)sentinel.textContent='Вы прочитали все материалы';return}host.insertAdjacentHTML('beforeend',part.map(card).join(''));i+=part.length;if(i>=posts.length&&sentinel)sentinel.textContent='Вы прочитали все материалы'};
    more();if(sentinel&&'IntersectionObserver'in window){const io=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)&&i<posts.length)more()},{rootMargin:'700px 0px'});io.observe(sentinel)}
  }
  function liveInternet(){
    if(!/^(www\.)?provkus-media\.ru$/i.test(location.hostname))return;
    document.querySelectorAll('#liveinternetCounter,.liveinternet-counter').forEach(x=>x.remove());
    const img=document.createElement('img');img.id='licnt_provkus';img.width=88;img.height=31;img.style.border='0';img.alt='LiveInternet';img.title='LiveInternet: просмотры и посетители за 24 часа';
    const s=window.screen||{};img.src='https://counter.yadro.ru/hit?t14.6;r'+escape(document.referrer)+';s'+(s.width||0)+'*'+(s.height||0)+'*'+(s.colorDepth?s.colorDepth:s.pixelDepth||0)+';u'+escape(document.URL)+';h'+escape(document.title.substring(0,150))+';'+Math.random();
    const a=document.createElement('a');a.href='https://www.liveinternet.ru/click';a.target='_blank';a.rel='noopener noreferrer';a.appendChild(img);
    const box=document.createElement('span');box.id='liveinternetCounter';box.className='liveinternet-counter';box.appendChild(a);
    const footer=document.querySelector('.footer-bottom');if(footer)footer.appendChild(box);else{box.style.cssText='position:absolute;left:-9999px;top:-9999px';document.body.appendChild(box)}
  }
  function discoverMeta(){
    const cover=document.querySelector('.article-cover');if(!cover)return;const url=new URL(cover.src,location.href).href;
    let og=document.querySelector('meta[property="og:image"]');if(!og){og=document.createElement('meta');og.setAttribute('property','og:image');document.head.appendChild(og)}og.content=url;
    [['og:image:width','1600'],['og:image:height','900']].forEach(([p,v])=>{let m=document.querySelector(`meta[property="${p}"]`);if(!m){m=document.createElement('meta');m.setAttribute('property',p);document.head.appendChild(m)}m.content=v});
  }
  const css=document.createElement('style');css.textContent='.feed-sentinel{text-align:center;color:var(--muted);padding:28px 0;font-size:13px}.feed-card img{aspect-ratio:16/9;object-fit:cover}.infinite-section{content-visibility:auto;contain-intrinsic-size:900px}@media(max-width:640px){.infinite-section .story-grid{grid-template-columns:1fr}}';document.head.appendChild(css);
  discoverMeta();infiniteFeed();liveInternet();
})();
