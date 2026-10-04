#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / "data" / "posts.json"
ARTICLES = ROOT / "articles"
MARKER = 'data-pv-dzen-site-link="1"'
PROMO = '<p data-pv-dzen-site-link="1"><b>Больше проверенных рецептов и разборов продуктов — на <a href="https://provkus-media.ru/">ProVkus</a>.</b></p>'
ARTICLE_BODY = '<div class="article-body">'
DIV_RE = re.compile(r'</?div\b[^>]*>', re.I)


def find_article_body_end(html: str, start: int) -> int | None:
    pos = start + len(ARTICLE_BODY)
    depth = 1
    for match in DIV_RE.finditer(html, pos):
        if match.group(0).lower().startswith('</div'):
            depth -= 1
        else:
            depth += 1
        if depth == 0:
            return match.start()
    return None


def main() -> None:
    try:
        posts = json.loads(POSTS.read_text(encoding="utf-8"))
    except Exception:
        posts = []

    changed = 0
    checked = 0
    # Feed exports the latest 50 posts. Keep a small buffer so every Dzen-visible
    # article contains the same outbound ProVkus link in the source HTML itself.
    for post in posts[:60]:
        slug = post.get("slug") if isinstance(post, dict) else None
        if not slug:
            continue
        path = ARTICLES / f"{slug}.html"
        if not path.exists():
            continue
        checked += 1
        html = path.read_text(encoding="utf-8")
        if MARKER in html:
            continue
        start = html.find(ARTICLE_BODY)
        if start < 0:
            continue
        end = find_article_body_end(html, start)
        if end is None:
            continue
        html = html[:end] + PROMO + html[end:]
        path.write_text(html, encoding="utf-8")
        changed += 1

    print(f"ProVkus site-link sync: checked {checked}, updated {changed}")


if __name__ == "__main__":
    main()
