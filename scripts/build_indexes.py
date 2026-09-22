import json, html
from pathlib import Path
from datetime import datetime
from email.utils import format_datetime
site='https://provkus-media.ru'
posts=json.loads(Path('data/posts.json').read_text('utf-8'))
fixed=[
  (site+'/', None),
  (site+'/category.html', None),
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
  image=f'<image:image><image:loc>{html.escape(img)}</image:loc></image:image>' if img else ''
  urls.append(f'<url><loc>{html.escape(loc)}</loc>{lm}{image}</url>')
sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'+'\n'.join(urls)+'\n</urlset>\n'
Path('sitemap.xml').write_text(sitemap,'utf-8')
items=[]
for p in posts[:50]:
  iso=p.get('publishedAt') or ''
  try:
    dt=datetime.fromisoformat(iso.replace('Z','+00:00'))
    pub=format_datetime(dt)
  except Exception:
    pub=''
  title=html.escape(p.get('headline',''))
  desc=html.escape(p.get('description') or p.get('headline',''))
  link=html.escape(p.get('url') or f"{site}/articles/{p['slug']}.html")
  enc=''
  if p.get('image'):
    length=Path(p['image'].replace(site+'/', '')).stat().st_size
    enc=f'<enclosure url="{html.escape(p["image"])}" type="image/jpeg" length="{length}" />'
  items.append(f'<item><title>{title}</title><link>{link}</link><guid isPermaLink="true">{link}</guid><pubDate>{pub}</pubDate><description>{desc}</description>{enc}</item>')
rss='<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>ProVkus</title><link>'+site+'/</link><description>Новые материалы ProVkus</description><language>ru-ru</language>'+''.join(items)+'</channel></rss>\n'
Path('feed.xml').write_text(rss,'utf-8')
