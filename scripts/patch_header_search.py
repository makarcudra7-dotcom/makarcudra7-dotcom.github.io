#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
SEARCH_VERSION='20260929-search2'

# Homepage must have search before the lazy-loaded general app starts.
index=ROOT/'index.html'
s=index.read_text('utf-8')
s=re.sub(r'<link rel="stylesheet" href="/assets/site-search\.css\?v=[^"]+">','',s)
s=re.sub(r'<script src="/assets/site-search\.js\?v=[^"]+" defer></script>','',s)
css=f'<link rel="stylesheet" href="/assets/site-search.css?v={SEARCH_VERSION}">'
js=f'<script src="/assets/site-search.js?v={SEARCH_VERSION}" defer></script>'
s=s.replace('</head>',css+js+'</head>',1)
# Remove only the header navigation item, not footer/category links.
def clean_nav(m):
    body=m.group(1)
    body=re.sub(r'<a\s+href=["\']/category\.html["\'][^>]*>Материалы</a>','',body)
    body=re.sub(r'<a\s+href=["\']category\.html["\'][^>]*>Материалы</a>','',body)
    return '<nav class="main-nav">'+body+'</nav>'
s=re.sub(r'<nav class="main-nav">(.*?)</nav>',clean_nav,s,count=1,flags=re.S)
index.write_text(s,'utf-8')

# Other pages load app.js normally; have it install the search UI immediately.
app=ROOT/'assets/app.js'
s=app.read_text('utf-8')
s=re.sub(r"const VERSION='[^']+';",f"const VERSION='{SEARCH_VERSION}';",s,count=1)
s=re.sub(r"/assets/site-search\.js\?v=[^'\"]+",f"/assets/site-search.js?v={SEARCH_VERSION}",s)
old="injectCss();addFavicon();addSiteSchema();enhanceNavigation();"
new=f"injectCss();addCss('/assets/site-search.css');loadScript('/assets/site-search.js?v={SEARCH_VERSION}','pvSiteSearch');addFavicon();addSiteSchema();enhanceNavigation();"
if old in s:
    s=s.replace(old,new,1)
elif "site-search.js" not in s:
    raise SystemExit('Could not locate app.js initialization hook')
app.write_text(s,'utf-8')

# Keep the generated news page aligned with the simplified navigation.
builder=ROOT/'scripts/build_indexes.py'
s=builder.read_text('utf-8')
s=s.replace("'<nav class=\"main-nav\"><a href=\"/category.html\">Материалы</a><a href=\"/news.html\" aria-current=\"page\">Новости</a>'",
            "'<nav class=\"main-nav\"><a href=\"/news.html\" aria-current=\"page\">Новости</a>'")
builder.write_text(s,'utf-8')

# Remove the obsolete top-nav item from existing pages. Restrict changes to the
# main-nav block so links elsewhere remain intact.
for page in list(ROOT.glob('*.html'))+list((ROOT/'articles').glob('*.html')):
    text=page.read_text('utf-8')
    def scrub(m):
        body=m.group(1)
        body=re.sub(r'<a\s+href=["\']/category\.html["\'][^>]*>Материалы</a>','',body)
        body=re.sub(r'<a\s+href=["\']category\.html["\'][^>]*>Материалы</a>','',body)
        return '<nav class="main-nav">'+body+'</nav>'
    changed=re.sub(r'<nav class="main-nav">(.*?)</nav>',scrub,text,count=1,flags=re.S)
    if changed!=text:
        page.write_text(changed,'utf-8')

print('Header navigation simplified and live search cache version refreshed.')
