from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import unquote, urlparse

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
WIDTHS = (480, 768, 1200, 1600)
QUALITY = 82


def local_path_from_src(src: str) -> tuple[Path, str] | None:
    parsed = urlparse(src)
    if parsed.scheme or parsed.netloc:
        if parsed.netloc not in {"provkus-media.ru", "www.provkus-media.ru"}:
            return None
        rel = unquote(parsed.path).lstrip("/")
    else:
        rel = unquote(src.split("?", 1)[0]).lstrip("/")
    if not rel.startswith("assets/uploads/"):
        return None
    return ROOT / rel, "/" + rel


def variant_path(original: Path, width: int) -> Path:
    return original.with_name(f"{original.stem}-{width}.webp")


def generate_variants(original: Path) -> list[tuple[int, Path]]:
    variants: list[tuple[int, Path]] = []
    with Image.open(original) as source:
        source.load()
        source = source.convert("RGB")
        ow, oh = source.size
        for width in WIDTHS:
            if width > ow:
                continue
            height = max(1, round(oh * width / ow))
            target = variant_path(original, width)
            if width == ow:
                resized = source
            else:
                resized = source.resize((width, height), Image.Resampling.LANCZOS)
            resized.save(target, "WEBP", quality=QUALITY, method=6, optimize=True)
            variants.append((width, target))
            print(f"hero variant: {target.relative_to(ROOT)} {width}x{height} {target.stat().st_size} bytes")
    return variants


def public_url(path: Path) -> str:
    return "/" + path.relative_to(ROOT).as_posix()


def patch_hero(source: str) -> tuple[str, str]:
    hero_match = re.search(r"<!-- HOME-HERO-START -->(.*?)<!-- HOME-HERO-END -->", source, flags=re.S)
    if not hero_match:
        raise RuntimeError("HOME-HERO markers not found in index.html")

    hero = hero_match.group(1)
    img_match = re.search(r"<img\b[^>]*>", hero, flags=re.I)
    if not img_match:
        raise RuntimeError("Hero image not found in HOME-HERO block")

    tag = img_match.group(0)
    src_match = re.search(r'\bsrc="([^"]+)"', tag, flags=re.I)
    if not src_match:
        raise RuntimeError("Hero image src not found")

    src = src_match.group(1)
    resolved = local_path_from_src(src)
    if not resolved:
        raise RuntimeError(f"Hero image is not a local upload: {src}")
    original, _ = resolved
    if not original.exists():
        raise FileNotFoundError(original)

    variants = generate_variants(original)
    if not variants:
        raise RuntimeError(f"No responsive variants created for {original}")

    srcset = ", ".join(f"{public_url(path)} {width}w" for width, path in variants)
    sizes = "(max-width: 760px) calc(100vw - 32px), (max-width: 1000px) calc(100vw - 48px), 800px"

    clean_tag = re.sub(r'\s+srcset="[^"]*"', "", tag, flags=re.I)
    clean_tag = re.sub(r'\s+sizes="[^"]*"', "", clean_tag, flags=re.I)
    replacement = clean_tag.replace(
        ' src="',
        f' srcset="{srcset}" sizes="{sizes}" src="',
        1,
    )

    hero_patched = hero[: img_match.start()] + replacement + hero[img_match.end() :]
    result = source[: hero_match.start(1)] + hero_patched + source[hero_match.end(1) :]
    return result, src


def main() -> None:
    source = INDEX.read_text("utf-8")
    patched, src = patch_hero(source)
    if patched != source:
        INDEX.write_text(patched, "utf-8")
        print(f"index.html: responsive srcset applied to {src}")
    else:
        print("index.html: responsive hero srcset already current")


if __name__ == "__main__":
    main()
