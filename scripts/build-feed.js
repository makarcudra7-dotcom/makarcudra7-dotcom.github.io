const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const POSTS=path.join(ROOT,'data','posts.json');
const PUSHES=path.join(ROOT,'data','newsletter-pushes.json');
const OUT=path.join(ROOT,'feed.xml');
const SITE='https://provkus-media.ru';
const {GROUPS, renderGroupFeed} = require('../lib/newsletter');
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const now=Date.now();
const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}};
const articleExists=p=>!!p?.slug&&fs.existsSync(path.join(ROOT,'articles',`${p.slug}.html`));
let posts=read(POSTS,[]);
posts=posts.filter(p=>{
  if(!p||!p.slug||!p.headline||!articleExists(p))return false;
  const t=new Date(p.publishedAt||0).getTime();
  return !Number.isFinite(t)||t<=now+15000;
}).sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0)).slice(0,50);
const bySlug=new Map(posts.map(p=>[p.slug,p]));
const itemXml=(p,{manualId='',manualAt=''}={})=>{
  const base=p.url||`${SITE}/articles/${p.slug}.html`;
  const url=manualId?`${base}${base.includes('?')?'&':'?'}utm_source=followit&utm_medium=email&utm_campaign=${encodeURIComponent('manual_'+manualId)}`:base;
  const date=new Date(manualAt||p.publishedAt||Date.now());
  const pub=Number.isNaN(date.getTime())?new Date().toUTCString():date.toUTCString();
  const image=p.image||p.images?.[0]||'';
  return `  <item>\n    <title>${esc(p.headline)}</title>\n    <link>${esc(url)}</link>\n    <guid isPermaLink="true">${esc(url)}</guid>\n    <pubDate>${esc(pub)}</pubDate>\n    <description>${esc(p.description||'')}</description>\n    <dc:creator>${esc(p.author||'Редакция ProVkus')}</dc:creator>${p.category?`\n    <category>${esc(p.category)}</category>`:''}${manualId?'\n    <category>Ручная рассылка</category>':''}${image?`\n    <media:content url="${esc(image)}" medium="image"/>`:''}\n  </item>`;
};
const pushes=read(PUSHES,[]).filter(x=>x&&x.slug&&x.id&&!x.group&&new Date(x.sentAt||0).getTime()>now-72*60*60*1000).sort((a,b)=>new Date(b.sentAt)-new Date(a.sentAt));
const manualItems=pushes.map(x=>{const p=bySlug.get(x.slug);return p?itemXml(p,{manualId:x.id,manualAt:x.sentAt}):''}).filter(Boolean);
const regularItems=posts.map(p=>itemXml(p));
const items=[...manualItems,...regularItems].join('\n');
const latest=Math.max(0,...posts.map(p=>new Date(p.updatedAt||p.publishedAt||0).getTime()||0),...pushes.map(p=>new Date(p.sentAt||0).getTime()||0));
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">\n<channel>\n  <title>ProVkus — новые материалы</title>\n  <link>${SITE}/</link>\n  <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>\n  <description>Новые материалы ProVkus о еде, продуктах, хранении, доме и безопасности.</description>\n  <language>ru</language>\n  <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>\n  <image><url>${SITE}/favicon.png</url><title>ProVkus</title><link>${SITE}/</link></image>\n${items}\n</channel>\n</rss>\n`;
fs.writeFileSync(OUT,xml,'utf8');
for (const group of GROUPS) {
  fs.writeFileSync(path.join(ROOT,`newsletter-${group}.xml`),renderGroupFeed(group,read(POSTS,[]),read(PUSHES,[])), 'utf8');
}
console.log(`feed.xml: ${posts.length} published items, ${manualItems.length} manual pushes`);
