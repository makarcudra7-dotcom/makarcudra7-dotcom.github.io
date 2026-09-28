"""Keep ProVkus taxonomy small and route news by material type.

Public titles are intentionally not changed.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
POSTS=ROOT/'data'/'posts.json'
ALLOWED_CATEGORIES={'Продукты','Хранение','Безопасность еды','Рецепты'}
TYPE_LABELS={'Article':'Статья','Recipe':'Рецепт','NewsArticle':'Новость'}


def text_blob(post):
    return ' '.join([
        str(post.get('headline') or ''),str(post.get('description') or ''),
        str(post.get('category') or ''),str(post.get('typeLabel') or ''),
        ' '.join(str(x) for x in (post.get('tags') or []))
    ]).casefold()


def normalize_type(post):
    raw=str(post.get('type') or '').strip().casefold()
    blob=text_blob(post)
    if raw in {'recipe','рецепт'} or 'рецепт' in str(post.get('typeLabel') or '').casefold():
        return 'Recipe'
    if raw in {'newsarticle','news','новость','новости'}:
        return 'NewsArticle'
    if str(post.get('category') or '').strip().casefold().startswith('новост'):
        return 'NewsArticle'
    if any(str(x).strip().casefold().startswith('новост') for x in (post.get('tags') or [])):
        return 'NewsArticle'
    if 'новост' in str(post.get('typeLabel') or '').casefold():
        return 'NewsArticle'
    return 'Article'


def normalize_category(post,ptype):
    raw=str(post.get('category') or '').strip()
    low=raw.casefold()
    blob=text_blob(post)
    if ptype=='Recipe' or 'рецеп' in low:
        return 'Рецепты'
    if 'безопас' in low or any(k in blob for k in ('ботулиз','отравлен','опасн','плесен','разморажив')):
        return 'Безопасность еды'
    if any(k in low for k in ('хран','дом')) or any(k in blob for k in ('холодильник','морозил','хранени')):
        return 'Хранение'
    if 'продукт' in low or 'выбор' in low:
        return 'Продукты'
    # Legacy topical categories (including old «Новости») collapse into the
    # broad product/food rubric. More specific subjects remain available as tags.
    return 'Продукты'


def normalize_posts():
    posts=json.loads(POSTS.read_text('utf-8'))
    changed=0
    for post in posts:
        ptype=normalize_type(post)
        category=normalize_category(post,ptype)
        before=(post.get('type'),post.get('typeLabel'),post.get('category'))
        post['type']=ptype
        post['typeLabel']=TYPE_LABELS[ptype]
        post['category']=category
        if before!=(post['type'],post['typeLabel'],post['category']):
            changed+=1
    if changed:
        POSTS.write_text(json.dumps(posts,ensure_ascii=False,indent=2)+'\n','utf-8')
    return changed


def patch_build_indexes():
    path=ROOT/'scripts'/'build_indexes.py'
    source=path.read_text('utf-8')
    old="""def news_post(p):\n  return str(p.get('category') or '').strip().casefold().startswith('новост')\n"""
    new="""def news_post(p):\n  # Material type is the primary news signal. Category/tag checks preserve\n  # compatibility with legacy publications created before taxonomy cleanup.\n  ptype=str(p.get('type') or '').strip().casefold()\n  if ptype in {'newsarticle','news','новость','новости'}:return True\n  if str(p.get('typeLabel') or '').strip().casefold().startswith('новост'):return True\n  if str(p.get('category') or '').strip().casefold().startswith('новост'):return True\n  return any(str(tag).strip().casefold().startswith('новост') for tag in (p.get('tags') or []))\n"""
    if old in source:
        source=source.replace(old,new,1)
    elif new not in source:
        raise RuntimeError('news_post implementation not recognised')
    source=source.replace('<div class="section-sub">Материалы рубрики «Новости»</div>',
                          '<div class="section-sub">Материалы типа «Новость»</div>')
    source=source.replace('<p class="section-sub">Все материалы рубрики «Новости» по дате публикации.</p>',
                          '<p class="section-sub">Все материалы типа «Новость» по дате публикации.</p>')
    source=source.replace("cards=''.join(map(card,selected)) or '<p class=\"section-sub\">В рубрике пока нет публикаций.</p>'",
                          "cards=''.join(map(card,selected)) or '<p class=\"section-sub\">Новостей пока нет.</p>'")
    old_text=path.read_text('utf-8')
    if source!=old_text:
        path.write_text(source,'utf-8')
        return 1
    return 0


def patch_admin():
    path=ROOT/'admin.html'
    source=path.read_text('utf-8')
    old_categories='<select id="category"><option>Продукты</option><option>Дом</option><option>Безопасность еды</option><option>Рецепты</option><option>Новости</option></select>'
    new_categories='<select id="category"><option>Продукты</option><option>Хранение</option><option>Безопасность еды</option><option>Рецепты</option></select>'
    source=source.replace(old_categories,new_categories)
    old_types='<select id="type"><option>Article</option><option>NewsArticle</option><option>Recipe</option></select>'
    new_types='<select id="type"><option value="Article">Статья</option><option value="Recipe">Рецепт</option><option value="NewsArticle">Новость</option></select>'
    source=source.replace(old_types,new_types)
    source=source.replace('placeholder="Добавьте проверяемые источники; для безопасности еды — минимум 3"',
                          'placeholder="Для рекомендаций по безопасности — минимум 1 релевантный надёжный источник"')
    script='<script src="assets/admin-taxonomy-standard.js?v=20260929-taxonomy1"></script>'
    if script not in source:
        source=source.replace('</body>',script+'</body>',1)
    old_text=path.read_text('utf-8')
    if source!=old_text:
        path.write_text(source,'utf-8')
        return 1
    return 0


def main():
    result={
        'posts_normalized':normalize_posts(),
        'build_indexes_patched':patch_build_indexes(),
        'admin_patched':patch_admin(),
    }
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':
    main()
