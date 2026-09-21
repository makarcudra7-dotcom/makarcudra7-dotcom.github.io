from pathlib import Path

# Admin HTML: manual photo source field + button.
f=Path('admin.html'); s=f.read_text('utf-8')
needle='<div class="field"><label>Alt</label><input id="imageAlt"></div>'
insert=needle+'<div class="field"><label>Источник фото</label><div class="token-row"><input id="photoSource" placeholder="Введите вручную, например: provkus-media.ru"><button type="button" class="btn soft" id="photoSourceBtn">Источник фото</button></div><div class="hint">Заполняется вручную для каждой публикации. Автоматически не подставляется.</div></div>'
if 'id="photoSource"' not in s: s=s.replace(needle,insert)
f.write_text(s,'utf-8')

# Base admin: always use actual jpg portraits and collect photoSource.
f=Path('assets/admin.js'); s=f.read_text('utf-8')
s=s.replace("photo:'assets/authors/ilya.svg'","photo:'assets/authors/ilya.jpg'")
s=s.replace("photo:'assets/authors/elvira.svg'","photo:'assets/authors/elvira.jpg'")
s=s.replace("photo:'assets/authors/ekaterina.svg'","photo:'assets/authors/ekaterina.jpg'")
s=s.replace("'source','tags','image','imageAlt'","'source','tags','image','imageAlt','photoSource'")
f.write_text(s,'utf-8')

# V3 CMS: keep new materials blank, render source under cover, persist into data/posts.
f=Path('assets/admin-v3.js'); s=f.read_text('utf-8')
s=s.replace("'canonical','ogImage','source','tags','image','imageAlt'","'canonical','ogImage','source','tags','image','imageAlt','photoSource'")
old='<img class="article-cover" src="${esc(img)}" width="1600" height="900" fetchpriority="high" alt="${esc(o.imageAlt)}"><div class="article-body">'
new='<img class="article-cover" src="${esc(img)}" width="1600" height="900" fetchpriority="high" alt="${esc(o.imageAlt)}">${o.photoSource?`<div class="photo-credit">Фото: ${sourceMarkup(o.photoSource)}</div>`:\'\'}<div class="article-body">'
s=s.replace(old,new)
s=s.replace("tags:(o.tags||'').split(',').map(x=>x.trim()).filter(Boolean)};","tags:(o.tags||'').split(',').map(x=>x.trim()).filter(Boolean),photoSource:o.photoSource||''};")
marker="setupSelectors();addTopButtons();"
handler="setupSelectors();addTopButtons();\n  const ps=$('#photoSource'),psb=$('#photoSourceBtn');if(psb&&ps){psb.onclick=()=>{const v=prompt('Источник фото — введите вручную',ps.value||'');if(v!==null)ps.value=v.trim()}}"
s=s.replace(marker,handler)
f.write_text(s,'utf-8')

# Cohesive cards / author portraits / photo credit.
f=Path('assets/overrides.css'); s=f.read_text('utf-8')
css='''\n/* ProVkus v4 visual polish */\n.story-card{background:#fff;border:1px solid rgba(24,23,20,.09);border-radius:16px;overflow:hidden;box-shadow:0 5px 20px rgba(30,24,18,.05);transition:transform .18s ease,box-shadow .18s ease}.story-card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(30,24,18,.10)}.story-card>img,.feed-card>img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.story-body{padding:16px 16px 17px}.story-body h3{margin:8px 0 12px;line-height:1.22;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.story-meta,.card-pubdate{font-size:12px;color:var(--muted);display:flex;gap:7px;align-items:center;flex-wrap:wrap}.badge{display:inline-flex;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.author-card img,.author-photo,.article-author .avatar,#authorPhoto{object-fit:cover;object-position:center;width:100%;aspect-ratio:1/1}.article-author .avatar,#authorPhoto{width:46px;height:46px;border-radius:50%}.photo-credit{margin:-9px 0 23px;color:var(--muted);font-size:12px;line-height:1.4}.photo-credit a{color:inherit;text-decoration:underline}.category-title{font-size:clamp(38px,6vw,54px)}@media(max-width:760px){.story-grid{grid-template-columns:1fr 1fr;gap:12px}.story-body{padding:13px}.story-body h3{font-size:18px}.author-hero{grid-template-columns:1fr}.author-photo{max-width:240px}}@media(max-width:520px){.story-grid{grid-template-columns:1fr}.story-body h3{font-size:20px}.lead-copy h1{font-size:34px;line-height:1.05}.photo-credit{margin-top:-8px}}\n'''
if 'ProVkus v4 visual polish' not in s: s+=css
f.write_text(s,'utf-8')
print('CMS photo-source and visual polish applied')
