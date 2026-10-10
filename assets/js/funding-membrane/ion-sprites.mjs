// Small reusable canvas sprites: no per-frame gradients, shadows, filters, or image downloads.
export function createIonSprites(colors){
 const mix=(hex,amount)=>{const v=hex.slice(1).match(/../g).map(x=>parseInt(x,16));return 'rgb('+v.map(c=>Math.round(amount>=0?c+(255-c)*amount:c*(1+amount))).join(',')+')';};
 const rgba=(hex,a)=>{const v=hex.slice(1).match(/../g).map(x=>parseInt(x,16));return `rgba(${v.join(',')},${a})`;};
 const make=size=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=size;return canvas;};
 return colors.map(color=>{
  const body=make(64),ctx=body.getContext('2d'),c=32,r=30;
  const sphere=ctx.createRadialGradient(c-r*.34,c-r*.38,r*.04,c+r*.14,c+r*.16,r*1.08);
  sphere.addColorStop(0,mix(color,.86));sphere.addColorStop(.18,mix(color,.47));sphere.addColorStop(.48,color);sphere.addColorStop(.8,mix(color,-.22));sphere.addColorStop(1,mix(color,-.48));
  ctx.fillStyle=sphere;ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.fill();
  const glint=ctx.createRadialGradient(c-r*.28,c-r*.34,0,c-r*.28,c-r*.34,r*.38);
  glint.addColorStop(0,'rgba(255,255,255,.65)');glint.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=glint;ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.fill();
  const halo=make(128),h=halo.getContext('2d'),g=h.createRadialGradient(64,64,0,64,64,63);
  g.addColorStop(0,rgba(color,.88));g.addColorStop(.2,rgba(color,.72));g.addColorStop(.38,rgba(color,.35));g.addColorStop(.68,rgba(color,.10));g.addColorStop(1,rgba(color,0));h.fillStyle=g;h.fillRect(0,0,128,128);
  const light=make(64),l=light.getContext('2d'),hot=l.createRadialGradient(32,32,0,32,32,30);
  hot.addColorStop(0,'#ffffff');hot.addColorStop(.2,mix(color,.9));hot.addColorStop(.55,mix(color,.48));hot.addColorStop(1,rgba(color,0));l.fillStyle=hot;l.fillRect(0,0,64,64);
  return {body,halo,light};
 });
}
