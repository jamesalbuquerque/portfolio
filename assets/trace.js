/* Hero logo: traced once with a Figma-style pen tool, each part filling as its path closes. */
(function () {
  var svg = document.getElementById('heroMark');
  if (!svg || !svg.getScreenCTM || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var NS = 'http://www.w3.org/2000/svg';
  var TRACE = 3.2, FILL = 0.8, GAP = 0.45, SEL = 1.4, START = 0.5;
  var order = ['r-stem', 'r-bowl', 'r-wedge'];
  var ov = document.createElementNS(NS, 'g'); svg.appendChild(ov);
  function mk(tag, cls) { var e = document.createElementNS(NS, tag); if (cls) e.setAttribute('class', cls); ov.appendChild(e); return e; }
  function set(e, o) { for (var k in o) e.setAttribute(k, o[k]); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function parse(d) {
    var tok = d.match(/[MHVLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi), i = 0, cmd, cur = [0, 0], start = [0, 0], segs = [];
    function n() { return parseFloat(tok[i++]); }
    while (i < tok.length) {
      if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
      if (cmd === 'M') { cur = [n(), n()]; start = cur.slice(); cmd = 'L'; continue; }
      var s;
      if (cmd === 'H') s = { to: [n(), cur[1]] };
      else if (cmd === 'V') s = { to: [cur[0], n()] };
      else if (cmd === 'L') s = { to: [n(), n()] };
      else if (cmd === 'C') s = { c1: [n(), n()], c2: [n(), n()], to: [n(), n()] };
      else s = { to: start.slice() };
      s.from = cur; segs.push(s); cur = s.to;
      if (cmd === 'Z') break;
    }
    var probe = mk('path'), acc = 0;
    segs.forEach(function (s) {
      probe.setAttribute('d', 'M' + s.from + ' ' + (s.c1 ? 'C' + s.c1 + ' ' + s.c2 + ' ' + s.to : 'L' + s.to));
      s.a = acc; acc += probe.getTotalLength(); s.b = acc;
    });
    ov.removeChild(probe);
    return segs;
  }

  var parts = order.map(function (cls, i) {
    var path = svg.querySelector('.' + cls), d = path.getAttribute('d');
    var guide = mk('path', 'guide'); guide.setAttribute('d', d);
    var L = guide.getTotalLength(); guide.style.strokeDasharray = L + ' ' + L;
    var segs = parse(d);
    var p = { path: path, guide: guide, L: L, segs: segs, box: path.getBBox(), anchors: segs.map(function () { return mk('rect', 'anchor'); }) };
    p.t0 = START + i * (TRACE + FILL + GAP); p.t1 = p.t0 + TRACE; p.t2 = p.t1 + FILL;
    path.style.fillOpacity = 0;
    return p;
  });
  var h1 = mk('line', 'handle'), h2 = mk('line', 'handle'), k1 = mk('circle', 'knob'), k2 = mk('circle', 'knob');
  var box = mk('rect', 'guide'), tag = mk('rect', 'sel-tag'), label = mk('text', 'sel-label');
  var all = parts.reduce(function (b, p) { return { x0: Math.min(b.x0, p.box.x), y0: Math.min(b.y0, p.box.y), x1: Math.max(b.x1, p.box.x + p.box.width), y1: Math.max(b.y1, p.box.y + p.box.height) }; }, { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
  var SELALL = parts[2].t2 + 0.3, DONE = SELALL + SEL;

  function render(t) {
    var m = svg.getScreenCTM(), k = m ? 1 / Math.hypot(m.a, m.b) : 1, A = 7 * k, R = 3.2 * k, active = null;
    parts.forEach(function (p, i) {
      var drawn = ease(clamp((t - p.t0) / TRACE)) * p.L, on = t >= p.t0 && t < (i < 2 ? parts[i + 1].t0 : SELALL);
      if (on) active = p;
      p.drawn = drawn;
      p.path.style.fillOpacity = clamp((t - p.t1) / FILL);
      p.guide.style.strokeDashoffset = p.L - drawn;
      p.guide.style.opacity = on ? 1 : 0; p.guide.setAttribute('stroke-width', 1.5 * k);
      p.segs.forEach(function (s, j) {
        var a = p.anchors[j], pt = s.from;
        set(a, { x: pt[0] - A / 2, y: pt[1] - A / 2, width: A, height: A, 'stroke-width': k });
        a.style.opacity = on && drawn >= s.a - .01 ? 1 : 0;
      });
    });
    var showH = false;
    if (active && t < active.t1) {
      var s = active.segs.filter(function (s) { return active.drawn >= s.a && active.drawn <= s.b; })[0];
      if (s && s.c1) {
        showH = true;
        set(h1, { x1: s.from[0], y1: s.from[1], x2: s.c1[0], y2: s.c1[1], 'stroke-width': k });
        set(h2, { x1: s.to[0], y1: s.to[1], x2: s.c2[0], y2: s.c2[1], 'stroke-width': k });
        set(k1, { cx: s.c1[0], cy: s.c1[1], r: R, 'stroke-width': k }); set(k2, { cx: s.c2[0], cy: s.c2[1], r: R, 'stroke-width': k });
      }
    }
    [h1, h2, k1, k2].forEach(function (e) { e.style.opacity = showH ? 1 : 0; });
    var selOn = t >= SELALL && t < DONE, b = selOn ? { x: all.x0, y: all.y0, w: all.x1 - all.x0, h: all.y1 - all.y0 } : (active && t >= active.t1) ? { x: active.box.x, y: active.box.y, w: active.box.width, h: active.box.height } : null;
    [box, tag, label].forEach(function (e) { e.style.opacity = b ? 1 : 0; });
    if (b) {
      var txt = Math.round(b.w) + ' × ' + Math.round(b.h), tw = txt.length * 5.6 * k + 10 * k;
      set(box, { x: b.x, y: b.y, width: b.w, height: b.h, 'stroke-width': k });
      set(tag, { x: b.x + b.w / 2 - tw / 2, y: b.y + b.h + 5 * k, width: tw, height: 15 * k, rx: k });
      set(label, { x: b.x + b.w / 2, y: b.y + b.h + 15.8 * k, 'font-size': 10 * k, 'text-anchor': 'middle' });
      label.textContent = txt;
    }
  }

  var t0 = null;
  function frame(now) {
    if (t0 === null) t0 = now;
    var t = (now - t0) / 1000;
    render(Math.min(t, DONE + 0.01));
    if (t <= DONE) requestAnimationFrame(frame); else ov.parentNode && ov.parentNode.removeChild(ov);
  }
  render(0);
  requestAnimationFrame(frame);
})();
