from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import routes_sim
from api.routes_scenarios import router as scenarios_router
from api.routes_start import router as start_router
from api.routes_ml import router as ml_router
from api.routes_dashboard import router as dashboard_router

# Inicializa o app
app = FastAPI(
    title="Capacity Lab API",
    description="Simulador estatístico de capacidade para operação de picking",
    version="1.0.0"
)

# --- CONFIGURAÇÃO DO CORS ---
# Isso permite que o Frontend (React/Vite) faça requisições para o Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em produção, substitua pelo IP/URL do Frontend (ex: "http://192.168.1.15:5173")
    allow_credentials=True,
    allow_methods=["*"], # Permite POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)

# Registra os roteadores (endpoints)
app.include_router(routes_sim.router, prefix="/simulation", tags=["Simulação"])
app.include_router(scenarios_router, prefix="/scenarios", tags=["Scenarios"])
app.include_router(start_router, prefix="/start", tags=["Start"])
app.include_router(ml_router, prefix="/ml", tags=["Machine Learning"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])

# Rota raiz
@app.get("/", tags=["Health Check"])
def root():
    return {"status": "ok", "message": "Capacity Lab API rodando! Acesse /docs para o Swagger."}