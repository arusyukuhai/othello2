import assert from 'node:assert/strict';
import {initial,boards,locate,moves,trace,play,pass,score} from '../engine.mjs';
import {search} from '../search.mjs';
let s=initial(8);assert.equal(moves(s).length,4);let m=moves(s)[0],q=play(s,m.l,m.i,m.t);assert.equal(q.t,1);assert.equal(q.p,-1);assert.equal(q.placed,1);assert.deepEqual(s,initial(8));assert.equal(boards(q).length,2);assert.equal(score(q)[1]+score(q)[-1],9);
// Time-only, world-only, mixed diagonal and existing-future captures.
function specimen(){let x=initial(6);x.t=4;x.worlds[0].head=4;x.worlds[0].b=Array(36).fill(0);x.worlds[0].h={0:Array(36).fill(0),2:Array(36).fill(0),4:x.worlds[0].b};return x;}
s=specimen();s.worlds[0].h[2][0]=-1;s.worlds[0].h[0][0]=1;assert(trace(s,0,4,0).flips.some(c=>c.t===2));q=play(s,0,0,4);assert.equal(q.worlds[0].h[2][0],1);assert.equal(s.worlds[0].h[2][0],-1);assert.equal(q.worlds[0].h[4][0],0);
s=specimen();for(let id=1;id<3;id++){let b=Array(36).fill(0);s.worlds.push({id,parent:null,origin:0,start:0,head:4,b,h:{0:Array(36).fill(0),2:Array(36).fill(0),4:b}});}s.worlds[1].b[0]=-1;s.worlds[2].b[0]=1;s.worlds[1].h[2][0]=-1;s.worlds[2].h[0][0]=1;let tr=trace(s,0,4,0);assert(tr.rays.some(r=>r.dir[2]===1&&r.dir[3]===0));assert(tr.rays.some(r=>r.dir[2]===1&&r.dir[3]===-1));q=play(s,0,0,4);assert.equal(q.t,4);assert.equal(q.p,1);assert.equal(q.worlds[1].head,4);assert.equal(Object.keys(q.worlds[1].h).length,3);
s=specimen();s.worlds[0].h[0][0]=0;s.worlds[0].h[2][0]=-1;s.worlds[0].h[4][0]=1;assert(trace(s,0,0,0).rays.some(r=>r.dir[3]===1));
// True fork starts at the destination's next local time; shared past is not duplicated.
s=initial(6);for(let i=0;i<4;i++){m=moves(s).find(m=>!m.travel);s=play(s,m.l,m.i,m.t);}m=moves(s).find(m=>m.travel&&m.t===0);assert(m);q=play(s,m.l,m.i,m.t);assert.equal(q.worlds.at(-1).head,1);assert.equal(q.t,1);assert.equal(q.p,-1);assert.equal(Object.keys(q.worlds.at(-1).h).length,1);assert.equal(locate(q,q.worlds.length-1,0).b,q.worlds[0].h[0]);assert.equal(boards(q).filter(n=>!n.virtual).length,q.placed+1);
// Return clock to black and confirm exact duplicated branch is prohibited.
q.p=1;q.t=2;assert.equal(trace(q,m.l,m.t,m.i).flips.length,0);
// Pass creates no recorded board or score; two global no-move passes end.
s=initial(6);s.worlds[0].b.fill(1);let sc=score(s);q=pass(s);assert.deepEqual(score(q),sc);assert.equal(Object.keys(q.worlds[0].h).length,1);assert(pass(q).ended);
// Complete random games: forks, multi-placement turns, exact total record count.
let seed=471;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
for(let n of [6,8]){s=initial(n);let branches=0;for(let j=0;j<150&&!s.ended;j++){let a=moves(s);if(!a.length){s=pass(s);continue;}m=a[rng()%a.length];if(m.travel)branches++;s=play(s,m.l,m.i,m.t);assert.equal(boards(s).filter(n=>!n.virtual).length,s.placed+1);assert.equal(s.t,Math.min(...s.worlds.map(w=>w.head)));}assert(s.ended);assert(s.placed<=s.limit);assert(branches>0);console.log(`${n}x${n}: ${s.placed} placements / ${branches} branches / ${boards(s).length} records`);}
let result=search(initial(6),{budget:1600,width:5,maxDepth:3});assert(result.move);assert(result.depth>=2);assert(trace(initial(6),result.move.l,result.move.t,result.move.i).flips.length);console.log(`CPU legal, completed depth ${result.depth}, ${result.nodes} nodes in ${Math.round(result.ms)}ms`);
console.log('PASS: local clocks, shared ancestry, exact scoring, finite games, all dimensional captures, immutable input, branch deduplication, CPU search.');

