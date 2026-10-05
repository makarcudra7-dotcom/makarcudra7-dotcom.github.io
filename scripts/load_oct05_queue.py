#!/usr/bin/env python3
import base64
import gzip
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / '.github' / 'oct05_queue_payload'
QUEUE = ROOT / '.github' / 'scheduled-posts.json'

parts = sorted(PAYLOAD.glob('part*.txt'))
if len(parts) != 8:
    raise SystemExit(f'October 5 queue payload incomplete: expected 8 parts, got {len(parts)}')
encoded = ''.join(p.read_text('ascii').strip() for p in parts)
queue_text = gzip.decompress(base64.b64decode(encoded)).decode('utf-8')
QUEUE.write_text(queue_text, encoding='utf-8')
print('Loaded October 5 queue: 8 materials')
shutil.rmtree(PAYLOAD)
Path(__file__).unlink()
