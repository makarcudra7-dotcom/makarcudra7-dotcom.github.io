(()=>{
  'use strict';
  if(window.__pvDraftHistory)return;window.__pvDraftHistory=true;
  const KEY='provkusCmsDraftHistoryV1';
  const MAX=40;
  const $=s=>document.querySelector(s);
  const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
  const write=x=>{try{localStorage.setItem(KEY,JSON.stringify(x.slice(0,MAX)))}catch{}};
  const current=()=>{try{return typeof window.collect==='function'?window.collect():null}catch{return null}};
  const identity=d=>(d?.slug||d?.headline||'').trim();
  function addSnapshot(d,reason='autosave'){
    if(!d||!identity(d))return;
    const list=read();
    const json=JSON.stringify(d);
    if(list[0]?.json===json)return;
    list.unshift({id:Date.now()+'-'+Math.random().toString(36).slice(2,8),savedAt:new Date().toISOString(),reason,headline:d.headline||'Без заголовка',slug:d.slug||'',type:d.type||'',json,draft:d});
    write(list);
  }
  function migrateCurrent(){
    try{const s=JSON.parse(localStorage.getItem('provkusCms')||'null');if(s?.draft)addSnapshot(s.draft,'migration')}catch{}
  }
  function restore(item){
    if(!item?.draft)return;
    if(typeof window.fill==='function')window.fill(item.draft);
    try{const s=JSON.parse(localStorage.getItem('provkusCms')||'null')||{posts:[]};s.draft=item.draft;localStorage.setItem('provkusCms',JSON.stringify(s))}catch{}
    close();
    document.querySelector('.nav-btn[data-target="material"]')?.click();
    const st=$('#autosaveStatus');if(st)st.textContent='Черновик восстановлен из истории';
  }
  let modal;
  function render(){
    const body=modal.querySelector('.pv-draft-list');
    const list=read();
    if(!list.length){body.innerHTML='<p class="pv-draft-empty">Сохранённых версий пока нет.</p>';return}
    body.innerHTML=list.map((x,i)=>{const dt=new Date(x.savedAt);const when=Number.isNaN(dt.getTime())?'':dt.toLocaleString('ru-RU');return `<button type="button" class="pv-draft-item" data-i="${i}"><strong>${escapeHtml(x.headline||'Без заголовка')}</strong><span>${escapeHtml(when)}${x.type?' · '+escapeHtml(x.type):''}</span></button>`}).join('');
  }
  function escapeHtml(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function open(){render();modal.hidden=false;document.body.classList.add('pv-draft-open')}
  function close(){if(!modal)return;modal.hidden=true;document.body.classList.remove('pv-draft-open')}
  function build(){
    const actions=$('.actions');if(!actions)return;
    const btn=document.createElement('button');btn.type='button';btn.className='btn';btn.id='draftHistoryBtn';btn.textContent='Черновики';
    const save=$('#saveBtn');if(save)actions.insertBefore(btn,save);else actions.appendChild(btn);
    modal=document.createElement('div');modal.className='pv-draft-modal';modal.hidden=true;modal.innerHTML='<div class="pv-draft-backdrop" data-close></div><section class="pv-draft-panel" role="dialog" aria-modal="true" aria-labelledby="pvDraftTitle"><div class="pv-draft-head"><div><h2 id="pvDraftTitle">История черновиков</h2><p>Хранятся локально в этом браузере. Нажмите нужную версию, чтобы восстановить её в редактор.</p></div><button type="button" class="btn" data-close>Закрыть</button></div><div class="pv-draft-list"></div></section>';
    document.body.appendChild(modal);
    const style=document.createElement('style');style.textContent='.pv-draft-modal{position:fixed;inset:0;z-index:99999}.pv-draft-modal[hidden]{display:none}.pv-draft-backdrop{position:absolute;inset:0;background:#0008}.pv-draft-panel{position:relative;z-index:1;width:min(720px,calc(100% - 28px));max-height:82vh;overflow:auto;margin:9vh auto;background:#fff;color:#222;border-radius:16px;padding:20px;box-shadow:0 25px 70px #0005}.pv-draft-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.pv-draft-head h2{margin:0 0 6px}.pv-draft-head p{margin:0;color:#687078}.pv-draft-list{display:grid;gap:8px;margin-top:18px}.pv-draft-item{display:grid;gap:4px;text-align:left;width:100%;padding:12px 14px;border:1px solid #d9dee2;border-radius:10px;background:#fff;cursor:pointer}.pv-draft-item:hover{border-color:#159447;background:#f3faf6}.pv-draft-item span{font-size:12px;color:#747b80}.pv-draft-empty{color:#747b80}.pv-draft-open{overflow:hidden}@media(max-width:640px){.pv-draft-head{display:grid}.pv-draft-panel{margin:5vh auto;max-height:90vh}}';document.head.appendChild(style);
    btn.addEventListener('click',open);modal.addEventListener('click',e=>{if(e.target.closest('[data-close]'))return close();const it=e.target.closest('.pv-draft-item');if(!it)return;const item=read()[Number(it.dataset.i)];restore(item)});
  }
  let timer=0,last='';
  function schedule(reason='autosave'){
    clearTimeout(timer);timer=setTimeout(()=>{const d=current();if(!d)return;const json=JSON.stringify(d);if(json===last)return;last=json;addSnapshot(d,reason)},1800)
  }
  migrateCurrent();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
  document.addEventListener('input',e=>{if(e.target.closest?.('#material'))schedule('autosave')});
  document.addEventListener('change',e=>{if(e.target.closest?.('#material'))schedule('autosave')});
  document.addEventListener('click',e=>{if(e.target.closest?.('#saveBtn,#scheduleBtn,#publishBtn,#savePublishedBtn')){const d=current();if(d)addSnapshot(d,e.target.closest('#scheduleBtn')?'schedule':e.target.closest('#publishBtn')?'publish':'manual')}} ,true);
})();
