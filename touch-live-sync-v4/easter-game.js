/* TOUCH LIVE Easter Egg: reusable touch + mouse puzzle, no build tools. */
(function(global){
'use strict';
const VIEW={w:1000,h:620,cx:500,cy:310,targetX:746,targetY:332};
function button(text,action,tip=''){return '<button type="button" class="egg-btn" data-egg="'+action+'"'+(tip?' aria-label="'+tip+'"':'')+'>'+text+'</button>';}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function mount(container,options={}){
 if(!container)return null;
 const onFind=typeof options.onFind==='function'?options.onFind:async()=>({ok:true});
 const hints=['🔍 Erster Hinweis: Schau auf die rechte Bildhälfte.','🏡 Zweiter Hinweis: Zoome auf die Berghütte.','🐈 Letzter Hinweis: Die Katze versteckt sich im kleinen Dachfenster.'];
 let z=1,pan={x:0,y:0},pointers=new Map(),dragging=false,pinch=null,down=null,found=!!options.found,disabled=!!options.disabled,
 remaining=typeof options.remaining==='number'?clamp(options.remaining,0,30):30,trying=false,hintIndex=-1,misses=0,soundOn=false,audioCtx=null,hasPanned=false,hasZoomed=false;
 container.innerHTML='<div class="egg-game egg-mission30"><div class="egg-mission-progress" role="progressbar" aria-label="Verbleibende Missionszeit" aria-valuemin="0" aria-valuemax="30" aria-valuenow="'+remaining+'"><div class="egg-mission-progress-fill" data-egg-progress></div></div><div class="egg-topline"><div><span class="egg-kicker">🎯 GEHEIM-MISSION 04 · MULTITOUCH</span><h3>Finde die versteckte Katze!</h3><p><b>Du hast nur 30 Sekunden.</b> Vergrößere auf 170 %, suche die Berghütte, verschiebe das Bild und tippe auf die Katze im Dachfenster. Für einen schnellen Fund gibt es Bonuspunkte!</p><span class="egg-mission-chip" data-egg-mission-state>● MISSION AKTIV · 3 SCHRITTE</span></div><div class="egg-clock-stack"><div class="egg-game-clock"><span>COUNTDOWN</span><strong data-egg-time>'+remaining+' s</strong><small>MISSION 30s</small></div><div class="egg-reward">⚡ Jetzt <strong data-egg-reward>300</strong> Punkte möglich</div></div></div><div class="egg-lesson"><span data-step="zoom">① <b>ZOOMEN ≥170 %</b><small>Zwei Finger auseinanderziehen</small></span><span data-step="pan">② <b>SUCHEN</b><small>Berghütte rechts finden</small></span><span data-step="tap">③ <b>FUND BESTÄTIGEN</b><small>Katze im Dachfenster antippen</small></span></div><div class="egg-hardware"><div class="egg-hardware-top"><span>TOUCH LIVE · MULTITOUCH-LAB</span><span class="egg-hardware-camera" aria-hidden="true"></span></div><div class="egg-stage" data-egg-stage><svg class="egg-svg" data-egg-svg viewBox="0 0 1000 620" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Zoombares Wimmelbild mit Bergen, einem See und einer Hütte. Eine Katze ist versteckt." tabindex="0"><g data-egg-world><image href="/easter-scene.svg" x="0" y="0" width="1000" height="620"/></g></svg><div class="egg-location">🔎 KATZEN-MISSION · TOUCHSCREEN 01</div><div class="egg-zoom-indicator" data-egg-zoom>100 %</div><div class="egg-tap" data-egg-tap aria-live="polite">🎯 MISSION START! Zoome auf 170 % und finde die Katze.</div><div class="egg-celebration" data-egg-celebration hidden><div class="egg-confetti" aria-hidden="true"></div><span class="egg-star">🏆</span><h4>MISSION GESCHAFFT! 🎉</h4><p>Du hast die Katze aufgespürt, das Bild gezoomt und die Touch-Gesten gemeistert!</p><strong data-egg-points>Punkte gibt es erst am Ende zu sehen.</strong><div class="egg-learned">Das war echte Touchscreen-Bedienung: <b>Pinch-to-Zoom</b> zum Vergrößern, <b>Pan</b> zum Verschieben und <b>Tap</b> zum Auswählen.</div></div></div></div><div class="egg-tools">'+button('−','minus','Verkleinern')+button('＋','plus','Vergrößern')+button('⟲','reset','Bild zurücksetzen')+button('💡 Hinweis','hint','Einen Tipp anzeigen')+button('🔇 Ton aus','sound','Spielton ein- oder ausschalten')+'<span class="egg-tools-help">Handy/iPad: Zwei Finger zoomen, mit einem Finger ziehen · PC: Mausrad, Pfeiltasten, Enter</span></div><div class="egg-hint" data-egg-hint aria-live="polite">🎯 DEINE MISSION: ① Zoome auf mindestens 170 % · ② Suche rechts die Berghütte · ③ Tippe auf die Katze im Dachfenster. Schnell sein lohnt sich: Bonuspunkte!</div></div>';
 const game=container.querySelector('.egg-game'),svg=container.querySelector('[data-egg-svg]'),world=container.querySelector('[data-egg-world]');
 const readout=container.querySelector('[data-egg-tap]'),counter=container.querySelector('[data-egg-zoom]'),clock=container.querySelector('[data-egg-time]');
 const lessonZoom=container.querySelector('[data-step="zoom"]'),lessonPan=container.querySelector('[data-step="pan"]'),lessonTap=container.querySelector('[data-step="tap"]'),progressFill=container.querySelector('[data-egg-progress]'),progressTrack=container.querySelector('.egg-mission-progress'),missionState=container.querySelector('[data-egg-mission-state]'),rewardNode=container.querySelector('[data-egg-reward]');
 const hint=container.querySelector('[data-egg-hint]'),celebration=container.querySelector('[data-egg-celebration]'),pointsNode=container.querySelector('[data-egg-points]');
 if(options.showLiveScore){
  if(pointsNode)pointsNode.textContent='Deine Punkte werden oben im Quiz live angezeigt.';
  if(hint)hint.textContent='🎓 Mit Zoomen, Verschieben und Antippen sammelst du Punkte. Dein aktueller Punktestand ist oben im Quiz sichtbar.';
 }
 const unit=client=>{const m=svg.getScreenCTM();if(!m)return{x:VIEW.cx,y:VIEW.cy};return new DOMPoint(client.x,client.y).matrixTransform(m.inverse());};
 function worldPt(client){const m=world.getScreenCTM();if(!m)return{x:VIEW.cx,y:VIEW.cy};return new DOMPoint(client.x,client.y).matrixTransform(m.inverse());}
 function playSound(kind){
  if(!soundOn)return;
  try{const Ctx=global.AudioContext||global.webkitAudioContext;if(!Ctx)return;if(!audioCtx)audioCtx=new Ctx();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
   const notes=kind==='win'?[523,659,784,1047]:kind==='miss'?[270]:[550];
   notes.forEach((f,i)=>{const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),t=audioCtx.currentTime+(kind==='win'?i*.12:0),dur=kind==='win'?.27:.12;
    osc.type=kind==='win'?'triangle':'sine';osc.frequency.setValueAtTime(f,t);osc.connect(gain);gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(kind==='win'?.12:.06,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+dur);osc.start(t);osc.stop(t+dur+.015);});
  }catch{}
 }
 function message(txt,bad=false){
 readout.textContent=txt;readout.classList.toggle('egg-miss',bad);
 if(bad){game.classList.remove('egg-shake');void game.offsetWidth;game.classList.add('egg-shake');try{global.navigator?.vibrate?.(35);}catch{}}
}
function missionStatus(){
 if(found){missionState.textContent='🏆 MISSION ERFÜLLT';return;}
 if(disabled){missionState.textContent='⏱ ZEIT ABGELAUFEN';return;}
 const done=Number(hasZoomed)+Number(hasPanned);
 missionState.textContent=done===2?'✓ 2 VON 3 · FINDE DIE KATZE':done===1?(hasZoomed?'✓ 1 VON 3 · SUCHE DIE HÜTTE':'✓ 1 VON 3 · JETZT ZOOMEN'):'● 0 VON 3 · MISSION LÄUFT';
}
function possiblePoints(seconds){return 170+Math.min(130,Math.max(0,Math.round((seconds/30)*13)*10));}
 function constrain(){const maxX=(z-1)*VIEW.w/2+80,maxY=(z-1)*VIEW.h/2+80;pan.x=clamp(pan.x,-maxX,maxX);pan.y=clamp(pan.y,-maxY,maxY);}
 function draw(){if(z>=1.7&&!hasZoomed){hasZoomed=true;lessonZoom.classList.add('egg-step-done');missionStatus();playSound('tap');}constrain();world.setAttribute('transform','translate('+pan.x+' '+pan.y+') translate('+VIEW.cx+' '+VIEW.cy+') scale('+z+') translate(-'+VIEW.cx+' -'+VIEW.cy+')');counter.textContent=Math.round(z*100)+' %';game.classList.toggle('egg-zoomed',z>=1.7);}
 function zoomAt(value,anchor){
  const next=clamp(value,1,7),old=z;if(Math.abs(next-old)<.0001)return;
  const a=anchor||{x:VIEW.cx,y:VIEW.cy},f=next/old;
  pan.x=a.x-VIEW.cx-(a.x-VIEW.cx-pan.x)*f;
  pan.y=a.y-VIEW.cy-(a.y-VIEW.cy-pan.y)*f;
  z=next;draw();
  if(z>=1.7&&!found&&!disabled)message('🔎 Jetzt kannst du das kleine Detail genauer untersuchen.');
 }
 function finish(result){
  if(!found)playSound('win');lessonZoom.classList.add('egg-step-done');lessonPan.classList.add('egg-step-done');lessonTap.classList.add('egg-step-done');found=true;disabled=true;game.classList.add('egg-found');missionStatus();
  celebration.hidden=false;
  pointsNode.textContent=Number.isFinite(result?.points)?'+'+result.points+' Punkte verdient!':options.showLiveScore?'Deine Punkte stehen oben im Quiz.':'Deine Punkte siehst du erst bei den Ergebnissen.';
  message('✅ RICHTIG! Easter Egg gefunden!');
  hint.textContent=options.showLiveScore?'Geschafft! Dein Punktestand oben aktualisiert sich automatisch. Gleich geht es mit dem Film weiter.':'Geschafft! Damit hast du gezeigt, wie Multitouch und das Antippen eines kleinen Ziels funktionieren. Gleich geht es mit der Doku weiter.';
  try{if(global.navigator?.vibrate)global.navigator.vibrate([70,70,120]);}catch{}
 }
 async function tryFind(e){
  if(disabled||found||trying)return;
  if(z<1.7){playSound('miss');message('🔎 MISSIONSSCHRITT 1: Erst auf mindestens 170 % vergrößern!',true);return;}
  const pos=worldPt({x:e.clientX,y:e.clientY});
  if(Math.abs(pos.x-VIEW.targetX)>34||Math.abs(pos.y-VIEW.targetY)>30){
   misses++;playSound('miss');
   const distance=Math.hypot(pos.x-VIEW.targetX,pos.y-VIEW.targetY);
   const clue=distance<110?'🔥 HEISS! Die Katze ist ganz in der Nähe.':distance<240?'🌡️ WÄRMER! Suche das kleine Dachfenster.':'❄️ KALT! Schau weiter rechts bei der Berghütte.';
   message('Noch nicht gefunden · '+clue,true);
   return;
  }
  trying=true;message('✅ RICHTIG! Dein Fund wird gespeichert …');
  try{const result=await onFind({x:pos.x,y:pos.y,zoom:z,elapsed:(options.duration||30)-remaining});if(result?.ok===false)throw Error(result.error||'Fund wurde nicht bestätigt.');finish(result||{});}
  catch(e){trying=false;message('⚠️ Der Fund wurde nicht gespeichert: '+(e?.message||'Versuch es bitte erneut.'),true);}
 }
 function snapshot(){
  const values=[...pointers.values()];
  if(values.length===2){
   const a=values[0],b=values[1];pinch={distance:Math.hypot(b.x-a.x,b.y-a.y)||1,center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};
  }else pinch=null;
 }
 svg.addEventListener('pointerdown',e=>{
  if(disabled||found)return;e.preventDefault();
  svg.setPointerCapture?.(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  dragging=false;
  if(pointers.size===1)down={x:e.clientX,y:e.clientY,time:Date.now(),many:false};
  else if(down)down.many=true;
  snapshot();
 });
 svg.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||found||disabled)return;
  e.preventDefault();const prev=pointers.get(e.pointerId),before=[...pointers.values()],oldMid=before.length>=2?{x:(before[0].x+before[1].x)/2,y:(before[0].y+before[1].y)/2}:null;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>9)dragging=true;
  if(pointers.size===1){
   const old=unit(prev),now=unit({x:e.clientX,y:e.clientY});
   pan.x+=now.x-old.x;pan.y+=now.y-old.y;if(!hasPanned&&Math.hypot(pan.x,pan.y)>18){hasPanned=true;lessonPan.classList.add('egg-step-done');missionStatus();}draw();
  }else if(pointers.size>=2){
   const vals=[...pointers.values()],a=vals[0],b=vals[1],nowDist=Math.hypot(b.x-a.x,b.y-a.y)||1,nowMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   if(pinch){zoomAt(z*nowDist/pinch.distance,unit(pinch.center));const oldScene=unit(oldMid||pinch.center),newScene=unit(nowMid);pan.x+=newScene.x-oldScene.x;pan.y+=newScene.y-oldScene.y;draw();}
   pinch={distance:nowDist,center:nowMid};dragging=true;if(down)down.many=true;
  }
 });
 function up(e){
  if(!pointers.has(e.pointerId))return;e.preventDefault();
  const clicked=pointers.size===1&&!dragging&&down&&!down.many&&Date.now()-down.time<650;
  pointers.delete(e.pointerId);snapshot();
  if(clicked)tryFind(e);
  if(!pointers.size){down=null;dragging=false;}
 }
 svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);snapshot();down=null;dragging=false;});
 svg.addEventListener('wheel',e=>{if(disabled||found)return;e.preventDefault();zoomAt(z*(e.deltaY<0?1.18:.84),unit({x:e.clientX,y:e.clientY}));},{passive:false});
 svg.addEventListener('dblclick',e=>{e.preventDefault();if(!disabled&&!found)zoomAt(z*1.55,unit({x:e.clientX,y:e.clientY}));});
 svg.addEventListener('keydown',e=>{
  if(e.key==='+'||e.key==='='){e.preventDefault();zoomAt(z*1.3);}
  if(e.key==='-'){e.preventDefault();zoomAt(z/1.3);}
  if(e.key==='0'){e.preventDefault();z=1;pan={x:0,y:0};draw();}
  const arrows={ArrowLeft:[-32,0],ArrowRight:[32,0],ArrowUp:[0,-32],ArrowDown:[0,32]};
  if(arrows[e.key]&&!disabled&&!found){
   e.preventDefault();pan.x+=arrows[e.key][0];pan.y+=arrows[e.key][1];
   if(!hasPanned){hasPanned=true;lessonPan.classList.add('egg-step-done');missionStatus();}
   draw();
  }
  if((e.key==='Enter'||e.key===' ')&&!disabled&&!found){
   e.preventDefault();
   const bounds=svg.getBoundingClientRect?.();
   if(bounds)tryFind({clientX:bounds.left+bounds.width/2,clientY:bounds.top+bounds.height/2});
  }
 });
 container.querySelectorAll('[data-egg]').forEach(b=>b.addEventListener('click',()=>{
  if(b.dataset.egg==='sound'){soundOn=!soundOn;b.textContent=soundOn?'🔊 Ton an':'🔇 Ton aus';if(soundOn)playSound('tap');return;}
  if(b.dataset.egg==='hint'){playSound('tap');hintIndex=(hintIndex+1)%hints.length;hint.textContent='💡 '+hints[hintIndex];return;}
  if(disabled||found)return;
  if(b.dataset.egg==='plus'){playSound('tap');zoomAt(z*1.5);}
  else if(b.dataset.egg==='minus'){playSound('tap');zoomAt(z/1.5);}
  else if(b.dataset.egg==='reset'){z=1;pan={x:0,y:0};draw();message('Bild zentriert. Deine Mission läuft weiter!');}
 }));
 function update(next={}){
  if(typeof next.remaining==='number'&&Number.isFinite(next.remaining)){remaining=clamp(next.remaining,0,30);clock.textContent=remaining+' s';if(progressFill)progressFill.style.width=(remaining/30*100)+'%';if(progressTrack)progressTrack.setAttribute('aria-valuenow',String(remaining));if(rewardNode)rewardNode.textContent=String(possiblePoints(remaining));game.classList.toggle('egg-clock-low',remaining<=8&&remaining>0);game.classList.toggle('egg-clock-alert',remaining<=16&&remaining>8);if(!found&&!disabled){if(remaining<=8&&hintIndex<2){hintIndex=2;hint.textContent='🐈 LETZTE SEKUNDEN! Tippe die Katze im Dachfenster der Berghütte an.';}else if(remaining<=16&&hintIndex<1){hintIndex=1;hint.textContent='💡 TIPP: Zoome rechts auf die Berghütte und suche das Dachfenster.';}else if(remaining<=23&&hintIndex<0){hintIndex=0;hint.textContent='💡 TIPP: Die Katze ist rechts in der Nähe der Berghütte.';}}if(remaining<=0&&!found){disabled=true;message('⏱ Mission beendet! 30 Sekunden sind vorbei. Beim nächsten Mal findest du die Katze!');missionStatus();}}
  if(next.found&&!found)finish({});
  if(next.disabled===true){disabled=true;missionStatus();}
 }
 draw();update(options);
 if(found){finish({});}
 return {update,reset(){if(found)return;z=1;pan={x:0,y:0};draw();},destroy(){}};
}
global.EasterGame={mount,position:{x:VIEW.targetX/VIEW.w,y:VIEW.targetY/VIEW.h},version:'3.0-mission30'};
})(window);
