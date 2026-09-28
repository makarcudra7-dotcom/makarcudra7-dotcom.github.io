(()=>{
  'use strict';
  if(window.__pvAdminStability)return;window.__pvAdminStability=true;
  const $=s=>document.querySelector(s);
  const status=$('#autosaveStatus');
  let timer=0,last='',dirty=false,baseline='';
  function currentValue(){try{return typeof window.collect==='function'?JSON.stringify(window.collect()):''}catch{return''}}
  function markClean(){baseline=currentValue();dirty=false;if(status)status.textContent='Изменения сохранены'}
  function markDirty(){const v=currentValue();dirty=!!v&&v!==baseline;if(status&&dirty)status.textContent='Есть несохранённые изменения'}
  function genderWarning(){
    const author=$('#author')?.value||'';
    const male=/\bИлья\b/i.test(author);
    const text=($('#headline')?.value||'')+' '+($('#lead')?.value||'')+' '+($('#richEditor')?.innerText||'');
    const patterns=male?[/\bя\s+и\s+рада\b/i,/\b(?:я\s+)?думала\b/i,/\b(?:я\s+)?готовила\b/i,/\b(?:я\s+)?решила\b/i,/\b(?:я\s+)?добавила\b/i,/\b(?:я\s+)?взяла\b/i]:[/\bя\s+и\s+рад\b/i,/\b(?:я\s+)?думал\b/i,/\b(?:я\s+)?готовил\b/i,/\b(?:я\s+)?решил\b/i,/\b(?:я\s+)?добавил\b/i,/\b(?:я\s+)?взял\b/i];
    const found=patterns.find(p=>p.test(text));
    const note=$('#genderStatus');
    if(note){note.textContent=found?`Проверьте согласование с автором: «${text.match(found)?.[0]}»`:'';note.hidden=!found}
    return !found;
  }
  window.editorialGenderValid=genderWarning;
  function syncEditorial(){
    const title=$('#headline')?.value||'';
    const seo=$('#seoTitle');if(seo&&seo.value!==title){seo.value=title;seo.dispatchEvent(new Event('change',{bubbles:true}))}
    const lead=$('#lead');if(lead){lead.maxLength=90;lead.title='Короткий поисковый запрос, со строчной буквы';}
    genderWarning();
  }
  function save(){
    if(typeof window.collect!=='function'||!window.store)return;
    const draft=window.collect();const value=JSON.stringify(draft);
    if(value===last)return;
    window.store.draft=draft;
    try{localStorage.setItem('provkusCms',JSON.stringify(window.store));last=value;baseline=value;dirty=false;if(status)status.textContent='Черновик сохранён автоматически'}
    catch(e){if(status)status.textContent='Не удалось сохранить черновик';console.warn('autosave',e)}
  }
  function later(){syncEditorial();markDirty();if(status&&dirty)status.textContent='Сохраняю локальный черновик…';clearTimeout(timer);timer=setTimeout(save,600)}
  document.addEventListener('input',e=>{if(e.target.closest?.('#material')&&e.target.id!=='seoTitle')later()});
  document.addEventListener('change',e=>{if(e.target.closest?.('#material'))later()});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();$('#saveBtn')?.focus()}});
  window.addEventListener('beforeunload',e=>{if(!dirty)return;save();if(dirty){e.preventDefault();e.returnValue=''}});
  window.addEventListener('pagehide',()=>{clearTimeout(timer);save()});
  document.addEventListener('click',e=>{
    const leave=e.target.closest?.('.nav-btn[data-target]:not([data-target="material"]),.site-link:not(#saveBtn)');
    if(leave&&dirty){clearTimeout(timer);save()}
    if(e.target.closest?.('#saveBtn,#scheduleBtn,#savePublishedBtn,#publishBtn'))setTimeout(()=>{if(!document.querySelector('.flash')?.textContent?.match(/ошиб|не удалось|остановлена/i))markClean()},1200)
  },true);
  $('#refreshPostsBtn')?.addEventListener('click',()=>window.refreshPublications?.());
  const note=document.createElement('div');note.id='genderStatus';note.className='editorial-warning';note.hidden=true;$('#headline')?.closest('.field')?.appendChild(note);
  const style=document.createElement('style');style.textContent='.autosave-status{font-size:12px;color:#53715d;white-space:nowrap}.editorial-warning{margin-top:6px;color:#a43a27;font-size:13px}.card-title #refreshPostsBtn{float:right;padding:5px 9px}.actions{flex-wrap:wrap}.table-wrap{overflow-x:auto}#postsTable tr{overflow-anchor:none}@media(max-width:800px){.autosave-status{order:5;width:100%}}';document.head.appendChild(style);
  syncEditorial();setTimeout(markClean,0);
})();
