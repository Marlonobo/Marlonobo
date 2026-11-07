(function(){
'use strict';
// Private host dashboard only; viewers on /watch never receive upload controls.
if(location.pathname!=='/host')return;
const $=id=>document.getElementById(id),MiB=1024*1024;
let storageReady=false,uploading=false;
const key=()=>sessionStorage.getItem('touch_party_host_key')||new URL(location.href).searchParams.get('key')||'';
function message(text){const n=$('partyUploadInfo');if(n)n.textContent=text;}
async function hostAPI(path,data){
 const token=key();if(!token)throw Error('Bitte zunächst mit dem privaten Regie-Code anmelden.');
 const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Cohost-Key':token},
  body:JSON.stringify(data),cache:'no-store'});
 let v={};try{v=await r.json();}catch{}
 if(!r.ok)throw Error(v.error||'HTTP '+r.status);
 return v;
}
async function storageStatus(){
 const note=$('partyStorageStatus'),up=$('partyUploadStart'),saved=$('partyWatchStored'),help=$('partyCloudInstructions');
 try{
  const r=await fetch('/api/storage/status',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const x=await r.json();storageReady=!!x.configured;
  if(up)up.disabled=!storageReady||uploading;
  if(saved)saved.disabled=!storageReady||!x.videoReady||uploading;
  if(help)help.hidden=storageReady;
  if(note){note.classList.toggle('isReady',storageReady);
   note.textContent=storageReady?(x.videoReady?'✓ Cloud-Speicher verbunden · Film gespeichert. Hochladen oder direkt starten.':'✓ Cloud-Speicher verbunden · du kannst jetzt eine MP4 hochladen.'):
   '⚠ Noch kein Cloud-Speicher verbunden. Für 3,03 GB musst du einmalig Cloudflare R2 konfigurieren.';}
 }catch(e){
  storageReady=false;if(up)up.disabled=true;if(saved)saved.disabled=true;if(help)help.hidden=false;
  if(note)note.textContent='Speicherstatus nicht abrufbar: '+e.message;
 }
}
function progress(value,text){
 const el=$('partyUploadProgress');if(el){el.hidden=false;el.value=Math.max(0,Math.min(100,value));}
 message(text);
}
async function upload(){
 if(uploading)return;
 const file=$('partyUploadFile')?.files?.[0],button=$('partyUploadStart');
 if(!file)return message('Bitte zuerst die MP4-Datei auswählen.');
 if(!/\.mp4$/i.test(file.name)||file.size<1||file.size>10*1024**3)
  return message('Bitte eine MP4 zwischen 1 Byte und 10 GB wählen.');
 if(!storageReady)return message('Cloud-Speicher fehlt. Die Einrichtung ist oben beschrieben.');
 const app=window.TouchLiveWatchHost;
 if(!app?.getState)return message('Die private Regie wurde noch nicht vollständig geladen.');
 if(!['welcome','end','handout'].includes(app.getState()?.phase))
  return message('Bitte zuerst Willkommen anzeigen. Während einer Vorführung wird kein Film ersetzt.');
 uploading=true;if(button)button.disabled=true;
 const sessionKey='touch-host-r2-'+file.name+'-'+file.size+'-'+file.lastModified;
 try{
  let previous=null;try{previous=JSON.parse(localStorage.getItem(sessionKey)||'null');}catch{}
  let started;
  if(previous?.uploadId){try{started=await hostAPI('/api/storage/start',{size:file.size,name:file.name,uploadId:previous.uploadId});}catch{}}
  if(!started)started=await hostAPI('/api/storage/start',{size:file.size,name:file.name});
  const partSize=Number(started.partSize)||16*MiB,total=Math.ceil(file.size/partSize),uploadId=started.uploadId;
  localStorage.setItem(sessionKey,JSON.stringify({uploadId,name:file.name,size:file.size}));
  const complete=new Map(),active=new Map();
  for(const p of started.parts||[]){
   const expected=Math.min(partSize,file.size-(p.number-1)*partSize);
   if(p.number>=1&&p.number<=total&&p.etag&&p.size===expected)complete.set(p.number,{number:p.number,etag:p.etag});
  }
  let bytes=[...complete.keys()].reduce((v,i)=>v+Math.min(partSize,file.size-(i-1)*partSize),0);
  const startedAt=Date.now();
  function show(){
   const done=Math.min(file.size,bytes+[...active.values()].reduce((a,b)=>a+b,0));
   const percentage=done/file.size*100,speed=done/Math.max(1,(Date.now()-startedAt)/1000);
   const minutes=speed>0?Math.ceil((file.size-done)/speed/60):0;
   progress(percentage,'Upload '+percentage.toFixed(1)+' % · '+(done/MiB).toFixed(0)+' / '+(file.size/MiB).toFixed(0)+' MiB'+(minutes>0?' · ungefähr '+minutes+' Min.':'')+' · Fenster offen lassen.');
  }
  show();let next=1,error=null;
  async function part(number){
   const from=(number-1)*partSize,end=Math.min(from+partSize,file.size),blob=file.slice(from,end);
   for(let attempt=0;attempt<4;attempt++){
    try{
     active.set(number,0);show();
     const signed=await hostAPI('/api/storage/part',{uploadId,number});
     const etag=await new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      xhr.open('PUT',signed.url,true);xhr.timeout=180000;
      xhr.upload.onprogress=e=>{if(e.lengthComputable){active.set(number,e.loaded);show();}};
      xhr.onload=()=>{const tag=xhr.getResponseHeader('ETag');
       if(xhr.status>=200&&xhr.status<300&&tag)resolve(tag);
       else reject(Error('Upload HTTP '+xhr.status+' · Bucket-CORS muss ETag freigeben.'));};
      xhr.onerror=()=>reject(Error('Netzwerk oder CORS blockiert PUT. R2-Bucket: AllowedOrigins = TOUCH-LIVE-Adresse, ExposeHeaders = ETag.'));
      xhr.ontimeout=()=>reject(Error('Zeitüberschreitung beim Upload dieses Teils.'));
      xhr.send(blob);
     });
     active.delete(number);complete.set(number,{number,etag});bytes+=blob.size;show();return;
    }catch(e){
     active.delete(number);show();
     if(attempt===3)throw e;
     await new Promise(resolve=>setTimeout(resolve,750*(attempt+1)));
    }
   }
  }
  async function worker(){
   while(!error){const number=next++;if(number>total)return;if(complete.has(number))continue;
    try{await part(number);}catch(e){error=e;return;}
   }
  }
  await Promise.all([worker(),worker(),worker()]);
  if(error)throw error;
  const parts=[...complete.values()].sort((a,b)=>a.number-b.number);
  if(parts.length!==total)throw Error('Nicht alle Videoteile hochgeladen.');
  progress(100,'Upload abgeschlossen · Cloud verbindet die Teile …');
  const saved=await hostAPI('/api/storage/complete',{uploadId,size:file.size,name:file.name,parts});
  if(!saved?.videoReady)throw Error('Cloud hat die Videodatei nicht bestätigt.');
  localStorage.removeItem(sessionKey);
  progress(100,'✓ Dein Film ist gespeichert und für die gemeinsame Online-Vorführung bereit. Drücke jetzt „Film auf meinem Gerät & gemeinsam starten“.');
  await storageStatus();await app.poll?.();
 }catch(e){
  message('Upload unterbrochen: '+e.message+' Wähle dieselbe Datei später erneut, um die vorhandenen Teile fortzusetzen.');
 }finally{uploading=false;if(button)button.disabled=!storageReady;}
}
function startHere(){
 const live=window.TouchLiveWatchHost;
 if(!live?.startOnDevice)return message('Regie wird noch verbunden. Seite neu laden oder Regie-Code eingeben.');
 live.startOnDevice();
}
function init(){
 const button=$('partyUploadStart'),saved=$('partyWatchStored'),start=$('partyStartHere');
 if(!button||!start)return;
 button.onclick=upload;
 saved.onclick=async()=>{try{await hostAPI('/api/remote',{cmd:'videoStored'});await window.TouchLiveWatchHost?.poll?.();message('✓ Gespeicherten Film ausgewählt. Du kannst ihn jetzt gemeinsam starten.');}
   catch(e){message('Gespeicherter Film nicht geladen: '+e.message);}};
 start.onclick=startHere;
 storageStatus();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
