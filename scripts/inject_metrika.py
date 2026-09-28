import re
from pathlib import Path

TAG = '<script src="/assets/metrika.js?v=20260929-reader1" defer></script>'
METRIKA_RE = re.compile(r"(?P<prefix><script\s+src=['\"])(?P<path>/?assets/metrika\.js)(?:\?[^'\"]*)?(?P<suffix>['\"])", re.IGNORECASE)
APP_RE = re.compile(r"(?P<prefix><script\s+src=['\"])(?P<path>/?assets/app\.js)(?:\?[^'\"]*)?(?P<suffix>['\"])", re.IGNORECASE)
APP_URL_RE = re.compile(r"(?P<path>/?assets/app\.js)(?:\?v=[A-Za-z0-9_-]+)?")
ZEN_TOKEN = 'rUGpnQ652SgR8wAjXpAH1CIOQhGCJU3OTRITDl4Iq46VYdgXOAy6CuHOYQ0ru6Dr'
ZEN_TAG = f'<meta name="zen-verification" content="{ZEN_TOKEN}" />'
ZEN_META_RE = re.compile(r'<meta\s+[^>]*name=["\']zen-verification["\'][^>]*>', re.IGNORECASE)


def is_yandex_verification_file(path: Path) -> bool:
    return path.name.lower().startswith('yandex_') and path.suffix.lower() == '.html'


def is_zen_verification_file(path: Path) -> bool:
    return path.name.lower().startswith('zen_') and path.suffix.lower() == '.html'


def is_verification_file(path: Path) -> bool:
    return is_yandex_verification_file(path) or is_zen_verification_file(path)


def ensure_zen_meta_first_in_head(text: str) -> tuple[str, bool]:
    # Remove any old/duplicate zen-verification tags, then put the exact Dzen tag
    # immediately after <head>. This keeps it visible even to strict/limited parsers.
    cleaned = ZEN_META_RE.sub('', text)
    match = re.search(r'<head(?:\s[^>]*)?>', cleaned, re.IGNORECASE)
    if not match:
        return text, False
    updated = cleaned[:match.end()] + ZEN_TAG + cleaned[match.end():]
    return updated, updated != text


def inject(path: Path) -> bool:
    # Ownership verification files must stay byte-for-byte simple; never inject scripts.
    if is_verification_file(path):
        return False

    text = path.read_text(encoding='utf-8')
    changed = False

    if path == Path('index.html'):
        text, zen_changed = ensure_zen_meta_first_in_head(text)
        changed = changed or zen_changed

    updated = METRIKA_RE.sub(lambda m: m['prefix'] + m['path'] + '?v=20260929-reader1' + m['suffix'], text)
    updated = APP_RE.sub(lambda m: m['prefix'] + m['path'] + '?v=20260929-reader1' + m['suffix'], updated)
    updated = APP_URL_RE.sub(lambda m: m['path'] + '?v=20260929-reader1', updated)
    if updated != text:
        text = updated
        changed = True

    if '/assets/metrika.js' not in text:
        lower = text.lower()
        pos = lower.find('</head>')
        if pos != -1:
            text = text[:pos] + TAG + text[pos:]
            changed = True

    if changed:
        path.write_text(text, encoding='utf-8')
    return changed


changed = []
for path in Path('.').rglob('*.html'):
    if any(part in {'.git', 'node_modules'} for part in path.parts):
        continue
    if inject(path):
        changed.append(str(path))

print(f'Metrica/Zen injected into {len(changed)} page(s)')
for item in changed:
    print(item)
