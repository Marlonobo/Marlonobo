/* TOUCH LIVE original instrumental soundtrack. 
   Generated in the viewer by Web Audio; no external recordings, no Spotify content.
   Soft ambient loop for film pauses; upbeat original fanfare for results.
   Starts after TV viewer unlocks audio with a real remote OK/click. */
(function (global) {
 'use strict';
 const Ctx=global.AudioContext||global.webkitAudioContext;
 let ctx=null, master=null,timer=null,mode='off',step=0,nextAt=0,settings={pause:true,results:true,volume:0.25};
 const SCALE={C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880,C3:130.81,D3:146.83,E3:164.81,F3:174.61,G3:196,A3:220};
 const padSequence=[
  ['D4','F4','A4'],['F4','A4','C5'],['C4','E4','G4'],['A3','C4','E4']
 ];
 const brightSequence=[
  ['C4','E4','G4'],['F4','A4','C5'],['D4','F4','A4'],['G3','B4','D5']
 ];
 const brightTune=['C5','E5','G5','E5','F5','A5','G5','E5',
  'D5','F5','A5','F5','G5','E5','D5','C5'];
 // Keep original music audible through LG speakers while retaining a safe master slider.
 const welcomeChords=[
  ['C4','E4','G4'],['A3','C4','E4'],['F4','A4','C5'],['G3','B4','D5']
 ];
 const welcomeTune=['E5','G5','E5','C5','D5','E5','G5','E5',
  'C5','E5','A5','E5','G5','E5','D5','C5',
  'F5','A5','G5','F5','E5','F5','A5','G5',
  'D5','G5','E5','D5','C5','E5','D5','C5'];
 const NOTE_VOLUME=0.38;
 function ensure(){
  if(!Ctx)return false;
  if(ctx)return true;
  try{
   ctx=new Ctx();
   master=ctx.createGain();master.gain.value=0;
   master.connect(ctx.destination);
   return true;
  }catch{return false;}
 }
 function playNote(freq,at,duration,kind,velocity=1){
  if(!ctx||!master||!freq)return;
  const osc=ctx.createOscillator(),env=ctx.createGain();
  osc.type=kind==='pad'?'sine':kind==='bass'?'triangle':'triangle';
  osc.frequency.setValueAtTime(freq,at);
  if(kind==='pad')osc.detune.setValueAtTime(-4,at);
  osc.connect(env);env.connect(master);
  const low=0.00005,gain=(kind==='pad'?0.26:kind==='bass'?0.28:0.34)*NOTE_VOLUME*velocity;
  env.gain.setValueAtTime(low,at);
  if(kind==='pad'){
   env.gain.linearRampToValueAtTime(gain,at+0.28);
   env.gain.setValueAtTime(gain,at+Math.max(.31,duration-.4));
   env.gain.exponentialRampToValueAtTime(low,at+duration);
  }else{
   env.gain.linearRampToValueAtTime(gain,at+.016);
   env.gain.exponentialRampToValueAtTime(low,at+duration);
  }
  osc.start(at);osc.stop(at+duration+.05);
 }
 function scheduleBeat(at,position){
  if(mode==='welcome'){
   // Original, continuous four-chord intro (about 23 seconds per cycle).
   const beat=60/84,chord=welcomeChords[Math.floor(position/8)%welcomeChords.length];
   if(position%8===0){
    chord.forEach((n,j)=>playNote(SCALE[n],at,beat*7.8,'pad',j===0?.86:.62));
   }
   if(position%4===0)playNote(SCALE[chord[0]]/2,at,beat*3.3,'bass',.7);
   if(position%2===0){
    const n=welcomeTune[position%welcomeTune.length];
    if(SCALE[n])playNote(SCALE[n],at,beat*1.35,'bell',position%8===0?.72:.43);
   }
  }else if(mode==='pause'){
   const beat=60/72,chord=padSequence[Math.floor(position/8)%padSequence.length];
   if(position%8===0){chord.forEach((n,j)=>playNote(SCALE[n],at,beat*7.7,'pad',j===0?.8:1));}
   if(position%4===0){playNote(SCALE[chord[0]]/2,at,beat*2.5,'bass',.65);}
   if(position%2===0){const n=chord[(position/2)%3|0];playNote(SCALE[n]*2,at,beat*.75,'bell',.24);}
  }else if(mode==='results'){
   const beat=60/112,chord=brightSequence[Math.floor(position/8)%brightSequence.length];
   if(position%8===0)chord.forEach((n,j)=>playNote(SCALE[n],at,beat*6.7,'pad',j===0?1:.9));
   if(position%2===0)playNote(SCALE[chord[0]]/2,at,beat*1.65,'bass',.75);
   const note=brightTune[position%brightTune.length];
   if(note)playNote(SCALE[note],at,beat*.78,'bell',.85);
   if(position%4===2)playNote(SCALE.G5,at,beat*.18,'bell',.18);
  }
 }
 function schedule(){
  if(!ctx||!master||mode==='off'||ctx.state!=='running')return;
  const stepDur=60/(mode==='results'?112:72);
  const limit=ctx.currentTime+.28;
  let guard=0;
  while(nextAt<limit&&guard++<9){scheduleBeat(nextAt,step++);nextAt+=stepDur;}
 }
 function determine(s){
  if(!s)return 'off';
  if(s.phase==='welcome'&&s.welcomeMusic?.on===true)return 'welcome';
  if(s.phase==='results'&&settings.results)return 'results';
  if(s.phase==='film'&&!s.playing&&settings.pause)return 'pause';
  return 'off';
 }
 function sync(s){
  if(!s)return;
  const sound=s.soundtrack||{};
  settings={
   pause:sound.pause!==false,
   results:sound.results!==false,
   volume:Math.max(0,Math.min(.6,Number(sound.volume??.25)||0))
  };
  const next=determine(s);
  if(!ctx||!master){mode=next;return;}
  const changed=next!==mode;
  mode=next;
  const target=next==='off'?0:settings.volume;
  const now=ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setTargetAtTime(target,now,next==='off'?.06:.15);
  if(next!=='off'){
   if(changed){step=0;nextAt=now+.06;}
   if(!timer)timer=setInterval(schedule,85);
   schedule();
  }
 }
 async function activate(){
  if(!ensure())return false;
  try{if(ctx.state==='suspended')await ctx.resume();}
  catch{return false;}
  if(mode!=='off'){
   nextAt=Math.max(ctx.currentTime+.06,nextAt);
   if(!timer)timer=setInterval(schedule,85);
   const now=ctx.currentTime;
   master.gain.setTargetAtTime(settings.volume,now,.15);
   schedule();
  }
  return ctx.state==='running';
 }
 function silence(){
  mode='off';step=0;
  if(ctx&&master){const now=ctx.currentTime;master.gain.setTargetAtTime(0,now,.05);}
 }
 function supported(){return !!Ctx;}
 function unlocked(){return !!ctx&&ctx.state==='running';}
 global.TouchSoundtrack={sync,activate,silence,supported,unlocked};
})(window);
