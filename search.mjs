import {moves,play,pass,passable,score,locate} from './engine.mjs';
const now=()=>performance.now();
export function evaluate(s,p){let sc=score(s),diff=sc[1]-sc[-1];if(s.ended)return p*diff*10000;let ownership=0,corners=0,frontier=0,n=s.n;for(let w of s.worlds)for(let i=0;i<n*n;i++){let v=w.b[i];if(!v)continue;let x=i%n,y=i/n|0;ownership+=v;corners+=((x===0||x===n-1)&&(y===0||y===n-1)?1:0)*v;for(let [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(x+dx>=0&&x+dx<n&&y+dy>=0&&y+dy<n&&!w.b[(y+dy)*n+x+dx]){frontier-=v;break;}}
let left=s.limit-s.placed;return p*(diff*2+ownership*Math.min(2,left/12)+corners*10+frontier*.8);}
// Include every field that changes legality or evaluation. Logs are cosmetic;
// branch prohibitions are a set. Keep the full key to avoid hash collisions.
export function stateKey(s){return JSON.stringify([s.n,s.t,s.p,s.placed,s.limit,s.passes,s.ended,[...s.branches].sort(),s.worlds.map(w=>[w.id,w.parent,w.origin,w.start,w.head,w.b,Object.entries(w.h),Object.entries(w.waits??{})])]);}
function ordered(s,width,stats){let list=moves(s),n=s.n;
for(let m of list){let b=locate(s,m.l,m.t).b,x=m.i%n,y=m.i/n|0,corner=((x===0||x===n-1)&&(y===0||y===n-1))?12:0; m.order=b.reduce((a,v)=>a+v*s.p,0)*2+2+m.f.length*4+corner;}
list.sort((a,b)=>b.order-a.order);let keep=Number.isFinite(width)?Math.max(1,width):list.length;stats.beamPruned+=Math.max(0,list.length-keep);return [...list.slice(0,keep),...(passable(s).length?[{pass:true}]:[])];}
const moveId=m=>m?.pass?'pass':m?m.l+':'+m.t+':'+m.i:'';
const apply=(s,m)=>m.pass?pass(s):play(s,m.l,m.i,m.t);
export function search(s,{budget=1600,width=8,maxDepth=5,pruning=true,transpositions=true}={},progress=()=>{}){
 const start=now(),deadline=start+budget,perspective=s.p,table=new Map();
 const stats={nodes:0,expanded:0,cutoffs:0,pruned:0,ttHits:0,beamPruned:0};
 const root=ordered(s,Number.isFinite(width)?width+4:width,stats);let best=root[0]??null,completed=0,bestValue=null;
 const report=()=>({move:best,depth:completed,...stats,value:bestValue,ms:now()-start});
 if(!best)return report();
 function check(){if(now()>deadline)throw Error('deadline');}
 function minimax(q,d,alpha,beta){check();stats.nodes++;if(!d||q.ended)return evaluate(q,perspective);
  const k=transpositions?stateKey(q):null,entry=k?table.get(k):null,a0=alpha,b0=beta;
  if(entry&&entry.depth===d){stats.ttHits++;if(entry.flag==='exact')return entry.value;if(pruning){if(entry.flag==='lower')alpha=Math.max(alpha,entry.value);else beta=Math.min(beta,entry.value);if(alpha>=beta)return entry.value;}}
  const list=ordered(q,width,stats);check();
  // Reorder only the admitted beam, so cached bounds describe the same tree.
  if(entry?.best){let i=list.findIndex(m=>moveId(m)===entry.best);if(i>0)list.unshift(...list.splice(i,1));}
  let maximize=q.p===perspective,v=maximize?-Infinity:Infinity,chosen=null;
  if(!list.length){stats.expanded++;v=minimax(pass(q),d-1,alpha,beta);}
  for(let i=0;i<list.length;i++){check();const m=list[i];stats.expanded++;const child=apply(q,m),val=minimax(child,d-1,alpha,beta);
   if(maximize?val>v:val<v){v=val;chosen=m;}
   if(pruning){if(maximize)alpha=Math.max(alpha,v);else beta=Math.min(beta,v);if(alpha>=beta){stats.cutoffs++;stats.pruned+=list.length-i-1;break;}}
  }
  if(k){if(table.size>=12000)table.clear();table.set(k,{depth:d,value:v,flag:pruning?(v<=a0?'upper':v>=b0?'lower':'exact'):'exact',best:moveId(chosen)});}
  return v;
 }
 // Expand children lazily: a cutoff avoids cloning/evaluating its siblings.
 for(let depth=1;depth<=maxDepth;depth++){let candidate=best,value=-Infinity;try{for(const m of root){check();stats.expanded++;let q=apply(s,m);let v=minimax(q,depth-1,pruning?value:-Infinity,Infinity);if(v>value){value=v;candidate=m;}}}catch(e){if(e.message==='deadline')break;throw e;}
  best=candidate;bestValue=value;completed=depth;progress(report());let i=root.findIndex(m=>moveId(m)===moveId(best));if(i>0)root.unshift(...root.splice(i,1));
 }
 return report();
}
