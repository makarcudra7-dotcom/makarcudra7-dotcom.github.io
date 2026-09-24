(function(){
'use strict';

const supplementalStyles=[
  ['/assets/overrides.css','rf1843c1ee447'],
  ['/assets/author-fix.css','rf1843c1ee447'],
  ['/assets/site-ui.css','rf1843c1ee447'],
  ['/assets/community-extra.css','rf1843c1ee447'],
  ['/assets/theme.css','rf1843c1ee447'],
  ['/assets/seasonal.css','rf1843c1ee447']
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
  '/assets/leaves/maple.svg?v=rf1843c1ee447',
  '/assets/leaves/maple-red.svg?v=rf1843c1ee447',
  '/assets/leaves/birch-yellow.svg?v=rf1843c1ee447',
  '/assets/leaves/oak-green.svg?v=rf1843c1ee447'
];

/* Exactly 11 leaves on desktop: 7 in the left gutter, 4 in the right gutter.
   Leaves may overlap the content boundary by a few pixels, while remaining behind content. */
const autumnPieces=[
  ['left',.10,76,-22,.82,19,-22,0],
  ['left',.28,64,26,.76,23,18,2],
  ['left',.46,88,-34,.78,20,-28,1],
  ['left',.64,58,14,.72,25,20,3],
  ['left',.80,82,38,.80,21,-24,0],
  ['left',.92,62,-18,.74,24,18,2],
  ['left',.58,72,30,.76,22,-20,1],
  ['right',.14,72,24,.76,22,22,3],
  ['right',.38,60,-30,.70,26,-18,2],
  ['right',.66,84,36,.78,20,26,0],
  ['right',.88,66,-16,.74,24,-20,1]
];

const pieces=[];
function contentRect(){
  const candidates=[
    document.querySelector('.hero .container'),
    document.querySelector('main .container'),
    document.querySelector('.container')
  ].filter(Boolean);
  for(const el of candidates){
    const r=el.getBoundingClientRect();
    if(r.width>0)return r;
  }
  const w=Math.min(1320,Math.max(0,window.innerWidth-40));
  const left=(window.innerWidth-w)/2;
  return {left,right:left+w,width:w};
}

function gutterX(side,fraction,size,r){
  const vw=window.innerWidth;
  const edge=6;
  const overlap=14;
  if(side==='left'){
    const start=edge;
    const end=Math.max(start,r.left-size+overlap);
    return start+(end-start)*fraction;
  }
  const start=Math.min(vw-size-edge,r.right-overlap);
  const end=Math.max(start,vw-size-edge);
  return start+(end-start)*fraction;
}

function placePieces(){
  const r=contentRect();
  pieces.forEach(({el,side,fraction,size})=>{
    let x=gutterX(side,fraction,size,r);
    x=Math.max(4,Math.min(window.innerWidth-size-4,x));
    el.style.setProperty('--x',`${Math.round(x)}px`);
  });
}

if(season==='autumn'){
  autumnPieces.forEach(([side,fraction,size,turn,opacity,duration,drift,leafIndex],i)=>{
    const piece=document.createElement('span');
    piece.className='pv-seasonal-piece';
    piece.dataset.lane=side;
    piece.style.cssText=`--x:0px;--size:${size}px;--turn:${turn}deg;--piece-opacity:${opacity};--duration:${duration}s;--delay:${-(i*2.15+2.4)}s;--drift:${drift}px`;
    const img=document.createElement('img');
    img.className='pv-seasonal-leaf';
    img.src=autumnLeaves[leafIndex%autumnLeaves.length];
    img.alt='';
    img.decoding='async';
    img.draggable=false;
    piece.appendChild(img);
    layer.appendChild(piece);
    pieces.push({el:piece,side,fraction,size});
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
