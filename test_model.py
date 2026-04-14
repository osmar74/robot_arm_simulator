# test_model.py — solo para verificar el Paso 2
import sys
sys.path.insert(0, ".")

from backend.models.robot_arm import RobotArm

arm = RobotArm()

print("=== Estado inicial ===")
state = arm.get_state()
for name, data in state["joints"].items():
    print(f"  {name}: {data['angle']}°  (rango: {data['min_angle']}° a {data['max_angle']}°)")

print("\n=== Mover shoulder +45° ===")
result = arm.move("shoulder", 45)
print(f"  {result['message']}")

print("\n=== Mover base +90° ===")
result = arm.move("base", 90)
print(f"  {result['message']}")

print("\n=== Intentar superar límite de shoulder (+ 200°) ===")
result = arm.move("shoulder", 200)
print(f"  {result['message']}")

print("\n=== Reset ===")
result = arm.reset()
print(f"  {result['message']}")
state = arm.get_state()
for name, data in state["joints"].items():
    print(f"  {name}: {data['angle']}°")