(()=>{
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const profiles={
    'author-ilya.html':{
      name:'Илья Титюлькин', role:'Редактор направления «Продукты и выбор»', short:'Продукты, выбор и сезонная кухня',
      intro:'Разбирает продукты так, как это полезно покупателю: что искать на этикетке, на какие даты и признаки свежести смотреть, как хранить покупку дома и когда маркетинговое обещание действительно что-то значит.',
      focus:['Маркировка и состав без рекламного шума','Практические признаки свежести и качества','Сезонность, хранение и разумный выбор'],
      approach:'В материалах Илья старается давать читателю понятный алгоритм: что проверить в магазине, что сделать дома и на какие признаки не стоит тратить внимание.',
      ask:'Можно спросить о выборе конкретного продукта, маркировке, хранении или теме, которую стоит разобрать в следующем материале.'
    },
    'author-elvira.html':{
      name:'Эльвира Шайберт', role:'Редактор направления «Дом и хранение»', short:'Дом, хранение и практичная кухня',
      intro:'Пишет о повседневной кухне и хранении без лишней теории: как организовать холодильник, что можно замораживать, почему продукты портятся раньше срока и как готовить так, чтобы результат можно было повторить дома.',
      focus:['Холодильник, морозилка и сроки хранения','Организация кухни и экономия продуктов','Понятные домашние рецепты и технологии'],
      approach:'Эльвира разбирает бытовую ситуацию по шагам: что происходит с продуктом, где чаще ошибаются и какой способ проще всего использовать в обычной квартире.',
      ask:'Можно прислать вопрос о хранении, заморозке, кухонной организации или домашнем рецепте — редакция передаст его Эльвире.'
    },
    'author-ekaterina.html':{
      name:'Екатерина Рукопляс', role:'Редактор направления «Еда и безопасность»', short:'Безопасность еды и домашняя кухня',
      intro:'Разбирает ситуации, где бытовая привычка может влиять на качество и безопасность еды: размораживание, мытьё, хранение после вскрытия, температура, чистота кухни и работа с готовыми блюдами.',
      focus:['Безопасное хранение и приготовление','Гигиена кухни и работа с продуктами','Разбор мифов и спорных бытовых советов'],
      approach:'В справочных материалах Екатерина отделяет привычные советы от проверяемых рекомендаций и объясняет, что действительно важно в домашней кухне, а что часто переоценивают.',
      ask:'Можно задать вопрос о безопасности продуктов, хранении, приготовлении или предложить бытовую ситуацию для отдельного разбора.'
    }
  };
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const profile=profiles[page];

  function subscribeBox(compact=false){return `<section class="pv-subscribe ${compact?'is-compact':''}" aria-labelledby="pvSubscribeTitle">
    <div class="pv-subscribe-copy"><div class="pv-mini-kicker">Новые материалы ProVkus</div><h2 id="pvSubscribeTitle">Получать свежие статьи на почту</h2><p>Только новые материалы сайта. Адрес используется для подписки отдельно от вопросов авторам; отказаться можно через ссылку в письме.</p></div>
    <form class="pv-subscribe-form" action="https://api.follow.it/subscribe" method="post" target="_blank">
      <label class="sr-only" for="pvSubscribeEmail${compact?'Compact':''}">E-mail</label><input id="pvSubscribeEmail${compact?'Compact':''}" type="email" name="email" autocomplete="email" placeholder="you@example.com" required>
      <button type="submit">Подписаться</button><label class="pv-consent"><input type="checkbox" required> <span>Согласен на обработку e-mail для подписки. <a href="/privacy.html">Подробнее</a></span></label>
    </form></section>`}

  function questionBox(p){return `<section class="pv-author-contact" id="ask-author"><div class="pv-contact-head"><div><div class="pv-mini-kicker">Связь с редакцией</div><h2>Задать вопрос автору</h2><p>${esc(p.ask)}</p></div><span class="pv-mail-note">Ответ придёт на указанный e-mail, если редакция возьмёт вопрос в работу.</span></div>
    <form class="pv-question-form" action="https://formsubmit.co/makarcudra7@gmail.com" method="POST">
      <input type="hidden" name="_subject" value="Вопрос автору ProVkus — ${esc(p.name)}"><input type="hidden" name="_template" value="table"><input type="hidden" name="_next" value="https://provkus-media.ru/thanks.html?type=question"><input type="text" name="_honey" class="pv-honey" tabindex="-1" autocomplete="off">
      <input type="hidden" name="Автор" value="${esc(p.name)}"><div class="pv-form-grid"><label>Ваше имя<input name="Имя" autocomplete="name" maxlength="80" required placeholder="Как к вам обращаться"></label><label>E-mail для ответа<input type="email" name="email" autocomplete="email" required placeholder="you@example.com"></label></div>
      <label>Ваш вопрос<textarea name="Вопрос" rows="5" minlength="10" maxlength="2000" required placeholder="Опишите вопрос — чем конкретнее, тем проще редакции помочь"></textarea></label>
      <label class="pv-consent"><input type="checkbox" name="Согласие" value="да" required> <span>Согласен на обработку имени, e-mail и текста обращения для ответа на вопрос. Это <strong>не подписывает</strong> меня на рассылку. <a href="/privacy.html">Политика конфиденциальности</a></span></label>
      <button class="pv-send" type="submit">Отправить вопрос ${esc(p.name.split(' ')[0])}</button>
    </form></section>`}
  }

  function enhanceProfile(){
    if(!profile)return;
    const hero=$('.author-hero');if(!hero)return;
    const text=hero.querySelector('div:not(.eyebrow)')||hero.lastElementChild;
    if(text){const old=[...text.querySelectorAll('p')];old.forEach(p=>p.remove());text.insertAdjacentHTML('beforeend',`<p class="pv-author-role">${esc(profile.role)}</p><p class="pv-author-intro">${esc(profile.intro)}</p><div class="pv-author-points">${profile.focus.map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="pv-author-approach"><strong>Как работает с темами</strong><p>${esc(profile.approach)}</p></div><a class="pv-ask-link" href="#ask-author">Задать вопрос автору ↓</a>`)}
    const materials=[...document.querySelectorAll('main>.section')].find(s=>/Материалы автора/i.test(s.textContent||''));
    if(materials){materials.insertAdjacentHTML('beforebegin',questionBox(profile)+subscribeBox(false))}
  }

  function enhanceDirectory(){
    if(page!=='authors.html')return;
    const grid=$('.author-directory-grid');if(!grid)return;
    grid.querySelectorAll('.author-card').forEach(card=>{const name=card.querySelector('h3')?.textContent.trim(),p=Object.values(profiles).find(x=>x.name===name);if(!p)return;const lead=card.querySelector('.author-card-lead');if(lead)lead.textContent=p.intro;const footer=card.querySelector('.author-card-footer');if(footer)footer.insertAdjacentHTML('beforebegin',`<div class="pv-card-method"><strong>В профиле:</strong> все статьи, темы автора и форма вопроса</div>`) });
    grid.insertAdjacentHTML('afterend',subscribeBox(false));
  }

  function addArticleSubscribe(){
    if(!/\/articles\/[^/]+\.html$/.test(location.pathname))return;
    const article=$('.article-wrap');if(!article||$('.pv-subscribe'))return;
    const related=article.querySelector('.related');if(related)related.insertAdjacentHTML('beforebegin',subscribeBox(true));else article.insertAdjacentHTML('beforeend',subscribeBox(true));
  }

  enhanceProfile();enhanceDirectory();addArticleSubscribe();
})();