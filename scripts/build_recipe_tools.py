#!/usr/bin/env python3
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / 'data' / 'posts.json'
OUT = ROOT / 'data' / 'recipe-index.json'
STYLE = '<link rel="stylesheet" href="/assets/provkus-tools.css?v=20260925-1">'
SCRIPT = '<script src="/assets/provkus-tools.js?v=20260925-1"></script>'

TAG_RE = re.compile(r'<[^>]+>')
LI_RE = re.compile(r'<li\b[^>]*>(.*?)</li>', re.I | re.S)
QTY_RE = re.compile(r'(?:\d+(?:[.,]\d+)?\s*(?:кг|г|гр|мл|л|шт|ст\.?\s*л|ч\.?\s*л|лож|стак))', re.I)
HEAD_RE = re.compile(r'<h[23]\b[^>]*>\s*(?:что понадобится|ингредиенты|продукты|для .*? понадобится).*?</h[23]>\s*(?:<p>)?\s*<ul\b[^>]*>(.*?)</ul>', re.I | re.S)
BODY_RE = re.compile(r'<div class="article-body">(.*?)(?:</div>\s*</article>|</div><!--)', re.I | re.S)


def clean(value: str) -> str:
    value = re.sub(r'<br\s*/?>', ' ', value, flags=re.I)
    value = TAG_RE.sub('', value)
    return re.sub(r'\s+', ' ', html.unescape(value)).strip(' \n\t;')


def ingredient_name(line: str) -> str:
    name = re.split(r'\s*[—–-]\s*|\s+\d+(?:[.,]\d+)?\s*(?:кг|г|гр|мл|л|шт|ст\.?\s*л|ч\.?\s*л|лож|стак)', line, maxsplit=1, flags=re.I)[0]
    name = re.sub(r'\([^)]*\)', '', name)
    name = re.sub(r'\bпо вкусу\b.*$', '', name, flags=re.I)
    return re.sub(r'\s+', ' ', name).strip(' ,.;:').lower()


def extract_ingredients(doc: str):
    body_match = BODY_RE.search(doc)
    body = body_match.group(1) if body_match else doc
    section = HEAD_RE.search(body)
    source = section.group(1) if section else body
    rows = [clean(x) for x in LI_RE.findall(source)]
    rows = [x for x in rows if x and (QTY_RE.search(x) or section)]
    if not rows and not section:
        rows = [clean(x) for x in LI_RE.findall(body) if QTY_RE.search(clean(x))]
    seen = set()
    result = []
    for row in rows[:40]:
        key = row.lower()
        if key not in seen:
            seen.add(key)
            result.append(row)
    return result


def inject_assets(doc: str) -> str:
    if 'provkus-tools.css' not in doc:
        doc = doc.replace('</head>', STYLE + '</head>', 1)
    if 'provkus-tools.js' not in doc:
        doc = doc.replace('</body>', SCRIPT + '</body>', 1)
    return doc


def main():
    posts = json.loads(POSTS.read_text(encoding='utf-8'))
    recipes = []
    for post in posts:
        if str(post.get('category', '')).lower() != 'рецепты' and str(post.get('type', '')).lower() != 'recipe':
            continue
        slug = post.get('slug')
        path = ROOT / 'articles' / f'{slug}.html'
        if not slug or not path.exists():
            continue
        doc = path.read_text(encoding='utf-8')
        lines = extract_ingredients(doc)
        names = []
        for line in lines:
            name = ingredient_name(line)
            if name and name not in names:
                names.append(name)
        recipes.append({
            'slug': slug,
            'headline': post.get('headline', ''),
            'url': post.get('url') or f'https://provkus-media.ru/articles/{slug}.html',
            'image': post.get('image', ''),
            'ingredients': names,
            'ingredientLines': lines,
            'updatedAt': post.get('updatedAt') or post.get('publishedAt', '')
        })
        updated = inject_assets(doc)
        if updated != doc:
            path.write_text(updated, encoding='utf-8')
    OUT.write_text(json.dumps(recipes, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Indexed {len(recipes)} recipes; with ingredients: {sum(bool(x["ingredients"]) for x in recipes)}')


if __name__ == '__main__':
    main()
