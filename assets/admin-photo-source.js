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
  const css=document.createElement('link');css.rel='stylesheet';css.href='assets/admin-editor-ui.css?v=20260922-pro5';document.head.appendChild(css);
  const b=document.getElementById('photoSourceBtn');if(b)b.addEventListener('click',()=>{const i=document.getElementById('photoSource');if(i){i.focus();i.select()}});
  const loadPro=()=>{const p=document.createElement('script');p.src='assets/admin-pro-suite.js?v=20260922-pro5';document.body.appendChild(p)};
  const loadBridge=()=>{const s=document.createElement('script');s.src='assets/admin-global-bridge.js?v=20260922-pro5';s.onload=loadPro;s.onerror=loadPro;document.body.appendChild(s)};
  const loadFast=()=>{const s=document.createElement('script');s.src='assets/admin-fast-publish.js?v=20260922-pro5';s.onload=loadBridge;s.onerror=loadBridge;document.body.appendChild(s)};
  const loadEditorUi=()=>{const s=document.createElement('script');s.src='assets/admin-editor-ui.js?v=20260922-pro5';s.onload=loadFast;s.onerror=loadFast;document.body.appendChild(s)};
  const loadScheduler=()=>{const s=document.createElement('script');s.src='assets/admin-scheduler.js?v=20260922-pro5';s.onload=loadEditorUi;s.onerror=loadEditorUi;document.body.appendChild(s)};
  const loadManager=()=>{const s=document.createElement('script');s.src='assets/admin-content-manager.js?v=20260922-pro5';s.onload=loadScheduler;s.onerror=loadScheduler;document.body.appendChild(s)};
  const loadQuizToolbar=()=>{const s=document.createElement('script');s.src='assets/admin-quiz-toolbar.js?v=20260922c';s.onload=loadManager;s.onerror=loadManager;document.body.appendChild(s)};
  const loadQuiz=()=>{const s=document.createElement('script');s.src='assets/admin-quiz.js?v=20260922e';s.onload=loadQuizToolbar;s.onerror=loadQuizToolbar;document.body.appendChild(s)};
  const server=document.createElement('script');server.src='assets/admin-server.js?v=20260922-pro5';server.onload=loadQuiz;server.onerror=loadQuiz;document.body.appendChild(server);
})();
