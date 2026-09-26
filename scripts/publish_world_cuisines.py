#!/usr/bin/env python3
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / 'drafts' / 'world-cuisines'
QUEUE = ROOT / '.github' / 'scheduled-posts.json'
REGISTRY = DRAFT / 'final-photo-registry-95.json'
LOCAL_TZ = timezone(timedelta(hours=4))
DAY_SLOTS = [(6,10),(7,45),(9,20),(11,5),(12,40),(14,15),(16,5),(18,10),(20,20),(22,15)]
PLACEHOLDER = 'https://provkus-media.ru/assets/world-cuisines-placeholder.svg'

def read_json(path, fallback=None):
    try:
        return json.loads(path.read_text('utf-8'))
    except FileNotFoundError:
        return fallback

def utc_iso(dt):
    return dt.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')

def publication_times():
    times = []
    for day in range(16,25):
        for hh, mm in DAY_SLOTS:
            times.append(datetime(2026,9,day,hh,mm,tzinfo=LOCAL_TZ))
    for hh, mm in [(8,20),(11,40),(15,10),(20,30)]:
        times.append(datetime(2026,9,25,hh,mm,tzinfo=LOCAL_TZ))
    times.append(datetime(2026,9,26,5,6,tzinfo=LOCAL_TZ))
    assert len(times) == 95
    return [utc_iso(x) for x in times]

def main():
    registry = read_json(REGISTRY)
    items = registry.get('items', [])
    if len(items) != 95 or [x.get('photoOrder') for x in items] != list(range(1,96)):
        raise SystemExit('Authoritative registry must contain photoOrder 1..95')

    articles = {}
    for batch in sorted(DRAFT.glob('batch-*.json')):
        for article in read_json(batch, {}).get('articles', []):
            slug = article.get('slug')
            if not slug:
                continue
            if slug in articles:
                raise SystemExit(f'Duplicate draft slug: {slug}')
            articles[slug] = article

    expected = {x['slug'] for x in items}
    missing = expected - set(articles)
    if missing:
        raise SystemExit('Missing article drafts: ' + ', '.join(sorted(missing)))

    times = publication_times()
    old_queue = read_json(QUEUE, []) or []
    queue = [x for x in old_queue if x.get('slug') not in expected]

    for idx, reg in enumerate(items):
        slug = reg['slug']
        a = dict(articles[slug])
        published = times[idx]
        cuisine = reg.get('cuisine') or a.get('cuisine') or 'Кухни мира'
        dish = reg.get('article') or a.get('dish') or a.get('headline') or slug
        target_image = f'https://provkus-media.ru/assets/uploads/{slug}-16x9.webp'
        material = {**a,
            'slug': slug,
            'category': 'Кухни мира',
            'type': 'recipe',
            'recipeCuisine': cuisine,
            'recipeCategory': 'Домашний рецепт',
            'canonical': f'https://provkus-media.ru/articles/{slug}.html',
            'robots': 'index, follow, max-image-preview:large',
            'imageAlt': f'{dish} — домашний рецепт, {cuisine}',
        }
        post = {
            'slug': slug,
            'headline': a['headline'],
            'description': a.get('description',''),
            'author': a.get('author','Илья Титюлькин'),
            'category': 'Кухни мира',
            'type': 'recipe',
            'typeLabel': 'Рецепт',
            'image': PLACEHOLDER,
            'images': [PLACEHOLDER],
            'imageTarget': target_image,
            'imageAlt': material['imageAlt'],
            'url': material['canonical'],
            'publishedAt': published,
            'updatedAt': published,
            'tags': ['Кухни мира', cuisine, dish],
            'featured': False,
            'popular': False,
            'excludeRelated': False,
        }
        queue.append({'slug': slug, 'publishAt': published, 'material': material, 'post': post})

    QUEUE.write_text(json.dumps(queue, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    registry['status'] = 'published-with-photo-targets'
    registry['pendingReview'] = []
    registry['publicationWindow'] = {
        'timezone': 'UTC+04:00',
        'first': '2026-09-16T06:10:00+04:00',
        'last': '2026-09-26T05:06:00+04:00',
        'allPastAtPreparation': True
    }
    for item in registry['items']:
        item['status'] = 'accepted'
    REGISTRY.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(f'Prepared 95 due publications; queue total: {len(queue)}')

if __name__ == '__main__':
    main()
