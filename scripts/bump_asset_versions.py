"""Force a fresh public asset version across every generated/static HTML page."""
from pathlib import Path
import os
import re

ROOT = Path(__file__).resolve().parents[1]
raw = os.environ.get('CACHE_VERSION') or 'manual-refresh'
version = 'r' + re.sub(r'[^A-Za-z0-9._-]', '', raw)[:12]

changed = []
html_pattern = re.compile(r'((?:/|\.\./)?assets/(?:public\.css|app\.js))(?:\?v=[^"\'<>\s]*)?')

for path in ROOT.rglob('*.html'):
    if '.git' in path.parts:
        continue
    old = path.read_text('utf-8')
    new = html_pattern.sub(lambda m: f'{m.group(1)}?v={version}', old)
    if new != old:
        path.write_text(new, 'utf-8')
        changed.append(str(path.relative_to(ROOT)))

app = ROOT / 'assets' / 'app.js'
text = app.read_text('utf-8')
text = re.sub(r"l\.href=href\+'\?v=[^']+'", f"l.href=href+'?v={version}'", text)
text = re.sub(r"addCss\('/assets/seasonal\.css(?:\?v=[^']*)?'\)", "addCss('/assets/seasonal.css')", text)
text = re.sub(
    r"(/assets/(?:seasonal|home-dynamic|feed-v2|community|liveinternet)\.js)\?v=[^']+",
    lambda m: f'{m.group(1)}?v={version}',
    text,
)
if text != app.read_text('utf-8'):
    app.write_text(text, 'utf-8')
    changed.append('assets/app.js')

seasonal = ROOT / 'assets' / 'seasonal.js'
text = seasonal.read_text('utf-8')
text = re.sub(
    r"(\['/assets/[^']+\.css',')[^']+('\])",
    lambda m: f'{m.group(1)}{version}{m.group(2)}',
    text,
)
text = re.sub(
    r"(/assets/leaves/[^'?]+\.svg)\?v=[^']+",
    lambda m: f'{m.group(1)}?v={version}',
    text,
)
if text != seasonal.read_text('utf-8'):
    seasonal.write_text(text, 'utf-8')
    changed.append('assets/seasonal.js')

print(f'cache version: {version}')
print(f'updated files: {len(changed)}')
for name in changed:
    print(name)
