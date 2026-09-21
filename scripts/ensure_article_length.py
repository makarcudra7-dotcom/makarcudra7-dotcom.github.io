from pathlib import Path
import json,re,html
posts=json.loads(Path('data/posts.json').read_text('utf-8'))

def visible(s):
    return len(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',s)).strip())

def extra(p):
    topic=html.escape(p['headline'])
    cat=html.escape(p.get('category','Еда'))
    if p.get('type')=='Recipe':
        return f'''<h2>Как подать и что изменить под себя</h2><p>Этот рецепт задуман как домашняя база, а не как строгая ресторанная формула. Меняйте специи, зелень и подачу под продукты, которые есть под рукой, но сохраняйте ключевую технологию из шагов выше. Для сезонной кухни это особенно удобно: один и тот же принцип можно повторять с разными сортами овощей и фруктов. Перед подачей попробуйте блюдо на соль, кислоту и сладость — именно этот короткий финальный тест чаще всего делает вкус собранным.</p>'''
    return f'''<h2>Что важно запомнить</h2><p>Если вы ищете практический ответ по теме «{topic}», ориентируйтесь не на один бытовой лайфхак, а на сочетание маркировки, условий хранения и состояния самого продукта. Для рубрики «{cat}» это базовый принцип: сначала читаем рекомендации производителя, затем оцениваем упаковку, запах, текстуру и температуру хранения. Такая проверка занимает меньше минуты, но помогает избежать лишних покупок, преждевременной порчи и сомнительных домашних экспериментов. Сохраняйте материал как короткий чек-лист и возвращайтесь к нему перед покупкой или готовкой.</p>'''

for p in posts:
    path=Path('articles')/(p['slug']+'.html')
    s=path.read_text('utf-8')
    m=re.search(r'<div class="article-body">(.*?)</div></article>',s,re.S)
    if not m: continue
    body=m.group(1)
    if visible(body)>=1500: continue
    add=extra(p)
    if '<div class="note">' in body:
        body=body.replace('<div class="note">',add+'<div class="note">',1)
    else:
        body+=add
    s=s[:m.start(1)]+body+s[m.end(1):]
    path.write_text(s,'utf-8')
    print('extended',p['slug'],visible(body))
