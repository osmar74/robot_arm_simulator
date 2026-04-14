// frontend/js/renderer.js
// Motor de renderizado del brazo robótico sobre cuadrícula isométrica

const Renderer = (() => {

  // ─── Referencias al canvas ───────────────────────────────────────────────
  let canvas, ctx;
  let W, H;             // Dimensiones actuales del canvas en píxeles
  let origin;           // Centro de proyección isométrica {x, y}

  // ─── Paleta de colores ───────────────────────────────────────────────────
  const COLOR = {
    bg:           '#0a1628',
    grid:         'rgba(30, 80, 140, 0.35)',
    gridAccent:   'rgba(0, 170, 255, 0.12)',
    axisX:        '#ff6b35',
    axisY:        '#00ff88',
    axisZ:        '#00aaff',
    axisLabel:    '#e2e8f0',
    baseCircle:   'rgba(0, 255, 136, 0.15)',
    baseStroke:   '#00ff88',
    segment:      '#00ff88',
    segmentGlow:  'rgba(0, 255, 136, 0.4)',
    joint:        '#ffffff',
    jointStroke:  '#00ff88',
    tip:          '#ff6b35',
    tipGlow:      'rgba(255, 107, 53, 0.5)',
    shadow:       'rgba(0, 255, 136, 0.08)',
  };

  // ─── Parámetros de la cuadrícula ─────────────────────────────────────────
  const GRID = {
    step: 40,       // Tamaño de cada celda en unidades
    count: 8,       // Celdas en cada dirección
    isoAngle: 30,   // Ángulo isométrico en grados
  };

  // ─── Matemáticas isométricas ─────────────────────────────────────────────
  const ISO_COS = Math.cos(GRID.isoAngle * Math.PI / 180);  // ≈ 0.866
  const ISO_SIN = Math.sin(GRID.isoAngle * Math.PI / 180);  // ≈ 0.500

  /**
   * Convierte coordenadas 3D (x, y, z) a píxeles 2D en el canvas.
   * Usa la misma fórmula que kinematics.py para consistencia.
   */
  function iso(x, y, z) {
    return {
      x: origin.x + (x - z) * ISO_COS,
      y: origin.y - y + (x + z) * ISO_SIN
    };
  }

  // ─── Inicialización ───────────────────────────────────────────────────────

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    const wrapper = canvas.parentElement;
    W = wrapper.clientWidth  - 16;
    H = wrapper.clientHeight - 16;
    canvas.width  = W;
    canvas.height = H;

    // El origen isométrico se ubica en el centro-bajo del canvas
    // Igual que CANVAS_ORIGIN en robot_controller.py
    origin = { x: W * 0.52, y: H * 0.72 };
  }

  // ─── Dibujo de la cuadrícula isométrica ──────────────────────────────────

  function drawGrid() {
    const n = GRID.count;
    const s = GRID.step;

    ctx.save();

    // Líneas en dirección X (de Z=0 a Z=n*s, variando X)
    for (let i = -n; i <= n; i++) {
      const p1 = iso(i * s, 0, -n * s);
      const p2 = iso(i * s, 0,  n * s);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = i === 0 ? COLOR.gridAccent : COLOR.grid;
      ctx.lineWidth = i === 0 ? 0.8 : 0.4;
      ctx.stroke();
    }

    // Líneas en dirección Z (de X=-n*s a X=n*s, variando Z)
    for (let i = -n; i <= n; i++) {
      const p1 = iso(-n * s, 0, i * s);
      const p2 = iso( n * s, 0, i * s);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = i === 0 ? COLOR.gridAccent : COLOR.grid;
      ctx.lineWidth = i === 0 ? 0.8 : 0.4;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ─── Dibujo de los ejes X, Y, Z ──────────────────────────────────────────

  function drawAxes() {
    const len = GRID.step * (GRID.count + 1);
    ctx.save();
    ctx.lineWidth = 2;

    // Eje X → dirección (+x, 0, 0) — color naranja
    const ox = iso(0, 0, 0);
    const ex = iso(len, 0, 0);
    drawArrowLine(ox, ex, COLOR.axisX);
    labelAt(iso(len + 10, 0, 0), 'X', COLOR.axisX);

    // Eje Y → dirección (0, +y, 0) — color verde
    const ey = iso(0, len * 0.7, 0);
    drawArrowLine(ox, ey, COLOR.axisY);
    labelAt(iso(0, len * 0.7 + 14, 0), 'Y', COLOR.axisY);

    // Eje Z → dirección (0, 0, +z) — color azul
    const ez = iso(0, 0, len);
    drawArrowLine(ox, ez, COLOR.axisZ);
    labelAt(iso(0, 0, len + 10), 'Z', COLOR.axisZ);

    ctx.restore();
  }

  function drawArrowLine(from, to, color) {
    // Línea principal
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Punta de flecha
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
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
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function labelAt(pos, text, color) {
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pos.x, pos.y);
  }

  // ─── Dibujo de la sombra de la base en el suelo ──────────────────────────

  function drawBaseShadow(basePos) {
    ctx.save();
    // Elipse de sombra proyectada sobre el plano Y=0
    ctx.beginPath();
    ctx.ellipse(basePos.x, basePos.y, 55, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLOR.shadow;
    ctx.fill();
    ctx.restore();
  }

  // ─── Dibujo de la base cilíndrica ────────────────────────────────────────

  function drawBase(basePos) {
    const rx = 46, ry = 17;
    const h  = 18;   // Altura visual del cilindro

    // Cara superior
    ctx.beginPath();
    ctx.ellipse(basePos.x, basePos.y - h, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLOR.baseCircle;
    ctx.fill();
    ctx.strokeStyle = COLOR.baseStroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Lados del cilindro (dos líneas verticales + arco inferior)
    ctx.beginPath();
    ctx.moveTo(basePos.x - rx, basePos.y - h);
    ctx.lineTo(basePos.x - rx, basePos.y);
    ctx.strokeStyle = COLOR.baseStroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(basePos.x + rx, basePos.y - h);
    ctx.lineTo(basePos.x + rx, basePos.y);
    ctx.stroke();

    // Cara inferior (solo arco visible)
    ctx.beginPath();
    ctx.ellipse(basePos.x, basePos.y, rx, ry, 0, 0, Math.PI);
    ctx.strokeStyle = COLOR.baseStroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ─── Dibujo del brazo robótico ────────────────────────────────────────────

  /**
   * Dibuja el brazo usando los puntos 2D recibidos de la API.
   * points: lista de {name, pos2d: [px, py], pos3d: [x, y, z]}
   */
  function drawArm(points) {
    if (!points || points.length < 5) return;

    // Extraer posiciones 2D (la API ya las calculó)
    const pts = points.map(p => ({ name: p.name, x: p.pos2d[0], y: p.pos2d[1] }));
    const [base, shoulder, elbow, wrist, tip] = pts;

    // Sombra + base cilíndrica
    drawBaseShadow(base);
    drawBase(base);

    // ── Segmentos del brazo ──

    // Segmento 1: base → shoulder (más grueso)
    drawSegment(base, shoulder, 7, COLOR.segment, COLOR.segmentGlow);

    // Segmento 2: shoulder → elbow
    drawSegment(shoulder, elbow, 5, COLOR.segment, COLOR.segmentGlow);

    // Segmento 3: elbow → wrist
    drawSegment(elbow, wrist, 4, COLOR.segment, COLOR.segmentGlow);

    // Segmento 4: wrist → tip (pinza)
    drawSegment(wrist, tip, 3, COLOR.tip, COLOR.tipGlow);

    // ── Articulaciones (círculos) ──
    drawJoint(base,     10, COLOR.jointStroke, COLOR.baseCircle);
    drawJoint(shoulder,  8, COLOR.jointStroke, 'rgba(0,255,136,0.2)');
    drawJoint(elbow,     7, COLOR.jointStroke, 'rgba(0,255,136,0.2)');
    drawJoint(wrist,     6, COLOR.jointStroke, 'rgba(0,255,136,0.2)');

    // Punta del efector (naranja)
    drawJoint(tip, 5, COLOR.tip, COLOR.tipGlow);
  }

  function drawSegment(from, to, width, color, glow) {
    // Resplandor (glow)
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = glow;
    ctx.lineWidth = width + 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Línea principal
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function drawJoint(pos, radius, stroke, fill) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Punto central blanco
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = COLOR.joint;
    ctx.fill();
  }

  // ─── Render principal ─────────────────────────────────────────────────────

  function render(points) {
    // Limpiar con fondo oscuro
    ctx.fillStyle = COLOR.bg;
    ctx.fillRect(0, 0, W, H);

    drawGrid();
    drawAxes();

    if (points && points.length > 0) {
      drawArm(points);
    }
  }

  // ─── API pública del módulo ───────────────────────────────────────────────
  return { init, render, resize };

})();