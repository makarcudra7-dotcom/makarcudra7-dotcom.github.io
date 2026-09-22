from pathlib import Path
import json,re,html
from datetime import datetime

ROOT=Path('.')
ART=ROOT/'articles'
POSTS=ROOT/'data/posts.json'
SITE='https://provkus-media.ru'
PHOTO_SOURCE='provkus-media.ru'
HEADLINES={
'chay-v-paketikah-pravda-o-pyli':'Чай в пакетиках выбирают не по красивой коробке: одна деталь на упаковке расскажет больше рекламы',
'chto-ne-hranit-na-dverce-holodilnika':'Эти продукты зря держат на дверце холодильника: переставьте их — и они дольше останутся свежими',
'extra-virgin-kak-vybrat-olivkovoe-maslo':'Надпись Extra Virgin ещё не всё: пять строк на бутылке, которые стоит проверить до покупки',
'gribnoi-pirog-obabnik':'Грибной пирог без долгой возни с тестом: корочка хрустит, а начинка остаётся сочной',
'kak-bezopasno-razmorazhivat-myaso':'Так мясо лучше не размораживать: одна кухонная привычка портит продукт ещё до сковороды',
'kak-hranit-kartofel-doma':'Картошка прорастает не из-за сорта: где держать клубни дома, чтобы они дольше оставались крепкими',
'kak-hranit-rastitelnoe-maslo-posle-vskrytiya':'Масло возле плиты быстрее теряет вкус: куда переставить бутылку после вскрытия',
'kak-pravilno-hranit-yayca-v-holodilnike':'Яйцам не место в дверце холодильника: одна полка подходит для хранения лучше',
'kak-vybrat-kofe-po-date-obzharki':'На пачке кофе важнее срока годности есть другая дата: она многое говорит об аромате',
'kak-vybrat-sladkie-mandariny':'Сладкие мандарины можно узнать ещё у прилавка: четыре признака удачной покупки',
'kak-vybrat-syr-s-plesenyu':'Белая плесень на сыре — не всегда повод пугаться: три признака нормального продукта',
'kartoshka-s-gribami-gorchichnyi-sous':'Картошка с грибами получается как из печи: секрет — одна ложка в сливочный соус',
'kuritsa-s-yablokami-gorchitsa-med':'Курица с яблоками получается особенно сочной: горчица и мёд делают соус густым и ароматным',
'mozhno-li-zamorazhivat-hleb':'Хлеб можно сохранить на недели: один способ помогает вернуть даже хрустящую корочку',
'nuzhno-li-myt-yayca-posle-magazina':'Яйца после магазина не стоит мыть заранее: когда вода действительно нужна и как хранить правильно',
'skolko-hranit-plavlenyi-syr-posle-vskrytiya':'Открытый плавленый сыр не хранится бесконечно: признаки, после которых его лучше выбросить',
'slivovyi-ketchup-dymok':'Сливы больше не идут только в варенье: густой соус к мясу — банки просят открыть ещё осенью',
'teplyi-salat-grusha-syr-orehi':'Груша, сыр и орехи — салат за 10 минут: на стол ставят первым, а исчезает раньше горячего',
'tykvennyi-krem-sup-s-yablokom':'Добавьте одно яблоко в тыквенный суп: вкус станет ярче — кастрюля пустеет за один ужин',
'udon-s-tykvoi-i-gribami':'Осенний ужин за 25 минут: удон с тыквой и грибами согревает лучше привычной лапши',
'vinegret-s-zharenoi-tykvoi':'Винегрет заиграет по-новому: жареная тыква меняет привычный салат до неузнаваемости',
'yabloki-s-indeikoi-i-timyanom':'Яблоки — не только в шарлотку: запекаем с индейкой и тимьяном — осенний ужин без лишней возни',
'zachem-myt-banany-i-mandariny':'Бананы и мандарины тоже нужно мыть: причина скрывается на кожуре, которую мы не едим',
'zamorozhennye-ovoshi-ne-pustye':'Замороженные овощи зря считают «пустыми»: как приготовить их без воды и без овощной каши',
}
AUTHORS={
'Илья Титюлькин':('author-ilya.html','/assets/authors/ilya.jpg','Продукты, выбор и сезонная кухня'),
'Эльвира Шайберт':('author-elvira.html','/assets/authors/elvira-v2.jpg','Дом, хранение и практичные рецепты'),
'Екатерина Рукопляс':('author-ekaterina.html','/assets/authors/ekaterina.jpg','Безопасность еды и домашняя кухня'),
}
BIO={
'Илья Титюлькин':'Имеет профильное образование и опыт работы с информационными и потребительскими материалами. Пишет о выборе продуктов, сезонной кухне и понятных бытовых решениях.',
'Эльвира Шайберт':'Имеет профильное образование и опыт редакционной работы с практическими материалами. Пишет о доме, хранении продуктов и рецептах без лишней сложности.',
'Екатерина Рукопляс':'Имеет профильное образование и опыт подготовки справочных и редакционных материалов. Пишет о безопасности еды, домашней кухне и повседневных привычках.',
}
def esc(v): return html.escape(str(v or ''),quote=True)
def fmt(iso):
    try:
        d=datetime.fromisoformat(iso.replace('Z','+00:00')); ms=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']; return f'{d.day} {ms[d.month-1]} {d.year}, {d:%H:%M}'
    except Exception:return iso

