"""
main.py (VERSION CORRIGÉE)
"""

import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# ✅ IMPORTS BD (depuis racine backend/)
from database import init_db
from interview.routers import interview, analyze, report


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Démarrage et arrêt de l'app"""
    print("\n" + "="*60)
    print("🚀 Démarrage de PrepAI Interview Simulator")
    print("="*60)
    init_db()
    print("✅ Base de données prête")
    print("="*60 + "\n")
    
    yield
    
    print("\n✅ Application arrêtée proprement")


app = FastAPI(
    title="PrepAI Interview Simulator",
    version="2.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROUTERS
app.include_router(interview.router, prefix="/api/interview", tags=["interview"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(report.router, prefix="/api/report", tags=["report"])

# HEALTH CHECK
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "PrepAI Interview Simulator",
        "version": "2.0",
        "database": "✅ SQLAlchemy initialized"
    }

@app.get("/")
def root():
    return {
        "message": "Bienvenue sur PrepAI Interview Simulator",
        "docs": "/docs",
        "health": "/health",
        "api_version": "2.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )