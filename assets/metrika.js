(() => {
  'use strict';
  const COUNTER_ID = 113040957;
  if (window.__pvMetrikaBootScheduled) return;
  window.__pvMetrikaBootScheduled = true;

  const goalQueue = [];
  window.pvGoal = (name, params={}) => {
    if (typeof window.ym === 'function' && window.__pvMetrikaLoaded) {
      try { window.ym(COUNTER_ID,'reachGoal',name,params); } catch (_) {}
      return;
    }
    goalQueue.push([name, params]);
  };

  const boot = () => {
    if (window.__pvMetrikaLoaded) return;
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
    if (window.__pvMetrikaLoaded || bootTimer) return;
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
      boot();
    }, {once:true, passive:true});
  });

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
