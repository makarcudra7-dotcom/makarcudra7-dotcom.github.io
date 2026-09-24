"""One-time repair: restore the Fruit Jazz article to data/posts.json.

The stylesheet rebuild is intentionally handled by scripts/build_public_css.py
so the public design remains exactly the composition of the existing source CSS.
"""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
posts_path = root / 'data' / 'posts.json'
restored_path = root / 'data' / 'restored-fruit-jazz.json'

posts = json.loads(posts_path.read_text('utf-8'))
restored = json.loads(restored_path.read_text('utf-8'))
slug = restored['slug']

existing = next((i for i, post in enumerate(posts) if post.get('slug') == slug), None)
if existing is None:
    posts.append(restored)
    action = 'added'
else:
    posts[existing] = restored
    action = 'refreshed'

# Keep the editorial inventory in reverse chronological order without touching
# featured/popular flags or any other article metadata.
posts.sort(key=lambda post: str(post.get('publishedAt') or ''), reverse=True)
posts_path.write_text(json.dumps(posts, ensure_ascii=False, indent=2) + '\n', 'utf-8')
print(f'Fruit Jazz: {action}; posts={len(posts)}')
