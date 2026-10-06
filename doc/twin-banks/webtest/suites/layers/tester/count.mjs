import { layout } from '/home/user/Rolehack/win/web/layout.js';
const OFFS = [-1, 1, 3, 5, 7, 7.75, 8.5, 10, 11.5, 12.5, 14, 20, 31.5, 32.5, 36, 48];
for (const [W,H] of [[896,443],[443,939],[360,640],[390,844]]) {
  const S = layout(W,H,'touch',{}).spec; let n=0; const seen=new Set();
  const add=(x,y)=>{ if (x >= 0.5 && y >= 0.5 && x <= S.W - 0.5 && y <= S.H - 0.5){const k=`${Math.round(x*4)/4},${Math.round(y*4)/4}`; if(!seen.has(k)){seen.add(k);n++;}}};
  for (const c of S.controls) { if (c.behind) continue; for (const f of [0.5,0.15,0.85]) for (const o of OFFS) { add(c.x+c.w*f,c.y-o); add(c.x+c.w*f,c.y+c.h+o); add(c.x-o,c.y+c.h*f); add(c.x+c.w+o,c.y+c.h*f);} }
  console.log(W,H,n);
}
