(()=>{
  const image=document.getElementById('image'),file=document.getElementById('imageFile'),preview=document.getElementById('imagePreview');
  let localUrl='';
  function update(){
    if(localUrl){URL.revokeObjectURL(localUrl);localUrl=''}
    const upload=file?.files?.[0];
    if(upload){localUrl=URL.createObjectURL(upload);preview.src=localUrl;return}
    const typed=image?.value?.trim();
    preview.src=typed?new URL(typed,location.origin+'/').href:'assets/fallback-cover.svg';
  }
  file?.addEventListener('change',update);
  image?.addEventListener('input',()=>{if(!file?.files?.length)update()});
  preview?.addEventListener('error',()=>{if(preview.src!==new URL('/assets/fallback-cover.svg',location.origin).href)preview.src='/assets/fallback-cover.svg'});
  const seo=document.getElementById('seoTitle');if(seo){seo.maxLength=140;seo.dispatchEvent(new Event('input',{bubbles:true}))}
  if(document.getElementById('coauthors'))document.getElementById('coauthors').closest('.field')?.remove();
  const css=document.createElement('link');css.rel='stylesheet';css.href='assets/admin-fixes.css?v=20260923-ux1';document.head.appendChild(css);

})();
