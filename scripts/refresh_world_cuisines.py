#!/usr/bin/env python3
import json
import re
from datetime import datetime, timezone
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / 'drafts' / 'world-cuisines'
REGISTRY = DRAFT / 'final-photo-registry-95.json'
POSTS = ROOT / 'data' / 'posts.json'
WORLD = ROOT / 'world-cuisines.html'
STYLES = ROOT / 'assets' / 'styles.css'

SECTION_IDS = {
    'Китай': 'kitay',
    'Белоруссия': 'belorussiya',
    'Италия': 'italiya',
    'Германия': 'germaniya',
    'Америка': 'amerika',
    'Африка': 'afrika',
    'Грузия': 'gruziya',
    'Узбекская': 'uzbekskaya',
    'Армения': 'armeniya',
    'Татарская': 'tatarskaya',
    'Английские завтраки': 'english-breakfast',
    'Напитки мира (безалкогольные)': 'drinks',
    'Япония': 'yaponiya',
    'Корея': 'koreya',
    'Таиланд': 'tailand',
    'Тайланд': 'tailand',
    'Вьетнам': 'vietnam',
    'Индия': 'indiya',
    'Польша': 'polsha',
    'Русская': 'russkaya',
}


def read_json(path):
    return json.loads(path.read_text('utf-8'))


def duration_ru(value):
    if not value or not value.startswith('PT'):
        return value or '—'
    h = re.search(r'(\d+)H', value)
    m = re.search(r'(\d+)M', value)
    parts = []
    if h:
        parts.append(f'{int(h.group(1))} ч')
    if m:
        parts.append(f'{int(m.group(1))} мин')
    return ' '.join(parts) or '—'


def strip_ingredients_section(content):
    content = re.sub(r'<h2>Что понадобится</h2>\s*<ul>.*?</ul>', '', content, flags=re.S | re.I)
    content = re.sub(r'<h2>Ингредиенты</h2>\s*<ul>.*?</ul>', '', content, flags=re.S | re.I)
    return content.strip()


def split_first_paragraph(content):
    m = re.match(r'\s*(<p>.*?</p>)(.*)$', content, flags=re.S | re.I)
    if not m:
        return '', content
    return m.group(1), m.group(2).strip()


def step_note(text):
    t = text.lower()
    if any(x in t for x in ['нареж', 'нашинку', 'разберите', 'кубик', 'ломтик']):
        return 'Старайтесь делать кусочки близкого размера: так они дойдут до нужной текстуры одновременно, а в готовом блюде не будет одновременно сырых и переваренных частей.'
    if any(x in t for x in ['обжар', 'подрумян', 'жарьте', 'жарить']):
        return 'Если продукты лежат на сковороде слишком тесно, лучше работать партиями. При свободном расположении поверхность быстрее подрумянивается, а лишняя влага успевает испаряться.'
    if any(x in t for x in ['выпека', 'духовк', 'печь']):
        return 'Температура реальной духовки может отличаться от установленной, поэтому в конце ориентируйтесь не только на минуты, но и на цвет, упругость и состояние центра изделия.'
    if any(x in t for x in ['варите', 'варить', 'кип', 'бульон', 'суп']):
        return 'Сильное бурное кипение здесь не требуется. Проверяйте готовность ближе к нижней границе времени и при необходимости добавляйте минуты небольшими интервалами.'
    if any(x in t for x in ['туш', 'томите', 'под крышк']):
        return 'Поддерживайте умеренный нагрев: задача этапа — постепенно размягчить продукты и соединить вкус, не превращая содержимое посуды в бесформенную массу.'
    if any(x in t for x in ['тесто', 'замес', 'мук', 'дрожж']):
        return 'С мукой лучше не спешить: влажность продуктов отличается, поэтому добавляйте её постепенно и ориентируйтесь на описанную в шаге консистенцию теста.'
    if any(x in t for x in ['соус', 'уксус', 'сахар', 'соев']):
        return 'После добавления соуса перемешайте так, чтобы он покрыл продукты равномерно. Перед финальной корректировкой вкуса дайте смеси прогреться и только потом решайте, нужно ли что-то добавлять.'
    if any(x in t for x in ['яйц', 'омлет', 'желток']):
        return 'Яичная часть быстро меняет текстуру от нагрева, поэтому на этом этапе особенно важно не отвлекаться и снять блюдо с огня в тот момент, который указан в рецепте.'
    if any(x in t for x in ['охлад', 'холодиль', 'лед', 'лёд']):
        return 'Не пропускайте охлаждение, если оно указано: температура здесь влияет не только на подачу, но и на итоговую плотность и ощущение блюда.'
    if any(x in t for x in ['перемеш', 'соедин', 'смеш']):
        return 'Перемешивайте до равномерного распределения компонентов, но без лишней механической обработки: особенно это важно там, где нужно сохранить отдельные кусочки или воздушность.'
    return 'Время в шаге — ориентир. Посуда, размер кусочков и мощность плиты отличаются, поэтому перед переходом дальше проверьте фактическую текстуру блюда.'


