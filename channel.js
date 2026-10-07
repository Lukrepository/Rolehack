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
