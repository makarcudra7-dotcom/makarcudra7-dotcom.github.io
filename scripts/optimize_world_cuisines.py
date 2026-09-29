#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT / 'world-cuisines.html'
PERF_STYLE = '''<style id="wc-performance">
#wcList .wc-section{content-visibility:auto;contain-intrinsic-size:auto 520px}
#wcList .wc-section:first-child{content-visibility:visible}
</style>'''


def drop_attr(tag, name):
    return re.sub(rf'\s{name}=("|\').*?\1', '', tag, flags=re.I | re.S)


def set_attr(tag, name, value):
    tag = drop_attr(tag, name)
    return tag.replace('<img', f'<img {name}="{value}"', 1)


def get_attr(tag, name):
    match = re.search(rf'\s{name}=("|\')(.*?)\1', tag, flags=re.I | re.S)
    return match.group(2) if match else ''


def main():
    text = WORLD.read_text('utf-8')

    # The old implementation rendered a blank SVG first and waited for JS +
    # IntersectionObserver to replace it. That made images look slow/broken.
    text = re.sub(
        r'<script\s+src="/assets/world-cuisines-lazy\.js(?:\?[^\"]*)?"\s+defer></script>',
        '',
        text,
        flags=re.I,
    )
    text = re.sub(r'<style id="wc-performance">.*?</style>', PERF_STYLE, text, count=1, flags=re.S)
    if 'id="wc-performance"' not in text:
        text = text.replace('</head>', PERF_STYLE + '</head>', 1)

    image_index = 0

    def normalize_image(match):
        nonlocal image_index
        tag = match.group(0)
        src = get_attr(tag, 'data-src') or get_attr(tag, 'src')
        if '/assets/uploads/' not in src or '-16x9.webp' not in src:
            return tag

        current = image_index
        image_index += 1
        tag = drop_attr(tag, 'data-src')
        tag = set_attr(tag, 'src', src)
        tag = set_attr(tag, 'decoding', 'async')

        # First desktop row is visible immediately. Remaining recipe art uses
        # browser-native lazy loading, with no JavaScript placeholder stage.
        if current < 4:
            tag = set_attr(tag, 'loading', 'eager')
            tag = set_attr(tag, 'fetchpriority', 'auto')
        else:
            tag = set_attr(tag, 'loading', 'lazy')
            tag = set_attr(tag, 'fetchpriority', 'low')
        return tag

    text = re.sub(r'<img\b[^>]*>', normalize_image, text, flags=re.I | re.S)
    WORLD.write_text(text, 'utf-8')

    final = WORLD.read_text('utf-8')
    recipe_images = len(re.findall(r'<img\b[^>]*src="/assets/uploads/[^\"]+-16x9\.webp"', final, flags=re.I))
    deferred = final.count('data-src="/assets/uploads/')
    if recipe_images != 95 or deferred != 0:
        raise SystemExit(f'Performance verification failed: native={recipe_images}, deferred={deferred}')
    if 'world-cuisines-lazy.js' in final:
        raise SystemExit('Legacy world-cuisines lazy loader is still linked')
    print(f'World cuisines optimized: native images={recipe_images}, eager=4, lazy={recipe_images - 4}')


if __name__ == '__main__':
    main()
