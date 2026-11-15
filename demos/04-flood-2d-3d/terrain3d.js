/* Full source DEM/imagery rendering. Visual exaggeration never modifies flood depths. */
window.InfraWatchTerrain3D=(()=>{
  'use strict';
  const normalize=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  function multiply(a,b){const m=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)m[c*4+r]+=a[k*4+r]*b[c*4+k];return m}
  function camera(yaw,elevation,zoom,aspect,height=0,fit=1.3){
    const distance=fit/zoom,target=[0,height,0],eye=[Math.sin(yaw)*Math.cos(elevation)*distance,height+Math.sin(elevation)*distance,Math.cos(yaw)*Math.cos(elevation)*distance];
    const z=normalize(eye.map((v,i)=>v-target[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x);
    const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
    const f=1/Math.tan(Math.PI/8),near=.005,far=12,projection=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
    return {matrix:multiply(projection,view),eye};
  }
  function fitDistance(yaw,elevation,aspect,mesh,vertical){
    const z=[Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation)],x=normalize(cross([0,1,0],z)),y=cross(z,x),target=(mesh.top-mesh.base)/mesh.width*vertical*.35,f=1/Math.tan(Math.PI/8);let distance=.3;
    for(const east of [-.5,.5])for(const south of [-mesh.height/mesh.width/2,mesh.height/mesh.width/2])for(const altitude of [-25/mesh.width*vertical,(mesh.top-mesh.base)/mesh.width*vertical]){const p=[east,altitude-target,south];distance=Math.max(distance,dot(z,p)+Math.abs(dot(x,p))*f/(aspect*.88),dot(z,p)+Math.abs(dot(y,p))*f/.88)}return distance;
  }
  function project(matrix,p,width,height){const v=[...p,1],clip=[0,0,0,0];for(let r=0;r<4;r++)for(let c=0;c<4;c++)clip[r]+=matrix[c*4+r]*v[c];return {x:(clip[0]/clip[3]+1)*width/2,y:(1-clip[1]/clip[3])*height/2,visible:clip[3]>0&&Math.abs(clip[0])<=clip[3]&&Math.abs(clip[1])<=clip[3]&&Math.abs(clip[2])<=clip[3]}}
  function buildMesh(dem){
    const {width:W,height:H,bbox:b,data}=dem;if(W<2||H<2||W*H>65535||data.length!==W*H||!data.every(Number.isFinite))throw Error('Niepoprawna siatka terenu.');
    const width=(b[2]-b[0])*111320*Math.cos((b[1]+b[3])/2*Math.PI/180),height=(b[3]-b[1])*111320,base=Math.min(...data),top=Math.max(...data),positions=new Float32Array(W*H*3),normals=new Float32Array(W*H*3),uv=new Float32Array(W*H*2),indices=new Uint16Array((W-1)*(H-1)*6);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=y*W+x,x0=Math.max(0,x-1),x1=Math.min(W-1,x+1),y0=Math.max(0,y-1),y1=Math.min(H-1,y+1);
      positions.set([x/(W-1)-.5,(data[i]-base)/width,(y/(H-1)-.5)*height/width],i*3);uv.set([x/(W-1),y/(H-1)],i*2);
      const dx=(data[y*W+x1]-data[y*W+x0])/((x1-x0)*width/(W-1)),dz=(data[y1*W+x]-data[y0*W+x])/((y1-y0)*height/(H-1));normals.set(normalize([-dx,1,-dz]),i*3);
    }
    let k=0;for(let y=0;y<H-1;y++)for(let x=0;x<W-1;x++){const a=y*W+x;indices.set([a,a+W,a+1,a+1,a+W,a+W+1],k);k+=6}
    const wallPositions=[],wallNormals=[],wallUV=[],wallIndices=[];
    const edges=[Array.from({length:W},(_,x)=>x),Array.from({length:H},(_,y)=>y*W+W-1),Array.from({length:W},(_,x)=>(H-1)*W+W-1-x),Array.from({length:H},(_,y)=>(H-1-y)*W)];
    edges.forEach((edge,e)=>{const normal=[[0,0,-1],[1,0,0],[0,0,1],[-1,0,0]][e],offset=wallPositions.length/3;edge.forEach(i=>{wallPositions.push(positions[i*3],positions[i*3+1],positions[i*3+2],positions[i*3],-25/width,positions[i*3+2]);wallNormals.push(...normal,...normal);wallUV.push(uv[i*2],uv[i*2+1],uv[i*2],uv[i*2+1])});for(let n=0;n<edge.length-1;n++){const a=offset+2*n;wallIndices.push(a,a+1,a+2,a+2,a+1,a+3)}});
    return {positions,normals,uv,indices,width,height,base,top,W,H,walls:{positions:new Float32Array(wallPositions),normals:new Float32Array(wallNormals),uv:new Float32Array(wallUV),indices:new Uint16Array(wallIndices)}};
  }
  function waterData(mesh,depths){
    if(depths.length!==mesh.W*mesh.H)throw Error('Niezgodna siatka głębokości.');
    const positions=mesh.positions.slice(),pixels=new Uint8Array(depths.length*4);
    for(let i=0;i<depths.length;i++){const d=Number.isFinite(depths[i])&&depths[i]>0?depths[i]:0;positions[i*3+1]+=d/mesh.width;const color=d<=1?[85,213,223]:d<=3?[27,150,210]:[35,83,175];pixels.set([...color,d>0?255:0],i*4)}
    return {positions,pixels};
  }
  const vertex=`#version 300 es
    in vec3 aPosition; in vec3 aNormal; in vec2 aUV;
    uniform mat4 uMatrix; uniform float uExaggeration; uniform float uWorldWidth; uniform float uBase;
    out vec2 vUV; out vec3 vNormal; out vec3 vWorld; out float vHeight;
    void main(){vUV=aUV;vNormal=normalize(vec3(aNormal.x*uExaggeration,aNormal.y,aNormal.z*uExaggeration));vWorld=vec3(aPosition.x,aPosition.y*uExaggeration,aPosition.z);vHeight=aPosition.y*uWorldWidth+uBase;gl_Position=uMatrix*vec4(vWorld,1.0);}`;
  const terrainFragment=`#version 300 es
    precision highp float; in vec2 vUV; in vec3 vNormal; in float vHeight;
    uniform sampler2D uImage; uniform bool uWall; uniform bool uContours; out vec4 outColor;
    void main(){vec3 n=normalize(vNormal);float light=.70+.34*max(0.0,dot(n,normalize(vec3(-.5,.85,.4))));vec3 c=uWall?vec3(.11,.20,.22):texture(uImage,vUV).rgb;
      if(uContours&&!uWall){float gap=abs(fract(vHeight/5.0+.5)-.5)*5.0;float line=1.0-smoothstep(.08,.08+max(fwidth(vHeight)*.8,.08),gap);c=mix(c,vec3(.1,.23,.22),line*.45);}outColor=vec4(c*light,1.0);}`;
  const waterFragment=`#version 300 es
    precision highp float; in vec2 vUV; in vec3 vWorld; uniform sampler2D uWater; uniform float uOpacity; uniform vec3 uEye; out vec4 outColor;
    void main(){vec4 c=texture(uWater,vUV);if(c.a<.5)discard;float rim=pow(1.0-max(0.0,dot(normalize(uEye-vWorld),vec3(0,1,0))),3.0);outColor=vec4(mix(c.rgb,vec3(.65,.86,.93),rim*.25),uOpacity);}`;
  const markerVertex=`#version 300 es
    in vec3 aPosition; in vec3 aColor; uniform mat4 uMatrix; uniform float uExaggeration; uniform float uSize; out vec3 vColor;
    void main(){vColor=aColor;gl_Position=uMatrix*vec4(aPosition.x,aPosition.y*uExaggeration,aPosition.z,1.0);gl_PointSize=uSize;}`;
  const markerFragment=`#version 300 es
    precision highp float; in vec3 vColor; uniform bool uPoints;out vec4 outColor;
    void main(){float r=length(gl_PointCoord-vec2(.5));if(uPoints&&r>.5)discard;outColor=vec4(uPoints&&r>.34?vec3(.07,.12,.15):vColor,1.0);}`;
  let instance=null,controls=null,attempted=false;
  function makeControls(){
    if(controls)return controls;
    controls=document.createElement('section');controls.id='terrain3dControls';controls.className='terrain3d-controls';controls.hidden=true;controls.setAttribute('aria-label','Ustawienia widoku 3D');
    controls.innerHTML='<div class="terrain3d-settings"><label for="terrainExaggeration">Skala pionowa <strong id="terrainExaggerationValue">×12</strong><input type="range" id="terrainExaggeration" min="1" max="30" step="1" value="12"></label><label class="terrain3d-contours"><input type="checkbox" id="terrainContours"> Warstwice co 5 m</label><button type="button" id="terrainZoomIn" aria-label="Przybliż teren 3D">＋</button><button type="button" id="terrainZoomOut" aria-label="Oddal teren 3D">−</button></div><p id="terrain3dStatus" role="status">Pełna tekstura i cieniowanie terenu. Skala pionowa zmienia tylko wizualizację.</p>';
    document.querySelector('.mapShell').before(controls);return controls;
  }
  function setVisible(visible){if(controls)controls.hidden=!visible;if(instance)instance.canvas.hidden=!visible}
  function create(inputCanvas,dem,images,{onInvalidate,onSelect,onZoom}){
    attempted=true;
    makeControls();const status=document.getElementById('terrain3dStatus'),canvas=document.createElement('canvas');canvas.className='terrain3d-webgl';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;inputCanvas.before(canvas);
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true});
    if(!gl){canvas.remove();status.textContent='Tryb uproszczony: przeglądarka nie udostępnia WebGL 2. Włącz akcelerację grafiki, aby użyć pełnej tekstury 3D.';controls.querySelectorAll('input,button').forEach(n=>n.disabled=true);controls.hidden=false;return null}
    const mesh=buildMesh(dem),exaggeration=document.getElementById('terrainExaggeration'),contours=document.getElementById('terrainContours');
    let terrainProgram,waterProgram,markerProgram,land,wall,water,waterTexture,markerBuffer,colorBuffer,textures={},lost=false,lastDepths=null,last=null,pickPoints=[];
    function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader}
    function program(v,f){const p=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,v),fs=compile(gl.FRAGMENT_SHADER,f);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return {p,attributes:Object.fromEntries(['aPosition','aNormal','aUV','aColor'].map(key=>[key,gl.getAttribLocation(p,key)])),uniforms:Object.fromEntries(['uMatrix','uExaggeration','uWorldWidth','uBase','uImage','uWall','uContours','uWater','uOpacity','uEye','uSize','uPoints'].map(key=>[key,gl.getUniformLocation(p,key)]))}}
    function buffer(type,data,usage=gl.STATIC_DRAW){const b=gl.createBuffer();gl.bindBuffer(type,b);gl.bufferData(type,data,usage);return b}
    function geometry(g){return {position:buffer(gl.ARRAY_BUFFER,g.positions),normal:buffer(gl.ARRAY_BUFFER,g.normals),uv:buffer(gl.ARRAY_BUFFER,g.uv),index:buffer(gl.ELEMENT_ARRAY_BUFFER,g.indices),count:g.indices.length}}
    function imageTexture(image){
      const limit=gl.getParameter(gl.MAX_TEXTURE_SIZE);let source=image;
      if(image.naturalWidth>limit||image.naturalHeight>limit){const c=document.createElement('canvas'),scale=Math.min(limit/image.naturalWidth,limit/image.naturalHeight);c.width=Math.floor(image.naturalWidth*scale);c.height=Math.floor(image.naturalHeight*scale);c.getContext('2d').drawImage(image,0,0,c.width,c.height);source=c}
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');if(anisotropy)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));return texture;
    }
    function initialize(){
      terrainProgram=program(vertex,terrainFragment);waterProgram=program(vertex,waterFragment);markerProgram=program(markerVertex,markerFragment);land=geometry(mesh);wall=geometry(mesh.walls);water={...land,position:buffer(gl.ARRAY_BUFFER,mesh.positions,gl.DYNAMIC_DRAW)};
      markerBuffer=gl.createBuffer();colorBuffer=gl.createBuffer();textures=Object.fromEntries(Object.entries(images).map(([key,image])=>[key,imageTexture(image)]));waterTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,waterTexture);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.NEAREST);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);lastDepths=null;lost=false;
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(.055,.12,.16,1);
    }
    function attribute(p,key,b,size){const loc=p.attributes[key];if(loc<0)return;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0)}
    function bind(p,g,matrix,vertical){gl.useProgram(p.p);attribute(p,'aPosition',g.position,3);attribute(p,'aNormal',g.normal,3);attribute(p,'aUV',g.uv,2);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,g.index);gl.uniformMatrix4fv(p.uniforms.uMatrix,false,matrix);gl.uniform1f(p.uniforms.uExaggeration,vertical);gl.uniform1f(p.uniforms.uWorldWidth,mesh.width);gl.uniform1f(p.uniforms.uBase,mesh.base)}
    function objectPosition(p){const x=(p.lon-dem.bbox[0])/(dem.bbox[2]-dem.bbox[0]),y=(dem.bbox[3]-p.lat)/(dem.bbox[3]-dem.bbox[1]),i=Math.max(0,Math.min(mesh.H-1,Math.round(y*(mesh.H-1))))*mesh.W+Math.max(0,Math.min(mesh.W-1,Math.round(x*(mesh.W-1))));return [x-.5,(dem.data[i]-mesh.base+.8)/mesh.width,(y-.5)*mesh.height/mesh.width]}
    function drawMarkers(options,matrix,vertical,dpr){
      const positions=[],colors=[],byId=new Map(options.points.map(p=>[p.id,p]));
      for(let i=1;i<options.nodes.length;i++){const a=byId.get(options.nodes[i-1]),b=byId.get(options.nodes[i]);if(a&&b){positions.push(...objectPosition(a),...objectPosition(b));colors.push(1,.84,.48,1,.84,.48)}}
      gl.useProgram(markerProgram.p);gl.uniformMatrix4fv(markerProgram.uniforms.uMatrix,false,matrix);gl.uniform1f(markerProgram.uniforms.uExaggeration,vertical);gl.uniform1i(markerProgram.uniforms.uPoints,0);
      const upload=(ps,cs)=>{gl.bindBuffer(gl.ARRAY_BUFFER,markerBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ps),gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(cs),gl.DYNAMIC_DRAW);attribute(markerProgram,'aPosition',markerBuffer,3);attribute(markerProgram,'aColor',colorBuffer,3)};
      upload(positions,colors);gl.drawArrays(gl.LINES,0,positions.length/3);
      pickPoints=[];for(const selected of [false,true]){const ps=[],cs=[];for(const p of options.points){if((p===options.selected)!==selected)continue;const position=objectPosition(p);ps.push(...position);cs.push(...(selected?[1,1,1]:[1,.84,.48]));pickPoints.push({p,...project(matrix,[position[0],position[1]*vertical,position[2]],last.width,last.height)})}upload(ps,cs);gl.uniform1i(markerProgram.uniforms.uPoints,1);gl.uniform1f(markerProgram.uniforms.uSize,(selected?15:10)*dpr);gl.drawArrays(gl.POINTS,0,ps.length/3)}
    }
    function render(options){
      if(lost)return false;const rect=inputCanvas.getBoundingClientRect();if(!rect.width||!rect.height)return true;
      controls.hidden=false;canvas.hidden=false;const vertical=Number(exaggeration.value),dpr=Math.max(.5,Math.min(window.devicePixelRatio||1,2,Math.sqrt(4000000/(rect.width*rect.height)))),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}last={...options,width:rect.width,height:rect.height};const aspect=rect.width/rect.height,fit=fitDistance(options.angle,options.pitch,aspect,mesh,vertical),view=camera(options.angle,options.pitch,options.zoom,aspect,(mesh.top-mesh.base)/mesh.width*vertical*.35,fit);
      const overlay=inputCanvas.getContext('2d');if(overlay)overlay.clearRect(0,0,inputCanvas.width,inputCanvas.height);gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.depthMask(true);gl.disable(gl.BLEND);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[options.base]||textures.optical);bind(terrainProgram,wall,view.matrix,vertical);gl.uniform1i(terrainProgram.uniforms.uImage,0);gl.uniform1i(terrainProgram.uniforms.uWall,1);gl.uniform1i(terrainProgram.uniforms.uContours,0);gl.drawElements(gl.TRIANGLES,wall.count,gl.UNSIGNED_SHORT,0);
      bind(terrainProgram,land,view.matrix,vertical);gl.uniform1i(terrainProgram.uniforms.uWall,0);gl.uniform1i(terrainProgram.uniforms.uContours,contours.checked?1:0);gl.drawElements(gl.TRIANGLES,land.count,gl.UNSIGNED_SHORT,0);
      if(lastDepths!==options.depths){const data=waterData(mesh,options.depths);gl.bindBuffer(gl.ARRAY_BUFFER,water.position);gl.bufferSubData(gl.ARRAY_BUFFER,0,data.positions);gl.bindTexture(gl.TEXTURE_2D,waterTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,mesh.W,mesh.H,0,gl.RGBA,gl.UNSIGNED_BYTE,data.pixels);lastDepths=options.depths}else gl.bindTexture(gl.TEXTURE_2D,waterTexture);
      bind(waterProgram,water,view.matrix,vertical);gl.uniform1i(waterProgram.uniforms.uWater,0);gl.uniform1f(waterProgram.uniforms.uOpacity,options.opacity);gl.uniform3fv(waterProgram.uniforms.uEye,view.eye);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-1);gl.drawElements(gl.TRIANGLES,water.count,gl.UNSIGNED_SHORT,0);gl.disable(gl.POLYGON_OFFSET_FILL);gl.depthMask(true);gl.disable(gl.BLEND);drawMarkers(options,view.matrix,vertical,dpr);
      return true;
    }
    exaggeration.oninput=()=>{document.getElementById('terrainExaggerationValue').textContent='×'+exaggeration.value;onInvalidate()};contours.onchange=onInvalidate;document.getElementById('terrainZoomIn').onclick=()=>onZoom(1.15);document.getElementById('terrainZoomOut').onclick=()=>onZoom(1/1.15);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.hidden=true;controls.querySelectorAll('input,button').forEach(n=>n.disabled=true);status.textContent='Przywracanie grafiki 3D; dostępny jest widok uproszczony.';onInvalidate()});canvas.addEventListener('webglcontextrestored',()=>{try{initialize();controls.querySelectorAll('input,button').forEach(n=>n.disabled=false);status.textContent='Pełna tekstura i cieniowanie terenu. Skala pionowa zmienia tylko wizualizację.';onInvalidate()}catch(e){lost=true;onInvalidate()}});
    try{initialize()}catch(error){canvas.remove();status.textContent='Pełna grafika 3D jest niedostępna. Wyświetlany jest widok uproszczony.';controls.querySelectorAll('input,button').forEach(n=>n.disabled=true);return null}
    instance={canvas,render,pick:(clientX,clientY)=>{const rect=inputCanvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top,p=pickPoints.filter(q=>q.visible&&Math.hypot(q.x-x,q.y-y)<14).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];if(p)onSelect(p.p)},report:()=>({engine:lost?'simplified_canvas':'WebGL 2',source_grid:[mesh.W,mesh.H],terrain_triangles:mesh.indices.length/3,texture: last?.base||null,source_texture_pixels:last?[images[last.base].naturalWidth,images[last.base].naturalHeight]:null,vertical_exaggeration:Number(exaggeration.value),contours_5m:contours.checked,water_geometry:'separate surface from unchanged source DEM + modeled depths',infrastructure:'OSM positions; symbols and ground-draped route, not modeled tower heights or wires',changes_hydrology:false})};return instance;
  }
  return {buildMesh,waterData,camera,fitDistance,project,create,setVisible,report:()=>instance?.report()||{engine:attempted?'simplified_canvas':'not_initialized',changes_hydrology:false}};
})();
