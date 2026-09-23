(()=>{
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const DRAFTS_KEY='provkusCmsDraftsV2';
  let activeDraftId='';
  let lastRange=null;
  let targetEditor=null;

  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readDrafts=()=>{try{return JSON.parse(localStorage.getItem(DRAFTS_KEY)||'[]')}catch{return[]}};
  const writeDrafts=d=>localStorage.setItem(DRAFTS_KEY,JSON.stringify(d));
  const fmt=d=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(d))}catch{return d||''}};

  function installStyles(){
    if($('#pvCmsExtrasStyles'))return;
    const s=document.createElement('style');s.id='pvCmsExtrasStyles';s.textContent=`
      .status.draft{background:#fff1bf;color:#765500;border:1px solid #e8cb69}.draft-badge{display:inline-flex;align-items:center;gap:6px;font-weight:700}.draft-actions{display:flex;gap:6px;flex-wrap:wrap}.draft-local{font-size:11px;color:#8b8069;margin-top:4px}.inline-photo-btn{white-space:nowrap}.quiz-after-content-editor{min-height:150px}.article-inline-image{margin:22px 0}.article-inline-image img{display:block;max-width:100%;height:auto;border-radius:12px}.article-inline-image figcaption{font-size:13px;color:#777;margin-top:6px}
    `;document.head.appendChild(s);
  }

  async function compressImage(file){
    const bmp=await createImageBitmap(file);
    const max=1400, scale=Math.min(1,max/Math.max(bmp.width,bmp.height));
    const w=Math.max(1,Math.round(bmp.width*scale)), h=Math.max(1,Math.round(bmp.height*scale));
    const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(bmp,0,0,w,h);bmp.close?.();
    const blob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Не удалось подготовить фото')),'image/jpeg',.84));
    return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob)});
  }

  function rememberRange(){
    const sel=getSelection();if(!sel||!sel.rangeCount)return;
    const r=sel.getRangeAt(0), node=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;
    const ed=node?.closest?.('#richEditor,#quizAfterEditor');
    if(ed){lastRange=r.cloneRange();targetEditor=ed}
  }
  document.addEventListener('selectionchange',rememberRange);

  function restoreRange(editor){
    const sel=getSelection();sel.removeAllRanges();
    if(lastRange&&editor.contains(lastRange.commonAncestorContainer)){sel.addRange(lastRange);return}
    const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);sel.addRange(r)
  }
  async function insertLocalPhotos(files,editor){
    if(!editor||!files?.length)return;
    editor.focus();restoreRange(editor);
    for(const file of files){
      if(!file.type.startsWith('image/'))continue;
      const data=await compressImage(file);
      const description=prompt('Опишите, что изображено на фото (ALT). Для декоративного фото оставьте поле пустым:','');
      const alt=esc((description||'').trim());
      document.execCommand('insertHTML',false,`<figure class="article-inline-image"><img src="${data}" alt="${alt}"><figcaption></figcaption></figure><p><br></p>`);
    }
    rememberRange();editor.dispatchEvent(new Event('input',{bubbles:true}));
    if(typeof flash==='function')flash('Фото вставлено в текст')
  }

  function setupInlinePhotoPicker(){
    if($('#inlineArticlePhoto'))return;
    const input=document.createElement('input');input.type='file';input.accept='image/*';input.multiple=true;input.id='inlineArticlePhoto';input.hidden=true;document.body.appendChild(input);
    input.onchange=async()=>{try{await insertLocalPhotos([...input.files],targetEditor||$('#richEditor'))}catch(e){flash?.(e.message)}finally{input.value=''}};
    const main=$('#imageBtn');if(main){main.textContent='📷 Фото';main.title='Вставить фото с компьютера в текст';main.classList.add('inline-photo-btn');main.onclick=()=>{targetEditor=$('#richEditor');rememberRange();input.click()}}
    document.addEventListener('click',e=>{
      const b=e.target.closest?.('[data-inline-photo-target]');if(!b)return;
      const ed=$(b.dataset.inlinePhotoTarget);if(ed){targetEditor=ed;rememberRange();input.click()}
    });
  }

  function saveDraft(exitAfter=false){
    try{
      const data=window.collect();
      const drafts=readDrafts();
      const id=data._draftId||activeDraftId||('draft-'+Date.now());
      data._draftId=id;activeDraftId=id;
      const rec={id,headline:data.headline||'Без названия',slug:data.slug||'',updatedAt:new Date().toISOString(),data};
      const next=[rec,...drafts.filter(x=>x.id!==id)];
      writeDrafts(next);
      if(typeof store!=='undefined'){store.draft=data;saveStore?.()}
      window.renderPosts?.();
      flash?.('Черновик сохранён — на сайт не опубликован');
      if(exitAfter)document.querySelector('.nav-btn[data-target="publications"]')?.click();
    }catch(e){
      if(e?.name==='QuotaExceededError')flash?.('Черновик слишком большой для браузера. Уменьшите число фото или сохраните часть текста отдельно.');
      else flash?.(e.message||'Не удалось сохранить черновик')
    }
  }

  function removeDraft(id,slug){
    const next=readDrafts().filter(x=>x.id!==id && (!slug||x.slug!==slug));writeDrafts(next);
    if(activeDraftId===id)activeDraftId='';
    if(typeof store!=='undefined'&&store.draft?._draftId===id){store.draft=null;saveStore?.()}
    window.renderPosts?.();
  }
  window.removeLocalDraft=(id,slug)=>removeDraft(id,slug);

  function editDraft(id){
    const rec=readDrafts().find(x=>x.id===id);if(!rec)return;
    activeDraftId=id;const data={...rec.data,_draftId:id};
    if(typeof store!=='undefined'){store.draft=data;saveStore?.()}
    window.fill?.(data);
    document.querySelector('.nav-btn[data-target="material"]')?.click();
    flash?.('Черновик открыт для редактирования')
  }

  function enhanceDraftList(){
    if(typeof window.renderPosts!=='function'||window.renderPosts.__draftWrapped)return;
    const base=window.renderPosts;
    const wrapped=function(){
      base();
      const tb=$('#postsTable'), drafts=readDrafts();if(!tb||!drafts.length)return;
      const placeholder=tb.querySelector('tr td[colspan]');if(placeholder)placeholder.closest('tr')?.remove();
      const rows=drafts.map(d=>`<tr class="draft-row" data-draft-id="${esc(d.id)}"><td><div class="draft-badge">${esc(d.headline||'Без названия')}</div><div class="draft-local">сохранён локально ${esc(fmt(d.updatedAt))}</div></td><td><span class="status draft">Черновик</span></td><td>${esc(d.data?.author||'')}</td><td>${esc(fmt(d.updatedAt))}</td><td>—</td><td><div class="draft-actions"><button type="button" class="btn soft" data-edit-draft="${esc(d.id)}">Редактировать</button><button type="button" class="btn" data-delete-draft="${esc(d.id)}">Удалить</button></div></td></tr>`).join('');
      tb.insertAdjacentHTML('afterbegin',rows);
      $$('[data-edit-draft]').forEach(b=>b.onclick=()=>editDraft(b.dataset.editDraft));
      $$('[data-delete-draft]').forEach(b=>b.onclick=()=>{if(confirm('Удалить этот черновик?'))removeDraft(b.dataset.deleteDraft,'')});
    };
    wrapped.__draftWrapped=true;window.renderPosts=wrapped;window.renderPosts();
  }

  function setupDraftButtons(){
    const save=$('#saveBtn');if(save){save.disabled=false;save.textContent='Сохранить черновик';save.title='Сохранить локально, без публикации';save.onclick=()=>saveDraft(false)}
    const exit=$('#saveExitBtn');if(exit){exit.disabled=false;exit.textContent='Сохранить черновик и выйти';exit.onclick=()=>saveDraft(true)}
    $('#newArticleBtn')?.addEventListener('click',()=>{activeDraftId=''},true);
  }

  function makeSourceOptional(){
    const src=$('#source');if(src){const label=src.closest('.field')?.querySelector('label');if(label)label.textContent='Источники: организация, материал и ссылка (для безопасности еды — минимум 3)'}
    $$('.checklist .check span:last-child').forEach(x=>{if(/оригинальность и источник/i.test(x.textContent))x.textContent='Проверить оригинальность; источник указать при наличии.'});
    const btn=$('#publishBtn');if(!btn||btn.__sourceOptionalWrapped||typeof btn.onclick!=='function')return;
    const base=btn.onclick;btn.__sourceOptionalWrapped=true;
    btn.onclick=async function(e){
      const source=$('#source'),blank=source&&!source.value.trim(),draftId=activeDraftId||window.collect?._draftId;
      if(blank){window.__pvOptionalSourceBlank=true;source.value=' '}
      let result=false;
      try{result=await base.call(this,e);return result}
      finally{
        if(blank){source.value='';window.__pvOptionalSourceBlank=false}
        if(result===true){const o=window.collect?.()||{};removeDraft(activeDraftId||o._draftId,o.slug||'');activeDraftId=''}
      }
    }
  }

  function b64Name(slug,i,mime){const ext=/png/i.test(mime)?'png':/webp/i.test(mime)?'webp':'jpg';return `assets/uploads/${String(slug||'material').replace(/[^a-z0-9-]/gi,'-')}-inline-${Date.now()}-${i}.${ext}`}
  let rawPutFile=null;
  window.processInlineImagesInHtml=async function(html,slug){
    if(!html||!rawPutFile)return html;
    const re=/src=(["'])(data:image\/(?:jpeg|jpg|png|webp);base64,[^"']+)\1/gi;
    const found=[];let m;while((m=re.exec(html)))if(!found.includes(m[2]))found.push(m[2]);
    for(let i=0;i<found.length;i++){
      const data=found[i],mime=(data.match(/^data:([^;]+)/)||[])[1]||'image/jpeg',path=b64Name(slug,i,mime),base64=data.split(',')[1]||'';
      await rawPutFile(path,base64,`Upload inline image: ${slug||'material'}`,'base64');
      html=html.split(data).join('https://provkus-media.ru/'+path);
    }
    return html
  };

  function wrapPutFile(){
    if(typeof window.putFile!=='function'||window.putFile.__inlineWrapped)return;
    const base=window.putFile;rawPutFile=base;
    const wrapped=async function(path,content,message,encoding='utf-8'){
      if(/^articles\/.+\.html$/.test(path)&&encoding!=='base64'){
        const o=window.collect?.()||{},slug=o.slug||path.split('/').pop().replace(/\.html$/,'');
        content=await window.processInlineImagesInHtml(content,slug);
        if(window.__pvOptionalSourceBlank)content=content.replace(/<div class="note"><strong>Источник:<\/strong>\s*<\/div>/gi,'');
      }
      return base(path,content,message,encoding)
    };
    wrapped.__inlineWrapped=true;window.putFile=wrapped
  }

  function init(){
    installStyles();setupInlinePhotoPicker();setupDraftButtons();enhanceDraftList();makeSourceOptional();wrapPutFile();
  }
  let n=0,t=setInterval(()=>{n++;if(typeof window.collect==='function'&&typeof window.putFile==='function'&&$('#saveBtn')&&$('#publishBtn')){clearInterval(t);init()}else if(n>100)clearInterval(t)},50);
})();
