'use strict';
/**
 * TOUCH LIVE: original, public-domain-style instrumental loop generated locally.
 * This is NOT Spotify content and requires no API, account, or external media host.
 * A genuine 16-bit PCM WAV is served to LG webOS using the standard HTML5 audio player.
 */
const SR=22050,SECONDS=16;
let cached=null;
const CHORDS=[
 [261.63,329.63,392.00,130.81],
 [220.00,261.63,329.63,110.00],
 [174.61,220.00,349.23,87.31],
 [196.00,246.94,392.00,98.00]
];
const LEAD=[
 523.25,659.25,783.99,659.25,587.33,523.25,659.25,392.00,
 440.00,523.25,659.25,523.25,440.00,392.00,329.63,392.00,
 523.25,698.46,880.00,698.46,659.25,523.25,440.00,349.23,
 392.00,493.88,587.33,783.99,587.33,493.88,392.00,392.00
];
function synth(){
 const n=SR*SECONDS,out=Buffer.allocUnsafe(44+n*2);
 out.write('RIFF',0);out.writeUInt32LE(out.length-8,4);
 out.write('WAVEfmt ',8);
 out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);
 out.writeUInt32LE(SR,24);out.writeUInt32LE(SR*2,28);
 out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);
 out.write('data',36);out.writeUInt32LE(n*2,40);
 const twopi=Math.PI*2;
 for(let i=0;i<n;i++){
  const t=i/SR,bar=Math.min(3,Math.floor(t/4)),chord=CHORDS[bar];
  const chordTime=t%4,fade=Math.min(1,t/.18,(SECONDS-t)/.2);
  let pad=0;
  for(let j=0;j<3;j++){
   const f=chord[j],detune=1+(j-1)*.002;
   pad+=.097*Math.sin(twopi*f*detune*t)+.024*Math.sin(twopi*f*2*detune*t);
  }
  const bass=.115*Math.sin(twopi*chord[3]*t)+.03*Math.sin(twopi*chord[3]*2*t);
  const k=Math.floor(t/.5),note=LEAD[k%LEAD.length],nt=t%(.5);
  const attack=Math.min(1,nt/.018),decay=Math.exp(-nt*4.2);
  const lead=(.23*Math.sin(twopi*note*nt)+.05*Math.sin(twopi*note*2*nt))*attack*decay;
  const shimmer=.032*Math.sin(twopi*(chord[1]*2)*t)*(.45+.55*Math.cos(twopi*chordTime/4));
  const sample=Math.max(-.94,Math.min(.94,(pad+bass+lead+shimmer)*fade));
  out.writeInt16LE(Math.round(sample*32767),44+2*i);
 }
 return out;
}
module.exports=function welcomeWave(){
 if(!cached)cached=synth();
 return cached;
};
