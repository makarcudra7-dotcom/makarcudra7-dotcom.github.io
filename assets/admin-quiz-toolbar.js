(()=>{
  const $=s=>document.querySelector(s);
  let savedRange=null, sourceMode=false;

  function rememberSelection(){
    const ed=$('#quizAfterEditor'),sel=getSelection();
    if(!ed||!sel?.rangeCount)return;
    const r=sel.getRangeAt(0),node=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;
    if(node?.closest?.('#quizAfterEditor'))savedRange=r.cloneRange();
  }
  document.addEventListener('selectionchange',rememberSelection);

  function restoreSelection(){
    const ed=$('#quizAfterEditor');if(!ed)return;
    ed.focus();
    const sel=getSelection();sel.removeAllRanges();
    if(savedRange&&ed.contains(savedRange.commonAncestorContainer)){sel.addRange(savedRange);return}
    const r=document.createRange();r.selectNodeContents(ed);r.collapse(false);sel.addRange(r);
  }
  function cmd(name,value=null){restoreSelection();document.execCommand(name,false,value);rememberSelection();$('#quizAfterEditor')?.dispatchEvent(new Event('input',{bubbles:true}))}
  function markup(){
    return `<div class="editor-toolbar quiz-after-editor-toolbar" id="quizAfterToolbar">
      <button type="button" data-qcmd="undo" title="Отменить">↶</button><button type="button" data-qcmd="redo" title="Повторить">↷</button><span class="sep"></span>
      <select id="quizAfterBlockFormat" title="Формат абзаца"><option value="P">Абзац</option><option value="H2">H2</option><option value="H3">H3</option><option value="H4">H4</option><option value="BLOCKQUOTE">Цитата</option></select>
      <select id="quizAfterFontName" title="Шрифт"><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Verdana">Verdana</option><option value="Tahoma">Tahoma</option></select>
      <select id="quizAfterFontSize" title="Размер"><option value="2">Мелкий</option><option value="3" selected>Обычный</option><option value="4">Крупный</option><option value="5">Очень крупный</option></select><span class="sep"></span>
      <button type="button" data-qcmd="bold" title="Жирный"><b>B</b></button><button type="button" data-qcmd="italic" title="Курсив"><i>I</i></button><button type="button" data-qcmd="underline" title="Подчёркивание"><u>U</u></button><button type="button" data-qcmd="strikeThrough" title="Зачёркивание"><s>S</s></button>
      <button type="button" data-qcmd="insertUnorderedList" title="Маркированный список">• список</button><button type="button" data-qcmd="insertOrderedList" title="Нумерованный список">1. список</button>
      <button type="button" data-qcmd="outdent" title="Уменьшить отступ">⇤</button><button type="button" data-qcmd="indent" title="Увеличить отступ">⇥</button>
      <button type="button" data-qcmd="justifyLeft" title="По левому краю">≡</button><button type="button" data-qcmd="justifyCenter" title="По центру">≣</button><button type="button" data-qcmd="justifyRight" title="По правому краю">≡→</button><button type="button" data-qcmd="justifyFull" title="По ширине">☰</button>
      <button type="button" id="quizAfterLinkBtn" title="Добавить ссылку">🔗</button><button type="button" data-qcmd="unlink" title="Удалить ссылку">⛓</button>
      <button type="button" data-inline-photo-target="#quizAfterEditor" title="Фото с компьютера">📷 Фото</button><button type="button" data-qcmd="insertHorizontalRule" title="Разделитель">―</button><button type="button" data-qcmd="removeFormat" title="Очистить форматирование">Tx</button>
      <button type="button" id="quizAfterSourceBtn" title="Редактировать HTML">HTML</button>
    </div><textarea id="quizAfterSourceEditor" class="source-editor" hidden></textarea><div class="hint" style="margin-top:7px">Необязательно. Этот текст появится после результатов теста.</div>`;
  }
  function install(){
    const old=$('.quiz-after-toolbar'),ed=$('#quizAfterEditor');if(!old||!ed||$('#quizAfterToolbar'))return false;
    old.outerHTML=markup();
    $('#quizAfterToolbar').querySelectorAll('[data-qcmd]').forEach(b=>b.onclick=e=>{e.preventDefault();cmd(b.dataset.qcmd)});
    $('#quizAfterBlockFormat').onchange=e=>cmd('formatBlock',e.target.value);
    $('#quizAfterFontName').onchange=e=>cmd('fontName',e.target.value);
    $('#quizAfterFontSize').onchange=e=>cmd('fontSize',e.target.value);
    $('#quizAfterLinkBtn').onclick=e=>{e.preventDefault();const u=prompt('URL ссылки','https://');if(u)cmd('createLink',u)};
    const src=$('#quizAfterSourceEditor');
    src.oninput=()=>{ed.innerHTML=src.value;ed.dispatchEvent(new Event('input',{bubbles:true}))};
    $('#quizAfterSourceBtn').onclick=e=>{
      e.preventDefault();
      if(!sourceMode){src.value=ed.innerHTML;ed.hidden=true;src.hidden=false;src.focus()}else{ed.innerHTML=src.value;src.hidden=true;ed.hidden=false;ed.focus()}
      sourceMode=!sourceMode;
    };
    ed.addEventListener('keyup',rememberSelection);ed.addEventListener('mouseup',rememberSelection);ed.addEventListener('focus',rememberSelection);
    return true;
  }
  let tries=0,t=setInterval(()=>{tries++;if(install()||tries>200)clearInterval(t)},50);
})();