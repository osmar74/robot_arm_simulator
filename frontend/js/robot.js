// frontend/js/robot.js
// Controlador del frontend: conecta el panel de control con la API REST

// ─── Estado local ─────────────────────────────────────────────────────────
let lastPoints = null;  // Últimos puntos 2D recibidos de la API

// ─── Inicialización ───────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  Renderer.init('robotCanvas');
  fetchState();
});

window.addEventListener('resize', () => {
  Renderer.resize();
  if (lastPoints) Renderer.render(lastPoints);
});

// ─── Llamadas a la API ────────────────────────────────────────────────────

/**
 * Obtiene el estado actual del brazo y actualiza la UI.
 */
async function fetchState() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    updateUI(data);
  } catch (err) {
    showFlash('Error de conexión con el servidor', true);
  }
}

/**
 * Envía un movimiento a una articulación.
 * Lee el paso (delta) del select correspondiente.
 */
async function moveJoint(jointName, direction) {
  const stepSelect = document.getElementById(`step-${jointName}`);
  const step = parseFloat(stepSelect ? stepSelect.value : 10);
  const delta = step * direction;

  try {
    const res = await fetch('/api/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joint: jointName, delta: delta })
    });

    const data = await res.json();
    updateUI(data);

    if (!data.success) {
      showFlash(data.message, true);
    }
  } catch (err) {
    showFlash('Error al enviar comando', true);
  }
}

/**
 * Restablece el brazo a la posición inicial.
 */
async function resetArm() {
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    updateUI(data);
    showFlash('Brazo restablecido a posición inicial');
  } catch (err) {
    showFlash('Error al restablecer', true);
  }
}

// ─── Actualización de la UI ───────────────────────────────────────────────

/**
 * Actualiza todos los elementos visuales con los datos de la API:
 * - Ángulos en las tarjetas
 * - Barras de progreso
 * - Coordenadas del efector
 * - Mensaje de estado
 * - Canvas (redibuja el brazo)
 */
function updateUI(data) {
  if (!data) return;

  const joints = data.state ? data.state.joints : null;
  const points = data.points2d || null;

  // Actualizar ángulos y barras de cada articulación
  if (joints) {
    updateJointCard('base', joints.base);
    updateJointCard('shoulder', joints.shoulder);
    updateJointCard('elbow', joints.elbow);
    updateJointCard('wrist', joints.wrist);
  }

  // Actualizar coordenadas 3D del efector final (tip)
  if (points && points.length >= 5) {
    const tip = points[4];  // index 4 = "tip"
    const [x3, y3, z3] = tip.pos3d;
    document.getElementById('coord-x').textContent = x3.toFixed(1);
    document.getElementById('coord-y').textContent = y3.toFixed(1);
    document.getElementById('coord-z').textContent = z3.toFixed(1);
  }

  // Mensaje de estado
  if (data.message) {
    document.getElementById('status-msg').textContent = data.message;
  }

  // Redibujar el brazo en el canvas
  if (points) {
    lastPoints = points;
    Renderer.render(points);
  }
}

/**
 * Actualiza la tarjeta visual de una articulación:
 * - Número de ángulo
 * - Barra de progreso (normalizada al rango min-max)
 */
function updateJointCard(name, jointData) {
  if (!jointData) return;

  const angleEl = document.getElementById(`angle-${name}`);
  const barEl = document.getElementById(`bar-${name}`);
  const curEl = document.getElementById(`cur-${name}`);
  const minEl = document.getElementById(`min-${name}`);
  const maxEl = document.getElementById(`max-${name}`);

  // Ángulo principal (esquina derecha de la tarjeta)
  if (angleEl) {
    angleEl.textContent = jointData.angle.toFixed(1) + '°';
  }

  // Etiquetas de límites
  if (minEl) minEl.textContent = jointData.min_angle + '°';
  if (maxEl) maxEl.textContent = jointData.max_angle + '°';

  // Valor actual debajo de la barra
  if (curEl) {
    curEl.textContent = jointData.angle.toFixed(1) + '°';
  }

  // Barra de progreso normalizada al rango min-max
  if (barEl) {
    const range = jointData.max_angle - jointData.min_angle;
    const pct = range > 0
      ? ((jointData.angle - jointData.min_angle) / range) * 100
      : 50;

    const clampedPct = Math.max(1, Math.min(99, pct));
    barEl.style.width = clampedPct + '%';

    // Zona de peligro: más del 90% o menos del 10% del rango
    const nearLimit = pct >= 90 || pct <= 10;
    barEl.classList.toggle('near-limit', nearLimit);
  }
}

// ─── Notificación flash ───────────────────────────────────────────────────

let flashTimer = null;

/**
 * Muestra un mensaje temporal en la esquina inferior derecha.
 * isError: true → color naranja, false → color verde
 */
function showFlash(message, isError = false) {
  const el = document.getElementById('flash-msg');
  el.textContent = message;
  el.className = 'flash-msg show' + (isError ? ' error' : '');

  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    el.className = 'flash-msg';
  }, 2800);
}

// ─── Navegación por tabs ──────────────────────────────────────────────────

function setTab(btn, tabName) {
  // Quitar active de todos los tabs
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // En esta versión solo el tab "sim" tiene contenido completo
  if (tabName !== 'sim') {
    showFlash(`Tab "${btn.textContent}" — próximamente`);
  }
}