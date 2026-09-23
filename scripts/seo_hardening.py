#!/usr/bin/env python3
import html
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SITE='https://provkus-media.ru'
ORG_ID=SITE+'/#organization'
LOGO=SITE+'/assets/provkus-logo.svg'

posts=json.loads((ROOT/'data/posts.json').read_text('utf-8'))
authors=json.loads((ROOT/'data/authors.json').read_text('utf-8'))
author_by_name={a['name']:a for a in authors}

RUBRIC_LINKS={
    '/category.html?rubric=recipes':'/recipes.html',
    '/category.html?rubric=products':'/products.html',
    '/category.html?rubric=home':'/home-storage.html',
    '/category.html?rubric=safety':'/food-safety.html',
}

def rubric_url(category):
    c=str(category or '').lower()
    if 'рецеп' in c:return SITE+'/recipes.html'
    if 'продукт' in c or 'выбор' in c:return SITE+'/products.html'
    if 'дом' in c or 'хран' in c:return SITE+'/home-storage.html'
    if 'безопас' in c:return SITE+'/food-safety.html'
    return SITE+'/category.html'

def replace_nav_links(text):
    for old,new in RUBRIC_LINKS.items():
        text=text.replace(old,new)
    return text

def iso(v):
    if not v:
        return datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
    try:
        return datetime.fromisoformat(v.replace('Z','+00:00')).astimezone(timezone.utc).isoformat().replace('+00:00','Z')
    except Exception:
        return v

