import html
import json
import re
from pathlib import Path

AUTHORS_PATH = Path("data/authors.json")
ADMIN_PATH = Path("admin.html")
INDEX_PATH = Path("index.html")
ASSET_VERSION = "20260925-author-trust"
SITE = "https://provkus-media.ru"


def replace_once(pattern: str, repl: str, text: str, label: str) -> str:
    updated, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Could not update {label}: expected 1 match, got {count}")
    return updated


def author_schema(author: dict) -> str:
    person_url = f"{SITE}/{author['url']}"
    image_url = f"{SITE}/{author['photo']}"
    data = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "url": person_url,
        "name": f"{author['name']} — автор ProVkus",
        "description": author.get("metaDescription") or author["bio"],
        "mainEntity": {
            "@type": "Person",
            "name": author["name"],
            "jobTitle": author["role"],
            "description": author["bio"],
            "image": image_url,
            "url": person_url,
            "knowsAbout": author["topics"],
            "worksFor": {
                "@type": "Organization",
                "name": "ProVkus",
                "url": SITE,
            },
        },
    }
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "</script>"


def trust_panel(author: dict) -> str:
    topics = "".join(f"<span>{html.escape(topic)}</span>" for topic in author["topics"])
    return (
        '<section class="author-trust-panel" aria-labelledby="author-trust-title">'
        '<h2 id="author-trust-title">О работе автора</h2>'
        '<div class="author-trust-grid">'
        '<div class="author-trust-item"><h3>Специализация</h3>'
        f'<p>{html.escape(author["lead"])}</p></div>'
        '<div class="author-trust-item"><h3>Как готовит материалы</h3>'
        f'<p>{html.escape(author["method"])}</p></div>'
        '<div class="author-trust-item"><h3>Проверка фактов</h3>'
        '<p>Фактические утверждения проверяются по первичным или заслуживающим доверия источникам. Для тем о безопасности еды редакционный стандарт требует не менее трёх проверяемых источников.</p></div>'
        '<div class="author-trust-item"><h3>С какими вопросами обращаться</h3>'
        f'<p>{html.escape(author["useful"])}</p></div>'
        '</div>'
        f'<div class="author-trust-topics" aria-label="Темы автора">{topics}</div>'
        '<div class="author-trust-links">'
        '<a href="/editorial-policy.html">Редакционные стандарты →</a>'
        '<a href="/editorial.html">О редакции →</a>'
        '</div>'
        '<p class="author-trust-note">Профиль описывает редакционную специализацию и фактический подход к материалам. ProVkus не приписывает авторам неподтверждённые дипломы, сертификаты или профессиональные статусы.</p>'
        '</section>'
    )


def sync_author(author: dict) -> None:
    page = Path(author["url"])
    if not page.exists():
        raise FileNotFoundError(page)

    text = page.read_text("utf-8")
    bio = html.escape(author["bio"], quote=False)
    meta = html.escape(author.get("metaDescription") or author["bio"], quote=True)

    text = replace_once(
        r'<meta name="description" content="[^"]*">',
        f'<meta name="description" content="{meta}">',
        text,
        f"meta description in {page}",
    )

    hero_match = re.search(r'<section class="author-hero">.*?</section>', text, flags=re.S)
    if not hero_match:
        raise RuntimeError(f"Author hero not found in {page}")
    hero = hero_match.group(0)
    hero = replace_once(
        r'(<p><strong>.*?</strong></p>)<p>.*?</p>',
        rf'\1<p>{bio}</p>',
        hero,
        f"hero biography in {page}",
    )
    text = text[: hero_match.start()] + hero + text[hero_match.end() :]

    # Replace the existing ProfilePage JSON-LD with a richer, factual profile.
    schema = author_schema(author)
    text, schema_count = re.subn(
        r'<script type="application/ld\+json">(?:(?!</script>).)*"@type"\s*:\s*"ProfilePage"(?:(?!</script>).)*</script>',
        schema,
        text,
        count=1,
        flags=re.S,
    )
    if schema_count != 1:
        raise RuntimeError(f"Could not refresh ProfilePage schema in {page}")

    # Make the trust layer server-rendered and idempotent.
    text = re.sub(r'<section class="author-trust-panel".*?</section>', '', text, flags=re.S)
    hero_match = re.search(r'<section class="author-hero">.*?</section>', text, flags=re.S)
    panel = trust_panel(author)
    text = text[: hero_match.end()] + panel + text[hero_match.end() :]

    if '/assets/author-trust.css' not in text:
        text = text.replace(
            '</head>',
            f'<link rel="stylesheet" href="/assets/author-trust.css?v={ASSET_VERSION}"></head>',
            1,
        )
    else:
        text = re.sub(
            r'/assets/author-trust\.css\?v=[^"\']+',
            f'/assets/author-trust.css?v={ASSET_VERSION}',
            text,
            count=1,
        )

    fresh_scripts = (
        f'<script src="/assets/community.js?v={ASSET_VERSION}"></script>'
        f'<script src="/assets/app.js?v={ASSET_VERSION}"></script>'
    )
    text, count = re.subn(
        r'(?:<script src="/assets/community\.js\?v=[^"]+"></script>)?'
        r'<script src="/assets/app\.js\?v=[^"]+"></script>',
        fresh_scripts,
        text,
        count=1,
    )
    if count != 1:
        raise RuntimeError(f"Could not refresh author scripts in {page}")

    page.write_text(text, "utf-8")
    print(f"Synced {page}")


def sync_site_shell() -> None:
    admin = ADMIN_PATH.read_text("utf-8")
    admin, count = re.subn(
        r'<script src="assets/admin-photo-source\.js(?:\?v=[^"]+)?"></script>',
        f'<script src="assets/admin-photo-source.js?v={ASSET_VERSION}"></script>',
        admin,
        count=1,
    )
    if count != 1:
        raise RuntimeError("Could not refresh admin-photo-source.js in admin.html")
    ADMIN_PATH.write_text(admin, "utf-8")
    print("Synced admin.html asset version")

    index = INDEX_PATH.read_text("utf-8")
    if not re.search(r'<link rel="icon" href="/favicon\.ico(?:\?[^"]+)?"', index):
        raise RuntimeError("Home page is missing its browser icon")
    if 'rel="apple-touch-icon"' not in index:
        raise RuntimeError("Home page is missing its mobile icon")
    print("Verified index.html icon markup")


def main() -> None:
    authors = json.loads(AUTHORS_PATH.read_text("utf-8"))
    for author in authors:
        sync_author(author)
    sync_site_shell()


if __name__ == "__main__":
    main()
