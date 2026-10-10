import {IonMembrane} from './core.mjs?v=domain70-20261010';
let sim,obstacleMask;
self.onmessage=({data})=>{
 if(data.obstacleMask)obstacleMask=data.obstacleMask;
 if(data.type==='reset'||!sim)sim=new IonMembrane({seed:data.seed||74321,obstacleMask});
 if(data.pulsed!==undefined){sim.pulsed=data.pulsed;sim.field=0;sim.forces();}
 const started=performance.now();if(data.type==='step')sim.step(20);
 const state=sim.state();state.stepMs=performance.now()-started;state.invalidPositions=Array.from(sim.x).filter((x,i)=>sim.inside(x,sim.y[i])||sim.logoHit(x,sim.y[i])).length;if(!state.x.every(Number.isFinite)||!state.y.every(Number.isFinite)){self.postMessage({error:'Nonfinite state'});return;}
 self.postMessage(state);
};
