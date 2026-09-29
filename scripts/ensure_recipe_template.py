#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
POSTS=ROOT/'data'/'posts.json'
VERSION='20260929-recipe-auto1'
STYLE=f'<link rel="stylesheet" href="/assets/provkus-tools.css?v={VERSION}">'
SCRIPT=f'<script src="/assets/provkus-tools-v2.js?v={VERSION}"></script>'
META='<meta name="pv-content-type" content="Recipe">'
MARKER='<span class="pv-recipe-marker" hidden> Рецепт</span>'


def is_recipe(post):
    return str(post.get('type','')).lower()=='recipe' or str(post.get('category','')).strip().lower()=='рецепты'


def patch(doc):
    doc=re.sub(r'<link rel="stylesheet" href="/assets/provkus-tools\.css[^>]*>','',doc)
    doc=re.sub(r'<script src="/assets/provkus-tools(?:-v2)?\.js[^>]*></script>','',doc)
    doc=re.sub(r'<meta name="pv-content-type" content="Recipe">','',doc)
    doc=doc.replace('</head>',META+STYLE+'</head>',1)
    if 'pv-recipe-marker' not in doc:
        doc,count=re.subn(r'(<div class="article-kicker"[^>]*>)(.*?)(</div>)',lambda m:m.group(1)+m.group(2)+MARKER+m.group(3),doc,count=1,flags=re.I|re.S)
        if not count:
            doc=doc.replace('<body>','<body>'+MARKER,1)
    doc=doc.replace('</body>',SCRIPT+'</body>',1)
    return doc


def main():
    posts=json.loads(POSTS.read_text(encoding='utf-8'))
    changed=0; total=0; missing=[]
    for post in posts:
        if not is_recipe(post):
            continue
        slug=post.get('slug')
        if not slug:
            continue
        path=ROOT/'articles'/f'{slug}.html'
        if not path.exists():
            missing.append(slug);continue
        total+=1
        old=path.read_text(encoding='utf-8')
        new=patch(old)
        if new!=old:
            path.write_text(new,encoding='utf-8');changed+=1
    print(f'Recipe templates: {total} checked, {changed} changed')
    if missing:
        print('Missing recipe files:', ', '.join(missing[:20]))

if __name__=='__main__':
    main()
