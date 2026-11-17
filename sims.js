/* Small animated schematics for the Publications page.
   Each one is drawn in a 240 x 160 logical space and scaled to its canvas.
   They are illustrations of each paper's setup and headline result, not plots of the papers' data. */
(function () {
  'use strict';

  var LW = 240, LH = 160;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FONT = 'Inter, -apple-system, Segoe UI, sans-serif';

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(a, b, v) { var x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function text(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = (o.weight || 500) + ' ' + (o.size || 8) + 'px ' + FONT;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillStyle = o.color || '#3a3d41';
    ctx.fillText(s, x, y);
  }

  function mount(canvas, draw, staticT) {
    var ctx = canvas.getContext('2d');
    var visible = false, raf = 0, start = performance.now();
    function fit() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.width * dpr * LH / LW));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ctx.setTransform(w / LW, 0, 0, h / LH, 0, 0);
    }
    function frame(now) {
      fit();
      ctx.clearRect(0, 0, LW, LH);
      draw(ctx, reduceMotion ? staticT : (now - start) / 1000);
    }
    function loop(now) { frame(now); if (visible && !reduceMotion) { raf = requestAnimationFrame(loop); } }
    function kick() { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) { kick(); }
      }, { rootMargin: '80px' }).observe(canvas);
    } else { visible = true; kick(); }
    window.addEventListener('resize', kick);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) { kick(); } });
    kick();
  }

  /* ------------------------------------------------------------------
     1. GRL 2026: where does the abstention network flag low confidence?
        Weak-to-moderate mid-level ascent (-10 to -5 hPa/hr) and
        CAPE tendency of 0-200 J/kg/hr.
     ------------------------------------------------------------------ */
  function simAbstain() {
    var X0 = 36, X1 = 232, Y0 = 20, Y1 = 128;
    var wMin = -20, wMax = 10, cMin = -200, cMax = 600;
    function px(w) { return X0 + (w - wMin) / (wMax - wMin) * (X1 - X0); }
    function py(c) { return Y1 - (c - cMin) / (cMax - cMin) * (Y1 - Y0); }
    var r = rng(11), pts = [];
    function gauss() { return (r() + r() + r() + r() - 2) * 1.7; }
    while (pts.length < 84) {
      var w = -4 + gauss() * 6.5, c = 130 + gauss() * 190;
      if (w < wMin + 1 || w > wMax - 1 || c < cMin + 20 || c > cMax - 20) { continue; }
      var inBox = w >= -10 && w <= -5 && c >= 0 && c <= 200;
      var near = w >= -12 && w <= -3 && c >= -60 && c <= 260;
      var abst = inBox ? r() < 0.86 : (near ? r() < 0.28 : r() < 0.04);
      pts.push({ x: px(w), y: py(c), a: abst, ph: r() * 6.28 });
    }
    for (var k = 0; k < 16; k++) {
      pts.push({ x: px(-10 + 0.4 + r() * 4.2), y: py(12 + r() * 176), a: r() < 0.88, ph: r() * 6.28 });
    }
    return function (ctx, t) {
      var T = t % 9;
      var box = smooth(1.2, 2.2, T) * (1 - smooth(8.2, 9, T));
      var flag = smooth(2.2, 3.4, T) * (1 - smooth(8.2, 9, T));
      ctx.fillStyle = '#fbfbf9'; ctx.fillRect(0, 0, LW, LH);

      // grid + axes
      ctx.strokeStyle = '#e7e5de'; ctx.lineWidth = 0.6;
      [-10, -5, 0].forEach(function (w) { ctx.beginPath(); ctx.moveTo(px(w), Y0); ctx.lineTo(px(w), Y1); ctx.stroke(); });
      [0, 200, 400].forEach(function (c) { ctx.beginPath(); ctx.moveTo(X0, py(c)); ctx.lineTo(X1, py(c)); ctx.stroke(); });
      ctx.strokeStyle = '#8a8d91'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X0, Y1); ctx.lineTo(X1, Y1); ctx.stroke();
      [-10, -5, 0].forEach(function (w) { text(ctx, (w < 0 ? '−' : '') + Math.abs(w), px(w), Y1 + 9, { align: 'center', size: 7.5, color: '#5f6368' }); });
      [0, 200, 400].forEach(function (c) { text(ctx, String(c), X0 - 3, py(c) + 2.6, { align: 'right', size: 7.5, color: '#5f6368' }); });
      text(ctx, 'mid-level ω (hPa/hr)', (X0 + X1) / 2, LH - 5, { align: 'center', size: 8, color: '#3a3d41' });
      ctx.save(); ctx.translate(9, (Y0 + Y1) / 2); ctx.rotate(-Math.PI / 2);
      text(ctx, 'dCAPE (J/kg/hr)', 0, 0, { align: 'center', size: 8, color: '#3a3d41' }); ctx.restore();

      // low-confidence regime
      var bx = px(-10), bw = px(-5) - px(-10), by = py(200), bh = py(0) - py(200);
      ctx.fillStyle = 'rgba(199,122,18,' + (0.16 * box) + ')'; ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = 'rgba(160,96,10,' + (0.95 * box) + ')'; ctx.lineWidth = 1.1; ctx.setLineDash([3, 2]);
      ctx.strokeRect(bx, by, bw, bh); ctx.setLineDash([]);

      // samples
      pts.forEach(function (p) {
        var f = p.a ? flag : 0;
        var rad = 2.1 + (p.a ? 0.5 * f * Math.sin(t * 2.4 + p.ph) : 0);
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 6.2832);
        ctx.fillStyle = 'rgba(26,95,158,' + (0.82 * (1 - f)) + ')'; ctx.fill();
        if (f > 0.02) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * f) + ')'; ctx.fill();
          ctx.strokeStyle = 'rgba(199,122,18,' + f + ')'; ctx.lineWidth = 1.2; ctx.stroke();
        }
      });

      // legend
      ctx.fillStyle = 'rgba(251,251,249,0.92)'; ctx.fillRect(X0 + 1, 3, X1 - X0 - 1, 13);
      ctx.beginPath(); ctx.arc(X0 + 8, 9.5, 2.3, 0, 6.2832); ctx.fillStyle = '#1a5f9e'; ctx.fill();
      text(ctx, 'confident', X0 + 13, 12.2, { size: 7.5 });
      ctx.beginPath(); ctx.arc(X0 + 62, 9.5, 2.3, 0, 6.2832); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#c77a12'; ctx.lineWidth = 1.2; ctx.stroke();
      text(ctx, 'network abstains', X0 + 67, 12.2, { size: 7.5 });
      if (box > 0.02) {
        ctx.globalAlpha = box;
        ctx.font = '700 7.5px ' + FONT;
        var lw = ctx.measureText('low confidence').width;
        ctx.fillStyle = 'rgba(251,251,249,0.9)'; ctx.fillRect(bx - 1, by - 11, lw + 5, 9.5);
        text(ctx, 'low confidence', bx + 1.5, by - 3.5, { size: 7.5, weight: 700, color: '#8c5b0a' });
        ctx.globalAlpha = 1;
      }
    };
  }

  /* ------------------------------------------------------------------
     2. Atmos. Environ. 2026: WRF overestimates offshore boundary layer
        height relative to field observations (TRACER-AQ).
     ------------------------------------------------------------------ */
  function simPBLH() {
    var SEA = 130;
    function obsY(x, t) { return 92 + Math.sin(x * 0.045 + t * 0.5) * 3 + Math.sin(x * 0.11 - t * 0.3) * 1.5; }
    function wrfY(x, t) { return 62 + Math.sin(x * 0.04 + t * 0.4 + 1) * 3.5 + Math.sin(x * 0.09 - t * 0.25) * 1.5; }
    return function (ctx, t) {
      var g = ctx.createLinearGradient(0, 0, 0, SEA);
      g.addColorStop(0, '#8fc3ee'); g.addColorStop(1, '#e3f2fc');
      ctx.fillStyle = g; ctx.fillRect(0, 0, LW, SEA);
      var s = ctx.createLinearGradient(0, SEA, 0, LH);
      s.addColorStop(0, '#2e86be'); s.addColorStop(1, '#1b5a92');
      ctx.fillStyle = s; ctx.fillRect(0, SEA, LW, LH - SEA);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.8;
      for (var i = 0; i < 6; i++) {
        var wx = 20 + i * 40 + Math.sin(t * 1.2 + i) * 5, wy = SEA + 8 + (i % 3) * 7 + Math.sin(t * 1.8 + i) * 1.2;
        ctx.beginPath(); ctx.moveTo(wx - 8, wy); ctx.quadraticCurveTo(wx, wy - 2.5, wx + 8, wy); ctx.stroke();
      }

      // overestimate: band between observed and modelled PBL top
      var x;
      ctx.beginPath();
      for (x = 16; x <= LW; x += 4) { if (x === 16) { ctx.moveTo(x, wrfY(x, t)); } else { ctx.lineTo(x, wrfY(x, t)); } }
      for (x = LW; x >= 16; x -= 4) { ctx.lineTo(x, obsY(x, t)); }
      ctx.closePath(); ctx.fillStyle = 'rgba(214,84,18,0.16)'; ctx.fill();

      // observed marine boundary layer (haze below the observed top)
      ctx.beginPath(); ctx.moveTo(16, SEA);
      for (x = 16; x <= LW; x += 4) { ctx.lineTo(x, obsY(x, t)); }
      ctx.lineTo(LW, SEA); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fill();

      ctx.strokeStyle = '#c94f10'; ctx.lineWidth = 2; ctx.beginPath();
      for (x = 16; x <= LW; x += 4) { if (x === 16) { ctx.moveTo(x, wrfY(x, t)); } else { ctx.lineTo(x, wrfY(x, t)); } }
      ctx.stroke();
      ctx.strokeStyle = '#134a7c'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); ctx.beginPath();
      for (x = 16; x <= LW; x += 4) { if (x === 16) { ctx.moveTo(x, obsY(x, t)); } else { ctx.lineTo(x, obsY(x, t)); } }
      ctx.stroke(); ctx.setLineDash([]);

      text(ctx, 'WRF', 22, wrfY(22, t) - 7, { size: 9, weight: 700, color: '#a8400b' });
      text(ctx, 'Observed', 22, obsY(22, t) + 11, { size: 9, weight: 700, color: '#134a7c' });

      // bias arrow
      var ax = 196, ya = wrfY(ax, t) + 2.5, yb = obsY(ax, t) - 2.5;
      ctx.strokeStyle = '#a8400b'; ctx.fillStyle = '#a8400b'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(ax, ya + 3); ctx.lineTo(ax, yb - 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, ya); ctx.lineTo(ax - 3, ya + 5); ctx.lineTo(ax + 3, ya + 5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ax, yb); ctx.lineTo(ax - 3, yb - 5); ctx.lineTo(ax + 3, yb - 5); ctx.closePath(); ctx.fill();
      text(ctx, 'too deep', ax - 5, (ya + yb) / 2 + 3, { size: 8, weight: 700, color: '#a8400b', align: 'right' });

      // height axis
      ctx.strokeStyle = 'rgba(28,29,31,0.55)'; ctx.fillStyle = 'rgba(28,29,31,0.55)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(9, SEA); ctx.lineTo(9, 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, 9); ctx.lineTo(6.5, 15); ctx.lineTo(11.5, 15); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.translate(6.5, 122); ctx.rotate(-Math.PI / 2); text(ctx, 'height', 0, 0, { size: 7.5, color: 'rgba(28,29,31,0.7)' }); ctx.restore();

      // boat + rising sounding balloon
      var bx = 118, T = (t % 8) / 8;
      ctx.fillStyle = '#f4f4f0'; ctx.beginPath(); ctx.moveTo(bx - 11, SEA - 3); ctx.lineTo(bx + 11, SEA - 3); ctx.lineTo(bx + 7, SEA + 2); ctx.lineTo(bx - 8, SEA + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5f6368'; ctx.fillRect(bx - 3, SEA - 8, 6, 5);
      var rise = smooth(0.05, 0.9, T), by = lerp(SEA - 10, 16, rise), bxx = bx + rise * 34;
      var alpha = 1 - smooth(0.9, 1, T);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(28,29,31,0.5)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(bxx, by + 4); ctx.lineTo(bxx, by + 10); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#5f6368'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(bxx, by, 4, 0, 6.2832); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5f6368'; ctx.fillRect(bxx - 1.3, by + 10, 2.6, 2.6);
      ctx.globalAlpha = 1;
      // the sounding marks the observed top as it crosses it
      var oy = obsY(bxx, t), d = by + 11 - oy;
      if (d < 0 && d > -30) {
        var k = -d / 30;
        ctx.strokeStyle = 'rgba(19,74,124,' + (1 - k) + ')'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(bxx, oy, 2 + k * 9, 0, 6.2832); ctx.stroke();
      }
    };
  }

  /* ------------------------------------------------------------------
     3. J. Nepal Phys. Soc. 2022: post-monsoon depth to groundwater over
        the Morang lowlands. 126 surveyed wells, interpolated with IDW.
        Shallowest in the south-west, deepest in the north and mid-east.
     ------------------------------------------------------------------ */
  function simGroundwater() {
    var poly = [[50, 14], [92, 9], [128, 20], [137, 54], [150, 94], [143, 138], [98, 150], [54, 145], [30, 121], [37, 78], [28, 44]];
    function inside(x, y) {
      var c = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) { c = !c; }
      }
      return c;
    }
    function depth(x, y) {
      var nx = (x - 28) / 122, ny = (y - 9) / 141;
      return 7 + 12.5 * Math.pow(clamp(1 - ny, 0, 1), 1.5)
        + 8 * Math.exp(-((nx - 0.8) * (nx - 0.8) + (ny - 0.5) * (ny - 0.5)) / 0.03)
        - 3.2 * Math.exp(-((nx - 0.22) * (nx - 0.22) + (ny - 0.84) * (ny - 0.84)) / 0.06);
    }
    var stops = [[226, 240, 249], [158, 202, 232], [86, 150, 204], [34, 98, 160], [12, 52, 102]];
    function ramp(d) {
      var u = clamp((d - 5) / 15, 0, 1) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(u)), f = u - i;
      var a = stops[i], b = stops[i + 1];
      return 'rgb(' + Math.round(lerp(a[0], b[0], f)) + ',' + Math.round(lerp(a[1], b[1], f)) + ',' + Math.round(lerp(a[2], b[2], f)) + ')';
    }
    var r = rng(5), wells = [];
    while (wells.length < 63) {
      var x = 28 + r() * 122, y = 9 + r() * 141;
      if (inside(x, y) && inside(x + 3, y) && inside(x - 3, y) && inside(x, y + 3) && inside(x, y - 3)) { wells.push({ x: x, y: y, d: depth(x, y) }); }
    }
    // interpolated surface, rendered once
    var CELL = 2, field = document.createElement('canvas');
    field.width = LW * 2; field.height = LH * 2;
    var fc = field.getContext('2d'); fc.scale(2, 2);
    for (var gy = 8; gy < 152; gy += CELL) { for (var gx = 26; gx < 152; gx += CELL) {
      { fc.fillStyle = ramp(depth(gx + CELL / 2, gy + CELL / 2)); fc.fillRect(gx, gy, CELL + 0.3, CELL + 0.3); }
    } }
    function outline(ctx) {
      ctx.beginPath(); poly.forEach(function (p, i) { if (i) { ctx.lineTo(p[0], p[1]); } else { ctx.moveTo(p[0], p[1]); } }); ctx.closePath();
    }
    return function (ctx, t) {
      var T = t % 11;
      var nShown = Math.floor(smooth(0.3, 3.6, T) * wells.length);
      var surf = smooth(3.8, 5.6, T) * (1 - smooth(10, 11, T));
      var all = 1 - smooth(10.2, 11, T);
      ctx.fillStyle = '#fbfbf9'; ctx.fillRect(0, 0, LW, LH);

      outline(ctx); ctx.fillStyle = '#f0ede4'; ctx.fill();
      ctx.save(); outline(ctx); ctx.clip(); ctx.globalAlpha = surf; ctx.drawImage(field, 0, 0, LW, LH); ctx.restore();
      outline(ctx); ctx.strokeStyle = '#3a3d41'; ctx.lineWidth = 1.1; ctx.stroke();

      ctx.globalAlpha = all;
      for (var i = 0; i < nShown; i++) {
        var w = wells[i], fresh = i >= nShown - 2 && T < 3.6;
        ctx.beginPath(); ctx.arc(w.x, w.y, fresh ? 3 : 1.9, 0, 6.2832);
        ctx.fillStyle = ramp(w.d); ctx.fill();
        ctx.strokeStyle = 'rgba(28,29,31,' + lerp(0.9, 0.55, surf) + ')'; ctx.lineWidth = 0.6; ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // north arrow
      ctx.fillStyle = '#5f6368'; ctx.beginPath(); ctx.moveTo(14, 12); ctx.lineTo(10.5, 21); ctx.lineTo(17.5, 21); ctx.closePath(); ctx.fill();
      text(ctx, 'N', 14, 30, { align: 'center', size: 8, weight: 700, color: '#5f6368' });

      // legend
      var lx = 168, ly = 40, lh = 62;
      text(ctx, 'Depth to water', lx - 2, 18, { size: 8, weight: 700, color: '#1c1d1f' });
      text(ctx, 'post-monsoon', lx - 2, 28, { size: 7.5, color: '#5f6368' });
      for (var k = 0; k < lh; k++) { ctx.fillStyle = ramp(5 + 15 * k / (lh - 1)); ctx.fillRect(lx, ly + k, 9, 1.2); }
      ctx.strokeStyle = '#8a8d91'; ctx.lineWidth = 0.6; ctx.strokeRect(lx, ly, 9, lh);
      text(ctx, '5 m  shallow', lx + 13, ly + 6, { size: 7.5 });
      text(ctx, '20 m+  deep', lx + 13, ly + lh, { size: 7.5 });
      var shown = Math.round(nShown / wells.length * 126);
      text(ctx, shown + ' / 126 wells', lx - 2, 122, { size: 8, weight: 600, color: '#134a7c' });
      ctx.globalAlpha = 0.35 + 0.65 * surf;
      text(ctx, surf > 0.05 ? 'IDW interpolation' : 'field survey', lx - 2, 133, { size: 7.5, color: '#5f6368' });
      ctx.globalAlpha = 1;
    };
  }

  /* ------------------------------------------------------------------
     4. PACE OCI NO2 vs Pandora, TROPOMI and TEMPO over CONUS.
        TEMPO is geostationary (fixed, scanning); PACE and TROPOMI are
        polar orbiters (overpasses); Pandora looks up from the ground.
     ------------------------------------------------------------------ */
  function simNO2() {
    var CX = 120, CY = 338, R = 222;
    var stations = [58, 92, 128, 162, 194];
    function surfY(x) { return CY - Math.sqrt(R * R - (x - CX) * (x - CX)); }
    var r = rng(3), stars = [];
    for (var i = 0; i < 42; i++) { stars.push([r() * LW, r() * 100, 0.3 + r() * 0.6]); }
    var leo = [
      { name: 'PACE', alt: 34, period: 9, phase: 0, color: '#f08a4b' },
      { name: 'TROPOMI', alt: 52, period: 11.5, phase: 0.55, color: '#5fd08a' }
    ];
    function sat(ctx, x, y, color, ang) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = '#7fb1ea'; ctx.fillRect(-10, -1.6, 6, 3.2); ctx.fillRect(4, -1.6, 6, 3.2);
      ctx.fillStyle = color; ctx.fillRect(-3.4, -3, 6.8, 6);
      ctx.restore();
    }
    return function (ctx, t) {
      var g = ctx.createLinearGradient(0, 0, 0, LH);
      g.addColorStop(0, '#060b18'); g.addColorStop(0.6, '#0c1a36'); g.addColorStop(1, '#17335f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);
      stars.forEach(function (s) { ctx.fillStyle = 'rgba(255,255,255,' + s[2] + ')'; ctx.fillRect(s[0], s[1], 1, 1); });

      // Earth limb
      var eg = ctx.createRadialGradient(CX, CY, R * 0.82, CX, CY, R);
      eg.addColorStop(0, '#1f5f48'); eg.addColorStop(0.85, '#2f7d59'); eg.addColorStop(1, '#3d93b8');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(CX, CY, R, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(140,200,255,0.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(CX, CY, R + 1.5, 0, 6.2832); ctx.stroke();
      text(ctx, 'CONUS', CX, LH - 7, { align: 'center', size: 8, weight: 600, color: 'rgba(225,240,255,0.75)' });

      // TEMPO: geostationary, fixed position, scanning east to west
      var tx = 214, ty = 20;
      var scan = (t % 7) / 7, sx = lerp(204, 40, scan), sy = surfY(sx);
      var cone = ctx.createLinearGradient(tx, ty, sx, sy);
      cone.addColorStop(0, 'rgba(110,170,255,0.45)'); cone.addColorStop(1, 'rgba(110,170,255,0.08)');
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(sx - 9, surfY(sx - 9)); ctx.lineTo(sx + 9, surfY(sx + 9)); ctx.closePath(); ctx.fill();
      sat(ctx, tx, ty, '#6eaaff', 0.5);
      text(ctx, 'TEMPO', tx - 12, ty - 1, { align: 'right', size: 8, weight: 700, color: '#9cc4ff' });
      text(ctx, 'geostationary', tx - 12, ty + 8, { align: 'right', size: 7, color: 'rgba(156,196,255,0.8)' });

      // polar orbiters: overpasses
      var beams = [sx];
      leo.forEach(function (s) {
        var u = ((t / s.period + s.phase) % 1), a = lerp(-2.25, -0.89, u), rr = R + s.alt;
        var x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr;
        ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 0.7; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.arc(CX, CY, rr, -2.3, -0.84); ctx.stroke(); ctx.setLineDash([]);
        var gxp = CX + Math.cos(a) * R, gyp = CY + Math.sin(a) * R;
        ctx.strokeStyle = s.color; ctx.globalAlpha = 0.55; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(gxp, gyp); ctx.stroke(); ctx.globalAlpha = 1;
        sat(ctx, x, y, s.color, a + Math.PI / 2);
        text(ctx, s.name, clamp(x, 26, LW - 60), y - 7, { align: 'center', size: 8, weight: 700, color: s.color });
        beams.push(gxp);
      });

      // Pandora ground spectrometers
      stations.forEach(function (x) {
        var y = surfY(x), hit = 0;
        beams.forEach(function (b) { hit = Math.max(hit, 1 - Math.min(1, Math.abs(b - x) / 9)); });
        var up = ctx.createLinearGradient(0, y - 20, 0, y);
        up.addColorStop(0, 'rgba(214,140,255,0)'); up.addColorStop(1, 'rgba(214,140,255,0.55)');
        ctx.fillStyle = up; ctx.fillRect(x - 1.2, y - 20, 2.4, 20);
        if (hit > 0) { ctx.strokeStyle = 'rgba(255,255,255,' + hit + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 3 + hit * 4, 0, 6.2832); ctx.stroke(); }
        ctx.fillStyle = '#d68cff'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 6.2832); ctx.fill();
      });
      text(ctx, 'Pandora', 6, surfY(58) + 16, { size: 7.5, weight: 600, color: '#e0b0ff' });
    };
  }

  var registry = {
    abstain: [simAbstain, 5],
    pblh: [simPBLH, 3],
    groundwater: [simGroundwater, 8],
    no2: [simNO2, 2.5]
  };

  function init() {
    document.querySelectorAll('canvas[data-sim]').forEach(function (c) {
      var entry = registry[c.getAttribute('data-sim')];
      if (entry) { mount(c, entry[0](), entry[1]); }
    });
  }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(init, init); } else { init(); }
})();
