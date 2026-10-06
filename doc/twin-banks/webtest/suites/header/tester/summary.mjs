// Every result file: states run, failures, and the failures themselves.
import fs from 'node:fs';
const DIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/header/tester';
let total = 0, bad = 0;
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()) {
  const d = JSON.parse(fs.readFileSync(`${DIR}/${f}`, 'utf8'));
  const n = d.length, b = d.filter((r) => r.bad && r.bad.length);
  total += n; bad += b.length;
  console.log(`${f}: ${n} states, ${b.length} failing`);
  for (const r of b) console.log(`   ${r.name || r.tag}: ${r.bad.slice(0, 3).join(' | ')}`);
}
console.log(`total ${total} states, ${bad} failing`);
