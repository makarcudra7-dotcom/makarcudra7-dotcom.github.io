from pathlib import Path
import base64, io, tarfile, tempfile, json, re, html, shutil
from datetime import datetime
from PIL import Image, ImageEnhance, ImageOps

ROOT=Path('.')
POSTS=ROOT/'data/posts.json'
BUNDLE=ROOT/'.image-bundle-v5'
COVERS=ROOT/'assets/covers-v5'
PHOTO_SOURCE='provkus-media.ru'

HEADLINES={
'chay-v-paketikah-pravda-o-pyli':'Чай в пакетиках больше не беру наугад: одна деталь на упаковке многое говорит о том, что внутри',
'chto-ne-hranit-na-dverce-holodilnika':'Убрала эти продукты с дверцы холодильника: теперь не портятся раньше срока — куда их переставить',
'extra-virgin-kak-vybrat-olivkovoe-maslo':'Extra Virgin на этикетке ещё не гарантия: проверяю 5 строк на бутылке перед покупкой',
'gribnoi-pirog-obabnik':'Грибной пирог без возни с тестом: смешала начинку, отправила в духовку — корочка хрустит, внутри сочно',
'kak-bezopasno-razmorazhivat-myaso':'Так мясо размораживать нельзя: привычка на кухне может испортить продукт ещё до сковороды',
'kak-hranit-kartofel-doma':'Картошка не прорастает неделями: убрала из пакета и держу в одном месте — клубни остаются крепкими',
'kak-hranit-rastitelnoe-maslo-posle-vskrytiya':'Масло возле плиты больше не держу: переставила бутылку — вкус дольше не становится горьким',
'kak-pravilno-hranit-yayca-v-holodilnike':'Яйца давно не ставлю в дверцу холодильника: переставила на одну полку — так температура стабильнее',
'kak-vybrat-kofe-po-date-obzharki':'На пачке кофе ищу не срок годности: одна дата сразу подсказывает, будут ли зёрна ароматными',
'kak-vybrat-sladkie-mandariny':'Сладкие мандарины узнаю ещё у прилавка: смотрю на 4 признака — кислые почти не попадаются',
'kak-vybrat-syr-s-plesenyu':'Сыр с плесенью выбираю по трём признакам: когда белый налёт — норма, а когда лучше вернуть на полку',
'kartoshka-s-gribami-gorchichnyi-sous':'Картошка с грибами получается будто из печи: одна ложка в соус — и сковорода пустеет за ужином',
'kuritsa-s-yablokami-gorchitsa-med':'Курица с яблоками получается сочнее обычной: горчица и мёд превращают сок в густой соус',
'mozhno-li-zamorazhivat-hleb':'Хлеб неделями остаётся нормальным: перестала держать его в пакете — вот куда убираю',
'nuzhno-li-myt-yayca-posle-magazina':'Яйца после магазина больше не мою: одна привычка сокращала срок хранения — делаю иначе',
'skolko-hranit-plavlenyi-syr-posle-vskrytiya':'Открытый плавленый сыр не хранится вечность: по этим признакам понятно, что пора выбрасывать',
'slivovyi-ketchup-dymok':'Сливы не отправляю в варенье: варю густой соус к мясу — зимой банки исчезают первыми',
'teplyi-salat-grusha-syr-orehi':'Груша, сыр и горсть орехов: салат за 10 минут, который гости съедают раньше горячего',
'tykvennyi-krem-sup-s-yablokom':'Тыкву теперь готовлю только так: добавляю одно яблоко — суп получается нежным и совсем не приторным',
'udon-s-tykvoi-i-gribami':'Когда за окном холодно, готовлю эту лапшу: тыква и грибы — ужин за 25 минут без возни',
'vinegret-s-zharenoi-tykvoi':'Винегрет готовлю не как все: добавляю жареную тыкву — вкус становится совсем другим',
'yabloki-s-indeikoi-i-timyanom':'Яблоки больше не отправляю только в шарлотку: запекаю с индейкой — домашние просят готовить ещё',
'zachem-myt-banany-i-mandariny':'Даже бананы мою перед едой: зачем это делать, если кожуру всё равно выбрасываем',
'zamorozhennye-ovoshi-ne-pustye':'Замороженные овощи зря считают «пустыми»: готовлю их без разморозки — и не получаю кашу',
}

