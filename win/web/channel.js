// Written for Rolehack by Lucas Ruiz, 2026-10-06.
//
// The channel this page runs in, read from its own path.  The live page is at
// the site's root (lukrepository.github.io/Rolehack/, or a local server's /);
// the preview channel is the same site under /preview/ (the release plan's
// D34, Lucas, 2026-10-06): a build goes there first, to be tried on a phone
// before it goes live.  Both share one origin, and a browser keeps storage by
// origin, so everything a page keeps is named by its channel: the IndexedDB
// database the saves live in (the IDBFS mount names it), the prefix of the
// settings in localStorage, the lock that lets one page play at a time, and
// the service worker's cache prefix (sw.js reads its own path the same way).
// A preview build can therefore never touch the games or settings of the
// live page, and the two can be open side by side.  One build serves both
// channels; build.sh only renames the preview copy's manifest and title.

export const CHANNEL = /\/preview\/(index\.html)?$/.test(location.pathname) ? 'preview' : 'live';
export const PREVIEW = CHANNEL === 'preview';
export const PREFS_PREFIX = PREVIEW ? 'rhp.' : 'rh.';
export const SAVE_DB = PREVIEW ? '/save-preview' : '/save';     // the IDBFS mount point, which names the database
export const LOCK = PREVIEW ? 'rolehack-preview' : 'rolehack-game';
export const TITLE = PREVIEW ? 'Rolehack preview' : 'Rolehack';

// Debug (wizard) mode on the preview channel only (Lucas, 2026-10-09: "wizard
// mode on preview only").  The core lets a player into it only when sysconf's
// WIZARDS names their user (set_playmode, authorize_wizard_mode), and the
// built sysconf says root and games (sys/libnh/sysconf), which a browser never
// is.  So the preview page opens the line to everyone before main() runs
// (web.js), and a tester asks for it with OPTIONS=playmode:debug in Settings ->
// Your option lines; the live page keeps the file as built, and refuses.
export function sysconfFor(text, preview = PREVIEW) {
  return preview ? String(text).replace(/^WIZARDS=.*$/m, 'WIZARDS=*') : text;
}

// The save era (the release plan's B2, first piece; Lucas, 2026-10-06).  A
// build's saves live in a store named for its save signature (winshim.c
// web_save_signature: what check_version() compares in a save, plus the
// struct-size bytes), except the first era's, which keep the stores above.
// So a build whose format differs never opens, recovers or re-stamps an older
// game; the older game stays where it was, for the build that wrote it
// (web.js mountSaves).  FIRST_ERA is the signature of the builds up to the
// first new-core one; empty, every signature counts as the first era.
// the 5.0.0 web build (measured 2026-10-07 on the build of web c694b4c07 plus this change):
// version 5.0.0.0, feature bits 00060040, entity count 221e1184, then the 80 struct-size bytes
export const FIRST_ERA = '05000000.00060040.221e1184.000204040804010102020408010401020408040402020104081818b040041410725c041c2c800824240020c828100c0c1801040404207c84045030100808081020180c080c0700000000000000000000';
export function eraTag(sig) {
  // eight hex digits of a 32-bit FNV-1a of the signature: a stable, short store name
  let h = 0x811c9dc5;
  for (const c of String(sig || '')) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
export function saveDbFor(sig) {
  const base = PREVIEW ? '/save-preview' : '/save';
  return !FIRST_ERA || !sig || sig === FIRST_ERA ? base : `${base}-${eraTag(sig)}`;
}
