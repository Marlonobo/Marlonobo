
(function(){
'use strict';
const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const ORIGIN=location.origin+location.pathname, app=el('app');
let role='home',state=null,renderSignature='',userId='',userName='',adminKey=sessionStorage.getItem('touch_admin_key')||'',remoteKey=sessionStorage.getItem('touch_cohost_key')||'',tvKey=sessionStorage.getItem('touch_tv_key')||localStorage.getItem('touch_tv_key')||'';
let easterInstance=null,cloudUploadReady=false,libraryRecoveryStarted=false;
let tvAutoplayMuted=false;
let spotifyApi=null,spotifyController=null,spotifyUri='',spotifyWanted=false,spotifyScriptLoading=false;
let fingerMissionInstance=null,lastStudentPoints=null;
let welcomeAudioPending=false,welcomeAudioBlocked=false,welcomeAudioError='';
let adminInfo=null,videoEl=null,ytPlayer=null,mediaType='',youtubeReady=false,playerReady=false,subtitles=[],lastFilmPhase='',lastRevision=-1,lastCaptionRevision=-1,gesturePointers=new Map(),gestureTransform={x:0,y:0,scale:1,rotate:0},gestureSnapshot=null;
const CH=['Geschichte der Touchscreens','Wie Touchscreens funktionieren','Fünf Touchscreen-Arten','Multitouch und Display','Touchscreens im Alltag','Probleme und Zukunft','Fazit und Abschlussquiz'];
const times=['04:28','06:16','10:02','12:02','15:21','19:14','23:22','25:13','28:52','30:50','33:27','36:43','41:52','42:51','43:46','44:41','45:36'];
async function api(url,method='GET',body,key=''){const opt={method,headers:{}};if(key)opt.headers['x-'+(role==='tv'?'tv':role==='remote'?'cohost':'admin')+'-key']=key;if(body!==undefined){opt.headers['Content-Type']='application/json';opt.body=JSON.stringify(body);}const r=await fetch(url,opt);let data={};try{data=await r.json();}catch{}if(!r.ok)throw Error(data.error||'Fehler '+r.status);return data;}
function wrap(body){
 if(role==='join'){
  app.innerHTML='<div class="studentPortal"><header class="studentBrand" aria-label="TOUCH LIVE Schülerbereich"><div class="logo">TOUCH <span>LIVE</span></div><div class="studentBrandRight"><span class="studentLiveDot" aria-hidden="true"></span> LIVE-MITMACHEN · LERNFELD 14</div></header><main class="wrap studentMain">'+body+'</main></div>';
  return;
 }
 app.innerHTML='<header class="nav wrap"><a class="logo" href="#home">TOUCH <span>LIVE</span></a><nav class="navlinks"><a href="#home">Start</a><a href="/join">Schüler</a><a href="#teacher">Lehrer</a><a href="#handout">Handout</a></nav></header><main class="wrap">'+body+'</main><footer>TOUCH LIVE · Friedrich-Dessauer-Schule Limburg · 2026</footer>';
}
function page(title,tag,sub){return '<div class="page"><span class="eyebrow">'+tag+'</span><h1>'+title+'</h1><p>'+sub+'</p></div>';}
function home(){
wrap('<section class="hero homeHero"><div class="homeHeroCopy"><span class="eyebrow">DOKUMENTATION · TOUCHSCREEN · 2026</span><h1>Berühren.<br><em>Verstehen.</em><br>Mitmachen.</h1><p class="lead">Der Film läuft vorne auf dem Beamer. Auf deinem iPad erscheinen genau im richtigen Moment die Quizfragen, das Gesten-Spiel und am Ende die Ergebnisse.</p><div class="flex"><a href="/join" class="btn primary">Als Schüler teilnehmen</a><a href="#teacher" class="btn">Lehreransicht öffnen</a><a href="/watch" class="btn">🎬 Gemeinsam online schauen</a><a href="/easter-demo" class="btn">🔎 Easter Egg ausprobieren</a></div><p class="small">17 Fragen · 7 Kapitel · 1 echtes Wimmelbild-Spiel · Ohne Anmeldung</p></div><a class="homeHeroPreview" href="/easter-demo" title="Easter-Egg-Spiel kostenlos ausprobieren"><img src="/easter-scene.svg" alt="Illustriertes Bergpanorama mit dem geheimen Easter Egg – einer versteckten Katze" loading="eager"><span class="homePreviewTag">🎮 NEU · EASTER EGG SUCHEN <b>Testspiel öffnen</b></span></a></section><section class="cards"><div class="card"><span class="label">01 / WILLKOMMEN</span><h2>Alle sind dabei.</h2><p>Ein Link für die Klasse. Du gibst deinen Namen ein und wartest auf den Start.</p></div><div class="card"><span class="label">02 / LIVE</span><h2>Film & Mitmachen</h2><p>Solange der Film läuft, schaust du auf den Beamer. Bei den passenden Zeitmarken geht dein Quiz auf.</p></div><div class="card"><span class="label">03 / ABSCHLUSS</span><h2>Ergebnisse & Handout</h2><p>Am Ende gibt es eine gemeinsame Rangliste und ein Handout mit Apple-Pencil-Feld und PDF-Export.</p></div></section><section class="page"><span class="eyebrow">SIEBEN KAPITEL</span><h1>Von 1965 bis heute.</h1><div class="chapter-list">'+CH.map((v,i)=>'<div><b>0'+(i+1)+'</b>'+esc(v)+'</div>').join('')+'</div></section>');
}
function paintQuizTimer(q){
 if(!q||q.type==='zoom')return;
 const timer=el('liveTimer'),fill=el('quizTimeFill'),card=timer?.closest('.quiz');
 const seconds=Math.max(0,Math.ceil(Number(q.remaining)||0));
 if(timer){timer.textContent=seconds+' s';timer.classList.toggle('timerUrgent',seconds<=10);timer.setAttribute('aria-label',seconds+' Sekunden verbleiben');}
 if(fill)fill.style.width=(Math.min(100,seconds/45*100))+'%';
 if(card)card.classList.toggle('quizUrgent',seconds<=10);
}
function waiting(title,desc,icon='◉'){return '<div class="centerstage"><div><div class="symbol">'+icon+'</div><span class="eyebrow">TOUCH LIVE</span><h2>'+title+'</h2><p>'+desc+'</p></div></div>';}
function podium(){const people=(state?.ranking||[]),rank=n=>people[n-1]||null;
 const card=(n)=>{const u=rank(n);return '<div class="podiumCard podium-rank-'+n+'"><div class="medalIcon">'+(n===1?'👑':n===2?'🥈':'🥉')+'</div><div class="podiumAvatar">'+(u?esc(u.name.slice(0,1).toUpperCase()):'?')+'</div><div class="podiumName">'+(u?esc(u.name):'Noch offen')+'</div><div class="podiumScore">'+(u?u.score+' Punkte':'—')+'</div><div class="podiumBase">'+n+'<span>PLATZ</span></div></div>';};
 return '<section class="podiumWrap" aria-label="Die besten drei Plätze"><div class="podiumCountdown" aria-hidden="true"><span>3</span><span>2</span><span>1</span></div><div class="podiumStage">'+card(2)+card(1)+card(3)+'</div></section>';}
function ranking(){const rows=(state?.ranking||[]).map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.name)+(x.role==='teacher'?' · Lehrer':'')+'</td><td>'+x.score+'</td></tr>').join('');return '<table class="rank"><thead><tr><th>Platz</th><th>Name</th><th>Punkte</th></tr></thead><tbody>'+(rows||'<tr><td colspan="3">Noch keine Ergebnisse vorhanden.</td></tr>')+'</tbody></table>';}
function requestParticipantFullscreen(){
 try{
  const active=document.activeElement;if(active&&typeof active.blur==='function')active.blur();
  const root=document.documentElement;
  if(!document.fullscreenElement){
    const enter=root.requestFullscreen||root.webkitRequestFullscreen;
    if(enter){const result=enter.call(root);if(result&&typeof result.catch==='function')result.catch(()=>{});}
  }
 }catch{}
}
function refreshStudentScoreBadge(){
 if(role!=='join')return;
 const badge=el('studentScoreValue');
 if(!badge)return;
 const amount=state?.player?.liveScore;
 if(Number.isFinite(amount)&&lastStudentPoints!==null&&amount>lastStudentPoints){
  badge.classList.remove('scoreBump');void badge.offsetWidth;badge.classList.add('scoreBump');
 }
 badge.textContent=Number.isFinite(amount)?Math.round(amount).toLocaleString('de-DE'):'—';
 if(Number.isFinite(amount))lastStudentPoints=amount;
}
function participantMode(){
 const on=(role==='join'||role==='teacher')&&!!userName;
 document.body.classList.toggle('touchStudent',on);
 if(!on)return;
 const main=document.querySelector('main.wrap');if(!main||el('participantFullscreen'))return;
 const bar=document.createElement('div');bar.className='participantFullBar';
 bar.innerHTML='<span class="small">TOUCH LIVE · LIVE-QUIZ</span><div class="participantBarActions">'+
  (role==='join'?'<div class="studentLiveScore" aria-label="Dein aktueller Punktestand"><span class="studentLiveScoreLabel">🏆 Deine Punkte</span><strong id="studentScoreValue" aria-live="polite">—</strong></div>':'')+
  '<button id="participantFullscreen" class="participantFullBtn">⛶ Vollbild öffnen</button></div>';
 main.prepend(bar);
 el('participantFullscreen').onclick=()=>requestParticipantFullscreen();
 refreshStudentScoreBadge();
}
function userPage(){
 const isTeacher=role==='teacher',userRole=isTeacher?'teacher':'student';
 const idKey='touch_'+userRole+'_id',nameKey='touch_'+userRole+'_name';
 userId=localStorage.getItem(idKey)||'';userName=localStorage.getItem(nameKey)||'';
 if(!userId||!userName){wrap((isTeacher?page('Lehreransicht','LEHRER · MITMACHEN UND NOTIZEN','Hier startet die gemeinsame Touchscreen-Präsentation.'):'<div class="studentEntryIntro"><span class="eyebrow">GEMEINSAM · LIVE · LERNFELD 14</span><h1>Du bist <em>dabei.</em></h1><p>Gib deinen Vornamen ein. Die Fragen und Spiele erscheinen automatisch, wenn sie an der Reihe sind. Vorher siehst du nichts davon.</p></div>')+'<div class="card studentJoinCard" style="max-width:550px"><h2>Willkommen bei TOUCH LIVE</h2><p>Gib deinen Anzeigenamen ein. Es ist kein Konto nötig.</p><form id="joinForm"><label>Dein Vorname oder Spitzname</label><input id="joinName" maxlength="26" required placeholder="Dein Name" autocomplete="nickname"><p></p><button class="primary">Jetzt teilnehmen</button></form></div>');el('joinForm').onsubmit=async e=>{e.preventDefault();requestParticipantFullscreen();try{const name=el('joinName').value.trim();const x=await api('/api/join','POST',{id:userId,name,role:userRole});localStorage.setItem(idKey,x.id);localStorage.setItem(nameKey,name);renderSignature='';await poll();}catch(err){alert(err.message);}};return;}
 if(!state){wrap(waiting('Verbindung wird hergestellt …','Die Präsentation wird geladen.'));participantMode();return;}
 const q=state.quiz,p=state.player||{},answered=q&&p.choice!==null&&p.choice!==undefined;
 let body='';
 if(state.phase==='welcome')body=waiting('Willkommen, '+esc(userName)+'!','Wir beginnen gleich. Bitte schaut auf den Beamer.','✦');
 else if(state.phase==='gesture'||state.sideGame==='gesture')body='<div class="card fingerMissionCard"><div id="fingerMissionMount"></div></div>';
 else if(q&&q.type==='zoom')body=zoomCard(q,p,answered);
 else if(q&&!q.accepting)body=waiting('Schau auf den Beamer.','Die Antwortzeit ist vorbei. Die Dokumentation läuft weiter.','◉');
  else if(q){const hide=p.hide||[],jk=p.jokers||{},canJ=q.jokers&&q.accepting&&!answered;
  const jbar=q.jokers?'<div class="jokers">'+(jk.fifty?'':'<button class="joker" data-joker="fifty" '+(canJ?'':'disabled')+'>50:50</button>')+(jk.hint?'':'<button class="joker" data-joker="hint" '+(canJ?'':'disabled')+'>💡 Tipp</button>')+(jk.fifty&&jk.hint?'<span class="small">Alle Joker eingesetzt</span>':'<span class="small">Jeder Joker nur einmal im ganzen Abschlussquiz</span>')+'</div>':'';
  body='<div class="card quiz"><div class="between"><span class="chip">'+(q.jokers?'ABSCHLUSSQUIZ · ':'')+'FRAGE '+(q.index+1)+' / '+q.total+'</span><div class="quizTimerHud"><div id="liveTimer" class="timer">'+q.remaining+' s</div><div class="quizTimeTrack" aria-hidden="true"><i id="quizTimeFill"></i></div></div></div>'+jbar+'<h2>'+esc(q.q)+'</h2>'+(p.hint?'<div class="hintbox">💡 '+esc(p.hint)+'</div>':'')+'<div class="answers">'+q.a.map((v,i)=>'<button class="answer'+(answered&&p.choice===i?' chosen':'')+(hide.includes(i)?' gone':'')+'" data-choice="'+i+'" '+(answered||!q.accepting||hide.includes(i)?'disabled':'')+'><b>'+String.fromCharCode(65+i)+'</b><span>'+esc(v)+'</span></button>').join('')+'</div><p class="small" style="margin-top:17px">'+(answered?'Deine Antwort ist gespeichert. Dein Punktestand oben wird automatisch aktualisiert. Schau jetzt wieder auf den Film.':q.accepting?'Wähle eine Antwort. Jede Frage kann nur einmal beantwortet werden.':'Antwortzeit vorbei. Bitte wieder auf den Beamer schauen.')+'</p></div>';}
 else if(state.phase==='results'||state.phase==='end'||state.phase==='handout')body='<div class="card"><span class="eyebrow">ABSCHLUSS</span><h2>Danke für deine Rückmeldung!</h2><p>Dein Punktestand</p><div class="values">'+(p.score||0)+'</div>'+prizeCard()+zoomSolution()+'<h3>Gemeinsame Rangliste</h3>'+ranking()+'<div class="flex" style="margin-top:23px"><a href="/#handout" class="btn primary">Handout ausfüllen & PDF speichern</a></div></div>';
 else body=waiting('Bitte auf den Beamer schauen.','Die Dokumentation läuft. Die nächste Frage erscheint automatisch.','◉');
 const notes=isTeacher?'<div class="card" style="margin-top:17px"><span class="label">LEHRER · PRIVAT</span><h2>Notizen zur Dokumentation</h2><p>Deine Notizen bleiben auf diesem Gerät und sind für Schüler nicht sichtbar.</p><textarea id="teacherNotes" rows="6" placeholder="Beobachtungen, Rückfragen, Feedback …">'+esc(localStorage.getItem('touch_teacher_notes')||'')+'</textarea><div class="flex" style="margin-top:12px"><button id="saveNotes">Notizen als Textdatei speichern</button></div></div>':'';
 wrap(page('Die Dokumentation läuft.',isTeacher?'LEHRER · LIVE MITMACHEN':'SCHÜLER · LIVE MITMACHEN','Teilnehmer: '+esc(userName)+' · '+(isTeacher?'Lehrer':'Schüler')+' · '+state.participants+' angemeldet')+body+notes);
 document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/api/answer','POST',{id:userId,choice:+b.dataset.choice});renderSignature='';await poll();}catch(e){alert(e.message);renderSignature='';await poll();}});
 document.querySelectorAll('[data-joker]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/api/joker','POST',{id:userId,type:b.dataset.joker});}catch(e){alert(e.message);}renderSignature='';await poll();});
 if(q?.type==='zoom')initEaster();else if(q)paintQuizTimer(q);
 if(isTeacher){el('teacherNotes').oninput=e=>localStorage.setItem('touch_teacher_notes',e.target.value);el('saveNotes').onclick=()=>saveText('TOUCH-LIVE-Lehrernotizen.txt',el('teacherNotes').value);}
 if(state.phase==='gesture'||state.sideGame==='gesture')initGesture();
}
function zoomCard(q,p,answered){return '<section class="easter-live"><div class="between" style="margin-bottom:10px"><span class="chip">🎯 KAPITEL 4 · 30-SEKUNDEN-MISSION</span><span class="small">Bereits gefunden: '+(q.foundCount||0)+' von '+state.participants+'</span></div><div id="easterMount"></div><p class="small" style="margin-top:12px">'+(p.zoomFound?'✅ RICHTIG! Du hast die Katze gefunden. Deine Punkte werden oben direkt aktualisiert.':!q.accepting?'Die Suche ist beendet. Wichtig: Pinch-to-Zoom, Pan und Tap sind echte Touchscreen-Gesten.':'30-SEKUNDEN-MISSION: Auf 200 % zoomen, die Berghütte finden und die Katze im Dachfenster antippen. Schnell sein gibt Bonuspunkte!')+'</p></section>';}
function initEaster(){
 const host=el('easterMount'),q=state?.quiz,p=state?.player;
 if(!host||!q||!window.EasterGame)return;
 easterInstance=window.EasterGame.mount(host,{
  remaining:q.remaining,duration:30,found:!!p?.zoomFound,
  showLiveScore:role==='join',disabled:!q.accepting,
  onFind:async ({x,y,zoom})=>{
   if(!userId)throw Error('Bitte erst einen Namen eingeben.');
   const result=await api('/api/easter/find','POST',{id:userId,x,y,zoom});
   setTimeout(()=>{poll();},600);
   return result;
  }
 });
}
function canSvg(c1,c2,c3,label){return '<svg viewBox="0 0 90 170" width="64" height="120" aria-hidden="true"><defs><linearGradient id="cg'+label+'" x1="0" x2="1"><stop offset="0" stop-color="'+c1+'"/><stop offset=".45" stop-color="'+c2+'"/><stop offset="1" stop-color="'+c1+'"/></linearGradient></defs><rect x="8" y="14" width="74" height="146" rx="12" fill="url(#cg'+label+')"/><rect x="14" y="6" width="62" height="14" rx="6" fill="#c9d3db"/><rect x="8" y="58" width="74" height="46" fill="'+c3+'"/><text x="45" y="87" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" font-family="sans-serif">ENERGY</text></svg>';}
function prizeCard(){const r=state?.ranking||[];const w=r.length?r.filter(x=>x.score===r[0].score&&r[0].score>0):[];return '<div class="prize"><div class="cans">'+canSvg('#9fb3c8','#e8eef4','#1f3f8a','a')+canSvg('#1c1f22','#3a4045','#6ccb3a','b')+'</div><div><span class="eyebrow">DER PREIS</span><h3>Wer die meisten Punkte hat, bekommt ein Red Bull oder Monster!</h3><p>'+(w.length?'🏆 '+w.map(x=>esc(x.name)).join(' & ')+' · '+w[0].score+' Punkte':'Die Rangliste entscheidet.')+'</p></div></div>';}
function zoomSolution(){const z=state?.zoomResult;if(!z)return '';return '<div class="zoomsol"><div class="zoomsolPic">'+landscape()+'</div><div><span class="eyebrow">AUFLÖSUNG ZOOM-AUFGABE</span><h3>Im Fenster sitzt: '+esc(z.answer)+' 🐈</h3><p>'+z.found+' von '+z.total+' haben das Geheimnis gefunden.</p></div></div>';}
function landscape(){return '<svg viewBox="0 0 560 370" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#65c8ed"/><stop offset="1" stop-color="#e0f2fa"/></linearGradient></defs><rect width="560" height="370" fill="url(#sky)"/><circle cx="432" cy="82" r="44" fill="#ffd36c"/><path d="M0 245L123 89 240 242 350 126 560 276V370H0" fill="#6395a0"/><path d="M0 274L152 164 270 291 408 196 560 281V370H0" fill="#326b76"/><path d="M0 301Q190 250 330 306T560 296V370H0" fill="#69ae7b"/><rect x="240" y="239" width="98" height="82" fill="#f3d2a3"/><path d="M223 239L288 192 354 239Z" fill="#995649"/><rect x="279" y="269" width="24" height="52" fill="#755547"/><rect x="311" y="251" width="17" height="19" fill="#7bbce0"/><g transform="translate(314.5 256.2) scale(.33)"><path d="M6 30C6 22 9 17 14 15L13 6 18 11H24L29 6 28 15C33 17 36 22 36 30Z" fill="#2b2b33"/><circle cx="17" cy="20" r="1.6" fill="#ffd36c"/><circle cx="25" cy="20" r="1.6" fill="#ffd36c"/><path d="M36 28Q42 26 40 20" stroke="#2b2b33" stroke-width="2.4" fill="none"/></g><text x="300" y="333" font-size="2.4" fill="#5d4a3a" font-family="sans-serif">psst … gefunden? TOUCH 2026</text><path d="M1 343Q310 308 560 355" stroke="#dbeaa6" stroke-width="6" fill="none"/></svg>';}
function initGesture(){
 const mountPoint=el('fingerMissionMount');
 if(mountPoint&&window.FingerMission){
  fingerMissionInstance=window.FingerMission.mount(mountPoint,{remaining:state?.gestureRemaining??30,disabled:(state?.gestureRemaining??30)<=0});
  return;
 }
 const area=el('gestureBox'),pic=el('gesturePic'),counter=el('gestureValue');
 if(!area)return;gesturePointers=new Map();gestureTransform={x:0,y:0,scale:1,rotate:0};gestureSnapshot=null;
 function update(){pic.style.transform='translate('+gestureTransform.x+'px,'+gestureTransform.y+'px) scale('+gestureTransform.scale+') rotate('+gestureTransform.rotate+'deg)';if(counter)counter.textContent='Zoom: '+Math.round(gestureTransform.scale*100)+' %'+(state?.phase==='zoom'?'':' · Drehung: '+Math.round(gestureTransform.rotate)+'°');}
 function snap(){const a=[...gesturePointers.values()];if(a.length===1)gestureSnapshot={kind:1,origin:a[0],x:gestureTransform.x,y:gestureTransform.y};if(a.length>=2){const dx=a[1].x-a[0].x,dy=a[1].y-a[0].y;gestureSnapshot={kind:2,center:{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2},distance:Math.hypot(dx,dy)||1,angle:Math.atan2(dy,dx),x:gestureTransform.x,y:gestureTransform.y,scale:gestureTransform.scale,rotate:gestureTransform.rotate};}}
 area.onpointerdown=e=>{e.preventDefault();area.setPointerCapture(e.pointerId);gesturePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});snap();};
 area.onpointermove=e=>{if(!gesturePointers.has(e.pointerId))return;e.preventDefault();gesturePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const a=[...gesturePointers.values()],s=gestureSnapshot;if(!s)return;if(a.length===1&&s.kind===1){gestureTransform.x=s.x+a[0].x-s.origin.x;gestureTransform.y=s.y+a[0].y-s.origin.y;}if(a.length>=2&&s.kind===2){const dx=a[1].x-a[0].x,dy=a[1].y-a[0].y;gestureTransform.scale=Math.max(.4,Math.min(state?.phase==='zoom'?9:4.2,s.scale*Math.hypot(dx,dy)/s.distance));gestureTransform.rotate=s.rotate+(Math.atan2(dy,dx)-s.angle)*180/Math.PI;gestureTransform.x=s.x+(a[0].x+a[1].x)/2-s.center.x;gestureTransform.y=s.y+(a[0].y+a[1].y)/2-s.center.y;}update();};
 const end=e=>{gesturePointers.delete(e.pointerId);snap();};area.onpointerup=end;area.onpointercancel=end;el('gestureReset').onclick=()=>{gestureTransform={x:0,y:0,scale:1,rotate:0};snap();update();};update();
}
function showAdmin(){
 const open=!!adminKey;
 wrap(page('Live-Regie','ADMIN · NUR FÜR DICH','Steuere den Film, die Fragen, das Gestenspiel, Untertitel und Abschluss.')+(open?'<div id="adminRoot">'+adminContents()+'</div>':'<section class="card" style="max-width:540px"><h2>Privater Admin-Zugang</h2><form id="unlockAdmin"><label>Admin-Schlüssel</label><input id="adminPassword" type="password" autocomplete="off" required><p></p><button class="primary">Anmelden</button></form></section>'));
 if(!open){el('unlockAdmin').onsubmit=async e=>{e.preventDefault();adminKey=el('adminPassword').value;sessionStorage.setItem('touch_admin_key',adminKey);try{adminInfo=await api('/api/admin-info','GET',undefined,adminKey);showAdmin();}catch(err){alert(err.message);adminKey='';sessionStorage.removeItem('touch_admin_key');}};return;}
 bindAdmin();
}
function adminContents(){const a=adminInfo,student=location.origin+'/join',teacher=ORIGIN+'#teacher',remoteHost=location.origin+'/host?key='+encodeURIComponent(a?.cohostKey||''),tv=a?ORIGIN+'#tv?key='+encodeURIComponent(a.tvKey):'Admin wird verbunden';return '<div class="status" id="adminStatus">Verbindung zur Live-Sitzung wird geprüft …</div><div class="grid2"><div class="stack"><section class="card"><span class="label">01 / LIVE-REGIE</span><h2>Präsentation steuern</h2><div class="control"><button data-action="welcome">Willkommen</button><button class="primary" data-action="start">▶ Film starten</button><button type="button" data-action="reloadPresentation" title="Nur im Willkommen- oder Endbildschirm möglich">⟳ Präsentation neu laden</button><a class="btn mobileRemoteLaunch" href="/control" target="_blank" rel="noopener noreferrer">📱 Handy-Fernbedienung</a><button type="button" data-action="restartVideo" title="Video auf 00:00 setzen und pausieren; Quizpunkte bleiben erhalten">⏮ Video auf Anfang</button><button data-action="pause">Ⅱ Pausieren</button><button data-action="play">▶ Weiter</button><button data-action="gestureStart">🖐️ Finger-Mission starten (30 s)</button><button data-action="gestureEnd">Finger-Mission beenden</button><button data-action="demo">Testquiz starten</button><button data-action="demoNext">Nächste Testfrage</button><button data-action="results">Ergebnisse zeigen</button><button data-action="handout">Handout anzeigen</button><button data-action="end">Abschluss</button><button class="danger" data-action="reset">Zurücksetzen</button></div><label for="filmVolume">Film-Lautstärke (HDMI): <strong id="filmVolumeLabel">100 %</strong></label><input id="filmVolume" type="range" min="0" max="100" step="5" value="100"><label>Filmzeit manuell einstellen (in Sekunden)</label><div class="flex"><input id="seekTime" type="number" min="0" max="3107" value="268" style="max-width:170px"><button id="seekButton">Zur Zeit springen</button></div><p class="notice">Die 17 Quizfragen werden über die Film-Zeitmarken gesteuert. In der fertigen Doku gibt es Zeitfenster von 4:28 bis 46:21.</p></section><section class="card welcomeMusicAdmin"><span class="label">01 / WILLKOMMEN · DIREKT AUF DEM LG</span><h2>♫ Willkommensmusik starten</h2><p class="small">Die eigene TOUCH-LIVE-Melodie wird <strong>direkt auf der LG-Webseite</strong> gespielt, läuft in Dauerschleife und braucht keine Spotify-Anmeldung. Am LG-Fernseher einmal <strong>„♫ LG-Musik starten“</strong> oder <strong>„⛶ Vollbild – OK“</strong> wählen, damit der Ton freigegeben ist.</p><div class="spotifyWelcomeControls"><button type="button" id="musicOnButton" class="primary">♫ LG-Willkommensmusik starten</button><button type="button" id="musicOffButton">⏹ LG-Musik stoppen</button><a class="btn" href="/control" target="_blank" rel="noopener noreferrer">📱 Vom Handy steuern</a></div><p class="small" id="spotifyStatus" role="status">Die LG-Musik ist eine eigene Endlosschleife und keine kurze Spotify-Vorschau.</p><div class="line"></div><span class="label">02 / SPOTIFY · OPTIONAL UND SEPARAT</span><h3>Spotify-Playlists und Spotify Connect</h3><p class="small">Du kannst Playlists suchen und auf unterstützten Spotify-Connect-Geräten abspielen. Der Spotify-Player wird auf dem LG-Browser nicht mehr eingeblendet, weil er dort nur die kurze „Preview“ abgespielt hat. Für vollständige Spotify-Songs nutze Spotify Connect oder die Spotify-App.</p><form id="spotifyForm"><label for="spotifyInput">Spotify-Song oder Playlist-Link</label><div class="flex"><input type="url" id="spotifyInput" placeholder="https://open.spotify.com/playlist/..." autocomplete="url" required><button type="submit">Playlist übernehmen</button></div></form><div id="spotifyAccountPanel" class="spotifyAccountPanel"></div><div class="spotifyPreviewControls"><button type="button" id="spotifyPreviewToggle">▸ Spotify-Playlist hier anzeigen</button><a id="spotifyOpenExternal" target="_blank" rel="noopener noreferrer" href="https://open.spotify.com/">In Spotify öffnen</a></div><div id="spotifyAdminEmbed" class="spotifyAdminEmbed" hidden></div></section><section class="card autoSoundtrackAdmin"><span class="label">ORIGINALMUSIK · AUTOMATISCH</span><h2>🎵 Pausen & Siegerehrung</h2><p class="small">Eigene instrumentale Musik von TOUCH LIVE: ruhiger Sound, wenn du die Dokumentation pausierst, und festliche Musik für die Top-3-Ergebnisse. Beim Abspielen des Films ist die Hintergrundmusik AUS. Spotify bleibt unabhängig für die Musikauswahl vor der Doku.</p><div class="autoSoundtrackSettings"><label class="soundtrackCheck"><input type="checkbox" id="soundPauseEnabled"> Musik bei Filmpause</label><label class="soundtrackCheck"><input type="checkbox" id="soundResultsEnabled"> Siegerehrungs-Musik</label><label for="soundVolume">Musiklautstärke: <strong id="soundVolumeLabel">25 %</strong></label><input id="soundVolume" type="range" min="0" max="60" step="5" value="25"></div><p id="soundtrackStatus" class="small" role="status">Die Musik wird auf dem LG-Fernseher abgespielt. Beim ersten Start einmal mit OK den Ton freigeben.</p></section><section class="card"><span class="label">02 / FILMQUELLE</span><h2>Film auswählen</h2><div class="adminVideoHeader"><label for="videoTitleInput">Titel deiner Dokumentation</label><div class="flex"><input id="videoTitleInput" maxlength="110" placeholder="TOUCHSCREEN – Interaktive Dokumentation"><button id="saveVideoTitle" type="button">Titel speichern</button></div><p class="small" id="titleSaveStatus">Der Titel erscheint in der Filmübersicht und auf dem Beamer.</p><div id="videoNow" class="videoNow">Noch keine Filmquelle ausgewählt.</div><div class="sharedLibraryPanel"><b>Auf PC, Handy, iPad und LG-Fernseher</b><p id="sharedLibraryStatus" role="status" class="small">Prüfe gespeichertes Video und Untertitel …</p><div class="flex"><a class="btn" href="/watch" target="_blank" rel="noopener noreferrer">▶ Video auf iPad/Handy ansehen</a><a class="btn" href="/join" target="_blank" rel="noopener noreferrer">🎮 Schüler-Quiz öffnen</a></div><p class="small">Der Videolink und die Untertitel werden zentral mit allen Geräten geteilt. Für dauerhafte Speicherung trotz Neustart ist Cloud-Speicher erforderlich.</p></div></div><div class="cloudSourceCard"><span class="label">01 / CLOUD-FILMQUELLE</span><h3>Google Drive oder iCloud Drive</h3><p>Probiere zuerst deinen Cloud-Link. Es ist kein zusätzlicher Upload auf TOUCH LIVE nötig. Die Datei muss für „Alle mit dem Link“ freigegeben sein.</p><form id="cloudForm"><label for="cloudProvider">Speicher auswählen</label><select id="cloudProvider"><option value="drive">Google Drive – Videodatei</option><option value="icloud">iCloud Drive – Freigabelink</option></select><label for="cloudUrl">Öffentlicher Freigabelink</label><input type="url" id="cloudUrl" placeholder="https://drive.google.com/file/d/.../view" autocomplete="url" required><div class="flex" style="margin-top:12px"><button class="primary" type="submit">☁ Cloud-Video verwenden</button><button type="button" id="restoreCloud" hidden>Letzten Cloud-Link wiederherstellen</button></div><p class="small" id="cloudSaveStatus" role="status">Google Drive versucht zuerst die MP4 direkt abzuspielen. Falls das nicht geht, erscheint die Google-Drive-Vorschau. iCloud öffnet den freigegebenen Film über Apple.</p></form><div class="cloudSourceWarning"><b>Wichtig für das automatische Quiz:</b> Nur ein direkt abspielbares MP4-Video oder YouTube lässt sich sicher mit den Film-Zeitmarken synchronisieren. Bei Google-Drive-Vorschau und iCloud-Freigabe kann die Synchronisierung eingeschränkt sein. Vor der Schulstunde auf deinem LG-Fernseher testen.</div><p class="small"><a href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener noreferrer">Google Drive öffnen</a> · <a href="https://www.icloud.com/iclouddrive/" target="_blank" rel="noopener noreferrer">iCloud Drive öffnen</a></p></div><div class="line"></div><div class="cloudFallbackCaption"><span class="label">02 / PLAN B</span><h3>YouTube – nicht gelistet</h3></div><form id="youtubeForm"><label for="youtubeInput">YouTube-Video – auch „Nicht gelistet“</label><p class="small">Dein Plan B: Lade den Film einmal bei YouTube als „Nicht gelistet“ hoch. Füge den Link hier ein und alle Geräte können ihn abspielen.</p><input id="youtubeInput" placeholder="https://www.youtube.com/watch?v=..." type="url"><p></p><button class="primary">▶ YouTube-Video übernehmen</button> <button type="button" id="restoreYoutube" hidden>Letzten Link wiederherstellen</button><p id="youtubeSaveStatus" class="small">Bei einem Server-Neustart kannst du den zuletzt verwendeten Link auf diesem Gerät wiederherstellen.</p><p class="small"><a href="https://studio.youtube.com/" target="_blank" rel="noopener noreferrer">Video in YouTube Studio hochladen</a> · Sichtbarkeit dort auf „Nicht gelistet“ stellen.</p></form><div class="line"></div><form id="mp4Form"><label>Direkter MP4-Link (HTTPS)</label><input id="mp4Input" placeholder="https://.../touchscreen.mp4" type="url"><p></p><button>MP4-Link verwenden</button></form><div class="line"></div><div class="directUpload"><span class="label">KOSTENLOS · LOKALE MP4 ÜBER HDMI</span><h3>Film vom Windows-PC abspielen – kein Upload</h3><p>Verbinde deinen Windows-PC per HDMI mit dem Fernseher, öffne dort den Beamerlink und wähle <b>die 3,03-GB-MP4 direkt vom PC</b>. Nur dieser PC lädt das Video von der eigenen Festplatte. Schüler und Lehrer bleiben online mit Quiz, Zoom-Spiel und Handout verbunden.</p><button id="useLocalHdmi" type="button" class="primary">🖥️ Lokale MP4 / HDMI aktivieren</button><p id="localMediaAdminStatus" class="small" role="status">Erst Modus aktivieren, dann MP4 am Beamer-PC auswählen und dort den Ton freigeben.</p><p class="small">Admin-Steuerung: Film starten, pausieren, fortsetzen, spulen und Lautstärke ändern. Wenn der Beamer-Browser neu geladen wird, musst du die lokale Datei aus Sicherheitsgründen erneut auswählen.</p></div><div class="directUpload twoCitiesRemoteAdmin"><span class="label">ZUSAMMEN SCHAUEN · ZWEI STÄDTE</span><h3>Online-Film für die andere Stadt</h3><p><a class="btn primary" href="'+esc(remoteHost)+'" target="_blank" rel="noopener noreferrer">📁 Film aus meinen Dateien hochladen und auf meinem Gerät gemeinsam starten</a></p><p>Der private Regie-Link öffnet die Datei-Auswahl, den Upload-Fortschritt und den gemeinsamen Startknopf. Ohne Cloud-Speicher bleibt der Upload deaktiviert.</p><p>Die MP4 auf deinem Windows-PC bleibt lokal über HDMI. Andere Städte brauchen einen <b>separaten Online-Videolink zur identischen Dokumentation</b> (z. B. YouTube „Nicht gelistet“). Beide sehen dieselben Quizfragen, das Zoom-Spiel und die Ergebnisse zur gleichen Filmzeit.</p><form id="remoteVideoForm"><label for="remoteVideoInput">YouTube-Link oder direkte HTTPS-MP4 für entfernte Zuschauer</label><div class="flex"><input id="remoteVideoInput" type="url" placeholder="https://www.youtube.com/watch?v=..." required><button class="primary" type="submit">Online-Film speichern</button></div></form><div class="flex" style="margin-top:12px"><a class="btn" href="/watch" target="_blank" rel="noopener noreferrer">Zuschaueransicht testen</a><a class="btn" href="'+esc(remoteHost)+'" target="_blank" rel="noopener noreferrer">Eigene Regie &amp; Quiz öffnen</a><button type="button" id="remoteVideoClear">Online-Film entfernen</button></div><p id="remoteVideoStatus" class="small" role="status">Noch kein separater Online-Film eingestellt.</p><p class="small">Auf einem Handy/iPad wechselt die Zuschaueransicht automatisch zum Quiz und danach zum Film. Für zwei Geräte läuft der Film auf /watch und das Quiz auf /join. <b>Keine automatische Übertragung deiner lokalen Festplatte ins Internet.</b></p></div><div class="directUpload"><span class="label">MP4 DIREKT AUF TOUCH LIVE</span><h3>Video nur einmal hochladen</h3><p class="small">Für deinen ca. 3,03-GB-Film benötigst du einen verbundenen Cloud-Speicher. Ohne Speicher wird hier kein erfolgloser Upload gestartet.</p><div class="cloudStorageStatus" id="cloudStorageState" aria-live="polite">Speicher wird geprüft …</div><label for="bigFile">MP4-Datei auswählen (bis 10 GB)</label><input type="file" id="bigFile" accept=".mp4,video/mp4" disabled><div class="flex" style="margin-top:10px"><button id="uploadButton" type="button" class="primary" disabled>MP4 hochladen</button><button id="useStoredVideo" type="button" disabled>Gespeicherten Film verwenden</button></div><p id="uploadInfo" class="small" role="status"></p><div class="cloudHelp" id="cloudHelp"><b>Cloud-Speicher noch nicht verbunden?</b><p>Cloudflare R2 kann für einen Film dieser Größe innerhalb des monatlichen Gratis-Kontingents liegen. Du musst den Bucket einmalig mit Render verbinden.</p><div class="flex"><a href="https://dash.cloudflare.com/" class="btn" target="_blank" rel="noopener noreferrer">Cloudflare R2 öffnen</a><a href="https://dashboard.render.com/web/srv-dbn0f7ei0phs73d16p20" class="btn" target="_blank" rel="noopener noreferrer">Render-Einstellungen</a><a href="https://github.com/Marlonobo/Marlonobo/blob/main/touch-live-sync-v4/SPEICHER_EINRICHTEN.md" class="btn" target="_blank" rel="noopener noreferrer">Einrichtung lesen</a></div></div></div></section></div><div class="stack"><section class="card"><span class="label">03 / LINKS FÜR ALLE GERÄTE</span><h2>Deine vier Ansichten</h2><b>Beamer / LG-Fernseher</b><div class="linkbox" id="tvLink">'+esc(tv)+'</div><button id="copyTv">Beamerlink kopieren</button><div class="line"></div><b>Schüler – iPad</b><div class="linkbox" id="studentLink">'+esc(student)+'</div><button id="copyStudent">Schülerlink kopieren</button><div class="line"></div><b>Lehrer – iPad (mit Notizen)</b><div class="linkbox" id="teacherLink">'+esc(teacher)+'</div><button id="copyTeacher">Lehrerlink kopieren</button><p class="small">Der Admin-Link bleibt privat. Gib nur die Schüler- und Lehrerlinks weiter.</p></section><section class="card"><span class="label">04 / UNTERTITEL</span><h2>Untertitel an oder aus</h2><div class="subtitleQuick"><button type="button" id="subtitleQuickToggle" class="subtitleToggle" aria-pressed="true">Untertitel: AN</button><div><b>Untertitel für Beamer, Handy und iPad</b><p class="small">Schalte die hochgeladenen SRT/VTT-Untertitel jederzeit ein oder aus. Weiße Schrift ohne schwarzen Balken.</p></div></div><div class="subtitleFileStatus" id="subtitleFileStatus" role="status">Prüfe, ob eine Untertiteldatei geladen ist …</div><label>Untertitel-Datei hochladen (.vtt oder .srt)</label><input type="file" id="subtitleFile" accept=".vtt,.srt,text/vtt,text/plain"><p></p><button id="uploadVtt">Untertitel speichern</button><label>Untertitel um Sekunden verschieben</label><div class="flex"><input id="subOffset" type="number" step=".5" value="'+(state?.subtitleOffset||0)+'" style="max-width:130px"><button id="saveSubOffset">Speichern</button></div><label>Quiz-Zeitmarken korrigieren (Sekunden)</label><div class="flex"><input id="quizOffset" type="number" step=".5" value="'+(state?.quizOffset||0)+'" style="max-width:130px"><button id="saveQuizOffset">Speichern</button></div><p class="small">Vorhandene VTT-Zeitcodes laufen mit dem Film mit. Vollautomatische Spracherkennung und Übersetzung benötigen einen separaten Dienst.</p></section><section class="card"><span class="label">05 / ERGEBNISSE</span><h2>Teilnahme & Übersicht</h2><div class="between"><span id="adminParticipants">0 Teilnehmende</span><span id="adminTime">00:00</span></div><div id="adminRanking" class="small">Ergebnisse erscheinen nach dem Quiz.</div><div class="adminPlayersPanel"><div class="between"><h3>👥 Teilnehmer verwalten</h3><button type="button" id="adminPlayersRefresh">↻ Aktualisieren</button></div><p class="small">Nur hier in deiner privaten Regie: Namen ändern, Personen entfernen oder Punkte und Antworten zurücksetzen. Der Film bleibt dabei unberührt.</p><div id="adminPlayersStatus" class="small" role="status">Lade Teilnehmer …</div><div id="adminPlayers" class="adminPlayersList" aria-live="polite"></div><div class="adminRosterBulk"><button type="button" id="adminPlayersResetAll">↺ Punkte & Antworten aller zurücksetzen</button><button type="button" id="adminPlayersClearAll" class="danger">Alle Teilnehmer entfernen</button></div></div><p class="small">Feedbackbögen wurden eingereicht: <span id="adminFeedback">0</span></p></section></div></div>';}
async function refreshAdminPlayers(){
 const box=el('adminPlayers'),status=el('adminPlayersStatus');
 if(role!=='admin'||!adminKey||!box)return;
 try{
  const result=await api('/api/host/participants','GET',undefined,adminKey);
  const players=result.players||[];
  if(status)status.textContent=players.length+' Teilnehmer · '+players.filter(p=>p.online).length+' online · nur für Admin sichtbar';
  box.innerHTML=players.length?'<div class="adminPlayersScroll"><table class="adminPlayersTable"><thead><tr><th>Name</th><th>Richtig</th><th>Falsch</th><th>Punkte</th><th>Verwaltung</th></tr></thead><tbody>'+
   players.map(p=>'<tr><td><strong>'+esc(p.name)+'</strong><span class="adminOnlineMarker '+(p.online?'online':'')+'">'+(p.online?'● online':'○ offline')+'</span></td><td>'+p.correct+'</td><td>'+p.wrong+'</td><td><strong>'+p.score+'</strong></td><td><div class="adminPlayerButtons"><button type="button" data-player-action="rename" data-player-id="'+p.id+'" data-player-name="'+esc(p.name)+'">Name ändern</button><button type="button" data-player-action="reset" data-player-id="'+p.id+'" data-player-name="'+esc(p.name)+'">↺ Zurücksetzen</button><button type="button" data-player-action="delete" data-player-id="'+p.id+'" data-player-name="'+esc(p.name)+'" class="danger">Entfernen</button></div></td></tr>').join('')+'</tbody></table></div>':
   '<p class="small">Noch niemand angemeldet. Schicke den Schülern den /join-Link.</p>';
 }catch(e){if(status)status.textContent='Teilnehmerliste konnte nicht geladen werden: '+e.message;}
}
async function manageAdminPlayer(action,id,name){
 if(action==='rename'){
  const next=prompt('Neuer Name für '+name+':',name);
  if(next===null)return;
  name=next.trim();
  if(name.length<2||name.length>26)return alert('Name muss 2–26 Zeichen lang sein.');
 }else{
  const question=action==='reset'?'Punkte, Antworten und Joker von '+name+' zurücksetzen?':
   action==='delete'?name+' wirklich aus dieser Sitzung entfernen?':
   action==='resetAll'?'Alle Punkte, Antworten und Joker zurücksetzen? Namen bleiben bestehen.':
   'Alle Teilnehmer aus dieser Sitzung entfernen? Das kann nicht rückgängig gemacht werden.';
  if(!confirm(question))return;
  if(action==='clearAll'&&!confirm('Sicher? Wirklich ALLE Teilnehmer entfernen?'))return;
 }
 try{
  await api('/api/host/participants/manage','POST',{action,id,name},adminKey);
  await refreshAdminPlayers();
  adminInfo=await api('/api/admin-info','GET',undefined,adminKey);
  renderAdminAnswers();
 }catch(e){alert('Teilnehmerverwaltung: '+e.message);}
}
function bindAdmin(){
 const table=el('adminPlayers');
 if(table)table.onclick=e=>{const btn=e.target.closest?.('[data-player-action]');if(!btn)return;manageAdminPlayer(btn.dataset.playerAction,btn.dataset.playerId,btn.dataset.playerName);};
 const refresh=el('adminPlayersRefresh');if(refresh)refresh.onclick=()=>refreshAdminPlayers();
 const allReset=el('adminPlayersResetAll');if(allReset)allReset.onclick=()=>manageAdminPlayer('resetAll','','');
 const clearAll=el('adminPlayersClearAll');if(clearAll)clearAll.onclick=()=>manageAdminPlayer('clearAll','','');
 refreshAdminPlayers();
 if(window.SpotifyConnect){
  window.SpotifyConnect.mount(el('spotifyAccountPanel'),{onSelect:async url=>{
   await api('/api/admin','POST',{cmd:'spotifySet',url},adminKey);
   const input=el('spotifyInput');if(input)input.value=url;
   await poll(true);
   spotifyPreviewShown=true;renderSpotifyAdminPreview();
  }});
 }
 const preview=el('spotifyPreviewToggle');
 if(preview)preview.onclick=()=>{
  spotifyPreviewShown=!spotifyPreviewShown;
  renderSpotifyAdminPreview();
 };
 const music=state?.welcomeMusic||{};
 if(el('spotifyInput'))el('spotifyInput').value=music.url||'';
 el('spotifyForm').onsubmit=async e=>{
  e.preventDefault();const url=el('spotifyInput').value.trim(),note=el('spotifyStatus');
  try{await api('/api/admin','POST',{cmd:'spotifySet',url},adminKey);note.textContent='✓ Spotify-Link gespeichert. Handy und Fernseher verwenden dieselbe Musik.';await poll(true);}
  catch(err){note.textContent='Spotify-Link nicht übernommen: '+err.message;}
 };
 const remoteForm=el('remoteVideoForm'),remoteInput=el('remoteVideoInput'),remoteClear=el('remoteVideoClear');
 if(remoteForm)remoteForm.onsubmit=async event=>{
  event.preventDefault();
  const value=remoteInput?.value.trim();if(!value)return;
  try{
   const hostname=new URL(value).hostname.toLowerCase();
   const yt=['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtu.be','www.youtube-nocookie.com'].includes(hostname);
   await api('/api/admin','POST',{cmd:yt?'remoteVideoYoutube':'remoteVideoLink',url:value},adminKey);
   await poll(true);
  }catch(e){const node=el('remoteVideoStatus');if(node)node.textContent='Online-Film konnte nicht übernommen werden: '+e.message;}
 };
 if(remoteClear)remoteClear.onclick=async()=>{
  if(!confirm('Online-Film für die andere Stadt entfernen? Der lokale HDMI-Film bleibt erhalten.'))return;
  await adminAction('remoteVideoClear');
 };
 const hdmi=el('useLocalHdmi');
  if(hdmi)hdmi.onclick=()=>adminAction('videoLocal');
  const filmVol=el('filmVolume');
  if(filmVol){filmVol.oninput=()=>{const x=el('filmVolumeLabel');if(x)x.textContent=filmVol.value+' %';};
   filmVol.onchange=()=>adminAction('filmVolume',{value:Number(filmVol.value)/100});}
  el('musicOnButton').onclick=()=>adminAction('musicOn');
 el('musicOffButton').onclick=()=>adminAction('musicOff');
 for(const [inputId,field] of [['soundPauseEnabled','pause'],['soundResultsEnabled','results']]){
  const input=el(inputId);if(!input)continue;
  input.onchange=async()=>{
   try{await api('/api/admin','POST',{cmd:'soundtrackSet',field,value:input.checked},adminKey);await poll(true);}
   catch(err){alert('Musik konnte nicht eingestellt werden: '+err.message);}
  };
 }
 const volume=el('soundVolume');
 if(volume){
  volume.oninput=()=>{const label=el('soundVolumeLabel');if(label)label.textContent=volume.value+' %';};
  volume.onchange=async()=>{
   try{await api('/api/admin','POST',{cmd:'soundtrackSet',field:'volume',value:Number(volume.value)/100},adminKey);await poll(true);}
   catch(err){alert('Lautstärke konnte nicht eingestellt werden: '+err.message);}
  };
 }
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{let cmd=b.dataset.action;if(cmd==='reloadPresentation'&&!confirm('Fernseher jetzt neu laden? Nur vor oder nach dem Film möglich.'))return;if(cmd==='restartVideo'&&!confirm('Film auf 00:00 zurücksetzen und pausieren? Die bisherigen Quizpunkte bleiben erhalten.'))return;if(cmd==='reset'&&!confirm('Quizantworten und Punkte zurücksetzen? Das Video, der Titel und die Untertitel bleiben erhalten.'))return;await adminAction(cmd);});
 el('seekButton').onclick=()=>adminAction('seek',{time:Number(el('seekTime').value)});
 const restartAdmin=document.querySelector('[data-action="restartVideo"]');if(restartAdmin)restartAdmin.addEventListener('click',()=>{const t=el('seekTime');if(t)t.value='0';});
 const savedSource=(()=>{try{return JSON.parse(localStorage.getItem('touch_last_video_source')||'null');}catch{return null;}})();
 el('videoTitleInput').value=state?.videoTitle||savedSource?.title||'TOUCHSCREEN – Interaktive Dokumentation';
 if(state?.video?.type==='youtube')el('youtubeInput').value=state.video.url;
 else if(savedSource?.url)el('youtubeInput').value=savedSource.url;
 if(savedSource?.url)el('restoreYoutube').hidden=false;
 el('saveVideoTitle').onclick=async()=>{
  const title=el('videoTitleInput').value.trim();
  if(title.length<3||title.length>110)return el('titleSaveStatus').textContent='Titel muss 3–110 Zeichen haben.';
  try{await api('/api/admin','POST',{cmd:'videoTitle',value:title},adminKey);
   const old=(()=>{try{return JSON.parse(localStorage.getItem('touch_last_video_source')||'null')||{};}catch{return {};}})();
   localStorage.setItem('touch_last_video_source',JSON.stringify({...old,title}));
   el('titleSaveStatus').textContent='✓ Titel gespeichert.';await poll(true);
  }catch(e){el('titleSaveStatus').textContent='Fehler: '+e.message;}
 };
 const cachedCloud=(()=>{try{return JSON.parse(localStorage.getItem('touch_last_cloud_source')||'null');}catch{return null;}})();
 if(state?.video?.type==='drive'||state?.video?.type==='icloud'){el('cloudProvider').value=state.video.type==='drive'?'drive':'icloud';el('cloudUrl').value=state.video.shareUrl||'';}
 else if(cachedCloud){el('cloudProvider').value=cachedCloud.provider||'drive';el('cloudUrl').value=cachedCloud.url||'';}
 if(cachedCloud?.url)el('restoreCloud').hidden=false;
 const cloudHint=()=>{
  const input=el('cloudUrl'),hint=el('cloudSaveStatus');if(!input||!hint)return;
  const icloud=el('cloudProvider').value==='icloud';
  input.placeholder=icloud?'https://www.icloud.com/iclouddrive/...':'https://drive.google.com/file/d/.../view';
  if(!input.value)hint.textContent=icloud?'iCloud-Freigabelink öffnet Apples Dateiansicht. Er ist normalerweise kein direkt steuerbarer Videostream.':'Drive: „Freigeben → Allgemeiner Zugriff → Jeder mit dem Link → Betrachter“. Dann Link kopieren.';
 };
 el('cloudProvider').onchange=cloudHint;cloudHint();
 el('cloudForm').onsubmit=async e=>{
  e.preventDefault();const provider=el('cloudProvider').value,url=el('cloudUrl').value.trim(),msg=el('cloudSaveStatus');
  msg.textContent='Cloud-Link wird übernommen …';
  try{
   await api('/api/admin','POST',{cmd:'videoCloud',provider,url},adminKey);
   localStorage.setItem('touch_last_cloud_source',JSON.stringify({provider,url}));rememberMediaSource('videoCloud',{provider,url});
   el('restoreCloud').hidden=false;
   msg.textContent=provider==='drive'?'✓ Drive-Videodatei verbunden. Prüfe die Wiedergabe am LG-TV. Falls der Direktstream scheitert, wird die Drive-Vorschau angezeigt.':'✓ iCloud-Freigabe hinterlegt. Du kannst die Datei auf dem Fernseher öffnen; ein synchron steuerbarer Stream ist damit nicht garantiert.';
   await poll(true);
  }catch(err){msg.textContent='Cloud-Quelle nicht übernommen: '+err.message;}
 };
 el('restoreCloud').onclick=async()=>{
  const prev=(()=>{try{return JSON.parse(localStorage.getItem('touch_last_cloud_source')||'null');}catch{return null;}})();
  if(!prev?.url)return;
  el('cloudProvider').value=prev.provider||'drive';el('cloudUrl').value=prev.url;
  try{await api('/api/admin','POST',{cmd:'videoCloud',provider:prev.provider,url:prev.url},adminKey);rememberMediaSource('videoCloud',{provider:prev.provider,url:prev.url});el('cloudSaveStatus').textContent='✓ Letzte Cloud-Quelle wiederhergestellt.';await poll(true);}catch(e){el('cloudSaveStatus').textContent='Wiederherstellen fehlgeschlagen: '+e.message;}
 };
 el('youtubeForm').onsubmit=async e=>{
  e.preventDefault();const url=el('youtubeInput').value.trim(),title=el('videoTitleInput').value.trim();
  if(title.length<3||title.length>110)return el('youtubeSaveStatus').textContent='Bitte zuerst einen Titel eingeben.';
  try{
   await api('/api/admin','POST',{cmd:'videoTitle',value:title},adminKey);
   await api('/api/admin','POST',{cmd:'videoYoutube',url},adminKey);
   localStorage.setItem('touch_last_video_source',JSON.stringify({url,title,type:'youtube'}));rememberMediaSource('videoYoutube',{url});
   el('restoreYoutube').hidden=false;
   el('youtubeSaveStatus').textContent='✓ YouTube-Link eingebunden und auf diesem Gerät für eine Wiederherstellung gemerkt.';
   await poll(true);
  }catch(err){el('youtubeSaveStatus').textContent='Video nicht übernommen: '+err.message;}
 };
 el('restoreYoutube').onclick=async()=>{
  const x=(()=>{try{return JSON.parse(localStorage.getItem('touch_last_video_source')||'null');}catch{return null;}})();
  if(!x?.url)return alert('Kein gespeicherter YouTube-Link auf diesem Gerät.');
  el('youtubeInput').value=x.url;if(x.title)el('videoTitleInput').value=x.title;
  try{
   await api('/api/admin','POST',{cmd:'videoYoutube',url:x.url},adminKey);
   if(x.title)await api('/api/admin','POST',{cmd:'videoTitle',value:x.title},adminKey);
   rememberMediaSource('videoYoutube',{url:x.url});el('youtubeSaveStatus').textContent='✓ Der letzte YouTube-Link wurde wiederhergestellt.';await poll(true);
  }catch(err){el('youtubeSaveStatus').textContent='Wiederherstellung fehlgeschlagen: '+err.message;}
 };
 el('subtitleQuickToggle').onclick=async()=>{
  const btn=el('subtitleQuickToggle'),next=state?.subtitles===false;btn.disabled=true;
  try{await api('/api/admin','POST',{cmd:'subtitles',value:next},adminKey);await poll(true);}
  catch(err){alert('Untertitel konnten nicht umgeschaltet werden: '+err.message);}
  finally{btn.disabled=false;}
 };
 el('mp4Form').onsubmit=async e=>{
  e.preventDefault();const url=el('mp4Input').value.trim();
  try{await api('/api/admin','POST',{cmd:'videoLink',url},adminKey);rememberMediaSource('videoLink',{url});await poll(true);}
  catch(err){alert('MP4-Link nicht gespeichert: '+err.message);}
 };
 el('copyTv').onclick=()=>copy(ORIGIN+'#tv?key='+encodeURIComponent(adminInfo?.tvKey||''));
 el('copyStudent').onclick=()=>copy(location.origin+'/join');
 el('copyTeacher').onclick=()=>copy(ORIGIN+'#teacher');
 el('saveSubOffset').onclick=()=>adminAction('captionOffset',{value:Number(el('subOffset').value)});
 el('saveQuizOffset').onclick=()=>adminAction('quizOffset',{value:Number(el('quizOffset').value)});
 el('uploadVtt').onclick=async()=>{try{const f=el('subtitleFile').files[0];if(!f)throw Error('Bitte zuerst .vtt oder .srt auswählen.');const raw=await f.text();const result=await api('/api/vtt','POST',{vtt:raw,name:f.name},adminKey);const browserCopy=rememberCaptions(raw,f.name);alert(result.durable?'Untertitel dauerhaft gespeichert – auf allen Geräten verfügbar.':browserCopy?'Untertitel sind auf allen Geräten verfügbar. Dein Computer hält eine Wiederherstellungskopie für den Fall eines Serverneustarts bereit.':'Untertitel sind auf allen Geräten verfügbar. Ohne Cloud-Speicher können sie bei einem Neustart verloren gehen.');await poll(true);}catch(e){alert(e.message);}};
 el('uploadButton').onclick=uploadFilm;
 el('useStoredVideo').onclick=()=>adminAction('videoStored');
 const stylePanel=document.createElement('div');stylePanel.className='captionSettings';stylePanel.innerHTML='<div class="line"></div><span class="label">NETFLIX-STIL</span><h3>Untertitel ohne schwarzen Hintergrund</h3><p class="small">Deine eigenen Untertitel schaltest du über den Knopf oben ein und aus.</p><label>Schriftgröße (70–160 %)</label><div class="flex"><input id="captionSize" type="range" min="70" max="160" step="5" value="100" style="max-width:240px"><span id="captionSizeValue">100 %</span><button id="captionSizeSave">Übernehmen</button></div><label>Abstand vom unteren Bildrand (5–25 %)</label><div class="flex"><input id="captionPosition" type="range" min="5" max="25" step="1" value="11" style="max-width:240px"><span id="captionPositionValue">11 %</span><button id="captionPositionSave">Übernehmen</button></div><p class="small">Weiße Schrift mit feiner dunkler Kontur – ohne schwarzen Balken, wie bei Streamingdiensten.</p>';
 el('uploadVtt').parentElement.appendChild(stylePanel);
 const setValues=()=>{el('captionSize').value=state?.captionSize||100;el('captionPosition').value=state?.captionPosition||11;el('captionSizeValue').textContent=el('captionSize').value+' %';el('captionPositionValue').textContent=el('captionPosition').value+' %';};setValues();
 el('captionSize').oninput=()=>el('captionSizeValue').textContent=el('captionSize').value+' %';el('captionPosition').oninput=()=>el('captionPositionValue').textContent=el('captionPosition').value+' %';el('captionSizeSave').onclick=()=>adminAction('captionSize',{value:Number(el('captionSize').value)});el('captionPositionSave').onclick=()=>adminAction('captionPosition',{value:Number(el('captionPosition').value)});
 api('/api/storage/status').then(x=>{
  const n=el('cloudStorageState'),up=el('uploadButton'),file=el('bigFile'),saved=el('useStoredVideo'),help=el('cloudHelp');
  cloudUploadReady=!!x.configured;
  up.disabled=!cloudUploadReady;file.disabled=!cloudUploadReady;saved.disabled=!(cloudUploadReady&&x.videoReady);
  if(help)help.hidden=cloudUploadReady;
  if(n){
    n.classList.toggle('is-ready',cloudUploadReady);
    n.textContent=cloudUploadReady?(x.videoReady?'✓ Cloud-Speicher verbunden. Du hast einen dauerhaft gespeicherten Film.':'✓ Cloud-Speicher verbunden. Du kannst deine MP4 jetzt einmalig hochladen.'):'MP4-Upload momentan nicht möglich: Es fehlt der Cloud-Speicher. Du kannst sofort YouTube „Nicht gelistet“ benutzen oder einmalig Cloudflare R2 verbinden.';
  }
 }).catch(e=>{
  cloudUploadReady=false;
  el('uploadButton').disabled=true;el('bigFile').disabled=true;el('useStoredVideo').disabled=true;
  const n=el('cloudStorageState');if(n)n.textContent='Speicherprüfung fehlgeschlagen: '+e.message+'. YouTube kannst du weiterhin nutzen.';
 });
 const cohost=adminInfo?.cohostKey;
 if(cohost){const panel=document.createElement('section');panel.className='card';panel.style.marginTop='18px';panel.innerHTML='<span class="label">ZWEITES GERÄT · CO-MODERATION</span><h2>Mit deiner Freundin gemeinsam steuern</h2><p>Dieser Link steuert die Sendung (Start, Pause, Ergebnisse), aber nicht die privaten Admin-Einstellungen.</p><div class="linkbox" id="friendLink"></div><button id="copyFriend">Mitsteuer-Link kopieren</button><p class="small">Privat weitergeben: Wer diesen Link besitzt, kann den Live-Ablauf steuern.</p>';el('adminRoot').appendChild(panel);const link=location.origin+'/host?key='+encodeURIComponent(cohost);el('friendLink').textContent=link;el('copyFriend').onclick=()=>copy(link);}
 const zc=document.createElement('section');zc.className='card';zc.style.marginTop='18px';
 zc.innerHTML='<span class="label">KAPITEL 4 / ZOOM-AUFGABE</span><h2>Zoom-Spiel im Quiz</h2><p>Startet automatisch bei 22:18 und dauert genau 30 Sekunden (bis 22:48). Die Mission: 200 % zoomen, das Bild zur Berghütte verschieben und die Katze im Dachfenster antippen. Der Film läuft dabei ohne Pause und ohne Sprung weiter. Alle folgenden Quiz-Zeitmarken bleiben erhalten.</p><div class="control"><button id="zoomGo" class="primary">Zoom-Aufgabe jetzt starten</button><button id="zoomStop">Weiter mit dem Film</button></div>';
 el('adminRoot').appendChild(zc);el('zoomGo').onclick=()=>adminAction('zoomStart');el('zoomStop').onclick=()=>adminAction('zoomEnd');
 const at=document.createElement('section');at.className='card';at.style.marginTop='18px';
 at.innerHTML='<span class="label">NUR FÜR DICH</span><h2>Antworten der Teilnehmenden</h2><p class="small">Lösungen, Punkte und Joker sieht nur der Admin. Aktualisiert sich alle 4 Sekunden.</p><div id="adminAnswers" style="overflow-x:auto"></div>';
 el('adminRoot').appendChild(at);renderAdminAnswers();clearInterval(window.__aaT);window.__aaT=setInterval(async()=>{if(role!=='admin')return;try{adminInfo=await api('/api/admin-info','GET',undefined,adminKey);renderAdminAnswers();await refreshAdminPlayers();}catch{}},4000);
 const timeline=document.createElement('section');timeline.className='card';timeline.style.marginTop='18px';
 timeline.innerHTML='<span class="label">06 / TIMELINE</span><h2>Quizfragen bearbeiten</h2><p>Fragetext, Antworten, Start- und Endzeit lassen sich hier als JSON anpassen.</p><textarea id="timelineJson" rows="9"></textarea><button id="timelineSave" class="primary">Fragen speichern</button><p id="timelineResult" class="small"></p>';
 el('adminRoot').appendChild(timeline);
 el('timelineJson').value=JSON.stringify(adminInfo?.questions||[],null,2);
 el('timelineSave').onclick=async()=>{try{const questions=JSON.parse(el('timelineJson').value);const r=await api('/api/questions','POST',{questions},adminKey);el('timelineResult').textContent=r.count+' Fragen gespeichert.';}catch(e){el('timelineResult').textContent='Fehler: '+e.message;}};

}
// Browser fallback for media links and caption text, synced to server when admin returns.
// The server shares the currently selected media to every connected device; R2 makes it restart-safe.
const MEDIA_BACKUP_KEY='touch_active_video_source';
const CAPTIONS_BACKUP_KEY='touch_last_uploaded_captions';
function rememberMediaSource(cmd,params){
 try{localStorage.setItem(MEDIA_BACKUP_KEY,JSON.stringify({cmd,params,savedAt:Date.now()}));}catch{}
}
function rememberCaptions(vtt,name){
 try{localStorage.setItem(CAPTIONS_BACKUP_KEY,JSON.stringify({vtt,name,savedAt:Date.now()}));return true;}catch{return false;}
}
async function recoverSharedMedia(){
 if(libraryRecoveryStarted||!adminKey||role!=='admin')return;
 libraryRecoveryStarted=true;
 const info=el('sharedLibraryStatus');
 try{
  const current=await api('/api/state');
  const storage=await api('/api/storage/status');
  let restored=[];
  if(current.video?.type==='none'){
   let backup=null;
   try{backup=JSON.parse(localStorage.getItem(MEDIA_BACKUP_KEY)||'null');}catch{}
   if(!backup){
    try{const cloud=JSON.parse(localStorage.getItem('touch_last_cloud_source')||'null');if(cloud?.url)backup={cmd:'videoCloud',params:{provider:cloud.provider,url:cloud.url}};}catch{}
   }
   if(!backup){
    try{const yt=JSON.parse(localStorage.getItem('touch_last_video_source')||'null');if(yt?.url)backup={cmd:'videoYoutube',params:{url:yt.url}};}catch{}
   }
   if(['videoYoutube','videoCloud','videoLink'].includes(backup?.cmd)&&backup.params){
    try{
     await api('/api/admin','POST',{cmd:backup.cmd,...backup.params},adminKey);
     restored.push('Videolink');
    }catch(e){if(info)info.textContent='Letzter Videolink konnte nicht wiederhergestellt werden: '+e.message;}
   }
  }
  if(!current.captionsAvailable){
   let backup=null;try{backup=JSON.parse(localStorage.getItem(CAPTIONS_BACKUP_KEY)||'null');}catch{}
   if(typeof backup?.vtt==='string'&&backup.vtt.length&&backup.vtt.length<1700000){
    try{
     await api('/api/vtt','POST',{vtt:backup.vtt,name:backup.name||'untertitel.vtt'},adminKey);
     restored.push('Untertitel');
    }catch(e){if(info)info.textContent='Untertitel-Wiederherstellung fehlgeschlagen: '+e.message;}
   }
  }
  const latest=restored.length?await api('/api/state'):current;
  if(info){
   const videoOn=latest.video?.type!=='none',capsOn=!!latest.captionsAvailable;
   info.textContent=(restored.length?'Automatisch wiederhergestellt: '+restored.join(' und ')+'. ':'')+
    'Auf allen Geräten: '+(videoOn?'Videoquelle aktiv':'noch kein Video')+' · '+(capsOn?'Untertitel verfügbar':'keine Untertitel')+
    (storage.configured?' · Neustart-sicher über Cloud-Speicher.':' · Auf Render nur vorübergehend gespeichert; der Admin-PC hat eine lokale Wiederherstellungskopie.');
  }
  if(restored.length)await poll(true);
 }catch(e){if(info)info.textContent='Medienstatus konnte nicht abgerufen werden: '+e.message;}
}

