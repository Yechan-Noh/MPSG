import {SPECIES,SETTINGS,GEOMETRY} from './core.mjs';
import {createLogoArtwork} from './logos.mjs';
const artwork=await createLogoArtwork();
const canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d'),worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
let state=null,paused=false,pending=false,timer=0,dpr=1,w=1000,h=238,pulsed=true,visible=true;
// Cache the luminous ion artwork once; no per-particle gradients per frame.
const ionSprites=SPECIES.map(({color},type)=>{
 const sprite=document.createElement('canvas');sprite.width=sprite.height=64;
 const c=sprite.getContext('2d'),cx=32,cy=32,r=10;
 const halo=c.createRadialGradient(cx,cy,r*.5,cx,cy,31);
 halo.addColorStop(0,color+'70');halo.addColorStop(.45,color+'24');halo.addColorStop(1,color+'00');
 c.fillStyle=halo;c.fillRect(0,0,64,64);
 const body=c.createRadialGradient(cx-3,cy-4,0,cx,cy,r);
 body.addColorStop(0,'#ffffff');body.addColorStop(.2,type===0?'#eadfff':type===1?'#fff6bd':'#ddf5e4');
 body.addColorStop(.56,color);body.addColorStop(1,type===0?'#69459f':type===1?'#b18a16':'#347b58');
 c.fillStyle=body;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();
 return sprite;
});
let membraneColor='#182d38';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');paused=reduced.matches;
const active=()=>!paused&&visible&&!document.hidden;
function size(){membraneColor=getComputedStyle(canvas).getPropertyValue('--site-ink').trim()||'#182d38';const r=canvas.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);draw();}
function draw(){
 if(!state)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const sx=w/state.width,sy=h/state.height,C=state.center,mh=state.membraneHalf;
 const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.5,'#f7fafb');gradient.addColorStop(1,'#ffffff');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 if(state.field>.05){
  // 90% transparent: tint the background only, leaving ions and logo ink clear.
  ctx.fillStyle='rgba(255,210,45,0.10)';ctx.fillRect(0,0,w,h);
 }
 canvas.dataset.pulseBackground=state.field>.05?'yellow-10-percent':'off';canvas.dataset.pulsePeak=SETTINGS.pulsePeak;canvas.dataset.poreCharge=SETTINGS.poreCharge;canvas.dataset.naDepth=SETTINGS.naDepth;
 // A single scale on both axes preserves all original logo proportions.
 const artScale=w/artwork.art.width;
 ctx.drawImage(artwork.art,0,0,artwork.art.width*artScale,artwork.art.height*artScale);
 canvas.dataset.logoScaleX=String(artScale);canvas.dataset.logoScaleY=String(artScale);
 canvas.dataset.artworkSize=artwork.art.width+'×'+artwork.art.height;
 let left=0;const segments=[];for(const p of state.pores){segments.push([left,p.x-p.width/2]);left=p.x+p.width/2;}segments.push([left,state.width]);
 for(const [l,r] of segments){
  ctx.fillStyle=membraneColor;ctx.fillRect(l*sx,(C-mh)*sy,(r-l)*sx,2*mh*sy);
  ctx.strokeStyle='#375462';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(l*sx,(C-mh)*sy);ctx.lineTo(r*sx,(C-mh)*sy);ctx.moveTo(l*sx,(C+mh)*sy);ctx.lineTo(r*sx,(C+mh)*sy);ctx.stroke();
  // Fixed atomic sites are a visual membrane texture, not extra solvent particles.
  for(let x=l+.2;x<r;x+=.63)for(const y of [C-mh*.8,C+mh*.8]){ctx.fillStyle='#6b8b9a';ctx.beginPath();ctx.arc(x*sx,y*sy,Math.max(.65,sx*.075),0,Math.PI*2);ctx.fill();}
 }
 for(const p of state.pores){
  // Gold on the two inward-facing pore walls signifies Na affinity; the aperture stays open.
  const y=(C-mh)*sy,depth=2*mh*sy,wall=sx*.09;
  ctx.fillStyle='#edc552';
  ctx.fillRect((p.x-p.width/2)*sx-wall,y,wall,depth);
  ctx.fillRect((p.x+p.width/2)*sx,y,wall,depth);
 }
 ctx.save();
 for(let i=0;i<state.x.length;i++){
  const type=state.type[i],x=state.x[i]*sx,y=state.y[i]*sy,r=sx*GEOMETRY.radius;
  ctx.globalAlpha=type===2?.1:1;
  const span=r*6.4;ctx.drawImage(ionSprites[type],x-span/2,y-span/2,span,span);
  // Occasional soft glints, out of phase, convey charge without flashing the whole field.
  if(type!==2){
   const glint=Math.pow(Math.max(0,Math.sin(state.time*1.6+i*2.39996)),12);
   if(glint>.03){
    ctx.globalAlpha=glint*.8;ctx.strokeStyle=type===0?'#d2b6ff':'#ffe187';ctx.lineWidth=.75;
    const reach=r*(1.25+glint),gx=x-r*.28,gy=y-r*.3;
    ctx.beginPath();ctx.moveTo(gx-reach,gy);ctx.lineTo(gx+reach,gy);ctx.moveTo(gx,gy-reach);ctx.lineTo(gx,gy+reach);ctx.stroke();
   }
  }
 }
 ctx.restore();canvas.dataset.cationOpacity='1';canvas.dataset.membraneColor=membraneColor;canvas.dataset.poreLiningColor='#edc552';canvas.dataset.ionStyle='luminous-sphere';canvas.dataset.ionDiameterPx=String(2*GEOMETRY.radius*sx);canvas.dataset.poreWidthPx=String(GEOMETRY.poreWidth*sx);canvas.dataset.ionPoreRatio=String(2*GEOMETRY.radius/GEOMETRY.poreWidth);canvas.dataset.chlorideOpacity='0.1';canvas.dataset.visibleIons=state.x.length;canvas.dataset.chlorideVisible='true';canvas.dataset.pulsePeriod=SETTINGS.pulsePeriod;canvas.dataset.friction=SETTINGS.friction;canvas.dataset.kFriction=SETTINGS.kFriction;canvas.dataset.membraneThickness=2*mh;
 canvas.dataset.domain=state.width+'×'+state.height;canvas.dataset.field=state.field.toFixed(3);canvas.dataset.invalidPositions=state.invalidPositions;canvas.dataset.logoCollisions=state.logoCollisions;canvas.dataset.wraps=state.wraps;canvas.dataset.trapped=state.trapped;canvas.dataset.pulseTrials=state.pulseTrials;canvas.dataset.pulseEscapes=state.pulseEscapes;canvas.dataset.counts=state.type.reduce((counts,type)=>(counts[type]++,counts),[0,0,0]).join(',');canvas.dataset.ions=state.x.length;canvas.dataset.pores=state.pores.length;canvas.dataset.time=state.time.toFixed(3);canvas.dataset.temperature=state.kineticTemperature.toFixed(3);


}
function schedule(){clearTimeout(timer);if(active()&&!pending)timer=setTimeout(()=>{pending=true;worker.postMessage({type:'step'});},33);}
worker.onmessage=({data})=>{pending=false;if(data.error){paused=true;canvas.dataset.error=data.error;pause.textContent='Animation unavailable';return;}state=data;draw();schedule();};
const pause=document.querySelector('#pause');function sync(){pause.textContent=paused?'Play animation':'Pause animation';pause.setAttribute('aria-pressed',String(paused));schedule();}
pause.onclick=()=>{paused=!paused;sync();};
 document.addEventListener('visibilitychange',sync);new ResizeObserver(size).observe(canvas);window.addEventListener('pagehide',()=>clearTimeout(timer));window.addEventListener('pageshow',sync);new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;canvas.dataset.visible=String(visible);schedule();}).observe(canvas);reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});worker.onerror=()=>{paused=true;canvas.dataset.error='Worker unavailable';pause.textContent='Animation unavailable';};pending=true;worker.postMessage({type:'reset',obstacleMask:artwork.mask});sync();
