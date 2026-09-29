(()=>{
  'use strict';
  if(window.__pvPublishRuntime)return;
  window.__pvPublishRuntime=true;

  const OWNER='makarcudra7-dotcom',REPO='makarcudra7-dotcom.github.io',BRANCH='main';
  const THEME_VERSION='20260929-theme5';
  const APP_VERSION='20260929-theme5';
  const SEARCH_VERSION='20260929-search4';
  const AUTHORS={
    'Илья Титюлькин':{role:'Редактор направления «Продукты и выбор»',photo:'assets/authors/ilya.jpg',url:'author-ilya.html'},
    'Эльвира Шайберт':{role:'Редактор направления «Дом и хранение»',photo:'assets/authors/elvira-generated.jpg',url:'author-elvira.html'},
    'Екатерина Рукопляс':{role:'Редактор направления «Еда и безопасность»',photo:'assets/authors/ekaterina.jpg',url:'author-ekaterina.html'}
  };
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const themeBootstrap=`<script id="pv-theme-bootstrap">(function(){var KEY='provkus-theme';function cleanup(){var bs=document.querySelectorAll('.site-header .pv-theme-toggle');for(var i=1;i<bs.length;i++)bs[i].remove()}function apply(t){t=t==='dark'?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'#161b19':'#f7f4ee');cleanup();document.querySelectorAll('.pv-theme-toggle').forEach(function(b){b.setAttribute('aria-pressed',String(t==='dark'));b.setAttribute('aria-label',t==='dark'?'Включить светлую тему':'Включить тёмную тему')})}var t='light';try{t=localStorage.getItem(KEY)||'light'}catch(e){}apply(t);window.__pvThemeApply=function(next,persist){apply(next);if(persist!==false){try{localStorage.setItem(KEY,next)}catch(e){}}};window.__pvThemeDelegated=true;document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.pv-theme-toggle');if(!b)return;var next=document.documentElement.dataset.theme==='dark'?'light':'dark';window.__pvThemeApply(next,true)});document.addEventListener('DOMContentLoaded',function(){cleanup();apply(document.documentElement.dataset.theme||t)})})();<\/script>`;

  window.articleHTML=function(o,img){
    const auth=AUTHORS[o.author]||AUTHORS['Илья Титюлькин'];
    const published=new Date(o.publishedAt||Date.now()).toISOString();
    const modified=new Date(o.updatedAt||o.publishedAt||Date.now()).toISOString();
    const jsonld={
      '@context':'https://schema.org','@type':o.type||'Article',headline:o.headline,description:o.description,image:[img],
      datePublished:published,dateModified:modified,
      author:{'@type':'Person',name:o.author,url:`https://provkus-media.ru/${auth.url}`},
      publisher:{'@type':'Organization',name:'ProVkus',url:'https://provkus-media.ru/',logo:{'@type':'ImageObject',url:'https://provkus-media.ru/assets/provkus-logo.svg',width:512,height:512}}
    };
    return `<!doctype html><html lang="ru"><head>${themeBootstrap}<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f4ee"><title>${esc(o.headline)}</title><meta name="description" content="${esc(o.description)}"><meta name="robots" content="${esc(o.robots||'index, follow, max-image-preview:large')}"><link rel="canonical" href="${esc(o.canonical)}"><meta property="og:site_name" content="ProVkus"><meta property="og:type" content="article"><meta property="og:title" content="${esc(o.headline)}"><meta property="og:description" content="${esc(o.description)}"><meta property="og:image" content="${esc(img)}"><meta property="og:image:alt" content="${esc(o.imageAlt||o.headline)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(o.headline)}"><meta name="twitter:description" content="${esc(o.description)}"><meta name="twitter:image" content="${esc(img)}"><link rel="stylesheet" href="../assets/styles.css"><link rel="stylesheet" href="/assets/theme.css?v=${THEME_VERSION}"><link rel="stylesheet" href="/assets/site-search.css?v=${SEARCH_VERSION}"><script src="/assets/metrika.js?v=20260929-reader3" defer><\/script><script src="/assets/site-search.js?v=${SEARCH_VERSION}" defer><\/script><script type="application/ld+json">${JSON.stringify(jsonld).replace(/<\//g,'<\\/')}</script></head><body><header class="site-header"><div class="container topbar"><a class="brand" href="../index.html">Pro<b>Vkus</b></a><nav class="main-nav"><a href="../calculators.html">Калькуляторы</a><a href="../authors.html">Авторы</a><a href="../archive.html">Архив</a></nav><button type="button" class="pv-theme-toggle" aria-pressed="false" aria-label="Переключить тему"><span class="pv-theme-label-light">☾ Тёмная тема</span><span class="pv-theme-label-dark">☀ Светлая тема</span></button></div></header><main class="container"><article class="article-wrap"><div class="article-kicker">${esc(o.category)}</div><h1 class="article-title">${esc(o.headline)}</h1><p class="article-dek">${esc(o.lead)}</p><div class="article-author"><img class="avatar" src="../${esc(auth.photo)}" alt="${esc(o.author)}"><div class="author-info"><strong><a href="../${esc(auth.url)}">${esc(o.author)}</a></strong><span>${esc(auth.role)}</span></div></div><img class="article-cover" src="${esc(img)}" alt="${esc(o.imageAlt||o.headline)}"><div class="article-body">${o.content}${o.sourceHtml||o.source?`<div class="note"><strong>${o.sourceHtml?'Источники:':'Источник:'}</strong> ${o.sourceHtml||esc(o.source)}</div>`:''}</div></article></main><script src="../assets/app.js?v=${APP_VERSION}"><\/script></body></html>`;
  };

  const priorPut=window.putFile;
  const priorBegin=window.beginPublishBatch;
  const priorCommit=window.commitPublishBatch;
  const priorCancel=window.cancelPublishBatch;
  let localQueue=null,nativeBatch=false;
  const token=()=>sessionStorage.getItem('provkusGithubToken')||'';

  async function gh(path,opt={}){
    const t=token();if(!t)throw new Error('Подключите GitHub в Настройках');
    const r=await fetch('https://api.github.com'+path,{cache:'no-store',...opt,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+t,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',...(opt.headers||{})}});
    if(!r.ok){let msg='GitHub '+r.status;try{msg=(await r.json()).message||msg}catch(_){}throw new Error(msg)}
    return r.status===204?null:r.json();
  }

  async function githubBatchCommit(files,message){
    const ref=await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
    const head=ref.object.sha;
    const commit=await gh(`/repos/${OWNER}/${REPO}/git/commits/${head}`);
    const treeEntries=await Promise.all(files.map(async file=>{
      const blob=await gh(`/repos/${OWNER}/${REPO}/git/blobs`,{method:'POST',body:JSON.stringify({content:file.content,encoding:file.encoding==='base64'?'base64':'utf-8'})});
      return {path:file.path,mode:'100644',type:'blob',sha:blob.sha};
    }));
    const tree=await gh(`/repos/${OWNER}/${REPO}/git/trees`,{method:'POST',body:JSON.stringify({base_tree:commit.tree.sha,tree:treeEntries})});
    const next=await gh(`/repos/${OWNER}/${REPO}/git/commits`,{method:'POST',body:JSON.stringify({message,tree:tree.sha,parents:[head]})});
    await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`,{method:'PATCH',body:JSON.stringify({sha:next.sha,force:false})});
    return {sha:next.sha,files:files.map(f=>f.path)};
  }

  window.beginPublishBatch=function(){
    if(localQueue||nativeBatch)return false;
    if(typeof priorBegin==='function'){
      try{if(priorBegin()){nativeBatch=true;return true}}catch(e){console.warn('[ProVkus CMS] native batch unavailable',e)}
    }
    if(!token())return false;
    localQueue=[];
    return true;
  };

  window.putFile=async function(path,content,message,encoding='utf-8'){
    if(localQueue){localQueue.push({path,content,message,encoding});return {queued:true,path}}
    return priorPut(path,content,message,encoding);
  };

  window.publishBatchReady=function(){
    if(nativeBatch)return false;
    if(!Array.isArray(localQueue))return false;
    const paths=new Set(localQueue.map(x=>x.path));
    return [...paths].some(x=>/^articles\/.+\.html$/.test(x))&&paths.has('data/posts.json');
  };

  window.commitPublishBatch=async function(message='Publish from ProVkus CMS'){
    if(nativeBatch){nativeBatch=false;return priorCommit(message)}
    if(!localQueue)return null;
    const queued=localQueue;localQueue=null;
    const byPath=new Map();queued.forEach(f=>byPath.set(f.path,f));
    const files=[...byPath.values()];
    if(!files.length)return null;
    return githubBatchCommit(files,message);
  };

  window.cancelPublishBatch=function(){
    if(nativeBatch){nativeBatch=false;return priorCancel?.()}
    localQueue=null;
  };
})();
