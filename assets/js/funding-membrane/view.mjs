import {SPECIES,SETTINGS,GEOMETRY} from './core.mjs';
import {createLogoArtwork} from './logos.mjs';
const artwork=await createLogoArtwork();
const canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d'),worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
let state=null,paused=false,pending=false,timer=0,dpr=1,w=1000,h=238,pulsed=true,visible=true;
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
 // A smooth teal surface replaces the dotted lattice. All details stay outside
 // the physical aperture; light is decorative and does not change collision geometry.
 const top=(C-mh)*sy,bottom=(C+mh)*sy,thickness=bottom-top;
 const surface=ctx.createLinearGradient(0,top,0,bottom);
 surface.addColorStop(0,'#7095a3');surface.addColorStop(.16,'#365968');
 surface.addColorStop(.43,membraneColor);surface.addColorStop(.82,'#213e4b');surface.addColorStop(1,'#486c7b');
 const sheen=ctx.createLinearGradient(0,top,0,top+thickness*.22);
 sheen.addColorStop(0,'#c5dce599');sheen.addColorStop(1,'#c5dce500');
 const shadow=ctx.createLinearGradient(0,bottom,0,bottom+thickness*.5);
 shadow.addColorStop(0,'#182d3820');shadow.addColorStop(1,'#182d3800');
 for(const [l,r] of segments){
  const x=l*sx,width=(r-l)*sx;
  ctx.fillStyle=shadow;ctx.fillRect(x,bottom,width,thickness*.5);
  ctx.fillStyle=surface;ctx.fillRect(x,top,width,thickness);
  ctx.fillStyle=sheen;ctx.fillRect(x,top,width,thickness*.22);
 }
 const gold=ctx.createLinearGradient(0,top,0,bottom);
 gold.addColorStop(0,'#ffe9a4');gold.addColorStop(.24,'#e9bd4d');
 gold.addColorStop(.55,'#b88c29');gold.addColorStop(.82,'#e5b947');gold.addColorStop(1,'#fff0bb');
 for(const p of state.pores){
  const left=(p.x-p.width/2)*sx,right=(p.x+p.width/2)*sx,wall=sx*.1;
  // Warm inner faces and a small bevel wrap around each opening, leaving its width intact.
  ctx.fillStyle=gold;ctx.fillRect(left-wall,top,wall,thickness);ctx.fillRect(right,top,wall,thickness);
  const rim=sx*.18,edge=thickness*.1;
  ctx.fillStyle='#efd382';
  ctx.fillRect(left-rim,top,rim,edge);ctx.fillRect(right,top,rim,edge);
  ctx.fillRect(left-rim,bottom-edge,rim,edge);ctx.fillRect(right,bottom-edge,rim,edge);

 }
 canvas.dataset.membraneStyle='smooth-teal-gold-lined';
 ctx.save();
 for(let i=0;i<state.x.length;i++){
  const type=state.type[i],x=state.x[i]*sx,y=state.y[i]*sy,r=sx*GEOMETRY.radius;
  ctx.globalAlpha=type===2?.1:1;
  ctx.fillStyle=SPECIES[type].color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();canvas.dataset.cationOpacity='1';canvas.dataset.membraneColor=membraneColor;canvas.dataset.poreLiningColor='#edc552';canvas.dataset.ionStyle='flat-circle';canvas.dataset.ionDiameterPx=String(2*GEOMETRY.radius*sx);canvas.dataset.poreWidthPx=String(GEOMETRY.poreWidth*sx);canvas.dataset.ionPoreRatio=String(2*GEOMETRY.radius/GEOMETRY.poreWidth);canvas.dataset.chlorideOpacity='0.1';canvas.dataset.visibleIons=state.x.length;canvas.dataset.chlorideVisible='true';canvas.dataset.pulsePeriod=SETTINGS.pulsePeriod;canvas.dataset.friction=SETTINGS.friction;canvas.dataset.kFriction=SETTINGS.kFriction;canvas.dataset.membraneThickness=2*mh;
 canvas.dataset.domain=state.width+'×'+state.height;canvas.dataset.field=state.field.toFixed(3);canvas.dataset.invalidPositions=state.invalidPositions;canvas.dataset.logoCollisions=state.logoCollisions;canvas.dataset.wraps=state.wraps;canvas.dataset.trapped=state.trapped;canvas.dataset.pulseTrials=state.pulseTrials;canvas.dataset.pulseEscapes=state.pulseEscapes;canvas.dataset.counts=state.type.reduce((counts,type)=>(counts[type]++,counts),[0,0,0]).join(',');canvas.dataset.ions=state.x.length;canvas.dataset.pores=state.pores.length;canvas.dataset.time=state.time.toFixed(3);canvas.dataset.temperature=state.kineticTemperature.toFixed(3);


}
function schedule(){clearTimeout(timer);if(active()&&!pending)timer=setTimeout(()=>{pending=true;worker.postMessage({type:'step'});},33);}
worker.onmessage=({data})=>{pending=false;if(data.error){paused=true;canvas.dataset.error=data.error;pause.textContent='Animation unavailable';return;}state=data;draw();schedule();};
const pause=document.querySelector('#pause');function sync(){pause.textContent=paused?'Play animation':'Pause animation';pause.setAttribute('aria-pressed',String(paused));schedule();}
pause.onclick=()=>{paused=!paused;sync();};
 document.addEventListener('visibilitychange',sync);new ResizeObserver(size).observe(canvas);window.addEventListener('pagehide',()=>clearTimeout(timer));window.addEventListener('pageshow',sync);new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;canvas.dataset.visible=String(visible);schedule();}).observe(canvas);reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});worker.onerror=()=>{paused=true;canvas.dataset.error='Worker unavailable';pause.textContent='Animation unavailable';};pending=true;worker.postMessage({type:'reset',obstacleMask:artwork.mask});sync();
