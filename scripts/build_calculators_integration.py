import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SITE='https://provkus-media.ru'
TOOLS=[
    SITE+'/calculators.html',
    SITE+'/grams-spoons-cups.html',
    SITE+'/portion-calculator.html',
]

# Keep the tools reachable from every generated public page. Absolute paths work
# equally on top-level pages, article pages and nested date archives.
for path in ROOT.rglob('*.html'):
    if path.name=='admin.html' or '.git' in path.parts:
        continue
    source=path.read_text('utf-8')
    if 'class="main-nav"' in source and 'href="/calculators.html"' not in source:
        source,n=re.subn(r'(</nav>)','<a href="/calculators.html">Калькуляторы</a>\\1',source,count=1)
        if n:
            path.write_text(source,'utf-8')

# build_indexes.py and build_discovery_archives.py rebuild sitemap.xml. Re-attach
# stable utility URLs at the end of that canonical pipeline.
sitemap=ROOT/'sitemap.xml'
if sitemap.exists():
    xml=sitemap.read_text('utf-8')
    for url in TOOLS:
        xml=re.sub(r'\s*<url><loc>'+re.escape(url)+r'</loc>(?:<lastmod>[^<]+</lastmod>)?</url>','',xml)
    entries='\n'.join(f'<url><loc>{url}</loc></url>' for url in TOOLS)
    xml=xml.replace('</urlset>',entries+'\n</urlset>')
    sitemap.write_text(xml,'utf-8')

print('Integrated ProVkus calculators into navigation and sitemap')