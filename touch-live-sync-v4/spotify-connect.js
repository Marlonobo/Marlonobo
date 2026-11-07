/* TOUCH LIVE: Spotify OAuth PKCE account connection and a compact Spotify playlist selector.
   No user passwords are ever collected, no Spotify secret on client or server.
   This uses public Spotify Web API with user authorization and requires a registered Spotify developer Client ID. */
(function(w){
'use strict';
const KEY='touch_spotify_pkce_tokens_v1',CLIENT='touch_spotify_public_client_id_v1',FLOW='touch_spotify_pkce_flow_v1';
const CALLBACK='/spotify-callback';
let root=null,selectFn=null,playlists=[],devices=[],lastSelected='',busy=false,searchResults=[];
const $=id=>document.getElementById(id);
const escape=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const callbackUrl=()=>location.origin+CALLBACK;
const read=(key,where=sessionStorage)=>{try{return JSON.parse(where.getItem(key)||'null')}catch{return null}};
const write=(key,val,where=sessionStorage)=>{try{where.setItem(key,JSON.stringify(val))}catch{}};
const token=()=>read(KEY);
const registeredClient=()=>{try{return localStorage.getItem(CLIENT)||''}catch{return ''}};
const validClient=s=>/^[A-Za-z0-9]{32}$/.test(s||'');
const userAuthorized=()=>!!token()?.access_token;
function status(message,bad=false){const el=$('spotifyAccountStatus');if(el){el.textContent=message;el.classList.toggle('error',bad);}}
function rand(n=56){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~',bytes=new Uint8Array(n);crypto.getRandomValues(bytes);return [...bytes].map(x=>alphabet[x%alphabet.length]).join('');}
function b64url(array){return btoa(String.fromCharCode(...new Uint8Array(array))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function hash(text){return b64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));}
function authPost(body){return fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)}).then(async r=>{let result;try{result=await r.json()}catch{throw Error('Spotify hat keine gültige Antwort geliefert.')};if(!r.ok)throw Error(result.error_description||result.error||'Spotify-Autorisierung fehlgeschlagen.');return result;});}
async function login(){
 if(!w.crypto?.subtle)throw Error('Spotify-Anmeldung benötigt eine sichere HTTPS-Seite.');
 const id=$('spotifyClientId')?.value.trim()||registeredClient();
 if(!validClient(id))throw Error('Bitte zuerst die 32-stellige Spotify Client ID aus dem Spotify Developer Dashboard eintragen.');
 localStorage.setItem(CLIENT,id);
 const verifier=rand(64),state=rand(32),challenge=await hash(verifier);
 const returnPath=location.pathname==='/control'?'/control':'/#admin';
 write(FLOW,{verifier,state,clientId:id,returnPath,createdAt:Date.now()});
 const q=new URLSearchParams({client_id:id,response_type:'code',redirect_uri:callbackUrl(),code_challenge_method:'S256',code_challenge:challenge,state,scope:'playlist-read-private user-read-playback-state user-modify-playback-state'});
 location.assign('https://accounts.spotify.com/authorize?'+q.toString());
}
async function callback(){
 if(location.pathname!==CALLBACK)return false;
 const params=new URLSearchParams(location.search),record=read(FLOW);
 if(!record||!record.verifier||Date.now()-(record.createdAt||0)>600000){document.body.textContent='Spotify-Anmeldung abgelaufen. Bitte gehe zurück zum TOUCH-LIVE-Adminbereich und versuche es erneut.';return true;}
 const returnPath=record.returnPath==='/control'?'/control':'/#admin';
 if(params.get('error')){sessionStorage.setItem('touch_spotify_auth_message','Spotify-Anmeldung abgebrochen: '+params.get('error'));sessionStorage.removeItem(FLOW);location.replace(returnPath);return true;}
 if(!params.get('code')||params.get('state')!==record.state){sessionStorage.setItem('touch_spotify_auth_message','Spotify-Sicherheitsprüfung fehlgeschlagen.');sessionStorage.removeItem(FLOW);location.replace(returnPath);return true;}
 try{
  const res=await authPost({grant_type:'authorization_code',code:params.get('code'),redirect_uri:callbackUrl(),client_id:record.clientId,code_verifier:record.verifier});
  write(KEY,{access_token:res.access_token,refresh_token:res.refresh_token,expiresAt:Date.now()+Number(res.expires_in||3600)*1000,clientId:record.clientId});
  sessionStorage.setItem('touch_spotify_auth_message','✓ Spotify-Konto erfolgreich verbunden. Du kannst deine Playlists jetzt ansehen.');
 }catch(e){sessionStorage.setItem('touch_spotify_auth_message','Spotify konnte nicht verbunden werden: '+e.message);}
 sessionStorage.removeItem(FLOW);location.replace(returnPath);return true;
}
async function accessToken(){
 let stored=token();if(!stored)return null;
 if(Date.now()<stored.expiresAt-90000)return stored.access_token;
 if(!stored.refresh_token||!stored.clientId){sessionStorage.removeItem(KEY);return null;}
 const r=await authPost({grant_type:'refresh_token',refresh_token:stored.refresh_token,client_id:stored.clientId});
 stored={...stored,access_token:r.access_token,refresh_token:r.refresh_token||stored.refresh_token,expiresAt:Date.now()+Number(r.expires_in||3600)*1000};
 write(KEY,stored);return stored.access_token;
}
async function spotify(url,method='GET',body){
 const key=await accessToken();
 if(!key)throw Error('Bitte erst mit deinem Spotify-Konto verbinden.');
 const res=await fetch('https://api.spotify.com/v1'+url,{method,headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 if(res.status===204)return {};
 let data={};try{data=await res.json()}catch{}
 if(!res.ok){
  const details=data?.error?.message||data?.error_description||'HTTP '+res.status;
  if(res.status===403)throw Error('Spotify hat den Zugriff verweigert: '+details+' (für Spotify Connect wird Premium benötigt).');
  if(res.status===404)throw Error('Kein Spotify-Wiedergabegerät gefunden. Starte Spotify zuerst auf dem gewünschten Gerät.');
  if(res.status===429)throw Error('Spotify-Anfragelimit erreicht. Bitte später erneut versuchen.');
  if(res.status===401){sessionStorage.removeItem(KEY);throw Error('Spotify-Sitzung abgelaufen. Bitte neu anmelden.');}
  throw Error(details);
 }
 return data;
}
async function loadPlaylists(){
 busy=true;status('Deine Spotify-Playlists werden geladen …');
 try{
  const out=await spotify('/me/playlists?limit=30');
  playlists=(out.items||[]).filter(p=>p?.id&&/^[A-Za-z0-9]{22}$/.test(p.id));
  renderPlaylists();status(playlists.length?playlists.length+' Playlists geladen. Wähle deine Willkommensmusik aus.':'Noch keine Playlists gefunden. Du kannst weiterhin einen öffentlichen Spotify-Link verwenden.');
 }catch(err){status('Playlists konnten nicht geladen werden: '+err.message,true);}
 finally{busy=false;}
}
function renderPlaylists(){
 const list=$('spotifyMyPlaylists');if(!list)return;
 if(!playlists.length){list.innerHTML='<p class="small">Noch keine Spotify-Playlists geladen.</p>';return;}
 list.innerHTML=playlists.map(p=>{
  const img=p.images?.[0]?.url||'';
  return '<div class="spotifyPlaylistItem">'+(img.startsWith('https://')?'<img src="'+escape(img)+'" loading="lazy" alt="">':'<span class="spotifyPlaylistFaux">♫</span>')+
   '<div class="spotifyPlaylistMeta"><b>'+escape(p.name)+'</b><small>'+escape((p.items?.total??p.tracks?.total??'')+' Titel')+'</small></div>'+
   '<div class="spotifyPlaylistButtons"><button type="button" data-sp-save="'+escape(p.id)+'">Für Willkommen</button><button type="button" data-sp-play="'+escape(p.id)+'" title="Auf einem Spotify-Connect-Gerät starten">▶ Spotify</button></div></div>';
 }).join('');
 list.querySelectorAll('[data-sp-save]').forEach(btn=>btn.onclick=async()=>{
  const item=playlists.find(x=>x.id===btn.dataset.spSave);if(!item||!selectFn)return;
  try{await selectFn('https://open.spotify.com/playlist/'+item.id);status('✓ „'+item.name+'“ als Willkommensplaylist gespeichert.')}catch(e){status('Playlist konnte nicht übernommen werden: '+e.message,true);}
 });
 list.querySelectorAll('[data-sp-play]').forEach(btn=>btn.onclick=async()=>{
  const id=btn.dataset.spPlay;
  try{await startPlaylist('spotify:playlist:'+id);status('✓ Spotify-Wiedergabe auf deinem gewählten Gerät gestartet.');}
  catch(e){status('Wiedergabe nicht gestartet: '+e.message,true);}
 });
}
async function searchMusic(){
 const input=$('spotifySearchInput'),q=(input?.value||'').trim();
 if(q.length<2){status('Bitte mindestens zwei Zeichen für die Suche eingeben.',true);return;}
 status('Spotify durchsuchen …');
 try{
  const data=await spotify('/search?'+new URLSearchParams({q,type:'playlist,track',limit:'12'}));
  searchResults=[
   ...(data.playlists?.items||[]).filter(x=>x?.id).map(x=>({...x,_kind:'playlist'})),
   ...(data.tracks?.items||[]).filter(x=>x?.id).map(x=>({...x,_kind:'track'}))
  ];
  const box=$('spotifySearchResults');if(!box)return;
  box.innerHTML=searchResults.length?searchResults.map((x,i)=>{
   const img=(x.images?.[0]?.url||x.album?.images?.[0]?.url||'');
   const subtitle=x._kind==='track'?'Titel · '+(x.artists||[]).map(a=>a.name).join(', '):'Playlist';
   return '<div class="spotifyPlaylistItem">'+(img.startsWith('https://')?'<img src="'+escape(img)+'" alt="" loading="lazy">':'<span class="spotifyPlaylistFaux">♫</span>')+
    '<div class="spotifyPlaylistMeta"><b>'+escape(x.name)+'</b><small>'+escape(subtitle)+'</small></div>'+
    '<div class="spotifyPlaylistButtons"><button type="button" data-search-save="'+i+'">Auswählen</button><button type="button" data-search-play="'+i+'">▶ Abspielen</button></div></div>';
  }).join(''):'<p class="small">Keine passenden Titel oder Playlists gefunden.</p>';
  box.querySelectorAll('[data-search-save]').forEach(b=>b.onclick=async()=>{
   const x=searchResults[Number(b.dataset.searchSave)];if(!x||!selectFn)return;
   try{await selectFn('https://open.spotify.com/'+x._kind+'/'+x.id);status('✓ '+x.name+' für die Willkommensmusik ausgewählt.');}
   catch(e){status(e.message,true);}
  });
  box.querySelectorAll('[data-search-play]').forEach(b=>b.onclick=async()=>{
   const x=searchResults[Number(b.dataset.searchPlay)];if(!x)return;
   try{await startPlaylist('spotify:'+x._kind+':'+x.id);status('♫ '+x.name+' läuft auf deinem ausgewählten Spotify-Gerät.');}
   catch(e){status(e.message,true);}
  });
  status(searchResults.length+' Suchergebnisse gefunden.');
 }catch(e){status('Spotify-Suche nicht verfügbar: '+e.message,true);}
}
async function devicesFetch(){
 status('Spotify-Geräte werden geladen …');
 try{
  const out=await spotify('/me/player/devices');devices=(out.devices||[]).filter(x=>x.id);
  const sel=$('spotifyDevice');
  if(sel){sel.innerHTML='<option value="">Aktives Spotify-Gerät</option>'+devices.map(d=>'<option value="'+escape(d.id)+'">'+escape(d.name)+' ('+escape(d.type)+')'+(d.is_active?' – aktiv':'')+'</option>').join('');
   const active=devices.find(d=>d.is_active);if(active)sel.value=active.id;}
  status(devices.length?devices.length+' Spotify-Geräte gefunden.':'Kein Spotify-Gerät aktiv. Öffne zunächst die Spotify-App auf dem gewünschten Gerät.');
 }catch(e){status('Geräte konnten nicht geladen werden: '+e.message,true);}
}
function deviceQuery(){const id=$('spotifyDevice')?.value||'';return id?'?device_id='+encodeURIComponent(id):'';}
async function startPlaylist(uri){
 if(!/^spotify:(playlist|album|track):[A-Za-z0-9]{22}$/.test(uri))throw Error('Ungültiger Spotify-Inhalt.');
 const body=uri.startsWith('spotify:track:')?{uris:[uri]}:{context_uri:uri};
 return spotify('/me/player/play'+deviceQuery(),'PUT',body);
}
async function pause(){return spotify('/me/player/pause'+deviceQuery(),'PUT');}
async function resume(){return spotify('/me/player/play'+deviceQuery(),'PUT');}
async function transfer(){
 const id=$('spotifyDevice')?.value;
 if(!id)throw Error('Bitte zuerst unter „Geräte suchen“ den LG-TV oder PC auswählen.');
 return spotify('/me/player','PUT',{device_ids:[id],play:true});
}
async function setRepeat(){
 const value=$('spotifyRepeat')?.value||'context';
 return spotify('/me/player/repeat?state='+encodeURIComponent(value)+(deviceQuery()?'&'+deviceQuery().slice(1):''),'PUT');
}
async function currentPlayback(){
 try{
  const out=await spotify('/me/player');
  const label=$('spotifyNowPlaying');
  if(label)label.textContent=out?.item?(out.is_playing?'♫ Läuft: ':'Ⅱ Pausiert: ')+out.item.name+' – '+(out.item.artists||[]).map(x=>x.name).join(', ')+(out.device?.name?' · '+out.device.name:''):'Derzeit keine aktive Spotify-Wiedergabe. Öffne Spotify auf dem LG-TV oder PC.';
 }catch(e){status('Wiedergabestatus nicht verfügbar: '+e.message,true);}
}
async function pauseForFilm(){if(!userAuthorized())return false;try{await pause();return true;}catch{return false;}}
async function skip(which){return spotify('/me/player/'+which+deviceQuery(),'POST');}
function accountButtons(){
 const connect=$('spotifyAccountLogin');if(connect)connect.onclick=async()=>{try{await login()}catch(e){status(e.message,true)}};
 const id=$('spotifyClientId');
 if(id){id.value=registeredClient();id.addEventListener('change',()=>{
  const v=id.value.trim();if(validClient(v))localStorage.setItem(CLIENT,v);
 });}
 const disconnect=$('spotifyAccountLogout');if(disconnect)disconnect.onclick=()=>{
  sessionStorage.removeItem(KEY);playlists=[];devices=[];renderAccount();status('Dein Spotify-Konto wurde von diesem Browser getrennt.');
 };
 const list=$('spotifyPlaylistsLoad');if(list)list.onclick=loadPlaylists;
 const searchButton=$('spotifySearchButton');if(searchButton)searchButton.onclick=searchMusic;
 const searchInput=$('spotifySearchInput');if(searchInput)searchInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchMusic();}};
 const transferButton=$('spotifyTransfer');if(transferButton)transferButton.onclick=async()=>{try{await transfer();status('✓ Spotify auf das gewählte Gerät übertragen.');await currentPlayback();}catch(e){status(e.message,true);}};
 const repeatButton=$('spotifyRepeatApply');if(repeatButton)repeatButton.onclick=async()=>{try{await setRepeat();status('✓ Wiederholung eingestellt. Die Playlist läuft weiter, bis du sie pausierst.');}catch(e){status(e.message,true);}};
 const resumeButton=$('spotifyAccountResume');if(resumeButton)resumeButton.onclick=async()=>{try{await resume();status('▶ Spotify-Wiedergabe fortgesetzt.');await currentPlayback();}catch(e){status(e.message,true);}};
 const refreshButton=$('spotifyNowRefresh');if(refreshButton)refreshButton.onclick=currentPlayback;
 const devicesButton=$('spotifyDevicesLoad');if(devicesButton)devicesButton.onclick=devicesFetch;
 const play=$('spotifyAccountPlay');if(play)play.onclick=async()=>{
  const music=String($('spotifyInput')?.value||'').trim(),m=music.match(/open\.spotify\.com\/(playlist|album|track)\/([A-Za-z0-9]{22})/);
  if(!m){status('Wähle eine Playlist aus oder füge zuerst einen Spotify-Link ein.',true);return;}
  try{await startPlaylist('spotify:'+m[1]+':'+m[2]);status('♫ Spielt auf Spotify. Die TV-Playlist-Einblendung bleibt optional.')}catch(e){status(e.message,true);}
 };
 const pauseButton=$('spotifyAccountPause');if(pauseButton)pauseButton.onclick=async()=>{try{await pause();status('♫ Spotify pausiert.')}catch(e){status(e.message,true)}};
 const next=$('spotifyAccountNext');if(next)next.onclick=async()=>{try{await skip('next');status('♫ Nächster Titel.')}catch(e){status(e.message,true)}};
 const prev=$('spotifyAccountPrev');if(prev)prev.onclick=async()=>{try{await skip('previous');status('♫ Vorheriger Titel.')}catch(e){status(e.message,true)}};
}
function renderAccount(){
 if(!root||!root.isConnected)return;
 const active=userAuthorized();
 root.innerHTML='<div class="spotifyAccountHeader"><div><strong>Deine Spotify-Playlists</strong><p class="small">Dein Spotify-Konto wird nur über Spotify selbst angemeldet. Kein Spotify-Passwort in TOUCH LIVE.</p></div><span class="spotifyAccountChip">'+(active?'✓ Verbunden':'Nicht verbunden')+'</span></div>'+
 (active?
  '<div class="spotifyAccountTools"><button type="button" id="spotifyPlaylistsLoad" class="primary">♫ Meine Playlists laden</button><button type="button" id="spotifyDevicesLoad">Geräte suchen</button><button type="button" id="spotifyAccountLogout">Trennen</button></div>'+
  '<div class="spotifyConnectControl"><label for="spotifyDevice">Spotify Connect – Ausgabegerät (z. B. LG-TV oder PC)</label><select id="spotifyDevice"><option value="">Aktives Spotify-Gerät</option></select><button type="button" id="spotifyTransfer">↗ Wiedergabe auf dieses Gerät übertragen</button><div class="spotifyConnectButtons"><button id="spotifyAccountPrev" title="Vorheriger Titel">⏮</button><button id="spotifyAccountPlay" class="primary">▶ Playlist starten</button><button id="spotifyAccountResume">▶ Weiter</button><button id="spotifyAccountPause">Ⅱ Pause</button><button id="spotifyAccountNext" title="Nächster Titel">⏭</button></div><div class="spotifyRepeatControls"><label for="spotifyRepeat">Playlist dauerhaft wiederholen</label><select id="spotifyRepeat"><option value="context">Playlist wiederholen</option><option value="off">Wiederholung aus</option><option value="track">Aktuellen Titel wiederholen</option></select><button type="button" id="spotifyRepeatApply">Wiederholung speichern</button></div><div class="spotifyNowPlaying"><span id="spotifyNowPlaying">Wiedergabestatus noch nicht geladen.</span><button id="spotifyNowRefresh" type="button">↻ Aktualisieren</button></div></div>'+
  '<div class="spotifySearchPanel"><label for="spotifySearchInput">Spotify durchsuchen – Songs und Playlists</label><div class="spotifySearchRow"><input type="search" id="spotifySearchInput" placeholder="z. B. 80er Hits, House, Instrumental"><button id="spotifySearchButton" type="button">Suchen</button></div><div id="spotifySearchResults" class="spotifyMyPlaylists" aria-live="polite"></div></div>'+
  '<div id="spotifyMyPlaylists" class="spotifyMyPlaylists"><p class="small">Tippe auf „Meine Playlists laden“.</p></div>'
 :
  '<div class="spotifyAccountSetup"><p class="small">Für Anmeldung und Steuerung deiner Spotify-Geräte benötigst du eine eigene <b>Spotify Client ID</b> und Spotify Premium. Für den einfachen eingebetteten Player unten ist das nicht nötig.</p><label for="spotifyClientId">Spotify Client ID (öffentlich, keine Geheimzahl)</label><input id="spotifyClientId" inputmode="text" maxlength="32" placeholder="32-stellige Client ID"><p class="small">Im <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">Spotify Developer Dashboard</a> eine App anlegen. Als Redirect URI exakt <code>'+escape(callbackUrl())+'</code> eintragen.</p><button type="button" id="spotifyAccountLogin" class="primary">Mit Spotify-Konto anmelden</button><p class="small"><a href="https://open.spotify.com/" target="_blank" rel="noopener noreferrer">Spotify öffnen und anmelden</a> – funktioniert auch ohne Developer-App, aber ohne Steuerung direkt in TOUCH LIVE.</p></div>')+
 '<p class="spotifyAccountStatus" id="spotifyAccountStatus" role="status">'+(active?'Spotify-Konto verbunden.':'Verbinde dein Konto oder nutze den kompakten Spotify-Player unten.')+'</p>';
 accountButtons();
 const message=sessionStorage.getItem('touch_spotify_auth_message');
 if(message){sessionStorage.removeItem('touch_spotify_auth_message');status(message,!message.startsWith('✓'));}
 if(active&&playlists.length)renderPlaylists();
}
function mount(container,options={}){
 root=container;selectFn=typeof options.onSelect==='function'?options.onSelect:null;
 if(!root)return;
 renderAccount();
}
w.SpotifyConnect={mount,login,connected:userAuthorized,pauseForFilm,refresh:renderAccount,getSelectedClientId:registeredClient};
if(location.pathname===CALLBACK){
 document.addEventListener('DOMContentLoaded',()=>{document.body.innerHTML='<main style="max-width:540px;margin:12vh auto;padding:24px;font-family:system-ui;background:#0b2233;color:white;border-radius:15px"><h1>Spotify wird verbunden …</h1><p>Du wirst danach zur TOUCH-LIVE-Regie zurückgeleitet.</p></main>';});
 callback().catch(err=>{document.body.textContent='Spotify-Anmeldung fehlgeschlagen: '+err.message;});
}
})(window);
