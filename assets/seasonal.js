(function(){
  'use strict';
  // Each season uses a small inline vector, without requests to third-party hosts.
  const shapes={
    autumn:'<path d="M32 3 27 15 20 11 22 21 11 20 15 29 6 34 20 39 17 48 29 45 32 60 35 45 47 48 44 39 58 34 49 29 53 20 42 21 44 11 37 15Z"/>',
    winter:'<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" d="M32 6v52M6 32h52M13 13l38 38M51 13 13 51M26 12l6 7 6-7M26 52l6-7 6 7M12 26l7 6-7 6M52 26l-7 6 7 6"/>',
    spring:'<path d="M32 34C3 28 13 7 28 14c8 5 7 15 4 20Zm0 0C37 5 61 13 52 28c-5 8-15 9-20 6Zm0 0c29 4 21 29 5 26-9-2-12-15-5-26Zm0 0C28 64 3 54 12 39c5-8 15-9 20-5Z"/>',
    summer:'<circle cx="32" cy="32" r="17"/><path d="M32 3v7m0 44v7M3 32h7m44 0h7M11.5 11.5l5 5m31 31 5 5m0-41-5 5m-31 31-5 5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'
  };
  const colors={autumn:['#bf6731','#d99642','#a85a40','#cc7d35','#b98b4f','#9e6340','#d29a57'],winter:['#9bbbc5','#bdd2d9','#8baab7'],spring:['#d898a0','#c8858d','#bd9baf'],summer:['#dfb968','#d7a65a','#e3c583']};
  const positions=[['2%','12%',48,-16,.22,.07],['94%','25%',65,28,.28,-.09],['6%','68%',55,66,.25,.12],['88%','80%',45,-30,.19,-.06],['21%','91%',33,42,.15,.08],['77%','6%',29,-20,.13,-.05],['96%','57%',37,73,.2,.1]];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const dataSaver=!!navigator.connection?.saveData;
  const layer=document.createElement('div');layer.className='pv-seasonal-layer';layer.setAttribute('aria-hidden','true');
  document.body.insertBefore(layer,document.body.firstChild);
  let pieces=[],season='',pending=false;

  function currentSeason(){const month=new Date().getMonth();return month<2||month===11?'winter':month<5?'spring':month<8?'summer':'autumn'}
  function paint(){
    const next=currentSeason();if(next===season)return;
    season=next;document.documentElement.dataset.season=season;layer.replaceChildren();
    const vector=`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="currentColor">${shapes[season]}</svg>`)}")`;
    pieces=positions.map(([x,y,size,turn,opacity,speed],index)=>{
      const el=document.createElement('span');el.className='pv-seasonal-piece';
      el.style.setProperty('--x',x);el.style.setProperty('--y',y);el.style.setProperty('--size',size+'px');
      el.style.setProperty('--turn',turn+'deg');el.style.setProperty('--piece-opacity',opacity);
      el.style.setProperty('--piece-color',colors[season][index%colors[season].length]);
      el.style.setProperty('--piece-shape',vector);layer.appendChild(el);return{el,turn,speed};
    });
    move();
  }
  function move(){
    pending=false;if(reduced.matches||dataSaver)return;
    const scroll=window.scrollY;
    pieces.forEach(({el,turn,speed})=>{el.style.transform=`translate3d(0,${Math.round(scroll*speed)}px,0) rotate(${turn+Math.round(scroll*speed*.035)}deg)`});
  }
  function schedule(){if(!pending&&!reduced.matches&&!dataSaver){pending=true;requestAnimationFrame(move)}}
  paint();
  window.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){paint();schedule()}});
  reduced.addEventListener?.('change',()=>{pieces.forEach(({el})=>{el.style.transform=''});schedule()});
})();
