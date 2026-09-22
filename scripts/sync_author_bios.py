import html
import json
import re
from pathlib import Path

AUTHORS_PATH = Path("data/authors.json")
ADMIN_PATH = Path("admin.html")
INDEX_PATH = Path("index.html")
ASSET_VERSION = "20260922-fix5"


def replace_once(pattern: str, repl: str, text: str, label: str) -> str:
    updated, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Could not update {label}: expected 1 match, got {count}")
    return updated


def sync_author(author: dict) -> None:
    page = Path(author["url"])
    if not page.exists():
        raise FileNotFoundError(page)

    text = page.read_text("utf-8")
    bio = html.escape(author["bio"], quote=False)
    meta = html.escape(author.get("metaDescription") or author["bio"], quote=True)
    role = html.escape(author["role"], quote=False)

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

    text, _ = re.subn(
        r'("jobTitle"\s*:\s*")[^"]*(")',
        lambda m: m.group(1) + role + m.group(2),
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
    favicon_markup = (
        '<link rel="icon" href="/favicon.ico" sizes="any">'
        '<link rel="icon" type="image/png" sizes="64x64" href="/favicon.png">'
        '<link rel="shortcut icon" href="/favicon.ico">'
        '<meta name="theme-color" content="#f7f4ee">'
    )
    index, count = re.subn(
        r'(?:<link rel="icon" href="/favicon\.ico" sizes="any"><link rel="icon" type="image/png" sizes="64x64" href="/favicon\.png"><link rel="shortcut icon" href="/favicon\.ico"><meta name="theme-color" content="#f7f4ee">|<link rel="icon"(?: type="image/png")? href="/favicon\.png">)',
        favicon_markup,
        index,
        count=1,
    )
    if count != 1:
        raise RuntimeError("Could not refresh favicon markup in index.html")
    INDEX_PATH.write_text(index, "utf-8")
    print("Synced index.html favicon markup")


def main() -> None:
    authors = json.loads(AUTHORS_PATH.read_text("utf-8"))
    for author in authors:
        sync_author(author)
    sync_site_shell()


if __name__ == "__main__":
    main()
