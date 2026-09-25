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

# Give the utilities a prominent, stable place on the home page. The quick
# actions are regenerated on every discovery build so future publishing cannot
# accidentally remove them.
home=ROOT/'index.html'
if home.exists():
    source=home.read_text('utf-8')
    tools='''<!-- HOME-TOOLS-START --><section class="home-tools-section"><div class="container">
<div class="home-topic-strip"><strong>Темы</strong><a href="/recipes.html">Рецепты</a><a href="/products.html">Продукты</a><a href="/home-storage.html">Дом</a><a href="/food-safety.html">Безопасность</a></div>
<div class="home-tools-head"><div><span class="home-tools-kicker">Быстрый расчёт</span><h2>Что нужно посчитать?</h2><p>Выберите действие — нужный инструмент откроется сразу.</p></div></div>
<div class="home-tools-quick">
<a class="home-quick-action" href="/grams-spoons-cups.html" aria-label="Перевести граммы, ложки и стаканы"><span class="home-quick-icon">↔</span><span class="home-quick-copy"><strong>Перевести меру</strong><small>Граммы ↔ ложки ↔ стаканы</small></span><span class="home-quick-arrow">→</span></a>
<a class="home-quick-action" href="/portion-calculator.html" aria-label="Пересчитать рецепт на другое число порций"><span class="home-quick-icon">×</span><span class="home-quick-copy"><strong>Пересчитать порции</strong><small>Из 4 порций сделать 6, 8 или сколько нужно</small></span><span class="home-quick-arrow">→</span></a>
</div>
<div class="home-tools-foot"><span>30+ продуктов в конвертере · пересчёт целого рецепта</span><a href="/calculators.html">Все калькуляторы →</a></div>
</div></section><!-- HOME-TOOLS-END -->'''
    if '<!-- HOME-TOOLS-START -->' in source:
        source=re.sub(r'<!-- HOME-TOOLS-START -->.*?<!-- HOME-TOOLS-END -->',lambda _:tools,source,count=1,flags=re.S)
    else:
        hero_end=source.find('</section>')
        if hero_end!=-1:
            hero_end+=len('</section>')
            source=source[:hero_end]+tools+source[hero_end:]
    css='<link rel="stylesheet" href="/assets/home-tools.css?v=20260925-2">'
    if '/assets/home-tools.css' not in source:
        source=source.replace('</head>',css+'</head>',1)
    else:
        source=re.sub(r'<link rel="stylesheet" href="/assets/home-tools\.css\?v=[^"]+">',css,source,count=1)
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

print('Integrated ProVkus calculators, simplified navigation and prominent quick actions')