'use strict';
BD.Player=class {
  constructor(){this.pos={x:0,y:1.7,z:3};this.yaw=0;this.pitch=0;this.keys=new Set();this.vx=0;this.vz=0;this.vy=0;this.height=1.7;this.ground=0;this.grounded=true;this.eyeGround=0;this.bob=0;this.swayX=0;this.swayY=0;this.sensitivity=1;this.speed=0;this.resetCamera();this.sprintBlend=0;this.strafeLean=0;}
  look(dx,dy,ads){const s=.002*this.sensitivity*BD.mix(1,.6,ads);this.yaw-=dx*s;this.pitch=BD.clamp(this.pitch-dy*s,-1.45,1.45);this.swayX=BD.clamp(this.swayX+dx*.00012,-.045,.045);this.swayY=BD.clamp(this.swayY+dy*.00012,-.03,.03);}
  update(dt,ads,audio,world,aiming=false){const wasGrounded=this.grounded,fallSpeed=this.vy;const k=this.keys,crouch=k.has('KeyC'),sprint=k.has('ShiftLeft')&&!crouch&&!aiming&&ads<.1&&k.has('KeyW');this.sprinting=sprint;this.crouching=crouch;let x=this.moveInput?.x??(Number(k.has('KeyD'))-Number(k.has('KeyA'))),z=this.moveInput?.z??(Number(k.has('KeyS'))-Number(k.has('KeyW')));const len=this.moveInput?Math.max(1,Math.hypot(x,z)):Math.hypot(x,z)||1,speed=crouch?2:ads>.5?2.8:sprint?7.5:4.5;x=x/len*speed;z=z/len*speed;const tx=x*Math.cos(this.yaw)+z*Math.sin(this.yaw),tz=-x*Math.sin(this.yaw)+z*Math.cos(this.yaw),rate=Math.hypot(x,z)<.01?26:this.vx*tx+this.vz*tz<0?22:18;const blend=1-Math.exp(-rate*dt);this.vx=BD.mix(this.vx,x*Math.cos(this.yaw)+z*Math.sin(this.yaw),blend);this.vz=BD.mix(this.vz,-x*Math.sin(this.yaw)+z*Math.cos(this.yaw),blend);this.speed=Math.hypot(this.vx,this.vz);if(k.has('Space')&&this.grounded){this.vy=5;this.grounded=false;k.delete('Space');}this.vy-=15*dt;const landingSpeed=-this.vy;if(world)world.move(this,this.vx*dt,this.vz*dt,dt);else{this.ground=Math.max(0,this.ground+this.vy*dt);this.grounded=this.ground===0;if(this.grounded)this.vy=0;}if(!wasGrounded&&this.grounded&&landingSpeed>2){audio.land?.(landingSpeed);}this.sprintBlend=BD.mix(this.sprintBlend,sprint?1:0,1-Math.exp(-10*dt));this.strafeLean=BD.mix(this.strafeLean,(this.vx*Math.cos(this.yaw)-this.vz*Math.sin(this.yaw))*.006,1-Math.exp(-12*dt));this.height=BD.mix(this.height,crouch?1.1:1.7,1-Math.exp(-16*dt));this.eyeGround=this.grounded?BD.mix(this.eyeGround,this.ground,1-Math.exp(-25*dt)):this.ground;this.pos.y=this.height+this.eyeGround;const old=Math.floor(this.bob/Math.PI);this.bob+=dt*this.speed*2.3;if(this.grounded&&this.speed>.7&&Math.floor(this.bob/Math.PI)!==old)audio.step();this.updateCamera(dt,ads,wasGrounded,fallSpeed);this.swayX*=Math.exp(-12*dt);this.swayY*=Math.exp(-12*dt);}
  resetCamera(){
    this.cameraMotion={pitch:0,roll:0,fov:0,weight:0,forward:0,side:0};
    this.landing=new BD.Spring(16);
    this.takeoff=new BD.Spring(12);
  }
  updateCamera(dt,ads,wasGrounded,fallSpeed){
    const c=this.cameraMotion,ease=1-Math.exp(-10*dt);
    const forward=this.vx*Math.sin(this.yaw)+this.vz*Math.cos(this.yaw);
    const side=this.vx*Math.cos(this.yaw)-this.vz*Math.sin(this.yaw);
    if(!wasGrounded&&this.grounded)this.landing.kick(0,-Math.min(Math.abs(fallSpeed)*.018,.16));
    if(wasGrounded&&!this.grounded&&this.vy>0)this.takeoff.kick(0,.075);
    this.landing.update(dt);
    this.takeoff.update(dt);
    c.weight=BD.mix(c.weight,this.grounded?Math.min(this.speed/4.5,1.35):0,ease);
    // Angular motion keeps the eye inside collision geometry. ADS settles
    // the movement without delaying or filtering the player's mouse input.
    const restraint=1-.82*ads;
    const nod=Math.sin(this.bob*2)*BD.mix(.0025,.0038,this.sprintBlend)*c.weight;
    const inertia=BD.clamp((forward-c.forward)*.002,-.006,.006);
    // Local velocity lag gives starts, braking and direction changes weight.
    const sideInertia=BD.clamp((side-c.side)*-.002,-.006,.006);
    c.forward=BD.mix(c.forward,forward,1-Math.exp(-7*dt));
    c.side=BD.mix(c.side,side,1-Math.exp(-7*dt));
    c.pitch=BD.mix(c.pitch,(nod+inertia+this.landing.x+this.takeoff.x)*restraint,ease);
    const lean=BD.clamp(-side*.0018+sideInertia-this.swayX*.12,-.012,.012);
    c.roll=BD.mix(c.roll,BD.clamp(lean+Math.sin(this.bob)*.0015*c.weight,-.0135,.0135)*restraint,ease);
    c.fov=BD.mix(c.fov,this.sprinting?3*Math.min(this.speed/7.5,1):0,1-Math.exp(-5*dt));
  }
  direction(pitch=this.pitch,yaw=this.yaw){return {x:-Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)};}
};
