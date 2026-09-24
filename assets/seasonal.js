(function(){
'use strict';

const supplementalStyles=[
  ['/assets/overrides.css','20260924-fix1'],
  ['/assets/author-fix.css','20260924-fix1'],
  ['/assets/site-ui.css','20260924-fix1'],
  ['/assets/community-extra.css','20260924-fix1'],
  ['/assets/theme.css','20260924-fix1'],
  ['/assets/seasonal.css','20260924-leaves3']
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

const autumnPositions=[
  ['4%',-90,54,-25,.78,17,-75],
  ['18%',-160,38,42,.62,21,58],
  ['36%',-240,62,-15,.72,19,-48],
  ['55%',-110,44,27,.66,23,72],
  ['72%',-205,58,-38,.76,18,-60],
  ['88%',-145,42,18,.64,22,54],
  ['96%',-270,50,-28,.70,20,-46]
];

if(season==='autumn'){
  autumnPositions.forEach(([x,y,size,turn,opacity,duration,drift],i)=>{
    const piece=document.createElement('span');
    piece.className='pv-seasonal-piece';
    piece.style.cssText=`--x:${x};--start-y:${y}px;--size:${size}px;--turn:${turn}deg;--piece-opacity:${opacity};--duration:${duration}s;--delay:${-i*3.1}s;--drift:${drift}px`;
    const img=document.createElement('img');
    img.className='pv-seasonal-leaf';
    img.src='/assets/leaves/maple.svg?v=20260924-1';
    img.alt='';
    img.width=320;
    img.height=303;
    img.decoding='async';
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
