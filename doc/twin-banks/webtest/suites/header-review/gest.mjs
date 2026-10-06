import { launch, newCtx, openPage, resume, sleep, touch, evs, clearEvs } from '../header/common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, dpr: DPR });
const p = await openPage(ctx); await resume(p); await sleep(400);
const k = await touch(ctx, p);
const st = () => p.evaluate(() => ({ ov: __bt.overview, T: __bt.view.T, zf: localStorage.getItem('rh.zoomFactor'), panX: __bt.view.panX }));
console.log('start', await st());
await clearEvs(p);
// overview
await k.down([[300, 300], [420, 300]]); await sleep(150); console.log('150ms', await st());
await sleep(200); console.log('350ms', await st());
await k.move([[303, 302], [423, 301]]); await sleep(50); console.log('moved 3px', await st());
await k.move([[290, 302], [460, 301]]); await sleep(50); console.log('spread in overview', await st());
await k.up(); await sleep(100); console.log('lifted', await st(), JSON.stringify(await evs(p)));
// pinch
await clearEvs(p);
await k.down([[300, 300], [420, 300]]); await sleep(50);
for (let i = 1; i <= 10; i++) { await k.move([[300 - 4 * i, 300], [420 + 4 * i, 300]]); await sleep(16); }
console.log('pinching', await st());
await k.up(); await sleep(100); console.log('pinch lifted', await st(), JSON.stringify(await evs(p)));
// release one finger first then move the other: no pan
await clearEvs(p);
await k.down([[300, 300], [420, 300]]); await sleep(50);
await k.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: 300, y: 300, id: 0 }] });
await sleep(30);
for (let i = 1; i <= 5; i++) { await k.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300, y: 300 + 10 * i, id: 0 }] }); await sleep(16); }
await k.up(); await sleep(100); console.log('one left', await st(), JSON.stringify(await evs(p)));
// three fingers
await clearEvs(p);
await k.down([[300, 300], [420, 300], [360, 250]]); await sleep(400); console.log('three', await st());
await k.up(); await sleep(100); console.log('three lifted', await st(), JSON.stringify(await evs(p)));
console.log('errors', p.errors);
await b.close();
