import json, html, subprocess, re
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import quote

site='https://provkus-media.ru'
root=Path(__file__).resolve().parents[1]
posts=json.loads((root/'data/posts.json').read_text('utf-8'))
now=datetime.now(timezone.utc)

def parse_dt(value):
  if not value:return None
  try:return datetime.fromisoformat(value.replace('Z','+00:00')).astimezone(timezone.utc)
  except Exception:return None

def is_public(p):
  published=parse_dt(p.get('publishedAt'))
  if published and published>now:return False
  return (root/'articles'/f"{p.get('slug','')}.html").exists()

posts=[p for p in posts if is_public(p)]
posts.sort(key=lambda p:parse_dt(p.get('publishedAt')) or datetime.min.replace(tzinfo=timezone.utc),reverse=True)

# Keep rubric pages crawlable even when JavaScript or the posts request fails.
rubrics={
  'recipes.html':lambda c:'рецеп' in c,
  'products.html':lambda c:'продукт' in c or 'выбор' in c,
  'home-storage.html':lambda c:'дом' in c or 'хран' in c,
  'food-safety.html':lambda c:'безопас' in c,
}
months=['','января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
def card(p):
  date=parse_dt(p.get('publishedAt'))
  label=f'{date.day} {months[date.month]} {date.year}' if date else ''
  value=lambda key:html.escape(str(p.get(key) or ''),quote=True)
  image=value('image') or '/assets/fallback-cover.svg'
  return (f'<a class="story-card feed-card" href="/articles/{quote(p["slug"])}.html">'
          f'<img src="{image}" width="1600" height="900" loading="lazy" decoding="async" '
          f'alt="{html.escape(str(p.get("imageAlt") or p["headline"]),quote=True)}">'
          f'<div class="story-body"><span class="badge">{value("category")}</span>'
          f'<h3>{value("headline")}</h3><div class="story-meta"><span>{value("author")}</span>'
          f'<span>•</span><time datetime="{value("publishedAt")}">{label}</time>'
          '</div></div></a>')
def post_link(p):
  return '/articles/'+quote(p['slug'])+'.html'
def lead_card(p):
  return (f'<a class="lead-card" href="{post_link(p)}"><img fetchpriority="high" '
          f'decoding="async" width="1600" height="900" src="{html.escape(p.get("image") or "/assets/fallback-cover.svg",quote=True)}" '
          f'alt="{html.escape(p.get("imageAlt") or p["headline"],quote=True)}">'
          f'<div class="lead-copy"><div class="eyebrow">{html.escape(p.get("category") or "Материал")}</div>'
          f'<h1>{html.escape(p["headline"])}</h1><p>{html.escape(p.get("description") or "")}</p>'
          f'<div class="meta-row"><span>{html.escape(p.get("author") or "")}</span>'
          f'<span>•</span><time datetime="{html.escape(p.get("publishedAt") or "",quote=True)}">'
          f'{date_label(p)}</time></div></div></a>')
def date_label(p):
  date=parse_dt(p.get('publishedAt'))
  return f'{date.day} {months[date.month]} {date.year}' if date else ''
def side_card(p):
  return (f'<a class="stack-card" href="{post_link(p)}"><img loading="lazy" decoding="async" '
          f'src="{html.escape(p.get("image") or "/assets/fallback-cover.svg",quote=True)}" '
          f'width="1600" height="900" alt="{html.escape(p.get("imageAlt") or p["headline"],quote=True)}">'
          f'<div class="stack-copy"><span class="badge">{html.escape(p.get("category") or "Материал")}</span>'
          f'<h3>{html.escape(p["headline"])}</h3><div class="story-meta"><span>{html.escape(p.get("author") or "")}</span>'
          f'<span>•</span><time datetime="{html.escape(p.get("publishedAt") or "",quote=True)}">'
          f'{date_label(p)}</time></div></div></a>')
def update_home():
  if not posts:return
  page=root/'index.html';source=page.read_text('utf-8')
  featured=next((p for p in posts if p.get('featured')),posts[0])
  side=[p for p in posts if p['slug']!=featured['slug']][:3]
  used={featured['slug'],*(p['slug'] for p in side)}
  hero='<!-- HOME-HERO-START -->'+lead_card(featured)+'<div class="hero-side">'+''.join(map(side_card,side))+'</div><!-- HOME-HERO-END -->'
  if '<!-- HOME-HERO-START -->' in source:
    source=re.sub(r'<!-- HOME-HERO-START -->.*?<!-- HOME-HERO-END -->',lambda _:hero,source,count=1,flags=re.S)
  else:
    start=source.index('<div class="container hero-grid">')+len('<div class="container hero-grid">')
    end=source.index('</div></div></section>',start)+len('</div>')
    source=source[:start]+hero+source[end:]
  fresh=[p for p in posts if p['slug'] not in used][:12]
  popular=[p for p in posts if p.get('popular')][:7]
  for p in posts:
    if len(popular)>=7:break
    if p not in popular:popular.append(p)
  popular_html=''.join(
    f'<a class="popular-row" href="{post_link(p)}"><span class="popular-num">{i}</span>'
    f'<div><span class="popular-badge">{html.escape(p.get("category") or "Материал")}</span>'
    f'<strong>{html.escape(p["headline"])}</strong></div></a>'
    for i,p in enumerate(popular,1))
  lower=('<!-- HOME-LOWER-START --><div class="home-lower-grid"><aside class="popular-panel">'
         '<div class="popular-kicker">Выбор редакции</div><h2 class="popular-title">Популярное</h2>'
         '<div class="popular-list">'+popular_html+'</div></aside><div class="fresh-wrap">'
         '<div class="story-grid">'+''.join(map(card,fresh))+'</div></div></div><!-- HOME-LOWER-END -->')
  if '<!-- HOME-LOWER-START -->' in source:
    source=re.sub(r'<!-- HOME-LOWER-START -->.*?<!-- HOME-LOWER-END -->',lambda _:lower,source,count=1,flags=re.S)
  else:
    start=source.index('<div class="story-grid">',source.index('<section class="section">'))
    end=source.index('</div></div></section>',start)+len('</div>')
    source=source[:start]+lower+source[end:]
  if '<link rel="stylesheet" href="/assets/site-ui.css">' not in source:
    source=source.replace('</head>','<link rel="stylesheet" href="/assets/site-ui.css"></head>',1)
  if source!=page.read_text('utf-8'):page.write_text(source,'utf-8')

update_home()
category=root/'category.html';source=category.read_text('utf-8')
grid='<!-- CATEGORY-STATIC-START -->'+''.join(map(card,posts))+'<!-- CATEGORY-STATIC-END -->'
if '<!-- CATEGORY-STATIC-START -->' in source:
  source=re.sub(r'<!-- CATEGORY-STATIC-START -->.*?<!-- CATEGORY-STATIC-END -->',
                lambda _:grid,source,count=1,flags=re.S)
else:
  start=source.index('<div class="story-grid">')+len('<div class="story-grid">')
  end=source.index('</div></section>',start)
  source=source[:start]+grid+source[end:]
source=re.sub(r'(<div class="section-sub">)\d+ (?:публикаци[яий]+|материалов)(</div>)',
              lambda m:m.group(1)+str(len(posts))+' материалов'+m.group(2),source,count=1)
if '<link rel="stylesheet" href="/assets/site-ui.css">' not in source:
  source=source.replace('</head>','<link rel="stylesheet" href="/assets/site-ui.css"></head>',1)
if source!=category.read_text('utf-8'):category.write_text(source,'utf-8')
for name,match in rubrics.items():
  page=root/name
  source=page.read_text('utf-8')
  selected=[p for p in posts if match(str(p.get('category') or '').lower())]
  content='<!-- HUB-STATIC-START -->'+(''.join(map(card,selected)) or
    '<p class="section-sub">В этой рубрике пока нет публикаций.</p>')+'<!-- HUB-STATIC-END -->'
  source,n=re.subn(r'(<div id="categoryHubGrid" class="story-grid">).*?(</div></section></main>)',
                   lambda m:m.group(1)+content+m.group(2),source,count=1,flags=re.S)
  if n!=1:raise RuntimeError(f'Category grid missing in {name}')
  source=re.sub(r'(<span id="categoryHubCount" class="section-sub">).*?(</span>)',
                lambda m:m.group(1)+str(len(selected))+' материалов'+m.group(2),source,count=1)
  if source!=page.read_text('utf-8'):page.write_text(source,'utf-8')

fixed=[
  (site+'/', None),
  (site+'/category.html', None),
  (site+'/recipes.html', None),
  (site+'/products.html', None),
  (site+'/home-storage.html', None),
  (site+'/food-safety.html', None),
  (site+'/authors.html', None),
  (site+'/author-ilya.html', None),
  (site+'/author-elvira.html', None),
  (site+'/author-ekaterina.html', None),
  (site+'/editorial.html', None),
  (site+'/contacts.html', None),
  (site+'/editorial-policy.html', None),
]
urls=[]
for loc,last in fixed:
  urls.append(f'<url><loc>{html.escape(loc)}</loc></url>')
for p in posts:
  loc=p.get('url') or f"{site}/articles/{p['slug']}.html"
  last=(p.get('updatedAt') or p.get('publishedAt') or '')[:10]
  lm=f'<lastmod>{last}</lastmod>' if last else ''
  img=p.get('image') or ''
  image=''
  if img:
    title=html.escape((p.get('headline') or '').strip())
    image=f'<image:image><image:loc>{html.escape(img)}</image:loc><image:title>{title}</image:title></image:image>'
  urls.append(f'<url><loc>{html.escape(loc)}</loc>{lm}{image}</url>')
sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'+'\n'.join(urls)+'\n</urlset>\n'
(root/'sitemap.xml').write_text(sitemap,'utf-8')
# RSS and manual newsletter pushes use one canonical generator.
subprocess.run(['node','scripts/build-feed.js'],cwd=root,check=True)
