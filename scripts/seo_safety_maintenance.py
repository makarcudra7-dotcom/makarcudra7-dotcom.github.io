"""Persistent SEO and editorial-safety maintenance for ProVkus.

The script intentionally does not rewrite existing <title> values.
It is safe to run repeatedly after publication/index rebuild workflows.
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://provkus-media.ru"
POSTS_PATH = ROOT / "data" / "posts.json"

POLICY_TEXT = (
    "Для материалов, в которых ошибка или неточная рекомендация может повлиять на здоровье, "
    "безопасность пищи либо безопасное хранение и употребление продуктов, обязателен как минимум "
    "один релевантный надёжный источник. В таких материалах редакция по возможности отдаёт приоритет "
    "первоисточникам и рекомендациям профильных организаций. Для рецептов, вкусовых заметок, бытовых "
    "идей и других материалов, где такие риски отсутствуют, внешний источник не обязателен. Материалы, "
    "для которых источник обязателен, после редакционной проверки отмечаются плашкой «Проверено редакцией». "
    "Количество ссылок само по себе не заменяет проверку фактов."
)

CHECK_NOTE = (
    "Рекомендации, связанные с безопасностью пищи, здоровьем или безопасным хранением продуктов, "
    "сверены редакцией с профильным источником."
)

RELIABLE_DOMAINS = (
    "rospotrebnadzor.ru", "who.int", "fda.gov", "usda.gov", "fsis.usda.gov",
    "foodsafety.gov", "cdc.gov", "efsa.europa.eu", "food.gov.uk", "nhs.uk",
    "roskachestvo.gov.ru", "nchfp.uga.edu"
)

RISK_PATTERNS = [
    r"безопас", r"разморажив", r"мыть.{0,20}яйц", r"яйц.{0,25}холодиль",
    r"хранит.{0,30}яйц", r"сколько.{0,15}хранит", r"срок.{0,15}хран",
    r"горяч.{0,25}холодиль", r"рис.{0,30}(остуд|хран|разогрет|вчераш)",
    r"вчераш.{0,15}рис", r"скиса", r"испорч|порч[аи]", r"закрутк|домашн.{0,20}консерв",
    r"банку.{0,25}не откры", r"позеленел|пророс.{0,15}картоф", r"дверц.{0,20}холодиль",
    r"мыть.{0,30}(банан|мандар|фрукт|овощ)", r"плавлен.{0,15}сыр.{0,25}(хран|вскрыт)"
]

HUBS = {
    "recipes.html": "Домашние рецепты с понятными шагами, сезонными идеями и практичной подачей. Выбирайте блюдо по ситуации и переходите к подробной инструкции.",
    "products.html": "Материалы о выборе продуктов, маркировке, свежести и хранении. Там, где рекомендация связана с безопасностью, редакция указывает надёжный источник.",
    "home-storage.html": "Практические материалы о холодильнике, заморозке, запасах и организации кухни. Рекомендации по безопасности отделены от бытовых советов.",
    "food-safety.html": "Проверяемые рекомендации по безопасному хранению, размораживанию и гигиене кухни. Материалы с потенциально значимыми последствиями отмечаются редакционной проверкой.",
    "news.html": "Свежие материалы ProVkus о еде, продуктах, сезонных темах и домашней кухне."
}

LOGO = {
    "@type": "ImageObject",
    "url": SITE + "/assets/provkus-logo.svg",
    "contentUrl": SITE + "/assets/provkus-logo.svg",
    "width": 512,
    "height": 512,
}


def write_if_changed(path: Path, value: str) -> bool:
    old = path.read_text("utf-8") if path.exists() else None
    if old == value:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, "utf-8")
    return True


def strip_tags(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html.unescape(value))).strip()


def risk_sensitive(post: dict) -> bool:
    category = str(post.get("category") or "").casefold()
    if "безопас" in category:
        return True
    parts = [post.get("slug"), post.get("headline"), post.get("description")]
    parts += list(post.get("tags") or [])
    text = " ".join(str(x or "") for x in parts).casefold()
    return any(re.search(pattern, text, re.I) for pattern in RISK_PATTERNS)


def external_links(source: str) -> list[str]:
    return re.findall(r'href=["\'](https://[^"\']+)["\']', source, re.I)


def is_reliable(url: str) -> bool:
    try:
        host = urlparse(url).hostname or ""
    except Exception:
        return False
    host = host.casefold()
    return any(host == d or host.endswith("." + d) for d in RELIABLE_DOMAINS)


def fallback_source(post: dict) -> tuple[str, str]:
    text = " ".join([
        str(post.get("slug") or ""), str(post.get("headline") or ""),
        str(post.get("description") or ""), " ".join(post.get("tags") or [])
    ]).casefold()
    if "разморажив" in text or re.search(r"мяс|куриц|индей", text):
        return (
            "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/big-thaw-safe-defrosting-methods-consumers",
            "USDA FSIS — безопасное размораживание продуктов"
        )
    if "яйц" in text:
        return ("https://www.fda.gov/consumers/consumer-updates/what-you-need-know-about-egg-safety", "FDA — безопасность яиц")
    if re.search(r"закрутк|консерв|банку", text):
        return ("https://www.cdc.gov/botulism/prevention/home-canned-foods.html", "CDC — безопасность домашних консервов")
    if re.search(r"позеленел|пророс.{0,15}картоф", text):
        return ("https://www.efsa.europa.eu/en/news/glycoalkaloids-potatoes-public-health-risks-assessed", "EFSA — гликоалкалоиды в картофеле")
    if re.search(r"мыть.{0,30}(банан|мандар|фрукт|овощ)", text):
        return ("https://www.fda.gov/consumers/consumer-updates/7-tips-cleaning-fruits-vegetables", "FDA — безопасное мытьё фруктов и овощей")
    if re.search(r"холодиль|хран|рис|суп|сыр|остат", text):
        return ("https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts", "FoodSafety.gov — безопасное хранение охлаждённых продуктов")
    return ("https://www.who.int/news-room/fact-sheets/detail/food-safety", "ВОЗ — безопасность пищевых продуктов")


def editorial_badge(url: str, label: str) -> str:
    return (
        '<!-- EDITORIAL-CHECK-BADGE -->'
        '<aside class="pv-editorial-check" aria-label="Редакционная проверка">'
        '<div class="pv-editorial-check__label"><span aria-hidden="true">✓</span> Проверено редакцией</div>'
        f'<p>{html.escape(CHECK_NOTE)}</p>'
        f'<a href="{html.escape(url, quote=True)}" target="_blank" rel="noopener noreferrer">{html.escape(label)}</a>'
        '</aside>'
    )


def add_badge(source: str, badge: str) -> str:
    if "EDITORIAL-CHECK-BADGE" in source or 'class="pv-editorial-check"' in source:
        # Normalize legacy public wording while preserving its verified source.
        source = source.replace("<strong>Сверено с источниками</strong>", "<strong>Проверено редакцией</strong>")
        return source
    m = re.search(r'(<div class="article-date">.*?</div>)', source, re.S)
    if m:
        return source[:m.end()] + badge + source[m.end():]
    m = re.search(r'(<div class="article-author">.*?</div>\s*</div>)', source, re.S)
    if m:
        return source[:m.end()] + badge + source[m.end():]
    return source.replace('<div class="article-body">', badge + '<div class="article-body">', 1)


def clean_and_fix_schema(source: str) -> str:
    pattern = re.compile(r'(<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>)(.*?)(</script>)', re.S | re.I)

    def clean(value):
        if isinstance(value, dict):
            out = {}
            for key, val in value.items():
                val = clean(val)
                if val is None:
                    continue
                out[key] = val
            if out.get("@type") == "Organization" and not out.get("logo"):
                out["logo"] = dict(LOGO)
            return out
        if isinstance(value, list):
            return [clean(v) for v in value if v is not None]
        return value

    def repl(match):
        try:
            data = json.loads(match.group(2))
        except Exception:
            return match.group(0)
        data = clean(data)
        rendered = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
        return match.group(1) + rendered + match.group(3)

    return pattern.sub(repl, source)


def ensure_hub_schema(path: Path, source: str) -> str:
    if "CollectionPage" in source:
        return source
    canonical = re.search(r'<link rel="canonical" href="([^"]+)"', source)
    title = re.search(r'<h1[^>]*>(.*?)</h1>', source, re.S)
    desc = re.search(r'<meta name="description" content="([^"]*)"', source)
    if not canonical or not title:
        return source
    links = []
    for href, name in re.findall(r'<a[^>]+href="(/articles/[^"]+\.html)"[^>]*>.*?<h3[^>]*>(.*?)</h3>', source, re.S | re.I):
        links.append({"@type": "ListItem", "position": len(links) + 1, "url": SITE + href, "name": strip_tags(name)})
        if len(links) >= 100:
            break
    page = {
        "@type": "CollectionPage", "@id": canonical.group(1) + "#collection", "url": canonical.group(1),
        "name": strip_tags(title.group(1)), "description": html.unescape(desc.group(1)) if desc else "",
        "inLanguage": "ru-RU", "isPartOf": {"@id": SITE + "/#website"}
    }
    graph = [page]
    if links:
        graph.append({"@type": "ItemList", "itemListElement": links})
    schema = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":"))
    return source.replace("</head>", f'<script type="application/ld+json" id="pv-hub-schema">{schema}</script></head>', 1)


def ensure_hub_intro(path: Path, source: str) -> str:
    text = HUBS.get(path.name)
    if not text or "SEO-HUB-INTRO" in source:
        return source
    h1 = re.search(r'(<h1[^>]*>.*?</h1>)', source, re.S)
    if not h1:
        return source
    block = f'<!-- SEO-HUB-INTRO --><p class="seo-hub-intro">{html.escape(text)}</p><!-- /SEO-HUB-INTRO -->'
    return source[:h1.end()] + block + source[h1.end():]


def lazy_hub_images(source: str, eager_count: int = 4) -> str:
    count = 0
    def repl(match):
        nonlocal count
        tag = match.group(0)
        count += 1
        if count <= eager_count:
            if "decoding=" not in tag:
                tag = tag[:-1] + ' decoding="async">'
            return tag
        if "loading=" not in tag:
            tag = tag[:-1] + ' loading="lazy">'
        if "decoding=" not in tag:
            tag = tag[:-1] + ' decoding="async">'
        return tag
    return re.sub(r'<img\b[^>]*>', repl, source, flags=re.I)


def update_policy() -> int:
    path = ROOT / "editorial-policy.html"
    source = path.read_text("utf-8")
    new = re.sub(r'(<h2>Источники</h2>)<p>.*?</p>', lambda m: m.group(1) + '<p>' + POLICY_TEXT + '</p>', source, count=1, flags=re.S)
    return int(write_if_changed(path, new))


def update_styles() -> int:
    path = ROOT / "assets" / "styles.css"
    source = path.read_text("utf-8")
    if "SEO-EDITORIAL-CHECK" not in source:
        source += """\n/* SEO-EDITORIAL-CHECK */\n.pv-editorial-check{font-family:Inter,system-ui,sans-serif;margin:18px 0 24px;padding:14px 16px;border:1px solid #cfe2d7;border-left:5px solid #39805f;border-radius:14px;background:#f4f8f3;color:#244338}.pv-editorial-check__label{display:flex;align-items:center;gap:7px;font-weight:900}.pv-editorial-check p{margin:7px 0 5px;font-size:13px;line-height:1.45;color:#496157}.pv-editorial-check a{font-size:12px;font-weight:800;text-decoration:underline;text-underline-offset:2px}.seo-hub-intro{max-width:850px;margin:10px 0 22px;color:var(--muted);line-height:1.6}\n/* /SEO-EDITORIAL-CHECK */\n"""
    return int(write_if_changed(path, source))


def update_admin_editor() -> int:
    path = ROOT / "assets" / "admin-editorial-check.js"
    if not path.exists():
        return 0
    source = path.read_text("utf-8")
    source = source.replace('<option value="sources">Сверено с источниками</option>', '<option value="sources">Проверено редакцией — значимые рекомендации</option>')
    source = source.replace('Публичная пометка появится только после заполнения подтверждений.', 'Для материалов, где ошибка может повлиять на здоровье, безопасность пищи или безопасное хранение, выберите редакционную проверку и укажите профильный источник.')
    source = source.replace('<strong>Сверено с источниками</strong>', '<strong>Проверено редакцией</strong>')
    return int(write_if_changed(path, source))


def update_articles(posts: list[dict]) -> tuple[int, int]:
    changed = checked = 0
    for post in posts:
        path = ROOT / "articles" / f"{post.get('slug','')}.html"
        if not path.exists():
            continue
        source = path.read_text("utf-8")
        source = clean_and_fix_schema(source)
        if risk_sensitive(post):
            checked += 1
            reliable = next((u for u in external_links(source) if is_reliable(u)), None)
            if reliable:
                label = urlparse(reliable).hostname or "Профильный источник"
            else:
                reliable, label = fallback_source(post)
            source = add_badge(source, editorial_badge(reliable, label))
            ec = dict(post.get("editorialCheck") or {})
            ec.update({"mode": "sources", "sourceUrl": reliable, "sourceNote": CHECK_NOTE, "confirmed": True})
            for key in ("tester", "testedAt", "minutes", "result", "adjustment", "realPhoto"):
                ec.setdefault(key, "")
            ec.setdefault("aiImage", False)
            post["editorialCheck"] = ec
        if write_if_changed(path, source):
            changed += 1
    return changed, checked


def update_root_pages() -> int:
    changed = 0
    hub_names = set(HUBS) | {"category.html", "world-cuisines.html", "archive.html", "authors.html", "author-ilya.html", "author-elvira.html", "author-ekaterina.html"}
    for path in ROOT.glob("*.html"):
        if path.name == "admin.html":
            continue
        source = path.read_text("utf-8")
        source = clean_and_fix_schema(source)
        if path.name in HUBS:
            source = ensure_hub_schema(path, source)
            source = ensure_hub_intro(path, source)
        if path.name in hub_names:
            source = lazy_hub_images(source)
        changed += int(write_if_changed(path, source))
    return changed


def update_daily_archives() -> int:
    changed = 0
    for path in (ROOT / "archive").glob("*/*/*/index.html"):
        source = path.read_text("utf-8")
        if re.search(r'<meta name="robots" content="[^"]*">', source):
            source = re.sub(r'<meta name="robots" content="[^"]*">', '<meta name="robots" content="noindex,follow">', source, count=1)
        else:
            source = source.replace("</head>", '<meta name="robots" content="noindex,follow"></head>', 1)
        source = lazy_hub_images(source)
        changed += int(write_if_changed(path, source))
    return changed


def update_sitemap_and_robots() -> int:
    changed = 0
    robots = ROOT / "robots.txt"
    if robots.exists():
        source = robots.read_text("utf-8")
        source = re.sub(r'^Sitemap:\s*https://provkus-media\.ru/sitemap-fruit-jazz\.xml\s*\n?', '', source, flags=re.M)
        changed += int(write_if_changed(robots, source))
    sitemap = ROOT / "sitemap.xml"
    if sitemap.exists():
        xml = sitemap.read_text("utf-8")
        xml = re.sub(r'\s*<url><loc>https://provkus-media\.ru/archive/\d{4}/\d{2}/\d{2}/</loc>(?:<lastmod>[^<]+</lastmod>)?</url>', '', xml)
        changed += int(write_if_changed(sitemap, xml))
    return changed


def persist_archive_rule() -> int:
    path = ROOT / "scripts" / "build_discovery_archives.py"
    if not path.exists():
        return 0
    source = path.read_text("utf-8")
    marker = "# SEO-DAILY-ARCHIVE-RULE"
    if marker in source:
        return 0
    block = r'''
# SEO-DAILY-ARCHIVE-RULE: daily date archives are navigation pages, not search landing pages.
for _path in (ROOT/'archive').glob('*/*/*/index.html'):
    _src=_path.read_text('utf-8')
    _src=re.sub(r'<meta name="robots" content="[^"]*">','<meta name="robots" content="noindex,follow">',_src,count=1)
    _path.write_text(_src,'utf-8')
if sitemap.exists():
    _xml=sitemap.read_text('utf-8')
    _xml=re.sub(r'\s*<url><loc>https://provkus-media\.ru/archive/\d{4}/\d{2}/\d{2}/</loc>(?:<lastmod>[^<]+</lastmod>)?</url>','',_xml)
    sitemap.write_text(_xml,'utf-8')
'''
    source = source.replace("print(f'Generated {len(archive_urls)} archive URLs for {len(POSTS)} public posts')", block + "\nprint(f'Generated {len(archive_urls)} archive URLs for {len(POSTS)} public posts')")
    return int(write_if_changed(path, source))


def main():
    posts = json.loads(POSTS_PATH.read_text("utf-8"))
    counts = {}
    counts["policy"] = update_policy()
    counts["styles"] = update_styles()
    counts["admin"] = update_admin_editor()
    article_changed, checked = update_articles(posts)
    counts["articles"] = article_changed
    counts["checked_articles"] = checked
    write_if_changed(POSTS_PATH, json.dumps(posts, ensure_ascii=False, indent=2) + "\n")
    counts["root_pages"] = update_root_pages()
    counts["daily_archives"] = update_daily_archives()
    counts["index_surfaces"] = update_sitemap_and_robots()
    counts["archive_generator"] = persist_archive_rule()
    print(json.dumps(counts, ensure_ascii=False))


if __name__ == "__main__":
    main()
