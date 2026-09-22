(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  function slugFrom(href){try{return(new URL(href,location.href).pathname.split('/').pop()||'').replace(/\.html$/,'')}catch{return''}}
  function installDedupe(){
    if(typeof window.renderPosts!=='function'||window.renderPosts.__scheduledDedupe)return;
    const base=window.renderPosts;
    const wrapped=function(){base();const scheduled=new Set((window.store?.scheduled||[]).map(x=>x.slug));if(!scheduled.size)return;$$('#postsTable tr:not(.scheduled-row)').forEach(tr=>{const a=tr.querySelector('a[href*="/articles/"]');if(a&&scheduled.has(slugFrom(a.href)))tr.remove()})};
    wrapped.__scheduledDedupe=true;window.renderPosts=wrapped;window.renderPosts()
  }
  function wrapButton(btn,mode){
    if(!btn||btn.dataset.fastPublishWrapped==='1'||typeof btn.onclick!=='function')return;
    const base=btn.onclick;btn.dataset.fastPublishWrapped='1';
    btn.onclick=async function(e){
      if(window.__pvPublishing)return false;
      const batched=typeof window.beginPublishBatch==='function'&&window.beginPublishBatch();
      window.__pvPublishing=true;
      try{
        const result=await base.call(this,e);
        if(result===true&&batched){
          const o=window.collect?.()||{},label=mode==='schedule'?'Schedule':'Publish';
          await window.commitPublishBatch?.(`${label}: ${o.headline||o.slug||'material'}`);
          if(typeof flash==='function')flash(mode==='schedule'?'Материал поставлен в очередь одним пакетом':'Материал опубликован одним пакетом');
          window.renderPosts?.();
        }else if(batched){window.cancelPublishBatch?.()}
        return result
      }catch(err){if(batched)window.cancelPublishBatch?.();if(typeof flash==='function')flash(err.message||'Не удалось завершить публикацию');return false}
      finally{window.__pvPublishing=false}
    }
  }
  function install(){
    installDedupe();
    wrapButton($('#publishBtn'),'publish');
    wrapButton($('#scheduleBtn'),'schedule');
  }
  let n=0,t=setInterval(()=>{n++;if(typeof window.beginPublishBatch==='function'&&typeof $('#publishBtn')?.onclick==='function'&&typeof $('#scheduleBtn')?.onclick==='function'&&$('#placementCard')){clearInterval(t);install()}else if(n>240)clearInterval(t)},50)
})();
