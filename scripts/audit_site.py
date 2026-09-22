"""Offline crawl/metadata regression check. This does not prove Google indexing."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
from datetime import datetime, timezone
import json, re, xml.etree.ElementTree as ET
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SITE='https://provkus-media.ru'
LOGO=SITE+'/assets/provkus-logo.svg'

class Page(HTMLParser):
 def __init__(self,text):
  super().__init__(); self.tags=[];self.feed(text)
 def handle_starttag(self,t,a):self.tags.append((t,dict(a)))
 def find(self,tag,**attrs):return [a for t,a in self.tags if t==tag and all(a.get(k)==v for k,v in attrs.items())]

posts=json.loads((ROOT/'data/posts.json').read_text('utf-8'))
authors=json.loads((ROOT/'data/authors.json').read_text('utf-8'))
author_urls={a['name']:SITE+'/'+a['url'] for a in authors}
errors=[];now=datetime.now(timezone.utc)
def check(ok,msg):
 if not ok:errors.append(msg)
def parse_dt(v):
 try:return datetime.fromisoformat((v or '').replace('Z','+00:00')).astimezone(timezone.utc)
 except Exception:return None

def ld_nodes(text):
 out=[]
 for data in re.findall(r'<script type="application/ld\+json"(?: id="[^"]*")?>(.*?)</script>',text,re.S|re.I):
  try:
   obj=json.loads(data)
   if isinstance(obj,dict) and isinstance(obj.get('@graph'),list):out.extend(obj['@graph'])
   else:out.append(obj)
  except Exception as e:errors.append(f'Invalid JSON-LD: {e}')
 return [x for x in out if isinstance(x,dict)]

sitemap=ET.parse(ROOT/'sitemap.xml');locs={e.text for e in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
public_count=0
for p in posts:
 f=ROOT/'articles'/f'{p["slug"]}.html';published=parse_dt(p.get('publishedAt'));future=bool(published and published>now)
 check(f.exists(),f'{f.name}: missing article file')
 if not f.exists():continue
 text=f.read_text('utf-8');s=Page(text)
 check(len(s.find('h1'))==1,f'{f.name}: h1')
 canon=s.find('link',rel='canonical');check(bool(canon),f'{f.name}: canonical missing')
 if canon:check(canon[0].get('href')==p['url'],f'{f.name}: canonical mismatch')
 check(p['url'].startswith(SITE+'/'),f'{f.name}: non-HTTPS canonical')
 if future:
  check(p['url'] not in locs,f'{f.name}: future URL leaked into sitemap')
 else:
  public_count+=1;check(p['url'] in locs,f'{f.name}: sitemap')
 robots=s.find('meta',name='robots');check(bool(robots),f'{f.name}: robots meta missing')
 if robots:
  rv=robots[0].get('content','').lower();check('max-image-preview:large' in rv,f'{f.name}: large previews');check('max-snippet:-1' in rv,f'{f.name}: max snippet')
 og=s.find('meta',property='og:image');check(bool(og),f'{f.name}: og image missing')
 if og:check(og[0].get('content')==p.get('image'),f'{f.name}: og image mismatch')
 check(bool(s.find('meta',property='og:url')),f'{f.name}: og:url')
 check(bool(s.find('link',rel='alternate',type='application/rss+xml')),f'{f.name}: RSS discovery')
 nodes=ld_nodes(text)
 article=next((x for x in nodes if x.get('@type') in ('Article','NewsArticle','BlogPosting')),None)
 check(article is not None,f'{f.name}: Article JSON-LD')
 if article:
  check(article.get('headline')==p.get('headline','').strip(),f'{f.name}: schema headline')
  check(article.get('image')==(p.get('images') or ([p.get('image')] if p.get('image') else [])),f'{f.name}: schema image')
  check(article.get('author',{}).get('url')==author_urls.get(p.get('author'),SITE+'/authors.html'),f'{f.name}: author URL')
  check(article.get('publisher',{}).get('logo',{}).get('url')==LOGO,f'{f.name}: publisher logo')
 check(any(x.get('@type')=='BreadcrumbList' for x in nodes),f'{f.name}: breadcrumb schema')
 # Recipe rich-result markup must not be emitted until dedicated ingredient/instruction fields exist.
 check(not any(x.get('@type')=='Recipe' for x in nodes),f'{f.name}: incomplete Recipe schema')
 for u in p.get('images') or ([p.get('image')] if p.get('image') else []):
  if not u:continue
  up=urlparse(u)
  if up.netloc not in ('','provkus-media.ru'):continue
  img_path=ROOT/up.path.lstrip('/')
  check(img_path.exists(),f'{f.name}: image missing {up.path}')
  if img_path.exists() and img_path.suffix.lower() not in ('.svg',):
   im=Image.open(img_path);check(im.width>=1200,f'{f.name}: image too small')

home=(ROOT/'index.html').read_text('utf-8');home_nodes=ld_nodes(home)
check(any(x.get('@type')=='Organization' and x.get('name')=='ProVkus' for x in home_nodes),'index: Organization schema')
check(any(x.get('@type')=='WebSite' and x.get('name')=='ProVkus' for x in home_nodes),'index: WebSite schema')
check('rel="icon"' in home,'index: favicon link')
check((ROOT/'assets/provkus-logo.svg').exists(),'organization logo missing')
if (ROOT/'assets/provkus-logo.svg').exists():
 logo=(ROOT/'assets/provkus-logo.svg').read_text('utf-8');check('width="512"' in logo and 'height="512"' in logo,'organization logo dimensions')

for f in ROOT.rglob('*.html'):
 s=Page(f.read_text('utf-8'))
 for tag,a in s.tags:
  for key in ['href','src']:
   if key not in a:continue
   u=urlparse(a[key])
   if u.scheme not in ('','http','https') or u.netloc not in ('','provkus-media.ru'):continue
   if not u.path:continue
   dest=(ROOT/unquote(u.path).lstrip('/')) if u.path.startswith('/') else (f.parent/unquote(u.path))
   check(dest.exists(),f'{f.relative_to(ROOT)}: missing {u.path}')

check(public_count+9==len(locs),f'Sitemap inventory mismatch: public={public_count}, sitemap={len(locs)}')
print(json.dumps({'posts':len(posts),'public_articles':public_count,'sitemap_urls':len(locs),'errors':errors},ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
