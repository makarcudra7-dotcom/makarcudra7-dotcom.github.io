(()=>{
  'use strict';
  if(window.__pvTaxonomyStandard)return;
  window.__pvTaxonomyStandard=true;

  const $=s=>document.querySelector(s);
  const RUBRICS=[
    ['Продукты','Продукты'],
    ['Хранение','Хранение'],
    ['Безопасность еды','Безопасность еды'],
    ['Рецепты','Рецепты']
  ];
  const TYPES=[
    ['Article','Статья'],
    ['Recipe','Рецепт'],
    ['NewsArticle','Новость']
  ];

  function setOptions(select,options,fallback){
    if(!select)return;
    const current=select.value;
    select.innerHTML='';
    options.forEach(([value,label])=>select.add(new Option(label,value)));
    const values=options.map(x=>x[0]);
    select.value=values.includes(current)?current:fallback;
  }

  function normalizeLegacyCategory(value,type){
    const v=String(value||'').trim().toLowerCase();
    if(String(type||'').toLowerCase()==='recipe')return 'Рецепты';
    if(v.includes('безопас'))return 'Безопасность еды';
    if(v.includes('дом')||v.includes('хран'))return 'Хранение';
    if(v.includes('рецеп'))return 'Рецепты';
    return 'Продукты';
  }

  function installHelp(){
    const category=$('#category'),type=$('#type');
    if(!category||!type)return;
    const oldCategory=category.value,oldType=type.value;
    setOptions(category,RUBRICS,normalizeLegacyCategory(oldCategory,oldType));
    setOptions(type,TYPES,['Article','Recipe','NewsArticle'].includes(oldType)?oldType:'Article');
    category.value=normalizeLegacyCategory(oldCategory,type.value);

    const grid=category.closest('.form-grid');
    if(grid&&!$('#taxonomyHelp')){
      const help=document.createElement('div');
      help.id='taxonomyHelp';help.className='hint';help.style.gridColumn='1 / -1';
      help.innerHTML='<b>Рубрика</b> — тема материала: где читатель его ищет. <b>Тип</b> — формат и правила публикации. Например: рубрика «Продукты» + тип «Новость» попадёт и в «Продукты», и в «ProVkus-ные новости».';
      grid.appendChild(help);
    }
    const source=$('#source');
    if(source)source.placeholder='Для рекомендаций по безопасности — минимум 1 релевантный надёжный источник';

    type.addEventListener('change',()=>{
      if(type.value==='Recipe')category.value='Рецепты';
    });
  }

  function recipeParts(){
    const sourceMode=!$('#sourceEditor')?.hidden;
    const raw=sourceMode?($('#sourceEditor')?.value||''):($('#richEditor')?.innerHTML||'');
    const box=document.createElement('div');box.innerHTML=raw;
    let ingredients=0,steps=0;
    const headings=[...box.querySelectorAll('h2,h3,h4')];
    for(const h of headings){
      const label=(h.textContent||'').trim().toLowerCase();
      let n=h.nextElementSibling;
      while(n&&!/^H[234]$/.test(n.tagName)){
        if(/ингредиент|понадоб|продукт|состав/.test(label)&&n.matches('ul,ol'))ingredients=Math.max(ingredients,n.querySelectorAll('li').length);
        if(/приготов|шаг|способ|готовим|делаем|порядок/.test(label)&&n.matches('ol,ul'))steps=Math.max(steps,n.querySelectorAll('li').length);
        n=n.nextElementSibling;
      }
    }
    return {ingredients,steps};
  }

  function validateRecipe(e){
    const type=$('#type');
    if(!type||type.value!=='Recipe')return;
    const {ingredients,steps}=recipeParts();
    if(ingredients>=2&&steps>=2)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(typeof window.flash==='function')window.flash('Для рецепта нужны раздел «Ингредиенты» со списком и пошаговое приготовление');
    else alert('Для рецепта нужны раздел «Ингредиенты» со списком и пошаговое приготовление.');
  }

  let tries=0;
  const timer=setInterval(()=>{
    if($('#category')&&$('#type')){
      clearInterval(timer);installHelp();
      $('#publishBtn')?.addEventListener('click',validateRecipe,true);
    }
    if(++tries>60)clearInterval(timer);
  },100);
})();
