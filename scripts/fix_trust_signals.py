from pathlib import Path
import json, re, sys

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://provkus-media.ru'
CHECK = '--check' in sys.argv

AUTHORS = {
    'Илья Титюлькин': 'author-ilya.html',
    'Эльвира Шайберт': 'author-elvira.html',
    'Екатерина Рукопляс': 'author-ekaterina.html',
}

# Sources are deliberately limited to government / public-interest food-safety bodies
# plus Roskachestvo where the article is about product selection rather than medicine.
SOURCE_MAP = {
    'kak-bezopasno-razmorazhivat-myaso': [
        ('Роспотребнадзор — безопасное размораживание продуктов', 'https://zpp.rospotrebnadzor.ru/info/analysis/464925'),
        ('USDA FSIS — The Big Thaw: Safe Defrosting Methods', 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/big-thaw-safe-defrosting-methods'),
        ('USDA FSIS — Ground Beef and Food Safety', 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/meat/ground-beef-and-food-safety'),
    ],
    'zachem-myt-banany-i-mandariny': [
        ('Роспотребнадзор — как мыть овощи и фрукты', 'https://zpp.rospotrebnadzor.ru/news/federal/574886'),
        ('FDA — Selecting and Serving Produce Safely', 'https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-produce-safely'),
        ('FDA — 7 Tips for Cleaning Fruits, Vegetables', 'https://www.fda.gov/consumers/consumer-updates/7-tips-cleaning-fruits-vegetables'),
    ],
    'kak-vybrat-syr-s-plesenyu': [
        ('Роскачество — как выбрать сыр с плесенью', 'https://rskrf.ru/tips/pravila-pokupki/kak-vybrat-syr-s-plesenyu/'),
        ('USDA FSIS — Molds on Food: Are They Dangerous?', 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/molds-food-are-they-dangerous'),
        ('FDA — Are You Storing Food Safely?', 'https://www.fda.gov/consumers/consumer-updates/are-you-storing-food-safely'),
    ],
    'skolko-hranit-plavlenyi-syr-posle-vskrytiya': [
        ('Роскачество — выбираем плавленый сыр', 'https://rskrf.ru/tips/pravila-pokupki/vybiraem-plavlenyy-syr/'),
        ('Health Canada — Safe food storage', 'https://www.canada.ca/en/health-canada/services/general-food-safety-tips/safe-food-storage.html'),
        ('FDA — Are You Storing Food Safely?', 'https://www.fda.gov/consumers/consumer-updates/are-you-storing-food-safely'),
    ],
    'ne-probuyte-na-vkus-takie-zakrutki-5-neochevidnyh-priznakov-posle-kotoryh-banku-luchshe-ne-otkryvat': [
        ('Роспотребнадзор — «Домашнее консервирование: главные правила безопасности»', 'https://26.rospotrebnadzor.ru/press-center/pr/14344/'),
        ('Роспотребнадзор — «Дачный урожай: безопасная консервация»', 'https://06.rospotrebnadzor.ru/content/dachnyy-urozhay-bezopasnaya-konservaciya'),
        ('CDC — Home-Canned Foods and Botulism', 'https://www.cdc.gov/botulism/prevention/home-canned-foods.html'),
    ],
    'nuzhno-li-myt-yayca-posle-magazina': [
        ('Роспотребнадзор — рекомендации по яйцам', 'https://zpp.rospotrebnadzor.ru/news/federal/535642'),
        ('Роспотребнадзор — яйцо как возможный источник сальмонеллёза', 'https://89.rospotrebnadzor.ru/directions/epid_nadzor/151247/'),
        ('Роспотребнадзор — рекомендации по обработке яиц перед приготовлением', 'https://zpp.rospotrebnadzor.ru/news/federal/208082'),
    ],
    'kak-pravilno-hranit-yayca-v-holodilnike': [
        ('Роскачество — как выбрать куриные яйца', 'https://rskrf.ru/tips/pravila-pokupki/kak-vybrat-kurinye-yaytsa/'),
        ('Роспотребнадзор — как выбрать качественное куриное яйцо', 'https://04.rospotrebnadzor.ru/index.php/consumer-information/faq/17944-24012023.pdf'),
        ('FDA — What You Need to Know About Egg Safety', 'https://www.fda.gov/food/buy-store-serve-safe-food/what-you-need-know-about-egg-safety'),
    ],
    'chto-ne-hranit-na-dverce-holodilnika': [
        ('Роспотребнадзор — рекомендации по хранению продуктов в холодильнике', 'https://zpp.rospotrebnadzor.ru/news/federal/574709'),
        ('USDA FSIS — Refrigeration & Food Safety', 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/refrigeration'),
        ('FDA — Are You Storing Food Safely?', 'https://www.fda.gov/consumers/consumer-updates/are-you-storing-food-safely'),
    ],
    'sup-skisaet-ran-she-vremeni-3-oshibki-hraneniya-polovnik-v-kastryule-odna-iz-nih': [
        ('Роспотребнадзор — «Сроки годности готовых блюд»', 'https://62.rospotrebnadzor.ru/content/sroki-godnosti-gotovyh-blyud'),
        ('Роспотребнадзор — «Как правильно хранить пищевые продукты»', 'https://zpp.rospotrebnadzor.ru/news/federal/546715'),
        ('Роспотребнадзор — гигиенические правила приготовления, хранения и потребления пищи', 'https://44.rospotrebnadzor.ru/sanitarnyj_nadzor/6243/'),
    ],
}

posts = json.loads((ROOT / 'data/posts.json').read_text('utf-8'))
post_by_slug = {p['slug']: p for p in posts}


def sources_html(items):
    lis = ''.join(
        f'<li><a href="{url}" target="_blank" rel="noopener noreferrer">{title}</a></li>'
        for title, url in items
    )
    return f'<div class="note"><strong>Источники и проверка фактов:</strong><ol class="pv-sources">{lis}</ol></div>'


def patch_jsonld(text, slug):
    p = post_by_slug.get(slug, {})
    images = p.get('images') or ([p.get('image')] if p.get('image') else [])

    def repl(m):
        raw = m.group(2)
        try:
            obj = json.loads(raw)
        except Exception:
            return m.group(0)
        nodes = obj.get('@graph') if isinstance(obj, dict) and isinstance(obj.get('@graph'), list) else [obj]
        changed = False
        for node in nodes:
            if not isinstance(node, dict) or node.get('@type') not in ('Article', 'NewsArticle', 'BlogPosting'):
                continue
            author = node.get('author')
            if isinstance(author, dict):
                url = author.get('url')
                if url:
                    desired = url.rstrip('#') + '#person'
                    if author.get('@id') != desired:
                        author['@id'] = desired
                        changed = True
            if images and node.get('image') != images:
                node['image'] = images
                changed = True
            publisher = node.get('publisher')
            if isinstance(publisher, dict):
                if publisher.get('@id') != SITE + '/#organization':
                    publisher['@id'] = SITE + '/#organization'
                    changed = True
                logo = publisher.get('logo')
                if isinstance(logo, dict):
                    if logo.get('url') != SITE + '/assets/provkus-logo.svg':
                        logo['url'] = SITE + '/assets/provkus-logo.svg'
                        logo['contentUrl'] = SITE + '/assets/provkus-logo.svg'
                        logo['width'] = 512
                        logo['height'] = 512
                        changed = True
        if not changed:
            return m.group(0)
        payload = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
        return m.group(1) + payload + m.group(3)

    return re.sub(r'(<script[^>]+type="application/ld\+json"[^>]*>)(.*?)(</script>)', repl, text, flags=re.S | re.I)


def patch_article(path):
    slug = path.stem
    text = path.read_text('utf-8')
    original = text

    # Remove accidental tracking parameters left by drafting tools.
    text = text.replace('?utm_source=chatgpt.com', '').replace('&utm_source=chatgpt.com', '')

    # Flatten accidental nested anchors with the same href.
    nested = re.compile(r'<a href="([^"]+)"([^>]*)>\s*<a href="\1"([^>]*)>(.*?)</a>\s*</a>', re.S | re.I)
    while nested.search(text):
        text = nested.sub(r'<a href="\1"\2>\4</a>', text)

    # Standardize high-risk source blocks.
    if slug in SOURCE_MAP:
        block = sources_html(SOURCE_MAP[slug])
        note_re = re.compile(r'<div class="note"><strong>Источники(?: и проверка фактов)?(?:|:)</strong>.*?</div>|<div class="note"><strong>Источник:</strong>.*?</div>', re.S | re.I)
        if note_re.search(text):
            text = note_re.sub(block, text, count=1)
        else:
            text = text.replace('</div></div><!-- DISCOVERY-LINKS-START -->', block + '</div></div><!-- DISCOVERY-LINKS-START -->', 1)
            if text == original:
                text = text.replace('</div></article>', block + '</div></article>', 1)

    # Remove an SEO-like filler paragraph identified in the audit.
    if slug == 'skolko-hranit-plavlenyi-syr-posle-vskrytiya':
        text = re.sub(
            r'<h2>Что важно запомнить</h2><p>Если вы ищете практический ответ по теме .*?</p>',
            '', text, flags=re.S
        )

    # Ensure image preview and OG dimensions are explicit.
    robots = re.search(r'<meta name="robots" content="([^"]*)">', text, re.I)
    if robots and 'max-image-preview:large' not in robots.group(1).lower():
        value = robots.group(1).rstrip(' ,') + ', max-image-preview:large'
        text = text[:robots.start(1)] + value + text[robots.end(1):]
    if '<meta property="og:image"' in text and '<meta property="og:image:width"' not in text:
        text = re.sub(r'(<meta property="og:image" content="[^"]+">)', r'\1<meta property="og:image:width" content="1600"><meta property="og:image:height" content="900">', text, count=1)

    text = patch_jsonld(text, slug)

    if not CHECK and text != original:
        path.write_text(text, 'utf-8')
    return text


def patch_author_page(path):
    text = path.read_text('utf-8')
    original = text
    url = SITE + '/' + path.name

    def repl(m):
        try:
            obj = json.loads(m.group(2))
        except Exception:
            return m.group(0)
        if not isinstance(obj, dict) or obj.get('@type') != 'ProfilePage' or not isinstance(obj.get('mainEntity'), dict):
            return m.group(0)
        person = obj['mainEntity']
        person['@id'] = url + '#person'
        person.setdefault('url', url)
        payload = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
        return m.group(1) + payload + m.group(3)

    text = re.sub(r'(<script[^>]+type="application/ld\+json"[^>]*>)(.*?)(</script>)', repl, text, flags=re.S | re.I)
    if not CHECK and text != original:
        path.write_text(text, 'utf-8')
    return text


def patch_publisher():
    path = ROOT / 'scripts/publish-scheduled.js'
    text = path.read_text('utf-8')
    original = text
    old = "author:{'@type':'Person',name:o.author,url:`https://provkus-media.ru/${auth.url}`}"
    new = "author:{'@type':'Person','@id':`https://provkus-media.ru/${auth.url}#person`,name:o.author,url:`https://provkus-media.ru/${auth.url}`}"
    text = text.replace(old, new)
    text = text.replace(
        "logo:{'@type':'ImageObject',url:'https://provkus-media.ru/favicon.png'}",
        "logo:{'@type':'ImageObject',url:'https://provkus-media.ru/assets/provkus-logo.svg',contentUrl:'https://provkus-media.ru/assets/provkus-logo.svg',width:512,height:512}"
    )
    gate_old = "function render(item){const o=item.material||{},p=item.post||{},auth=authors[o.author]||authors['Илья Титюлькин'];"
    gate_new = "function render(item){const o=item.material||{},p=item.post||{},auth=authors[o.author]||authors['Илья Титюлькин'];const risk=String(o.category||'').toLowerCase().includes('безопас')||(p.tags||[]).some(x=>String(x).toLowerCase()==='безопасность еды');const sourceCount=((String(o.sourceHtml||'').match(/href=/g)||[]).length)+(o.source?1:0);if(risk&&sourceCount<3)throw new Error(`Safety material ${o.slug||p.slug||o.headline} requires at least 3 verifiable sources`);"
    if gate_old in text:
        text = text.replace(gate_old, gate_new)
    if not CHECK and text != original:
        path.write_text(text, 'utf-8')
    return text


def patch_audit():
    path = ROOT / 'scripts/audit_site.py'
    text = path.read_text('utf-8')
    if '# TRUST-SOURCE-AUDIT' in text:
        return text
    block = r'''
# TRUST-SOURCE-AUDIT
explicit_high_risk={
 'kak-bezopasno-razmorazhivat-myaso','zachem-myt-banany-i-mandariny','kak-vybrat-syr-s-plesenyu',
 'skolko-hranit-plavlenyi-syr-posle-vskrytiya','ne-probuyte-na-vkus-takie-zakrutki-5-neochevidnyh-priznakov-posle-kotoryh-banku-luchshe-ne-otkryvat',
 'nuzhno-li-myt-yayca-posle-magazina','kak-pravilno-hranit-yayca-v-holodilnike','chto-ne-hranit-na-dverce-holodilnika',
 'sup-skisaet-ran-she-vremeni-3-oshibki-hraneniya-polovnik-v-kastryule-odna-iz-nih'
}
for p in posts:
 f=ROOT/'articles'/f'{p["slug"]}.html'
 if not f.exists():continue
 article_text=f.read_text('utf-8')
 check('utm_source=chatgpt.com' not in article_text,f'{f.name}: drafting tracking parameter')
 check(not re.search(r'<a[^>]*>\s*<a\b',article_text,re.I),f'{f.name}: nested anchor')
 nodes=ld_nodes(article_text)
 article=next((x for x in nodes if x.get('@type') in ('Article','NewsArticle','BlogPosting')),None)
 if article and isinstance(article.get('author'),dict) and article['author'].get('url'):
  check(article['author'].get('@id')==article['author']['url'].rstrip('#')+'#person',f'{f.name}: author @id')
 high_risk=(p['slug'] in explicit_high_risk or 'безопас' in str(p.get('category','')).lower() or any(str(t).lower()=='безопасность еды' for t in (p.get('tags') or [])))
 if high_risk:
  note=re.search(r'<div class="note">(.*?)</div>',article_text,re.S|re.I)
  source_count=len(re.findall(r'<a\s+[^>]*href=',note.group(1),re.I)) if note else 0
  check(source_count>=3,f'{f.name}: high-risk article has {source_count} verifiable source links; need >=3')
for author in authors:
 ap=ROOT/author['url']
 if not ap.exists():continue
 nodes=ld_nodes(ap.read_text('utf-8'))
 profile=next((x for x in nodes if x.get('@type')=='ProfilePage'),None)
 if profile and isinstance(profile.get('mainEntity'),dict):
  expected=SITE+'/'+author['url']+'#person'
  check(profile['mainEntity'].get('@id')==expected,f'{author["url"]}: Person @id')
'''
    text = text.replace('\nprint(json.dumps(', '\n' + block + '\nprint(json.dumps(', 1)
    if not CHECK:
        path.write_text(text, 'utf-8')
    return text


article_texts = {p.stem: patch_article(p) for p in (ROOT / 'articles').glob('*.html')}
author_texts = {p.name: patch_author_page(p) for p in ROOT.glob('author-*.html')}
publisher_text = patch_publisher()
audit_text = patch_audit()

# Targeted validation, independent of the older broad regression script.
errors = []
for slug, sources in SOURCE_MAP.items():
    text = article_texts.get(slug, '')
    note = re.search(r'<div class="note">(.*?)</div>', text, re.S | re.I)
    count = len(re.findall(r'<a\s+[^>]*href=', note.group(1), re.I)) if note else 0
    if count < 3:
        errors.append(f'{slug}: only {count} source links')
    if 'utm_source=chatgpt.com' in text:
        errors.append(f'{slug}: tracking parameter remains')
    if re.search(r'<a[^>]*>\s*<a\b', text, re.I):
        errors.append(f'{slug}: nested anchor remains')

for slug, text in article_texts.items():
    for m in re.finditer(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', text, re.S | re.I):
        try:
            obj = json.loads(m.group(1))
        except Exception:
            continue
        nodes = obj.get('@graph') if isinstance(obj, dict) and isinstance(obj.get('@graph'), list) else [obj]
        for node in nodes:
            if isinstance(node, dict) and node.get('@type') in ('Article', 'NewsArticle', 'BlogPosting'):
                author = node.get('author')
                if isinstance(author, dict) and author.get('url') and author.get('@id') != author['url'].rstrip('#') + '#person':
                    errors.append(f'{slug}: Article author @id mismatch')

for name, text in author_texts.items():
    m = re.search(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', text, re.S | re.I)
    if not m:
        continue
    try:
        obj = json.loads(m.group(1))
    except Exception:
        continue
    if obj.get('@type') == 'ProfilePage' and isinstance(obj.get('mainEntity'), dict):
        expected = SITE + '/' + name + '#person'
        if obj['mainEntity'].get('@id') != expected:
            errors.append(f'{name}: ProfilePage Person @id mismatch')

if "requires at least 3 verifiable sources" not in publisher_text:
    errors.append('publish-scheduled.js: safety source gate missing')
if '# TRUST-SOURCE-AUDIT' not in audit_text:
    errors.append('audit_site.py: trust audit missing')

if errors:
    raise SystemExit('\n'.join(errors))
print(f'Trust audit OK: {len(article_texts)} articles; {len(SOURCE_MAP)} high-risk articles standardized')
