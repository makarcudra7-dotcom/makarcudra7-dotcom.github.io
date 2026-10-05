#!/usr/bin/env python3
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / "feed.xml"
HEADLINES = ROOT / "data" / "dzen-headlines.json"
ARTICLES = ROOT / "articles"

TOP = re.compile(
    r'<p><b>Источник и обновляемая версия материала — ProVkus:</b><br><a href="[^"]+">[^<]+</a></p>',
    re.I,
)
BOTTOM = re.compile(
    r'<p><b>Читать материал на сайте ProVkus:</b><br><a href="[^"]+">[^<]+</a></p>',
    re.I,
)
ITEM = re.compile(r'<item>.*?</item>', re.I | re.S)
GUID = re.compile(r'<guid\s+isPermaLink="false">provkus-([^<]+)</guid>', re.I)
TITLE = re.compile(r'<title>.*?</title>', re.I | re.S)
HTML_TITLE = re.compile(r'<title>(.*?)</title>', re.I | re.S)
TAG = re.compile(r'<[^>]+>')


def load_overrides() -> dict[str, str]:
    if not HEADLINES.exists():
        return {}
    try:
        data = json.loads(HEADLINES.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return {
        str(slug): str(title).strip()
        for slug, title in data.items()
        if str(slug).strip() and str(title).strip()
    }


def seo_title(slug: str) -> str:
    path = ARTICLES / f"{slug}.html"
    if not path.exists():
        return ""
    try:
        source = path.read_text(encoding="utf-8")
    except Exception:
        return ""
    match = HTML_TITLE.search(source)
    if not match:
        return ""
    return html.unescape(TAG.sub('', match.group(1))).strip()


def main() -> None:
    if not FEED.exists():
        print("feed.xml not found; skip Dzen normalization")
        return

    text = FEED.read_text(encoding="utf-8")
    before = text

    # RSS imported by Dzen should not inherit the emotional H1 used on the site.
    # Explicit Dzen-only overrides win; otherwise use the calmer SEO <title> of the article.
    overrides = load_overrides()
    changed_titles = 0

    def normalize_item(match: re.Match) -> str:
        nonlocal changed_titles
        block = match.group(0)
        guid = GUID.search(block)
        if not guid:
            return block
        slug = html.unescape(guid.group(1)).strip()
        dzen_title = overrides.get(slug) or seo_title(slug)
        if not dzen_title:
            return block
        replacement = f"<title>{html.escape(dzen_title, quote=False)}</title>"
        updated, count = TITLE.subn(replacement, block, count=1)
        if count and updated != block:
            changed_titles += 1
        return updated

    text = ITEM.sub(normalize_item, text)

    # Keep the existing RSS cleanup: Dzen gets the full article without duplicated
    # source blocks that can look promotional inside the imported text.
    text, n1 = TOP.subn('', text)
    text, n2 = BOTTOM.subn('', text)

    if text != before:
        FEED.write_text(text, encoding="utf-8")

    print(
        f"Dzen normalization: softened {changed_titles} title(s); "
        f"removed {n1 + n2} RSS-only source block(s)"
    )


if __name__ == "__main__":
    main()