def recipe_body(article):
    dish = article.get('dish') or article.get('headline') or 'блюдо'
    cuisine = article.get('cuisine') or 'Кухни мира'
    ingredients = article.get('recipeIngredient') or []
    steps = article.get('recipeInstructions') or []
    old = strip_ingredients_section(article.get('content') or '')
    intro, notes = split_first_paragraph(old)
    lead = article.get('lead') or ''
    yield_text = article.get('recipeYield') or 'по рецепту'

    facts = (
        '<div class="recipe-facts" aria-label="Кратко о рецепте">'
        f'<div><span>Подготовка</span><strong>{escape(duration_ru(article.get("prepTime")))}</strong></div>'
        f'<div><span>Готовка</span><strong>{escape(duration_ru(article.get("cookTime")))}</strong></div>'
        f'<div><span>Всего</span><strong>{escape(duration_ru(article.get("totalTime")))}</strong></div>'
        f'<div><span>Выход</span><strong>{escape(yield_text)}</strong></div>'
        '</div>'
    )

    ing_html = ''.join(f'<li>{escape(x)}</li>' for x in ingredients)
    step_html = []
    for i, step in enumerate(steps, 1):
        step_html.append(
            f'<li><p><strong>Шаг {i}.</strong> {escape(step)}</p>'
            f'<p class="recipe-step-note">{escape(step_note(step))}</p></li>'
        )

    key_names = []
    for raw in ingredients[:4]:
        name = raw.split('—', 1)[0].strip(' ;')
        if name:
            key_names.append(name)
    keys = ', '.join(key_names)

    extra = (
        f'<h2>Как организовать приготовление {escape(dish)}</h2>'
        f'<p>У этого рецепта есть понятная логика: сначала подготовьте все продукты, затем выполняйте шаги подряд и не пытайтесь ускорить процесс одновременной закладкой всего в одну посуду. '
        f'Для {escape(dish)} особенно важны пропорции и последовательность, потому что именно они определяют текстуру готового блюда.</p>'
        f'<p>Основные продукты здесь — {escape(keys)}. Отмерьте их до начала готовки, поставьте рядом специи, соусы и посуду. Тогда в момент активной жарки, варки или сборки не придётся отвлекаться на весы и нарезку.</p>'
        f'<h2>Как понять, что рецепт получился</h2>'
        f'<p>Ориентируйтесь на признаки, описанные в шагах: степень мягкости, цвет, густоту соуса и сохранность формы продуктов. Не пытайтесь «додержать ещё немного» только ради времени на таймере: у разных плит и посуды скорость нагрева отличается.</p>'
        f'<p>Перед подачей попробуйте блюдо и оцените баланс соли, кислоты, сладости и остроты там, где они есть в составе. Корректировать вкус удобнее в самом конце небольшими добавками, а не пытаться исправить сразу большой порцией соли или специй.</p>'
        f'<h2>О рецепте</h2>'
        f'<p>{escape(dish)} в этой публикации — домашняя версия блюда из направления «{escape(cuisine)}». Мы не выдаём её за единственно возможный традиционный вариант: задача рецепта — дать понятные пропорции, последовательность действий и результат, который можно повторить на обычной домашней кухне.</p>'
    )

    body = ''
    if intro:
        body += intro
    if lead:
        body += f'<p class="recipe-lead-note">{escape(lead)}</p>'
    body += facts
    body += f'<h2>Ингредиенты</h2><p>Количество рассчитано на {escape(yield_text)}.</p><ul class="recipe-ingredients">{ing_html}</ul>'
    body += f'<h2>Как приготовить {escape(dish)}</h2><ol class="recipe-steps">{"".join(step_html)}</ol>'
    if notes:
        body += '<div class="recipe-author-notes"><h2>Практические нюансы</h2>' + notes + '</div>'
    body += extra
    return body


