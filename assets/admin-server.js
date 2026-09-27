(()=>{
  'use strict';
  const API_KEY='provkusPublishApi';
  const $=s=>document.querySelector(s);
  const originalGetToken=typeof window.getToken==='function'?window.getToken:null;
  const originalGetFile=typeof window.getFile==='function'?window.getFile:null;
  const originalPutFile=typeof window.putFile==='function'?window.putFile:null;
  const originalDeleteFile=typeof window.deleteFile==='function'?window.deleteFile:null;
  const apiBase=()=>String(localStorage.getItem(API_KEY)||'').replace(/\/$/,'');
  const adminHash=()=>localStorage.getItem('provkusAdminHash')||'';
  const githubToken=()=>sessionStorage.getItem('provkusGithubToken')||'';
  let serverReady=false,batchQueue=null,lastServerMessage='';

  async function serverRequest(payload){
    const base=apiBase();if(!base)throw new Error('Серверный API не настроен');
    const hash=adminHash();
    if(!hash)throw new Error('Войдите в админку');
    const r=await fetch(base+'/api/publish',{
      method:'POST',cache:'no-store',
      headers:{'Content-Type':'application/json','X-ProVkus-Admin':hash},
      body:JSON.stringify(payload)
    });
    let data={};try{data=await r.json()}catch(e){}
    if(!r.ok){
      if(r.status===401)throw new Error('Сервер публикации требует настройку доступа');
      if(r.status===404||r.status===405)throw new Error('На указанном адресе нет API публикации');
      throw new Error(data.error||'Серверный режим временно недоступен');
    }
    return data;
  }

  function canGithubFallback(){return !!githubToken()&&typeof originalGetFile==='function'}
  function markServerFailed(error){serverReady=false;lastServerMessage=error?.message||'Серверный режим недоступен';paint(lastServerMessage)}

  window.getToken=function(){return serverReady?'server':(originalGetToken?originalGetToken():'')};
  window.getFile=async function(path){
    if(serverReady){try{return (await serverRequest({action:'get',path})).file}catch(e){console.warn('[ProVkus CMS] server get failed, falling back to GitHub',e);markServerFailed(e);if(canGithubFallback())return originalGetFile(path);throw e}}
    if(!originalGetFile)throw new Error('Подключите GitHub в настройках');
    return originalGetFile(path);
  };
  window.putFile=async function(path,content,message,encoding='utf-8'){
    if(serverReady){
      if(batchQueue){batchQueue.push({path,content,message,encoding});return {queued:true,path}}
      try{return (await serverRequest({action:'put',path,content,message,encoding})).result}catch(e){console.warn('[ProVkus CMS] server put failed, falling back to GitHub',e);markServerFailed(e);if(originalPutFile&&githubToken())return originalPutFile(path,content,message,encoding);throw e}
    }
    if(!originalPutFile)throw new Error('Подключите GitHub в настройках');
    return originalPutFile(path,content,message,encoding);
  };
  window.deleteFile=async function(path,message='Delete from ProVkus CMS'){
    if(serverReady){try{return (await serverRequest({action:'delete',path,message})).result}catch(e){console.warn('[ProVkus CMS] server delete failed, falling back to GitHub',e);markServerFailed(e);if(originalDeleteFile&&githubToken())return originalDeleteFile(path,message);throw e}}
    if(originalDeleteFile)return originalDeleteFile(path,message);
    throw new Error('Удаление требует подключения GitHub');
  };
  window.beginPublishBatch=function(){if(!serverReady||batchQueue)return false;batchQueue=[];return true};
  window.cancelPublishBatch=function(){batchQueue=null};
  window.commitPublishBatch=async function(message='Publish from ProVkus CMS'){
    if(!batchQueue)return null;
    const queued=batchQueue;batchQueue=null;if(!queued.length)return null;
    const byPath=new Map();queued.forEach(f=>byPath.set(f.path,f));
    const files=[...byPath.values()].map(({path,content,encoding})=>({path,content,encoding}));
    try{return (await serverRequest({action:'batchPut',files,message})).result}catch(e){console.warn('[ProVkus CMS] server batch failed, falling back to GitHub',e);markServerFailed(e);if(!(originalPutFile&&githubToken()))throw e;const results=[];for(const file of files)results.push(await originalPutFile(file.path,file.content,message,file.encoding));return {fallback:'github',files:files.map(x=>x.path),results}}
  };
  window.isPublishBatchActive=()=>Array.isArray(batchQueue);

  const loginText=$('.login-card p');if(loginText)loginText.textContent='Введите пароль редакции. Рабочая публикация выполняется через GitHub-доступ.';
  const stat=$('#githubState'),token=$('#githubToken'),connect=$('#connectGithubBtn'),conn=$('#githubConn');
  const statLabel=stat?.parentElement?.querySelector('span');if(statLabel)statLabel.textContent='Публикация';
  const card=token?.closest('.card');let serverConn=null,legacyDetails=null;

  function paint(message=''){
    const hasGithub=!!githubToken();lastServerMessage=message||lastServerMessage;
    if(stat)stat.textContent=serverReady?'SERVER':hasGithub?'GITHUB':'—';
    if(serverConn){serverConn.classList.toggle('ok',serverReady);const s=serverConn.querySelector('span');if(s)s.textContent=serverReady?'Дополнительный сервер публикации подключён':apiBase()?(lastServerMessage||'Серверный API не отвечает'):'Дополнительный сервер не настроен'}
    const legacy=token?.closest('.field');if(legacy)legacy.style.display='';
    if(connect)connect.textContent=hasGithub?'GitHub подключён':'Подключить GitHub';
    if(conn){conn.classList.toggle('ok',serverReady||hasGithub);const s=conn.querySelector('span');if(s)s.textContent=serverReady?'Публикация через сервер':hasGithub?'GitHub подключён — можно публиковать':'Подключите GitHub для публикации'}
    if(legacyDetails)legacyDetails.open=!hasGithub;
  }

  async function probe(){
    if(!apiBase()){serverReady=false;paint('');return false}
    if(!adminHash()){serverReady=false;paint('Войдите в админку');return false}
    try{await serverRequest({action:'ping'});serverReady=true;lastServerMessage='';paint();return true}catch(e){serverReady=false;paint(e.message);return false}
  }
  window.testPublishServer=probe;

  if(card&&!$('#serverPublishPanel')){
    const title=card.querySelector('.card-title');if(title)title.textContent='Публикация на сайт';
    const body=card.querySelector('.card-body'),panel=document.createElement('details');panel.id='serverPublishPanel';
    panel.innerHTML='<summary>Дополнительный сервер публикации (необязательно)</summary><div class="field" style="margin-top:10px"><label>URL API</label><div class="token-row"><input id="publishApiUrl" placeholder="https://api.example.com"><button type="button" class="btn" id="testPublishApi">Проверить</button></div><div class="hint">Оставьте пустым, если используете обычную публикацию через GitHub. Админка больше не отправляет запросы на /api/publish статического сайта.</div></div><div class="conn" id="serverConn"><i></i><span>Дополнительный сервер не настроен</span></div>';
    body.insertBefore(panel,body.firstChild);serverConn=$('#serverConn');
    const url=$('#publishApiUrl');url.value=apiBase();
    url.addEventListener('change',()=>{const v=url.value.trim().replace(/\/$/,'');if(v&&/^https:\/\//i.test(v))localStorage.setItem(API_KEY,v);else localStorage.removeItem(API_KEY);url.value=apiBase();void probe()});
    $('#testPublishApi').onclick=async()=>{if(!apiBase())return flash?.('URL серверного API не задан — используется GitHub');const ok=await probe();flash?.(ok?'Сервер публикации работает':'Серверный API недоступен; используйте GitHub')};
    if(token?.closest('.field')){
      const legacy=token.closest('.field');legacyDetails=document.createElement('details');legacyDetails.id='legacyGithubAccess';legacyDetails.open=true;
      const summary=document.createElement('summary');summary.textContent='Основной рабочий способ: GitHub-доступ';legacyDetails.appendChild(summary);legacy.parentNode.insertBefore(legacyDetails,legacy);legacyDetails.appendChild(legacy);
      const hint=document.createElement('div');hint.className='hint';hint.style.margin='8px 0 10px';hint.textContent='Введите fine-grained token GitHub с Contents: Read and write к репозиторию сайта. Токен хранится только до закрытия вкладки.';legacyDetails.insertBefore(hint,legacy);
    }
  }

  $('#loginForm')?.addEventListener('submit',()=>setTimeout(()=>{if(apiBase())void probe();else paint()},450));
  connect?.addEventListener('click',()=>setTimeout(()=>paint(lastServerMessage),700));
  window.addEventListener('storage',()=>paint(lastServerMessage));
  paint();if(apiBase())setTimeout(probe,600);
})();
