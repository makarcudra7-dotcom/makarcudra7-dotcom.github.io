"""Validate the simplified taxonomy and future publication standards."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from scripts import add_recipe_schema

ROOT=Path(__file__).resolve().parents[1]
EFFECTIVE=datetime(2026,9,29,tzinfo=timezone.utc)
ALLOWED_CATEGORIES={'Продукты','Хранение','Безопасность еды','Рецепты'}
ALLOWED_TYPES={'Article','Recipe','NewsArticle'}


def parse_dt(value):
    if not value:return None
    try:return datetime.fromisoformat(str(value).replace('Z','+00:00')).astimezone(timezone.utc)
    except Exception:return None


def public_now(post,now):
    dt=parse_dt(post.get('publishedAt'))
    if dt and dt>now:return False
    return (ROOT/'articles'/f"{post.get('slug','')}.html").exists()


def main():
    posts=json.loads((ROOT/'data/posts.json').read_text('utf-8'))
    now=datetime.now(timezone.utc)
    errors=[];future_recipes=0;public_news=0
    news_html=(ROOT/'news.html').read_text('utf-8') if (ROOT/'news.html').exists() else ''
    for post in posts:
        slug=str(post.get('slug') or '')
        ptype=post.get('type')
        category=post.get('category')
        if ptype not in ALLOWED_TYPES:errors.append(f'type:{slug}:{ptype}')
        if category not in ALLOWED_CATEGORIES:errors.append(f'category:{slug}:{category}')
        if not public_now(post,now):continue
        article=ROOT/'articles'/f'{slug}.html'
        if ptype=='NewsArticle':
            public_news+=1
            if f'/articles/{slug}.html' not in news_html:
                errors.append(f'news-missing:{slug}')
        published=parse_dt(post.get('publishedAt'))
        if ptype=='Recipe' and published and published>=EFFECTIVE:
            future_recipes+=1
            source=article.read_text('utf-8')
            recipe=add_recipe_schema.visible_recipe(source)
            if not recipe:
                errors.append(f'recipe-structure:{slug}')
            if '"@type":"Recipe"' not in source and '"@type": "Recipe"' not in source:
                errors.append(f'recipe-schema:{slug}')
            if not post.get('recipeIngredient') or not post.get('recipeInstructions'):
                errors.append(f'recipe-metadata:{slug}')
    if errors:
        raise SystemExit('\n'.join(errors))
    print(f'validated taxonomy; future recipes={future_recipes}; public news={public_news}')

if __name__=='__main__':main()
