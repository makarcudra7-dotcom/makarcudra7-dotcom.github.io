(()=>{
  const loadImage=(img)=>{
    const src=img.dataset.src;
    if(!src)return;
    img.src=src;
    img.removeAttribute('data-src');
  };
  const loadSection=(section)=>{
    section.querySelectorAll('img[data-src]').forEach(loadImage);
  };
  const sections=[...document.querySelectorAll('#wcList .wc-section')];
  if(!sections.length)return;

  // The first cuisine is close to the initial viewport, so make it ready immediately.
  loadSection(sections[0]);

  const loadHashTarget=()=>{
    if(!location.hash)return;
    const target=document.querySelector(location.hash);
    if(target&&target.classList.contains('wc-section'))loadSection(target);
  };
  loadHashTarget();
  addEventListener('hashchange',loadHashTarget,{passive:true});

  if(!('IntersectionObserver' in window)){
    sections.slice(1).forEach(loadSection);
    return;
  }

  const observer=new IntersectionObserver((entries)=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      loadSection(entry.target);
      observer.unobserve(entry.target);
    }
  },{rootMargin:'650px 0px'});

  sections.slice(1).forEach(section=>observer.observe(section));
})();
