import html
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'
SITE = 'https://provkus-media.ru'
WIDTHS = (640, 960, 1280)


def get_attr(tag, name):
    match = re.search(rf'\s{name}=("|\')(.*?)\1', tag, flags=re.I | re.S)
    return html.unescape(match.group(2)) if match else ''


def set_attr(tag, name, value):
    escaped = html.escape(str(value), quote=True)
    pattern = rf'(\s{name}=)("|\')(.*?)\2'
    if re.search(pattern, tag, flags=re.I | re.S):
        return re.sub(pattern, lambda m: f'{m.group(1)}"{escaped}"', tag, count=1, flags=re.I | re.S)
    return tag.replace('<img', f'<img {name}="{escaped}"', 1)


def original_url(tag):
    saved = get_attr(tag, 'data-original-src')
    if saved:
        return saved
    return get_attr(tag, 'src')


def local_rel(image_url):
    if not image_url:
        return None
    parsed = urlparse(image_url)
    path = parsed.path if parsed.scheme else image_url.split('?', 1)[0]
    if not path.startswith('/assets/uploads/'):
        return None
    rel = Path(path.lstrip('/'))
    return rel if (ROOT / rel).is_file() else None


def variant_url(original, rel, width):
    candidate = rel.with_name(f'{rel.stem}-{width}w.webp')
    if not (ROOT / candidate).is_file():
        return None
    prefix = SITE if original.startswith(SITE) else ''
    return prefix + '/' + candidate.as_posix()


def responsive_img(tag, sizes, preferred, eager=False):
    original = original_url(tag)
    rel = local_rel(original)
    if not rel:
        if eager:
            tag = set_attr(tag, 'loading', 'eager')
            tag = set_attr(tag, 'fetchpriority', 'high')
        return tag

    variants = [(width, variant_url(original, rel, width)) for width in WIDTHS]
    variants = [(width, url) for width, url in variants if url]
    if not variants:
        if eager:
            tag = set_attr(tag, 'loading', 'eager')
            tag = set_attr(tag, 'fetchpriority', 'high')
        return tag

    chosen = min(variants, key=lambda item: abs(item[0] - preferred))[1]
    srcset = ', '.join(f'{url} {width}w' for width, url in variants)
    tag = set_attr(tag, 'data-original-src', original)
    tag = set_attr(tag, 'src', chosen)
    tag = set_attr(tag, 'srcset', srcset)
    tag = set_attr(tag, 'sizes', sizes)
    tag = set_attr(tag, 'decoding', 'async')
    if eager:
        tag = set_attr(tag, 'loading', 'eager')
        tag = set_attr(tag, 'fetchpriority', 'high')
    return tag


def optimize_block(source, marker, sizes, preferred, first_eager=False):
    pattern = rf'(<!-- {marker}-START -->)(.*?)(<!-- {marker}-END -->)'
    match = re.search(pattern, source, flags=re.S)
    if not match:
        return source
    body = match.group(2)
    index = 0

    def replace_img(img_match):
        nonlocal index
        tag = img_match.group(0)
        eager = first_eager and index == 0
        index += 1
        return responsive_img(tag, sizes(index - 1) if callable(sizes) else sizes, preferred(index - 1) if callable(preferred) else preferred, eager=eager)

    body = re.sub(r'<img\b[^>]*>', replace_img, body, flags=re.I)
    replacement = match.group(1) + body + match.group(3)
    return source[:match.start()] + replacement + source[match.end():]


def add_lcp_preload(source):
    hero = re.search(r'<!-- HOME-HERO-START -->(.*?)<!-- HOME-HERO-END -->', source, flags=re.S)
    if not hero:
        return source
    img = re.search(r'<img\b[^>]*>', hero.group(1), flags=re.I | re.S)
    if not img:
        return source
    tag = img.group(0)
    href = get_attr(tag, 'src')
    srcset = get_attr(tag, 'srcset')
    sizes = get_attr(tag, 'sizes')
    if not href:
        return source
    attrs = f'rel="preload" as="image" href="{html.escape(href, quote=True)}" fetchpriority="high"'
    if srcset:
        attrs += f' imagesrcset="{html.escape(srcset, quote=True)}"'
    if sizes:
        attrs += f' imagesizes="{html.escape(sizes, quote=True)}"'
    preload = f'<!-- HOME-LCP-PRELOAD-START --><link {attrs}><!-- HOME-LCP-PRELOAD-END -->'
    if '<!-- HOME-LCP-PRELOAD-START -->' in source:
        return re.sub(r'<!-- HOME-LCP-PRELOAD-START -->.*?<!-- HOME-LCP-PRELOAD-END -->', preload, source, count=1, flags=re.S)
    viewport = '<meta name="viewport" content="width=device-width,initial-scale=1">'
    if viewport in source:
        return source.replace(viewport, viewport + preload, 1)
    return source.replace('</head>', preload + '</head>', 1)


def main():
    source = INDEX.read_text('utf-8')
    original = source

    hero_sizes = lambda i: '(max-width: 760px) 100vw, 66vw' if i == 0 else '(max-width: 760px) 100vw, 32vw'
    hero_preferred = lambda i: 960 if i == 0 else 640
    source = optimize_block(source, 'HOME-HERO', hero_sizes, hero_preferred, first_eager=True)
    source = optimize_block(source, 'HOME-LOWER', '(max-width: 760px) 100vw, 31vw', 640)
    source = add_lcp_preload(source)
    source = re.sub(r'/assets/app\.js\?v=[^"\']+', '/assets/app.js?v=20260926-pagespeed1', source, count=1)

    if source != original:
        INDEX.write_text(source, 'utf-8')
        print('optimized responsive homepage markup')
    else:
        print('homepage markup already optimized')


if __name__ == '__main__':
    main()
