import {PoreGlowTracker} from './pore-glow.mjs?v=field55-period6-20261010';
import {IonMembrane,GEOMETRY} from './core.mjs?v=field55-period6-20261010';
const PLAYBACK_RATE=1.5;
let sim,obstacleMask,glow;
self.onmessage=({data})=>{
 if(data.obstacleMask)obstacleMask=data.obstacleMask;
 if(data.type==='reset'||!sim){sim=new IonMembrane({seed:data.seed||74321,obstacleMask});glow=new PoreGlowTracker(sim,GEOMETRY.membraneHalf);}
 if(data.pulsed!==undefined){sim.pulsed=data.pulsed;sim.field=0;sim.forces();}
 // Retain the original work budget; the view requests batches 1.5 times as often.
 // This changes batching only: dt, random sequence, and all force laws stay the same.
 if(data.type==='step'){
  const deadline=performance.now()+8;let steps=0;
  do{sim.step();glow.update(sim);steps++;}while(steps<20&&performance.now()<deadline);
 }
 const state=sim.state();state.playbackRate=PLAYBACK_RATE;state.poreGlow=glow.flags.slice();if(!state.x.every(Number.isFinite)||!state.y.every(Number.isFinite)){self.postMessage({error:'Nonfinite state'});return;}
 self.postMessage(state,[state.x.buffer,state.y.buffer,state.poreGlow.buffer]);
};
