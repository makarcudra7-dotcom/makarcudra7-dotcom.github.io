(()=>{
  const API_KEY='provkusPublishApi';
  const LEGACY_API='https://makarcudra7-dotcom-github-io-unep.vercel.app';
  const DEFAULT_API=location.origin;
  const $=s=>document.querySelector(s);
  const originalGetToken=typeof getToken==='function'?getToken:null;
  const originalGetFile=typeof getFile==='function'?getFile:null;
  const originalPutFile=typeof putFile==='function'?putFile:null;
  const originalDeleteFile=typeof deleteFile==='function'?deleteFile:null;
  const savedApi=()=>{const saved=String(localStorage.getItem(API_KEY)||'').replace(/\/$/,'');if(!saved||saved===LEGACY_API)return DEFAULT_API;return saved};
  const apiBase=()=>savedApi().replace(/\/$/,'');
  const adminHash=()=>localStorage.getItem('provkusAdminHash')||'';
  const useServer=()=>/^https:\/\//i.test(apiBase());
  let batchQueue=null;

  if(localStorage.getItem(API_KEY)===LEGACY_API)localStorage.removeItem(API_KEY);

  async function serverRequest(payload){
    const base=apiBase();
    if(!base)throw new Error('Сервер публикации ещё не подключён');
    const hash=adminHash();
    if(!hash)throw new Error('Сначала войдите в админку');
    let r;
    try{
      r=await fetch(base+'/api/publish',{
        method:'POST',
        headers:{'Content-Type':'application/json','X-ProVkus-Admin':hash},
        body:JSON.stringify(payload),
        cache:'no-store',
        credentials:'same-origin'
      });
    }catch(e){
      throw new Error('Не удалось связаться с сервером публикации. Обновите страницу и повторите попытку.');
    }
    let data={};try{data=await r.json()}catch(e){}
    if(!r.ok){
      if(r.status===401)throw new Error('Сервер публикации не принял пароль админки');
      throw new Error(data.error||('Сервер публикации: '+r.status));
    }
    return data;
  }

  window.getToken=function(){return useServer()?'server':(originalGetToken?originalGetToken():'')};
  window.sendNewsletterArticle=async slug=>{
    if(!useServer())throw new Error('Для рассылки нужен сервер публикации');
    return (await serverRequest({action:'sendNewsletter',slug})).result;
  };
  window.getFile=async function(path){if(!useServer())return originalGetFile(path);return (await serverRequest({action:'get',path})).file};
  window.putFile=async function(path,content,message,encoding='utf-8'){
    if(!useServer())return originalPutFile(path,content,message,encoding);
    if(batchQueue){batchQueue.push({path,content,message,encoding});return {queued:true,path}}
    return (await serverRequest({action:'put',path,content,message,encoding})).result
  };
  window.deleteFile=async function(path,message='Delete from ProVkus CMS'){
    if(useServer())return (await serverRequest({action:'delete',path,message})).result;
    if(originalDeleteFile)return originalDeleteFile(path,message);
    const old=await originalGetFile(path);if(!old?.sha)return null;
    if(typeof gh!=='function')throw new Error('Удаление требует подключённый сервер публикации');
    return gh(`/repos/makarcudra7-dotcom/makarcudra7-dotcom.github.io/contents/${path}`,{method:'DELETE',body:JSON.stringify({message,branch:'main',sha:old.sha})})
  };

  window.beginPublishBatch=function(){if(!useServer()||batchQueue)return false;batchQueue=[];return true};
  window.cancelPublishBatch=function(){batchQueue=null};
  window.commitPublishBatch=async function(message='Publish from ProVkus CMS'){
    if(!batchQueue)return null;
    const queued=batchQueue;batchQueue=null;
    if(!queued.length)return null;
    const byPath=new Map();queued.forEach(f=>byPath.set(f.path,f));
    const files=[...byPath.values()].map(({path,content,encoding})=>({path,content,encoding}));
    return (await serverRequest({action:'batchPut',files,message})).result
  };
  window.isPublishBatchActive=()=>Array.isArray(batchQueue);

  const loginText=$('.login-card p');
  if(loginText)loginText.textContent='Введите пароль редакции. Публикация работает через защищённый сервер без GitHub-токена в браузере.';
  const stat=$('#githubState');if(stat&&useServer())stat.textContent='SERVER';
  const statLabel=stat?.parentElement?.querySelector('span');if(statLabel)statLabel.textContent='Публикация';

  const token=$('#githubToken'),connect=$('#connectGithubBtn'),conn=$('#githubConn');
  const card=token?.closest('.card');
  if(card){
    const title=card.querySelector('.card-title');if(title)title.textContent='Публикация на сайт';
    const body=card.querySelector('.card-body');
    const panel=document.createElement('div');panel.id='serverPublishPanel';panel.innerHTML=`
      <div class="field"><label>Сервер публикации</label><div class="token-row"><input id="publishApiUrl" placeholder="https://provkus-media.ru"><button type="button" class="btn green" id="savePublishApi">Сохранить</button></div><div class="hint">По умолчанию используется сервер публикации на текущем домене ProVkus.</div></div>
      <div class="conn" id="serverConn"><i></i><span></span></div>
      <details id="serverSetup"><summary>Технические настройки сервера</summary><div class="field" style="margin-top:12px"><label>PROVKUS_ADMIN_HASH</label><div class="token-row"><input id="serverAdminHash" readonly><button type="button" class="btn soft" id="copyAdminHash">Копировать</button></div><div class="hint">Этот хэш добавляется в защищённые переменные Vercel. Это не GitHub-токен.</div></div></details>`;
    body.insertBefore(panel,body.firstChild);
    const url=$('#publishApiUrl');url.value=apiBase();
    const hash=$('#serverAdminHash');if(hash)hash.value=adminHash();
    function paint(){const ok=useServer(),c=$('#serverConn');if(c){c.classList.toggle('ok',ok);c.querySelector('span').textContent=ok?'Сервер публикации готов · быстрый пакетный режим':'Сервер ещё не подключён'}if(stat)stat.textContent=ok?'SERVER':'—';const legacy=token?.closest('.field');if(legacy)legacy.style.display=ok?'none':'';}
    $('#savePublishApi').onclick=()=>{const v=url.value.trim().replace(/\/$/,'');if(v&&!/^https:\/\//i.test(v)){flash?.('Нужен HTTPS-адрес сервера');return}if(v&&v!==DEFAULT_API)localStorage.setItem(API_KEY,v);else localStorage.removeItem(API_KEY);url.value=apiBase();paint();flash?.('Сервер публикации сохранён')};
    $('#copyAdminHash').onclick=async()=>{try{await navigator.clipboard.writeText(adminHash());flash?.('Хэш скопирован')}catch(e){hash?.select()}};
    paint();
    if(token?.closest('.field')){
      const legacy=token.closest('.field');
      const details=document.createElement('details');details.id='legacyGithubAccess';const summary=document.createElement('summary');summary.textContent='Резервный способ: GitHub-токен';details.appendChild(summary);legacy.parentNode.insertBefore(details,legacy);details.appendChild(legacy);
    }
    if(connect)connect.textContent='Подключить резервно';
    if(conn&&useServer()){conn.classList.add('ok');conn.querySelector('span').textContent='Публикация через сервер'}
  }

  window.testPublishServer=async()=>serverRequest({action:'ping'});
})();
