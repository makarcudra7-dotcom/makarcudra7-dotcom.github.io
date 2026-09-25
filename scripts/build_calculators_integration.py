import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SITE='https://provkus-media.ru'
TOOLS=[
    SITE+'/calculators.html',
    SITE+'/grams-spoons-cups.html',
    SITE+'/portion-calculator.html',
]


def nav_for(path: Path):
    rel=path.relative_to(ROOT).as_posix()
    if path.name in {'calculators.html','grams-spoons-cups.html','portion-calculator.html'}:
        current='tools'
    elif path.name=='authors.html' or path.name.startswith('author-'):
        current='authors'
    elif path.name=='archive.html' or rel.startswith('archive/'):
        current='archive'
    else:
        current='materials'
    items=[
        ('materials','/category.html','Материалы'),
        ('tools','/calculators.html','Калькуляторы'),
        ('authors','/authors.html','Авторы'),
        ('archive','/archive.html','Архив'),
    ]
    return '<nav class="main-nav">'+''.join(
        f'<a href="{href}"'+(' aria-current="page"' if key==current else '')+f'>{label}</a>'
        for key,href,label in items
    )+'</nav>'


# Keep the primary navigation deliberately small. Topic rubrics remain reachable
# from the home-page topic strip and from the material index.
for path in ROOT.rglob('*.html'):
    if path.name=='admin.html' or '.git' in path.parts:
        continue
    source=path.read_text('utf-8')
    source,n=re.subn(r'<nav class="main-nav">.*?</nav>',lambda _:nav_for(path),source,count=1,flags=re.S)
    if n:
        path.write_text(source,'utf-8')

# Give the utilities a prominent, stable place on the home page. This marker is
# regenerated on every discovery build so future publishing cannot remove it.
home=ROOT/'index.html'
if home.exists():
    source=home.read_text('utf-8')
    tools='''<!-- HOME-TOOLS-START --><section class="home-tools-section"><div class="container">
<div class="home-topic-strip"><strong>Темы</strong><a href="/recipes.html">Рецепты</a><a href="/products.html">Продукты</a><a href="/home-storage.html">Дом</a><a href="/food-safety.html">Безопасность</a></div>
<div class="home-tools-head"><div><span class="home-tools-kicker">Полезно на кухне</span><h2>Калькуляторы ProVkus</h2><p>Быстрые расчёты без таблиц и поиска по другим сайтам.</p></div><a class="home-tools-all" href="/calculators.html">Все калькуляторы →</a></div>
<div class="home-tools-grid"><a class="home-tool-card" href="/grams-spoons-cups.html"><span class="home-tool-icon">↔</span><div><strong>Граммы ↔ ложки ↔ стаканы</strong><p>Пересчёт для муки, круп, молочных продуктов, мёда, масла и десятков других продуктов.</p></div><span class="home-tool-go">Открыть →</span></a>
<a class="home-tool-card" href="/portion-calculator.html"><span class="home-tool-icon">×</span><div><strong>Калькулятор порций</strong><p>Введите рецепт на 4 порции — получите количества на 2, 6, 10 или любое другое число.</p></div><span class="home-tool-go">Открыть →</span></a></div>
</div></section><!-- HOME-TOOLS-END -->'''
    if '<!-- HOME-TOOLS-START -->' in source:
        source=re.sub(r'<!-- HOME-TOOLS-START -->.*?<!-- HOME-TOOLS-END -->',lambda _:tools,source,count=1,flags=re.S)
    else:
        hero_end=source.find('</section>')
        if hero_end!=-1:
            hero_end+=len('</section>')
            source=source[:hero_end]+tools+source[hero_end:]
    home.write_text(source,'utf-8')

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

print('Integrated ProVkus calculators, simplified navigation and home tools block')