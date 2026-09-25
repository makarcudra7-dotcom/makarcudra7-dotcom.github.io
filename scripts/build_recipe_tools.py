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
UNIT = r'(?:кг|г|гр|грамм\w*|мл|миллилитр\w*|л\b|литр\w*|шт\.?|штук\w*|ст\.?\s*л\.?|ч\.?\s*л\.?|стол\w*\s+лож\w*|чайн\w*\s+лож\w*|лож\w*|стак\w*)'
QTY_RE = re.compile(r'\b\d+(?:[.,]\d+)?\s*' + UNIT, re.I)
LEADING_QTY_RE = re.compile(r'^\s*\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?\s*(?:' + UNIT + r')?\s*', re.I)
INGREDIENT_HINT_RE = re.compile(r'\b(?:яйц|мук|сахар|соль|перец|масл|молок|сливк|сметан|сыр|творог|кур|говяд|свинин|фарш|рыб|лосос|тунц|рис|греч|макарон|лапш|картоф|лук|морков|свекл|капуст|помид|томат|огур|тыкв|кабач|баклаж|гриб|шампин|яблок|груш|банан|апельс|лимон|ананас|виноград|слив[аы]|орех|мед|шоколад|фасол|нут|чечев|майонез|зелень|чеснок|укроп|петруш|хлеб|батон|сухар|разрыхл|горчиц|соев)\w*\b', re.I)

CANONICAL = [
    (r'\bлуковиц\w*\b|\bлук репчат\w*\b|\bрепчат\w* лук\b', 'лук'),
    (r'\bяйц\w*\b', 'яйца'),
    (r'\bкурин\w* (?:филе|грудк\w*)\b|\bфиле куриц\w*\b', 'курица'),
    (r'\bтомат\w*\b|\bпомидор\w*\b', 'помидоры'),
    (r'\bогурц\w*\b|\bогурец\b', 'огурцы'),
    (r'\bкартофел\w*\b|\bкартошк\w*\b', 'картофель'),
    (r'\bшампиньон\w*\b|\bгриб\w*\b', 'грибы'),
    (r'\bмук\w*\b', 'мука'),
    (r'\bмайонез\w*\b', 'майонез'),
    (r'\bсметан\w*\b', 'сметана'),
    (r'\bтворог\w*\b', 'творог'),
    (r'\bсыр\w*\b', 'сыр'),
    (r'\bрастительн\w* масло\b|\bподсолнечн\w* масло\b|\bоливков\w* масло\b', 'растительное масло'),
    (r'\bчеснок\w*\b|\bзубчик\w* чеснок\w*\b', 'чеснок'),
    (r'\bлимонн\w* сок\w*\b', 'лимонный сок'),
    (r'\bсоев\w* соус\w*\b', 'соевый соус'),
    (r'\bболгарск\w* перец\w*\b|\bсладк\w* перец\w*\b', 'болгарский перец'),
    (r'\bпетрушк\w*\b', 'петрушка'),
    (r'\bразрыхлител\w*\b', 'разрыхлитель'),
]


def clean(value: str) -> str:
    value = re.sub(r'<br\s*/?>', ' ', value, flags=re.I)
    value = TAG_RE.sub('', value)
    return re.sub(r'\s+', ' ', html.unescape(value)).strip(' \n\t;')


def ingredientish(line: str) -> bool:
    text = clean(line)
    return len(text) <= 180 and bool(QTY_RE.search(text) or re.search(r'\bпо вкусу\b', text, re.I) or INGREDIENT_HINT_RE.search(text))


