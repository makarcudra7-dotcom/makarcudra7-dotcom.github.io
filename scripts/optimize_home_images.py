import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://provkus-media.ru'
WIDTHS = (640, 960, 1280)
QUALITY = 80


def parse_dt(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc)
    except Exception:
        return None


def is_public(post, now):
    published = parse_dt(post.get('publishedAt'))
    if published and published > now:
        return False
    return (ROOT / 'articles' / f"{post.get('slug', '')}.html").exists()


def local_image_path(image_url):
    if not image_url:
        return None
    parsed = urlparse(image_url)
    path = parsed.path if parsed.scheme else image_url.split('?', 1)[0]
    if not path.startswith('/assets/uploads/'):
        return None
    candidate = ROOT / path.lstrip('/')
    return candidate if candidate.is_file() else None


def optimize(source):
    try:
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened)
            if image.mode not in ('RGB', 'RGBA'):
                image = image.convert('RGB')
            elif image.mode == 'RGBA':
                background = Image.new('RGB', image.size, 'white')
                background.paste(image, mask=image.getchannel('A'))
                image = background
            else:
                image = image.copy()
    except Exception as exc:
        print(f'skip {source.relative_to(ROOT)}: {exc}')
        return 0

    created = 0
    src_width, src_height = image.size
    for width in WIDTHS:
        if src_width <= width:
            continue
        target = source.with_name(f'{source.stem}-{width}w.webp')
        if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
            continue
        height = max(1, round(src_height * width / src_width))
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
        resized.save(target, 'WEBP', quality=QUALITY, method=6, optimize=True)
        created += 1
        print(f'created {target.relative_to(ROOT)} ({width}x{height})')
    return created


def main():
    now = datetime.now(timezone.utc)
    posts = json.loads((ROOT / 'data/posts.json').read_text('utf-8'))
    posts = [post for post in posts if is_public(post, now)]
    posts.sort(key=lambda post: parse_dt(post.get('publishedAt')) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    if not posts:
        print('no public posts')
        return

    featured = next((post for post in posts if post.get('featured')), posts[0])
    side = [post for post in posts if post.get('slug') != featured.get('slug')][:3]
    used = {featured.get('slug'), *(post.get('slug') for post in side)}
    fresh = [post for post in posts if post.get('slug') not in used][:12]

    sources = []
    seen = set()
    for post in [featured, *side, *fresh]:
        source = local_image_path(post.get('image'))
        if source and source not in seen:
            seen.add(source)
            sources.append(source)

    total = sum(optimize(source) for source in sources)
    print(f'homepage image optimization complete: {len(sources)} sources, {total} files created')


if __name__ == '__main__':
    main()
