'use strict';
window.BD = {};
BD.clamp = (v,a,b) => Math.max(a,Math.min(b,v));
BD.mix = (a,b,t) => a+(b-a)*t;
BD.mat = {
  multiply(a,b) { const o=new Float32Array(16); for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k]; return o; },
  perspective(fov,aspect,near=.03,far=160) {const f=1/Math.tan(fov/2),n=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*n,-1,0,0,2*far*near*n,0]);},
  transform(x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0) {
    const c=Math.cos,s=Math.sin;
    let m=new Float32Array([sx,0,0,0,0,sy,0,0,0,0,sz,0,0,0,0,1]);
    const rots=[[c(rz),s(rz),0,0,-s(rz),c(rz),0,0,0,0,1,0,0,0,0,1],[c(ry),0,-s(ry),0,0,1,0,0,s(ry),0,c(ry),0,0,0,0,1],[1,0,0,0,0,c(rx),s(rx),0,0,-s(rx),c(rx),0,0,0,0,1]];
    for(const r of rots)m=this.multiply(r,m);m[12]=x;m[13]=y;m[14]=z;return m;
  },
  view(pos,yaw,pitch,roll=0){return this.multiply(this.transform(0,0,0,1,1,1,0,0,-roll),this.multiply(this.transform(0,0,0,1,1,1,-pitch),this.multiply(this.transform(0,0,0,1,1,1,0,-yaw),this.transform(-pos.x,-pos.y,-pos.z))));}
};
BD.Spring=class {constructor(frequency){this.x=0;this.v=0;this.f=frequency;} kick(x,v){this.x+=x;this.v+=v;}update(dt){const f=this.f,e=Math.exp(-f*dt),c=this.v+f*this.x;this.x=(this.x+c*dt)*e;this.v=(this.v-f*c*dt)*e;return this.x;}};
