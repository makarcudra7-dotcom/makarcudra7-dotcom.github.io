(function(){
  'use strict';
  const VERSION='20260929-search-a11y1';
  const MAX_RESULTS=8;
  const SAVED_KEY='provkus-saved-recipes-v1';
  let postsPromise=null;

  function normalize(value){
    return String(value||'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/gi,' ').replace(/\s+/g,' ').trim();
  }
  function esc(value){
    return String(value||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
  }
  function isPublished(post){
    const t=Date.parse(post&&post.publishedAt||'');
    return !Number.isFinite(t)||t<=Date.now()+15000;
  }
  function getPosts(){
    if(postsPromise)return postsPromise;
    postsPromise=fetch('/data/posts.json?v='+VERSION,{cache:'no-store'})
      .then(function(r){if(!r.ok)throw new Error('posts '+r.status);return r.json()})
      .then(function(items){return (Array.isArray(items)?items:[]).filter(function(p){return p&&p.slug&&isPublished(p)})})
      .catch(function(){return []});
    return postsPromise;
  }
  function score(post,query){
    const q=normalize(query);if(!q)return 0;
    const words=q.split(' ').filter(Boolean);
    const headline=normalize(post.headline||post.title);
    const description=normalize(post.description||post.excerpt||post.lead);
    const category=normalize(post.category);
    const author=normalize(post.author);
    const tags=normalize(Array.isArray(post.tags)?post.tags.join(' '):post.tags);
    const ingredients=normalize(Array.isArray(post.recipeIngredient)?post.recipeIngredient.join(' '):'');
    const hay=[headline,description,category,author,tags,ingredients].join(' ');
    if(!words.every(function(w){return hay.includes(w)}))return 0;
    let s=1;
    if(headline===q)s+=100;
    if(headline.startsWith(q))s+=55;
    if(headline.includes(q))s+=35;
    words.forEach(function(w){
      if(headline.split(' ').some(function(x){return x.startsWith(w)}))s+=12;
      if(category.includes(w))s+=5;
      if(tags.includes(w))s+=4;
      if(ingredients.includes(w))s+=4;
      if(author.includes(w))s+=2;
      if(description.includes(w))s+=1;
    });
    return s;
  }
  function search(posts,query){
    return posts.map(function(p){return {post:p,score:score(p,query)}})
      .filter(function(x){return x.score>0})
      .sort(function(a,b){return b.score-a.score})
      .map(function(x){return x.post});
  }
  function savedCount(){
    try{const items=JSON.parse(localStorage.getItem(SAVED_KEY)||'[]');return Array.isArray(items)?items.length:0}catch(e){return 0}
  }
  function ensureSavedNav(nav){
    if(!nav)return;
    let link=nav.querySelector('.pv-saved-link');
    if(!link){
      link=document.createElement('a');
      link.className='pv-saved-link';
      link.href='/saved.html';
      link.textContent='★ Сохранённые';
      nav.appendChild(link);
    }
    const n=savedCount();
    link.title=n?'Сохранено рецептов: '+n:'Сохранённых рецептов пока нет';
    if(location.pathname==='/saved.html')link.setAttribute('aria-current','page');
  }
  function cleanHeader(bar){
    if(!bar)return;
    bar.querySelectorAll('.pv-reader-search').forEach(function(el){el.remove()});
    const toggles=bar.querySelectorAll('.pv-theme-toggle');
    toggles.forEach(function(el,i){if(i>0)el.remove()});
    bar.querySelectorAll('.main-nav a').forEach(function(a){
      const text=normalize(a.textContent);
      let path='';try{path=new URL(a.href,location.href).pathname}catch(e){}
      if(text==='материалы'||path==='/category.html')a.remove();
    });
    ensureSavedNav(bar.querySelector('.main-nav'));
  }
  function fixConsentSemantics(){
    const box=document.getElementById('pvCookieBanner');
    if(!box)return;
    if(box.tagName==='ASIDE'&&box.getAttribute('role')==='dialog')box.removeAttribute('role');
    if(!box.getAttribute('aria-label'))box.setAttribute('aria-label','Настройка аналитики');
  }
  function setup(){
    const bar=document.querySelector('.site-header .topbar');
    if(!bar)return;
    fixConsentSemantics();
    cleanHeader(bar);
    setTimeout(function(){cleanHeader(bar);fixConsentSemantics()},800);
    setTimeout(function(){cleanHeader(bar);fixConsentSemantics()},2500);

    if(bar.querySelector('.pv-site-search'))return;
    const nav=bar.querySelector('.main-nav');
    const wrap=document.createElement('div');
    wrap.className='pv-site-search';
    wrap.innerHTML='<form class="pv-search-form" role="search" autocomplete="off">'+
      '<label class="pv-search-label" for="pvSiteSearchInput">Поиск по ProVkus</label>'+
      '<span class="pv-search-icon" aria-hidden="true">⌕</span>'+
      '<input id="pvSiteSearchInput" class="pv-search-input" type="search" role="combobox" inputmode="search" placeholder="Найти рецепт, продукт, совет…" aria-label="Поиск по ProVkus" aria-autocomplete="list" aria-haspopup="listbox" aria-controls="pvSearchResults" aria-expanded="false">'+
      '<button class="pv-search-submit" type="submit">Найти</button>'+
      '</form><div id="pvSearchResults" class="pv-search-results" role="listbox" aria-label="Результаты поиска" hidden></div>';
    if(nav)nav.insertAdjacentElement('afterend',wrap);else bar.appendChild(wrap);

    const form=wrap.querySelector('form');
    const input=wrap.querySelector('input');
    const results=wrap.querySelector('.pv-search-results');
    let matches=[];let active=-1;let timer=0;

    function close(){results.hidden=true;results.innerHTML='';input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1}
    function setActive(next){
      const links=results.querySelectorAll('.pv-search-result');
      if(!links.length){active=-1;input.removeAttribute('aria-activedescendant');return}
      active=Math.max(0,Math.min(next,links.length-1));
      links.forEach(function(a,i){a.classList.toggle('is-active',i===active);a.setAttribute('aria-selected',i===active?'true':'false')});
      input.setAttribute('aria-activedescendant',links[active].id);
      links[active].scrollIntoView({block:'nearest'});
    }
    function render(query){
      const q=query.trim();
      if(q.length<2){close();return}
      getPosts().then(function(posts){
        if(input.value.trim()!==q)return;
        matches=search(posts,q);
        const shown=matches.slice(0,MAX_RESULTS);
        if(!shown.length){
          results.innerHTML='<div class="pv-search-empty">Ничего не нашли. Попробуйте другое слово.</div>';
        }else{
          results.innerHTML='<div class="pv-search-summary">Найдено: '+matches.length+'</div>'+shown.map(function(p,i){
            const href='/articles/'+encodeURIComponent(p.slug)+'.html';
            return '<a id="pvSearchOption'+i+'" class="pv-search-result" role="option" aria-selected="false" data-index="'+i+'" href="'+href+'">'+
              '<span class="pv-search-result-meta">'+esc(p.category||'Материал')+(p.author?' · '+esc(p.author):'')+'</span>'+
              '<strong>'+esc(p.headline||p.title||'Без заголовка')+'</strong></a>';
          }).join('');
        }
        results.hidden=false;input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');active=-1;
      });
    }
    input.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(function(){render(input.value)},120)});
    input.addEventListener('keydown',function(e){
      if(e.key==='ArrowDown'){e.preventDefault();if(results.hidden)render(input.value);else setActive(active+1)}
      else if(e.key==='ArrowUp'){e.preventDefault();if(!results.hidden)setActive(active<=0?0:active-1)}
      else if(e.key==='Escape'){close();input.blur()}
      else if(e.key==='Enter'&&active>=0){const a=results.querySelectorAll('.pv-search-result')[active];if(a){e.preventDefault();a.click()}}
    });
    form.addEventListener('submit',function(e){
      e.preventDefault();
      const q=input.value.trim();if(q.length<2){input.focus();return}
      getPosts().then(function(posts){
        matches=search(posts,q);
        if(matches.length===1){location.href='/articles/'+encodeURIComponent(matches[0].slug)+'.html';return}
        render(q);input.focus();
      });
    });
    document.addEventListener('pointerdown',function(e){if(!wrap.contains(e.target))close()});
  }

  window.addEventListener('storage',function(e){
    if(e.key!==SAVED_KEY)return;
    const nav=document.querySelector('.site-header .main-nav');
    if(nav)ensureSavedNav(nav);
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();