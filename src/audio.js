'use strict';
BD.Audio=class {
  constructor(){this.volume=.5;}
  unlock(){if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);const n=this.ctx.sampleRate*.3;this.noise=this.ctx.createBuffer(1,n,this.ctx.sampleRate);const a=this.noise.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;}this.master.gain.value=this.volume;return this.ctx.resume();}
  tone(hz,duration,gain,type='sine',end=hz){if(!this.ctx)return;const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(end,t+duration);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration);}
  burst(duration,gain,freq){if(!this.ctx)return;const c=this.ctx,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='lowpass';f.frequency.value=freq;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+duration);}
  shot(){this.burst(.13,.65,4500);this.tone(150,.12,.65,'triangle',40);this.tone(1500,.025,.14,'square',300);}
  hit(kill){this.tone(2600,.045,.18,'sine',2100);this.tone(3300,.028,.08);if(kill){this.burst(.12,.4,900);this.tone(100,.18,.5,'triangle',32);}}
  reload(){this.tone(700,.045,.09,'square',220);}
  step(){this.burst(.045,.07,300);}
};
