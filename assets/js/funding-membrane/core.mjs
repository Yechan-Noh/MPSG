import {insideRoundedWall, hitRoundedWall} from './rounded-walls.mjs?v=k200-capture-20261010';
// Reduced-unit visual model. Explicit monovalent ions; implicit dielectric solvent.
export const SPECIES=[{label:'K⁺',charge:1,color:'#9467ce'},{label:'Na⁺',charge:1,color:'#e3b72e'},{label:'Cl⁻',charge:-1,color:'#429d70'}];
export const GEOMETRY={width:44.8,height:41.58336,center:20.79168,viewHeight:10.6624,viewY:15.46048,radius:.24,poreWidth:.7744,edgeRadius:.18,poreCount:24,membraneHalf:.315,maskWidth:1000,maskHeight:238};
export const SETTINGS={dt:.006,friction:6,temperature:1,pulsePeak:10.8,pulseDelay:2,pulseDuration:1.5,pulsePeriod:12,naDepth:5.0,kFriction:6,kCoreRepulsion:-3.0,kCoreShift:.18,kCaptureDepth:.6,kCaptureX:1.265,kCaptureY:2.07,poreCharge:-1.5,coulomb:.5};
export class IonMembrane {
 constructor({seed=74321,counts=[200,24,224],temperature=SETTINGS.temperature,friction=SETTINGS.friction,kFriction=SETTINGS.kFriction,kCoreRepulsion=SETTINGS.kCoreRepulsion,kCaptureDepth=SETTINGS.kCaptureDepth,field=0,interactions=true,membrane=true,pulsed=true,poreCharge=SETTINGS.poreCharge,pulsePeak=SETTINGS.pulsePeak,naDepth=SETTINGS.naDepth,preload=true,obstacleMask=null}={}){
  Object.assign(this,{temperature,friction,kFriction,kCoreRepulsion,kCaptureDepth,field,interactions,membrane,pulsed,poreCharge,pulsePeak,naDepth,obstacleMask});this.seed=seed>>>0;this.width=GEOMETRY.width;this.height=GEOMETRY.height;this.center=GEOMETRY.center;this.radius=GEOMETRY.radius;this.dt=SETTINGS.dt;this.time=0;
  this.pores=Array.from({length:GEOMETRY.poreCount},(_,i)=>({x:(i+.5)*this.width/GEOMETRY.poreCount,width:GEOMETRY.poreWidth}));this.walls=[];let left=-1;
  for(const p of this.pores){this.walls.push([left,p.x-p.width/2,this.center-GEOMETRY.membraneHalf,this.center+GEOMETRY.membraneHalf]);left=p.x+p.width/2;}this.walls.push([left,this.width+1,this.center-GEOMETRY.membraneHalf,this.center+GEOMETRY.membraneHalf]);
  this.n=counts.reduce((a,b)=>a+b,0);for(const key of ['x','y','vx','vy','fx','fy','oldX','oldY'])this[key]=new Float64Array(this.n);
  this.type=new Uint8Array(this.n);
  // Reserve occupied pores before placing free ions, so no K/Cl blocks Na initialization.
  const preloadNa=preload&&membrane;
  if(preloadNa&&counts[1]>this.pores.length)throw Error('More preloaded Na ions than pores');
  let offset=0;counts.forEach((count,type)=>{this.type.fill(type,offset,offset+count);offset+=count;});
  const order=Array.from({length:this.n},(_,i)=>i);
  if(preloadNa)order.sort((a,b)=>(this.type[a]===1?0:1)-(this.type[b]===1?0:1));
  const placed=[];
  for(const i of order){
   const type=this.type[i];let valid=false;
   for(let tries=0;tries<10000&&!valid;tries++){
    if(preloadNa&&type===1){this.x[i]=this.pores[i-counts[0]].x;this.y[i]=this.center;}
    else{this.x[i]=this.random()*this.width;this.y[i]=this.random()*this.height;}
    valid=!this.inside(this.x[i],this.y[i])&&!this.logoHit(this.x[i],this.y[i]);
    for(const k of placed)if(valid&&Math.hypot(this.delta(this.x[k]-this.x[i],this.width),this.delta(this.y[k]-this.y[i],this.height))<.8)valid=false;
   }
   if(!valid)throw Error('Unable to initialize ions');
   this.vx[i]=this.normal()*Math.sqrt(temperature);this.vy[i]=this.normal()*Math.sqrt(temperature);
   placed.push(i);
  }
  this.initialTrapped=Array.from(this.type).filter((_,i)=>this.trapped(i)).length;
  this.forces();
 }
 random(){let t=this.seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
 normal(){return Math.sqrt(-2*Math.log(Math.max(1e-12,this.random())))*Math.cos(2*Math.PI*this.random());}
 wrap(x,L){return (x%L+L)%L;}
 delta(x,L){return x-L*Math.round(x/L);}
 inside(x,y){return this.membrane&&this.walls.some(wall=>insideRoundedWall(x,y,wall,GEOMETRY.edgeRadius,this.radius));}
 // Artwork occupies only the central visible window, not the hidden reservoirs.
 logoHit(x,y){if(!this.obstacleMask)return false;const localY=this.wrap(y,this.height)-GEOMETRY.viewY;if(localY<0||localY>=GEOMETRY.viewHeight)return false;return !!this.obstacleMask[Math.floor(localY/GEOMETRY.viewHeight*GEOMETRY.maskHeight)*GEOMETRY.maskWidth+Math.floor(this.wrap(x,this.width)/this.width*GEOMETRY.maskWidth)];}
 pulse(){if(!this.pulsed)return this.field;if(this.time<SETTINGS.pulseDelay)return 0;const phase=(this.time-SETTINGS.pulseDelay)%SETTINGS.pulsePeriod;return phase<SETTINGS.pulseDuration?this.pulsePeak*Math.min(1,phase/.12,(SETTINGS.pulseDuration-phase)/.12):0;}
 forces(){
  const E=this.pulse();this.fx.fill(0);for(let i=0;i<this.n;i++){
   const q=SPECIES[this.type[i]].charge;this.fy[i]=q*E;
   if(!this.membrane)continue;
   for(const p of this.pores){
    const dx=this.delta(this.x[i]-p.x,this.width),dy=this.delta(this.y[i]-this.center,this.height);
    // Two fixed negative rim charges: q*E attracts cations and repels anions.
    for(const offset of [-p.width/2-.12,p.width/2+.12]){
     const rx=dx-offset,r2=rx*rx+dy*dy+.18*.18;
     const f=SETTINGS.coulomb*q*this.poreCharge/(r2*Math.sqrt(r2));
     this.fx[i]+=f*rx;this.fy[i]+=f*dy;
    }
    // K-specific broad capture well extends entrance attraction, separate from core residence.
    if(this.type[i]===0){const ax=SETTINGS.kCaptureX**2,ay=SETTINGS.kCaptureY**2;const g=Math.exp(-.5*(dx*dx/ax+dy*dy/ay));this.fx[i]-=this.kCaptureDepth*g*dx/ax;this.fy[i]-=this.kCaptureDepth*g*dy/ay;}
    if(this.type[i]===0||this.type[i]===1){
     // Signed K core strength: negative repulsion gives a shallow binding well.
     // Field-polarized K–pore core: shift the local interaction upstream
     // during the pulse. Bulk electric force, drag, and temperature are unchanged.
     const ky=dy+(this.type[i]===0?SETTINGS.kCoreShift*E/SETTINGS.pulsePeak:0);
     const depth=this.type[i]===1?this.naDepth:-this.kCoreRepulsion;
     const g=Math.exp(-.5*(dx*dx/.1225+ky*ky/.09));this.fx[i]-=depth*g*dx/.1225;this.fy[i]-=depth*g*ky/.09;
    }
   }
  }
  if(!this.interactions)return;
  for(let i=0;i<this.n;i++)for(let j=i+1;j<this.n;j++){
   const dx=this.delta(this.x[i]-this.x[j],this.width),dy=this.delta(this.y[i]-this.y[j],this.height),r2=Math.max(dx*dx+dy*dy,1e-10),r=Math.sqrt(r2);
   const q=SPECIES[this.type[i]].charge*SPECIES[this.type[j]].charge;
   // 3D Coulomb law evaluated in the 2D plane; minimum-image periodic approximation.
   const f=SETTINGS.coulomb*q/(r2*r)+120*Math.max(0,.56-r)/r;
   const fx=f*dx,fy=f*dy;this.fx[i]+=fx;this.fx[j]-=fx;this.fy[i]+=fy;this.fy[j]-=fy;
  }
 }
 drift(i,dt){
  let remaining=dt;
  for(let bounce=0;bounce<8&&remaining>1e-10;bounce++){
   const x=this.x[i],y=this.y[i],dx=this.vx[i]*remaining,dy=this.vy[i]*remaining;let hit=1,normal=null;
   if(this.membrane)for(const wall of this.walls){
    const collision=hitRoundedWall(x,y,dx,dy,wall,GEOMETRY.edgeRadius,this.radius);
    if(collision&&collision.t<hit){hit=collision.t;normal=collision;}
   }
   let nx=x+dx*hit,ny=y+dy*hit;
   // The raster mask is expanded by the ion radius; small swept subsegments prevent tunneling.
   const pieces=Math.max(1,Math.ceil(Math.hypot(nx-x,ny-y)/.04));let logo=false;
   for(let k=1;k<=pieces;k++)if(this.logoHit(x+(nx-x)*k/pieces,y+(ny-y)*k/pieces)){
    const xx=x+(nx-x)*k/pieces,yy=y+(ny-y)*k/pieces;
    const hitX=this.logoHit(xx,y),hitY=this.logoHit(x,yy);
    if(hitX||!hitY)this.vx[i]*=-1;if(hitY||!hitX)this.vy[i]*=-1;
    nx=x;ny=y;logo=true;remaining=0;break;
   }
   this.x[i]=nx;this.y[i]=ny;
   if(!logo){remaining*=1-hit;if(normal){const vn=this.vx[i]*normal.nx+this.vy[i]*normal.ny;this.vx[i]-=2*vn*normal.nx;this.vy[i]-=2*vn*normal.ny;this.x[i]+=normal.nx*1e-8;this.y[i]+=normal.ny*1e-8;}else remaining=0;}
   this.x[i]=this.wrap(this.x[i],this.width);this.y[i]=this.wrap(this.y[i],this.height);
  }
 }
 contacts(){
  if(!this.interactions)return;
  const diameter=2*this.radius;
  for(let pass=0;pass<5;pass++){let overlap=false;for(let i=0;i<this.n;i++)for(let j=i+1;j<this.n;j++){
   const dx=this.delta(this.x[i]-this.x[j],this.width),dy=this.delta(this.y[i]-this.y[j],this.height);if(Math.abs(dx)>=diameter||Math.abs(dy)>=diameter)continue;const r=Math.hypot(dx,dy);if(r>=diameter||r<1e-10)continue;overlap=true;
   const nx=dx/r,ny=dy/r,gap=diameter-r+1e-8;
   const valid=(x,y)=>!this.inside(this.wrap(x,this.width),this.wrap(y,this.height))&&!this.logoHit(x,y);
   let ai=.5,aj=.5;if(!valid(this.x[i]+nx*gap/2,this.y[i]+ny*gap/2)){ai=0;aj=1;}else if(!valid(this.x[j]-nx*gap/2,this.y[j]-ny*gap/2)){ai=1;aj=0;}
   if(valid(this.x[i]+nx*gap*ai,this.y[i]+ny*gap*ai)&&valid(this.x[j]-nx*gap*aj,this.y[j]-ny*gap*aj)){
    this.x[i]=this.wrap(this.x[i]+nx*gap*ai,this.width);this.y[i]=this.wrap(this.y[i]+ny*gap*ai,this.height);this.x[j]=this.wrap(this.x[j]-nx*gap*aj,this.width);this.y[j]=this.wrap(this.y[j]-ny*gap*aj,this.height);
   }else{this.x[i]=this.oldX[i];this.y[i]=this.oldY[i];this.x[j]=this.oldX[j];this.y[j]=this.oldY[j];}
   const v=(this.vx[i]-this.vx[j])*nx+(this.vy[i]-this.vy[j])*ny;if(v<0){this.vx[i]-=v*nx;this.vy[i]-=v*ny;this.vx[j]+=v*nx;this.vy[j]+=v*ny;}
  }if(!overlap)break;}
 }
 trapped(i){return this.type[i]===1&&Math.abs(this.y[i]-this.center)<.35&&this.pores.some(p=>Math.abs(this.x[i]-p.x)<.09);}
 step(count=1){
  const h=this.dt/2,c=Math.exp(-this.friction*this.dt),noise=Math.sqrt(this.temperature*(1-c*c)),ck=Math.exp(-this.kFriction*this.dt),nk=Math.sqrt(this.temperature*(1-ck*ck));
  for(let k=0;k<count;k++){
   this.oldX.set(this.x);this.oldY.set(this.y);
   for(let i=0;i<this.n;i++){this.vx[i]+=h*this.fx[i];this.vy[i]+=h*this.fy[i];this.drift(i,h);}this.contacts();
   this.oldX.set(this.x);this.oldY.set(this.y);
   for(let i=0;i<this.n;i++){const decay=this.type[i]===0?ck:c,thermal=this.type[i]===0?nk:noise;this.vx[i]=decay*this.vx[i]+thermal*this.normal();this.vy[i]=decay*this.vy[i]+thermal*this.normal();this.drift(i,h);}this.contacts();
   this.time+=this.dt;this.forces();for(let i=0;i<this.n;i++){
    this.vx[i]+=h*this.fx[i];this.vy[i]+=h*this.fy[i];
   }
  }
 }
 state(){return {initialTrapped:this.initialTrapped,edgeRadius:GEOMETRY.edgeRadius,width:this.width,height:this.height,viewHeight:GEOMETRY.viewHeight,viewY:GEOMETRY.viewY,center:this.center,membraneHalf:GEOMETRY.membraneHalf,radius:this.radius,x:Array.from(this.x),y:Array.from(this.y),type:Array.from(this.type),pores:this.pores,time:this.time,field:this.pulse()};}
}
