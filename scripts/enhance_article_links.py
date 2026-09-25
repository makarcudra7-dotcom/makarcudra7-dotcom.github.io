import json, re, html
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import quote

ROOT=Path(__file__).resolve().parents[1]
POSTS=json.loads((ROOT/'data/posts.json').read_text('utf-8'))
MONTHS=['','января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

def parse_dt(value):
    if not value:return None
    try:return datetime.fromisoformat(value.replace('Z','+00:00')).astimezone(timezone.utc)
    except Exception:return None

def is_public(p):
    dt=parse_dt(p.get('publishedAt'))
    return bool(p.get('slug')) and (not dt or dt<=datetime.now(timezone.utc)) and (ROOT/'articles'/f"{p['slug']}.html").exists()

POSTS=[p for p in POSTS if is_public(p)]
POSTS.sort(key=lambda p:parse_dt(p.get('publishedAt')) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
BY_SLUG={p['slug']:p for p in POSTS}

def related_for(post, limit=4):
    out=[]
    def add(pool):
        for p in pool:
            if p['slug']==post['slug'] or p in out:continue
            out.append(p)
            if len(out)>=limit:return True
        return False
    category=(post.get('category') or '').strip().lower()
    if category and add([p for p in POSTS if (p.get('category') or '').strip().lower()==category]):return out
    author=(post.get('author') or '').strip()
    if author and add([p for p in POSTS if (p.get('author') or '').strip()==author]):return out
    add(POSTS)
    return out

def effective_modified(post):
    pub=parse_dt(post.get('publishedAt'))
    upd=parse_dt(post.get('updatedAt'))
    if not pub:return post.get('updatedAt') or post.get('publishedAt') or ''
    if not upd or upd<pub:return post.get('publishedAt') or ''
    return post.get('updatedAt') or post.get('publishedAt') or ''

def day_label(dt):
    return f'{dt.day} {MONTHS[dt.month]} {dt.year}'

changed=0
for path in (ROOT/'articles').glob('*.html'):
    post=BY_SLUG.get(path.stem)
    if not post:continue
    source=path.read_text('utf-8')
    before=source
    pub_dt=parse_dt(post.get('publishedAt'))
    upd_dt=parse_dt(post.get('updatedAt'))
    modified=effective_modified(post)

    # Keep machine-readable dates logically ordered. A legacy CMS timezone bug
    # produced a few dateModified values earlier than datePublished.
    if modified:
        source=re.sub(r'(<meta\s+property="article:modified_time"\s+content=")[^"]*(")',r'\g<1>'+html.escape(modified,quote=True)+r'\2',source,count=1)
        source=re.sub(r'("dateModified"\s*:\s*")[^"]*(")',r'\g<1>'+modified+r'\2',source,count=1)
    if pub_dt and upd_dt and upd_dt<pub_dt:
        source=re.sub(r'<span>Обновлено\s*<time\s+datetime="[^"]*">.*?</time></span>','',source,count=1,flags=re.S)

    rel=related_for(post)
    links=''.join(
        f'<li><a href="/articles/{quote(p["slug"])}.html">{html.escape(p.get("headline") or "Материал")}</a></li>'
        for p in rel
    )
    archive_link=''
    if pub_dt:
        archive_url=f'/archive/{pub_dt.year}/{pub_dt.month:02d}/{pub_dt.day:02d}/'
        archive_link=f'<p class="section-sub"><a href="{archive_url}">Все материалы за {day_label(pub_dt)} →</a></p>'
    block=(f'<!-- DISCOVERY-LINKS-START --><aside class="related" aria-label="Читайте также">'
           f'<h2>Читайте также</h2><ul>{links}</ul>{archive_link}</aside><!-- DISCOVERY-LINKS-END -->')
    if '<!-- DISCOVERY-LINKS-START -->' in source:
        source=re.sub(r'<!-- DISCOVERY-LINKS-START -->.*?<!-- DISCOVERY-LINKS-END -->',lambda _:block,source,count=1,flags=re.S)
    else:
        source=source.replace('</article>',block+'</article>',1)

    if source!=before:
        path.write_text(source,'utf-8');changed+=1

print(f'Enhanced {changed} article pages with static discovery links and normalized dates')
