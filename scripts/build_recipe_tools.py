#!/usr/bin/env python3
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / 'data' / 'posts.json'
OUT = ROOT / 'data' / 'recipe-index.json'
STYLE = '<link rel="stylesheet" href="/assets/provkus-tools.css?v=20260925-2">'
SCRIPT = '<script src="/assets/provkus-tools-v2.js?v=20260925-2"></script>'

TAG_RE = re.compile(r'<[^>]+>')
LI_RE = re.compile(r'<li\b[^>]*>(.*?)</li>', re.I | re.S)
LIST_RE = re.compile(r'<(?:ul|ol)\b[^>]*>(.*?)</(?:ul|ol)>', re.I | re.S)
BODY_RE = re.compile(r'<div class="article-body">(.*?)(?:</div>\s*</article>|</div><!--)', re.I | re.S)
HEADING_RE = re.compile(r'<h[23]\b[^>]*>\s*(?:что понадобится|ингредиенты|продукты|состав|для [^<]{0,80} понадобится)[^<]*</h[23]>', re.I | re.S)
NEXT_HEADING_RE = re.compile(r'<h[23]\b', re.I)
QTY_RE = re.compile(r'\b\d+(?:[.,]\d+)?\s*(?:кг|г|гр|грамм\w*|мл|миллилитр\w*|л\b|литр\w*|шт\.?|штук\w*|ст\.?\s*л\.?|ч\.?\s*л\.?|стол\w*\s+лож\w*|чайн\w*\s+лож\w*|лож\w*|стак\w*)', re.I)
LEADING_QTY_RE = re.compile(r'^\s*\d+(?:[.,]\d+)?\s*(?:(?:кг|г|гр|грамм\w*|мл|миллилитр\w*|л\b|литр\w*|шт\.?|штук\w*|ст\.?\s*л\.?|ч\.?\s*л\.?|стол\w*\s+лож\w*|чайн\w*\s+лож\w*|лож\w*|стак\w*)\s*)?', re.I)
INGREDIENT_HINT_RE = re.compile(r'\b(?:яйц|мук|сахар|соль|перец|масл|молок|слив|сметан|сыр|творог|кур|говяд|свинин|фарш|рыб|лосос|тунц|рис|греч|макарон|лапш|картоф|лук|морков|свекл|капуст|помид|томат|огур|перец|тыкв|кабач|баклаж|гриб|шампин|яблок|груш|банан|апельс|лимон|ананас|виноград|слив[аы]|орех|мед|шоколад|фасол|нут|чечев|майонез|зелень|чеснок|укроп|петруш|хлеб|батон|сухар)\w*\b', re.I)

CANONICAL = [
    (r'\b(?:луковица|лук репчатый|репчатый лук)\b', 'лук репчатый'),
    (r'\b(?:яйца?|яиц)\b', 'яйца'),
    (r'\b(?:куриное филе|филе курицы|куриная грудка)\b', 'куриная грудка'),
    (r'\b(?:томаты?|помидоры?)\b', 'помидоры'),
    (r'\b(?:огурцы?|огурец)\b', 'огурцы'),
    (r'\b(?:картошка|картофель)\b', 'картофель'),
    (r'\b(?:шампиньоны?|грибы?)\b', 'грибы'),
    (r'\b(?:мука пшеничная|пшеничная мука)\b', 'мука'),
    (r'\b(?:растительное|подсолнечное|оливковое) масло\b', 'растительное масло'),
]


def clean(value: str) -> str:
    value = re.sub(r'<br\s*/?>', ' ', value, flags=re.I)
    value = TAG_RE.sub('', value)
    return re.sub(r'\s+', ' ', html.unescape(value)).strip(' \n\t;')


def ingredientish(line: str) -> bool:
    text = clean(line)
    if len(text) > 180:
        return False
    return bool(QTY_RE.search(text) or re.search(r'\bпо вкусу\b', text, re.I) or INGREDIENT_HINT_RE.search(text))


