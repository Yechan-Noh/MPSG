import {IonMembrane} from './core.mjs?v=fast-contacts-20261010';
let sim,obstacleMask;
self.onmessage=({data})=>{
 if(data.obstacleMask)obstacleMask=data.obstacleMask;
 if(data.type==='reset'||!sim)sim=new IonMembrane({seed:data.seed||74321,obstacleMask});
 if(data.pulsed!==undefined){sim.pulsed=data.pulsed;sim.field=0;sim.forces();}
 // Yield a fresh frame within a small work budget, rather than waiting for 20 steps.
 // This changes batching only: dt, random sequence, and all force laws stay the same.
 if(data.type==='step'){
  const deadline=performance.now()+8;let steps=0;
  do{sim.step();steps++;}while(steps<20&&performance.now()<deadline);
 }
 const state=sim.state();if(!state.x.every(Number.isFinite)||!state.y.every(Number.isFinite)){self.postMessage({error:'Nonfinite state'});return;}
 self.postMessage(state,[state.x.buffer,state.y.buffer]);
};
