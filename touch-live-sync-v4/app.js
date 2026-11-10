
(function(){
'use strict';
if(window.__touchAppLoaded)return;window.__touchAppLoaded=true;
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
  app.innerHTML='<div class="studentPortal"><header class="studentBrand" aria-label="TOUCH LIVE Schülerbereich"><div class="logo rgLogo">TOUCH<b>LIVE</b></div><div class="studentBrandRight"><span class="studentLiveDot" aria-hidden="true"></span> LIVE-MITMACHEN · LERNFELD 14</div></header><main class="wrap studentMain">'+body+'</main></div>';
  return;
 }
 const cur=role==='admin'?'admin':role==='teacher'?'teacher':role==='handout'?'handout':'';
 app.innerHTML='<header class="nav wrap rgBar2"><a class="logo rgLogo" href="/">TOUCH<b>LIVE</b></a><nav class="navlinks rgLinks"><a href="/">Start</a><a href="/join">Quiz</a><a href="#handout"'+(cur==='handout'?' class="on"':'')+'>Handout</a><a href="#teacher"'+(cur==='teacher'?' class="on"':'')+'>Lehrer</a>'+(cur==='admin'?'<a href="#admin" class="on">Regie</a>':'')+'</nav></header><main class="wrap">'+body+'</main><footer>TOUCH LIVE · Friedrich-Dessauer-Schule Limburg · 2026</footer>';
}
function page(title,tag,sub){return '<div class="page"><span class="eyebrow">'+tag+'</span><h1>'+title+'</h1><p>'+sub+'</p></div>';}
// Bilder mit freier Lizenz (Wikimedia Commons) – Quelle steht direkt am Bild.
const HOME_IMG={
 cern:{src:'https://commons.wikimedia.org/wiki/Special:FilePath/CERN-Stumpe_Capacitance_Touchscreen.jpg?width=1600',alt:'Prototypen der ersten kapazitiven Touchscreens am CERN, 1972/73',credit:'Foto: Maximilien Brice / CERN · CC BY 2.0',page:'https://commons.wikimedia.org/wiki/File:CERN-Stumpe_Capacitance_Touchscreen.jpg'},
 cap:{src:'https://commons.wikimedia.org/wiki/Special:FilePath/TouchScreen_capacitive.svg?width=900',alt:'Schema eines kapazitiven Touchscreens',credit:'Grafik: Mercury13 · CC BY-SA 3.0',page:'https://commons.wikimedia.org/wiki/File:TouchScreen_capacitive.svg'},
 hand:{src:'https://commons.wikimedia.org/wiki/Special:FilePath/Smartphone-mobile-hand-technology-internet-finger.jpg?width=1600',alt:'Hand bedient den Touchscreen eines Smartphones',credit:'Foto: Wikimedia Commons · CC0 (gemeinfrei)',page:'https://commons.wikimedia.org/wiki/File:Smartphone-mobile-hand-technology-internet-finger.jpg'}
};
// Kino-Effekte: Intro mit Kinobalken, Text-Einblendungen beim Scrollen, Parallax im Trailer.
let rgObserver=null,rgScrollBound=false;
function rgCinema(introHtml){
 // Intro liegt außerhalb von #app, damit ein Neuaufbau der Seite es nicht abbricht.
 if(introHtml){document.body.insertAdjacentHTML('beforeend',introHtml);try{sessionStorage.setItem('touch_intro','1');}catch{}}
 const intro=introHtml?el('rgIntro'):null;
 if(intro){
  document.body.classList.add('rgIntroOn');
  const done=()=>{if(!intro.isConnected)return;intro.classList.add('rgIntroOut');document.body.classList.remove('rgIntroOn');try{sessionStorage.setItem('touch_intro','1');}catch{}setTimeout(()=>intro.remove(),900);};
  const t=setTimeout(done,4200);
  intro.onclick=()=>{clearTimeout(t);done();};
 }
 document.querySelectorAll('.rgHero, .rgTile, .rgSecHead, .rgLocked, .rgPage .clsLab').forEach((n,i)=>n.classList.add('rgReveal'));
 if('IntersectionObserver' in window){
  rgObserver?.disconnect();
  rgObserver=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('rgIn');rgObserver.unobserve(e.target);}}),{threshold:.12});
  document.querySelectorAll('.rgReveal').forEach(n=>rgObserver.observe(n));
 }else document.querySelectorAll('.rgReveal').forEach(n=>n.classList.add('rgIn'));
 if(!rgScrollBound){rgScrollBound=true;let raf=0;
  window.addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const v=document.querySelector('.rgBgVideo'),inner=document.querySelector('.rgHeroInner');if(!v)return;const y=Math.min(window.scrollY,window.innerHeight);
   v.style.transform='scale('+(1.06+y/window.innerHeight*.12)+') translateY('+(y*.25)+'px)';if(inner){inner.style.transform='translateY('+(y*.45)+'px)';inner.style.opacity=String(Math.max(0,1-y/(window.innerHeight*.7)));}});},{passive:true});}
}
function homeTile(img,kicker,title,text,extra=''){
 const i=HOME_IMG[img];
 return '<article class="rgTile'+(extra?' '+extra:'')+'"><figure><img src="'+i.src+'" alt="'+esc(i.alt)+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add(\'noimg\')"><figcaption><a href="'+i.page+'" target="_blank" rel="noopener noreferrer">'+esc(i.credit)+'</a></figcaption></figure><div class="rgTileText"><span>'+kicker+'</span><h3>'+title+'</h3><p>'+text+'</p></div></article>';
}
function home(){
 const afterDoc=['results','end','handout'].includes(state?.phase);
 const open=!!(state?.homeUnlocked||afterDoc);
 const hasTrailer=!!state?.trailerAvailable;
 const loopSrc='/trailer-loop.mp4',poster='/trailer-poster.jpg';
 const media='<video class="rgBgVideo" id="clsTrailer" autoplay muted loop playsinline preload="auto" poster="'+poster+'" src="'+loopSrc+'"></video>';
 // Premiere laut Trailer: 20.11.
 const prem=new Date(2026,10,20),days=Math.ceil((prem-new Date(new Date().toDateString()))/864e5);
 const premTxt=days>1?'Noch '+days+' Tage':days===1?'Morgen':days===0?'Heute':'Jetzt verfügbar';
 const nav='<header class="rgNav" id="rgNav"><a class="rgLogo" href="/" aria-label="TOUCH LIVE Start">TOUCH<b>LIVE</b></a>'+
  '<nav class="rgMenu" id="rgMenu" aria-label="Hauptmenü">'+
   '<button type="button" data-go="trailer">Trailer</button><button type="button" data-go="doku">Die Doku</button>'+
   '<a href="/join">Quiz</a><button type="button" data-go="lab">Touch-Labor</button><a href="#handout">Handout</a><a href="#teacher">Lehrer</a></nav>'+
  '<button type="button" class="rgNavCta" data-go="trailer">▶ Trailer ansehen</button>'+
  '<button type="button" class="rgBurger" id="rgBurger" aria-label="Menü öffnen" aria-expanded="false"><span></span><span></span><span></span></button></header>';
 const hero=nav+'<section class="rgHero" id="rgTop">'+media+'<div class="rgShade"></div>'+
  '<div class="rgHeroInner"><span class="rgKicker">TOUCH LIVE · INTERAKTIVE DOKUMENTATION · LERNFELD 14</span>'+
  '<h1 class="rgTitle">TOUCH<span>SCREEN</span></h1><p class="rgClaim">Geschichte, Technik und Zukunft – erlebt mit deinen eigenen Fingern.</p>'+
  '<div class="rgPremiere"><span>PREMIERE</span><b>20.11.</b><em>'+premTxt+'</em></div>'+
  '<div class="rgActions"><button type="button" class="rgBtn rgBtnMain" data-go="trailer">▶ Trailer ansehen</button>'+(open?'<button type="button" class="rgBtn" data-go="lab">🎮 Touch-Labor &amp; Schach</button><a class="rgBtn" href="#handout">📝 Handout</a>':'<a class="rgBtn" href="/join">🎮 Zum Quiz</a>')+'</div>'+
  '</div><div class="rgScroll" aria-hidden="true">▼</div></section>';
 const tiles='<section class="rgTiles"><header class="rgSecHead"><span>DIE DOKU</span><h2>Sieben Kapitel. Ein Bildschirm, den jeder kennt.</h2></header><div class="rgGrid">'+
  homeTile('cern','KAPITEL 1 · GESCHICHTE','Alles begann am CERN','1972 baute Bent Stumpe am Kernforschungszentrum CERN einen kapazitiven Touchscreen für den Kontrollraum eines Teilchenbeschleunigers.','rgWide')+
  homeTile('cap','KAPITEL 2 · TECHNIK','So funktioniert’s','Ein Gitter aus Leiterbahnen unter dem Glas. Dein Finger verändert das elektrische Feld – der Controller berechnet daraus die Position.','rgLight')+
  homeTile('hand','KAPITEL 5 · ALLTAG','Überall Touch','Smartphone, Kasse, Fahrkartenautomat, Auto: Touchscreens sind heute fast überall – und jeder bedient sie ohne Anleitung.')+
  '<article class="rgTile rgTileText2"><div class="rgTileText"><span>KAPITEL 3–7</span><h3>Fünf Arten · Multitouch · Probleme &amp; Zukunft</h3><ol class="rgChapters">'+CH.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ol></div></article>'+
  '</div></section>';
 const lab=open?'<section class="clsLab" id="lab"><div class="clsLabHead"><div><span class="eyebrow">NACH DER DOKU · TOUCH-LABOR</span><h2>Fünf Spiele. Echte Messwerte.</h2><p>Alles läuft direkt im Browser – am besten auf dem iPad mit den Fingern. Dein Gerät misst dabei, was der Touchscreen erkennt.</p></div></div>'+
  '<div class="clsTabs" role="tablist">'+[['chess','♟️','Schach gegen Bot','Leicht · Mittel · Schwer'],['egg','🔎','Easter Egg','Zoomen, Verschieben, Tippen'],['finger','🖐️','Finger-Messlabor','Abstand, Zoom, Drehwinkel'],['react','⚡','Reaktionstest','Wie schnell tippst du?'],['multi','✋','Multitouch-Zähler','Wie viele Finger erkennt dein Gerät?']].map(([id,ic,t,sub])=>'<button type="button" role="tab" data-lab="'+id+'"><span>'+ic+'</span><b>'+t+'</b><small>'+sub+'</small></button>').join('')+'</div>'+
  '<div class="clsStage" id="labStage"></div></section>'+
  '<section class="clsBottom"><a class="clsHandout" href="#handout"><span class="eyebrow">ZUM ABSCHLUSS</span><h3>Handout ausfüllen</h3><p>Wissen, Arbeitsblatt und Feedbackbogen – tippen oder mit dem Apple Pencil schreiben.</p><b>Handout öffnen →</b></a><div class="clsChapters"><span class="eyebrow">NACH DER SIEGEREHRUNG</span><h3 style="margin:8px 0">Doku noch einmal?</h3><p class="small">Die ganze Dokumentation mit Untertiteln auf deinem Gerät.</p><a class="btn" href="/watch">🎬 Doku ansehen</a></div></section>'
  :'<section class="rgLocked"><div><span>NACH DER SIEGEREHRUNG</span><h2>Touch-Labor, Schach &amp; Handout</h2><p>Sobald die Doku vorbei ist, öffnet sich hier das Touch-Labor mit Schach gegen den Bot, Finger-Messung und Reaktionstest.</p></div><a class="rgBtn rgBtnMain" href="/join">🎮 Jetzt zum Quiz</a></section>';
 const credits='<section class="rgCredits"><h4>Bildquellen</h4><ul>'+Object.values(HOME_IMG).map(i=>'<li><a href="'+i.page+'" target="_blank" rel="noopener noreferrer">'+esc(i.alt)+'</a> – '+esc(i.credit)+', via Wikimedia Commons</li>').join('')+'</ul></section>';
 let introSeen=false;try{introSeen=sessionStorage.getItem('touch_intro')==='1';}catch{}
 const intro='',introHtml='<div class="rgIntro" id="rgIntro" aria-hidden="true"><div class="rgBar rgBarTop"></div><div class="rgBar rgBarBottom"></div><div class="rgIntroText"><span class="rgIntroPre">Friedrich-Dessauer-Schule präsentiert</span><span class="rgIntroLogo">TOUCH<b>LIVE</b></span><span class="rgIntroSub">Eine interaktive Dokumentation</span></div><button type="button" class="rgSkip" id="rgSkip">Überspringen ›</button></div>';
 wrap(intro+'<div class="rgPage"><div class="rgGrain" aria-hidden="true"></div>'+hero+tiles+lab+credits+'</div>');
 rgCinema(!introSeen&&!el('rgIntro')?introHtml:'');
 document.body.classList.add('rgHome');
 bindTrailerCard();
 if(open)initHomeLab();
 rgNavBind(hasTrailer);
}
function rgTrailerModal(){
 let m=el('rgModal');
 if(!m){m=document.createElement('div');m.id='rgModal';m.className='rgModal';m.setAttribute('role','dialog');m.setAttribute('aria-label','Trailer');
  m.innerHTML='<button type="button" class="rgModalClose" aria-label="Schließen">✕</button><video id="rgModalVideo" controls playsinline preload="auto" poster="/trailer-poster.jpg"></video>';
  document.body.appendChild(m);
  const close=()=>{const v=el('rgModalVideo');try{v.pause();}catch{}m.classList.remove('on');document.body.classList.remove('rgModalOpen');};
  m.querySelector('.rgModalClose').onclick=close;m.onclick=e=>{if(e.target===m)close();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&m.classList.contains('on'))close();});
 }
 const v=el('rgModalVideo');
 if(!v.getAttribute('src'))v.src='/api/trailer/video?v='+encodeURIComponent(state?.trailerRevision||0);
 m.classList.add('on');document.body.classList.add('rgModalOpen');
 v.muted=false;v.currentTime=0;const p=v.play();if(p?.catch)p.catch(()=>{});
}
function rgNavBind(){
 const go=t=>{const menu=el('rgMenu');document.body.classList.remove('rgMenuOpen');el('rgBurger')?.setAttribute('aria-expanded','false');
  if(t==='trailer')return rgTrailerModal();
  const target=t==='doku'?document.querySelector('.rgTiles'):t==='lab'?(el('lab')||document.querySelector('.rgLocked')):null;
  target?.scrollIntoView({behavior:'smooth',block:'start'});};
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
 document.querySelectorAll('#rgMenu a').forEach(a=>a.addEventListener('click',()=>document.body.classList.remove('rgMenuOpen')));
 const burger=el('rgBurger');if(burger)burger.onclick=()=>{const on=!document.body.classList.contains('rgMenuOpen');document.body.classList.toggle('rgMenuOpen',on);burger.setAttribute('aria-expanded',String(on));};
 const nav=el('rgNav');const onScroll=()=>{if(nav)nav.classList.toggle('solid',window.scrollY>40);};onScroll();
 if(!window.__rgNavScroll){window.__rgNavScroll=true;window.addEventListener('scroll',()=>{const n=el('rgNav');if(n)n.classList.toggle('solid',window.scrollY>40);},{passive:true});}
}
function bindTrailerCard(){
 const v=el('clsTrailer');if(!v)return;
 v.muted=true;v.loop=true;const p=v.play();if(p?.catch)p.catch(()=>{});
}
// ---------- Touch-Labor auf der Klassenseite (nach der Doku) ----------
let labTimer=null,labGame=null;
function initHomeLab(){
 const stage=el('labStage');if(!stage)return;
 let current='';try{current=sessionStorage.getItem('touch_lab')||'egg';}catch{current='egg';}
 document.querySelectorAll('[data-lab]').forEach(b=>b.onclick=()=>openLab(b.dataset.lab));
 openLab(current);
}
function openLab(id){
 const stage=el('labStage');if(!stage)return;
 clearInterval(labTimer);labTimer=null;if(labGame?.stop)labGame.stop();labGame=null;
 try{sessionStorage.setItem('touch_lab',id);}catch{}
 document.querySelectorAll('[data-lab]').forEach(b=>{const on=b.dataset.lab===id;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));});
 const restart='<button type="button" class="clsRestart" id="labRestart">↻ Neu starten</button>';
 const countdown=(seconds,update)=>{let left=seconds;update(left);labTimer=setInterval(()=>{left=Math.max(0,left-1);update(left);if(!left){clearInterval(labTimer);labTimer=null;}},1000);};
 if(id==='egg'){
  stage.innerHTML='<div id="labMount"></div>'+restart;
  if(window.EasterGame){labGame=window.EasterGame.mount(el('labMount'),{remaining:30,duration:30,onFind:async()=>({ok:true})});countdown(30,r=>labGame?.update?.({remaining:r,disabled:r<=0}));}
 }else if(id==='finger'){
  stage.innerHTML='<div id="labMount"></div>'+restart;
  if(window.FingerMission){labGame=window.FingerMission.mount(el('labMount'),{remaining:30});countdown(30,r=>labGame?.update?.({remaining:r,disabled:r<=0}));}
 }else if(id==='chess')labChess(stage);
 else if(id==='react')labReaction(stage,restart);
 else labMultitouch(stage);
 const r=el('labRestart');if(r)r.onclick=()=>openLab(id);
}
// ---------- Schach gegen den Bot ----------
// Beide Farben nutzen die ausgefüllten Symbole – Weiß wird per CSS hell eingefärbt.
const CHESS_GLYPH={K:'♚',Q:'♛',R:'♜',B:'♝',N:'♞',P:'♟',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
function labChess(stage){
 const C=window.TouchChess;
 if(!C){stage.innerHTML='<p class="labMsg">Schach wird geladen … bitte Seite neu laden.</p>';return;}
 let level='medium',human='w',s=C.initial(),history=[],sel=-1,targets=[],last=null,thinking=false,timer=null,moves=[],over=null;
 try{const saved=JSON.parse(localStorage.getItem('touch_chess')||'null');if(saved&&saved.s&&Array.isArray(saved.s.b)&&saved.s.b.length===64){({level,human,s,moves}=saved);history=saved.history||[];last=saved.last||null;}}catch{}
 let stats={};try{stats=JSON.parse(localStorage.getItem('touch_chess_stats')||'{}');}catch{}
 const names={easy:'Leicht',medium:'Mittel',hard:'Schwer'};
 stage.innerHTML='<div class="chessWrap"><div class="chessBoardCol"><div class="chessBar chessBarTop"><span id="chBotName">🤖 Bot</span><span class="chessCaps" id="chCapsTop"></span></div>'+
  '<div class="chessBoard" id="chBoard" role="grid" aria-label="Schachbrett"></div>'+
  '<div class="chessBar"><span>🧑 Du</span><span class="chessCaps" id="chCapsBottom"></span></div></div>'+
  '<aside class="chessSide"><div class="chessStatus" id="chStatus" role="status"></div>'+
  '<label class="chessLabel">Schwierigkeit</label><div class="chessSeg" id="chLevel">'+['easy','medium','hard'].map(l=>'<button type="button" data-level="'+l+'">'+names[l]+'</button>').join('')+'</div>'+
  '<label class="chessLabel">Deine Farbe</label><div class="chessSeg" id="chColor"><button type="button" data-color="w">♔ Weiß</button><button type="button" data-color="b">♚ Schwarz</button></div>'+
  '<div class="chessBtns"><button type="button" class="primary" id="chNew">♟ Neues Spiel</button><button type="button" id="chUndo">↶ Zug zurück</button><button type="button" id="chHint">💡 Tipp</button></div>'+
  '<div class="chessMoves" id="chMoves" aria-label="Zugliste"></div><div class="chessStats" id="chStats"></div>'+
  '<p class="small">Tippe eine Figur an, dann das Zielfeld. Bauern werden automatisch zur Dame.</p></aside></div>';
 const board=el('chBoard');
 function save(){try{localStorage.setItem('touch_chess',JSON.stringify({level,human,s,moves,history,last}));}catch{}}
 function paintStats(){const t=stats[level]||{w:0,l:0,d:0};el('chStats').innerHTML='Gegen <b>'+names[level]+'</b>: '+t.w+' Siege · '+t.d+' Remis · '+t.l+' Niederlagen';}
 function caps(){
  const start={p:8,n:2,b:2,r:2,q:1},cnt={};for(const p of s.b)if(p)cnt[p]=(cnt[p]||0)+1;
  const lost=c=>Object.keys(start).map(t=>{const k=c==='w'?t.toUpperCase():t;return CHESS_GLYPH[k].repeat(Math.max(0,start[t]-(cnt[k]||0)));}).join('');
  // oben: was der Bot geschlagen hat (= deine verlorenen Figuren)
  el('chCapsTop').textContent=lost(human);el('chCapsBottom').textContent=lost(human==='w'?'b':'w');
 }
 function paint(){
  const st=C.status(s);over=st.over?st:null;
  const order=[...Array(64).keys()];if(human==='b')order.reverse();
  const checkSq=!st.over&&st.check?C.kingSq(s,s.turn):(st.over&&st.reason==='Schachmatt'?C.kingSq(s,s.turn):-1);
  board.innerHTML=order.map(i=>{const p=s.b[i],dark=((i>>3)+(i&7))%2===1,isT=targets.some(m=>m.to===i);
   const cls='chSq '+(dark?'dk':'lt')+(i===sel?' sel':'')+(last&&(last.from===i||last.to===i)?' last':'')+(i===checkSq?' check':'')+(isT?(p?' cap':' dot'):'');
   const coord=(human==='w'?((i&7)===0):((i&7)===7))?'<i class="rk">'+(8-(i>>3))+'</i>':'';
   const fileLbl=(human==='w'?(i>>3)===7:(i>>3)===0)?'<i class="fl">'+'abcdefgh'[i&7]+'</i>':'';
   return '<button type="button" class="'+cls+'" data-sq="'+i+'" aria-label="'+C.sqName(i)+(p?' '+p:'')+'">'+(p?'<span class="pc '+(C.colorOf(p)==='w'?'pw':'pb')+'">'+CHESS_GLYPH[p]+'︎</span>':'')+coord+fileLbl+'</button>';}).join('');
  document.querySelectorAll('#chLevel [data-level]').forEach(b=>b.classList.toggle('on',b.dataset.level===level));
  document.querySelectorAll('#chColor [data-color]').forEach(b=>b.classList.toggle('on',b.dataset.color===human));
  el('chBotName').textContent='🤖 Bot · '+names[level];
  const msg=el('chStatus');
  if(over){const youWin=over.result===human,draw=over.result==='draw';msg.innerHTML=(draw?'🤝 Remis':youWin?'🏆 Gewonnen!':'🤖 Der Bot gewinnt')+' <small>'+over.reason+'</small>';msg.className='chessStatus '+(draw?'':youWin?'win':'lose');}
  else{msg.textContent=thinking?'🤖 Bot denkt nach …':s.turn===human?(st.check?'⚠️ Schach! Du bist am Zug.':'Du bist am Zug.'):'🤖 Bot ist am Zug.';msg.className='chessStatus'+(thinking?' think':'');}
  const list=el('chMoves');list.innerHTML=moves.length?moves.map((m,i)=>(i%2===0?'<span class="nr">'+(i/2+1)+'.</span>':'')+'<span>'+esc(m)+'</span>').join(''):'<span class="small">Noch keine Züge.</span>';list.scrollTop=list.scrollHeight;
  caps();paintStats();
 }
 function finishCheck(){
  const st=C.status(s);if(!st.over)return;
  const key=st.result==='draw'?'d':st.result===human?'w':'l';
  stats[level]=stats[level]||{w:0,l:0,d:0};stats[level][key]++;try{localStorage.setItem('touch_chess_stats',JSON.stringify(stats));}catch{}
 }
 function play(m){history.push({s,moves:moves.slice(),last});moves.push(C.san(s,m));s=C.make(s,m);last={from:m.from,to:m.to};sel=-1;targets=[];save();finishCheck();}
 function botMove(){
  if(C.status(s).over||s.turn===human)return;
  thinking=true;paint();
  timer=setTimeout(()=>{ // kurz warten, damit der Hinweis sichtbar ist
   const m=C.bestMove(s,level);thinking=false;if(m)play(m);paint();
  },level==='easy'?350:120);
 }
 board.onclick=e=>{
  const b=e.target.closest('[data-sq]');if(!b||thinking||over||s.turn!==human)return;
  const i=Number(b.dataset.sq),p=s.b[i];
  const mv=targets.find(m=>m.to===i);
  if(mv){const pick=targets.filter(m=>m.to===i);play(pick.find(m=>!m.promo||m.promo.toLowerCase()==='q')||mv);paint();botMove();return;}
  if(p&&C.colorOf(p)===human){sel=i;targets=C.legal(s).filter(m=>m.from===i);}else{sel=-1;targets=[];}
  paint();
 };
 el('chLevel').onclick=e=>{const b=e.target.closest('[data-level]');if(!b||thinking)return;level=b.dataset.level;save();paint();};
 el('chColor').onclick=e=>{const b=e.target.closest('[data-color]');if(!b||thinking)return;human=b.dataset.color;newGame();};
 function newGame(){clearTimeout(timer);thinking=false;s=C.initial();history=[];moves=[];last=null;sel=-1;targets=[];save();paint();botMove();}
 el('chNew').onclick=newGame;
 el('chUndo').onclick=()=>{if(thinking)return;let h=history.pop();if(h&&h.s.turn!==human)h=history.pop()||h;if(!h)return;({s,moves,last}=h);sel=-1;targets=[];save();paint();};
 el('chHint').onclick=()=>{if(thinking||over||s.turn!==human)return;const m=C.bestMove(s,'medium');if(!m)return;sel=m.from;targets=[m];paint();el('chStatus').textContent='💡 Tipp: '+C.san(s,m);};
 labGame={stop:()=>clearTimeout(timer)};
 paint();botMove();
}
function labReaction(stage,restart){
 const ROUNDS=10;let round=0,times=[],shownAt=0,wait=null,misses=0;
 stage.innerHTML='<div class="labReact"><div class="labStats"><div><small>Runde</small><strong id="rxRound">0 / '+ROUNDS+'</strong></div><div><small>Letzte Zeit</small><strong id="rxLast">–</strong></div><div><small>Durchschnitt</small><strong id="rxAvg">–</strong></div><div><small>Bestzeit</small><strong id="rxBest">–</strong></div></div>'+
  '<div class="labArena" id="rxArena"><button type="button" class="labStart" id="rxStart">⚡ Start</button><button type="button" class="labTarget" id="rxTarget" hidden aria-label="Ziel antippen"></button><p class="labMsg" id="rxMsg">Tippe so schnell wie möglich auf den leuchtenden Kreis. 10 Runden.</p></div>'+restart+'</div>';
 const arena=el('rxArena'),target=el('rxTarget'),msg=el('rxMsg');
 const ms=n=>Math.round(n)+' ms';
 function next(){
  if(round>=ROUNDS){const avg=times.reduce((a,b)=>a+b,0)/times.length;msg.innerHTML='Fertig! Durchschnitt <b>'+ms(avg)+'</b> · Bestzeit <b>'+ms(Math.min(...times))+'</b>'+(misses?' · '+misses+'× daneben':'')+'.<br><small>Zum Vergleich: Ein Touchscreen mit 120 Hz misst alle 8,3 ms – deine Reaktion ist viel langsamer als der Sensor.</small>';target.hidden=true;return;}
  target.hidden=true;msg.textContent='Warte auf den Kreis …';
  wait=setTimeout(()=>{const r=arena.getBoundingClientRect(),size=Math.max(56,Math.min(90,r.width/8));
   target.style.width=target.style.height=size+'px';target.style.left=(Math.random()*(r.width-size))+'px';target.style.top=(Math.random()*(r.height-size))+'px';
   target.hidden=false;shownAt=performance.now();msg.textContent='Jetzt!';},600+Math.random()*1400);
 }
 target.onpointerdown=e=>{e.preventDefault();const t=performance.now()-shownAt;times.push(t);round++;
  el('rxRound').textContent=round+' / '+ROUNDS;el('rxLast').textContent=ms(t);el('rxAvg').textContent=ms(times.reduce((a,b)=>a+b,0)/times.length);el('rxBest').textContent=ms(Math.min(...times));next();};
 arena.onpointerdown=e=>{if(e.target===arena&&!target.hidden){misses++;}};
 el('rxStart').onclick=()=>{el('rxStart').hidden=true;round=0;times=[];misses=0;next();};
 labGame={stop:()=>clearTimeout(wait)};
}
function labMultitouch(stage){
 stage.innerHTML='<div class="labMulti"><div class="labStats"><div><small>Finger jetzt</small><strong id="mtNow">0</strong></div><div><small>Maximum</small><strong id="mtMax">0</strong></div><div><small>Größter Abstand</small><strong id="mtSpan">–</strong></div><div><small>Gerät meldet</small><strong id="mtDev">'+(navigator.maxTouchPoints||0)+' Punkte</strong></div></div>'+
  '<div class="labArena labTouchPad" id="mtPad"><p class="labMsg" id="mtMsg">Lege so viele Finger wie möglich gleichzeitig auf die Fläche.</p></div><button type="button" class="clsRestart" id="mtReset">↻ Zurücksetzen</button></div>';
 const pad=el('mtPad'),pts=new Map();let max=0,span=0;
 const colors=['#6de0d6','#f5ce8c','#75bfff','#ff8a80','#b39ddb','#a5d6a7','#ffcc80','#80deea','#f48fb1','#e6ee9c','#90caf9'];
 function draw(){
  pad.querySelectorAll('.mtDot').forEach(d=>{if(!pts.has(Number(d.dataset.id)))d.remove();});
  let i=0;const r=pad.getBoundingClientRect();
  for(const [id,p] of pts){let d=pad.querySelector('.mtDot[data-id="'+id+'"]');if(!d){d=document.createElement('div');d.className='mtDot';d.dataset.id=id;pad.appendChild(d);}
   d.style.left=(p.x-r.left)+'px';d.style.top=(p.y-r.top)+'px';d.style.setProperty('--c',colors[i%colors.length]);d.textContent=++i;}
  const list=[...pts.values()];for(const a of list)for(const b of list)span=Math.max(span,Math.hypot(a.x-b.x,a.y-b.y));
  max=Math.max(max,pts.size);el('mtNow').textContent=pts.size;el('mtMax').textContent=max;el('mtSpan').textContent=span?Math.round(span)+' px':'–';
  el('mtMsg').hidden=pts.size>0;
 }
 const down=e=>{if(e.pointerType==='mouse'&&e.buttons!==1)return;e.preventDefault();pad.setPointerCapture?.(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});draw();};
 const move=e=>{if(!pts.has(e.pointerId))return;e.preventDefault();pts.set(e.pointerId,{x:e.clientX,y:e.clientY});draw();};
 const up=e=>{pts.delete(e.pointerId);draw();};
 pad.addEventListener('pointerdown',down);pad.addEventListener('pointermove',move);['pointerup','pointercancel','pointerleave'].forEach(t=>pad.addEventListener(t,up));
 el('mtReset').onclick=()=>{max=0;span=0;pts.clear();draw();};
}
function paintQuizTimer(q){
 if(!q||q.type==='zoom')return;
 const timer=el('liveTimer'),fill=el('quizTimeFill'),card=timer?.closest('.quiz');
 const seconds=Math.max(0,Math.ceil(Number(q.remaining)||0));
 if(timer){timer.textContent=seconds+' s';timer.classList.toggle('timerUrgent',seconds<=10);timer.setAttribute('aria-label',seconds+' Sekunden verbleiben');}
 if(fill)fill.style.width=(Math.min(100,seconds/Math.max(1,Number(q.duration)||45)*100))+'%';
 if(card){card.classList.toggle('quizUrgent',seconds<=10&&state?.playing!==false);card.classList.toggle('quizPaused',state?.phase==='film'&&state?.playing===false);}
 const label=el('quizTimerCaption');if(label)label.textContent=state?.phase==='film'&&state?.playing===false?'Ⅱ Film & Quiz pausiert':seconds<=10?'⚡ Letzte 10 Sekunden':'⏱ Zeit für deine Antwort';
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
  const parent=badge.closest('.studentLiveScore');
  if(parent){
   parent.querySelector('.studentScoreGain')?.remove();
   const gain=document.createElement('span');gain.className='studentScoreGain';
   gain.textContent='+'+Math.round(amount-lastStudentPoints).toLocaleString('de-DE')+' Punkte';
   gain.setAttribute('aria-label','Neue Punkte erhalten');
   parent.appendChild(gain);setTimeout(()=>gain.remove(),1900);
  }
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
// ---------- Lehrer-Panel: bleibt neben dem Quiz stehen (wird beim Quiz-Update nicht neu gebaut) ----------
function teacherDock(){
 document.body.classList.add('teacherMode');
 if(document.getElementById('teacherDock'))return;
 const d=document.createElement('aside');d.id='teacherDock';d.className='tDock';d.setAttribute('aria-label','Lehrer-Panel');
 let tab='notes';try{tab=localStorage.getItem('touch_td_tab')||'notes';}catch{}
 d.innerHTML='<div class="tdHead"><div><span class="eyebrow">LEHRER-PANEL</span><b>Mitmachen &amp; nebenbei schreiben</b></div><button type="button" class="tdFold" id="tdFold" aria-label="Panel ein- oder ausklappen">⇥</button></div>'+
  '<nav class="tdTabs">'+[['notes','✎ Notizen'],['live','📊 Live'],['res','🏆 Ergebnisse'],['fb','💬 Feedback']].map(([k,l])=>'<button type="button" data-td="'+k+'">'+l+'</button>').join('')+'</nav>'+
  '<section class="tdPane" data-pane="notes"><div class="tdTools"><button type="button" id="tdStamp" title="Uhrzeit und Filmzeit einfügen">⏱ Zeitstempel</button><div class="tdSeg"><button type="button" data-tdmode="type" class="on">⌨</button><button type="button" data-tdmode="pen">✎</button><button type="button" data-tdmode="erase">⌫</button></div><button type="button" id="tdInkClear" title="Skizze löschen">🗑</button></div>'+
   '<textarea id="teacherNotes" placeholder="Beobachtungen, Rückfragen, Namen für die Besprechung …"></textarea>'+
   '<div class="tdInkWrap"><span>Skizze / Handschrift (Apple Pencil)</span><canvas id="tdInk"></canvas></div>'+
   '<div class="tdBtns"><button type="button" id="saveNotes">💾 Als Datei</button><button type="button" id="printNotes">🖨 Drucken</button></div></section>'+
  '<section class="tdPane" data-pane="live"><div id="tdLive" class="tdData"></div></section>'+
  '<section class="tdPane" data-pane="res"><div id="tdRes" class="tdData"></div></section>'+
  '<section class="tdPane" data-pane="fb"><div id="tdFb" class="tdData"></div></section>';
 document.body.appendChild(d);
 const notes=el('teacherNotes');
 try{notes.value=localStorage.getItem('touch_teacher_notes')||'';}catch{}
 notes.oninput=()=>{try{localStorage.setItem('touch_teacher_notes',notes.value);}catch{}};
 el('tdStamp').onclick=()=>{const t=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),f=state?.time?' · Film '+secText(state.time):'',q=state?.quiz?' · Frage '+(state.quiz.index+1):'';
  const ins='['+t+f+q+'] ',pos=notes.selectionStart??notes.value.length;notes.value=notes.value.slice(0,pos)+(pos&&notes.value[pos-1]!=='\n'?'\n':'')+ins+notes.value.slice(pos);notes.focus();notes.selectionStart=notes.selectionEnd=notes.value.indexOf(ins,pos)+ins.length;notes.oninput();};
 el('saveNotes').onclick=()=>saveText('TOUCH-LIVE-Lehrernotizen.txt',notes.value);
 el('printNotes').onclick=()=>{const w=window.open('','_blank');if(!w)return;const img=el('tdInk').toDataURL('image/png');w.document.write('<title>Lehrernotizen</title><body style="font:14px/1.5 Arial;padding:24px"><h2>TOUCH LIVE · Lehrernotizen</h2><pre style="white-space:pre-wrap;font:inherit">'+esc(notes.value)+'</pre><img src="'+img+'" style="max-width:100%;border:1px solid #ccc"></body>');w.document.close();w.focus();w.print();};
 // Stift-Skizze
 const c=el('tdInk');let mode='type',drawing=false,lastP=null;
 const fitInk=()=>{const r=c.getBoundingClientRect(),dpr=Math.min(3,window.devicePixelRatio||1),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(!w||!h||(c.width===w&&c.height===h))return;c.width=w;c.height=h;let data=null;try{data=localStorage.getItem('touch_teacher_ink');}catch{}if(data){const img=new Image();img.onload=()=>c.getContext('2d').drawImage(img,0,0,c.width,c.height);img.src=data;}};
 const storeInk=()=>{try{localStorage.setItem('touch_teacher_ink',c.toDataURL('image/png'));}catch{}};
 d.querySelectorAll('[data-tdmode]').forEach(b=>b.onclick=()=>{mode=b.dataset.tdmode;d.querySelectorAll('[data-tdmode]').forEach(x=>x.classList.toggle('on',x===b));d.classList.toggle('tdInking',mode!=='type');fitInk();if(mode==='type')notes.focus();});
 c.addEventListener('pointerdown',e=>{if(mode==='type'&&e.pointerType!=='pen')return;if(mode==='type'){mode='pen';d.querySelector('[data-tdmode="pen"]').click();}e.preventDefault();fitInk();drawing=true;c.setPointerCapture(e.pointerId);const r=c.getBoundingClientRect(),k=c.width/r.width;lastP={x:(e.clientX-r.left)*k,y:(e.clientY-r.top)*k};});
 c.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const g=c.getContext('2d'),r=c.getBoundingClientRect(),k=c.width/r.width;for(const ev of(e.getCoalescedEvents?e.getCoalescedEvents():[e])){const p={x:(ev.clientX-r.left)*k,y:(ev.clientY-r.top)*k},pr=ev.pointerType==='pen'&&ev.pressure?ev.pressure:.5;g.globalCompositeOperation=mode==='erase'?'destination-out':'source-over';g.strokeStyle='#1b2a8a';g.lineCap='round';g.lineWidth=(mode==='erase'?18:1.2+pr*2.4)*k;g.beginPath();g.moveTo(lastP.x,lastP.y);g.lineTo(p.x,p.y);g.stroke();lastP=p;}});
 const endInk=()=>{if(!drawing)return;drawing=false;c.getContext('2d').globalCompositeOperation='source-over';storeInk();};
 c.addEventListener('pointerup',endInk);c.addEventListener('pointercancel',endInk);
 el('tdInkClear').onclick=()=>{if(!confirm('Skizze löschen?'))return;c.getContext('2d').clearRect(0,0,c.width,c.height);try{localStorage.removeItem('touch_teacher_ink');}catch{}};
 // Reiter + Ein-/Ausklappen
 const setTab=k=>{tab=k;try{localStorage.setItem('touch_td_tab',k);}catch{}d.querySelectorAll('[data-td]').forEach(b=>b.classList.toggle('on',b.dataset.td===k));d.querySelectorAll('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!==k);if(k==='notes')requestAnimationFrame(fitInk);else teacherOverview();};
 d.querySelectorAll('[data-td]').forEach(b=>b.onclick=()=>setTab(b.dataset.td));
 el('tdFold').onclick=()=>{d.classList.toggle('tdClosed');document.body.classList.toggle('teacherDockClosed',d.classList.contains('tdClosed'));};
 setTab(tab);
 clearInterval(window.__tdTimer);window.__tdTimer=setInterval(()=>{if(role==='teacher'&&tab!=='notes'&&!d.classList.contains('tdClosed')&&!document.hidden)teacherOverview();},4000);
 window.addEventListener('resize',()=>requestAnimationFrame(fitInk));
}
async function teacherOverview(){
 const live=el('tdLive'),res=el('tdRes'),fb=el('tdFb');if(!live)return;
 let key='';try{key=localStorage.getItem('touch_teacher_key')||'';}catch{}
 const ask='<div class="tdKey"><p>Für Live-Übersicht, Namen und Rückmeldungen brauchst du den <b>Lehrer-Link</b> aus dem Admin – oder gib den Lehrer-Code ein:</p><form id="tdKeyForm"><input id="tdKeyInput" type="password" autocomplete="off" placeholder="Lehrer-Code"><button class="primary">Freischalten</button></form></div>';
 const bindAsk=()=>document.querySelectorAll('#tdKeyForm').forEach(f=>f.onsubmit=e=>{e.preventDefault();const v=f.querySelector('input').value.trim();try{localStorage.setItem('touch_teacher_key',v);}catch{}teacherOverview();});
 if(!key){live.innerHTML=res.innerHTML=fb.innerHTML=ask;bindAsk();return;}
 let o;
 try{const r=await fetch('/api/teacher/overview',{headers:{'x-teacher-key':key},cache:'no-store'});o=await r.json();if(!r.ok)throw Error(o.error||'Fehler '+r.status);}
 catch(e){if(/Code/.test(e.message)){try{localStorage.removeItem('touch_teacher_key');}catch{}live.innerHTML=res.innerHTML=fb.innerHTML='<p class="tdErr">'+esc(e.message)+'</p>'+ask;bindAsk();}else live.innerHTML='<p class="tdErr">Keine Verbindung: '+esc(e.message)+'</p>';return;}
 const pct=(a,b)=>b?Math.round(a/b*100):0,phaseName={welcome:'Willkommen',film:'Film läuft',trailer:'Trailer',zoom:'Zoom-Spiel',gesture:'Finger-Mission',demo:'Testquiz',results:'Ergebnisse',end:'Abschluss',handout:'Handout'}[o.phase]||o.phase;
 const asked=o.questions.filter(q=>q.answered>0);
 const hardest=asked.filter(q=>q.type!=='zoom').map(q=>({...q,rate:pct(q.correct,q.answered)})).sort((a,b)=>a.rate-b.rate).slice(0,3);
 live.innerHTML='<div class="tdStats"><div><small>Status</small><b>'+esc(phaseName)+'</b></div><div><small>Filmzeit</small><b>'+secText(o.time||0)+'</b></div><div><small>Teilnehmer</small><b>'+o.participants+'</b></div></div>'+
  (o.current?'<div class="tdNow"><small>AKTUELLE FRAGE '+o.current.nr+(o.current.accepting?' · noch '+o.current.remaining+' s':' · beendet')+'</small><p>'+esc(o.current.q)+'</p><div class="tdBar"><i style="width:'+pct(o.current.answered,o.participants)+'%"></i></div><small>'+o.current.answered+' von '+o.participants+' haben geantwortet</small></div>':'<p class="small">Gerade läuft keine Frage.</p>')+
  (hardest.length?'<h4>Am schwierigsten bisher</h4>'+hardest.map(q=>'<div class="tdQ"><span class="tdRate '+(q.rate<50?'low':'')+'">'+q.rate+' %</span><div><b>Frage '+q.nr+'</b> '+esc(q.q)+'<small>Richtig: '+esc(q.answer)+'</small></div></div>').join(''):'')+
  '<h4>Alle Fragen</h4><table class="tdTable"><thead><tr><th>#</th><th>Antworten</th><th>richtig</th></tr></thead><tbody>'+o.questions.filter(q=>q.type!=='zoom').map(q=>'<tr title="'+esc(q.q)+'"><td>'+q.nr+'</td><td>'+q.answered+'</td><td>'+(q.answered?pct(q.correct,q.answered)+' %':'–')+'</td></tr>').join('')+'</tbody></table>';
 res.innerHTML=o.players.length?'<table class="tdTable tdPlayers"><thead><tr><th>#</th><th>Name</th><th>Punkte</th><th>✓</th><th>✗</th></tr></thead><tbody>'+o.players.map((p,i)=>'<tr><td>'+(i+1)+'</td><td><span class="tdDot '+(p.online?'on':'')+'"></span>'+esc(p.name)+(p.role==='teacher'?' <small>Lehrer</small>':'')+'</td><td><b>'+p.score+'</b></td><td>'+p.correct+'</td><td>'+p.wrong+'</td></tr>').join('')+'</tbody></table><p class="small">● online · Liste aktualisiert sich alle 4 Sekunden.</p>':'<p class="small">Noch niemand angemeldet.</p>';
 fb.innerHTML='<div class="tdStats"><div><small>Rückmeldungen</small><b>'+o.feedback.count+'</b></div><div><small>Ø Bewertung</small><b>'+(o.feedback.average!==null?String(o.feedback.average).replace('.',',')+' / 10':'–')+'</b></div></div>'+
  (o.feedback.latest.length?o.feedback.latest.map(f=>'<article class="tdFb">'+(f.rating?'<b>'+f.rating+'/10</b>':'')+'<pre>'+esc(f.text)+'</pre></article>').join(''):'<p class="small">Noch keine Handout-Rückmeldungen.</p>');
}
function userPage(){
 const isTeacher=role==='teacher',userRole=isTeacher?'teacher':'student';
 if(isTeacher)teacherDock();
 const idKey='touch_'+userRole+'_id',nameKey='touch_'+userRole+'_name';
 userId=localStorage.getItem(idKey)||'';userName=localStorage.getItem(nameKey)||'';
 if(!userId||!userName||(state&&state.player===null)){wrap((isTeacher?page('Lehreransicht','LEHRER · MITMACHEN UND NOTIZEN','Hier startet die gemeinsame Touchscreen-Präsentation.'):'<div class="studentEntryIntro"><span class="eyebrow">GEMEINSAM · LIVE · LERNFELD 14</span><h1>Du bist <em>dabei.</em></h1><p>Gib deinen Vornamen ein. Die Fragen und Spiele erscheinen automatisch, wenn sie an der Reihe sind. Vorher siehst du nichts davon.</p></div>')+'<div class="card studentJoinCard" style="max-width:550px"><h2>Willkommen bei TOUCH LIVE</h2><p>Gib deinen Anzeigenamen ein. Es ist kein Konto nötig.</p><form id="joinForm"><label>Dein Vorname oder Spitzname</label><input id="joinName" maxlength="26" required placeholder="Dein Name" autocomplete="nickname"><p></p><button class="primary">Jetzt teilnehmen</button></form></div>');el('joinForm').onsubmit=async e=>{e.preventDefault();requestParticipantFullscreen();try{const name=el('joinName').value.trim();const x=await api('/api/join','POST',{id:state&&state.player===null?'':userId,name,role:userRole});localStorage.setItem(idKey,x.id);localStorage.setItem(nameKey,name);renderSignature='';await poll();}catch(err){alert(err.message);}};return;}
 if(!state){wrap(waiting('Verbindung wird hergestellt …','Die Präsentation wird geladen.'));participantMode();return;}
 const q=state.quiz,p=state.player||{},answered=q&&p.choice!==null&&p.choice!==undefined;
 let body='';
 if(state.phase==='welcome')body=waiting('Willkommen, '+esc(userName)+'!','Wir beginnen gleich. Bitte schaut auf den Beamer.','✦');
 else if(state.phase==='gesture'||state.sideGame==='gesture')body='<div class="card fingerMissionCard"><div id="fingerMissionMount"></div></div>';
 else if(q&&q.type==='zoom')body=zoomCard(q,p,answered);
 else if(q&&!q.accepting)body=waiting('Schau auf den Beamer.','Die Antwortzeit ist vorbei. Die Dokumentation läuft weiter.','◉');
  else if(q){const hide=p.hide||[],jk=p.jokers||{},canJ=q.jokers&&q.accepting&&!answered;
  const jbar=q.jokers?'<div class="jokers">'+(jk.fifty?'':'<button class="joker" data-joker="fifty" '+(canJ?'':'disabled')+'>50:50</button>')+(jk.hint?'':'<button class="joker" data-joker="hint" '+(canJ?'':'disabled')+'>💡 Tipp</button>')+(jk.fifty&&jk.hint?'<span class="small">Alle Joker eingesetzt</span>':'<span class="small">Jeder Joker nur einmal im ganzen Abschlussquiz</span>')+'</div>':'';
  body='<div class="card quiz quizCinematic"><div class="between"><span class="chip">'+(q.jokers?'ABSCHLUSSQUIZ · ':'')+'FRAGE '+(q.index+1)+' / '+q.total+'</span><div class="quizTimerHud"><div id="liveTimer" class="timer">'+q.remaining+' s</div><div class="quizTimeTrack" aria-hidden="true"><i id="quizTimeFill"></i></div><small class="quizTimerCaption" id="quizTimerCaption">⏱ Zeit für deine Antwort</small></div></div>'+jbar+'<h2>'+esc(q.q)+'</h2>'+(p.hint?'<div class="hintbox">💡 '+esc(p.hint)+'</div>':'')+'<div class="answers">'+q.a.map((v,i)=>'<button class="answer'+(answered&&p.choice===i?' chosen':'')+(hide.includes(i)?' gone':'')+'" style="--answer-index:'+i+'" data-choice="'+i+'" '+(answered||!q.accepting||hide.includes(i)?'disabled':'')+'><b>'+String.fromCharCode(65+i)+'</b><span>'+esc(v)+'</span></button>').join('')+'</div><p class="small" style="margin-top:17px">'+(answered?'Deine Antwort ist gespeichert. Dein Punktestand oben wird automatisch aktualisiert. Schau jetzt wieder auf den Film.':q.accepting?'Wähle eine Antwort. Jede Frage kann nur einmal beantwortet werden.':'Antwortzeit vorbei. Bitte wieder auf den Beamer schauen.')+'</p></div>';}
 else if(state.phase==='results'||state.phase==='end'||state.phase==='handout')body='<div class="card"><span class="eyebrow">ABSCHLUSS</span><h2>Danke für deine Rückmeldung!</h2><p>Dein Punktestand</p><div class="values">'+(p.score||0)+'</div>'+prizeCard()+zoomSolution()+'<h3>Gemeinsame Rangliste</h3>'+ranking()+'<div class="flex" style="margin-top:23px"><a href="/#handout" class="btn primary">Handout ausfüllen & PDF speichern</a><a href="/" class="btn">🎮 Touch-Labor & Schach</a></div></div>';
 else body=waiting('Bitte auf den Beamer schauen.','Die Dokumentation läuft. Die nächste Frage erscheint automatisch.','◉');
 // Film + subtitles on every device (phone, iPad, laptop) via the synchronized /watch page.
 const onlineFilm=state.video&&['youtube','url','upload'].includes(state.video.type)||state.remoteVideo&&state.remoteVideo.type!=='none';
 if(role==='join'&&onlineFilm&&['welcome','film'].includes(state.phase)&&!state.sideGame&&!(q&&q.accepting))body+='<p class="studentWatchLink" style="text-align:center;margin-top:18px"><a class="btn" href="/watch">🎬 Film mit Untertiteln auf diesem Gerät ansehen</a></p>';
 const notes='';
 wrap(page('Die Dokumentation läuft.',isTeacher?'LEHRER · LIVE MITMACHEN':'SCHÜLER · LIVE MITMACHEN',isTeacher?'Teilnehmer: '+esc(userName)+' · Lehrer · '+state.participants+' angemeldet':'👤 '+esc(userName))+body+notes);
 document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=async()=>{
  if(b.disabled)return;
  const choice=Number(b.dataset.choice);
  document.querySelectorAll('[data-choice]').forEach(option=>{option.disabled=true;option.classList.toggle('answerSubmitting',option===b);});
  b.setAttribute('aria-pressed','true');
  try{await api('/api/answer','POST',{id:userId,choice});renderSignature='';await poll();}
  catch(e){alert(e.message);renderSignature='';await poll();}
 });
 document.querySelectorAll('[data-joker]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/api/joker','POST',{id:userId,type:b.dataset.joker});}catch(e){alert(e.message);}renderSignature='';await poll();});
 if(q?.type==='zoom')initEaster();else if(q)paintQuizTimer(q);
 if(isTeacher)teacherDock();
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
 musicPlanCard();
 organizeAdmin();
}
// Admin in übersichtliche Reiter gliedern. Die Karten werden nur verschoben/ein- und
// ausgeblendet – alle Knöpfe und Funktionen bleiben unverändert.
const MUSIC_PLAN_LABEL='MUSIK-PLAN';
const ADMIN_TABS=[
 ['live','🎬 Live','Präsentation, Trailer, Spiele',['LIVE-REGIE','TRAILER','ZOOM','CO-MODERATION']],
 ['film','🎞 Film & Untertitel','Filmquelle, Untertitel, Darstellung',['FILMQUELLE','UNTERTITEL']],
 ['musik','♫ Musik & Spotify','Willkommen, Abschluss, Spotify',['MUSIK-PLAN','WILLKOMMEN','SPOTIFY','ORIGINALMUSIK']],
 ['leute','👥 Teilnehmer','Links, Ergebnisse, Antworten, Handout',['LINKS','ERGEBNISSE','NUR FÜR DICH','HANDOUT']],
 ['quiz','📝 Quizfragen','Zeitmarken und Fragen bearbeiten',['TIMELINE']]
];
let adminTab=(()=>{try{return localStorage.getItem('touch_admin_tab')||'live';}catch{return 'live';}})(),adminObserver=null;
function adminCardTab(card){
 const label=((card.querySelector('.label')||{}).textContent||'').toUpperCase();
 for(const [id,,,keys] of ADMIN_TABS)if(keys.some(k=>label.includes(k)))return id;
 return 'live';
}
function musicPlanCard(){
 const root=el('adminRoot');if(!root||el('musicPlanCard'))return;
 const c=document.createElement('section');c.id='musicPlanCard';c.className='card';
 const row=(slot,title,sub)=>'<div class="mpRow" data-slot="'+slot+'"><div class="mpHead"><b>'+title+'</b><small>'+sub+'</small></div>'+
  '<div class="mpSeg">'+[['off','Aus'],['touch','♫ Eigene Melodie'],['spotify','Spotify']].map(([m,l])=>'<button type="button" data-mode="'+m+'">'+l+'</button>').join('')+'</div>'+
  '<div class="mpSpotify" hidden><div class="flex"><input type="url" class="mpUrl" placeholder="https://open.spotify.com/playlist/… oder Song-Link"><button type="button" class="mpSave primary">Übernehmen</button></div>'+
  '<div class="flex mpSearchRow"><input type="search" class="mpQuery" placeholder="Spotify durchsuchen, z. B. Chill, Lofi, Party"><button type="button" class="mpSearch">🔎 Suchen</button></div><div class="mpResults"></div></div>'+
  '<p class="small mpNow"></p></div>';
 c.innerHTML='<span class="label">'+MUSIC_PLAN_LABEL+' · WILLKOMMEN &amp; ABSCHLUSS</span><h2>Welche Musik läuft wann?</h2><p class="small">Spotify spielt über die Spotify-App des LG-Fernsehers (einmal am Handy oder hier mit Spotify anmelden). Beim Film, Trailer und Quiz wird die Musik automatisch gestoppt.</p>'+
  row('welcome','Willkommensfolie','läuft, bis du den Film startest')+row('end','Abschluss / Dankeschön-Folie','läuft nach der Siegerehrung');
 root.appendChild(c);
 const paint=()=>{const plan=state?.musicPlan||{};c.querySelectorAll('.mpRow').forEach(r=>{const p=plan[r.dataset.slot]||{mode:r.dataset.slot==='welcome'?'touch':'off'};
  r.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===p.mode));
  r.querySelector('.mpSpotify').hidden=p.mode!=='spotify'&&!r.dataset.picking;
  const u=r.querySelector('.mpUrl');if(u&&document.activeElement!==u&&p.url)u.value=p.url;
  r.querySelector('.mpNow').textContent=p.mode==='off'?'Keine Musik.':p.mode==='touch'?'Eigene TOUCH-LIVE-Melodie in Dauerschleife (am LG einmal OK für Ton).':p.url?'Spotify: '+(p.title||p.url)+(state?.spotifyLinked?'':' · ⚠ Spotify noch nicht verbunden – am Handy unter /control anmelden.'):'Spotify gewählt – bitte Song oder Playlist auswählen.';});};
 const save=async(slot,mode,url,title)=>{try{await api('/api/admin','POST',{cmd:'musicPlan',slot,mode,url,title},adminKey);await poll(true);paint();}catch(e){alert(e.message);}};
 c.querySelectorAll('.mpRow').forEach(r=>{const slot=r.dataset.slot;
  r.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(b.dataset.mode==='spotify'){r.dataset.picking='1';const cur=state?.musicPlan?.[slot];if(cur?.mode==='spotify')save(slot,'spotify',cur.url,cur.title);else{r.querySelector('.mpSpotify').hidden=false;r.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('on',x===b));}}else{delete r.dataset.picking;save(slot,b.dataset.mode);}});
  r.querySelector('.mpSave').onclick=()=>save(slot,'spotify',r.querySelector('.mpUrl').value.trim());
  r.querySelector('.mpSearch').onclick=async()=>{const q=r.querySelector('.mpQuery').value.trim(),out=r.querySelector('.mpResults');if(q.length<2)return;
   if(!window.SpotifyConnect?.api||!(window.SpotifyConnect.connected()||state?.spotifyLinked)){out.innerHTML='<p class="small">Für die Suche erst mit Spotify anmelden (unten im Spotify-Bereich). Einen Link kannst du jederzeit oben einfügen.</p>';return;}
   out.innerHTML='<p class="small">Suche …</p>';
   try{const d=await window.SpotifyConnect.api('/search?'+new URLSearchParams({q,type:'playlist,track',limit:'6'}));
    const items=[...(d.playlists?.items||[]).filter(Boolean).map(x=>({...x,k:'playlist',sub:'Playlist'})),...(d.tracks?.items||[]).filter(Boolean).map(x=>({...x,k:'track',sub:(x.artists||[]).map(a=>a.name).join(', ')}))];
    out.innerHTML=items.map((x,i)=>'<button type="button" class="mpItem" data-i="'+i+'"><b>'+esc(x.name)+'</b><small>'+esc(x.sub)+'</small></button>').join('')||'<p class="small">Nichts gefunden.</p>';
    out.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const x=items[Number(b.dataset.i)];save(slot,'spotify','https://open.spotify.com/'+x.k+'/'+x.id,x.name+(x.k==='track'?' – '+x.sub:''));});
   }catch(e){out.innerHTML='<p class="small">Suche nicht möglich: '+esc(e.message)+'</p>';}};
 });
 paint();window.__paintMusicPlan=paint;
}
function organizeAdmin(){
 const root=el('adminRoot');if(!root)return;
 let nav=el('adminTabs'),panels=el('adminPanels');
 if(!nav){
  nav=document.createElement('nav');nav.id='adminTabs';nav.className='adminTabs';nav.setAttribute('role','tablist');
  nav.innerHTML=ADMIN_TABS.map(([id,title,sub])=>'<button type="button" role="tab" data-admin-tab="'+id+'"><b>'+title+'</b><small>'+sub+'</small></button>').join('');
  panels=document.createElement('div');panels.id='adminPanels';panels.className='adminPanels';
  const status=el('adminStatus');
  if(status){status.classList.add('adminStickyStatus');status.after(nav);}else root.prepend(nav);
  nav.after(panels);
  nav.onclick=e=>{const b=e.target.closest('[data-admin-tab]');if(!b)return;adminTab=b.dataset.adminTab;try{localStorage.setItem('touch_admin_tab',adminTab);}catch{}applyAdminTab();window.scrollTo({top:0,behavior:'smooth'});};
 }
 const st=el('adminStatus');if(st&&st.parentElement===root&&root.firstElementChild!==st)root.prepend(st);
 // Collect every top-level card (also ones added later, e.g. trailer or feedback panel).
 const cards=[...root.querySelectorAll('.card')].filter(c=>!c.parentElement.closest('.card')&&!panels.contains(c));
 for(const c of cards){c.dataset.adminGroup=adminCardTab(c);c.style.marginTop='';panels.appendChild(c);}
 // Most important card first within each tab (keyword order in ADMIN_TABS).
 const rank=c=>{const t=ADMIN_TABS.find(x=>x[0]===c.dataset.adminGroup),l=((c.querySelector('.label')||{}).textContent||'').toUpperCase();const i=t?t[3].findIndex(k=>l.includes(k)):-1;return i<0?99:i;};
 [...panels.children].sort((x,y)=>rank(x)-rank(y)).forEach(c=>panels.appendChild(c));
 root.querySelectorAll(':scope > .grid2').forEach(g=>{if(!g.querySelector('.card'))g.remove();});
 applyAdminTab();
 if(!adminObserver){adminObserver=new MutationObserver(()=>{const r=el('adminRoot');if(!r)return;if([...r.children].some(c=>c.classList?.contains('card')))organizeAdmin();});}
 adminObserver.disconnect();adminObserver.observe(root,{childList:true});
}
function applyAdminTab(){
 if(!ADMIN_TABS.some(t=>t[0]===adminTab))adminTab='live';
 document.querySelectorAll('[data-admin-tab]').forEach(b=>{const on=b.dataset.adminTab===adminTab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
 document.querySelectorAll('#adminPanels > .card').forEach(c=>{c.hidden=c.dataset.adminGroup!==adminTab;});
}
function adminContents(){const a=adminInfo,student=location.origin+'/join',teacher=ORIGIN+'#teacher'+(a?.teacherKey?'?key='+encodeURIComponent(a.teacherKey):''),remoteHost=location.origin+'/host?key='+encodeURIComponent(a?.cohostKey||''),tv=a?ORIGIN+'#tv?key='+encodeURIComponent(a.tvKey):'Admin wird verbunden';return '<div class="status" id="adminStatus">Verbindung zur Live-Sitzung wird geprüft …</div><div class="grid2"><div class="stack"><section class="card"><span class="label">01 / LIVE-REGIE</span><h2>Präsentation steuern</h2><div class="control"><button data-action="welcome">Willkommen</button><button class="primary" data-action="start">▶ Film starten</button><button class="primary" type="button" data-action="trailerStart" title="Den hochgeladenen Trailer auf dem verbundenen Beamer oder Fernseher zeigen">📺 Trailer auf TV zeigen</button><button type="button" data-action="trailerPause">⏸ Trailer pausieren</button><button type="button" data-action="trailerResume">▶ Trailer weiter</button><button type="button" data-action="trailerStop">⏹ Trailer beenden</button><button type="button" data-action="reloadPresentation" title="Nur im Willkommen- oder Endbildschirm möglich">⟳ Präsentation neu laden</button><a class="btn mobileRemoteLaunch" href="/control" target="_blank" rel="noopener noreferrer">📱 Handy-Fernbedienung</a><button type="button" data-action="restartVideo" title="Video auf 00:00 setzen und pausieren; Quizpunkte bleiben erhalten">⏮ Video auf Anfang</button><button data-action="pause">Ⅱ Pausieren</button><button data-action="play">▶ Weiter</button><button data-action="gestureStart">🖐️ Finger-Mission starten (30 s)</button><button data-action="gestureEnd">Finger-Mission beenden</button><button data-action="demo">Testquiz starten</button><button data-action="demoNext">Nächste Testfrage</button><button data-action="results">Ergebnisse zeigen</button><button data-action="handout">Handout anzeigen</button><button data-action="end">Abschluss</button><button class="danger" data-action="reset">Zurücksetzen</button></div><label for="filmVolume">Film-Lautstärke (HDMI): <strong id="filmVolumeLabel">100 %</strong></label><input id="filmVolume" type="range" min="0" max="100" step="5" value="100"><label>Filmzeit manuell einstellen (in Sekunden)</label><div class="flex"><input id="seekTime" type="number" min="0" max="3107" value="268" style="max-width:170px"><button id="seekButton">Zur Zeit springen</button></div><p class="notice">Die 17 Quizfragen werden über die Film-Zeitmarken gesteuert. In der fertigen Doku gibt es Zeitfenster von 4:28 bis 46:21.</p></section><section class="card welcomeMusicAdmin"><span class="label">01 / WILLKOMMEN · DIREKT AUF DEM LG</span><h2>♫ Willkommensmusik starten</h2><p class="small">Die eigene TOUCH-LIVE-Melodie wird <strong>direkt auf der LG-Webseite</strong> gespielt, läuft in Dauerschleife und braucht keine Spotify-Anmeldung. Am LG-Fernseher einmal <strong>„♫ LG-Musik starten“</strong> oder <strong>„⛶ Vollbild – OK“</strong> wählen, damit der Ton freigegeben ist.</p><div class="spotifyWelcomeControls"><button type="button" id="musicOnButton" class="primary">♫ LG-Willkommensmusik starten</button><button type="button" id="musicOffButton">⏹ LG-Musik stoppen</button><a class="btn" href="/control" target="_blank" rel="noopener noreferrer">📱 Vom Handy steuern</a></div><p class="small" id="spotifyStatus" role="status">Die LG-Musik ist eine eigene Endlosschleife und keine kurze Spotify-Vorschau.</p><div class="line"></div><span class="label">02 / SPOTIFY · OPTIONAL UND SEPARAT</span><h3>Spotify-Playlists und Spotify Connect</h3><p class="small">Du kannst Playlists suchen und auf unterstützten Spotify-Connect-Geräten abspielen. Der Spotify-Player wird auf dem LG-Browser nicht mehr eingeblendet, weil er dort nur die kurze „Preview“ abgespielt hat. Für vollständige Spotify-Songs nutze Spotify Connect oder die Spotify-App.</p><form id="spotifyForm"><label for="spotifyInput">Spotify-Song oder Playlist-Link</label><div class="flex"><input type="url" id="spotifyInput" placeholder="https://open.spotify.com/playlist/..." autocomplete="url" required><button type="submit">Playlist übernehmen</button></div></form><div id="spotifyAccountPanel" class="spotifyAccountPanel"></div><div class="spotifyPreviewControls"><button type="button" id="spotifyPreviewToggle">▸ Spotify-Playlist hier anzeigen</button><a id="spotifyOpenExternal" target="_blank" rel="noopener noreferrer" href="https://open.spotify.com/">In Spotify öffnen</a></div><div id="spotifyAdminEmbed" class="spotifyAdminEmbed" hidden></div></section><section class="card autoSoundtrackAdmin"><span class="label">ORIGINALMUSIK · AUTOMATISCH</span><h2>🎵 Pausen & Siegerehrung</h2><p class="small">Eigene instrumentale Musik von TOUCH LIVE: ruhiger Sound, wenn du die Dokumentation pausierst, und festliche Musik für die Top-3-Ergebnisse. Beim Abspielen des Films ist die Hintergrundmusik AUS. Spotify bleibt unabhängig für die Musikauswahl vor der Doku.</p><div class="autoSoundtrackSettings"><label class="soundtrackCheck"><input type="checkbox" id="soundPauseEnabled"> Musik bei Filmpause</label><label class="soundtrackCheck"><input type="checkbox" id="soundResultsEnabled"> Siegerehrungs-Musik</label><label for="soundVolume">Musiklautstärke: <strong id="soundVolumeLabel">25 %</strong></label><input id="soundVolume" type="range" min="0" max="60" step="5" value="25"></div><p id="soundtrackStatus" class="small" role="status">Die Musik wird auf dem LG-Fernseher abgespielt. Beim ersten Start einmal mit OK den Ton freigeben.</p></section><section class="card"><span class="label">02 / FILMQUELLE</span><h2>Film auswählen</h2><div class="adminVideoHeader"><label for="videoTitleInput">Titel deiner Dokumentation</label><div class="flex"><input id="videoTitleInput" maxlength="110" placeholder="TOUCHSCREEN – Interaktive Dokumentation"><button id="saveVideoTitle" type="button">Titel speichern</button></div><p class="small" id="titleSaveStatus">Der Titel erscheint in der Filmübersicht und auf dem Beamer.</p><div id="videoNow" class="videoNow">Noch keine Filmquelle ausgewählt.</div><div class="sharedLibraryPanel"><b>Auf PC, Handy, iPad und LG-Fernseher</b><p id="sharedLibraryStatus" role="status" class="small">Prüfe gespeichertes Video und Untertitel …</p><div class="flex"><a class="btn" href="/watch" target="_blank" rel="noopener noreferrer">▶ Video auf iPad/Handy ansehen</a><a class="btn" href="/join" target="_blank" rel="noopener noreferrer">🎮 Schüler-Quiz öffnen</a></div><p class="small">Der Videolink und die Untertitel werden zentral mit allen Geräten geteilt. Für dauerhafte Speicherung trotz Neustart ist Cloud-Speicher erforderlich.</p></div></div><div class="cloudSourceCard"><span class="label">01 / CLOUD-FILMQUELLE</span><h3>Google Drive oder iCloud Drive</h3><p>Probiere zuerst deinen Cloud-Link. Es ist kein zusätzlicher Upload auf TOUCH LIVE nötig. Die Datei muss für „Alle mit dem Link“ freigegeben sein.</p><form id="cloudForm"><label for="cloudProvider">Speicher auswählen</label><select id="cloudProvider"><option value="drive">Google Drive – Videodatei</option><option value="icloud">iCloud Drive – Freigabelink</option></select><label for="cloudUrl">Öffentlicher Freigabelink</label><input type="url" id="cloudUrl" placeholder="https://drive.google.com/file/d/.../view" autocomplete="url" required><div class="flex" style="margin-top:12px"><button class="primary" type="submit">☁ Cloud-Video verwenden</button><button type="button" id="restoreCloud" hidden>Letzten Cloud-Link wiederherstellen</button></div><p class="small" id="cloudSaveStatus" role="status">Google Drive versucht zuerst die MP4 direkt abzuspielen. Falls das nicht geht, erscheint die Google-Drive-Vorschau. iCloud öffnet den freigegebenen Film über Apple.</p></form><div class="cloudSourceWarning"><b>Wichtig für das automatische Quiz:</b> Nur ein direkt abspielbares MP4-Video oder YouTube lässt sich sicher mit den Film-Zeitmarken synchronisieren. Bei Google-Drive-Vorschau und iCloud-Freigabe kann die Synchronisierung eingeschränkt sein. Vor der Schulstunde auf deinem LG-Fernseher testen.</div><p class="small"><a href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener noreferrer">Google Drive öffnen</a> · <a href="https://www.icloud.com/iclouddrive/" target="_blank" rel="noopener noreferrer">iCloud Drive öffnen</a></p></div><div class="line"></div><div class="cloudFallbackCaption"><span class="label">02 / PLAN B</span><h3>YouTube – nicht gelistet</h3></div><form id="youtubeForm"><label for="youtubeInput">YouTube-Video – auch „Nicht gelistet“</label><p class="small">Dein Plan B: Lade den Film einmal bei YouTube als „Nicht gelistet“ hoch. Füge den Link hier ein und alle Geräte können ihn abspielen.</p><input id="youtubeInput" placeholder="https://www.youtube.com/watch?v=..." type="url"><p></p><button class="primary">▶ YouTube-Video übernehmen</button> <button type="button" id="restoreYoutube" hidden>Letzten Link wiederherstellen</button><p id="youtubeSaveStatus" class="small">Bei einem Server-Neustart kannst du den zuletzt verwendeten Link auf diesem Gerät wiederherstellen.</p><p class="small"><a href="https://studio.youtube.com/" target="_blank" rel="noopener noreferrer">Video in YouTube Studio hochladen</a> · Sichtbarkeit dort auf „Nicht gelistet“ stellen.</p></form><div class="line"></div><form id="mp4Form"><label>Direkter MP4-Link (HTTPS)</label><input id="mp4Input" placeholder="https://.../touchscreen.mp4" type="url"><p></p><button>MP4-Link verwenden</button></form><div class="line"></div><div class="directUpload"><span class="label">KOSTENLOS · LOKALE MP4 ÜBER HDMI</span><h3>Film vom Windows-PC abspielen – kein Upload</h3><p>Verbinde deinen Windows-PC per HDMI mit dem Fernseher, öffne dort den Beamerlink und wähle <b>die 3,03-GB-MP4 direkt vom PC</b>. Nur dieser PC lädt das Video von der eigenen Festplatte. Schüler und Lehrer bleiben online mit Quiz, Zoom-Spiel und Handout verbunden.</p><button id="useLocalHdmi" type="button" class="primary">🖥️ Lokale MP4 / HDMI aktivieren</button><p id="localMediaAdminStatus" class="small" role="status">Erst Modus aktivieren, dann MP4 am Beamer-PC auswählen und dort den Ton freigeben.</p><p class="small">Admin-Steuerung: Film starten, pausieren, fortsetzen, spulen und Lautstärke ändern. Wenn der Beamer-Browser neu geladen wird, musst du die lokale Datei aus Sicherheitsgründen erneut auswählen.</p></div><div class="directUpload twoCitiesRemoteAdmin"><span class="label">ZUSAMMEN SCHAUEN · ZWEI STÄDTE</span><h3>Online-Film für die andere Stadt</h3><p><a class="btn primary" href="'+esc(remoteHost)+'" target="_blank" rel="noopener noreferrer">📁 Film aus meinen Dateien hochladen und auf meinem Gerät gemeinsam starten</a></p><p>Der private Regie-Link öffnet die Datei-Auswahl, den Upload-Fortschritt und den gemeinsamen Startknopf. Ohne Cloud-Speicher bleibt der Upload deaktiviert.</p><p>Die MP4 auf deinem Windows-PC bleibt lokal über HDMI. Andere Städte brauchen einen <b>separaten Online-Videolink zur identischen Dokumentation</b> (z. B. YouTube „Nicht gelistet“). Beide sehen dieselben Quizfragen, das Zoom-Spiel und die Ergebnisse zur gleichen Filmzeit.</p><form id="remoteVideoForm"><label for="remoteVideoInput">YouTube-Link oder direkte HTTPS-MP4 für entfernte Zuschauer</label><div class="flex"><input id="remoteVideoInput" type="url" placeholder="https://www.youtube.com/watch?v=..." required><button class="primary" type="submit">Online-Film speichern</button></div></form><div class="flex" style="margin-top:12px"><a class="btn" href="/watch" target="_blank" rel="noopener noreferrer">Zuschaueransicht testen</a><a class="btn" href="'+esc(remoteHost)+'" target="_blank" rel="noopener noreferrer">Eigene Regie &amp; Quiz öffnen</a><button type="button" id="remoteVideoClear">Online-Film entfernen</button></div><p id="remoteVideoStatus" class="small" role="status">Noch kein separater Online-Film eingestellt.</p><p class="small">Auf einem Handy/iPad wechselt die Zuschaueransicht automatisch zum Quiz und danach zum Film. Für zwei Geräte läuft der Film auf /watch und das Quiz auf /join. <b>Keine automatische Übertragung deiner lokalen Festplatte ins Internet.</b></p></div><div class="directUpload"><span class="label">MP4 DIREKT AUF TOUCH LIVE</span><h3>Video nur einmal hochladen</h3><p class="small">Für deinen ca. 3,03-GB-Film benötigst du einen verbundenen Cloud-Speicher. Ohne Speicher wird hier kein erfolgloser Upload gestartet.</p><div class="cloudStorageStatus" id="cloudStorageState" aria-live="polite">Speicher wird geprüft …</div><label for="bigFile">MP4-Datei auswählen (bis 10 GB)</label><input type="file" id="bigFile" accept=".mp4,video/mp4" disabled><div class="flex" style="margin-top:10px"><button id="uploadButton" type="button" class="primary" disabled>MP4 hochladen</button><button id="useStoredVideo" type="button" disabled>Gespeicherten Film verwenden</button></div><p id="uploadInfo" class="small" role="status"></p><div class="cloudHelp" id="cloudHelp"><b>Cloud-Speicher noch nicht verbunden?</b><p>Cloudflare R2 kann für einen Film dieser Größe innerhalb des monatlichen Gratis-Kontingents liegen. Du musst den Bucket einmalig mit Render verbinden.</p><div class="flex"><a href="https://dash.cloudflare.com/" class="btn" target="_blank" rel="noopener noreferrer">Cloudflare R2 öffnen</a><a href="https://dashboard.render.com/web/srv-dbn0f7ei0phs73d16p20" class="btn" target="_blank" rel="noopener noreferrer">Render-Einstellungen</a><a href="https://github.com/Marlonobo/Marlonobo/blob/main/touch-live-sync-v4/SPEICHER_EINRICHTEN.md" class="btn" target="_blank" rel="noopener noreferrer">Einrichtung lesen</a></div></div></div></section></div><div class="stack"><section class="card"><span class="label">03 / LINKS FÜR ALLE GERÄTE</span><h2>Deine vier Ansichten</h2><b>Beamer / LG-Fernseher</b><div class="linkbox" id="tvLink">'+esc(tv)+'</div><button id="copyTv">Beamerlink kopieren</button><div class="line"></div><b>Schüler – iPad</b><div class="linkbox" id="studentLink">'+esc(student)+'</div><button id="copyStudent">Schülerlink kopieren</button><div class="line"></div><b>Lehrer – iPad (mit Notizen)</b><div class="linkbox" id="teacherLink">'+esc(teacher)+'</div><button id="copyTeacher">Lehrerlink kopieren</button><p class="small">Der Admin-Link bleibt privat. Gib nur die Schüler- und Lehrerlinks weiter.</p></section><section class="card"><span class="label">04 / UNTERTITEL</span><h2>Untertitel an oder aus</h2><div class="subtitleQuick"><button type="button" id="subtitleQuickToggle" class="subtitleToggle" aria-pressed="true">Untertitel: AN</button><div><b>Untertitel für Beamer, Handy und iPad</b><p class="small">Schalte die hochgeladenen SRT/VTT-Untertitel jederzeit ein oder aus. Weiße Schrift ohne schwarzen Balken.</p></div></div><div class="subtitleFileStatus" id="subtitleFileStatus" role="status">Prüfe, ob eine Untertiteldatei geladen ist …</div><label>Untertitel-Datei hochladen (.vtt oder .srt)</label><input type="file" id="subtitleFile" accept=".vtt,.srt,text/vtt,text/plain"><p></p><button id="uploadVtt">Untertitel speichern</button><label>Untertitel um Sekunden verschieben</label><div class="flex"><input id="subOffset" type="number" step=".5" value="'+(state?.subtitleOffset||0)+'" style="max-width:130px"><button id="saveSubOffset">Speichern</button></div><label>Quiz-Zeitmarken korrigieren (Sekunden)</label><div class="flex"><input id="quizOffset" type="number" step=".5" value="'+(state?.quizOffset||0)+'" style="max-width:130px"><button id="saveQuizOffset">Speichern</button></div><p class="small">Vorhandene VTT-Zeitcodes laufen mit dem Film mit. Vollautomatische Spracherkennung und Übersetzung benötigen einen separaten Dienst.</p></section><section class="card"><span class="label">05 / ERGEBNISSE</span><h2>Teilnahme & Übersicht</h2><div class="between"><span id="adminParticipants">0 Teilnehmende</span><span id="adminTime">00:00</span></div><div id="adminRanking" class="small">Ergebnisse erscheinen nach dem Quiz.</div><div class="adminPlayersPanel"><div class="between"><h3>👥 Teilnehmer verwalten</h3><button type="button" id="adminPlayersRefresh">↻ Aktualisieren</button></div><p class="small">Nur hier in deiner privaten Regie: Namen ändern, Personen entfernen oder Punkte und Antworten zurücksetzen. Der Film bleibt dabei unberührt.</p><div id="adminPlayersStatus" class="small" role="status">Lade Teilnehmer …</div><div id="adminPlayers" class="adminPlayersList" aria-live="polite"></div><div class="adminRosterBulk"><button type="button" id="adminPlayersResetAll">↺ Punkte & Antworten aller zurücksetzen</button><button type="button" id="adminPlayersClearAll" class="danger">Alle Teilnehmer entfernen</button></div></div><p class="small">Feedbackbögen wurden eingereicht: <span id="adminFeedback">0</span></p></section></div></div>';}
function renderAdminFeedback(){
 const root=el('adminRoot');if(!root||role!=='admin')return;
 let box=el('adminFeedbackPanel');
 if(!box){box=document.createElement('section');box.id='adminFeedbackPanel';box.className='card';box.style.marginTop='20px';root.appendChild(box);}
 const list=(adminInfo?.feedback||[]).slice().reverse();
 const html='<span class="label">HANDOUT · RÜCKMELDUNGEN</span><h2>Was fanden die Schüler gut – und was nicht?</h2>'+(list.length?'<p class="small">'+list.length+' Rückmeldungen · neueste zuerst</p><div class="hoFeedbackList">'+list.map(f=>'<article class="hoFeedbackItem">'+(f.rating?'<b>Gesamt: '+esc(f.rating)+'/10</b>':'')+'<pre>'+esc(f.text)+'</pre></article>').join('')+'</div>':'<p class="small">Noch keine Rückmeldungen. Schüler senden sie im Handout mit „📨 Rückmeldung an die Lehrkraft senden“.</p>');
 if(box.dataset.sig!==String(list.length)){box.dataset.sig=String(list.length);box.innerHTML=html;}
}
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
 const trailerRoot=el('adminRoot');
 if(trailerRoot&&!el('trailerAdminPanel')){
  const panel=document.createElement('section');panel.id='trailerAdminPanel';panel.className='card';panel.style.marginBottom='20px';
  panel.innerHTML='<span class="label">🎬 TRAILER & FREIGABE</span><h2>Trailer und Schüler-Hauptseite</h2><p>Dein Trailer ist fest im Projekt eingebaut und immer verfügbar – auf der Startseite, am Beamer und am LG. Nur wenn du ihn vorübergehend durch eine andere MP4 (bis 110 MB) ersetzen willst, lädst du hier eine neue hoch.</p><input id="adminTrailerFile" type="file" accept=".mp4,video/mp4"><div class="flex"><button class="primary" id="adminTrailerUpload" type="button">⬆ Trailer hochladen</button><button id="adminTrailerPlay" type="button">▶ Trailer ansehen</button><button id="adminTrailerCast" class="primary" type="button">📺 Trailer auf Beamer/TV zeigen</button><button id="adminTrailerPause" type="button">⏸ Trailer pausieren</button><button id="adminTrailerResume" type="button">▶ Trailer weiter</button><button id="adminTrailerStop" type="button">⏹ Zurück zu Willkommen</button></div><video id="adminTrailerPreview" controls playsinline style="width:100%;max-height:280px;display:none;margin-top:12px"></video><p id="adminTrailerStatus" class="small" role="status"></p><hr><p>Vor der Freigabe erhalten Schüler ausschließlich den Quiz-Link. Nach Platzierung und Handout kannst du die Hauptseite separat öffnen.</p><button type="button" class="primary" id="adminHomepageToggle">Hauptseite freigeben</button><p id="adminHomepageStatus" class="small"></p>';
  trailerRoot.prepend(panel);
  const status=el('adminTrailerStatus'),release=el('adminHomepageToggle');
  const refresh=async()=>{try{const r=await fetch('/api/trailer/status',{cache:'no-store'}),v=await r.json();status.textContent=v.available?'✓ Trailer ist bereit.':'Noch kein Trailer auf dem Server gespeichert.';release.textContent=v.homeUnlocked?'🔒 Hauptseite wieder sperren':'🔓 Hauptseite freigeben';el('adminHomepageStatus').textContent=v.homeUnlocked?'Schüler können die Hauptseite jetzt öffnen.':'Nur der Quiz-Link ist für Schüler freigegeben.';}catch(e){status.textContent='Status nicht verfügbar: '+e.message;}};
  el('adminTrailerUpload').onclick=async()=>{const file=el('adminTrailerFile').files?.[0];if(!file)return alert('Bitte MP4-Trailer auswählen');if(!/\.mp4$/i.test(file.name)||file.size>110*1024*1024)return alert('MP4 bis 110 MB auswählen');const b=el('adminTrailerUpload');b.disabled=true;status.textContent='Trailer wird hochgeladen …';try{const r=await fetch('/api/trailer/upload',{method:'POST',headers:{'x-admin-key':adminKey,'Content-Type':'video/mp4'},body:file});const x=await r.json();if(!r.ok)throw Error(x.error||'Upload fehlgeschlagen');status.textContent='✓ Trailer hochgeladen. Bitte Wiedergabe testen.';await refresh();}catch(e){status.textContent='Upload fehlgeschlagen: '+e.message;}finally{b.disabled=false;}};
  for(const [id,cmd] of [['adminTrailerCast','trailerStart'],['adminTrailerPause','trailerPause'],['adminTrailerResume','trailerResume'],['adminTrailerStop','trailerStop']]){
   el(id).onclick=async()=>{try{await api('/api/admin','POST',{cmd},adminKey);status.textContent=cmd==='trailerStart'?'✓ Trailer an Beamer/TV gesendet.':'✓ Trailer-Regie aktualisiert.';await poll(true);}catch(e){status.textContent='Trailer: '+e.message;}};
  }
  el('adminTrailerPlay').onclick=()=>{const v=el('adminTrailerPreview');v.style.display='block';v.src='/api/trailer/video?t='+Date.now();v.play().catch(()=>{});};
  release.onclick=async()=>{const unlocked=release.textContent.includes('freigeben');if(unlocked&&!confirm('Schüler-Hauptseite wirklich für alle freigeben?'))return;try{const r=await fetch('/api/trailer/access',{method:'POST',headers:{'x-admin-key':adminKey,'Content-Type':'application/json'},body:JSON.stringify({unlocked})});const x=await r.json();if(!r.ok)throw Error(x.error||'Freigabe fehlgeschlagen');await refresh();}catch(e){alert('Freigabe: '+e.message);}};
  refresh();
 }

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
  },onClientId:saveSpotifyClientId});
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
 el('copyTeacher').onclick=()=>copy(ORIGIN+'#teacher'+(adminInfo?.teacherKey?'?key='+encodeURIComponent(adminInfo.teacherKey):''));
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
 el('adminRoot').appendChild(at);renderAdminAnswers();clearInterval(window.__aaT);window.__aaT=setInterval(async()=>{if(role!=='admin')return;try{adminInfo=await api('/api/admin-info','GET',undefined,adminKey);renderAdminAnswers();renderAdminFeedback();await refreshAdminPlayers();}catch{}},4000);
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
let spotifyLinking=false;
async function spotifyServerLink(){
 const sc=window.SpotifyConnect;if(!sc||!adminKey||spotifyLinking)return;
 if(!window.__spProvider){window.__spProvider=true;sc.setTokenProvider(()=>api('/api/spotify/token','GET',undefined,adminKey));}
 if(state&&state.spotifyLinked)return;
 const t=sc.exportTokens&&sc.exportTokens();if(!t?.refresh_token||!t.clientId)return;
 spotifyLinking=true;
 try{await api('/api/spotify/link','POST',t,adminKey);}catch{}finally{spotifyLinking=false;}
}
function saveSpotifyClientId(id){return api('/api/admin','POST',{cmd:'spotifyClientSet',value:id},adminKey).catch(()=>{});}
function controlPage(){
 if(!adminKey){
  app.innerHTML='<main class="phoneRemote"><div class="phoneRemoteHead"><span class="eyebrow">TOUCH LIVE / HANDY-FERNBEDIENUNG</span><h1>Deine <em>Regie.</em></h1><p>Gib einmal dein privates Admin-Passwort ein. Danach kannst du Doku und Willkommensmusik vom Handy steuern.</p></div><section class="phoneRemotePanel"><form id="controlUnlock"><label for="controlPassword">Admin-Passwort</label><input id="controlPassword" type="password" autocomplete="current-password" required placeholder="Admin-Passwort"><button type="submit" class="primary">Fernbedienung öffnen</button></form></section></main>';
  el('controlUnlock').onsubmit=async e=>{
   e.preventDefault();const key=el('controlPassword').value.trim();
   try{await api('/api/admin-info','GET',undefined,key);adminKey=key;sessionStorage.setItem('touch_admin_key',key);controlPage();poll(true);}
   catch(err){alert('Admin-Passwort stimmt nicht: '+err.message);}
  };return;
 }
 app.innerHTML='<main class="phoneRemote"><header class="phoneRemoteHead"><span class="eyebrow">TOUCH LIVE / MOBILE REGIE</span><h1>Deine <em>Fernbedienung.</em></h1><p id="controlTitle">TOUCHSCREEN – Interaktive Dokumentation</p><div class="phoneRemoteStatus" id="controlStatus" role="status">Verbinde mit deinem LG-Fernseher …</div></header><section class="phoneRemotePanel"><span class="label">FILM UND PRÄSENTATION</span><div class="phoneRemoteGrid"><button class="primary phoneMainPlay" data-mobile="start">▶ Film starten</button><button data-mobile="pause">Ⅱ Pause</button><button data-mobile="play">▶ Weiter</button><button data-mobile="restartVideo">⏮ Auf 00:00</button><button data-mobile="welcome">✨ Willkommen</button><button data-mobile="results">🏆 Ergebnisse</button><button data-mobile="handout">📝 Handout</button><button data-mobile="end">🎬 Abschluss</button></div><div class="phoneRemoteSeek"><label for="controlSeek">Filmzeit in Sekunden</label><input type="number" min="0" max="3107" value="0" id="controlSeek"><button id="controlSeekGo">Zur Zeit springen</button></div></section><section class="phoneRemotePanel"><span class="label">TRAILER AUF DEM FERNSEHER</span><div class="phoneRemoteGrid"><button class="primary" data-mobile="trailerStart">🎬 Trailer starten</button><button data-mobile="trailerPause">⏸ Pause</button><button data-mobile="trailerResume">▶ Weiter</button><button data-mobile="trailerStop">⏹ Beenden</button></div><p class="small">Der Trailer wird am Fernseher vorgeladen. Falls der TV den Ton sperrt, läuft er stumm weiter – dann am Fernseher einmal OK drücken.</p></section><section class="phoneRemotePanel"><span class="label">MUSIK-PLAN</span>'+['welcome','end'].map(sl=>'<div class="mpMini" data-mslot="'+sl+'"><b>'+(sl==='welcome'?'Willkommen':'Abschluss')+'</b><div class="mpSeg">'+[['off','Aus'],['touch','♫ Melodie'],['spotify','Spotify']].map(([m,l])=>'<button type="button" data-mmode="'+m+'">'+l+'</button>').join('')+'</div><small class="mpMiniNow"></small></div>').join('')+'<p class="small">Spotify-Song oder Playlist wählst du im Admin (Reiter Musik) oder unten über Spotify Connect.</p></section><section class="phoneRemotePanel"><span class="label">EIGENE MELODIE AM LG</span><p id="controlMusicTitle" class="small">Keine Spotify-Musik hinterlegt.</p><div class="phoneRemoteGrid"><button data-mobile="musicOn">♫ LG-Musik starten</button><button data-mobile="musicOff">⏹ LG-Musik stoppen</button></div><p class="small">LG-Willkommensmusik läuft direkt auf dieser Webseite und wiederholt sich ohne Spotify-Preview. Für deine Spotify-Songs kannst du weiterhin separat Spotify Connect verwenden.</p><div class="phoneSpotifyPanel"><h3>Spotify auf TV / HDMI-PC</h3><p class="small"><b>LG-TV:</b> Spotify-App auf dem Fernseher öffnen (gleiches Spotify-Konto). <b>HDMI-PC:</b> im Beamer-Fenster „♫ Spotify auf diesem PC“ drücken. Dann hier „Geräte suchen“, Gerät wählen und Musik starten. Spotify Premium nötig.</p><label for="spotifyInput">Spotify-Song oder Playlist-Link</label><input id="spotifyInput" type="url" placeholder="https://open.spotify.com/playlist/…" autocomplete="url"><button type="button" id="mobileSpotifyExpand" class="primary">♫ Spotify Connect: TV auswählen und Musik steuern</button><div id="mobileSpotifyConnect" hidden></div></div></section><section class="phoneRemotePanel"><span class="label">AUTOMATISCHE MUSIK</span><p class="small">Diese Musik ist selbst erstellt, ohne Spotify. Wenn der Film pausiert, beginnt die ruhige Musik. Bei den Ergebnissen folgt die Siegerehrungs-Musik. Bei Filmwiedergabe bleibt es still.</p><div class="phoneRemoteGrid"><button data-mobile-sound="pause" data-enabled="true">♫ Pausenmusik AN</button><button data-mobile-sound="results" data-enabled="true">🏆 Ergebnismusik AN</button></div></section><section class="phoneRemotePanel"><span class="label">UNTERTITEL</span><div class="phoneRemoteGrid"><button data-mobile-caption="on">CC Untertitel AN</button><button data-mobile-caption="off">CC Untertitel AUS</button></div></section><p class="phoneRemoteBottom"><a href="/#admin">⚙ Alle Einstellungen am PC oder Handy</a></p></main>';
 const spotifyExpand=el('mobileSpotifyExpand');
 if(spotifyExpand)spotifyExpand.onclick=()=>{
  const panel=el('mobileSpotifyConnect');if(!panel)return;
  panel.hidden=!panel.hidden;
  spotifyExpand.textContent=panel.hidden?'♫ Spotify Connect: Start / Pause / Lautstärke / Titelwechsel':'▾ Spotify-Steuerung einklappen';
  if(!panel.hidden&&window.SpotifyConnect){
   const input=el('spotifyInput');if(input&&!input.value&&state?.welcomeMusic?.url)input.value=state.welcomeMusic.url;
   window.SpotifyConnect.mount(panel,{onSelect:async url=>{
    await api('/api/admin','POST',{cmd:'spotifySet',url},adminKey);
    await poll(true);
   },onClientId:saveSpotifyClientId});
  }
 };
 // Already connected to Spotify on this phone (e.g. after the login redirect): open the controls directly.
 if(spotifyExpand&&window.SpotifyConnect?.connected?.())spotifyExpand.click();
 document.querySelectorAll('[data-mobile]').forEach(btn=>btn.onclick=async()=>{
  const cmd=btn.dataset.mobile;
  if(cmd==='restartVideo'&&!confirm('Film auf 00:00 zurücksetzen? Quizpunkte bleiben.'))return;
  try{
   if((cmd==='start'||cmd==='trailerStart')&&window.SpotifyConnect?.connected?.())window.SpotifyConnect.pauseForFilm().catch(()=>{});
   await api('/api/admin','POST',{cmd},adminKey);
   await poll(true);
  }catch(err){alert('Regie: '+err.message);}
 });
 const paintMini=()=>document.querySelectorAll('[data-mslot]').forEach(r=>{const p=state?.musicPlan?.[r.dataset.mslot]||{mode:r.dataset.mslot==='welcome'?'touch':'off'};r.querySelectorAll('[data-mmode]').forEach(b=>b.classList.toggle('on',b.dataset.mmode===p.mode));r.querySelector('.mpMiniNow').textContent=p.mode==='spotify'?(p.title||p.url||'Spotify – noch nichts gewählt'):p.mode==='touch'?'Eigene TOUCH-LIVE-Melodie':'Keine Musik';});
 document.querySelectorAll('[data-mslot] [data-mmode]').forEach(b=>b.onclick=async()=>{const slot=b.closest('[data-mslot]').dataset.mslot,mode=b.dataset.mmode,cur=state?.musicPlan?.[slot]||{};
  let url=cur.url||'';if(mode==='spotify'&&!url){url=(el('spotifyInput')?.value||state?.welcomeMusic?.url||'').trim();if(!url)return alert('Bitte zuerst unten einen Spotify-Link einfügen oder im Admin eine Playlist wählen.');}
  try{await api('/api/admin','POST',{cmd:'musicPlan',slot,mode,url,title:cur.title||''},adminKey);await poll(true);paintMini();}catch(err){alert('Musik: '+err.message);}});
 window.__paintMini=paintMini;paintMini();
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
  if((cmd==='start'||cmd==='trailerStart')&&window.SpotifyConnect?.connected?.())window.SpotifyConnect.pauseForFilm().catch(()=>{});
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
function tvControlsVisible(){
 // Keep the full-size remote toolbar out of the LG / projector view.
 const bar=el('tvRemoteBar'),help=el('tvRemoteHelp');
 if(tvRemoteAutoHide){clearTimeout(tvRemoteAutoHide);tvRemoteAutoHide=null;}
 if(bar){bar.classList.add('tvRemoteHidden');bar.dataset.wasShown='0';}
 if(help)help.hidden=true;
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
 if(state?.phase==='welcome'&&(e.key==='Enter'||code===13)){
  e.preventDefault();
  const start=el('tvCinemaStart');
  if(start&&!start.hidden)start.click();else tvEnablePlayback();
  return;
 }
 if(['welcome','end'].includes(state?.phase)&&tvSpotifyReady()){
  const k=e.key;
  if(k==='ArrowRight'||code===39){e.preventDefault();tvSpotifyAction('next');return;}
  if(k==='ArrowLeft'||code===37){e.preventDefault();tvSpotifyAction('previous');return;}
  if(k==='ArrowUp'||code===38){e.preventDefault();tvSpotifyAction('up');return;}
  if(k==='ArrowDown'||code===40){e.preventDefault();tvSpotifyAction('down');return;}
  if(['MediaPlay','MediaPlayPause','MediaPause'].includes(k)||[415,19,179].includes(code)){e.preventDefault();tvSpotifyAction('toggle');return;}
 }
 if(state?.phase==='welcome'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
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
 if(tvSpotifyReady()&&state?.phase==='welcome'){
  if(['MediaPlay','MediaPlayPause','MediaPause'].includes(e.key)||[415,19,179].includes(code)){e.preventDefault();tvSpotifyAction('toggle');return;}
  if(['MediaFastForward','MediaTrackNext'].includes(e.key)||[417,176].includes(code)){e.preventDefault();tvSpotifyAction('next');return;}
  if(['MediaRewind','MediaTrackPrevious'].includes(e.key)||[412,177].includes(code)){e.preventDefault();tvSpotifyAction('previous');return;}
 }
 if(e.key==='MediaPlay'||e.key==='MediaPlayPause'||[415].includes(code)){e.preventDefault();el('tvPlay')?.click();}
}
window.addEventListener('keydown',tvRemoteKeydown,true);
// One single press on the LG remote (any key) or one click on the HDMI-PC unlocks
// sound AND fullscreen for the whole session. After that the phone controls everything:
// the page never reloads, so the TV stays in fullscreen with sound.
function tvUnlockAll(){
 if(role!=='tv'||!el('tvApp'))return;
 const first=!tvSoundActivated;
 tvSoundActivated=true;tvSoundBlocked=false;
 try{window.TouchSoundtrack?.activate?.();}catch{}
 if(!lgFullscreenActive())tvRemoteFullscreen(true);
 const trailer=el('tvTrailer');
 if(trailer&&trailer.muted&&!trailer.paused){trailer.muted=false;trailer.volume=1;trailer.dataset.playBlocked='';const u=el('tvTrailerUnlock');if(u)u.hidden=true;const m=el('tvTrailerMessage');if(m)m.hidden=true;}
 if(tvAutoplayMuted&&state?.phase==='film')tvEnablePlayback();
 if(state?.phase==='welcome'&&state?.welcomeMusic?.on)try{playWelcomeAudio();}catch{}
 const b=el('tvPlay');if(b)b.textContent='✓ Ton & Vollbild aktiv';
 const hint=el('tvAutoHint');if(hint)hint.hidden=true;
 if(first){tvWelcomeDismissed=true;tvControlsVisible(false);}
 const setup=el('tvCinemaSetup');if(setup)setup.hidden=true;
}
['pointerdown','touchstart'].forEach(type=>window.addEventListener(type,()=>{if(role==='tv')tvUnlockAll();},{capture:true,passive:true}));
window.addEventListener('keydown',e=>{if(role==='tv'&&(['Enter',' '].includes(e.key)||[13,32,415].includes(e.keyCode||e.which)))tvUnlockAll();},{capture:true});
// ---- Spotify auf dem LG-Fernseher, gesteuert mit der TV-Fernbedienung ----
// Die Musik spielt die Spotify-App des Fernsehers (Spotify Connect). Diese Seite
// schickt nur Befehle; die Anmeldung kommt einmalig vom Handy/Admin über den Server.
let tvSpBusy=false,tvSpInfo={playing:false,volume:50,device:'',deviceId:'',track:''},tvSpTimer=null;
function tvSpotifyReady(){return !!(state?.spotifyLinked&&window.SpotifyConnect?.api);}
async function tvSpotifyDevice(){
 const out=await window.SpotifyConnect.api('/me/player/devices');const list=(out.devices||[]).filter(d=>d.id&&!d.is_restricted);
 return list.find(d=>d.is_active)||list.find(d=>/tv/i.test(d.type))||list.find(d=>/LG|webos/i.test(d.name))||null;
}
async function tvSpotifyRefresh(){
 if(!tvSpotifyReady())return;
 try{
  const p=await window.SpotifyConnect.api('/me/player');
  tvSpInfo.playing=!!p?.is_playing;tvSpInfo.volume=Number.isFinite(p?.device?.volume_percent)?p.device.volume_percent:tvSpInfo.volume;
  tvSpInfo.device=p?.device?.name||'';tvSpInfo.deviceId=p?.device?.id||'';
  tvSpInfo.track=p?.item?((p.item.name||'')+' – '+(p.item.artists||[]).map(a=>a.name).join(', ')):'';
 }catch{}
 tvSpotifyPaint();
}
function tvSpotifyPaint(msg){
 const t=el('tvSpToggle'),now=el('tvSpNow');
 if(t)t.textContent=tvSpInfo.playing?'⏸ Spotify':'♫ Spotify ▶';
 const dockNow=el('tvSpDockNow');if(dockNow)dockNow.textContent=msg||(tvSpInfo.track?(tvSpInfo.playing?'▶ ':'Ⅱ ')+tvSpInfo.track:'Play/Pause drücken, um Musik zu starten');
 if(now){now.textContent=msg||(tvSpInfo.track?(tvSpInfo.playing?'♫ ':'Ⅱ ')+tvSpInfo.track+(tvSpInfo.device?' · '+tvSpInfo.device:''):'Spotify bereit – OK auf „♫ Spotify ▶“');now.hidden=false;}
}
async function tvSpotifyAction(kind){
 if(tvSpBusy)return;tvSpBusy=true;
 const sp=window.SpotifyConnect.api;
 try{
  if(kind==='toggle'){
   if(tvSpInfo.playing){await sp('/me/player/pause','PUT');tvSpInfo.playing=false;}
   else{
    let dev=tvSpInfo.deviceId?{id:tvSpInfo.deviceId}:await tvSpotifyDevice();
    if(!dev)throw Error('Spotify-App auf dem Fernseher öffnen (gleiches Konto), dann erneut OK.');
    const plan=state?.musicPlan?.[state?.phase==='end'?'end':'welcome'],music=plan?.mode==='spotify'?plan:state?.welcomeMusic;
    try{
     if(!tvSpInfo.track&&music?.id&&['playlist','album','track'].includes(music.type)){
      await sp('/me/player/play?device_id='+encodeURIComponent(dev.id),'PUT',music.type==='track'?{uris:['spotify:track:'+music.id]}:{context_uri:'spotify:'+music.type+':'+music.id});
     }else await sp('/me/player/play?device_id='+encodeURIComponent(dev.id),'PUT');
    }catch(e){
     // Device asleep or not active yet: hand playback over to the TV, then play.
     await sp('/me/player','PUT',{device_ids:[dev.id],play:true});
    }
    tvSpInfo.playing=true;
   }
  }else if(kind==='next'||kind==='previous'){await sp('/me/player/'+kind,'POST');}
  else if(kind==='up'||kind==='down'){
   const v=Math.max(0,Math.min(100,(tvSpInfo.volume||50)+(kind==='up'?10:-10)));
   await sp('/me/player/volume?volume_percent='+v,'PUT');tvSpInfo.volume=v;
   tvSpotifyPaint('Spotify-Lautstärke: '+v+' %');tvSpBusy=false;return;
  }
  setTimeout(tvSpotifyRefresh,900);tvSpotifyPaint();
 }catch(e){tvSpotifyPaint('Spotify: '+e.message);}
 finally{tvSpBusy=false;}
}
function tvSpotifyVisibility(){
 const show=tvSpotifyReady()&&['welcome','end'].includes(state?.phase);
 ['tvSpPrev','tvSpToggle','tvSpNext','tvSpDown','tvSpUp'].forEach(id=>{const b=el(id);if(b)b.hidden=!show;});
 const now=el('tvSpNow');if(now&&!show)now.hidden=true;
 const dock=el('tvSpDock');if(dock)dock.hidden=!show;
 if(show&&!tvSpTimer){tvSpotifyRefresh();tvSpTimer=setInterval(()=>{if(role==='tv'&&tvSpotifyReady()&&['welcome','end'].includes(state?.phase))tvSpotifyRefresh();},8000);}
 if(!show&&tvSpTimer){clearInterval(tvSpTimer);tvSpTimer=null;}
}
// Musik-Plan: Spotify startet automatisch auf Willkommen bzw. Abschluss und stoppt bei Film/Trailer/Quiz.
let tvPlanKey='';
async function tvMusicPlan(old,next){
 if(!tvSpotifyReady())return;
 const slot=next.phase==='welcome'?'welcome':next.phase==='end'?'end':null,plan=slot?next.musicPlan?.[slot]:null;
 const key=slot&&plan?.mode==='spotify'&&plan.id?slot+'|'+plan.type+':'+plan.id:'';
 if(key===tvPlanKey)return;
 const hadMusic=!!tvPlanKey;tvPlanKey=key;
 try{
  if(key){
   const dev=tvSpInfo.deviceId?{id:tvSpInfo.deviceId}:await tvSpotifyDevice();
   if(!dev){tvSpotifyPaint('Spotify-App auf dem Fernseher öffnen – dann startet die Musik.');tvPlanKey='';return;}
   const body=plan.type==='track'?{uris:['spotify:track:'+plan.id]}:{context_uri:'spotify:'+plan.type+':'+plan.id};
   try{await window.SpotifyConnect.api('/me/player/play?device_id='+encodeURIComponent(dev.id),'PUT',body);}
   catch{await window.SpotifyConnect.api('/me/player','PUT',{device_ids:[dev.id],play:false});await new Promise(r=>setTimeout(r,800));await window.SpotifyConnect.api('/me/player/play?device_id='+encodeURIComponent(dev.id),'PUT',body);}
   tvSpInfo.playing=true;setTimeout(tvSpotifyRefresh,1200);
  }else if(hadMusic||(old&&['welcome','end'].includes(old.phase)&&tvSpInfo.playing)){
   tvSpInfo.playing=false;await window.SpotifyConnect.api('/me/player/pause','PUT');
  }
 }catch(e){tvSpotifyPaint('Spotify: '+e.message);}
}
function tvView(){
 if(!tvKey){app.innerHTML='<div class="wrap page"><h1>Beamer verbinden</h1><p>Bitte den Beamerlink aus der Admin-Ansicht öffnen.</p><label>Beamer-Zugangsschlüssel</label><input type="password" id="tvInput"><p></p><button class="primary" id="tvSubmit">Verbinden</button></div>';el('tvSubmit').onclick=()=>{tvKey=el('tvInput').value;sessionStorage.setItem('touch_tv_key',tvKey);localStorage.setItem('touch_tv_key',tvKey);tvView();};return;}
 app.innerHTML='<div id="tvApp"><audio id="tvWelcomeAudio" src="/welcome-music.wav" preload="auto" loop playsinline style="display:none"></audio><div id="tvScene" class="tvScene"></div><div id="tvSpDock" class="tvSpDock" hidden aria-live="polite"><b>♫ Spotify</b><span id="tvSpDockNow">bereit</span><small>⏯ Play/Pause · ◀ ▶ Titel · ▲ ▼ Lautstärke</small></div><video id="tvTrailer" playsinline preload="auto" controls style="display:none;position:fixed;inset:0;width:100vw;height:100vh;background:#000;object-fit:contain;z-index:50"></video><button id="tvTrailerUnlock" type="button" hidden style="position:fixed;bottom:8%;left:50%;transform:translateX(-50%);z-index:60;max-width:90%;padding:17px 25px;background:#59d8d2;color:#07222b;border-radius:14px;font-size:18px;font-weight:700">▶ Trailer mit Ton starten (OK)</button><div id="tvTrailerMessage" hidden style="position:fixed;top:4%;left:10%;right:10%;z-index:60;padding:12px;background:#07222bcc;color:white;border-radius:12px;text-align:center"></div><div class="videoLayer" id="videoLayer" style="display:none"><video id="tvVideo" playsinline preload="metadata"></video><div id="youtubeTarget" style="display:none"></div><iframe id="cloudFrame" title="Google Drive Filmvorschau" allow="autoplay; fullscreen; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" style="display:none"></iframe><div id="captionLayer" class="captionLayer" style="display:none"></div></div><div class="tvUnlock tvRemoteBar" id="tvRemoteBar" role="toolbar" aria-label="LG Fernbedienungs-Steuerung"><button id="tvPlay" type="button" tabindex="0">▶ Ton & Vollbild mit OK freigeben</button><button id="tvLocalChoose" type="button" tabindex="0" hidden>📁 MP4 vom Windows-PC wählen</button><input id="tvLocalFile" type="file" accept=".mp4,video/mp4" hidden><span id="tvLocalStatus" role="status" style="font-size:13px;max-width:400px" hidden>MP4 bitte lokal auswählen.</span><button id="tvFullscreen" type="button" tabindex="0" autofocus>⛶ Vollbild – OK</button><button id="tvSoundtrackUnlock" type="button" tabindex="0">♫ Musik-Ton aktivieren</button><button id="tvSpotifyPlay" type="button" tabindex="0" hidden>♫ Willkommensmusik ▶</button><button id="tvSpotifyPc" type="button" tabindex="0" hidden>♫ Spotify auf diesem PC</button><button id="tvSpPrev" type="button" tabindex="0" hidden title="Vorheriger Titel">⏮</button><button id="tvSpToggle" type="button" tabindex="0" hidden>♫ Spotify ▶</button><button id="tvSpNext" type="button" tabindex="0" hidden title="Nächster Titel">⏭</button><button id="tvSpDown" type="button" tabindex="0" hidden title="Leiser">🔉</button><button id="tvSpUp" type="button" tabindex="0" hidden title="Lauter">🔊</button><span id="tvSpNow" class="tvSpNow" hidden></span><button id="tvCloudOpen" type="button" tabindex="0" hidden>☁ iCloud-Datei öffnen</button><button id="tvCaptionSync" type="button" tabindex="0" hidden>⏱ Untertitel synchronisieren</button><button id="tvHideControls" type="button" tabindex="0">Menü ausblenden</button></div><div id="tvCinemaSetup" class="tvCinemaSetup"><button id="tvCinemaStart" type="button" class="tvCinemaStart">⛶ Vollbild &amp; Ton aktivieren (OK)</button><button id="tvCinemaPick" type="button" class="tvCinemaPick" hidden>📁 HDMI-MP4 auswählen</button><span>Einmal OK drücken. Danach mit dem Handy steuern.</span></div><div id="tvAutoHint" class="tvAutoHint" hidden></div><div class="tvRemoteHelp" id="tvRemoteHelp">LG-Fernbedienung: ◀ ▶ auswählen · OK bestätigen · Zurück für das Menü · Lautstärke über TV</div><button id="tvFilmUnlock" class="tvFilmUnlock" type="button" hidden>🔊 Filmton mit OK einschalten</button><div id="tvWelcomeMusicStatus" class="tvWelcomeMusicStatus" hidden aria-live="polite"></div><div id="tvSpotifyDock" class="tvSpotifyDock" hidden aria-label="Spotify-Vorschau auf LG deaktiviert"></div><div class="tvFooter">TOUCH LIVE · Beamer</div></div>';
 videoEl=el('tvVideo');
 const trailerVideo=el('tvTrailer'),trailerUnlock=el('tvTrailerUnlock'),trailerMessage=el('tvTrailerMessage');
 if(trailerVideo&&trailerUnlock){
  trailerUnlock.onclick=()=>{tvSoundActivated=true;trailerVideo.dataset.playBlocked='';trailerVideo.muted=false;trailerVideo.volume=1;const play=trailerVideo.play();if(play?.then)play.then(()=>{trailerUnlock.hidden=true;if(trailerMessage)trailerMessage.hidden=true;}).catch(()=>{trailerUnlock.hidden=false;if(trailerMessage){trailerMessage.textContent='TV blockiert die Wiedergabe. Drücke OK auf den Trailer-Startbutton.';trailerMessage.hidden=false;}});};
  trailerVideo.addEventListener('playing',()=>{if(trailerVideo.muted)return;trailerUnlock.hidden=true;if(trailerMessage)trailerMessage.hidden=true;});
  trailerVideo.addEventListener('waiting',()=>{if(trailerMessage){trailerMessage.textContent='Trailer wird gepuffert …';trailerMessage.hidden=false;}});
  trailerVideo.addEventListener('error',()=>{if(trailerMessage){trailerMessage.textContent='Trailer konnte nicht geladen werden. Bitte erneut hochladen oder Videoformat prüfen.';trailerMessage.hidden=false;}});
  trailerVideo.addEventListener('ended',()=>{trailerUnlock.hidden=true;if(trailerMessage)trailerMessage.hidden=true;});
 }
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
   welcomeAudioPending=false;welcomeAudioBlocked=false;welcomeAudioError='';reportWelcomeAudio();
   if(state?.phase==='welcome')syncWelcomeMusic();
  });
  welcomeAudio.addEventListener('error',()=>{
   welcomeAudioPending=false;welcomeAudioBlocked=true;
   welcomeAudioError='Die Audio-Datei konnte vom LG-Browser nicht geladen werden.';reportWelcomeAudio();
   if(state?.phase==='welcome')syncWelcomeMusic();
  });
  welcomeAudio.addEventListener('pause',()=>{
   welcomeAudioPending=false;reportWelcomeAudio();
   if(state?.phase==='welcome')syncWelcomeMusic();
  });
 }
 // Never intentionally start the TV movie muted.
 videoEl.muted=false;videoEl.defaultMuted=false;videoEl.volume=1;
 el('tvPlay').onclick=tvEnablePlayback;
 el('tvFilmUnlock').onclick=tvEnablePlayback;
 el('tvCinemaStart').onclick=()=>{tvEnablePlayback();const setup=el('tvCinemaSetup');if(setup)setup.hidden=true;};
 el('tvCinemaPick').onclick=()=>{const pick=el('tvLocalFile');if(pick)pick.click();};
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
 if(window.SpotifyConnect?.setTokenProvider)window.SpotifyConnect.setTokenProvider(()=>api('/api/spotify/token','GET',undefined,tvKey));
 [['tvSpToggle','toggle'],['tvSpNext','next'],['tvSpPrev','previous'],['tvSpUp','up'],['tvSpDown','down']].forEach(([id,kind])=>{const b=el(id);if(b)b.onclick=()=>tvSpotifyAction(kind);});
 const spotifyPc=el('tvSpotifyPc');
 if(spotifyPc&&window.SpotifyConnect?.webPlayerSupported?.()){
  // HDMI-PC: this browser becomes the Spotify Connect device "TOUCH LIVE Beamer-PC".
  spotifyPc.hidden=false;window.SpotifyConnect.preloadWebPlayer();
  const label=()=>{spotifyPc.textContent=window.SpotifyConnect.webPlayerActive()?'✓ Spotify bereit (Handy steuert)':window.SpotifyConnect.connected()?'♫ Spotify auf diesem PC aktivieren':'♫ Spotify auf diesem PC (anmelden)';};
  label();
  spotifyPc.onclick=async()=>{
   tvSoundActivated=true;
   try{
    if(!window.SpotifyConnect.connected()){
     if(!window.SpotifyConnect.getSelectedClientId()){tvFullscreenHint('Spotify: Bitte zuerst im Admin die Spotify Client ID speichern.');return;}
     await window.SpotifyConnect.login();return;
    }
    await window.SpotifyConnect.enableWebPlayer('TOUCH LIVE Beamer-PC',st=>{if(st.ready&&st.track)tvFullscreenHint((st.playing?'♫ ':'Ⅱ ')+st.track+(st.artist?' – '+st.artist:''));});
    label();
    tvFullscreenHint('✓ Spotify ist auf diesem PC bereit. Auf dem Handy „Geräte suchen“ → „TOUCH LIVE Beamer-PC“ wählen und Musik starten.');
   }catch(e){label();tvFullscreenHint('Spotify: '+e.message);}
  };
  let message=null;try{message=localStorage.getItem('touch_spotify_auth_message');}catch{}
  if(message){try{localStorage.removeItem('touch_spotify_auth_message');}catch{}setTimeout(()=>tvFullscreenHint(message+(message.startsWith('✓')?' Jetzt „♫ Spotify auf diesem PC aktivieren“ drücken.':'')),600);}
 }
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
 tvControlsVisible(false);
 // Fill the browser immediately and request native fullscreen on opening.
 // When blocked by LG/Chrome, one real OK/click on the small button retries it.
 if(!tvAutoCinemaTried){tvAutoCinemaTried=true;tvRemoteFullscreen(true);}
 const cinemaStart=el('tvCinemaStart');if(cinemaStart)try{cinemaStart.focus({preventScroll:true});}catch{cinemaStart.focus();}
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
function reportWelcomeAudio(){
 if(role!=='tv'||!tvKey)return;
 const audio=el('tvWelcomeAudio'),playing=!!(audio&&!audio.paused&&audio.readyState>=2);
 fetch('/api/tv/audio-status',{method:'POST',headers:{'Content-Type':'application/json','x-tv-key':tvKey},body:JSON.stringify({playing,blocked:!!welcomeAudioBlocked,error:welcomeAudioError||''})}).catch(()=>{});
}
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
 const enabled=(state?.phase==='welcome'&&state?.welcomeMusic?.on===true)||(state?.phase==='end'&&state?.musicPlan?.end?.mode==='touch');
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
function trailerBufferedAhead(v){
 try{const t=v.currentTime,b=v.buffered;for(let i=0;i<b.length;i++)if(b.start(i)<=t+.25&&b.end(i)>=t)return b.end(i)-t;}catch{}
 return 0;
}
// Start with sound. If the TV blocks sound before the first OK press, the trailer still
// runs (muted) and a large "OK = Ton an" button appears instead of a frozen picture.
function startTrailerWithSound(v,unlock,message){
 v.dataset.playBlocked='pending';v.muted=false;v.volume=1;
 const first=v.play();
 if(!first?.then)return;
 first.then(()=>{v.dataset.playBlocked='';if(unlock)unlock.hidden=true;if(message)message.hidden=true;}).catch(()=>{
  v.muted=true;
  const second=v.play();
  const showUnlock=txt=>{if(unlock){unlock.textContent='🔊 Ton einschalten (OK)';unlock.hidden=false;try{unlock.focus();}catch{}}if(message){message.textContent=txt;message.hidden=false;}};
  if(second?.then)second.then(()=>{v.dataset.playBlocked='muted';showUnlock('Der Fernseher hat den Ton blockiert – einmal OK drücken, dann läuft der Trailer mit Ton.');})
   .catch(()=>{v.muted=false;v.dataset.playBlocked='blocked';showUnlock('Autostart gesperrt: Mit der LG-Fernbedienung OK drücken.');});
 });
}
function tvDisplay(){
 if(!state||role!=='tv'||!el('tvScene'))return;
 {const ah=el('tvAutoHint');if(ah)ah.hidden=tvSoundActivated;}
 const phase=state.phase;const videoMode=phase==='film';
 const trailer=el('tvTrailer'),trailerUnlock=el('tvTrailerUnlock'),trailerMessage=el('tvTrailerMessage');
 if(trailer){
  const isTrailer=phase==='trailer',serial=String(state.trailerSerial||0),rev=String(state.trailerRevision||0);
  // Preload the trailer while the welcome/end slide is shown, so it starts without stutter.
  // During the documentary the bandwidth belongs to the film, so the trailer is unloaded.
  const idle=['welcome','end','handout'].includes(phase);
  const wantSource=!!state.trailerAvailable&&(isTrailer||idle);
  trailer.style.display=isTrailer?'block':'none';
  if(wantSource&&(!trailer.getAttribute('src')||trailer.dataset.revision!==rev)){
   trailer.preload='auto';trailer.src='/api/trailer/video?v='+encodeURIComponent(rev);trailer.dataset.revision=rev;trailer.dataset.playBlocked='';trailer.load();
  }
  if(isTrailer){
   if(trailer.dataset.serial!==serial){trailer.dataset.serial=serial;trailer.dataset.playBlocked='';trailer.dataset.waitSince='';try{trailer.currentTime=0;}catch{}if(trailerUnlock)trailerUnlock.hidden=true;}
   const targetPlay=!!state.trailerPlaying;
   if(targetPlay&&trailer.paused&&!trailer.ended&&!trailer.dataset.playBlocked){
    // Wait (max. 15 s) until enough is buffered, instead of starting and stalling.
    const ahead=trailerBufferedAhead(trailer),left=Number.isFinite(trailer.duration)?trailer.duration-trailer.currentTime:Infinity;
    const enough=trailer.readyState>=4||ahead>=Math.min(25,left-.5);
    if(!trailer.dataset.waitSince)trailer.dataset.waitSince=String(Date.now());
    if(enough||Date.now()-Number(trailer.dataset.waitSince)>15000){
     trailer.dataset.waitSince='';
     startTrailerWithSound(trailer,trailerUnlock,trailerMessage);
    }else if(trailerMessage){
     const pct=Number.isFinite(trailer.duration)&&trailer.duration>0?Math.min(99,Math.round((trailer.currentTime+ahead)/trailer.duration*100)):0;
     trailerMessage.textContent='Trailer wird geladen … '+(pct?pct+' %':'');trailerMessage.hidden=false;
    }
   }else if(!targetPlay&&!trailer.paused)trailer.pause();
   if(!trailer.paused&&!trailer.muted&&trailer.readyState>=3&&trailerMessage&&!trailerMessage.hidden)trailerMessage.hidden=true;
   if(!targetPlay&&['pending','muted'].includes(trailer.dataset.playBlocked))trailer.dataset.playBlocked='';
  }else{
   if(!trailer.paused)trailer.pause();
   if(!wantSource&&trailer.getAttribute('src')){trailer.removeAttribute('src');trailer.load();trailer.dataset.revision='';}
   else if(trailer.currentTime>0&&trailer.readyState>0){try{trailer.currentTime=0;}catch{}}
   trailer.muted=false;
   trailer.dataset.playBlocked='';trailer.dataset.serial='';trailer.dataset.waitSince='';
   if(trailerUnlock)trailerUnlock.hidden=true;
   if(trailerMessage)trailerMessage.hidden=true;
  }
 }

 const local=state.video?.type==='local',localPick=el('tvLocalChoose'),localStatus=el('tvLocalStatus');
 if(localPick)localPick.hidden=!local;
 if(localStatus){localStatus.hidden=!local;if(local&&!tvLocalFile)localStatus.textContent='Am Windows-PC zuerst die lokale MP4 auswählen (kein Upload).';}
 const tvRoot=el('tvApp');if(tvRoot)tvRoot.classList.toggle('tvPlayingFilm',videoMode);
 if(phase==='welcome'&&tvLastDisplayPhase!=='welcome')tvWelcomeDismissed=false;
 tvLastDisplayPhase=phase;
 tvControlsVisible(false);
 const cinemaSetup=el('tvCinemaSetup'),cinemaPick=el('tvCinemaPick');
 const needLocalFile=phase==='welcome'&&state.video?.type==='local'&&!tvLocalObjectURL;
 if(cinemaSetup)cinemaSetup.hidden=phase!=='welcome'||(tvSoundActivated&&!needLocalFile);
 const cinemaStart=el('tvCinemaStart');
 if(cinemaStart)cinemaStart.hidden=tvSoundActivated;
 if(cinemaPick)cinemaPick.hidden=!needLocalFile;
 const filmUnlock=el('tvFilmUnlock');
 if(filmUnlock)filmUnlock.hidden=true; // Film must never show a bottom audio/setup overlay.
 const layer=el('videoLayer');if(layer)layer.style.display=videoMode&&state.video.type!=='none'&&(state.video.type!=='local'||!!tvLocalObjectURL)?'block':'none';
 const scene=el('tvScene');
 syncWelcomeMusic();
 window.TouchSoundtrack?.sync?.({...state,welcomeMusic:{...(state.welcomeMusic||{}),on:false}}); // HTML5 WAV owns welcome audio.
 if(phase==='trailer'){scene.style.display='none';pauseTV();const audio=el('tvWelcomeAudio');if(audio&&!audio.paused)audio.pause();}
 else if(phase==='welcome'){scene.style.display='flex';tvScene('<div class="welcomeArtwork tvGrandWelcome"><div class="tvCinematicLights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="tvIntroCopy"><span class="eyebrow">LERNFELD 14 · INTERAKTIVE DOKUMENTATION</span><span class="tvIntroLine">BERÜHREN · VERSTEHEN · MITMACHEN</span><h1>TOUCH<em>SCREEN</em></h1><p class="welcomeProgramTitle">'+esc(state.videoTitle||'TOUCHSCREEN – Interaktive Dokumentation')+'</p><p>Geschichte, Technik und Zukunft – gemeinsam entdecken.</p><p class="welcomePrompt">Öffnet den Schülerlink auf eurem iPad. Gleich geht es los!</p><span class="tvIntroReady"><i></i> TOUCH LIVE · BEREIT</span></div><div class="tvPhotoStage"><img src="https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Smartphone-mobile-hand-technology-internet-finger.jpg/960px-Smartphone-mobile-hand-technology-internet-finger.jpg" alt="Echtes Foto: Finger bedienen einen Smartphone-Touchscreen"><span class="tvPhotoCaption">✦ TOUCH · SENSOR · TECHNIK</span></div></div>');pauseTV();}
 else if(phase==='gesture'){scene.style.display='flex';tvScene('<div><span class="eyebrow">KAPITEL 04 / MULTITOUCH</span><h1><em>Gesten üben.</em></h1><p>Auf den iPads verschieben, vergrößern und drehen!</p></div>');pauseTV();}
 else if(phase==='zoom'){scene.style.display='flex';const q=state.quiz;tvScene('<div class="egg-projector"><div><span class="eyebrow">KAPITEL 04 · MULTITOUCH LIVE-EXPERIMENT</span><h1>Die <em>Touch-Challenge!</em></h1><p>So funktioniert Multitouch in der Praxis: Vergrößert das digitale Bild mit zwei Fingern, verschiebt es und tippt auf das versteckte Easter Egg.</p><div class="egg-tv-counter"><strong>'+(q?q.remaining:0)+' s</strong><span>⏱ Zeit übrig<br>🔎 '+(q?q.foundCount:0)+' von '+state.participants+' haben das Easter Egg gefunden</span></div><p class="small" style="margin-top:22px">Pinch-to-Zoom = zwei Finger auseinanderziehen · Pan = verschieben · Tap = antippen.</p></div><img class="egg-tv-art" src="/easter-scene.svg" alt="Panorama mit Berghütte als Easter-Egg-Spiel"></div>');pauseTV();}
 else if(phase==='demo'){scene.style.display='flex';tvScene('<div><span class="eyebrow">LIVE-QUIZ · PROBELAUF</span><h1>Frage '+(state.quiz?.index+1||'')+'</h1><h2>'+esc(state.quiz?.q||'Bereit für die erste Frage?')+'</h2><p>Antwortet auf euren iPads · '+(state.quiz?.remaining||0)+' Sekunden</p></div>');pauseTV();}
 else if(phase==='results'){scene.style.display='flex';tvScene('<div class="resultshow podiumScene"><span class="eyebrow">TOUCH LIVE · DIE GROSSE SIEGEREHRUNG</span><h1>Das sind eure <em>Top 3!</em></h1>'+podium()+'<p class="podiumFoot">Herzlichen Glückwunsch! · '+state.participants+' Teilnehmende</p></div>');pauseTV();}
 else if(phase==='handout'){scene.style.display='flex';tvScene('<div class="endArtwork"><img src="/touchscreen-motiv.svg" alt="Touchscreen"><div><span class="eyebrow">LERNFELD 14 · ZUM ABSCHLUSS</span><h1>Jetzt seid <em>ihr</em> dran!</h1><p>Öffnet das Handout auf eurem iPad. Bewertet die zehn Kriterien von 1 bis 10. Summe und Durchschnitt werden automatisch berechnet.</p></div></div>');pauseTV();}
 else if(phase==='end'){scene.style.display='flex';tvScene('<div class="endArtwork tvGrandEnding"><div class="tvCinematicLights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><img src="/touchscreen-motiv.svg" alt="Touchscreen"><div class="tvEndCopy"><span class="eyebrow">TOUCH LIVE · DAS FINALE</span><span class="tvOutroLine">7 KAPITEL · 17 FRAGEN · 2 MISSIONEN</span><h1>Vielen Dank für eure <em>Aufmerksamkeit!</em></h1><p>Das war meine Dokumentation <strong>„'+esc(state.videoTitle||'TOUCHSCREEN')+'“</strong>.</p><p class="closingLine">Fragen? Ideen? Jetzt seid ihr dran!</p><span class="tvEndSignature">✦ TOUCH LIVE 2026 ✦</span></div></div>');pauseTV();}
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
 // Handout (A4, 2 Seiten). Jedes Feld kann getippt ODER mit Stift/Finger beschrieben
 // werden (iPad + Apple Pencil). Rechnen machen die Schüler selbst; „Prüfen“ kontrolliert
 // nur getippte Zahlen. Alles bleibt auf dem Gerät gespeichert und lässt sich drucken.
 const types=[
  ['Resistiv','Zwei leitende Folien werden durch Druck aneinandergepresst.','Stift und Handschuh gehen, günstig','kein echtes Multitouch, Bild etwas trüber','Kartenterminal, ältere Navis'],
  ['Kapazitiv','Der Finger verändert das elektrische Feld (Kapazität) im Sensorgitter.','Multitouch, sehr genau, robustes Glas','nur leitfähiger Finger, Wasser stört','Smartphone, Tablet'],
  ['Infrarot','Ein Lichtgitter aus IR-LEDs am Rand wird vom Finger unterbrochen.','jeder Gegenstand, riesige Flächen','Rahmen nötig, Sonne und Staub stören','interaktive Tafel, Kiosk'],
  ['Oberflächenwellen','Ultraschall läuft über das Glas, der Finger dämpft die Welle.','sehr klares Bild','empfindlich bei Schmutz und Wasser','Info-Terminal'],
  ['Optisch','Kameras erkennen Finger oder Schatten auf der Fläche.','sehr große Displays möglich','teuer, braucht Platz','Touch-Tisch, Messe']
 ];
 const facts=[
  ['Display und Touch sind zwei Teile.','Das Display (LCD/OLED) macht das Bild, der durchsichtige Sensor darüber erkennt den Finger.'],
  ['Kapazitiv braucht Leitfähigkeit.','Normale Handschuhe leiten nicht – Touch-Handschuhe haben leitende Fäden in den Fingerspitzen.'],
  ['Wasser leitet auch.','Darum lösen Tropfen auf dem Display manchmal eine Berührung aus.'],
  ['Multitouch = mehrere Punkte gleichzeitig.','Aus den Punkten berechnet die Software Zoomen, Drehen und Wischen.'],
  ['Haptisches Feedback','ist eine kurze Vibration als Antwort – man „spürt“ den Klick.'],
  ['Im Auto gefährlich:','2 Sekunden Blick aufs Display bei 50 km/h – wie weit fährt man blind? Rechne es unten aus.']
 ];
 const crit=[['inhalt','Inhalt der Doku',25],['verst','Verständlichkeit',20],['inter','Interaktivität (Quiz & Spiele)',25],['technik','Technik & Ablauf',10],['handout','Handout',10],['auftritt','Präsentation (Form, Sprache)',10]];
 // Schreibfeld: getippt (input/textarea) + darüberliegende Stift-Ebene (canvas).
 const wb=(key,kind,label)=>'<div class="wb wb-'+kind+'" data-wb="'+key+'">'+
  (kind==='area'?'<textarea data-save="'+key+'" aria-label="'+esc(label||key)+'"></textarea>':'<input data-save="'+key+'" '+(kind==='num'?'inputmode="decimal" autocomplete="off"':'')+' aria-label="'+esc(label||key)+'">')+
  '<canvas class="wbInk" data-ink="'+key+'"></canvas></div>';
 const layers='<figure class="hxFig"><svg viewBox="0 0 300 132" role="img" aria-label="Aufbau: Deckglas, Sensor, Display">'+
  '<rect x="8" y="14" width="196" height="16" fill="#e8f1f0" stroke="#5b7f7c"/><text x="214" y="26">Deckglas</text>'+
  '<rect x="8" y="34" width="196" height="10" fill="#fff" stroke="#0b6e69"/>'+Array.from({length:12},(_,i)=>'<line x1="'+(16+i*16)+'" y1="34" x2="'+(16+i*16)+'" y2="44" stroke="#0b6e69" stroke-width="1"/>').join('')+'<text x="214" y="43">Sensorgitter</text>'+
  '<rect x="8" y="48" width="196" height="34" fill="#dfe5ea" stroke="#71808c"/><text x="214" y="69">Display (LCD/OLED)</text>'+
  '<rect x="8" y="86" width="196" height="12" fill="#c9d0d6" stroke="#71808c"/><text x="214" y="95">Elektronik</text>'+
  '<path d="M96 0 C96 6 100 10 106 12" fill="none" stroke="#18232b" stroke-width="1.4"/><circle cx="106" cy="11" r="3" fill="#18232b"/>'+
  '<text x="8" y="120" class="hxFigCap">Finger → Feld im Gitter ändert sich → Controller berechnet x/y</text></svg></figure>';
 const head=(kicker,title,sub)=>'<header class="hxHead"><div><div class="hxKicker">'+kicker+'</div><h1 class="hxTitle">'+title+'</h1><div class="hxSub">'+sub+'</div></div><div class="hxMeta"><span>Lernfeld 14</span><span>Friedrich-Dessauer-Schule Limburg</span><div class="hxMetaLine">Name '+wb('hx_name','line','Name')+'</div></div></header>';
 const sec=(n,title)=>'<h2 class="hxH"><span class="hxNum">'+n+'</span>'+title+'</h2>';
 const page1='<section class="hxPage">'+
  head('Handout zur Präsentation','Touchscreens','Interaktive Dokumentation „TOUCH LIVE“ · Präsentation von Marlon Bonsels')+
  '<div class="hxIntro"><p class="hxDef"><b>Touchscreen</b> – ein Bildschirm, der zugleich Eingabegerät ist. Ein durchsichtiger Sensor über dem Display erkennt, <i>wo</i> er berührt wird, und meldet diese Position an das Gerät.</p>'+layers+'</div>'+
  sec(1,'Fünf Arten im Vergleich')+
  '<table class="hxTable"><thead><tr><th>Technik</th><th>So funktioniert’s</th><th>Stärke</th><th>Schwäche</th><th>typisch für</th></tr></thead><tbody>'+
   types.map(r=>'<tr><td><b>'+esc(r[0])+'</b></td><td>'+esc(r[1])+'</td><td>'+esc(r[2])+'</td><td>'+esc(r[3])+'</td><td>'+esc(r[4])+'</td></tr>').join('')+'</tbody></table>'+
  '<p class="hxTimeline"><span><b>1965</b> E. A. Johnson beschreibt den kapazitiven Touch</span><span><b>1972</b> Bent Stumpe, CERN</span><span><b>1983</b> HP-150 mit Infrarot-Touch</span><span><b>1994</b> IBM Simon – erstes Touch-Smartphone</span><span><b>2007</b> iPhone: Multitouch für alle</span></p>'+
  sec(2,'Das musst du wissen')+
  '<ol class="hxKey">'+facts.map(([a,b])=>'<li><b>'+esc(a)+'</b> '+esc(b)+'</li>').join('')+'</ol>'+
  '<footer class="hxFoot"><span>Touchscreens · Handout · Marlon Bonsels</span><span>1 / 3</span></footer></section>'+
  '<section class="hxPage hxBreak">'+head('Arbeitsblatt','Jetzt seid ihr dran','Rechnen, bewerten, entscheiden – tippen oder mit dem Stift schreiben')+
  sec(3,'Rechnen: Blindflug im Auto')+
  '<div class="hxCalcBox"><p>Ein Auto fährt <b>50 km/h</b>. Die Fahrerin schaut <b>2 Sekunden</b> auf den Touchscreen. Wie viele Meter fährt sie „blind“? <span class="hxHint">Tipp: km/h ÷ 3,6 = m/s · Weg = Geschwindigkeit × Zeit</span></p>'+
  '<div class="hxSteps"><label>Geschwindigkeit in m/s'+wb('hx_car_ms','num','Geschwindigkeit in m/s')+'</label><label>Weg in Metern'+wb('hx_car_m','num','Weg in Metern')+'</label><button type="button" class="hxCheck noPrint" data-check="car">Prüfen</button></div><div class="hxWork"><span>Rechenweg</span>'+wb('hx_car_work','area','Rechenweg')+'</div><p class="hxCheckMsg noPrint" id="hxCheckCar" aria-live="polite"></p></div>'+
  sec(4,'Aufgabe: Rechne wie ein Touch-Controller')+
  '<p class="hxText">Im Smartphone arbeitet ein kleiner Chip, der <b>Touch-Controller</b>. Er misst ständig das Sensorgitter und meldet dem Gerät, wo dein Finger ist. Rechnet zu zweit – Taschenrechner erlaubt.</p>'+
  '<table class="hxTable hxCalc hxWrite hxTasks"><thead><tr><th>Aufgabe</th><th>So rechnest du</th><th class="c">Ergebnis</th></tr></thead><tbody>'+
   '<tr><td><b>a) Sensorgitter</b><br>Ein Display hat <b>30</b> Leiterbahnen längs und <b>16</b> quer. An jeder Kreuzung wird gemessen. Wie viele Messpunkte sind das?</td><td class="hxHow">Längs × Quer</td><td class="c">'+wb('hx_q_grid','num','Messpunkte')+'<small>Punkte</small></td></tr>'+
   '<tr><td><b>b) Abtastrate</b><br>Der Controller misst <b>120-mal pro Sekunde</b> (120 Hz). Wie viele Millisekunden liegen zwischen zwei Messungen?</td><td class="hxHow">1000 ms ÷ Hz</td><td class="c">'+wb('hx_q_hz120','num','Millisekunden bei 120 Hz')+'<small>ms</small></td></tr>'+
   '<tr><td>Ein Gaming-Handy misst mit <b>240 Hz</b>. Wie viele Millisekunden sind es da?</td><td class="hxHow">1000 ms ÷ Hz</td><td class="c">'+wb('hx_q_hz240','num','Millisekunden bei 240 Hz')+'<small>ms</small></td></tr>'+
   '<tr><td><b>c) Pixeldichte</b><br>Ein Smartphone-Display hat <b>2400 × 1080</b> Pixel und eine Diagonale von <b>6,5 Zoll</b>. Wie viele Pixel pro Zoll (ppi) sind das?</td><td class="hxHow">√(2400² + 1080²) ÷ 6,5</td><td class="c">'+wb('hx_q_ppi','num','Pixel pro Zoll')+'<small>ppi</small></td></tr>'+
  '</tbody></table>'+
  '<div class="hxRow"><button type="button" class="hxCheck noPrint" data-check="task">Ergebnisse prüfen</button><span class="hxCheckMsg noPrint" id="hxCheckTask" aria-live="polite"></span></div>'+
  '<div class="hxLine"><span>Was bringt eine höhere Abtastrate beim Bedienen?</span>'+wb('hx_decision','line','Was bringt eine höhere Abtastrate')+'</div>'+
  '<footer class="hxFoot"><span>Touchscreens · Handout · Marlon Bonsels</span><span>2 / 3</span></footer></section>';
 const page2='<section class="hxPage hxBreak">'+
  head('Feedbackbogen · anonym','Wie war die Präsentation?','Touchscreens · Interaktive Dokumentation „TOUCH LIVE“')+
  '<p class="hxText">So geht’s: Gib jedem Kriterium eine <b>Bewertung von 0 bis 10</b> (10 = sehr gut). Rechne <b>Bewertung × Gewichtung</b> und addiere alles – heraus kommt eine Note von 0 bis 10.</p>'+
  '<table class="hxTable hxCalc hxWrite hxFeedback"><thead><tr><th>Kriterium</th><th class="r">Gewichtung</th><th class="c">Bewertung (0–10)</th><th class="c">Bewertung × Gewichtung</th></tr></thead><tbody>'+
   crit.map(([k,l,w])=>'<tr><td><b>'+esc(l)+'</b></td><td class="r">'+w+' %</td><td class="c">'+wb('hx_f_'+k,'num','Bewertung '+l)+'</td><td class="c">'+wb('hx_fp_'+k,'num','Ergebnis '+l)+'</td></tr>').join('')+
   '<tr class="hxSum"><td>Summe</td><td class="r">100 %</td><td></td><td class="c">'+wb('hx_fsum','num','Summe')+'</td></tr></tbody></table>'+
  '<div class="hxRow"><button type="button" class="hxCheck noPrint" data-check="feedback">Rechnung prüfen</button><span class="hxCheckMsg noPrint" id="hxCheckFeedback" aria-live="polite"></span></div>'+
  '<div class="hxCols3"><div><span class="hxColHead g">Das war gut</span>'+wb('hx_good','area','Das war gut')+'</div><div><span class="hxColHead b">Das war nicht so gut</span>'+wb('hx_better','area','Das war nicht so gut')+'</div><div><span class="hxColHead c">Das würde ich ändern</span>'+wb('hx_change','area','Das würde ich ändern')+'</div></div>'+
  '<p class="hxNote">Beispiel: Bewertung 8 bei Interaktivität ergibt 8 × 0,25 = 2,0. Danke fürs Ausfüllen!</p>'+
  '<footer class="hxFoot"><span>Touchscreens · Feedbackbogen</span><span>3 / 3</span></footer></section>';
 const tools='<div class="hxTools noPrint" role="toolbar" aria-label="Schreibwerkzeuge">'+
  '<div class="hxSeg"><button type="button" data-mode="type" class="on">⌨ Tippen</button><button type="button" data-mode="pen">✎ Stift</button><button type="button" data-mode="erase">⌫ Radierer</button></div>'+
  '<div class="hxSeg hxColors"><button type="button" data-color="#1b2a8a" class="on" title="Blau" style="--c:#1b2a8a"></button><button type="button" data-color="#111111" title="Schwarz" style="--c:#111"></button><button type="button" data-color="#c0392b" title="Rot" style="--c:#c0392b"></button></div>'+
  '<button type="button" id="hxUndo">↶ Rückgängig</button>'+
  '<label class="hxPenOnly"><input type="checkbox" id="hxPenOnly"> nur Apple Pencil</label>'+
  '<span class="hxToolsGap"></span><button type="button" class="primary" id="sendHandout">Rückmeldung senden</button><button type="button" id="printHandout">PDF / Drucken</button><button type="button" id="clearHandout">Leeren</button><span id="hxSaved" aria-live="polite"></span></div>';
 wrap(page('Handout','LERNFELD 14 · TOUCHSCREENS','Tippen oder mit dem Stift schreiben – auch mit dem Apple Pencil. Gerechnet wird selbst. Alles bleibt auf deinem Gerät gespeichert.')+tools+
  '<article class="hx" id="paper">'+page1+page2+'</article>');
 const paper=el('paper');
 const fields=()=>[...paper.querySelectorAll('[data-save]')];
 const value=k=>{const n=paper.querySelector('[data-save="'+k+'"]');return n?String(n.value||'').trim():'';};
 const num=k=>{const v=value(k).replace(/\s/g,'').replace(',','.');return v===''||!Number.isFinite(Number(v))?null:Number(v);};
 const fmt=n=>n.toLocaleString('de-DE',{maximumFractionDigits:2});
 const saved=()=>{const s=el('hxSaved');if(s)s.textContent='✓ gespeichert';};
 fields().forEach(x=>{
  const key='touch_'+x.dataset.save;
  try{x.value=localStorage.getItem(key)||'';}catch{}
  x.oninput=()=>{try{localStorage.setItem(key,x.value);}catch{}saved();x.closest('.wb')?.classList.remove('ok','bad');};
 });
 // ---------- Stift-Ebene ----------
 let mode='type',color='#1b2a8a',penOnly=false;const undo=[];
 try{penOnly=localStorage.getItem('touch_hx_penonly')==='1';}catch{}
 el('hxPenOnly').checked=penOnly;
 const canvases=()=>[...paper.querySelectorAll('canvas.wbInk')];
 function fit(c){
  const r=c.getBoundingClientRect(),dpr=Math.min(3,window.devicePixelRatio||1);
  const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
  if(c.width===w&&c.height===h)return;
  c.width=w;c.height=h;
  let data=null;try{data=localStorage.getItem('touch_ink_'+c.dataset.ink);}catch{}
  if(data){const img=new Image();img.onload=()=>{const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);};img.src=data;c.parentElement.classList.add('inked');}
 }
 function store(c){
  const blank=!c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);
  try{if(blank)localStorage.removeItem('touch_ink_'+c.dataset.ink);else localStorage.setItem('touch_ink_'+c.dataset.ink,c.toDataURL('image/png'));}catch{alert('Speicher voll – bitte einzelne Zeichnungen löschen.');}
  c.parentElement.classList.toggle('inked',!blank);saved();
 }
 function setMode(m){
  mode=m;document.body.classList.toggle('hxInkMode',m!=='type');document.body.classList.toggle('hxEraseMode',m==='erase');
  document.querySelectorAll('.hxTools [data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
  if(m!=='type')document.activeElement?.blur?.();
  canvases().forEach(fit);
 }
 canvases().forEach(c=>{
  let drawing=false,last=null,g=null;
  c.addEventListener('pointerdown',e=>{
   if(mode==='type')return;
   if(penOnly&&e.pointerType==='touch')return; // Handballen/Finger ignorieren
   e.preventDefault();fit(c);g=c.getContext('2d');
   undo.push({c,data:c.toDataURL()});if(undo.length>40)undo.shift();
   drawing=true;c.setPointerCapture(e.pointerId);
   const r=c.getBoundingClientRect(),dpr=c.width/r.width;last={x:(e.clientX-r.left)*dpr,y:(e.clientY-r.top)*dpr};
   g.lineCap='round';g.lineJoin='round';
  });
  c.addEventListener('pointermove',e=>{
   if(!drawing)return;e.preventDefault();
   const r=c.getBoundingClientRect(),dpr=c.width/r.width,events=e.getCoalescedEvents?e.getCoalescedEvents():[e];
   for(const ev of events){
    const p={x:(ev.clientX-r.left)*dpr,y:(ev.clientY-r.top)*dpr},pr=ev.pressure&&ev.pointerType==='pen'?ev.pressure:.5;
    g.globalCompositeOperation=mode==='erase'?'destination-out':'source-over';
    g.strokeStyle=color;g.lineWidth=(mode==='erase'?18:1.2+pr*2.4)*dpr;
    g.beginPath();g.moveTo(last.x,last.y);g.lineTo(p.x,p.y);g.stroke();last=p;
   }
  });
  const end=()=>{if(!drawing)return;drawing=false;g.globalCompositeOperation='source-over';store(c);};
  c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);
 });
 document.querySelectorAll('.hxTools [data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
 document.querySelectorAll('.hxTools [data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;document.querySelectorAll('.hxTools [data-color]').forEach(x=>x.classList.toggle('on',x===b));if(mode!=='pen')setMode('pen');});
 el('hxPenOnly').onchange=e=>{penOnly=e.target.checked;try{localStorage.setItem('touch_hx_penonly',penOnly?'1':'0');}catch{}};
 el('hxUndo').onclick=()=>{const u=undo.pop();if(!u)return;const img=new Image();img.onload=()=>{const g=u.c.getContext('2d');g.globalCompositeOperation='source-over';g.clearRect(0,0,u.c.width,u.c.height);g.drawImage(img,0,0);store(u.c);};img.src=u.data;};
 // Mit dem Stift direkt loslegen: Pencil-Berührung schaltet automatisch in den Stiftmodus.
 paper.addEventListener('pointerdown',e=>{if(e.pointerType==='pen'&&mode==='type'){setMode('pen');}},true);
 let resizeT=null;window.addEventListener('resize',()=>{clearTimeout(resizeT);resizeT=setTimeout(()=>{if(el('paper'))canvases().forEach(c=>{c.width=0;fit(c);});},200);});
 requestAnimationFrame(()=>canvases().forEach(fit));
 // ---------- Rechnung prüfen (nur getippte Zahlen) ----------
 const mark=(k,ok)=>{const b=paper.querySelector('[data-wb="'+k+'"]');if(b){b.classList.toggle('ok',ok===true);b.classList.toggle('bad',ok===false);}};
 const near=(a,b)=>Math.abs(a-b)<=0.051;
 function checkTask(){
  const want=[['hx_q_grid',480,0],['hx_q_hz120',1000/120,.05],['hx_q_hz240',1000/240,.05],['hx_q_ppi',Math.hypot(2400,1080)/6.5,2]];
  let right=0,wrong=0,open=0;
  for(const [k,v,tol] of want){const x=num(k);if(x===null){open++;mark(k,null);continue;}const ok=Math.abs(x-v)<=tol+1e-9;mark(k,ok);ok?right++:wrong++;}
  return {right,wrong,open};
 }
 function checkFeedback(){
  let right=0,wrong=0,open=0,sum=0,complete=true;
  for(const [k,,w] of crit){const b=num('hx_f_'+k),x=num('hx_fp_'+k);
   if(b===null||x===null){complete=false;open++;mark('hx_fp_'+k,null);continue;}
   const ok=near(b*w/100,x);mark('hx_fp_'+k,ok);ok?right++:wrong++;sum+=x;}
  const s=num('hx_fsum');if(s===null||!complete){mark('hx_fsum',null);if(s===null)open++;}else{const ok=near(sum,s);mark('hx_fsum',ok);ok?right++:wrong++;}
  return {right,wrong,open};
 }
 const report=(id,r)=>{const m=el(id);if(!m)return;
  m.textContent=r.right+r.wrong===0?'Zum Prüfen bitte die Zahlen tippen (Handschrift kann die Seite nicht lesen).':(r.wrong?'✗ '+r.wrong+(r.wrong>1?' Ergebnisse stimmen':' Ergebnis stimmt')+' noch nicht – rot markiert.':'✓ Alles richtig gerechnet!')+(r.open&&r.right+r.wrong?' ('+r.open+' Felder noch leer)':'');
  m.className='hxCheckMsg noPrint '+(r.wrong?'bad':r.right?'ok':'');};
 paper.querySelectorAll('[data-check]').forEach(b=>b.onclick=()=>{
  if(b.dataset.check==='task')report('hxCheckTask',checkTask());
  else if(b.dataset.check==='feedback')report('hxCheckFeedback',checkFeedback());
  else{const ms=num('hx_car_ms'),m=num('hx_car_m'),msg=el('hxCheckCar');
   if(ms!==null)mark('hx_car_ms',Math.abs(ms-50/3.6)<=0.06);if(m!==null)mark('hx_car_m',Math.abs(m-100/3.6)<=0.6);
   msg.textContent=ms===null&&m===null?'Zum Prüfen bitte die Zahlen tippen.':(ms!==null&&Math.abs(ms-50/3.6)>0.06)||(m!==null&&Math.abs(m-100/3.6)>0.6)?'✗ Noch nicht ganz – schau dir die Formel im Tipp an.':'✓ Richtig! Rund '+fmt(Math.round(100/3.6*10)/10)+' m ohne Blick auf die Straße.';
   msg.className='hxCheckMsg noPrint '+(msg.textContent.startsWith('✓')?'ok':msg.textContent.startsWith('✗')?'bad':'');}
 });
 el('printHandout').onclick=()=>{setMode('type');window.print();};
 el('clearHandout').onclick=()=>{
  if(!confirm('Alle Einträge und Zeichnungen im Handout löschen?'))return;
  fields().forEach(x=>{try{localStorage.removeItem('touch_'+x.dataset.save);}catch{}x.value='';});
  canvases().forEach(c=>{try{localStorage.removeItem('touch_ink_'+c.dataset.ink);}catch{}c.getContext('2d').clearRect(0,0,c.width,c.height);c.parentElement.classList.remove('inked');});
  paper.querySelectorAll('.wb').forEach(b=>b.classList.remove('ok','bad'));
 };
 el('sendHandout').onclick=async()=>{
  const lines=[];
  const s=num('hx_fsum');if(s!==null)lines.push('Bewertung (selbst gerechnet): '+fmt(s)+' von 10');
  for(const [k,l] of crit){const v=value('hx_f_'+k);if(v!=='')lines.push(l+': '+v+'/10');}
  if(value('hx_good'))lines.push('Das war gut: '+value('hx_good'));
  if(value('hx_better'))lines.push('Nicht so gut: '+value('hx_better'));
  if(value('hx_change'))lines.push('Ändern: '+value('hx_change'));
  if(value('hx_decision'))lines.push('Höhere Abtastrate bringt: '+value('hx_decision'));
  const inked=canvases().some(c=>c.parentElement.classList.contains('inked'));
  if(inked)lines.push('(Teile wurden mit dem Stift geschrieben – die sind nur im PDF des Schülers sichtbar.)');
  if(!lines.length)return alert('Bitte zuerst den Feedbackbogen ausfüllen (getippt). Handschrift kannst du als PDF speichern und abgeben.');
  const btn=el('sendHandout');btn.disabled=true;
  try{await api('/api/feedback','POST',{text:lines.join('\n').slice(0,3000),rating:s===null?0:Math.round(s)});btn.textContent='✓ Gesendet – danke!';}
  catch(err){btn.disabled=false;alert('Senden fehlgeschlagen: '+err.message);}
 };
 setMode('type');
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
 if(role==='teacher'&&query.get('key')){try{localStorage.setItem('touch_teacher_key',query.get('key'));}catch{}history.replaceState({},'',location.pathname+'#teacher');}
 if(role!=='teacher'){const d=document.getElementById('teacherDock');if(d)d.remove();document.body.classList.remove('teacherMode');clearInterval(window.__tdTimer);}
 if(role==='tv'&&query.get('key')){tvKey=query.get('key');sessionStorage.setItem('touch_tv_key',tvKey);localStorage.setItem('touch_tv_key',tvKey);history.replaceState({},'',location.pathname+'#tv');}
 if(role==='remote'){location.replace('/host'+(remoteKey?'?key='+encodeURIComponent(remoteKey):''));return;}
 document.body.classList.toggle('studentEntry',role==='join');
 document.body.classList.remove('rgHome');
 document.body.classList.toggle('rgTheme',role!=='tv');
 if(role!=='join'&&role!=='teacher')document.body.classList.remove('touchStudent');
 renderSignature='';state=null;mediaType='';
 window.__touchBooted=true;
 try{if(role==='admin'){showAdmin();loadAdminInfo();}else if(role==='control')controlPage();else if(role==='remote')remotePage();else if(role==='tv')tvView();else if(role==='handout')handout();else if(role==='join'||role==='teacher')userPage();else home();}
 catch(err){
  // Never leave the loading screen: show what failed and offer a clean retry.
  console.error(err);
  if(role==='admin'){try{sessionStorage.removeItem('touch_admin_key');}catch{}}
  app.innerHTML='<main style="padding:10vh 6vw;color:#fff;font-family:Arial,sans-serif"><h1>TOUCH LIVE</h1><p>Diese Ansicht konnte nicht geöffnet werden: '+esc(err&&err.message||err)+'</p><p><button onclick="location.reload()" style="padding:12px 20px">↻ Neu laden</button></p><p><a href="/join" style="color:#50dace">Schüler-Quiz</a> · <a href="/#admin" style="color:#50dace">Admin</a> · <a href="/control" style="color:#50dace">Handy-Fernbedienung</a></p></main>';
 }
 poll();}
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
 if(role==='home'){
  try{const next=await api('/api/state');const AD=['results','end','handout'],changed=!state||state.homeUnlocked!==next.homeUnlocked||state.trailerAvailable!==next.trailerAvailable||AD.includes(state.phase)!==AD.includes(next.phase);state=next;if(changed||force)home();}catch(e){if(!state){const node=el('app');if(node&&node.querySelector('.loader'))home();}}
  return;
 }
 if(role==='handout')return;
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
 if(role==='join'||role==='teacher'){const player=state.player||{};const q=state.quiz;const missionActive=q?.type==='zoom'||state.phase==='gesture'||state.sideGame==='gesture';const sig=[role,state.phase,state.sideGame||'',q?.id||'',player?.id||'',player?.name||'',q?.accepting||false,missionActive?'mission-stable':player.choice,player.score,missionActive?'no-rerender':state.revision,missionActive?'no-participants-rerender':state.participants,JSON.stringify(player.jokers||{}),(player.hide||[]).join(),player.hint||'',missionActive?'no-results-rerender':JSON.stringify(state.zoomResult||'')].join('|');if(force||renderSignature!==sig){renderSignature=sig;userPage();participantMode();}else if(q){paintQuizTimer(q);if(q?.type==='zoom'&&easterInstance)easterInstance.update({remaining:q.remaining,found:!!state.player?.zoomFound,disabled:!q.accepting});}if((state.phase==='gesture'||state.sideGame==='gesture')&&fingerMissionInstance)fingerMissionInstance.update({remaining:state.gestureRemaining,disabled:state.gestureRemaining<=0});}
 if(role==='join')refreshStudentScoreBadge();
 if(role==='tv'&&old&&old.phase!==next.phase&&['film','trailer'].includes(next.phase)&&window.SpotifyConnect?.webPlayerActive?.())window.SpotifyConnect.pauseWebPlayer().catch(()=>{});
 if(next.spotifyClientId&&window.SpotifyConnect?.setDefaultClientId)window.SpotifyConnect.setDefaultClientId(next.spotifyClientId);
 if((role==='admin'||role==='control')&&(window.SpotifyConnect?.connected?.()||next.spotifyLinked))spotifyServerLink();
 if(role==='tv'){tvSpotifyVisibility();tvMusicPlan(old,next);}
 if(role==='tv'){tvDisplay();
   const signal=Number(state.tvReloadRequest||0);
   if(window.__touchTVReloadSeen===undefined)window.__touchTVReloadSeen=signal;
   else if(window.__touchTVReloadSeen!==signal){window.__touchTVReloadSeen=signal;if(['welcome','end','handout'].includes(state.phase)){if(tvKey)localStorage.setItem('touch_tv_key',tvKey);location.reload();}}
  }
 if(role==='control'){
  if(window.__paintMini)window.__paintMini();
  if(el('controlTitle'))el('controlTitle').textContent=next.videoTitle||'TOUCHSCREEN – Interaktive Dokumentation';
  if(el('controlStatus'))el('controlStatus').textContent=(next.playing?'▶ Film läuft':'Ⅱ Film pausiert')+' · '+secText(next.time)+' · '+next.phase.toUpperCase()+' · '+next.participants+' Zuschauer';
  if(el('controlMusicTitle'))el('controlMusicTitle').textContent=next.welcomeMusic?.on?(next.tvAudio?.playing?'✓ LG-Browser bestätigt: Willkommensmusik läuft mit Ton.':next.tvAudio?.connected?'⚠ LG-Browser meldet noch keinen Ton. Am Fernseher „♫ LG-Musik starten“ mit OK drücken.':'⚠ Musik aktiviert, aber TV noch nicht verbunden oder Tonstatus fehlt. Beamerlink öffnen und dort OK drücken.'):'♫ LG-Musik AUS. Für Spotify wähle über Spotify Connect die Spotify-App auf LG-TV oder HDMI-PC.';
  document.querySelectorAll('[data-mobile-sound]').forEach(btn=>{const field=btn.dataset.mobileSound;const enabled=next.soundtrack?.[field]!==false;btn.dataset.enabled=String(enabled);btn.textContent=field==='pause'?(enabled?'♫ Pausenmusik AN':'♫ Pausenmusik AUS'):(enabled?'🏆 Ergebnismusik AN':'🏆 Ergebnismusik AUS');});
 }
 if(role==='remote'){const status=el('remoteStatus');if(status)status.textContent='Live: '+next.phase.toUpperCase()+' · '+secText(next.time)+' · '+next.participants+' Teilnehmende · '+(next.playing?'Video läuft':'Video pausiert');}
 if(role==='admin'){if(window.__paintMusicPlan&&el('musicPlanCard'))window.__paintMusicPlan();refreshAdminVideoControls();if(el('adminStatus'))el('adminStatus').textContent='Status: '+state.phase.toUpperCase()+' · Filmzeit: '+secText(state.time)+' · '+state.participants+' Teilnehmende · '+(state.video.type==='none'?'kein Film':state.video.type);if(el('adminParticipants'))el('adminParticipants').textContent=state.participants+' Teilnehmende';if(el('adminTime'))el('adminTime').textContent=secText(state.time);if(el('adminRanking')&&adminInfo){el('adminRanking').textContent='Live-Regie aktiv. Für vollständige Teilnehmerantworten nutze den Ergebnis-Modus.';}if(el('adminFeedback'))el('adminFeedback').textContent=String(state.feedbackCount);}
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
  // An unlocked TV (sound + fullscreen) keeps running; a reload would require the remote again.
  const safe=(!state||['welcome','end','handout'].includes(state.phase))&&!tvSoundActivated&&!lgFullscreenActive();
  if(tvPendingUpdate&&safe){
   // Save the TV key so refreshing does not require retyping it.
   if(tvKey)localStorage.setItem('touch_tv_key',tvKey);
   location.reload();
  }
 }catch{
  // If Render is restarting, retry automatically on the next cycle.
 }finally{tvUpdateBusy=false;}
}

let lastHomeUnlock=null;
setInterval(()=>{if(role!=='home'||!state)return;const next=!!state.homeUnlocked;if(lastHomeUnlock===null){lastHomeUnlock=next;home();}else if(lastHomeUnlock!==next){lastHomeUnlock=next;home();}},1500);
window.addEventListener('hashchange',router);
router();setInterval(()=>{poll();},900);
setTimeout(refreshTvAppVersion,2000);
setInterval(refreshTvAppVersion,20000);
setInterval(()=>{if(role==='tv'&&state?.phase==='film'&&state.video.type!=='none')sendTick(state.playing);},1100);
setInterval(()=>{if(role==='tv')reportWelcomeAudio();},9000);
setInterval(()=>{if(role==='tv'&&state?.video?.type==='local'&&tvLocalLoaded)announceLocalHDMI();},6000);
})();