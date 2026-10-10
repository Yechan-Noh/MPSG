// A rounded solid wall, expanded by the ion radius (Minkowski sum).
// Reflection is against the same circular entrance bevel drawn in the canvas.
export function insideRoundedWall(x,y,[l,r,t,b],corner,ion){
 const cx=Math.max(l+corner,Math.min(r-corner,x)),cy=Math.max(t+corner,Math.min(b-corner,y));
 return (x-cx)**2+(y-cy)**2<(corner+ion)**2;
}
export function hitRoundedWall(x,y,dx,dy,[l,r,t,b],corner,ion){
 if(Math.max(x,x+dx)<l-ion||Math.min(x,x+dx)>r+ion||Math.max(y,y+dy)<t-ion||Math.min(y,y+dy)>b+ion)return null;
 const radius=corner+ion;let best=null;
 const offer=(time,nx,ny)=>{if(time>=-1e-10&&time<=1&&dx*nx+dy*ny<-1e-14&&(!best||time<best.t))best={t:Math.max(0,time),nx,ny};};
 if(Math.abs(dx)>1e-14)for(const [edge,nx] of [[l-ion,-1],[r+ion,1]]){const u=(edge-x)/dx,yy=y+u*dy;if(yy>=t+corner&&yy<=b-corner)offer(u,nx,0);}
 if(Math.abs(dy)>1e-14)for(const [edge,ny] of [[t-ion,-1],[b+ion,1]]){const u=(edge-y)/dy,xx=x+u*dx;if(xx>=l+corner&&xx<=r-corner)offer(u,0,ny);}
 const A=dx*dx+dy*dy;if(A<1e-28)return best;
 for(const [cx,cy,sx,sy] of [[l+corner,t+corner,-1,-1],[r-corner,t+corner,1,-1],[l+corner,b-corner,-1,1],[r-corner,b-corner,1,1]]){
  const ox=x-cx,oy=y-cy,B=2*(ox*dx+oy*dy),C=ox*ox+oy*oy-radius*radius,D=B*B-4*A*C;
  if(D<0)continue;
  const u=(-B-Math.sqrt(D))/(2*A),rx=ox+u*dx,ry=oy+u*dy;
  if(rx*sx>=-1e-9&&ry*sy>=-1e-9)offer(u,rx/radius,ry/radius);
 }
 return best;
}
