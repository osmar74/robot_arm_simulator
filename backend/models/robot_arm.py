# backend/models/robot_arm.py
# Model (MVC) — Clase orientada a objetos que representa el brazo robótico


class Joint:
    """
    Representa una articulación del brazo robótico.
    Cada articulación tiene un ángulo actual, límites físicos
    y la longitud del segmento que la conecta con la siguiente.
    """

    def __init__(self, name: str, length: float, min_angle: float, max_angle: float, initial_angle: float = 0.0):
        self.name = name
        self.length = length          # Longitud del segmento (unidades de la cuadrícula)
        self.min_angle = min_angle    # Límite mínimo en grados
        self.max_angle = max_angle    # Límite máximo en grados
        self.angle = initial_angle    # Ángulo actual en grados

    def rotate(self, delta: float) -> dict:
        """
        Aplica una rotación de 'delta' grados al ángulo actual.
        Valida que el resultado esté dentro de los límites permitidos.
        Retorna un dict con el resultado de la operación.
        """
        new_angle = self.angle + delta

        if new_angle < self.min_angle:
            return {
                "success": False,
                "message": f"{self.name} ya está en su límite mínimo ({self.min_angle}°)"
            }

        if new_angle > self.max_angle:
            return {
                "success": False,
                "message": f"{self.name} ya está en su límite máximo ({self.max_angle}°)"
            }

        self.angle = round(new_angle, 2)
        return {
            "success": True,
            "message": f"{self.name} movido a {self.angle}°"
        }

    def reset(self):
        """Regresa la articulación a su ángulo inicial (0 grados)."""
        self.angle = 0.0

    def to_dict(self) -> dict:
        """Serializa la articulación como diccionario (para JSON)."""
        return {
            "name": self.name,
            "angle": self.angle,
            "length": self.length,
            "min_angle": self.min_angle,
            "max_angle": self.max_angle
        }


class RobotArm:
    """
    Clase principal que representa el brazo robótico completo.
    Agrupa todas las articulaciones y expone métodos de control.

    Articulaciones:
      - base:      Rotación horizontal sobre eje Y (-180° a +180°)
      - shoulder:  Elevación del brazo principal sobre eje Z (0° a 135°)
      - elbow:     Flexión del antebrazo (-90° a 90°)
      - wrist:     Rotación de la pinza (-180° a 180°)
    """

    # Definición de articulaciones: (nombre, longitud, min°, max°)
    JOINT_DEFINITIONS = [
        ("base",     0,    -180, 180),
        ("shoulder", 120,   0,   135),
        ("elbow",    90,   -90,   90),
        ("wrist",    60,  -180,  180),
    ]

    def __init__(self):
        # Construye las articulaciones y las indexa por nombre
        self.joints: dict[str, Joint] = {}
        for name, length, min_a, max_a in self.JOINT_DEFINITIONS:
            self.joints[name] = Joint(
                name=name,
                length=length,
                min_angle=min_a,
                max_angle=max_a,
                initial_angle=0.0
            )

    def move(self, joint_name: str, delta: float) -> dict:
        """
        Mueve una articulación específica por su nombre.
        Retorna el resultado de la operación y el estado actualizado.
        """
        if joint_name not in self.joints:
            return {
                "success": False,
                "message": f"Articulación '{joint_name}' no existe.",
                "state": self.get_state()
            }

        result = self.joints[joint_name].rotate(delta)
        result["state"] = self.get_state()
        return result

    def reset(self) -> dict:
        """Regresa todas las articulaciones a 0 grados."""
        for joint in self.joints.values():
            joint.reset()
        return {
            "success": True,
            "message": "Brazo restablecido a posición inicial.",
            "state": self.get_state()
        }

    def get_state(self) -> dict:
        """
        Retorna el estado completo del brazo como diccionario.
        Este es el dato que el frontend recibirá via JSON.
        """
        return {
            "joints": {
                name: joint.to_dict()
                for name, joint in self.joints.items()
            }
        }