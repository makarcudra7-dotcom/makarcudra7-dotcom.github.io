#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DZEN_URL = 'https://dzen.ru/provkusmedia?share_to=link'
BUTTON = ('<a id="pvDzenFooterLink" href="'+DZEN_URL+'" target="_blank" rel="noopener noreferrer" '
          'aria-label="ProVkus в Дзене" '
          'style="display:inline-flex;align-items:center;justify-content:center;min-height:42px;'
          'margin-top:14px;padding:10px 18px;border-radius:999px;background:#f05a2a;color:#fff;'
          'text-decoration:none;font:700 14px/1.2 system-ui,sans-serif;box-shadow:0 4px 16px #0002">'
          'Мы в Дзене →</a>')

STANDARD_FOOTER = ('<footer class="site-footer"><div class="container footer-grid">'
                   '<div class="footer-about"><div class="brand">Pro<b>Vkus</b></div>'
                   '<p>Практичное медиа о еде, продуктах и доме.</p>'+BUTTON+'</div>'
                   '<div><h2 class="footer-heading">Читать</h2><a href="/category.html">Все материалы</a><a href="/authors.html">Авторы</a></div>'
                   '<div><h2 class="footer-heading">Редакция</h2><a href="/editorial.html">О редакции</a><a href="/contacts.html">Контакты</a></div>'
                   '<div><h2 class="footer-heading">Документы</h2><a href="/privacy.html">Конфиденциальность</a><a href="/personal-data.html">Персональные данные</a></div>'
                   '</div></footer>')


def patch(path: Path) -> bool:
    if path.name == 'admin.html':
        return False
    text = path.read_text('utf-8')
    if 'id="pvDzenFooterLink"' in text:
        return False

    footer_match = re.search(r'<footer\b[^>]*class="[^"]*site-footer[^"]*"[^>]*>[\s\S]*?</footer>', text, re.I)
    if footer_match:
        footer = footer_match.group(0)
        about = re.search(r'(<div\b[^>]*class="[^"]*footer-about[^"]*"[^>]*>[\s\S]*?</p>)', footer, re.I)
        if about:
            new_footer = footer[:about.end()] + BUTTON + footer[about.end():]
        else:
            new_footer = footer[:-9] + BUTTON + '</footer>'
        text = text[:footer_match.start()] + new_footer + text[footer_match.end():]
    elif '</body>' in text:
        text = text.replace('</body>', STANDARD_FOOTER + '</body>', 1)
    else:
        return False

    path.write_text(text, 'utf-8')
    return True

changed = []
for path in list(ROOT.glob('*.html')) + list((ROOT/'articles').glob('*.html')):
    if patch(path):
        changed.append(str(path.relative_to(ROOT)))

print(f'Dzen footer button ensured on {len(changed)} pages')
