(()=>{
  'use strict';
  if(window.__pvAdminRecipeTemplate)return;
  window.__pvAdminRecipeTemplate=true;

  const TOOLS_VERSION='20260929-recipe-auto1';
  const base=window.articleHTML;
  if(typeof base!=='function')return;

  window.articleHTML=function(o,img){
    let html=base(o,img);
    const isRecipe=String(o?.type||'').toLowerCase()==='recipe';
    if(!isRecipe)return html;

    if(!html.includes('name="pv-content-type"')){
      html=html.replace('</head>',`<meta name="pv-content-type" content="Recipe"><link rel="stylesheet" href="/assets/provkus-tools.css?v=${TOOLS_VERSION}"></head>`);
    }else if(!html.includes('/assets/provkus-tools.css')){
      html=html.replace('</head>',`<link rel="stylesheet" href="/assets/provkus-tools.css?v=${TOOLS_VERSION}"></head>`);
    }

    if(!html.includes('pv-recipe-marker')){
      html=html.replace(/(<div class="article-kicker"[^>]*>)([\s\S]*?)(<\/div>)/,`$1$2<span class="pv-recipe-marker" hidden> Рецепт</span>$3`);
    }

    if(!html.includes('/assets/provkus-tools-v2.js')){
      html=html.replace('</body>',`<script src="/assets/provkus-tools-v2.js?v=${TOOLS_VERSION}"><\/script></body>`);
    }
    return html;
  };
})();
