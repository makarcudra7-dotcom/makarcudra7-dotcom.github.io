#!/usr/bin/env python3
# Runs in the scheduled publishing pipeline before RSS is rebuilt.
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / 'articles'
FACTS = re.compile(
    r'(<span>Подготовка</span><strong>(\d+)\s*мин</strong>.*?'
    r'<span>Готовка</span><strong>(\d+)\s*мин</strong>.*?'
    r'<span>Всего</span><strong>)(\d+)\s*мин(</strong>)',
    re.I | re.S,
)
TOTAL_ISO = re.compile(r'"totalTime"\s*:\s*"PT(?:(\d+)H)?(?:(\d+)M)?"', re.I)


def iso_minutes(text: str):
    m = TOTAL_ISO.search(text)
    if not m:
        return None
    return (int(m.group(1) or 0) * 60) + int(m.group(2) or 0)


def main():
    changed = 0
    checked = 0
    for path in ARTICLES.glob('*.html'):
        text = path.read_text('utf-8')
        m = FACTS.search(text)
        if not m:
            continue
        checked += 1
        prep, cook, shown = map(int, m.group(2, 3, 4))
        expected = iso_minutes(text)
        if expected is None:
            expected = prep + cook
        # Only repair clear contradictions; do not rewrite legitimate recipes.
        if shown >= max(prep, cook) and abs(shown - expected) <= 10:
            continue
        replacement = f'{m.group(1)}{expected} мин{m.group(5)}'
        text = text[:m.start()] + replacement + text[m.end():]
        path.write_text(text, 'utf-8')
        changed += 1
        print(f'repaired recipe total: {path.name}: {shown} -> {expected} min')
    print(f'recipe time audit: checked={checked}, repaired={changed}')


if __name__ == '__main__':
    main()
