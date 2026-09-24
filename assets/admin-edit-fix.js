(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const clean=s=>String(s||'').trim();
  const local=v=>{if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
  const normalizedType=t=>({Article:'guide',NewsArticle:'news',Recipe:'recipe'}[t]||t||'guide');
  const sourceValue=note=>{if(!note)return'';const copy=note.cloneNode(true);const strong=copy.querySelector('strong');if(strong&&/^Источники?:/i.test(strong.textContent||''))strong.remove();return copy.innerHTML.trim()};
  function parseQuiz(doc){
    const section=doc.querySelector('.pv-quiz');if(!section)return null;
    const questions=[...section.querySelectorAll('.pv-quiz-question')].map(q=>({
      question:(q.querySelector('legend')?.textContent||'').replace(/^\s*\d+\.\s*/,''),
      options:[...q.querySelectorAll('.pv-quiz-option')].map(x=>(x.textContent||'').replace(/^\s*[АБВГA-D]\.?\s*/i,'').trim()),
      correct:Number(q.dataset.correct||0),
      explanation:q.dataset.explanation||''
    }));
    const after=doc.querySelector('.quiz-after-content');
    return {questions,afterContent:after?.innerHTML||''};
  }
  function postForSlug(slug){
    const posts=window.store?.posts || (typeof store!=='undefined'?store.posts:[]) || [];
    return posts.find(x=>x.slug===slug)||{};
  }
  async function fetchArticleHtml(slug){
    const publicUrl=`/articles/${encodeURIComponent(slug)}.html?cms_edit=${Date.now()}`;
    try{
      const r=await fetch(publicUrl,{cache:'no-store',credentials:'same-origin'});
      if(r.ok){const text=await r.text();if(/class=["']article-body["']/.test(text))return {html:text,url:new URL(publicUrl,location.origin).href}}
    }catch(_){}
    if(typeof window.getFile==='function'){
      const file=await window.getFile(`articles/${slug}.html`);
      if(file?.content){
        const html=new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\n/g,'')),c=>c.charCodeAt(0)));
        return {html,url:`${location.origin}/articles/${slug}.html`};
      }
    }
    throw new Error('Не удалось загрузить статью для редактирования');
  }
  async function openForEdit(slug,button){
    if(!slug)return;
    const oldText=button?.textContent;
    try{
      if(button){button.disabled=true;button.textContent='Открываю…'}
      if(typeof flash==='function')flash('Загружаю материал…');
      const p=postForSlug(slug),loaded=await fetchArticleHtml(slug);
      const doc=new DOMParser().parseFromString(loaded.html,'text/html');
      const body=doc.querySelector('.article-body');
      if(!body)throw new Error('В статье не найден редактируемый текст');
      const quiz=parseQuiz(doc);
      const note=[...body.querySelectorAll('.note,.sources,.article-sources')].find(el=>/^Источники?:/i.test(el.querySelector('strong')?.textContent||el.textContent||''));
      const source=sourceValue(note);
      body.querySelector('.pv-quiz')?.remove();
      body.querySelector('.quiz-after-content')?.remove();
      note?.remove();
      const cover=doc.querySelector('.article-cover');
      const rawImage=p.image||cover?.getAttribute('src')||doc.querySelector('meta[property="og:image"]')?.content||'';
      const image=rawImage?new URL(rawImage,loaded.url).href:'';
      const schema=[...doc.querySelectorAll('script[type="application/ld+json"]')].map(s=>{try{return JSON.parse(s.textContent)}catch{return null}}).find(Boolean)||{};
      const data={
        headline:p.headline||clean(doc.querySelector('.article-title,h1')?.textContent),
        category:p.category||clean(doc.querySelector('.article-kicker')?.textContent)||'Продукты',
        type:normalizedType(p.type||schema['@type']),
        lead:clean(doc.querySelector('.article-dek')?.textContent),
        publishedAt:local(p.publishedAt||doc.querySelector('meta[property="article:published_time"]')?.content||schema.datePublished),
        updatedAt:local(p.updatedAt||doc.querySelector('meta[property="article:modified_time"]')?.content||schema.dateModified||p.publishedAt),
        seoTitle:doc.title||p.headline||'',
        description:p.description||doc.querySelector('meta[name="description"]')?.content||'',
        slug,
        canonical:doc.querySelector('link[rel="canonical"]')?.href||p.url||`${location.origin}/articles/${slug}.html`,
        robots:doc.querySelector('meta[name="robots"]')?.content||'index, follow, max-image-preview:large',
        ogImage:doc.querySelector('meta[property="og:image"]')?.content||image,
        source,
        tags:Array.isArray(p.tags)?p.tags.join(', '):(p.tags||''),
        image,
        imageAlt:p.imageAlt||cover?.alt||'',
        photoSource:p.photoSource||'',
        author:p.author||clean(doc.querySelector('.article-author strong')?.textContent),
        coauthors:Array.isArray(p.coauthors)?p.coauthors:[],
        content:body.innerHTML,
        quiz,
        featured:!!p.featured,
        popular:!!p.popular,
        newsletterGroup:Number(p.newsletterGroup)||0,
        excludeRelated:!!p.excludeRelated,
        _editingSlug:slug
      };
      if(typeof window.fill!=='function')throw new Error('Редактор ещё не загрузился. Обновите страницу и повторите.');
      const file=$('#imageFile');if(file)file.value='';
      window.fill(data);
      const slugInput=$('#slug');if(slugInput)slugInput.readOnly=true;
      document.querySelector('.nav-btn[data-target="material"]')?.click();
      const title=$('#pageTitle');if(title)title.textContent='Редактирование публикации';
      const crumb=document.querySelector('.crumb');if(crumb)crumb.textContent='Материалы / Редактирование';
      $('#richEditor')?.focus();
      if(typeof flash==='function')flash('Материал открыт для редактирования');
    }catch(err){
      console.error('CMS edit article:',err);
      if(typeof flash==='function')flash(err?.message||'Не удалось открыть статью для редактирования');
    }finally{
      if(button){button.disabled=false;button.textContent=oldText||'Редактировать'}
    }
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-edit-published]');
    if(!button)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openForEdit(button.dataset.editPublished,button);
  },true);
  window.openPublishedArticleForEdit=openForEdit;

  const recovery=document.createElement('script');
  recovery.src='assets/admin-publish-recovery.js?v=cms-a428ac8c76a1';
  recovery.async=false;
  document.body.appendChild(recovery);

  const actions=document.createElement('script');
  actions.src='assets/admin-actions-fix.js?v=cms-a428ac8c76a1';
  actions.async=false;
  document.body.appendChild(actions);
})();