let spotifyPreviewShown=false,spotifyPreviewRef='';
function renderSpotifyAdminPreview(){
 const box=el('spotifyAdminEmbed'),button=el('spotifyPreviewToggle'),link=el('spotifyOpenExternal');
 if(!box)return;
 const music=state?.welcomeMusic||{};
 const valid=['track','playlist','album'].includes(music.type)&&/^[A-Za-z0-9]{22}$/.test(music.id||'');
 if(link){link.hidden=!valid;if(valid)link.href='https://open.spotify.com/'+music.type+'/'+music.id;}
 if(button)button.textContent=spotifyPreviewShown?'▾ Spotify-Playlist ausblenden':'▸ Spotify-Playlist hier anzeigen';
 if(!spotifyPreviewShown||!valid){box.hidden=true;box.replaceChildren();spotifyPreviewRef='';return;}
 box.hidden=false;
 const ref=music.type+':'+music.id;
 if(spotifyPreviewRef===ref&&box.querySelector('iframe'))return;
 spotifyPreviewRef=ref;box.replaceChildren();
 const frame=document.createElement('iframe');
 frame.src='https://open.spotify.com/embed/'+music.type+'/'+music.id;
 frame.title='Spotify-Playlist – eigene Steuerung mit Play und Pause';
 frame.width='100%';frame.height=music.type==='track'?'152':'352';
 frame.loading='lazy';frame.setAttribute('allow','autoplay; encrypted-media; fullscreen');
 frame.referrerPolicy='strict-origin-when-cross-origin';
 box.appendChild(frame);
}
function refreshAdminVideoControls(){
 if(!state||role!=='admin')return;
 const btn=el('subtitleQuickToggle');
 if(btn){const on=state.subtitles!==false;btn.textContent=on?'Untertitel: AN':'Untertitel: AUS';btn.classList.toggle('is-on',on);btn.classList.toggle('is-off',!on);btn.setAttribute('aria-pressed',String(on));}
 const capStatus=el('subtitleFileStatus');if(capStatus){
  const loaded=!!state.captionsAvailable;
  capStatus.classList.toggle('ready',loaded);
  capStatus.textContent=loaded?(state.subtitles===false?'✓ Untertiteldatei ist gespeichert – Untertitel sind momentan AUS.':'✓ Untertiteldatei ist gespeichert und auf LG-TV, PC und Online-Zuschauern aktiviert.'):
   '⚠️ Noch keine SRT-/VTT-Datei geladen. Der AN-Schalter allein erzeugt keine Untertitel. Lade zuerst deine Untertitel hoch.';
 }
 const sound=state.soundtrack||{pause:true,results:true,volume:.25};
 const paused=el('soundPauseEnabled'),awards=el('soundResultsEnabled'),volume=el('soundVolume');
 if(paused&&document.activeElement!==paused)paused.checked=sound.pause!==false;
 if(awards&&document.activeElement!==awards)awards.checked=sound.results!==false;
 if(volume&&document.activeElement!==volume)volume.value=String(Math.round((sound.volume??.25)*100));
 if(el('soundVolumeLabel'))el('soundVolumeLabel').textContent=Math.round((sound.volume??.25)*100)+' %';
 const message=el('soundtrackStatus');
 if(message)message.textContent=state.phase==='results'?(sound.results?'🏆 Die originale Siegerehrungs-Musik ist aktiv (falls der TV-Ton freigegeben wurde).':'Die Ergebnismusik ist ausgeschaltet.'):state.phase==='film'&&!state.playing?(sound.pause?'♫ Die ruhige Pausenmusik ist aktiv (falls der TV-Ton freigegeben wurde).':'Die Pausenmusik ist ausgeschaltet.'):'Musik ist während der laufenden Dokumentation AUS; Pausen- und Ergebnismusik beginnen bei den jeweiligen Phasen automatisch.';
 const music=state.welcomeMusic||{};
 renderSpotifyAdminPreview();
 const note=el('spotifyStatus');
 if(note&&document.activeElement?.id!=='spotifyInput')note.textContent=music.on?'♫ Die eigene TOUCH-LIVE-Willkommensmusik läuft auf dem LG-TV in Dauerschleife, sobald dort der Ton freigegeben ist.':'♫ LG-Musik AUS. Klicke auf „LG-Willkommensmusik starten“; ein Spotify-Link ist dafür nicht nötig.';
 const spotifyInput=el('spotifyInput');if(spotifyInput&&document.activeElement!==spotifyInput&&spotifyInput.value!==(music.url||''))spotifyInput.value=music.url||'';
 const titleInput=el('videoTitleInput');if(titleInput&&document.activeElement!==titleInput&&state.videoTitle&&titleInput.value!==state.videoTitle)titleInput.value=state.videoTitle;
 const filmVol=el('filmVolume'),fLabel=el('filmVolumeLabel');
  if(filmVol&&document.activeElement!==filmVol)filmVol.value=String(Math.round((state.videoVolume??1)*100));
  if(fLabel&&document.activeElement!==filmVol)fLabel.textContent=Math.round((state.videoVolume??1)*100)+' %';
  const localNotice=el('localMediaAdminStatus');
  if(localNotice){
   const local=state.video?.type==='local',ready=state.localMedia?.ready;
   localNotice.textContent=!local?'Lokale HDMI-Wiedergabe ist noch nicht ausgewählt.':
    ready?'✓ Vorführ-PC verbunden: '+(state.localMedia.name||'MP4-Datei')+' · bereit zum Filmstart.':
    '⚠️ Modus aktiv. Öffne auf dem Windows-PC den Beamerlink und wähle dort die lokale MP4-Datei aus.';
  }
  const mirrorInput=el('remoteVideoInput'),mirrorStatus=el('remoteVideoStatus'),mirror=state.remoteVideo||{type:'none'};
 if(mirrorInput&&document.activeElement!==mirrorInput&&mirror.type!=='none')mirrorInput.value=mirror.url||'';
 if(mirrorStatus)mirrorStatus.textContent=mirror.type==='none'?
  '⚠️ Keine Online-Quelle für die andere Stadt. Bei HDMI-Wiedergabe sehen entfernte Zuschauer weiterhin Quiz und Spiele, aber noch keinen Film.':
  '✓ Online-Film hinterlegt: '+(mirror.type==='youtube'?'YouTube (Einbettung erforderlich)':'direkte MP4')+'. Dieser Film wird bei lokalem HDMI-Modus auf /watch abgespielt. Prüfe die Wiedergabe auf dem fremden Gerät.';
 const n=el('videoNow');if(n)n.textContent='Aktueller Film: '+(state.videoTitle||'TOUCHSCREEN – Interaktive Dokumentation')+' · '+(state.video.type==='none'?'noch keine Quelle':state.video.type==='youtube'?'YouTube':state.video.type==='drive'?'Google Drive':state.video.type==='icloud'?'iCloud Drive':state.video.storage==='s3'?'Cloud-MP4':state.video.type==='local'?'Lokale MP4 über HDMI':'MP4-Link');
}
function renderAdminAnswers(){const box=el('adminAnswers');if(!box||!adminInfo)return;const Qs=adminInfo.questions||[],R=adminInfo.ranking||[];let n=0;
 if(!R.length){box.innerHTML='<p class="small">Noch niemand angemeldet.</p>';return;}
 const head=Qs.map(q=>'<th title="'+esc(q.q)+'">'+(q.type==='zoom'?'Zoom':++n)+'</th>').join('');
 box.innerHTML='<table class="rank adminTable"><thead><tr><th>Name</th><th>Punkte</th>'+head+'<th>Joker</th></tr></thead><tbody>'+R.map(u=>'<tr><td>'+esc(u.name)+(u.role==='teacher'?' · L':'')+'</td><td>'+u.score+'</td>'+Qs.map(q=>{const c=u.answers[q.id];return '<td>'+(c===undefined?'·':(c===q.correct?'✓':'✗')+String.fromCharCode(65+c))+'</td>';}).join('')+'<td>'+[u.jokers&&u.jokers.fifty?'50:50':'',u.jokers&&u.jokers.hint?'Tipp':''].filter(Boolean).join(', ')+'</td></tr>').join('')+'</tbody></table>';}
