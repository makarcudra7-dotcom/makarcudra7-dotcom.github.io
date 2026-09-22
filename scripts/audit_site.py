"""Offline crawl/metadata regression check. This does not prove Google indexing."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import json, xml.etree.ElementTree as ET
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__(); self.tags=[];self.feed(text)
 def handle_starttag(self,t,a):self.tags.append((t,dict(a)))
 def find(self,tag,**attrs):return [a for t,a in self.tags if t==tag and all(a.get(k)==v for k,v in attrs.items())]
posts=json.loads((ROOT/'data/posts.json').read_text()); errors=[]
def check(ok,msg):
 if not ok:errors.append(msg)
sitemap=ET.parse(ROOT/'sitemap.xml');locs={e.text for e in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
for p in posts:
 f=ROOT/'articles'/f'{p["slug"]}.html';text=f.read_text();s=Page(text)
 check(len(s.find('h1'))==1,f'{f.name}: h1')
 check(s.find('link',rel='canonical')[0]['href']==p['url'],f'{f.name}: canonical')
 check(p['url'] in locs,f'{f.name}: sitemap')
 check('max-image-preview:large' in s.find('meta',name='robots')[0]['content'],f'{f.name}: large previews')
 check(s.find('meta',property='og:image')[0]['content']==p['image'],f'{f.name}: og image')
 import re
 for data in re.findall(r'<script type="application/ld\+json">(.*?)</script>',text):
  o=json.loads(data);check(o.get('image')==p['images'],f'{f.name}: schema image')
 for u in p['images']:
  im=Image.open(ROOT/urlparse(u).path.lstrip('/'));check(im.width>=1200,f'{f.name}: image too small')
for f in ROOT.rglob('*.html'):
 s=Page(f.read_text())
 for tag,a in s.tags:
  for key in ['href','src']:
   if key not in a:continue
   u=urlparse(a[key])
   if u.scheme not in ('','http','https') or u.netloc not in ('','provkus-media.ru'):continue
   if not u.path:continue
   dest=(ROOT/unquote(u.path).lstrip('/')) if u.path.startswith('/') else (f.parent/unquote(u.path))
   check(dest.exists(),f'{f.relative_to(ROOT)}: missing {u.path}')
check(len(posts)==len(list((ROOT/'articles').glob('*.html'))),'Post/article inventory mismatch')
print(json.dumps({'articles':len(posts),'sitemap_urls':len(locs),'errors':errors},ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
