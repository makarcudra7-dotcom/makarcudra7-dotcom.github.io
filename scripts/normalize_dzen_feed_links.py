#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / "feed.xml"

TOP = re.compile(
    r'<p><b>Источник и обновляемая версия материала — ProVkus:</b><br><a href="[^"]+">[^<]+</a></p>',
    re.I,
)
BOTTOM = re.compile(
    r'<p><b>Читать материал на сайте ProVkus:</b><br><a href="[^"]+">[^<]+</a></p>',
    re.I,
)


def main() -> None:
    if not FEED.exists():
        print("feed.xml not found; skip Dzen link normalization")
        return
    text = FEED.read_text(encoding="utf-8")
    before = text
    text, n1 = TOP.subn('', text)
    text, n2 = BOTTOM.subn('', text)
    if text != before:
        FEED.write_text(text, encoding="utf-8")
    print(f"Dzen feed link normalization: removed {n1 + n2} RSS-only source blocks")


if __name__ == "__main__":
    main()
