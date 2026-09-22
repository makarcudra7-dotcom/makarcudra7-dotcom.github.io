(()=>{
  const escCredit=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
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
      if(path==='data/posts.json' && encoding!=='base64'){
        try{
          const posts=JSON.parse(content),o=typeof collect==='function'?collect():null;
          if(o?.slug){
            const p=posts.find(x=>x.slug===o.slug);
            if(p){
              p.photoSource=(o.photoSource||'').trim();
              p.description=o.description||p.description;
              p.category=o.category||p.category;
              p.type=o.type||p.type;
              p.author=o.author||p.author;
              p.coauthors=Array.isArray(o.coauthors)?o.coauthors.filter(Boolean):[];
            }
          }
          content=JSON.stringify(posts,null,2);
        }catch(e){console.warn('publication metadata:',e)}
      }
      return basePutFile(path,content,message,encoding);
    };
  }
  const b=document.getElementById('photoSourceBtn');
  if(b) b.addEventListener('click',()=>{const i=document.getElementById('photoSource');if(i){i.focus();i.select();}});
  const loadScheduler=()=>{const scheduler=document.createElement('script');scheduler.src='assets/admin-scheduler.js?v=20260922';document.body.appendChild(scheduler)};
  const loadManager=()=>{const manager=document.createElement('script');manager.src='assets/admin-content-manager.js?v=20260922-authors';manager.onload=loadScheduler;manager.onerror=loadScheduler;document.body.appendChild(manager)};
  const loadQuizToolbar=()=>{const tools=document.createElement('script');tools.src='assets/admin-quiz-toolbar.js?v=20260922';tools.onload=loadManager;tools.onerror=loadManager;document.body.appendChild(tools)};
  const loadQuiz=()=>{const quiz=document.createElement('script');quiz.src='assets/admin-quiz.js?v=20260922c';quiz.onload=loadQuizToolbar;quiz.onerror=loadQuizToolbar;document.body.appendChild(quiz)};
  const server=document.createElement('script');server.src='assets/admin-server.js?v=20260922b';server.onload=loadQuiz;server.onerror=loadQuiz;document.body.appendChild(server);
})();
