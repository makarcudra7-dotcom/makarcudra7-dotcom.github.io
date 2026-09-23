"""Generate lighter card/cover images while keeping large JPEG originals for sharing."""
import json
import re
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / 'data/posts.json'
posts = json.loads(POSTS.read_text('utf-8'))
optimized = set()
before = 0
after = 0

for post in posts:
    url = urlparse(post.get('image') or '')
    if url.netloc and url.netloc != 'provkus-media.ru':
        continue
    if not re.fullmatch(r'/assets/(?:covers|uploads)/[A-Za-z0-9._-]+-16x9\.jpg', url.path):
        continue
    source = ROOT / url.path.lstrip('/')
    if not source.is_file():
        continue
    before += source.stat().st_size
    with Image.open(source) as image:
        image = image.convert('RGB')
        for width in (640, 1600):
            target = source.with_name(f'{source.stem}-{width}.webp')
            if not target.exists() or target.stat().st_size == 0 or target.stat().st_mtime < source.stat().st_mtime:
                resized = image if image.width == width else image.resize(
                    (width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
                temporary = target.with_suffix('.webp.tmp')
                resized.save(temporary, 'WEBP', quality=78, method=6)
                if temporary.stat().st_size == 0:
                    raise RuntimeError(f'Empty image: {temporary}')
                temporary.replace(target)
            if width == 1600:
                after += target.stat().st_size
    optimized.add(url.path)
    post['imageResponsive'] = True

POSTS.write_text(json.dumps(posts, ensure_ascii=False, indent=2) + '\n', 'utf-8')


def add_sources(page):
    original = page.read_text('utf-8')

    def replace(match):
        tag = match.group(0)
        src_match = re.search(r'\bsrc="([^"]+)"', tag)
        if not src_match:
            return tag
        url = urlparse(src_match.group(1))
        if url.path not in optimized:
            return tag
        base = url.path[:-4]
        if 'class="article-cover"' in tag:
            sizes = '(max-width: 900px) calc(100vw - 24px), 880px'
        else:
            preceding = original[:match.start()]
            anchor = preceding[preceding.rfind('<a class='):]
            if '</a>' in anchor:
                anchor = ''
            if 'lead-card' in anchor[:200]:
                sizes = '(max-width: 1000px) calc(100vw - 24px), 65vw'
            elif 'stack-card' in anchor[:200]:
                sizes = '(max-width: 700px) 120px, 160px'
            else:
                sizes = '(max-width: 700px) calc(100vw - 24px), (max-width: 1000px) 48vw, 25vw'
        clean = re.sub(r'\s(?:srcset|sizes)="[^"]*"', '', tag)
        attrs = f' srcset="{base}-640.webp 640w, {base}-1600.webp 1600w" sizes="{sizes}"'
        return clean[:-1] + attrs + '>'

    updated = re.sub(r'<img\b[^>]*>', replace, original)
    if updated != original:
        page.write_text(updated, 'utf-8')
        return 1
    return 0


pages = sum(add_sources(page) for page in list(ROOT.glob('*.html')) + list((ROOT / 'articles').glob('*.html')) if page.name != 'admin.html')
print(f'{len(optimized)} covers optimized, {pages} HTML files updated; full-width bytes {before:,} -> {after:,}')
