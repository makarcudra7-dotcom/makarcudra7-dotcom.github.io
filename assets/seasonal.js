(function(){
'use strict';
const shapes={
 autumn:[
  '<path d="M31 4C20 10 11 20 9 31c-2 12 7 22 20 23 12 1 22-8 23-21C53 20 43 10 31 4Zm0 7c2 15 1 28-2 43"/><path d="M30 25c-6-4-10-7-14-11m14 20c8-5 12-9 17-15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  '<path d="M33 3c-4 8-9 13-17 17l7 4-12 8 12 3-7 12 13-4 4 17 4-17 13 4-7-12 12-3-12-8 7-4C42 16 37 11 33 3Z"/><path d="M33 15v42" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  '<path d="M9 35C15 13 33 6 54 13 49 34 34 52 12 52c6-7 14-14 24-22-10 4-19 7-27 5Z"/><path d="M13 49c10-12 21-22 36-31" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'
 ],
 winter:['<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" d="M32 6v52M6 32h52M13 13l38 38M51 13 13 51M26 12l6 7 6-7M26 52l6-7 6 7M12 26l7 6-7 6M52 26l-7 6 7 6"/>'],
 spring:['<path d="M32 34C3 28 13 7 28 14c8 5 7 15 4 20Zm0 0C37 5 61 13 52 28c-5 8-15 9-20 6Zm0 0c29 4 21 29 5 26-9-2-12-15-5-26Zm0 0C28 64 3 54 12 39c5-8 15-9 20-5Z"/>'],
 summer:['<circle cx="32" cy="32" r="17"/><path d="M32 3v7m0 44v7M3 32h7m44 0h7M11.5 11.5l5 5m31 31 5 5m0-41-5 5m-31 31-5 5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>']
};
const colors={autumn:['#a84b27','#cf6a2e','#d79532','#8f4b2f','#b85a2d','#e09b42'],winter:['#9bbbc5','#bdd2d9','#8baab7'],spring:['#d898a0','#c8858d','#bd9baf'],summer:['#dfb968','#d7a65a','#e3c583']};
const positions=[['2%','8%',58,-24,.48],['92%','19%',76,31,.55],['3%','57%',66,70,.47],['91%','76%',52,-38,.42],['18%','87%',43,46,.32],['80%','4%',48,-17,.35]];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const dataSaver=!!navigator.connection?.saveData;
if(dataSaver)document.documentElement.classList.add('pv-seasonal-static');
const layer=document.createElement('div');layer.className='pv-seasonal-layer';layer.setAttribute('aria-hidden','true');document.body.prepend(layer);
const season=(()=>{const m=new Date().getMonth();return m<2||m===11?'winter':m<5?'spring':m<8?'summer':'autumn' })();
document.documentElement.dataset.season=season;
positions.forEach(([x,y,size,turn,opacity],i)=>{
 const el=document.createElement('span');el.className='pv-seasonal-piece';
 const leaf=document.createElement('span');leaf.className='pv-seasonal-leaf';
 const shape=shapes[season][i%shapes[season].length];
 const vector=`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="currentColor">${shape}</svg>`)}")`;
 const drift=(i%2?1:-1)*(28+i*5);
 el.style.cssText=`--x:${x};--y:${y};--size:${size}px;--turn:${turn}deg;--piece-opacity:${opacity};--duration:${16+i*2.7}s;--delay:${-i*3.8}s;--drift:${drift}px;--sway:${10+i*2}px;--piece-color:${colors[season][i%colors[season].length]};--piece-shape:${vector}`;
 el.appendChild(leaf);layer.appendChild(el);
});
// No scroll listener: animation stays on compositor and does not compete with reading/scrolling.
document.addEventListener('visibilitychange',()=>{layer.style.animationPlayState=document.hidden?'paused':'running';});
})();
