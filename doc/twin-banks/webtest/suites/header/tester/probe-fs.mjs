import { launch, newCtx, openPage, sleep, STATE } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, state: STATE });
const p = await openPage(ctx);
await sleep(3000);
console.log(await p.evaluate(() => {
  const FS = globalThis.__T.M.FS, out = {};
  for (const d of ['/', '/save', '/home/web_user']) { try { out[d] = FS.readdir(d); } catch (e) { out[d] = String(e); } }
  try { out.cwd = FS.cwd(); } catch (e) {}
  for (const f of ['/sysconf', '/save/sysconf', 'sysconf']) { try { out[f] = FS.readFile(f, { encoding: 'utf8' }).slice(0, 300); } catch (e) { out[f] = 'none'; } }
  return JSON.stringify(out, null, 1);
}));
await b.close();
