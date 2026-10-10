// Visual residency indicator only: it never changes forces, velocities, or random numbers.
// A brief crossing does not light up. Leaving the pore core extinguishes it immediately.
export class PoreGlowTracker {
 constructor(sim,halfDepth,dwell=.24){
  this.halfDepth=halfDepth;this.dwell=dwell;
  this.age=new Float64Array(sim.n);this.pore=new Int16Array(sim.n);this.pore.fill(-1);this.flags=new Uint8Array(sim.n);
  // Na ions explicitly initialized in pore centers are already trapped at t=0.
  for(let i=0;i<sim.n;i++)if(sim.type[i]===1){const p=this.site(sim,i);if(p>=0){this.pore[i]=p;this.age[i]=dwell;this.flags[i]=1;}}
 }
 site(sim,i){
  if(!sim.membrane||sim.type[i]===2||Math.abs(sim.y[i]-sim.center)>this.halfDepth)return -1;
  const index=Math.min(sim.pores.length-1,Math.floor(sim.x[i]*sim.pores.length/sim.width));
  const pore=sim.pores[index];
  return Math.abs(sim.x[i]-pore.x)<=pore.width/2-sim.radius+.015?index:-1;
 }
 update(sim){
  for(let i=0;i<sim.n;i++){
   const p=this.site(sim,i);
   if(p<0){this.age[i]=0;this.pore[i]=-1;this.flags[i]=0;continue;}
   this.age[i]=p===this.pore[i]?this.age[i]+sim.dt:sim.dt;
   this.pore[i]=p;this.flags[i]=this.age[i]>=this.dwell-1e-10?1:0;
  }
 }
}
