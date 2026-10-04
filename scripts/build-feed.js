const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const POSTS=path.join(ROOT,'data','posts.json');
const PUSHES=path.join(ROOT,'data','newsletter-pushes.json');
const OUT=path.join(ROOT,'feed.xml');
const SITE='https://provkus-media.ru';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const cdata=v=>String(v??'').replace(/]]>/g,']]]]><![CDATA[>');
const now=Date.now();
const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}};
const articlePath=p=>path.join(ROOT,'articles',`${p.slug}.html`);
const articleExists=p=>!!p?.slug&&fs.existsSync(articlePath(p));
const mimeByExt={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif'};

function extractArticleBody(p){
  try{
    const html=fs.readFileSync(articlePath(p),'utf8');
    const marker='<div class="article-body">';
    const start=html.indexOf(marker);
    if(start<0)return '';
    const bodyStart=start+marker.length;
    const re=/<\/?div\b[^>]*>/gi;
    re.lastIndex=bodyStart;
    let depth=1,m;
    while((m=re.exec(html))){
      if(/^<\/div/i.test(m[0]))depth--; else depth++;
      if(depth===0){
        let body=html.slice(bodyStart,m.index);
        body=body
          .replace(/<script\b[\s\S]*?<\/script>/gi,'')
          .replace(/<style\b[\s\S]*?<\/style>/gi,'')
          .replace(/<img\b[^>]*src=["']data:image\/[^"']+["'][^>]*>/gi,'')
          .replace(/\s(?:class|id|style|data-[\w-]+|aria-[\w-]+)=("[^"]*"|'[^']*')/gi,'')
          .replace(/<\/?div\b[^>]*>/gi,'');
        body=body.replace(/\b(href|src)=("([^"]*)"|'([^']*)')/gi,(all,attr,_q,dq,sq)=>{
          const value=dq??sq??'';
          if(!value||/^(?:https?:|mailto:|tel:|data:|#)/i.test(value))return all;
          try{return `${attr}="${new URL(value,`${SITE}/articles/${p.slug}.html`).href}"`}catch{return all}
        });
        return body.trim();
      }
    }
  }catch{}
  return '';
}

function imageMeta(image){
  if(!image)return null;
  try{
    const u=new URL(image,SITE);
    const ext=path.extname(u.pathname).toLowerCase();
    const type=mimeByExt[ext];
    if(!type)return null;
    let length=0;
    if(u.origin===SITE){
      const local=path.join(ROOT,decodeURIComponent(u.pathname).replace(/^\/+/,''));
      if(fs.existsSync(local))length=fs.statSync(local).size;
    }
    return {url:u.href,type,length};
  }catch{return null}
}

let allPosts=read(POSTS,[]);
allPosts=allPosts.filter(p=>{
  if(!p||!p.slug||!p.headline||!articleExists(p))return false;
  const t=new Date(p.publishedAt||0).getTime();
  return !Number.isFinite(t)||t<=now+15000;
}).sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
const bySlug=new Map(allPosts.map(p=>[p.slug,p]));
const posts=allPosts.slice(0,50);

const itemXml=(p,{manualId='',manualAt=''}={})=>{
  const base=p.url||`${SITE}/articles/${p.slug}.html`;
  const url=manualId?`${base}${base.includes('?')?'&':'?'}utm_source=followit&utm_medium=email&utm_campaign=${encodeURIComponent('manual_'+manualId)}`:base;
  const date=new Date(manualAt||p.publishedAt||Date.now());
  const pub=Number.isNaN(date.getTime())?new Date().toUTCString():date.toUTCString();
  const image=p.image||p.images?.[0]||'';
  const meta=imageMeta(image);
  const body=extractArticleBody(p)||`<p>${esc(p.description||'')}</p>`;
  const cover=image&&!body.includes(image)?`<p><img src="${esc(image)}" alt="${esc(p.imageAlt||p.headline||'')}"/></p>`:'';

  // Keep the source URL in simple Dzen-safe markup. We intentionally duplicate the
  // canonical link once near the start and once as the final paragraph: Dzen may
  // sanitize or trim trailing promo blocks during blogs_only import, while normal
  // paragraph links inside the article are preserved more reliably.
  const sourceInline=`<p><strong>Источник и обновляемая версия материала — ProVkus:</strong><br><a href="${esc(base)}">${esc(base)}</a></p>`;
  const sourceLink=`<p><strong>Читать материал на сайте ProVkus:</strong><br><a href="${esc(base)}">${esc(base)}</a></p>`;
  const full=`${cover}${sourceInline}${body}${sourceLink}`;
  return `  <item>\n    <title>${esc(p.headline)}</title>\n    <link>${esc(url)}</link>\n    <guid isPermaLink="${manualId?'true':'false'}">${manualId?esc(url):esc(`provkus-${p.slug}`)}</guid>\n    <pubDate>${esc(pub)}</pubDate>\n    <description>${esc(p.description||'')}</description>\n    <dc:creator>${esc(p.author||'Редакция ProVkus')}</dc:creator>${p.category?`\n    <category>${esc(p.category)}</category>`:''}${manualId?'\n    <category>Ручная рассылка</category>':`\n    <category>format-article</category>\n    <category>index</category>\n    <category>comment-all</category>\n    <contentType>blogs_only</contentType>`}${meta?`\n    <enclosure url="${esc(meta.url)}" length="${meta.length}" type="${meta.type}"/>\n    <media:content url="${esc(meta.url)}" medium="image" type="${meta.type}"/>`:''}\n    <media:rating scheme="urn:simple">nonadult</media:rating>\n    <content:encoded><![CDATA[${cdata(full)}]]></content:encoded>\n  </item>`;
};

const pushes=read(PUSHES,[]).filter(x=>x&&x.slug&&x.id&&new Date(x.sentAt||0).getTime()>now-72*60*60*1000).sort((a,b)=>new Date(b.sentAt)-new Date(a.sentAt));
const manualItems=pushes.map(x=>{const p=bySlug.get(x.slug);return p?itemXml(p,{manualId:x.id,manualAt:x.sentAt}):''}).filter(Boolean);
const regularItems=posts.map(p=>itemXml(p));
const items=[...manualItems,...regularItems].join('\n');
const latest=Math.max(0,...posts.map(p=>new Date(p.updatedAt||p.publishedAt||0).getTime()||0),...pushes.map(p=>new Date(p.sentAt||0).getTime()||0));
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n<channel>\n  <title>ProVkus — новые материалы</title>\n  <link>${SITE}/</link>\n  <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>\n  <description>Новые материалы ProVkus о еде, продуктах, хранении, доме и безопасности.</description>\n  <language>ru</language>\n  <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>\n  <image><url>${SITE}/favicon.png</url><title>ProVkus</title><link>${SITE}/</link></image>\n${items}\n</channel>\n</rss>\n`;
fs.writeFileSync(OUT,xml,'utf8');
console.log(`feed.xml: ${posts.length} published items, ${manualItems.length} manual pushes; Dzen full-content RSS enabled with duplicated visible canonical source URL`);
