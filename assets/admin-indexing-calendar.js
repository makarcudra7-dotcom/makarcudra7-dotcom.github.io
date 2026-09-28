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

  async function renderPostReport(){
    const box=$('#pvPostReport');if(!box)return;
    box.innerHTML='<strong>После публикации</strong><span>Загружаю результаты проверки…</span>';
    try{
      const response=await fetch('/data/publication-health.json?pv='+Date.now(),{cache:'no-store'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const report=await response.json();
      const recent=posts().filter(p=>p.slug&&new Date(p.publishedAt).getTime()<=Date.now())
        .sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt)).slice(0,15);
      if(!recent.length){box.innerHTML='<strong>После публикации</strong><span>Список материалов загружается…</span>';return}
      const rows=recent.map(p=>({p,health:report[p.slug]}));
      const issues=rows.filter(x=>x.health?.status==='error').length;
      const pending=rows.filter(x=>!x.health).length;
      const checked=rows.filter(x=>x.health?.checkedAt).map(x=>x.health.checkedAt).sort().at(-1);
      box.innerHTML=`<div class="pv-post-head"><strong>Свежие публикации: проверка сайта</strong><button type="button" class="btn soft" id="pvPostHealthRefresh">Обновить</button></div>
        <p class="hint">Последние 15 материалов · ошибок: ${issues} · ожидают проверки: ${pending} · последняя проверка: ${checked?esc(new Date(checked).toLocaleString('ru-RU')):'—'}. Автоматическая проверка запускается каждый час.</p>
        <div class="pv-post-list">${rows.map(({p,health})=>`<div class="pv-post-item"><a href="/articles/${encodeURIComponent(p.slug)}.html" target="_blank" rel="noopener">${esc(p.headline||p.slug)}</a><span class="${health?.status==='error'?'pv-index-error':''}">${health?.status==='error'?esc(health.errors?.join('; ')||'Ошибка'):health?.status==='ok'?'Страница и фото доступны':'Ожидает проверки'}</span><small>${health?.checkedAt?esc(new Date(health.checkedAt).toLocaleString('ru-RU')):'—'}</small></div>`).join('')}</div>
        <p class="hint">Это техническая доступность страницы и изображений. Статус индексации Google и показы здесь не измеряются.</p>`;
      $('#pvPostHealthRefresh').onclick=renderPostReport;
    }catch(e){box.innerHTML=`<strong>После публикации</strong><span class="pv-index-error">Не удалось загрузить результаты: ${esc(e.message)}</span><button type="button" class="btn soft" id="pvPostHealthRefresh">Повторить</button>`;$('#pvPostHealthRefresh').onclick=renderPostReport}
  }
  function installPostReport(){
    const root=$('#publications .card-body');if(!root||$('#pvPostReport'))return;
    const box=document.createElement('div');box.id='pvPostReport';box.className='pv-post-report';root.appendChild(box);renderPostReport();
    document.addEventListener('pv-posts-loaded',renderPostReport);
    setTimeout(renderPostReport,1500);
  }
  function styles(){if($('#pvIndexingStyles'))return;const s=document.createElement('style');s.id='pvIndexingStyles';s.textContent='.pv-calendar-mode{display:flex;gap:7px;margin:8px 0 12px}.pv-index-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}.pv-index-grid>div{border:1px solid #e3e3e3;border-radius:10px;padding:11px;display:flex;flex-direction:column;gap:4px}.pv-index-grid span{font-weight:700}.pv-index-grid small,.pv-post-report span{color:#666;font-size:12px}.pv-index-error{color:#a3342a}.pv-post-report{margin:12px 0;padding:12px;border:1px solid #e3e3e3;border-radius:10px}.pv-post-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.pv-post-list{display:grid;gap:8px;max-height:460px;overflow:auto}.pv-post-item{display:grid;grid-template-columns:minmax(200px,2fr) minmax(180px,1fr) auto;gap:12px;border-top:1px solid #eee;padding:8px 0;font-size:13px}.pv-post-item a{color:#164b35}.pv-post-item small{color:#666}@media(max-width:720px){.pv-post-item{grid-template-columns:1fr}.pv-post-item small{margin-top:-8px}}';document.head.appendChild(s)}
  function init(){styles();installCalendar();installIndexing();installPostReport()}
  let tries=0,t=setInterval(()=>{init();if(++tries>180)clearInterval(t)},100);window.addEventListener('pv-admin-runtime-ready',init);
})();
