from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'
ASSETS = ROOT / 'assets'
APP_VERSION = '20260927-quality13'
BUNDLE_VERSION = '20260929-contrast2'
BUNDLE = ASSETS / 'home-bundle.css'
BUNDLE_SOURCES = ('styles.css', 'public.css', 'site-ui.css', 'home-tools.css', 'overrides.css', 'theme.css')


def build_home_bundle():
    parts = []
    for name in BUNDLE_SOURCES:
        path = ASSETS / name
        text = path.read_text('utf-8').strip()
        parts.append(f'/* bundled from {name} */\n{text}')
    value = '\n\n'.join(parts).rstrip() + '\n'
    if not BUNDLE.exists() or BUNDLE.read_text('utf-8') != value:
        BUNDLE.write_text(value, 'utf-8')
        print('updated assets/home-bundle.css')


def harden_index():
    build_home_bundle()
    s = INDEX.read_text('utf-8')

    # Remove all previous homepage presentation links and the previous bundle.
    # Their rules are concatenated in the exact same cascade order above.
    targets = '|'.join(re.escape(name) for name in (*BUNDLE_SOURCES, 'home-bundle.css'))
    s = re.sub(
        rf'<link\b[^>]*rel=["\']stylesheet["\'][^>]*href=["\'][^"\']*(?:{targets})(?:\?[^"\']*)?["\'][^>]*>',
        '', s, flags=re.I,
    )

    bundle_link = f'<link rel="stylesheet" href="/assets/home-bundle.css?v={BUNDLE_VERSION}">'
    public = re.search(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*href=["\'][^"\']*public\.css[^"\']*["\'][^>]*>', s, flags=re.I)
    if public:
        s = s[:public.end()] + bundle_link + s[public.end():]
    else:
        s = s.replace('</head>', bundle_link + '</head>', 1)

    # Homepage content is fully static. Load the general runtime only when a
    # reader interacts or approaches the footer, removing it from initial TBT.
    loader = (
        '<script id="pv-app-loader">(function(){let done=false,io=null;'
        'function load(){if(done)return;done=true;if(io)io.disconnect();'
        'const s=document.createElement("script");s.src="/assets/app.js?v=' + APP_VERSION + '";s.defer=true;document.body.appendChild(s)}'
        'document.addEventListener("pointerdown",load,{once:true,passive:true});'
        'document.addEventListener("keydown",load,{once:true});'
        'const f=document.querySelector("footer.site-footer");'
        'if(f&&"IntersectionObserver" in window){io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting))load()},'
        '{rootMargin:"800px 0px",threshold:.01});io.observe(f)}})();</script>'
    )
    s = re.sub(r'<script(?:\s+[^>]*)?src=["\']/assets/app\.js\?v=[^"\']+["\'][^>]*></script>', loader, s, count=1, flags=re.I)
    s = re.sub(r'<script id="pv-app-loader">.*?</script>', loader, s, count=1, flags=re.S)
    if 'id="pv-app-loader"' not in s:
        s = s.replace('</body>', loader + '</body>', 1)

    INDEX.write_text(s, 'utf-8')


def check():
    s = INDEX.read_text('utf-8')
    assert s.count('home-bundle.css') == 1, f'home-bundle.css count={s.count("home-bundle.css")}'
    for name in BUNDLE_SOURCES:
        assert name not in s, f'unbundled stylesheet remains: {name}'
    assert 'id="pv-app-loader"' in s
    assert not re.search(r'<script(?:\s+[^>]*)?src=["\']/assets/app\.js', s, flags=re.I)
    assert not re.search(r'(?<!\d)0 публикац', s)
    assert s.count('HOME-LCP-PRELOAD-START') == 1
    assert BUNDLE.exists() and BUNDLE.stat().st_size > 0
    print('post-quality hardening invariants ok')


if __name__ == '__main__':
    harden_index()
    check()
