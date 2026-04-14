# backend/main.py
# Punto de entrada de la aplicación FastAPI
# Configura la app, monta rutas y sirve el frontend estático

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from backend.controllers.robot_controller import router as robot_router

# ---------------------------------------------------------------------------
# Crear la aplicación FastAPI
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Simulador de Brazo Robótico",
    description="API REST para controlar un brazo robótico simulado en 3D",
    version="1.0.0"
)

# ---------------------------------------------------------------------------
# Registrar el controller bajo el prefijo /api
# Todas las rutas definidas en robot_controller.py quedan como:
#   GET  /api/state
#   POST /api/move
#   POST /api/reset
# ---------------------------------------------------------------------------

app.include_router(robot_router, prefix="/api")

# ---------------------------------------------------------------------------
# Servir archivos estáticos del frontend
# La carpeta frontend/ se monta bajo /static
#   /static/style.css    → frontend/style.css
#   /static/js/robot.js  → frontend/js/robot.js
# ---------------------------------------------------------------------------

# Ruta absoluta a la carpeta frontend (relativa a la raíz del proyecto)
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


# ---------------------------------------------------------------------------
# Ruta raíz — sirve index.html
# ---------------------------------------------------------------------------

@app.get("/")
def serve_index():
    """Sirve la página principal del simulador."""
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    return FileResponse(index_path)


# ---------------------------------------------------------------------------
# Punto de entrada para ejecutar directamente con python
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True       # Recarga automática al cambiar archivos
    )