function controlPage(){
 if(!adminKey){
  app.innerHTML='<main class="phoneRemote"><div class="phoneRemoteHead"><span class="eyebrow">TOUCH LIVE / HANDY-FERNBEDIENUNG</span><h1>Deine <em>Regie.</em></h1><p>Gib einmal dein privates Admin-Passwort ein. Danach kannst du Doku und Willkommensmusik vom Handy steuern.</p></div><section class="phoneRemotePanel"><form id="controlUnlock"><label for="controlPassword">Admin-Passwort</label><input id="controlPassword" type="password" autocomplete="current-password" required placeholder="Admin-Passwort"><button type="submit" class="primary">Fernbedienung öffnen</button></form></section></main>';
  el('controlUnlock').onsubmit=async e=>{
   e.preventDefault();const key=el('controlPassword').value.trim();
   try{await api('/api/admin-info','GET',undefined,key);adminKey=key;sessionStorage.setItem('touch_admin_key',key);controlPage();poll(true);}
   catch(err){alert('Admin-Passwort stimmt nicht: '+err.message);}
  };return;
 }
 app.innerHTML='<main class="phoneRemote"><header class="phoneRemoteHead"><span class="eyebrow">TOUCH LIVE / MOBILE REGIE</span><h1>Deine <em>Fernbedienung.</em></h1><p id="controlTitle">TOUCHSCREEN – Interaktive Dokumentation</p><div class="phoneRemoteStatus" id="controlStatus" role="status">Verbinde mit deinem LG-Fernseher …</div></header><section class="phoneRemotePanel"><span class="label">FILM UND PRÄSENTATION</span><div class="phoneRemoteGrid"><button class="primary phoneMainPlay" data-mobile="start">▶ Film starten</button><button data-mobile="pause">Ⅱ Pause</button><button data-mobile="play">▶ Weiter</button><button data-mobile="restartVideo">⏮ Auf 00:00</button><button data-mobile="welcome">✨ Willkommen</button><button data-mobile="results">🏆 Ergebnisse</button></div><div class="phoneRemoteSeek"><label for="controlSeek">Filmzeit in Sekunden</label><input type="number" min="0" max="3107" value="0" id="controlSeek"><button id="controlSeekGo">Zur Zeit springen</button></div></section><section class="phoneRemotePanel"><span class="label">FREIWILLIGE WILLKOMMENSMUSIK</span><p id="controlMusicTitle" class="small">Keine Spotify-Musik hinterlegt.</p><div class="phoneRemoteGrid"><button data-mobile="musicOn">♫ LG-Musik starten</button><button data-mobile="musicOff">⏹ LG-Musik stoppen</button></div><p class="small">LG-Willkommensmusik läuft direkt auf dieser Webseite und wiederholt sich ohne Spotify-Preview. Für deine Spotify-Songs kannst du weiterhin separat Spotify Connect verwenden.</p><div class="phoneSpotifyPanel"><button type="button" id="mobileSpotifyExpand">♫ Spotify Connect: Start / Pause / Lautstärke / Titelwechsel</button><div id="mobileSpotifyConnect" hidden></div></div></section><section class="phoneRemotePanel"><span class="label">AUTOMATISCHE MUSIK</span><p class="small">Diese Musik ist selbst erstellt, ohne Spotify. Wenn der Film pausiert, beginnt die ruhige Musik. Bei den Ergebnissen folgt die Siegerehrungs-Musik. Bei Filmwiedergabe bleibt es still.</p><div class="phoneRemoteGrid"><button data-mobile-sound="pause" data-enabled="true">♫ Pausenmusik AN</button><button data-mobile-sound="results" data-enabled="true">🏆 Ergebnismusik AN</button></div></section><section class="phoneRemotePanel"><span class="label">UNTERTITEL</span><div class="phoneRemoteGrid"><button data-mobile-caption="on">CC Untertitel AN</button><button data-mobile-caption="off">CC Untertitel AUS</button></div></section><p class="phoneRemoteBottom"><a href="/#admin">⚙ Alle Einstellungen am PC oder Handy</a></p></main>';
 const spotifyExpand=el('mobileSpotifyExpand');
 if(spotifyExpand)spotifyExpand.onclick=()=>{
  const panel=el('mobileSpotifyConnect');if(!panel)return;
  panel.hidden=!panel.hidden;
  spotifyExpand.textContent=panel.hidden?'♫ Spotify Connect: Start / Pause / Lautstärke / Titelwechsel':'▾ Spotify-Steuerung einklappen';
  if(!panel.hidden&&window.SpotifyConnect){
   window.SpotifyConnect.mount(panel,{onSelect:async url=>{
    await api('/api/admin','POST',{cmd:'spotifySet',url},adminKey);
    await poll(true);
   }});
  }
 };
 document.querySelectorAll('[data-mobile]').forEach(btn=>btn.onclick=async()=>{
  const cmd=btn.dataset.mobile;
  if(cmd==='restartVideo'&&!confirm('Film auf 00:00 zurücksetzen? Quizpunkte bleiben.'))return;
  try{
   if(cmd==='start'&&window.SpotifyConnect?.connected?.())window.SpotifyConnect.pauseForFilm().catch(()=>{});
   await api('/api/admin','POST',{cmd},adminKey);
   await poll(true);
  }catch(err){alert('Regie: '+err.message);}
 });
 document.querySelectorAll('[data-mobile-sound]').forEach(btn=>btn.onclick=async()=>{
  const field=btn.dataset.mobileSound;
  const was=state?.soundtrack?.[field]!==false;
  try{await api('/api/admin','POST',{cmd:'soundtrackSet',field,value:!was},adminKey);await poll(true);}
  catch(err){alert('Musik: '+err.message);}
 });
 document.querySelectorAll('[data-mobile-caption]').forEach(btn=>btn.onclick=async()=>{
  try{await api('/api/admin','POST',{cmd:'subtitles',value:btn.dataset.mobileCaption==='on'},adminKey);await poll(true);}
  catch(err){alert('Untertitel: '+err.message);}
 });
 el('controlSeekGo').onclick=async()=>{
  try{await api('/api/admin','POST',{cmd:'seek',time:Number(el('controlSeek').value)},adminKey);await poll(true);}
  catch(err){alert('Filmzeit: '+err.message);}
 };
 api('/api/admin-info','GET',undefined,adminKey).catch(()=>{
  if(role!=='control')return;adminKey='';sessionStorage.removeItem('touch_admin_key');controlPage();
 });
}
function remotePage(){
 if(!remoteKey){wrap(page('Mitsteuerung','ZWEITES GERÄT · REGIE','Dieser Bereich ist nur für eine eingeladene Person.')+'<div class="card"><label>Mitsteuer-Code</label><input id="remoteCode" type="password"><p></p><button class="primary" id="remoteUnlock">Verbinden</button></div>');el('remoteUnlock').onclick=()=>{remoteKey=el('remoteCode').value;sessionStorage.setItem('touch_cohost_key',remoteKey);remotePage();};return;}
 const controls=[['welcome','Willkommen anzeigen'],['start','▶ Sendung starten'],['pause','Ⅱ Film pausieren'],['play','▶ Film fortsetzen'],['zoomStart','🖐️ Finger-Mission starten (30 s)'],['zoomEnd','Gesten-Spiel beenden'],['demo','Testquiz starten'],['demoNext','Nächste Testfrage'],['results','🏆 Top 3 zeigen'],['handout','Handout anzeigen'],['end','Danke / Abschlussbild']];
 wrap(page('Co-Regie','ZWEITES GERÄT · TOUCH LIVE','Gemeinsame Live-Steuerung auf Handy, iPad oder PC.')+'<div class="card"><h2>Live-Sendung steuern</h2><div id="remoteStatus" class="status">Verbinde mit der Präsentation …</div><div class="control">'+controls.map(([c,l])=>'<button data-remote="'+c+'">'+l+'</button>').join('')+'</div><label>Filmzeit einstellen (Sekunden)</label><div class="flex"><input id="remoteSeek" type="number" value="0" min="0" max="3107" style="max-width:160px"><button id="remoteSeekGo">Springen</button></div><p class="notice">Beide Controller wirken auf dieselbe Präsentation. Der Film läuft nur auf dem Beamer.</p></div>');
 document.querySelectorAll('[data-remote]').forEach(x=>x.onclick=()=>remoteAction(x.dataset.remote));el('remoteSeekGo').onclick=()=>remoteAction('seek',{time:Number(el('remoteSeek').value)});
}
async function remoteAction(cmd,args={}){try{await api('/api/remote','POST',{cmd,...args},remoteKey);await poll(true);}catch(e){alert('Steuerung fehlgeschlagen: '+e.message);}}
async function adminAction(cmd,args={}){
 try{
  if(cmd==='start'&&window.SpotifyConnect?.connected?.())window.SpotifyConnect.pauseForFilm().catch(()=>{});
  await api('/api/admin','POST',{cmd,...args},adminKey);await poll(true);
 }catch(e){alert(e.message);}
}
async function uploadFilm(){
 const file=el('bigFile')?.files?.[0],btn=el('uploadButton'),info=el('uploadInfo');
 if(!file)return alert('Bitte deine MP4-Datei auswählen.');
 if(!/\.mp4$/i.test(file.name))return alert('Bitte eine MP4-Datei auswählen.');
 if(file.size>10*1024**3)return alert('Die Datei darf höchstens 10 GB groß sein.');
 btn.disabled=true;
 const uploadKey='touch-live-s3-upload-'+file.name+'-'+file.size+'-'+file.lastModified;
 try{
  const status=await api('/api/storage/status');
  if(!status.configured){info.textContent='MP4-Upload noch gesperrt. Bitte Cloud-Speicher verbinden oder den YouTube-Link nutzen.';return;}
  let prior=null;try{prior=JSON.parse(localStorage.getItem(uploadKey)||'null');}catch{}
  let first=null;
  if(prior?.uploadId){try{first=await api('/api/storage/start','POST',{size:file.size,name:file.name,uploadId:prior.uploadId},adminKey);}catch{first=null;}}
  if(!first)first=await api('/api/storage/start','POST',{size:file.size,name:file.name},adminKey);
  const uploadId=first.uploadId,partSize=first.partSize||16*1024*1024,totalParts=Math.ceil(file.size/partSize);
  localStorage.setItem(uploadKey,JSON.stringify({uploadId,name:file.name,size:file.size,date:Date.now()}));
  const existing=new Map();
  (first.parts||[]).forEach(part=>{const expected=Math.min(partSize,file.size-(part.number-1)*partSize);if(part.number>=1&&part.number<=totalParts&&part.size===expected&&part.etag)existing.set(part.number,{number:part.number,etag:part.etag});});
  let uploaded=0;
  for(let part=1;part<=totalParts;part++){if(existing.has(part))uploaded+=Math.min(partSize,file.size-(part-1)*partSize);}
  const startTime=Date.now();
  const update=()=>{const pct=Math.min(100,uploaded/file.size*100),speed=uploaded/Math.max(1,(Date.now()-startTime)/1000),remain=speed>0?(file.size-uploaded)/speed:0;info.textContent='Hochgeladen: '+pct.toFixed(1)+' % · '+(uploaded/1048576).toFixed(0)+' / '+(file.size/1048576).toFixed(0)+' MB'+(speed>0?' · ca. '+Math.ceil(remain/60)+' Min. übrig':'');};
  update();
  let next=1,firstFailure=null;
  async function putPart(number){
    const from=(number-1)*partSize,to=Math.min(file.size,from+partSize),piece=file.slice(from,to);
    for(let attempt=0;attempt<4;attempt++){
      try{
        const {url}=await api('/api/storage/part','POST',{uploadId,number},adminKey);
        const etag=await new Promise((resolve,reject)=>{
          const xhr=new XMLHttpRequest();xhr.open('PUT',url,true);xhr.timeout=120000;
          xhr.onload=()=>{const tag=xhr.getResponseHeader('ETag');if(xhr.status>=200&&xhr.status<300&&tag)resolve(tag);else reject(Error('Cloud-Upload HTTP '+xhr.status+(tag?'':' – ETag durch Bucket-CORS freigeben.')));};
          xhr.onerror=()=>reject(Error('Netzwerk/CORS-Fehler. Bucket CORS: PUT erlauben und ETag freigeben.'));xhr.ontimeout=()=>reject(Error('Zeitüberschreitung beim Hochladen'));xhr.send(piece);
        });
        existing.set(number,{number,etag});uploaded+=piece.size;update();return;
      }catch(e){if(attempt===3)throw e;await new Promise(resolve=>setTimeout(resolve,700*(attempt+1)));}
    }
  }
  async function worker(){
    while(!firstFailure){
      const number=next++;if(number>totalParts)return;
      if(existing.has(number))continue;
      try{await putPart(number);}catch(e){firstFailure=e;return;}
    }
  }
  await Promise.all(Array.from({length:3},worker));
  if(firstFailure)throw firstFailure;
  info.textContent='100 % – Videoblöcke werden im Cloud-Speicher zusammengefügt …';
  const parts=[...existing.values()].sort((a,b)=>a.number-b.number);
  if(parts.length!==totalParts)throw Error('Nicht alle Upload-Blöcke vorhanden.');
  await api('/api/storage/complete','POST',{uploadId,size:file.size,name:file.name,parts},adminKey);
  localStorage.removeItem(uploadKey);
  info.textContent='Fertig: Dein Video ist einmal hochgeladen und auf Fernseher, iPad, Handy und in Berlin verfügbar.';
  await poll(true);
 }catch(e){info.textContent='Upload nicht abgeschlossen: '+e.message+' Du kannst dieselbe MP4-Datei später erneut auswählen, um fortzusetzen.';}
 finally{btn.disabled=!cloudUploadReady;}
}
function secText(n){n=Math.max(0,Math.floor(Number(n)||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
let tvRemoteAutoHide=null,tvSoundBlocked=false,tvSoundActivated=false,tvAutoCinemaTried=false,tvWelcomeDismissed=false,tvLastDisplayPhase='';
let tvLocalFile=null,tvLocalObjectURL='',tvLocalLoaded=false,tvLocalAnnouncePending=false;
async function announceLocalHDMI(){
 if(tvLocalAnnouncePending||role!=='tv'||!tvKey||!tvLocalFile||!tvLocalLoaded||state?.video?.type!=='local')return;
 tvLocalAnnouncePending=true;
 try{
  await api('/api/tv/local-ready','POST',{
   name:tvLocalFile.name,size:tvLocalFile.size,
   duration:Number.isFinite(videoEl?.duration)?videoEl.duration:0
  },tvKey);
  const node=el('tvLocalStatus');
  if(node)node.textContent='✓ Bereit: '+tvLocalFile.name+' · kein Upload · jetzt am Admin-PC „Film starten“';
 }catch(e){
  const node=el('tvLocalStatus');if(node)node.textContent='Verbindung zum Live-Server fehlgeschlagen: '+e.message;
 }finally{tvLocalAnnouncePending=false;}
}

const lgFullscreenActive=()=>!!(document.fullscreenElement||document.webkitFullscreenElement||document.msFullscreenElement);
function tvRemoteButtons(){
 const bar=el('tvRemoteBar');
 return bar?[...bar.querySelectorAll('button:not(:disabled):not([hidden])')]:[];
}
function tvFocusControl(id='tvFullscreen'){
 const node=el(id);
 if(!node||node.hidden||node.disabled)return;
 try{node.focus({preventScroll:true});}catch{node.focus();}
}
function tvControlsVisible(show=true){
 const bar=el('tvRemoteBar'),help=el('tvRemoteHelp');if(!bar)return;
 if(tvRemoteAutoHide){clearTimeout(tvRemoteAutoHide);tvRemoteAutoHide=null;}
 // Only the welcome screen contains the LG setup bar. During a film, quiz,
 // paused film or awards the video/presentation stays unobstructed.
 const welcomeOnly=!state||state.phase==='welcome';
 const visible=show&&welcomeOnly;
 bar.classList.toggle('tvRemoteHidden',!visible);
 if(help)help.hidden=!visible;
 if(visible&&!bar.dataset.wasShown){
  // Focus once; polling must not steal focus from LG remote button selection.
  tvFocusControl('tvFullscreen');
 }
 bar.dataset.wasShown=visible?'1':'0';
}
function tvFullscreenHint(message){
 const note=el('tvRemoteHelp');
 if(note&&message){note.textContent=message;note.hidden=false;}
}
function tvRemoteFullscreen(auto=false){
 const root=el('tvApp');if(!root)return;
 root.classList.add('tvCinema');
 const btn=el('tvFullscreen');
 const enter=root.requestFullscreen||root.webkitRequestFullscreen||root.msRequestFullscreen;
 if(lgFullscreenActive()){
  if(btn)btn.textContent='✓ Vollbild aktiv';
  if(!auto)tvControlsVisible(true);
  return;
 }
 if(!enter){
  if(btn)btn.textContent='⛶ Vollbild – OK';
  if(!auto){
   tvControlsVisible(true);
   tvFullscreenHint('Der LG-Browser bietet hier kein echtes Webseiten-Vollbild. Die Doku füllt bereits die Browserfläche. Prüfe im LG-Browser die Vollbildoption.');
  }
  return;
 }
 try{
  const out=enter.call(root);
  if(out?.then)out.then(()=>{
   if(btn)btn.textContent='✓ Vollbild aktiv';
   if(!auto)tvControlsVisible(true);
  }).catch(()=>{
   if(btn)btn.textContent='⛶ Vollbild – OK';
   if(!auto){
    tvControlsVisible(true);
    tvFullscreenHint('Vollbild ist durch den LG-Browser gesperrt. Drücke OK auf „⛶ Vollbild“ oder benutze die Vollbildfunktion des LG-Browsers.');
   }
  });
  else if(btn)btn.textContent='⛶ Vollbild – OK';
 }catch{
  if(btn)btn.textContent='⛶ Vollbild – OK';
  if(!auto){
   tvControlsVisible(true);
   tvFullscreenHint('LG erlaubt hier kein Webseiten-Vollbild. Nutze die Vollbildfunktion des LG-Browsers.');
  }
 }
}
function tvShowSoundPrompt(){
 if(role!=='tv'||!el('tvPlay'))return;
 tvSoundBlocked=true;
 el('tvPlay').textContent='▶ Ton & Vollbild mit OK freigeben';
 if(state?.phase==='welcome')tvControlsVisible(true);
 const overlay=el('tvFilmUnlock');
 if(overlay)overlay.hidden=true; // No visible overlay during the documentary.
}
function tvEnablePlayback(){
 try{window.TouchSoundtrack?.activate?.();}catch{}
 const overlay=el('tvFilmUnlock');if(overlay)overlay.hidden=true;
 // This is always called from a real LG OK / mouse click, so the browser can
 // grant audio and native fullscreen if permitted.
 tvSoundActivated=true;tvSoundBlocked=false;tvAutoplayMuted=false;playerReady=true;
 // Prime the audio on a genuine click, before fullscreen consumes user activation.
 if(state?.phase==='welcome'&&state?.video?.type==='local'&&tvLocalObjectURL&&videoEl){
  videoEl.muted=false;videoEl.volume=state?.videoVolume??1;
  try{const attempt=videoEl.play();if(attempt?.then)attempt.then(()=>{
   if(state?.phase==='welcome'){videoEl.pause();try{videoEl.currentTime=0;}catch{}}
  }).catch(()=>{const n=el('tvLocalStatus');if(n)n.textContent='Ton noch blockiert: Film später am PC einmal anklicken und erneut freigeben.';});}
  catch{}
 }
 tvRemoteFullscreen(false);
 const p=el('tvPlay');if(p)p.textContent='✓ Ton ist aktiviert';
 try{
  if(state?.video?.type==='youtube'&&ytPlayer){
   ytPlayer.unMute();
   if(state?.playing)ytPlayer.playVideo();
  }else if(videoEl){
   videoEl.muted=false;videoEl.volume=1;
   if(state?.phase==='film'&&state.playing)videoEl.play().catch(()=>tvShowSoundPrompt());
  }
 }catch{tvShowSoundPrompt();}
}
function tvRemoteBack(){
 if(state?.phase!=='welcome'){
  // Hidden TV remote OK can still unlock video sound; never show a film overlay.
  if(tvSoundBlocked||tvAutoplayMuted)tvEnablePlayback();
  return;
 }
 const bar=el('tvRemoteBar');
 if(bar?.classList.contains('tvRemoteHidden')){
  tvWelcomeDismissed=false;tvControlsVisible(true);tvFocusControl('tvFullscreen');return;
 }
 // Back with menu already visible may exit native fullscreen, but never
 // abandons the presentation or opens a different website.
 if(lgFullscreenActive()){
  const leave=document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen;
  try{const r=leave?.call(document);r?.catch?.(()=>{});}catch{}
 }
 tvControlsVisible(true);tvFocusControl('tvFullscreen');
}
function tvRemoteKeydown(e){
 if(role!=='tv'||!el('tvApp'))return;
 const code=e.keyCode||e.which;
 const bar=el('tvRemoteBar');if(!bar)return;
 // Film and quiz are distraction-free. Only the exceptional audio-unlock button
 // can be focused by the TV remote after autoplay restrictions.
 if(state?.phase!=='welcome'){
  const code=e.keyCode||e.which;
  if(['Enter','MediaPlay','MediaPlayPause'].includes(e.key)||[13,415].includes(code)){
   if(tvSoundBlocked||tvAutoplayMuted){e.preventDefault();tvEnablePlayback();}
  }
  return;
 }
 const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
 if(keys.includes(e.key)||[37,38,39,40].includes(code)){
  e.preventDefault();if(bar.classList.contains('tvRemoteHidden')){tvWelcomeDismissed=false;tvControlsVisible(true);}
  const targets=tvRemoteButtons();if(!targets.length)return;
  let n=targets.indexOf(document.activeElement);
  // Direct D-pad navigation; never activate LG's simulated pointer.
  const delta=(e.key==='ArrowLeft'||e.key==='ArrowUp'||code===37||code===38)?-1:1;
  n=n<0?0:(n+delta+targets.length)%targets.length;
  tvControlsVisible(true);
  tvFocusControl(targets[n].id);
  return;
 }
 if(e.key==='Enter'||code===13){
  // On LG webOS, OK is a real user gesture: retry native fullscreen immediately.
  if(!document.fullscreenElement)tvRemoteFullscreen(true);
  if(bar.classList.contains('tvRemoteHidden')){
   e.preventDefault();
   tvControlsVisible(true);tvFocusControl('tvFullscreen');return;
  }
  const active=document.activeElement;if(active?.tagName==='BUTTON'){e.preventDefault();active.click();}else{e.preventDefault();el('tvPlay')?.click();}
  return;
 }
 // On LG WebOS, Back/Return is often keyCode 461.
 if(['Escape','Backspace','BrowserBack'].includes(e.key)||[27,8,461].includes(code)){
  e.preventDefault();tvRemoteBack();return;
 }
 // Remote Play button enables local playback; global playback is controlled by the admin.
 if(e.key==='MediaPlay'||e.key==='MediaPlayPause'||[415].includes(code)){e.preventDefault();el('tvPlay')?.click();}
}
window.addEventListener('keydown',tvRemoteKeydown,true);
function tvView(){
 if(!tvKey){app.innerHTML='<div class="wrap page"><h1>Beamer verbinden</h1><p>Bitte den Beamerlink aus der Admin-Ansicht öffnen.</p><label>Beamer-Zugangsschlüssel</label><input type="password" id="tvInput"><p></p><button class="primary" id="tvSubmit">Verbinden</button></div>';el('tvSubmit').onclick=()=>{tvKey=el('tvInput').value;sessionStorage.setItem('touch_tv_key',tvKey);localStorage.setItem('touch_tv_key',tvKey);tvView();};return;}
 app.innerHTML='<div id="tvApp"><audio id="tvWelcomeAudio" src="/welcome-music.wav" preload="auto" loop playsinline style="display:none"></audio><div id="tvScene" class="tvScene"></div><div class="videoLayer" id="videoLayer" style="display:none"><video id="tvVideo" playsinline preload="metadata"></video><div id="youtubeTarget" style="display:none"></div><iframe id="cloudFrame" title="Google Drive Filmvorschau" allow="autoplay; fullscreen; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" style="display:none"></iframe><div id="captionLayer" class="captionLayer" style="display:none"></div></div><div class="tvUnlock tvRemoteBar" id="tvRemoteBar" role="toolbar" aria-label="LG Fernbedienungs-Steuerung"><button id="tvPlay" type="button" tabindex="0">▶ Ton & Vollbild mit OK freigeben</button><button id="tvLocalChoose" type="button" tabindex="0" hidden>📁 MP4 vom Windows-PC wählen</button><input id="tvLocalFile" type="file" accept=".mp4,video/mp4" hidden><span id="tvLocalStatus" role="status" style="font-size:13px;max-width:400px" hidden>MP4 bitte lokal auswählen.</span><button id="tvFullscreen" type="button" tabindex="0" autofocus>⛶ Vollbild – OK</button><button id="tvSoundtrackUnlock" type="button" tabindex="0">♫ Musik-Ton aktivieren</button><button id="tvSpotifyPlay" type="button" tabindex="0" hidden>♫ Willkommensmusik ▶</button><button id="tvCloudOpen" type="button" tabindex="0" hidden>☁ iCloud-Datei öffnen</button><button id="tvCaptionSync" type="button" tabindex="0" hidden>⏱ Untertitel synchronisieren</button><button id="tvHideControls" type="button" tabindex="0">Menü ausblenden</button></div><div class="tvRemoteHelp" id="tvRemoteHelp">LG-Fernbedienung: ◀ ▶ auswählen · OK bestätigen · Zurück für das Menü · Lautstärke über TV</div><button id="tvFilmUnlock" class="tvFilmUnlock" type="button" hidden>🔊 Filmton mit OK einschalten</button><div id="tvWelcomeMusicStatus" class="tvWelcomeMusicStatus" hidden aria-live="polite"></div><div id="tvSpotifyDock" class="tvSpotifyDock" hidden aria-label="Spotify-Vorschau auf LG deaktiviert"></div><div class="tvFooter">TOUCH LIVE · Beamer</div></div>';
 videoEl=el('tvVideo');
 const choose=el('tvLocalChoose'),picker=el('tvLocalFile');
 if(choose&&picker){
  choose.onclick=()=>picker.click();
  picker.onchange=()=>{
   const file=picker.files?.[0];if(!file)return;
   if(!/\.mp4$/i.test(file.name)){const status=el('tvLocalStatus');if(status)status.textContent='Bitte eine .mp4-Datei auswählen.';return;}
   try{
    if(tvLocalObjectURL)URL.revokeObjectURL(tvLocalObjectURL);
    tvLocalFile=file;tvLocalObjectURL=URL.createObjectURL(file);tvLocalLoaded=false;
    mediaType='';tvSoundBlocked=false;
    videoEl.pause();videoEl.src=tvLocalObjectURL;videoEl.load();
    const status=el('tvLocalStatus');if(status)status.textContent='Prüfe lokale MP4: '+file.name+' …';
   }catch(e){const status=el('tvLocalStatus');if(status)status.textContent='Datei konnte nicht geöffnet werden: '+e.message;}
  };
 }
 const welcomeAudio=el('tvWelcomeAudio');
 if(welcomeAudio){
  welcomeAudio.loop=true;welcomeAudio.volume=.8;welcomeAudio.muted=false;
  welcomeAudio.addEventListener('playing',()=>{
   welcomeAudioPending=false;welcomeAudioBlocked=false;welcomeAudioError='';
   if(state?.phase==='welcome')syncWelcomeMusic();
  });
  welcomeAudio.addEventListener('error',()=>{
   welcomeAudioPending=false;welcomeAudioBlocked=true;
   welcomeAudioError='Die Audio-Datei konnte vom LG-Browser nicht geladen werden.';
   if(state?.phase==='welcome')syncWelcomeMusic();
  });
  welcomeAudio.addEventListener('pause',()=>{
   welcomeAudioPending=false;
   if(state?.phase==='welcome')syncWelcomeMusic();
  });
 }
 // Never intentionally start the TV movie muted.
 videoEl.muted=false;videoEl.defaultMuted=false;videoEl.volume=1;
 el('tvPlay').onclick=tvEnablePlayback;
 el('tvFilmUnlock').onclick=tvEnablePlayback;
 el('tvFullscreen').onclick=()=>{
  tvSoundActivated=true;tvAutoplayMuted=false;
  try{window.TouchSoundtrack?.activate?.();}catch{}
  if(state?.phase==='welcome'&&state?.welcomeMusic?.on)playWelcomeAudio();
  tvRemoteFullscreen(false);
};
 el('tvSoundtrackUnlock').onclick=async()=>{
  if(!state||state.phase!=='welcome')return;
  const audio=el('tvWelcomeAudio');
  const current=state.welcomeMusic?.on===true;
  const on=!(current&&audio&&!audio.paused);
  // Optimistic local state prevents the LG <audio> 'playing'/'pause' event
  // from undoing the tap while the request is still in flight.
  if(state.welcomeMusic)state.welcomeMusic.on=on;
  const button=el('tvSoundtrackUnlock');if(button)button.disabled=true;
  // The play() invocation happens on the actual TV remote event, not after await.
  if(on){
   welcomeAudioBlocked=false;welcomeAudioError='';
   playWelcomeAudio();
   try{window.TouchSoundtrack?.activate?.();}catch{}
  }else if(audio){try{audio.pause();audio.currentTime=0;}catch{}}
  try{
   await api('/api/tv/welcome-music','POST',{on},tvKey);
   await poll(true);
  }catch(err){
   welcomeAudioError='Musik konnte nicht gespeichert werden: '+err.message;
   if(on&&audio){try{audio.pause();}catch{}}
   await poll(true);
  }finally{if(button)button.disabled=false;}
  tvControlsVisible(true);
 };
 el('tvSpotifyPlay').onclick=()=>{
  const frame=el('tvSpotifyDock')?.querySelector('iframe');
  if(frame){
   try{frame.focus({preventScroll:true});}catch{frame.focus();}
   tvFullscreenHint('Spotify: Starte den vollständigen Song direkt mit ▶ im Spotify-Player. Wenn nur eine 30-Sekunden-Vorschau hörbar ist, öffne die Spotify-App auf dem LG-TV und wähle ihn über Spotify Connect.');
  }else tvFullscreenHint('Spotify-Player wird vorbereitet. Für ganze Songs auf dem LG-TV nutze Spotify Connect.');
  tvControlsVisible(true);
 };
 el('tvHideControls').onclick=()=>{tvWelcomeDismissed=true;tvControlsVisible(false);};
 el('tvCloudOpen').onclick=()=>{if(state?.video?.type==='icloud'){const url=state.video.shareUrl||state.video.url;if(url)window.open(url,'_blank','noopener');}};
 el('tvCaptionSync').onclick=()=>{
  if(state?.video?.type==='drive'&&el('cloudFrame')?.style.display==='block'){
   fallbackCaptionsBase=Number(state.time)||0;
   fallbackCaptionsAt=Date.now();
   updateCaption();
   tvControlsVisible(true);
  }
 };
 tvControlsVisible(true);
 // On LG, focus the actual button on page load so OK/arrow keys work without Magic Remote pointer.
 tvFocusControl('tvFullscreen');
 // Start the browser-sized cinematic layout immediately; attempt native fullscreen.
 // TV firmware may reject native fullscreen without OK.
 if(!tvAutoCinemaTried){tvAutoCinemaTried=true;tvRemoteFullscreen(true);}
 // No 6-second disappearing controls. The menu stays accessible for 90 seconds, or until manually closed.
 videoEl.addEventListener('loadedmetadata',()=>{
  videoEl.muted=tvAutoplayMuted;videoEl.volume=state?.videoVolume??1;
  if(state?.video?.type==='local'&&tvLocalObjectURL){tvLocalLoaded=true;announceLocalHDMI();}
 });
 videoEl.addEventListener('error',()=>{
  if(role!=='tv'||state?.video?.type!=='drive'||state.phase!=='film'||videoEl.getAttribute('src')!==state.video.url)return;
  const iframe=el('cloudFrame');
  videoEl.style.display='none';
  if(iframe){iframe.src=state.video.previewUrl||state.video.shareUrl;iframe.style.display='block';}
  const sync=el('tvCaptionSync');if(sync)sync.hidden=false;
  if(state?.playing){fallbackCaptionsAt=Date.now();fallbackCaptionsBase=Number(state.time)||0;}
  tvControlsVisible(true);
 });
 videoEl.addEventListener('canplay',()=>{if(state?.video?.type==='drive'){const sync=el('tvCaptionSync');if(sync)sync.hidden=true;fallbackCaptionsAt=0;}});

 videoEl.addEventListener('timeupdate',()=>{updateCaption();});
 videoEl.addEventListener('ended',()=>{if(state?.phase==='film')sendTick(false,true);});
}
function tvScene(html){const node=el('tvScene');if(node&&node.__h!==html){node.innerHTML=html;node.__h=html;}}
function playWelcomeAudio(){
 const audio=el('tvWelcomeAudio');
 if(!audio)return false;
 if(!audio.paused&&audio.readyState>=2){
  welcomeAudioPending=false;welcomeAudioBlocked=false;return true;
 }
 try{
  audio.loop=true;audio.muted=false;
  audio.volume=Math.max(.35,Math.min(1,(state?.soundtrack?.volume??.25)*3));
  welcomeAudioPending=true;welcomeAudioError='';
  // Native HTML5 audio works on LG webOS more broadly than oscillator-only Web Audio.
  // Call directly from remote OK when the browser requires a user gesture.
  const attempt=audio.play();
  if(attempt&&typeof attempt.then==='function'){
   attempt.then(()=>{welcomeAudioPending=false;welcomeAudioBlocked=false;welcomeAudioError='';})
    .catch(err=>{
     welcomeAudioPending=false;welcomeAudioBlocked=true;
     welcomeAudioError=err?.name==='NotAllowedError'
      ?'LG blockiert den automatischen Musikstart. Drücke einmal OK auf „LG-Musik starten“.'
      :'LG konnte das Audio nicht abspielen. Prüfe die TV-Lautstärke und lade die Seite neu.';
    });
  }else welcomeAudioPending=false;
  return true;
 }catch(err){
  welcomeAudioPending=false;welcomeAudioBlocked=true;
  welcomeAudioError='Musikstart fehlgeschlagen: '+(err?.message||'LG-Audioplayer');
  return false;
 }
}
function syncWelcomeMusic(){
 // Spotify Preview is NOT used as a soundtrack on the LG.
 const dock=el('tvSpotifyDock');
 if(dock){dock.hidden=true;if(dock.firstChild)dock.replaceChildren();}
 if(spotifyController){try{spotifyController.pause();spotifyController.destroy();}catch{}spotifyController=null;}
 spotifyWanted=false;spotifyUri='';
 const oldSpotifyButton=el('tvSpotifyPlay');if(oldSpotifyButton)oldSpotifyButton.hidden=true;
 const audio=el('tvWelcomeAudio');
 const enabled=state?.phase==='welcome'&&state?.welcomeMusic?.on===true;
 if(audio){
  if(!enabled){
   if(!audio.paused){try{audio.pause();audio.currentTime=0;}catch{}}
   welcomeAudioBlocked=false;welcomeAudioPending=false;welcomeAudioError='';
  }else{
   // Automatic attempt if PC/phone switched on the music; LG may require remote OK.
   if(audio.paused&&!welcomeAudioPending&&!welcomeAudioBlocked)playWelcomeAudio();
  }
 }
 const actuallyPlaying=!!(enabled&&audio&&!audio.paused&&audio.readyState>=2);
 const chip=el('tvWelcomeMusicStatus');
 if(chip){
  chip.hidden=!enabled;
  chip.textContent=actuallyPlaying?'♫ Musik wird abgespielt · DAUERSCHLEIFE'
   :(welcomeAudioError||'♫ Musik ist eingeschaltet · am LG mit OK den Ton starten');
  chip.classList.toggle('is-playing',actuallyPlaying);
 }
 const button=el('tvSoundtrackUnlock');
 if(button)button.textContent=actuallyPlaying?'⏹ LG-Musik stoppen'
  :enabled?'▶ LG-Musik jetzt hören':'♫ LG-Musik starten';
}
function tvDisplay(){
 if(!state||role!=='tv'||!el('tvScene'))return;
 const phase=state.phase;const videoMode=phase==='film';
 const local=state.video?.type==='local',localPick=el('tvLocalChoose'),localStatus=el('tvLocalStatus');
 if(localPick)localPick.hidden=!local;
 if(localStatus){localStatus.hidden=!local;if(local&&!tvLocalFile)localStatus.textContent='Am Windows-PC zuerst die lokale MP4 auswählen (kein Upload).';}
 const tvRoot=el('tvApp');if(tvRoot)tvRoot.classList.toggle('tvPlayingFilm',videoMode);
 if(phase==='welcome'&&tvLastDisplayPhase!=='welcome')tvWelcomeDismissed=false;
 tvLastDisplayPhase=phase;
 tvControlsVisible(phase==='welcome'&&!tvWelcomeDismissed);
 const filmUnlock=el('tvFilmUnlock');
 if(filmUnlock)filmUnlock.hidden=true; // Film must never show a bottom audio/setup overlay.
 const layer=el('videoLayer');if(layer)layer.style.display=videoMode&&state.video.type!=='none'&&(state.video.type!=='local'||!!tvLocalObjectURL)?'block':'none';
 const scene=el('tvScene');
 syncWelcomeMusic();
 window.TouchSoundtrack?.sync?.({...state,welcomeMusic:{...(state.welcomeMusic||{}),on:false}}); // HTML5 WAV owns welcome audio.
 if(phase==='welcome'){scene.style.display='flex';tvScene('<div class="welcomeArtwork"><div><span class="eyebrow">LERNFELD 14 · INTERAKTIVE DOKUMENTATION</span><h1>TOUCH<em>SCREEN</em></h1><p class="welcomeProgramTitle">'+esc(state.videoTitle||'TOUCHSCREEN – Interaktive Dokumentation')+'</p><p>Geschichte, Technik und Zukunft – gemeinsam entdecken.</p><p class="welcomePrompt">Öffnet den Schülerlink auf eurem iPad. Gleich geht es los!</p></div><img src="/touchscreen-motiv.svg" alt="Leuchtender Touchscreen mit Berührungswellen"></div>');pauseTV();}
 else if(phase==='gesture'){scene.style.display='flex';tvScene('<div><span class="eyebrow">KAPITEL 04 / MULTITOUCH</span><h1><em>Gesten üben.</em></h1><p>Auf den iPads verschieben, vergrößern und drehen!</p></div>');pauseTV();}
 else if(phase==='zoom'){scene.style.display='flex';const q=state.quiz;tvScene('<div class="egg-projector"><div><span class="eyebrow">KAPITEL 04 · MULTITOUCH LIVE-EXPERIMENT</span><h1>Die <em>Touch-Challenge!</em></h1><p>So funktioniert Multitouch in der Praxis: Vergrößert das digitale Bild mit zwei Fingern, verschiebt es und tippt auf das versteckte Easter Egg.</p><div class="egg-tv-counter"><strong>'+(q?q.remaining:0)+' s</strong><span>⏱ Zeit übrig<br>🔎 '+(q?q.foundCount:0)+' von '+state.participants+' haben das Easter Egg gefunden</span></div><p class="small" style="margin-top:22px">Pinch-to-Zoom = zwei Finger auseinanderziehen · Pan = verschieben · Tap = antippen.</p></div><img class="egg-tv-art" src="/easter-scene.svg" alt="Panorama mit Berghütte als Easter-Egg-Spiel"></div>');pauseTV();}
 else if(phase==='demo'){scene.style.display='flex';tvScene('<div><span class="eyebrow">LIVE-QUIZ · PROBELAUF</span><h1>Frage '+(state.quiz?.index+1||'')+'</h1><h2>'+esc(state.quiz?.q||'Bereit für die erste Frage?')+'</h2><p>Antwortet auf euren iPads · '+(state.quiz?.remaining||0)+' Sekunden</p></div>');pauseTV();}
 else if(phase==='results'){scene.style.display='flex';tvScene('<div class="resultshow podiumScene"><span class="eyebrow">TOUCH LIVE · DIE GROSSE SIEGEREHRUNG</span><h1>Das sind eure <em>Top 3!</em></h1>'+podium()+'<p class="podiumFoot">Herzlichen Glückwunsch! · '+state.participants+' Teilnehmende</p></div>');pauseTV();}
 else if(phase==='handout'){scene.style.display='flex';tvScene('<div class="endArtwork"><img src="/touchscreen-motiv.svg" alt="Touchscreen"><div><span class="eyebrow">LERNFELD 14 · ZUM ABSCHLUSS</span><h1>Jetzt seid <em>ihr</em> dran!</h1><p>Öffnet das Handout auf eurem iPad. Tragt nur eure Bewertungen und kurzen Notizen in die Tabelle ein. Keine Rechnungen!</p></div></div>');pauseTV();}
 else if(phase==='end'){scene.style.display='flex';tvScene('<div class="endArtwork"><img src="/touchscreen-motiv.svg" alt="Touchscreen"><div><span class="eyebrow">TOUCH LIVE · LERNFELD 14</span><h1>Vielen Dank für eure <em>Aufmerksamkeit!</em></h1><p>Das war meine Dokumentation <strong>„'+esc(state.videoTitle||'TOUCHSCREEN')+'“</strong>.</p><p class="closingLine">Ich hoffe, es hat euch gefallen – habt ihr noch Fragen?</p></div></div>');pauseTV();}
 else if(phase==='film'){if(state.video.type==='local'&&!tvLocalObjectURL){
  scene.style.display='flex';
  tvScene('<div><span class="eyebrow">LOKALE MP4 NOCH NICHT AUSGEWÄHLT</span><h1>Film am <em>Windows-PC</em> auswählen</h1><p>Im Admin „Willkommen“ drücken, dann hier am PC die MP4 wählen und den Ton freigeben. Die Datei bleibt lokal.</p></div>');
  pauseTV();
 }else if(state.video.type==='none'){scene.style.display='flex';tvScene('<div><span class="eyebrow">FILMQUELLE NOCH NICHT GEWÄHLT</span><h1>TOUCH <em>LIVE</em></h1><p>Wähle zuerst im Adminbereich deinen Film oder nutze den Testquiz-Modus.</p></div>');}else scene.style.display='none';ensureMedia();}
 lastFilmPhase=phase;
}
function pauseTV(){try{videoEl?.pause();if(ytPlayer)ytPlayer.pauseVideo();}catch{}}
function ensureMedia(){
 if(!state||role!=='tv'||state.phase!=='film')return;
 const video=state.video,ref=video.type+':'+(video.type==='local'?tvLocalObjectURL:video.url);
 if(state.captionsAvailable&&lastCaptionRevision!==state.captionsRevision){lastCaptionRevision=state.captionsRevision;fetchCaptions();}
 if(ref!==mediaType){mediaType=ref;subtitles=[];lastRevision=-1;tvSoundBlocked=false;tvAutoplayMuted=!tvSoundActivated;
  const iframe=el('cloudFrame'),external=el('tvCloudOpen'),sync=el('tvCaptionSync');
  fallbackCaptionsAt=0;fallbackCaptionsBase=0;
  if(sync){sync.hidden=true;sync.textContent='⏱ Untertitel synchronisieren';}
  if(iframe){iframe.style.display='none';iframe.removeAttribute('src');}
  if(external)external.hidden=video.type!=='icloud';
 if(ytPlayer){try{ytPlayer.destroy();}catch{}ytPlayer=null;}el('youtubeTarget').style.display='none';videoEl.style.display='none';videoEl.pause();
 if(video.type==='youtube'){el('youtubeTarget').style.display='block';loadYouTube(video.id);}
 else if(video.type==='drive'||video.type==='upload'||video.type==='url'||video.type==='local'){
  videoEl.style.display='block';videoEl.muted=tvAutoplayMuted;videoEl.volume=state?.videoVolume??1;videoEl.src=video.type==='local'?tvLocalObjectURL:video.url;videoEl.load();fetchCaptions();
  // Drive direct MP4 behaves like a normal HTML5 video; no on-screen warnings.
 }
 else if(video.type==='icloud'){
  // iCloud share links are opened separately; do not cover the film with warnings.
  tvControlsVisible(true);
 }
 }
 if(state.video.type==='youtube'){
  if(ytPlayer){
   const cur=Number(ytPlayer.getCurrentTime())||0;
   if(Math.abs(cur-state.time)>3||lastRevision!==state.revision){try{ytPlayer.seekTo(state.time,true);}catch{}}
   try{
    if(tvAutoplayMuted)ytPlayer.mute();else ytPlayer.unMute();
    if(state.playing&&!tvSoundBlocked)ytPlayer.playVideo();
    else if(!state.playing)ytPlayer.pauseVideo();
   }catch{tvShowSoundPrompt();}
  }
 }else if(video.type==='icloud'||(video.type==='drive'&&el('cloudFrame')?.style.display==='block')){
  // Shared cloud viewers provide no reliable currentTime API; never send false video clocks.
  updateCaption();
 }else if(videoEl.src){
  videoEl.muted=tvAutoplayMuted;videoEl.volume=state?.videoVolume??1;
  const cur=videoEl.currentTime||0;
  if(Math.abs(cur-state.time)>2.2||lastRevision!==state.revision){try{videoEl.currentTime=state.time;}catch{}}
  if(state.playing&&videoEl.paused&&!tvSoundBlocked){
   try{
    const attempt=videoEl.play();
    if(attempt?.then)attempt.then(()=>{tvSoundBlocked=false;}).catch(()=>{
     tvAutoplayMuted=true;videoEl.muted=true;
     const second=videoEl.play();
     if(second?.then)second.then(()=>{
      tvSoundBlocked=false;
      const button=el('tvPlay');if(button)button.textContent='🔊 Ton mit OK einschalten';
      const overlay=el('tvFilmUnlock');if(overlay)overlay.hidden=true;
     }).catch(()=>tvShowSoundPrompt());
    });
   }catch{tvShowSoundPrompt();}
  }
  if(!state.playing&&!videoEl.paused)videoEl.pause();
 }
 lastRevision=state.revision;
 updateCaption();
}
function loadYouTube(id){
 if(window.YT&&window.YT.Player)return makeYouTube(id);
 const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.async=true;document.head.appendChild(s);
 window.onYouTubeIframeAPIReady=()=>makeYouTube(id);
}
function makeYouTube(id){
 if(!el('youtubeTarget')||role!=='tv')return;
 ytPlayer=new YT.Player('youtubeTarget',{
  videoId:id,
  playerVars:{rel:0,playsinline:1,enablejsapi:1,controls:1,origin:location.origin},
  events:{
   onReady:()=>{try{if(tvAutoplayMuted)ytPlayer.mute();else ytPlayer.unMute();}catch{}if(state?.phase==='film')ensureMedia();},
   onAutoplayBlocked:()=>{
    if(!tvAutoplayMuted){tvAutoplayMuted=true;try{ytPlayer.mute();ytPlayer.playVideo();}catch{tvShowSoundPrompt();}const b=el('tvPlay');if(b)b.textContent='🔊 Ton mit OK einschalten';const unlock=el('tvFilmUnlock');if(unlock)unlock.hidden=false;}
    else tvShowSoundPrompt();
   },
   onStateChange:e=>{if(e.data===1){tvSoundBlocked=false;}}
  }
 });
}
async function sendTick(playing,ended=false){if(role!=='tv'||!tvKey||state?.phase!=='film')return;
 if(state.video.type==='icloud'||(state.video.type==='local'&&(!tvLocalObjectURL||!tvLocalLoaded))||(state.video.type==='drive'&&el('cloudFrame')?.style.display==='block'))return;
 try{const t=state.video.type==='youtube'&&ytPlayer?ytPlayer.getCurrentTime():videoEl?.currentTime||0;await api('/api/tick','POST',{time:t,playing,ended},tvKey);}catch{}}
let fallbackCaptionsAt=0,fallbackCaptionsBase=0;
function updateCaption(){
 const node=el('captionLayer');if(!node)return;
 if(!state?.subtitles||!state?.captionsAvailable){node.style.display='none';return;}
 let pos=state.video.type==='youtube'&&ytPlayer?Number(ytPlayer.getCurrentTime())||0:videoEl?.currentTime||0;
 if(state.video.type==='drive'&&el('cloudFrame')?.style.display==='block'){
  // Drive's cross-origin preview does not expose its playback clock. Approximate only;
  // press the TV sync button at the actual beginning for better alignment.
  if(!fallbackCaptionsAt||!state.playing){node.style.display='none';return;}
  pos=fallbackCaptionsBase+(Date.now()-fallbackCaptionsAt)/1000;
 } else if(state.video.type==='icloud'){node.style.display='none';return;}

 const now=pos-(state.subtitleOffset||0),c=subtitles.find(v=>now>=v.start&&now<=v.end);
 node.textContent=c?.text||'';node.style.display=c?'block':'none';
 node.style.bottom=(state.captionPosition||11)+'%';
 node.style.fontSize='clamp(19px, '+((state.captionSize||100)/100*2.5).toFixed(2)+'vw, 49px)';
}
async function fetchCaptions(){try{const response=await fetch('/captions.vtt');if(!response.ok)return;subtitles=parseVTT(await response.text());}catch{}}
function parseVTT(txt){return txt.replace(/\r/g,'').split(/\n\n+/).map(block=>{const lines=block.split('\n'),i=lines.findIndex(x=>x.includes('-->'));if(i<0)return null;const times=lines[i].split('-->');const toSeconds=x=>{const v=x.trim().split(/[.:]/).map(Number);return v.length===4?v[0]*3600+v[1]*60+v[2]+v[3]/1000:v[0]*60+v[1]+(v[2]||0)/1000;};return{start:toSeconds(times[0]),end:toSeconds(times[1]),text:lines.slice(i+1).join('\n')};}).filter(Boolean);}
function handout(){
 const chapters=[
  ['01','Geschichte','Wie haben sich Touchscreens seit 1965 entwickelt?'],
  ['02','Funktionsweise','Was passiert, wenn ich den Bildschirm berühre?'],
  ['03','Touchscreen-Arten','Welche Touch-Techniken werden verwendet?'],
  ['04','Multitouch','Wozu dienen Zoomen, Wischen und Drehen?'],
  ['05','Alltag','Wo werden Touchscreens eingesetzt?'],
  ['06','Probleme & Zukunft','Was sind Herausforderungen und neue Ideen?'],
  ['07','Fazit','Was ist für mich besonders wichtig?'],
  ['08','Interaktives Quiz','Wie verständlich waren Quiz und Spiele?']
 ];
 const rows=chapters.map(([nr,title,help],i)=>'<tr><th scope="row"><span class="lf14TopicNumber">'+nr+'</span><b>'+esc(title)+'</b><small>'+esc(help)+'</small></th><td><select data-save="simpleRating'+i+'" aria-label="Verständnis: '+esc(title)+'"><option value="">Bitte wählen</option><option>Sehr gut</option><option>Gut</option><option>Teilweise</option><option>Noch unklar</option></select></td><td><textarea data-save="simpleNote'+i+'" rows="2" placeholder="Ein Stichwort oder ein Satz …" aria-label="Notiz zu '+esc(title)+'"></textarea></td></tr>').join('');
 const sheet='<article class="paper lf14SimpleSheet" id="paper"><header class="lf14SimpleHeader"><span class="eyebrow">FRIEDRICH-DESSAUER-SCHULE · LERNFELD 14</span><h2>TOUCHSCREEN <em>HANDOUT</em></h2><p>Eine Tabelle zu unserer interaktiven Dokumentation. Einfach auswählen und auf Wunsch kurze Stichwörter eintragen. <b>Keine Rechenaufgaben.</b></p></header><table class="lf14SimpleTable"><thead><tr><th style="width:36%">Thema</th><th style="width:23%">Verstanden?</th><th>Meine Notiz</th></tr></thead><tbody>'+rows+'</tbody></table><footer class="lf14SimpleFooter">TOUCH LIVE · Dokumentation, Quiz und Multitouch-Mission · 2026</footer></article>';
 wrap(page('Handout · Lernfeld 14','NUR EINE TABELLE · OHNE RECHNEN','Bewerte die acht Bereiche und notiere bei Bedarf ein Stichwort. Das Blatt lässt sich als PDF speichern.')+
  '<div class="flex noPrint lf14SimpleActions"><button type="button" class="primary" id="printHandout">📄 Als PDF speichern / drucken</button><button type="button" id="clearHandout">Tabelle zurücksetzen</button></div>'+sheet);
 el('printHandout').onclick=()=>window.print();
 el('clearHandout').onclick=()=>{
  if(!confirm('Alle Einträge in dieser Handout-Tabelle löschen?'))return;
  document.querySelectorAll('#paper [data-save]').forEach(x=>{localStorage.removeItem('touch_'+x.dataset.save);x.value='';});
 };
 document.querySelectorAll('#paper [data-save]').forEach(x=>{
  x.value=localStorage.getItem('touch_'+x.dataset.save)||'';
  x.oninput=()=>localStorage.setItem('touch_'+x.dataset.save,x.value);
 });
}
function setupCanvas(id){const c=el(id),ctx=c.getContext('2d');let drawing=false;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=2.5;ctx.strokeStyle='#123e58';const saved=localStorage.getItem('touch_'+id);if(saved){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0);img.src=saved;}
 function coords(e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};}
 c.onpointerdown=e=>{e.preventDefault();drawing=true;c.setPointerCapture(e.pointerId);const p=coords(e);ctx.beginPath();ctx.moveTo(p.x,p.y);};
 c.onpointermove=e=>{if(!drawing)return;e.preventDefault();const p=coords(e);ctx.lineTo(p.x,p.y);ctx.stroke();};c.onpointerup=()=>{drawing=false;try{localStorage.setItem('touch_'+id,c.toDataURL('image/png'));}catch{}};c.onpointercancel=c.onpointerup;}
function saveText(name,content){const a=document.createElement('a'),blob=new Blob([content],{type:'text/plain;charset=utf-8'});a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function copy(txt){if(navigator.clipboard?.writeText)navigator.clipboard.writeText(txt).then(()=>alert('Link kopiert')).catch(()=>prompt('Link kopieren:',txt));else prompt('Link kopieren:',txt);}
function router(){
 const h=location.hash.slice(1).split('?'),query=new URLSearchParams(h.slice(1).join('?'));
 const studentPath=location.pathname.replace(/\/+$/,'')==='/join';
 const controlPath=location.pathname.replace(/\/+$/,'')==='/control';
 // Redirect previously shared /#join links into a student-only entry with no navigation.
 if(['join','schueler','student'].includes(h[0])&&!studentPath){history.replaceState({},'',location.origin+'/join');}
  if(h[0]==='lehrer'){history.replaceState({},'',location.origin+'/#teacher');}
 if(studentPath&&location.hash)history.replaceState({},'',location.origin+'/join');
 role=controlPath?'control':(studentPath||['join','schueler','student'].includes(h[0]))?'join':h[0]==='lehrer'?'teacher':h[0]||'home';
 if(role==='remote'&&query.get('key')){remoteKey=query.get('key');sessionStorage.setItem('touch_cohost_key',remoteKey);history.replaceState({},'',location.pathname+'#remote');}
 if(role==='admin'&&query.get('key')){adminKey=query.get('key');sessionStorage.setItem('touch_admin_key',adminKey);history.replaceState({},'',location.pathname+'#admin');}
 if(role==='tv'&&query.get('key')){tvKey=query.get('key');sessionStorage.setItem('touch_tv_key',tvKey);localStorage.setItem('touch_tv_key',tvKey);history.replaceState({},'',location.pathname+'#tv');}
 if(role==='remote'){location.replace('/host'+(remoteKey?'?key='+encodeURIComponent(remoteKey):''));return;}
 document.body.classList.toggle('studentEntry',role==='join');
 if(role!=='join'&&role!=='teacher')document.body.classList.remove('touchStudent');
 renderSignature='';state=null;mediaType='';if(role==='admin'){showAdmin();loadAdminInfo();}else if(role==='control')controlPage();else if(role==='remote')remotePage();else if(role==='tv')tvView();else if(role==='handout')handout();else if(role==='join'||role==='teacher')userPage();else home();poll();}
async function loadAdminInfo(){if(!adminKey)return;try{
  adminInfo=await api('/api/admin-info','GET',undefined,adminKey);
  if(role==='admin'){showAdmin();recoverSharedMedia();}
 }catch(e){
  if(role!=='admin')return;
  if(/403|Zugang nicht erlaubt/i.test(e.message||'')){
   adminKey='';adminInfo=null;sessionStorage.removeItem('touch_admin_key');
   showAdmin();
   const input=el('adminPassword');if(input)input.placeholder='Neues Admin-Passwort eingeben';
  }else{const x=el('adminStatus');if(x)x.textContent='Admin-Verbindung fehlgeschlagen: '+e.message;}
 }
}
async function poll(force=false){
 if(role==='home'||role==='handout')return;
 try{
 const rp=role==='join'?'student':role==='teacher'?'teacher':role;
 const id=(rp==='student'||rp==='teacher')?(localStorage.getItem('touch_'+rp+'_id')||''):'';
 const next=await api('/api/state'+(id?'?id='+encodeURIComponent(id):''));const old=state;state=next;
 if((role==='join'||role==='teacher')&&next.player?.name&&next.player.name!==userName){
  userName=next.player.name;
  localStorage.setItem('touch_'+(role==='join'?'student':'teacher')+'_name',userName);
 }
 // A phone may start the film while this Spotify-connected PC is the music controller.
 // Stop any independent Spotify Connect audio so it cannot overlap film sound.
 if((role==='admin'||role==='control')&&old?.phase!=='film'&&next.phase==='film'&&next.playing&&window.SpotifyConnect?.connected?.()){
  window.SpotifyConnect.pauseForFilm().catch(()=>{});
 }
 if(role==='join'||role==='teacher'){const player=state.player||{};const q=state.quiz;const missionActive=q?.type==='zoom'||state.phase==='gesture'||state.sideGame==='gesture';const sig=[role,state.phase,state.sideGame||'',q?.id||'',player?.name||'',q?.accepting||false,missionActive?'mission-stable':player.choice,player.score,missionActive?'no-rerender':state.revision,missionActive?'no-participants-rerender':state.participants,JSON.stringify(player.jokers||{}),(player.hide||[]).join(),player.hint||'',missionActive?'no-results-rerender':JSON.stringify(state.zoomResult||'')].join('|');if(force||renderSignature!==sig){renderSignature=sig;userPage();participantMode();}else if(q){paintQuizTimer(q);if(q?.type==='zoom'&&easterInstance)easterInstance.update({remaining:q.remaining,found:!!state.player?.zoomFound,disabled:!q.accepting});}if((state.phase==='gesture'||state.sideGame==='gesture')&&fingerMissionInstance)fingerMissionInstance.update({remaining:state.gestureRemaining,disabled:state.gestureRemaining<=0});}
 if(role==='join')refreshStudentScoreBadge();
 if(role==='tv'){tvDisplay();
   const signal=Number(state.tvReloadRequest||0);
   if(window.__touchTVReloadSeen===undefined)window.__touchTVReloadSeen=signal;
   else if(window.__touchTVReloadSeen!==signal){window.__touchTVReloadSeen=signal;if(['welcome','end','handout'].includes(state.phase)){if(tvKey)localStorage.setItem('touch_tv_key',tvKey);location.reload();}}
  }
 if(role==='control'){
  if(el('controlTitle'))el('controlTitle').textContent=next.videoTitle||'TOUCHSCREEN – Interaktive Dokumentation';
  if(el('controlStatus'))el('controlStatus').textContent=(next.playing?'▶ Film läuft':'Ⅱ Film pausiert')+' · '+secText(next.time)+' · '+next.phase.toUpperCase()+' · '+next.participants+' Zuschauer';
  if(el('controlMusicTitle'))el('controlMusicTitle').textContent=next.welcomeMusic?.on?'♫ TOUCH-LIVE-Willkommensmusik AN – läuft auf LG in Dauerschleife.':'♫ LG-Willkommensmusik AUS. Du kannst sie ohne Spotify-Link starten.';
  document.querySelectorAll('[data-mobile-sound]').forEach(btn=>{const field=btn.dataset.mobileSound;const enabled=next.soundtrack?.[field]!==false;btn.dataset.enabled=String(enabled);btn.textContent=field==='pause'?(enabled?'♫ Pausenmusik AN':'♫ Pausenmusik AUS'):(enabled?'🏆 Ergebnismusik AN':'🏆 Ergebnismusik AUS');});
 }
 if(role==='remote'){const status=el('remoteStatus');if(status)status.textContent='Live: '+next.phase.toUpperCase()+' · '+secText(next.time)+' · '+next.participants+' Teilnehmende · '+(next.playing?'Video läuft':'Video pausiert');}
 if(role==='admin'){refreshAdminVideoControls();if(el('adminStatus'))el('adminStatus').textContent='Status: '+state.phase.toUpperCase()+' · Filmzeit: '+secText(state.time)+' · '+state.participants+' Teilnehmende · '+(state.video.type==='none'?'kein Film':state.video.type);if(el('adminParticipants'))el('adminParticipants').textContent=state.participants+' Teilnehmende';if(el('adminTime'))el('adminTime').textContent=secText(state.time);if(el('adminRanking')&&adminInfo){el('adminRanking').textContent='Live-Regie aktiv. Für vollständige Teilnehmerantworten nutze den Ergebnis-Modus.';}if(el('adminFeedback'))el('adminFeedback').textContent=String(state.feedbackCount);}
 }catch(e){const x=el('adminStatus');if(x)x.textContent='Verbindung unterbrochen: '+e.message;}
}
// Automatically use the newest published design on the TV without changing its link.
// Do not reload during the documentary, quiz, game or awards ceremony.
let tvBuildKnown='',tvPendingUpdate='',tvUpdateBusy=false;
async function refreshTvAppVersion(){
 if(role!=='tv'||tvUpdateBusy)return;
 tvUpdateBusy=true;
 try{
  const r=await fetch('/api/version',{cache:'no-store'});
  if(!r.ok)throw Error('Version nicht abrufbar');
  const {version}=await r.json();
  if(!version)return;
  if(!tvBuildKnown){tvBuildKnown=version;return;}
  if(tvBuildKnown!==version)tvPendingUpdate=version;
  const safe=!state||['welcome','end','handout'].includes(state.phase);
  if(tvPendingUpdate&&safe){
   // Save the TV key so refreshing does not require retyping it.
   if(tvKey)localStorage.setItem('touch_tv_key',tvKey);
   location.reload();
  }
 }catch{
  // If Render is restarting, retry automatically on the next cycle.
 }finally{tvUpdateBusy=false;}
}

window.addEventListener('hashchange',router);
router();setInterval(()=>{poll();},900);
setTimeout(refreshTvAppVersion,2000);
setInterval(refreshTvAppVersion,20000);
setInterval(()=>{if(role==='tv'&&state?.phase==='film'&&state.video.type!=='none')sendTick(state.playing);},1100);
setInterval(()=>{if(role==='tv'&&state?.video?.type==='local'&&tvLocalLoaded)announceLocalHDMI();},6000);
})();