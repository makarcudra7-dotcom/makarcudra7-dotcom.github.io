(()=>{
  const API_KEY='provkusPublishApi';
  const SERVER_API='https://makarcudra7-dotcom-github-io-unep.vercel.app';
  const STATIC_ORIGINS=new Set(['https://provkus-media.ru','https://www.provkus-media.ru']);
  const OWNER='makarcudra7-dotcom',REPO='makarcudra7-dotcom.github.io',BRANCH='main';
  const $=s=>document.querySelector(s);
  const clean=v=>String(v||'').replace(/\/$/,'');
  const adminHash=()=>localStorage.getItem('provkusAdminHash')||'';
  const githubToken=()=>sessionStorage.getItem('provkusGithubToken')||'';
  const githubReady=()=>!!githubToken();
  const savedApi=()=>{const saved=clean(localStorage.getItem(API_KEY));return !saved||STATIC_ORIGINS.has(saved)?SERVER_API:saved};
  const apiBase=()=>clean(savedApi());
  const useServer=()=>/^https:\/\//i.test(apiBase());
  let batchQueue=null;

  const staleSaved=clean(localStorage.getItem(API_KEY));
  if(STATIC_ORIGINS.has(staleSaved))localStorage.removeItem(API_KEY);

  function authError(){const e=new Error('Сервер публикации не принял пароль админки');e.code='SERVER_AUTH';return e}
  function revealGithubFallback(){
    const details=$('#legacyGithubAccess');if(details)details.open=true;
    const field=$('#githubToken')?.closest('.field');if(field)field.style.display='';
    const stat=$('#githubState');if(stat)stat.textContent=githubReady()?'GITHUB':'AUTH';
    const conn=$('#githubConn');if(conn){conn.classList.toggle('ok',githubReady());const span=conn.querySelector('span');if(span)span.textContent=githubReady()?'Резервный GitHub подключён':'Серверный пароль не совпадает — подключите резервный GitHub-доступ'}
  }
  function needGithub(){revealGithubFallback();throw new Error('Серверный пароль не совпадает. Откройте Настройки → «Резервный способ: GitHub-токен» и подключите GitHub-доступ один раз.')}

  async function requestAt(base,payload,hash){
    const sameOrigin=clean(location.origin)===clean(base);
    let r;
    try{r=await fetch(clean(base)+'/api/publish',{method:'POST',headers:{'Content-Type':'application/json','X-ProVkus-Admin':hash},body:JSON.stringify(payload),cache:'no-store',credentials:sameOrigin?'same-origin':'omit'})}
    catch(error){return {networkError:error}}
    let data={};try{data=await r.json()}catch(error){}
    return {r,data}
  }
  async function serverRequest(payload){
    const hash=adminHash();if(!hash)throw new Error('Сначала войдите в админку');
    const preferred=apiBase(),candidates=[preferred,SERVER_API].map(clean).filter((v,i,a)=>v&&a.indexOf(v)===i);
    let lastNetworkError=null;
    for(const base of candidates){
      const result=await requestAt(base,payload,hash);if(result.networkError){lastNetworkError=result.networkError;continue}
      const {r,data}=result;
      if(r.ok){if(base===SERVER_API&&preferred!==SERVER_API)localStorage.removeItem(API_KEY);return data}
      if(r.status===401)throw authError();
      if((r.status===404||r.status===405)&&base!==SERVER_API)continue;
      throw new Error(data.error||('Сервер публикации: '+r.status));
    }
    console.error('ProVkus publish server is unreachable',lastNetworkError||'');
    throw new Error('Не удалось связаться с сервером публикации. Обновите страницу и повторите попытку.')
  }

  async function githubRequest(path,opt={}){
    const token=githubToken();if(!token)needGithub();
    const r=await fetch('https://api.github.com'+path,{...opt,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',...(opt.headers||{})}});
    if(!r.ok){let m='GitHub '+r.status;try{m=(await r.json()).message||m}catch{}throw new Error(m)}
    return r.status===204?null:r.json();
  }
  const encPath=path=>path.split('/').map(encodeURIComponent).join('/');
  async function githubGet(path){try{return await githubRequest(`/repos/${OWNER}/${REPO}/contents/${encPath(path)}?ref=${encodeURIComponent(BRANCH)}`)}catch(e){if(/404|Not Found/i.test(e.message))return null;throw e}}
  function textB64(text){const bytes=new TextEncoder().encode(String(text));let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin)}
  async function githubPut(path,content,message,encoding='utf-8'){
    const old=await githubGet(path),body={message:String(message||'Publish from ProVkus CMS'),branch:BRANCH,content:encoding==='base64'?String(content):textB64(content)};
    if(old?.sha)body.sha=old.sha;
    return githubRequest(`/repos/${OWNER}/${REPO}/contents/${encPath(path)}`,{method:'PUT',body:JSON.stringify(body)});
  }
  async function githubDelete(path,message){
    const old=await githubGet(path);if(!old?.sha)return null;
    return githubRequest(`/repos/${OWNER}/${REPO}/contents/${encPath(path)}`,{method:'DELETE',body:JSON.stringify({message:String(message||'Delete from ProVkus CMS'),branch:BRANCH,sha:old.sha})});
  }
  async function withFallback(serverCall,githubCall){
    try{return await serverCall()}
    catch(e){
      if(e?.code!=='SERVER_AUTH')throw e;
      revealGithubFallback();
      if(!githubReady())needGithub();
      const result=await githubCall();
      if(typeof flash==='function')flash('Серверный пароль не совпадает — использован резервный GitHub-доступ');
      return result;
    }
  }

  window.getToken=function(){return githubToken()||(useServer()?'server':'')};
  window.sendNewsletterArticle=async slug=>{
    try{return (await serverRequest({action:'sendNewsletter',slug})).result}
    catch(e){if(e?.code==='SERVER_AUTH'){revealGithubFallback();throw new Error('Рассылка требует синхронизации серверного пароля PROVKUS_ADMIN_HASH')}throw e}
  };
  window.getFile=async function(path){
    if(!useServer())return githubGet(path);
    return withFallback(async()=>(await serverRequest({action:'get',path})).file,()=>githubGet(path));
  };
  window.putFile=async function(path,content,message,encoding='utf-8'){
    if(batchQueue){batchQueue.push({path,content,message,encoding});return {queued:true,path}}
    if(!useServer())return githubPut(path,content,message,encoding);
    return withFallback(async()=>(await serverRequest({action:'put',path,content,message,encoding})).result,()=>githubPut(path,content,message,encoding));
  };
  window.deleteFile=async function(path,message='Delete from ProVkus CMS'){
    if(!useServer())return githubDelete(path,message);
    return withFallback(async()=>(await serverRequest({action:'delete',path,message})).result,()=>githubDelete(path,message));
  };

  window.beginPublishBatch=function(){if(batchQueue)return false;batchQueue=[];return true};
  window.cancelPublishBatch=function(){batchQueue=null};
  window.commitPublishBatch=async function(message='Publish from ProVkus CMS'){
    if(!batchQueue)return null;
    const queued=batchQueue;batchQueue=null;if(!queued.length)return null;
    const byPath=new Map();queued.forEach(f=>byPath.set(f.path,f));
    const files=[...byPath.values()].map(({path,content,encoding})=>({path,content,encoding}));
    if(!useServer()){
      for(const f of files)await githubPut(f.path,f.content,message,f.encoding);
      return {fallback:'github',files:files.map(f=>f.path)};
    }
    return withFallback(
      async()=>(await serverRequest({action:'batchPut',files,message})).result,
      async()=>{for(const f of files)await githubPut(f.path,f.content,message,f.encoding);return {fallback:'github',files:files.map(f=>f.path)}}
    );
  };
  window.isPublishBatchActive=()=>Array.isArray(batchQueue);

  const loginText=$('.login-card p');if(loginText)loginText.textContent='Введите пароль редакции. Публикация работает через защищённый сервер; при несовпадении серверного пароля доступен резервный GitHub-режим.';
  const stat=$('#githubState');if(stat&&useServer())stat.textContent='SERVER';
  const statLabel=stat?.parentElement?.querySelector('span');if(statLabel)statLabel.textContent='Публикация';
  const token=$('#githubToken'),connect=$('#connectGithubBtn'),conn=$('#githubConn'),card=token?.closest('.card');
  if(card){
    const title=card.querySelector('.card-title');if(title)title.textContent='Публикация на сайт';
    const body=card.querySelector('.card-body');
    const panel=document.createElement('div');panel.id='serverPublishPanel';panel.innerHTML=`<div class="field"><label>Сервер публикации</label><div class="token-row"><input id="publishApiUrl" placeholder="${SERVER_API}"><button type="button" class="btn green" id="savePublishApi">Сохранить</button></div><div class="hint">Основной режим — защищённый сервер ProVkus. При ошибке авторизации CMS может использовать резервный GitHub-доступ.</div></div><div class="conn" id="serverConn"><i></i><span></span></div><details id="serverSetup"><summary>Технические настройки сервера</summary><div class="field" style="margin-top:12px"><label>PROVKUS_ADMIN_HASH</label><div class="token-row"><input id="serverAdminHash" readonly><button type="button" class="btn soft" id="copyAdminHash">Копировать</button></div><div class="hint">Этот хэш должен совпадать с переменной PROVKUS_ADMIN_HASH в Vercel.</div></div></details>`;
    body.insertBefore(panel,body.firstChild);
    const url=$('#publishApiUrl');url.value=apiBase();const hash=$('#serverAdminHash');if(hash)hash.value=adminHash();
    function paint(){const ok=useServer(),c=$('#serverConn');if(c){c.classList.toggle('ok',ok);c.querySelector('span').textContent=ok?'Сервер публикации подключён':'Сервер ещё не подключён'}if(stat)stat.textContent=githubReady()?'GITHUB':(ok?'SERVER':'—')}
    $('#savePublishApi').onclick=()=>{const v=clean(url.value);if(v&&!/^https:\/\//i.test(v)){flash?.('Нужен HTTPS-адрес сервера');return}if(v&&v!==SERVER_API&&!STATIC_ORIGINS.has(v))localStorage.setItem(API_KEY,v);else localStorage.removeItem(API_KEY);url.value=apiBase();paint();flash?.('Сервер публикации сохранён')};
    $('#copyAdminHash').onclick=async()=>{try{await navigator.clipboard.writeText(adminHash());flash?.('Хэш скопирован')}catch(e){hash?.select()}};
    if(token?.closest('.field')){const legacy=token.closest('.field'),details=document.createElement('details');details.id='legacyGithubAccess';const summary=document.createElement('summary');summary.textContent='Резервный способ: GitHub-токен';details.appendChild(summary);legacy.parentNode.insertBefore(details,legacy);details.appendChild(legacy);if(!githubReady())legacy.style.display=''}
    if(connect)connect.textContent='Подключить резервно';
    paint();
  }
  window.testPublishServer=async()=>serverRequest({action:'ping'});
})();
