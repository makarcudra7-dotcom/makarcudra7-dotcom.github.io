(()=>{
  'use strict';
  if(window.__pvAdminActionsFixLoaded)return;
  window.__pvAdminActionsFixLoaded=true;
  const $=s=>document.querySelector(s);
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let scheduled=false;

  function postStore(){
    try{return typeof store!=='undefined'&&Array.isArray(store.posts)?store.posts:[]}catch(_){return[]}
  }
  function slugFromRow(row){
    const link=row.querySelector('a[href*="/articles/"]');
    if(!link)return'';
    try{return (new URL(link.href,location.href).pathname.split('/').pop()||'').replace(/\.html$/,'')}
    catch(_){return''}
  }
  function actionCell(row,head){
    let cell=row.querySelector('.cms-direct-actions');
    if(cell)return cell;
    const last=row.lastElementChild;
    const headCount=head?.children?.length||0;
    const lastLooksEmpty=last&&last.tagName==='TD'&&!last.querySelector('button,a,input,select')&&!String(last.textContent||'').trim();
    if(lastLooksEmpty&&row.children.length>=headCount){cell=last}
    else{cell=document.createElement('td');row.appendChild(cell)}
    cell.classList.add('row-actions','cms-direct-actions');
    return cell;
  }
  function ensureHeader(table){
    const head=table.querySelector('thead tr');if(!head)return null;
    if(!head.querySelector('[data-cms-direct-actions-th]')){
      const last=head.lastElementChild;
      const duplicateActions=[...head.children].filter(x=>String(x.textContent||'').trim().toLowerCase()==='действия');
      if(last&&String(last.textContent||'').trim().toLowerCase()==='действия'&&duplicateActions.length>=2){last.dataset.cmsDirectActionsTh='1'}
      else{const th=document.createElement('th');th.dataset.cmsDirectActionsTh='1';th.textContent='Действия';head.appendChild(th)}
    }
    return head;
  }
  function bindButton(button,type,slug){
    button.onclick=async e=>{
      e.preventDefault();e.stopPropagation();
      if(type==='edit'){
        const fn=window.openPublishedArticleForEdit||window.editPublishedPost;
        if(typeof fn==='function')return fn(slug,button);
        window.flash?.('Редактор ещё загружается. Повторите нажатие.');
        return;
      }
      if(button.dataset.busy==='1')return;
      button.dataset.busy='1';button.disabled=true;const old=button.textContent;button.textContent='Удаляю…';
      try{
        if(typeof window.deletePublishedPost!=='function')throw new Error('Модуль удаления ещё загружается');
        await window.deletePublishedPost(slug);
      }catch(err){window.flash?.(err?.message||'Не удалось удалить материал')}
      finally{button.dataset.busy='';button.disabled=false;button.textContent=old}
    };
  }
  function ensureActions(){
    scheduled=false;
    const table=$('#publications table'),body=$('#postsTable');if(!table||!body)return;
    const head=ensureHeader(table),posts=postStore();
    [...body.querySelectorAll('tr')].forEach(row=>{
      if(row.querySelector('td[colspan]'))return;
      const slug=slugFromRow(row);if(!slug)return;
      if(posts.length&&!posts.some(p=>p.slug===slug))return;
      const cell=actionCell(row,head);
      let edit=cell.querySelector('[data-cms-edit]');
      if(!edit){edit=document.createElement('button');edit.type='button';edit.className='btn soft';edit.dataset.cmsEdit=slug;edit.textContent='Редактировать';cell.appendChild(edit)}
      let del=cell.querySelector('[data-cms-delete]');
      if(!del){del=document.createElement('button');del.type='button';del.className='btn danger-btn';del.dataset.cmsDelete=slug;del.textContent='Удалить';cell.appendChild(del)}
      bindButton(edit,'edit',slug);bindButton(del,'delete',slug);
    });
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(ensureActions)}
  function install(){
    const body=$('#postsTable');if(!body)return false;
    ensureActions();
    const observer=new MutationObserver(schedule);observer.observe(body,{childList:true,subtree:true});
    document.addEventListener('click',e=>{if(e.target.closest?.('.nav-btn[data-target="publications"]'))setTimeout(ensureActions,0)},true);
    window.addEventListener('pageshow',ensureActions);
    return true;
  }

  const TOKEN_KEY='provkusGithubToken';
  const TOKEN_URL='https://github.com/settings/personal-access-tokens/new?name=ProVkus%20CMS&description=Reserve%20publish%20access%20for%20ProVkus%20CMS&target_name=makarcudra7-dotcom&expires_in=366&contents=write';
  async function validateGithubToken(token){
    const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'};
    const repo=await fetch('https://api.github.com/repos/makarcudra7-dotcom/makarcudra7-dotcom.github.io',{headers,cache:'no-store'});
    let data={};try{data=await repo.json()}catch(_){}
    if(repo.status===401)throw new Error('GitHub отклонил токен: он недействителен, истёк или был отозван. Создайте новый fine-grained token.');
    if(repo.status===403)throw new Error('GitHub принял токен, но запретил доступ. Проверьте Resource owner и разрешение Contents: Read and write.');
    if(repo.status===404)throw new Error('У токена нет доступа к репозиторию makarcudra7-dotcom.github.io. Выберите его в Repository access.');
    if(!repo.ok)throw new Error(data.message||('GitHub '+repo.status));
    const contents=await fetch('https://api.github.com/repos/makarcudra7-dotcom/makarcudra7-dotcom.github.io/contents/data/posts.json?ref=main',{headers,cache:'no-store'});
    if(contents.status===401)throw new Error('GitHub отклонил токен. Создайте новый fine-grained token.');
    if(contents.status===403||contents.status===404)throw new Error('Токен не имеет доступа к содержимому репозитория. Нужен Contents: Read and write.');
    if(!contents.ok)throw new Error('Не удалось проверить доступ токена к файлам: GitHub '+contents.status);
    return data;
  }
  function paintGithubConnection(ok,text){
    const conn=$('#githubConn');
    if(conn){conn.classList.toggle('ok',!!ok);const span=conn.querySelector('span');if(span)span.textContent=text}
    const stat=$('#githubState');if(stat&&ok)stat.textContent='GITHUB';
  }
  function ensureGithubReconnect(){
    const input=$('#githubToken'),button=$('#connectGithubBtn');if(!input||!button)return false;
    if(button.dataset.cmsTokenReconnect!=='1'){
      button.dataset.cmsTokenReconnect='1';
      button.textContent=sessionStorage.getItem(TOKEN_KEY)?'Переподключить резервно':'Подключить резервно';
      button.onclick=async e=>{
        e.preventDefault();e.stopPropagation();
        if(location.protocol!=='https:'){window.flash?.('GitHub можно подключать только по HTTPS');return}
        const token=String(input.value||'').trim();
        if(!token){window.flash?.('Вставьте новый GitHub-токен');return}
        const old=button.textContent;button.disabled=true;button.textContent='Проверяю…';
        sessionStorage.removeItem(TOKEN_KEY);
        paintGithubConnection(false,'Проверяю резервный GitHub-доступ…');
        try{
          await validateGithubToken(token);
          sessionStorage.setItem(TOKEN_KEY,token);
          input.value='';
          paintGithubConnection(true,'Резервный GitHub подключён');
          button.textContent='Переподключить резервно';
          window.flash?.('GitHub-токен принят. Резервная публикация подключена.');
        }catch(err){
          sessionStorage.removeItem(TOKEN_KEY);
          paintGithubConnection(false,'Резервный GitHub не подключён');
          button.textContent='Подключить резервно';
          window.flash?.(err?.message||'Не удалось подключить GitHub');
        }finally{button.disabled=false;if(button.textContent==='Проверяю…')button.textContent=old}
      };
    }
    const field=input.closest('.field');
    if(field&&!field.querySelector('#githubTokenHelp')){
      const help=document.createElement('div');help.id='githubTokenHelp';help.className='hint';help.style.marginTop='8px';
      help.innerHTML=`Если появляется <b>Bad credentials</b>, старый токен больше не работает. <a href="${TOKEN_URL}" target="_blank" rel="noopener">Создать новый fine-grained token ↗</a><br>На GitHub выберите: <b>Resource owner — makarcudra7-dotcom</b>; <b>Repository access — Only select repositories → makarcudra7-dotcom.github.io</b>; <b>Repository permissions → Contents — Read and write</b>. Токен сюда в чат не отправляйте.`;
      field.appendChild(help);
    }
    if(sessionStorage.getItem(TOKEN_KEY))paintGithubConnection(true,'Резервный GitHub подключён');
    return true;
  }

  let tries=0,timer=setInterval(()=>{tries++;const actionsReady=install();const tokenReady=ensureGithubReconnect();if(actionsReady&&tokenReady)clearInterval(timer);else if(tries>300)clearInterval(timer)},50);
  window.addEventListener('pageshow',()=>{ensureActions();ensureGithubReconnect()});
})();
