(function(){
'use strict';

const supplementalStyles=[
  ['/assets/overrides.css','r408562d4ddaa'],
  ['/assets/author-fix.css','r408562d4ddaa'],
  ['/assets/site-ui.css','r408562d4ddaa'],
  ['/assets/community-extra.css','r408562d4ddaa'],
  ['/assets/theme.css','r408562d4ddaa'],
  ['/assets/seasonal.css','r408562d4ddaa']
];
supplementalStyles.forEach(([href,version])=>{
  if(document.querySelector(`link[href^="${href}"]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=`${href}?v=${version}`;
  document.head.appendChild(link);
});

const season=(()=>{const m=new Date().getMonth();return m<2||m===11?'winter':m<5?'spring':m<8?'summer':'autumn' })();
document.documentElement.dataset.season=season;
const dataSaver=!!navigator.connection?.saveData;
if(dataSaver)document.documentElement.classList.add('pv-seasonal-static');

const layer=document.createElement('div');
layer.className='pv-seasonal-layer';
layer.setAttribute('aria-hidden','true');
document.body.prepend(layer);

const autumnLeaves=[
  '/assets/leaves/maple.svg?v=r408562d4ddaa',
  '/assets/leaves/maple-red.svg?v=r408562d4ddaa',
  '/assets/leaves/birch-yellow.svg?v=r408562d4ddaa',
  '/assets/leaves/oak-green.svg?v=r408562d4ddaa'
];

/* Two denser lanes follow the real content edges rather than the viewport edges. */
const autumnPieces=[
  ['left',-76,82,-22,.80,18,-30,0],
  ['right',18,74,30,.76,21,34,1],
  ['left',-36,62,12,.72,24,26,2],
  ['right',54,92,-34,.74,19,-28,3],
  ['left',-92,70,38,.78,22,38,1],
  ['right',6,66,-16,.70,25,24,2],
  ['left',-50,96,-40,.76,20,-36,0],
  ['right',42,72,22,.72,23,30,3],
  ['left',-18,58,-8,.66,27,22,2],
  ['right',72,86,42,.74,21,-34,1],
  ['left',-104,78,26,.74,24,28,3],
  ['right',24,64,-28,.69,26,-24,0],
  ['left',-60,88,8,.76,22,36,1],
  ['right',58,60,34,.68,28,-20,2],
  ['left',-28,68,-36,.72,25,-28,0],
  ['right',12,98,18,.75,20,38,3],
  ['left',-86,56,30,.66,29,20,2],
  ['right',76,76,-22,.72,24,-30,1]
];

const pieces=[];
function contentRect(){
  const el=document.querySelector('.container');
  if(el){
    const r=el.getBoundingClientRect();
    if(r.width>0)return r;
  }
  const w=Math.min(1320,Math.max(0,window.innerWidth-40));
  const left=(window.innerWidth-w)/2;
  return {left,right:left+w,width:w};
}
function placePieces(){
  const r=contentRect();
  pieces.forEach(({el,side,offset,size})=>{
    let x=side==='left' ? r.left+offset : r.right+offset;
    x=Math.max(4,Math.min(window.innerWidth-size-4,x));
    el.style.setProperty('--x',`${Math.round(x)}px`);
  });
}

if(season==='autumn'){
  autumnPieces.forEach(([side,offset,size,turn,opacity,duration,drift,leafIndex],i)=>{
    const piece=document.createElement('span');
    piece.className='pv-seasonal-piece';
    piece.dataset.lane=side;
    piece.style.cssText=`--x:0px;--size:${size}px;--turn:${turn}deg;--piece-opacity:${opacity};--duration:${duration}s;--delay:${-(i*1.45+3.2)}s;--drift:${drift}px`;
    const img=document.createElement('img');
    img.className='pv-seasonal-leaf';
    img.src=autumnLeaves[leafIndex%autumnLeaves.length];
    img.alt='';
    img.decoding='async';
    img.draggable=false;
    piece.appendChild(img);
    layer.appendChild(piece);
    pieces.push({el:piece,side,offset,size});
  });
  placePieces();
  let resizeTimer=0;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(placePieces,80);
  },{passive:true});
}else{
  layer.classList.add('pv-seasonal-no-art');
}

document.addEventListener('visibilitychange',()=>{
  layer.querySelectorAll('.pv-seasonal-piece,.pv-seasonal-leaf').forEach(el=>{
    el.style.animationPlayState=document.hidden?'paused':'running';
  });
});
})();
