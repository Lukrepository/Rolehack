return await p.evaluate(() => {
  const R = (id) => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return [+r.x.toFixed(2), +r.y.toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2), getComputedStyle(e).display]; };
  const G = globalThis.__bt.geom;
  return { glass: R('glass'), bands: R('bands'), msg: R('msgband'), stat: R('statband'), chips: R('chips'), lamp: R('morelamp'), map: R('map'), tube: R('tube'),
    geom: { glass: G.glass, map: G.map, msgBand: G.msgBand, statusBand: G.statusBand, msgRows: G.msgRows, cell: G.cell, over: G.headerOver, ts: G.textScale, slh: G.statusLinesH },
    bm: globalThis.__bt.bandMetrics(), view: { T: globalThis.__bt.view.T, left: globalThis.__bt.view.left, top: globalThis.__bt.view.top }, dpr: devicePixelRatio, zf: localStorage.getItem('rh.zoomFactor'), zoom: localStorage.getItem('rh.zoom') };
});
