"""Maintain Recipe structured data from visible ingredients and steps.

Recipe pages are upgraded only when the article visibly contains both an
ingredient list and ordered preparation steps. The same data is persisted to
``data/posts.json`` so the CMS quality audit and CI validate one standard.
Titles, dates and visible article copy are not rewritten.
"""

import html
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=re.compile(r'(<script\b[^>]*\btype="application/ld\+json"[^>]*>)(.*?)(</script>)',re.S|re.I)
BODY=re.compile(r'<div class="article-body">(.*?)(?:</article>|<script)',re.S)
HEADING=re.compile(r'<h[23][^>]*>(.*?)</h[23]>',re.S|re.I)
LIST=re.compile(r'<(ul|ol)[^>]*>(.*?)</\1>',re.S|re.I)
ITEM=re.compile(r'<li(?:\s[^>]*)?>(.*?)</li>',re.S|re.I)


def clean(value):
    value=re.sub(r'<[^>]+>',' ',value)
    return re.sub(r'\s+',' ',html.unescape(value)).strip()


def visible_recipe(source):
    match=BODY.search(source)
    if not match:return None
    body=match.group(1);ingredients=steps=None
    for section in LIST.finditer(body):
        headings=HEADING.findall(body[:section.start()])
        label=clean(headings[-1]) if headings else ''
        section_tag=section.group(0).split('>',1)[0]
        items=[clean(item) for item in ITEM.findall(section.group(2))]
        items=[item for item in items if item]
        if ('recipe-ingredients' in section_tag or re.search(r'ингредиент|понадоб|продукт|состав|порци',label,re.I)) and len(items)>=2:
            ingredients=items
        if ('recipe-steps' in section_tag or re.search(r'как |приготов|порядок|шаг|способ|готовим|делаем|сборк',label,re.I)) and len(items)>=2:
            steps=items
    return (ingredients,steps) if ingredients and steps else None


def update_schema(path,recipe):
    source=path.read_text(encoding='utf-8')
    for match in SCRIPT.finditer(source):
        try:schema=json.loads(match.group(2))
        except json.JSONDecodeError:continue
        if not isinstance(schema,dict):continue
        nodes=schema.get('@graph') if isinstance(schema.get('@graph'),list) else [schema]
        article=next((node for node in nodes if isinstance(node,dict) and node.get('@type') in ('Article','NewsArticle','BlogPosting','Recipe')),None)
        if not article:continue
        if not article.get('image') or not (article.get('headline') or article.get('name')):return False
        before=json.dumps(schema,ensure_ascii=False,sort_keys=True)
        article['@type']='Recipe'
        article['name']=article.get('headline') or article.get('name')
        article['recipeIngredient']=recipe[0]
        article['recipeInstructions']=[{'@type':'HowToStep','position':i,'text':step} for i,step in enumerate(recipe[1],1)]
        after=json.dumps(schema,ensure_ascii=False,sort_keys=True)
        if before==after:return False
        rendered=json.dumps(schema,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
        changed=source[:match.start(2)]+rendered+source[match.end(2):]
        path.write_text(changed,encoding='utf-8')
        return True
    return False


def is_recipe(post):
    raw=str(post.get('type') or '').strip().casefold()
    return raw in {'recipe','рецепт'} or 'рецепт' in str(post.get('typeLabel') or '').casefold()


def main():
    posts_path=ROOT/'data/posts.json'
    posts=json.loads(posts_path.read_text(encoding='utf-8'))
    schema_changed=metadata_changed=missing=0
    for post in posts:
        if not is_recipe(post):continue
        path=ROOT/'articles'/(post['slug']+'.html')
        if not path.exists():
            # Scheduled records may exist before their final HTML is committed.
            continue
        source=path.read_text(encoding='utf-8')
        recipe=visible_recipe(source)
        if not recipe:
            missing+=1
            continue
        if update_schema(path,recipe):schema_changed+=1
        ingredients,steps=recipe
        if post.get('recipeIngredient')!=ingredients or post.get('recipeInstructions')!=steps:
            post['recipeIngredient']=ingredients
            post['recipeInstructions']=steps
            metadata_changed+=1
    if metadata_changed:
        posts_path.write_text(json.dumps(posts,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Recipe standard: schema updated {schema_changed}, metadata updated {metadata_changed}, missing visible structure {missing}')

if __name__=='__main__':main()
