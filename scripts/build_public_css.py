"""Keep the public stylesheet in one cacheable request."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
names = ('styles.css', 'overrides.css', 'author-fix.css', 'site-ui.css',
         'community-extra.css', 'theme.css', 'seasonal.css')
css = '\n'.join((root / 'assets' / name).read_text('utf-8') for name in names)
(root / 'assets/public.css').write_text(css.rstrip('\n') + '\n', 'utf-8')
print('assets/public.css:', len(css.encode('utf-8')), 'bytes')
