"""Generate responsive article covers and use them without changing article copy."""

from __future__ import annotations

import html
import re
from pathlib import Path
from urllib.parse import unquote, urlparse

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WIDTHS = (480, 960, 1280)
SITE_HOSTS = {"provkus-media.ru", "www.provkus-media.ru"}
IMG_RE = re.compile(r"<img\b[^>]*>", re.I | re.S)


def attr(tag: str, name: str) -> str:
    match = re.search(rf'\s{re.escape(name)}=("|\')(.*?)\1', tag, re.I | re.S)
    return html.unescape(match.group(2)) if match else ""


def set_attr(tag: str, name: str, value: str) -> str:
    escaped = html.escape(value, quote=True)
    pattern = rf'\s{re.escape(name)}=("|\')(.*?)\1'
    replacement = f' {name}="{escaped}"'
    if re.search(pattern, tag, re.I | re.S):
        return re.sub(pattern, lambda _: replacement, tag, count=1, flags=re.I | re.S)
    return tag.replace("<img", "<img" + replacement, 1)


def local_source(url: str) -> Path | None:
    parsed = urlparse(url)
    if parsed.netloc and parsed.netloc not in SITE_HOSTS:
        return None
    rel = unquote(parsed.path).lstrip("/")
    if not rel.startswith("assets/uploads/"):
        return None
    source = ROOT / rel
    return source if source.is_file() else None


def variants(source: Path) -> list[tuple[int, Path]]:
    # Reuse homepage variants if they were already generated there.
    available = []
    for width in WIDTHS:
        existing = source.with_name(f"{source.stem}-{width}w.webp")
        if existing.is_file():
            available.append((width, existing))
            continue
        target = source.with_name(f"{source.stem}-{width}w.webp")
        available.append((width, target))

    missing = [(width, path) for width, path in available if not path.exists()]
    if missing:
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened)
            if image.mode == "RGBA":
                background = Image.new("RGB", image.size, "white")
                background.paste(image, mask=image.getchannel("A"))
                image = background
            elif image.mode != "RGB":
                image = image.convert("RGB")
            for width, target in missing:
                if width >= image.width:
                    continue
                height = round(image.height * width / image.width)
                image.resize((width, height), Image.Resampling.LANCZOS).save(
                    target, "WEBP", quality=78, method=5
                )
    return [(width, path) for width, path in available if path.is_file()]


def optimize_tag(tag: str) -> str:
    if "article-cover" not in attr(tag, "class").split():
        return tag
    original = attr(tag, "data-original-src") or attr(tag, "src")
    source = local_source(original)
    if not source:
        return tag
    try:
        sizes = variants(source)
    except (OSError, ValueError) as exc:
        print(f"skip {source.relative_to(ROOT)}: {exc}")
        return tag
    if not sizes:
        return tag
    prefix = f"{urlparse(original).scheme}://{urlparse(original).netloc}" if urlparse(original).netloc else ""
    srcset = ", ".join(
        f"{prefix}/{path.relative_to(ROOT).as_posix()} {width}w" for width, path in sizes
    )
    tag = set_attr(tag, "srcset", srcset)
    tag = set_attr(tag, "sizes", "(max-width: 760px) calc(100vw - 32px), (max-width: 1100px) 90vw, 960px")
    tag = set_attr(tag, "decoding", "async")
    tag = set_attr(tag, "fetchpriority", "high")
    return tag


def main() -> None:
    changed = 0
    for page in sorted((ROOT / "articles").glob("*.html")):
        before = page.read_text("utf-8")
        after = IMG_RE.sub(lambda match: optimize_tag(match.group(0)), before)
        if after != before:
            page.write_text(after, "utf-8")
            changed += 1
    print(f"Responsive article covers: {changed} pages updated")


if __name__ == "__main__":
    main()
