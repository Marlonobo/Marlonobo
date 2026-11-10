/* TOUCH LIVE · kleine Schach-Engine (keine externen Bibliotheken).
   Brett: 64 Felder, Index = Reihe*8 + Linie, Reihe 0 = 8. Reihe (oben, Schwarz).
   Figuren: Weiß Großbuchstaben (PNBRQK), Schwarz Kleinbuchstaben. */
(function(global){
'use strict';
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const VAL={p:100,n:320,b:330,r:500,q:900,k:0};
// Positionstabellen aus Sicht von Weiß (Index 0 = a8).
const PST={
 p:[0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
 n:[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
 b:[-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
 r:[0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
 q:[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
 k:[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
};
const isW=p=>p&&p===p.toUpperCase();
const colorOf=p=>p?(isW(p)?'w':'b'):null;
const rc=i=>[i>>3,i&7];
const on=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const N8=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const K8=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const DIAG=[[-1,-1],[-1,1],[1,-1],[1,1]],ORTH=[[-1,0],[1,0],[0,-1],[0,1]];

function initial(){
 const b=[];for(const row of START.split('/'))for(const ch of row){if(/\d/.test(ch))for(let i=0;i<+ch;i++)b.push('');else b.push(ch);}
 return {b,turn:'w',castle:{K:true,Q:true,k:true,q:true},ep:-1,half:0,full:1};
}
function attacked(s,sq,by){ // wird Feld sq von Farbe "by" angegriffen?
 const b=s.b,[r,c]=rc(sq),W=by==='w';
 const pr=W?r+1:r-1,pawn=W?'P':'p';
 for(const dc of [-1,1])if(on(pr,c+dc)&&b[pr*8+c+dc]===pawn)return true;
 const kn=W?'N':'n';for(const[dr,dc]of N8)if(on(r+dr,c+dc)&&b[(r+dr)*8+c+dc]===kn)return true;
 const kg=W?'K':'k';for(const[dr,dc]of K8)if(on(r+dr,c+dc)&&b[(r+dr)*8+c+dc]===kg)return true;
 const bq=W?['B','Q']:['b','q'],rq=W?['R','Q']:['r','q'];
 for(const[dr,dc]of DIAG){let rr=r+dr,cc=c+dc;while(on(rr,cc)){const p=b[rr*8+cc];if(p){if(bq.includes(p))return true;break;}rr+=dr;cc+=dc;}}
 for(const[dr,dc]of ORTH){let rr=r+dr,cc=c+dc;while(on(rr,cc)){const p=b[rr*8+cc];if(p){if(rq.includes(p))return true;break;}rr+=dr;cc+=dc;}}
 return false;
}
function kingSq(s,color){const k=color==='w'?'K':'k';return s.b.indexOf(k);}
function inCheck(s,color=s.turn){const k=kingSq(s,color);return k>=0&&attacked(s,k,color==='w'?'b':'w');}
function pseudo(s){
 const out=[],b=s.b,me=s.turn,them=me==='w'?'b':'w';
 const add=(from,to,extra={})=>out.push({from,to,piece:b[from],cap:b[to]||'',...extra});
 for(let i=0;i<64;i++){
  const p=b[i];if(!p||colorOf(p)!==me)continue;
  const t=p.toLowerCase(),[r,c]=rc(i);
  if(t==='p'){
   const dir=me==='w'?-1:1,start=me==='w'?6:1,last=me==='w'?0:7,one=(r+dir)*8+c;
   const pushP=(to,extra={})=>{if((to>>3)===last)for(const pr of['q','r','b','n'])add(i,to,{...extra,promo:me==='w'?pr.toUpperCase():pr});else add(i,to,extra);};
   if(on(r+dir,c)&&!b[one]){pushP(one);const two=(r+2*dir)*8+c;if(r===start&&!b[two])add(i,two,{double:true});}
   for(const dc of[-1,1]){if(!on(r+dir,c+dc))continue;const to=(r+dir)*8+c+dc;
    if(b[to]&&colorOf(b[to])===them)pushP(to);
    else if(to===s.ep)add(i,to,{enpassant:true,cap:me==='w'?'p':'P'});}
  }else if(t==='n'||t==='k'){
   for(const[dr,dc]of(t==='n'?N8:K8)){if(!on(r+dr,c+dc))continue;const to=(r+dr)*8+c+dc;if(!b[to]||colorOf(b[to])===them)add(i,to);}
   if(t==='k'){
    const W=me==='w',home=W?60:4,cr=s.castle;
    if(i===home&&!inCheck(s,me)){
     if((W?cr.K:cr.k)&&!b[home+1]&&!b[home+2]&&b[home+3]===(W?'R':'r')&&!attacked(s,home+1,them)&&!attacked(s,home+2,them))add(i,home+2,{castle:'K'});
     if((W?cr.Q:cr.q)&&!b[home-1]&&!b[home-2]&&!b[home-3]&&b[home-4]===(W?'R':'r')&&!attacked(s,home-1,them)&&!attacked(s,home-2,them))add(i,home-2,{castle:'Q'});
    }
   }
  }else{
   const dirs=t==='b'?DIAG:t==='r'?ORTH:DIAG.concat(ORTH);
   for(const[dr,dc]of dirs){let rr=r+dr,cc=c+dc;while(on(rr,cc)){const to=rr*8+cc;if(!b[to])add(i,to);else{if(colorOf(b[to])===them)add(i,to);break;}rr+=dr;cc+=dc;}}
  }
 }
 return out;
}
function make(s,m){
 const b=s.b.slice(),me=s.turn,W=me==='w';
 b[m.to]=m.promo||b[m.from];b[m.from]='';
 if(m.enpassant)b[m.to+(W?8:-8)]='';
 if(m.castle==='K'){b[m.to-1]=b[m.to+1];b[m.to+1]='';}
 if(m.castle==='Q'){b[m.to+1]=b[m.to-2];b[m.to-2]='';}
 const castle={...s.castle};
 const t=m.piece.toLowerCase();
 if(t==='k'){if(W){castle.K=castle.Q=false;}else{castle.k=castle.q=false;}}
 for(const sq of[m.from,m.to]){if(sq===63)castle.K=false;if(sq===56)castle.Q=false;if(sq===7)castle.k=false;if(sq===0)castle.q=false;}
 return {b,turn:W?'b':'w',castle,ep:m.double?(m.from+m.to)/2:-1,half:(t==='p'||m.cap)?0:s.half+1,full:s.full+(W?0:1)};
}
function legal(s){return pseudo(s).filter(m=>{const n=make(s,m);return !inCheck(n,s.turn);});}
function evaluate(s){ // aus Sicht der Farbe am Zug
 let score=0;
 for(let i=0;i<64;i++){const p=s.b[i];if(!p)continue;const t=p.toLowerCase();
  const v=VAL[t]+(isW(p)?PST[t][i]:PST[t][(7-(i>>3))*8+(i&7)]);score+=isW(p)?v:-v;}
 return s.turn==='w'?score:-score;
}
function order(ms){return ms.sort((a,b)=>((b.cap?VAL[b.cap.toLowerCase()]*10-VAL[b.piece.toLowerCase()]:0)+(b.promo?800:0))-((a.cap?VAL[a.cap.toLowerCase()]*10-VAL[a.piece.toLowerCase()]:0)+(a.promo?800:0)));}
const MATE=100000;
function search(s,depth,alpha,beta,ply,ctx){
 if((++ctx.nodes&1023)===0&&Date.now()>ctx.deadline)ctx.stop=true;
 if(ctx.stop)return 0;
 const moves=legal(s);
 if(!moves.length)return inCheck(s)?-MATE+ply:0;
 if(s.half>=100)return 0;
 if(depth<=0)return quiesce(s,alpha,beta,ctx,0);
 order(moves);
 for(const m of moves){
  const v=-search(make(s,m),depth-1,-beta,-alpha,ply+1,ctx);
  if(ctx.stop)return 0;
  if(v>=beta)return beta;if(v>alpha)alpha=v;
 }
 return alpha;
}
function quiesce(s,alpha,beta,ctx,qd){
 const stand=evaluate(s);if(stand>=beta)return beta;if(stand>alpha)alpha=stand;
 if(qd>=4)return alpha;
 const caps=order(legal(s).filter(m=>m.cap||m.promo));
 for(const m of caps){const v=-quiesce(make(s,m),-beta,-alpha,ctx,qd+1);if(ctx.stop)return 0;if(v>=beta)return beta;if(v>alpha)alpha=v;}
 return alpha;
}
// Stufen: leicht = 1 Zug tief + Zufall, mittel = 2-3 Züge, schwer = bis 4 Züge (max. ~2,5 s).
const LEVELS={easy:{depth:1,noise:140,blunder:.25,ms:400},medium:{depth:3,noise:25,blunder:0,ms:1500},hard:{depth:5,noise:0,blunder:0,ms:2800}};
function bestMove(s,level='medium'){
 const L=LEVELS[level]||LEVELS.medium,moves=order(legal(s));if(!moves.length)return null;
 if(L.blunder&&Math.random()<L.blunder)return moves[Math.floor(Math.random()*moves.length)];
 const ctx={nodes:0,deadline:Date.now()+L.ms,stop:false};let best=moves[0];
 for(let d=1;d<=L.depth;d++){
  let alpha=-Infinity,cand=null,scored=[];
  for(const m of moves){
   // Mit Zufall (leicht/mittel) volles Fenster, sonst würden Schranken-Werte + Zufall falsch gewinnen.
   const raw=-search(make(s,m),d-1,-Infinity,L.noise?Infinity:-alpha,1,ctx),v=raw+(L.noise&&Math.abs(raw)<MATE/2?Math.random()*L.noise:0);
   if(ctx.stop)break;
   scored.push([v,m]);if(v>alpha){alpha=v;cand=m;}
  }
  if(ctx.stop&&!cand)break;
  if(cand){best=cand;// beste Züge zuerst für die nächste Tiefe
   scored.sort((a,b)=>b[0]-a[0]);moves.splice(0,moves.length,...scored.map(x=>x[1]),...moves.filter(m=>!scored.some(x=>x[1]===m)));}
  if(ctx.stop)break;
 }
 return best;
}
function status(s){
 const moves=legal(s);
 if(!moves.length)return inCheck(s)?{over:true,result:s.turn==='w'?'b':'w',reason:'Schachmatt'}:{over:true,result:'draw',reason:'Patt'};
 if(s.half>=100)return {over:true,result:'draw',reason:'50-Züge-Regel'};
 const rest=s.b.filter(p=>p&&p.toLowerCase()!=='k');
 if(!rest.length||(rest.length===1&&/[nbNB]/.test(rest[0])))return {over:true,result:'draw',reason:'zu wenig Material'};
 return {over:false,check:inCheck(s)};
}
const files='abcdefgh';
const sqName=i=>files[i&7]+(8-(i>>3));
function san(s,m){ // kurze Notation (ohne Mehrdeutigkeits-Zusatz außer Linie bei Bauern)
 if(m.castle)return m.castle==='K'?'O-O':'O-O-O';
 const t=m.piece.toUpperCase();let out=t==='P'?(m.cap?files[m.from&7]:''):t;
 if(t!=='P'){const twins=legal(s).filter(x=>x.to===m.to&&x.piece===m.piece&&x.from!==m.from);if(twins.length)out+=files[m.from&7];}
 out+=(m.cap?'x':'')+sqName(m.to)+(m.promo?'='+m.promo.toUpperCase():'');
 const n=make(s,m),st=status(n);return out+(st.over&&st.reason==='Schachmatt'?'#':inCheck(n)?'+':'');
}
global.TouchChess={initial,legal,make,status,bestMove,inCheck,kingSq,colorOf,sqName,san};
})(typeof window!=='undefined'?window:globalThis);
