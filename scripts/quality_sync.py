from pathlib import Path
from datetime import datetime, timezone
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://provkus-media.ru'
QUALITY_VERSION = '20260926-quality10'
POSTS_PATH = ROOT / 'data/posts.json'
AUTHORS_PATH = ROOT / 'data/authors.json'


def read(path):
    return path.read_text('utf-8')


def write_if_changed(path, value):
    old = read(path) if path.exists() else ''
    if old != value:
        path.write_text(value, 'utf-8')
        print('updated', path.relative_to(ROOT))


def parse_dt(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00')).astimezone(timezone.utc)
    except Exception:
        return None


def esc(value):
    return html.escape(str(value or ''), quote=True)


def plain(value):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', str(value or ''))).strip()


def plural_publications(n):
    n10, n100 = n % 10, n % 100
    if n10 == 1 and n100 != 11:
        return 'публикация'
    if 2 <= n10 <= 4 and not 12 <= n100 <= 14:
        return 'публикации'
    return 'публикаций'


def public_posts():
    now = datetime.now(timezone.utc)
    posts = json.loads(read(POSTS_PATH))
    result = []
    for post in posts:
        if not post.get('slug'):
            continue
        when = parse_dt(post.get('publishedAt'))
        if when and when > now:
            continue
        if not (ROOT / 'articles' / f"{post['slug']}.html").exists():
            continue
        result.append(post)
    result.sort(key=lambda p: parse_dt(p.get('publishedAt')) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return result


POSTS = public_posts()
AUTHORS = json.loads(read(AUTHORS_PATH))
COUNTS = {
    author['name']: sum(
        1 for post in POSTS
        if post.get('author') == author['name'] or author['name'] in (post.get('coauthors') or [])
    )
    for author in AUTHORS
}


def author_card(author, home=False):
    count = COUNTS.get(author['name'], 0)
    photo = '/' + str(author.get('photo') or '').lstrip('/')
    topics = ''.join(f'<span>{esc(x)}</span>' for x in (author.get('topics') or [])[:5])
    promise = ('В профиле — все публикации автора, его темы и возможность задать вопрос редакции.'
               if home else 'Все публикации автора, его темы и возможность задать вопрос редакции.')
    return (
        f'<a class="author-card" href="/{esc(author["url"])}">'
        f'<div class="author-card-top"><img src="{esc(photo)}" width="112" height="112" '
        f'loading="lazy" decoding="async" alt="{esc(author["name"])}"><div>'
        f'<div class="author-card-role">{esc(author.get("role"))}</div><h3>{esc(author["name"])}</h3></div></div>'
        f'<p class="author-card-lead">{esc(author.get("lead"))}</p>'
        f'<div class="author-topics">{topics}</div>'
        f'<div class="author-card-promise">{esc(promise)}</div>'
        f'<div class="author-card-footer"><span data-author-count="{esc(author["name"])}">'
        f'{count} {plural_publications(count)}</span><strong>Открыть профиль →</strong></div></a>'
    )


def sync_author_css():
    site_ui = ROOT / 'assets/site-ui.css'
    source = read(site_ui)
    block_parts = []
    for name in ('author-fix.css', 'community-extra.css'):
        path = ROOT / 'assets' / name
        if path.exists():
            block_parts.append(read(path).strip())
    extra = '''
/* Stable author directory additions */
.author-card-promise{margin:4px 0 14px;padding:10px 11px;border-radius:10px;background:#f6f2ec;color:#625b54;font-size:11px;line-height:1.45}
.author-directory-note{margin-top:20px;padding:20px 22px;border:1px solid #e5dfd5;border-radius:18px;background:#fffdf9;color:#5f5851;line-height:1.65}
.author-directory-note h2{margin:0 0 8px;font:800 25px/1.1 Georgia,serif;color:#24211d}
.author-directory-note p{margin:7px 0}
@media(max-width:640px){.author-directory-note{padding:17px}.author-card-promise{font-size:10.5px}}
'''.strip()
    block = '\n/* QUALITY-AUTHOR-CSS-START */\n' + '\n\n'.join(block_parts + [extra]) + '\n/* QUALITY-AUTHOR-CSS-END */\n'
    if '/* QUALITY-AUTHOR-CSS-START */' in source:
        source = re.sub(r'\n?/\* QUALITY-AUTHOR-CSS-START \*/.*?/\* QUALITY-AUTHOR-CSS-END \*/\n?', '\n' + block, source, flags=re.S)
    else:
        source = source.rstrip() + '\n' + block
    write_if_changed(site_ui, source)

    public = ROOT / 'assets/public.css'
    p = read(public)
    p = re.sub(r'^\s*@import\s+url\(["\']?/assets/styles\.css["\']?\);\s*', '', p, count=1, flags=re.I | re.M)
    write_if_changed(public, p)


def ensure_static_css_links():
    pages = list(ROOT.glob('*.html')) + list((ROOT / 'articles').glob('*.html'))
    for path in pages:
        source = read(path)
        if 'public.css' not in source:
            continue
        original = source
        public_match = re.search(r'<link rel="stylesheet" href="([^\"]*?)public\.css[^\"]*">', source)
        if public_match:
            prefix = public_match.group(1)
            styles_href = prefix + 'styles.css'
            if not re.search(r'href="[^\"]*styles\.css(?:\?[^\"]*)?"', source):
                source = source[:public_match.start()] + f'<link rel="stylesheet" href="{styles_href}">' + source[public_match.start():]
            if not re.search(r'href="[^\"]*site-ui\.css(?:\?[^\"]*)?"', source):
                public_match = re.search(r'<link rel="stylesheet" href="([^\"]*?)public\.css[^\"]*">', source)
                prefix = public_match.group(1) if public_match else '/assets/'
                source = source.replace('</head>', f'<link rel="stylesheet" href="{prefix}site-ui.css?v={QUALITY_VERSION}"></head>', 1)
        source = re.sub(r'<link rel="stylesheet" href="[^\"]*author-fix\.css[^\"]*">', '', source)
        if source != original:
            write_if_changed(path, source)


def sync_runtime():
    app = ROOT / 'assets/app.js'
    source = read(app)
    source = re.sub(
        r"function addCss\(href\)\{if\(document\.querySelector\(`link\[href\^=\\\"\$\{href\}\\\"\]`\)\)return;const l=document\.createElement\('link'\);l\.rel='stylesheet';l\.href=href\+'\?v=[^']+';document\.head\.appendChild\(l\)\}",
        "function addCss(href){if(document.querySelector(`link[href^=\"${href}\"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href+'?v=" + QUALITY_VERSION + "';document.head.appendChild(l)}",
        source,
        count=1,
    )
    source = re.sub(
        r"function injectCss\(\)\{[^\n]*\}",
        "function injectCss(){addCss('/assets/overrides.css');addCss('/assets/site-ui.css');addCss('/assets/theme.css')}",
        source,
        count=1,
    )
    source = re.sub(
        r"window\.__pvPostsPromise=window\.__pvPostsPromise\|\|\(isHome\?.*?:loadVisiblePosts\(\)\);",
        "window.__pvPostsPromise=window.__pvPostsPromise||(isHome?Promise.resolve([]):loadVisiblePosts());",
        source,
        count=1,
    )
    source = source.replace("if(isHome)addCss('/assets/community-extra.css');", '')
    source = re.sub(r"/assets/community\.js\?v=[^'\"]+", f'/assets/community.js?v={QUALITY_VERSION}', source)
    write_if_changed(app, source)

    community = ROOT / 'assets/community.js'
    c = read(community)
    c, n = re.subn(
        r"  function enhanceDirectory\(\)\{.*?\}\n  function paintCounts",
        "  function enhanceDirectory(){const grid=$('.author-grid');if(!grid)return;grid.classList.add('author-directory-grid')}\n  function paintCounts",
        c,
        count=1,
        flags=re.S,
    )
    if n != 1:
        raise RuntimeError('community.js enhanceDirectory signature changed')
    write_if_changed(community, c)


def sync_home_authors():
    page = ROOT / 'index.html'
    source = read(page)
    cards = ''.join(author_card(a, home=True) for a in AUTHORS)
    section = (
        '<section class="section"><div class="container feature-band"><div class="section-head"><div>'
        '<h2 class="section-title">Авторы ProVkus</h2><div class="section-sub" style="color:rgba(255,255,255,.72)">'
        'Три редакционных направления</div></div><a class="link-more" style="color:white" href="/authors.html">Все авторы →</a>'
        '</div><!-- HOME-AUTHORS-START --><div class="author-grid author-directory-grid">' + cards +
        '</div><!-- HOME-AUTHORS-END --></div></section>'
    )
    pattern = r'<section class="section"><div class="container feature-band">.*?<h2 class="section-title">Авторы ProVkus</h2>.*?</section>'
    source, n = re.subn(pattern, section, source, count=1, flags=re.S)
    if n != 1:
        raise RuntimeError('homepage author section not found')
    source = re.sub(r'<link id="pv-hero-preload"[^>]*>', '', source, flags=re.I)
    source = re.sub(r'/assets/app\.js\?v=[^"\']+', f'/assets/app.js?v={QUALITY_VERSION}', source, count=1)
    write_if_changed(page, source)


def authors_schema():
    people = []
    for author in AUTHORS:
        people.append({
            '@type': 'Person',
            'name': author['name'],
            'url': f"{SITE}/{author['url']}",
            'jobTitle': author.get('role'),
            'image': SITE + '/' + str(author.get('photo') or '').lstrip('/'),
            'worksFor': {'@id': SITE + '/#organization'},
        })
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {'@type': 'Organization', '@id': SITE + '/#organization', 'name': 'ProVkus', 'url': SITE + '/',
             'logo': {'@type': 'ImageObject', 'url': SITE + '/assets/provkus-logo.svg'}},
            {'@type': 'CollectionPage', '@id': SITE + '/authors.html#page', 'url': SITE + '/authors.html',
             'name': 'Авторы ProVkus', 'inLanguage': 'ru-RU', 'about': {'@id': SITE + '/#organization'}},
            {'@type': 'ItemList', '@id': SITE + '/authors.html#authors', 'itemListElement': [
                {'@type': 'ListItem', 'position': i + 1, 'item': person} for i, person in enumerate(people)
            ]},
        ],
    }


