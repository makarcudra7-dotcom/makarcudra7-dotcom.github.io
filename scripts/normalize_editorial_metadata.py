#!/usr/bin/env python3
"""Align article titles and concise search leads with editorial metadata."""
import html, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
QUEUED={
 'kapustnye-oladi-na-skovorode':'оладьи из капусты с яйцом на сковороде',
 'ris-na-zavtra-kak-ostudit-hranit-razogret':'можно ли есть вчерашний рис из холодильника',
 'tykva-dolkami-i-kubikami-v-duhovke':'как запечь тыкву дольками с румяной корочкой',
 'kak-hranit-osennie-yabloki':'как хранить яблоки чтобы они оставались хрустящими',
 'kuritsa-s-tykvoi-na-protivne':'курица с тыквой в духовке на противне',
 'tomatnoe-ragu-s-fasolyu':'рагу из консервированной фасоли с томатами и хариссой',
 'yablochnyi-krambl-s-ovsyanoi-kroshkoi':'яблочный крамбл с овсяной крошкой рецепт',
 'pozelenel-proros-kartofel':'можно ли есть позеленевший или проросший картофель',
 'kapusta-dlya-kvasheniya-kak-vybrat':'как выбрать капусту для квашения',
}
def lead_for(slug,old_title,description,current_lead=''):
    if slug in QUEUED:return QUEUED[slug]
    if current_lead and len(current_lead)<=90 and current_lead[0].islower() and not re.search(r'[.!?]$',current_lead):return current_lead
    title=html.unescape(old_title).replace(' — ProVkus','').strip()
    if len(title)>90 or re.search(r'\b(?:я|мой|моя|готовлю|варю|нашла|думала)\b',title,re.I):
        title=description.split('.')[0].split(';')[0].strip()
    title=re.sub(r'\s*[—–:]\s*(?:домашний |простой |быстрый )?рецепт(?:\b.*)?$',' рецепт',title,flags=re.I)
    title=re.sub(r'\s+',' ',title).strip(' .!?—–:«»')
    if len(title)>90:title=title[:90].rsplit(' ',1)[0]
    return title[:1].lower()+title[1:]
def sub_first(pattern,repl,text):
    return re.sub(pattern,lambda _:repl,text,count=1,flags=re.I|re.S)
posts=json.loads((ROOT/'data/posts.json').read_text())
for p in posts:
    path=ROOT/'articles'/f"{p['slug']}.html"
    if not path.exists():continue
    s=path.read_text(); m=re.search(r'<title>(.*?)</title>',s,re.S)
    if not m:continue
    dek=re.search(r'<p class="article-dek">(.*?)</p>',s,re.S)
    existing=html.unescape(dek.group(1)) if dek else ''
    lead=lead_for(p['slug'],m.group(1),p.get('description',''),existing)
    s=sub_first(r'<title>.*?</title>','<title>'+html.escape(p['headline'])+'</title>',s)
    s=sub_first(r'(<p class="article-dek">).*?(</p>)','<p class="article-dek">'+html.escape(lead)+'</p>',s)
    path.write_text(s)
queue_path=ROOT/'.github/scheduled-posts.json'
queue=json.loads(queue_path.read_text())
for item in queue:
    o=item['material'];slug=item['slug'];o['lead']=lead_for(slug,o.get('seoTitle') or o['headline'],o.get('description',''))
    if slug=='tykva-dolkami-i-kubikami-v-duhovke':
        o['headline']=o['headline'].replace('а я и рада','а я и рад')
    if slug=='tomatnoe-ragu-s-fasolyu':
        o['headline']=o['headline'].replace('Думала,','Думал,')
    o['seoTitle']=o['headline'];item['post']['headline']=o['headline']
queue_path.write_text(json.dumps(queue,ensure_ascii=False,indent=2)+'\n')
print(f'Updated {len(posts)} published articles and {len(queue)} scheduled materials')
