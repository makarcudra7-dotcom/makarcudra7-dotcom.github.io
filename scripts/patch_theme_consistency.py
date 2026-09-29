from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SKIP = {'admin.html'}
VERSION = '20260929-theme4'

BOOTSTRAP = '''<script id="pv-theme-bootstrap">(function(){var KEY='provkus-theme';function apply(t){t=t==='dark'?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'#161b19':'#f7f4ee');document.querySelectorAll('.pv-theme-toggle').forEach(function(b){b.setAttribute('aria-pressed',String(t==='dark'));b.setAttribute('aria-label',t==='dark'?'Включить светлую тему':'Включить тёмную тему')})}var t='light';try{t=localStorage.getItem(KEY)||'light'}catch(e){}apply(t);window.__pvThemeApply=function(next,persist){apply(next);if(persist!==false){try{localStorage.setItem(KEY,next)}catch(e){}}};window.__pvThemeDelegated=true;document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.pv-theme-toggle');if(!b)return;var next=document.documentElement.dataset.theme==='dark'?'light':'dark';window.__pvThemeApply(next,true)});document.addEventListener('DOMContentLoaded',function(){apply(document.documentElement.dataset.theme||t)})})();</script>'''
THEME_LINK = f'<link rel="stylesheet" href="/assets/theme.css?v={VERSION}">'
BUTTON = '<button type="button" class="pv-theme-toggle" aria-pressed="false" aria-label="Переключить тему"><span class="pv-theme-label-light">☾ Тёмная тема</span><span class="pv-theme-label-dark">☀ Светлая тема</span></button>'


def patch(path: Path) -> bool:
    text = path.read_text(encoding='utf-8')
    original = text

    if 'id="pv-theme-bootstrap"' not in text:
        text = text.replace('<head>', '<head>' + BOOTSTRAP, 1)

    if '/assets/theme.css' not in text:
        text = text.replace('</head>', THEME_LINK + '</head>', 1)
    else:
        text = re.sub(r'<link[^>]+href=["\'][^"\']*assets/theme\.css[^"\']*["\'][^>]*>', THEME_LINK, text, count=1)

    if 'class="pv-theme-toggle"' not in text and 'class="site-header"' in text and 'class="container topbar"' in text:
        pattern = re.compile(r'(<header\s+class="site-header"[^>]*>\s*<div\s+class="container topbar"[^>]*>.*?)(</div>\s*</header>)', re.S)
        text, count = pattern.subn(lambda m: m.group(1) + BUTTON + m.group(2), text, count=1)
        if not count:
            print(f'WARN no topbar match: {path.relative_to(ROOT)}')

    text = re.sub(r'assets/app\.js\?v=[^"\']+', f'assets/app.js?v={VERSION}', text)
    text = re.sub(r'/assets/app\.js\?v=[^"\']+', f'/assets/app.js?v={VERSION}', text)

    if text != original:
        path.write_text(text, encoding='utf-8')
        return True
    return False


changed = 0
for path in ROOT.rglob('*.html'):
    if path.name in SKIP or '.git' in path.parts:
        continue
    try:
        changed += int(patch(path))
    except UnicodeDecodeError:
        print(f'SKIP non-utf8: {path.relative_to(ROOT)}')
print(f'Patched {changed} HTML files')
