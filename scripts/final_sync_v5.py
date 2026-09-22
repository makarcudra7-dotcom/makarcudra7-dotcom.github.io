from pathlib import Path
import json,re,shutil

ROOT=Path('.')
POSTS=ROOT/'data/posts.json'
PHOTO_SOURCE='provkus-media.ru'
HEADLINES={
'chay-v-paketikah-pravda-o-pyli':'Чай в пакетиках больше не беру наугад: одна деталь на упаковке многое говорит о том, что внутри',
'chto-ne-hranit-na-dverce-holodilnika':'Убрала эти продукты с дверцы холодильника: теперь не портятся раньше срока — куда их переставить',
'extra-virgin-kak-vybrat-olivkovoe-maslo':'Extra Virgin на этикетке ещё не гарантия: проверяю 5 строк на бутылке перед покупкой',
'gribnoi-pirog-obabnik':'Грибной пирог без возни с тестом: смешала начинку, отправила в духовку — корочка хрустит, внутри сочно',
'kak-bezopasno-razmorazhivat-myaso':'Так мясо размораживать нельзя: привычка на кухне может испортить продукт ещё до сковороды',
'kak-hranit-kartofel-doma':'Картошка не прорастает неделями: убрала из пакета и держу в одном месте — клубни остаются крепкими',
'kak-hranit-rastitelnoe-maslo-posle-vskrytiya':'Масло возле плиты больше не держу: переставила бутылку — вкус дольше не становится горьким',
'kak-pravilno-hranit-yayca-v-holodilnike':'Яйца давно не ставлю в дверцу холодильника: переставила на одну полку — так температура стабильнее',
'kak-vybrat-kofe-po-date-obzharki':'На пачке кофе ищу не срок годности: одна дата сразу подсказывает, будут ли зёрна ароматными',
'kak-vybrat-sladkie-mandariny':'Сладкие мандарины узнаю ещё у прилавка: смотрю на 4 признака — кислые почти не попадаются',
'kak-vybrat-syr-s-plesenyu':'Сыр с плесенью выбираю по трём признакам: когда белый налёт — норма, а когда лучше вернуть на полку',
'kartoshka-s-gribami-gorchichnyi-sous':'Картошка с грибами получается будто из печи: одна ложка в соус — и сковорода пустеет за ужином',
'kuritsa-s-yablokami-gorchitsa-med':'Курица с яблоками получается сочнее обычной: горчица и мёд превращают сок в густой соус',
'mozhno-li-zamorazhivat-hleb':'Хлеб неделями остаётся нормальным: перестала держать его в пакете — вот куда убираю',
'nuzhno-li-myt-yayca-posle-magazina':'Яйца после магазина больше не мою: одна привычка сокращала срок хранения — делаю иначе',
'skolko-hranit-plavlenyi-syr-posle-vskrytiya':'Открытый плавленый сыр не хранится вечность: по этим признакам понятно, что пора выбрасывать',
'slivovyi-ketchup-dymok':'Сливы не отправляю в варенье: варю густой соус к мясу — зимой банки исчезают первыми',
'teplyi-salat-grusha-syr-orehi':'Груша, сыр и горсть орехов: салат за 10 минут, который гости съедают раньше горячего',
'tykvennyi-krem-sup-s-yablokom':'Тыкву теперь готовлю только так: добавляю одно яблоко — суп получается нежным и совсем не приторным',
'udon-s-tykvoi-i-gribami':'Когда за окном холодно, готовлю эту лапшу: тыква и грибы — ужин за 25 минут без возни',
'vinegret-s-zharenoi-tykvoi':'Винегрет готовлю не как все: добавляю жареную тыкву — вкус становится совсем другим',
'yabloki-s-indeikoi-i-timyanom':'Яблоки больше не отправляю только в шарлотку: запекаю с индейкой — домашние просят готовить ещё',
'zachem-myt-banany-i-mandariny':'Даже бананы мою перед едой: зачем это делать, если кожуру всё равно выбрасываем',
'zamorozhennye-ovoshi-ne-pustye':'Замороженные овощи зря считают «пустыми»: готовлю их без разморозки — и не получаю кашу',
}

