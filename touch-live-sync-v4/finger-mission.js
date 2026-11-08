/* TOUCH LIVE · 30-second Finger Mission with live pointer measurements. */
(function(global){
 'use strict';
 const LIMIT=30, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const format=(n,unit='')=>Math.round(n)+unit;
 function mount(root,options={}){
  if(!root)return null;
  const active=new Map();let scale=1,rotation=0,x=0,y=0,origin=null,completed=false;
  let remaining=Number.isFinite(options.remaining)?clamp(options.remaining,0,LIMIT):LIMIT;
  let frozen=!!options.disabled,offset=0,usedZoom=false,usedRotate=false,usedDrag=false,progress=0;
  let peakDistance=0,currentDistance=0,lastX=0,lastY=0;
  root.innerHTML='<section class="fingerMission" aria-label="Finger-Mission · Touchscreen-Messung">'+
   '<header class="fingerMissionHead"><div><span class="fingerMissionKicker">🖐️ MISSION 02 · TOUCH-MESSLABOR</span><h3>Meistere drei Touch-Gesten!</h3><p>Zwei Finger für Zoom und Drehung, einen Finger zum Verschieben. Die aktuellen Messwerte stehen immer oben.</p></div>'+
   '<div class="fingerMissionTimer"><span>ZEIT</span><strong id="fingerMissionTime">30 s</strong></div></header>'+
   '<div class="fingerMissionProgress"><div id="fingerMissionProgress"></div></div>'+
   '<div class="fingerReadouts" aria-label="Aktuelle Live-Messung">'+
   '<div><small>Finger erkannt</small><strong id="fmFingers">0</strong></div>'+
   '<div><small>Fingerabstand</small><strong id="fmDistance">–</strong></div>'+
   '<div><small>Zoom</small><strong id="fmZoom">100 %</strong></div>'+
   '<div><small>Drehwinkel</small><strong id="fmRotation">0°</strong></div>'+
   '<div><small>Verschiebung</small><strong id="fmTravel">0 px</strong></div></div>'+
   '<div class="fingerSteps">'+
   '<span id="fmStepZoom">① <b>Zoomen</b><small>mindestens 150 %</small></span>'+
   '<span id="fmStepRotate">② <b>Drehen</b><small>mindestens 25°</small></span>'+
   '<span id="fmStepDrag">③ <b>Verschieben</b><small>mindestens 80 px</small></span></div>'+
   '<div class="fingerTouchArea" id="fmTouchArea" role="group" aria-label="Interaktives Multitouch-Messfeld">'+
   '<div class="fingerScene" id="fmScene"><img src="/easter-scene.svg" draggable="false" alt="Berglandschaft zum Drehen, Verschieben und Zoomen"></div>'+
   '<div class="fingerSceneHint" id="fmHint">🖐️ Probiere die drei Finger-Gesten aus.</div></div>'+
   '<div class="fingerActions"><button type="button" id="fmZoomIn">＋ Zoom</button><button type="button" id="fmRotate">↻ Drehen</button><button type="button" id="fmReset">⟲ Zurücksetzen</button></div>'+
   '<div class="fingerMissionResult" id="fmResult" role="status">🎯 MISSION AKTIV · 0 / 3 Aufgaben geschafft</div>'+
   '<p class="fingerMissionFoot">Alle Messwerte werden live im Browser berechnet. Sie werden nicht als körperliche Daten erfasst und nicht an den Server geschickt.</p></section>';
  const $=id=>root.querySelector('#'+id),box=$('fmTouchArea'),picture=$('fmScene'),status=$('fmResult'),hint=$('fmHint');
  const goals={zoom:$('fmStepZoom'),rotate:$('fmStepRotate'),drag:$('fmStepDrag')};
  const sq=n=>Math.round(n*10)/10,angleDiff=(a,b)=>{let d=(a-b)*180/Math.PI;while(d>180)d-=360;while(d< -180)d+=360;return d;};
  function metrics(){
   picture.style.transform='translate('+sq(x)+'px,'+sq(y)+'px) rotate('+sq(rotation)+'deg) scale('+sq(scale)+')';
   $('fmFingers').textContent=String(active.size);
   $('fmDistance').textContent=active.size>=2?format(currentDistance,' px'):'–';
   $('fmZoom').textContent=format(scale*100,' %');
   $('fmRotation').textContent=format(rotation,'°');
   $('fmTravel').textContent=format(Math.hypot(x,y),' px');
  }
  function mark(){
   if(scale>=1.5)usedZoom=true;
   if(Math.abs(rotation)>=25)usedRotate=true;
   if(Math.hypot(x,y)>=80)usedDrag=true;
   goals.zoom.classList.toggle('done',usedZoom);
   goals.rotate.classList.toggle('done',usedRotate);
   goals.drag.classList.toggle('done',usedDrag);
   progress=Number(usedZoom)+Number(usedRotate)+Number(usedDrag);
   if(!completed&&progress===3){
    completed=true;
    root.querySelector('.fingerMission').classList.add('fingerMissionWon');
    status.textContent='🏆 FINGER-MISSION GESCHAFFT! Zoom, Drehung und Verschiebung gemessen.';
    hint.textContent='✅ Perfekt! Du hast alle drei Gesten erfolgreich ausgeführt.';
    try{global.navigator?.vibrate?.([65,50,65]);}catch{}
   }else if(!completed&&!frozen){
    status.textContent='🎯 MISSION AKTIV · '+progress+' / 3 Aufgaben geschafft';
    hint.textContent=progress===2?'🔥 Fast geschafft! Noch die letzte Geste ausführen.':progress===1?'✅ Erste Messung erreicht. Weiter zur nächsten Geste!':'🖐️ Probiere die drei Finger-Gesten aus.';
   }
  }
  function measure(){metrics();mark();}
  function snapshot(){
   const ps=[...active.values()];
   if(ps.length===1)origin={count:1,first:{...ps[0]},x,y};
   else if(ps.length>=2){const dx=ps[1].x-ps[0].x,dy=ps[1].y-ps[0].y;
    currentDistance=Math.hypot(dx,dy);peakDistance=Math.max(peakDistance,currentDistance);
    origin={count:2,mid:{x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2},distance:currentDistance||1,angle:Math.atan2(dy,dx),x,y,scale,rotation};
   }else{origin=null;currentDistance=0;}
   metrics();
  }
  function pointerdown(e){
   if(frozen||completed)return;
   e.preventDefault();box.setPointerCapture?.(e.pointerId);
   active.set(e.pointerId,{x:e.clientX,y:e.clientY});snapshot();
  }
  function pointermove(e){
   if(!active.has(e.pointerId)||frozen||completed)return;
   e.preventDefault();active.set(e.pointerId,{x:e.clientX,y:e.clientY});
   const pts=[...active.values()];
   if(origin?.count===1&&pts.length===1){x=origin.x+pts[0].x-origin.first.x;y=origin.y+pts[0].y-origin.first.y;}
   else if(origin?.count===2&&pts.length>=2){
    const dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y;
    currentDistance=Math.hypot(dx,dy);peakDistance=Math.max(peakDistance,currentDistance);
    const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    scale=clamp(origin.scale*currentDistance/origin.distance,.7,4.2);
    rotation=origin.rotation+angleDiff(Math.atan2(dy,dx),origin.angle);
    x=origin.x+mid.x-origin.mid.x;y=origin.y+mid.y-origin.mid.y;
   }
   measure();
  }
  function pointerup(e){if(!active.has(e.pointerId))return;active.delete(e.pointerId);snapshot();}
  box.addEventListener('pointerdown',pointerdown);
  box.addEventListener('pointermove',pointermove);
  box.addEventListener('pointerup',pointerup);
  box.addEventListener('pointercancel',pointerup);
  $('fmZoomIn').onclick=()=>{if(frozen||completed)return;scale=clamp(scale*1.6,.7,4.2);measure();};
  $('fmRotate').onclick=()=>{if(frozen||completed)return;rotation+=30;measure();};
  $('fmReset').onclick=()=>{if(frozen||completed)return;scale=1;rotation=0;x=0;y=0;active.clear();snapshot();measure();};
  function update(next={}){
   if(Number.isFinite(next.remaining)){
    remaining=clamp(next.remaining,0,LIMIT);
    $('fingerMissionTime').textContent=remaining+' s';
    $('fingerMissionProgress').style.width=(remaining/LIMIT*100)+'%';
    root.querySelector('.fingerMission').classList.toggle('fingerMissionUrgent',remaining<=8&&remaining>0);
    if(remaining<=0)frozen=true;
   }
   if(next.disabled===true)frozen=true;
   if(frozen&&!completed){status.textContent='⏱ Mission vorbei · '+progress+' von 3 Gesten geschafft';hint.textContent='Die 30 Sekunden sind vorbei. Schau wieder auf den Film.';}
  }
  metrics();mark();update(options);
  return{update,destroy(){active.clear();},getMetrics(){return{fingers:active.size,distance:sq(currentDistance),zoom:Math.round(scale*100),rotation:sq(rotation),travel:Math.round(Math.hypot(x,y)),remaining,completed,steps:progress}}};
 }
 global.FingerMission={mount,version:'1.0-30sec',duration:LIMIT};
})(window);
