(()=>{
  if(window.__pvAdminSeoLoaded)return;window.__pvAdminSeoLoaded=true;
  const SITE='https://provkus-media.ru';
  const ORG_ID=SITE+'/#organization';
  const LOGO=SITE+'/assets/provkus-logo.svg';
  const safeIso=v=>{const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString()};
  const getAuthors=()=>{try{return typeof AUTHORS!=='undefined'&&Array.isArray(AUTHORS)?AUTHORS:[]}catch{return[]}};
  const articleType=o=>/news/i.test(String(o?.type||''))?'NewsArticle':'Article';
  const authorFor=o=>getAuthors().find(a=>a.name===o?.author)||getAuthors()[0]||{};
  const keywords=o=>Array.isArray(o?.tags)?o.tags:String(o?.tags||'').split(',').map(x=>x.trim()).filter(Boolean);
  const escJson=o=>JSON.stringify(o).replace(/<\//g,'<\\/');
  const addHead=(html,needle,fragment)=>html.includes(needle)?html:html.replace('</head>',fragment+'</head>');

  function schema(o,img){
    const auth=authorFor(o),canonical=o?.canonical||`${SITE}/articles/${o?.slug||''}.html`,section=o?.category||'Материалы';
    const article={
      '@type':articleType(o),'@id':canonical+'#article',headline:o?.headline||'',description:o?.description||'',
      image:img?[img]:[],datePublished:safeIso(o?.publishedAt),dateModified:safeIso(o?.updatedAt||o?.publishedAt),
      articleSection:section,keywords:keywords(o),inLanguage:'ru-RU',isAccessibleForFree:true,
      mainEntityOfPage:{'@type':'WebPage','@id':canonical},
      author:{'@type':'Person',name:o?.author||auth.name||'Редакция ProVkus',url:auth.url?`${SITE}/${auth.url}`:`${SITE}/authors.html`},
      publisher:{'@type':'Organization','@id':ORG_ID,name:'ProVkus',url:SITE+'/',logo:{'@type':'ImageObject',url:LOGO,contentUrl:LOGO,width:512,height:512}}
    };
    const breadcrumb={'@type':'BreadcrumbList','@id':canonical+'#breadcrumb',itemListElement:[
      {'@type':'ListItem',position:1,name:'ProVkus',item:SITE+'/'},
      {'@type':'ListItem',position:2,name:section,item:SITE+'/category.html'},
      {'@type':'ListItem',position:3,name:o?.headline||'',item:canonical}
    ]};
    return {'@context':'https://schema.org','@graph':[article,breadcrumb]};
  }

  if(typeof articleHTML==='function'){
    const base=articleHTML;
    articleHTML=function(o,img){
      let out=base(o,img);
      const canonical=o?.canonical||`${SITE}/articles/${o?.slug||''}.html`;
      const block=`<script type="application/ld+json">${escJson(schema(o,img))}<\/script>`;
      const re=/<script type="application\/ld\+json">[\s\S]*?<\/script>/i;
      out=re.test(out)?out.replace(re,block):out.replace('</head>',block+'</head>');
      out=addHead(out,'property="og:site_name"','<meta property="og:site_name" content="ProVkus">');
      out=addHead(out,'property="og:locale"','<meta property="og:locale" content="ru_RU">');
      out=addHead(out,'property="og:url"',`<meta property="og:url" content="${canonical}">`);
      out=addHead(out,'type="application/rss+xml"','<link rel="alternate" type="application/rss+xml" title="ProVkus — новые материалы" href="https://provkus-media.ru/feed.xml">');
      if(!/meta name="twitter:title"/i.test(out))out=out.replace('</head>',`<meta name="twitter:title" content="${String(o?.headline||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"><meta name="twitter:description" content="${String(o?.description||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></head>`);
      return out;
    };
  }
})();
