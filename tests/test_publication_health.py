import http.server
import json
import os
import shutil
import subprocess
import tempfile
import threading
import unittest
from pathlib import Path

SOURCE=Path(__file__).resolve().parents[1]/'scripts/check_publication_health.py'

class HealthCheckTest(unittest.TestCase):
 def test_page_and_image_then_missing_image(self):
  with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]) as tmp:
   root=Path(tmp);(root/'scripts').mkdir();(root/'data').mkdir();(root/'articles').mkdir();(root/'assets').mkdir()
   shutil.copy2(SOURCE,root/'scripts/check_publication_health.py')
   (root/'data/posts.json').write_text(json.dumps([{'slug':'p1','headline':'Статья','image':'/assets/x.jpg','url':'http://localhost/articles/p1.html','publishedAt':'2026-09-27'}]),encoding='utf-8')
   (root/'articles/p1.html').write_text('<title>Статья</title><meta name="robots" content="index"><h1>Статья</h1><img src="/assets/x.jpg">',encoding='utf-8')
   (root/'assets/x.jpg').write_bytes(b'jpg')
   class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(root),**kwargs)
    def log_message(self,*args):pass
   server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
   try:
    env={**os.environ,'PV_SITE_ROOT':f'http://127.0.0.1:{server.server_port}'}
    subprocess.run(['python3',str(root/'scripts/check_publication_health.py')],env=env,check=True,capture_output=True)
    report=json.loads((root/'data/publication-health.json').read_text());self.assertEqual(report['p1']['status'],'ok')
    (root/'assets/x.jpg').unlink()
    subprocess.run(['python3',str(root/'scripts/check_publication_health.py')],env=env,check=True,capture_output=True)
    report=json.loads((root/'data/publication-health.json').read_text());self.assertEqual(report['p1']['status'],'error')
    self.assertTrue(any('фото недоступно' in x for x in report['p1']['errors']))
   finally:server.shutdown();server.server_close()

if __name__=='__main__':unittest.main()
