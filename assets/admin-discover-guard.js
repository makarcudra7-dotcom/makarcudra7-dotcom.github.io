(()=>{
  'use strict';
  const image=document.getElementById('image');
  const file=document.getElementById('imageFile');
  const publish=document.getElementById('publishBtn');
  if(!image||!publish)return;
  let remoteWidth=0, remoteState='idle', timer=null;
  const hint=document.createElement('div');hint.className='hint';hint.id='remoteImageDiscoverState';image.insertAdjacentElement('afterend',hint);
  function paint(text,ok=false){hint.textContent=text||'';hint.style.fontWeight=text?'700':'';hint.style.color=ok?'#176b4a':''}
  function checkRemote(){
    const url=image.value.trim();remoteWidth=0;remoteState='idle';
    if(!url){paint('');return}
    if(file?.files?.length){paint('Будет проверяться загружаемый файл.',true);return}
    if(!/^https?:\/\//i.test(url)){paint('Укажите полный HTTPS-адрес изображения.');return}
    remoteState='loading';paint('Проверяю размер изображения…');
    const im=new Image();
    im.onload=()=>{remoteWidth=im.naturalWidth||0;remoteState='done';if(remoteWidth>=1200)paint(`Обложка ${remoteWidth}px — подходит для Discover.`,true);else paint(`Обложка ${remoteWidth}px — нужна ширина минимум 1200px.`)};
    im.onerror=()=>{remoteState='error';paint('Не удалось проверить размер по URL. Убедитесь, что изображение открывается публично.')};
    im.src=url+(url.includes('?')?'&':'?')+'pv-dim-check='+Date.now();
  }
  image.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(checkRemote,450)});
  image.addEventListener('change',checkRemote);file?.addEventListener('change',()=>setTimeout(checkRemote,50));
  publish.addEventListener('click',e=>{
    if(file?.files?.length)return;
    const url=image.value.trim();
    if(!url)return;
    if(remoteState==='loading'){e.preventDefault();e.stopImmediatePropagation();if(typeof flash==='function')flash('Подождите окончания проверки обложки');return}
    if(remoteWidth>0&&remoteWidth<1200){e.preventDefault();e.stopImmediatePropagation();if(typeof flash==='function')flash('Обложка должна быть шириной минимум 1200 px для Discover')}
  },true);
  checkRemote();
})();
