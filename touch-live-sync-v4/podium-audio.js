'use strict';
/**
 * TOUCH LIVE · Siegerehrungs-Musik, komplett selbst erzeugt (Eigenkomposition, keine Samples,
 * keine Rechte Dritter). Vier Stücke als 16-bit-PCM-WAV:
 *   drumroll – Trommelwirbel mit Crescendo (3,2 s)
 *   p3       – Fanfare Platz 3 (ca. 6,5 s)
 *   p2       – Fanfare Platz 2 (ca. 7,5 s)
 *   p1       – Siegerfanfare Platz 1 mit Becken und Pauken (ca. 14 s)
 */
const SR=22050,TAU=Math.PI*2;
const cache=new Map();
const N=n=>440*Math.pow(2,(n-69)/12); // MIDI → Hz
function buffer(seconds){return new Float32Array(Math.ceil(seconds*SR));}
let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff*2-1;};
// Blechbläser: Sägezahn-ähnliche Obertöne, Helligkeit folgt der Hüllkurve, leichtes Vibrato.
function brass(out,start,dur,midi,vol=.16,bright=1){
 const f=N(midi),s0=Math.floor(start*SR),len=Math.floor(dur*SR),att=.035,rel=Math.min(.25,dur*.4);
 for(let i=0;i<len&&s0+i<out.length;i++){
  const t=i/SR;
  let env=t<att?t/att:t>dur-rel?Math.max(0,(dur-t)/rel):1-.18*Math.min(1,(t-att)/.3);
  const vib=1+.004*Math.sin(TAU*5.2*t)*Math.min(1,t/.25);
  const harmonics=Math.max(3,Math.round((4+8*env)*bright));
  let v=0;for(let h=1;h<=harmonics;h++)v+=Math.sin(TAU*f*h*vib*t+h*.3)/h;
  out[s0+i]+=v*env*vol;
 }
}
function timpani(out,start,midi,vol=.5,decay=1.1){
 const f=N(midi),s0=Math.floor(start*SR),len=Math.floor(decay*1.6*SR);
 for(let i=0;i<len&&s0+i<out.length;i++){const t=i/SR,env=Math.exp(-t*3.2/decay);
  out[s0+i]+=(Math.sin(TAU*f*t)+.5*Math.sin(TAU*f*1.5*t)*Math.exp(-t*6)+.25*rnd()*Math.exp(-t*40))*env*vol;}
}
function snareHit(out,start,vol){
 const s0=Math.floor(start*SR),len=Math.floor(.09*SR);
 for(let i=0;i<len&&s0+i<out.length;i++){const t=i/SR;out[s0+i]+=(rnd()*.8+.3*Math.sin(TAU*190*t))*Math.exp(-t*38)*vol;}
}
function cymbal(out,start,vol=.22,dur=2.6){
 const s0=Math.floor(start*SR),len=Math.floor(dur*SR);let hp=0,prev=0;
 for(let i=0;i<len&&s0+i<out.length;i++){const t=i/SR,n=rnd();hp=.92*(hp+n-prev);prev=n;out[s0+i]+=hp*Math.exp(-t*2.1)*vol;}
}
function pad(out,start,dur,notes,vol=.05){for(const m of notes)brass(out,start,dur,m,vol,.55);}
function finish(out){
 // weicher Limiter + kleiner Hall
 const d1=Math.floor(.083*SR),d2=Math.floor(.131*SR);
 for(let i=0;i<out.length;i++){if(i>d1)out[i]+=out[i-d1]*.18;if(i>d2)out[i]+=out[i-d2]*.11;}
 let peak=0;for(const v of out)peak=Math.max(peak,Math.abs(v));
 const g=peak>0?.92/peak:1;
 const buf=Buffer.alloc(44+out.length*2);
 buf.write('RIFF',0);buf.writeUInt32LE(buf.length-8,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);
 buf.writeUInt32LE(SR,24);buf.writeUInt32LE(SR*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(out.length*2,40);
 for(let i=0;i<out.length;i++){const x=Math.tanh(out[i]*g*1.15)/Math.tanh(1.15);buf.writeInt16LE(Math.round(Math.max(-1,Math.min(1,x))*32000),44+i*2);}
 return buf;
}
const pieces={
 drumroll(){const o=buffer(3.4);
  for(let t=0;t<3.1;t+=.045+.02*(1-t/3.1)*.5){snareHit(o,t,.08+.32*(t/3.1));}
  timpani(o,0,41,.25,1.2);timpani(o,1.5,41,.32,1.2);cymbal(o,3.05,.12,.4);return finish(o);},
 p3(){const o=buffer(6.8);seed=333;
  // G-Dur, ruhig und freundlich: G–C–E–G … Schluss auf C
  const m=[[0,.28,67],[.3,.28,72],[.6,.28,76],[.9,.9,79],[1.9,.28,77],[2.2,.28,76],[2.5,.28,74],[2.8,1.3,76],[4.3,2.2,72]];
  for(const[s,d,n]of m)brass(o,s,d,n,.15);
  pad(o,0,1.9,[55,60,64]);pad(o,1.9,2.4,[53,57,62]);pad(o,4.3,2.3,[48,55,60,64]);
  timpani(o,0,43,.35);timpani(o,4.3,36,.45,1.6);cymbal(o,4.3,.05,1.4);return finish(o);},
 p2(){const o=buffer(7.8);seed=222;
  // Aufsteigende Fanfare, Wechsel nach D-Dur, kräftiger
  const m=[[0,.22,62],[.24,.22,62],[.48,.22,62],[.72,.7,67],[1.5,.22,66],[1.74,.22,67],[1.98,.22,69],[2.22,.9,71],[3.2,.22,69],[3.44,.22,71],[3.68,.22,72],[3.92,.7,74],[4.7,3,79]];
  for(const[s,d,n]of m)brass(o,s,d,n,.16,1.1);
  for(const[s,d,n]of m)if(s>=1.5)brass(o,s,d,n-12,.07,.8);
  pad(o,0,1.5,[50,55,59]);pad(o,1.5,1.7,[52,55,59]);pad(o,3.2,1.5,[50,54,57]);pad(o,4.7,3,[43,50,55,59,62]);
  for(const t of[0,.72,2.22,3.92])timpani(o,t,38,.33);timpani(o,4.7,31,.55,1.8);cymbal(o,4.7,.07,1.8);return finish(o);},
 p1(){const o=buffer(14.5);seed=111;
  // Siegerfanfare C-Dur: Signal – Thema – großes Finale
  const sig=[[0,.18,60],[.2,.18,60],[.4,.18,60],[.6,.9,67],[1.55,.18,65],[1.75,.18,67],[1.95,.18,69],[2.15,1.1,72]];
  for(const[s,d,n]of sig){brass(o,s,d,n,.15,1.1);brass(o,s,d,n+7,.07,.9);}
  const theme=[[3.4,.5,72],[3.9,.25,74],[4.15,.25,76],[4.4,.9,79],[5.4,.5,77],[5.9,.25,76],[6.15,.25,74],[6.4,.9,76],[7.4,.5,72],[7.9,.25,74],[8.15,.25,76],[8.4,.5,81],[8.9,.5,79],[9.4,.5,77],[9.9,.5,74],[10.4,4,84]];
  for(const[s,d,n]of theme){brass(o,s,d,n,.15,1.15);brass(o,s,d,n-12,.08,.9);}
  const chords=[[3.4,2,[48,55,60,64]],[5.4,2,[53,57,60,65]],[7.4,1,[48,55,60,64]],[8.4,1,[45,52,57,60]],[9.4,1,[50,53,57,62]],[10.4,4,[36,43,48,55,60,64,67]]];
  for(const[s,d,n]of chords)pad(o,s,d,n,.045);
  for(const t of[0,.6,2.15,3.4,5.4,7.4,8.4,9.4,9.9])timpani(o,t,t<3?36:t<9?41:43,.35);
  for(let t=10.4;t<10.9;t+=.06)timpani(o,t,36,.18,.5);
  timpani(o,10.9,24,.6,2.2);cymbal(o,3.4,.05,1.4);cymbal(o,10.4,.1,2.6);return finish(o);}
};
module.exports=function podiumWave(name){
 if(!pieces[name])return null;
 if(!cache.has(name))cache.set(name,pieces[name]());
 return cache.get(name);
};
