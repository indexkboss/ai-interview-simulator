import sys
import os
from dotenv import load_dotenv

load_dotenv()   # ← charge le .env

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "interview"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import interview, analyze, report

app = FastAPI(title="AI Interview Simulator", version="2.0")



app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview.router, prefix="/api/interview", tags=["interview"])
app.include_router(analyze.router,   prefix="/api/analyze",   tags=["analyze"])
app.include_router(report.router,    prefix="/api/report",    tags=["report"])

@app.get("/health")
def health():
    return {"status": "ok", "ollama": "http://localhost:11434"}