def json_script(obj, marker=''):
    attrs=' type="application/ld+json"'
    if marker:
        attrs+=f' id="{marker}"'
    return '<script'+attrs+'>'+json.dumps(obj,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+'</script>'

def article_type(p):
    return 'NewsArticle' if 'news' in str(p.get('type','')).lower() else 'Article'

def article_schema(p):
    canonical=p.get('url') or f"{SITE}/articles/{p['slug']}.html"
    a=author_by_name.get(p.get('author'),{})
    images=p.get('images') or ([p.get('image')] if p.get('image') else [])
    article={
        '@type':article_type(p),'@id':canonical+'#article','headline':p.get('headline','').strip(),
        'description':p.get('description','').strip(),'image':images,'datePublished':iso(p.get('publishedAt')),
        'dateModified':iso(p.get('updatedAt') or p.get('publishedAt')),'articleSection':p.get('category') or 'Материалы',
        'keywords':p.get('tags') or [],'inLanguage':'ru-RU','isAccessibleForFree':True,
        'mainEntityOfPage':{'@type':'WebPage','@id':canonical},
        'author':{'@type':'Person','name':p.get('author') or 'Редакция ProVkus','url':f"{SITE}/{a.get('url','authors.html')}"},
        'publisher':{'@type':'Organization','@id':ORG_ID,'name':'ProVkus','url':SITE+'/','logo':{'@type':'ImageObject','url':LOGO,'contentUrl':LOGO,'width':512,'height':512}}
    }
    breadcrumb={'@type':'BreadcrumbList','@id':canonical+'#breadcrumb','itemListElement':[
        {'@type':'ListItem','position':1,'name':'ProVkus','item':SITE+'/'},
        {'@type':'ListItem','position':2,'name':p.get('category') or 'Материалы','item':rubric_url(p.get('category'))},
        {'@type':'ListItem','position':3,'name':p.get('headline','').strip(),'item':canonical},
    ]}
    return {'@context':'https://schema.org','@graph':[article,breadcrumb]}

def ensure_meta(text, needle, fragment):
    if needle in text:return text
    return text.replace('</head>',fragment+'</head>',1)

def upsert_meta(text, attr, key, value):
    fragment=f'<meta {attr}="{key}" content="{html.escape(str(value),quote=True)}">'
    pattern=rf'<meta {attr}="{re.escape(key)}" content="[^"]*">'
    if re.search(pattern,text):return re.sub(pattern,lambda _:fragment,text,count=1)
    return text.replace('</head>',fragment+'</head>',1)

def patch_article(p):
    path=ROOT/'articles'/f"{p['slug']}.html"
    if not path.exists():return False
    text=replace_nav_links(path.read_text('utf-8'));old=path.read_text('utf-8')
    canonical=p.get('url') or f"{SITE}/articles/{p['slug']}.html"
    block=json_script(article_schema(p),'pv-article-schema')
    text,count=re.subn(r'<script type="application/ld\+json"(?: id="[^"]*")?>[\s\S]*?</script>',block,text,count=1,flags=re.I)
    if not count:text=text.replace('</head>',block+'</head>',1)
    text=ensure_meta(text,'property="og:site_name"','<meta property="og:site_name" content="ProVkus">')
    text=ensure_meta(text,'property="og:locale"','<meta property="og:locale" content="ru_RU">')
    text=ensure_meta(text,'property="og:url"',f'<meta property="og:url" content="{html.escape(canonical,quote=True)}">')
    text=ensure_meta(text,'type="application/rss+xml"','<link rel="alternate" type="application/rss+xml" title="ProVkus — новые материалы" href="https://provkus-media.ru/feed.xml">')
    text=ensure_meta(text,'name="twitter:title"',f'<meta name="twitter:title" content="{html.escape(p.get("headline", ""),quote=True)}">')
    text=ensure_meta(text,'name="twitter:description"',f'<meta name="twitter:description" content="{html.escape(p.get("description", ""),quote=True)}">')
    def robots(m):
        value=m.group(1)
        if 'noindex' in value.lower():return m.group(0)
        parts=[x.strip() for x in value.split(',') if x.strip()]
        for x in ['max-image-preview:large','max-snippet:-1','max-video-preview:-1']:
            if not any(y.lower()==x for y in parts):parts.append(x)
        return '<meta name="robots" content="'+', '.join(parts)+'">'
    text=re.sub(r'<meta name="robots" content="([^"]*)">',robots,text,count=1,flags=re.I)
    if text!=old:path.write_text(text,'utf-8');return True
    return False

def patch_home():
    path=ROOT/'index.html';old=path.read_text('utf-8');text=replace_nav_links(old)
    graph={'@context':'https://schema.org','@graph':[
        {'@type':'Organization','@id':ORG_ID,'name':'ProVkus','alternateName':'ProVkus Media','url':SITE+'/','logo':{'@type':'ImageObject','url':LOGO,'contentUrl':LOGO,'width':512,'height':512},'email':'makarcudra7@gmail.com'},
        {'@type':'WebSite','@id':SITE+'/#website','url':SITE+'/','name':'ProVkus','alternateName':'ProVkus Media','inLanguage':'ru-RU','publisher':{'@id':ORG_ID}}
    ]}
    block=json_script(graph,'pv-home-schema')
    if re.search(r'<script type="application/ld\+json" id="pv-home-schema">[\s\S]*?</script>',text,re.I):text=re.sub(r'<script type="application/ld\+json" id="pv-home-schema">[\s\S]*?</script>',block,text,count=1,flags=re.I)
    else:text=text.replace('</head>',block+'</head>',1)
    text=ensure_meta(text,'property="og:site_name"','<meta property="og:site_name" content="ProVkus">')
    text=ensure_meta(text,'property="og:type"','<meta property="og:type" content="website">')
    text=ensure_meta(text,'property="og:url"','<meta property="og:url" content="https://provkus-media.ru/">')
    text=ensure_meta(text,'property="og:locale"','<meta property="og:locale" content="ru_RU">')
    featured=next((p for p in posts if p.get('featured')),posts[0] if posts else {})
    text=upsert_meta(text,'property','og:title','ProVkus — еда, продукты и домашние советы')
    text=upsert_meta(text,'property','og:description','Практичное медиа о еде, сезонных рецептах, продуктах, хранении и доме.')
    if featured.get('image'):
        text=upsert_meta(text,'property','og:image',featured['image'])
        text=upsert_meta(text,'property','og:image:alt',featured.get('imageAlt') or featured.get('headline',''))
        text=upsert_meta(text,'property','og:image:width','1600')
        text=upsert_meta(text,'property','og:image:height','900')
        text=upsert_meta(text,'name','twitter:card','summary_large_image')
        text=upsert_meta(text,'name','twitter:image',featured['image'])
    text=ensure_meta(text,'type="application/rss+xml"','<link rel="alternate" type="application/rss+xml" title="ProVkus — новые материалы" href="https://provkus-media.ru/feed.xml">')
    if text!=old:path.write_text(text,'utf-8');return True
    return False

def patch_static_nav():
    changed=[]
    for path in ROOT.glob('*.html'):
        if path.name in {'admin.html','index.html'}:continue
        old=path.read_text('utf-8');new=replace_nav_links(old)
        if new!=old:path.write_text(new,'utf-8');changed.append(path.name)
    return changed

changed=[]
for p in posts:
    if patch_article(p):changed.append(p['slug'])
home_changed=patch_home();static_changed=patch_static_nav()
subprocess.run([sys.executable,str(ROOT/'scripts'/'build_indexes.py')],cwd=ROOT,check=True)
print(json.dumps({'articles_hardened':len(changed),'home_changed':home_changed,'static_nav_changed':len(static_changed)},ensure_ascii=False))