AUTHORS={
'Илья Титюлькин':('author-ilya.html','/assets/authors/ilya.jpg','Продукты, выбор и сезонная кухня'),
'Эльвира Шайберт':('author-elvira.html','/assets/authors/elvira-v2.jpg','Дом, хранение и практичные рецепты'),
'Екатерина Рукопляс':('author-ekaterina.html','/assets/authors/ekaterina.jpg','Безопасность еды и домашняя кухня'),
}

def esc(s): return html.escape(str(s or ''),quote=True)
def fmt_date(s):
    try:
        d=datetime.fromisoformat(str(s).replace('Z','+00:00'))
        months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
        return f'{d.day} {months[d.month-1]} {d.year}, {d:%H:%M}'
    except Exception:return str(s or '')

def unpack_images():
    parts=sorted(BUNDLE.glob('part-*'))
    if not parts: raise SystemExit('image bundle parts not found')
    encoded=''.join(p.read_text('utf-8').strip() for p in parts)
    raw=base64.b64decode(encoded)
    td=Path(tempfile.mkdtemp(prefix='provkus-v5-'))
    with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as tf:
        tf.extractall(td)
    candidates=[]
    for p in sorted(td.rglob('*')):
        if p.suffix.lower() not in {'.jpg','.jpeg','.png','.webp'}: continue
        try:
            with Image.open(p) as im:
                w,h=im.size
            if w>=900 and h>=500: candidates.append((p,w/h))
        except Exception: pass
    landscape=[p for p,r in candidates if r>=1.25]
    rest=[p for p,r in candidates if r<1.25]
    return landscape+rest

def make_cover(src,dst):
    with Image.open(src).convert('RGB') as im:
        im=ImageOps.exif_transpose(im)
        target=(1600,900)
        scale=max(target[0]/im.width,target[1]/im.height)
        nw,nh=round(im.width*scale),round(im.height*scale)
        im=im.resize((nw,nh),Image.Resampling.LANCZOS)
        left=(nw-target[0])//2; top=(nh-target[1])//2
        im=im.crop((left,top,left+target[0],top+target[1]))
        im=ImageOps.autocontrast(im,cutoff=0.4)
        im=ImageEnhance.Color(im).enhance(1.06)
        im=ImageEnhance.Contrast(im).enhance(1.03)
        im.save(dst,'WEBP',quality=88,method=6)

