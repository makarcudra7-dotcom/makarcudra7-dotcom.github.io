#!/usr/bin/env python3
"""Improve the published World Cuisines cover images without changing their subjects.

The original 95 WebP files were heavily compressed. This pass normalizes them to a
real 1600x900 canvas, uses high-quality Lanczos resampling, applies a restrained
unsharp mask to recover perceived edge definition, and writes high-quality WebP.
"""
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "drafts/world-cuisines/final-photo-registry-95.json"
UPLOADS = ROOT / "assets/uploads"
TARGET = (1600, 900)
MIN_BYTES = 70_000


def save_high_quality(img: Image.Image, path: Path) -> int:
    """Write a visibly higher-quality WebP, raising quality if result is too tiny."""
    tmp = path.with_suffix(path.suffix + ".tmp")
    for quality in (92, 94, 96):
        img.save(tmp, "WEBP", quality=quality, method=6)
        size = tmp.stat().st_size
        if size >= MIN_BYTES or quality == 96:
            tmp.replace(path)
            return size
    raise AssertionError("unreachable")


def enhance(path: Path) -> tuple[tuple[int, int], int]:
    with Image.open(path) as src:
        src = src.convert("RGB")
        original = src.size
        # ImageOps.fit also protects against the occasional off-ratio source.
        img = ImageOps.fit(src, TARGET, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        # Restrained sharpening: improve display at article-cover size without halos.
        img = img.filter(ImageFilter.UnsharpMask(radius=1.25, percent=115, threshold=3))
        size = save_high_quality(img, path)
    return original, size


def main() -> None:
    registry = json.loads(REGISTRY.read_text("utf-8"))
    items = registry.get("items", [])
    if len(items) != 95:
        raise SystemExit(f"Expected 95 World Cuisines images, got {len(items)}")

    changed = 0
    total_bytes = 0
    smallest = None
    for item in items:
        slug = item["slug"]
        path = UPLOADS / f"{slug}-16x9.webp"
        if not path.exists():
            raise SystemExit(f"Missing image: {path}")
        before_size = path.stat().st_size
        original, after_size = enhance(path)
        # Verify resulting dimensions rather than trusting HTML metadata.
        with Image.open(path) as check:
            if check.size != TARGET:
                raise SystemExit(f"Bad output dimensions for {slug}: {check.size}")
        total_bytes += after_size
        smallest = after_size if smallest is None else min(smallest, after_size)
        if original != TARGET or after_size != before_size:
            changed += 1
        print(f"{slug}: {original[0]}x{original[1]} {before_size}B -> 1600x900 {after_size}B")

    registry["imageQuality"] = {
        "version": 2,
        "dimensions": "1600x900",
        "format": "WebP",
        "quality": "92-96",
        "method": "Lanczos upscale/normalize + restrained unsharp mask",
        "files": 95,
    }
    REGISTRY.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"Enhanced {changed}/95 images; total={total_bytes}B; smallest={smallest}B")


if __name__ == "__main__":
    main()