def extract_body(s):
    m=re.search(r'<div class="article-body">(.*)</div>\s*</article>',s,re.S)
    return m.group(1).strip() if m else '<p>Материал обновляется редакцией ProVkus.</p>'
def extract_schema(s):
    m=re.search(r'<script type="application/ld\+json">(.*?)</script>',s,re.S)
    if not m:return {}
    try:return json.loads(m.group(1))
    except Exception:return {}

def nav(): return '<nav class="main-nav"><a href="/category.html?rubric=Рецепты">Рецепты</a><a href="/category.html?rubric=Продукты%20и%20выбор">Продукты</a><a href="/category.html?rubric=Дом%20и%20хранение">Дом</a><a href="/category.html?rubric=Безопасность%20еды">Безопасность</a><a href="/authors.html">Авторы</a></nav>'
def header(): return f'<header class="site-header"><div class="container topbar"><a class="brand" href="/">Pro<b>Vkus</b></a>{nav()}</div></header>'
def footer(): return '<footer class="site-footer"><div class="container footer-grid"><div class="footer-about"><div class="brand">Pro<b>Vkus</b></div><p>Практичное медиа о еде, продуктах и доме.</p></div><div><h4>Читать</h4><a href="/category.html">Все материалы</a><a href="/authors.html">Авторы</a></div><div><h4>Редакция</h4><a href="/editorial.html">О редакции</a><a href="/contacts.html">Контакты</a></div><div><h4>Документы</h4><a href="/privacy.html">Конфиденциальность</a><a href="/personal-data.html">Персональные данные</a></div></div></footer>'
def card(p): return f'<a class="story-card feed-card" href="/articles/{esc(p["slug"])}.html"><img src="{esc(p["image"])}" width="1600" height="900" loading="lazy" decoding="async" alt="{esc(p.get("imageAlt") or p["headline"])}"><div class="story-body"><span class="badge">{esc(p["category"])}</span><h3>{esc(p["headline"])}</h3><div class="story-meta"><span>{esc(p["author"])}</span><span>•</span><time datetime="{esc(p["publishedAt"])}">{esc(fmt(p["publishedAt"]))}</time></div></div></a>'

posts=json.loads(POSTS.read_text('utf-8'))
snap={}
for p in posts:
    f=ART/(p['slug']+'.html')
    s=f.read_text('utf-8') if f.exists() else ''
    snap[p['slug']]={'body':extract_body(s),'schema':extract_schema(s)}
for f in ART.glob('*.html'): f.unlink()
ART.mkdir(exist_ok=True)

