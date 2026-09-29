#!/usr/bin/env python3
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / 'data' / 'posts.json'
QUEUE = ROOT / '.github' / 'scheduled-posts.json'

LIVE_SLUG = 'privyazala-myaso-k-kryshke-kastryuli-snoha-snachala-udivilas-a-za-uzhinom-poprosila-nauchit-nezhnee-zharenogo'
SCHEDULED_SLUG = 'porcionnyy-salat-ledi-sobirayu-pryamo-v-bokale-kurica-ananas-na-prazdnike-razbirayut-ran-she-goryachego'

LIVE_INGREDIENTS = [
    'небольшой кусок курицы, индейки или нежирной свинины',
    'соль',
    'любимые специи',
    'вода для кастрюли',
    'пищевой хлопковый шпагат',
]
LIVE_STEPS = [
    'Мясо обсушите и натрите солью и специями.',
    'Кусок крепко обвяжите пищевым хлопковым шпагатом.',
    'В кастрюлю налейте воду и доведите её до тихого кипения.',
    'Закрепите мясо под крышкой так, чтобы оно висело внутри кастрюли и не касалось воды.',
    'Закройте кастрюлю. Вода должна спокойно кипеть всё время приготовления, а пар — свободно окружать кусок.',
    'Проверьте готовность в самой толстой части мяса кулинарным термометром. Для птицы ориентир — 74°C, для цельного куска свинины — 63°C, после чего дайте ему отдохнуть 3 минуты.',
]

SALAD_INGREDIENTS = [
    'отварное куриное филе — 300 г',
    'консервированный ананас — 150 г',
    'варёные яйца — 3 шт.',
    'сливочный сыр — 150 г',
    'твёрдый сыр — 100 г',
    'грецкие орехи или миндаль — 1 горсть',
    'майонез — 2–3 ст. л.',
    'натуральный йогурт — 2 ст. л.',
    'соль — по вкусу',
    'зелень — для украшения',
]
SALAD_STEPS = [
    'Смешайте майонез и натуральный йогурт до однородной заправки.',
    'Нарежьте курицу и хорошо обсушенный ананас небольшими кубиками, яйца натрите на мелкой тёрке. Орехи слегка подрумяньте на сухой сковороде и крупно измельчите.',
    'Разложите по бокалам курицу, немного соли и тонкий слой соуса. Затем добавьте ананас, ещё немного заправки, яйца, сливочный сыр, орехи и тёртый твёрдый сыр.',
    'Украсьте сверху тонкой долькой ананаса и зеленью.',
    'Уберите бокалы в холодильник примерно на 30 минут перед подачей.',
]


def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return default


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def add_class(tag, class_name):
    if ' class=' in tag:
        return re.sub(r'class="([^"]*)"', lambda m: f'class="{m.group(1)} {class_name}"' if class_name not in m.group(1).split() else m.group(0), tag, count=1)
    return tag[:-1] + f' class="{class_name}">'


def class_list_after_heading(doc, heading_pattern, tag_name, class_name):
    pattern = re.compile(rf'(<h[23][^>]*>\s*{heading_pattern}\s*</h[23]>)([\s\S]*?)(<{tag_name}\b[^>]*>)', re.I)
    return pattern.sub(lambda m: m.group(1) + m.group(2) + add_class(m.group(3), class_name), doc, count=1)


def update_live_article():
    path = ROOT / 'articles' / f'{LIVE_SLUG}.html'
    if not path.exists():
        return False
    doc = path.read_text(encoding='utf-8')
    old = doc
    doc = re.sub(r'(<div class="article-kicker">)Советы и лайфхаки', r'\1Рецепты', doc, count=1)
    doc = class_list_after_heading(doc, r'Что понадобится', 'ul', 'recipe-ingredients')
    doc = class_list_after_heading(doc, r'Готовим шаг за шагом', 'ol', 'recipe-steps')

    if 'class="recipe-author-notes"' not in doc:
        start = doc.find('<h2>Точного времени по минутам здесь нет</h2>')
        end = doc.find('<div class="note">', start if start >= 0 else 0)
        if start >= 0 and end > start:
            notes = doc[start:end]
            doc = doc[:start] + '<div class="recipe-author-notes"><h2>Практические нюансы</h2>' + notes + '</div>' + doc[end:]

    script_re = re.compile(r'<script type="application/ld\+json">([\s\S]*?)</script>', re.I)
    hit = script_re.search(doc)
    if hit:
        try:
            data = json.loads(hit.group(1))
            target = data
            if isinstance(data, dict) and isinstance(data.get('@graph'), list):
                target = next((x for x in data['@graph'] if str(x.get('@type', '')).lower() == 'recipe'), data['@graph'][0] if data['@graph'] else data)
            if isinstance(target, dict):
                target['@type'] = 'Recipe'
                target['articleSection'] = 'Рецепты'
                target['recipeIngredient'] = LIVE_INGREDIENTS
                target['recipeInstructions'] = [
                    {'@type': 'HowToStep', 'position': i + 1, 'text': step}
                    for i, step in enumerate(LIVE_STEPS)
                ]
                publisher = target.get('publisher')
                if isinstance(publisher, dict):
                    publisher['logo'] = {
                        '@type': 'ImageObject',
                        'url': 'https://provkus-media.ru/assets/provkus-logo.svg',
                        'contentUrl': 'https://provkus-media.ru/assets/provkus-logo.svg',
                        'width': 512,
                        'height': 512,
                    }
            encoded = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
            doc = doc[:hit.start(1)] + encoded + doc[hit.end(1):]
        except Exception as exc:
            print('WARN live JSON-LD update:', exc)

    if doc != old:
        path.write_text(doc, encoding='utf-8')
        return True
    return False


