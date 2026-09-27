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
  const source=document.getElementById('source');if(source)source.placeholder='Добавьте проверяемые источники при необходимости; для редакционного материала поле можно оставить пустым';
  const css=document.createElement('link');css.rel='stylesheet';css.href='assets/admin-fixes.css?v=20260927-queue-placement1';document.head.appendChild(css);

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const decode=f=>new TextDecoder().decode(Uint8Array.from(atob((f?.content||'').replace(/\n/g,'')),c=>c.charCodeAt(0)));
  const queued=()=>window.__pvScheduledSnapshot||window.store?.scheduled||[];
  const flash=s=>typeof window.flash==='function'?window.flash(s):console.log(s);
  let queueBusy=false;

  function decorateQueuedPlacements(){
    document.querySelectorAll('#postsTable tr[data-scheduled-slug]').forEach(tr=>{
      const slug=tr.dataset.scheduledSlug,item=queued().find(x=>x.slug===slug),cell=tr.querySelector('.row-actions')||tr.lastElementChild;
      if(!slug||!item||!cell)return;
      if(!cell.querySelector('[data-pv-queued-placement="featured"]')){
        cell.insertAdjacentHTML('afterbegin',`<button type="button" class="btn soft" data-pv-queued-placement="featured" data-pv-queued-slug="${esc(slug)}" aria-pressed="false" title="После выхода материал автоматически станет главным">Главная</button><button type="button" class="btn soft" data-pv-queued-placement="popular" data-pv-queued-slug="${esc(slug)}" aria-pressed="false" title="После выхода материал автоматически попадёт в Популярное">Популярное</button><button type="button" class="btn soft" data-pv-queued-placement="newsletter" data-pv-queued-slug="${esc(slug)}" aria-pressed="false" title="После выхода материал автоматически будет добавлен в рассылку">В рассылку</button>`);
      }
      for(const kind of ['featured','popular','newsletter']){
        const b=cell.querySelector(`[data-pv-queued-placement="${kind}"]`),on=!!item.post?.[kind];
        if(b){b.setAttribute('aria-pressed',String(on));b.classList.toggle('pv-selected',on)}
      }
    });
  }

  async function toggleQueuedPlacement(slug,kind){
    if(queueBusy)return;
    if(typeof window.getFile!=='function'||typeof window.putFile!=='function')return flash('GitHub ещё не подключён');
    queueBusy=true;
    document.querySelectorAll('[data-pv-queued-placement]').forEach(b=>b.disabled=true);
    try{
      const file=await window.getFile('.github/scheduled-posts.json');
      const list=file?.content?JSON.parse(decode(file)):[];
      const target=list.find(x=>x.slug===slug);if(!target)throw new Error('Материал уже вышел или отсутствует в очереди');
      target.post=target.post||{};target.material=target.material||{};
      const on=!target.post[kind];target.post[kind]=on;target.material[kind]=on;
      await window.putFile('.github/scheduled-posts.json',JSON.stringify(list.sort((a,b)=>new Date(a.publishAt)-new Date(b.publishAt)),null,2),`Scheduled ${kind}: ${slug}`);
      window.__pvScheduledSnapshot=list;if(window.store)window.store.scheduled=list;
      await window.refreshScheduledNow?.();decorateQueuedPlacements();
      const label=kind==='featured'?'Главная':kind==='popular'?'Популярное':'В рассылку';flash(`${label}: ${on?'включено':'выключено'} для отложенной статьи`);
    }catch(e){flash(e.message||'Не удалось сохранить флаг отложенной публикации')}
    finally{queueBusy=false;document.querySelectorAll('[data-pv-queued-placement]').forEach(b=>b.disabled=false)}
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-pv-queued-placement]');if(!b)return;
    e.preventDefault();e.stopPropagation();toggleQueuedPlacement(b.dataset.pvQueuedSlug,b.dataset.pvQueuedPlacement);
  },true);
  const table=document.getElementById('postsTable');if(table)new MutationObserver(decorateQueuedPlacements).observe(table,{childList:true,subtree:true});
  let tries=0,t=setInterval(()=>{decorateQueuedPlacements();if(++tries>120)clearInterval(t)},100);
})();
