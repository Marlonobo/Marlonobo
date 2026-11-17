/* TOUCH LIVE · Kompatibilität für ältere Geräte und Browser.
   Absichtlich in altem JavaScript (ES5) geschrieben und vor allem anderen geladen.
   1) Zu alter Browser? TOUCH LIVE braucht Safari/iPadOS 13.4+, Chrome/Edge 80+ oder Firefox 74+.
      Dann eine klare Meldung statt einer leeren Seite.
   2) Ersatz für Element.replaceChildren (Safari < 14, Chrome < 86).
   3) Klassen am <html> als Ersatz für CSS :has() (Safari < 15.4, Firefox < 121, z. B. Firefox ESR 115 auf Schul-PCs). */
(function(){
 'use strict';
 var modern=true;
 try{new Function('var o={a:{}};return (o?.a?.b??1)+1;')();}catch(e){modern=false;}
 window.__touchModern=modern;
 if(window.Element&&!Element.prototype.replaceChildren){
  Element.prototype.replaceChildren=function(){this.textContent='';for(var i=0;i<arguments.length;i++){var n=arguments[i];this.appendChild(typeof n==='string'?document.createTextNode(n):n);}};
 }
 function oldBrowser(){
  var html='<main style="max-width:640px;margin:0 auto;padding:12vh 24px;color:#eaf6fb;font-family:Arial,Helvetica,sans-serif;line-height:1.5">'+
   '<p style="letter-spacing:.12em;font-size:12px;color:#86f3ed;font-weight:bold">TOUCH LIVE</p>'+
   '<h1 style="font-size:28px;margin:6px 0 14px">Dieser Browser ist leider zu alt</h1>'+
   '<p>TOUCH LIVE braucht einen aktuellen Browser:</p>'+
   '<ul><li><b>iPad / iPhone:</b> iPadOS bzw. iOS 15 oder neuer (Einstellungen → Allgemein → Softwareupdate)</li>'+
   '<li><b>PC / Laptop:</b> aktuelles Chrome, Edge, Firefox oder Safari</li>'+
   '<li><b>Android:</b> aktuelles Chrome oder Samsung Internet</li></ul>'+
   '<p>Am schnellsten: Seite auf einem anderen Gerät öffnen.</p></main>';
  try{document.documentElement.style.background='#06121e';document.body.style.background='#06121e';document.body.innerHTML=html;}catch(e){}
 }
 function hasClasses(){
  var d=document.documentElement;
  function set(name,on){if(on)d.classList.add(name);else d.classList.remove(name);}
  function upd(){set('hasTvApp',!!document.getElementById('tvApp'));set('hasPhoneRemote',!!document.querySelector('.phoneRemote'));set('hasAdminRoot',!!document.getElementById('adminRoot'));}
  upd();
  try{new MutationObserver(upd).observe(document.body,{childList:true,subtree:true});}catch(e){setInterval(upd,1000);}
 }
 function ready(){if(!modern){oldBrowser();return;}hasClasses();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
 // Fällt ein Skriptfehler in einem zu alten Browser an, bleibt die Erklärung stehen.
 if(!modern)window.addEventListener('load',function(){setTimeout(oldBrowser,50);});
})();
