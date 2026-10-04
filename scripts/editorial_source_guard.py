#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import urlparse
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
QUEUE = ROOT / '.github' / 'scheduled-posts.json'
DRAWER = ROOT / 'articles' / 'yashchik-pod-duhovkoy-naznachenie.html'

LATIN_RE = re.compile(r'\b[A-Za-z]{3,}\b')
HREF_RE = re.compile(r'href=["\']([^"\']+)["\']', re.I)
TAG_RE = re.compile(r'<[^>]+>')
ALLOWED_LATIN = {'ProVkus'}


def russian_source(url: str) -> bool:
    try:
        host = (urlparse(url).hostname or '').lower().rstrip('.')
    except Exception:
        return False
    return host.endswith('.ru') or host == 'ru' or host.endswith('.xn--p1ai') or host.endswith('.рф')


def visible_text(value: str) -> str:
    text = TAG_RE.sub(' ', value or '')
    text = html.unescape(text)
    return re.sub(r'\s+', ' ', text).strip()


def latin_words(value: str):
    return sorted({w for w in LATIN_RE.findall(visible_text(value)) if w not in ALLOWED_LATIN})


def fix_drawer_article():
    if not DRAWER.exists():
        return False
    s = DRAWER.read_text(encoding='utf-8')
    before = s

    s = re.sub(
        r'<p>Внешне разные версии почти одинаковы:.*?</p>',
        '<p>Внешне разные версии почти одинаковы: ручка, металлический короб и место прямо под духовкой. Поэтому привычка использовать его как дополнительный шкаф появляется сама собой. Но назначение зависит от конструкции конкретной модели. В российских материалах о бытовой технике отдельно подчёркивается: нижний отсек может быть обычным хозяйственным ящиком, местом для поддержания готовой еды тёплой или отдельной зоной приготовления.</p>',
        s,
        count=1,
        flags=re.S,
    )
    s = re.sub(
        r'<p>Самый важный вывод простой:.*?</p>',
        '<p>Самый важный вывод простой: <strong>ящик под духовкой нельзя определять «на глаз»</strong>. Посмотрите инструкцию к своей модели и панель управления. Если для нижнего отсека предусмотрен отдельный режим подогрева, поддержания тепла или приготовления, использовать его как обычный шкаф для посуды нельзя.</p>',
        s,
        count=1,
        flags=re.S,
    )
    s = s.replace('storage drawer', 'ящик для хранения')
    s = s.replace('warming drawer', 'подогревочный отсек')
    s = s.replace('baking drawer', 'нижний отсек для приготовления')
    s = s.replace('бройлер', 'режим сильного верхнего нагрева')
    s = s.replace('Warming Drawer', 'подогрев нижнего отсека')
    s = s.replace('Keep Warm', 'поддержание тепла')
    s = s.replace('Baking Drawer', 'приготовление в нижнем отсеке')
    s = s.replace('Broil', 'сильный верхний нагрев')
    s = s.replace('Whirlpool', 'производители бытовой техники')

    s = re.sub(
        r'<div class="note"><strong>Источники:</strong>.*?</div>',
        '<div class="note"><strong>Источники:</strong> <a href="https://aif.ru/dontknows/eternal/dlya_chego_nuzhen_yashchik_pod_dukhovkoy_v_plite" target="_blank" rel="noopener nofollow">«Аргументы и факты»: для чего нужен ящик под духовкой</a><br><a href="https://www.edimdoma.ru/jivem_doma/posts/46378-proverte-yaschik-pod-duhovkoy-vozmozhno-vse-eto-vremya-vy-ispolzovali-ego-nepravilno" target="_blank" rel="noopener nofollow">«Едим Дома»: назначение нижнего ящика зависит от модели</a></div>',
        s,
        count=1,
        flags=re.S,
    )

    if s != before:
        DRAWER.write_text(s, encoding='utf-8')
        return True
    return False


