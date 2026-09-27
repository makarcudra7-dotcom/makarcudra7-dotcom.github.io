(()=>{
  'use strict';
  if(window.__pvAuthorCounts)return;window.__pvAuthorCounts=true;
  const norm=s=>String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim().toLocaleLowerCase('ru-RU');
  const word=n=>{const a=n%10,b=n%100;return a===1&&b!==11?'публикация':a>=2&&a<=4&&(b<12||b>14)?'публикации':'публикаций'};
  const published=p=>{const t=new Date(p?.publishedAt||0).getTime();return !Number.isFinite(t)||t<=Date.now()+15000};
  fetch('/data/posts.json?pv-author-counts=20260927-2',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error('posts '+r.status))).then(posts=>{
    const visible=(Array.isArray(posts)?posts:[]).filter(p=>p&&p.slug&&published(p));
    document.querySelectorAll('[data-author-count]').forEach(el=>{
      const name=norm(el.dataset.authorCount),n=visible.filter(p=>norm(p.author)===name||(Array.isArray(p.coauthors)&&p.coauthors.some(x=>norm(x)===name))).length;
      if(n>0)el.textContent=`${n} ${word(n)}`;
    });
  }).catch(e=>console.warn('[ProVkus author counts]',e));
})();
