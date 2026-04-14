// frontend/js/renderer.js
// Motor de renderizado — Cuadrícula isométrica Z-arriba, escala dinámica

const Renderer = (() => {

  let canvas, ctx;
  let W, H;
  let origin;
  let STEP = 40;   // Tamaño de celda — se recalcula en resize()

  const COLOR = {
    bg:          '#0a0f1a',
    grid:        'rgba(200, 220, 255, 0.20)',
    gridCenter:  'rgba(200, 220, 255, 0.45)',
    axisX:       '#ff3333',
    axisY:       '#00dd66',
    axisZ:       '#3399ff',
    baseCircle:  'rgba(0, 255, 136, 0.12)',
    baseStroke:  '#00ff88',
    segment:     '#00ff88',
    segGlow:     'rgba(0, 255, 136, 0.35)',
    joint:       '#ffffff',
    jointStroke: '#00ff88',
    tip:         '#ff6b35',
    tipGlow:     'rgba(255, 107, 53, 0.45)',
    shadow:      'rgba(0,0,0,0)',
  };

  const N      = 8;                                      // Celdas por lado
  const COS30  = Math.cos(30 * Math.PI / 180);           // 0.866
  const SIN30  = Math.sin(30 * Math.PI / 180);           // 0.500

  // ─── Proyección isométrica Z-arriba ───────────────────────────────────────
  // x = derecha, y = profundidad (hacia el espectador), z = arriba
  function iso(x, y, z) {
    return {
      x: origin.x + (x - y) * COS30,
      y: origin.y - z + (x + y) * SIN30
    };
  }

  // Adapta coordenadas del backend (bx, by=altura, bz=profundidad) → pantalla
  function isoB(bx, by, bz) {
    return iso(bx, bz, by);
  }

  // ─── Init / resize ────────────────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx    = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', () => { resize(); render(_lastPts); });
  }

  let _lastPts = null;

  function resize() {
    const wrap = canvas.parentElement;
    W = wrap.clientWidth  || 600;
    H = wrap.clientHeight || 480;
    canvas.width  = W;
    canvas.height = H;

    // Paso de celda: usa el 80% del lado más corto dividido entre 2*N
    STEP = Math.max(24, Math.floor(Math.min(W, H) * 0.80 / (2 * N)));

    // Origen: centro horizontal, 60% vertical
    origin = { x: W * 0.50, y: H * 0.60 };
  }

  // ─── Cuadrícula ───────────────────────────────────────────────────────────
  function drawGrid() {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = -N; i <= N; i++) {
      const center = i === 0;
      // Líneas paralelas al eje X (Y varía)
      const a1 = iso(-N * STEP, i * STEP, 0);
      const a2 = iso( N * STEP, i * STEP, 0);
      ctx.beginPath();
      ctx.moveTo(a1.x, a1.y);
      ctx.lineTo(a2.x, a2.y);
      ctx.strokeStyle = center ? COLOR.gridCenter : COLOR.grid;
      ctx.lineWidth   = center ? 1.0 : 0.5;
      ctx.stroke();
      // Líneas paralelas al eje Y (X varía)
      const b1 = iso(i * STEP, -N * STEP, 0);
      const b2 = iso(i * STEP,  N * STEP, 0);
      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.strokeStyle = center ? COLOR.gridCenter : COLOR.grid;
      ctx.lineWidth   = center ? 1.0 : 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─── Ejes ─────────────────────────────────────────────────────────────────
  function drawAxes() {
    const L  = N * STEP + STEP * 0.6;   // Longitud de cada semi-eje
    const Lz = L * 0.85;                // Z hacia arriba
    const Lzd= L * 0.35;               // Z hacia abajo
    const O  = iso(0, 0, 0);

    ctx.save();
    ctx.lineWidth = 2.2;
    ctx.lineCap   = 'round';

    // Eje X (rojo)
    _axis(O, iso( L, 0, 0), iso(-L, 0, 0), COLOR.axisX, 'X', '-X',
          iso( L + STEP * 0.55, 0, 0), iso(-L - STEP * 0.55, 0, 0));

    // Eje Y (verde)
    _axis(O, iso(0,  L, 0), iso(0, -L, 0), COLOR.axisY, 'Y', '-Y',
          iso(0,  L + STEP * 0.55, 0), iso(0, -L - STEP * 0.55, 0));

    // Eje Z (azul)
    _axisZ(O, iso(0, 0, Lz), iso(0, 0, -Lzd), COLOR.axisZ,
           iso(0, 0, Lz + STEP * 0.5), iso(0, 0, -Lzd - STEP * 0.45));

    // Punto origen
    ctx.beginPath();
    ctx.arc(O.x, O.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  function _axis(O, posEnd, negEnd, color, posLbl, negLbl, posLblPos, negLblPos) {
    _line(O, posEnd, color);
    _arrow(posEnd, color);
    _line(O, negEnd, color);
    _arrow(negEnd, color);
    _label(posLblPos, posLbl, color);
    _label(negLblPos, negLbl, color);
  }

  function _axisZ(O, posEnd, negEnd, color, posLblPos, negLblPos) {
    _line(O, posEnd, color);
    _arrow(posEnd, color);
    _line(O, negEnd, color);
    _arrow(negEnd, color);
    _label(posLblPos, 'Z',  color);
    _label(negLblPos, '-Z', color);
  }

  function _line(from, to, color) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x,   to.y);
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function _arrow(tip, color) {
    const dx  = tip.x - origin.x;
    const dy  = tip.y - origin.y;
    const ang = Math.atan2(dy, dx);
    const hl  = 10;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - hl * Math.cos(ang - Math.PI / 6),
               tip.y - hl * Math.sin(ang - Math.PI / 6));
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - hl * Math.cos(ang + Math.PI / 6),
               tip.y - hl * Math.sin(ang + Math.PI / 6));
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function _label(pos, text, color) {
    ctx.save();
    ctx.font         = `bold ${Math.max(11, STEP * 0.33)}px "Courier New", monospace`;
    ctx.fillStyle    = color;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur   = 5;
    ctx.fillText(text, pos.x, pos.y);
    ctx.restore();
  }

  // ─── Base cilíndrica ──────────────────────────────────────────────────────
  function drawBase() {
    const cylH = STEP * 0.45;
    const rx   = STEP * 1.1;
    const ry   = STEP * 0.40;
    const top  = iso(0, 0, cylH);
    const bot  = iso(0, 0, 0);

    ctx.save();
    // Cara superior
    ctx.beginPath();
    ctx.ellipse(top.x, top.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle   = COLOR.baseCircle;
    ctx.fill();
    ctx.strokeStyle = COLOR.baseStroke;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    // Lados
    ctx.beginPath(); ctx.moveTo(top.x - rx, top.y); ctx.lineTo(bot.x - rx, bot.y);
    ctx.strokeStyle = COLOR.baseStroke; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(top.x + rx, top.y); ctx.lineTo(bot.x + rx, bot.y);
    ctx.stroke();
    // Arco inferior
    ctx.beginPath();
    ctx.ellipse(bot.x, bot.y, rx, ry, 0, 0, Math.PI);
    ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  // ─── Brazo robótico ───────────────────────────────────────────────────────
  function drawArm(points) {
    if (!points || points.length < 5) return;

    const pts = points.map(p => {
      const [bx, by, bz] = p.pos3d;
      const s = isoB(bx, by, bz);
      return { name: p.name, x: s.x, y: s.y };
    });

    const [base, shoulder, elbow, wrist, tip] = pts;

    drawBase();
    _seg(base,     shoulder, 7, COLOR.segment, COLOR.segGlow);
    _seg(shoulder, elbow,    5, COLOR.segment, COLOR.segGlow);
    _seg(elbow,    wrist,    4, COLOR.segment, COLOR.segGlow);
    _seg(wrist,    tip,      3, COLOR.tip,     COLOR.tipGlow);

    _joint(base,     10, COLOR.jointStroke, 'rgba(0,255,136,0.25)');
    _joint(shoulder,  8, COLOR.jointStroke, 'rgba(0,255,136,0.20)');
    _joint(elbow,     7, COLOR.jointStroke, 'rgba(0,255,136,0.20)');
    _joint(wrist,     6, COLOR.jointStroke, 'rgba(0,255,136,0.20)');
    _joint(tip,       5, COLOR.tip,          COLOR.tipGlow);
  }

  function _seg(a, b, w, color, glow) {
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = glow; ctx.lineWidth = w + 7; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
  }

  function _joint(p, r, stroke, fill) {
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = COLOR.joint; ctx.fill();
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  function render(points) {
    _lastPts = points || null;
    ctx.fillStyle = COLOR.bg;
    ctx.fillRect(0, 0, W, H);
    drawGrid();
    drawAxes();
    if (points && points.length > 0) drawArm(points);
  }

  return { init, render, resize };

})();