def fix_queue():
    if not QUEUE.exists():
        return False, []
    data = json.loads(QUEUE.read_text(encoding='utf-8'))
    changed = False

    for entry in data:
        slug = entry.get('slug')
        material = entry.get('material') or {}
        post = entry.get('post') or {}

        if slug == 'chto-gotovyat-v-romskih-semyah':
            material['sourceHtml'] = (
                '<a href="https://ethnoreligia.ru/metodicheskie-materialy/narody-srednego-urala/cygane/" target="_blank" rel="noopener nofollow">'
                'Уральская ассоциация этноконфессиональных исследований: культура и кухня русских цыган</a><br>'
                '<a href="https://cyrillitsa.ru/narody/136085-zapechennyy-ezh-i-drugie-tradicionnye-c-2.html" target="_blank" rel="noopener nofollow">'
                '«Кириллица»: о традиционных блюдах и исследованиях цыганской кухни</a>'
            )
            c = material.get('content', '')
            c = re.sub(
                r'<p>В этнографических работах среди ромских общин упоминаются.*?</p>',
                '<p>Российские этнографические материалы показывают, что кухня русских цыган сильно переплетена с кухней соседних народов. В ней встречаются борщ, супы, каши, мучные блюда, картофель, капуста и мясо. Поэтому искать один «правильный цыганский гуляш» бессмысленно: конкретный стол зависит от семьи, региона и привычек нескольких поколений.</p>',
                c, count=1, flags=re.S)
            c = re.sub(
                r'<p>У ромских общин, исследованных в Италии.*?</p>',
                '<p>В российских материалах о русских цыганах особенно часто упоминаются борщ, щавелевый суп, мучные блюда и каши — гречневая, перловая и пшённая. Это хорошо показывает главную особенность кухни: она не изолирована от окружающей культуры и впитывает привычные продукты той местности, где живёт семья.</p>',
                c, count=1, flags=re.S)
            c = re.sub(
                r'<p>Ромские сообщества живут по всей Европе.*?</p>',
                '<p>Ромские сообщества живут в разных странах и регионах, поэтому единый набор блюд для всех семей невозможен. Российские этнографы также отмечают сильное влияние соседних кулинарных традиций. Именно поэтому один и тот же семейный принцип — сытно накормить большую компанию — в разных местах воплощается в разных блюдах.</p>',
                c, count=1, flags=re.S)
            c = c.replace('Современная антропология старается отделять эти образы от реальных бытовых практик.', 'Этнографические исследования помогают отделять яркие стереотипные образы от реальных бытовых практик.')
            material['content'] = c
            changed = True

        if slug == 'amerikanskiy-tykvennyy-batter':
            material['description'] = 'Тыквенный баттер из пюре с корицей, имбирём и яблочным соком: густая осенняя намазка для хлеба, каши и выпечки. Храним в холодильнике или замораживаем.'
            post['description'] = material['description']
            c = material.get('content', '')
            c = re.sub(r'\bpumpkin butter\b', 'тыквенный баттер', c, flags=re.I)
            c = re.sub(
                r'<p>Хотя внешне тыквенный баттер напоминает варенье.*?</p>',
                '<p>Хотя тыквенный баттер напоминает варенье и красиво смотрится в банке, этот домашний рецепт мы не превращаем в герметичную заготовку для хранения при комнатной температуре. Роспотребнадзор напоминает: домашнее консервирование требует строгого соблюдения технологии, а нарушения режима хранения повышают риск тяжёлых пищевых отравлений.</p>',
                c, count=1, flags=re.S)
            c = re.sub(
                r'<p>Поэтому этот рецепт — для холодильника.*?</p>',
                '<p>Поэтому готовый тыквенный баттер перекладываем в чистую закрытую ёмкость и держим в холодильнике, а для более долгого хранения замораживаем небольшими порциями. Не стоит самовольно превращать этот рецепт в «закрутку на зиму» и менять количество кислоты, сахара или время обработки на глаз.</p>',
                c, count=1, flags=re.S)
            material['content'] = c
            material['sourceHtml'] = (
                '<a href="https://77.rospotrebnadzor.ru/index.php/press-centr/press-relizy/15528-profilaktika-botulizma-15-06-2026" target="_blank" rel="noopener nofollow">'
                'Роспотребнадзор по Москве: профилактика ботулизма и правила домашних заготовок</a>'
            )
            changed = True

        entry['material'] = material
        entry['post'] = post

    violations = []
    for entry in data:
        if entry.get('status') != 'ready':
            continue
        material = entry.get('material') or {}
        slug = entry.get('slug', 'без-slug')
        source_html = material.get('sourceHtml') or ''
        bad_hosts = []
        for url in HREF_RE.findall(source_html):
            if url.startswith(('http://', 'https://')) and not russian_source(url):
                bad_hosts.append((urlparse(url).hostname or url))

        text_fields = [
            material.get('headline', ''),
            material.get('description', ''),
            material.get('lead', ''),
            material.get('content', ''),
            visible_text(source_html),
        ]
        bad_words = sorted(set().union(*(set(latin_words(v)) for v in text_fields)))
        if bad_hosts or bad_words:
            reason = []
            if bad_hosts:
                reason.append('иностранные источники: ' + ', '.join(sorted(set(bad_hosts))))
            if bad_words:
                reason.append('английские слова: ' + ', '.join(bad_words))
            entry['status'] = 'editorial_hold'
            if isinstance(entry.get('post'), dict):
                entry['post']['status'] = 'editorial_hold'
            entry['editorialPolicyReason'] = '; '.join(reason)
            violations.append(f"{slug}: {entry['editorialPolicyReason']}")
            changed = True

    if changed:
        QUEUE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return changed, violations


def main():
    article_changed = fix_drawer_article()
    queue_changed, violations = fix_queue()

    if DRAWER.exists():
        article_text = DRAWER.read_text(encoding='utf-8')
        body_match = re.search(r'<div class="article-body">(.*?)</div><!-- DISCOVERY-LINKS-START -->', article_text, re.S)
        if body_match:
            words = latin_words(body_match.group(1))
            foreign = [u for u in HREF_RE.findall(body_match.group(1)) if u.startswith(('http://','https://')) and not russian_source(u) and 'provkus-media.ru' not in u]
            if words or foreign:
                raise SystemExit(f'Published drawer article still violates policy: latin={words}, foreign={foreign}')

    if violations:
        print('Editorial holds applied:')
        for item in violations:
            print(' -', item)
    print(f'Russian editorial policy: article_changed={article_changed}, queue_changed={queue_changed}, violations={len(violations)}')


if __name__ == '__main__':
    main()
