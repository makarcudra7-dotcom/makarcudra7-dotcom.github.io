(()=>{
  const $=s=>document.querySelector(s);
  function resize(delta){const ed=$('#sourceEditor')?.hidden!==false?$('#richEditor'):$('#sourceEditor');if(!ed)return;const h=Math.max(220,Math.min(Math.round(window.innerHeight*.72),ed.getBoundingClientRect().height+delta));ed.style.height=h+'px';ed.scrollIntoView({block:'nearest'})}
  function install(){const bar=$('#editorToolbar');if(!bar||$('#editorSizeTools'))return;const tools=document.createElement('span');tools.id='editorSizeTools';tools.className='editor-size-tools';tools.innerHTML='<span class="editor-size-hint">Поле можно тянуть за нижний край</span><button type="button" id="editorSmaller" title="Уменьшить поле текста">− поле</button><button type="button" id="editorLarger" title="Увеличить поле текста">+ поле</button>';bar.appendChild(tools);$('#editorSmaller').onclick=()=>resize(-100);$('#editorLarger').onclick=()=>resize(100)}
  let n=0,t=setInterval(()=>{if(++n>100)return clearInterval(t);if($('#editorToolbar')&&$('#richEditor')){clearInterval(t);install()}},50)
})();
