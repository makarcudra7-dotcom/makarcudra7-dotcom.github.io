(()=>{
  'use strict';
  if(window.__pvAdminActionsFixLoaded)return;
  window.__pvAdminActionsFixLoaded=true;
  const $=s=>document.querySelector(s);
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let scheduled=false;

  function postStore(){
    try{return typeof store!=='undefined'&&Array.isArray(store.posts)?store.posts:[]}catch(_){return[]}
  }
  function slugFromRow(row){
    const link=row.querySelector('a[href*="/articles/"]');
    if(!link)return'';
    try{return (new URL(link.href,location.href).pathname.split('/').pop()||'').replace(/\.html$/,'')}
    catch(_){return''}
  }
  function actionCell(row,head){
    let cell=row.querySelector('.cms-direct-actions');
    if(cell)return cell;
    const last=row.lastElementChild;
    const headCount=head?.children?.length||0;
    const lastLooksEmpty=last&&last.tagName==='TD'&&!last.querySelector('button,a,input,select')&&!String(last.textContent||'').trim();
    if(lastLooksEmpty&&row.children.length>=headCount){cell=last}
    else{cell=document.createElement('td');row.appendChild(cell)}
    cell.classList.add('row-actions','cms-direct-actions');
    return cell;
  }
  function ensureHeader(table){
    const head=table.querySelector('thead tr');if(!head)return null;
    if(!head.querySelector('[data-cms-direct-actions-th]')){
      const last=head.lastElementChild;
      const duplicateActions=[...head.children].filter(x=>String(x.textContent||'').trim().toLowerCase()==='действия');
      if(last&&String(last.textContent||'').trim().toLowerCase()==='действия'&&duplicateActions.length>=2){last.dataset.cmsDirectActionsTh='1'}
      else{const th=document.createElement('th');th.dataset.cmsDirectActionsTh='1';th.textContent='Действия';head.appendChild(th)}
    }
    return head;
  }
  function bindButton(button,type,slug){
    button.onclick=async e=>{
      e.preventDefault();e.stopPropagation();
      if(type==='edit'){
        const fn=window.openPublishedArticleForEdit||window.editPublishedPost;
        if(typeof fn==='function')return fn(slug,button);
        window.flash?.('Редактор ещё загружается. Повторите нажатие.');
        return;
      }
      if(button.dataset.busy==='1')return;
      button.dataset.busy='1';button.disabled=true;const old=button.textContent;button.textContent='Удаляю…';
      try{
        if(typeof window.deletePublishedPost!=='function')throw new Error('Модуль удаления ещё загружается');
        await window.deletePublishedPost(slug);
      }catch(err){window.flash?.(err?.message||'Не удалось удалить материал')}
      finally{button.dataset.busy='';button.disabled=false;button.textContent=old}
    };
  }
  function ensureActions(){
    scheduled=false;
    const table=$('#publications table'),body=$('#postsTable');if(!table||!body)return;
    const head=ensureHeader(table),posts=postStore();
    [...body.querySelectorAll('tr')].forEach(row=>{
      if(row.querySelector('td[colspan]'))return;
      const slug=slugFromRow(row);if(!slug)return;
      if(posts.length&&!posts.some(p=>p.slug===slug))return;
      const cell=actionCell(row,head);
      let edit=cell.querySelector('[data-cms-edit]');
      if(!edit){edit=document.createElement('button');edit.type='button';edit.className='btn soft';edit.dataset.cmsEdit=slug;edit.textContent='Редактировать';cell.appendChild(edit)}
      let del=cell.querySelector('[data-cms-delete]');
      if(!del){del=document.createElement('button');del.type='button';del.className='btn danger-btn';del.dataset.cmsDelete=slug;del.textContent='Удалить';cell.appendChild(del)}
      bindButton(edit,'edit',slug);bindButton(del,'delete',slug);
    });
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(ensureActions)}
  function install(){
    const body=$('#postsTable');if(!body)return false;
    ensureActions();
    const observer=new MutationObserver(schedule);observer.observe(body,{childList:true,subtree:true});
    document.addEventListener('click',e=>{if(e.target.closest?.('.nav-btn[data-target="publications"]'))setTimeout(ensureActions,0)},true);
    window.addEventListener('pageshow',ensureActions);
    return true;
  }
  let tries=0,timer=setInterval(()=>{tries++;if(install())clearInterval(timer);else if(tries>300)clearInterval(timer)},50);
})();
