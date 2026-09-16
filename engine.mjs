// Othello2: sparse local timelines. One placement creates exactly one recorded board.
export const dirs=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let l=-1;l<=1;l++)for(let t=-1;t<=1;t++)if(x||y||l||t)dirs.push([x,y,l,t]);
export const playerAt=t=>t%2===0?1:-1;
export function initial(n=8){let b=Array(n*n).fill(0),c=n/2;b[(c-1)*n+c-1]=b[c*n+c]=-1;b[(c-1)*n+c]=b[c*n+c-1]=1;return {n,t:0,p:1,worlds:[{id:0,parent:null,origin:0,start:0,head:0,b,h:{0:b},waits:{}}],placed:0,limit:n*n-4,passes:0,ended:false,log:[],branches:[]};}
export function locate(s,l,t){let w=s.worlds[l];if(!w||t<0||t>w.head)return null;if(t===w.head)return {b:w.b,l,t};if(w.h[t])return {b:w.h[t],l,t};if(w.waits?.[t])return {b:w.waits[t],l,t};if(w.parent!==null&&t<=w.origin)return locate(s,w.parent,t);return null;}
export function boards(s){return s.worlds.flatMap(w=>{let a=Object.keys(w.h).map(Number).map(t=>({l:w.id,t,b:w.h[t],head:t===w.head}));for(let [t,b] of Object.entries(w.waits??{}))if(!w.h[t])a.push({l:w.id,t:+t,b,head:+t===w.head,virtual:true});if(!w.h[w.head]&&!w.waits?.[w.head])a.push({l:w.id,t:w.head,b:w.b,head:true,virtual:true});return a.sort((a,b)=>a.t-b.t);});}
export function eligible(s,l,t){let w=s.worlds[l];return !s.ended&&!!w&&t<=s.t&&playerAt(t)===s.p&&!!locate(s,l,t)&&(t===w.head||!!w.h[t]||!!w.waits?.[t]);}
function branchKey(s,l,t,i){return l+':'+t+':'+s.p+':'+i+':'+locate(s,l,t).b.join(',');}
export function trace(s,l,t,i){const n=s.n,at=locate(s,l,t);if(!eligible(s,l,t)||!Number.isInteger(i)||i<0||i>=n*n||!at||at.b[i])return {flips:[],rays:[]};if(t<s.worlds[l].head&&s.branches.includes(branchKey(s,l,t,i)))return {flips:[],rays:[]};const x=i%n,y=i/n|0,out=new Map(),rays=[],maxT=Math.max(...s.worlds.map(w=>w.head));
for(let [dx,dy,dl,dt] of dirs){let chain=[],anchor=null;for(let k=1;k<=Math.max(n,maxT/2+1,s.worlds.length);k++){let xx=x+dx*k,yy=y+dy*k,ll=l+dl*k,tt=t+dt*k*2;if(xx<0||xx>=n||yy<0||yy>=n||tt<0||tt>maxT)break;let ww=s.worlds[ll];if(!ww||tt<ww.start)break;let a=locate(s,ll,tt);if(!a)break;let j=yy*n+xx,v=a.b[j];if(!v)break;if(v===s.p){if(chain.length)anchor={l:ll,i:j,t:tt};break;}chain.push({l:a.l,viewL:ll,t:a.t,i:j,cross:dl!==0||dt!==0});}if(anchor){rays.push({cells:chain,anchor,dir:[dx,dy,dl,dt]});for(let c of chain)out.set(c.l+':'+c.t+':'+c.i,c);}}
return {flips:[...out.values()],rays};}
export function captures(s,l,i,t=s.t){return trace(s,l,t,i).flips;}
export function moves(s,only=null){if(s.ended)return [];let a=[];for(let b of boards(s)){if(only!==null&&b.l!==only||!eligible(s,b.l,b.t))continue;for(let i=0;i<s.n*s.n;i++){let f=trace(s,b.l,b.t,i).flips;if(f.length)a.push({l:b.l,t:b.t,i,f,travel:b.t<s.worlds[b.l].head});}}return a;}
export function hasMove(s){if(s.ended)return false;for(let b of boards(s))if(eligible(s,b.l,b.t))for(let i=0;i<s.n*s.n;i++)if(trace(s,b.l,b.t,i).flips.length)return true;return false;}
function advanceWait(w){w.head++;w.b=w.b.slice();w.waits??={};w.waits[w.head]=w.b;}
function clock(s){s.t=Math.min(...s.worlds.map(w=>w.head));s.p=playerAt(s.t);}
export function play(s,l,i,t=s.t){if(s.ended||s.placed>=s.limit)throw Error('対局は終了しています');let found=trace(s,l,t,i);if(!found.flips.length)throw Error('この位置では挟めません');let q=structuredClone(s),source=q.worlds[l],old=locate(q,l,t),b=old.b.slice(),travel=t<source.head,newL=travel?q.worlds.length:l;b[i]=q.p;
// Local reversal belongs to the newly created board. Cross-board reversal changes
// the addressed recorded stone; already created futures are not recomputed.
for(let c of found.flips){if(c.l===old.l&&c.t===old.t)b[c.i]=q.p;else{let other=locate(q,c.l,c.t);other.b[c.i]=q.p;}}
let departure=null;if(travel){departure=source.head===s.t?source:q.worlds.find(w=>w.head===s.t);if(!departure)throw Error('跳躍元の現在盤面がありません');advanceWait(departure);q.branches.push(branchKey(s,l,t,i));q.worlds.push({id:newL,parent:l,origin:t,start:t+1,head:t+1,b,h:{[t+1]:b},waits:{}});}else{source.head=t+1;source.b=b;source.h[t+1]=b;}
q.log.unshift({t,p:q.p,l:newL,source:l,departure:departure?.id??null,i,count:found.flips.length,cross:found.flips.some(c=>c.cross),travel,number:q.placed+1});q.placed++;q.passes=0;if(q.placed>=q.limit)q.ended=true;clock(q);return q;}
export function pass(s){if(s.ended||hasMove(s))throw Error('過去への着手を含め、合法手があります');let q=structuredClone(s),p=q.p;q.log.unshift({t:q.t,p,pass:true,number:q.placed});for(let w of q.worlds)if(w.head===q.t)advanceWait(w);q.passes++;clock(q);if(q.passes>=2)q.ended=true;return q;}
export function score(s){let a={1:0,'-1':0};for(let w of s.worlds)for(let b of Object.values(w.h))for(let v of b)if(v)a[v]++;return a;}
