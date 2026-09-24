(()=>{
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  let editingSlug='';
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const decode=f=>{if(!f?.content)return'';return new TextDecoder().decode(Uint8Array.from(atob(f.content.replace(/\n/g,'')),c=>c.charCodeAt(0)))};
  const local=v=>{if(!v)return'';const d=new Date(v);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
  const cmsStore=()=>typeof store!=='undefined'?store:null;
  const normalizedType=t=>({Article:'guide',NewsArticle:'news',Recipe:'recipe'}[t]||t||'guide');

  function installPlacement(){
    if($('#placementCard'))return;
    const aside=$('#material .grid > aside');if(!aside)return;
    const card=document.createElement('div');card.className='card';card.id='placementCard';
    card.innerHTML=`<div class="card-title">Размещение на главной</div><div class="card-body"><label class="placement-check"><input id="featuredFlag" type="checkbox"><span><strong>Главная новость</strong><small>Показывать большой первой карточкой. Одновременно может быть только одна.</small></span></label><label class="placement-check"><input id="popularFlag" type="checkbox"><span><strong>Популярное</strong><small>Добавить в левый блок «Популярное» на главной. В блоке показывается до 7 материалов.</small></span></label></div>`;
    aside.insertBefore(card,aside.firstChild);
    if(!$('#contentManagerStyles')){const s=document.createElement('style');s.id='contentManagerStyles';s.textContent=`.placement-check{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #ece8df;cursor:pointer}.placement-check:last-child{border-bottom:0}.placement-check input{width:18px;height:18px;margin-top:2px}.placement-check span{display:grid;gap:3px}.placement-check small{color:#777;line-height:1.3}.row-actions{display:flex!important;gap:6px;flex-wrap:wrap;align-items:center}.cms-badge{display:inline-flex;margin:5px 6px 0 0;padding:3px 7px;border-radius:999px;font-size:10px;font-weight:800;text-transform:uppercase}.cms-badge.featured{background:#fff0df;color:#9c4a16}.cms-badge.popular{background:#e8f4ff;color:#1e5d8a}.danger-btn{color:#9b2d24!important;border-color:#e0b7b3!important}`;document.head.appendChild(s)}
  }

  function wrapCollectFill(){
    if(typeof window.collect==='function'&&!window.collect.__placementWrapped){const base=window.collect;const wrapped=function(){const o=base();o.featured=!!$('#featuredFlag')?.checked;o.popular=!!$('#popularFlag')?.checked;o._editingSlug=editingSlug||o._editingSlug||'';return o};wrapped.__placementWrapped=true;window.collect=wrapped}
    if(typeof window.fill==='function'&&!window.fill.__placementWrapped){const base=window.fill;const wrapped=function(o={}){base(o);if($('#featuredFlag'))$('#featuredFlag').checked=!!o.featured;if($('#popularFlag'))$('#popularFlag').checked=!!o.popular;editingSlug=o._editingSlug||'';const slug=$('#slug');if(slug)slug.readOnly=!!editingSlug;if(editingSlug){$('#pageTitle').textContent='Редактирование публикации';const c=$('.crumb');if(c)c.textContent='Материалы / Редактирование'}};wrapped.__placementWrapped=true;window.fill=wrapped}
  }

  function sourceValue(note){if(!note)return'';const copy=note.cloneNode(true);if(/^Источники?:/i.test(copy.querySelector('strong')?.textContent||''))copy.querySelector('strong').remove();return copy.innerHTML.trim()}
  function parseQuiz(doc){
    const section=doc.querySelector('.pv-quiz');if(!section)return null;
    const questions=[...section.querySelectorAll('.pv-quiz-question')].map(q=>({question:(q.querySelector('legend')?.textContent||'').replace(/^\s*\d+\.\s*/,''),options:[...q.querySelectorAll('.pv-quiz-option')].map(x=>(x.textContent||'').replace(/^\s*[АБВГA-D]\.?\s*/i,'').trim()),correct:Number(q.dataset.correct||0),explanation:q.dataset.explanation||''}));
    const after=doc.querySelector('.quiz-after-content');return {questions,afterContent:after?.innerHTML||''}
  }
  async function materialFromPost(p){
    const file=await window.getFile(`articles/${p.slug}.html`);if(!file)throw new Error('HTML статьи не найден в репозитории');
    const doc=new DOMParser().parseFromString(decode(file),'text/html'),body=doc.querySelector('.article-body');
    const quiz=parseQuiz(doc), note=[...(body?.querySelectorAll('.note')||[])].find(el=>/^Источники?:/i.test(el.querySelector('strong')?.textContent||'')),source=sourceValue(note);
    if(body){body.querySelector('.pv-quiz')?.remove();body.querySelector('.quiz-after-content')?.remove();note?.remove()}
    return {headline:p.headline||doc.querySelector('.article-title')?.textContent||'',category:p.category||doc.querySelector('.article-kicker')?.textContent||'Продукты',type:normalizedType(p.type),lead:doc.querySelector('.article-dek')?.textContent||'',publishedAt:local(p.publishedAt),updatedAt:local(p.updatedAt||p.publishedAt),seoTitle:doc.title||p.headline||'',description:p.description||doc.querySelector('meta[name="description"]')?.content||'',slug:p.slug,canonical:doc.querySelector('link[rel="canonical"]')?.href||p.url||'',robots:doc.querySelector('meta[name="robots"]')?.content||'index, follow, max-image-preview:large',ogImage:doc.querySelector('meta[property="og:image"]')?.content||p.image||'',source,tags:Array.isArray(p.tags)?p.tags.join(', '):(p.tags||''),image:p.image||doc.querySelector('.article-cover')?.src||'',imageAlt:p.imageAlt||doc.querySelector('.article-cover')?.alt||'',photoSource:p.photoSource||'',author:p.author||'',coauthors:Array.isArray(p.coauthors)?p.coauthors:[],content:body?.innerHTML||'',quiz,featured:!!p.featured,popular:!!p.popular,newsletterGroup:Number(p.newsletterGroup)||0,_editingSlug:p.slug}
  }
  async function editPublished(slug){
    const st=cmsStore(),p=(st?.posts||[]).find(x=>x.slug===slug);if(!p)return;
    try{flash?.('Загружаю материал…');const data=await materialFromPost(p);editingSlug=slug;const fp=$('#imageFile');if(fp)fp.value='';window.fill(data);document.querySelector('.nav-btn[data-target="material"]')?.click();$('#pageTitle').textContent='Редактирование публикации';const c=$('.crumb');if(c)c.textContent='Материалы / Редактирование';flash?.('Материал открыт для редактирования')}catch(e){flash?.(e.message)}
  }
  async function deletePublished(slug){
    const st=cmsStore(),p=(st?.posts||[]).find(x=>x.slug===slug);if(!p)return;
    try{
      flash?.('Удаляю материал…');
      await window.deleteFile(`articles/${slug}.html`,`Delete article: ${p.headline}`);
      const pf=await window.getFile('data/posts.json'),posts=pf?.content?JSON.parse(decode(pf)):[];
      const next=posts.filter(x=>x.slug!==slug);
      await window.putFile('data/posts.json',JSON.stringify(next,null,2),`Remove post index: ${p.headline}`);
      if(st){st.posts=next;if(typeof saveStore==='function')saveStore()}if(typeof renderPosts==='function')renderPosts();flash?.('Материал удалён.')
    }catch(e){flash?.(e.message||'Не удалось удалить материал')}
  }
  window.editPublishedPost=editPublished;window.deletePublishedPost=deletePublished;

  function enhancePublishedList(){
    if(typeof window.renderPosts!=='function'||window.renderPosts.__managerWrapped)return;
    const base=window.renderPosts;
    const wrapped=function(){
      base();const tb=$('#postsTable'),st=cmsStore();if(!tb)return;
      [...tb.querySelectorAll('tr')].filter(tr=>!tr.classList.contains('draft-row')).forEach(tr=>{
        const link=tr.querySelector('a[href*="/articles/"]');if(!link)return;
        let slug='';try{slug=(new URL(link.href,location.href).pathname.split('/').pop()||'').replace(/\.html$/,'')}catch(e){}
        const p=(st?.posts||[]).find(x=>x.slug===slug);if(!p)return;
        const titleCell=tr.children[0];if(titleCell&&!titleCell.querySelector('.cms-badge')){if(p.featured)titleCell.insertAdjacentHTML('beforeend','<br><span class="cms-badge featured">Главная</span>');if(p.popular)titleCell.insertAdjacentHTML('beforeend','<span class="cms-badge popular">Популярное</span>')}
        let actions=tr.querySelector('.row-actions')||tr.lastElementChild;if(!actions||actions===titleCell){actions=document.createElement('td');actions.className='row-actions';tr.appendChild(actions)}else actions.classList.add('row-actions');
        if(!actions.querySelector('[data-edit-published]'))actions.insertAdjacentHTML('beforeend',`<button type="button" class="btn soft" data-edit-published="${esc(slug)}">Редактировать</button><button type="button" class="btn danger-btn" data-delete-published="${esc(slug)}">Удалить</button>`)
      });
      $$('[data-edit-published]').forEach(b=>b.onclick=()=>editPublished(b.dataset.editPublished));
      $$('[data-delete-published]').forEach(b=>b.onclick=()=>deletePublished(b.dataset.deletePublished));
    };
    wrapped.__managerWrapped=true;window.renderPosts=wrapped;window.renderPosts()
  }

  function wrapPostIndex(){
    if(typeof window.putFile!=='function'||window.putFile.__placementIndexWrapped)return;
    const base=window.putFile;const wrapped=async function(path,content,message,encoding='utf-8'){
      if(path==='data/posts.json'&&encoding!=='base64'){
        try{
          let posts=JSON.parse(content),o=window.collect?.()||{},p=posts.find(x=>x.slug===o.slug);
          if(p){p.featured=!!o.featured;p.popular=!!o.popular;if(p.featured)posts.forEach(x=>{if(x.slug!==p.slug)x.featured=false});const pops=posts.filter(x=>x.popular).sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));pops.slice(7).forEach(x=>x.popular=false)}
          content=JSON.stringify(posts,null,2)
        }catch(e){console.warn('Homepage placement metadata:',e)}
      }
      return base(path,content,message,encoding)
    };wrapped.__placementIndexWrapped=true;window.putFile=wrapped
  }
  function resetEditing(){editingSlug='';if($('#slug'))$('#slug').readOnly=false;if($('#featuredFlag'))$('#featuredFlag').checked=false;if($('#popularFlag'))$('#popularFlag').checked=false;if($('#newsletterGroup'))$('#newsletterGroup').value='0'}
  function bindNew(){document.addEventListener('click',e=>{if(e.target.closest?.('#newArticleBtn'))setTimeout(resetEditing,0)},true)}

  function init(){installPlacement();wrapCollectFill();wrapPostIndex();enhancePublishedList();bindNew()}
  let tries=0,t=setInterval(()=>{tries++;if(typeof window.collect==='function'&&typeof window.fill==='function'&&typeof window.putFile==='function'&&typeof window.deleteFile==='function'&&typeof window.renderPosts==='function'&&$('#postsTable')&&$('#pvCmsExtrasStyles')){clearInterval(t);init()}else if(tries>240)clearInterval(t)},50)
})();
