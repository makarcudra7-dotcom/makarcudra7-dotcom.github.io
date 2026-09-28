(()=>{
  'use strict';
  if(window.__pvEditorialQualityPlus)return;window.__pvEditorialQualityPlus=true;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const posts=()=>window.store?.posts||[];
  const say=s=>typeof window.flash==='function'?window.flash(s):console.log(s);
  const PRODUCT_TEMPLATE='<h2>Что это за продукт</h2><p>Коротко опишите категорию, назначение и для кого продукт может быть интересен.</p><h2>Что проверяем</h2><ul><li>Состав и маркировка</li><li>Цена и масса/объём</li><li>Вкус, текстура или удобство использования</li><li>Условия хранения и срок годности</li></ul><h2>Что понравилось</h2><p></p><h2>Что стоит учитывать</h2><p></p><h2>Итог без маркетинга</h2><p>Сформулируйте практический вывод и отделите личное впечатление от проверяемых фактов.</p>';
  const STOP=new Set('и в во на по из к ко от до за для с со о об про как что это или но а у не мы вы он она они его ее её их уже еще ещё ли при без под над между после перед чем чем-то такой такая такие мой моя наш наша нашла нашел нашёл'.split(/\s+/));
  let imageCheckSeq=0,similarTimer=0;

  function installProductTemplate(){
    const sel=$('#pvTemplate');if(!sel||sel.querySelector('option[value="product"]'))return;
    const opt=document.createElement('option');opt.value='product';opt.textContent='Разбор продукта';sel.appendChild(opt);
    sel.addEventListener('change',e=>{
      if(e.target.value!=='product')return;
      e.stopImmediatePropagation();
      const rich=$('#richEditor');if(rich?.innerText?.trim()&&!confirm('Заменить текущий текст шаблоном разбора продукта?')){sel.value='';return}
      window.setEditorHTML?.(PRODUCT_TEMPLATE);if($('#type'))$('#type').value='guide';sel.value='';rich?.dispatchEvent(new Event('input',{bubbles:true}));say('Добавлен шаблон разбора продукта: отделяйте впечатление от проверяемых фактов.');
    },true);
  }

  function imageHint(){
    const image=$('#image');if(!image)return null;let hint=$('#pvImageQualityPlus');if(!hint){hint=document.createElement('div');hint.id='pvImageQualityPlus';hint.className='hint';image.closest('.field')?.appendChild(hint)}return hint;
  }
  function describeImage(w,h,error=false){
    const hint=imageHint();if(!hint)return;
    if(error){hint.textContent='Проверка изображения: URL или файл не удалось открыть.';hint.className='hint pv-q-bad';return}
    if(!w||!h){hint.textContent='';hint.className='hint';return}
    const ratio=w/h,ratioText=ratio.toFixed(2)+':1',large=w>=1200,landscape=ratio>=1.25&&ratio<=2.40;
    const parts=[`${w}×${h}px`,ratioText,large?'ширина подходит для Discover':'ширина меньше 1200px',landscape?'формат подходит для широкой обложки':'необычное соотношение сторон — проверьте кадрирование на карточках'];
    hint.textContent='Проверка изображения: '+parts.join(' · ');hint.className='hint '+(large&&landscape?'pv-q-ok':large?'pv-q-warn':'pv-q-bad');
  }
  function inspectImage(){
    const seq=++imageCheckSeq,file=$('#imageFile')?.files?.[0],url=$('#image')?.value?.trim();
    if(file){
      const reader=new FileReader();
      reader.onload=()=>{const img=new Image();img.onload=()=>{if(seq===imageCheckSeq)describeImage(img.naturalWidth,img.naturalHeight)};img.onerror=()=>{if(seq===imageCheckSeq)describeImage(0,0,true)};img.src=reader.result};
      reader.onerror=()=>{if(seq===imageCheckSeq)describeImage(0,0,true)};
      reader.readAsDataURL(file);return
    }
    if(!url){describeImage(0,0);return}
    if(!/^https:\/\//i.test(url)){describeImage(0,0,true);return}
    const img=new Image();img.onload=()=>{if(seq===imageCheckSeq)describeImage(img.naturalWidth,img.naturalHeight)};img.onerror=()=>{if(seq===imageCheckSeq)describeImage(0,0,true)};img.src=url+(url.includes('?')?'&':'?')+'pv-quality='+Date.now();
  }
  function installImageCheck(){const image=$('#image'),file=$('#imageFile');if(!image||image.dataset.pvQualityPlus)return;image.dataset.pvQualityPlus='1';image.addEventListener('input',()=>setTimeout(inspectImage,250));image.addEventListener('change',inspectImage);file?.addEventListener('change',inspectImage);inspectImage()}

  function tokens(text){return [...new Set(String(text||'').toLowerCase().replace(/ё/g,'е').match(/[а-яa-z0-9]{3,}/g)||[])].filter(x=>!STOP.has(x))}
  function similarity(a,b){const A=tokens(a),B=new Set(tokens(b));if(!A.length||!B.size)return 0;const hit=A.filter(x=>B.has(x)).length;return hit/Math.max(3,Math.min(A.length,B.size))}
  function renderSimilar(){
    const input=$('#headline'),hint=$('#pvDuplicateHint');if(!input||!hint)return;const title=input.value.trim();if(title.length<14){hint.textContent='';return}
    const current=($('#slug')?.value||'').trim();const scored=posts().filter(p=>p.slug!==current).map(p=>({p,score:Math.max(similarity(title,p.headline),similarity(title,[p.headline,p.category,...(p.tags||[])].join(' ')))})).filter(x=>x.score>=.34).sort((a,b)=>b.score-a.score).slice(0,3);
    hint.textContent=scored.length?'Похожие темы: '+scored.map(x=>`${x.p.headline} (${Math.round(x.score*100)}%)`).join(' · '):'';
  }
  function installSimilarity(){const input=$('#headline');if(!input||input.dataset.pvTopicSimilarity)return;input.dataset.pvTopicSimilarity='1';input.addEventListener('input',()=>{clearTimeout(similarTimer);similarTimer=setTimeout(renderSimilar,180)});renderSimilar()}

  function sourceHint(){const input=$('#source');if(!input)return null;let hint=$('#pvSourceQualityPlus');if(!hint){hint=document.createElement('div');hint.id='pvSourceQualityPlus';hint.className='hint';input.closest('.field')?.appendChild(hint)}return hint}
  function inspectSources(){
    const input=$('#source'),hint=sourceHint();if(!input||!hint)return;const raw=input.value.trim();if(!raw){hint.textContent='Внешние источники не обязательны для редакционного текста.';hint.className='hint';return}
    const urls=raw.match(/https?:\/\/[^\s<>"']+/gi)||[];const bad=urls.filter(u=>!/^https:\/\//i.test(u));
    if(!urls.length){hint.textContent='Источник указан без ссылки: проверьте, что читатель сможет открыть первоисточник.';hint.className='hint pv-q-warn';return}
    hint.textContent=`Источники: найдено ссылок ${urls.length}${bad.length?' · есть не-HTTPS ссылки':' · формат ссылок корректный'}`;hint.className='hint '+(bad.length?'pv-q-warn':'pv-q-ok');
  }
  function installSourceCheck(){const input=$('#source');if(!input||input.dataset.pvSourceCheck)return;input.dataset.pvSourceCheck='1';input.addEventListener('input',inspectSources);inspectSources()}

  function installStyles(){if($('#pvQualityPlusStyles'))return;const s=document.createElement('style');s.id='pvQualityPlusStyles';s.textContent='.pv-q-ok{color:#247044!important}.pv-q-warn{color:#81600d!important}.pv-q-bad{color:#a3342a!important;font-weight:700}';document.head.appendChild(s)}
  function init(){installStyles();installProductTemplate();installImageCheck();installSimilarity();installSourceCheck()}
  let tries=0,t=setInterval(()=>{init();if(++tries>180)clearInterval(t)},100);window.addEventListener('pv-admin-runtime-ready',init);
})();
