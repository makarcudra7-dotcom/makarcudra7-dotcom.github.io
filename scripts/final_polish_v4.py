from pathlib import Path
import json,re,html

ROOT=Path('.')
POSTS=ROOT/'data/posts.json'
IMG_BASE='https://provkus-media.ru/assets/covers-v4'
PHOTO_SOURCE='provkus-media.ru'

HEADLINES={
'chay-v-paketikah-pravda-o-pyli':'Перестала покупать чай в пакетиках наугад: смотрю на одну деталь — сразу видно, что внутри',
'chto-ne-hranit-na-dverce-holodilnika':'Хозяйки годами кладут это в дверцу холодильника — а потом удивляются, почему продукты портятся раньше срока',
'extra-virgin-kak-vybrat-olivkovoe-maslo':'Надпись Extra Virgin ещё ничего не гарантирует: вот что проверяю на бутылке масла перед покупкой',
'gribnoi-pirog-obabnik':'Грибной пирог без возни с тестом: начинка получается сочной, а корочка — румяной',
'kak-bezopasno-razmorazhivat-myaso':'Мясо после такой разморозки можно испортить ещё до готовки: три способа, которые безопаснее',
'kak-hranit-kartofel-doma':'Картошка не прорастает неделями: убрала её из пакета и храню только так',
'kak-hranit-rastitelnoe-maslo-posle-vskrytiya':'Открыли бутылку масла — и зря поставили у плиты: где оно хранится дольше и не горчит',
'kak-pravilno-hranit-yayca-v-holodilnike':'Яйца не храню в дверце холодильника уже давно: вот куда переставила — так спокойнее',
'kak-vybrat-kofe-po-date-obzharki':'На пачке кофе ищу не срок годности: одна дата говорит о вкусе намного больше',
'kak-vybrat-sladkie-mandariny':'Сладкие мандарины видно ещё в магазине: беру только такие — кислые почти не попадаются',
'kak-vybrat-syr-s-plesenyu':'Белая, голубая или опасная: как отличить нормальную плесень на сыре от испорченного продукта',
'kartoshka-s-gribami-gorchichnyi-sous':'Картошка с грибами получается как из печи: добавляю ложку горчицы в соус — семья просит добавку',
'kuritsa-s-yablokami-gorchitsa-med':'Курица с яблоками исчезает со стола первой: горчица и мёд делают соус густым и ароматным',
'mozhno-li-zamorazhivat-hleb':'Хлеб больше не выбрасываю из-за плесени: один простой способ сохраняет его надолго',
'nuzhno-li-myt-yayca-posle-magazina':'Не мойте яйца сразу после магазина: привычка кажется правильной, но может сократить срок хранения',
'skolko-hranit-plavlenyi-syr-posle-vskrytiya':'Плавленый сыр после вскрытия хранится не вечность: когда его уже лучше не есть',
'slivovyi-ketchup-dymok':'Сливы больше не отправляю только в варенье: варю густой соус — зимой уходит банками',
'teplyi-salat-grusha-syr-orehi':'Салат с грушей делаю за 10 минут: добавляю сыр и орехи — гости всегда спрашивают рецепт','tykvennyi-krem-sup-s-yablokom':'Тыквенный суп теперь едят даже те, кто его не любил: одно яблоко меняет вкус полностью',
'udon-s-tykvoi-i-gribami':'Лапша с тыквой и грибами за 25 минут: горячий ужин, который особенно хорош в дождливый день',
'vinegret-s-zharenoi-tykvoi':'Винегрет готовлю по-новому: жареная тыква делает знакомый салат ярче и сытнее',
'yabloki-s-indeikoi-i-timyanom':'Яблоки запекаю не с сахаром, а с индейкой: необычный ужин съедают до последнего кусочка',
'zachem-myt-banany-i-mandariny':'Бананы и мандарины тоже мою перед едой: вот зачем это делать, даже если кожуру не едят',
'zamorozhennye-ovoshi-ne-pustye':'Замороженные овощи зря считают пустыми: что в них остаётся и как не испортить всё на сковороде',
}

