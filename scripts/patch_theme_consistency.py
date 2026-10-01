from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SKIP = {'admin.html'}
VERSION = '20261002-mobile'

BOOTSTRAP = '''<script id="pv-theme-bootstrap">(function(){var KEY='provkus-theme';function cleanup(){var bs=document.querySelectorAll('.site-header .pv-theme-toggle');for(var i=1;i<bs.length;i++)bs[i].remove()}function apply(t){t=t==='dark'?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'#161b19':'#f7f4ee');cleanup();document.querySelectorAll('.pv-theme-toggle').forEach(function(b){b.setAttribute('aria-pressed',String(t==='dark'));b.setAttribute('aria-label',t==='dark'?'Включить светлую тему':'Включить тёмную тему')})}var t='light';try{t=localStorage.getItem(KEY)||'light'}catch(e){}apply(t);window.__pvThemeApply=function(next,persist){apply(next);if(persist!==false){try{localStorage.setItem(KEY,next)}catch(e){}}};window.__pvThemeDelegated=true;document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.pv-theme-toggle');if(!b)return;var next=document.documentElement.dataset.theme==='dark'?'light':'dark';window.__pvThemeApply(next,true)});document.addEventListener('DOMContentLoaded',function(){cleanup();apply(document.documentElement.dataset.theme||t)});})();</script>'''
THEME_LINK = f'<link rel="stylesheet" href="/assets/theme.css?v={VERSION}">'
BUTTON = '<button type="button" class="pv-theme-toggle" aria-pressed="false" aria-label="Переключить тему"><span class="pv-theme-label-light">☾ Тёмная тема</span><span class="pv-theme-label-dark">☀ Светлая тема</span></button>'

DARK_CONTRAST = r'''
/* THEME-CONTRAST-V5 */
.site-header .pv-theme-toggle:empty{display:none!important}
.site-header .pv-theme-toggle~.pv-theme-toggle{display:none!important}
.pv-theme-label-dark{display:none}
html[data-theme="dark"] .pv-theme-label-light{display:none}
html[data-theme="dark"] .pv-theme-label-dark{display:inline}
html[data-theme="dark"] body{background:var(--bg)!important;color:var(--ink)!important}
html[data-theme="dark"] .section-title,
html[data-theme="dark"] .story-body h3,
html[data-theme="dark"] .stack-copy h3,
html[data-theme="dark"] .legal-card h1,
html[data-theme="dark"] .legal-card h2,
html[data-theme="dark"] .legal-card h3,
html[data-theme="dark"] .chief-editor-copy h2,
html[data-theme="dark"] .home-tools-head h2{color:var(--ink)!important}
html[data-theme="dark"] .section-sub,
html[data-theme="dark"] .story-meta,
html[data-theme="dark"] .stack-copy p,
html[data-theme="dark"] .legal-nav a,
html[data-theme="dark"] .home-tools-head p,
html[data-theme="dark"] .home-tools-foot,
html[data-theme="dark"] .home-quick-copy small{color:var(--muted)!important}
html[data-theme="dark"] .home-tools-section{background:var(--bg)!important;color:var(--ink)!important}
html[data-theme="dark"] .home-topic-strip,
html[data-theme="dark"] .home-topic-strip a,
html[data-theme="dark"] .home-quick-action{background:var(--paper)!important;color:var(--ink)!important;border-color:var(--line)!important}
html[data-theme="dark"] .chief-editor{background:#222925!important;color:#f2f0e9!important;border-color:#45524a!important;box-shadow:0 10px 30px rgba(0,0,0,.24)!important}
html[data-theme="dark"] .chief-editor-copy p,
html[data-theme="dark"] .chief-editor-facts li{color:#d9ddd6!important}
html[data-theme="dark"] .chief-editor-facts strong,
html[data-theme="dark"] .chief-editor-copy h2{color:#f5f2eb!important}
html[data-theme="dark"] .chief-editor-photo figcaption{color:#bfc7bd!important}
html[data-theme="dark"] .chief-editor-role{color:#ff9e80!important}
html[data-theme="dark"] .chief-editor-quote{background:#332723!important;color:#fff6ef!important;border-left-color:#f08b71!important}
html[data-theme="dark"] .chief-editor-quote footer{color:#d9c8bf!important}
html[data-theme="dark"] .pv-recipe-panel,
html[data-theme="dark"] .pv-feedback,
html[data-theme="dark"] .pv-search-panel{background:#222925!important;color:#f2f0e9!important;border-color:#45524a!important}
html[data-theme="dark"] .pv-recipe-panel h2,
html[data-theme="dark"] .pv-recipe-panel h3,
html[data-theme="dark"] .pv-feedback h2,
html[data-theme="dark"] .pv-search-panel h1{color:#f2f0e9!important}
html[data-theme="dark"] .pv-editorial-note,
html[data-theme="dark"] .pv-feedback-note{color:#c4cbc2!important}
html[data-theme="dark"] .pv-recipe-actions button,
html[data-theme="dark"] .pv-filter-row button,
html[data-theme="dark"] .pv-search-panel input,
html[data-theme="dark"] .pv-search-panel select,
html[data-theme="dark"] .pv-search-results a{background:#18201c!important;color:#f2f0e9!important;border-color:#536159!important}
html[data-theme="dark"] .pv-search-results a:hover{background:#2d3831!important}
'''


def patch_assets():
    app = ROOT / 'assets' / 'app.js'
    text = app.read_text(encoding='utf-8')
    text = re.sub(r"const VERSION='[^']+';", f"const VERSION='{VERSION}';", text, count=1)
    app.write_text(text, encoding='utf-8')

    theme = ROOT / 'assets' / 'theme.css'
    css = theme.read_text(encoding='utf-8')
    css = re.split(r'/\* THEME-CONTRAST-V[45] \*/', css, maxsplit=1)[0].rstrip() + '\n'
    css = css.rstrip() + '\n' + DARK_CONTRAST.strip() + '\n'
    theme.write_text(css, encoding='utf-8')


def patch(path: Path) -> bool:
    text = path.read_text(encoding='utf-8')
    original = text

    if 'id="pv-theme-bootstrap"' in text:
        text = re.sub(r'<script id="pv-theme-bootstrap">.*?</script>', BOOTSTRAP, text, count=1, flags=re.S)
    else:
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

    app_pattern = re.compile(r'((?:\.\./|/)?assets/app\.js)(?:\?v=[^"\']+)?')
    text = app_pattern.sub(lambda m: m.group(1) + '?v=' + VERSION, text)

    if text != original:
        path.write_text(text, encoding='utf-8')
        return True
    return False


patch_assets()
changed = 0
for path in ROOT.rglob('*.html'):
    if path.name in SKIP or '.git' in path.parts:
        continue
    try:
        changed += int(patch(path))
    except UnicodeDecodeError:
        print(f'SKIP non-utf8: {path.relative_to(ROOT)}')
print(f'Patched {changed} HTML files')
