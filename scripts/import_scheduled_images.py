import base64
import json
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
QUEUE = ROOT / '.github' / 'scheduled-posts.json'
SITE_HOSTS = {'provkus-media.ru', 'www.provkus-media.ru'}


def main():
    try:
        items = json.loads(QUEUE.read_text('utf-8'))
    except Exception:
        items = []
    imported = 0
    queue_changed = False
    for item in items:
        source = str(item.get('sourceImageUrl') or '').strip()
        embedded = str(item.get('sourceImageBase64') or '').strip()
        image = str((item.get('post') or {}).get('image') or '').strip()
        if not image or (not source and not embedded):
            continue
        parsed = urlparse(image)
        if parsed.scheme and parsed.netloc not in SITE_HOSTS:
            continue
        rel = parsed.path if parsed.scheme else image
        if not rel.startswith('/assets/uploads/'):
            continue
        target = ROOT / rel.lstrip('/')
        if not target.exists() or target.stat().st_size == 0:
            target.parent.mkdir(parents=True, exist_ok=True)
            if embedded:
                data = base64.b64decode(embedded, validate=True)
            else:
                req = Request(source, headers={'User-Agent': 'ProVkus scheduled image importer/1.1'})
                with urlopen(req, timeout=45) as response:
                    data = response.read()
            if len(data) < 1024:
                raise RuntimeError(f'Image download too small for {item.get("slug")}: {len(data)} bytes')
            target.write_bytes(data)
            imported += 1
            print(f'Imported scheduled image: {target.relative_to(ROOT)} ({len(data)} bytes)')
        if embedded:
            item.pop('sourceImageBase64', None)
            queue_changed = True
    if queue_changed:
        QUEUE.write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Scheduled image import complete: {imported} file(s)')


if __name__ == '__main__':
    main()
