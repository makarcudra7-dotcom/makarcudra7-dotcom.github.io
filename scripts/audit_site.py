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
 check(not any(re.fullmatch(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}',im.get('alt',''),re.I) for im in s.find('img')),f'{f.name}: UUID used as image alt')
 check(len(s.find('h1'))==1,f'{f.name}: h1')
 check(bool(s.find('h1')) and p.get('headline','').strip() in text,f'{f.name}: visible headline')
 description=s.find('meta',name='description')
 check(bool(description) and description[0].get('content')==p.get('description'),f'{f.name}: description mismatch')
 canon=s.find('link',rel='canonical');check(bool(canon),f'{f.name}: canonical missing')
 if canon:check(canon[0].get('href')==p['url'],f'{f.name}: canonical mismatch')
 check(p['url'].startswith(SITE+'/'),f'{f.name}: non-HTTPS canonical')
 if future:
  check(p['url'] not in locs,f'{f.name}: future URL leaked into sitemap')
 else:
  public_count+=1;check(p['url'] in locs,f'{f.name}: sitemap')
 robots=s.find('meta',name='robots');check(bool(robots),f'{f.name}: robots meta missing')
 if robots:
  rv=robots[0].get('content','').lower();check('noindex' not in rv,f'{f.name}: noindex');check('max-image-preview:large' in rv,f'{f.name}: large previews');check('max-snippet:-1' in rv,f'{f.name}: max snippet')
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
featured=next((p for p in posts if p.get('featured')),posts[0] if posts else {})
home_page=Page(home)
check(bool(home_page.find('h1')) and home_page.find('h1')[0].get('class') is None,'index: visible featured headline')
check(featured.get('headline','') in home and featured.get('image','') in home,'index: featured post in crawlable HTML')
check(bool(home_page.find('meta',property='og:image')) and home_page.find('meta',property='og:image')[0].get('content')==featured.get('image'),'index: representative OG image')
check('HOME-HERO-START' in home and 'HOME-LOWER-START' in home,'index: static feed')
check('public.css' in home or 'site-ui.css' in home,'index: critical styles in head')
css_names=('styles.css','overrides.css','author-fix.css','site-ui.css','community-extra.css','theme.css','seasonal.css')
expected_css='\n'.join((ROOT/'assets'/name).read_text('utf-8') for name in css_names).rstrip('\n')+'\n'
check((ROOT/'assets/public.css').read_text('utf-8')==expected_css,'public stylesheet bundle is stale')
category=Page((ROOT/'category.html').read_text('utf-8'))
category_links={urlparse(a.get('href','')).path.rsplit('/',1)[-1][:-5] for a in category.find('a') if a.get('href','').startswith('/articles/') and a.get('href','').endswith('.html')}
check(category_links=={p['slug'] for p in posts if not parse_dt(p.get('publishedAt')) or parse_dt(p.get('publishedAt'))<=now},'category: static inventory')
for author in authors:
 name=author['url'];author_html=(ROOT/name).read_text('utf-8');page=Page(author_html)
 expected={p['slug'] for p in posts if (not parse_dt(p.get('publishedAt')) or parse_dt(p.get('publishedAt'))<=now) and (p.get('author')==author['name'] or author['name'] in (p.get('coauthors') or []))}
 actual={urlparse(a.get('href','')).path.rsplit('/',1)[-1][:-5] for a in page.find('a') if a.get('href','').startswith('/articles/') and a.get('href','').endswith('.html')}
 count=re.search(r'<h2 class="section-title">Материалы автора</h2>\s*<span class="section-sub">(\d+) публикац',author_html)
 check(actual==expected,f'{name}: static author links (missing {expected-actual}, extra {actual-expected})')
 check(bool(count) and int(count.group(1))==len(expected),f'{name}: publication count')
check((ROOT/'assets/provkus-logo.svg').exists(),'organization logo missing')
if (ROOT/'assets/provkus-logo.svg').exists():
 logo=(ROOT/'assets/provkus-logo.svg').read_text('utf-8');check('width="512"' in logo and 'height="512"' in logo,'organization logo dimensions')

hubs=['recipes.html','products.html','home-storage.html','food-safety.html']
rubric_matches=[
 lambda c:'рецеп' in c,
 lambda c:'продукт' in c or 'выбор' in c,
 lambda c:'дом' in c or 'хран' in c,
 lambda c:'безопас' in c,
]
for name,match in zip(hubs,rubric_matches):
 path=ROOT/name
 check(path.exists(),f'{name}: missing hub')
 if not path.exists():continue
 text=path.read_text('utf-8');s=Page(text)
 check(len(s.find('h1'))==1,f'{name}: h1')
 canon=s.find('link',rel='canonical');check(bool(canon),f'{name}: canonical missing')
 if canon:check(canon[0].get('href')==SITE+'/'+name,f'{name}: canonical mismatch')
 check(SITE+'/'+name in locs,f'{name}: sitemap')
 robots=s.find('meta',name='robots');check(bool(robots) and 'index' in robots[0].get('content','').lower(),f'{name}: indexable robots')
 expected={p['slug'] for p in posts if (not parse_dt(p.get('publishedAt')) or parse_dt(p.get('publishedAt'))<=now) and match(str(p.get('category') or '').lower())}
 actual={urlparse(a.get('href','')).path.rsplit('/',1)[-1][:-5] for a in s.find('a') if a.get('href','').startswith('/articles/') and a.get('href','').endswith('.html')}
 check(expected==actual,f'{name}: static article links (missing {expected-actual}, extra {actual-expected})')
 check('Загружаем материалы…' not in text,f'{name}: loading placeholder in crawlable HTML')

policy=Page((ROOT/'editorial-policy.html').read_text('utf-8'))
check(bool(policy.find('link',rel='canonical')) and policy.find('link',rel='canonical')[0].get('href')==SITE+'/editorial-policy.html','editorial policy: canonical')
check(bool(policy.find('meta',name='description')),'editorial policy: description')
robots_file=(ROOT/'robots.txt').read_text('utf-8')
admin=Page((ROOT/'admin.html').read_text('utf-8'))
check('Disallow: /admin.html' not in robots_file,'admin: robots.txt hides noindex')
check(bool(admin.find('meta',name='robots')) and 'noindex' in admin.find('meta',name='robots')[0].get('content',''),'admin: noindex meta')
editorial_email='provkus-media@mail.ru'
community=(ROOT/'assets/community.js').read_text('utf-8')
check(f"EDITORIAL_EMAIL='{editorial_email}'" in community,'reader questions: recipient mismatch')
check(f'mailto:{editorial_email}' in (ROOT/'contacts.html').read_text('utf-8'),'contacts: editorial email mismatch')
check(f'value="{editorial_email}"' in (ROOT/'admin.html').read_text('utf-8'),'admin: editorial email mismatch')
for page in ROOT.glob('*.html'):
 check('makarcudra7@' not in page.read_text('utf-8'),f'{page.name}: retired editorial address')
check('makarcudra7@' not in community,'reader questions: retired recipient')
config=json.loads((ROOT/'vercel.json').read_text('utf-8'))
check(any(h.get('source')=='/admin.html' and any(x.get('key')=='X-Robots-Tag' and 'noindex' in x.get('value','') for x in h.get('headers',[])) for h in config.get('headers',[])),'admin: noindex header')

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

check(public_count+13==len(locs),f'Sitemap inventory mismatch: public={public_count}, sitemap={len(locs)}')
print(json.dumps({'posts':len(posts),'public_articles':public_count,'sitemap_urls':len(locs),'errors':errors},ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