def replace_jsonld(text,post):
    pat=r'<script type="application/ld\+json">(.*?)</script>'
    def repl(m):
        try:o=json.loads(m.group(1))
        except Exception:return m.group(0)
        if o.get('@type') in ('Article','NewsArticle','Recipe','BlogPosting'):
            o['headline']=post['headline']
            if o.get('@type')=='Recipe':o['name']=post['headline']
            o['image']=post['images']
            o['thumbnailUrl']=post['image']
        return '<script type="application/ld+json">'+json.dumps(o,ensure_ascii=False,separators=(',',':'))+'</script>'
    return re.sub(pat,repl,text,flags=re.S)

posts=json.loads(POSTS.read_text('utf-8'))
old={p['slug']:(p.get('headline',''),p.get('image','')) for p in posts}
for p in posts:
    slug=p['slug']
    p['headline']=HEADLINES.get(slug,p['headline'])
    base=f'https://provkus-media.ru/assets/covers/{slug}'
    p['image']=base+'-16x9.jpg'
    p['images']=[base+'-16x9.jpg',base+'-4x3.jpg',base+'-1x1.jpg']
    p['photoSource']=PHOTO_SOURCE
    for url in p['images']:
        rel=url.replace('https://provkus-media.ru/','')
        if not (ROOT/rel).exists():raise SystemExit('missing cover '+rel)
POSTS.write_text(json.dumps(posts,ensure_ascii=False,indent=2),'utf-8')

# Change all visible cards/feed HTML without altering layout.
html_files=[ROOT/'index.html',ROOT/'category.html',ROOT/'authors.html']+list(ROOT.glob('author-*.html'))
for f in html_files:
    if not f.exists():continue
    s=f.read_text('utf-8')
    for p in posts:
        old_h,old_img=old[p['slug']]
        s=s.replace(old_h,p['headline'])
        if old_img:s=s.replace(old_img,p['image'])
        s=s.replace(f'https://provkus-media.ru/assets/covers-v4/{p["slug"]}.webp',p['image'])
    s=s.replace('/assets/authors/elvira.jpg','/assets/authors/elvira-v2.jpg')
    f.write_text(s,'utf-8')

# Update article metadata, H1, cover, structured data and visible photo credit.
for p in posts:
    f=ROOT/'articles'/(p['slug']+'.html')
    if not f.exists():continue
    s=f.read_text('utf-8')
    old_h,old_img=old[p['slug']]
    s=s.replace(old_h,p['headline'])
    if old_img:s=s.replace(old_img,p['image'])
    s=s.replace(f'https://provkus-media.ru/assets/covers-v4/{p["slug"]}.webp',p['image'])
    s=re.sub(r'(<meta property="og:image" content=")[^"]+("\s*/?>)',rf'\1{p["image"]}\2',s,count=1)
    s=re.sub(r'(<meta name="twitter:image" content=")[^"]+("\s*/?>)',rf'\1{p["image"]}\2',s,count=1)
    s=re.sub(r'(<img[^>]*class="article-cover"[^>]*src=")[^"]+("[^>]*>)',rf'\1{p["image"]}\2',s,count=1)
    s=re.sub(r'(<img[^>]*src=")[^"]+("[^>]*class="article-cover"[^>]*>)',rf'\1{p["image"]}\2',s,count=1)
    credit=f'<div class="photo-credit">Фото: {PHOTO_SOURCE}</div>'
    if 'class="photo-credit"' in s:s=re.sub(r'<div class="photo-credit">.*?</div>',credit,s,count=1,flags=re.S)
    else:
        m=re.search(r'<img[^>]*class="article-cover"[^>]*>',s)
        if m:s=s[:m.end()]+credit+s[m.end():]
    if p.get('author')=='Эльвира Шайберт':s=s.replace('/assets/authors/elvira.jpg','/assets/authors/elvira-v2.jpg').replace('../assets/authors/elvira.jpg','../assets/authors/elvira-v2.jpg')
    s=replace_jsonld(s,p)
    f.write_text(s,'utf-8')

# New author-photo URL breaks stale caches; source JPEG is valid.
src=ROOT/'assets/authors/elvira.jpg'; dst=ROOT/'assets/authors/elvira-v2.jpg'
if src.exists():shutil.copy2(src,dst)
for f in [ROOT/'assets/admin.js',ROOT/'assets/admin-enhance.js']:
    if f.exists():
        s=f.read_text('utf-8').replace('assets/authors/elvira.jpg','assets/authors/elvira-v2.jpg')
        f.write_text(s,'utf-8')
print('synced',len(posts),'posts; unique covers',len({p['image'] for p in posts}))
