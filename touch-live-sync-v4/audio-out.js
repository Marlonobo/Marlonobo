/* TOUCH LIVE – Tonausgabe (AUX, Kopfhörer, HDMI, Bluetooth).
   Eine Webseite gibt Ton immer über den Standard-Ausgang des Geräts aus.
   Welcher Ausgang das ist, entscheidet das Gerät selbst:
   - Windows/Mac: Lautsprecher-Symbol → Ausgabegerät (z. B. „Lautsprecher/Kopfhörer“ = AUX statt Beamer/HDMI)
   - iPad: AUX-Kabel einstecken → Ton kommt automatisch aus dem Kabel
   Diese Datei liefert: einen Tontest (links – rechts – beide), weckt den Ton nach dem
   Ein-/Ausstecken eines Kabels wieder auf und stellt am iPad die Audio-Sitzung auf „Wiedergabe“. */
(function(g){
 'use strict';
 var Ctx=g.AudioContext||g.webkitAudioContext;
 var shared=null,tracked=[],listeners=[],testing=false;
 function track(c){if(c&&tracked.indexOf(c)<0)tracked.push(c);return c;}
 function wake(){
  for(var i=0;i<tracked.length;i++){
   var c=tracked[i];
   try{if(c.state==='suspended'||c.state==='interrupted'){var p=c.resume();if(p&&p.catch)p.catch(function(){});}}catch(e){}
  }
 }
 function playbackSession(){
  // Safari 17+: Ton wie ein Video behandeln – läuft über AUX/Kopfhörer und auch im Stumm-Modus.
  try{if(g.navigator.audioSession&&g.navigator.audioSession.type!=='playback')g.navigator.audioSession.type='playback';}catch(e){}
 }
 function context(){
  if(!Ctx)return null;
  if(!shared||shared.state==='closed'){
   try{shared=new Ctx();}catch(e){shared=null;return null;}
   track(shared);
  }
  return shared;
 }
 // Innerhalb eines echten Klicks aufrufen: schaltet den Ton für spätere Tests frei.
 function prime(){playbackSession();var c=context();if(c)wake();return c;}
 function beep(c,freq,at,dur,pan,vol){
  var o=c.createOscillator(),gain=c.createGain();
  o.type='triangle';o.frequency.setValueAtTime(freq,at);
  gain.gain.setValueAtTime(0.0001,at);
  gain.gain.exponentialRampToValueAtTime(vol,at+0.03);
  gain.gain.setValueAtTime(vol,at+Math.max(0.05,dur-0.09));
  gain.gain.exponentialRampToValueAtTime(0.0001,at+dur);
  o.connect(gain);
  if(c.createStereoPanner){var p=c.createStereoPanner();p.pan.setValueAtTime(pan,at);gain.connect(p);p.connect(c.destination);}
  else gain.connect(c.destination);
  o.start(at);o.stop(at+dur+0.05);
 }
 /* Tontest: links – rechts – beide (Akkord). onStep('left'|'right'|'both'|'done').
    Ergebnis: 'ok' (abgespielt), 'blocked' (Browser sperrt Ton bis zum ersten Klick),
    'busy' (Test läuft schon), 'nosupport' (Browser ohne Web Audio). */
 function testTone(onStep){
  return new Promise(function(resolve){
   if(testing)return resolve('busy');
   playbackSession();
   var c=context();if(!c)return resolve('nosupport');
   var started=false;
   function step(name){try{if(onStep)onStep(name);}catch(e){}}
   function go(){
    if(started)return;started=true;
    if(c.state!=='running')return resolve('blocked');
    testing=true;
    var t=c.currentTime+0.06;
    try{
     beep(c,660,t,0.55,-1,0.32);
     beep(c,660,t+0.75,0.55,1,0.32);
     beep(c,523.25,t+1.5,0.8,0,0.17);beep(c,659.25,t+1.5,0.8,0,0.15);beep(c,783.99,t+1.5,0.8,0,0.13);
    }catch(e){testing=false;return resolve('nosupport');}
    step('left');
    setTimeout(function(){step('right');},750);
    setTimeout(function(){step('both');},1500);
    setTimeout(function(){testing=false;step('done');resolve('ok');},2450);
   }
   try{var r=c.resume();if(r&&r.then)r.then(go,go);}catch(e){}
   if(c.state==='running')go();
   // Gesperrter Ton: resume() bleibt in Chrome einfach hängen – nach kurzer Zeit gilt er als gesperrt.
   setTimeout(go,700);
  });
 }
 function emit(type){for(var i=0;i<listeners.length;i++){try{listeners[i](type);}catch(e){}}}
 try{
  var md=g.navigator.mediaDevices;
  if(md&&md.addEventListener)md.addEventListener('devicechange',function(){wake();setTimeout(wake,700);emit('devicechange');});
 }catch(e){}
 g.document.addEventListener('visibilitychange',function(){if(!g.document.hidden)wake();});
 g.addEventListener('pageshow',wake);
 g.TouchAudioOut={context:context,prime:prime,track:track,wake:wake,testTone:testTone,
  onChange:function(fn){if(typeof fn==='function')listeners.push(fn);},
  stereo:!!(Ctx&&Ctx.prototype&&Ctx.prototype.createStereoPanner)};
})(window);
