/* TOUCH LIVE · Schach-Bot im Hintergrund (Web Worker).
   Rechnet den Bot-Zug außerhalb der Seite, damit Uhr, Brett und Tippen auf älteren iPads nicht einfrieren. */
importScripts('/chess.js?v=1');
self.onmessage=function(e){
 var d=e.data||{},move=null;
 try{move=self.TouchChess.bestMove(d.state,d.level);}catch(err){move=null;}
 self.postMessage({id:d.id,move:move});
};
