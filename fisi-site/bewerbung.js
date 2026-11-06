(()=>{
'use strict';
const PROFILE_KEY='personal-fisi-profile-v1',DONE_KEY='personal-fisi-done-v1',DRAFT_KEY='personal-fisi-drafts-v1',EXTRA_KEY='personal-fisi-extra-v1';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const profile=Object.assign({name:'Marlon Bonsels',street:'',postal:'',city:'Idstein',email:'',phone:'',extra:''},read(PROFILE_KEY,{}));
const done=read(DONE_KEY,{}),drafts=read(DRAFT_KEY,{}),extras=read(EXTRA_KEY,[]);
const why={
sva:['Bei SVA gefällt mir, dass Auszubildende Einblicke in Kundenprojekte bekommen und sich mit Themen wie Netzwerken, Cloud und IT-Sicherheit beschäftigen. Genau in diesem Bereich möchte ich mich beruflich entwickeln.','Im IT-Unterricht habe ich in VirtualBox Windows Server mit Active Directory, DNS und DHCP eingerichtet. Ich möchte lernen, solche Systeme auch in echten Kundenumgebungen zuverlässig zu betreiben.'],
media:['Die Verbindung zwischen IT und zuverlässiger Übertragungstechnik bei Media Broadcast spricht mich besonders an. Hinter Fernsehen, Radio und digitalen Diensten stehen Systeme und Netzwerke, die reibungslos zusammenarbeiten müssen.','Bei meinem Praktikum bei Lufthansa Systems habe ich unter anderem beim Aufbau von Webcast- und Besprechungstechnik mitgeholfen. Dabei habe ich gesehen, wie wichtig die Vorbereitung und eine stabile technische Umgebung sind.'],
logserv:['Ihre Ausbildungsstelle in Griesheim interessiert mich, weil die Aufgaben Hardware, Netzwerke und die Unterstützung von Kolleginnen und Kollegen verbinden. Gerade diese praktische Mischung macht für mich Systemintegration aus.','Während meines Praktikums bei Lufthansa Systems habe ich Laptops vorbereitet, Geräte eingerichtet und technische Teams bei Support-Aufgaben unterstützt. Diese Erfahrungen möchte ich bei Ihnen vertiefen.'],
hattersheim:['An der IT einer Stadtverwaltung gefällt mir, dass zuverlässige Systeme vielen unterschiedlichen Arbeitsbereichen helfen. Die Aufgaben mit Servern, Netzwerken und Anwenderunterstützung passen deshalb sehr gut zu mir.','In der Schule habe ich eine Windows-Server-Umgebung mit Active Directory, DNS und DHCP eingerichtet. Beim Praktikum im IT-Bereich von Lufthansa Systems habe ich zusätzlich praktische Einblicke in den technischen Support erhalten.'],
pittler:['Ich suche eine Ausbildung, in der ich Systemintegration gründlich und praxisnah lernen kann. Besonders wichtig ist mir, selbst mit IT-Systemen zu arbeiten und technische Probleme zu lösen.','In Schulprojekten habe ich mich mit VirtualBox, Windows Server und Netzwerktechnik beschäftigt. Am liebsten gehe ich bei technischen Fehlern Schritt für Schritt vor, bis ich die Ursache verstanden habe.'],
frankfurt:['Die IT der Stadt Frankfurt hilft Mitarbeitenden in vielen verschiedenen Ämtern bei ihrer täglichen Arbeit. Die Kombination aus Client-Server-Systemen, Fehlersuche und Anwenderbetreuung finde ich besonders interessant.','In der Schule beschäftige ich mich mit Windows Server, Active Directory, DNS und DHCP. Bei Lufthansa Systems konnte ich zusätzlich Geräte einrichten und bei Support-Aufgaben mithelfen.'],
giessen:['Beim Regierungspräsidium Gießen interessiert mich, wie die IT einer größeren Behörde funktioniert. Besonders Aufgaben wie die Betreuung von Arbeitsplätzen, Fehlerdiagnose und technischer Support passen zu meinen Interessen.','Mit Windows Server, DNS und DHCP habe ich mich bereits im Unterricht beschäftigt. Praktische Erfahrungen mit der Einrichtung von Geräten und der Unterstützung von Nutzern habe ich während meines Praktikums gesammelt.'],
pirelli:['In einem Industriebetrieb wie Pirelli ist eine zuverlässige IT im Hintergrund besonders wichtig. Mich reizt das Zusammenspiel von Netzwerken, Arbeitsplätzen und den Menschen, die täglich damit arbeiten.','Während meines Praktikums bei Lufthansa Systems habe ich Geräte und Besprechungstechnik vorbereitet. Im Unterricht habe ich mit virtuellen Maschinen und Windows Server gearbeitet. Beides möchte ich in der Ausbildung weiterentwickeln.'],
hzd:['Die Hessische Zentrale für Datenverarbeitung interessiert mich, weil sie IT für öffentliche Einrichtungen betreibt. Das Einrichten und Betreuen von IT-Systemen sowie der Kontakt mit Anwendern sprechen mich an.','Ich habe in der Schule mit Windows Server, DNS, DHCP und Active Directory gearbeitet und während meines Praktikums erste Support-Aufgaben kennengelernt.']
};
const $=s=>document.querySelector(s);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active=null;
const modal=document.createElement('div');modal.className='bp-modal';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
modal.innerHTML=[
'<div class="bp-panel">',
'<div class="bp-panel-head"><div><div style="font-size:12px;font-weight:800;color:#6ee7cf">MEINE BEWERBUNGEN 2027</div><h2 id="bp-title">Anschreiben</h2><p>Persönlich bearbeiten und herunterladen</p></div><button type="button" class="bp-close" id="bp-close">✕ Schließen</button></div>',
'<div class="bp-content"><div class="bp-fields"><h3>Meine Angaben</h3>',
'<label>Name<input id="bp-name" autocomplete="name"></label>',
'<label>Straße und Hausnummer<input id="bp-street" autocomplete="street-address"></label>',
'<label>Postleitzahl<input id="bp-postal" autocomplete="postal-code"></label>',
'<label>Wohnort<input id="bp-city" autocomplete="address-level2"></label>',
'<label>E-Mail<input id="bp-email" type="email" autocomplete="email"></label>',
'<label>Telefon (optional)<input id="bp-phone"></label>',
'<label>Firmenanschrift (bereits eingetragen, bei Bedarf korrigieren)<textarea id="bp-recipient" rows="6"></textarea></label>',
'<label>Persönliche Ergänzung (optional)<textarea id="bp-extra" rows="3" placeholder="Deine echten Stärken oder Projekte"></textarea></label>',
'<p class="bp-callout">Deine Kontaktdaten und Entwürfe bleiben lokal im Browser. Diese öffentliche Firmenliste überträgt sie nicht auf einen Server.</p>',
'<button type="button" class="bp-smallbtn" id="bp-rebuild">Anschreiben neu aufbauen</button>',
'</div><div class="bp-edit"><h3>Bewerbung um eine FISI-Ausbildung 2027</h3><p id="bp-context" class="bp-fine"></p>',
'<label for="bp-body" class="bp-fine">Das Anschreiben und die Anrede sind für diese Firma vorbereitet. Du kannst alles bearbeiten. Bitte prüfe den Text vor dem Versand.</label>',
'<textarea id="bp-body" spellcheck="true"></textarea>',
'<div class="bp-downloads"><button id="bp-pdf" class="bp-primary">PDF herunterladen</button><button id="bp-doc">Word-Datei (.doc)</button><button id="bp-txt">Text herunterladen</button><button id="bp-copy">Text kopieren</button></div>',
'<p id="bp-warning" class="bp-warn">Prüfe vor dem Versand deine Angaben und die aktuelle Stellenanzeige. Eine Zusage ist nicht garantiert.</p>',
'<a id="bp-apply" class="btn primary" target="_blank" rel="noopener noreferrer">Zur Bewerbungsseite ↗</a>',
'</div></div></div>'
].join('');
document.body.appendChild(modal);
for(const key of ['name','street','postal','city','email','phone','extra']){
 const el=$('#bp-'+key);el.value=profile[key]||'';el.addEventListener('input',()=>{profile[key]=el.value;save(PROFILE_KEY,profile)});
}
const subject='Bewerbung um eine Ausbildung zum Fachinformatiker für Systemintegration – 2027';
function generate(job){
 const texts=why[job.id]||[job.userReason||'Ich interessiere mich für Ihre Ausbildung, weil ich IT-Systeme und Netzwerke nicht nur verstehen, sondern auch praktisch betreuen möchte.','Im IT-Unterricht habe ich mit Windows Server und VirtualBox gearbeitet. Bei meinem Praktikum bei Lufthansa Systems habe ich außerdem erlebt, wie technische Unterstützung im Arbeitsalltag funktioniert.'];
 const first=(job.salutation||'Sehr geehrte Damen und Herren,');
 const name=profile.name||'Marlon Bonsels';
 const paragraphs=[
 first,
 texts[0],
 'Zurzeit besuche ich die höhere Berufsfachschule im Bereich Informationstechnik und strebe die Fachhochschulreife an. Ich möchte Fachinformatiker für Systemintegration werden, weil ich mich gerne mit Computern, Netzwerken und technischen Problemen beschäftige.',
 texts[1],
 profile.extra?.trim()||'',
 'Bei der Ausbildung möchte ich mein Wissen vertiefen, zuverlässig mitarbeiten und Schritt für Schritt Verantwortung übernehmen. Über eine Einladung zu einem persönlichen Gespräch freue ich mich.',
 'Mit freundlichen Grüßen\n'+name
 ].filter(Boolean);
 return paragraphs.join('\n\n');
}
function openLetter(id){
 active=FIRMS.find(x=>x.id===id);if(!active)return;
 $('#bp-title').textContent=active.firma;
 $('#bp-context').textContent='Kontakt: '+(active.kontakt||'Kein Name veröffentlicht')+' · '+(active.addressNote||'Anschrift vor Versand prüfen')+' · Quelle vor Versand prüfen.';
 const addresses=read('personal-fisi-addresses-v1',{});
 $('#bp-recipient').value=addresses[id]||active.recipient||active.firma+'\n'+active.ort;
 $('#bp-body').value=drafts[id]||generate(active);
 if(drafts[id]&&active.salutation&&$('#bp-body').value.startsWith('Sehr geehrte Damen und Herren,')&&active.salutation!=='Sehr geehrte Damen und Herren,'){
  // Bestehenden Entwurf behalten; nur die generische Anrede auf den verifizierten Kontakt umstellen.
  $('#bp-body').value=$('#bp-body').value.replace(/^Sehr geehrte Damen und Herren,/,active.salutation);
  drafts[id]=$('#bp-body').value;save(DRAFT_KEY,drafts);
 }
 $('#bp-apply').href=active.url;modal.hidden=false;document.body.style.overflow='hidden';
}
function closeModal(){modal.hidden=true;document.body.style.overflow=''}
$('#bp-close').addEventListener('click',closeModal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal()});
$('#bp-body').addEventListener('input',()=>{if(active){drafts[active.id]=$('#bp-body').value;save(DRAFT_KEY,drafts)}});
$('#bp-recipient').addEventListener('input',()=>{if(!active)return;const a=read('personal-fisi-addresses-v1',{});a[active.id]=$('#bp-recipient').value;save('personal-fisi-addresses-v1',a)});
$('#bp-rebuild').addEventListener('click',()=>{if(!active)return;if(drafts[active.id]&&!confirm('Deinen bearbeiteten Text wirklich ersetzen?'))return;delete drafts[active.id];save(DRAFT_KEY,drafts);$('#bp-body').value=generate(active)});
function stamp(){return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date())}
function data(){
 const normalized=(active?.firma||'Firma').normalize('NFKD').replace(/[^a-zA-Z0-9-]+/g,'_');
 return {from:[profile.name,profile.street,[profile.postal,profile.city].filter(Boolean).join(' '),profile.email,profile.phone].filter(Boolean),to:$('#bp-recipient').value.split('\n'),date:(profile.city||'Idstein')+', '+stamp(),subject,body:$('#bp-body').value,filename:'Anschreiben_'+normalized+'_2027'}
}
function fullText(){const d=data();return d.from.join('\n')+'\n\n'+d.to.join('\n')+'\n\n'+d.date+'\n\n'+d.subject+'\n\n'+d.body}
function download(content,file,type){
 const link=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));link.href=url;link.download=file;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)
}
$('#bp-txt').addEventListener('click',()=>download(fullText(),data().filename+'.txt','text/plain;charset=utf-8'));
$('#bp-doc').addEventListener('click',()=>{
 const d=data(),html='<html><head><meta charset="utf-8"><style>body{font-family:Arial;font-size:11pt;line-height:1.5;margin:2cm}p{white-space:pre-wrap}</style></head><body><p>'+safe(d.from.join('\n'))+'</p><p>'+safe(d.to.join('\n'))+'</p><p>'+safe(d.date)+'</p><h3>'+safe(d.subject)+'</h3><p>'+safe(d.body)+'</p></body></html>';
 download('\ufeff'+html,d.filename+'.doc','application/msword;charset=utf-8')
});
$('#bp-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(fullText());$('#bp-warning').textContent='Text kopiert.'}catch{$('#bp-body').select();document.execCommand('copy')}});
async function getPDF(){
 if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';script.onload=resolve;script.onerror=reject;document.head.appendChild(script)});
 return window.jspdf.jsPDF
}
$('#bp-pdf').addEventListener('click',async()=>{
 const button=$('#bp-pdf');button.disabled=true;button.textContent='Erstelle PDF ...';
 try{
  if((!profile.street||!profile.postal||!profile.email)&&!confirm('Deine eigene vollständige Adresse oder E-Mail fehlt noch. Trotzdem PDF herunterladen?'))return;
  const PDF=await getPDF(),d=data(),pdf=new PDF({format:'a4',unit:'mm'});let y=22;
  function add(s,size=10,bold=false,gap=5.4){
   pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);
   const lines=pdf.splitTextToSize(s||' ',162);
   for(const l of lines){if(y>273){pdf.addPage();y=23}pdf.text(l,24,y);y+=gap}
  }
  d.from.forEach(s=>add(s,9.2,false,4.6));y+=10;
  d.to.forEach(s=>add(s,9.7,false,4.7));y+=10;
  add(d.date,9.5);y+=8;add(d.subject,10.5,true,5.6);y+=6;
  d.body.replace(/\r\n/g,'\n').split('\n').forEach(p=>p.trim()?add(p,10.2,false,5.35):y+=3);
  pdf.save(d.filename+'.pdf');$('#bp-warning').textContent='PDF erstellt. Prüfe die heruntergeladene Datei vor dem Versand.';
 }catch(e){$('#bp-warning').textContent='PDF konnte nicht erstellt werden. Alternativ kannst du Word oder Text herunterladen.'}
 finally{button.disabled=false;button.textContent='PDF herunterladen'}
});
if(Array.isArray(extras))for(const job of extras){if(job&&job.id&&job.firma&&job.url)FIRMS.push(job)}
const toolbar=$('.bar .tools');
const label=document.createElement('label');label.style.cssText='margin:0;display:flex;align-items:center;gap:6px;font-size:12px';label.innerHTML='<input type="checkbox" id="bp-only-new" checked style="width:auto"> Nur nicht beworbene';toolbar.appendChild(label);
const pilot=document.createElement('a');pilot.href='https://bewerbungspilot-2027-separat.onrender.com';pilot.target='_blank';pilot.rel='noopener noreferrer';pilot.className='btn ghost';pilot.textContent='Mein BewerbungsPilot';toolbar.appendChild(pilot);
const own=document.createElement('button');own.type='button';own.className='btn ghost';own.textContent='+ Eigene Firma';toolbar.appendChild(own);
own.addEventListener('click',()=>{
 const firma=prompt('Firma:');if(!firma?.trim())return;
 const ort=prompt('Ort der Ausbildung:');if(!ort?.trim())return;
 const url=prompt('Link zur konkreten Stellenanzeige (https://...):');if(!url||!/^https:\/\//i.test(url)){alert('Bitte einen vollständigen HTTPS-Link eingeben.');return}
 const reason=prompt('Warum interessiert dich genau diese Firma? (Ein Satz für das Anschreiben)')||'';
 const job={id:'neu-'+Date.now(),firma:firma.trim(),ort:ort.trim(),plz:'',adresse:'',start:'2027 – prüfen',url,official:false,website:'',region:'Selbst erfasst',stand:'Eigenes Angebot',userReason:reason};
 extras.push(job);FIRMS.push(job);save(EXTRA_KEY,extras);render()
});
const originalRender=render;
render=function(){
 originalRender();let count=0;
 Array.from(document.querySelectorAll('.job')).forEach(card=>{
  const company=card.querySelector('h3')?.textContent,job=FIRMS.find(j=>j.firma===company);if(!job)return;
  if(done[job.id]&&$('#bp-only-new').checked){card.remove();return}
  count++;
  const actions=document.createElement('div');actions.className='bp-actions';
  const letter=document.createElement('button');letter.type='button';letter.className='bp-letter';letter.textContent='Anschreiben erstellen';letter.addEventListener('click',()=>openLetter(job.id));
  const applied=document.createElement('button');applied.type='button';applied.className='bp-done'+(done[job.id]?' is-done':'');applied.textContent=done[job.id]?'✓ Beworben (rückgängig)':'Als beworben markieren';applied.addEventListener('click',()=>{done[job.id]=!done[job.id];save(DONE_KEY,done);render()});
  actions.append(letter,applied);card.appendChild(actions)
 });
 $('#showCount').textContent=count;$('#notfound').hidden=count!==0;
 $('#notfound').textContent='Keine weiteren Firmen mit diesen Filtern. Du kannst den Beworben-Filter ausschalten oder eine eigene Firma hinzufügen.'
};
$('#bp-only-new').addEventListener('change',render);
const notice=document.createElement('section');notice.className='note';notice.style.marginTop='16px';notice.textContent='Deine persönliche Firmenauswahl wurde mit 133 gespeicherten BewerbungsPilot-Einträgen (Stand Ende Oktober 2026) abgeglichen. Bereits dort erfasste Firmen sind aus den Vorschlägen entfernt. Neue Markierungen bleiben nur in diesem Browser; es gibt keine automatische Synchronisation mit dem BewerbungsPilot.';
$('.stats').after(notice);render();
})();