def replace_article_body(path, article, modified):
    text = path.read_text('utf-8')
    new_body = recipe_body(article)
    pattern = re.compile(r'<div class="article-body">.*?</div></article>', re.S)
    repl = f'<div class="article-body">{new_body}</div></article>'
    text, n = pattern.subn(repl, text, count=1)
    if n != 1:
        raise RuntimeError(f'Could not replace article body: {path.name}')
    text = re.sub(r'<meta property="article:modified_time" content="[^"]+">', f'<meta property="article:modified_time" content="{modified}">', text, count=1)
    text = re.sub(r'"dateModified":"[^"]+"', f'"dateModified":"{modified}"', text, count=1)
    path.write_text(text, 'utf-8')


def refresh_world_page(articles, registry):
    text = WORLD.read_text('utf-8')
    order = {x['slug']: x['photoOrder'] for x in registry['items']}
    groups = {}
    for slug, a in articles.items():
        groups.setdefault(a.get('cuisine', ''), []).append((order.get(slug, 999), slug, a))

    for cuisine, section_id in SECTION_IDS.items():
        candidates = groups.get(cuisine, [])
        if not candidates and cuisine == 'Таиланд':
            candidates = groups.get('Тайланд', [])
        if not candidates and cuisine == 'Тайланд':
            candidates = groups.get('Таиланд', [])
        if not candidates:
            continue
        candidates.sort(key=lambda x: x[0])
        cards = []
        for _, slug, a in candidates:
            dish = a.get('dish') or a.get('headline') or slug
            image = f'/assets/uploads/{slug}-16x9.webp'
            cards.append(
                f'<a class="wc-dish" href="/articles/{slug}.html">'
                f'<img src="{image}" alt="{escape(dish)}" loading="lazy" width="480" height="270">'
                f'<span class="wc-dish-copy"><strong>{escape(dish)}</strong><span class="wc-open">Открыть рецепт</span></span>'
                f'</a>'
            )
        replacement = '<div class="wc-dishes">' + ''.join(cards) + '</div>'
        pattern = re.compile(rf'<div class="wc-dishes">.*?</div></section>(?=\s*(?:<section|<div class="wc-footnote"|</section>))', re.S)
        # Scope the replacement to the requested section only.
        sec_pat = re.compile(rf'(<section class="wc-section" id="{re.escape(section_id)}".*?<div class="wc-dishes">).*?(</div></section>)', re.S)
        m = sec_pat.search(text)
        if not m:
            raise RuntimeError(f'World cuisine section not found: {section_id}')
        text = text[:m.start()] + m.group(1).rsplit('<div class="wc-dishes">',1)[0] + replacement + '</section>' + text[m.end():]

    text = text.replace('Фото и полноценные карточки добавляются перед публикацией', 'Все 95 рецептов опубликованы — нажмите на карточку, чтобы открыть')
    marker = '<style id="wc-live-cards">'
    if marker not in text:
        css = '''<style id="wc-live-cards">
.wc-dish{padding:0;overflow:hidden;color:var(--ink);text-decoration:none;background:color-mix(in srgb,var(--paper) 76%,#f0e8df 24%);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.wc-dish:hover,.wc-dish:focus-visible{transform:translateY(-2px);border-color:var(--accent);box-shadow:0 9px 24px rgba(18,32,26,.13);outline:none}.wc-dish>img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#ddd}.wc-dish-copy{display:flex;min-height:92px;flex-direction:column;justify-content:space-between;padding:12px 13px}.wc-dish-copy strong{display:block}.wc-dish .wc-open{display:block;margin-top:10px;color:var(--accent);font:800 10px/1.2 Arial,sans-serif;text-transform:uppercase;letter-spacing:.06em}.wc-dish .wc-open:before{background:var(--accent)}
</style>'''
        text = text.replace('</head>', css + '</head>')
    WORLD.write_text(text, 'utf-8')