for p in posts:
    slug=p['slug']; p['headline']=HEADLINES.get(slug,p['headline']); p['photoSource']=PHOTO_SOURCE
    p['image']=f'{SITE}/assets/covers/{slug}-16x9.jpg'
    p['images']=[f'{SITE}/assets/covers/{slug}-16x9.jpg',f'{SITE}/assets/covers/{slug}-4x3.jpg',f'{SITE}/assets/covers/{slug}-1x1.jpg']
    p['url']=f'{SITE}/articles/{slug}.html'
    page,photo,role=AUTHORS[p['author']]
    schema=snap[slug]['schema'] or {'@context':'https://schema.org','@type':p.get('type','Article')}
    schema.update({'@context':'https://schema.org','@type':p.get('type','Article'),'headline':p['headline'],'description':p['description'],'image':p['images'],'datePublished':p['publishedAt'],'dateModified':p.get('updatedAt') or p['publishedAt'],'author':{'@type':'Person','name':p['author'],'url':f'{SITE}/{page}'},'publisher':{'@type':'Organization','name':'ProVkus','url':SITE,'logo':{'@type':'ImageObject','url':SITE+'/favicon.png'}},'mainEntityOfPage':{'@type':'WebPage','@id':p['url']},'inLanguage':'ru-RU','isAccessibleForFree':True,'thumbnailUrl':p['image']})
    if schema.get('@type')=='Recipe': schema['name']=p['headline']
    body=snap[slug]['body']
    body=re.sub(r'<div class="photo-credit">.*?</div>','',body,flags=re.S)
    doc=f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(p['headline'])} — ProVkus</title><meta name="description" content="{esc(p['description'])}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{p['url']}"><meta property="og:type" content="article"><meta property="og:title" content="{esc(p['headline'])}"><meta property="og:description" content="{esc(p['description'])}"><meta property="og:image" content="{p['image']}"><meta property="og:image:width" content="1600"><meta property="og:image:height" content="900"><meta property="article:published_time" content="{esc(p['publishedAt'])}"><meta property="article:modified_time" content="{esc(p.get('updatedAt') or p['publishedAt'])}"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/overrides.css"><link rel="icon" href="/favicon.png"><script type="application/ld+json">{json.dumps(schema,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')}</script></head><body>{header()}<main class="container"><article class="article-wrap"><div class="breadcrumbs"><a href="/">Главная</a> / <a href="/category.html">{esc(p['category'])}</a></div><div class="article-kicker">{esc(p['category'])}</div><h1 class="article-title">{esc(p['headline'])}</h1><p class="article-dek">{esc(p['description'])}</p><div class="article-author"><img class="avatar" width="46" height="46" src="{photo}" alt="{esc(p['author'])}" onerror="this.onerror=null;this.src='/assets/fallback-cover.svg'"><div class="author-info"><strong><a href="/{page}">{esc(p['author'])}</a></strong><span>{esc(role)}</span></div></div><div class="article-date"><span>Опубликовано <time datetime="{esc(p['publishedAt'])}">{esc(fmt(p['publishedAt']))}</time></span><span> · Обновлено <time datetime="{esc(p.get('updatedAt') or p['publishedAt'])}">{esc(fmt(p.get('updatedAt') or p['publishedAt']))}</time></span></div><img class="article-cover" width="1600" height="900" fetchpriority="high" src="{p['image']}" alt="{esc(p.get('imageAlt') or p['headline'])}"><div class="photo-credit">Фото: {PHOTO_SOURCE}</div><div class="article-body">{body}</div></article></main>{footer()}<script src="/assets/app.js"></script></body></html>'''
    (ART/(slug+'.html')).write_text(doc,'utf-8')

