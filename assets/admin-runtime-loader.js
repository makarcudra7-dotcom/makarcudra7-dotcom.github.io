(()=>{
  'use strict';
  if(window.__pvAdminRuntimeLoader)return;
  window.__pvAdminRuntimeLoader=true;

  const VERSION='20260925-schedule-fast5';
  const modules=[
    'admin-editor-extras.js',
    'admin-global-bridge.js',
    'admin-content-manager.js',
    'admin-scheduler.js',
    'admin-fast-publish.js',
    'admin-live-refresh.js'
  ];

  function existing(name){
    return [...document.scripts].find(s=>(s.getAttribute('src')||'').includes('/'+name)||(s.getAttribute('src')||'').includes('assets/'+name));
  }

  function load(name){
    return new Promise((resolve,reject)=>{
      const found=existing(name);
      if(found){
        if(found.dataset.pvLoaded==='1'||found.readyState==='complete')return resolve();
        found.addEventListener('load',resolve,{once:true});
        found.addEventListener('error',()=>reject(new Error('Не удалось загрузить '+name)),{once:true});
        setTimeout(resolve,300);
        return;
      }
      const s=document.createElement('script');
      s.src=`assets/${name}?v=${VERSION}`;
      s.async=false;
      s.onload=()=>{s.dataset.pvLoaded='1';resolve()};
      s.onerror=()=>reject(new Error('Не удалось загрузить '+name));
      document.body.appendChild(s);
    });
  }

  (async()=>{
    for(const name of modules){
      try{await load(name)}catch(e){console.error('[ProVkus CMS runtime]',e)}
    }
    window.dispatchEvent(new CustomEvent('pv-admin-runtime-ready'));
  })();
})();
