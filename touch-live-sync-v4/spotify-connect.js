/* TOUCH LIVE: Spotify OAuth PKCE account connection and a compact Spotify playlist selector.
   No user passwords are ever collected, no Spotify secret on client or server.
   This uses public Spotify Web API with user authorization and requires a registered Spotify developer Client ID. */
(function(w){
'use strict';
const KEY='touch_spotify_pkce_tokens_v1',CLIENT='touch_spotify_public_client_id_v1',FLOW='touch_spotify_pkce_flow_v1',DEVICE='touch_spotify_device_v2',SELECTION='touch_spotify_music_v2';
const CALLBACK='/spotify-callback';
let root=null,selectFn=null,clientIdFn=null,playlists=[],devices=[],lastSelected=localStorage.getItem(SELECTION)||'',busy=false,searchResults=[],serverClientId='',nowTimer=null;
const $=id=>document.getElementById(id);
const escape=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const callbackUrl=()=>location.origin+CALLBACK;
// Tokens and the login flow live in localStorage: on phones the Spotify login often
// returns in a NEW tab (Spotify app / universal link), where sessionStorage is empty.
const read=(key,where=localStorage)=>{try{const v=where.getItem(key);if(v!==null)return JSON.parse(v);const old=sessionStorage.getItem(key);return old?JSON.parse(old):null;}catch{return null}};
const write=(key,val,where=localStorage)=>{try{where.setItem(key,JSON.stringify(val))}catch{}};
const forget=key=>{try{localStorage.removeItem(key);sessionStorage.removeItem(key);}catch{}};
const token=()=>read(KEY);
const SCOPES='playlist-read-private user-read-playback-state user-modify-playback-state user-read-currently-playing streaming user-read-email user-read-private';
const registeredClient=()=>{try{return localStorage.getItem(CLIENT)||serverClientId||''}catch{return serverClientId||''}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
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
 // Share the public Client ID with the server, so phone and HDMI-PC need not type it again.
 if(clientIdFn&&id!==serverClientId){try{await clientIdFn(id);serverClientId=id;}catch{}}
 const verifier=rand(64),state=rand(32),challenge=await hash(verifier);
 const returnPath=location.pathname==='/control'?'/control':location.hash.startsWith('#tv')?'/#tv':'/#admin';
 write(FLOW,{verifier,state,clientId:id,returnPath,createdAt:Date.now()});
 const q=new URLSearchParams({client_id:id,response_type:'code',redirect_uri:callbackUrl(),code_challenge_method:'S256',code_challenge:challenge,state,scope:SCOPES});
 location.assign('https://accounts.spotify.com/authorize?'+q.toString());
}
async function callback(){
 if(location.pathname!==CALLBACK)return false;
 const params=new URLSearchParams(location.search),record=read(FLOW);
 if(!record||!record.verifier||Date.now()-(record.createdAt||0)>600000){document.body.textContent='Spotify-Anmeldung abgelaufen. Bitte gehe zurück zum TOUCH-LIVE-Adminbereich und versuche es erneut.';return true;}
 const returnPath=['/control','/#tv'].includes(record.returnPath)?record.returnPath:'/#admin';
 const note=msg=>{try{localStorage.setItem('touch_spotify_auth_message',msg);}catch{}};
 if(params.get('error')){note('Spotify-Anmeldung abgebrochen: '+params.get('error'));forget(FLOW);location.replace(returnPath);return true;}
 if(!params.get('code')||params.get('state')!==record.state){note('Spotify-Sicherheitsprüfung fehlgeschlagen.');forget(FLOW);location.replace(returnPath);return true;}
 try{
  const res=await authPost({grant_type:'authorization_code',code:params.get('code'),redirect_uri:callbackUrl(),client_id:record.clientId,code_verifier:record.verifier});
  write(KEY,{access_token:res.access_token,refresh_token:res.refresh_token,expiresAt:Date.now()+Number(res.expires_in||3600)*1000,clientId:record.clientId,scope:res.scope||''});
  note('✓ Spotify-Konto erfolgreich verbunden. Jetzt „Geräte suchen“ und LG-TV oder HDMI-PC auswählen.');
 }catch(e){note('Spotify konnte nicht verbunden werden: '+e.message);}
 forget(FLOW);location.replace(returnPath);return true;
}
async function accessToken(){
 let stored=token();if(!stored)return null;
 if(Date.now()<stored.expiresAt-90000)return stored.access_token;
 if(!stored.refresh_token||!stored.clientId){forget(KEY);return null;}
 let r;
 try{r=await authPost({grant_type:'refresh_token',refresh_token:stored.refresh_token,client_id:stored.clientId});}
 catch(e){forget(KEY);throw Error('Spotify-Sitzung abgelaufen. Bitte erneut „Mit Spotify-Konto anmelden“.');}
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
  if(res.status===401){forget(KEY);throw Error('Spotify-Sitzung abgelaufen. Bitte neu anmelden.');}
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
  try{const url='https://open.spotify.com/playlist/'+item.id;rememberSelection(url);await selectFn(url);status('✓ „'+item.name+'“ als Willkommensplaylist gespeichert.')}catch(e){status('Playlist konnte nicht übernommen werden: '+e.message,true);}
 });
 list.querySelectorAll('[data-sp-play]').forEach(btn=>btn.onclick=async()=>{
  const id=btn.dataset.spPlay;
  try{
   const result=await startPlaylist('spotify:playlist:'+id);
   status(result.configured?'✓ Spotify gestartet – derselbe Titel wird wiederholt, bis du stoppst.':'Spotify läuft, aber die Wiederholung konnte nicht eingestellt werden: '+result.reason,!result.configured);
  }
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
   try{const url='https://open.spotify.com/'+x._kind+'/'+x.id;rememberSelection(url);await selectFn(url);status('✓ '+x.name+' für die Willkommensmusik ausgewählt.');}
   catch(e){status(e.message,true);}
  });
  box.querySelectorAll('[data-search-play]').forEach(b=>b.onclick=async()=>{
   const x=searchResults[Number(b.dataset.searchPlay)];if(!x)return;
   try{
    const result=await startPlaylist('spotify:'+x._kind+':'+x.id);
    status(result.configured?'♫ '+x.name+' – Wiederholung: '+(result.repeat==='track'?'derselbe Titel':'ganze Playlist')+'.':'♫ '+x.name+' gestartet, aber Wiederholung nicht bestätigt: '+result.reason,!result.configured);
   }
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
   const preferred=localStorage.getItem(DEVICE)||'';const found=devices.find(d=>d.id===preferred)||devices.find(d=>d.is_active);if(found){sel.value=found.id;localStorage.setItem(DEVICE,found.id);}sel.onchange=()=>{localStorage.setItem(DEVICE,sel.value);status(sel.value?'✓ Spotify-Ausgabegerät: '+(devices.find(d=>d.id===sel.value)?.name||'Gerät'):'Bitte Ausgabegerät auswählen.');};}
  if(sel&&!sel.value&&devices.length){
   // Prefer the TV / beamer: LG app ("TV"), our own TOUCH LIVE PC player, then a computer.
   const pick=devices.find(d=>/tv/i.test(d.type))||devices.find(d=>/TOUCH LIVE/i.test(d.name))||devices.find(d=>/computer/i.test(d.type))||devices[0];
   sel.value=pick.id;localStorage.setItem(DEVICE,pick.id);
  }
  status(devices.length?devices.length+' Spotify-Geräte gefunden'+(chosenDevice()?' · ausgewählt: '+(devices.find(d=>d.id===chosenDevice())?.name||''):'')+'.':'Kein Spotify-Gerät gefunden. Öffne Spotify auf dem LG-TV (gleiches Konto) oder klicke am HDMI-PC im Beamer-Fenster auf „♫ Spotify auf diesem PC“. Dann erneut „Geräte suchen“.',!devices.length);
 }catch(e){status('Geräte konnten nicht geladen werden: '+e.message,true);}
}
function chosenDevice(){return $('spotifyDevice')?.value||'';}
function deviceQuery(){const id=chosenDevice();return id?'?device_id='+encodeURIComponent(id):'';}
function rememberSelection(url){lastSelected=url;try{localStorage.setItem(SELECTION,url);}catch{}const input=$('spotifyInput');if(input)input.value=url;}
function spotifyMusicUri(){const link=String($('spotifyInput')?.value||lastSelected||'').trim();const m=link.match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(playlist|album|track)\/([A-Za-z0-9]{22})(?:[/?#]|$)/);if(!m)throw Error('Zuerst einen Spotify-Song oder eine Playlist auswählen.');rememberSelection(link);return 'spotify:'+m[1]+':'+m[2];}
async function startPlaylist(uri){
 if(!/^spotify:(playlist|album|track):[A-Za-z0-9]{22}$/.test(uri))throw Error('Ungültiger Spotify-Inhalt.');
 const body=uri.startsWith('spotify:track:')?{uris:[uri]}:{context_uri:uri};
 const id=chosenDevice();if(!id)throw Error('Bitte erst „Geräte suchen“ und dann LG-TV oder HDMI-PC auswählen.');
 const deviceInfo=devices.find(d=>d.id===id);if(deviceInfo?.is_restricted)throw Error('Dieses Spotify-Gerät verweigert die Fernsteuerung.');
 if(!deviceInfo?.is_active){try{await spotify('/me/player','PUT',{device_ids:[id],play:false});}catch{}await sleep(700);}
 // LG-TV and PC need a moment after the transfer; Spotify then answers 404 "Device not found".
 for(let attempt=0;;attempt++){
  try{await spotify('/me/player/play?device_id='+encodeURIComponent(id),'PUT',body);break;}
  catch(e){if(attempt>=3||!/Gerät|device|404|502|503/i.test(e.message))throw e;await sleep(900+attempt*600);}
 }
 // User requested to keep the SAME song; otherwise Spotify advances through playlist tracks.
 // Repeat is a distinct Spotify Web API request and may be blocked for non-Premium accounts.
 const selected=$('spotifyRepeat')?.value||'track';
 try{
  await spotify('/me/player/repeat?state='+encodeURIComponent(selected)+(deviceQuery()?'&'+deviceQuery().slice(1):''),'PUT');
  return {repeat: selected,configured:true};
 }catch(e){
  return {repeat:selected,configured:false,reason:e.message};
 }
}
async function pause(){return spotify('/me/player/pause'+deviceQuery(),'PUT');}
async function setVolume(value){
 const number=Math.round(Number(value));
 if(!Number.isFinite(number)||number<0||number>100)throw Error('Lautstärke zwischen 0 und 100 Prozent wählen.');
 const chosen=$('spotifyDevice')?.value||'';
 const device=devices.find(d=>d.id===chosen);
 if(device&&device.supports_volume===false)throw Error('Dieses Spotify-Gerät unterstützt keine Lautstärkesteuerung über Spotify Connect. Verwende die LG-Fernbedienung.');
 return spotify('/me/player/volume?volume_percent='+number+(chosen?'&device_id='+encodeURIComponent(chosen):''),'PUT');
}
async function resume(){return spotify('/me/player/play'+deviceQuery(),'PUT');}
async function transfer(){
 const id=chosenDevice();
 if(!id)throw Error('Bitte zuerst unter „Geräte suchen“ den LG-TV oder HDMI-PC auswählen.');
 localStorage.setItem(DEVICE,id);
 return spotify('/me/player','PUT',{device_ids:[id],play:true});
}
async function setRepeat(){
 const value=$('spotifyRepeat')?.value||'track';
 try{localStorage.setItem('touch_spotify_repeat_mode',value);}catch{}
 return spotify('/me/player/repeat?state='+encodeURIComponent(value)+(deviceQuery()?'&'+deviceQuery().slice(1):''),'PUT');
}
async function currentPlayback(){
 try{
  const out=await spotify('/me/player');
  const range=$('spotifyVolume'),value=$('spotifyVolumeLabel');
  if(range&&document.activeElement!==range&&Number.isFinite(out?.device?.volume_percent)){
   range.value=String(out.device.volume_percent);if(value)value.textContent=out.device.volume_percent+' %';
  }
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
  forget(KEY);playlists=[];devices=[];renderAccount();status('Dein Spotify-Konto wurde von diesem Browser getrennt.');
 };
 const list=$('spotifyPlaylistsLoad');if(list)list.onclick=loadPlaylists;
 const searchButton=$('spotifySearchButton');if(searchButton)searchButton.onclick=searchMusic;
 const searchInput=$('spotifySearchInput');if(searchInput)searchInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchMusic();}};
 const transferButton=$('spotifyTransfer');if(transferButton)transferButton.onclick=async()=>{try{await transfer();status('✓ Spotify auf das gewählte Gerät übertragen.');await currentPlayback();}catch(e){status(e.message,true);}};
 const repeatSelect=$('spotifyRepeat');
 if(repeatSelect){
  try{const saved=localStorage.getItem('touch_spotify_repeat_mode');repeatSelect.value=['track','context','off'].includes(saved)?saved:'track';}
  catch{repeatSelect.value='track';}
  repeatSelect.onchange=()=>{try{localStorage.setItem('touch_spotify_repeat_mode',repeatSelect.value);}catch{}};
 }
 const repeatButton=$('spotifyRepeatApply');if(repeatButton)repeatButton.onclick=async()=>{try{await setRepeat();status('✓ Wiederholung gespeichert: '+($('spotifyRepeat')?.value==='track'?'derselbe Titel wird wiederholt; kein automatischer Sprung zum nächsten.':$('spotifyRepeat')?.value==='context'?'Playlist wird fortlaufend wiederholt.':'Wiederholung ausgeschaltet.'));}catch(e){status(e.message,true);}};
 const resumeButton=$('spotifyAccountResume');if(resumeButton)resumeButton.onclick=async()=>{try{await resume();status('▶ Spotify-Wiedergabe fortgesetzt.');await currentPlayback();}catch(e){status(e.message,true);}};
 const refreshButton=$('spotifyNowRefresh');if(refreshButton)refreshButton.onclick=currentPlayback;
 const devicesButton=$('spotifyDevicesLoad');if(devicesButton)devicesButton.onclick=devicesFetch;
 const play=$('spotifyAccountPlay');if(play)play.onclick=async()=>{
  try{
   const r=await startPlaylist(spotifyMusicUri());
   status(r.configured
    ?'♫ Spotify läuft. Wiederholung: '+(r.repeat==='track'?'IMMER DERSELBE TITEL – kein Weitergehen zum nächsten Song.':r.repeat==='context'?'ganze Playlist':'AUS')+'.'
    :'Spotify läuft, aber die Wiederholung konnte nicht aktiviert werden: '+r.reason,true);
  }catch(e){status(e.message,true);}
 };
 const pauseButton=$('spotifyAccountPause');if(pauseButton)pauseButton.onclick=async()=>{try{await pause();status('♫ Spotify pausiert.');await currentPlayback();}catch(e){status(e.message,true)}};
 const spotifyVolume=$('spotifyVolume'),volumeReadout=$('spotifyVolumeLabel');
 if(spotifyVolume){
  spotifyVolume.oninput=()=>{if(volumeReadout)volumeReadout.textContent=spotifyVolume.value+' %';};
  spotifyVolume.onchange=async()=>{
   try{await setVolume(spotifyVolume.value);status('♫ Lautstärke auf '+spotifyVolume.value+' % eingestellt.');}
   catch(e){status('Lautstärke nicht geändert: '+e.message,true);}
  };
 }
 const muteSpotify=$('spotifyVolumeMute');
 if(muteSpotify)muteSpotify.onclick=async()=>{
  try{await setVolume(0);spotifyVolume.value='0';if(volumeReadout)volumeReadout.textContent='0 %';status('Spotify-Lautstärke auf 0 %.');}
  catch(e){status(e.message,true);}
 };
 const next=$('spotifyAccountNext');if(next)next.onclick=async()=>{try{await skip('next');status('♫ Nächster Titel.')}catch(e){status(e.message,true)}};
 const prev=$('spotifyAccountPrev');if(prev)prev.onclick=async()=>{try{await skip('previous');status('♫ Vorheriger Titel.')}catch(e){status(e.message,true)}};
}
function renderAccount(){
 if(!root||!root.isConnected)return;
 const active=userAuthorized();
 root.innerHTML='<div class="spotifyAccountHeader"><div><strong>Deine Spotify-Playlists</strong><p class="small">Dein Spotify-Konto wird nur über Spotify selbst angemeldet. Kein Spotify-Passwort in TOUCH LIVE.</p></div><span class="spotifyAccountChip">'+(active?'✓ Verbunden':'Nicht verbunden')+'</span></div>'+
 (active?
  '<div class="spotifyAccountTools"><button type="button" id="spotifyPlaylistsLoad" class="primary">♫ Meine Playlists laden</button><button type="button" id="spotifyDevicesLoad">Geräte suchen</button><button type="button" id="spotifyAccountLogout">Trennen</button></div>'+
  '<div class="spotifyConnectControl"><label for="spotifyDevice">Spotify Connect – Ausgabegerät (z. B. LG-TV oder PC)</label><select id="spotifyDevice"><option value="">Aktives Spotify-Gerät</option></select><button type="button" id="spotifyTransfer">↗ Wiedergabe auf dieses Gerät übertragen</button><div class="spotifyConnectButtons"><button id="spotifyAccountPrev" title="Vorheriger Titel">⏮</button><button id="spotifyAccountPlay" class="primary">▶ Playlist starten</button><button id="spotifyAccountResume">▶ Weiter</button><button id="spotifyAccountPause">Ⅱ Pause</button><button id="spotifyAccountNext" title="Nächster Titel">⏭</button></div><div class="spotifyVolumeControls"><label for="spotifyVolume">Spotify-Lautstärke: <strong id="spotifyVolumeLabel">50 %</strong></label><div><button type="button" id="spotifyVolumeMute" title="Spotify stummschalten">🔇</button><input type="range" id="spotifyVolume" min="0" max="100" step="5" value="50" aria-label="Spotify-Lautstärke"></div><p class="small">Steuert das ausgewählte Spotify-Connect-Gerät, sofern es Lautstärke über Spotify erlaubt.</p></div><div class="spotifyRepeatControls"><label for="spotifyRepeat">Was soll wiederholt werden?</label><select id="spotifyRepeat"><option value="track">🔂 Denselben Titel dauerhaft wiederholen (empfohlen)</option><option value="context">🔁 Ganze Playlist wiederholen</option><option value="off">Wiederholung aus</option></select><button type="button" id="spotifyRepeatApply">Wiederholung aktivieren</button><p class="small">Spotify Connect wiederholt standardmäßig denselben vollständigen Song. Bei einer Spotify-Vorschau im Browser können dagegen nur etwa 30 Sekunden verfügbar sein.</p></div><div class="spotifyNowPlaying"><span id="spotifyNowPlaying">Wiedergabestatus noch nicht geladen.</span><button id="spotifyNowRefresh" type="button">↻ Aktualisieren</button></div></div>'+
  '<div class="spotifySearchPanel"><label for="spotifySearchInput">Spotify durchsuchen – Songs und Playlists</label><div class="spotifySearchRow"><input type="search" id="spotifySearchInput" placeholder="z. B. 80er Hits, House, Instrumental"><button id="spotifySearchButton" type="button">Suchen</button></div><div id="spotifySearchResults" class="spotifyMyPlaylists" aria-live="polite"></div></div>'+
  '<div id="spotifyMyPlaylists" class="spotifyMyPlaylists"><p class="small">Tippe auf „Meine Playlists laden“.</p></div>'
 :
  '<div class="spotifyAccountSetup"><p class="small">Für Anmeldung und Steuerung deiner Spotify-Geräte benötigst du eine eigene <b>Spotify Client ID</b> und Spotify Premium. Für den einfachen eingebetteten Player unten ist das nicht nötig.</p><label for="spotifyClientId">Spotify Client ID (öffentlich, keine Geheimzahl)</label><input id="spotifyClientId" inputmode="text" maxlength="32" placeholder="32-stellige Client ID"><p class="small">Im <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">Spotify Developer Dashboard</a> eine App anlegen. Als Redirect URI exakt <code>'+escape(callbackUrl())+'</code> eintragen.</p><button type="button" id="spotifyAccountLogin" class="primary">Mit Spotify-Konto anmelden</button><p class="small"><a href="https://open.spotify.com/" target="_blank" rel="noopener noreferrer">Spotify öffnen und anmelden</a> – funktioniert auch ohne Developer-App, aber ohne Steuerung direkt in TOUCH LIVE.</p></div>')+
 '<p class="spotifyAccountStatus" id="spotifyAccountStatus" role="status">'+(active?'Spotify-Konto verbunden.':'Verbinde dein Konto oder nutze den kompakten Spotify-Player unten.')+'</p>';
 accountButtons();
 let message=null;try{message=localStorage.getItem('touch_spotify_auth_message')||sessionStorage.getItem('touch_spotify_auth_message');}catch{}
 if(message){forget('touch_spotify_auth_message');status(message,!message.startsWith('✓'));}
 if(active&&playlists.length)renderPlaylists();
}
function mount(container,options={}){
 root=container;selectFn=typeof options.onSelect==='function'?options.onSelect:null;
 clientIdFn=typeof options.onClientId==='function'?options.onClientId:null;
 if(!root)return;
 renderAccount();
 const input=$('spotifyInput');if(input){if(!input.value&&lastSelected)input.value=lastSelected;input.addEventListener('change',()=>rememberSelection(input.value.trim()));}
 if(userAuthorized()){
  // Fill the device list and the "now playing" line immediately – no extra taps on the phone.
  devicesFetch().then(currentPlayback).catch(()=>{});
  clearInterval(nowTimer);
  nowTimer=setInterval(()=>{if(!root||!root.isConnected||document.hidden){if(root&&!root.isConnected)clearInterval(nowTimer);return;}currentPlayback();},6000);
 }
}
function setDefaultClientId(id){
 if(!validClient(id)||id===serverClientId)return;
 serverClientId=id;
 const input=$('spotifyClientId');if(input&&!input.value)input.value=id;
}

/* ---- Spotify im Browser des HDMI-PCs (Web Playback SDK) ----
   Der Beamer-PC wird dadurch selbst zu einem Spotify-Connect-Gerät „TOUCH LIVE Beamer-PC“,
   das die Handy-Fernbedienung unter „Geräte suchen“ findet. Benötigt Spotify Premium.
   Der LG-webOS-Browser unterstützt das SDK nicht – dort die Spotify-App des Fernsehers nutzen. */
let webPlayer=null,webPlayerDevice='',sdkLoading=null;
function loadSdk(){
 if(w.Spotify?.Player)return Promise.resolve();
 if(sdkLoading)return sdkLoading;
 sdkLoading=new Promise((ok,bad)=>{
  const prev=w.onSpotifyWebPlaybackSDKReady;
  w.onSpotifyWebPlaybackSDKReady=()=>{try{prev&&prev();}catch{}ok();};
  const s=document.createElement('script');s.src='https://sdk.scdn.co/spotify-player.js';s.async=true;
  s.onerror=()=>{sdkLoading=null;bad(Error('Spotify-Player konnte nicht geladen werden (Internet/Firewall prüfen).'));};
  document.head.appendChild(s);
 });
 return sdkLoading;
}
function webPlayerSupported(){return !/web0s|webos|netcast|smart-?tv|tizen/i.test(navigator.userAgent)&&!!w.isSecureContext;}
async function enableWebPlayer(name='TOUCH LIVE Beamer-PC',onState){
 if(!webPlayerSupported())throw Error('Dieser Browser (z. B. LG-TV) kann Spotify nicht direkt abspielen. Nutze die Spotify-App des Fernsehers.');
 if(!userAuthorized())throw Error('Bitte zuerst auf diesem PC mit Spotify anmelden.');
 const scope=token()?.scope;
 if(scope!==undefined&&scope!==''&&!/streaming/.test(scope)){forget(KEY);throw Error('Bitte einmal neu mit Spotify anmelden (Berechtigung „Abspielen im Browser“ fehlt).');}
 if(webPlayer&&webPlayerDevice)return webPlayerDevice;
 await loadSdk();
 webPlayer=new w.Spotify.Player({name,volume:.8,getOAuthToken:cb=>{accessToken().then(t=>cb(t||'')).catch(()=>cb(''));}});
 const ready=new Promise((ok,bad)=>{
  const timer=setTimeout(()=>bad(Error('Spotify-Player hat sich nicht gemeldet. Ist das Konto Premium?')),15000);
  webPlayer.addListener('ready',({device_id})=>{clearTimeout(timer);webPlayerDevice=device_id;try{localStorage.setItem(DEVICE,device_id);}catch{}ok(device_id);});
  for(const ev of ['initialization_error','authentication_error','account_error'])
   webPlayer.addListener(ev,({message})=>{clearTimeout(timer);bad(Error(ev==='account_error'?'Spotify Premium wird für die Wiedergabe im Browser benötigt.':message));});
 });
 webPlayer.addListener('not_ready',()=>{webPlayerDevice='';onState&&onState({ready:false});});
 webPlayer.addListener('player_state_changed',st=>{onState&&onState({ready:true,playing:st?!st.paused:false,track:st?.track_window?.current_track?.name||'',artist:(st?.track_window?.current_track?.artists||[]).map(a=>a.name).join(', ')});});
 // Must run inside the click on the PC, otherwise Chrome blocks the sound (autoplay policy).
 try{webPlayer.activateElement&&webPlayer.activateElement();}catch{}
 const connected=await webPlayer.connect();
 if(!connected)throw Error('Spotify-Player konnte nicht verbunden werden.');
 return ready;
}
async function disableWebPlayer(){if(webPlayer){try{await webPlayer.pause();}catch{}try{webPlayer.disconnect();}catch{}}webPlayer=null;webPlayerDevice='';}
w.SpotifyConnect={mount,login,connected:userAuthorized,pauseForFilm,refresh:renderAccount,getSelectedClientId:registeredClient,setDefaultClientId,setVolume,devicesFetch,currentPlayback,enableWebPlayer,disableWebPlayer,webPlayerSupported,webPlayerActive:()=>!!webPlayerDevice,pauseWebPlayer:()=>{if(webPlayer){try{return webPlayer.pause();}catch{}}return Promise.resolve();},preloadWebPlayer:()=>{if(webPlayerSupported())loadSdk().catch(()=>{});}};
if(location.pathname===CALLBACK){
 document.addEventListener('DOMContentLoaded',()=>{document.body.innerHTML='<main style="max-width:540px;margin:12vh auto;padding:24px;font-family:system-ui;background:#0b2233;color:white;border-radius:15px"><h1>Spotify wird verbunden …</h1><p>Du wirst danach zur TOUCH-LIVE-Regie zurückgeleitet.</p></main>';});
 callback().catch(err=>{document.body.textContent='Spotify-Anmeldung fehlgeschlagen: '+err.message;});
}
})(window);