def update_jsonld(txt,post):
    pat=r'<script type="application/ld\+json">(.*?)</script>'
    def repl(m):
        try: obj=json.loads(m.group(1))
        except Exception:return m.group(0)
        typ=obj.get('@type')
        if typ in ('Article','NewsArticle','Recipe','BlogPosting'):
            obj['headline']=post['headline']
            if typ=='Recipe': obj['name']=post['headline']
            obj['image']=[post['image']]
            obj['thumbnailUrl']=post['image']
        return '<script type="application/ld+json">'+json.dumps(obj,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+'</script>'
    return re.sub(pat,repl,txt,flags=re.S)

def update_article(post):
    f=ROOT/'articles'/(post['slug']+'.html')
    if not f.exists(): return
    s=f.read_text('utf-8')
    title=post['headline']+' — ProVkus'
    s=re.sub(r'<title>.*?</title>',f'<title>{esc(title)}</title>',s,count=1,flags=re.S)
    s=re.sub(r'<meta property="og:title" content="[^"]*">',f'<meta property="og:title" content="{esc(post["headline"])}">',s,count=1)
    if 'property="og:image"' in s:s=re.sub(r'<meta property="og:image" content="[^"]*">',f'<meta property="og:image" content="{post["image"]}">',s,count=1)
    if 'name="twitter:image"' in s:s=re.sub(r'<meta name="twitter:image" content="[^"]*">',f'<meta name="twitter:image" content="{post["image"]}">',s,count=1)
    s=re.sub(r'<h1 class="article-title">.*?</h1>',f'<h1 class="article-title">{esc(post["headline"])}</h1>',s,count=1,flags=re.S)
    s=re.sub(r'(<img[^>]*class="article-cover"[^>]*src=")[^"]+("[^>]*>)',rf'\1{post["image"]}\2',s,count=1)
    s=re.sub(r'(<img[^>]*src=")[^"]+("[^>]*class="article-cover"[^>]*>)',rf'\1{post["image"]}\2',s,count=1)
    if post['author']=='Эльвира Шайберт':
        s=s.replace('/assets/authors/elvira.jpg','/assets/authors/elvira-v2.jpg').replace('../assets/authors/elvira.jpg','../assets/authors/elvira-v2.jpg')
    credit=f'<div class="photo-credit">Фото: {PHOTO_SOURCE}</div>'
    if 'class="photo-credit"' in s:s=re.sub(r'<div class="photo-credit">.*?</div>',credit,s,count=1,flags=re.S)
    else:
        m=re.search(r'<img[^>]*class="article-cover"[^>]*>',s)
        if m:s=s[:m.end()]+credit+s[m.end():]
    s=update_jsonld(s,post)
    f.write_text(s,'utf-8')

def card(p):
    return f'''<a class="story-card feed-card" href="/articles/{esc(p['slug'])}.html"><img src="{esc(p['image'])}" width="1200" height="675" loading="lazy" decoding="async" alt="{esc(p.get('imageAlt') or p['headline'])}"><div class="story-body"><span class="badge">{esc(p.get('category','Материал'))}</span><h3>{esc(p['headline'])}</h3><div class="story-meta"><span>{esc(p.get('author',''))}</span><span>•</span><time datetime="{esc(p.get('publishedAt',''))}">{esc(fmt_date(p.get('publishedAt','')))}</time></div></div></a>'''

def nav():
    return '''<nav class="main-nav"><a href="/category.html?rubric=Рецепты">Рецепты</a><a href="/category.html?rubric=Продукты%20и%20выбор">Продукты</a><a href="/category.html?rubric=Дом%20и%20хранение">Дом</a><a href="/category.html?rubric=Безопасность%20еды">Безопасность</a><a href="/authors.html">Авторы</a></nav>'''

def header():return f'''<header class="site-header"><div class="container topbar"><a class="brand" href="/">Pro<b>Vkus</b></a>{nav()}</div></header>'''
def footer():return '''<footer class="site-footer"><div class="container footer-grid"><div class="footer-about"><div class="brand">Pro<b>Vkus</b></div><p>Практичное медиа о еде, продуктах и доме.</p></div><div><h4>Читать</h4><a href="/category.html">Все материалы</a><a href="/authors.html">Авторы</a></div><div><h4>Редакция</h4><a href="/editorial.html">О редакции</a><a href="/contacts.html">Контакты</a></div><div><h4>Документы</h4><a href="/privacy.html">Конфиденциальность</a><a href="/personal-data.html">Персональные данные</a></div></div></footer>'''

def make_index(posts):
    lead=posts[0]; side=posts[1:4]; fresh=posts[4:16]
    def side_card(p):return f'''<a class="stack-card" href="/articles/{esc(p['slug'])}.html"><img src="{esc(p['image'])}" width="1200" height="675" alt="{esc(p.get('imageAlt') or p['headline'])}"><div class="stack-copy"><span class="badge">{esc(p.get('category','Материал'))}</span><h3>{esc(p['headline'])}</h3><div class="story-meta"><span>{esc(p['author'])}</span><span>•</span><time datetime="{esc(p['publishedAt'])}">{esc(fmt_date(p['publishedAt']))}</time></div></div></a>'''
    authors=''.join(f'''<a class="author-card" href="/{u}"><img src="{pic}" width="320" height="320" alt="{esc(name)}"><h3>{esc(name)}</h3><p>{esc(role)}</p></a>''' for name,(u,pic,role) in AUTHORS.items())
    htmltxt=f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProVkus — рецепты, продукты и домашние советы</title><meta name="description" content="ProVkus — практичное медиа о сезонных рецептах, продуктах, хранении и доме."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="https://provkus-media.ru/"><link rel="icon" href="/favicon.png"><meta property="og:image" content="{esc(lead['image'])}"><link rel="stylesheet" href="/assets/styles.css"></head><body>{header()}<main><section class="hero"><div class="container hero-grid"><a class="lead-card" href="/articles/{esc(lead['slug'])}.html"><img fetchpriority="high" width="1600" height="900" src="{esc(lead['image'])}" alt="{esc(lead.get('imageAlt') or lead['headline'])}"><div class="lead-copy"><div class="eyebrow">{esc(lead.get('category','Материал'))}</div><h1>{esc(lead['headline'])}</h1><p>{esc(lead.get('description',''))}</p><div class="meta-row"><span>{esc(lead['author'])}</span><span>•</span><span>{esc(fmt_date(lead['publishedAt']))}</span></div></div></a><div class="hero-side">{''.join(side_card(x) for x in side)}</div></div></section><section class="section"><div class="container"><div class="section-head"><div><h2 class="section-title">Свежие материалы</h2><div class="section-sub">Новые рецепты, продукты и домашние советы</div></div><a class="link-more" href="/category.html">Все материалы →</a></div><div class="story-grid">{''.join(card(x) for x in fresh)}</div><div id="infinite-feed" class="story-grid infinite-feed" data-start="16"></div><div id="feed-sentinel"></div></div></section><section class="section"><div class="container feature-band"><div class="section-head"><h2 class="section-title">Авторы ProVkus</h2></div><div class="author-grid">{authors}</div></div></section></main>{footer()}<script src="/assets/app.js"></script><script src="/assets/feed.js"></script></body></html>'''
    (ROOT/'index.html').write_text(htmltxt,'utf-8')

def make_category(posts):
    chips=['Все','Рецепты','Продукты и выбор','Дом и хранение','Безопасность еды']
    chiphtml=''.join(f'<button class="rubric-chip" data-rubric="{esc(x)}">{esc(x)}</button>' for x in chips)
    text=f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Все материалы — ProVkus</title><meta name="description" content="Все материалы ProVkus: рецепты, продукты, хранение, безопасность еды и домашние советы."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="https://provkus-media.ru/category.html"><link rel="icon" href="/favicon.png"><link rel="stylesheet" href="/assets/styles.css"></head><body>{header()}<main class="container"><section class="section"><div class="section-head"><div><h1 class="section-title">Все материалы</h1><div class="section-sub">{len(posts)} публикации</div></div></div><div class="rubric-chips">{chiphtml}</div><div class="story-grid" id="category-grid">{''.join(card(p) for p in posts)}</div></section></main>{footer()}<script src="/assets/app.js"></script><script src="/assets/category-filter.js"></script></body></html>'''
    (ROOT/'category.html').write_text(text,'utf-8')

def make_authors(posts):
    for name,(page,pic,role) in AUTHORS.items():
        mine=[p for p in posts if p.get('author')==name]
        bio={'Илья Титюлькин':'Имеет профильное образование и опыт работы с информационными и потребительскими материалами. Пишет о продуктах, выборе и сезонной кухне.','Эльвира Шайберт':'Имеет профильное образование и опыт редакционной работы с практическими материалами. Пишет о доме, хранении и понятных домашних рецептах.','Екатерина Рукопляс':'Имеет профильное образование и опыт подготовки справочных и редакционных материалов. Пишет о безопасности еды и домашней кухне.'}[name]
        schema=json.dumps({'@context':'https://schema.org','@type':'ProfilePage','mainEntity':{'@type':'Person','name':name,'jobTitle':role,'image':'https://provkus-media.ru'+pic,'url':'https://provkus-media.ru/'+page}},ensure_ascii=False)
        out=f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(name)} — автор ProVkus</title><meta name="description" content="{esc(bio)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="https://provkus-media.ru/{page}"><link rel="stylesheet" href="/assets/styles.css"><link rel="icon" href="/favicon.png"><script type="application/ld+json">{schema}</script></head><body>{header()}<main class="container"><section class="author-hero"><img class="author-photo" width="440" height="440" src="{pic}?v=20260922v5" alt="{esc(name)}"><div><div class="eyebrow">Автор ProVkus</div><h1>{esc(name)}</h1><p><strong>{esc(role)}</strong></p><p>{esc(bio)}</p></div></section><section class="section"><div class="section-head"><h2 class="section-title">Материалы автора</h2><span class="section-sub">{len(mine)} публикаций</span></div><div class="story-grid">{''.join(card(p) for p in mine)}</div></section></main>{footer()}<script src="/assets/app.js"></script></body></html>'''
        (ROOT/page).write_text(out,'utf-8')
    cards=''.join(f'''<a class="author-card" href="/{p}"><img width="320" height="320" src="{pic}?v=20260922v5" alt="{esc(n)}"><h3>{esc(n)}</h3><p>{esc(role)}</p></a>''' for n,(p,pic,role) in AUTHORS.items())
    (ROOT/'authors.html').write_text(f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Авторы ProVkus</title><meta name="description" content="Авторы ProVkus: продукты, хранение, безопасность еды и сезонные рецепты."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="https://provkus-media.ru/authors.html"><link rel="stylesheet" href="/assets/styles.css"><link rel="icon" href="/favicon.png"></head><body>{header()}<main class="container"><section class="section"><div class="section-head"><div><h1 class="section-title">Авторы ProVkus</h1><div class="section-sub">Три редакционных направления</div></div></div><div class="author-grid">{cards}</div></section></main>{footer()}</body></html>''','utf-8')

def patch_admin_refs():
    for path in [ROOT/'assets/admin.js',ROOT/'assets/admin-enhance.js']:
        if path.exists():
            s=path.read_text('utf-8').replace('assets/authors/elvira.jpg','assets/authors/elvira-v2.jpg')
            path.write_text(s,'utf-8')

posts=json.loads(POSTS.read_text('utf-8'))
images=unpack_images()
if len(images)<len(posts): raise SystemExit(f'need {len(posts)} generated images, found {len(images)}')
COVERS.mkdir(parents=True,exist_ok=True)
for i,p in enumerate(posts):
    p['headline']=HEADLINES.get(p['slug'],p['headline'])
    dst=COVERS/(p['slug']+'.webp')
    make_cover(images[i],dst)
    p['image']=f'https://provkus-media.ru/assets/covers-v5/{p["slug"]}.webp'
    p['images']=[p['image']]
    p['photoSource']=PHOTO_SOURCE
    update_article(p)
POSTS.write_text(json.dumps(posts,ensure_ascii=False,indent=2),'utf-8')
# New URL for Elvira avoids stale browser/CDN cache even when the source portrait is unchanged.
if (ROOT/'assets/authors/elvira.jpg').exists(): shutil.copy2(ROOT/'assets/authors/elvira.jpg',ROOT/'assets/authors/elvira-v2.jpg')
make_index(posts);make_category(posts);make_authors(posts);patch_admin_refs()
print('v5 ready:',len(posts),'posts,',len({p['image'] for p in posts}),'unique covers')
