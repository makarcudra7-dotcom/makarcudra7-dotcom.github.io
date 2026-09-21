(function(){
  const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  const share=document.querySelector('[data-share]');
  if(share){share.addEventListener('click',async()=>{try{if(navigator.share){await navigator.share({title:document.title,url:location.href});}else{await navigator.clipboard.writeText(location.href);share.textContent='Ссылка скопирована';}}catch(e){}})}
  document.querySelectorAll('a[href="admin.html"]').forEach(a=>{a.href='editorial.html';a.textContent='Редакция';});
  document.querySelectorAll('.footer-bottom span').forEach(el=>{if(el.textContent.includes('Сетевое издание'))el.textContent='Информационный сайт ProVkus. Регистрация СМИ не заявлена.';});
})();
