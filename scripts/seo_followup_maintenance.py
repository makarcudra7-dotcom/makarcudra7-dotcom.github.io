"""Finish low-risk on-page SEO cleanup without changing any <title> values."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://provkus-media.ru"

FAVICONS = (
    '<link rel="icon" href="/favicon.ico?v=20260923" sizes="any">'
    '<link rel="icon" type="image/png" sizes="64x64" href="/favicon.png?v=20260923">'
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=20260923">'
)

PAGE_SCHEMA_TYPES = {
    "editorial.html": "AboutPage",
    "editorial-policy.html": "WebPage",
}

SUPPORTING_COPY = {
    "editorial.html": '''<section class="seo-supporting-copy" aria-labelledby="editorial-process"><h2 id="editorial-process">Как устроена редакционная проверка</h2><p>Перед публикацией редакция отделяет проверяемые факты от авторских наблюдений и вкусовых оценок. Для рекомендаций, где неточность может повлиять на здоровье, безопасность пищи или безопасное хранение продуктов, нужен релевантный надёжный источник. Для обычных рецептов, идей подачи и субъективных вкусовых заметок внешняя ссылка не является обязательной.</p><p>Если материал содержит значимые рекомендации по безопасности, редактор сверяет формулировки с профильным источником, а на странице появляется отметка «Проверено редакцией». При обнаружении существенной ошибки текст исправляется; когда изменение влияет на смысл материала, указывается дата обновления. Читатель может сообщить о неточности через страницу контактов, указав ссылку на публикацию и фрагмент, который требует проверки.</p></section>''',
    "editorial-policy.html": '''<section class="seo-supporting-copy" aria-labelledby="source-selection"><h2 id="source-selection">Как выбираются источники</h2><p>Приоритет зависит от темы. Для вопросов пищевой безопасности и здоровья редакция в первую очередь ищет рекомендации государственных и международных профильных организаций, официальные нормативные материалы и первичные документы. Вторичные публикации используются, когда они точно передают исходные данные и позволяют проверить происхождение утверждения.</p><p>Наличие ссылки само по себе не делает утверждение достоверным: редакция сопоставляет источник с конкретной рекомендацией, проверяет актуальность и не переносит выводы на ситуации, которых источник не рассматривает. Если надёжного подтверждения для потенциально значимой рекомендации нет, такую формулировку следует убрать, сузить или представить как непроверенную гипотезу, а не как совет.</p><h2>Что означает «Проверено редакцией»</h2><p>Эта отметка используется только там, где редакционная проверка действительно нужна из-за возможных последствий ошибки. Она означает, что значимые рекомендации материала были сверены с указанным профильным источником. Отметка не ставится автоматически на каждый рецепт или бытовой текст и не означает медицинскую консультацию.</p></section>''',
    "contacts.html": '''<section class="seo-supporting-copy" aria-labelledby="contact-how"><h2 id="contact-how">Как обратиться в редакцию</h2><p>Если вы заметили фактическую неточность, пришлите ссылку на материал и укажите конкретный фрагмент, который стоит перепроверить. Для замечаний по безопасности продуктов, хранению или приготовлению полезно также приложить ссылку на официальный или профильный источник, если он у вас есть. Это помогает отделить спор о вкусе от вопроса, который требует фактической корректировки.</p><p>На этот же адрес можно отправлять предложения тем, комментарии к опубликованным материалам и вопросы о работе проекта. По вопросам использования материалов укажите, какой текст или изображение вас интересует и где планируется его использовать. Редакционные контакты едины для всех этих обращений: <a href="mailto:provkus-media@mail.ru">provkus-media@mail.ru</a>.</p><h2>Исправления и обратная связь</h2><p>Сообщения о возможных ошибках рассматриваются по существу: сначала проверяется исходная формулировка и использованные источники, затем при необходимости материал корректируется. Существенные изменения отражаются датой обновления в публикации. Редакционные принципы и требования к источникам опубликованы на странице «Редакционные стандарты».</p></section>''',
    "food-safety.html": '''<section class="seo-supporting-copy" aria-labelledby="safety-how"><h2 id="safety-how">Как читать материалы о безопасности еды</h2><p>В этой рубрике собраны темы, где бытовая привычка иногда пересекается с реальным риском: размораживание мяса, охлаждение готовой еды, хранение яиц и открытых продуктов, домашние заготовки, признаки порчи. Поэтому важные рекомендации здесь должны опираться на профильный источник, а не только на личный опыт автора.</p><p>Плашка «Проверено редакцией» означает, что редакция отдельно сверила значимые рекомендации материала с указанным источником. Она не ставится на обычные рецепты и вкусовые советы, если от точности такой рекомендации не зависит безопасность. Если условия хранения на упаковке конкретного продукта отличаются от общего совета, приоритет имеет маркировка производителя и официальные требования для этого продукта.</p></section>''',
    "products.html": '''<section class="seo-supporting-copy" aria-labelledby="products-how"><h2 id="products-how">Что проверять при выборе продуктов</h2><p>В материалах раздела мы разделяем субъективные предпочтения и проверяемые признаки: состав и маркировку, дату и условия хранения, целостность упаковки, особенности продукта после вскрытия. Там, где совет затрагивает безопасность употребления или хранения, он проходит отдельную редакционную сверку с профильным источником.</p></section>''',
    "grams-spoons-cups.html": '''<section class="seo-supporting-copy" aria-labelledby="measure-notes"><h2 id="measure-notes">Как пользоваться конвертером мер</h2><p>Объём ложки или стакана и масса продукта — не одно и то же. Одинаковые 100 мл воды, муки и сахара весят по-разному из-за плотности, поэтому пересчёт выполняется для конкретного ингредиента, а не по универсальному коэффициенту. Для выпечки и других рецептов, где точность заметно влияет на результат, кухонные весы остаются более надёжным способом измерения.</p><p>Насыпные продукты тоже дают разброс: просеянная мука, утрамбованный сахар или крупа с разным размером зерна занимают разный объём. Значения калькулятора стоит воспринимать как практичный ориентир для домашней кухни. Если исходный рецепт дан в граммах и важна повторяемость, лучше сохранить граммы. Если же нужно быстро понять, сколько это примерно ложек или стаканов, конвертер помогает получить удобную бытовую меру без ручных вычислений.</p><p>Для жидкостей мерную посуду ставьте на ровную поверхность и считывайте уровень на высоте глаз. Ложку для сухого ингредиента обычно считают без дополнительной горки, если рецепт прямо не говорит обратного.</p></section>''',
    "portion-calculator.html": '''<section class="seo-supporting-copy" aria-labelledby="portion-notes"><h2 id="portion-notes">Как пересчитываются порции</h2><p>Калькулятор умножает количество ингредиентов пропорционально числу порций. Это удобно для круп, овощей, жидкостей и большинства базовых компонентов, но не каждый параметр рецепта масштабируется строго линейно. Размер формы, площадь сковороды, мощность конфорки и толщина слоя могут изменить время приготовления даже при правильно пересчитанных продуктах.</p><p>Соль, острые специи, разрыхлитель и загустители разумнее увеличивать осторожно: сначала пересчитать основу, затем проверить вкус или консистенцию и при необходимости скорректировать. Для выпечки учитывайте объём формы: двойное количество теста в той же форме создаёт более толстый слой и потребует другой продолжительности выпечки.</p><p>Если рецепт содержит яйца или другие ингредиенты, которые неудобно делить на доли, округляйте с учётом роли ингредиента. Для небольшого изменения числа порций обычно достаточно ближайшего практичного количества; для точной кондитерской рецептуры лучше пользоваться весами. Калькулятор помогает с арифметикой, а технологические признаки готовности из самого рецепта остаются основным ориентиром.</p></section>''',
}


def write_if_changed(path: Path, text: str) -> bool:
    old = path.read_text("utf-8")
    if old == text:
        return False
    path.write_text(text, "utf-8")
    return True


def ensure_favicon(source: str) -> str:
    if re.search(r'<link\b[^>]*rel=["\']icon["\']', source, re.I):
        return source
    return source.replace('<meta charset="utf-8">', FAVICONS + '<meta charset="utf-8">', 1)


def ensure_page_schema(path: Path, source: str) -> str:
    schema_type = PAGE_SCHEMA_TYPES.get(path.name)
    if not schema_type or 'id="pv-page-schema"' in source:
        return source
    canonical = re.search(r'<link rel="canonical" href="([^"]+)"', source)
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', source, re.S)
    desc = re.search(r'<meta name="description" content="([^"]*)"', source)
    if not canonical or not h1:
        return source
    name = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html.unescape(h1.group(1)))).strip()
    data = {
        "@context": "https://schema.org",
        "@type": schema_type,
        "@id": canonical.group(1) + "#page",
        "url": canonical.group(1),
        "name": name,
        "description": html.unescape(desc.group(1)) if desc else "",
        "inLanguage": "ru-RU",
        "isPartOf": {"@id": SITE + "/#website"},
        "publisher": {"@id": SITE + "/#organization"},
    }
    rendered = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace('</', '<\\/')
    return source.replace('</head>', f'<script type="application/ld+json" id="pv-page-schema">{rendered}</script></head>', 1)


def insert_supporting_copy(path: Path, source: str) -> str:
    block = SUPPORTING_COPY.get(path.name)
    if not block or 'class="seo-supporting-copy"' in source:
        return source
    if path.name in {"editorial.html", "editorial-policy.html", "contacts.html"}:
        marker = '</article>'
        return source.replace(marker, block + marker, 1)
    # Hubs and calculators: add useful prose before the end of main.
    marker = '</main>'
    return source.replace(marker, block + marker, 1)


def ensure_styles() -> int:
    path = ROOT / "assets" / "styles.css"
    source = path.read_text("utf-8")
    if "SEO-SUPPORTING-COPY" not in source:
        source += '''\n/* SEO-SUPPORTING-COPY */\n.seo-supporting-copy{max-width:900px;margin:26px auto;padding:22px 24px;border:1px solid var(--line);border-radius:18px;background:var(--paper)}.seo-supporting-copy h2{font-size:24px;margin:0 0 12px}.seo-supporting-copy h2+ p{margin-top:0}.seo-supporting-copy p{color:#45423d;line-height:1.65;margin:0 0 12px}.seo-supporting-copy p:last-child{margin-bottom:0}.seo-supporting-copy a{text-decoration:underline;text-underline-offset:2px}\n/* /SEO-SUPPORTING-COPY */\n'''
    return int(write_if_changed(path, source))


def main() -> None:
    changed = 0
    changed += ensure_styles()

    # Root HTML pages: favicon, targeted schema, and meaningful supporting copy.
    for path in ROOT.glob('*.html'):
        if path.name == 'admin.html':
            continue
        source = path.read_text('utf-8')
        source = ensure_favicon(source)
        source = ensure_page_schema(path, source)
        source = insert_supporting_copy(path, source)
        changed += int(write_if_changed(path, source))

    # Generated archive pages also need a stable favicon. Daily pages remain noindex.
    archive_changed = 0
    for path in (ROOT / 'archive').glob('**/index.html'):
        source = ensure_favicon(path.read_text('utf-8'))
        archive_changed += int(write_if_changed(path, source))
    changed += archive_changed

    print(json.dumps({"changed_files": changed, "archive_pages_with_favicon": archive_changed}, ensure_ascii=False))


if __name__ == '__main__':
    main()
