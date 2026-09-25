(()=>{
  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const fmt=n=>{
    if(!Number.isFinite(n)) return '—';
    const abs=Math.abs(n);
    const digits=abs>=100?0:abs>=10?1:2;
    return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:digits}).format(n);
  };

  // Approximate bulk weights for a level 250 ml cup. Kitchen products vary by
  // brand, humidity and how tightly they are packed, so the UI always labels
  // the result as an estimate.
  const densities={
    water:{name:'Вода',group:'Жидкости',g250:250}, milk:{name:'Молоко',group:'Жидкости',g250:258}, kefir:{name:'Кефир',group:'Жидкости',g250:258},
    yogurt:{name:'Йогурт',group:'Жидкости',g250:260}, cream:{name:'Сливки',group:'Жидкости',g250:255}, oil:{name:'Растительное масло',group:'Жидкости',g250:230},
    sourcream:{name:'Сметана',group:'Молочные продукты',g250:250}, condensed:{name:'Сгущённое молоко',group:'Молочные продукты',g250:325}, cottage:{name:'Творог мягкий',group:'Молочные продукты',g250:250}, butter:{name:'Сливочное масло',group:'Молочные продукты',g250:225},
    flour:{name:'Пшеничная мука',group:'Мука и крахмал',g250:130}, rye:{name:'Ржаная мука',group:'Мука и крахмал',g250:125}, cornflour:{name:'Кукурузная мука',group:'Мука и крахмал',g250:160}, oatflour:{name:'Овсяная мука',group:'Мука и крахмал',g250:115}, potato:{name:'Картофельный крахмал',group:'Мука и крахмал',g250:200}, cornstarch:{name:'Кукурузный крахмал',group:'Мука и крахмал',g250:160}, semolina:{name:'Манка',group:'Мука и крахмал',g250:190},
    sugar:{name:'Сахар',group:'Сахар, соль, специи',g250:200}, powder:{name:'Сахарная пудра',group:'Сахар, соль, специи',g250:120}, salt:{name:'Соль',group:'Сахар, соль, специи',g250:300}, cocoa:{name:'Какао-порошок',group:'Сахар, соль, специи',g250:125}, poppy:{name:'Мак',group:'Сахар, соль, специи',g250:155},
    rice:{name:'Рис',group:'Крупы и бобовые',g250:200}, buckwheat:{name:'Гречка',group:'Крупы и бобовые',g250:210}, oats:{name:'Овсяные хлопья',group:'Крупы и бобовые',g250:90}, couscous:{name:'Кускус',group:'Крупы и бобовые',g250:190}, bulgur:{name:'Булгур',group:'Крупы и бобовые',g250:200}, lentils:{name:'Чечевица',group:'Крупы и бобовые',g250:210}, peas:{name:'Горох сухой',group:'Крупы и бобовые',g250:200}, beans:{name:'Фасоль сухая',group:'Крупы и бобовые',g250:205}, pasta:{name:'Мелкие макароны',group:'Крупы и бобовые',g250:120},
    honey:{name:'Мёд',group:'Сладкое и добавки',g250:350}, jam:{name:'Варенье',group:'Сладкое и добавки',g250:330}, breadcrumbs:{name:'Панировочные сухари',group:'Сладкое и добавки',g250:135}, coconut:{name:'Кокосовая стружка',group:'Сладкое и добавки',g250:85}, raisins:{name:'Изюм',group:'Сладкое и добавки',g250:190}, nuts:{name:'Орехи рубленые',group:'Сладкое и добавки',g250:150}
  };

  function initConverter(){
    const form=q('#converterForm'); if(!form) return;
    const ingredient=q('#ingredient'), amount=q('#convAmount'), unit=q('#convUnit'), cup=q('#cupSize'), custom=q('#customDensity'), customWrap=q('#customDensityWrap');
    const out={g:q('#outG'),tbsp:q('#outTbsp'),tsp:q('#outTsp'),cup:q('#outCup')}, note=q('#densityNote');
    const groups=new Map();
    Object.entries(densities).forEach(([key,v])=>{
      if(!groups.has(v.group)){
        const group=document.createElement('optgroup'); group.label=v.group; groups.set(v.group,group); ingredient.appendChild(group);
      }
      const option=document.createElement('option'); option.value=key; option.textContent=v.name; groups.get(v.group).appendChild(option);
    });
    ingredient.insertAdjacentHTML('beforeend','<option value="custom">Своя плотность</option>');
    ingredient.value='flour';
    function density(){
      if(ingredient.value==='custom') return Math.max(.001,Number(custom.value)||1);
      return densities[ingredient.value].g250/250;
    }
    function update(){
      customWrap.hidden=ingredient.value!=='custom';
      const d=density(), a=Math.max(0,Number(amount.value)||0), cupMl=Number(cup.value)||250;
      let grams=0;
      if(unit.value==='g') grams=a;
      if(unit.value==='tbsp') grams=a*15*d;
      if(unit.value==='tsp') grams=a*5*d;
      if(unit.value==='cup') grams=a*cupMl*d;
      out.g.textContent=fmt(grams)+' г';
      out.tbsp.textContent=fmt(grams/(15*d))+' ст. л.';
      out.tsp.textContent=fmt(grams/(5*d))+' ч. л.';
      out.cup.textContent=fmt(grams/(cupMl*d))+' стак.';
      note.textContent=`Расчёт приблизительный: 1 ст. л. ≈ ${fmt(15*d)} г, 1 ч. л. ≈ ${fmt(5*d)} г, стакан ${cupMl} мл ≈ ${fmt(cupMl*d)} г для выбранного продукта.`;
    }
    [ingredient,amount,unit,cup,custom].forEach(el=>el.addEventListener('input',update)); update();
  }

  function initPortions(){
    const root=q('#portionCalculator'); if(!root) return;
    const base=q('#baseServings'), target=q('#targetServings'), list=q('#ingredientList'), result=q('#portionResult'), factor=q('#portionFactor');
    const units=['г','кг','мл','л','ч. л.','ст. л.','стакан','шт.','щепотка','зубчик','пучок','ломтик','веточка','банка','упаковка'];
    function row(name='',amount='',unit='г'){
      const div=document.createElement('div'); div.className='ingredient-row';
      div.innerHTML=`<div class="calc-field ingredient-name"><label class="sr-only">Ингредиент</label><input type="text" placeholder="Ингредиент" value="${String(name).replaceAll('&','&amp;').replaceAll('"','&quot;')}"></div><div class="calc-field"><label class="sr-only">Количество</label><input class="ingredient-amount" type="number" min="0" step="any" inputmode="decimal" placeholder="0" value="${amount}"></div><div class="calc-field"><label class="sr-only">Единица</label><select class="ingredient-unit">${units.map(u=>`<option${u===unit?' selected':''}>${u}</option>`).join('')}</select></div><button type="button" aria-label="Удалить ингредиент">×</button>`;
      q('button',div).addEventListener('click',()=>{div.remove(); recalc();});
      qa('input,select',div).forEach(el=>el.addEventListener('input',recalc)); list.appendChild(div);
    }
    function smart(n,u){
      if(!Number.isFinite(n)) return '—';
      if(u==='г'||u==='мл') return fmt(n);
      if(['шт.','зубчик','пучок','ломтик','веточка','банка','упаковка'].includes(u)) return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);
      const rounded=Math.round(n*4)/4;
      return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(rounded);
    }
    function recalc(){
      const b=Number(base.value)||0, t=Number(target.value)||0, k=b>0?t/b:0;
      factor.textContent=b>0&&t>0?`Коэффициент × ${fmt(k)}`:'Укажите число порций';
      const rows=qa('.ingredient-row',list).map(r=>({name:q('input[type="text"]',r).value.trim()||'Ингредиент',amount:Number(q('.ingredient-amount',r).value),unit:q('.ingredient-unit',r).value})).filter(x=>Number.isFinite(x.amount)&&x.amount>=0);
      result.innerHTML=rows.length&&k>0?`<table class="portion-table"><thead><tr><th>Ингредиент</th><th>Было</th><th>Нужно</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${x.name.replaceAll('&','&amp;').replaceAll('<','&lt;')}</td><td>${smart(x.amount,x.unit)} ${x.unit}</td><td><strong>${smart(x.amount*k,x.unit)} ${x.unit}</strong></td></tr>`).join('')}</tbody></table>`:'<p class="calc-note">Добавьте ингредиенты — пересчёт появится здесь.</p>';
    }
    q('#addIngredient').addEventListener('click',()=>row());
    q('#exampleRecipe').addEventListener('click',()=>{list.innerHTML=''; row('Мука',250,'г'); row('Молоко',300,'мл'); row('Яйца',2,'шт.'); row('Сахар',2,'ст. л.'); base.value=4; target.value=6; recalc();});
    q('#clearRecipe').addEventListener('click',()=>{list.innerHTML=''; row(); row(); base.value=4; target.value=4; recalc();});
    [base,target].forEach(el=>el.addEventListener('input',recalc));
    row('Мука',250,'г'); row('Молоко',300,'мл'); row('Яйца',2,'шт.'); recalc();
  }

  initConverter(); initPortions();
})();