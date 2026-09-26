from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import unquote, urlparse

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
WIDTHS = (480, 768, 1200, 1600)
QUALITY = 82

CTA_HTML = (
    '<aside class="pv-ad-cta" aria-label="Реклама и спецпроекты">'
    '<div class="pv-ad-copy"><span class="pv-ad-kicker">Для брендов</span>'
    '<h2>Реклама и спецпроекты в ProVkus</h2>'
    '<p>Нативные интеграции, обзоры продуктов и специальные проекты для аудитории о еде, доме и покупках.</p>'
    '</div><a class="pv-ad-button" href="/contacts.html">Обсудить размещение →</a></aside>'
)

BASE_STYLES_LINK = '<link rel="stylesheet" href="/assets/styles.css">'
HOME_LAYOUT_CSS = (
    '<link rel="stylesheet" href="/assets/overrides.css?v=20260923-theme3">',
    '<link rel="stylesheet" href="/assets/theme.css?v=20260923-theme3">',
)


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


def ensure_parallel_base_css(source: str) -> str:
    """Expose styles.css to the preload scanner instead of discovering it only through @import."""
    if 'href="/assets/styles.css"' in source:
        return source
    marker = '<link rel="stylesheet" href="/assets/public.css?v=20260925-clean1">'
    if marker in source:
        return source.replace(marker, BASE_STYLES_LINK + marker, 1)
    return source.replace('</head>', BASE_STYLES_LINK + '</head>', 1)


def ensure_critical_home_css(source: str) -> str:
    """Load CSS that changes header/hero geometry before FCP to prevent CLS."""
    source = ensure_parallel_base_css(source)
    missing = [tag for tag in HOME_LAYOUT_CSS if tag.split('?')[0] not in source]
    if not missing:
        return source
    insertion = ''.join(missing)
    marker = '<script src="/assets/metrika.js" defer></script>'
    if marker in source:
        return source.replace(marker, insertion + marker, 1)
    return source.replace('</head>', insertion + '</head>', 1)


def ensure_stable_layout(hero: str) -> str:
    """Keep the final first-screen structure in HTML so JS never moves the LCP card."""
    if 'class="hero-main"' in hero:
        return hero
    side_marker = '<div class="hero-side">'
    side_at = hero.find(side_marker)
    if side_at < 0:
        raise RuntimeError("hero-side not found in HOME-HERO block")
    lead = hero[:side_at]
    side = hero[side_at:]
    if 'class="lead-card"' not in lead:
        raise RuntimeError("lead-card not found before hero-side")
    return f'<div class="hero-main">{lead}{CTA_HTML}</div>{side}'


def ensure_hero_preload(source: str, srcset: str, sizes: str, variants: list[tuple[int, Path]]) -> str:
    """Start the mobile LCP request from <head>, before render-blocking CSS finishes."""
    source = re.sub(r'<link\b[^>]*\bid="pv-hero-preload"[^>]*>', '', source, count=1, flags=re.I)
    fallback = next((path for width, path in variants if width >= 768), variants[-1][1])
    tag = (
        f'<link id="pv-hero-preload" rel="preload" as="image" href="{public_url(fallback)}" '
        f'imagesrcset="{srcset}" imagesizes="{sizes}" fetchpriority="high">'
    )
    marker = BASE_STYLES_LINK
    if marker in source:
        return source.replace(marker, tag + marker, 1)
    return source.replace('</head>', tag + '</head>', 1)


def patch_hero(source: str) -> tuple[str, str]:
    source = ensure_critical_home_css(source)
    hero_match = re.search(r"<!-- HOME-HERO-START -->(.*?)<!-- HOME-HERO-END -->", source, flags=re.S)
    if not hero_match:
        raise RuntimeError("HOME-HERO markers not found in index.html")

    hero = ensure_stable_layout(hero_match.group(1))
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
    clean_tag = re.sub(r'\s+loading="[^"]*"', "", clean_tag, flags=re.I)
    replacement = clean_tag.replace('<img', '<img loading="eager"', 1).replace(
        ' src="',
        f' srcset="{srcset}" sizes="{sizes}" src="',
        1,
    )

    hero_patched = hero[: img_match.start()] + replacement + hero[img_match.end() :]
    result = source[: hero_match.start(1)] + hero_patched + source[hero_match.end(1) :]
    result = ensure_hero_preload(result, srcset, sizes, variants)
    return result, src


def main() -> None:
    source = INDEX.read_text("utf-8")
    patched, src = patch_hero(source)
    if patched != source:
        INDEX.write_text(patched, "utf-8")
        print(f"index.html: LCP preload + parallel base CSS + responsive hero applied to {src}")
    else:
        print("index.html: stable responsive hero already current")


if __name__ == "__main__":
    main()
