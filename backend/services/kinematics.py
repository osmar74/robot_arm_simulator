# backend/services/kinematics.py
# Service — Lógica matemática de cinemática directa y proyección 3D → 2D
# Usa únicamente math de Python estándar (sin numpy ni librerías externas)

import math


# ---------------------------------------------------------------------------
# Utilidades de conversión y rotación
# ---------------------------------------------------------------------------

def deg_to_rad(degrees: float) -> float:
    """Convierte grados a radianes."""
    return degrees * math.pi / 180.0


def rotate_y(point: tuple, angle_deg: float) -> tuple:
    """
    Rota un punto 3D (x, y, z) alrededor del eje Y.
    Usado para la rotación horizontal de la BASE del brazo.

    Fórmula:
        x' =  x * cos(θ) + z * sin(θ)
        y' =  y                          (Y no cambia al rotar en Y)
        z' = -x * sin(θ) + z * cos(θ)
    """
    x, y, z = point
    θ = deg_to_rad(angle_deg)
    x2 =  x * math.cos(θ) + z * math.sin(θ)
    y2 =  y
    z2 = -x * math.sin(θ) + z * math.cos(θ)
    return (x2, y2, z2)


def rotate_x(point: tuple, angle_deg: float) -> tuple:
    """
    Rota un punto 3D (x, y, z) alrededor del eje X.
    Usado para SHOULDER (elevación) y ELBOW (flexión).

    Fórmula:
        x' = x                           (X no cambia al rotar en X)
        y' =  y * cos(θ) - z * sin(θ)
        z' =  y * sin(θ) + z * cos(θ)
    """
    x, y, z = point
    θ = deg_to_rad(angle_deg)
    x2 = x
    y2 =  y * math.cos(θ) - z * math.sin(θ)
    z2 =  y * math.sin(θ) + z * math.cos(θ)
    return (x2, y2, z2)


def rotate_z(point: tuple, angle_deg: float) -> tuple:
    """
    Rota un punto 3D (x, y, z) alrededor del eje Z.
    Usado para la rotación de la MUÑECA (wrist).

    Fórmula:
        x' = x * cos(θ) - y * sin(θ)
        y' = x * sin(θ) + y * cos(θ)
        z' = z                           (Z no cambia al rotar en Z)
    """
    x, y, z = point
    θ = deg_to_rad(angle_deg)
    x2 = x * math.cos(θ) - y * math.sin(θ)
    y2 = x * math.sin(θ) + y * math.cos(θ)
    z2 = z
    return (x2, y2, z2)


# ---------------------------------------------------------------------------
# Proyección isométrica 3D → 2D
# ---------------------------------------------------------------------------

ISO_ANGLE = 30  # Ángulo de perspectiva isométrica en grados


def project_iso(point: tuple, origin: tuple) -> tuple:
    """
    Proyecta un punto 3D al plano 2D usando perspectiva isométrica.
    Produce los ejes X (abajo-derecha), Z (abajo-izquierda), Y (arriba)
    exactamente como en el bosquejo del brazo.

    Fórmulas:
        px = origin_x + (x - z) * cos(30°)
        py = origin_y - y + (x + z) * sin(30°)

    Args:
        point:  (x, y, z) en espacio 3D
        origin: (ox, oy) centro de la proyección en el Canvas (píxeles)

    Returns:
        (px, py) coordenadas en píxeles para Canvas
    """
    x, y, z = point
    ox, oy = origin

    angle_rad = deg_to_rad(ISO_ANGLE)
    cos30 = math.cos(angle_rad)  # ≈ 0.866
    sin30 = math.sin(angle_rad)  # ≈ 0.500

    px = ox + (x - z) * cos30
    py = oy - y + (x + z) * sin30

    return (round(px, 2), round(py, 2))


# ---------------------------------------------------------------------------
# Cinemática directa — función principal
# ---------------------------------------------------------------------------

