(()=>{
  const image=document.getElementById('image'),file=document.getElementById('imageFile'),preview=document.getElementById('imagePreview');
  let localUrl='';
  function update(){
    if(localUrl){URL.revokeObjectURL(localUrl);localUrl=''}
    const upload=file?.files?.[0];
    if(upload){localUrl=URL.createObjectURL(upload);preview.src=localUrl;return}
    const typed=image?.value?.trim();
    preview.src=typed?new URL(typed,location.origin+'/').href:'assets/fallback-cover.svg';
  }
  file?.addEventListener('change',update);
  image?.addEventListener('input',()=>{if(!file?.files?.length)update()});
  preview?.addEventListener('error',()=>{if(preview.src!==new URL('/assets/fallback-cover.svg',location.origin).href)preview.src='/assets/fallback-cover.svg'});
  const seo=document.getElementById('seoTitle');if(seo){seo.maxLength=140;seo.dispatchEvent(new Event('input',{bubbles:true}))}
  if(document.getElementById('coauthors'))document.getElementById('coauthors').closest('.field')?.remove();
  const css=document.createElement('link');css.rel='stylesheet';css.href='assets/admin-fixes.css?v=20260923-ux1';document.head.appendChild(css);

  // Dzen helper: ProVkus teaser scheme = 2 paragraphs + CTA + direct article URL.
  const DZEN_STUDIO='https://dzen.ru/profile/editor/create';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const uniq=arr=>arr.filter((v,i,a)=>v&&a.findIndex(x=>x.toLowerCase()===v.toLowerCase())===i);
  const clip=async text=>{
    try{await navigator.clipboard.writeText(text);return true}catch{}
    const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
    const ok=document.execCommand('copy');ta.remove();return ok;
  };
  const showFlash=msg=>{if(typeof flash==='function')return flash(msg);const f=document.getElementById('flash');if(f){f.textContent=msg;f.classList.add('show');setTimeout(()=>f.classList.remove('show'),2600)}};
  function paragraphCandidates(root){
    if(!root)return[];
    return [...root.querySelectorAll('p')].map(p=>clean(p.textContent)).filter(t=>t.length>45&&!/^личное мнение автора/i.test(t)&&!/^источник/i.test(t));
  }
  function makeTeaser({title,lead,description,paragraphs,url}){
    let pool=uniq([clean(lead),clean(description),...(paragraphs||[]).map(clean)]).filter(t=>t.length>45);
    if(!pool.length)pool=[`В новом материале ProVkus разбираем тему «${clean(title)}» и собираем главное без лишней воды.`];
    if(pool.length===1)pool.push(`В полной версии есть детали, практические нюансы и конкретные шаги, которые помогут применить совет на практике.`);
    const p1=pool[0],p2=pool.find(x=>x!==p1)||pool[1];
    return `${p1}\n\n${p2}\n\nПродолжение — на ProVkus: ${url}`;
  }
  function ensureDzenModal(){
    let modal=document.getElementById('dzenModal');if(modal)return modal;
    const style=document.createElement('style');style.textContent=`
      .dzen-overlay{position:fixed;inset:0;background:rgba(17,24,39,.58);z-index:9999;display:grid;place-items:center;padding:20px}
      .dzen-card{width:min(760px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.28);padding:22px}
      .dzen-head{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:16px}.dzen-head h2{margin:0;font-size:22px}
      .dzen-card label{display:block;font-weight:700;margin:12px 0 6px}.dzen-card input,.dzen-card textarea{width:100%;box-sizing:border-box;border:1px solid #d8dee8;border-radius:10px;padding:11px 12px;font:inherit}.dzen-card textarea{min-height:210px;resize:vertical;line-height:1.45}
      .dzen-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.dzen-note{font-size:13px;color:#667085;margin-top:10px;line-height:1.4}
      .dzen-mini{padding:6px 9px;border:0;border-radius:8px;background:#111827;color:#fff;cursor:pointer;font:inherit}.dzen-mini.secondary{background:#eef2f6;color:#1f2937}
    `;document.head.appendChild(style);
    modal=document.createElement('div');modal.id='dzenModal';modal.className='dzen-overlay';modal.hidden=true;modal.innerHTML=`<div class="dzen-card" role="dialog" aria-modal="true" aria-label="Публикация в Дзен"><div class="dzen-head"><h2>Тизер для Дзена</h2><button type="button" class="dzen-mini secondary" data-dzen-close>✕</button></div><label>Заголовок</label><input id="dzenTitle"><label>Два абзаца + переход на ProVkus</label><textarea id="dzenText"></textarea><div class="dzen-actions"><button type="button" class="dzen-mini secondary" id="dzenCopyTitle">Копировать заголовок</button><button type="button" class="dzen-mini secondary" id="dzenCopyText">Копировать текст</button><button type="button" class="dzen-mini" id="dzenOpenStudio">Открыть Дзен-студию ↗</button></div><div class="dzen-note">Дзен не предоставляет подключённого к этой админке API публикации. Кнопка готовит тизер, копирует его и открывает редактор. Финальное нажатие «Опубликовать» выполняется в авторизованной Дзен-студии.</div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-dzen-close]').onclick=()=>modal.hidden=true;
    modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
    document.getElementById('dzenCopyTitle').onclick=async()=>{await clip(document.getElementById('dzenTitle').value);showFlash('Заголовок скопирован')};
    document.getElementById('dzenCopyText').onclick=async()=>{await clip(document.getElementById('dzenText').value);showFlash('Тизер скопирован')};
    document.getElementById('dzenOpenStudio').onclick=()=>window.open(DZEN_STUDIO,'_blank','noopener');
    return modal;
  }
  function openDzenDraft(data){
    const modal=ensureDzenModal();
    document.getElementById('dzenTitle').value=clean(data.title);
    document.getElementById('dzenText').value=makeTeaser(data);
    modal.hidden=false;
  }
  function currentDzenData(){
    const headline=document.getElementById('headline')?.value||'';
    const slug=document.getElementById('slug')?.value||'';
    const canonical=document.getElementById('canonical')?.value||`https://provkus-media.ru/articles/${slug}.html`;
    const editor=document.getElementById('richEditor');
    return {title:headline,lead:document.getElementById('lead')?.value||'',description:document.getElementById('description')?.value||'',paragraphs:paragraphCandidates(editor),url:canonical};
  }
  const actions=document.querySelector('.top .actions');
  if(actions&&!document.getElementById('dzenPublishBtn')){
    const btn=document.createElement('button');btn.type='button';btn.className='btn soft';btn.id='dzenPublishBtn';btn.textContent='Опубликовать в Дзен ↗';
    btn.onclick=()=>{const d=currentDzenData();if(!clean(d.title))return showFlash('Сначала заполните заголовок');openDzenDraft(d)};
    actions.appendChild(btn);
  }
  async function articleDataFromUrl(url,title){
    try{
      const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));const html=await r.text(),doc=new DOMParser().parseFromString(html,'text/html');
      return {title:clean(doc.querySelector('h1')?.textContent)||title,lead:clean(doc.querySelector('.article-dek')?.textContent),description:clean(doc.querySelector('meta[name="description"]')?.content),paragraphs:paragraphCandidates(doc.querySelector('.article-body')),url};
    }catch{return {title,lead:'',description:'',paragraphs:[],url}}
  }
  function addDzenButtonsToPosts(){
    const table=document.querySelector('#publications table');if(!table)return;
    const hr=table.querySelector('thead tr');if(hr&&!hr.querySelector('[data-dzen-th]')){const th=document.createElement('th');th.dataset.dzenTh='1';th.textContent='Дзен';hr.appendChild(th)}
    table.querySelectorAll('#postsTable tr').forEach(tr=>{
      if(tr.dataset.dzenReady||tr.children.length<2)return;tr.dataset.dzenReady='1';
      if(tr.querySelector('td[colspan]')){tr.querySelector('td')?.setAttribute('colspan','6');return}
      const title=clean(tr.children[0]?.textContent),url=tr.querySelector('a[href]')?.href;if(!url)return;
      const td=document.createElement('td'),b=document.createElement('button');b.type='button';b.className='dzen-mini secondary';b.textContent='Тизер ↗';
      b.onclick=async()=>{window.open(DZEN_STUDIO,'_blank','noopener');openDzenDraft(await articleDataFromUrl(url,title));showFlash('Тизер готов — Дзен-студия открыта')};td.appendChild(b);tr.appendChild(td);
    });
  }
  const postsTable=document.getElementById('postsTable');if(postsTable){new MutationObserver(addDzenButtonsToPosts).observe(postsTable,{childList:true,subtree:true});addDzenButtonsToPosts()}
})();