def sync_authors_directory():
    page = ROOT / 'authors.html'
    source = read(page)
    source = re.sub(r'<title>.*?</title>', '<title>Авторы ProVkus — редакторы о продуктах, доме и еде</title>', source, count=1, flags=re.S)
    cards = ''.join(author_card(a) for a in AUTHORS)
    main = (
        '<main class="container"><section class="section"><div class="section-head"><div><div class="eyebrow">Редакция ProVkus</div>'
        '<h1 class="section-title">Люди, которые отвечают за материалы</h1><p class="section-sub">'
        'У каждого редактора своё направление. В профиле можно посмотреть все публикации, понять подход к темам и задать вопрос редакции.</p></div></div><div class="author-grid author-directory-grid">' + cards + '</div>'
        '<div class="author-directory-note"><h2>Как устроена редакция</h2><p>Каждый материал закреплён за конкретным автором и его редакционным направлением. '
        'В профиле автора собраны публикации, специализация и описание подхода к проверке фактов.</p><p>Для тем о продуктах, хранении и безопасности '
        'мы отделяем личный опыт от проверяемых утверждений и указываем источники там, где они нужны читателю для самостоятельной проверки.</p></div>'
        '</section></main>'
    )
    source, n = re.subn(r'<main class="container">.*?</main>', main, source, count=1, flags=re.S)
    if n != 1:
        raise RuntimeError('authors.html main not found')
    schema = '<script type="application/ld+json" id="pv-authors-schema">' + json.dumps(authors_schema(), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>'
    if 'id="pv-authors-schema"' in source:
        source = re.sub(r'<script type="application/ld\+json" id="pv-authors-schema">.*?</script>', schema, source, count=1, flags=re.S)
    else:
        source = source.replace('</head>', schema + '</head>', 1)
    source = re.sub(r'<script src="/assets/authors-fix\.js[^\"]*"></script>', '', source)
    source = re.sub(r'/assets/app\.js\?v=[^"\']+', f'/assets/app.js?v={QUALITY_VERSION}', source, count=1)
    write_if_changed(page, source)


def add_org_logo(obj):
    if isinstance(obj, dict):
        if obj.get('@type') == 'Organization' and obj.get('name') == 'ProVkus' and not obj.get('logo'):
            obj['logo'] = {'@type': 'ImageObject', 'url': SITE + '/assets/provkus-logo.svg'}
        for value in obj.values():
            add_org_logo(value)
    elif isinstance(obj, list):
        for value in obj:
            add_org_logo(value)


def sync_author_schemas():
    for author in AUTHORS:
        page = ROOT / author['url']
        if not page.exists():
            continue
        source = read(page)
        def repl(match):
            try:
                obj = json.loads(match.group(1))
            except Exception:
                return match.group(0)
            add_org_logo(obj)
            return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>'
        source = re.sub(r'<script type="application/ld\+json">(.*?)</script>', repl, source, flags=re.S)
        source = re.sub(r'/assets/app\.js\?v=[^"\']+', f'/assets/app.js?v={QUALITY_VERSION}', source)
        write_if_changed(page, source)


def category_schema():
    items = []
    for i, post in enumerate(POSTS[:50], 1):
        items.append({'@type': 'ListItem', 'position': i, 'url': post.get('url') or f"{SITE}/articles/{post['slug']}.html", 'name': post.get('headline')})
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {'@type': 'CollectionPage', '@id': SITE + '/category.html#page', 'url': SITE + '/category.html',
             'name': 'Материалы ProVkus', 'inLanguage': 'ru-RU', 'isPartOf': {'@id': SITE + '/#website'}},
            {'@type': 'ItemList', '@id': SITE + '/category.html#list', 'numberOfItems': len(POSTS), 'itemListElement': items},
        ],
    }


