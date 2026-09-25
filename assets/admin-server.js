(()=>{
  'use strict';
  const API_KEY='provkusPublishApi';
  const $=s=>document.querySelector(s);
  const originalGetToken=typeof window.getToken==='function'?window.getToken:null;
  const originalGetFile=typeof window.getFile==='function'?window.getFile:null;
  const originalPutFile=typeof window.putFile==='function'?window.putFile:null;
  const originalDeleteFile=typeof window.deleteFile==='function'?window.deleteFile:null;
  const apiBase=()=>String(localStorage.getItem(API_KEY)||location.origin).replace(/\/$/,'');
  const adminHash=()=>localStorage.getItem('provkusAdminHash')||'';
  const githubToken=()=>sessionStorage.getItem('provkusGithubToken')||'';
  let serverReady=false,batchQueue=null,lastServerMessage='';

  async function serverRequest(payload){
    const hash=adminHash();
    if(!hash)throw new Error('Войдите в админку');
    const r=await fetch(apiBase()+'/api/publish',{
      method:'POST',cache:'no-store',
      headers:{'Content-Type':'application/json','X-ProVkus-Admin':hash},
      body:JSON.stringify(payload)
    });
    let data={};try{data=await r.json()}catch(e){}
    if(!r.ok){
      if(r.status===401)throw new Error('Сервер публикации требует настройку доступа');
      if(r.status===404||r.status===405)throw new Error('Серверный режим временно недоступен');
      throw new Error(data.error||'Серверный режим временно недоступен');
    }
    return data;
  }

  window.getToken=function(){return serverReady?'server':(originalGetToken?originalGetToken():'')};
  window.getFile=async function(path){
    if(!serverReady){if(!originalGetFile)throw new Error('Подключите GitHub в настройках');return originalGetFile(path)}
    return (await serverRequest({action:'get',path})).file;
  };
  window.putFile=async function(path,content,message,encoding='utf-8'){
    if(!serverReady){if(!originalPutFile)throw new Error('Подключите GitHub в настройках');return originalPutFile(path,content,message,encoding)}
    if(batchQueue){batchQueue.push({path,content,message,encoding});return {queued:true,path}}
    return (await serverRequest({action:'put',path,content,message,encoding})).result;
  };
  window.deleteFile=async function(path,message='Delete from ProVkus CMS'){
    if(serverReady)return (await serverRequest({action:'delete',path,message})).result;
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
    return (await serverRequest({action:'batchPut',files,message})).result;
  };
  window.isPublishBatchActive=()=>Array.isArray(batchQueue);

  const loginText=$('.login-card p');
  if(loginText)loginText.textContent='Введите пароль редакции. Публикация работает через сервер или через GitHub-доступ.';
  const stat=$('#githubState'), token=$('#githubToken'), connect=$('#connectGithubBtn'), conn=$('#githubConn');
  const statLabel=stat?.parentElement?.querySelector('span');if(statLabel)statLabel.textContent='Публикация';
  const card=token?.closest('.card');
  let serverConn=null,legacyDetails=null;

  function paint(message=''){
    const hasGithub=!!githubToken();
    lastServerMessage=message||lastServerMessage;
    if(stat)stat.textContent=serverReady?'SERVER':hasGithub?'GITHUB':'—';
    if(serverConn){
      serverConn.classList.toggle('ok',serverReady||hasGithub);
      const s=serverConn.querySelector('span');
      if(s)s.textContent=serverReady?'Сервер публикации подключён':hasGithub?'Рабочий режим: GitHub подключён':(lastServerMessage||'Серверный режим недоступен — подключите GitHub ниже');
    }
    const legacy=token?.closest('.field');if(legacy)legacy.style.display=serverReady?'none':'';
    if(connect)connect.textContent=hasGithub?'GitHub подключён':'Подключить GitHub';
    if(conn){
      conn.classList.toggle('ok',serverReady||hasGithub);
      const s=conn.querySelector('span');
      if(s)s.textContent=serverReady?'Публикация через сервер':hasGithub?'GitHub подключён — можно публиковать':'Не подключено';
    }
    if(!serverReady&&legacyDetails)legacyDetails.open=true;
  }

  async function probe(){
    if(!adminHash()){serverReady=false;paint('Войдите в админку');return false}
    try{await serverRequest({action:'ping'});serverReady=true;lastServerMessage='';paint();return true}
    catch(e){serverReady=false;paint(e.message);return false}
  }
  window.testPublishServer=probe;

  if(card&&!$('#serverPublishPanel')){
    const title=card.querySelector('.card-title');if(title)title.textContent='Публикация на сайт';
    const body=card.querySelector('.card-body'),panel=document.createElement('div');panel.id='serverPublishPanel';
    panel.innerHTML=`<div class="field"><label>Сервер публикации</label><div class="token-row"><input id="publishApiUrl" placeholder="https://provkus-media.ru"><button type="button" class="btn green" id="testPublishApi">Проверить</button></div><div class="hint">Если серверный режим недоступен, админка автоматически использует GitHub-доступ ниже.</div></div><div class="conn" id="serverConn"><i></i><span>Проверка…</span></div>`;
    body.insertBefore(panel,body.firstChild);serverConn=$('#serverConn');
    const url=$('#publishApiUrl');url.value=apiBase();
    url.addEventListener('change',()=>{const v=url.value.trim().replace(/\/$/,'');if(v&&/^https:\/\//i.test(v))localStorage.setItem(API_KEY,v);else localStorage.removeItem(API_KEY);url.value=apiBase();probe()});
    $('#testPublishApi').onclick=async()=>{const ok=await probe();if(typeof flash==='function')flash(ok?'Сервер публикации работает':'Используйте GitHub-доступ ниже')};
    if(token?.closest('.field')){
      const legacy=token.closest('.field');legacyDetails=document.createElement('details');legacyDetails.id='legacyGithubAccess';
      const summary=document.createElement('summary');summary.textContent='Рабочий способ: GitHub-доступ';
      legacyDetails.appendChild(summary);legacy.parentNode.insertBefore(legacyDetails,legacy);legacyDetails.appendChild(legacy);
      const hint=document.createElement('div');hint.className='hint';hint.style.margin='8px 0 10px';hint.textContent='Введите fine-grained token GitHub с доступом Contents: Read and write к репозиторию сайта. Токен хранится только до закрытия вкладки.';legacyDetails.insertBefore(hint,legacy);
    }
  }

  $('#loginForm')?.addEventListener('submit',()=>setTimeout(probe,450));
  connect?.addEventListener('click',()=>setTimeout(()=>paint(lastServerMessage),700));
  window.addEventListener('storage',()=>paint(lastServerMessage));
  paint();setTimeout(probe,600);
})();