def ingredient_name(line: str) -> str:
    raw = clean(line).lower().replace('ё', 'е')
    raw = re.sub(r'\([^)]*\)', ' ', raw)
    raw = re.sub(r'\b(?:по вкусу|для подачи|для жарки|для смазывания)\b.*$', '', raw, flags=re.I)
    dash = re.split(r'\s+[—–-]\s+', raw, maxsplit=1)
    if len(dash) > 1 and (QTY_RE.search(dash[1]) or re.search(r'\d', dash[1])):
        raw = dash[0]
    else:
        raw = LEADING_QTY_RE.sub('', raw)
    # Handles count nouns: "1 луковица", "3 яйца" after numeric prefix removal.
    raw = re.sub(r'^(?:небольш\w*|средн\w*|крупн\w*|маленьк\w*|примерно|около)\s+', '', raw)
    raw = re.sub(r'\s+(?:—|-)?\s*\d+(?:[.,]\d+)?.*$', '', raw)
    raw = re.sub(r'\b(?:нарезанн\w*|измельченн\w*|очищенн\w*|терт\w*)\b', ' ', raw)
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
    for i, match in enumerate(LIST_RE.finditer(body)):
        rows = [clean(x) for x in LI_RE.findall(match.group(1))]
        rows = [x for x in rows if x]
        if not rows:
            continue
        good = [x for x in rows if ingredientish(x)]
        score = sum(3 if QTY_RE.search(x) else 1 for x in good) - 2 * (len(rows) - len(good))
        candidates.append((score, i, good))
    return sorted(candidates, key=lambda x: x[0], reverse=True)


def prose_ingredients(section: str):
    text = clean(section)
    marker = re.search(r'(?:нам\s+понадоб(?:ится|ятся)|ингредиенты|продукты|состав)\s*:\s*(.+)', text, re.I)
    if not marker:
        return []
    tail = re.split(r'\b(?:приготовление|как готовить|шаг\s*\d+)\b', marker.group(1), maxsplit=1, flags=re.I)[0]
    parts = [x.strip() for x in re.split(r';|\.(?=\s+[А-ЯA-Z])', tail) if x.strip()]
    return [x for x in parts if ingredientish(x)][:40]


def inline_quantity_pairs(body: str):
    text = clean(body)
    found = []
    # "творог — 200 г", "яблоки - 4 шт."
    pattern = re.compile(r'([А-Яа-яЁё][А-Яа-яЁё\s%-]{1,45}?)\s*[—–-]\s*(\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?\s*' + UNIT + r')', re.I)
    for m in pattern.finditer(text):
        name = re.sub(r'^.*?[.;:]\s*', '', m.group(1)).strip()
        line = f'{name} — {m.group(2)}'
        if INGREDIENT_HINT_RE.search(name) and len(name) <= 50:
            found.append(line)
    # "2 ст. л. муки", "3 яйца", "1 луковица"
    pattern2 = re.compile(r'(\d+(?:[.,]\d+)?\s*' + UNIT + r'\s+[А-Яа-яЁё][А-Яа-яЁё\s-]{1,35}|\d+\s+(?:яйц\w*|яблок\w*|луковиц\w*|картофел\w*))', re.I)
    for m in pattern2.finditer(text):
        line = m.group(1).strip()
        if ingredientish(line):
            found.append(line)
    return found


def extract_ingredients(doc: str):
    body_match = BODY_RE.search(doc)
    body = body_match.group(1) if body_match else doc
    rows = []
    section = heading_section(body)
    if section:
        for lst in LIST_RE.findall(section):
            rows.extend(x for x in (clean(v) for v in LI_RE.findall(lst)) if x and ingredientish(x))
        if not rows:
            rows.extend(prose_ingredients(section))
    ranked = list_candidates(body)
    # Merge several ingredient-like lists. This covers recipes with separate base/sauce lists.
    if len(rows) < 4:
        for score, _, candidate in ranked[:4]:
            if score < 4 or len(candidate) < 2:
                continue
            rows.extend(candidate)
    if len(rows) < 3:
        rows.extend(prose_ingredients(body))
    if len(rows) < 3:
        rows.extend(inline_quantity_pairs(body))
    seen, result = set(), []
    for row in rows:
        row = clean(row)
        key = row.lower()
        if row and key not in seen and ingredientish(row):
            seen.add(key)
            result.append(row)
        if len(result) >= 40:
            break
    return result


def inject_assets(doc: str) -> str:
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
        recipes.append({'slug':slug,'headline':post.get('headline',''),'url':post.get('url') or f'https://provkus-media.ru/articles/{slug}.html','image':post.get('image',''),'ingredients':names,'ingredientLines':lines,'updatedAt':post.get('updatedAt') or post.get('publishedAt','')})
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
