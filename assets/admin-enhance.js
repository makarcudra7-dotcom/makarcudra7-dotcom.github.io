(()=>{
  const STABLE_BRANCH='provkus-stable-v2';
  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    let nextInput=input;
    let nextInit=init;
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url.startsWith('https://api.github.com/')){
      const rewritten=url.replace(/([?&])ref=main(?=(&|$))/,'$1ref='+encodeURIComponent(STABLE_BRANCH));
      if(typeof input==='string')nextInput=rewritten;
      else if(rewritten!==url)nextInput=new Request(rewritten,input);
      if(init&&typeof init.body==='string'&&init.body.includes('"branch":"main"')){
        nextInit={...init,body:init.body.replace(/"branch":"main"/g,'"branch":"'+STABLE_BRANCH+'"')};
      }
    }
    return nativeFetch(nextInput,nextInit);
  };
  const localNow=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
  function addNow(id,label){const input=document.getElementById(id);if(!input||input.parentElement.querySelector('.date-now-btn'))return;const b=document.createElement('button');b.type='button';b.className='btn soft date-now-btn';b.textContent=label;b.addEventListener('click',()=>{input.value=localNow();input.dispatchEvent(new Event('input',{bubbles:true}));score()});input.insertAdjacentElement('afterend',b)}
  addNow('publishedAt','Поставить текущие дату и время');addNow('updatedAt','Обновлено сейчас');
  const photos={'Илья Титюлькин':'assets/authors/ilya.jpg','Эльвира Шайберт':'assets/authors/elvira-generated.jpg','Екатерина Рукопляс':'assets/authors/ekaterina.jpg'};
  function syncPhoto(){const a=document.getElementById('author'),p=document.getElementById('authorPhoto');if(a&&p){const current=typeof AUTHORS!=='undefined'&&AUTHORS.find(x=>x.name===a.value);p.src=current?.photo||photos[a.value]||'/assets/fallback-cover.svg'}}
  document.getElementById('author')?.addEventListener('change',()=>setTimeout(syncPhoto));syncPhoto();
  document.querySelectorAll('img[src$="ilya.svg"]').forEach(i=>i.src=photos['Илья Титюлькин']);document.querySelectorAll('img[src$="elvira.svg"]').forEach(i=>i.src=photos['Эльвира Шайберт']);document.querySelectorAll('img[src$="ekaterina.svg"]').forEach(i=>i.src=photos['Екатерина Рукопляс']);
  function score(){const val=id=>(document.getElementById(id)?.value||'').trim(),plain=(document.getElementById('richEditor')?.innerText||'').trim();const checks=[val('headline').length>=20,val('description').length>=70,val('publishedAt'),val('author'),val('image')||document.getElementById('imageFile')?.files?.length,val('imageAlt'),val('canonical'),val('robots').includes('max-image-preview:large'),val('source'),plain.length>=500];const n=Math.round(checks.filter(Boolean).length/checks.length*100);const out=document.getElementById('discoverPercent');if(out)out.textContent=n+'%';return n}
  ['headline','description','publishedAt','updatedAt','author','image','imageAlt','canonical','robots','source'].forEach(id=>document.getElementById(id)?.addEventListener('input',score));document.getElementById('richEditor')?.addEventListener('input',score);score();
  let fileWidth=0;document.getElementById('imageFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];fileWidth=0;if(!f)return score();const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{fileWidth=im.naturalWidth;URL.revokeObjectURL(u);if(fileWidth<1200&&typeof flash==='function')flash('Для Discover лучше обложка шириной минимум 1200 px. Сейчас '+fileWidth+' px.');score()};im.src=u});
  const btn=document.getElementById('publishBtn'),basePublish=btn?.onclick;if(btn){btn.textContent='Опубликовать сейчас';btn.addEventListener('click',()=>{const p=document.getElementById('publishedAt'),u=document.getElementById('updatedAt');if(p&&!p.value)p.value=localNow();if(u&&!u.value)u.value=p?.value||localNow();},true);}
  if(btn&&basePublish){btn.onclick=async function(e){const o=typeof collect==='function'?collect():{};if(!o.source){if(typeof flash==='function')flash('Для публикации укажите источник / первоисточник');return}if(!o.image&&!document.getElementById('imageFile')?.files?.length){if(typeof flash==='function')flash('Добавьте главное изображение');return}if(!o.imageAlt){if(typeof flash==='function')flash('Добавьте Alt к главному изображению');return}if(fileWidth&&fileWidth<1200){if(typeof flash==='function')flash('Загрузите обложку шириной минимум 1200 px');return}if(score()<80&&!confirm('Discover-чеклист заполнен не полностью. Всё равно опубликовать?'))return;await basePublish.call(this,e);try{if(typeof getToken!=='function'||!getToken()||typeof getFile!=='function'||typeof putFile!=='function')return;const slug=(o.slug||'').trim();if(!slug)return;const pf=await getFile('data/posts.json');if(!pf?.content)return;const decode=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g,'')),c=>c.charCodeAt(0)));let posts=JSON.parse(decode(pf.content));const af=await getFile('articles/'+slug+'.html');let image=o.image||'';if(af?.content){const html=decode(af.content),m=html.match(/class="article-cover"[^>]*src="([^"]+)"|src="([^"]+)"[^>]*class="article-cover"/i);if(m)image=m[1]||m[2]||image}let p=posts.find(x=>x.slug===slug);if(p){p.description=o.description||p.description;p.category=o.category||p.category;p.image=image||p.image;p.imageAlt=o.imageAlt||p.imageAlt;p.updatedAt=o.updatedAt||o.publishedAt||p.publishedAt;p.publishedAt=o.publishedAt||p.publishedAt}await putFile('data/posts.json',JSON.stringify(posts,null,2),'Complete Discover metadata: '+(o.headline||slug));if(typeof store!=='undefined'){store.posts=posts;if(typeof saveStore==='function')saveStore();if(typeof renderPosts==='function')renderPosts()}if(typeof flash==='function')flash('Опубликовано: дата, обложка и Discover-метаданные сохранены')}catch(err){console.warn('Discover metadata update:',err)}}}
  const v3=document.createElement('script');v3.src='assets/admin-v3.js?v=20260922';document.body.appendChild(v3);
})();