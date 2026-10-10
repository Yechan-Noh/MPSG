(() => {
  const gallery=document.querySelector('.journal-exhibition');
  if(!gallery)return;
  const original=[...gallery.querySelectorAll('.journal-item img')];if(!original.length)return;
  const priority=['Physical Review Letters','Science Advances','Nature Communications','ACS Nano','Nano Letters','small'];
  const logoEmphasis=name=>['The Journal of Physical Chemistry Letters','The Journal of Physical Chemistry B'].includes(name)?1.08:(priority.includes(name)?1.2:.9);
  const rank=name=>{const n=priority.indexOf(name);return n<0?priority.length+original.findIndex(i=>i.alt===name):n};
  const sources=[...original].sort((a,b)=>rank(a.alt)-rank(b.alt));
  const NS='http://www.w3.org/2000/svg';
  const node=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;return n};
  const params=new URLSearchParams(location.search);let mode=[1,2,3,4].includes(Number(params.get('orbits')))?Number(params.get('orbits')):4;
  const svg=node('svg',{role:'img','aria-label':'Journal logos rotating at uniform intervals, with subtle fading at the back'});svg.classList.add('elliptical-stage');svg.style.isolation='isolate';
  const configs={1:[[400,120,15,130]],2:[[400,160,9,134],[250,90,6,116]],3:[[400,180,5,142],[265,115,5,116],[135,50,5,90]]};
  let logos=[],phase=0,last=0,elapsed=0;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduce.matches;
  const button=document.createElement('button');button.type='button';button.className='orbit-pause';
  function status(){button.textContent=paused?'▶':'Ⅱ';button.setAttribute('aria-label',paused?'Play journal rotation':'Pause journal rotation')}
  button.addEventListener('click',()=>{paused=!paused;status()});
  let options;
  if(params.get('study')==='1'){
    options=document.createElement('div');options.className='orbit-options';options.setAttribute('aria-label','Orbit design comparison');
    [1,2,3,4].forEach(n=>{const b=document.createElement('button');b.type='button';b.textContent=n===4?'분야별 궤도':`${n}개 궤도`;b.dataset.orbits=n;b.onclick=()=>{mode=n;phase=0;elapsed=0;build();const q=new URLSearchParams(location.search);q.set('orbits',n);history.replaceState(null,'',`${location.pathname}?${q}`)};options.append(b)});gallery.append(options);
  }
  gallery.append(svg,button);gallery.classList.add('is-elliptical');
  function build(){
    svg.replaceChildren();logos=[];
    if(mode===4){buildFields();if(options)options.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.orbits)===mode));draw();return;}
    const cy=mode===1?195:235;
    svg.setAttribute('viewBox',`0 0 1000 ${mode===1?390:470}`);
    const rings=configs[mode];rings.forEach(([rx,ry])=>svg.append(node('ellipse',{cx:500,cy,rx,ry,fill:'none',stroke:'#e7edef','stroke-width':1})));
    svg.append(node('text',{x:500,y:cy+19,'text-anchor':'middle',fill:'#7b8d96','font-size':8,'font-family':'Inter, Arial, sans-serif','letter-spacing':1.6},'PUBLICATION VENUES'));
    const groups=rings.map(()=>[]);
    sources.forEach(source=>{const available=groups.map((g,j)=>({g,j})).filter(({g,j})=>g.length<rings[j][2]);available.sort((a,b)=>a.g.length-b.g.length||a.j-b.j);available[0].g.push(source)});
    groups.forEach((group,j)=>group.forEach((source,i)=>{const slot=i===0?0:(i%2===1?(i+1)/2:-i/2);const g=node('g'),img=node('image',{href:source.src,preserveAspectRatio:'xMidYMid meet'});g.append(node('title',{},source.alt),img);svg.append(g);logos.push({g,img,ring:j,slot,cy,emphasis:logoEmphasis(source.alt)})}));
    if(options)options.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.orbits)===mode));draw();
  }
  // Keep the projected orbital depth at approximately 10% of its width.
  const elevation=Math.asin(.1), cameraDistance=1700;
  function projectPoint(field,groundX,groundY){
    const depth=groundY*Math.cos(elevation),perspective=cameraDistance/(cameraDistance-depth);
    return {x:500+groundX*perspective,y:145+(field.offsetY||0)+groundY*Math.sin(elevation)*perspective,depth,scale:.86*perspective};
  }
  function projectOrbit(field,a){return projectPoint(field,field.cx-500+field.rx*Math.cos(a),field.rx*Math.sin(a));}
  function buildFields(){
    svg.setAttribute('viewBox','0 8 1000 220');
    const fields=[
      {name:'Publication venues',offsetY:-12,cx:500,cy:145,rx:410,ry:41,width:132,speed:1,venues:[
        'Science Advances','Physical Review E','Nano Letters','The Journal of Physical Chemistry B',
        'Nature Communications','Applied Physics Letters','small','The Journal of Chemical Physics',
        'ACS Nano','Physical Review Materials','nanoscale','The Journal of Physical Chemistry Letters',
        'Scientific Reports','Physical Review Letters','applied science'
      ]}
    ];
    const defs=node('defs'),gradient=node('linearGradient',{id:'orbital-depth',x1:0,y1:65,x2:0,y2:255,gradientUnits:'userSpaceOnUse'});
    gradient.append(node('stop',{offset:0,'stop-color':'#e0e9ed'}),node('stop',{offset:1,'stop-color':'#91a8b3'}));defs.append(gradient);svg.append(defs);
    fields.forEach((f,j)=>{
      const points=Array.from({length:181},(_,i)=>projectOrbit(f,i*Math.PI/90));
      const d=points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')+' Z';
      svg.append(node('path',{d,fill:'none',stroke:'url(#orbital-depth)','stroke-width':1.15,'data-orbit':f.name}));
      f.venues.forEach((venue,i)=>{
        const source=original.find(s=>s.alt===venue);if(!source)return;
        const slot=j===2?(Math.floor(i/2)+.5)*(i%2?-1:1):(i===0?0:(i%2===1?(i+1)/2:-i/2));
        const g=node('g',{'data-field':f.name}),img=node('image',{href:source.src,preserveAspectRatio:'xMidYMid meet'});
        g.append(node('title',{},source.alt),img);svg.append(g);logos.push({g,img,slot,field:f,emphasis:logoEmphasis(source.alt)});
      });
    });
    const label=(x,y,text,size=18,color='#284451')=>svg.append(node('text',{x,y,'text-anchor':'middle',fill:color,'font-size':size,'font-family':'Inter, Arial, sans-serif','font-weight':500},text));
    label(500,31,'CHEMISTRY · PHYSICS · MATERIALS',14,'#284451');
  }
  function draw(){
    const ordered=[];
    logos.forEach(({g,img,ring,slot,cy,field,emphasis=1})=>{
      const [rx,ry,n,baseWidth]=field?[field.rx,field.ry,field.venues.length,field.width]:configs[mode][ring],speed=field?field.speed:[1,-.8,.6][ring];
      const cx=field?field.cx:500;cy=field?field.cy:cy;
      const a=Math.PI/2+slot*2*Math.PI/n+phase*speed;
      const projected=field?projectOrbit(field,a):{x:cx+rx*Math.cos(a),y:cy+ry*Math.sin(a),depth:(Math.sin(a)+1)/2,scale:.58+.42*(Math.sin(a)+1)/2};
      const {x,y,depth,scale}=projected,w=baseWidth*scale*emphasis,h=36*scale*emphasis;
      Object.entries({x:x-w/2,y:y-h/2,width:w,height:h}).forEach(([k,v])=>img.setAttribute(k,v));
      const rear=Math.max(0,-Math.sin(a));
      g.style.opacity=String(1-.28*rear);g.style.filter=rear?`blur(${(.65*rear).toFixed(3)}px)`:'none';g.style.mixBlendMode='multiply';ordered.push({g,depth});
    });
    ordered.sort((a,b)=>a.depth-b.depth).forEach(({g})=>svg.append(g));
  }
  function frame(now){
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    if(!paused&&!document.hidden){
      elapsed+=dt;
      if(elapsed>1.2){phase+=dt*2*Math.PI*.7/45;draw();}
    }
    requestAnimationFrame(frame);
  }
  reduce.addEventListener('change',e=>{paused=e.matches;status()});status();build();requestAnimationFrame(frame);
})();