def ensure_article_css():
    css = STYLES.read_text('utf-8')
    marker = '/* world-cuisine-rich-recipes */'
    if marker in css:
        return
    css += '''\n\n/* world-cuisine-rich-recipes */
.recipe-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:24px 0;padding:14px;border:1px solid rgba(127,127,127,.25);border-radius:16px;background:rgba(127,127,127,.08)}
.recipe-facts div{min-width:0}.recipe-facts span{display:block;margin-bottom:4px;font-size:11px;opacity:.68}.recipe-facts strong{display:block;font-size:15px;line-height:1.25}.recipe-ingredients{padding-left:1.25em}.recipe-ingredients li{margin:.42em 0}.recipe-steps{padding-left:1.35em}.recipe-steps>li{margin:0 0 1.2em;padding-left:.25em}.recipe-steps>li>p{margin:.3em 0}.recipe-step-note{font-size:.94em;opacity:.78}.recipe-lead-note{padding:14px 16px;border-left:3px solid #ef5a36;background:rgba(239,90,54,.08);border-radius:0 12px 12px 0}.recipe-author-notes{margin-top:28px;padding-top:2px}.article-body h2{margin-top:1.35em}.article-body ul,.article-body ol{line-height:1.65}
@media(max-width:680px){.recipe-facts{grid-template-columns:repeat(2,minmax(0,1fr))}}
'''
    STYLES.write_text(css, 'utf-8')


def main():
    registry = read_json(REGISTRY)
    items = registry.get('items', [])
    if len(items) != 95:
        raise SystemExit(f'Expected 95 registry items, got {len(items)}')

    articles = {}
    for batch in sorted(DRAFT.glob('batch-*.json')):
        data = read_json(batch)
        for a in data.get('articles', []):
            slug = a.get('slug')
            if slug:
                articles[slug] = a

    expected = {x['slug'] for x in items}
    missing = expected - set(articles)
    if missing:
        raise SystemExit('Missing drafts: ' + ', '.join(sorted(missing)))

    modified = datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
    counts = []
    for slug in sorted(expected):
        path = ROOT / 'articles' / f'{slug}.html'
        if not path.exists():
            raise SystemExit(f'Missing published article: {slug}')
        replace_article_body(path, articles[slug], modified)
        plain = re.sub(r'<[^>]+>', ' ', recipe_body(articles[slug]))
        plain = re.sub(r'\s+', ' ', plain).strip()
        counts.append((slug, len(plain)))

    too_short = [(s, n) for s, n in counts if n < 2600]
    if too_short:
        raise SystemExit('Articles below 2600 visible characters: ' + ', '.join(f'{s}:{n}' for s,n in too_short))

    posts = read_json(POSTS)
    changed_posts = 0
    for p in posts:
        if p.get('slug') in expected:
            p['updatedAt'] = modified
            changed_posts += 1
    if changed_posts != 95:
        raise SystemExit(f'Expected 95 posts to update, got {changed_posts}')
    POSTS.write_text(json.dumps(posts, ensure_ascii=False, indent=2) + '\n', 'utf-8')

    refresh_world_page(articles, registry)
    ensure_article_css()

    registry['contentRefresh'] = {
        'status': 'rich-recipes-live',
        'updatedAt': modified,
        'minVisibleCharacters': min(n for _, n in counts),
        'maxVisibleCharacters': max(n for _, n in counts),
        'clickableCards': 95,
    }
    REGISTRY.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(f'Refreshed 95 recipes; visible chars {min(n for _,n in counts)}..{max(n for _,n in counts)}; cards linked=95')

if __name__ == '__main__':
    main()
