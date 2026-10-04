(() => {
  'use strict';
  const COUNTER_ID = 113040957;
  if (window.__pvMetrikaBootScheduled) return;
  window.__pvMetrikaBootScheduled = true;

  const CONSENT_KEY = 'provkus-analytics-consent-v1';
  const consent = () => { try { return localStorage.getItem(CONSENT_KEY); } catch (_) { return null; } };
  const allowed = () => consent() === 'yes';
  const isAdmin = location.pathname === '/admin.html';
  function showConsent(){
    if (isAdmin || document.getElementById('pvCookieBanner')) return;
    const style=document.createElement('style');
    style.textContent='#pvCookieBanner{position:fixed;z-index:2147483000;bottom:16px;left:16px;right:16px;max-width:650px;padding:18px;background:#fff;color:#202c24;border:1px solid #d8e1d8;border-radius:14px;box-shadow:0 10px 35px #0003;font:15px/1.5 system-ui,sans-serif}#pvCookieBanner strong{display:block;font-size:17px;margin-bottom:5px}#pvCookieBanner p{margin:0 0 12px}#pvCookieBanner a{color:#165c40;text-decoration:underline}#pvCookieBanner .pv-cookie-actions{display:flex;flex-wrap:wrap;gap:8px}#pvCookieBanner button{min-height:42px;padding:9px 15px;border:1px solid #165c40;border-radius:8px;background:#fff;color:#165c40;font:600 14px system-ui;cursor:pointer}#pvCookieBanner button:first-child{background:#165c40;color:#fff}@media(max-width:480px){#pvCookieBanner{bottom:8px;left:8px;right:8px;padding:14px}#pvCookieBanner button{flex:1}}';
    document.head.appendChild(style);
    const box=document.createElement('aside');box.id='pvCookieBanner';box.setAttribute('role','dialog');box.setAttribute('aria-label','Настройка аналитики');
    box.innerHTML='<strong>Помогите сделать ProVkus полезнее</strong><p>Если разрешите аналитику, мы увидим, какие рецепты и советы интересны читателям, и улучшим сайт. Для этого используются Яндекс Метрика и LiveInternet. <a href="/privacy.html#analytics">Как используются данные</a>.</p><div class="pv-cookie-actions"><button type="button" data-choice="yes">Разрешить аналитику</button><button type="button" data-choice="no">Продолжить без аналитики</button></div>';
    box.addEventListener('click',e=>{const choice=e.target.closest('[data-choice]')?.dataset.choice;if(!choice)return;try{localStorage.setItem(CONSENT_KEY,choice)}catch(_){ }box.remove();window.dispatchEvent(new CustomEvent('pv-analytics-consent',{detail:{allowed:choice==='yes'}}));if(choice==='yes')boot();else if(window.__pvMetrikaLoaded)location.reload()});
    document.body.appendChild(box);
  }
  function offerConsent(){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',offerConsent,{once:true});else if(consent()===null)showConsent()}
  window.pvCookieSettings=showConsent;
  window.__pvCookieAnalyticsAllowed=allowed;
  offerConsent();
  if(!isAdmin){
    const addFooterLinks=()=>{
      const footer=document.querySelector('.site-footer');
      if(!footer)return;
      if(!document.getElementById('pvCookieSettingsLink')){
        const link=document.createElement('a');link.id='pvCookieSettingsLink';link.href='#cookie-settings';link.textContent='Настройки аналитики';link.style.cssText='display:inline-block;margin:8px 12px;color:inherit;text-decoration:underline';link.addEventListener('click',e=>{e.preventDefault();showConsent()});footer.appendChild(link);
      }
      if(!document.getElementById('pvDzenFooterLink')){
        const dzen=document.createElement('a');dzen.id='pvDzenFooterLink';dzen.href='https://dzen.ru/provkusmedia?share_to=link';dzen.target='_blank';dzen.rel='noopener noreferrer';dzen.textContent='Мы в Дзене →';dzen.setAttribute('aria-label','ProVkus в Дзене');dzen.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:42px;margin:8px 12px;padding:10px 18px;border-radius:999px;background:#f05a2a;color:#fff;text-decoration:none;font:700 14px/1.2 system-ui,sans-serif;box-shadow:0 4px 16px #0002;transition:transform .15s ease,opacity .15s ease';dzen.addEventListener('mouseenter',()=>{dzen.style.transform='translateY(-1px)'});dzen.addEventListener('mouseleave',()=>{dzen.style.transform='none'});dzen.addEventListener('focus',()=>{dzen.style.outline='2px solid #fff';dzen.style.outlineOffset='2px'});dzen.addEventListener('blur',()=>{dzen.style.outline='none'});dzen.addEventListener('click',()=>{window.pvGoal?.('dzen_channel_click',{path:location.pathname})});footer.appendChild(dzen);
      }
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addFooterLinks,{once:true});else addFooterLinks();
  }

  const goalQueue = [];
  window.pvGoal = (name, params={}) => {
    if (typeof window.ym === 'function' && window.__pvMetrikaLoaded) {
      try { window.ym(COUNTER_ID,'reachGoal',name,params); } catch (_) {}
      return;
    }
    goalQueue.push([name, params]);
  };

  const boot = () => {
    if (window.__pvMetrikaLoaded || !allowed() || isAdmin) return;
    window.__pvMetrikaLoaded = true;

    (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for(let j=0;j<e.scripts.length;j++){if(e.scripts[j].src===r)return;}
      k=e.createElement(t);a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a);
    })(window,document,'script',`https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}`,'ym');

    window.ym(COUNTER_ID,'init',{
      clickmap:true,
      trackLinks:true,
      accurateTrackBounce:true,
      webvisor:true
    });

    while (goalQueue.length) {
      const [name, params] = goalQueue.shift();
      try { window.ym(COUNTER_ID,'reachGoal',name,params); } catch (_) {}
    }
  };

  let bootTimer = 0;
  const scheduleBoot = () => {
    if (window.__pvMetrikaLoaded || bootTimer || !allowed() || isAdmin) return;
    const run = () => {
      bootTimer = window.setTimeout(boot, 5000);
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(run, {timeout: 6000});
    } else {
      run();
    }
  };

  if (document.readyState === 'complete') scheduleBoot();
  else window.addEventListener('load', scheduleBoot, {once:true});

  ['pointerdown','keydown','touchstart'].forEach(type => {
    window.addEventListener(type, () => {
      if (bootTimer) {
        clearTimeout(bootTimer);
        bootTimer = 0;
      }
      if (allowed()) boot();
    }, {once:true, passive:true});
  });

  if (allowed()) scheduleBoot();
  window.addEventListener('pv-analytics-consent', e => { if(e.detail?.allowed) scheduleBoot(); });

  const text = el => (el?.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
  const closestAction = target => target?.closest?.('button,a,input[type="submit"],input[type="button"],[role="button"]');

  document.addEventListener('click', event => {
    const el = closestAction(event.target);
    if (!el) return;
    const t = text(el);
    const href = el.getAttribute?.('href') || '';

    if (/калори|кбжу|бжу/.test(t) || /calorie|kbju|nutrition/.test(href)) {
      window.pvGoal('tool_kbju_open',{path:location.pathname});
    }
    if (/сколько хран|хранени/.test(t) || /storage|hran/.test(href)) {
      window.pvGoal('tool_storage_open',{path:location.pathname});
    }
    if (/что приготовить|подобрать рецепт|найти рецепт/.test(t) || /what-to-cook|recipe-finder/.test(href)) {
      window.pvGoal('tool_recipe_finder_open',{path:location.pathname});
    }
    if (el.matches?.('[data-recipe-result], .pv-recipe-result a, .recipe-result a') || (href.includes('/articles/') && el.closest?.('[data-recipe-results],.pv-recipe-results,.recipe-results'))) {
      window.pvGoal('recipe_finder_to_recipe',{path:location.pathname,href});
    }
  }, {passive:true});

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const hay = `${form.id||''} ${form.className||''} ${text(form)}`.toLowerCase();
    if (/калори|кбжу|nutrition|calorie/.test(hay)) window.pvGoal('tool_kbju_calculate',{path:location.pathname});
    if (/хран|storage/.test(hay)) window.pvGoal('tool_storage_search',{path:location.pathname});
    if (/приготов|recipe|ingredient/.test(hay)) window.pvGoal('tool_recipe_finder_search',{path:location.pathname});
  });
})();