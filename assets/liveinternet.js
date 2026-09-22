(function(){
  if ((location.pathname === '/' || /\/index\.html$/.test(location.pathname)) && !document.querySelector('script[data-home-dynamic]')) {
    const home = document.createElement('script');
    home.src = '/assets/home-dynamic.js?v=20260922';
    home.dataset.homeDynamic = '1';
    document.body.appendChild(home);
  }

  if (location.pathname === '/admin.html' || document.getElementById('licnt2C53')) return;

  const footer = document.querySelector('.site-footer');
  if (!footer) return;

  const wrap = document.createElement('div');
  wrap.className = 'liveinternet-counter';
  wrap.style.textAlign = 'center';
  wrap.style.padding = '12px 0 18px';

  const link = document.createElement('a');
  link.href = 'https://www.liveinternet.ru/click';
  link.target = '_blank';
  link.rel = 'noopener';

  const img = document.createElement('img');
  img.id = 'licnt2C53';
  img.width = 88;
  img.height = 31;
  img.style.border = '0';
  img.title = 'LiveInternet: показано число просмотров за 24 часа, посетителей за 24 часа и за сегодня';
  img.alt = '';
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAIBTAA7';

  link.appendChild(img);
  wrap.appendChild(link);
  footer.appendChild(wrap);

  const s = window.screen;
  img.src = 'https://counter.yadro.ru/hit?t14.6;r' + escape(document.referrer) +
    ((typeof(s) === 'undefined') ? '' : ';s' + s.width + '*' + s.height + '*' +
    (s.colorDepth ? s.colorDepth : s.pixelDepth)) + ';u' + escape(document.URL) +
    ';h' + escape(document.title.substring(0,150)) + ';' + Math.random();
})();