def ingredient_name(line: str) -> str:
    raw = clean(line).lower().replace('ё', 'е')
    raw = re.sub(r'\([^)]*\)', ' ', raw)
    raw = re.sub(r'\b(?:по вкусу|для подачи|для жарки|для смазывания)\b.*$', '', raw, flags=re.I)
    # "Мука — 2 ст. л." -> "мука". Keep hyphens inside words.
    dash = re.split(r'\s+[—–-]\s+', raw, maxsplit=1)
    if len(dash) > 1 and (QTY_RE.search(dash[1]) or re.search(r'\d', dash[1])):
        raw = dash[0]
    else:
        # "2 ст. л. муки" / "1 луковица" / "3 яйца"
        raw = LEADING_QTY_RE.sub('', raw)
    raw = re.sub(r'^(?:небольш\w*|средн\w*|крупн\w*|маленьк\w*|примерно|около)\s+', '', raw)
    raw = re.sub(r'\s+(?:—|-)?\s*\d+(?:[.,]\d+)?.*$', '', raw)
    raw = re.sub(r'\b(?:нарезанн\w*|измельченн\w*|очищенн\w*|терт\w*|по вкусу)\b', ' ', raw)
    raw = re.sub(r'\s+', ' ', raw).strip(' ,.;:—–-')
    for pattern, canonical in CANONICAL:
        if re.search(pattern, raw, re.I):
            return canonical
    return raw


def heading_section(body: str):
    hit = HEADING_RE.search(body)
    if not hit:
        return ''
    rest = body[hit.end():]
    next_h = NEXT_HEADING_RE.search(rest)
    return rest[:next_h.start()] if next_h else rest


def list_candidates(body: str):
    candidates = []
    for match in LIST_RE.finditer(body):
        rows = [clean(x) for x in LI_RE.findall(match.group(1))]
        rows = [x for x in rows if x]
        if not rows:
            continue
        score = sum(2 if QTY_RE.search(x) else 1 if ingredientish(x) else -2 for x in rows)
        qty = sum(bool(QTY_RE.search(x)) for x in rows)
        hints = sum(bool(INGREDIENT_HINT_RE.search(x)) for x in rows)
        candidates.append((score + qty + hints, rows))
    return sorted(candidates, key=lambda x: x[0], reverse=True)


def prose_ingredients(section: str):
    text = clean(section)
    marker = re.search(r'(?:нам\s+понадоб(?:ится|ятся)|ингредиенты|продукты|состав)\s*:\s*(.+)', text, re.I)
    if not marker:
        return []
    tail = re.split(r'\b(?:приготовление|как готовить|шаг\s*\d+)\b', marker.group(1), maxsplit=1, flags=re.I)[0]
    parts = [x.strip() for x in re.split(r';|\.(?=\s+[А-ЯA-Z])', tail) if x.strip()]
    return [x for x in parts if ingredientish(x)][:40]


def extract_ingredients(doc: str):
    body_match = BODY_RE.search(doc)
    body = body_match.group(1) if body_match else doc
    section = heading_section(body)
    rows = []
    if section:
        for lst in LIST_RE.findall(section):
            candidate = [clean(x) for x in LI_RE.findall(lst)]
            candidate = [x for x in candidate if x and ingredientish(x)]
            if len(candidate) >= 2:
                rows = candidate
                break
        if not rows:
            rows = prose_ingredients(section)
    if not rows:
        ranked = list_candidates(body)
        if ranked and ranked[0][0] >= 3:
            rows = [x for x in ranked[0][1] if ingredientish(x)]
    if not rows:
        rows = prose_ingredients(body)
    seen, result = set(), []
    for row in rows[:40]:
        key = row.lower()
        if key not in seen:
            seen.add(key)
            result.append(row)
    return result


def inject_assets(doc: str) -> str:
    # Replace old tool versions as well, so all recipes use one engine.
    doc = re.sub(r'<link rel="stylesheet" href="/assets/provkus-tools\.css[^>]*>', '', doc)
    doc = re.sub(r'<script src="/assets/provkus-tools(?:-v2)?\.js[^>]*></script>', '', doc)
    doc = doc.replace('</head>', STYLE + '</head>', 1)
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
            if name and len(name) <= 80 and name not in names:
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
    with_ingredients = sum(len(x['ingredients']) >= 2 for x in recipes)
    print(f'Indexed {len(recipes)} recipes; with 2+ ingredients: {with_ingredients}')
    for x in recipes:
        if len(x['ingredients']) < 2:
            print('WARN weak ingredient extraction:', x['slug'], x['ingredients'])


if __name__ == '__main__':
    main()
