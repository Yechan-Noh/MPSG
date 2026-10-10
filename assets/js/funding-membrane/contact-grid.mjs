// Dynamic linked-cell broad phase. Cells are at least one ion diameter wide.
// Only collision candidates are culled; Coulomb interactions remain all-pairs.
export class ContactGrid {
 constructor(width,height,diameter,n){
  this.width=width;this.height=height;
  this.nx=Math.max(3,Math.floor(width/diameter));this.ny=Math.max(3,Math.floor(height/diameter));
  this.sx=this.nx/width;this.sy=this.ny/height;
  this.head=new Int32Array(this.nx*this.ny);this.next=new Int32Array(n);this.prev=new Int32Array(n);this.cell=new Int32Array(n);this.candidates=new Int32Array(n);
 }
 index(x,y){return Math.min(this.ny-1,Math.floor(y*this.sy))*this.nx+Math.min(this.nx-1,Math.floor(x*this.sx));}
 insert(i,c){const first=this.head[c];this.cell[i]=c;this.prev[i]=-1;this.next[i]=first;if(first>=0)this.prev[first]=i;this.head[c]=i;}
 rebuild(x,y){this.head.fill(-1);for(let i=0;i<x.length;i++)this.insert(i,this.index(x[i],y[i]));}
 update(i,x,y){const c=this.index(x,y),old=this.cell[i];if(c===old)return;const prev=this.prev[i],next=this.next[i];if(prev<0)this.head[old]=next;else this.next[prev]=next;if(next>=0)this.prev[next]=prev;this.insert(i,c);}
 collect(i,after){
  const c=this.cell[i],cx=c%this.nx,cy=Math.floor(c/this.nx);let count=0;
  for(let oy=-1;oy<=1;oy++){
   const yy=(cy+oy+this.ny)%this.ny;
   for(let ox=-1;ox<=1;ox++){
    const xx=(cx+ox+this.nx)%this.nx;
    for(let j=this.head[yy*this.nx+xx];j>=0;j=this.next[j])if(j>after){
     // Preserve the original i,j order, avoiding per-ion arrays and sorting allocations.
     let k=count++;while(k>0&&this.candidates[k-1]>j){this.candidates[k]=this.candidates[k-1];k--;}this.candidates[k]=j;
    }
   }
  }
  return count;
 }
}
