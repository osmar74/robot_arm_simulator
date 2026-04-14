# backend/controllers/robot_controller.py
# Controller (MVC) — Rutas REST que exponen el control del brazo robótico


from fastapi import APIRouter
from pydantic import BaseModel, Field
from backend.models.robot_arm import RobotArm
from backend.services.kinematics import compute_arm_points

# Router independiente — se registra en main.py bajo el prefijo /api
router = APIRouter()

# Instancia única del brazo (estado en memoria, sin base de datos)
# Todos los requests comparten este mismo objeto durante la sesión
arm = RobotArm()

# Origen del canvas para la proyección isométrica (en píxeles)
# Debe coincidir con el centro usado en renderer.js
CANVAS_ORIGIN = (500, 380)


# ---------------------------------------------------------------------------
# Modelos de entrada (validación automática con Pydantic)
# ---------------------------------------------------------------------------

class MoveRequest(BaseModel):
    """Cuerpo del POST /move — articulación a mover y cuántos grados."""
    joint: str = Field(
        ...,
        description="Nombre de la articulación: base, shoulder, elbow, wrist"
    )
    delta: float = Field(
        ...,
        description="Grados a rotar. Positivo = sentido horario, negativo = antihorario"
    )


# ---------------------------------------------------------------------------
# Rutas REST
# ---------------------------------------------------------------------------

@router.get("/state")
def get_state():
    """
    Retorna el estado completo del brazo robótico.
    Incluye los ángulos de cada articulación Y los puntos 2D
    precalculados para que el frontend solo tenga que dibujar.
    """
    state = arm.get_state()
    points = compute_arm_points(state, CANVAS_ORIGIN)

    # Convertir tuplas a listas para serialización JSON
    points_serializable = [
        {
            "name": p["name"],
            "pos2d": list(p["pos2d"]),
            "pos3d": list(p["pos3d"])
        }
        for p in points
    ]

    return {
        "success": True,
        "state": state,
        "points2d": points_serializable
    }


@router.post("/move")
def move_joint(request: MoveRequest):
    """
    Mueve una articulación específica del brazo.

    Body JSON esperado:
        { "joint": "shoulder", "delta": 15 }

    Retorna el resultado de la operación, el nuevo estado
    y los puntos 2D actualizados.
    """
    result = arm.move(request.joint, request.delta)

    # Añadir puntos 2D actualizados al resultado
    points = compute_arm_points(result["state"], CANVAS_ORIGIN)
    result["points2d"] = [
        {
            "name": p["name"],
            "pos2d": list(p["pos2d"]),
            "pos3d": list(p["pos3d"])
        }
        for p in points
    ]

    return result


@router.post("/reset")
def reset_arm():
    """
    Regresa todas las articulaciones a su posición inicial (0°).
    Retorna el estado reseteado y los puntos 2D iniciales.
    """
    result = arm.reset()

    points = compute_arm_points(result["state"], CANVAS_ORIGIN)
    result["points2d"] = [
        {
            "name": p["name"],
            "pos2d": list(p["pos2d"]),
            "pos3d": list(p["pos3d"])
        }
        for p in points
    ]

    return result