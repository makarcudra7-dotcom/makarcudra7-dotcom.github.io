(()=>{
  if(window.__pvCommunityLoaded)return;window.__pvCommunityLoaded=true;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const EDITORIAL_EMAIL='provkus-media@mail.ru';
  const PROFILE_BY_PAGE={
    'author-ilya.html':{
      name:'Илья Титюлькин',dativeFirst:'Илье',role:'Редактор направления «Продукты и выбор»',
      lead:'Помогает покупать продукты осознанно: понимать этикетку, замечать реальные признаки качества и не переплачивать за маркетинг.',
      bio:'Илья пишет о выборе продуктов в магазине и о том, что с ними происходит уже дома. В центре его материалов — маркировка, свежесть, сезонность, состав, условия хранения и простые признаки, которые можно проверить самому. Задача текста — не перечислить характеристики, а дать читателю понятный алгоритм выбора.',
      topics:['Маркировка','Состав','Выбор продуктов','Сезонность','Свежесть','Хранение'],
      method:'Сначала — конкретный вопрос покупателя. Затем — проверяемые признаки и понятное объяснение. В финале — короткий алгоритм, который можно применить у полки магазина или дома.',
      useful:'Если сомневаетесь между двумя продуктами, не понимаете надпись на упаковке или хотите проверить популярный совет о выборе — это его направление.',
      ask:'Можно спросить о составе и маркировке, выборе масла, сыра, кофе, овощей и фруктов, сроках и условиях хранения или предложить продукт для отдельного разбора.'
    },
    'author-elvira.html':{
      name:'Эльвира Шайберт',dativeFirst:'Эльвире',role:'Редактор направления «Дом и хранение»',
      lead:'Разбирает кухню как систему: где хранить продукты, что замораживать, как меньше выбрасывать и как упростить ежедневную готовку.',
      bio:'Эльвира готовит практические материалы о холодильнике, морозилке, сроках хранения и организации кухни. В рецептах делает акцент на понятной технологии, доступных продуктах и результате, который можно повторить без специального оборудования. Её материалы отвечают на бытовой вопрос «как сделать проще и не испортить продукт».',
      topics:['Холодильник','Заморозка','Сроки хранения','Организация кухни','Экономия продуктов','Домашние рецепты'],
      method:'Берёт обычную домашнюю ситуацию, разбирает, где чаще всего ошибаются, и предлагает самый простой рабочий порядок действий без лишних приспособлений.',
      useful:'Если продукт быстро портится, в холодильнике постоянно не хватает места, непонятно, что можно заморозить, или нужен практичный домашний рецепт — вопрос по адресу.',
      ask:'Можно спросить, где и сколько хранить продукт, что можно заморозить, как избежать лишней влаги, как использовать остатки и как упростить повседневную готовку.'
    },
    'author-ekaterina.html':{
      name:'Екатерина Рукопляс',dativeFirst:'Екатерине',role:'Редактор направления «Еда и безопасность»',
      lead:'Разбирает спорные бытовые вопросы о еде: что действительно безопасно, где есть риск, а где страхи и привычки преувеличены.',
      bio:'Екатерина пишет о безопасном обращении с продуктами дома: размораживании, мытье, хранении после вскрытия, температуре и чистоте кухни. В справочных материалах отделяет распространённые бытовые привычки от проверяемых рекомендаций и объясняет не только «как правильно», но и почему это имеет значение.',
      topics:['Безопасность еды','Размораживание','Гигиена кухни','Температура','Хранение после вскрытия','Домашняя кухня'],
      method:'Начинает с реальной бытовой ситуации, отделяет риск от мифа и переводит рекомендации в несколько конкретных действий, которые легко соблюдать дома.',
      useful:'Если вы не уверены, можно ли есть продукт, как его разморозить, сколько хранить после вскрытия или стоит ли верить популярному кухонному совету — это её темы.',
      ask:'Можно спросить о размораживании, мытье продуктов, хранении готовой еды, сроках после вскрытия, температуре и безопасной работе с продуктами дома.'
    }
  };
  const BY_NAME=Object.fromEntries(Object.entries(PROFILE_BY_PAGE).map(([page,p])=>[p.name,{...p,page}]));
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const profile=PROFILE_BY_PAGE[page];
  function addFeedLink(){if(document.querySelector('link[type="application/rss+xml"]'))return;const l=document.createElement('link');l.rel='alternate';l.type='application/rss+xml';l.title='ProVkus — новые материалы';l.href='https://provkus-media.ru/feed.xml';document.head.appendChild(l)}
  function topicsMarkup(items){return `<div class="author-topics">${items.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`}
  function mailHref(subject,body=''){return `mailto:${EDITORIAL_EMAIL}?subject=${encodeURIComponent(subject)}${body?`&body=${encodeURIComponent(body)}`:''}`}
  function questionMarkup(p){
    const subject=`Вопрос автору ${p.name} — ProVkus`;
    const body=`Здравствуйте!\n\nВопрос для ${p.name}:\n\n\nСсылка на материал (если есть): `;
    return `<div class="ask-author-box" id="ask-author"><div class="community-kicker">Вопрос редактору</div><h2>Задать вопрос ${esc(p.dativeFirst||p.name.split(' ')[0])}</h2><p>${esc(p.ask)}</p><p>Вопрос отправляется напрямую с вашей почты на редакционный адрес. ProVkus не собирает имя или e-mail через форму на сайте.</p><div class="question-actions"><a class="question-mail-fallback" href="${mailHref(subject,body)}">Написать в редакцию</a><a href="mailto:${EDITORIAL_EMAIL}">${EDITORIAL_EMAIL}</a></div><div class="form-note">Если тема полезна многим читателям, она может стать основой отдельного материала. Личные данные и адрес отправителя без отдельного согласия не публикуются.</div></div>`
  }
  function enhanceAuthorProfile(){
    if(!profile)return false;const hero=$('.author-hero');if(!hero)return false;hero.classList.add('author-profile-hero');
    const info=hero.querySelector(':scope > div');
    if(info){const note=info.querySelector('.photo-credit')?.outerHTML||'';info.innerHTML=`<div class="eyebrow">Автор ProVkus</div><h1>${esc(profile.name)}</h1><div class="author-role">${esc(profile.role)}</div>${note}<p class="author-lead">${esc(profile.lead)}</p><p class="author-bio">${esc(profile.bio)}</p>${topicsMarkup(profile.topics)}<div class="author-profile-facts"><div class="author-method"><strong>Как работает с темами</strong><span>${esc(profile.method)}</span></div><div class="author-method"><strong>Когда к автору</strong><span>${esc(profile.useful)}</span></div></div><a class="ask-author-link profile-ask-cta" href="#ask-author">Задать вопрос ${esc(profile.dativeFirst||profile.name.split(' ')[0])} ↓</a>`}
    const materials=[...$$('main.container .section')].find(x=>/Материалы автора/i.test(x.querySelector('.section-title')?.textContent||''));
    if(materials&&!$('#authorCommunity')){const wrap=document.createElement('section');wrap.id='authorCommunity';wrap.className='author-community';wrap.innerHTML=`<div class="author-interaction-grid">${questionMarkup(profile)}</div>`;materials.parentNode.insertBefore(wrap,materials)}
    if(window.__pvPostsPromise)window.__pvPostsPromise.then(posts=>paintCounts(posts));return true
  }
  function enhanceDirectory(){const grid=$('.author-grid');if(!grid)return;grid.classList.add('author-directory-grid')}
  function paintCounts(posts){if(!Array.isArray(posts)||!posts.length)return;$$('[data-author-count]').forEach(el=>{const name=el.dataset.authorCount,count=posts.filter(p=>p.author===name||(Array.isArray(p.coauthors)&&p.coauthors.includes(name))).length,n10=count%10,n100=count%100,word=n10===1&&n100!==11?'материал':(n10>=2&&n10<=4&&(n100<12||n100>14)?'материала':'материалов');if(count)el.textContent=`${count} ${word}`})}
  function addArticleAskLink(){const box=$('.article-author');if(!box||box.querySelector('.ask-author-link'))return;const name=box.querySelector('strong')?.textContent?.trim(),p=BY_NAME[name];if(!p)return;const a=document.createElement('a');a.className='ask-author-link';a.href=`/${p.page}#ask-author`;a.textContent=`Задать вопрос ${p.dativeFirst||'автору'}`;box.appendChild(a)}
  document.querySelectorAll('.newsletter-box,.site-newsletter-section,.newsletter-form').forEach(el=>el.remove());
  addFeedLink();enhanceDirectory();enhanceAuthorProfile();addArticleAskLink();
})();
