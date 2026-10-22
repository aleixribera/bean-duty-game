'use strict';
BD.Audio=class {
  constructor(){this.volume=.5;}
  unlock(){if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);const n=this.ctx.sampleRate*.3;this.noise=this.ctx.createBuffer(1,n,this.ctx.sampleRate);const a=this.noise.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;}this.master.gain.value=this.volume;return this.ctx.resume();}
  tone(hz,duration,gain,type='sine',end=hz,output=this.master,delay=0){if(!this.ctx)return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(end,t+duration);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(output);o.start(t);o.stop(t+duration);}
  burst(duration,gain,freq,output=this.master,delay=0){if(!this.ctx)return;const c=this.ctx,t=c.currentTime+delay,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='lowpass';f.frequency.value=freq;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);s.connect(f);f.connect(g);g.connect(output);s.start(t);s.stop(t+duration);}
  shot(gain=1,pan=0){if(!this.ctx)return;const bus=this.ctx.createStereoPanner();bus.pan.value=BD.clamp(pan,-1,1);bus.connect(this.master);
   this.burst(.025,.55*gain,8500,bus);this.burst(.16,.25*gain,1800,bus,.012);
   this.tone(135,.14,.42*gain,'triangle',38,bus);this.tone(1800,.018,.08*gain,'square',600,bus,.008);this.burst(.035,.09*gain,3200,bus,.065);
   // Disconnect after every scheduled layer has ended, without retaining nodes.
   const timer=this.ctx.createOscillator(),silent=this.ctx.createGain();silent.gain.value=0;timer.connect(silent);silent.connect(bus);timer.onended=()=>{bus.disconnect();silent.disconnect();timer.disconnect();};timer.start();timer.stop(this.ctx.currentTime+.22);
  }
  enemyShot(source,listener){const dx=source.x-listener.pos.x,dz=source.z-listener.pos.z,distance=Math.hypot(dx,dz);this.shot(.28/(1+distance/10),(dx*Math.cos(listener.yaw)-dz*Math.sin(listener.yaw))/Math.max(1,distance));}
  hit(kill){if(kill){this.burst(.075,.22,1200);this.tone(140,.16,.3,'triangle',45);this.tone(1900,.09,.14,'sine',2800);this.tone(3200,.1,.1,'sine',2400,this.master,.04);}else{this.tone(2400,.035,.075,'sine',1900);}}
  reload(stage=0){this.burst(.04,stage===1?.18:.1,stage===2?4200:1600);this.tone(stage===1?350:800,.05,.08,'square',180);}
  land(speed){this.burst(.09,Math.min(speed/10,.8)*.16,350);}
  step(){this.burst(.045,.07,300);}
};
