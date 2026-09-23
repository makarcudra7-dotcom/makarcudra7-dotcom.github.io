(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const letters=['А','Б','В','Г'];

  function escHtml(v=''){
    return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function escAttr(v=''){
    return escHtml(v).replace(/`/g,'&#96;');
  }
  function addEditorStyles(){
    if($('#quizAdminStyles'))return;
    const s=document.createElement('style');s.id='quizAdminStyles';s.textContent=`
      .quiz-admin-card[hidden]{display:none!important}.quiz-admin-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.quiz-admin-head p{margin:0;color:#74716a;font-size:13px}.quiz-question-editor{border:1px solid #dedbd3;border-radius:12px;padding:14px;margin:0 0 14px;background:#faf9f6}.quiz-question-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.quiz-question-top strong{font-size:15px}.quiz-remove{border:0;background:transparent;color:#a33;cursor:pointer;font-size:13px}.quiz-options-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.quiz-option-row{display:grid;grid-template-columns:32px 1fr;gap:7px;align-items:center}.quiz-option-row span{width:32px;height:32px;border-radius:50%;background:#ece9df;display:grid;place-items:center;font-weight:700}.quiz-admin-card textarea{min-height:76px}.quiz-admin-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.quiz-admin-tools .hint{margin:0}.quiz-after-block{margin-top:18px;padding-top:18px;border-top:1px solid #dedbd3}.quiz-after-block .rich-editor{min-height:150px}.quiz-after-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}@media(max-width:760px){.quiz-options-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  function ensureQuizOption(){
    const t=$('#type');if(!t)return;
    if(!t.querySelector('option[value="quiz"]'))t.add(new Option('Тест / викторина','quiz'));
  }
  function ensureEditor(){
    if($('#quizAdminCard'))return;
    const left=document.querySelector('#material .grid > div');if(!left)return;
    const card=document.createElement('div');card.className='card quiz-admin-card';card.id='quizAdminCard';card.hidden=true;
    card.innerHTML=`<div class="card-title">Тест / викторина</div><div class="card-body"><div class="quiz-admin-head"><p>Добавьте вопросы, четыре варианта ответа и отметьте правильный.</p><button type="button" class="btn soft" id="addQuizQuestion">+ Добавить вопрос</button></div><div id="quizQuestions"></div><div class="quiz-admin-tools"><span class="hint">После публикации читатель сможет выбрать ответы и получить итоговый результат.</span></div><div class="quiz-after-block"><div class="field"><label>Текст после теста</label><div class="quiz-after-toolbar"><button type="button" class="btn soft" data-inline-photo-target="#quizAfterEditor">📷 Фото с компьютера</button><span class="hint">Необязательно. Можно добавить вывод, пояснение, ссылки или дополнительный текст после вопросов.</span></div><div id="quizAfterEditor" class="rich-editor quiz-after-content-editor" contenteditable="true"><p></p></div></div></div></div>`;
    left.appendChild(card);
    $('#addQuizQuestion').onclick=()=>addQuestion();
  }
  function questionTemplate(data={},index=0){
    const opts=Array.isArray(data.options)?data.options.slice(0,4):[];while(opts.length<4)opts.push('');
    const correct=Number.isInteger(Number(data.correct))?Math.min(3,Math.max(0,Number(data.correct))):0;
    return `<div class="quiz-question-editor" data-quiz-question><div class="quiz-question-top"><strong>Вопрос <span class="quiz-num">${index+1}</span></strong><button type="button" class="quiz-remove">Удалить</button></div><div class="field"><label>Текст вопроса</label><input class="quiz-question-text" value="${escAttr(data.question||'')}" placeholder="Например: При какой температуре лучше хранить яйца?"></div><div class="quiz-options-grid">${opts.map((v,i)=>`<label class="quiz-option-row"><span>${letters[i]}</span><input class="quiz-option" data-option="${i}" value="${escAttr(v)}" placeholder="Вариант ${letters[i]}"></label>`).join('')}</div><div class="form-grid" style="margin-top:12px"><div class="field"><label>Правильный ответ</label><select class="quiz-correct">${letters.map((l,i)=>`<option value="${i}"${i===correct?' selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label>Пояснение после проверки</label><textarea class="quiz-explanation" placeholder="Почему этот ответ правильный">${escHtml(data.explanation||'')}</textarea></div></div></div>`;
  }
  function renumber(){
    $$('#quizQuestions [data-quiz-question]').forEach((q,i)=>{const n=q.querySelector('.quiz-num');if(n)n.textContent=i+1});
  }
  function addQuestion(data={}){
    const box=$('#quizQuestions');if(!box)return;
    const wrap=document.createElement('div');wrap.innerHTML=questionTemplate(data,box.children.length);const node=wrap.firstElementChild;box.appendChild(node);
    node.querySelector('.quiz-remove').onclick=()=>{node.remove();renumber()};
  }
  function renderQuiz(quiz){
    const box=$('#quizQuestions');if(!box)return;box.innerHTML='';
    const qs=quiz&&Array.isArray(quiz.questions)?quiz.questions:[];
    qs.forEach(addQuestion);if(!qs.length&&$('#type')?.value==='quiz')addQuestion();
    const after=$('#quizAfterEditor');if(after)after.innerHTML=quiz?.afterContent||'<p></p>';
  }
  function readQuiz(){
    return {questions:$$('#quizQuestions [data-quiz-question]').map(q=>({
      question:q.querySelector('.quiz-question-text')?.value.trim()||'',
      options:[...q.querySelectorAll('.quiz-option')].map(x=>x.value.trim()),
      correct:Number(q.querySelector('.quiz-correct')?.value||0),
      explanation:q.querySelector('.quiz-explanation')?.value.trim()||''
    })),afterContent:$('#quizAfterEditor')?.innerHTML||''};
  }
  function validateQuiz(quiz){
    if(!quiz?.questions?.length)return 'Добавьте хотя бы один вопрос в тест';
    for(let i=0;i<quiz.questions.length;i++){
      const q=quiz.questions[i];
      if(!q.question)return `Заполните текст вопроса ${i+1}`;
      if(!Array.isArray(q.options)||q.options.length!==4||q.options.some(x=>!String(x).trim()))return `Заполните все 4 варианта ответа у вопроса ${i+1}`;
      if(q.correct<0||q.correct>3)return `Выберите правильный ответ у вопроса ${i+1}`;
    }
    return '';
  }
  function publicQuizMarkup(quiz){
    if(!quiz?.questions?.length)return'';
    return `<section class="pv-quiz" data-pv-quiz><div class="pv-quiz-head"><div class="article-kicker">Тест</div><h2>Проверьте себя</h2><p>Выберите один вариант ответа в каждом вопросе, затем нажмите «Проверить ответы».</p></div>${quiz.questions.map((q,qi)=>`<fieldset class="pv-quiz-question" data-correct="${Number(q.correct)}" data-explanation="${escAttr(q.explanation||'')}"><legend>${qi+1}. ${escHtml(q.question)}</legend><div class="pv-quiz-options">${q.options.map((opt,oi)=>`<label class="pv-quiz-option"><input type="radio" name="pvq${qi}" value="${oi}"><span><b>${letters[oi]}.</b> ${escHtml(opt)}</span></label>`).join('')}</div><div class="pv-quiz-feedback" aria-live="polite"></div></fieldset>`).join('')}<button type="button" class="pv-quiz-check">Проверить ответы</button><div class="pv-quiz-score" aria-live="polite"></div></section>`;
  }
  function injectQuiz(html,quiz){
    if(!html||!quiz?.questions?.length)return html;
    if(!html.includes('quiz.css'))html=html.replace('</head>','<link rel="stylesheet" href="../assets/quiz.css"></head>');
    if(!html.includes('data-pv-quiz')){
      const after=quiz.afterContent&&quiz.afterContent.replace(/<p>(?:<br>)?<\/p>/gi,'').trim()?`<div class="quiz-after-content">${quiz.afterContent}</div>`:'';
      html=html.replace('</div></article>',publicQuizMarkup(quiz)+after+'</div></article>');
    }
    if(!html.includes('quiz.js'))html=html.replace('</body>','<script src="../assets/quiz.js"></script></body>');
    return html;
  }
  function toggleQuiz(){
    const quiz=$('#quizAdminCard'),on=$('#type')?.value==='quiz';if(quiz)quiz.hidden=!on;
    if(on&&!$('#quizQuestions')?.children.length)addQuestion();
  }
  function wrapPublish(id){
    const b=$(id);if(!b||b.dataset.quizWrapped==='1'||typeof b.onclick!=='function')return;
    const base=b.onclick;b.dataset.quizWrapped='1';
    b.onclick=function(e){if($('#type')?.value==='quiz'){const msg=validateQuiz(readQuiz());if(msg){if(typeof flash==='function')flash(msg);return false}}return base.call(this,e)};
  }
  function loadExtras(){
    if(document.querySelector('script[data-admin-editor-extras]'))return;
    const s=document.createElement('script');s.src='assets/admin-editor-extras.js?v=20260923-alt';s.dataset.adminEditorExtras='1';document.body.appendChild(s);
  }
  function install(){
    addEditorStyles();ensureEditor();ensureQuizOption();
    const type=$('#type');type?.addEventListener('change',toggleQuiz);toggleQuiz();

    if(typeof window.collect==='function'&&!window.collect.__quizWrapped){
      const base=window.collect;const wrapped=function(){const o=base();o.quiz=readQuiz();return o};wrapped.__quizWrapped=true;window.collect=wrapped;
    }
    if(typeof window.fill==='function'&&!window.fill.__quizWrapped){
      const base=window.fill;const wrapped=function(o={}){base(o);ensureQuizOption();if(o.type&&$('#type'))$('#type').value=o.type;renderQuiz(o.quiz);toggleQuiz()};wrapped.__quizWrapped=true;window.fill=wrapped;
    }
    if(typeof window.putFile==='function'&&!window.putFile.__quizWrapped){
      const base=window.putFile;const wrapped=async function(path,content,message,encoding='utf-8'){
        const o=typeof window.collect==='function'?window.collect():{};
        if(/^articles\/.+\.html$/.test(path)&&o.type==='quiz'){
          content=injectQuiz(content,o.quiz);
          if(typeof window.processInlineImagesInHtml==='function')content=await window.processInlineImagesInHtml(content,o.slug||'test');
        }
        if(path==='data/posts.json'&&o.type==='quiz'){
          try{const posts=JSON.parse(content),p=posts.find(x=>x.slug===o.slug);if(p){p.type='quiz';p.typeLabel='Тест / викторина';p.quizCount=o.quiz?.questions?.length||0}content=JSON.stringify(posts,null,2)}catch(e){}
        }
        return base(path,content,message,encoding);
      };wrapped.__quizWrapped=true;window.putFile=wrapped;
    }
    const preview=$('#previewBtn');if(preview){preview.onclick=()=>{const o=window.collect(),img=o.image||'assets/fallback-cover.svg';let html=typeof window.articleHTML==='function'?window.articleHTML(o,img):'';if(o.type==='quiz')html=injectQuiz(html,o.quiz);const w=open('','_blank');w.document.write(html);w.document.close()}}
    wrapPublish('#publishBtn');
    if(window.store?.draft?.quiz){renderQuiz(window.store.draft.quiz);if(window.store.draft.type==='quiz'&&type)type.value='quiz';toggleQuiz()}
    loadExtras();
  }

  let tries=0;const timer=setInterval(()=>{
    tries++;
    const ready=$('#type')?.querySelector('option[value="guide"]')&&typeof window.collect==='function'&&typeof window.putFile==='function'&&typeof $('#publishBtn')?.onclick==='function';
    if(ready){clearInterval(timer);install()}else if(tries>200)clearInterval(timer);
  },50);
})();