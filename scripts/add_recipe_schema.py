"""Add Recipe JSON-LD only when ingredients and ordered steps are visible.

This changes one structured-data script per eligible article. The rendered
article body, title, dates, and images stay byte-for-byte unchanged.
"""

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = re.compile(r'(<script\b[^>]*\btype="application/ld\+json"[^>]*>)(.*?)(</script>)', re.S | re.I)
BODY = re.compile(r'<div class="article-body">(.*?)(?:</article>|<script)', re.S)
HEADING = re.compile(r'<h[23][^>]*>(.*?)</h[23]>', re.S | re.I)
LIST = re.compile(r'<(ul|ol)[^>]*>(.*?)</\1>', re.S | re.I)
ITEM = re.compile(r'<li(?:\s[^>]*)?>(.*?)</li>', re.S | re.I)


def clean(value):
    value = re.sub(r'<[^>]+>', ' ', value)
    return re.sub(r'\s+', ' ', html.unescape(value)).strip()


def visible_recipe(source):
    match = BODY.search(source)
    if not match:
        return None
    body = match.group(1)
    ingredients = steps = None
    for section in LIST.finditer(body):
        headings = HEADING.findall(body[:section.start()])
        label = clean(headings[-1]) if headings else ''
        items = [clean(item) for item in ITEM.findall(section.group(2))]
        items = [item for item in items if item]
        if section.group(1).lower() == 'ul' and re.search(r'ингредиент|понадоб|продукт|состав|порци', label, re.I) and len(items) >= 2:
            ingredients = items
        if section.group(1).lower() == 'ol' and re.search(r'как |приготов|порядок|шаг|способ|готовим|делаем|сборк', label, re.I) and len(items) >= 2:
            steps = items
    return (ingredients, steps) if ingredients and steps else None


def update(path):
    source = path.read_text(encoding='utf-8')
    recipe = visible_recipe(source)
    if not recipe:
        return False
    for match in SCRIPT.finditer(source):
        try:
            schema = json.loads(match.group(2))
        except json.JSONDecodeError:
            continue
        if not isinstance(schema, dict):
            continue
        nodes = schema.get('@graph') if isinstance(schema.get('@graph'), list) else [schema]
        article = next((node for node in nodes if isinstance(node, dict) and node.get('@type') in ('Article', 'NewsArticle', 'BlogPosting')), None)
        if not article:
            continue
        if not article.get('image') or not (article.get('headline') or article.get('name')):
            return False
        article['@type'] = 'Recipe'
        article['name'] = article.get('headline') or article.get('name')
        article['recipeIngredient'] = recipe[0]
        article['recipeInstructions'] = [{'@type': 'HowToStep', 'text': step} for step in recipe[1]]
        rendered = json.dumps(schema, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
        changed = source[:match.start(2)] + rendered + source[match.end(2):]
        assert changed[:match.start(2)] == source[:match.start(2)]
        assert changed[match.start(2) + len(rendered):] == source[match.end(2):]
        path.write_text(changed, encoding='utf-8')
        return True
    return False


def main():
    posts = json.loads((ROOT / 'data/posts.json').read_text(encoding='utf-8'))
    changed = skipped = 0
    for post in posts:
        if post.get('type', '').lower() != 'recipe':
            continue
        path = ROOT / 'articles' / (post['slug'] + '.html')
        if not path.exists():
            raise FileNotFoundError(path)
        if update(path):
            changed += 1
        else:
            skipped += 1
    print(f'Recipe schema: updated {changed}, unchanged or ineligible {skipped}')


if __name__ == '__main__':
    main()
