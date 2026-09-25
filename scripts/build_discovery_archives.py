import json, html, re, shutil
from collections import defaultdict
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import quote

SITE='https://provkus-media.ru'
ROOT=Path(__file__).resolve().parents[1]
POSTS=json.loads((ROOT/'data/posts.json').read_text('utf-8'))
AUTHORS=json.loads((ROOT/'data/authors.json').read_text('utf-8'))
AUTHOR_URL={a['name']:'/'+a['url'] for a in AUTHORS}
NOW=datetime.now(timezone.utc)
MONTHS_RU=['','январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь']
MONTHS_GEN=['','января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

def parse_dt(value):
    if not value: return None
    try: return datetime.fromisoformat(value.replace('Z','+00:00')).astimezone(timezone.utc)
    except Exception: return None

def public_posts():
    out=[]
    for p in POSTS:
        dt=parse_dt(p.get('publishedAt'))
        if dt and dt>NOW: continue
        slug=p.get('slug') or ''
        if not slug or not (ROOT/'articles'/f'{slug}.html').exists(): continue
        out.append(p)
    out.sort(key=lambda p:parse_dt(p.get('publishedAt')) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return out

POSTS=public_posts()

def esc(v): return html.escape(str(v or ''), quote=True)
def date_label(p):
    d=parse_dt(p.get('publishedAt'))
    return f'{d.day} {MONTHS_GEN[d.month]} {d.year}' if d else ''
def article_url(p): return f'/articles/{quote(p["slug"])}.html'

def card(p):
    image=p.get('image') or '/assets/fallback-cover.svg'
    return (f'<a class="story-card feed-card" href="{article_url(p)}">'
            f'<img src="{esc(image)}" width="1600" height="900" loading="lazy" decoding="async" alt="{esc(p.get("imageAlt") or p.get("headline"))}">'
            f'<div class="story-body"><span class="badge">{esc(p.get("category") or "Материал")}</span>'
            f'<h3>{esc(p.get("headline"))}</h3><div class="story-meta"><span>{esc(p.get("author"))}</span><span>•</span>'
            f'<time datetime="{esc(p.get("publishedAt"))}">{date_label(p)}</time></div></div></a>')

def page_html(title, description, canonical, body, items=None):
    itemlist=[]
    for i,p in enumerate(items or [],1):
        itemlist.append({'@type':'ListItem','position':i,'url':SITE+article_url(p),'name':p.get('headline') or ''})
    schema={'@context':'https://schema.org','@type':'CollectionPage','name':title,'url':canonical,'inLanguage':'ru-RU','isPartOf':{'@type':'WebSite','name':'ProVkus','url':SITE+'/'}}
    if itemlist: schema['mainEntity']={'@type':'ItemList','itemListElement':itemlist}
    return f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><meta name="description" content="{esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{esc(canonical)}"><link rel="stylesheet" href="/assets/public.css?v=20260925-clean1"><script type="application/ld+json">{json.dumps(schema,ensure_ascii=False).replace('</','<\\/')}</script></head><body><header class="site-header"><div class="container topbar"><a class="brand" href="/">Pro<b>Vkus</b></a><nav class="main-nav"><a href="/recipes.html">Рецепты</a><a href="/products.html">Продукты</a><a href="/home-storage.html">Дом</a><a href="/food-safety.html">Безопасность</a><a href="/authors.html">Авторы</a><a href="/archive.html" aria-current="page">Архив</a></nav></div></header><main class="container"><section class="section">{body}</section></main><footer class="site-footer"><div class="container footer-bottom"><span>ProVkus — практичное медиа о еде и доме.</span><a href="/archive.html">Архив публикаций</a></div></footer><script src="/assets/app.js?v=20260925-clean1"></script></body></html>'''

def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content,'utf-8')

def archive_body(title, subtitle, posts, crumbs='', extra=''):
    return (f'<div class="breadcrumbs"><a href="/">Главная</a> / <a href="/archive.html">Архив</a>{crumbs}</div>'
            f'<div class="section-head"><div><h1 class="section-title">{esc(title)}</h1><div class="section-sub">{esc(subtitle)}</div></div></div>'
            + extra + f'<div class="story-grid">{"".join(card(p) for p in posts)}</div>')

# Rebuild generated archive tree from canonical post index.
archive_dir=ROOT/'archive'
if archive_dir.exists(): shutil.rmtree(archive_dir)

years=defaultdict(list); months=defaultdict(list); days=defaultdict(list)
for p in POSTS:
    d=parse_dt(p.get('publishedAt'))
    if not d: continue
    years[d.year].append(p); months[(d.year,d.month)].append(p); days[(d.year,d.month,d.day)].append(p)

month_links=[]
for (y,m),items in sorted(months.items(), reverse=True):
    month_links.append(f'<a class="chip" href="/archive/{y}/{m:02d}/">{MONTHS_RU[m].capitalize()} {y} · {len(items)}</a>')
root_extra='<div class="chips" style="margin-bottom:24px">'+''.join(month_links)+'</div>'
write(ROOT/'archive.html', page_html('Архив публикаций ProVkus','Все публикации ProVkus по датам. Удобная навигация по годам, месяцам и дням.',SITE+'/archive.html',archive_body('Архив публикаций',f'{len(POSTS)} материалов',POSTS[:24],extra=root_extra),POSTS[:24]))

archive_urls=[SITE+'/archive.html']
for y,items in sorted(years.items(), reverse=True):
    mlinks=''.join(f'<a class="chip" href="/archive/{y}/{m:02d}/">{MONTHS_RU[m].capitalize()} · {len(months[(y,m)])}</a>' for m in sorted({parse_dt(p.get("publishedAt")).month for p in items}, reverse=True))
    path=ROOT/'archive'/str(y)/'index.html'; url=f'{SITE}/archive/{y}/'
    write(path,page_html(f'Архив {y} — ProVkus',f'Публикации ProVkus за {y} год.',url,archive_body(f'Публикации за {y} год',f'{len(items)} материалов',items[:36],crumbs=f' / {y}',extra='<div class="chips" style="margin-bottom:24px">'+mlinks+'</div>'),items[:36])); archive_urls.append(url)

for (y,m),items in sorted(months.items(), reverse=True):
    dlinks=''.join(f'<a class="chip" href="/archive/{y}/{m:02d}/{d:02d}/">{d} {MONTHS_GEN[m]} · {len(days[(y,m,d)])}</a>' for d in sorted({parse_dt(p.get("publishedAt")).day for p in items}, reverse=True))
    path=ROOT/'archive'/str(y)/f'{m:02d}'/'index.html'; url=f'{SITE}/archive/{y}/{m:02d}/'
    write(path,page_html(f'{MONTHS_RU[m].capitalize()} {y} — ProVkus',f'Публикации ProVkus за {MONTHS_RU[m]} {y} года.',url,archive_body(f'{MONTHS_RU[m].capitalize()} {y}',f'{len(items)} материалов',items,crumbs=f' / <a href="/archive/{y}/">{y}</a> / {m:02d}',extra='<div class="chips" style="margin-bottom:24px">'+dlinks+'</div>'),items)); archive_urls.append(url)

for (y,m,d),items in sorted(days.items(), reverse=True):
    path=ROOT/'archive'/str(y)/f'{m:02d}'/f'{d:02d}'/'index.html'; url=f'{SITE}/archive/{y}/{m:02d}/{d:02d}/'
    write(path,page_html(f'{d} {MONTHS_GEN[m]} {y} — ProVkus',f'Публикации ProVkus за {d} {MONTHS_GEN[m]} {y} года.',url,archive_body(f'{d} {MONTHS_GEN[m]} {y}',f'{len(items)} материалов',items,crumbs=f' / <a href="/archive/{y}/">{y}</a> / <a href="/archive/{y}/{m:02d}/">{m:02d}</a> / {d:02d}'),items)); archive_urls.append(url)

# Add a stable archive link to public navigation and strengthen article schema.
public_html=[p for p in ROOT.glob('*.html') if p.name!='admin.html']+list((ROOT/'articles').glob('*.html'))
for path in public_html:
    source=path.read_text('utf-8')
    if 'class="main-nav"' in source and 'href="/archive.html"' not in source and 'href="../archive.html"' not in source:
        href='../archive.html' if path.parent.name=='articles' else '/archive.html'
        source=re.sub(r'(</nav>)',f'<a href="{href}">Архив</a>\\1',source,count=1)
    if path.parent.name=='articles':
        slug=path.stem; post=next((p for p in POSTS if p.get('slug')==slug),None)
        if post:
            canonical=post.get('url') or f'{SITE}/articles/{slug}.html'
            def repl(m):
                raw=m.group(1)
                try: data=json.loads(raw)
                except Exception: return m.group(0)
                candidates=[]
                if isinstance(data,dict) and isinstance(data.get('@graph'),list): candidates=[x for x in data['@graph'] if isinstance(x,dict)]
                elif isinstance(data,dict): candidates=[data]
                changed=False
                for obj in candidates:
                    typ=obj.get('@type'); types=typ if isinstance(typ,list) else [typ]
                    if not any(t in ('Article','NewsArticle','Recipe') for t in types): continue
                    obj['mainEntityOfPage']={'@type':'WebPage','@id':canonical}
                    obj['publisher']={'@type':'Organization','name':'ProVkus','url':SITE+'/','logo':{'@type':'ImageObject','url':SITE+'/assets/provkus-logo.svg'}}
                    obj['inLanguage']='ru-RU'; obj['isAccessibleForFree']=True
                    if post.get('category'): obj['articleSection']=post['category']
                    if post.get('image'): obj['image']=[post['image']]
                    if post.get('publishedAt'): obj['datePublished']=post['publishedAt']
                    if post.get('updatedAt') or post.get('publishedAt'): obj['dateModified']=post.get('updatedAt') or post.get('publishedAt')
                    author=obj.get('author') if isinstance(obj.get('author'),dict) else {'@type':'Person','name':post.get('author') or ''}
                    if post.get('author'): author['name']=post['author']
                    if post.get('author') in AUTHOR_URL: author['url']=SITE+AUTHOR_URL[post['author']]
                    obj['author']=author; changed=True
                return '<script type="application/ld+json">'+json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+'</script>' if changed else m.group(0)
            source=re.sub(r'<script type="application/ld\+json">(.*?)</script>',repl,source,count=1,flags=re.S)
            if post.get('publishedAt') and 'property="article:published_time"' not in source:
                meta=f'<meta property="article:published_time" content="{esc(post["publishedAt"])}"><meta property="article:modified_time" content="{esc(post.get("updatedAt") or post["publishedAt"])}">'
                source=source.replace('</head>',meta+'</head>',1)
    path.write_text(source,'utf-8')

# Ensure the CMS loads the remote-image Discover guard.
admin=ROOT/'admin.html'
if admin.exists():
    source=admin.read_text('utf-8')
    if 'admin-discover-guard.js' not in source:
        source=source.replace('</body>','<script src="assets/admin-discover-guard.js?v=20260925-1"></script></body>',1)
        admin.write_text(source,'utf-8')

# Append generated archive URLs to the canonical sitemap after build_indexes.py.
sitemap=ROOT/'sitemap.xml'
if sitemap.exists():
    xml=sitemap.read_text('utf-8')
    xml=re.sub(r'\s*<url><loc>https://provkus-media\.ru/archive(?:\.html|/)[^<]*</loc>(?:<lastmod>[^<]+</lastmod>)?</url>','',xml)
    newest=(POSTS[0].get('updatedAt') or POSTS[0].get('publishedAt') or '')[:10] if POSTS else ''
    entries='\n'.join(f'<url><loc>{esc(u)}</loc>{f"<lastmod>{newest}</lastmod>" if newest else ""}</url>' for u in archive_urls)
    xml=xml.replace('</urlset>',entries+'\n</urlset>')
    sitemap.write_text(xml,'utf-8')

print(f'Generated {len(archive_urls)} archive URLs for {len(POSTS)} public posts')
