(function(){
'use strict';

const supplementalStyles=[
  ['/assets/overrides.css','rca343a7b74cf'],
  ['/assets/author-fix.css','rca343a7b74cf'],
  ['/assets/site-ui.css','rca343a7b74cf'],
  ['/assets/community-extra.css','rca343a7b74cf'],
  ['/assets/theme.css','rca343a7b74cf'],
  ['/assets/seasonal.css','rca343a7b74cf']
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
  '/assets/leaves/maple.svg?v=rca343a7b74cf',
  '/assets/leaves/maple-red.svg?v=rca343a7b74cf',
  '/assets/leaves/birch-yellow.svg?v=rca343a7b74cf',
  '/assets/leaves/oak-green.svg?v=rca343a7b74cf'
];

/* Keep the middle of the viewport visually quiet: leaves travel mostly in the side lanes. */
const autumnPositions=[
  ['-3%',-120,88,-24,.80,18,-26,0],
  ['96%',-210,82,36,.74,22,34,1],
  ['3%',-330,72,-12,.76,20,-30,2],
  ['100%',-450,94,24,.70,24,28,3],
  ['6%',-570,102,-38,.74,19,-34,1],
  ['93%',-690,86,18,.72,23,32,0],
  ['0%',-810,78,-28,.68,21,-26,3],
  ['102%',-930,98,32,.70,25,30,2]
];

if(season==='autumn'){
  autumnPositions.forEach(([x,y,size,turn,opacity,duration,drift,leafIndex],i)=>{
    const piece=document.createElement('span');
    piece.className='pv-seasonal-piece';
    piece.style.cssText=`--x:${x};--start-y:${y}px;--size:${size}px;--turn:${turn}deg;--piece-opacity:${opacity};--duration:${duration}s;--delay:${-i*2.8}s;--drift:${drift}px`;
    const img=document.createElement('img');
    img.className='pv-seasonal-leaf';
    img.src=autumnLeaves[leafIndex%autumnLeaves.length];
    img.alt='';
    img.decoding='async';
    img.draggable=false;
    piece.appendChild(img);
    layer.appendChild(piece);
  });
}else{
  layer.classList.add('pv-seasonal-no-art');
}

document.addEventListener('visibilitychange',()=>{
  layer.querySelectorAll('.pv-seasonal-piece,.pv-seasonal-leaf').forEach(el=>{
    el.style.animationPlayState=document.hidden?'paused':'running';
  });
});
})();
