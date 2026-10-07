// Written for Rolehack by Lucas Ruiz, 2026-09-26.
//
// Key feedback: RolehackFront's RhFeedback (44a195c) for the web page -- a
// vibration, a mechanical keyboard's click, both or neither, whenever one of
// the interface's keys goes down.
//
// The vibrations carry information as well as texture, as on the phone: a
// firmer bump when a hold has done its work, and a detent as a flick crosses
// into one of OFFENSE's wedges.  They need navigator.vibrate and a motor, so
// a phone has them and a PC does not; there the setting simply does nothing.
//
// The click is the phone's: StavSounds' "Keyboard_Tactile_8" (CC0, see
// sounds/CREDITS.txt), played through Web Audio at the setting's volume with
// the same small pitch wobble, so a run of presses does not sound machine-made.

import * as P from './prefs.js';

const SAMPLE = 'sounds/key-tactile.ogg';
const mode = () => P.get('feedback');
const vibrates = () => ['vibrate', 'both'].includes(mode());
const clicks = () => ['click', 'both'].includes(mode());
const buzz = (ms) => { if (vibrates() && navigator.vibrate) navigator.vibrate(ms); };

let ctx = null;
let sample = null;
let loading = null;

// The context can be made before any gesture (it starts suspended, which is
// enough to decode); the first key press resumes it.
function load() {
  if (sample || loading || !window.AudioContext) return loading;
  ctx = ctx || new AudioContext({ latencyHint: 'interactive' });
  loading = fetch(SAMPLE).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b))
    .then((buf) => { sample = buf; })
    .catch((e) => { console.warn('key click', e); })   // a missing sample leaves the keys silent, never broken
    .finally(() => { loading = null; });
  return loading;
}

function click(volume) {
  if (!sample) { load(); return; }
  if (ctx.state === 'suspended') ctx.resume();
  const src = ctx.createBufferSource(), gain = ctx.createGain();
  src.buffer = sample;
  src.playbackRate.value = 0.96 + Math.random() * 0.08;
  gain.gain.value = volume;
  src.connect(gain).connect(ctx.destination);
  src.start();
}

const volume = () => Math.max(0, Math.min(1, (Number(P.get('clickVolume')) || 0) / 100));

/** A key going down: the press under the thumb, and the click. */
export function press() {
  buzz(12);
  if (clicks()) click(volume());
}

/** A key coming back up: the lighter half of the stroke. */
export function up() { buzz(5); }

/** A hold that has done its work: the fan, the drawer or the count row is up. */
export function held() { buzz(30); }

/** A flick crossing into a wedge: a detent under the thumb. */
export function detent() { buzz(8); }

/** A near miss the twin banks' guard swallowed, or a dimmed place of a layer
 *  that does nothing: a tick, lighter than a key's press, that says the tap
 *  was taken and went nowhere (the design's section 6). */
export function tick() { buzz(6); }

/** The settings' own sample, so a choice can be heard as it is made. */
export async function preview(vol) {
  if (!sample) await load();
  if (sample) click(vol / 100);
}

if (clicks()) load();
P.onChange((name) => { if (name === 'feedback' && clicks()) load(); });