// Regression: a historical board at the present on an advanced world must
// consume an outstanding present obligation, not give a free repeated action.
{
 let a=initial(6);const root=a.worlds[0],base=root.b.slice();root.head=2;root.h[2]=root.b;
 a.t=2;a.p=1;const b=base.slice();a.worlds.push({id:1,parent:null,origin:0,start:0,head:4,b,h:{0:base.slice(),2:base.slice(),4:b}});
 const legal=moves(a).find(m=>m.l===1&&m.t===2);assert(legal);
 let q=play(a,legal.l,legal.i,legal.t);
 assert.equal(q.worlds[0].head,3);assert.equal(q.worlds[1].head,4);assert.equal(q.p,-1);assert.equal(q.placed,1);
 assert.equal(Object.values(q.worlds[0].h).length,2);assert.equal(q.log[0].departure,0);
 // For every move in this fixture, same-player continuation strictly reduces
 // the number of outstanding present boards. No new same-player obligation.
 const obligations=a.worlds.filter(w=>w.head===a.t).length;
 for(const m of moves(a)){const next=play(a,m.l,m.i,m.t);if(next.p===a.p)assert(next.worlds.filter(w=>w.head===next.t).length<obligations);}
 console.log('PASS: branching consumes a present obligation and yields the turn.');
}
{
 const s=initial(4),b=s.worlds[0].b.slice();s.worlds.push({id:1,parent:null,origin:0,start:0,head:0,b,h:{0:b}});
 const options={budget:10000,width:Infinity,maxDepth:3};
 const full=search(s,{...options,pruning:false,transpositions:false}),pruned=search(s,options);
 assert.equal(full.depth,3);assert.equal(pruned.depth,3);assert.equal(full.value,pruned.value);assert(pruned.ttHits>0);assert(pruned.expanded<full.expanded);
 console.log(`PASS: pruning agrees with full minimax; ${full.expanded} -> ${pruned.expanded} expansions; ${pruned.ttHits} transposition hits.`);
}

// Waiting states must survive subsequent moves, remain traversable, and not score.
{
 let s=initial(6);for(let j=0;j<4;j++){let m=moves(s).find(m=>!m.travel);s=play(s,m.l,m.i,m.t);}
 let m=moves(s).find(m=>m.travel&&m.t===0),before=score(s),q=play(s,m.l,m.i,m.t);
 const departure=q.log[0].departure,w=q.worlds[departure],waiting=w.head;
 assert(w.waits[waiting]);assert.equal(locate(q,departure,waiting).b,w.waits[waiting]);
 const sum=Object.values(before).reduce((a,b)=>a+b,0),sum2=Object.values(score(q)).reduce((a,b)=>a+b,0);
 assert.equal(sum2-sum,q.worlds.at(-1).b.filter(Boolean).length);
 for(let j=0;j<12&&!q.ended;j++){let ms=moves(q);if(!ms.length){q=pass(q);continue;}let step=ms.find(m=>!m.travel)||ms[0];q=play(q,step.l,step.i,step.t);}
 assert(q.worlds[departure].waits[waiting]);assert(boards(q).some(n=>n.l===departure&&n.t===waiting&&n.virtual));
 for(let world of q.worlds)for(let t=world.start;t<=world.head;t++)assert(boards(q).some(b=>b.l===world.id&&b.t===t),`hole at ${world.id}:${t}`);
 let x=initial(6),b=Array(36).fill(0),h0=b.slice(),wait=b.slice();h0[0]=1;wait[0]=-1;x.t=4;x.worlds[0]={id:0,parent:null,origin:0,start:0,head:4,b,h:{0:h0,4:b},waits:{2:wait}};
 assert(trace(x,0,4,0).flips.some(c=>c.t===2));const changed=play(x,0,0,4);assert.equal(changed.worlds[0].waits[2][0],1);assert.equal(x.worlds[0].waits[2][0],-1);
 console.log('PASS: waiting history persists, contains no holes, supports time captures and adds no score.');
}
