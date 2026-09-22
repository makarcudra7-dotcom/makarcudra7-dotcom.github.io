(()=>{
  const escCredit=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  if(typeof articleHTML==='function'){
    const baseArticleHTML=articleHTML;
    articleHTML=function(o,img){
      let out=baseArticleHTML(o,img);
      const source=(o?.photoSource||'').trim();
      if(source){
        const credit=`<div class="photo-credit">Фото: ${escCredit(source)}</div>`;
        const cover=/<img[^>]*class="article-cover"[^>]*>/i;
        if(/class="photo-credit"/i.test(out)) out=out.replace(/<div class="photo-credit">.*?<\/div>/i,credit);
        else out=out.replace(cover,m=>m+credit);
      }
      return out;
    };
  }
  if(typeof putFile==='function'){
    const basePutFile=putFile;
    putFile=async function(path,content,message,encoding='utf-8'){
      if(path==='data/posts.json'&&encoding!=='base64'){
        try{
          const posts=JSON.parse(content),o=typeof collect==='function'?collect():null;
          if(o?.slug){
            const p=posts.find(x=>x.slug===o.slug);
            if(p){p.photoSource=(o.photoSource||'').trim();p.description=o.description||p.description;p.category=o.category||p.category;p.type=o.type||p.type;p.author=o.author||p.author;p.coauthors=Array.isArray(o.coauthors)?o.coauthors.filter(Boolean):[]}
          }
          content=JSON.stringify(posts,null,2);
        }catch(e){console.warn('publication metadata:',e)}
      }
      return basePutFile(path,content,message,encoding);
    };
  }
  const V='20260922-fix3';
  const css=document.createElement('link');css.rel='stylesheet';css.href='assets/admin-editor-ui.css?v='+V;document.head.appendChild(css);
  const b=document.getElementById('photoSourceBtn');if(b)b.addEventListener('click',()=>{const i=document.getElementById('photoSource');if(i){i.focus();i.select()}});
  const ensurePlacement=()=>{
    if(document.getElementById('placementCard'))return;
    const aside=document.querySelector('#material .grid > aside');if(!aside)return;
    const card=document.createElement('div');card.className='card';card.id='placementCard';
    card.innerHTML='<div class="card-title">Размещение на главной</div><div class="card-body"><label class="placement-check"><input id="featuredFlag" type="checkbox"><span><strong>Главная новость</strong><small>Показывать большой первой карточкой.</small></span></label><label class="placement-check"><input id="popularFlag" type="checkbox"><span><strong>Популярное</strong><small>Добавить в блок «Популярное» на главной.</small></span></label></div>';
    aside.insertBefore(card,aside.firstChild);
  };
  const loadPro=()=>{ensurePlacement();const p=document.createElement('script');p.src='assets/admin-pro-suite.js?v='+V;document.body.appendChild(p)};
  const loadBridge=()=>{const s=document.createElement('script');s.src='assets/admin-global-bridge.js?v='+V;s.onload=loadPro;s.onerror=loadPro;document.body.appendChild(s)};
  const loadFast=()=>{const s=document.createElement('script');s.src='assets/admin-fast-publish.js?v='+V;s.onload=loadBridge;s.onerror=loadBridge;document.body.appendChild(s)};
  const loadEditorUi=()=>{const s=document.createElement('script');s.src='assets/admin-editor-ui.js?v='+V;s.onload=loadFast;s.onerror=loadFast;document.body.appendChild(s)};
  const loadScheduler=()=>{const s=document.createElement('script');s.src='assets/admin-scheduler.js?v='+V;s.onload=loadEditorUi;s.onerror=loadEditorUi;document.body.appendChild(s)};
  const loadManager=()=>{const s=document.createElement('script');s.src='assets/admin-content-manager.js?v='+V;s.onload=loadScheduler;s.onerror=loadScheduler;document.body.appendChild(s)};
  const loadQuizToolbar=()=>{const s=document.createElement('script');s.src='assets/admin-quiz-toolbar.js?v='+V;s.onload=loadManager;s.onerror=loadManager;document.body.appendChild(s)};
  const loadQuiz=()=>{const s=document.createElement('script');s.src='assets/admin-quiz.js?v='+V;s.onload=loadQuizToolbar;s.onerror=loadQuizToolbar;document.body.appendChild(s)};
  const server=document.createElement('script');server.src='assets/admin-server.js?v='+V;server.onload=loadQuiz;server.onerror=loadQuiz;document.body.appendChild(server);
})();