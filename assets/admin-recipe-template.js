(()=>{
  'use strict';
  if(window.__pvAdminRecipeTemplate)return;
  window.__pvAdminRecipeTemplate=true;

  const TOOLS_VERSION='20260929-recipe-template2';
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isRecipe=v=>String(v||'').toLowerCase()==='recipe';
  const lines=v=>String(v||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const isoMinutes=v=>{const n=Math.max(0,parseInt(v,10)||0);return n?`PT${n}M`:''};
  const minutesFromIso=v=>{const m=String(v||'').match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);return m?(Number(m[1]||0)*60+Number(m[2]||0)):''};
  const ingredientHeading=/^(?:что понадобится|ингредиенты|продукты|состав|для .{0,80} понадобится|на .{0,80} понадобится)/i;
  const stepsHeading=/^(?:как приготовить|приготовление|готовим|готовьте|пошагов|шаг за шагом)/i;

  function currentHtml(){return $('#sourceEditor')&&!$('#sourceEditor').hidden?$('#sourceEditor').value:($('#richEditor')?.innerHTML||'')}
  function setHtml(html){if($('#richEditor'))$('#richEditor').innerHTML=html;if($('#sourceEditor'))$('#sourceEditor').value=html}
  function sectionList(html,headingRx,tag){
    const root=document.createElement('div');root.innerHTML=html||'';
    const hs=[...root.querySelectorAll('h2,h3')];
    for(const h of hs){
      if(!headingRx.test((h.textContent||'').trim()))continue;
      let n=h.nextElementSibling;
      while(n&&!/^H[23]$/.test(n.tagName||'')){
        if(n.tagName===tag.toUpperCase())return [...n.querySelectorAll(':scope > li')].map(li=>(li.textContent||'').trim()).filter(Boolean);
        n=n.nextElementSibling;
      }
    }
    return [];
  }
  function parseExisting(html){return{ingredients:sectionList(html,ingredientHeading,'ul'),steps:sectionList(html,stepsHeading,'ol')}}
  function removeSection(root,headingRx,tag){
    const hs=[...root.querySelectorAll('h2,h3')];
    for(const h of hs){
      if(!headingRx.test((h.textContent||'').trim()))continue;
      const nodes=[h];let n=h.nextElementSibling,hasList=false;
      while(n&&!/^H[23]$/.test(n.tagName||'')){nodes.push(n);if(n.tagName===tag.toUpperCase())hasList=true;n=n.nextElementSibling}
      if(hasList){nodes.forEach(x=>x.remove());return true}
    }
    return false;
  }
  function fact(label,value){return value?`<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`:''}
  function humanMinutes(v){const n=parseInt(v,10)||0;if(!n)return'';const h=Math.floor(n/60),m=n%60;return h&&m?`${h} ч ${m} мин`:h?`${h} ч`:`${m} мин`}
  function buildContent(original,data){
    original=String(original||'').replace(/<!-- PV-RECIPE-TEMPLATE-START -->[\s\S]*?<!-- PV-RECIPE-TEMPLATE-END -->/gi,'');
    const root=document.createElement('div');root.innerHTML=original;
    removeSection(root,ingredientHeading,'ul');removeSection(root,stepsHeading,'ol');
    [...root.querySelectorAll('p')].forEach(p=>{if(!(p.textContent||'').trim()&&!p.querySelector('img,video,iframe'))p.remove()});
    const children=[...root.childNodes],intro=[];
    while(children.length){const n=children[0];if(n.nodeType===1&&/^H[23]$/.test(n.tagName))break;intro.push(n.outerHTML??n.textContent);n.remove();children.shift()}
    const rest=root.innerHTML.trim();
    const prep=humanMinutes(data.prepMinutes),cook=humanMinutes(data.cookMinutes),total=humanMinutes((parseInt(data.prepMinutes,10)||0)+(parseInt(data.cookMinutes,10)||0));
    const facts=[fact('Подготовка',prep),fact('Готовка',cook),fact('Всего',total),fact('Выход',data.yield)].join('');
    const block=`<!-- PV-RECIPE-TEMPLATE-START -->${facts?`<div class="recipe-facts" aria-label="Кратко о рецепте">${facts}</div>`:''}<h2>Ингредиенты</h2><ul class="recipe-ingredients">${data.ingredients.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h2>Как приготовить</h2><ol class="recipe-steps">${data.steps.map(x=>`<li><p>${esc(x)}</p></li>`).join('')}</ol><!-- PV-RECIPE-TEMPLATE-END -->`;
    return `${intro.join('')}${block}${rest?`<div class="recipe-author-notes"><h2>Практические нюансы</h2>${rest}</div>`:''}`;
  }
  function recipeTypeOption(){const s=$('#type');if(!s)return null;return [...s.options].find(o=>isRecipe(o.value))?.value||'Recipe'}
  function formData(){
    const existing=parseExisting(currentHtml());
    const ingredients=lines($('#pvRecipeIngredients')?.value).length?lines($('#pvRecipeIngredients')?.value):existing.ingredients;
    const steps=lines($('#pvRecipeSteps')?.value).length?lines($('#pvRecipeSteps')?.value):existing.steps;
    return{ingredients,steps,yield:($('#pvRecipeYield')?.value||'').trim(),prepMinutes:($('#pvRecipePrep')?.value||'').trim(),cookMinutes:($('#pvRecipeCook')?.value||'').trim(),cuisine:($('#pvRecipeCuisine')?.value||'').trim(),category:($('#pvRecipeCategory')?.value||'').trim()};
  }
  function populateFields(o={}){
    const parsed=parseExisting(o.content||currentHtml());
    if($('#pvRecipeIngredients'))$('#pvRecipeIngredients').value=(o.recipeIngredient?.length?o.recipeIngredient:parsed.ingredients).join('\n');
    if($('#pvRecipeSteps'))$('#pvRecipeSteps').value=(o.recipeInstructions?.length?o.recipeInstructions.map(x=>typeof x==='string'?x:(x?.text||'')):parsed.steps).filter(Boolean).join('\n');
    if($('#pvRecipeYield'))$('#pvRecipeYield').value=o.recipeYield||'';
    if($('#pvRecipePrep'))$('#pvRecipePrep').value=minutesFromIso(o.prepTime)||'';
    if($('#pvRecipeCook'))$('#pvRecipeCook').value=minutesFromIso(o.cookTime)||'';
    if($('#pvRecipeCuisine'))$('#pvRecipeCuisine').value=o.recipeCuisine||'';
    if($('#pvRecipeCategory'))$('#pvRecipeCategory').value=o.recipeCategory||'';
  }
  function ensureUi(){
    if($('#pvRecipeTemplateCard'))return;
    const titles=[...document.querySelectorAll('#material .card-title')],content=titles.find(x=>(x.textContent||'').trim()==='Содержание')?.closest('.card');
    if(!content)return;
    const card=document.createElement('div');card.className='card';card.id='pvRecipeTemplateCard';card.innerHTML=`<div class="card-title">Шаблон рецепта <span class="hint" id="pvRecipeState"></span></div><div class="card-body"><p class="hint">Для типа «Рецепт» ингредиенты и шаги обязательны. При публикации и планировании CMS сама собирает фирменную верстку и Recipe schema.</p><div class="form-grid"><div class="field"><label>Подготовка, мин</label><input id="pvRecipePrep" type="number" min="0" step="1" placeholder="20"></div><div class="field"><label>Готовка, мин</label><input id="pvRecipeCook" type="number" min="0" step="1" placeholder="40"></div></div><div class="form-grid"><div class="field"><label>Выход / порции</label><input id="pvRecipeYield" placeholder="4 порции"></div><div class="field"><label>Категория блюда</label><input id="pvRecipeCategory" placeholder="Основное блюдо"></div></div><div class="field"><label>Кухня</label><input id="pvRecipeCuisine" placeholder="Русская, Итальянская — если уместно"></div><div class="field"><label>Ингредиенты — по одному на строку</label><textarea id="pvRecipeIngredients" rows="8" placeholder="Куриное филе — 300 г&#10;Соль — по вкусу"></textarea></div><div class="field"><label>Шаги — по одному на строку</label><textarea id="pvRecipeSteps" rows="8" placeholder="Подготовьте продукты.&#10;Готовьте до нужной степени готовности."></textarea></div><button type="button" class="btn green" id="pvApplyRecipeTemplate">Применить шаблон рецепта</button></div>`;
    content.insertAdjacentElement('afterend',card);
    $('#pvApplyRecipeTemplate').onclick=()=>{
      const type=$('#type');if(type&&!isRecipe(type.value)){type.value=recipeTypeOption();type.dispatchEvent(new Event('change',{bubbles:true}))}
      const cat=$('#category');if(cat&&cat.value!=='Кухни мира'&&[...cat.options].some(o=>o.value==='Рецепты'||o.textContent==='Рецепты'))cat.value='Рецепты';
      const d=formData();
      if(!d.ingredients.length||!d.steps.length){window.flash?.('Для шаблона рецепта нужны ингредиенты и шаги');return}
      setHtml(buildContent(currentHtml(),d));
      $('#pvRecipeIngredients').value=d.ingredients.join('\n');$('#pvRecipeSteps').value=d.steps.join('\n');
      $('#pvRecipeState').textContent='шаблон применён';
      window.flash?.('Шаблон рецепта применён');
    };
    const type=$('#type');type?.addEventListener('change',syncVisibility);syncVisibility();
  }
  function syncVisibility(){const card=$('#pvRecipeTemplateCard');if(!card)return;card.hidden=!isRecipe($('#type')?.value)}

  const baseCollect=window.collect;
  if(typeof baseCollect==='function')window.collect=function(){
    const o=baseCollect();
    if(!isRecipe(o.type))return o;
    const d=formData();
    o.recipeIngredient=d.ingredients;
    o.recipeInstructions=d.steps;
    o.recipeYield=d.yield;
    o.recipeCategory=d.category;
    o.recipeCuisine=d.cuisine;
    o.prepTime=isoMinutes(d.prepMinutes);
    o.cookTime=isoMinutes(d.cookMinutes);
    const total=(parseInt(d.prepMinutes,10)||0)+(parseInt(d.cookMinutes,10)||0);o.totalTime=total?`PT${total}M`:'';
    if(d.ingredients.length&&d.steps.length){o.content=buildContent(o.content,d);o.recipeTemplateApplied=true}
    return o;
  };
  const baseFill=window.fill;
  if(typeof baseFill==='function')window.fill=function(o={}){const r=baseFill(o);setTimeout(()=>{ensureUi();populateFields(o);syncVisibility()},0);return r};

  const baseArticle=window.articleHTML;
  if(typeof baseArticle==='function')window.articleHTML=function(o,img){
    let html=baseArticle(o,img);if(!isRecipe(o?.type))return html;
    html=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/,(_,raw)=>{try{const data=JSON.parse(raw.replace(/<\\\//g,'</'));data['@type']='Recipe';if(o.recipeIngredient?.length)data.recipeIngredient=o.recipeIngredient;if(o.recipeInstructions?.length)data.recipeInstructions=o.recipeInstructions.map((x,i)=>({'@type':'HowToStep',position:i+1,text:typeof x==='string'?x:(x?.text||'')}));if(o.prepTime)data.prepTime=o.prepTime;if(o.cookTime)data.cookTime=o.cookTime;if(o.totalTime)data.totalTime=o.totalTime;if(o.recipeYield)data.recipeYield=o.recipeYield;if(o.recipeCuisine)data.recipeCuisine=o.recipeCuisine;if(o.recipeCategory)data.recipeCategory=o.recipeCategory;return `<script type="application/ld+json">${JSON.stringify(data).replace(/<\//g,'<\\/')}<\/script>`}catch{return _}});
    if(!html.includes('name="pv-content-type"'))html=html.replace('</head>',`<meta name="pv-content-type" content="Recipe"><link rel="stylesheet" href="/assets/provkus-tools.css?v=${TOOLS_VERSION}"></head>`);
    else if(!html.includes('/assets/provkus-tools.css'))html=html.replace('</head>',`<link rel="stylesheet" href="/assets/provkus-tools.css?v=${TOOLS_VERSION}"></head>`);
    if(!html.includes('pv-recipe-marker'))html=html.replace(/(<div class="article-kicker"[^>]*>)([\s\S]*?)(<\/div>)/,`$1$2<span class="pv-recipe-marker" hidden> Рецепт</span>$3`);
    if(!html.includes('/assets/provkus-tools-v2.js'))html=html.replace('</body>',`<script src="/assets/provkus-tools-v2.js?v=${TOOLS_VERSION}"><\/script></body>`);
    return html;
  };

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#publishBtn,#scheduleBtn');if(!b)return;
    const o=window.collect?.()||{};if(!isRecipe(o.type))return;
    if(!o.recipeIngredient?.length||!o.recipeInstructions?.length){e.preventDefault();e.stopImmediatePropagation();window.flash?.('Рецепт не опубликован: заполните ингредиенты и шаги в блоке «Шаблон рецепта»');}
  },true);

  let ticks=0,t=setInterval(()=>{ensureUi();if($('#pvRecipeTemplateCard')){populateFields(window.store?.draft||{});syncVisibility();clearInterval(t)}if(++ticks>80)clearInterval(t)},100);
})();
