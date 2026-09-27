from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'
APP_VERSION = '20260927-quality12'


def harden_index():
    s = INDEX.read_text('utf-8')

    # Keep only one copy of each stylesheet URL. Repeated site-ui links add
    # request/discovery work and make the cascade harder to reason about.
    seen = set()
    def dedupe_link(m):
        tag = m.group(0)
        href_m = re.search(r'href=["\']([^"\']+)["\']', tag, flags=re.I)
        if not href_m:
            return tag
        href = href_m.group(1)
        if href in seen:
            return ''
        seen.add(href)
        return tag
    s = re.sub(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*>', dedupe_link, s, flags=re.I)

    # Homepage content is fully static. Load the general runtime only when a
    # reader interacts or approaches the footer, removing it from the initial
    # mobile main-thread budget without removing any interactive features.
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
    if 'id="pv-app-loader"' not in s:
        # If a generator removed the direct script entirely, restore the loader.
        s = s.replace('</body>', loader + '</body>', 1)

    INDEX.write_text(s, 'utf-8')


def check():
    s = INDEX.read_text('utf-8')
    assert s.count('site-ui.css') == 1, f'site-ui.css count={s.count("site-ui.css")}'
    assert 'id="pv-app-loader"' in s
    assert not re.search(r'<script(?:\s+[^>]*)?src=["\']/assets/app\.js', s, flags=re.I)
    assert '0 публикац' not in s
    assert s.count('HOME-LCP-PRELOAD-START') == 1
    print('post-quality hardening invariants ok')


if __name__ == '__main__':
    harden_index()
    check()