POSTS.write_text(json.dumps(posts,ensure_ascii=False,indent=2),'utf-8')
lead=posts[0]; side=posts[1:4]; fresh=posts[4:16]
side_html=''.join(f'<a class="stack-card" href="/articles/{p["slug"]}.html"><img src="{p["image"]}" width="1600" height="900" alt="{esc(p.get("imageAlt") or p["headline"])}"><div class="stack-copy"><span class="badge">{esc(p["category"])}</span><h3>{esc(p["headline"])}</h3><div class="story-meta"><span>{esc(p["author"])}</span><span>•</span><time datetime="{p["publishedAt"]}">{fmt(p["publishedAt"])}</time></div></div></a>' for p in side)
authors=''.join(f'<a class="author-card" href="/{page}"><img src="{photo}?v=relaunch" width="320" height="320" alt="{esc(name)}" onerror="this.onerror=null;this.src=\'/assets/fallback-cover.svg\'"><h3>{esc(name)}</h3><p>{esc(role)}</p></a>' for name,(page,photo,role) in AUTHORS.items())
index=f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProVkus — еда, продукты и домашние советы</title><meta name="description" content="ProVkus — практичное медиа о еде, сезонных рецептах, продуктах, хранении и доме."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{SITE}/"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/overrides.css"><link rel="icon" href="/favicon.png"></head><body>{header()}<main><section class="hero"><div class="container hero-grid"><a class="lead-card" href="/articles/{lead['slug']}.html"><img fetchpriority="high" width="1600" height="900" src="{lead['image']}" alt="{esc(lead.get('imageAlt') or lead['headline'])}"><div class="lead-copy"><div class="eyebrow">{esc(lead['category'])}</div><h1>{esc(lead['headline'])}</h1><p>{esc(lead['description'])}</p><div class="meta-row"><span>{esc(lead['author'])}</span><span>•</span><span>{fmt(lead['publishedAt'])}</span></div></div></a><div class="hero-side">{side_html}</div></div></section><section class="section"><div class="container"><div class="section-head"><div><h2 class="section-title">Свежие материалы</h2><div class="section-sub">Рецепты, продукты и домашние советы</div></div><a class="link-more" href="/category.html">Все материалы →</a></div><div class="story-grid">{''.join(card(p) for p in fresh)}</div></div></section><section class="section"><div class="container feature-band"><div class="section-head"><div><h2 class="section-title">Авторы ProVkus</h2><div class="section-sub" style="color:rgba(255,255,255,.72)">Три редакционных направления</div></div></div><div class="author-grid">{authors}</div></div></section></main>{footer()}<script src="/assets/app.js"></script></body></html>'''
(ROOT/'index.html').write_text(index,'utf-8')
chips=['Все','Рецепты','Продукты и выбор','Дом и хранение','Безопасность еды']
cat=f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Все материалы — ProVkus</title><meta name="description" content="Все материалы ProVkus: рецепты, продукты, хранение и безопасность еды."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{SITE}/category.html"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/overrides.css"><link rel="icon" href="/favicon.png"></head><body>{header()}<main class="container"><section class="section"><div class="section-head"><div><h1 class="section-title category-title">Все материалы</h1><div class="section-sub">{len(posts)} публикации</div></div></div><div class="chips">{''.join(f'<a class="chip" href="/category.html{("?rubric="+c) if c!="Все" else ""}">{esc(c)}</a>' for c in chips)}</div><div class="story-grid">{''.join(card(p) for p in posts)}</div></section></main>{footer()}<script src="/assets/app.js"></script></body></html>'''
(ROOT/'category.html').write_text(cat,'utf-8')
acards=[]
for name,(page,photo,role) in AUTHORS.items():
    mine=[p for p in posts if p['author']==name]
    schema={'@context':'https://schema.org','@type':'ProfilePage','mainEntity':{'@type':'Person','name':name,'jobTitle':role,'image':SITE+photo,'url':SITE+'/'+page}}
    out=f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(name)} — автор ProVkus</title><meta name="description" content="{esc(BIO[name])}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{SITE}/{page}"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/overrides.css"><link rel="icon" href="/favicon.png"><script type="application/ld+json">{json.dumps(schema,ensure_ascii=False)}</script></head><body>{header()}<main class="container"><section class="author-hero"><img class="author-photo" width="440" height="440" src="{photo}?v=relaunch" alt="{esc(name)}" onerror="this.onerror=null;this.src='/assets/fallback-cover.svg'"><div><div class="eyebrow">Автор ProVkus</div><h1>{esc(name)}</h1><p><strong>{esc(role)}</strong></p><p>{esc(BIO[name])}</p></div></section><section class="section"><div class="section-head"><h2 class="section-title">Материалы автора</h2><span class="section-sub">{len(mine)} публикаций</span></div><div class="story-grid">{''.join(card(p) for p in mine)}</div></section></main>{footer()}<script src="/assets/app.js"></script></body></html>'''
    (ROOT/page).write_text(out,'utf-8')
    acards.append(f'<a class="author-card" href="/{page}"><img src="{photo}?v=relaunch" width="320" height="320" alt="{esc(name)}" onerror="this.onerror=null;this.src=\'/assets/fallback-cover.svg\'"><h3>{esc(name)}</h3><p>{esc(role)}</p></a>')
(ROOT/'authors.html').write_text(f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Авторы ProVkus</title><meta name="description" content="Авторы ProVkus: продукты, хранение, безопасность еды и сезонные рецепты."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{SITE}/authors.html"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/overrides.css"><link rel="icon" href="/favicon.png"></head><body>{header()}<main class="container"><section class="section"><div class="section-head"><h1 class="section-title">Авторы ProVkus</h1></div><div class="author-grid">{''.join(acards)}</div></section></main>{footer()}<script src="/assets/app.js"></script></body></html>''','utf-8')
urls=[SITE+'/',SITE+'/category.html',SITE+'/authors.html']+[SITE+'/'+x[0] for x in AUTHORS.values()]+[p['url'] for p in posts]
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{u}</loc></url>' for u in urls)+'</urlset>','utf-8')
items=''.join(f'<item><title>{esc(p["headline"])}</title><link>{p["url"]}</link><guid>{p["url"]}</guid><pubDate>{p["publishedAt"]}</pubDate><description>{esc(p["description"])}</description></item>' for p in posts)
(ROOT/'feed.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ProVkus</title><link>{SITE}/</link><description>Новые материалы ProVkus</description>{items}</channel></rss>','utf-8')
app=ROOT/'assets/app.js'
if app.exists(): app.write_text(app.read_text('utf-8').replace("'elvira.svg':'/assets/authors/elvira.jpg'","'elvira.svg':'/assets/authors/elvira-v2.jpg'"),'utf-8')
assert len(posts)==24
assert len({p['image'] for p in posts})==24
assert all((ART/(p['slug']+'.html')).exists() for p in posts)
assert all(p.get('photoSource')==PHOTO_SOURCE for p in posts)
assert sum(1 for p in posts if p.get('type')=='Recipe')>=9
assert all('images.unsplash.com' not in (ART/(p['slug']+'.html')).read_text('utf-8') for p in posts)
print('RELAUNCH_OK',len(posts),'articles',sum(1 for p in posts if p.get('type')=='Recipe'),'recipes')
