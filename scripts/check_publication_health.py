#!/usr/bin/env python3
"""Check deployed article pages and images; retain stable health results."""
import concurrent.futures
import html.parser
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('PV_SITE_ROOT','https://provkus-media.ru').rstrip('/')
POSTS=json.loads((ROOT/'data/posts.json').read_text('utf-8'))
OUT=ROOT/'data/publication-health.json'
previous=json.loads(OUT.read_text('utf-8')) if OUT.exists() else {}
class Extract(html.parser.HTMLParser):
 def __init__(self):super().__init__();self.title='';self.h1='';self.images=[];self.in_title=False;self.in_h1=False;self.robots='';self.canonical=''
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='title':self.in_title=True
  if tag=='h1':self.in_h1=True
  if tag=='img' and a.get('src'):self.images.append(a['src'])
  if tag=='meta' and a.get('name')=='robots':self.robots=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical':self.canonical=a.get('href','')
 def handle_endtag(self,tag):
  if tag=='title':self.in_title=False
  if tag=='h1':self.in_h1=False
 def handle_data(self,data):
  if self.in_title:self.title+=data
  if self.in_h1:self.h1+=data

def get(url,method='GET'):
 req=urllib.request.Request(url,headers={'User-Agent':'ProVkus-publication-health/1.0'},method=method)
 with urllib.request.urlopen(req,timeout=10) as response:return response.read(2_500_000) if method=='GET' else b''
def check(p):
 slug=p.get('slug','');url=BASE+'/articles/'+slug+'.html';errors=[]
 try:
  page=Extract();page.feed(get(url).decode('utf-8','replace'))
  if page.title.strip()!=p.get('headline','').strip():errors.append('SEO title не совпадает с заголовком')
  if page.h1.strip()!=p.get('headline','').strip():errors.append('H1 не совпадает с заголовком')
  if 'noindex' in page.robots.lower():errors.append('страница закрыта от индексации')
  if page.canonical and page.canonical!=p.get('url',url):errors.append('неверный canonical')
  from urllib.parse import urljoin
  for img in dict.fromkeys([p.get('image',''),*page.images]):
   if not img or img.startswith('data:'):continue
   try:
    image_url=urljoin(url,img)
    try:get(image_url,'HEAD')
    except urllib.error.HTTPError as e:
     if e.code in (403,405):get(image_url,'GET')
     else:raise
   except Exception as e:errors.append('фото недоступно: '+image_url+' ('+type(e).__name__+')')
 except Exception as e:errors.append('страница недоступна: '+type(e).__name__+': '+str(e)[:80])
 old=previous.get(slug,{})
 if old.get('errors')==errors:return slug,old
 return slug,{'status':'ok' if not errors else 'error','errors':errors,'checkedAt':datetime.now(timezone.utc).isoformat().replace('+00:00','Z')}
# Check recent content every hour; cover the full archive once per day.
all_posts=sorted((p for p in POSTS if p.get('slug')),key=lambda p:p.get('publishedAt',''),reverse=True)
chosen=all_posts if datetime.now(timezone.utc).hour==3 or os.environ.get('PV_HEALTH_ALL')=='1' else list({p['slug']:p for p in [*all_posts[:30],*(p for p in all_posts if previous.get(p['slug'],{}).get('status')=='error')]}.values())
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=dict(pool.map(check,chosen))
valid={p['slug'] for p in all_posts}
next_report={k:v for k,v in previous.items() if k in valid}
next_report.update(results)
if next_report!=previous:OUT.write_text(json.dumps(next_report,ensure_ascii=False,indent=2)+'\n','utf-8')
print(f'Checked {len(chosen)}; errors: {sum(bool(v.get("errors")) for v in results.values())}; report changed: {next_report!=previous}')
