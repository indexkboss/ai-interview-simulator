# ==========================================
# models_sqlalchemy.py
# Modèles SQLAlchemy pour FastAPI
# (Remplace les Django models)
# ==========================================

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON, Boolean
from sqlalchemy.sql import func
from database import Base
from datetime import datetime


class Interview(Base):
    """
    Enregistre chaque entretien complété avec ses résultats.
    """
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    
    # Métadonnées
    session_id = Column(String(100), unique=True, index=True)
    user_id = Column(String(255), nullable=True, index=True)  # Firebase UID ou email
    
    interview_type = Column(String(20))  # "hr" | "technical" | "full"
    job_title = Column(String(255))
    job_description = Column(Text, nullable=True)
    
    # Données de l'entretien
    qa_pairs = Column(JSON, default=list)  # [{"question": "...", "answer": "..."}, ...]
    emotion_log = Column(JSON, default=list)  # [{"time": 5, "emotion": "happy"}, ...]
    duration_seconds = Column(Integer, default=0)
    
    # Scores
    global_score = Column(Float, default=0.0)
    verbal_score = Column(Float, default=0.0)
    stress_score = Column(Float, default=0.0)
    body_language_score = Column(Float, default=0.0)
    text_quality_score = Column(Float, default=0.0)
    
    # Rapport détaillé (JSON retourné par Gemini)
    report_data = Column(JSON, nullable=True)
    
    # Feedback
    feedback = Column(JSON, default=list)  # ["feedback 1", "feedback 2", ...]
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Interview {self.id}: {self.job_title} ({self.global_score}/100)>"


class InterviewSession(Base):
    """
    Session temporaire pendant l'entretien.
    Sert à tracker l'état en temps réel.
    """
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    
    session_id = Column(String(100), unique=True, index=True)
    user_id = Column(String(255), nullable=True, index=True)
    
    interview_type = Column(String(20))  # "hr" | "technical" | "full"
    job_title = Column(String(255))
    job_description = Column(Text, nullable=True)
    cv_text = Column(Text, nullable=True)  # Texte CV extrait
    
    # État de la session
    current_question_index = Column(Integer, default=0)
    questions_generated = Column(JSON, default=list)  # Questions pré-générées
    history = Column(JSON, default=list)  # [{"role": "user|assistant", "content": "..."}]
    
    # Flags
    is_completed = Column(Boolean, default=False)
    is_expired = Column(Boolean, default=False)
    
    # Timestamps
    started_at = Column(DateTime, server_default=func.now())
    last_activity = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<InterviewSession {self.session_id}: {self.job_title}>"
    