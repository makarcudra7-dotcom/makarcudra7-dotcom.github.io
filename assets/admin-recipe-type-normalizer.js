(()=>{
  'use strict';
  if(window.__pvRecipeTypeNormalizer)return;
  window.__pvRecipeTypeNormalizer=true;

  const recipeUiValue=()=>{
    const select=document.querySelector('#type');
    const option=select?[...select.options].find(o=>String(o.value).toLowerCase()==='recipe'):null;
    return option?.value||'Recipe';
  };

  const priorCollect=window.collect;
  if(typeof priorCollect==='function'){
    window.collect=function(){
      const data=priorCollect();
      if(String(data?.type||'').toLowerCase()==='recipe')data.type='recipe';
      return data;
    };
  }

  const priorFill=window.fill;
  if(typeof priorFill==='function'){
    window.fill=function(data={}){
      const normalized=String(data?.type||'').toLowerCase()==='recipe'
        ? {...data,type:recipeUiValue()}
        : data;
      return priorFill(normalized);
    };
  }
})();