def sync_category_seo():
    page = ROOT / 'category.html'
    source = read(page)
    source = re.sub(r'<title>.*?</title>', '<title>Материалы о еде, продуктах и доме — ProVkus</title>', source, count=1, flags=re.S)
    schema = '<script type="application/ld+json" id="pv-category-schema">' + json.dumps(category_schema(), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>'
    if 'id="pv-category-schema"' in source:
        source = re.sub(r'<script type="application/ld\+json" id="pv-category-schema">.*?</script>', schema, source, count=1, flags=re.S)
    else:
        source = source.replace('</head>', schema + '</head>', 1)
    write_if_changed(page, source)


def meaningful_inline_alts(source, post):
    body_match = re.search(r'(<div class="article-body">)(.*?)(</div><!-- DISCOVERY-LINKS-START -->|</div>\s*</article>)', source, flags=re.S)
    if not body_match:
        return source
    body = body_match.group(2)
    parts = re.split(r'(<h2\b[^>]*>.*?</h2>)', body, flags=re.S | re.I)
    current = plain(post.get('imageAlt') or post.get('headline') or 'Иллюстрация к материалу')
    out = []
    for part in parts:
        if re.match(r'<h2\b', part, flags=re.I):
            current = plain(part) or current
            out.append(part)
            continue
        def img_repl(match):
            tag = match.group(0)
            alt_match = re.search(r'\salt=("|\')(.*?)\1', tag, flags=re.I | re.S)
            if alt_match and plain(alt_match.group(2)):
                return tag
            label = esc(current[:180])
            if alt_match:
                return re.sub(r'\salt=("|\')(.*?)\1', f' alt="{label}"', tag, count=1, flags=re.I | re.S)
            return tag[:-1] + f' alt="{label}">'
        out.append(re.sub(r'<img\b[^>]*>', img_repl, part, flags=re.I | re.S))
    new_body = ''.join(out)
    return source[:body_match.start(2)] + new_body + source[body_match.end(2):]


def sync_article_seo():
    title_overrides = {
        'tykvu-ne-rezhu-v-kashu-pryachu-vnutr-tvorog-chesnok-i-syr-poluchaetsya-goryachaya-lodochka-s-rumyanoy-shapkoy':
            'Фаршированная тыква с творогом и сыром — рецепт',
    }
    by_slug = {p['slug']: p for p in POSTS}
    for slug, post in by_slug.items():
        page = ROOT / 'articles' / f'{slug}.html'
        if not page.exists():
            continue
        source = read(page)
        source = meaningful_inline_alts(source, post)
        if slug in title_overrides:
            source = re.sub(r'<title>.*?</title>', f'<title>{esc(title_overrides[slug])}</title>', source, count=1, flags=re.S)
        write_if_changed(page, source)


def main():
    sync_author_css()
    ensure_static_css_links()
    sync_runtime()
    sync_home_authors()
    sync_authors_directory()
    sync_author_schemas()
    sync_category_seo()
    sync_article_seo()
    print('quality sync complete:', len(POSTS), 'public posts;', ', '.join(f"{k}={v}" for k, v in COUNTS.items()))


if __name__ == '__main__':
    main()
