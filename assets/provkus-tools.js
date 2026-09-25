(() => {
'use strict';
if (window.__provkusToolsLoaded) return;
window.__provkusToolsLoaded = true;

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s || '').toLowerCase().replace(/ё/g,'е').replace(/[«»"']/g,'').replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();
const round = (n,d=0) => Number.isFinite(n) ? Number(n.toFixed(d)) : 0;

const FOODS = [
  ['куриная грудка',['куриная грудка','грудка куриная','филе куриное','куриное филе'],165,31,3.6,0,100],
  ['курица',['курица','мясо курицы'],190,23,10,0,100],
  ['индейка',['индейка','филе индейки'],135,29,1.7,0,100],
  ['говядина',['говядина','фарш говяжий','говяжий фарш'],250,26,15,0,100],
  ['свинина',['свинина','фарш свиной','свиной фарш'],242,27,14,0,100],
  ['фарш мясной',['мясной фарш','фарш'],240,20,18,0,100],
  ['лосось',['лосось','семга'],208,20,13,0,100],
  ['тунец',['тунец'],132,28,1.3,0,100],
  ['яйцо',['яйцо','яйца'],143,12.6,9.5,0.7,50],
  ['молоко 2,5%',['молоко','молоко 2.5','молоко 2,5'],52,2.8,2.5,4.7,200],
  ['кефир',['кефир'],53,3,2.5,4,200],
  ['сметана 20%',['сметана','сметана 20'],206,2.8,20,3.2,20],
  ['сливки 20%',['сливки','сливки 20'],207,2.5,20,4,15],
  ['творог 5%',['творог','творог 5'],121,17,5,1.8,100],
  ['сыр твердый',['сыр','твердый сыр','сыр твердый'],350,25,27,2,20],
  ['сыр моцарелла',['моцарелла'],280,28,17,3.1,30],
  ['масло сливочное',['сливочное масло','масло сливочное'],748,0.5,82,0.8,10],
  ['масло растительное',['растительное масло','масло растительное','подсолнечное масло','оливковое масло'],884,0,100,0,14],
  ['майонез',['майонез'],680,1,75,1,15],
  ['рис сухой',['рис','рис сухой'],344,6.7,0.7,78.9,180],
  ['гречка сухая',['гречка','гречневая крупа'],343,13,3.4,72,170],
  ['овсяные хлопья',['овсянка','овсяные хлопья','геркулес'],366,12.3,6.1,59.5,80],
  ['макароны сухие',['макароны','паста','спагетти'],350,12,1.5,72,100],
  ['удон',['удон','лапша удон'],337,10,1,70,100],
  ['мука пшеничная',['мука','пшеничная мука'],334,10.3,1.1,70.6,130],
  ['хлеб белый',['хлеб','батон','белый хлеб'],265,8.5,3.2,49,30],
  ['панировочные сухари',['панировочные сухари','сухари панировочные'],395,13,5.3,72,15],
  ['картофель',['картофель','картошка'],77,2,0.1,17,150],
  ['лук репчатый',['лук','репчатый лук'],40,1.1,0.1,9.3,80],
  ['лук зеленый',['зеленый лук','лук зеленый'],32,1.8,0.2,7.3,10],
  ['морковь',['морковь'],41,0.9,0.2,9.6,80],
  ['свекла',['свекла'],43,1.6,0.2,9.6,100],
  ['капуста белокочанная',['капуста','белокочанная капуста'],25,1.3,0.1,5.8,100],
  ['помидор',['помидор','помидоры','томат','томаты'],18,0.9,0.2,3.9,120],
  ['огурец',['огурец','огурцы'],15,0.7,0.1,3.6,100],
  ['перец сладкий',['болгарский перец','сладкий перец','перец болгарский'],31,1,0.3,6,120],
  ['тыква',['тыква'],26,1,0.1,6.5,100],
  ['кабачок',['кабачок','кабачки'],17,1.2,0.3,3.1,150],
  ['баклажан',['баклажан','баклажаны'],25,1,0.2,6,200],
  ['шампиньоны',['шампиньоны','грибы'],22,3.1,0.3,3.3,100],
  ['яблоко',['яблоко','яблоки'],52,0.3,0.2,13.8,170],
  ['груша',['груша','груши'],57,0.4,0.1,15.2,170],
  ['банан',['банан','бананы'],89,1.1,0.3,22.8,120],
  ['апельсин',['апельсин','апельсины'],47,0.9,0.1,11.8,180],
  ['лимон',['лимон','лимоны'],29,1.1,0.3,9.3,100],
  ['ананас',['ананас','ананасы'],50,0.5,0.1,13.1,100],
  ['виноград',['виноград'],69,0.7,0.2,18.1,100],
  ['слива',['слива','сливы'],46,0.7,0.3,11.4,70],
  ['грецкие орехи',['грецкие орехи','орехи грецкие'],654,15.2,65.2,13.7,10],
  ['миндаль',['миндаль'],579,21.2,49.9,21.6,10],
  ['мед',['мед'],304,0.3,0,82.4,21],
  ['сахар',['сахар'],387,0,0,100,12],
  ['шоколад темный',['шоколад','темный шоколад'],546,4.9,31,61,10],
  ['фасоль вареная',['фасоль','фасоль вареная'],127,8.7,0.5,22.8,100],
  ['нут вареный',['нут','нут вареный'],164,8.9,2.6,27.4,100],
  ['чечевица вареная',['чечевица','чечевица вареная'],116,9,0.4,20.1,100]
].map(x => ({name:x[0], aliases:x[1], kcal:x[2], p:x[3], f:x[4], c:x[5], piece:x[6]}));

const STORAGE = [
  ['курица сырая',['курица','куриная грудка','куриное филе'], '1–2 дня','до 9 месяцев','не более 2 часов','Сырую птицу держите в самой холодной зоне холодильника.'],
  ['готовая курица',['готовая курица','жареная курица','запеченная курица'],'3–4 дня','2–6 месяцев','не более 2 часов','Охладите и уберите в холодильник как можно быстрее.'],
  ['фарш сырой',['фарш','мясной фарш'],'1–2 дня','3–4 месяца','не более 2 часов','Храните герметично и отдельно от готовой еды.'],
  ['говядина / свинина сырая',['говядина','свинина','мясо сырое'],'3–5 дней','4–12 месяцев','не более 2 часов','Срок зависит от размера куска и температуры холодильника.'],
  ['рыба сырая',['рыба','лосось','семга','тунец'],'1–2 дня','2–8 месяцев','не более 2 часов','Лучше готовить максимально свежей.'],
  ['яйца в скорлупе',['яйцо','яйца'],'3–5 недель','не рекомендуется','не хранить длительно','Храните в холодильнике, лучше на внутренней полке.'],
  ['яйца вареные',['вареные яйца','яйцо вареное'],'до 7 дней','не рекомендуется','не более 2 часов','Очищенные яйца держите в закрытой емкости.'],
  ['молоко',['молоко'],'5–7 дней после открытия','не рекомендуется','не более 2 часов','Ориентируйтесь также на маркировку производителя.'],
  ['сыр твердый',['сыр','твердый сыр'],'3–4 недели после открытия','до 6 месяцев','не более 2 часов','Плотно упакуйте, чтобы сыр не подсыхал.'],
  ['творог',['творог'],'3–5 дней','1–2 месяца','не более 2 часов','Соблюдайте срок на упаковке, особенно после вскрытия.'],
  ['сметана',['сметана'],'7–14 дней после открытия','не рекомендуется','не более 2 часов','Не оставляйте ложку в упаковке.'],
  ['готовый суп',['суп','борщ','щи'],'3–4 дня','2–3 месяца','не более 2 часов','Большой объем лучше быстро охладить порциями.'],
  ['вареный рис',['рис вареный','готовый рис'],'3–4 дня','1–2 месяца','не более 2 часов','Быстро охладите после приготовления.'],
  ['макароны готовые',['макароны готовые','паста готовая'],'3–5 дней','1–2 месяца','не более 2 часов','Храните в закрытом контейнере.'],
  ['картофель вареный',['вареный картофель','картошка вареная'],'3–4 дня','1–2 месяца','не более 2 часов','Охладите и уберите в холодильник.'],
  ['салат с майонезом',['салат с майонезом','оливье'],'1–2 дня','не рекомендуется','не более 2 часов','Заправленный салат хранится хуже незаправленного.'],
  ['грибы готовые',['грибы готовые','жареные грибы'],'3–4 дня','2–3 месяца','не более 2 часов','Охладите после приготовления.'],
  ['нарезанные фрукты',['нарезанные фрукты','фруктовый салат'],'3–4 дня','зависит от продукта','не более 2 часов','Храните герметично в холодильнике.'],
  ['домашняя консервация',['домашняя консервация','закрутки','домашние банки'],'по рецептуре и условиям обработки','зависит от продукта','после открытия — в холодильнике','При вздутии крышки, подтекании, пене или необычном запахе продукт не пробуйте.']
].map(x=>({name:x[0],aliases:x[1],fridge:x[2],freezer:x[3],room:x[4],note:x[5]}));

function findFood(name){
  const n=norm(name); if(!n) return null; let best=null,bestLen=0;
  for(const f of FOODS) for(const a of [f.name,...f.aliases]) {const na=norm(a); if((n.includes(na)||na.includes(n)) && na.length>bestLen){best=f;bestLen=na.length;}}
  return best;
}
function unitGrams(amount,unit,food){const u=norm(unit);if(/кг/.test(u))return amount*1000;if(/мл/.test(u))return amount;if(/стол|ст\.?\s*л/.test(u))return amount*15;if(/чайн|ч\.?\s*л/.test(u))return amount*5;if(/стак/.test(u))return amount*200;if(/шт|штук/.test(u))return amount*(food?.piece||100);return amount;}
function parseIngredientLine(raw){
  const text=String(raw||'').replace(/[;]+$/,'').trim(); if(!text)return null;
  const m=text.match(/^(.*?)(?:\s*[—–-]\s*|\s+)(\d+(?:[.,]\d+)?)\s*(кг|г|гр|мл|л|шт\.?|штук[аи]?|ст\.?\s*л\.?|стол\w*\s+лож\w*|ч\.?\s*л\.?|чайн\w*\s+лож\w*|стак\w*)/i)||text.match(/^(\d+(?:[.,]\d+)?)\s*(кг|г|гр|мл|л|шт\.?|ст\.?\s*л\.?|ч\.?\s*л\.?|стак\w*)\s+(.+)$/i);
  let name,amount,unit;if(m&&/^\d/.test(m[1])){amount=parseFloat(m[1].replace(',','.'));unit=m[2];name=m[3];}else if(m){name=m[1];amount=parseFloat(m[2].replace(',','.'));unit=m[3];}else{name=text.replace(/\s*[—–-].*$/,'');amount=100;unit='г';}
  name=name.replace(/\([^)]*\)/g,'').replace(/\b(по вкусу|для подачи)\b.*$/i,'').trim();const food=findFood(name);return{raw:text,name,amount,unit,food,grams:food?unitGrams(amount,unit,food):0};
}
function calcRows(lines){const rows=lines.map(parseIngredientLine).filter(Boolean),totals={kcal:0,p:0,f:0,c:0,grams:0};for(const r of rows){if(!r.food)continue;const k=r.grams/100;totals.kcal+=r.food.kcal*k;totals.p+=r.food.p*k;totals.f+=r.food.f*k;totals.c+=r.food.c*k;totals.grams+=r.grams;}return{rows,totals};}
function renderNutrition(){
  const root=$('#pvNutritionApp');if(!root)return;const saved=localStorage.getItem('pvNutritionPrefill')||'';
  root.innerHTML=`<div class="pv-input-grid"><div><label for="pvNutInput">Ингредиенты</label><textarea id="pvNutInput" rows="10" placeholder="Куриная грудка — 250 г&#10;Рис — 150 г&#10;Масло — 10 г">${esc(saved)}</textarea></div><div class="pv-side-fields"><label>Порций<input id="pvNutServings" type="number" min="1" step="1" value="1"></label><label>Вес готового блюда, г <small>(необязательно)</small><input id="pvNutCooked" type="number" min="1" step="1" placeholder="Например, 900"></label><button class="pv-btn" id="pvNutCalc">Рассчитать</button><button class="pv-btn pv-secondary" id="pvNutClear">Очистить</button></div></div><div id="pvNutResult"></div>`;
  const run=()=>{const lines=$('#pvNutInput').value.split(/\n|;/).map(x=>x.trim()).filter(Boolean),{rows,totals}=calcRows(lines),serv=Math.max(1,Number($('#pvNutServings').value)||1),cooked=Number($('#pvNutCooked').value)||0,known=rows.filter(x=>x.food).length,unknown=rows.filter(x=>!x.food),per={kcal:totals.kcal/serv,p:totals.p/serv,f:totals.f/serv,c:totals.c/serv},per100=cooked?{kcal:totals.kcal/cooked*100,p:totals.p/cooked*100,f:totals.f/cooked*100,c:totals.c/cooked*100}:null;$('#pvNutResult').innerHTML=`<div class="pv-kcal-hero"><span>На весь рецепт</span><strong>${round(totals.kcal)} ккал</strong><div class="pv-macros"><b>Б ${round(totals.p,1)} г</b><b>Ж ${round(totals.f,1)} г</b><b>У ${round(totals.c,1)} г</b></div></div><div class="pv-result-grid"><div><span>На 1 порцию</span><strong>${round(per.kcal)} ккал</strong><small>Б ${round(per.p,1)} · Ж ${round(per.f,1)} · У ${round(per.c,1)}</small></div>${per100?`<div><span>На 100 г готового блюда</span><strong>${round(per100.kcal)} ккал</strong><small>Б ${round(per100.p,1)} · Ж ${round(per100.f,1)} · У ${round(per100.c,1)}</small></div>`:''}<div><span>Распознано</span><strong>${known}/${rows.length}</strong><small>${unknown.length?'Не найдены: '+esc(unknown.map(x=>x.name).join(', ')):'Все ингредиенты найдены'}</small></div></div><div class="pv-table-wrap"><table class="pv-table"><thead><tr><th>Ингредиент</th><th>Вес</th><th>Ккал</th><th>Б/Ж/У</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name)}${r.food?'':' <em>не найден</em>'}</td><td>${r.food?round(r.grams)+' г':'—'}</td><td>${r.food?round(r.food.kcal*r.grams/100):'—'}</td><td>${r.food?`${round(r.food.p*r.grams/100,1)} / ${round(r.food.f*r.grams/100,1)} / ${round(r.food.c*r.grams/100,1)}`:'—'}</td></tr>`).join('')}</tbody></table></div><p class="pv-disclaimer">Расчёт ориентировочный: пищевая ценность зависит от конкретного продукта, бренда, жирности и способа приготовления. Для медицинских целей используйте данные с упаковки или профессиональные базы.</p>`;};
  $('#pvNutCalc').onclick=run;$('#pvNutClear').onclick=()=>{$('#pvNutInput').value='';localStorage.removeItem('pvNutritionPrefill');$('#pvNutResult').innerHTML='';};if(saved)run();
}
function renderStorage(){const root=$('#pvStorageApp');if(!root)return;root.innerHTML=`<div class="pv-search"><input id="pvStorageInput" type="search" placeholder="Например: курица, яйца, суп, сыр"><button class="pv-btn" id="pvStorageGo">Найти</button></div><div id="pvStorageResult" class="pv-storage-grid"></div>`;const run=()=>{const q=norm($('#pvStorageInput').value),hits=STORAGE.map(x=>({x,score:[x.name,...x.aliases].reduce((s,a)=>Math.max(s,norm(a).includes(q)||q.includes(norm(a))?norm(a).length:0),0)})).filter(x=>q&&x.score).sort((a,b)=>b.score-a.score).slice(0,6);$('#pvStorageResult').innerHTML=hits.length?hits.map(({x})=>`<article class="pv-storage-card"><h3>${esc(x.name)}</h3><dl><div><dt>Холодильник</dt><dd>${esc(x.fridge)}</dd></div><div><dt>Морозилка</dt><dd>${esc(x.freezer)}</dd></div><div><dt>При комнатной температуре</dt><dd>${esc(x.room)}</dd></div></dl><p>${esc(x.note)}</p></article>`).join(''):`<div class="pv-empty">Точного совпадения пока нет. Попробуйте более общее название продукта.</div>`;};$('#pvStorageGo').onclick=run;$('#pvStorageInput').addEventListener('keydown',e=>{if(e.key==='Enter')run();});}
async function loadRecipes(){try{const r=await fetch('/data/recipe-index.json?v=20260925-tools1',{cache:'no-store'});if(r.ok)return await r.json();}catch{}return[];}
function tokenSet(s){return new Set(norm(s).split(/\s+/).filter(x=>x.length>2&&!['или','для','вкус','соль','перец','масло','вода'].includes(x)));}
function recipeScore(recipe,queries){const ing=(recipe.ingredients||[]).map(norm),matched=[],missing=[];for(const q of queries){const qn=norm(q),qt=[...tokenSet(qn)],ok=ing.some(i=>i.includes(qn)||qn.includes(i)||qt.every(t=>i.includes(t)));(ok?matched:missing).push(q);}const ratio=queries.length?matched.length/queries.length:0,extra=Math.max(0,(recipe.ingredients||[]).length-matched.length);return{score:ratio*100-extra*1.5,ratio,matched,missing};}
async function renderCook(){const root=$('#pvCookApp');if(!root)return;const recipes=await loadRecipes();root.innerHTML=`<div class="pv-search pv-cook-search"><input id="pvCookInput" type="search" placeholder="Например: курица, сыр, яйца"><button class="pv-btn" id="pvCookGo">Подобрать рецепты</button></div><div class="pv-chips"><button data-pv-preset="курица, сыр">курица + сыр</button><button data-pv-preset="картофель, грибы">картофель + грибы</button><button data-pv-preset="яблоки, творог">яблоки + творог</button><button data-pv-preset="тыква">тыква</button></div><div id="pvCookResult" class="pv-recipe-results"></div>`;const run=()=>{const queries=$('#pvCookInput').value.split(/,|;|\n/).map(x=>x.trim()).filter(Boolean),ranked=recipes.map(r=>({...recipeScore(r,queries),r})).filter(x=>x.matched.length).sort((a,b)=>b.score-a.score).slice(0,12);$('#pvCookResult').innerHTML=ranked.length?ranked.map(x=>`<a class="pv-recipe-card" href="${esc(x.r.url)}"><img src="${esc(x.r.image||'/assets/fallback-cover.svg')}" alt="" loading="lazy"><div><span>${Math.round(x.ratio*100)}% продуктов совпало</span><h3>${esc(x.r.headline)}</h3><p><b>Есть:</b> ${esc(x.matched.join(', '))}${x.missing.length?` · <b>Не хватает:</b> ${esc(x.missing.join(', '))}`:''}</p><small>${esc((x.r.ingredients||[]).slice(0,7).join(' · '))}</small></div></a>`).join(''):`<div class="pv-empty">Введите хотя бы один продукт — покажем рецепты ProVkus с максимальным совпадением.</div>`;};$('#pvCookGo').onclick=run;$('#pvCookInput').addEventListener('keydown',e=>{if(e.key==='Enter')run();});$$('[data-pv-preset]',root).forEach(b=>b.onclick=()=>{$('#pvCookInput').value=b.dataset.pvPreset;run();});}
async function injectRecipeWidget(){const kicker=norm($('.article-kicker')?.textContent||'');if(!kicker.includes('рецепт')||$('#pvRecipeTools'))return;const slug=location.pathname.split('/').pop().replace(/\.html$/,''),recipes=await loadRecipes(),recipe=recipes.find(x=>x.slug===slug),host=$('.article-body');if(!host)return;const box=document.createElement('section');box.id='pvRecipeTools';box.className='pv-recipe-tools';const ingredients=recipe?.ingredientLines||recipe?.ingredients||[];box.innerHTML=`<div class="pv-tools-kicker">Инструменты для этого рецепта</div><h2>Посчитать, сохранить и подобрать ещё</h2><div class="pv-inline-tools"><button data-tool="calories"><strong>Калории и БЖУ</strong><span>Посчитать этот рецепт</span></button><button data-tool="cook"><strong>Есть продукты?</strong><span>Найти похожие рецепты</span></button><button data-tool="storage"><strong>Сколько хранится?</strong><span>Проверить продукты</span></button></div>${ingredients.length?`<div class="pv-ingredient-chips">${ingredients.slice(0,12).map(x=>`<span>${esc(String(x).replace(/\s*[—–-].*$/,''))}</span>`).join('')}</div>`:''}`;host.insertAdjacentElement('afterend',box);$('[data-tool="calories"]',box).onclick=()=>{if(ingredients.length)localStorage.setItem('pvNutritionPrefill',ingredients.join('\n'));location.href='/calorie-calculator.html';};$('[data-tool="cook"]',box).onclick=()=>{const names=(recipe?.ingredients||[]).slice(0,6);localStorage.setItem('pvCookPrefill',names.join(', '));location.href='/what-to-cook.html';};$('[data-tool="storage"]',box).onclick=()=>location.href='/storage-guide.html';}
function hydrateCookPrefill(){const input=$('#pvCookInput'),v=localStorage.getItem('pvCookPrefill');if(input&&v){input.value=v;localStorage.removeItem('pvCookPrefill');$('#pvCookGo')?.click();}}
document.addEventListener('DOMContentLoaded',async()=>{renderNutrition();renderStorage();await renderCook();hydrateCookPrefill();await injectRecipeWidget();});
})();