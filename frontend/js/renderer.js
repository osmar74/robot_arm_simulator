// frontend/js/renderer.js
// Motor de renderizado — Cuadrícula isométrica con Z vertical (arriba)
// Ejes: X = derecha, Y = profundidad, Z = vertical

const Renderer = (() => {

  // ─── Referencias al canvas ────────────────────────────────────────────────
  let canvas, ctx;
  let W, H;
  let origin;   // Centro de la proyección en pantalla

  // ─── Paleta de colores ────────────────────────────────────────────────────
  const COLOR = {
    bg:           '#0a0f1a',
    grid:         'rgba(200, 220, 255, 0.18)',
    gridCenter:   'rgba(200, 220, 255, 0.40)',
    axisX:        '#ff3333',
    axisY:        '#00ff88',
    axisZ:        '#3399ff',
    axisLabel:    '#ffffff',
    baseCircle:   'rgba(0, 255, 136, 0.12)',
    baseStroke:   '#00ff88',
    segment:      '#00ff88',
    segmentGlow:  'rgba(0, 255, 136, 0.35)',
    joint:        '#ffffff',
    jointStroke:  '#00ff88',
    tip:          '#ff6b35',
    tipGlow:      'rgba(255, 107, 53, 0.45)',
    shadow:       'rgba(0, 255, 136, 0.06)',
  };

  // ─── Parámetros de la cuadrícula ──────────────────────────────────────────
  const GRID_STEP  = 38;   // Tamaño de cada celda (px)
  const GRID_COUNT = 8;    // Celdas en cada dirección desde el origen

  // ─── Proyección isométrica (Z = vertical) ─────────────────────────────────
  // Ejes del plano: X (derecha-abajo), Y (izquierda-abajo)
  // Eje vertical:  Z (arriba-abajo)
  //
  //   px = origin.x + (x - y) * cos(30°)
  //   py = origin.y - z       + (x + y) * sin(30°)
  //
  const COS30 = Math.cos(30 * Math.PI / 180);  // ≈ 0.866
  const SIN30 = Math.sin(30 * Math.PI / 180);  // ≈ 0.500

  function iso(x, y, z) {
    return {
      x: origin.x + (x - y) * COS30,
      y: origin.y - z        + (x + y) * SIN30
    };
  }

  /**
   * Convierte coordenadas del backend a pantalla.
   * Backend usa: bx=derecha, by=altura, bz=profundidad
   * Display usa: x=bx, y=bz(profundidad), z=by(altura→arriba)
   */
  function isoBackend(bx, by, bz) {
    return iso(bx, bz, by);
  }

  // ─── Inicialización ───────────────────────────────────────────────────────

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx    = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    const wrapper = canvas.parentElement;
    W = wrapper.clientWidth  - 16;
    H = wrapper.clientHeight - 16;
    canvas.width  = W;
    canvas.height = H;
    // Origen en centro horizontal, 60% vertical
    // Deja espacio arriba para el brazo y abajo para la cuadrícula
    origin = { x: W * 0.50, y: H * 0.60 };
  }

  // ─── Cuadrícula isométrica ────────────────────────────────────────────────
  // La cuadrícula está en el plano Z=0 (el suelo)
  // Líneas corren en dirección X (variando X, Y fijo) y
  //              en dirección Y (variando Y, X fijo)

  function drawGrid() {
    const n = GRID_COUNT;
    const s = GRID_STEP;

    ctx.save();
    ctx.lineCap = 'round';

    for (let i = -n; i <= n; i++) {
      const isCenter = i === 0;

      // Líneas paralelas al eje X (Y varía, X recorre todo el rango)
      const a1 = iso(-n * s, i * s, 0);
      const a2 = iso( n * s, i * s, 0);
      ctx.beginPath();
      ctx.moveTo(a1.x, a1.y);
      ctx.lineTo(a2.x, a2.y);
      ctx.strokeStyle = isCenter ? COLOR.gridCenter : COLOR.grid;
      ctx.lineWidth   = isCenter ? 0.9 : 0.5;
      ctx.stroke();

      // Líneas paralelas al eje Y (X varía, Y recorre todo el rango)
      const b1 = iso(i * s, -n * s, 0);
      const b2 = iso(i * s,  n * s, 0);
      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.strokeStyle = isCenter ? COLOR.gridCenter : COLOR.grid;
      ctx.lineWidth   = isCenter ? 0.9 : 0.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ─── Ejes X, Y, Z con positivo y negativo ────────────────────────────────

  function drawAxes() {
    const n   = GRID_COUNT;
    const s   = GRID_STEP;
    const len = n * s + 20;      // Longitud de cada semi-eje
    const zUp = len * 0.95;      // Longitud del eje Z hacia arriba
    const zDn = len * 0.38;      // Longitud del eje Z hacia abajo

    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineCap   = 'round';

    const O = iso(0, 0, 0);      // Origen en pantalla

    // ── Eje X positivo (rojo, hacia derecha-abajo) ──
    const xPos = iso( len, 0, 0);
    const xNeg = iso(-len, 0, 0);
    drawAxisLine(O, xPos, COLOR.axisX, true);
    drawAxisLine(O, xNeg, COLOR.axisX, true);
    axisLabel(iso( len + 16, 0, 0), 'X',  COLOR.axisX);
    axisLabel(iso(-len - 16, 0, 0), '-X', COLOR.axisX);

    // ── Eje Y positivo (verde, hacia izquierda-abajo) ──
    const yPos = iso(0,  len, 0);
    const yNeg = iso(0, -len, 0);
    drawAxisLine(O, yPos, COLOR.axisY, true);
    drawAxisLine(O, yNeg, COLOR.axisY, true);
    axisLabel(iso(0,  len + 16, 0), 'Y',  COLOR.axisY);
    axisLabel(iso(0, -len - 16, 0), '-Y', COLOR.axisY);

    // ── Eje Z (azul, vertical) ──
    const zPos = iso(0, 0,  zUp);
    const zNeg = iso(0, 0, -zDn);
    drawAxisLine(O, zPos, COLOR.axisZ, true);
    drawAxisLine(O, zNeg, COLOR.axisZ, true);
    axisLabel(iso(0, 0,  zUp + 16), 'Z',  COLOR.axisZ);
    axisLabel(iso(0, 0, -zDn - 14), '-Z', COLOR.axisZ);

    // ── Punto de origen ──
    ctx.beginPath();
    ctx.arc(O.x, O.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  function drawAxisLine(from, to, color, withArrow) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.stroke();

    if (withArrow) {
      const angle   = Math.atan2(to.y - from.y, to.x - from.x);
      const headLen = 10;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(
        to.x - headLen * Math.cos(angle - Math.PI / 6),
        to.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(
        to.x - headLen * Math.cos(angle + Math.PI / 6),
        to.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.stroke();
    }
  }

  function axisLabel(pos, text, color) {
    ctx.font         = 'bold 13px "Courier New", monospace';
    ctx.fillStyle    = color;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    // Sombra para legibilidad sobre la cuadrícula
    ctx.shadowColor  = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur   = 4;
    ctx.fillText(text, pos.x, pos.y);
    ctx.shadowBlur   = 0;
  }

  // ─── Base cilíndrica del brazo ────────────────────────────────────────────

  function drawBaseShadow() {
    const c = iso(0, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 52 * COS30, 52 * SIN30 * 1.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLOR.shadow;
    ctx.fill();
    ctx.restore();
  }

  function drawBase() {
    // El cilindro tiene la base en Z=0 y sube hasta Z=cylH
    const cylH  = 18;
    const rx    = 44;
    const ry    = 16;

    const top = iso(0, 0, cylH);
    const bot = iso(0, 0, 0);

    // Cara superior (elipse en Z=cylH)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(top.x, top.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle   = COLOR.baseCircle;
    ctx.fill();
    ctx.strokeStyle = COLOR.baseStroke;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Lados del cilindro
    ctx.beginPath();
    ctx.moveTo(top.x - rx, top.y);
    ctx.lineTo(bot.x - rx, bot.y);
    ctx.strokeStyle = COLOR.baseStroke;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(top.x + rx, top.y);
    ctx.lineTo(bot.x + rx, bot.y);
    ctx.stroke();

    // Arco inferior visible
    ctx.beginPath();
    ctx.ellipse(bot.x, bot.y, rx, ry, 0, 0, Math.PI);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // ─── Brazo robótico ───────────────────────────────────────────────────────

  /**
   * points: lista recibida de la API
   *   cada item: { name, pos2d:[px,py], pos3d:[bx,by,bz] }
   *
   * Usamos pos3d para recomponer la posición con la
   * proyección Z-arriba del renderer (ignoramos pos2d del backend).
   */
  function drawArm(points) {
    if (!points || points.length < 5) return;

    // Recomputa posiciones 2D desde pos3d con Z-up
    const pts = points.map(p => {
      const [bx, by, bz] = p.pos3d;
      const s = isoBackend(bx, by, bz);
      return { name: p.name, x: s.x, y: s.y };
    });

    const [base, shoulder, elbow, wrist, tip] = pts;

    // Sombra + cilindro base
    drawBaseShadow();
    drawBase();

    // Segmentos
    drawSegment(base,     shoulder, 7, COLOR.segment, COLOR.segmentGlow);
    drawSegment(shoulder, elbow,    5, COLOR.segment, COLOR.segmentGlow);
    drawSegment(elbow,    wrist,    4, COLOR.segment, COLOR.segmentGlow);
    drawSegment(wrist,    tip,      3, COLOR.tip,     COLOR.tipGlow);

    // Articulaciones
    drawJoint(base,     10, COLOR.jointStroke, 'rgba(0,255,136,0.25)');
    drawJoint(shoulder,  8, COLOR.jointStroke, 'rgba(0,255,136,0.20)');
    drawJoint(elbow,     7, COLOR.jointStroke, 'rgba(0,255,136,0.20)');
    drawJoint(wrist,     6, COLOR.jointStroke, 'rgba(0,255,136,0.20)');
    drawJoint(tip,       5, COLOR.tip,          COLOR.tipGlow);
  }

  function drawSegment(from, to, width, color, glow) {
    // Capa de resplandor
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x,   to.y);
    ctx.strokeStyle = glow;
    ctx.lineWidth   = width + 6;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Línea principal
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x,   to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
    ctx.lineCap     = 'round';
    ctx.stroke();
  }

  function drawJoint(pos, radius, stroke, fill) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle   = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth   = 2;
    ctx.stroke();
    // Punto blanco central
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = COLOR.joint;
    ctx.fill();
  }

  // ─── Render principal ─────────────────────────────────────────────────────

  function render(points) {
    ctx.fillStyle = COLOR.bg;
    ctx.fillRect(0, 0, W, H);

    drawGrid();
    drawAxes();

    if (points && points.length > 0) {
      drawArm(points);
    }
  }

  // ─── API pública ──────────────────────────────────────────────────────────
  return { init, render, resize };

})();