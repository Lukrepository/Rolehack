import { launch } from '../rev/common.mjs';
import { pixdiff } from '../rev/pixdiff.mjs';
const b = await launch();
const [, , ...pairs] = process.argv;
for (let i = 0; i < pairs.length; i += 2) console.log(pairs[i].split('/').pop(), pairs[i + 1].split('/').pop(), JSON.stringify(await pixdiff(b, pairs[i], pairs[i + 1])));
await b.close();
