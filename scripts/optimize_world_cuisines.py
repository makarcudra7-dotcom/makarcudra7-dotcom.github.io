#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT / 'world-cuisines.html'
PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='270' viewBox='0 0 480 270'%3E%3Crect width='480' height='270' fill='%23e9e2d8'/%3E%3C/svg%3E"
SCRIPT_TAG = '<script src="/assets/world-cuisines-lazy.js?v=20260926-1" defer></script>'
PERF_STYLE = '''<style id="wc-performance">
#wcList .wc-section{content-visibility:auto;contain-intrinsic-size:auto 520px}
#wcList .wc-section:first-child{content-visibility:visible}
.wc-dish>img[data-src]{background:#e9e2d8}
</style>'''


def main():
    text = WORLD.read_text('utf-8')

    if 'data-src="/assets/uploads/' not in text:
        pat = re.compile(r'<img src="(?P<src>/assets/uploads/[^"]+-16x9\.webp)"(?P<attrs>[^>]*)>')
        def repl(m):
            attrs = m.group('attrs')
            attrs = re.sub(r'\sloading="[^"]*"', '', attrs)
            attrs = re.sub(r'\sdecoding="[^"]*"', '', attrs)
            attrs = re.sub(r'\sfetchpriority="[^"]*"', '', attrs)
            return (f'<img src="{PLACEHOLDER}" data-src="{m.group("src")}"{attrs}'
                    ' loading="lazy" decoding="async" fetchpriority="low">')
        text, count = pat.subn(repl, text)
        if count != 95:
            raise SystemExit(f'Expected to defer 95 world-cuisine images, changed {count}')
    else:
        count = text.count('data-src="/assets/uploads/')
        if count != 95:
            raise SystemExit(f'Expected 95 deferred images, found {count}')

    if 'id="wc-performance"' not in text:
        text = text.replace('</head>', PERF_STYLE + SCRIPT_TAG + '</head>', 1)
    elif SCRIPT_TAG not in text:
        text = text.replace('</head>', SCRIPT_TAG + '</head>', 1)

    WORLD.write_text(text, 'utf-8')

    final = WORLD.read_text('utf-8')
    deferred = final.count('data-src="/assets/uploads/')
    immediate = len(re.findall(r'<img src="/assets/uploads/[^\"]+-16x9\.webp"', final))
    if deferred != 95 or immediate:
        raise SystemExit(f'Performance verification failed: deferred={deferred}, immediate={immediate}')
    print(f'World cuisines optimized: deferred={deferred}, immediate recipe images={immediate}')


if __name__ == '__main__':
    main()
