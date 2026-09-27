#!/usr/bin/env python3
"""Fail the publication build when fresh articles are inconsistent or orphaned."""
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://provkus-media.ru'
NS = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}


def date(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc)


posts = json.loads((ROOT / 'data/posts.json').read_text('utf-8'))
public = [p for p in posts if p.get('slug') and p.get('publishedAt')
          and date(p['publishedAt']) <= datetime.now(timezone.utc)
          and (ROOT / 'articles' / (p['slug'] + '.html')).exists()]
public.sort(key=lambda p: date(p['publishedAt']), reverse=True)
assert public, 'No public articles found'

tree = ET.parse(ROOT / 'sitemap.xml')
entries = {}
for url in tree.findall('s:url', NS):
    loc = url.findtext('s:loc', namespaces=NS)
    assert loc not in entries, f'Duplicate sitemap URL: {loc}'
    entries[loc] = url.findtext('s:lastmod', namespaces=NS)

home = (ROOT / 'index.html').read_text('utf-8')
category = (ROOT / 'category.html').read_text('utf-8')
assert SITE + '/archive.html' in entries, 'Archive missing from sitemap'
assert SITE + '/calculators.html' in entries, 'Calculator hub missing from sitemap'
for post in public[:15]:
    url = post.get('url') or f"{SITE}/articles/{post['slug']}.html"
    assert url in entries, f'Fresh article missing from sitemap: {url}'
    assert entries[url], f'Fresh article missing lastmod: {url}'
    published = date(post['publishedAt'])
    modified = max(published, date(post['updatedAt'])) if post.get('updatedAt') else published
    assert date(entries[url]) >= modified.replace(hour=0, minute=0, second=0, microsecond=0), f'Stale lastmod: {url}'
    page = (ROOT / 'articles' / (post['slug'] + '.html')).read_text('utf-8')
    assert f'<link rel="canonical" href="{url}"' in page, f'Canonical mismatch: {url}'
    assert 'name="robots" content="noindex' not in page, f'Noindex article: {url}'
    assert post['slug'] + '.html' in category, f'Fresh article missing from category: {url}'
    assert post['slug'] + '.html' in home or post['slug'] + '.html' in (
        ROOT / 'archive.html').read_text('utf-8'), f'Fresh article has no home/archive link: {url}'
    assert 'DISCOVERY-LINKS-START' in page, f'Fresh article missing static related links: {url}'
    for match in re.finditer(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', page, re.S):
        data = json.loads(match.group(1))
        nodes = data.get('@graph', [data]) if isinstance(data, dict) else []
        for node in nodes:
            if node.get('@type') in ('Article', 'NewsArticle', 'Recipe'):
                assert date(node['dateModified']) >= date(node['datePublished']), f'Reversed schema dates: {url}'
    meta = re.search(r'<meta property="article:modified_time" content="([^"]+)"', page)
    assert meta and date(meta.group(1)) >= published, f'Reversed article modified time: {url}'

print(f'Indexing surfaces OK: {len(public[:15])} recent articles, {len(entries)} sitemap URLs')
