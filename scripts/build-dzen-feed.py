"""Build a dedicated full-text RSS feed from already published site articles."""
import html
import json
import re
from datetime import datetime, timezone
from email.utils import format_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://provkus-media.ru'
OUT = ROOT / 'dzen.xml'
HEADLINES_FILE = ROOT / 'data' / 'dzen-headlines.json'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
TRAILING = {'и', 'а', 'но', 'или', 'что', 'как', 'где', 'когда', 'для', 'без', 'с', 'со', 'в', 'на', 'по', 'из', 'от', 'до'}


def load_headlines():
    try:
        raw = json.loads(HEADLINES_FILE.read_text('utf-8'))
        return {str(k): str(v).strip() for k, v in raw.items() if str(v).strip()}
    except Exception:
        return {}


DZEN_HEADLINES = load_headlines()


class ArticleBody(HTMLParser):
    def __init__(self, article_url):
        super().__init__(convert_charrefs=False)
        self.article_url = article_url
        self.depth = 0
        self.parts = []
        self.blocked = 0

    def handle_starttag(self, tag, attrs):
        if not self.depth:
            if tag == 'div' and 'article-body' in dict(attrs).get('class', '').split():
                self.depth = 1
            return
        if tag in {'script', 'style', 'iframe', 'form'}:
            self.blocked += 1
        if tag == 'div':
            self.depth += 1
        if self.blocked:
            return
        attrs = [(k, urljoin(self.article_url, v) if k in {'src', 'href'} and v else v) for k, v in attrs]
        self.parts.append('<' + tag + ''.join(' ' + k + (f'="{html.escape(v, quote=True)}"' if v is not None else '') for k, v in attrs) + '>')

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if not self.depth:
            return
        if tag == 'div':
            self.depth -= 1
            if not self.depth:
                return
        if self.blocked:
            if tag in {'script', 'style', 'iframe', 'form'}:
                self.blocked -= 1
            return
        if tag not in VOID:
            self.parts.append(f'</{tag}>')

    def handle_data(self, data):
        if self.depth and not self.blocked:
            self.parts.append(data)

    def handle_entityref(self, name):
        self.handle_data('&' + name + ';')

    def handle_charref(self, name):
        self.handle_data('&#' + name + ';')


def date(value):
    try:
        parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def tidy_title(value, limit=108):
    value = re.sub(r'\s+', ' ', str(value or '')).strip(' .!?;:—-')
    if len(value) <= limit:
        return value
    # Prefer a full clause before a colon or semicolon.
    for sep in (':', ';'):
        pos = value.find(sep)
        if 30 <= pos <= limit:
            return value[:pos].strip(' .!?;:—-')
    cut = value[:limit + 1]
    comma = cut.rfind(',')
    if comma >= 55:
        cut = cut[:comma]
    else:
        cut = cut.rsplit(' ', 1)[0]
    words = cut.strip(' .!?;:—-').split()
    while words and words[-1].casefold().strip('«»“”"\'') in TRAILING:
        words.pop()
    return ' '.join(words).strip(' .!?;:—-')


def dzen_title(post):
    slug = str(post.get('slug') or '')
    explicit = DZEN_HEADLINES.get(slug)
    if explicit:
        return explicit
    description = re.sub(r'\s+', ' ', str(post.get('description') or '')).strip()
    if description:
        first = re.split(r'(?<=[.!?])\s+', description, maxsplit=1)[0]
        if first:
            return tidy_title(first)
    return tidy_title(post.get('headline') or 'Материал ProVkus')


def item(post):
    slug = post.get('slug', '')
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', slug):
        return None
    file = ROOT / 'articles' / (slug + '.html')
    published = date(post.get('publishedAt'))
    if not file.is_file() or not published or published > datetime.now(timezone.utc):
        return None
    url = SITE + '/articles/' + slug + '.html'
    source = file.read_text('utf-8')
    if re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex', source, re.I):
        return None
    body = ArticleBody(url)
    body.feed(source)
    content = ''.join(body.parts).strip()
    if not content:
        return None
    return post, url, published, content


def xml(value):
    return html.escape(str(value or ''), quote=True)


def cdata(value):
    return '<![CDATA[' + value.replace(']]>', ']]]]><![CDATA[>') + ']]>'


posts = json.loads((ROOT / 'data' / 'posts.json').read_text('utf-8'))
selected = [row for p in posts if (row := item(p))]
selected.sort(key=lambda row: row[2], reverse=True)
selected = selected[:30]
entries = []
for post, url, published, content in selected:
    image = post.get('image') or (post.get('images') or [''])[0]
    image = urljoin(SITE + '/', image) if image else ''
    cover = ''
    if image.startswith(SITE + '/'):
        file = ROOT / image[len(SITE) + 1:].split('?', 1)[0]
        mime = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif'}.get(file.suffix.lower())
        if mime and file.is_file():
            cover = f'<enclosure url="{xml(image)}" length="{file.stat().st_size}" type="{mime}"/>'
    seen = set()
    cats = []
    for tag in [post.get('category', ''), *(post.get('tags') or [])]:
        key = str(tag or '').strip().casefold()
        if key and key not in seen:
            seen.add(key)
            cats.append(str(tag).strip())
    cats.extend(['format-article', 'index', 'comment-all'])
    tags = ''.join(f'<category>{xml(tag)}</category>' for tag in cats)
    entries.append(f'''  <item>
    <title>{xml(dzen_title(post))}</title>
    <link>{xml(url)}</link><guid isPermaLink="true">{xml(url)}</guid>
    <pubDate>{format_datetime(published)}</pubDate>
    <description>{xml(post.get('description'))}</description>
    <dc:creator>{xml(post.get('author') or 'Редакция ProVkus')}</dc:creator>
    {tags}<contentType>blogs_only</contentType>
    {f'<media:content url="{xml(image)}" medium="image"/>' if image else ''}
    {cover}
    <content:encoded>{cdata(content)}</content:encoded>
  </item>''')
latest = max((row[2] for row in selected), default=datetime.now(timezone.utc))
feed = f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>ProVkus — статьи для Дзена</title>
  <link>{SITE}/</link>
  <atom:link href="{SITE}/dzen.xml" rel="self" type="application/rss+xml"/>
  <description>Рецепты, продукты, хранение и новости ProVkus</description>
  <language>ru</language>
  <lastBuildDate>{format_datetime(latest)}</lastBuildDate>
{chr(10).join(entries)}
</channel></rss>
'''
ElementTree.fromstring(feed)
OUT.write_text(feed, 'utf-8')
print(f'dzen.xml: {len(selected)} published full-text articles; safe Dzen titles enabled')
