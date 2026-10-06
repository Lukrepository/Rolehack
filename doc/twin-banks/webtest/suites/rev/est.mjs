// layout() with the page's own first-visit estimate against the true landscape, for common phones
import { layout } from '/home/user/Rolehack/win/web/layout.js';
const phones = [
  // name, screen short, long, portrait tab height, real landscape tab height
  ['iPhone 12-14 Safari', 390, 844, 664, 340],
  ['iPhone SE Safari', 375, 667, 553, 324],
  ['Pixel 7 Chrome 3-button', 412, 915, 787, 332],
  ['Pixel 7 Chrome gesture', 412, 915, 835, 332],
  ['Lucas 443x939 Chrome', 443, 939, 859, 363],
];
for (const [n, s, l, ph, lh] of phones) {
  const est = Math.max(1, s - Math.max(0, l - ph));
  const r1 = layout(s, ph, 'touch', { budget: { w: s, h: est, l } });
  const r2 = layout(s, ph, 'touch', { budget: { w: s, h: lh, l } });
  const k = (r) => r.spec.controls.find((c) => c.id === 'pad_k');
  console.log(`${n}: estimate h ${est} -> pad ${k(r1).w.toFixed(1)} ${r1.spec.fit.level}; true h ${lh} -> pad ${k(r2).w.toFixed(1)} ${r2.spec.fit.level}`);
}
