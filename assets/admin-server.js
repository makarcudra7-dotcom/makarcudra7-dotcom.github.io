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
  let serverReady=false,batchQueue=null;

  async function serverRequest(payload){
    const hash=adminHash();
    if(!hash)throw new Error('Сначала войдите в админку');
    const r=await fetch(apiBase()+'/api/publish',{
      method:'POST',cache:'no-store',
      headers:{'Content-Type':'application/json','X-ProVkus-Admin':hash},
      body:JSON.stringify(payload)
    });
    let data={};try{data=await r.json()}catch(e){}
    if(!r.ok){
      if(r.status===401)throw new Error('Сервер публикации не принял пароль админки');
      if(r.status===404)throw new Error('Сервер публикации не найден');
      throw new Error(data.error||('Сервер публикации: '+r.status));
    }
    return data;
  }

  window.getToken=function(){return serverReady?'server':(originalGetToken?originalGetToken():'')};
  window.getFile=async function(path){
    if(!serverReady){if(!originalGetFile)throw new Error('Сервер публикации не подключён');return originalGetFile(path)}
    return (await serverRequest({action:'get',path})).file;
  };
  window.putFile=async function(path,content,message,encoding='utf-8'){
    if(!serverReady){if(!originalPutFile)throw new Error('Сервер публикации не подключён');return originalPutFile(path,content,message,encoding)}
    if(batchQueue){batchQueue.push({path,content,message,encoding});return {queued:true,path}}
    return (await serverRequest({action:'put',path,content,message,encoding})).result;
  };
  window.deleteFile=async function(path,message='Delete from ProVkus CMS'){
    if(serverReady)return (await serverRequest({action:'delete',path,message})).result;
    if(originalDeleteFile)return originalDeleteFile(path,message);
    throw new Error('Удаление требует подключённый сервер публикации');
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
  if(loginText)loginText.textContent='Введите пароль редакции. Публикация работает через защищённый сервер; GitHub-токен нужен только как резерв.';
  const stat=$('#githubState'), token=$('#githubToken'), connect=$('#connectGithubBtn'), conn=$('#githubConn');
  const statLabel=stat?.parentElement?.querySelector('span');if(statLabel)statLabel.textContent='Публикация';
  const card=token?.closest('.card');
  let serverConn=null;
  function paint(message=''){
    if(stat)stat.textContent=serverReady?'SERVER':'—';
    if(serverConn){serverConn.classList.toggle('ok',serverReady);const s=serverConn.querySelector('span');if(s)s.textContent=serverReady?'Сервер публикации подключён':(message||'Сервер публикации не подключён')}
    const legacy=token?.closest('.field');if(legacy)legacy.style.display=serverReady?'none':'';
    if(connect)connect.textContent=serverReady?'Резервный GitHub-доступ':'Подключить GitHub резервно';
    if(conn&&serverReady){conn.classList.add('ok');const s=conn.querySelector('span');if(s)s.textContent='Публикация через сервер'}
  }
  async function probe(){
    if(!adminHash()){serverReady=false;paint('Войдите в админку');return false}
    try{await serverRequest({action:'ping'});serverReady=true;paint();return true}
    catch(e){serverReady=false;paint(e.message);return false}
  }
  window.testPublishServer=probe;

  if(card&&!$('#serverPublishPanel')){
    const title=card.querySelector('.card-title');if(title)title.textContent='Публикация на сайт';
    const body=card.querySelector('.card-body'),panel=document.createElement('div');panel.id='serverPublishPanel';
    panel.innerHTML=`<div class="field"><label>Сервер публикации</label><div class="token-row"><input id="publishApiUrl" placeholder="https://provkus-media.ru"><button type="button" class="btn green" id="testPublishApi">Проверить</button></div><div class="hint">Обычно используется текущий адрес сайта. GitHub-токен в браузере не хранится.</div></div><div class="conn" id="serverConn"><i></i><span>Проверка…</span></div>`;
    body.insertBefore(panel,body.firstChild);serverConn=$('#serverConn');
    const url=$('#publishApiUrl');url.value=apiBase();
    url.addEventListener('change',()=>{const v=url.value.trim().replace(/\/$/,'');if(v&&/^https:\/\//i.test(v))localStorage.setItem(API_KEY,v);else localStorage.removeItem(API_KEY);url.value=apiBase();probe()});
    $('#testPublishApi').onclick=async()=>{const ok=await probe();if(typeof flash==='function')flash(ok?'Сервер публикации работает':'Сервер публикации пока недоступен')};
    if(token?.closest('.field')){const legacy=token.closest('.field'),details=document.createElement('details');details.id='legacyGithubAccess';const summary=document.createElement('summary');summary.textContent='Резервный способ: GitHub-токен';details.appendChild(summary);legacy.parentNode.insertBefore(details,legacy);details.appendChild(legacy)}
  }
  $('#loginForm')?.addEventListener('submit',()=>setTimeout(probe,450));
  paint();setTimeout(probe,600);
})();
