(()=>{
  'use strict';
  if(window.__pvIndexingCalendar)return;window.__pvIndexingCalendar=true;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const posts=()=>window.store?.posts||[];
  const queued=()=>window.__pvScheduledSnapshot||window.store?.scheduled||[];
  const fmtTime=d=>new Date(d).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  let calendarMode='week';

  function dayKey(d){return new Date(d).toLocaleDateString('sv-SE')}
  function calendarItems(){
    const now=new Date(),end=new Date(now.getTime()+(calendarMode==='day'?86400000:7*86400000));
    return [
      ...queued().map(x=>({slug:x.slug,title:x.post?.headline||x.material?.headline||x.slug,date:x.publishAt,status:x.status==='error'?'Ошибка':'Очередь'})),
      ...posts().filter(x=>new Date(x.publishedAt)>=new Date(now.getTime()-86400000)&&new Date(x.publishedAt)<=end).map(x=>({slug:x.slug,title:x.headline,date:x.publishedAt,status:'Вышла'}))
    ].filter(x=>{const d=new Date(x.date);return Number.isFinite(d.getTime())&&d<=end&&(calendarMode==='week'||dayKey(d)===dayKey(now))}).sort((a,b)=>new Date(a.date)-new Date(b.date));
  }
  function renderCalendar(){
    const box=$('#pvCalendar');if(!box)return;const items=calendarItems(),groups={};
    for(const x of items){const day=new Date(x.date).toLocaleDateString('ru-RU',{weekday:'short',day:'numeric',month:'long'});(groups[day]||=[]).push(x)}
    box.innerHTML=`<div class="pv-calendar-mode"><button type="button" class="btn soft ${calendarMode==='day'?'pv-selected':''}" data-pv-cal-mode="day">Сегодня</button><button type="button" class="btn soft ${calendarMode==='week'?'pv-selected':''}" data-pv-cal-mode="week">7 дней</button></div>`+(Object.entries(groups).map(([day,list])=>`<div class="pv-calendar-day"><strong>${esc(day)}</strong>${list.map(x=>`<div class="pv-calendar-item"><span>${esc(fmtTime(x.date))} · ${esc(x.title)}</span><small>${esc(x.status)}</small></div>`).join('')}</div>`).join('')||'<p class="hint">В выбранном периоде публикаций нет.</p>');
  }
  function installCalendar(){
    const old=$('#pvCalendarBtn');if(!old||old.dataset.pvRangeCalendar)return;
    const btn=old.cloneNode(true);btn.dataset.pvRangeCalendar='1';btn.textContent='Календарь';old.replaceWith(btn);
    btn.onclick=()=>{const box=$('#pvCalendar');if(!box)return;box.hidden=!box.hidden;if(!box.hidden)renderCalendar()};
    document.addEventListener('click',e=>{const b=e.target.closest?.('[data-pv-cal-mode]');if(!b)return;calendarMode=b.dataset.pvCalMode;renderCalendar()},true);
  }

  async function loadIndexing(){
    const box=$('#pvIndexingBody');if(!box)return;box.innerHTML='<p class="hint">Проверяю sitemap и robots…</p>';
    let robotsOk=false,robotsText='',sitemapOk=false,urls=0,lastmod='—',error='';
    try{const r=await fetch('/robots.txt?pv='+Date.now(),{cache:'no-store'});robotsOk=r.ok;robotsText=r.ok?await r.text():''}catch(e){error='robots.txt: '+e.message}
    try{const r=await fetch('/sitemap.xml?pv='+Date.now(),{cache:'no-store'});sitemapOk=r.ok;if(r.ok){const xml=new DOMParser().parseFromString(await r.text(),'application/xml');const nodes=[...xml.querySelectorAll('url')];urls=nodes.length;const dates=nodes.map(n=>n.querySelector('lastmod')?.textContent||'').filter(Boolean).sort();lastmod=dates.at(-1)||'—'}}catch(e){error+=(error?'; ':'')+'sitemap: '+e.message}
    const webmaster='API вебмастера не подключён к CMS';
    box.innerHTML=`<div class="pv-index-grid"><div><b>Sitemap</b><span>${sitemapOk?'доступен':'ошибка'}</span><small><a href="/sitemap.xml" target="_blank">/sitemap.xml</a> · URL: ${urls}</small></div><div><b>Последний lastmod</b><span>${esc(lastmod)}</span></div><div><b>Robots</b><span>${robotsOk?'доступен':'ошибка'}</span><small>${robotsText.includes('Sitemap:')?'sitemap указан':'строка Sitemap не найдена'}</small></div><div><b>Вебмастер</b><span>${webmaster}</span><small>Не показываем фиктивный статус без авторизованного API.</small></div></div>${error?`<p class="pv-index-error">${esc(error)}</p>`:''}<p class="hint">Последняя проверка: ${new Date().toLocaleString('ru-RU')}</p>`;
  }
  function installIndexing(){
    const section=$('#settings');if(!section||$('#pvIndexingPanel'))return;
    const card=document.createElement('div');card.className='card';card.id='pvIndexingPanel';card.innerHTML='<div class="card-title">Индексация <button type="button" class="btn soft" id="pvIndexRefresh">Проверить</button></div><div class="card-body" id="pvIndexingBody"></div>';section.appendChild(card);$('#pvIndexRefresh').onclick=loadIndexing;loadIndexing();
  }

  function installPostReport(){
    const root=$('#publications .card-body');if(!root||$('#pvPostReport'))return;
    const box=document.createElement('div');box.id='pvPostReport';box.className='pv-post-report';box.innerHTML='<strong>После публикации</strong><span>Ошибки и время последней проверки берутся из автоматического publication-health.</span><span>Показы/клики: источник аналитики пока не подключён к CMS; значения не подменяются нулями.</span>';root.appendChild(box);
  }
  function styles(){if($('#pvIndexingStyles'))return;const s=document.createElement('style');s.id='pvIndexingStyles';s.textContent='.pv-calendar-mode{display:flex;gap:7px;margin:8px 0 12px}.pv-index-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}.pv-index-grid>div{border:1px solid #e3e3e3;border-radius:10px;padding:11px;display:flex;flex-direction:column;gap:4px}.pv-index-grid span{font-weight:700}.pv-index-grid small,.pv-post-report span{color:#666;font-size:12px}.pv-index-error{color:#a3342a}.pv-post-report{margin:12px 0;padding:12px;border:1px solid #e3e3e3;border-radius:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}';document.head.appendChild(s)}
  function init(){styles();installCalendar();installIndexing();installPostReport()}
  let tries=0,t=setInterval(()=>{init();if(++tries>180)clearInterval(t)},100);window.addEventListener('pv-admin-runtime-ready',init);
})();
