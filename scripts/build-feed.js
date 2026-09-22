const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const POSTS=path.join(ROOT,'data','posts.json');
const OUT=path.join(ROOT,'feed.xml');
const SITE='https://provkus-media.ru';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const now=Date.now();
let posts=[];
try{posts=JSON.parse(fs.readFileSync(POSTS,'utf8'))}catch(e){console.error('Cannot read posts.json',e);process.exit(1)}
posts=posts.filter(p=>p&&p.slug&&p.headline&&(!Number.isFinite(new Date(p.publishedAt||0).getTime())||new Date(p.publishedAt||0).getTime()<=now+15000)).sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0)).slice(0,50);
const items=posts.map(p=>{
  const url=p.url||`${SITE}/articles/${p.slug}.html`;
  const date=new Date(p.publishedAt||Date.now());
  const pub=Number.isNaN(date.getTime())?new Date().toUTCString():date.toUTCString();
  const image=p.image||p.images?.[0]||'';
  return `  <item>\n    <title>${esc(p.headline)}</title>\n    <link>${esc(url)}</link>\n    <guid isPermaLink="true">${esc(url)}</guid>\n    <pubDate>${esc(pub)}</pubDate>\n    <description>${esc(p.description||'')}</description>\n    <dc:creator>${esc(p.author||'Редакция ProVkus')}</dc:creator>${p.category?`\n    <category>${esc(p.category)}</category>`:''}${image?`\n    <media:content url="${esc(image)}" medium="image"/>`:''}\n  </item>`
}).join('\n');
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">\n<channel>\n  <title>ProVkus — новые материалы</title>\n  <link>${SITE}/</link>\n  <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>\n  <description>Новые материалы ProVkus о еде, продуктах, хранении, доме и безопасности.</description>\n  <language>ru</language>\n  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n  <image><url>${SITE}/favicon.png</url><title>ProVkus</title><link>${SITE}/</link></image>\n${items}\n</channel>\n</rss>\n`;
fs.writeFileSync(OUT,xml,'utf8');
console.log(`feed.xml: ${posts.length} published items`);
