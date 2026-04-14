# 🤖 RoboArm Simulator

Simulador web de brazo robótico 3D con control en tiempo real.
Construido con FastAPI (Python) y Canvas HTML5.

## Tecnologías
- **Backend:** Python 3.11 + FastAPI + Uvicorn
- **Frontend:** HTML5 + CSS3 + JavaScript vanilla + Canvas
- **Arquitectura:** MVC orientado a objetos
- **Matemáticas:** Cinemática directa + proyección isométrica

## Instalación

```cmd
git clone https://github.com/TU_USUARIO/robot_arm_simulator.git
cd robot_arm_simulator
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Ejecución

```cmd
python -m backend.main
```

Abre: http://localhost:8000

## Estructura
robot_arm_simulator/
├── backend/
│   ├── main.py                  ← Punto de entrada FastAPI
│   ├── controllers/
│   │   └── robot_controller.py  ← Rutas REST
│   ├── models/
│   │   └── robot_arm.py         ← Clase RobotArm (OOP)
│   └── services/
│       └── kinematics.py        ← Cinemática directa 3D
└── frontend/
├── index.html               ← Interfaz principal
├── style.css                ← Tema oscuro
└── js/
├── robot.js             ← Control + API calls
└── renderer.js          ← Canvas isométrico

## API REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/state` | Estado del brazo + puntos 2D |
| POST | `/api/move` | Mover articulación |
| POST | `/api/reset` | Restablecer posición |

## Articulaciones

| Nombre | Eje | Rango |
|--------|-----|-------|
| Base | Y | -180° a 180° |
| Hombro | Z | 0° a 135° |
| Codo | X | -90° a 90° |
| Muñeca | Y | -180° a 180° |
