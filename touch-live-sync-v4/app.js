
(function(){
'use strict';
const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const ORIGIN=location.origin+location.pathname, app=el('app');
let role='home',state=null,renderSignature='',userId='',userName='',adminKey=sessionStorage.getItem('touch_admin_key')||'',remoteKey=sessionStorage.getItem('touch_cohost_key')||'',tvKey=sessionStorage.getItem('touch_tv_key')||'';
let easterInstance=null;
let adminInfo=null,videoEl=null,ytPlayer=null,mediaType='',youtubeReady=false,playerReady=false,subtitles=[],lastFilmPhase='',lastRevision=-1,lastCaptionRevision=-1,gesturePointers=new Map(),gestureTransform={x:0,y:0,scale:1,rotate:0},gestureSnapshot=null;
const CH=['Geschichte der Touchscreens','Wie Touchscreens funktionieren','Fünf Touchscreen-Arten','Multitouch und Display','Touchscreens im Alltag','Probleme und Zukunft','Fazit und Abschlussquiz'];
const times=['04:28','06:29','10:28','12:40','16:12','20:18','24:39','26:42','30:33','32:42','35:32','39:01','44:22','45:37','46:46','47:56','49:06'];
async function api(url,method='GET',body,key=''){const opt={method,headers:{}};if(key)opt.headers['x-'+(role==='tv'?'tv':role==='remote'?'cohost':'admin')+'-key']=key;if(body!==undefined){opt.headers['Content-Type']='application/json';opt.body=JSON.stringify(body);}const r=await fetch(url,opt);let data={};try{data=await r.json();}catch{}if(!r.ok)throw Error(data.error||'Fehler '+r.status);return data;}
function wrap(body){app.innerHTML='<header class="nav wrap"><a class="logo" href="#home">TOUCH <span>LIVE</span></a><nav class="navlinks"><a href="#home">Start</a><a href="#join">Schüler</a><a href="#teacher">Lehrer</a><a href="#handout">Handout</a></nav></header><main class="wrap">'+body+'</main><footer>TOUCH LIVE · Friedrich-Dessauer-Schule Limburg · 2026</footer>';}
function page(title,tag,sub){return '<div class="page"><span class="eyebrow">'+tag+'</span><h1>'+title+'</h1><p>'+sub+'</p></div>';}
function home(){
wrap('<section class="hero homeHero"><div class="homeHeroCopy"><span class="eyebrow">DOKUMENTATION · TOUCHSCREEN · 2026</span><h1>Berühren.<br><em>Verstehen.</em><br>Mitmachen.</h1><p class="lead">Der Film läuft vorne auf dem Beamer. Auf deinem iPad erscheinen genau im richtigen Moment die Quizfragen, das Gesten-Spiel und am Ende die Ergebnisse.</p><div class="flex"><a href="#join" class="btn primary">Als Schüler teilnehmen</a><a href="#teacher" class="btn">Lehreransicht öffnen</a><a href="/watch" class="btn">🎬 Gemeinsam online schauen</a><a href="/easter-demo" class="btn">🔎 Easter Egg ausprobieren</a></div><p class="small">17 Fragen · 7 Kapitel · 1 echtes Wimmelbild-Spiel · Ohne Anmeldung</p></div><a class="homeHeroPreview" href="/easter-demo" title="Easter-Egg-Spiel kostenlos ausprobieren"><img src="/easter-scene.svg" alt="Illustriertes Bergpanorama mit dem geheimen Easter Egg – einer versteckten Katze" loading="eager"><span class="homePreviewTag">🎮 NEU · EASTER EGG SUCHEN <b>Testspiel öffnen</b></span></a></section><section class="cards"><div class="card"><span class="label">01 / WILLKOMMEN</span><h2>Alle sind dabei.</h2><p>Ein Link für die Klasse. Du gibst deinen Namen ein und wartest auf den Start.</p></div><div class="card"><span class="label">02 / LIVE</span><h2>Film & Mitmachen</h2><p>Solange der Film läuft, schaust du auf den Beamer. Bei den passenden Zeitmarken geht dein Quiz auf.</p></div><div class="card"><span class="label">03 / ABSCHLUSS</span><h2>Ergebnisse & Handout</h2><p>Am Ende gibt es eine gemeinsame Rangliste und ein Handout mit Apple-Pencil-Feld und PDF-Export.</p></div></section><section class="page"><span class="eyebrow">SIEBEN KAPITEL</span><h1>Von 1965 bis heute.</h1><div class="chapter-list">'+CH.map((v,i)=>'<div><b>0'+(i+1)+'</b>'+esc(v)+'</div>').join('')+'</div></section>');
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
function participantMode(){
 const on=(role==='join'||role==='teacher')&&!!userName;
 document.body.classList.toggle('touchStudent',on);
 if(!on)return;
 const main=document.querySelector('main.wrap');if(!main||el('participantFullscreen'))return;
 const bar=document.createElement('div');bar.className='participantFullBar';
 bar.innerHTML='<span class="small">TOUCH LIVE · LIVE-QUIZ</span><button id="participantFullscreen" class="participantFullBtn">⛶ Vollbild öffnen</button>';
 main.prepend(bar);
 el('participantFullscreen').onclick=()=>requestParticipantFullscreen();
}
function userPage(){
 const isTeacher=role==='teacher',userRole=isTeacher?'teacher':'student';
 const idKey='touch_'+userRole+'_id',nameKey='touch_'+userRole+'_name';
 userId=localStorage.getItem(idKey)||'';userName=localStorage.getItem(nameKey)||'';
 if(!userId||!userName){wrap(page(isTeacher?'Lehreransicht':'Schüleransicht',isTeacher?'LEHRER · MITMACHEN UND NOTIZEN':'SCHÜLER · LIVE QUIZ','Hier startet die gemeinsame Touchscreen-Präsentation.')+'<div class="card" style="max-width:550px"><h2>Willkommen bei TOUCH LIVE</h2><p>Gib deinen Anzeigenamen ein. Es ist kein Konto nötig.</p><form id="joinForm"><label>Dein Vorname oder Spitzname</label><input id="joinName" maxlength="26" required placeholder="Dein Name" autocomplete="nickname"><p></p><button class="primary">Teilnehmen</button></form></div>');el('joinForm').onsubmit=async e=>{e.preventDefault();requestParticipantFullscreen();try{const name=el('joinName').value.trim();const x=await api('/api/join','POST',{id:userId,name,role:userRole});localStorage.setItem(idKey,x.id);localStorage.setItem(nameKey,name);renderSignature='';await poll();}catch(err){alert(err.message);}};return;}
 if(!state){wrap(waiting('Verbindung wird hergestellt …','Die Präsentation wird geladen.'));participantMode();return;}
 const q=state.quiz,p=state.player||{},answered=q&&p.choice!==null&&p.choice!==undefined;
 let body='';
 if(state.phase==='welcome')body=waiting('Willkommen, '+esc(userName)+'!','Wir beginnen gleich. Bitte schaut auf den Beamer.','✦');
 else if(state.phase==='gesture')body='<div class="card"><div class="between"><span class="chip">KAPITEL 4 · SPIEL</span><div class="gestureNum" id="gestureValue">Zoom: 100 % · Drehung: 0°</div></div><h2>Gesten üben</h2><p>Zieh mich groß, dreh mich, schieb mich! Ein Finger verschiebt, zwei Finger zoomen und drehen.</p><div class="gestureBox" id="gestureBox"><div class="gesturePic" id="gesturePic">'+landscape()+'</div></div><div class="flex" style="margin-top:14px"><button id="gestureReset">Bild zurücksetzen</button></div></div>';
 else if(q&&q.type==='zoom')body=zoomCard(q,p,answered);
 else if(q){const hide=p.hide||[],jk=p.jokers||{},canJ=q.jokers&&q.accepting&&!answered;
  const jbar=q.jokers?'<div class="jokers">'+(jk.fifty?'':'<button class="joker" data-joker="fifty" '+(canJ?'':'disabled')+'>50:50</button>')+(jk.hint?'':'<button class="joker" data-joker="hint" '+(canJ?'':'disabled')+'>💡 Tipp</button>')+(jk.fifty&&jk.hint?'<span class="small">Alle Joker eingesetzt</span>':'<span class="small">Jeder Joker nur einmal im ganzen Abschlussquiz</span>')+'</div>':'';
  body='<div class="card quiz"><div class="between"><span class="chip">'+(q.jokers?'ABSCHLUSSQUIZ · ':'')+'FRAGE '+(q.index+1)+' / '+q.total+'</span><div id="liveTimer" class="timer">'+q.remaining+' s</div></div>'+jbar+'<h2>'+esc(q.q)+'</h2>'+(p.hint?'<div class="hintbox">💡 '+esc(p.hint)+'</div>':'')+'<div class="answers">'+q.a.map((v,i)=>'<button class="answer'+(answered&&p.choice===i?' chosen':'')+(hide.includes(i)?' gone':'')+'" data-choice="'+i+'" '+(answered||!q.accepting||hide.includes(i)?'disabled':'')+'><b>'+String.fromCharCode(65+i)+'</b><span>'+esc(v)+'</span></button>').join('')+'</div><p class="small" style="margin-top:17px">'+(answered?'Deine Antwort ist gespeichert. Ob sie richtig ist, erfahrt ihr erst ganz am Ende. Schau jetzt wieder auf den Beamer.':q.accepting?'Wähle eine Antwort. Jede Frage kann nur einmal beantwortet werden.':'Antwortzeit vorbei. Bitte wieder auf den Beamer schauen.')+'</p></div>';}
 else if(state.phase==='results'||state.phase==='end'||state.phase==='handout')body='<div class="card"><span class="eyebrow">ABSCHLUSS</span><h2>Danke für deine Rückmeldung!</h2><p>Dein Punktestand</p><div class="values">'+(p.score||0)+'</div>'+prizeCard()+zoomSolution()+'<h3>Gemeinsame Rangliste</h3>'+ranking()+'<div class="flex" style="margin-top:23px"><a href="#handout" class="btn primary">Handout ausfüllen & PDF speichern</a></div></div>';
 else body=waiting('Bitte auf den Beamer schauen.','Die Dokumentation läuft. Die nächste Frage erscheint automatisch.','◉');
 const notes=isTeacher?'<div class="card" style="margin-top:17px"><span class="label">LEHRER · PRIVAT</span><h2>Notizen zur Dokumentation</h2><p>Deine Notizen bleiben auf diesem Gerät und sind für Schüler nicht sichtbar.</p><textarea id="teacherNotes" rows="6" placeholder="Beobachtungen, Rückfragen, Feedback …">'+esc(localStorage.getItem('touch_teacher_notes')||'')+'</textarea><div class="flex" style="margin-top:12px"><button id="saveNotes">Notizen als Textdatei speichern</button></div></div>':'';
 wrap(page('Die Dokumentation läuft.',isTeacher?'LEHRER · LIVE MITMACHEN':'SCHÜLER · LIVE MITMACHEN','Teilnehmer: '+esc(userName)+' · '+(isTeacher?'Lehrer':'Schüler')+' · '+state.participants+' angemeldet')+body+notes);
 document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/api/answer','POST',{id:userId,choice:+b.dataset.choice});renderSignature='';await poll();}catch(e){alert(e.message);renderSignature='';await poll();}});
 document.querySelectorAll('[data-joker]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/api/joker','POST',{id:userId,type:b.dataset.joker});}catch(e){alert(e.message);}renderSignature='';await poll();});
 if(state.phase==='zoom')initEaster();
 if(isTeacher){el('teacherNotes').oninput=e=>localStorage.setItem('touch_teacher_notes',e.target.value);el('saveNotes').onclick=()=>saveText('TOUCH-LIVE-Lehrernotizen.txt',el('teacherNotes').value);}
 if(state.phase==='gesture')initGesture();
}
function zoomCard(q,p,answered){return '<section class="easter-live"><div class="between" style="margin-bottom:10px"><span class="chip">🎮 KAPITEL 4 · MULTITOUCH-CHALLENGE</span><span class="small">Bereits gefunden: '+(q.foundCount||0)+' von '+state.participants+'</span></div><div id="easterMount"></div><p class="small" style="margin-top:12px">'+(p.zoomFound?'🏆 Fund geschafft! Du hast die Touchscreen-Gesten angewendet. Dafür bekommst du '+(p.zoomPoints||0)+' Punkte.':!q.accepting?'Die Suche ist beendet. Wichtig: Pinch-to-Zoom, Pan und Tap sind echte Touchscreen-Gesten.':'Teste, was du in Kapitel 4 gelernt hast: mit zwei Fingern vergrößern, Bild verschieben und das versteckte Detail direkt antippen.')+'</p></section>';}
function initEaster(){
 const host=el('easterMount'),q=state?.quiz,p=state?.player;
 if(!host||!q||!window.EasterGame)return;
 easterInstance=window.EasterGame.mount(host,{
  remaining:q.remaining,found:!!p?.zoomFound,points:p?.zoomPoints,
  disabled:!q.accepting,
  onFind:async ({x,y,zoom})=>{
   if(!userId)throw Error('Bitte erst einen Namen eingeben.');
   const result=await api('/api/easter/find','POST',{id:userId,x,y,zoom});
   setTimeout(()=>{renderSignature='';poll(true);},1800);
   return result;
  }
 });
}
function canSvg(c1,c2,c3,label){return '<svg viewBox="0 0 90 170" width="64" height="120" aria-hidden="true"><defs><linearGradient id="cg'+label+'" x1="0" x2="1"><stop offset="0" stop-color="'+c1+'"/><stop offset=".45" stop-color="'+c2+'"/><stop offset="1" stop-color="'+c1+'"/></linearGradient></defs><rect x="8" y="14" width="74" height="146" rx="12" fill="url(#cg'+label+')"/><rect x="14" y="6" width="62" height="14" rx="6" fill="#c9d3db"/><rect x="8" y="58" width="74" height="46" fill="'+c3+'"/><text x="45" y="87" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" font-family="sans-serif">ENERGY</text></svg>';}
function prizeCard(){const r=state?.ranking||[];const w=r.length?r.filter(x=>x.score===r[0].score&&r[0].score>0):[];return '<div class="prize"><div class="cans">'+canSvg('#9fb3c8','#e8eef4','#1f3f8a','a')+canSvg('#1c1f22','#3a4045','#6ccb3a','b')+'</div><div><span class="eyebrow">DER PREIS</span><h3>Wer die meisten Punkte hat, bekommt ein Red Bull oder Monster!</h3><p>'+(w.length?'🏆 '+w.map(x=>esc(x.name)).join(' & ')+' · '+w[0].score+' Punkte':'Die Rangliste entscheidet.')+'</p></div></div>';}
function zoomSolution(){const z=state?.zoomResult;if(!z)return '';return '<div class="zoomsol"><div class="zoomsolPic">'+landscape()+'</div><div><span class="eyebrow">AUFLÖSUNG ZOOM-AUFGABE</span><h3>Im Fenster sitzt: '+esc(z.answer)+' 🐈</h3><p>'+z.found+' von '+z.total+' haben das Geheimnis gefunden.</p></div></div>';}
function landscape(){return '<svg viewBox="0 0 560 370" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#65c8ed"/><stop offset="1" stop-color="#e0f2fa"/></linearGradient></defs><rect width="560" height="370" fill="url(#sky)"/><circle cx="432" cy="82" r="44" fill="#ffd36c"/><path d="M0 245L123 89 240 242 350 126 560 276V370H0" fill="#6395a0"/><path d="M0 274L152 164 270 291 408 196 560 281V370H0" fill="#326b76"/><path d="M0 301Q190 250 330 306T560 296V370H0" fill="#69ae7b"/><rect x="240" y="239" width="98" height="82" fill="#f3d2a3"/><path d="M223 239L288 192 354 239Z" fill="#995649"/><rect x="279" y="269" width="24" height="52" fill="#755547"/><rect x="311" y="251" width="17" height="19" fill="#7bbce0"/><g transform="translate(314.5 256.2) scale(.33)"><path d="M6 30C6 22 9 17 14 15L13 6 18 11H24L29 6 28 15C33 17 36 22 36 30Z" fill="#2b2b33"/><circle cx="17" cy="20" r="1.6" fill="#ffd36c"/><circle cx="25" cy="20" r="1.6" fill="#ffd36c"/><path d="M36 28Q42 26 40 20" stroke="#2b2b33" stroke-width="2.4" fill="none"/></g><text x="300" y="333" font-size="2.4" fill="#5d4a3a" font-family="sans-serif">psst … gefunden? TOUCH 2026</text><path d="M1 343Q310 308 560 355" stroke="#dbeaa6" stroke-width="6" fill="none"/></svg>';}
function initGesture(){
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
function adminContents(){const a=adminInfo,student=ORIGIN+'#join',teacher=ORIGIN+'#teacher',tv=a?ORIGIN+'#tv?key='+encodeURIComponent(a.tvKey):'Admin wird verbunden';return '<div class="status" id="adminStatus">Verbindung zur Live-Sitzung wird geprüft …</div><div class="grid2"><div class="stack"><section class="card"><span class="label">01 / LIVE-REGIE</span><h2>Präsentation steuern</h2><div class="control"><button data-action="welcome">Willkommen</button><button class="primary" data-action="start">▶ Film starten</button><button data-action="pause">Ⅱ Pausieren</button><button data-action="play">▶ Weiter</button><button data-action="gestureStart">Gesten-Spiel starten</button><button data-action="gestureEnd">Spiel beenden</button><button data-action="demo">Testquiz starten</button><button data-action="demoNext">Nächste Testfrage</button><button data-action="results">Ergebnisse zeigen</button><button data-action="handout">Handout anzeigen</button><button data-action="end">Abschluss</button><button class="danger" data-action="reset">Zurücksetzen</button></div><label>Filmzeit manuell einstellen (in Sekunden)</label><div class="flex"><input id="seekTime" type="number" min="0" max="3107" value="268" style="max-width:170px"><button id="seekButton">Zur Zeit springen</button></div><p class="notice">Die 17 Quizfragen werden über die Film-Zeitmarken gesteuert. In der fertigen Doku gibt es Zeitfenster von 4:28 bis 49:56.</p></section><section class="card"><span class="label">02 / FILMQUELLE</span><h2>Film auswählen</h2><form id="youtubeForm"><label>YouTube-Link deines eigenen Films</label><input id="youtubeInput" placeholder="https://www.youtube.com/watch?v=..." type="url"><p></p><button class="primary">YouTube einbinden</button></form><div class="line"></div><form id="mp4Form"><label>Direkter MP4-Link (HTTPS)</label><input id="mp4Input" placeholder="https://.../touchscreen.mp4" type="url"><p></p><button>MP4-Link verwenden</button></form><div class="line"></div><label>Einmal hochladen – überall ansehen (MP4 bis 10 GB)</label><input type="file" id="bigFile" accept=".mp4,video/mp4"><p></p><button id="uploadButton" class="primary">Einmalig hochladen</button> <button id="useStoredVideo">Bereits hochgeladenen Film verwenden</button><p id="uploadInfo" class="small"></p><p id="cloudStorageState" class="notice">Prüfe dauerhaften Cloud-Speicher ...</p></section></div><div class="stack"><section class="card"><span class="label">03 / LINKS FÜR ALLE GERÄTE</span><h2>Deine vier Ansichten</h2><b>Beamer / LG-Fernseher</b><div class="linkbox" id="tvLink">'+esc(tv)+'</div><button id="copyTv">Beamerlink kopieren</button><div class="line"></div><b>Schüler – iPad</b><div class="linkbox" id="studentLink">'+esc(student)+'</div><button id="copyStudent">Schülerlink kopieren</button><div class="line"></div><b>Lehrer – iPad (mit Notizen)</b><div class="linkbox" id="teacherLink">'+esc(teacher)+'</div><button id="copyTeacher">Lehrerlink kopieren</button><p class="small">Der Admin-Link bleibt privat. Gib nur die Schüler- und Lehrerlinks weiter.</p></section><section class="card"><span class="label">04 / UNTERTITEL</span><h2>Text und Zeitmarken</h2><label>Untertitel für alle Geräte (.vtt oder .srt)</label><input type="file" id="subtitleFile" accept=".vtt,.srt,text/vtt,text/plain"><p></p><button id="uploadVtt">Untertitel speichern</button><label>Untertitel um Sekunden verschieben</label><div class="flex"><input id="subOffset" type="number" step=".5" value="'+(state?.subtitleOffset||0)+'" style="max-width:130px"><button id="saveSubOffset">Speichern</button></div><label>Quiz-Zeitmarken korrigieren (Sekunden)</label><div class="flex"><input id="quizOffset" type="number" step=".5" value="'+(state?.quizOffset||0)+'" style="max-width:130px"><button id="saveQuizOffset">Speichern</button></div><p class="small">Vorhandene VTT-Zeitcodes laufen mit dem Film mit. Vollautomatische Spracherkennung und Übersetzung benötigen einen separaten Dienst.</p></section><section class="card"><span class="label">05 / ERGEBNISSE</span><h2>Teilnahme & Übersicht</h2><div class="between"><span id="adminParticipants">0 Teilnehmende</span><span id="adminTime">00:00</span></div><div id="adminRanking" class="small">Ergebnisse erscheinen nach dem Quiz.</div><p class="small">Feedbackbögen wurden eingereicht: <span id="adminFeedback">0</span></p></section></div></div>';}
function bindAdmin(){
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{let cmd=b.dataset.action;if(cmd==='reset'&&!confirm('Alle Quizantworten und Punkte löschen?'))return;await adminAction(cmd);});
 el('seekButton').onclick=()=>adminAction('seek',{time:Number(el('seekTime').value)});
 el('youtubeForm').onsubmit=e=>{e.preventDefault();adminAction('videoYoutube',{url:el('youtubeInput').value});};
 el('mp4Form').onsubmit=e=>{e.preventDefault();adminAction('videoLink',{url:el('mp4Input').value});};
 el('copyTv').onclick=()=>copy(ORIGIN+'#tv?key='+encodeURIComponent(adminInfo?.tvKey||''));
 el('copyStudent').onclick=()=>copy(ORIGIN+'#join');
 el('copyTeacher').onclick=()=>copy(ORIGIN+'#teacher');
 el('saveSubOffset').onclick=()=>adminAction('captionOffset',{value:Number(el('subOffset').value)});
 el('saveQuizOffset').onclick=()=>adminAction('quizOffset',{value:Number(el('quizOffset').value)});
 el('uploadVtt').onclick=async()=>{try{const f=el('subtitleFile').files[0];if(!f)throw Error('Bitte zuerst .vtt oder .srt auswählen.');const result=await api('/api/vtt','POST',{vtt:await f.text(),name:f.name},adminKey);alert(result.durable?'Untertitel dauerhaft gespeichert – auf allen Geräten verfügbar.':'Untertitel geladen. Ohne Cloud-Speicher gehen sie bei einem Serverneustart verloren.');}catch(e){alert(e.message);}};
 el('uploadButton').onclick=uploadFilm;
 el('useStoredVideo').onclick=()=>adminAction('videoStored');
 const stylePanel=document.createElement('div');stylePanel.className='captionSettings';stylePanel.innerHTML='<div class="line"></div><span class="label">NETFLIX-STIL</span><h3>Untertitel ohne schwarzen Hintergrund</h3><label><input id="showCaptions" type="checkbox"> Untertitel auf Video anzeigen</label><label>Schriftgröße (70–160 %)</label><div class="flex"><input id="captionSize" type="range" min="70" max="160" step="5" value="100" style="max-width:240px"><span id="captionSizeValue">100 %</span><button id="captionSizeSave">Übernehmen</button></div><label>Abstand vom unteren Bildrand (5–25 %)</label><div class="flex"><input id="captionPosition" type="range" min="5" max="25" step="1" value="11" style="max-width:240px"><span id="captionPositionValue">11 %</span><button id="captionPositionSave">Übernehmen</button></div><p class="small">Weiße Schrift mit feiner dunkler Kontur – ohne schwarzen Balken, wie bei Streamingdiensten.</p>';
 el('uploadVtt').parentElement.appendChild(stylePanel);
 const setValues=()=>{el('showCaptions').checked=state?.subtitles!==false;el('captionSize').value=state?.captionSize||100;el('captionPosition').value=state?.captionPosition||11;el('captionSizeValue').textContent=el('captionSize').value+' %';el('captionPositionValue').textContent=el('captionPosition').value+' %';};setValues();
 el('showCaptions').onchange=()=>adminAction('subtitles',{value:el('showCaptions').checked});el('captionSize').oninput=()=>el('captionSizeValue').textContent=el('captionSize').value+' %';el('captionPosition').oninput=()=>el('captionPositionValue').textContent=el('captionPosition').value+' %';el('captionSizeSave').onclick=()=>adminAction('captionSize',{value:Number(el('captionSize').value)});el('captionPositionSave').onclick=()=>adminAction('captionPosition',{value:Number(el('captionPosition').value)});
 api('/api/storage/status').then(x=>{const n=el('cloudStorageState');if(n)n.textContent=x.configured?(x.videoReady?'Cloud-Speicher verbunden. Dein Film ist dauerhaft online gespeichert. Du kannst ihn auch nach einem Serverneustart wieder auswählen.':'Cloud-Speicher verbunden. MP4 einmal hochladen, danach auf allen Geräten nutzen.'):'Dauerhaftes Hochladen noch nicht aktiv: Einmalig S3- oder Cloudflare-R2-Speicher verbinden. Bis dahin kannst du einen YouTube-Link verwenden.';}).catch(()=>{const n=el('cloudStorageState');if(n)n.textContent='Cloud-Speicherstatus konnte nicht geladen werden.';});
 const cohost=adminInfo?.cohostKey;
 if(cohost){const panel=document.createElement('section');panel.className='card';panel.style.marginTop='18px';panel.innerHTML='<span class="label">ZWEITES GERÄT · CO-MODERATION</span><h2>Mit deiner Freundin gemeinsam steuern</h2><p>Dieser Link steuert die Sendung (Start, Pause, Ergebnisse), aber nicht die privaten Admin-Einstellungen.</p><div class="linkbox" id="friendLink"></div><button id="copyFriend">Mitsteuer-Link kopieren</button><p class="small">Privat weitergeben: Wer diesen Link besitzt, kann den Live-Ablauf steuern.</p>';el('adminRoot').appendChild(panel);const link=location.origin+'/host?key='+encodeURIComponent(cohost);el('friendLink').textContent=link;el('copyFriend').onclick=()=>copy(link);}
 const zc=document.createElement('section');zc.className='card';zc.style.marginTop='18px';
 zc.innerHTML='<span class="label">KAPITEL 4 / ZOOM-AUFGABE</span><h2>Zoom-Spiel im Quiz</h2><p>Startet automatisch an der Filmstelle (Standard 23:35, im Fragen-Editor als „K4Z“ änderbar). Der Film pausiert, Schüler und Lehrer zoomen und antworten, danach geht der Film weiter.</p><div class="control"><button id="zoomGo" class="primary">Zoom-Aufgabe jetzt starten</button><button id="zoomStop">Weiter mit dem Film</button></div>';
 el('adminRoot').appendChild(zc);el('zoomGo').onclick=()=>adminAction('zoomStart');el('zoomStop').onclick=()=>adminAction('zoomEnd');
 const at=document.createElement('section');at.className='card';at.style.marginTop='18px';
 at.innerHTML='<span class="label">NUR FÜR DICH</span><h2>Antworten der Teilnehmenden</h2><p class="small">Lösungen, Punkte und Joker sieht nur der Admin. Aktualisiert sich alle 4 Sekunden.</p><div id="adminAnswers" style="overflow-x:auto"></div>';
 el('adminRoot').appendChild(at);renderAdminAnswers();clearInterval(window.__aaT);window.__aaT=setInterval(async()=>{if(role!=='admin')return;try{adminInfo=await api('/api/admin-info','GET',undefined,adminKey);renderAdminAnswers();}catch{}},4000);
 const timeline=document.createElement('section');timeline.className='card';timeline.style.marginTop='18px';
 timeline.innerHTML='<span class="label">06 / TIMELINE</span><h2>Quizfragen bearbeiten</h2><p>Fragetext, Antworten, Start- und Endzeit lassen sich hier als JSON anpassen.</p><textarea id="timelineJson" rows="9"></textarea><button id="timelineSave" class="primary">Fragen speichern</button><p id="timelineResult" class="small"></p>';
 el('adminRoot').appendChild(timeline);
 el('timelineJson').value=JSON.stringify(adminInfo?.questions||[],null,2);
 el('timelineSave').onclick=async()=>{try{const questions=JSON.parse(el('timelineJson').value);const r=await api('/api/questions','POST',{questions},adminKey);el('timelineResult').textContent=r.count+' Fragen gespeichert.';}catch(e){el('timelineResult').textContent='Fehler: '+e.message;}};

}
function renderAdminAnswers(){const box=el('adminAnswers');if(!box||!adminInfo)return;const Qs=adminInfo.questions||[],R=adminInfo.ranking||[];let n=0;
 if(!R.length){box.innerHTML='<p class="small">Noch niemand angemeldet.</p>';return;}
 const head=Qs.map(q=>'<th title="'+esc(q.q)+'">'+(q.type==='zoom'?'Zoom':++n)+'</th>').join('');
 box.innerHTML='<table class="rank adminTable"><thead><tr><th>Name</th><th>Punkte</th>'+head+'<th>Joker</th></tr></thead><tbody>'+R.map(u=>'<tr><td>'+esc(u.name)+(u.role==='teacher'?' · L':'')+'</td><td>'+u.score+'</td>'+Qs.map(q=>{const c=u.answers[q.id];return '<td>'+(c===undefined?'·':(c===q.correct?'✓':'✗')+String.fromCharCode(65+c))+'</td>';}).join('')+'<td>'+[u.jokers&&u.jokers.fifty?'50:50':'',u.jokers&&u.jokers.hint?'Tipp':''].filter(Boolean).join(', ')+'</td></tr>').join('')+'</tbody></table>';}
