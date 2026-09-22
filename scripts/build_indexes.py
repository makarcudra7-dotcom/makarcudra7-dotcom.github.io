import json, html, subprocess
from pathlib import Path
from datetime import datetime, timezone

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
