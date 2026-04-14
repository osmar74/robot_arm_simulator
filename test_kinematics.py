# test_kinematics.py — verificar cinemática, borrar después
import sys
sys.path.insert(0, ".")

from backend.models.robot_arm import RobotArm
from backend.services.kinematics import compute_arm_points

arm = RobotArm()
ORIGIN = (400, 350)  # Centro del canvas

print("=== POSICIÓN INICIAL (todos en 0°) ===")
points = compute_arm_points(arm.get_state(), ORIGIN)
for p in points:
    x3, y3, z3 = p["pos3d"]
    px, py = p["pos2d"]
    print(f"  {p['name']:10s} | 3D: ({x3:6.1f}, {y3:6.1f}, {z3:6.1f}) | Canvas: ({px:6.1f}, {py:6.1f})")

print("\n=== SHOULDER +45° (brazo elevado) ===")
arm.move("shoulder", 45)
points = compute_arm_points(arm.get_state(), ORIGIN)
for p in points:
    px, py = p["pos2d"]
    print(f"  {p['name']:10s} | Canvas: ({px:6.1f}, {py:6.1f})")

print("\n=== BASE +90° (giro horizontal) ===")
arm.move("base", 90)
points = compute_arm_points(arm.get_state(), ORIGIN)
for p in points:
    px, py = p["pos2d"]
    print(f"  {p['name']:10s} | Canvas: ({px:6.1f}, {py:6.1f})")

print("\n=== ELBOW -30° (codo flexionado) ===")
arm.reset()
arm.move("shoulder", 45)
arm.move("elbow", -30)
points = compute_arm_points(arm.get_state(), ORIGIN)
for p in points:
    px, py = p["pos2d"]
    print(f"  {p['name']:10s} | Canvas: ({px:6.1f}, {py:6.1f})")

print("\nTest completado correctamente.")