"""Notify IndexNow of new or materially changed public ProVkus URLs."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
HOST = "provkus-media.ru"
KEY_FILE = "59453d301e4a660b358e1c8f8a345305.txt"
KEY = (ROOT / KEY_FILE).read_text("utf-8").strip()
KEY_URL = f"https://{HOST}/{KEY_FILE}"
ENDPOINTS = ("https://api.indexnow.org/indexnow", "https://yandex.com/indexnow")


def old_file(before: str, path: str) -> str:
    if not before or set(before) == {"0"}:
        return ""
    result = subprocess.run(
        ["git", "show", f"{before}:{path}"], cwd=ROOT,
        capture_output=True, text=True, check=False,
    )
    return result.stdout if result.returncode == 0 else ""


def changed_files(before: str) -> set[str]:
    if not before or set(before) == {"0"}:
        return {"data/posts.json", KEY_FILE}
    result = subprocess.run(
        ["git", "diff", "--name-only", before, "HEAD"], cwd=ROOT,
        capture_output=True, text=True, check=True,
    )
    return set(result.stdout.splitlines())


def public(post: dict) -> bool:
    published = post.get("publishedAt")
    if published:
        try:
            date = datetime.fromisoformat(published.replace("Z", "+00:00"))
            if date.astimezone(timezone.utc) > datetime.now(timezone.utc):
                return False
        except ValueError:
            return False
    slug = post.get("slug", "")
    return bool(slug and (ROOT / "articles" / f"{slug}.html").exists())


def signature(source: str) -> tuple[str, str, str, str]:
    def match(pattern: str) -> str:
        found = re.search(pattern, source, re.S | re.I)
        return found.group(1) if found else ""
    return (
        match(r"<title>(.*?)</title>"),
        match(r'<meta property="og:image" content="([^"]+)"'),
        match(r'<div class="article-body">(.*?)(?:</article>|<!-- DISCOVERY-LINKS-START -->)'),
        match(r'<h1[^>]*>(.*?)</h1>'),
    )


def urls_to_submit(before: str) -> list[str]:
    changed = changed_files(before)
    posts = json.loads((ROOT / "data/posts.json").read_text("utf-8"))
    previous = old_file(before, "data/posts.json")
    old_posts = {p["slug"]: p for p in json.loads(previous)} if previous else {}
    urls: set[str] = set()
    if KEY_FILE in changed:
        recent = sorted((p for p in posts if public(p)), key=lambda p: p.get("publishedAt") or "", reverse=True)
        urls.update(p["url"] for p in recent[:5] if p.get("url"))
        urls.add(f"https://{HOST}/")
    for post in posts:
        if not public(post):
            continue
        slug = post["slug"]
        page = f"articles/{slug}.html"
        old = old_posts.get(slug)
        fields = ("headline", "description", "image", "publishedAt", "updatedAt")
        metadata_changed = "data/posts.json" in changed and (
            old is None or any(post.get(field) != old.get(field) for field in fields)
        )
        html_changed = page in changed and signature((ROOT / page).read_text("utf-8")) != signature(old_file(before, page))
        url = post.get("url", "")
        if (metadata_changed or html_changed) and url.startswith(f"https://{HOST}/articles/"):
            urls.add(url)
    for path in ("index.html", "category.html", "news.html", "recipes.html", "products.html", "home-storage.html", "food-safety.html"):
        if path in changed:
            urls.add(f"https://{HOST}/" if path == "index.html" else f"https://{HOST}/{path}")
    return sorted(urls)


def verify_key() -> None:
    for attempt in range(36):
        try:
            with urlopen(Request(KEY_URL, headers={"User-Agent": "ProVkus-IndexNow/1.0"}), timeout=10) as response:
                if response.status == 200 and response.read().decode("utf-8").strip() == KEY:
                    print("Public key file verified:", KEY_URL)
                    return
        except (HTTPError, URLError, TimeoutError):
            pass
        if attempt < 35:
            time.sleep(10)
    raise RuntimeError("Public IndexNow key file is not reachable or has different content")


def submit(urls: list[str]) -> None:
    for endpoint in ENDPOINTS:
        for offset in range(0, len(urls), 100):
            batch = urls[offset:offset + 100]
            payload = json.dumps({"host": HOST, "key": KEY, "keyLocation": KEY_URL, "urlList": batch}).encode("utf-8")
            request = Request(endpoint, data=payload, headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": "ProVkus-IndexNow/1.0"}, method="POST")
            try:
                with urlopen(request, timeout=30) as response:
                    status = response.status
            except HTTPError as error:
                status = error.code
            print(f"{endpoint}: HTTP {status}, URLs {len(batch)}")
            if status not in (200, 202):
                raise RuntimeError(f"IndexNow endpoint rejected the batch: HTTP {status}")


if __name__ == "__main__":
    before = os.environ.get("BEFORE_SHA", "")
    urls = urls_to_submit(before)
    print("Changed public URLs:", len(urls), *urls, sep="\n")
    if not urls:
        sys.exit(0)
    if "--dry-run" not in sys.argv:
        verify_key()
        submit(urls)
