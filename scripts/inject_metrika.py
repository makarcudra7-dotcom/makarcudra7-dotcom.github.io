from pathlib import Path

TAG = '<script src="/assets/metrika.js" defer></script>'
ZEN_TOKEN = 'rUGpnQ652SgR8wAjXpAH1CIOQhGCJU3OTRITDI4Iq46VYdgXOAy6CuHOYQOru6Dr'
ZEN_TAG = f'<meta name="zen-verification" content="{ZEN_TOKEN}">'


def is_yandex_verification_file(path: Path) -> bool:
    return path.name.lower().startswith('yandex_') and path.suffix.lower() == '.html'


def is_zen_verification_file(path: Path) -> bool:
    return path.name.lower().startswith('zen_') and path.suffix.lower() == '.html'


def inject(path: Path) -> bool:
    if is_yandex_verification_file(path):
        return False

    text = path.read_text(encoding='utf-8')
    changed = False

    # Dzen checks the meta tag in the source of the public homepage.
    if path == Path('index.html') and ZEN_TAG not in text:
        lower = text.lower()
        pos = lower.find('</head>')
        if pos != -1:
            text = text[:pos] + ZEN_TAG + text[pos:]
            changed = True

    if '/assets/metrika.js' not in text:
        lower = text.lower()
        pos = lower.find('</head>')
        if pos != -1:
            text = text[:pos] + TAG + text[pos:]
            changed = True
        elif is_zen_verification_file(path):
            # Keep verification meta intact while satisfying the global HTML check.
            text = text.rstrip() + '\n' + TAG + '\n'
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