function remotePage(){
 if(!remoteKey){wrap(page('Mitsteuerung','ZWEITES GERÄT · REGIE','Dieser Bereich ist nur für eine eingeladene Person.')+'<div class="card"><label>Mitsteuer-Code</label><input id="remoteCode" type="password"><p></p><button class="primary" id="remoteUnlock">Verbinden</button></div>');el('remoteUnlock').onclick=()=>{remoteKey=el('remoteCode').value;sessionStorage.setItem('touch_cohost_key',remoteKey);remotePage();};return;}
 const controls=[['welcome','Willkommen anzeigen'],['start','▶ Sendung starten'],['pause','Ⅱ Film pausieren'],['play','▶ Film fortsetzen'],['zoomStart','Gesten-Spiel starten'],['zoomEnd','Gesten-Spiel beenden'],['demo','Testquiz starten'],['demoNext','Nächste Testfrage'],['results','🏆 Top 3 zeigen'],['handout','Handout anzeigen'],['end','Danke / Abschlussbild']];
 wrap(page('Co-Regie','ZWEITES GERÄT · TOUCH LIVE','Gemeinsame Live-Steuerung auf Handy, iPad oder PC.')+'<div class="card"><h2>Live-Sendung steuern</h2><div id="remoteStatus" class="status">Verbinde mit der Präsentation …</div><div class="control">'+controls.map(([c,l])=>'<button data-remote="'+c+'">'+l+'</button>').join('')+'</div><label>Filmzeit einstellen (Sekunden)</label><div class="flex"><input id="remoteSeek" type="number" value="0" min="0" max="3107" style="max-width:160px"><button id="remoteSeekGo">Springen</button></div><p class="notice">Beide Controller wirken auf dieselbe Präsentation. Der Film läuft nur auf dem Beamer.</p></div>');
 document.querySelectorAll('[data-remote]').forEach(x=>x.onclick=()=>remoteAction(x.dataset.remote));el('remoteSeekGo').onclick=()=>remoteAction('seek',{time:Number(el('remoteSeek').value)});
}
async function remoteAction(cmd,args={}){try{await api('/api/remote','POST',{cmd,...args},remoteKey);await poll(true);}catch(e){alert('Steuerung fehlgeschlagen: '+e.message);}}
async function adminAction(cmd,args={}){try{await api('/api/admin','POST',{cmd,...args},adminKey);await poll(true);}catch(e){alert(e.message);}}
async function uploadFilm(){
 const file=el('bigFile')?.files?.[0],btn=el('uploadButton'),info=el('uploadInfo');
 if(!file)return alert('Bitte deine MP4-Datei auswählen.');
 if(!/\.mp4$/i.test(file.name))return alert('Bitte eine MP4-Datei auswählen.');
 if(file.size>10*1024**3)return alert('Die Datei darf höchstens 10 GB groß sein.');
 btn.disabled=true;
 const uploadKey='touch-live-s3-upload-'+file.name+'-'+file.size+'-'+file.lastModified;
 try{
  const status=await api('/api/storage/status');
  if(!status.configured)throw Error('Dauerhafter Cloud-Speicher fehlt. Einmalig einen S3- oder R2-Bucket mit dem Server verbinden. Alternativ kannst du schon jetzt YouTube als zentrale Videoquelle verwenden.');
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
 finally{btn.disabled=false;}
}
function secText(n){n=Math.max(0,Math.floor(Number(n)||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function tvView(){
 if(!tvKey){app.innerHTML='<div class="wrap page"><h1>Beamer verbinden</h1><p>Bitte den Beamerlink aus der Admin-Ansicht öffnen.</p><label>Beamer-Zugangsschlüssel</label><input type="password" id="tvInput"><p></p><button class="primary" id="tvSubmit">Verbinden</button></div>';el('tvSubmit').onclick=()=>{tvKey=el('tvInput').value;sessionStorage.setItem('touch_tv_key',tvKey);tvView();};return;}
 app.innerHTML='<div id="tvApp"><div id="tvScene" class="tvScene"></div><div class="videoLayer" id="videoLayer" style="display:none"><video id="tvVideo" playsinline preload="metadata"></video><div id="youtubeTarget" style="display:none"></div><div id="captionLayer" class="captionLayer" style="display:none"></div></div><div class="tvUnlock"><button id="tvPlay">▶ Wiedergabe freigeben</button><button id="tvFullscreen">⛶ Vollbild</button></div><div class="tvBroadcastHud" id="tvBroadcastHud" style="display:none"><div class="tvBroadcastTop"><strong>TOUCH <span>LIVE</span></strong><span id="tvChapterLabel">Kapitel 1 · Geschichte</span><span id="tvClockLabel">00:00 / 51:47</span></div><div class="tvBroadcastTrack"><div id="tvProgressBar"></div></div></div><div class="tvFooter">TOUCH LIVE · Beamer</div></div>';
 videoEl=el('tvVideo');el('tvPlay').onclick=()=>{playerReady=true;if(mediaType==='youtube'&&ytPlayer){try{ytPlayer.unMute();ytPlayer.playVideo();}catch{}}else if(videoEl){videoEl.muted=false;videoEl.play().catch(()=>{});}};el('tvFullscreen').onclick=()=>el('tvApp').requestFullscreen?.().catch(()=>{});
 videoEl.addEventListener('timeupdate',()=>{updateCaption();});videoEl.addEventListener('ended',()=>{if(state?.phase==='film')sendTick(false,true);});
}
function tvScene(html){const node=el('tvScene');if(node&&node.__h!==html){node.innerHTML=html;node.__h=html;}}
function tvDisplay(){
 if(!state||role!=='tv'||!el('tvScene'))return;
 const phase=state.phase;const videoMode=phase==='film';
 const hud=el('tvBroadcastHud');if(hud){hud.style.display=videoMode&&state.video?.type!=='none'?'block':'none';if(videoMode){const starts=[120,564,855,1304,1702,2060,2634];let chapter=1;starts.forEach((t,i)=>{if(state.time>=t)chapter=i+1;});if(el('tvChapterLabel'))el('tvChapterLabel').textContent='KAPITEL '+chapter+' / 7 · '+(CH[chapter-1]||'Touchscreen');if(el('tvClockLabel'))el('tvClockLabel').textContent=secText(state.time)+' / 51:47';if(el('tvProgressBar'))el('tvProgressBar').style.width=(Math.min(100,state.time/3107*100))+'%';}}
 const layer=el('videoLayer');if(layer)layer.style.display=videoMode&&state.video.type!=='none'?'block':'none';
 const scene=el('tvScene');
 if(phase==='welcome'){scene.style.display='flex';tvScene('<div class="welcomeArtwork"><div><span class="eyebrow">LERNFELD 14 · INTERAKTIVE DOKUMENTATION</span><h1>TOUCH<em>SCREEN</em></h1><p>Geschichte, Technik und Zukunft – gemeinsam entdecken.</p><p class="welcomePrompt">Öffnet den Schülerlink auf eurem iPad. Gleich geht es los!</p></div><img src="/touchscreen-motiv.svg" alt="Leuchtender Touchscreen mit Berührungswellen"></div>');pauseTV();}
 else if(phase==='gesture'){scene.style.display='flex';tvScene('<div><span class="eyebrow">KAPITEL 04 / MULTITOUCH</span><h1><em>Gesten üben.</em></h1><p>Auf den iPads verschieben, vergrößern und drehen!</p></div>');pauseTV();}
 else if(phase==='zoom'){scene.style.display='flex';const q=state.quiz;tvScene('<div class="egg-projector"><div><span class="eyebrow">KAPITEL 04 · MULTITOUCH LIVE-EXPERIMENT</span><h1>Die <em>Touch-Challenge!</em></h1><p>So funktioniert Multitouch in der Praxis: Vergrößert das digitale Bild mit zwei Fingern, verschiebt es und tippt auf das versteckte Easter Egg.</p><div class="egg-tv-counter"><strong>'+(q?q.remaining:0)+' s</strong><span>⏱ Zeit übrig<br>🔎 '+(q?q.foundCount:0)+' von '+state.participants+' haben das Easter Egg gefunden</span></div><p class="small" style="margin-top:22px">Pinch-to-Zoom = zwei Finger auseinanderziehen · Pan = verschieben · Tap = antippen.</p></div><img class="egg-tv-art" src="/easter-scene.svg" alt="Panorama mit Berghütte als Easter-Egg-Spiel"></div>');pauseTV();}
 else if(phase==='demo'){scene.style.display='flex';tvScene('<div><span class="eyebrow">LIVE-QUIZ · PROBELAUF</span><h1>Frage '+(state.quiz?.index+1||'')+'</h1><h2>'+esc(state.quiz?.q||'Bereit für die erste Frage?')+'</h2><p>Antwortet auf euren iPads · '+(state.quiz?.remaining||0)+' Sekunden</p></div>');pauseTV();}
 else if(phase==='results'){scene.style.display='flex';tvScene('<div class="resultshow podiumScene"><span class="eyebrow">TOUCH LIVE · DIE GROSSE SIEGEREHRUNG</span><h1>Das sind eure <em>Top 3!</em></h1>'+podium()+'<p class="podiumFoot">Herzlichen Glückwunsch! · '+state.participants+' Teilnehmende</p></div>');pauseTV();}
 else if(phase==='handout'){scene.style.display='flex';tvScene('<div class="endArtwork"><img src="/touchscreen-motiv.svg" alt="Touchscreen"><div><span class="eyebrow">LERNFELD 14 · ZUM ABSCHLUSS</span><h1>Jetzt seid <em>ihr</em> dran!</h1><p>Öffnet das Handout auf eurem iPad. Tragt eure Lösungen ein und berechnet die Bewertung.</p></div></div>');pauseTV();}
 else if(phase==='end'){scene.style.display='flex';tvScene('<div class="endArtwork"><img src="/touchscreen-motiv.svg" alt="Touchscreen"><div><span class="eyebrow">TOUCH LIVE · LERNFELD 14</span><h1>Vielen Dank für eure <em>Aufmerksamkeit!</em></h1><p>Das war meine Präsentation über Touchscreens.</p><p class="closingLine">Ich hoffe, es hat euch gefallen – habt ihr noch Fragen?</p></div></div>');pauseTV();}
 else if(phase==='film'){if(state.video.type==='none'){scene.style.display='flex';tvScene('<div><span class="eyebrow">FILMQUELLE NOCH NICHT GEWÄHLT</span><h1>TOUCH <em>LIVE</em></h1><p>Wähle zuerst im Adminbereich deinen Film oder nutze den Testquiz-Modus.</p></div>');}else scene.style.display='none';ensureMedia();}
 lastFilmPhase=phase;
}
function pauseTV(){try{videoEl?.pause();if(ytPlayer)ytPlayer.pauseVideo();}catch{}}
function ensureMedia(){
 if(!state||role!=='tv'||state.phase!=='film')return;
 const video=state.video,ref=video.type+':'+video.url;
 if(state.captionsAvailable&&lastCaptionRevision!==state.captionsRevision){lastCaptionRevision=state.captionsRevision;fetchCaptions();}
 if(ref!==mediaType){mediaType=ref;subtitles=[];lastRevision=-1;
 if(ytPlayer){try{ytPlayer.destroy();}catch{}ytPlayer=null;}el('youtubeTarget').style.display='none';videoEl.style.display='none';videoEl.pause();
 if(video.type==='youtube'){el('youtubeTarget').style.display='block';loadYouTube(video.id);}
 else if(video.type==='upload'||video.type==='url'){videoEl.style.display='block';videoEl.src=video.url;videoEl.load();fetchCaptions();}
 }
 if(state.video.type==='youtube'){if(ytPlayer){const cur=Number(ytPlayer.getCurrentTime())||0;if(Math.abs(cur-state.time)>3||lastRevision!==state.revision){try{ytPlayer.seekTo(state.time,true);}catch{}}try{state.playing?ytPlayer.playVideo():ytPlayer.pauseVideo();}catch{}}}
 else if(videoEl.src){const cur=videoEl.currentTime||0;if(Math.abs(cur-state.time)>2.2||lastRevision!==state.revision){try{videoEl.currentTime=state.time;}catch{}}if(state.playing&&videoEl.paused)videoEl.play().catch(()=>{});if(!state.playing&&!videoEl.paused)videoEl.pause();}
 lastRevision=state.revision;
 updateCaption();
}
function loadYouTube(id){
 if(window.YT&&window.YT.Player)return makeYouTube(id);
 const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.async=true;document.head.appendChild(s);
 window.onYouTubeIframeAPIReady=()=>makeYouTube(id);
}
function makeYouTube(id){if(!el('youtubeTarget')||role!=='tv')return;ytPlayer=new YT.Player('youtubeTarget',{videoId:id,playerVars:{rel:0,playsinline:1,enablejsapi:1,controls:1,origin:location.origin},events:{onReady:()=>{if(state?.phase==='film')ensureMedia();}}});}
async function sendTick(playing,ended=false){if(role!=='tv'||!tvKey||state?.phase!=='film')return;try{const t=state.video.type==='youtube'&&ytPlayer?ytPlayer.getCurrentTime():videoEl?.currentTime||0;await api('/api/tick','POST',{time:t,playing,ended},tvKey);}catch{}}
function updateCaption(){
 const node=el('captionLayer');if(!node)return;
 if(!state?.subtitles||!state?.captionsAvailable){node.style.display='none';return;}
 const pos=state.video.type==='youtube'&&ytPlayer?Number(ytPlayer.getCurrentTime())||0:videoEl?.currentTime||0;
 const now=pos-(state.subtitleOffset||0),c=subtitles.find(v=>now>=v.start&&now<=v.end);
 node.textContent=c?.text||'';node.style.display=c?'block':'none';
 node.style.bottom=(state.captionPosition||11)+'%';
 node.style.fontSize='clamp(19px, '+((state.captionSize||100)/100*2.5).toFixed(2)+'vw, 49px)';
}
async function fetchCaptions(){try{const response=await fetch('/captions.vtt');if(!response.ok)return;subtitles=parseVTT(await response.text());}catch{}}
function parseVTT(txt){return txt.replace(/\r/g,'').split(/\n\n+/).map(block=>{const lines=block.split('\n'),i=lines.findIndex(x=>x.includes('-->'));if(i<0)return null;const times=lines[i].split('-->');const toSeconds=x=>{const v=x.trim().split(/[.:]/).map(Number);return v.length===4?v[0]*3600+v[1]*60+v[2]+v[3]/1000:v[0]*60+v[1]+(v[2]||0)/1000;};return{start:toSeconds(times[0]),end:toSeconds(times[1]),text:lines.slice(i+1).join('\n')};}).filter(Boolean);}
function handout(){
 const weights=[25,25,20,15,10,5],criteria=['Inhalte verständlich erklärt','Dokumentation und Bilder','Quizfragen & Interaktion','Multitouch-Spiel','Sprache und Tempo','Nutzen des Handouts'];
 const scoreRows=criteria.map((name,i)=>'<tr><td>'+esc(name)+'</td><td>'+weights[i]+' %</td><td><input type="number" min="0" max="10" step="1" data-save="rate'+(i+1)+'" data-score="'+i+'" aria-label="Bewertung '+esc(name)+'"></td><td><output id="part'+i+'">–</output></td></tr>').join('');
 const html='<div class="paper" id="paper"><div class="lf14Head"><div><span>Friedrich-Dessauer-Schule · HBFS Informationstechnik · Lernfeld 14</span><h2>Handout: Touchscreens</h2><span>Begleitblatt zur Dokumentation – Geschichte, Funktionsweise und Einsatz</span></div></div><h3>1. Ein kurzer Blick in die Geschichte</h3><div class="lf14Timeline"><div><b>1965</b> E. A. Johnson</div><div><b>1972</b> Bent Stumpe</div><div><b>1983</b> HP-150</div><div><b>1994</b> IBM Simon</div><div><b>2007</b> iPhone</div></div><h3>2. So funktioniert ein Touchscreen</h3><div class="lf14Cards"><div><b>Sensor</b><span>Misst die Veränderung der Berührung, z. B. der elektrischen Kapazität.</span></div><div><b>Controller</b><span>Ermittelt die Position und sendet sie an das Betriebssystem.</span></div><div><b>Display</b><span>Zeigt das Bild mit einzelnen Pixeln an.</span></div></div><p>Kapazitiv: elektrische Veränderung · Resistiv: Druck auf zwei Schichten · Infrarot: Unterbrechung von Lichtstrahlen. <b>Multitouch</b> bedeutet, mehrere Finger gleichzeitig zu erkennen.</p><h3>3. Kleine Rechenaufgabe</h3><p>Ein vereinfachtes Modell eines kapazitiven Sensors nutzt die Formel für einen Plattenkondensator:</p><div class="lf14Formula"><strong>C = ε₀ · εᵣ · A / d</strong><p><b>C</b> = Kapazität (F), <b>ε₀</b> = 8,854 · 10⁻¹² F/m, <b>εᵣ</b> = relative Permittivität, <b>A</b> = Fläche (m²), <b>d</b> = Abstand (m). Reale Touchsensoren sind komplexer.</p></div><div class="lf14Quiz"><b>Rechenaufgabe</b><p>Gegeben: εᵣ = 3 · A = 1 cm² (= 0,0001 m²) · d = 1 mm (= 0,001 m). Berechne die Kapazität in <b>pF</b>. Tipp: 1 pF = 10⁻¹² F.</p><div class="flex"><input type="number" min="0" max="1000" step=".01" data-save="capAnswer" id="capAnswer" placeholder="Dein Ergebnis in pF" style="max-width:200px"><button id="checkCap" class="noPrint">Ergebnis prüfen</button><span id="capMessage" class="small"></span></div><label>Rechenweg / Begründung</label><textarea data-save="capWork" placeholder="Formel einsetzen und Rechenschritte notieren …"></textarea></div><h3>4. Frage zum Nachdenken</h3><p>Warum funktioniert ein normaler Handschuh oft nicht auf einem Smartphone?</p><textarea data-save="hAnswer1" placeholder="Deine Antwort …"></textarea><div class="lf14Footer">TOUCH LIVE · Lernfeld 14 · Seite 1 / 2</div><div class="pageBreak"><div class="lf14Head"><div><span>Lernfeld 14 · Touchscreen-Dokumentation · Seite 2</span><h2>Feedbackbogen</h2><span>Bitte ehrlich bewerten. Dein Name wird nicht übertragen.</span></div></div><h3>5. Feedback zur Präsentation</h3><p>Bewerte die folgenden Bereiche von <b>0 bis 10</b> Punkten. Die Prozentwerte zeigen, wie stark die einzelnen Bereiche in die Gesamtbewertung eingehen. Rechne die Teilwerte aus oder lass sie hier automatisch berechnen.</p><div class="lf14Hint"><b>Formel:</b> Teilwert = Bewertung × Gewichtung ÷ 100.<br><b>Gesamtwert:</b> Summe aller sechs Teilwerte (maximal 10 Punkte).<br>Beispiel: 8 Punkte × 25 ÷ 100 = <b>2,00 Punkte</b>.</div><table class="lf14Score"><thead><tr><th>Bewertungsbereich</th><th>Gewicht</th><th>0–10</th><th>Teilwert</th></tr></thead><tbody>'+scoreRows+'<tr><td><b>Gesamt</b></td><td><b>100 %</b></td><td colspan="2">Alle Zeilen ausfüllen</td></tr></tbody></table><div class="lf14Total"><span>Deine Gesamtbewertung</span><strong id="weightedTotal">– / 10</strong></div><h3>6. Was hat dir gefallen?</h3><div class="paperGrid"><div><label>Das fand ich gut:</label><textarea data-save="feedbackGood" placeholder="Meine Meinung …"></textarea></div><div><label>Das würde ich verändern:</label><textarea data-save="feedbackImprove" placeholder="Mein Verbesserungsvorschlag …"></textarea></div></div><h3>7. Platz für Notizen</h3><canvas class="drawCanvas" id="draw2" width="840" height="210"></canvas><p class="thin">Hier kannst du etwas notieren oder mit dem Apple Pencil schreiben. Deine Notizen bleiben auf diesem Gerät.</p><div class="lf14Footer">TOUCH LIVE · Lernfeld 14 · Seite 2 / 2 · Danke fürs Mitmachen!</div></div></div>';
 wrap(page('Handout · Lernfeld 14','EINTRAGEN · RECHNEN · ALS PDF SPEICHERN','Zwei übersichtliche Seiten für Lernfeld 14 mit Fragen, Rechenaufgabe und Bewertungsbogen.')+'<div class="flex noPrint" style="margin:0 0 22px"><button class="primary" id="printHandout">Als PDF speichern / drucken</button><button id="clearDrawing">Stiftzeichnungen löschen</button><button id="sendFeedback">Anonymes Feedback absenden</button></div>'+html);
 el('printHandout').onclick=()=>window.print();
 el('clearDrawing').onclick=()=>{if(confirm('Handschrift löschen?')){localStorage.removeItem('touch_draw2');const c=el('draw2');c.getContext('2d').clearRect(0,0,c.width,c.height);}};
 document.querySelectorAll('[data-save]').forEach(x=>{x.value=localStorage.getItem('touch_'+x.dataset.save)||'';x.oninput=()=>{localStorage.setItem('touch_'+x.dataset.save,x.value);if(x.dataset.score!==undefined)updateWeighted();};});
 function updateWeighted(){let sum=0,valid=true;weights.forEach((w,i)=>{const input=el('paper').querySelector('[data-score="'+i+'"]');const raw=input.value.trim();const num=Number(raw),okay=raw!==''&&Number.isFinite(num)&&num>=0&&num<=10;const part=el('part'+i);part.textContent=okay?(num*w/100).toFixed(2).replace('.',','):'–';if(okay)sum+=num*w/100;else valid=false;});el('weightedTotal').textContent=valid?sum.toFixed(2).replace('.',',')+' / 10':'– / 10';return valid?sum:null;}
 updateWeighted();
 el('checkCap').onclick=()=>{const raw=el('capAnswer').value;const val=Number(raw);el('capMessage').textContent=raw===''?'Trage zuerst ein Ergebnis ein.':Math.abs(val-2.6562)<=.08?'Richtig! Etwa 2,66 pF.':'Noch einmal prüfen: Flächen- und Abstandseinheiten beachten.';};
 setupCanvas('draw2');
 el('sendFeedback').onclick=async()=>{const score=updateWeighted();if(score===null)return alert('Bitte alle sechs Bewertungsfelder (0 bis 10) ausfüllen.');try{await api('/api/feedback','POST',{rating:score,text:'GUT: '+(localStorage.getItem('touch_feedbackGood')||'')+'\nVERBESSERUNG: '+(localStorage.getItem('touch_feedbackImprove')||'')});alert('Danke! Deine anonyme Bewertung wurde gesendet.');}catch(e){alert('Feedback konnte nicht gesendet werden: '+e.message);}};
}
function setupCanvas(id){const c=el(id),ctx=c.getContext('2d');let drawing=false;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=2.5;ctx.strokeStyle='#123e58';const saved=localStorage.getItem('touch_'+id);if(saved){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0);img.src=saved;}
 function coords(e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};}
 c.onpointerdown=e=>{e.preventDefault();drawing=true;c.setPointerCapture(e.pointerId);const p=coords(e);ctx.beginPath();ctx.moveTo(p.x,p.y);};
 c.onpointermove=e=>{if(!drawing)return;e.preventDefault();const p=coords(e);ctx.lineTo(p.x,p.y);ctx.stroke();};c.onpointerup=()=>{drawing=false;try{localStorage.setItem('touch_'+id,c.toDataURL('image/png'));}catch{}};c.onpointercancel=c.onpointerup;}
function saveText(name,content){const a=document.createElement('a'),blob=new Blob([content],{type:'text/plain;charset=utf-8'});a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function copy(txt){if(navigator.clipboard?.writeText)navigator.clipboard.writeText(txt).then(()=>alert('Link kopiert')).catch(()=>prompt('Link kopieren:',txt));else prompt('Link kopieren:',txt);}
function router(){const h=location.hash.slice(1).split('?'),query=new URLSearchParams(h.slice(1).join('?'));role=h[0]||'home';
 if(role==='remote'&&query.get('key')){remoteKey=query.get('key');sessionStorage.setItem('touch_cohost_key',remoteKey);history.replaceState({},'',location.pathname+'#remote');}
 if(role==='admin'&&query.get('key')){adminKey=query.get('key');sessionStorage.setItem('touch_admin_key',adminKey);history.replaceState({},'',location.pathname+'#admin');}
 if(role==='tv'&&query.get('key')){tvKey=query.get('key');sessionStorage.setItem('touch_tv_key',tvKey);history.replaceState({},'',location.pathname+'#tv');}
 if(role==='remote'){location.replace('/host'+(remoteKey?'?key='+encodeURIComponent(remoteKey):''));return;}
 if(role!=='join'&&role!=='teacher')document.body.classList.remove('touchStudent');
 renderSignature='';state=null;mediaType='';if(role==='admin'){showAdmin();loadAdminInfo();}else if(role==='remote')remotePage();else if(role==='tv')tvView();else if(role==='handout')handout();else if(role==='join'||role==='teacher')userPage();else home();poll();}
async function loadAdminInfo(){if(!adminKey)return;try{adminInfo=await api('/api/admin-info','GET',undefined,adminKey);if(role==='admin')showAdmin();}catch(e){if(role==='admin'){const x=el('adminStatus');if(x)x.textContent='Admin-Verbindung fehlgeschlagen: '+e.message;}}}
async function poll(force=false){
 if(role==='home'||role==='handout')return;
 try{
 const rp=role==='join'?'student':role==='teacher'?'teacher':role;
 const id=(rp==='student'||rp==='teacher')?(localStorage.getItem('touch_'+rp+'_id')||''):'';
 const next=await api('/api/state'+(id?'?id='+encodeURIComponent(id):''));const old=state;state=next;
 if(role==='join'||role==='teacher'){const player=state.player||{};const q=state.quiz;const sig=[role,state.phase,q?.id||'',q?.accepting||false,player.choice,player.score,state.revision,state.participants,JSON.stringify(player.jokers||{}),(player.hide||[]).join(),player.hint||'',JSON.stringify(state.zoomResult||'')].join('|');if(force||renderSignature!==sig){renderSignature=sig;userPage();participantMode();}else if(q){if(el('liveTimer'))el('liveTimer').textContent=q.remaining+' s';if(state.phase==='zoom'&&easterInstance)easterInstance.update({remaining:q.remaining,found:!!state.player?.zoomFound,points:state.player?.zoomPoints});}}
 if(role==='tv'){tvDisplay();}
 if(role==='remote'){const status=el('remoteStatus');if(status)status.textContent='Live: '+next.phase.toUpperCase()+' · '+secText(next.time)+' · '+next.participants+' Teilnehmende · '+(next.playing?'Video läuft':'Video pausiert');}
 if(role==='admin'){if(el('adminStatus'))el('adminStatus').textContent='Status: '+state.phase.toUpperCase()+' · Filmzeit: '+secText(state.time)+' · '+state.participants+' Teilnehmende · '+(state.video.type==='none'?'kein Film':state.video.type);if(el('adminParticipants'))el('adminParticipants').textContent=state.participants+' Teilnehmende';if(el('adminTime'))el('adminTime').textContent=secText(state.time);if(el('adminRanking')&&adminInfo){el('adminRanking').textContent='Live-Regie aktiv. Für vollständige Teilnehmerantworten nutze den Ergebnis-Modus.';}if(el('adminFeedback'))el('adminFeedback').textContent=String(state.feedbackCount);}
 }catch(e){const x=el('adminStatus');if(x)x.textContent='Verbindung unterbrochen: '+e.message;}
}
window.addEventListener('hashchange',router);
router();setInterval(()=>{poll();},900);
setInterval(()=>{if(role==='tv'&&state?.phase==='film'&&state.video.type!=='none')sendTick(state.playing);},1100);
})();