/* TOUCH LIVE Easter Egg (Kapitel 4): Wimmelbild mit bemaltem Ei, Live-Messung von Fingern, Zoom und Drehung. Ohne Build-Tools. */
(function(global){
'use strict';
const VIEW={w:1000,h:620,cx:500,cy:310,targetX:447,targetY:476};
// Erst ab 400 % zählt ein Tipp. Treffer: höchstens 10 Bildeinheiten neben dem Ei.
const MINZ=4,MAXZ=8,HIT=10;
// Falsche Fährten im Bild: k = Kieselstein, v = Vogelei im Nest, c = Katze im Fenster, p = Pilz
const DECOYS=[[166,376,"v"],[171,377,"v"],[734,364,"c"],[804,396,"v"],[809,397,"v"],[954,412,"v"],[959,413,"v"],[963,412,"v"],[474,483,"k"],[484,497,"k"],[475,513,"k"],[466,524,"k"],[491,511,"k"],[498,491,"k"],[485,468,"k"],[460,542,"k"],[309,452,"k"],[297,448,"k"],[280,451,"k"],[433,489,"k"],[424,496,"k"],[796,588,"k"],[698,606,"k"],[847,597,"k"],[706,523,"k"],[521,486,"k"],[508,518,"k"],[509,539,"k"],[335,606,"k"],[795,509,"k"],[134,596,"k"],[279,604,"k"],[770,598,"k"],[785,476,"k"],[782,484,"k"],[533,484,"k"],[263,599,"k"],[971,506,"k"],[124,592,"k"],[776,518,"k"],[228,603,"k"],[887,483,"k"],[512,471,"k"],[666,584,"k"],[505,557,"k"],[939,484,"k"],[905,599,"k"],[509,590,"k"],[696,506,"k"],[505,596,"k"],[743,561,"k"],[878,514,"k"],[777,597,"k"],[81,600,"k"],[805,522,"k"],[738,527,"k"],[805,546,"k"],[505,547,"k"],[837,528,"k"],[747,575,"k"],[858,600,"k"],[758,552,"k"],[727,568,"k"],[859,476,"k"],[518,608,"k"],[798,585,"k"],[698,505,"k"],[30,452,"k"],[210,440,"k"],[330,428,"k"],[600,445,"k"],[880,462,"k"],[520,452,"k"],[760,470,"k"],[120,440,"k"],[205,608,"p"],[712,516,"p"],[905,556,"p"],[560,466,"p"],[118,602,"p"]];
const DECOY_MSG={k:'🪨 Nur ein Kieselstein. Das echte Easter Egg ist bunt bemalt.',v:'🐦 Ein Vogelei im Nest – nicht bemalt. Weitersuchen!',c:'🐈 Die Katze vom letzten Mal! Aber diesmal ist das Geheimnis ein Easter Egg.',p:'🍄 Nur ein Pilz. Weitersuchen!'};
function button(text,action,tip=''){return '<button type="button" class="egg-btn" data-egg="'+action+'"'+(tip?' aria-label="'+tip+'"':'')+'>'+text+'</button>';}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function mount(container,options={}){
 if(!container)return null;
 const onFind=typeof options.onFind==='function'?options.onFind:async()=>({ok:true});
 const hints=['🥚 Erster Hinweis: Nicht jedes Ei ist ein Easter Egg. Das echte ist bunt bemalt.','🐦 Zweiter Hinweis: In den Vogelnestern liegen nur echte Vogeleier.','🌾 Letzter Hinweis: Schau ins Schilf am Steg.'];
 let z=1,pan={x:0,y:0},pointers=new Map(),dragging=false,pinch=null,down=null,found=!!options.found,disabled=!!options.disabled,
 remaining=typeof options.remaining==='number'?clamp(options.remaining,0,30):30,trying=false,hintIndex=-1,misses=0,soundOn=false,audioCtx=null,hasPanned=false,hasZoomed=false,rot=0,curDist=0,lastTap=null;
 container.innerHTML='<div class="egg-game egg-mission30"><div class="egg-mission-progress" role="progressbar" aria-label="Verbleibende Missionszeit" aria-valuemin="0" aria-valuemax="30" aria-valuenow="'+remaining+'"><div class="egg-mission-progress-fill" data-egg-progress></div></div><div class="egg-topline"><div><span class="egg-kicker">🎯 GEHEIM-MISSION 04 · MULTITOUCH</span><h3>Finde das versteckte Easter Egg!</h3><p><b>Du hast nur 30 Sekunden.</b> Zoome auf mindestens 400 %, wische und drehe das Bild und tippe auf das bunt bemalte Ei. Vorsicht: Im Bild liegen viele Kieselsteine und Vogeleier!</p><span class="egg-mission-chip" data-egg-mission-state>● MISSION AKTIV · 3 SCHRITTE</span></div><div class="egg-clock-stack"><div class="egg-game-clock"><span>COUNTDOWN</span><strong data-egg-time>'+remaining+' s</strong><small>MISSION 30s</small></div><div class="egg-reward">⚡ Jetzt <strong data-egg-reward>300</strong> Punkte möglich</div></div></div><div class="egg-lesson"><span data-step="zoom">① <b>ZOOMEN ≥400 %</b><small>Zwei Finger auseinanderziehen</small></span><span data-step="pan">② <b>WISCHEN &amp; DREHEN</b><small>Das ganze Bild absuchen</small></span><span data-step="tap">③ <b>EI ANTIPPEN</b><small>Nur das bemalte Ei zählt</small></span></div><div class="egg-meter" aria-label="Live-Messung des Touchscreens"><div class="egg-meter-main"><small>Finger erkannt</small><strong data-m="fingers">0</strong></div><div><small>Fingerabstand</small><strong data-m="dist">–</strong></div><div><small>Zoom</small><strong data-m="zoom">100 %</strong></div><div><small>Drehwinkel</small><strong data-m="rot">0°</strong></div><div><small>Verschiebung</small><strong data-m="pan">0 px</strong></div><div><small>Letzter Tipp (x | y)</small><strong data-m="tap">–</strong></div></div><div class="egg-hardware"><div class="egg-hardware-top"><span>TOUCH LIVE · MULTITOUCH-LAB</span><span class="egg-hardware-camera" aria-hidden="true"></span></div><div class="egg-stage" data-egg-stage><svg class="egg-svg" data-egg-svg viewBox="0 0 1000 620" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Zoombares Wimmelbild mit Dorf, See, Steg und Bäumen. Ein bemaltes Easter Egg ist versteckt." tabindex="0"><g data-egg-world><image href="/easter-egg-scene.svg" x="0" y="0" width="1000" height="620"/></g></svg><div class="egg-location">🔎 EASTER-EGG-MISSION · TOUCH-DORF</div><div class="egg-zoom-indicator" data-egg-zoom>100 %</div><div class="egg-tap" data-egg-tap aria-live="polite">🎯 MISSION START! Zoome auf 400 % und finde das bemalte Ei.</div><div class="egg-celebration" data-egg-celebration hidden><div class="egg-confetti" aria-hidden="true"></div><span class="egg-star">🏆</span><h4>MISSION GESCHAFFT! 🎉</h4><p>Du hast das Easter Egg im Schilf aufgespürt und die Touch-Gesten gemeistert!</p><strong data-egg-points>Punkte gibt es erst am Ende zu sehen.</strong><div class="egg-learned">Das war echte Touchscreen-Bedienung: <b>Pinch-to-Zoom</b> zum Vergrößern, <b>Drehen</b> mit zwei Fingern, <b>Pan</b> zum Verschieben und <b>Tap</b> zum Auswählen.</div></div></div></div><div class="egg-tools">'+button('−','minus','Verkleinern')+button('＋','plus','Vergrößern')+button('↻','rotate','Bild drehen')+button('⟲','reset','Bild zurücksetzen')+button('💡 Hinweis','hint','Einen Tipp anzeigen')+button('🔇 Ton aus','sound','Spielton ein- oder ausschalten')+'<span class="egg-tools-help">Handy/iPad: Zwei Finger zoomen und drehen, mit einem Finger wischen · PC: Mausrad, ↻ oder R, Pfeiltasten, Enter</span></div><div class="egg-hint" data-egg-hint aria-live="polite">🎯 DEINE MISSION: ① Zoome auf mindestens 400 % · ② Wische und drehe das Bild · ③ Tippe auf das bunt bemalte Easter Egg. Schnell sein lohnt sich: Bonuspunkte!</div></div>';
 const game=container.querySelector('.egg-game'),svg=container.querySelector('[data-egg-svg]'),world=container.querySelector('[data-egg-world]');
 const readout=container.querySelector('[data-egg-tap]'),counter=container.querySelector('[data-egg-zoom]'),clock=container.querySelector('[data-egg-time]');
 const lessonZoom=container.querySelector('[data-step="zoom"]'),lessonPan=container.querySelector('[data-step="pan"]'),lessonTap=container.querySelector('[data-step="tap"]'),progressFill=container.querySelector('[data-egg-progress]'),progressTrack=container.querySelector('.egg-mission-progress'),missionState=container.querySelector('[data-egg-mission-state]'),rewardNode=container.querySelector('[data-egg-reward]');
 const meter=k=>container.querySelector('[data-m="'+k+'"]'),mFingers=meter('fingers'),mDist=meter('dist'),mZoom=meter('zoom'),mRot=meter('rot'),mPan=meter('pan'),mTap=meter('tap');
 const hint=container.querySelector('[data-egg-hint]'),celebration=container.querySelector('[data-egg-celebration]'),pointsNode=container.querySelector('[data-egg-points]');
 if(options.showLiveScore){
  if(pointsNode)pointsNode.textContent='Deine Punkte werden oben im Quiz live angezeigt.';
  if(hint)hint.textContent='🎓 Zoome auf 400 %, wische und drehe das Bild und tippe das bemalte Ei an. Dein Punktestand steht oben im Quiz.';
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
 // Die Meldung im Bild blendet sich nach gut 3 Sekunden aus, damit sie (gerade auf Handys) nicht das Bild verdeckt.
 let tapTimer=null;
 function flashTap(ms=3400){readout.classList.add('egg-tap-on');clearTimeout(tapTimer);tapTimer=setTimeout(()=>readout.classList.remove('egg-tap-on'),ms);}
 function message(txt,bad=false){
 readout.textContent=txt;readout.classList.toggle('egg-miss',bad);flashTap();
 if(bad){game.classList.remove('egg-shake');void game.offsetWidth;game.classList.add('egg-shake');try{global.navigator?.vibrate?.(35);}catch{}}
}
function missionStatus(){
 if(found){missionState.textContent='🏆 MISSION ERFÜLLT';return;}
 if(disabled){missionState.textContent='⏱ ZEIT ABGELAUFEN';return;}
 const done=Number(hasZoomed)+Number(hasPanned);
 missionState.textContent=done===2?'✓ 2 VON 3 · FINDE DAS EI':done===1?(hasZoomed?'✓ 1 VON 3 · BILD ABSUCHEN':'✓ 1 VON 3 · AUF 400 % ZOOMEN'):'● 0 VON 3 · MISSION LÄUFT';
}
function possiblePoints(seconds){return 170+Math.min(130,Math.max(0,Math.round((seconds/30)*13)*10));}
 function constrain(){const maxX=(z-1)*VIEW.w/2+80,maxY=(z-1)*VIEW.h/2+80;pan.x=clamp(pan.x,-maxX,maxX);pan.y=clamp(pan.y,-maxY,maxY);}
 function normRot(d){d=d%360;if(d>180)d-=360;if(d<=-180)d+=360;return d;}
 function svgPx(){const m=svg.getScreenCTM?.();return m?Math.hypot(m.a,m.b)||1:1;}
 let lastFingers=-1;
 function metrics(){
  const n=pointers.size;
  if(n!==lastFingers){lastFingers=n;mFingers.textContent=String(n);mFingers.parentNode.classList.remove('egg-meter-pulse');void mFingers.offsetWidth;if(n)mFingers.parentNode.classList.add('egg-meter-pulse');}
  mDist.textContent=n>=2&&curDist?Math.round(curDist)+' px':'–';
  mZoom.textContent=Math.round(z*100)+' %';mZoom.parentNode.classList.toggle('egg-meter-ok',z>=MINZ);
  mRot.textContent=Math.round(normRot(rot))+'°';
  mPan.textContent=Math.round(Math.hypot(pan.x,pan.y)*svgPx())+' px';
  mTap.textContent=lastTap?lastTap.x+' | '+lastTap.y:'–';mTap.title=lastTap?'x '+lastTap.x+' px, y '+lastTap.y+' px':'';
 }
 function draw(){if(z>=MINZ&&!hasZoomed){hasZoomed=true;lessonZoom.classList.add('egg-step-done');missionStatus();playSound('tap');}constrain();world.setAttribute('transform','translate('+pan.x+' '+pan.y+') translate('+VIEW.cx+' '+VIEW.cy+') rotate('+normRot(rot)+') scale('+z+') translate(-'+VIEW.cx+' -'+VIEW.cy+')');counter.textContent=Math.round(z*100)+' %';game.classList.toggle('egg-zoomed',z>=MINZ);metrics();}
 function rotateAt(deg,anchor){
  if(!deg)return;const a=anchor||{x:VIEW.cx,y:VIEW.cy},r=deg*Math.PI/180,vx=a.x-VIEW.cx-pan.x,vy=a.y-VIEW.cy-pan.y;
  pan.x=a.x-VIEW.cx-(vx*Math.cos(r)-vy*Math.sin(r));pan.y=a.y-VIEW.cy-(vx*Math.sin(r)+vy*Math.cos(r));rot=normRot(rot+deg);
 }
 function zoomAt(value,anchor){
  const next=clamp(value,1,MAXZ),old=z;if(Math.abs(next-old)<.0001)return;
  const a=anchor||{x:VIEW.cx,y:VIEW.cy},f=next/old;
  pan.x=a.x-VIEW.cx-(a.x-VIEW.cx-pan.x)*f;
  pan.y=a.y-VIEW.cy-(a.y-VIEW.cy-pan.y)*f;
  z=next;draw();
  if(z>=MINZ&&old<MINZ&&!found&&!disabled)message('🔎 400 % erreicht! Jetzt kannst du kleine Details antippen.');
 }
 function finish(result){
  lockScroll(false);
  if(!found)playSound('win');lessonZoom.classList.add('egg-step-done');lessonPan.classList.add('egg-step-done');lessonTap.classList.add('egg-step-done');found=true;disabled=true;game.classList.add('egg-found');missionStatus();
  celebration.hidden=false;
  pointsNode.textContent=Number.isFinite(result?.points)?'+'+result.points+' Punkte verdient!':options.showLiveScore?'Deine Punkte stehen oben im Quiz.':'Deine Punkte siehst du erst bei den Ergebnissen.';
  message('✅ RICHTIG! Das Easter Egg ist gefunden!');
  hint.textContent=options.showLiveScore?'Geschafft! Dein Punktestand oben aktualisiert sich automatisch. Gleich geht es mit dem Film weiter.':'Geschafft! Damit hast du gezeigt, wie Multitouch und das Antippen eines kleinen Ziels funktionieren. Gleich geht es mit der Doku weiter.';
  try{if(global.navigator?.vibrate)global.navigator.vibrate([70,70,120]);}catch{}
 }
 async function tryFind(e){
  if(disabled||found||trying)return;
  if(z<MINZ){playSound('miss');message('🔎 Erst auf mindestens 400 % vergrößern! Jetzt: '+Math.round(z*100)+' %',true);return;}
  const pos=worldPt({x:e.clientX,y:e.clientY});
  if(Math.abs(pos.x-VIEW.targetX)>HIT||Math.abs(pos.y-VIEW.targetY)>HIT){
   misses++;playSound('miss');
   let near=null,best=1e9;for(const d of DECOYS){const dd=Math.hypot(pos.x-d[0],pos.y-d[1]);if(dd<best){best=dd;near=d;}}
   const distance=Math.hypot(pos.x-VIEW.targetX,pos.y-VIEW.targetY);
   message(near&&best<=8?DECOY_MSG[near[2]]:distance<30?'🔥 Ganz nah dran! Schau genau hin.':'Hier ist nichts versteckt. Weitersuchen!',true);
   return;
  }
  trying=true;message('✅ RICHTIG! Dein Fund wird gespeichert …');
  try{const result=await onFind({x:pos.x,y:pos.y,zoom:z,elapsed:(options.duration||30)-remaining});if(result?.ok===false)throw Error(result.error||'Fund wurde nicht bestätigt.');finish(result||{});}
  catch(e){trying=false;message('⚠️ Der Fund wurde nicht gespeichert: '+(e?.message||'Versuch es bitte erneut.'),true);}
 }
 function snapshot(){
  const values=[...pointers.values()];
  if(values.length===2){
   const a=values[0],b=values[1];curDist=Math.hypot(b.x-a.x,b.y-a.y);pinch={distance:curDist||1,center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},angle:Math.atan2(b.y-a.y,b.x-a.x)};
  }else{pinch=null;curDist=0;}
  metrics();
 }
 svg.addEventListener('pointerdown',e=>{
  if(disabled||found)return;e.preventDefault();
  try{svg.setPointerCapture?.(e.pointerId);}catch{}
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const sb=svg.getBoundingClientRect?.();if(sb)lastTap={x:Math.round(e.clientX-sb.left),y:Math.round(e.clientY-sb.top)};
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
   const nowAngle=Math.atan2(b.y-a.y,b.x-a.x);curDist=nowDist;
   if(pinch){zoomAt(z*nowDist/pinch.distance,unit(pinch.center));const oldScene=unit(oldMid||pinch.center),newScene=unit(nowMid);pan.x+=newScene.x-oldScene.x;pan.y+=newScene.y-oldScene.y;rotateAt(normRot((nowAngle-pinch.angle)*180/Math.PI),newScene);draw();}
   pinch={distance:nowDist,center:nowMid,angle:nowAngle};dragging=true;if(down)down.many=true;
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
 // Mausrad-Zoom am PC. Getestet in Chrome: Ein Listener nur auf dem Bild bekommt das Rad-Ereignis oft als „nicht abbrechbar“,
 // dann scrollt die Seite weg statt zu zoomen. Deshalb hört das Dokument mit (ausdrücklich passive:false) und zoomt nur,
 // wenn der Mauszeiger über dem Bild ist. Sonst scrollt die Seite ganz normal.
 const stage=container.querySelector('[data-egg-stage]')||svg;
 // Zusätzlich wird die Seite gesperrt, solange die Maus über dem Bild ist – dann kann sie auch bei „nicht abbrechbaren“
 // Rad-Ereignissen nicht wegscrollen. Nur Maus (nicht Touch), nur während die Mission läuft.
 let scrollLocked=false;
 function lockScroll(on){const h=document.documentElement;if(!h||on===scrollLocked)return;scrollLocked=on;
  if(on){h.style.scrollbarGutter='stable';h.style.overflow='hidden';}else{h.style.overflow='';h.style.scrollbarGutter='';}}
 stage.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!disabled&&!found)lockScroll(true);});
 stage.addEventListener('pointerleave',()=>lockScroll(false));
 global.addEventListener('blur',()=>lockScroll(false));
 const onWheel=e=>{
  if(!stage.isConnected){document.removeEventListener('wheel',onWheel,{passive:false});lockScroll(false);return;}
  if(!stage.contains(e.target)||disabled||found)return;
  e.preventDefault();zoomAt(z*(e.deltaY<0?1.18:.84),unit({x:e.clientX,y:e.clientY}));
 };
 document.addEventListener('wheel',onWheel,{passive:false});
 svg.addEventListener('dblclick',e=>{e.preventDefault();if(!disabled&&!found)zoomAt(z*1.55,unit({x:e.clientX,y:e.clientY}));});
 svg.addEventListener('keydown',e=>{
  if(e.key==='+'||e.key==='='){e.preventDefault();zoomAt(z*1.3);}
  if(e.key==='-'){e.preventDefault();zoomAt(z/1.3);}
  if(e.key==='0'){e.preventDefault();z=1;rot=0;pan={x:0,y:0};draw();}
  if((e.key==='r'||e.key==='R')&&!disabled&&!found){e.preventDefault();rotateAt(15);draw();}
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
  else if(b.dataset.egg==='rotate'){playSound('tap');rotateAt(15);draw();}
  else if(b.dataset.egg==='reset'){z=1;rot=0;pan={x:0,y:0};draw();message('Bild zentriert. Deine Mission läuft weiter!');}
 }));
 function update(next={}){
  if(typeof next.remaining==='number'&&Number.isFinite(next.remaining)){remaining=clamp(next.remaining,0,30);clock.textContent=remaining+' s';if(progressFill)progressFill.style.width=(remaining/30*100)+'%';if(progressTrack)progressTrack.setAttribute('aria-valuenow',String(remaining));if(rewardNode)rewardNode.textContent=String(possiblePoints(remaining));game.classList.toggle('egg-clock-low',remaining<=8&&remaining>0);game.classList.toggle('egg-clock-alert',remaining<=16&&remaining>8);if(!found&&!disabled){if(remaining<=5&&hintIndex<2){hintIndex=2;hint.textContent='🌾 LETZTE SEKUNDEN! Das Ei steckt im Schilf am Steg.';}else if(remaining<=11&&hintIndex<1){hintIndex=1;hint.textContent='💡 TIPP: In den Vogelnestern liegen nur echte Vogeleier.';}else if(remaining<=19&&hintIndex<0){hintIndex=0;hint.textContent='💡 TIPP: Nicht jedes Ei ist ein Easter Egg. Das echte ist bunt bemalt.';}}if(remaining<=0&&!found){disabled=true;lockScroll(false);message('⏱ Mission beendet! Das Easter Egg steckte im Schilf am Steg.');missionStatus();}}
  if(next.found&&!found)finish({});
  if(next.disabled===true){disabled=true;missionStatus();lockScroll(false);}
 }
 draw();update(options);flashTap(4200);
 if(found){finish({});}
 return {update,reset(){if(found)return;z=1;rot=0;pan={x:0,y:0};draw();},destroy(){document.removeEventListener('wheel',onWheel,{passive:false});lockScroll(false);},metrics(){return{fingers:pointers.size,distance:Math.round(curDist),zoom:Math.round(z*100),rotation:Math.round(normRot(rot)),tap:lastTap};}};
}
global.EasterGame={mount,position:{x:VIEW.targetX/VIEW.w,y:VIEW.targetY/VIEW.h},minZoom:MINZ,version:'4.0-easter-egg'};
})(window);