def compute_arm_points(joints_state: dict, origin: tuple) -> list:
    """
    Calcula las posiciones 2D de cada articulación del brazo
    aplicando cinemática directa encadenada.

    Proceso:
      1. La base define la rotación horizontal global (eje Y)
      2. El shoulder eleva el primer segmento (eje X, relativo a base)
      3. El elbow flexiona el antebrazo (eje X, relativo a shoulder)
      4. El wrist rota la pinza (eje Z, relativo a elbow)

    Args:
        joints_state: dict con el estado de joints de RobotArm.get_state()
        origin:       (ox, oy) centro del Canvas en píxeles

    Returns:
        Lista de dicts con nombre y posición 2D de cada punto:
        [
          {"name": "base",     "pos2d": (px, py), "pos3d": (x, y, z)},
          {"name": "shoulder", "pos2d": (px, py), "pos3d": (x, y, z)},
          {"name": "elbow",    "pos2d": (px, py), "pos3d": (x, y, z)},
          {"name": "wrist",    "pos2d": (px, py), "pos3d": (x, y, z)},
          {"name": "tip",      "pos2d": (px, py), "pos3d": (x, y, z)},
        ]
    """
    joints = joints_state["joints"]

    # Ángulos de cada articulación
    base_angle     = joints["base"]["angle"]
    shoulder_angle = joints["shoulder"]["angle"]
    elbow_angle    = joints["elbow"]["angle"]
    wrist_angle    = joints["wrist"]["angle"]

    # Longitudes de cada segmento
    shoulder_len = joints["shoulder"]["length"]   # 120
    elbow_len    = joints["elbow"]["length"]       # 90
    wrist_len    = joints["wrist"]["length"]       # 60

    # -----------------------------------------------------------------------
    # Punto 0: BASE — origen del brazo (fijo en el suelo)
    # -----------------------------------------------------------------------
    p_base = (0.0, 0.0, 0.0)

    # -----------------------------------------------------------------------
    # Punto 1: SHOULDER — extremo del primer segmento
    # El segmento apunta inicialmente hacia +Y (arriba)
    # Se rota en X por el ángulo del shoulder (elevación)
    # Luego se rota en Y por el ángulo de la base (giro horizontal)
    # -----------------------------------------------------------------------
    seg1_local = (0.0, float(shoulder_len), 0.0)
    seg1_rotX  = rotate_x(seg1_local, shoulder_angle)
    seg1_rotY  = rotate_y(seg1_rotX, base_angle)

    p_shoulder = (
        p_base[0] + seg1_rotY[0],
        p_base[1] + seg1_rotY[1],
        p_base[2] + seg1_rotY[2]
    )

    # -----------------------------------------------------------------------
    # Punto 2: ELBOW — extremo del segundo segmento
    # El segmento apunta hacia +Y en el espacio local del shoulder
    # Se rota en X por el ángulo acumulado (shoulder + elbow)
    # Luego se rota en Y por la base
    # -----------------------------------------------------------------------
    accumulated_angle = shoulder_angle + elbow_angle
    seg2_local = (0.0, float(elbow_len), 0.0)
    seg2_rotX  = rotate_x(seg2_local, accumulated_angle)
    seg2_rotY  = rotate_y(seg2_rotX, base_angle)

    p_elbow = (
        p_shoulder[0] + seg2_rotY[0],
        p_shoulder[1] + seg2_rotY[1],
        p_shoulder[2] + seg2_rotY[2]
    )

    # -----------------------------------------------------------------------
    # Punto 3: WRIST — extremo del tercer segmento (pinza)
    # Agrega la rotación de la muñeca en Z
    # -----------------------------------------------------------------------
    seg3_local  = (0.0, float(wrist_len), 0.0)
    seg3_rotX   = rotate_x(seg3_local, accumulated_angle)
    seg3_rotZ   = rotate_z(seg3_rotX, wrist_angle)
    seg3_rotY   = rotate_y(seg3_rotZ, base_angle)

    p_wrist = (
        p_elbow[0] + seg3_rotY[0],
        p_elbow[1] + seg3_rotY[1],
        p_elbow[2] + seg3_rotY[2]
    )

    # -----------------------------------------------------------------------
    # Punto 4: TIP — punta de la pinza (pequeña extensión visual)
    # -----------------------------------------------------------------------
    tip_len    = 20.0
    seg4_local = (0.0, tip_len, 0.0)
    seg4_rotX  = rotate_x(seg4_local, accumulated_angle)
    seg4_rotZ  = rotate_z(seg4_rotX, wrist_angle)
    seg4_rotY  = rotate_y(seg4_rotZ, base_angle)

    p_tip = (
        p_wrist[0] + seg4_rotY[0],
        p_wrist[1] + seg4_rotY[1],
        p_wrist[2] + seg4_rotY[2]
    )

    # -----------------------------------------------------------------------
    # Proyectar todos los puntos 3D al plano 2D
    # -----------------------------------------------------------------------
    points = [
        {"name": "base",     "pos3d": p_base,     "pos2d": project_iso(p_base,     origin)},
        {"name": "shoulder", "pos3d": p_shoulder,  "pos2d": project_iso(p_shoulder, origin)},
        {"name": "elbow",    "pos3d": p_elbow,     "pos2d": project_iso(p_elbow,    origin)},
        {"name": "wrist",    "pos3d": p_wrist,     "pos2d": project_iso(p_wrist,    origin)},
        {"name": "tip",      "pos3d": p_tip,       "pos2d": project_iso(p_tip,      origin)},
    ]

    return points