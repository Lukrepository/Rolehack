// Written for Rolehack by Lucas Ruiz, 2026-10-07.
//
// The channel and the save era (channel.js), on node's own test runner:
//
//   node --test win/web/test/
//
// channel.js reads the page's path at load, so each case sets a stand-in
// `location` and imports the module afresh (a query on the import keeps the
// loader from reusing the last one).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let n = 0;
async function channelAt(pathname) {
  globalThis.location = { pathname };
  return import(`../channel.js?case=${++n}`);
}

test('the live page and the preview channel keep their own names', async () => {
  const live = await channelAt('/Rolehack/');
  assert.equal(live.CHANNEL, 'live');
  assert.equal(live.PREFS_PREFIX, 'rh.');
  assert.equal(live.SAVE_DB, '/save');
  assert.equal(live.LOCK, 'rolehack-game');
  const prev = await channelAt('/Rolehack/preview/');
  assert.equal(prev.CHANNEL, 'preview');
  assert.equal(prev.PREFS_PREFIX, 'rhp.');
  assert.equal(prev.SAVE_DB, '/save-preview');
  assert.equal(prev.LOCK, 'rolehack-preview');
  assert.equal(prev.TITLE, 'Rolehack preview');
  // index.html spelled out, and a local server's root
  assert.equal((await channelAt('/Rolehack/preview/index.html')).CHANNEL, 'preview');
  assert.equal((await channelAt('/')).CHANNEL, 'live');
  // a path that merely contains the word is not the channel
  assert.equal((await channelAt('/preview-notes/')).CHANNEL, 'live');
});

test('the save era: the first era keeps the store, a later one gets its own', async () => {
  const c = await channelAt('/Rolehack/');
  assert.ok(c.FIRST_ERA.length > 20, 'the first era is recorded');
  assert.equal(c.saveDbFor(c.FIRST_ERA), '/save');
  assert.equal(c.saveDbFor(''), '/save', 'no signature: the first store');
  const other = c.FIRST_ERA.replace(/^05/, '06');
  assert.equal(c.saveDbFor(other), `/save-${c.eraTag(other)}`);
  assert.notEqual(c.eraTag(other), c.eraTag(c.FIRST_ERA));
  assert.match(c.eraTag(other), /^[0-9a-f]{8}$/);
  // stable: the same signature always gives the same tag
  assert.equal(c.eraTag(other), c.eraTag(other));
  const p = await channelAt('/Rolehack/preview/');
  assert.equal(p.saveDbFor(p.FIRST_ERA), '/save-preview');
  assert.equal(p.saveDbFor(other), `/save-preview-${p.eraTag(other)}`);
});

test('the first era is the 5.0.0 web build: version 5.0.0.0, its feature bits and entity count', async () => {
  const c = await channelAt('/Rolehack/');
  assert.match(c.FIRST_ERA, /^05000000\.00060040\.221e1184\.[0-9a-f]{160}$/);
});

test('wizard mode: the preview channel opens sysconf WIZARDS to everyone, the live page does not', async () => {
  const conf = '# WIZARDS=root games, in a comment, stays\nWIZARDS=root games\nEXPLORERS=*\n';
  const live = await channelAt('/Rolehack/');
  assert.equal(live.sysconfFor(conf), conf);
  const prev = await channelAt('/Rolehack/preview/');
  assert.equal(prev.sysconfFor(conf), '# WIZARDS=root games, in a comment, stays\nWIZARDS=*\nEXPLORERS=*\n');
  // the file the build embeds: one WIZARDS line, which preview opens and live keeps
  const built = readFileSync(new URL('../../../sys/libnh/sysconf', import.meta.url), 'utf8');
  assert.equal(built.match(/^WIZARDS=.*$/gm).length, 1);
  assert.notEqual(built.match(/^WIZARDS=.*$/m)[0], 'WIZARDS=*', 'the built file does not already let everyone in');
  assert.equal(prev.sysconfFor(built).match(/^WIZARDS=.*$/m)[0], 'WIZARDS=*');
  assert.equal(live.sysconfFor(built), built);
});
