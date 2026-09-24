(()=>{
  if(window.__pvPublishRecoveryLoaded)return;
  window.__pvPublishRecoveryLoaded=true;
  const $=s=>document.querySelector(s);
  const show=msg=>{try{window.flash?.(msg)}catch(_){};console.log('[ProVkus publish]',msg)};
  const fail=err=>{const msg=err?.message||String(err||'Не удалось опубликовать материал');console.error('[ProVkus publish]',err);show('Ошибка публикации: '+msg)};

  function isFuture(){
    const value=$('#publishedAt')?.value;
    if(!value)return false;
    const t=new Date(value).getTime();
    return Number.isFinite(t)&&t>Date.now()+30000;
  }

  async function connectEnteredFallback(){
    if(sessionStorage.getItem('provkusGithubToken'))return;
    const field=$('#githubToken'),button=$('#connectGithubBtn');
    if(!field||!button||!String(field.value||'').trim())return;
    button.click();
    for(let i=0;i<50;i++){
      if(sessionStorage.getItem('provkusGithubToken'))return;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
  }

  function install(){
    const current=$('#publishBtn');
    if(!current||current.dataset.publishRecovery==='1')return false;
    const btn=current.cloneNode(true);
    btn.dataset.publishRecovery='1';
    btn.disabled=false;
    btn.textContent='Опубликовать сейчас';
    current.replaceWith(btn);

    btn.addEventListener('click',async e=>{
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if(window.__pvRecoveryPublishing)return;
      window.__pvRecoveryPublishing=true;
      let batched=false;
      const progress=$('#publishProgress');
      try{
        if(location.protocol!=='https:')throw new Error('Публикация доступна только через HTTPS');
        if(isFuture())throw new Error('Выбрано будущее время — нажмите «Запланировать» или поставьте текущее время');
        if(typeof window.publish!=='function')throw new Error('Основной модуль публикации не загрузился. Обновите страницу.');
        await connectEnteredFallback();
        if(typeof window.getToken==='function'&&!window.getToken())throw new Error('Сервер публикации не подключён');

        const material=typeof window.collect==='function'?window.collect():null;
        if(!material?.headline||!material?.slug||!material?.description)throw new Error('Заполните заголовок, slug и description');

        btn.disabled=true;
        btn.textContent='Публикация…';
        if(progress)progress.style.width='8%';
        show('Отправляю материал на сервер…');

        if(typeof window.beginPublishBatch==='function')batched=window.beginPublishBatch()===true;

        const ok=await window.publish();
        if(ok!==true){
          if(batched)window.cancelPublishBatch?.();
          throw new Error('Основной модуль не подтвердил публикацию');
        }

        if(batched&&typeof window.commitPublishBatch==='function'){
          if(progress)progress.style.width='82%';
          await window.commitPublishBatch(`Publish: ${material.headline||material.slug}`);
        }

        if(progress)progress.style.width='100%';
        show('Материал опубликован. Обновление сайта отправлено.');
        try{await window.loadPosts?.()}catch(_){}
        try{window.renderPosts?.()}catch(_){}
      }catch(err){
        if(batched)try{window.cancelPublishBatch?.()}catch(_){}
        fail(err);
      }finally{
        window.__pvRecoveryPublishing=false;
        btn.disabled=false;
        btn.textContent='Опубликовать сейчас';
      }
    },true);
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ready=typeof window.publish==='function'&&typeof window.collect==='function'&&typeof window.putFile==='function'&&$('#placementCard');
    if(ready&&install())clearInterval(timer);
    else if(tries>300){clearInterval(timer);install()}
  },50);
})();