AUTHORS={
'Илья Титюлькин':('author-ilya.html','/assets/authors/ilya.jpg','Продукты, выбор и сезонная кухня'),
'Эльвира Шайберт':('author-elvira.html','/assets/authors/elvira.jpg','Дом, хранение и практичные рецепты'),
'Екатерина Рукопляс':('author-ekaterina.html','/assets/authors/ekaterina.jpg','Еда, безопасность и домашняя кухня'),
}

def esc(s): return html.escape(str(s or ''),quote=True)
def fmt_date(s):
    try:
        from datetime import datetime
        d=datetime.fromisoformat(s.replace('Z','+00:00'))
        months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
        return f'{d.day} {months[d.month-1]} {d.year}, {d:%H:%M}'
    except: return s or ''

def update_jsonld(txt,post,img):
    pat=r'<script type="application/ld\+json">(.*?)</script>'
    def repl(m):
        try: obj=json.loads(m.group(1))
        except: return m.group(0)
        typ=obj.get('@type')
        if typ in ('Article','NewsArticle','Recipe','BlogPosting'):
            obj['headline']=post['headline']
            if typ=='Recipe': obj['name']=post['headline']
            obj['image']=[img]
            obj['thumbnailUrl']=img
        return '<script type="application/ld+json">'+json.dumps(obj,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+'</script>'
    return re.sub(pat,repl,txt,flags=re.S)

def update_article(post):
    f=ROOT/'articles'/(post['slug']+'.html')
    if not f.exists(): return
    s=f.read_text('utf-8')
    title=post['headline']+' — ProVkus'
    s=re.sub(r'<title>.*?</title>',f'<title>{esc(title)}</title>',s,count=1,flags=re.S)
    s=re.sub(r'<meta property="og:title" content="[^"]*">',f'<meta property="og:title" content="{esc(post["headline"])}">',s,count=1)
    s=re.sub(r'<meta property="og:image" content="[^"]*">',f'<meta property="og:image" content="{post["image"]}">',s,count=1)
    s=re.sub(r'<meta name="twitter:image" content="[^"]*">',f'<meta name="twitter:image" content="{post["image"]}">',s,count=1)
    s=re.sub(r'<h1 class="article-title">.*?</h1>',f'<h1 class="article-title">{esc(post["headline"])}</h1>',s,count=1,flags=re.S)
    s=re.sub(r'(<img[^>]*class="article-cover"[^>]*src=")[^"]+("[^>]*>)',rf'\1{post["image"]}\2',s,count=1)
    s=re.sub(r'(<img[^>]*src=")[^"]+("[^>]*class="article-cover"[^>]*>)',rf'\1{post["image"]}\2',s,count=1)
    credit=f'<div class="photo-credit">Фото: {esc(PHOTO_SOURCE)}</div>'
    if 'class="photo-credit"' in s:
        s=re.sub(r'<div class="photo-credit">.*?</div>',credit,s,count=1,flags=re.S)
    else:
        m=re.search(r'<img[^>]*class="article-cover"[^>]*>',s)
        if m: s=s[:m.end()]+credit+s[m.end():]
    s=update_jsonld(s,post,post['image'])
    f.write_text(s,'utf-8')

def story_card(p):
    return f'''<a class="story-card feed-card" href="/articles/{esc(p['slug'])}.html"><img src="{esc(p['image'])}" width="1200" height="675" loading="lazy" decoding="async" alt="{esc(p.get('imageAlt') or p['headline'])}"><div class="story-body"><span class="badge">{esc(p.get('category','Материал'))}</span><h3>{esc(p['headline'])}</h3><div class="story-meta"><span>{esc(p.get('author',''))}</span><span>•</span><time datetime="{esc(p.get('publishedAt',''))}">{esc(fmt_date(p.get('publishedAt','')))}</time></div></div></a>'''

def make_index(posts):
    p=posts+[{}]*12
    lead=p[0]; side=p[1:4]; fresh=p[4:12]
    def side_card(x): return f'''<a class="stack-card" href="/articles/{esc(x['slug'])}.html"><img width="1200" height="675" src="{esc(x['image'])}" alt="{esc(x.get('imageAlt') or x['headline'])}"><div class="stack-copy"><div class="eyebrow">{esc(x.get('category','Материал'))}</div><h3>{esc(x['headline'])}</h3><p>{esc(x.get('description',''))}</p></div></a>'''
    author_cards=''.join(f'''<a class="author-card" href="/{u}"><img src="{pic}" width="320" height="320" alt="{esc(name)}"><h3>{esc(name)}</h3><p>{esc(role)}</p></a>''' for name,(u,pic,role) in AUTHORS.items())
    return f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProVkus — еда, продукты и домашние советы</title><meta name="description" content="ProVkus — практичное медиа о еде, сезонных рецептах, продуктах, хранении и доме."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="https://provkus-media.ru/"><link rel="icon" type="image/png" sizes="64x64" href="/favicon.png"><link rel="alternate" type="application/rss+xml" title="ProVkus" href="/feed.xml"><meta property="og:type" content="website"><meta property="og:title" content="ProVkus — еда, продукты и домашние советы"><meta property="og:image" content="{esc(lead['image'])}"><link rel="stylesheet" href="/assets/styles.css"></head><body><header class="site-header"><div class="container topbar"><a class="brand" href="/">Pro<b>Vkus</b></a><nav class="main-nav"></nav><div class="header-actions"><a class="pill-btn" href="/authors.html">3 автора</a></div></div><div class="ticker"><div class="container"><strong>НОВОЕ</strong>{''.join(f'<a href="/articles/{esc(x["slug"])}.html">{esc(x["headline"])}</a>' for x in p[:3])}</div></div></header><main><section class="hero"><div class="container hero-grid"><a class="lead-card" href="/articles/{esc(lead['slug'])}.html"><img fetchpriority="high" width="1200" height="675" src="{esc(lead['image'])}" alt="{esc(lead.get('imageAlt') or lead['headline'])}"><div class="lead-copy"><div class="eyebrow">{esc(lead.get('category','Материал'))}</div><h1>{esc(lead['headline'])}</h1><p>{esc(lead.get('description',''))}</p><div class="meta-row"><span>{esc(lead.get('author',''))}</span><span>•</span><span>{esc(fmt_date(lead.get('publishedAt','')))}</span></div></div></a><div class="hero-side">{''.join(side_card(x) for x in side)}</div></div></section><section class="section"><div class="container"><div class="section-head"><div><h2 class="section-title">Свежие материалы</h2><div class="section-sub">Рецепты, продукты и домашние советы — с авторством и датой публикации</div></div><a class="link-more" href="/category.html">Все {len(posts)} материалов →</a></div><div class="story-grid">{''.join(story_card(x) for x in fresh)}</div></div></section><section class="section"><div class="container feature-band"><div class="section-head"><div><h2 class="section-title">Авторы ProVkus</h2><div class="section-sub" style="color:rgba(255,255,255,.72)">Три редакционных направления</div></div><a class="link-more" style="color:white" href="/authors.html">Все авторы →</a></div><div class="author-grid">{author_cards}</div></div></section></main><footer class="site-footer"><div class="container footer-grid"><div class="footer-about"><div class="brand">Pro<b>Vkus</b></div><p>Практичное медиа о продуктах, доме и еде.</p></div><div><h4>Читать</h4><a href="/category.html">Все материалы</a><a href="/authors.html">Авторы</a></div><div><h4>Редакция</h4><a href="/editorial.html">О редакции</a><a href="/contacts.html">Контакты</a></div><div><h4>Документы</h4><a href="/privacy.html">Конфиденциальность</a><a href="/personal-data.html">Персональные данные</a></div></div><div class="container footer-bottom"><span>© <span id="year"></span> ProVkus. 18+</span><span>ProVkus не зарегистрирован как средство массовой информации.</span></div></footer><script src="/assets/app.js"></script></body></html>'''

def make_category(n):
    return f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Все материалы — ProVkus</title><meta name="description" content="{n} материалов ProVkus: рецепты, продукты, хранение, дом и безопасность еды."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="https://provkus-media.ru/category.html"><link rel="stylesheet" href="/assets/styles.css"><link rel="icon" href="/favicon.png"></head><body><header class="site-header"><div class="container topbar"><a class="brand" href="/">Pro<b>Vkus</b></a><nav class="main-nav"></nav></div></header><main><section class="section"><div class="container"><div class="eyebrow">ProVkus</div><h1 class="section-title category-title">Все материалы</h1><p class="section-sub">{n} материалов — с авторством, датой, обложкой и источниками.</p><div class="story-grid" id="infiniteFeed"></div><div id="feedSentinel" class="feed-sentinel">Загружаем материалы…</div></div></section></main><footer class="site-footer"><div class="container footer-bottom">© <span id="year"></span> ProVkus</div></footer><script src="/assets/app.js"></script></body></html>'''

def make_author(name,posts):
    u,pic,role=AUTHORS[name]
    bio={'Илья Титюлькин':'Имеет профильное образование и опыт редакционной работы с материалами о продуктах, выборе и сезонной кухне.','Эльвира Шайберт':'Имеет профильное образование и опыт работы с потребительскими и бытовыми темами. Любит практичные решения для дома и кухни.','Екатерина Рукопляс':'Имеет профильное образование и опыт подготовки справочных материалов о еде и домашней безопасности.'}[name]
    own=[x for x in posts if x.get('author')==name]
    return f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(name)} — автор ProVkus</title><meta name="description" content="{esc(bio)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="https://provkus-media.ru/{u}"><link rel="stylesheet" href="/assets/styles.css"><link rel="icon" href="/favicon.png"><script type="application/ld+json">{json.dumps({'@context':'https://schema.org','@type':'ProfilePage','mainEntity':{'@type':'Person','name':name,'jobTitle':role,'image':'https://provkus-media.ru'+pic,'url':'https://provkus-media.ru/'+u}},ensure_ascii=False)}</script></head><body><header class="site-header"><div class="container topbar"><a class="brand" href="/">Pro<b>Vkus</b></a><nav class="main-nav"></nav></div></header><main class="container"><section class="author-hero"><img class="author-photo" width="440" height="440" src="{pic}?v=20260922f" alt="{esc(name)}"><div><div class="eyebrow">Автор ProVkus</div><h1>{esc(name)}</h1><p><strong>{esc(role)}</strong></p><p>{esc(bio)}</p></div></section><section class="section"><div class="section-head"><h2 class="section-title">Материалы автора</h2><span class="section-sub">{len(own)} публикаций</span></div><div class="story-grid">{''.join(story_card(x) for x in own)}</div></section></main><script src="/assets/app.js"></script></body></html>'''

posts=json.loads(POSTS.read_text('utf-8'))
for p in posts:
    slug=p['slug']
    if slug in HEADLINES: p['headline']=HEADLINES[slug]
    p['image']=f'{IMG_BASE}/{slug}.webp'
    p['images']=[p['image']]
    p['photoSource']=PHOTO_SOURCE
posts.sort(key=lambda x:x.get('publishedAt',''),reverse=True)
POSTS.write_text(json.dumps(posts,ensure_ascii=False,indent=2),'utf-8')
for p in posts: update_article(p)
(ROOT/'index.html').write_text(make_index(posts),'utf-8')
(ROOT/'category.html').write_text(make_category(len(posts)),'utf-8')
for name in AUTHORS:
    (ROOT/AUTHORS[name][0]).write_text(make_author(name,posts),'utf-8')
print('polished',len(posts),'posts')
