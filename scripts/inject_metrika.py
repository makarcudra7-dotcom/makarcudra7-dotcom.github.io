from pathlib import Path

TAG = '<script src="/assets/metrika.js" defer></script>'


def is_verification_file(path: Path) -> bool:
    return path.name.lower().startswith('yandex_') and path.suffix.lower() == '.html'


def inject(path: Path) -> bool:
    if is_verification_file(path):
        return False
    text = path.read_text(encoding='utf-8')
    if '/assets/metrika.js' in text:
        return False
    lower = text.lower()
    pos = lower.find('</head>')
    if pos == -1:
        return False
    text = text[:pos] + TAG + text[pos:]
    path.write_text(text, encoding='utf-8')
    return True


changed = []
for path in Path('.').rglob('*.html'):
    if any(part in {'.git', 'node_modules'} for part in path.parts):
        continue
    if inject(path):
        changed.append(str(path))

print(f'Metrica injected into {len(changed)} page(s)')
for item in changed:
    print(item)
