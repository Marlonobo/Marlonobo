'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const fsp=fs.promises;
const Q=require('./questions.json');
const PORT=Number(process.env.PORT||3000), ROOT=__dirname, DIR=process.env.DATA_DIR||path.join(ROOT,'storage');
const ADMIN=process.env.ADMIN_KEY||crypto.randomBytes(24).toString('hex');
const TV=process.env.TV_KEY||crypto.randomBytes(24).toString('hex');
const COHOST=process.env.COHOST_KEY||crypto.randomBytes(24).toString('hex');
if(!process.env.ADMIN_KEY)console.log('TOUCH LIVE ADMIN_KEY: '+ADMIN);
if(!process.env.TV_KEY)console.log('TOUCH LIVE TV_KEY: '+TV);
fs.mkdirSync(DIR,{recursive:true});
const USERS_FILE=path.join(DIR,'users.json'),STATE_FILE=path.join(DIR,'live-state.json'), VIDEO_FILE=path.join(DIR,'touchscreen.mp4'), SUB_FILE=path.join(DIR,'untertitel.vtt'), QUESTIONS_FILE=path.join(DIR,'custom-questions.json');
try{const saved=JSON.parse(fs.readFileSync(QUESTIONS_FILE,'utf8'));if(Array.isArray(saved)&&saved.length>=1&&saved.length<=50)Q.splice(0,Q.length,...saved);}catch{}
const def=()=>({phase:'welcome',time:0,playing:false,quizOffset:0,subtitleOffset:0,subtitles:true,video:{type:'none',id:null,url:null},demoIndex:0,demoStart:0,zoomStart:0,zoomDone:false,resultsAt:0,clockSource:'tv',lastHostTick:0,revision:0});
let s=def(), users=new Map(), upload=null,feedback=[];
try{s=Object.assign(def(),JSON.parse(fs.readFileSync(STATE_FILE,'utf8')));}catch{}
try{users=new Map(Object.entries(JSON.parse(fs.readFileSync(USERS_FILE,'utf8'))));}catch{}
let usersTimer=null;function saveUsers(){clearTimeout(usersTimer);usersTimer=setTimeout(()=>fsp.writeFile(USERS_FILE,JSON.stringify(Object.fromEntries(users))).catch(console.error),400);}
const ZOOM=()=>Q.find(q=>q.type==='zoom');
let currentWrite=Promise.resolve();
function persist(){currentWrite=currentWrite.then(()=>fsp.writeFile(STATE_FILE,JSON.stringify(s))).catch(console.error);return currentWrite;}
const H={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
function send(res,code,obj){res.writeHead(code,H);res.end(JSON.stringify(obj));}
function unauthorized(res){send(res,403,{error:'Zugang nicht erlaubt.'});}
function read(req,limit=2000000){return new Promise((ok,bad)=>{let n=0,all=[];req.on('data',b=>{n+=b.length;if(n>limit){bad(Error('Anfrage zu gross'));req.destroy();return;}all.push(b);});req.on('end',()=>{try{ok(JSON.parse(Buffer.concat(all).toString('utf8')||'{}'));}catch{bad(Error('Ungueltiges JSON'));}});req.on('error',bad);});}
function secure(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&crypto.timingSafeEqual(x,y);}
function isAdmin(req){return secure(req.headers['x-admin-key'],ADMIN);}
function isTv(req){return secure(req.headers['x-tv-key'],TV);}
function isCohost(req){return secure(req.headers['x-cohost-key'],COHOST);}
function active(){
 let i=-1,remaining=0;
 if(s.phase==='film') i=Q.findIndex(q=>q.type!=='zoom'&&s.time>=q.open+s.quizOffset&&s.time<q.close+s.quizOffset);
 else if(s.phase==='zoom')i=Q.findIndex(q=>q.type==='zoom');
 else if(s.phase==='demo')i=Math.max(0,Math.min(Q.length-1,s.demoIndex));
 if(i<0)return {index:-1,remaining:0,accepting:false};
 const q=Q[i];
 const left=s.phase==='demo'?60-(Date.now()-s.demoStart)/1000:s.phase==='zoom'?(q.duration||75)-(Date.now()-s.zoomStart)/1000:q.close+s.quizOffset-s.time;
 remaining=Math.max(0,Math.ceil(left));
 return {index:i,remaining,accepting:left>0};
}
function publicState(id){
 const a=active(),q=a.index>=0?Q[a.index]:null,u=users.get(String(id||''));
 const final=['results','end','handout'].includes(s.phase);
 const rank=[...users.entries()].map(([uid,x])=>({id:uid,name:x.name,role:x.role,score:x.score,answered:Object.keys(x.answers).length})).sort((x,y)=>y.score-x.score||x.name.localeCompare(y.name,'de')).map((x,i)=>({name:x.name,role:x.role,score:x.score,rank:i+1,answered:x.answered}));
 const normal=Q.filter(x=>x.type!=='zoom');
 let player=null;
 if(u){const jk=u.jokers||{};player={id,role:u.role,name:u.name,score:final?u.score:null,choice:q?u.answers[q.id]??null:null,jokers:{fifty:!!jk.fifty,hint:!!jk.hint}};
  if(q&&jk.fifty===q.id)player.hide=[0,1,2,3].filter(i=>i!==q.correct&&i!==q.fifty);
  if(q&&jk.hint===q.id)player.hint=q.hint||'';}
 const z=ZOOM();let zoomResult=null;
 if(final&&z){const found=[...users.values()].filter(x=>x.answers[z.id]===z.correct).map(x=>x.name);zoomResult={q:z.q,answer:z.a[z.correct],found:found.length,names:found.slice(0,12),total:[...users.values()].filter(x=>Object.hasOwn(x.answers,z.id)).length};}
 return {phase:s.phase,time:s.time,playing:s.playing,revision:s.revision,video:s.video,subtitles:s.subtitles,subtitleOffset:s.subtitleOffset,quizOffset:s.quizOffset,resultsAt:s.resultsAt||0,clockSource:s.clockSource||'tv',
  quiz:a.index>=0?{index:q.type==='zoom'?-1:normal.indexOf(q),total:normal.length,id:q.id,type:q.type||'quiz',chapter:q.chapter,q:q.q,a:q.a,remaining:a.remaining,accepting:a.accepting,jokers:!!(q.hint||Number.isInteger(q.fifty)),answeredCount:[...users.values()].filter(x=>Object.hasOwn(x.answers,q.id)).length}:null,
  player,participants:users.size,ranking:final?rank:[],zoomResult,feedbackCount:feedback.length,captionsAvailable:fs.existsSync(SUB_FILE)};
}
function startZoom(){const z=ZOOM();if(!z)return false;s.phase='zoom';s.playing=false;s.time=z.open;s.zoomStart=Date.now();s.zoomDone=true;s.revision++;persist();return true;}
function endZoom(){if(s.phase!=='zoom')return;s.phase='film';s.playing=true;s.revision++;persist();}
setInterval(()=>{const z=ZOOM();if(s.phase==='zoom'&&z&&Date.now()-s.zoomStart>((z.duration||75)+8)*1000)endZoom();},1000);
setInterval(()=>{if(s.phase==='results'&&s.resultsAt&&Date.now()-s.resultsAt>=28000){s.phase='end';s.playing=false;s.revision++;persist();}},1000);
function youtubeId(link){try{const u=new URL(link);if(['youtu.be','www.youtu.be'].includes(u.hostname))return /^[\w-]{11}$/.test(u.pathname.slice(1,12))?u.pathname.slice(1,12):null;
 if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(u.hostname)){const id=u.searchParams.get('v')||(u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/)||[])[1];return /^[\w-]{11}$/.test(id||'')?id:null;}}catch{}return null;}
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.vtt':'text/vtt; charset=utf-8'};
async function serve(res,file,type){try{const st=await fsp.stat(file);res.writeHead(200,{'Content-Type':type,'Content-Length':st.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});fs.createReadStream(file).pipe(res);}catch{send(res,404,{error:'Datei fehlt'});}}
async function media(req,res){
 let st;try{st=await fsp.stat(VIDEO_FILE);}catch{return send(res,404,{error:'Noch kein Video gespeichert'});}
 const size=st.size,range=req.headers.range;let start=0,end=size-1,code=200;
 if(range){const m=/bytes=(\d+)-(\d*)/.exec(range);if(!m)return send(res,416,{error:'Range ungueltig'});start=+m[1];end=m[2]?Math.min(end,+m[2]):end;if(start>=size||start>end){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end();}code=206;}
 const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':end-start+1,'Cache-Control':'no-store'};
 if(code===206)headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
 res.writeHead(code,headers);if(req.method==='HEAD')return res.end();fs.createReadStream(VIDEO_FILE,{start,end}).pipe(res);
}
async function handler(req,res){
 const u=new URL(req.url,'http://localhost'),p=u.pathname,m=req.method;
 if(m==='GET'&&(p==='/'||p==='/index.html'))return serve(res,path.join(ROOT,'index.html'),mime['.html']);
 if(m==='GET'&&(p==='/app.js'||p==='/style.css'))return serve(res,path.join(ROOT,p.slice(1)),mime[path.extname(p)]);
 if(m==='GET'&&p==='/touchscreen-motiv.svg')return serve(res,path.join(ROOT,'touchscreen-motiv.svg'),'image/svg+xml');
 if(m==='GET'&&(p==='/watch'||p==='/host'))return serve(res,path.join(ROOT,'party.html'),'text/html; charset=utf-8');
 if(m==='GET'&&(p==='/party.js'||p==='/party.css'))return serve(res,path.join(ROOT,p.slice(1)),mime[path.extname(p)]);
 if(m==='GET'&&p==='/api/state')return send(res,200,publicState(u.searchParams.get('id')));
 if(m==='GET'&&p==='/api/health')return send(res,200,{ok:true,questionCount:Q.length,now:Date.now()});
 if(m==='GET'&&p==='/api/admin-info'){if(!isAdmin(req))return unauthorized(res);return send(res,200,{tvKey:TV,cohostKey:COHOST,questions:Q.map(q=>({id:q.id,type:q.type||'quiz',open:q.open,close:q.close,duration:q.duration,q:q.q,a:q.a,correct:q.correct,chapter:q.chapter,hint:q.hint,fifty:q.fifty})),ranking:[...users.values()].map(x=>({name:x.name,role:x.role,score:x.score,answers:x.answers,jokers:x.jokers||{}})).sort((a,b)=>b.score-a.score),feedback});}
 if(m==='GET'&&p==='/captions.vtt')return serve(res,SUB_FILE,mime['.vtt']);
 if((m==='GET'||m==='HEAD')&&p==='/media/video')return media(req,res);
 if(m==='POST'&&p==='/api/join'){
 const b=await read(req,2000),name=String(b.name||'').trim().slice(0,26),role=b.role==='teacher'?'teacher':'student';
 if(!name)return send(res,400,{error:'Bitte einen Namen eingeben.'});
 const id=/^[a-f0-9]{32}$/.test(String(b.id||''))?b.id:crypto.randomBytes(16).toString('hex');
 if(!users.has(id))users.set(id,{name,role,answers:{},score:0,jokers:{}});
 else {users.get(id).name=name;users.get(id).role=role;}
 saveUsers();
 return send(res,200,{ok:true,id});
 }
 if(m==='POST'&&p==='/api/answer'){
 const b=await read(req,1000),x=users.get(String(b.id||'')),a=active();
 if(!x)return send(res,400,{error:'Bitte erneut anmelden.'});
 if(a.index<0||!a.accepting)return send(res,409,{error:'Die Quizzeit ist vorbei.'});
 const q=Q[a.index],choice=Number(b.choice);
 if(!Number.isInteger(choice)||choice<0||choice>3)return send(res,400,{error:'Antwort ungueltig'});
 if(Object.hasOwn(x.answers,q.id))return send(res,409,{error:'Schon beantwortet.'});
 x.answers[q.id]=choice;if(choice===q.correct)x.score+=100;saveUsers();
 return send(res,200,{ok:true});
 }
 if(m==='POST'&&p==='/api/joker'){
 const b=await read(req,1000),x=users.get(String(b.id||'')),a=active(),type=b.type==='hint'?'hint':b.type==='fifty'?'fifty':null;
 if(!x)return send(res,400,{error:'Bitte erneut anmelden.'});
 if(!type)return send(res,400,{error:'Unbekannter Joker'});
 if(a.index<0||!a.accepting)return send(res,409,{error:'Gerade läuft keine Frage.'});
 const q=Q[a.index];if(!(q.hint||Number.isInteger(q.fifty)))return send(res,409,{error:'Joker gibt es nur im Abschlussquiz.'});
 if(Object.hasOwn(x.answers,q.id))return send(res,409,{error:'Schon beantwortet.'});
 x.jokers=x.jokers||{};if(x.jokers[type])return send(res,409,{error:'Dieser Joker ist schon aufgebraucht.'});
 x.jokers[type]=q.id;saveUsers();return send(res,200,{ok:true});
 }
 if(m==='POST'&&p==='/api/feedback'){
 const b=await read(req,3000);
 feedback.push({text:String(b.text||'').trim().slice(0,1000),rating:Math.min(10,Math.max(0,Number(b.rating)||0))});return send(res,200,{ok:true});
 }
 if(m==='POST'&&p==='/api/host/tick'){
 if(!isCohost(req))return unauthorized(res);
 const b=await read(req,1000);
 if(s.phase!=='film')return send(res,200,{ok:false,phase:s.phase});
 const t=Number(b.time);
 if(!Number.isFinite(t)||t<0||t>20000)return send(res,400,{error:'Ungueltige Filmzeit'});
 s.clockSource='host';s.lastHostTick=Date.now();s.time=Math.round(t*100)/100;
 const z=ZOOM();if(z&&!s.zoomDone&&s.time>=z.open&&s.time<z.open+20){startZoom();return send(res,200,{ok:true,zoom:true});}
 s.playing=!!b.playing;
 if(b.ended===true){s.phase='results';s.resultsAt=Date.now();s.playing=false;s.revision++;await persist();}
 return send(res,200,{ok:true,time:s.time,playing:s.playing});
 }
 if(m==='POST'&&p==='/api/tick'){
 if(!isTv(req))return unauthorized(res);
 const b=await read(req,1000);if(s.phase!=='film')return send(res,200,{ok:false});
 if(s.clockSource==='host'&&Date.now()-(s.lastHostTick||0)<20000)return send(res,200,{ok:true,ignored:'host_is_primary'});
 s.clockSource='tv';const t=Number(b.time);
 if(Number.isFinite(t)&&t>=0&&t<=20000)s.time=Math.round(t*100)/100;
 const z=ZOOM();if(z&&!s.zoomDone&&s.time>=z.open&&s.time<z.open+20){startZoom();return send(res,200,{ok:true,zoom:true});}
 s.playing=!!b.playing;if(b.ended===true){s.phase='results';s.resultsAt=Date.now();s.playing=false;s.revision++;await persist();}return send(res,200,{ok:true});
 }
 if(m==='POST'&&(p==='/api/admin'||p==='/api/remote')){
 if(p==='/api/admin'?!isAdmin(req):!isCohost(req))return unauthorized(res);
 const b=await read(req),cmd=b.cmd;
 if(p==='/api/remote'&&new Set(['welcome','start','pause','play','seek','gestureEnd','zoomEnd']).has(cmd)){s.clockSource='host';s.lastHostTick=Date.now();}
 if(p==='/api/remote'&&!new Set(['welcome','start','pause','play','seek','demo','demoNext','results','handout','end','gestureStart','gestureEnd','zoomStart','zoomEnd']).has(cmd))return unauthorized(res);
 if(cmd==='welcome'){s.phase='welcome';s.time=0;s.playing=false;}
 else if(cmd==='start'){s.phase='film';s.time=0;s.playing=true;s.zoomDone=false;}
 else if(cmd==='pause')s.playing=false;
 else if(cmd==='play'){if(s.phase!=='film')s.phase='film';s.playing=true;}
 else if(cmd==='seek'){const t=Number(b.time);if(!Number.isFinite(t)||t<0||t>20000)return send(res,400,{error:'Zeit ungueltig'});s.time=t;s.phase='film';const z=ZOOM();if(z&&t<z.open)s.zoomDone=false;}
 else if(cmd==='demo'){s.phase='demo';s.demoIndex=Math.max(0,Math.min(Q.length-1,Number(b.index)||0));s.demoStart=Date.now();s.playing=false;}
 else if(cmd==='demoNext'){s.phase='demo';s.demoIndex=(s.demoIndex+1)%Q.length;s.demoStart=Date.now();}
 else if(cmd==='results'){s.phase='results';s.resultsAt=Date.now();s.playing=false;}
 else if(cmd==='handout'){s.phase='handout';s.playing=false;}
 else if(cmd==='gestureStart'){s.phase='gesture';s.playing=false;}
 else if(cmd==='gestureEnd'){s.phase='film';s.playing=true;}
 else if(cmd==='zoomStart'){if(!startZoom())return send(res,400,{error:'Keine Zoom-Aufgabe vorhanden'});}
 else if(cmd==='zoomEnd'){endZoom();}
 else if(cmd==='end'){s.phase='end';s.playing=false;}
 else if(cmd==='reset'){s=def();users=new Map();feedback=[];saveUsers();}
 else if(cmd==='videoYoutube'){const id=youtubeId(b.url);if(!id)return send(res,400,{error:'Kein gueltiger YouTube-Link'});s.video={type:'youtube',id,url:'https://www.youtube.com/watch?v='+id};}
 else if(cmd==='videoLink'){try{const link=new URL(b.url);if(link.protocol!=='https:')throw Error();s.video={type:'url',url:link.toString(),id:null};}catch{return send(res,400,{error:'Bitte HTTPS-MP4-Link eingeben.'});}}
 else if(cmd==='videoUpload'){if(!fs.existsSync(VIDEO_FILE))return send(res,404,{error:'Noch kein Video hochgeladen'});s.video={type:'upload',url:'/media/video',id:null};}
 else if(cmd==='captionOffset'){const v=Number(b.value);if(!Number.isFinite(v)||Math.abs(v)>3600)return send(res,400,{error:'Offset ungueltig'});s.subtitleOffset=v;}
 else if(cmd==='quizOffset'){const v=Number(b.value);if(!Number.isFinite(v)||Math.abs(v)>3600)return send(res,400,{error:'Offset ungueltig'});s.quizOffset=v;}
 else if(cmd==='subtitles')s.subtitles=!!b.value;
 else return send(res,400,{error:'Unbekannter Befehl'});
 s.revision++;await persist();return send(res,200,{ok:true,state:publicState()});
 }
 if(m==='POST'&&p==='/api/questions'){
 if(!isAdmin(req))return unauthorized(res);
 const b=await read(req,100000),items=b.questions;
 if(!Array.isArray(items)||items.length<1||items.length>50)return send(res,400,{error:'Es werden 1 bis 50 Fragen unterstuetzt.'});
 const next=[];for(const [i,q] of items.entries()){
 const open=Number(q.open),close=Number(q.close),correct=Number(q.correct);
 if(!Number.isFinite(open)||!Number.isFinite(close)||open<0||close<=open||close>20000||!Number.isInteger(correct)||correct<0||correct>3||!Array.isArray(q.a)||q.a.length!==4||!String(q.q||'').trim()||String(q.q).length>500||q.a.some(a=>!String(a).trim()||String(a).length>250))return send(res,400,{error:'Frage '+(i+1)+' hat ungueltige Werte.'});
 const item={id:/^[A-Za-z0-9_-]{1,32}$/.test(q.id||'')?q.id:'Q'+(i+1),open,close,q:String(q.q).trim(),a:q.a.map(x=>String(x).trim()),correct,chapter:Math.min(7,Math.max(1,Number(q.chapter)||1))};
 if(q.type==='zoom'){item.type='zoom';item.duration=Math.min(300,Math.max(20,Number(q.duration)||75));}
 if(q.hint)item.hint=String(q.hint).slice(0,200);if(Number.isInteger(Number(q.fifty))&&q.fifty!==null&&q.fifty!==''&&Number(q.fifty)!==correct&&Number(q.fifty)>=0&&Number(q.fifty)<=3)item.fifty=Number(q.fifty);
 next.push(item);}
 if(new Set(next.map(x=>x.id)).size!==next.length)return send(res,400,{error:'Fragen-IDs muessen eindeutig sein.'});
 Q.splice(0,Q.length,...next);await fsp.writeFile(QUESTIONS_FILE,JSON.stringify(Q,null,2),'utf8');s.revision++;await persist();return send(res,200,{ok:true,count:Q.length});
 }
 if(m==='POST'&&p==='/api/vtt'){
 if(!isAdmin(req))return unauthorized(res);
 const b=await read(req,2000000),v=String(b.vtt||'');
 if(!v.startsWith('WEBVTT'))return send(res,400,{error:'Datei muss WEBVTT sein'});
 await fsp.writeFile(SUB_FILE,v,'utf8');s.revision++;return send(res,200,{ok:true});
 }
 if(m==='POST'&&p==='/api/upload/start'){
 if(!isAdmin(req))return unauthorized(res);
 const b=await read(req),size=Number(b.size);
 if(!Number.isSafeInteger(size)||size<=0||size>6*1024**3)return send(res,400,{error:'Datei muss 1 Byte bis 6 GiB gross sein'});
 let existing=0;try{existing=(await fsp.stat(VIDEO_FILE+'.part')).size;}catch{}
 if(!upload||upload.size!==size){upload={size,name:String(b.name||'video.mp4').slice(0,100)};existing=0;await fsp.writeFile(VIDEO_FILE+'.part','');}
 return send(res,200,{ok:true,offset:existing});
 }
 if(m==='PUT'&&p==='/api/upload/chunk'){
 if(!isAdmin(req))return unauthorized(res);
 if(!upload)return send(res,409,{error:'Upload nicht gestartet'});
 const offset=Number(u.searchParams.get('offset')),length=Number(req.headers['content-length']);
 const stat=await fsp.stat(VIDEO_FILE+'.part');
 if(offset!==stat.size||length<=0||length>9*1024*1024||offset+length>upload.size)return send(res,409,{error:'Uploadblock ungueltig'});
 const fd=await fsp.open(VIDEO_FILE+'.part','a');
 let written=0;try{for await(const chunk of req){written+=chunk.length;if(written>length)throw Error('Zu viel Inhalt');await fd.write(chunk);}if(written!==length)throw Error('Block unvollstaendig');}catch(e){await fd.close();await fsp.truncate(VIDEO_FILE+'.part',offset);return send(res,400,{error:e.message});}
 await fd.close();return send(res,200,{ok:true,offset:offset+written});
 }
 if(m==='POST'&&p==='/api/upload/complete'){
 if(!isAdmin(req))return unauthorized(res);
 if(!upload)return send(res,409,{error:'Kein Upload'});
 const st=await fsp.stat(VIDEO_FILE+'.part');if(st.size!==upload.size)return send(res,409,{error:'Upload ist noch unvollstaendig'});
 await fsp.rename(VIDEO_FILE+'.part',VIDEO_FILE);upload=null;s.video={type:'upload',url:'/media/video',id:null};s.revision++;await persist();return send(res,200,{ok:true});
 }
 send(res,404,{error:'Nicht gefunden'});
}
http.createServer((req,res)=>{handler(req,res).catch(e=>{console.error(e);if(!res.headersSent)send(res,500,{error:'Serverfehler'});else res.destroy();});}).listen(PORT,'0.0.0.0',()=>console.log('TOUCH LIVE SYNC auf Port '+PORT));
