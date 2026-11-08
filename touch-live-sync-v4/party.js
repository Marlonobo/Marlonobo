(function(){
'use strict';
const host=location.pathname==='/host';
const $=id=>document.getElementById(id);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyStore='touch_party_host_key',idStore='touch_party_'+(host?'host':'viewer')+'_id',nameStore='touch_party_'+(host?'host':'viewer')+'_name';
const fromUrl=new URL(location.href).searchParams.get('key');
let key=fromUrl||sessionStorage.getItem(keyStore)||'';
if(fromUrl){sessionStorage.setItem(keyStore,key);history.replaceState({},'',location.pathname);}
let state=null,participantId=localStorage.getItem(idStore)||'',participantName=localStorage.getItem(nameStore)||'';
let screenSignature='',quizSignature='',sourceRef='',activated=false,ytPlayer=null,ytReady=false,ytVideoId='',ytApiLoading=false,localRevision=-1,lastCaptionRevision=-1,initialMediaSyncPending=false,lastAppliedSeekSerial=null,seekCommandBusy=false;
let easterInstance=null,fingerMissionInstance=null,cloudFallback=false;
const partyModeKey='touch_party_view_mode_'+(host?'host':'viewer');
let partyViewMode=localStorage.getItem(partyModeKey)==='auto'?'auto':localStorage.getItem(partyModeKey)==='side'?'side':(host?'side':'auto');
let lastFocusKey='',lastFocusTransition=0;
const onlineVideo=()=>state?.video?.type==='local'?(state.remoteVideo||{type:'none',id:null,url:null}):(state?.video||{type:'none',id:null,url:null});
function updatePartyViewMode(){
 const toggle=$('partyModeToggle'),stage=$('partyMain'),note=$('partyModeStatus');
 if(!stage||!state)return;
 const q=state.quiz,questionActive=state.phase==='zoom'||state.phase==='gesture'||state.phase==='demo'||state.sideGame==='gesture'||(state.phase==='film'&&!!q?.accepting);
 stage.classList.toggle('partyAutoQuizFocus',partyViewMode==='auto'&&questionActive);
 if(toggle){toggle.setAttribute('aria-pressed',String(partyViewMode==='auto'));toggle.textContent=partyViewMode==='auto'?'✓ Automatischer Wechsel: EIN':'Automatischer Wechsel: AUS';}
 if(note){
  const source=onlineVideo();
  if(state.video?.type==='local'&&source.type==='none')note.textContent='⚠ Die HDMI-MP4 bleibt lokal. Für andere Städte muss die Regie zusätzlich ein Online-Video hinterlegen. Quiz und Spiele funktionieren trotzdem.';
  else if(questionActive)note.textContent='🎮 '+(q?.type==='zoom'?'Zoom-Spiel':state.phase==='gesture'?'Gesten-Spiel':'Quizfrage')+' läuft · '+(q?.remaining??'')+' s · '+(partyViewMode==='auto'?'Antworten im Vordergrund':'Quiz rechts/unten öffnen');
  else note.textContent=partyViewMode==='auto'?'🎬 Schau auf den Film · beim Quiz wird automatisch gewechselt.':'🎬 Film und Quiz bleiben auf derselben Seite sichtbar.';
 }
 const focusKey=questionActive?'q:'+(q?.id||state.phase):'film';
 if(partyViewMode!=='auto'){lastFocusKey=focusKey;return;}
 if(lastFocusKey===focusKey)return;
 const wasQuestion=lastFocusKey.startsWith('q:');
 lastFocusKey=focusKey;lastFocusTransition++;
 if(!questionActive&&!wasQuestion)return;
 const transition=lastFocusTransition;
 // On one device the quiz must be accessible even if the viewer chose fullscreen.
 // Native iOS fullscreen may still require leaving fullscreen manually.
 if(questionActive){
  try{if(document.fullscreenElement){document.exitFullscreen?.().catch?.(()=>{});}}catch{}
  try{if(video?.webkitDisplayingFullscreen)video.webkitExitFullscreen?.();}catch{}
 }
 setTimeout(()=>{
  if(partyViewMode!=='auto'||transition!==lastFocusTransition)return;
  const target=questionActive?(participantId?'partyInteraction':'participant'):'partyScreen';
  const element=$(target);if(!element)return;
  try{element.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}catch{element.scrollIntoView();}
 },120);
}
function setupPartyViewMode(){
 const panel=$('partyModePanel');if(panel)panel.hidden=false;
 const toggle=$('partyModeToggle');
 if(toggle)toggle.onclick=()=>{
  partyViewMode=partyViewMode==='auto'?'side':'auto';
  localStorage.setItem(partyModeKey,partyViewMode);
  lastFocusKey='';lastFocusTransition++;
  if(state)updatePartyViewMode();
 };
 const copy=$('partyCopyQuiz');
 if(copy)copy.onclick=()=>{
  const link=location.origin+'/join';
  const copied=()=>{copy.textContent='✓ Quiz-Link kopiert';};
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(copied).catch(()=>prompt('Quiz-Link für das zweite Gerät:',link));
  else prompt('Quiz-Link für das zweite Gerät:',link);
 };
}

let captions=[],watchCaptionsEnabled=localStorage.getItem('touch_live_watch_cc')!=='off',gesturePoints=new Map(),gestureState={x:0,y:0,scale:1,rotation:0},gestureOrigin=null;
const video=$('partyVideo'),container=$('partyYoutube'),screen=$('partyScene'),capt=$('partyCaption'),playBtn=$('partyEnable');
function updateCaptionPreference(){
 const toggle=$('partyCaptionToggle');
 if(toggle){toggle.textContent=watchCaptionsEnabled?'CC Untertitel AUS':'CC Untertitel AN';toggle.setAttribute('aria-pressed',String(watchCaptionsEnabled));}
 if(!watchCaptionsEnabled)capt.hidden=true;
 if(!watchCaptionsEnabled&&ytPlayer&&ytReady){try{ytPlayer.setOption?.('captions','track',{});}catch{}}
}

video.addEventListener('error',()=>{
 if(state?.video?.type!=='drive'||video.getAttribute('src')!==state.video.url)return;
 cloudFallback=true;const frame=$('partyDrivePreview');if(frame){frame.src=state.video.previewUrl||state.video.shareUrl;frame.hidden=false;}
 updateScene();showError('Google Drive öffnet die Vorschau. Sie kann nicht automatisch zur Quiz-Zeit synchronisiert werden; dafür einen direkten MP4-Link oder YouTube nutzen.');
});
let errorTimer=null,pollInFlight=false,tickInFlight=false,rejoinBusy=false,lastRejoinAt=0,ytWarnedShortId='',tapBusy=false,tapNoticeTimer=null;
function showError(msg){const e=$('partyError');e.hidden=false;e.textContent=msg;clearTimeout(errorTimer);errorTimer=setTimeout(()=>e.hidden=true,10500);}
async function api(path,body,authenticated=false){
 const headers={'Content-Type':'application/json'};
 if(authenticated)headers['X-Cohost-Key']=key;
 const r=await fetch(path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 let o={};try{o=await r.json();}catch{}
 if(!r.ok)throw Error(o.error||'Server antwortet mit '+r.status);
 return o;
}
let rosterBusy=false,rosterLastAt=0;
async function refreshHostRoster(force=false){
 if(!host||!key||rosterBusy||(!force&&Date.now()-rosterLastAt<3500))return;
 rosterBusy=true;rosterLastAt=Date.now();
 try{
  const data=await api('/api/host/participants',undefined,true);
  const box=$('partyRoster'),status=$('partyRosterStatus');
  if(!box||!data?.ok)return;
  const people=data.players||[],questions=data.questions||[];
  if(status)status.textContent=people.length?
   people.filter(p=>p.online).length+' gerade verbunden · '+people.length+' insgesamt angemeldet · privat nur in deiner Regie':
   'Noch niemand angemeldet. Schicke deiner Freundin den Quiz-Link /join.';
  if(!people.length){box.innerHTML='<p class="small">Noch niemand angemeldet. Namen erscheinen hier automatisch.</p>';return;}
  box.innerHTML='<div class="partyRosterScroll"><table class="partyRosterTable"><thead><tr><th>Teilnehmer</th><th>Richtig</th><th>Falsch</th><th>Antworten</th><th>Punkte</th></tr></thead><tbody>'+
   people.map(p=>'<tr><td><span class="partyOnlineDot '+(p.online?'isOnline':'isOffline')+'" aria-hidden="true"></span><strong>'+safe(p.name)+'</strong><small>'+(p.online?' online':' offline')+'</small></td><td>'+p.correct+'</td><td>'+p.wrong+'</td><td>'+p.answered+' / '+questions.length+'</td><td><b>'+p.score+'</b></td></tr>').join('')+
   '</tbody></table></div><div class="partyRosterDetails">'+people.map(p=>
    '<details><summary>'+safe(p.name)+' · Einzelantworten ('+p.correct+' richtig / '+p.wrong+' falsch)</summary><div class="partyAnswerChips">'+
    questions.map(q=>{const a=(p.answers||[]).find(z=>z.id===q.id),v=a?.status||'unanswered';
     return '<div class="partyAnswerStatus '+v+'" title="'+safe(q.text)+'"><strong>'+safe(q.id)+'</strong><span>'+(v==='correct'?'✓ Richtig':v==='wrong'?'✗ Falsch':'– Noch offen')+(a?.choice!==null&&a?.choice!==undefined?' · '+String.fromCharCode(65+Number(a.choice)):'')+'</span></div>';
    }).join('')+'</div></details>').join('')+'</div>';
 }catch(e){const status=$('partyRosterStatus');if(status)status.textContent='Teilnehmerliste konnte nicht geladen werden: '+e.message;}
 finally{rosterBusy=false;}
}
function sec(n){n=Math.max(0,Math.floor(Number(n)||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function renderScene(html){
 if(screenSignature===html)return;
 screenSignature=html;
 screen.innerHTML=html;
}
function slide(title,subtitle,extra=''){
 return '<div class="partySceneInner"><img src="/touchscreen-motiv.svg" alt="Touchscreen-Motiv"><h2>'+title+'</h2><p>'+subtitle+'</p>'+extra+'</div>';
}
function podium(){
 const people=state?.ranking||[];
 const podiumCard=(pos)=>{
 const p=people[pos-1];return '<div class="partyPodi"><div style="font-size:27px">'+(pos===1?'👑':pos===2?'🥈':'🥉')+'</div><strong>'+(p?safe(p.name):'Noch offen')+'</strong><small>'+(p?p.score+' Punkte':'')+'</small><div class="rise">'+pos+'</div></div>';
 };
 return '<div class="partySceneInner partyWinners"><span class="eyebrow">ABSCHLUSSQUIZ · SIEGEREHRUNG</span><h2>Unsere Top 3!</h2><div class="partyCountdown" aria-hidden="true"><span>3</span><span>2</span><span>1</span></div><div class="partyPodium">'+podiumCard(2)+podiumCard(1)+podiumCard(3)+'</div><p class="partyWinnersFoot">Herzlichen Glückwunsch! 🏆</p></div>';
}
function updateTapToggle(){
 const button=$('partyTapToggle');
 if(!button)return;
 const source=onlineVideo();
 const visible=host&&!!key&&state?.phase==='film'&&['youtube','url','upload'].includes(source.type);
 button.hidden=!visible;button.disabled=tapBusy;
 if(!visible)return;
 const playing=state.playing===true;
 button.setAttribute('aria-label',playing?'Film pausieren':'Film an derselben Stelle fortsetzen');
 button.setAttribute('aria-pressed',String(!playing));
 button.title=playing?'Auf den Film klicken: pausieren':'Auf den Film klicken: an derselben Stelle fortsetzen';
 const hint=button.querySelector('.partyTapHint');
 if(hint)hint.textContent=playing?'Ⅱ Zum Pausieren tippen':'▶ Zum Fortsetzen tippen';
}
function showTapFeedback(message){
 const node=$('partyTapFeedback');if(!node)return;
 node.textContent=message;node.hidden=false;
 clearTimeout(tapNoticeTimer);
 tapNoticeTimer=setTimeout(()=>{node.hidden=true;},1000);
}
async function toggleHostFilmByClick(){
 if(!host||!key||tapBusy||!state||state.phase!=='film')return;
 const source=onlineVideo();
 if(!['youtube','url','upload'].includes(source.type))return;
 const pos=playerTime();
 const time=Number.isFinite(pos)&&pos>=0?Math.round(pos*100)/100:Math.round((Number(state.time)||0)*100)/100;
 const pauseNow=state.playing===true;
 tapBusy=true;updateTapToggle();
 try{
  if(pauseNow){
   // Immediately stop the host player; relay the exact paused frame to all devices.
   if(source.type==='youtube'){if(ytPlayer&&ytReady)ytPlayer.pauseVideo();}
   else if(!video.paused)video.pause();
   showTapFeedback('Ⅱ Pause · '+sec(time));
   const ok=await hostCommand('pause',{time});
   if(!ok)await poll();
  }else{
   // Initiate playback from the actual button gesture (mobile autoplay rule).
   activated=true;
   if(source.type==='youtube'){
    if(ytPlayer&&ytReady){try{ytPlayer.unMute();ytPlayer.playVideo();}catch{}}
   }else{
    video.muted=false;
    try{
     const p=video.play();
     if(p?.catch)p.catch(()=>{activated=false;playBtn.hidden=false;showError('Bitte „Film mit Ton aktivieren“ antippen.');});
    }catch{activated=false;playBtn.hidden=false;}
   }
   showTapFeedback('▶ Weiter · '+sec(time));
   const ok=await hostCommand('play',{time});
   if(!ok){
    if(source.type==='youtube'){try{ytPlayer?.pauseVideo();}catch{}}
    else{try{video.pause();}catch{}}
    await poll();
   }
  }
 }catch(e){showError('Videosteuerung fehlgeschlagen: '+e.message);}
 finally{tapBusy=false;updateTapToggle();}
}
function updateScene(){
 if(!state)return;
 const phase=state.phase,source=onlineVideo(),haveVideo=source.type!=='none';
 updateTapToggle();
 const film=phase==='film'&&haveVideo&&source.type!=='local';
 screen.hidden=film;
 video.hidden=!film||source.type==='youtube'||source.type==='icloud'||(source.type==='drive'&&cloudFallback);
 container.hidden=!film||source.type!=='youtube';
 const driveFrame=$('partyDrivePreview'),iCloudBox=$('partyCloudExternal');
 if(driveFrame)driveFrame.hidden=!(film&&source.type==='drive'&&cloudFallback);
 if(iCloudBox)iCloudBox.hidden=!(film&&source.type==='icloud');
 if(iCloudBox&&film&&source.type==='icloud')$('partyCloudLink').href=source.shareUrl||source.url;
 // Buffering is not an autoplay failure; do not cover the screen on BUFFERING=3.
 playBtn.hidden=!(film&&source.type!=='icloud'&&!(source.type==='drive'&&cloudFallback)&&!activated);
 const resyncButton=$('partyResync');if(resyncButton)resyncButton.hidden=!(film&&!host&&['youtube','url','upload'].includes(source.type));
 if(film){screenSignature='';return;}
 let html='';
 if(phase==='welcome')html=slide('Willkommen bei TOUCH LIVE','Die Dokumentation startet, sobald die Moderatorin bereit ist.','<small>Gemeinsam schauen und mitspielen – egal von welchem Ort.</small>');
 else if(phase==='film'&&state.video?.type==='local')html=slide('Film läuft am HDMI-PC','Die lokale MP4 wird nicht ins Internet übertragen. Die Regie kann eine nicht gelistete YouTube-Version oder eine direkte Online-MP4 für Zuschauer in anderen Städten eintragen.','<small>Quiz und Spiele funktionieren hier weiterhin · oder auf /join.</small>');
 else if(phase==='film')html=slide('Noch keine Online-Filmquelle','Die Regie kann einen nicht gelisteten YouTube-Link oder eine direkt erreichbare MP4 eintragen.','<small>Die Bildübertragung erfordert eine Online-Videoquelle.</small>');
 else if(phase==='gesture')html=slide('Multitouch trainieren!','Verschieben, Vergrößern und Drehen – das Spiel läuft rechts.');
 else if(phase==='zoom')html='<div class="partySceneInner egg-broadcast"><span class="eyebrow">KAPITEL 4 · MULTITOUCH-PRAXIS</span><h2>Multitouch-Challenge!</h2><img src="/easter-scene.svg" alt="Berglandschaft mit versteckter Katze"><p>Genauso wie in der Doku: Vergrößern mit zwei Fingern, Bild verschieben und das versteckte Detail antippen.</p><strong>'+(state.quiz?.remaining||0)+' Sekunden · '+(state.quiz?.foundCount||0)+' gefunden</strong></div>';
 else if(phase==='demo')html=slide('Quiz-Probelauf','Die Frage erscheint auf beiden Geräten.','<small>Testet jetzt gleichzeitig eure Antworten.</small>');
 else if(phase==='results')html=podium();
 else if(phase==='handout')html=slide('Handout · Lernfeld 14','Jetzt das Handout ausfüllen und die Bewertung berechnen.');
 else if(phase==='end')html=slide('Vielen Dank für eure Aufmerksamkeit!','Das war meine interaktive Dokumentation über Touchscreens.','<small>Ich hoffe, es hat euch gefallen.</small>');
 else html=slide('TOUCH LIVE','Gemeinsam lernen und spielen.');
 renderScene(html);
 stopPlayback();
}
function stopPlayback(){try{if(!video.paused)video.pause();if(ytPlayer&&ytPlayer.pauseVideo)ytPlayer.pauseVideo();}catch{}}
function playerTime(){
 try{const source=onlineVideo();if(source.type==='youtube')return ytPlayer&&ytReady?Number(ytPlayer.getCurrentTime())||0:null;
 if(source.type==='upload'||source.type==='url'||(source.type==='drive'&&!cloudFallback))return video.readyState>0&&Number.isFinite(video.currentTime)?video.currentTime:null;}catch{}
 return null;
}
function ytLoad(){
 if(window.YT?.Player){createYt();return;}
 if(ytApiLoading)return;ytApiLoading=true;
 const tag=document.createElement('script');tag.async=true;tag.src='https://www.youtube.com/iframe_api';tag.onerror=()=>{ytApiLoading=false;showError('YouTube konnte nicht geladen werden. Prüfe die Internetverbindung.');};
 document.head.appendChild(tag);window.onYouTubeIframeAPIReady=()=>{ytApiLoading=false;createYt();};
}
function createYt(){
 if(!window.YT?.Player||!ytVideoId||!$('partyYoutube'))return;
 const slot=document.createElement('div');slot.id='partyYTEmbed';container.replaceChildren(slot);
 try{
 ytPlayer=new window.YT.Player('partyYTEmbed',{videoId:ytVideoId,playerVars:{autoplay:0,playsinline:1,controls:0,rel:0,cc_load_policy:0,enablejsapi:1,origin:location.origin},
 events:{
   onReady:()=>{ytReady=true;updateCaptionPreference();syncMovie(true);},
   onAutoplayBlocked:()=>{activated=false;playBtn.hidden=false;showError('YouTube benötigt auf diesem Gerät einmal einen Klick auf „Film mit Ton aktivieren“.');},
   onError:e=>showError('YouTube-Video kann hier nicht eingebettet werden (Fehler '+e.data+'). Nutze ein einbettbares Video oder MP4.'),
   onStateChange:e=>{
    if(host&&e.data===1&&state?.phase==='film'){
     const dur=Number(ytPlayer?.getDuration?.())||0;
     if(dur>0&&dur<2781&&ytWarnedShortId!==ytVideoId){
      ytWarnedShortId=ytVideoId;
      showError('Dieses YouTube-Video ist nur '+sec(dur)+' lang. Die TOUCH-LIVE-Quizfragen reichen bis 46:21. Bitte prüfe, ob du die vollständige Dokumentation verlinkt hast.');
     }
    }
    if(host&&e.data===0&&state?.phase==='film')sendHostTick(true);
   }
  }});
 }catch(e){showError('YouTube konnte nicht geöffnet werden: '+e.message);}
}
function syncMovie(force=false){
 if(!state||state.phase!=='film'||['none','local'].includes(onlineVideo().type)){stopPlayback();updateScene();return;}
 updateScene();
 const v=onlineVideo(),ref=v.type+':'+(v.url||v.id);
 if(state.captionsAvailable&&lastCaptionRevision!==state.captionsRevision){lastCaptionRevision=state.captionsRevision;loadCaptions();}
 if(ref!==sourceRef){
 sourceRef=ref;localRevision=-1;cloudFallback=false;initialMediaSyncPending=true;lastAppliedSeekSerial=null;
  const iframe=$('partyDrivePreview');if(iframe){iframe.hidden=true;iframe.removeAttribute('src');}
 if(ytPlayer){try{ytPlayer.destroy();}catch{}ytPlayer=null;ytReady=false;}
 video.pause();video.removeAttribute('src');video.load();
 if(v.type==='youtube'){ytVideoId=v.id||'';ytLoad();}
 else if(v.type==='icloud'){ytVideoId='';container.replaceChildren();updateScene();showError('iCloud-Link öffnen: Freigabelinks bieten keine direkte automatische Video-/Quiz-Synchronisierung.');}
 else{ytVideoId='';container.replaceChildren();video.src=v.url;video.load();loadCaptions();}
 }
 const serverPos=Number(state.time)||0,seekSerial=Number(state.seekSerial)||0;
 // A quiz, game, subtitle or status revision must NEVER seek the video.
 // Only initial joining and intentional presenter seeks/starts are applied.
 const alignTime=initialMediaSyncPending||(lastAppliedSeekSerial!==null&&seekSerial!==lastAppliedSeekSerial);
 if(v.type==='youtube'){
  if(!ytPlayer||!ytReady)return;
  try{
   const local=Number(ytPlayer.getCurrentTime())||0;
   if(alignTime&&Math.abs(local-serverPos)>1.25)ytPlayer.seekTo(serverPos,true);
   initialMediaSyncPending=false;lastAppliedSeekSerial=seekSerial;
   const ytState=Number(ytPlayer.getPlayerState());
   if(state.playing){
    if(!activated)ytPlayer.mute();else ytPlayer.unMute();
    // BUFFERING=3: repeated playVideo calls would create a stutter loop.
    if(ytState!==1&&ytState!==3)ytPlayer.playVideo();
   }else if(ytState===1||ytState===3)ytPlayer.pauseVideo();
  }catch{}
 }else if(v.type==='icloud'||(v.type==='drive'&&cloudFallback)){
  // No readable video clock in the provider viewer; never send fake timestamps.
 }else{
  if(video.readyState>0){
   if(alignTime&&Math.abs((video.currentTime||0)-serverPos)>1.25){
    try{video.currentTime=serverPos;}catch{}
   }
   initialMediaSyncPending=false;lastAppliedSeekSerial=seekSerial;
  }
  if(state.playing&&video.paused&&video.readyState>0){if(!activated)video.muted=true;video.play().catch(()=>{activated=false;$('partyEnable').hidden=false;});}
  if(!state.playing&&!video.paused)video.pause();
 }
 localRevision=state.revision;
 updateCaptions();
}
function subtitleTime(text){const a=text.trim().split(':');let secs=0;for(const part of a)secs=secs*60+Number(part.replace(',','.'));return secs;}
function vttParse(txt){
 return txt.replace(/\r/g,'').split(/\n\n+/).map(block=>{const lines=block.split('\n');const index=lines.findIndex(x=>x.includes('-->'));if(index<0)return null;const times=lines[index].split('-->');return{start:subtitleTime(times[0]),end:subtitleTime(times[1]),text:lines.slice(index+1).join('\n').replace(/<[^>]*>/g,'')}}).filter(Boolean);
}
async function loadCaptions(){try{const r=await fetch('/captions.vtt',{cache:'no-store'});captions=r.ok?vttParse(await r.text()):[];}catch{captions=[];}}
function updateCaptions(){
 if(!state?.subtitles||!watchCaptionsEnabled||!captions.length){capt.hidden=true;return;}
 const time=playerTime();if(time===null){capt.hidden=true;return;}
 const x=captions.find(c=>time-(state.subtitleOffset||0)>=c.start&&time-(state.subtitleOffset||0)<=c.end);
 capt.textContent=x?.text||'';capt.hidden=!x;
 capt.style.bottom=(state.captionPosition||11)+'%';
 capt.style.fontSize='clamp(17px,'+((state.captionSize||100)/100*1.8).toFixed(2)+'vw,35px)';
}
function landscape(){
 return '<svg viewBox="0 0 560 370" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bs" x2="0" y2="1"><stop stop-color="#74cbed"/><stop offset="1" stop-color="#d6f7fc"/></linearGradient></defs><rect width="560" height="370" rx="17" fill="url(#bs)"/><circle cx="448" cy="86" r="43" fill="#ffe17b"/><path d="M0 255L100 124 221 264 360 110 560 275V370H0" fill="#75a9a8"/><path d="M0 302L160 191 282 307 390 202 560 305V370H0" fill="#4a887f"/><path d="M0 320Q240 260 560 334V370H0" fill="#8ac477"/><path d="M240 244L295 202 350 244Z" fill="#975949"/><rect x="253" y="244" width="85" height="78" fill="#f0ca9e"/><rect x="284" y="275" width="23" height="47" fill="#704f42"/><rect x="314" y="258" width="16" height="16" fill="#81cfef"/><g transform="translate(446 316)"><ellipse rx="15" ry="12" fill="#cf7749"/><circle cx="-7" cy="-9" r="9" fill="#df925e"/><path d="M-13 -15l-4 -8 9 5 8 -5 -1 11" fill="#df925e"/><circle cx="-11" cy="-9" r="1.6" fill="#213845"/><circle cx="-5" cy="-9" r="1.6" fill="#213845"/><path d="M13 1Q33 -11 26 -26" stroke="#cf7749" stroke-width="5" fill="none"/></g></svg>';
}
function gestureHtml(){
 return '<div class="partyQuestion"><span class="chip">🖐️ KAPITEL 4 · FINGER-MISSION · 30 SEKUNDEN</span><h3>Zieh mich groß, dreh mich, schieb mich!</h3><p class="partyGestureHelp">Ein Finger = verschieben · zwei Finger = zoomen und drehen.</p><div class="partyGesture" id="partyGesture"><div class="partyGesturePic" id="partyGestureImage">'+landscape()+'</div></div><div class="between"><span id="partyGestureValues" class="small">Zoom: 100 % · Drehung: 0°</span><button id="partyGestureReset">Zurücksetzen</button></div></div>';
}
function bindGesture(){
 const mountPoint=$('partyGesture');
 if(mountPoint&&window.FingerMission){
  fingerMissionInstance=window.FingerMission.mount(mountPoint,{remaining:state?.gestureRemaining??30,disabled:(state?.gestureRemaining??30)<=0});
  return;
 }
 const box=$('partyGesture'),pic=$('partyGestureImage'),value=$('partyGestureValues');
 if(!box)return;gesturePoints=new Map();gestureState={x:0,y:0,scale:1,rotation:0};gestureOrigin=null;
 function draw(){pic.style.transform='translate('+gestureState.x+'px,'+gestureState.y+'px) rotate('+gestureState.rotation+'deg) scale('+gestureState.scale+')';value.textContent='Zoom: '+Math.round(gestureState.scale*100)+' % · Drehung: '+Math.round(gestureState.rotation)+'°';}
 function snapshot(){const p=[...gesturePoints.values()];if(p.length===1)gestureOrigin={type:1,x:p[0].x,y:p[0].y,bx:gestureState.x,by:gestureState.y};if(p.length>=2){const dx=p[1].x-p[0].x,dy=p[1].y-p[0].y;gestureOrigin={type:2,cx:(p[0].x+p[1].x)/2,cy:(p[0].y+p[1].y)/2,distance:Math.hypot(dx,dy)||1,angle:Math.atan2(dy,dx),bx:gestureState.x,by:gestureState.y,scale:gestureState.scale,rotation:gestureState.rotation};}}
 box.addEventListener('pointerdown',e=>{e.preventDefault();box.setPointerCapture(e.pointerId);gesturePoints.set(e.pointerId,{x:e.clientX,y:e.clientY});snapshot();});
 box.addEventListener('pointermove',e=>{if(!gesturePoints.has(e.pointerId))return;e.preventDefault();gesturePoints.set(e.pointerId,{x:e.clientX,y:e.clientY});const p=[...gesturePoints.values()],g=gestureOrigin;if(!g)return;if(p.length===1&&g.type===1){gestureState.x=g.bx+p[0].x-g.x;gestureState.y=g.by+p[0].y-g.y;}if(p.length>=2&&g.type===2){const dx=p[1].x-p[0].x,dy=p[1].y-p[0].y;gestureState.scale=Math.max(.35,Math.min(5,g.scale*Math.hypot(dx,dy)/g.distance));gestureState.rotation=g.rotation+(Math.atan2(dy,dx)-g.angle)*180/Math.PI;gestureState.x=g.bx+(p[0].x+p[1].x)/2-g.cx;gestureState.y=g.by+(p[0].y+p[1].y)/2-g.cy;}draw();});
 const stop=e=>{gesturePoints.delete(e.pointerId);snapshot();};box.addEventListener('pointerup',stop);box.addEventListener('pointercancel',stop);
 $('partyGestureReset').onclick=()=>{gestureState={x:0,y:0,scale:1,rotation:0};snapshot();draw();};draw();
}
function interaction(){
 if(!state)return;
 const q=state.quiz,p=state.player,part=$('partyInteraction'),status=$('joinStatus');
 const phase=state.phase;
 if(status&&participantId&&participantName)status.textContent=participantName+' · angemeldet und mit der Live-Sitzung verbunden.';
 const missionActive=q?.type==='zoom'||phase==='gesture'||state.sideGame==='gesture';const sig=[phase,state.sideGame||'',q?.id||'',q?.type||'',q?.accepting||false,missionActive?'mission-stable':p?.choice??'unanswered',missionActive?'mission-score-stable':p?.score??'unknown',missionActive?'mission-revision-stable':state.revision,participantId,missionActive?'mission-rank-stable':(state.ranking||[]).length].join('|');
 if(sig===quizSignature){const timer=$('partyTimer');if(timer&&q)timer.textContent=q.remaining+' s';if(q?.type==='zoom'&&easterInstance)easterInstance.update({remaining:q.remaining,found:!!p?.zoomFound,disabled:!q.accepting});if((phase==='gesture'||state.sideGame==='gesture')&&fingerMissionInstance)fingerMissionInstance.update({remaining:state.gestureRemaining,disabled:state.gestureRemaining<=0});return;}
 quizSignature=sig;
 if(phase==='gesture'||state.sideGame==='gesture'){
  part.innerHTML=gestureHtml();bindGesture();return;
 }
 if(q?.type==='zoom'&&(phase==='zoom'||phase==='film')){
  part.innerHTML='<div class="partyQuestion"><div class="between"><span class="chip">🎯 30-SEKUNDEN-MISSION · MULTITOUCH</span><span class="small">'+(q.foundCount||0)+' gefunden</span></div><div id="partyEaster"></div><p class="small">'+(participantId?'Wende die Touchscreen-Gesten aus Kapitel 4 an: zwei Finger zum Zoomen, ein Finger zum Verschieben und dann gezielt tippen. Deine Mission: 170 % zoomen, zur Berghütte wischen und die Katze im Dachfenster antippen. Du hast 30 Sekunden!':'Bitte oben mit deinem Namen teilnehmen, damit dein Fund zählt.')+'</p></div>';
  easterInstance=window.EasterGame?.mount($('partyEaster'),{remaining:q.remaining,duration:30,found:!!p?.zoomFound,disabled:!q.accepting,onFind:async({x,y,zoom})=>{if(!participantId)throw Error('Bitte oben zuerst deinen Namen eingeben.');const r=await api('/api/easter/find',{id:participantId,x,y,zoom});setTimeout(()=>{poll();},600);return r;}});
  return;
 }
 if(q){
  if(!q.accepting){part.innerHTML='<div class="centerstage partyWait"><div><h2>Schau wieder auf den Film.</h2><p>Die Antwortzeit ist vorbei. Die nächste Frage erscheint automatisch.</p></div></div>';return;}
  const answered=p?.choice!==null&&p?.choice!==undefined;
  const allow=!!participantId&&q.accepting&&!answered;
  part.innerHTML='<div class="partyQuestion"><div class="between"><span class="chip">'+(q.type==='zoom'?'ZOOM-SPIEL':'QUIZFRAGE '+(Number(q.index)+1)+' / '+q.total)+'</span><span class="timer" id="partyTimer">'+q.remaining+' s</span></div><h3>'+safe(q.q)+'</h3>'+(q.type==='zoom'?'<div class="partyGesture" id="partyGesture"><div class="partyGesturePic" id="partyGestureImage">'+landscape()+'</div></div><p class="small" id="partyGestureValues">Zoome, um die Katze zu entdecken.</p><button id="partyGestureReset" style="margin-bottom:14px">Bild zurücksetzen</button>':'')+'<div class="partyAnswerGrid">'+q.a.map((answer,i)=>'<button class="partyAnswer'+(answered&&p.choice===i?' selected':'')+'" data-choice="'+i+'" '+(allow?'':'disabled')+'><b>'+String.fromCharCode(65+i)+'</b><span>'+safe(answer)+'</span></button>').join('')+'</div><p class="partyHint" style="margin-top:15px">'+(!participantId?'Gib oben deinen Namen ein, um mitzumachen.':answered?'Antwort gespeichert! Du kannst weiter auf den Film schauen.':!q.accepting?'Die Antwortzeit ist vorbei.':'Wähle jetzt eine Antwort – das Quiz wird automatisch ausgewertet.')+'</p></div>';
  if(q.type==='zoom')bindGesture();
  part.querySelectorAll('[data-choice]').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;try{await api('/api/answer',{id:participantId,choice:Number(btn.dataset.choice)});quizSignature='';await poll();}catch(e){showError(e.message);quizSignature='';await poll();}});
  return;
 }
 if(['results','end','handout'].includes(phase)){
  const ranking=(state.ranking||[]).slice(0,6).map((u,i)=>'<tr><td>'+(i+1)+'</td><td>'+safe(u.name)+'</td><td>'+u.score+'</td></tr>').join('');
  part.innerHTML='<div class="partyFinal"><span class="eyebrow">ERGEBNISSE & HANDOUT</span><h2>Vielen Dank fürs Mitmachen!</h2><p>Dein Punktestand</p><div class="partyScore">'+(p?.score===null||p?.score===undefined?'–':p.score)+' Punkte</div><table class="partyRanking"><thead><tr><th>Platz</th><th>Name</th><th>Punkte</th></tr></thead><tbody>'+ranking+'</tbody></table><a href="/#handout" class="btn primary" style="margin-top:20px">Lernfeld-14-Handout ausfüllen</a></div>';return;
 }
 part.innerHTML='<div class="centerstage partyWait"><div><span class="eyebrow">TOUCH LIVE</span><h2>'+(phase==='welcome'?'Die Sendung beginnt gleich.':'Schau auf den Film.')+'</h2><p>Quizfragen und Spiele erscheinen hier automatisch und werden auf dem Server ausgewertet.</p></div></div>';
}
async function sendHostTick(ended=false){
 if(!host||!key||!state||state.phase!=='film'||state.video?.type==='local'||tickInFlight||tapBusy||seekCommandBusy||!state.playing)return;
 const source=onlineVideo();
 if(source.type==='youtube'){
  if(!ytPlayer||!ytReady)return;
  const playerState=Number(ytPlayer.getPlayerState());
  // Only true playback advances the clock; buffering never reports old frames.
  if(ended?playerState!==0:playerState!==1)return;
 }else if(['url','upload'].includes(source.type)&&!ended&&(video.paused||video.readyState<2))return;
 const t=playerTime();if(t===null)return;
 tickInFlight=true;
 try{
  // YouTube buffering is not an instruction to pause all devices.
  await api('/api/host/tick',{time:t,playing:ended?false:state.playing!==false,ended},true);
 }catch(e){if(ended)showError(e.message);}finally{tickInFlight=false;}
}
function connectButtons(){
 $('partyEnable').onclick=async()=>{
  activated=true;playBtn.textContent='▶ Ton erneut aktivieren';playBtn.hidden=true;
  try{if(onlineVideo().type==='youtube'){if(ytPlayer&&ytReady){ytPlayer.unMute();ytPlayer.playVideo();if(!state.playing)ytPlayer.pauseVideo();}}
   else if(video.src){video.muted=false;await video.play();if(!state?.playing)video.pause();}}
  catch(e){playBtn.hidden=false;showError('Ton oder Autoplay wurde vom Browser blockiert. Tippe erneut auf „Film mit Ton aktivieren“.');}
  if(host&&state?.phase==='film'&&!state.playing&&state.video?.type!=='local'){await hostCommand('play');}
 };
 const filmTap=$('partyTapToggle');if(filmTap)filmTap.onclick=toggleHostFilmByClick;
 const resyncButton=$('partyResync');
 if(resyncButton)resyncButton.onclick=()=>{
  if(host||!state||state.phase!=='film')return;
  initialMediaSyncPending=true;syncMovie(true);
  resyncButton.textContent='✓ Angeglichen';
  setTimeout(()=>{resyncButton.textContent='↻ Manuell angleichen';},1800);
 };
 const captionsBtn=$('partyCaptionToggle');
 if(captionsBtn)captionsBtn.onclick=()=>{
  watchCaptionsEnabled=!watchCaptionsEnabled;
  localStorage.setItem('touch_live_watch_cc',watchCaptionsEnabled?'on':'off');
  updateCaptionPreference();updateCaptions();
 };
 updateCaptionPreference();
 $('partyFullscreen').onclick=()=>{$('partyScreen').requestFullscreen?.().catch(()=>{showError('Vollbild wurde vom Browser nicht erlaubt.');});};
 video.addEventListener('ended',()=>{if(host&&state?.phase==='film')sendHostTick(true);});
 if(host){
  document.querySelectorAll('[data-host]').forEach(b=>b.addEventListener('click',()=>b.dataset.host==='start'?startOnHostDevice():hostCommand(b.dataset.host)));
  $('partySeekGo').onclick=()=>hostCommand('seek',{time:Number($('partySeek').value)});
  $('partyYouTubeForm').onsubmit=async e=>{
   e.preventDefault();const link=$('partySource').value.trim();
   const yt=/^(https:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(link);
   const remote=state?.video?.type==='local';
   await hostCommand(remote?(yt?'remoteVideoYoutube':'remoteVideoLink'):(yt?'videoYoutube':'videoLink'),{url:link});
  };
 }
 const refreshRoster=$('partyRosterRefresh');if(refreshRoster)refreshRoster.onclick=()=>refreshHostRoster(true);
 const quizOnly=$('partyHostCopyQuiz');
 if(quizOnly)quizOnly.onclick=()=>{
  const link=location.origin+'/join';
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(()=>{quizOnly.textContent='✓ Quiz-Link kopiert';}).catch(()=>prompt('Diesen Quiz-Link teilen:',link));
  else prompt('Diesen Quiz-Link teilen:',link);
 };
 const copyFriend=$('partyCopyFriend');if(copyFriend)copyFriend.onclick=()=>{const url=location.origin+'/watch';if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url).then(()=>{copyFriend.textContent='✓ Zuschauerlink kopiert';}).catch(()=>prompt('Diesen Link verschicken:',url));else prompt('Diesen Link verschicken:',url);};
 $('partyJoinForm').onsubmit=async e=>{
  e.preventDefault();
  const name=$('partyName').value.trim();if(!name)return;
  try{
   const r=await api('/api/join',{name,role:'student',id:participantId||undefined});
   participantId=r.id;participantName=name;
   localStorage.setItem(idStore,participantId);localStorage.setItem(nameStore,participantName);
   $('partyJoinForm').hidden=true;$('participantTitle').textContent='Hallo, '+name+'!';
   quizSignature='';lastFocusKey='';await poll();
  }catch(e){showError('Anmeldung fehlgeschlagen: '+e.message);}
 };
}
async function hostCommand(cmd,body={}){
 if(!key)return showError('Du brauchst einen Mitsteuer-Code.');
 const seeking=['start','seek','restartVideo'].includes(cmd);
 if(seeking)seekCommandBusy=true;
 try{
  await api('/api/remote',{cmd:cmd==='start'?'startOnline':cmd,...body},true);
  await poll();if(cmd==='start'||cmd==='play'){$('partyEnable').hidden=!(!activated);}
  return true;
 }catch(e){showError('Steuerung fehlgeschlagen: '+e.message);return false;}
 finally{if(seeking)seekCommandBusy=false;}
}

async function startOnHostDevice(){
 if(!host||!key)return showError('Dieser Startknopf ist nur für die private Regie bestimmt.');
 if(!state)return showError('Live-Sitzung wird noch verbunden.');
 const v=onlineVideo();
 if(state.video?.type==='local'&&(!v||['none','local'].includes(v.type)))return showError('Aktuell ist nur die lokale HDMI-MP4 ausgewählt. Lade deine MP4 im Regiebereich in den Cloud-Speicher hoch oder hinterlege eine Online-Filmquelle für die andere Stadt.');
 if(!v||!['url','upload','youtube'].includes(v.type))return showError('Zuerst eine MP4 hochladen oder einen gültigen Online-Filmlink eintragen.');
 activated=true;
 if(v.type==='url'||v.type==='upload'){
  const ref=v.type+':'+(v.url||v.id);
  if(sourceRef!==ref||video.getAttribute('src')!==v.url){
   sourceRef=ref;localRevision=-1;cloudFallback=false;
   video.pause();video.src=v.url;video.load();
  }
  // Called from a real click on the host button before any await.
  video.muted=false;
  try{
   const attempt=video.play();
   if(attempt?.catch)attempt.catch(()=>{
    activated=false;playBtn.hidden=false;
    showError('Der Browser blockiert die automatische Tonwiedergabe. Tippe einmal „Film mit Ton aktivieren“.');
   });
  }catch{
   activated=false;playBtn.hidden=false;
  }
 }
 if(v.type==='youtube'&&ytPlayer&&ytReady){
  try{ytPlayer.unMute();ytPlayer.playVideo();}catch{}
 }
 const started=await hostCommand('start');
 if(!started){try{video.pause();}catch{}return;}
 if(v.type==='youtube')showError('Falls du keinen Ton hörst, tippe „Film mit Ton aktivieren“. YouTube kann den automatischen Tonstart blockieren.');
}
window.TouchLiveWatchHost={getState:()=>state,poll:()=>poll(),startOnDevice:startOnHostDevice};
function connectedUI(){
 $('hostUnlock').hidden=true;$('partyMain').hidden=false;
 $('hostPanel').hidden=!host;$('partyRole').textContent=host?'Regie · Film & Quiz':'Online zuschauen & mitspielen';
 $('partyTitle').innerHTML=host?'Du steuerst <em>die Doku.</em>':'Ihr schaut <em>zusammen.</em>';
 $('partySub').textContent=host?'Du startest den Film, pausierst und öffnest Quiz oder Gesten-Spiel. Deine Freundin sieht die gleiche Filmstelle. Du kannst selbst beim Quiz mitmachen.':'Der Film läuft synchron zum Gerät deines Freundes. Du kannst Fragen beantworten und das Gesten-Spiel nutzen, aber die Sendung nicht steuern.';
 if(participantName&&participantId){$('partyJoinForm').hidden=true;$('participantTitle').textContent='Hallo, '+participantName+'!';$('joinStatus').textContent='Du bist beim gemeinsamen Quiz angemeldet.';}else $('partyJoinForm').hidden=false;
 connectButtons();setupPartyViewMode();poll();if(host)refreshHostRoster(true);
}
async function poll(){
 if(pollInFlight||$('partyMain').hidden)return;
 pollInFlight=true;
 try{
  const path='/api/state'+(participantId?'?id='+encodeURIComponent(participantId):'');
  state=await api(path);
  // Rejoin only when the server has forgotten this browser after a restart.
  if(participantId&&participantName&&!state.player&&!rejoinBusy&&Date.now()-lastRejoinAt>12000){
   rejoinBusy=true;lastRejoinAt=Date.now();
   try{
    const joined=await api('/api/join',{id:participantId,name:participantName,role:'student'});
    if(joined?.id===participantId){state=await api('/api/state?id='+encodeURIComponent(participantId));quizSignature='';}
   }catch(e){showError('Quiz-Anmeldung wird erneut verbunden: '+e.message);}
   finally{rejoinBusy=false;}
  }
  const p=$('partyStatus');p.textContent=({'welcome':'Wartet auf Start','film':'Film läuft','demo':'Testquiz','zoom':'Zoom-Spiel','gesture':'Gesten-Spiel','results':'Siegerehrung','handout':'Handout','end':'Abschluss'})[state.phase]||state.phase;
  $('partyTime').textContent=sec(state.time)+' / 51:47 · '+state.participants+' angemeldet';
  const titleNode=$('partyFilmTitle');if(titleNode)titleNode.textContent='🎬 '+(state.videoTitle||'TOUCHSCREEN – Interaktive Dokumentation');
  syncMovie();interaction();updatePartyViewMode();
 }catch(e){showError('Keine Verbindung zur gemeinsamen Sitzung: '+e.message);}
 finally{pollInFlight=false;}
}
function init(){
 $('hostUnlock').hidden=true;
 if(host&&!key){
  $('hostUnlock').hidden=false;
  $('hostConnect').onclick=()=>{key=$('hostKey').value.trim();if(!key)return;sessionStorage.setItem(keyStore,key);connectedUI();};
  return;
 }
 connectedUI();
}
init();
setInterval(poll,1100);
setInterval(()=>{if(host&&key&&$('partyMain')&&!$('partyMain').hidden)refreshHostRoster();},4000);
setInterval(()=>{if(host&&state?.phase==='film'&&state?.video?.type!=='none'&&state?.video?.type!=='local')sendHostTick();},1300);
})();