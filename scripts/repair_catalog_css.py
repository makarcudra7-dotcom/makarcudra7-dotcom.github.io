"""One-time repair: restore Fruit Jazz and normalize its cover format.

The stylesheet rebuild is intentionally handled by scripts/build_public_css.py
so the public design remains exactly the composition of the existing source CSS.
"""
from pathlib import Path
import json
import subprocess
import imageio_ffmpeg

root = Path(__file__).resolve().parents[1]
posts_path = root / 'data' / 'posts.json'
restored_path = root / 'data' / 'restored-fruit-jazz.json'
article_path = root / 'articles' / 'zakryvayu-po-50-banok-i-vse-ravno-malo-kompot-fruktovyy-dzhaz-iz-yablok-i-vinograda-zimoy-p-em-kak-limonad.html'
webp_path = root / 'assets' / 'uploads' / 'fruit-jazz-16x9.webp'
jpg_path = root / 'assets' / 'uploads' / 'fruit-jazz-16x9.jpg'

# Re-encode the same picture as a conventional JPEG using the bundled ffmpeg
# binary. This avoids CI/browser decoder differences without changing artwork.
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([
    ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
    '-i', str(webp_path), '-frames:v', '1', '-q:v', '2', str(jpg_path)
], check=True)

restored = json.loads(restored_path.read_text('utf-8'))
old_image = 'https://provkus-media.ru/assets/uploads/fruit-jazz-16x9.webp'
new_image = 'https://provkus-media.ru/assets/uploads/fruit-jazz-16x9.jpg'
restored['image'] = new_image
restored['images'] = [new_image]
restored_path.write_text(json.dumps(restored, ensure_ascii=False, indent=2) + '\n', 'utf-8')

# Keep the article's visible cover, Open Graph/Twitter image and JSON-LD aligned
# with the catalog metadata.
article = article_path.read_text('utf-8')
article = article.replace(old_image, new_image).replace('/assets/uploads/fruit-jazz-16x9.webp', '/assets/uploads/fruit-jazz-16x9.jpg')
article_path.write_text(article, 'utf-8')

posts = json.loads(posts_path.read_text('utf-8'))
slug = restored['slug']
existing = next((i for i, post in enumerate(posts) if post.get('slug') == slug), None)
if existing is None:
    posts.append(restored)
    action = 'added'
else:
    posts[existing] = restored
    action = 'refreshed'

# Keep the editorial inventory in reverse chronological order without touching
# featured/popular flags or metadata of other articles.
posts.sort(key=lambda post: str(post.get('publishedAt') or ''), reverse=True)
posts_path.write_text(json.dumps(posts, ensure_ascii=False, indent=2) + '\n', 'utf-8')
print(f'Fruit Jazz: {action}; posts={len(posts)}; cover={jpg_path.name}')