def salad_content():
    ingredients = ''.join(f'<li>{html.escape(x)}</li>' for x in SALAD_INGREDIENTS)
    steps = ''.join(f'<li><p>{html.escape(x)}</p></li>' for x in SALAD_STEPS)
    return (
        '<p>Большая салатница на праздничном столе быстро теряет аккуратный вид, а здесь каждому сразу достаётся своя порция. '
        'Салат «Леди» собирают прямо в прозрачных бокалах или креманках: нежная курица, сладковатый ананас, яйца, сливочный сыр и орехи образуют заметные слои.</p>'
        '<p>На столе выглядит нарядно, а делить закуску между гостями уже не приходится.</p>'
        '<!-- PV-RECIPE-TEMPLATE-START -->'
        '<h2>Ингредиенты</h2><ul class="recipe-ingredients">' + ingredients + '</ul>'
        '<h2>Как приготовить</h2><ol class="recipe-steps">' + steps + '</ol>'
        '<!-- PV-RECIPE-TEMPLATE-END -->'
        '<div class="recipe-author-notes"><h2>Практические нюансы</h2>'
        '<h2>Ананас сначала хорошо отжимают</h2><p>Лишний сироп быстро стечёт вниз и сделает нижние слои водянистыми, поэтому кусочки ананаса перед сборкой нужно хорошо обсушить.</p>'
        '<h2>Соуса нужно немного</h2><p>Заправка не должна превращаться в отдельный толстый слой: достаточно слегка соединить ингредиенты.</p>'
        '<h2>Для застолья лучше выставлять не все бокалы сразу</h2><p>Часть порций можно оставить в холодильнике и доставать по мере необходимости. Закуска содержит курицу, яйца и сыр, поэтому держать её часами на тёплом столе не стоит.</p>'
        '<h2>Личное мнение автора</h2><p>Я бы выбрала невысокие широкие бокалы: из них салат удобнее есть, а все слои хорошо видны. И ананас обязательно обсушила бы особенно тщательно — именно лишний сироп способен испортить красивую подачу.</p>'
        '</div>'
    )


def update_posts():
    posts = read_json(POSTS, [])
    changed = False
    for post in posts:
        if post.get('slug') == LIVE_SLUG:
            if post.get('category') != 'Рецепты':
                post['category'] = 'Рецепты'; changed = True
            if post.get('recipeIngredient') != LIVE_INGREDIENTS:
                post['recipeIngredient'] = LIVE_INGREDIENTS; changed = True
            if post.get('recipeInstructions') != LIVE_STEPS:
                post['recipeInstructions'] = LIVE_STEPS; changed = True
            if not post.get('recipeTemplateApplied'):
                post['recipeTemplateApplied'] = True; changed = True
    if changed:
        write_json(POSTS, posts)
    return changed


def update_queue():
    queue = read_json(QUEUE, [])
    changed = False
    for item in queue:
        if item.get('slug') != SCHEDULED_SLUG:
            continue
        material = item.setdefault('material', {})
        post = item.setdefault('post', {})
        desired_content = salad_content()
        updates = {
            'category': 'Рецепты',
            'type': 'recipe',
            'content': desired_content,
            'recipeIngredient': SALAD_INGREDIENTS,
            'recipeInstructions': SALAD_STEPS,
            'recipeCategory': 'Салат / закуска',
            'recipeTemplateApplied': True,
        }
        for key, value in updates.items():
            if material.get(key) != value:
                material[key] = value; changed = True
        for key, value in {
            'category': 'Рецепты',
            'type': 'recipe',
            'typeLabel': 'Рецепт',
            'recipeIngredient': SALAD_INGREDIENTS,
            'recipeInstructions': SALAD_STEPS,
            'recipeCategory': 'Салат / закуска',
            'recipeTemplateApplied': True,
        }.items():
            if post.get(key) != value:
                post[key] = value; changed = True
    if changed:
        write_json(QUEUE, queue)
    return changed


if __name__ == '__main__':
    live = update_live_article()
    posts = update_posts()
    queue = update_queue()
    print(f'recipe template backfill: live={live} posts={posts} queue={queue}')
