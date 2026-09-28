(()=>{
  'use strict';
  if(window.__pvEditorialCheck)return;window.__pvEditorialCheck=true;
  const $=s=>document.querySelector(s);
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url=s=>{try{const u=new URL(String(s||'').trim());return u.protocol==='https:'?u.href:''}catch{return''}};
  const fields=['mode','tester','testedAt','minutes','result','adjustment','sourceUrl','sourceNote','realPhoto','aiImage','confirmed'];
  function value(){const v={};for(const id of fields){const el=$('#pvCheck-'+id);v[id]=id==='aiImage'||id==='confirmed'?!!el?.checked:(el?.value||'').trim()}return v}
  function set(v={}){for(const id of fields){const el=$('#pvCheck-'+id);if(!el)continue;if(id==='aiImage'||id==='confirmed')el.checked=!!v[id];else el.value=v[id]||''}paint()}
  function paint(){const mode=$('#pvCheck-mode')?.value||'';$('#pvCheck-kitchen').hidden=mode!=='kitchen';$('#pvCheck-sources').hidden=mode!=='sources';const photo=$('#pvCheck-aiImage')?.checked;$('#pvCheck-imageHint').textContent=photo?'Под обложкой будет указано «ProVkus». Аватар автора остаётся рядом с именем; он не подтверждает готовку.':'Если обложка создана ИИ, отметьте это здесь.'}
  function error(v,photoSource=$('#photoSource')?.value){if(v.aiImage&&!String(photoSource||'').trim())return 'Для обложки укажите источник фото: «ProVkus»';
    if(v.mode==='sources'&&(!url(v.sourceUrl)||v.sourceNote.length<30||!v.confirmed))return 'Для сверки по источникам нужны HTTPS-ссылка, вывод от 30 символов и подтверждение проверки';
    if(v.mode==='kitchen'&&(!v.tester||!v.testedAt||!Number(v.minutes)||Number(v.minutes)<=0||v.result.length<40||!v.confirmed))return 'Для кухонной проверки укажите исполнителя, дату, фактические минуты, наблюдения от 40 символов и подтверждение';
    if(v.realPhoto&&!url(v.realPhoto))return 'Ссылка на реальное фото должна начинаться с HTTPS';return''}
  function insert(){const main=$('#material .grid > div:first-child');if(!main||$('#pvEditorialCheck'))return;
    const card=document.createElement('div');card.className='card';card.id='pvEditorialCheck';card.innerHTML=`<div class="card-title">Проверка материала</div><div class="card-body">
      <div class="field"><label for="pvCheck-mode">Статус проверки</label><select id="pvCheck-mode"><option value="">Редакционный материал</option><option value="sources">Проверено редакцией — значимые рекомендации</option><option value="kitchen">На кухне ProVkus</option></select><div class="hint">Для материалов, где ошибка может повлиять на здоровье, безопасность пищи или безопасное хранение, выберите редакционную проверку и укажите профильный источник.</div></div>
      <div id="pvCheck-sources" hidden><div class="field"><label for="pvCheck-sourceUrl">Основной источник (HTTPS)</label><input id="pvCheck-sourceUrl" type="url" placeholder="https://..."></div><div class="field"><label for="pvCheck-sourceNote">Что именно сверили</label><textarea id="pvCheck-sourceNote" placeholder="Ингредиенты, время и безопасная температура — укажите конкретный вывод"></textarea></div></div>
      <div id="pvCheck-kitchen" hidden><div class="form-grid"><div class="field"><label for="pvCheck-tester">Кто приготовил</label><input id="pvCheck-tester" placeholder="Имя автора или редактора"></div><div class="field"><label for="pvCheck-testedAt">Дата готовки</label><input id="pvCheck-testedAt" type="date"></div></div><div class="field"><label for="pvCheck-minutes">Фактическое время, мин</label><input id="pvCheck-minutes" type="number" min="1" step="1"></div><div class="field"><label for="pvCheck-result">Что получилось и как проверили готовность</label><textarea id="pvCheck-result" placeholder="Текстура, температура, выход и наблюдения по шагам"></textarea></div><div class="field"><label for="pvCheck-adjustment">Что изменили после пробы</label><textarea id="pvCheck-adjustment" placeholder="Необязательно, если рецепт получился без корректировок"></textarea></div><div class="field"><label for="pvCheck-realPhoto">Реальное фото процесса или блюда (HTTPS, при наличии)</label><input id="pvCheck-realPhoto" type="url" placeholder="https://..."></div></div>
      <label style="display:block;margin:12px 0"><input id="pvCheck-aiImage" type="checkbox"> Обложка создана ИИ</label><div class="hint" id="pvCheck-imageHint"></div>
      <label style="display:block;margin:12px 0"><input id="pvCheck-confirmed" type="checkbox"> Подтверждаю, что указанные сведения проверены человеком</label>
      <div class="hint" id="pvCheck-status" role="status" aria-live="polite"></div></div>`;
    main.insertBefore(card,main.children[1]||null);card.addEventListener('input',paint);card.addEventListener('change',paint);
    $('#pvCheck-aiImage').addEventListener('change',e=>{const credit=$('#photoSource');if(e.target.checked&&credit&&!credit.value.trim()){credit.value='ProVkus';credit.dispatchEvent(new Event('input',{bubbles:true}))}});
    paint();
  }
  function publicHtml(v){if(!v.mode)return'';const items=v.mode==='kitchen'
      ?`<strong>На кухне ProVkus</strong><p>Готовил(а): ${esc(v.tester)} · ${esc(v.testedAt)} · фактическое время ${esc(v.minutes)} мин.</p><p>${esc(v.result)}</p>${v.adjustment?`<p>После пробы: ${esc(v.adjustment)}</p>`:''}${v.realPhoto?`<p><a href="${esc(url(v.realPhoto))}" rel="noopener">Реальное фото приготовления</a></p>`:''}`
      :`<strong>Проверено редакцией</strong><p>${esc(v.sourceNote)}</p><p><a href="${esc(url(v.sourceUrl))}" rel="noopener nofollow">Источник проверки</a></p>`;
    return `<aside class="pv-editorial-check" aria-label="Проверка материала" style="padding:18px;margin:24px 0;background:#f4f8f3;border-left:4px solid #39805f;border-radius:8px">${items}</aside>`}
  function decorate(html,v,o){if(!v?.mode&&!v?.aiImage)return html;const err=error(v,o?.photoSource);if(err)throw Error(err);
    if(v.mode)html=html.replace('<div class="article-body">','<div class="article-body">'+publicHtml(v));
    if(v.aiImage)html=html.replace(/(<img class="article-cover"[^>]*>)/,'$1<div class="photo-credit">ProVkus</div>');
    const data=JSON.stringify(v).replace(/</g,'\\u003c');return html.replace('</article>',`<script type="application/json" id="pv-editorial-check-data">${data}</script></article>`)
  }
  function wrap(){if(typeof window.collect!=='function'||typeof window.fill!=='function'||typeof window.articleHTML!=='function')return false;
    const collect=window.collect,fill=window.fill,render=window.articleHTML;
    window.collect=function(){const o=collect.apply(this,arguments);o.editorialCheck=value();return o};
    window.fill=function(o){const out=fill.apply(this,arguments);set(o?.editorialCheck||{});return out};
    window.articleHTML=function(o,img){return decorate(render.call(this,o,img),o.editorialCheck||value(),o)};
    if(typeof window.putFile==='function'){
      const put=window.putFile;
      window.putFile=async function(path,content,message,encoding='utf-8'){
        if(path==='data/posts.json'&&encoding!=='base64'&&!window.__pvListMutation){
          try{const posts=JSON.parse(content),o=window.collect(),p=posts.find(x=>x.slug===o.slug);
            if(p&&o.editorialCheck)p.editorialCheck=o.editorialCheck;
            content=JSON.stringify(posts,null,2)+'\n'
          }catch(e){console.warn('Editorial check metadata:',e)}
        }
        return put(path,content,message,encoding)
      }
    }
    document.addEventListener('click',e=>{if(!e.target.closest?.('#publishBtn,#scheduleBtn,#savePublishedBtn'))return;const err=error(value());if(err){e.preventDefault();e.stopImmediatePropagation();$('#pvCheck-status').textContent=err;window.flash?.(err)}else $('#pvCheck-status').textContent=''},true);
    return true
  }
  let tries=0,t=setInterval(()=>{if($('#material')&&typeof window.collect==='function'&&typeof window.articleHTML==='function'){clearInterval(t);insert();wrap()}else if(++tries>240)clearInterval(t)},50);
})();
