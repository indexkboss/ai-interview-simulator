"""
routers/interview.py (CLEAN VERSION)

Endpoints:
- POST /ask
- POST /start
- POST /next
- POST /upload-cv
- GET  /hr-questions
- GET  /session/{id}
- PUT  /session/{id}/complete
"""


from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from database import get_db
from models_sqlalchemy import InterviewSession

from interview.llm.gemini_service import ask_gemini

from interview.llm.question_generator import (
    generate_technical_questions,
    get_hr_questions,
    generate_hr_questions_with_llm,
    generate_next_question
)

from interview.llm.cv_parser import (
    extract_text_from_upload,
    extract_cv_profile,
    format_cv_summary
)

router = APIRouter()


# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────

class PromptRequest(BaseModel):
    prompt: str


class StartSessionRequest(BaseModel):
    job_title: str
    interview_type: str = "hr"
    job_description: str = ""
    cv_text: str = ""
    n_questions: int = 5
    user_id: str = ""


class NextQuestionRequest(BaseModel):
    session_id: str
    history: list[dict]


# ─────────────────────────────────────────────
# /ask  (utilisé par Interview.jsx)
# ─────────────────────────────────────────────

@router.post("/ask")
def ask_question(req: PromptRequest):
    """Point d'entrée principal depuis le frontend"""
    result = ask_gemini(req.prompt)
    return {"response": result}


# ─────────────────────────────────────────────
# UPLOAD CV
# ─────────────────────────────────────────────

@router.post("/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "Fichier manquant")

    allowed = [".pdf", ".txt", ".md"]
    ext = "." + file.filename.split(".")[-1].lower()

    if ext not in allowed:
        raise HTTPException(400, "Format non supporté")

    content = await file.read()

    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, "Fichier trop volumineux")

    try:
        cv_text = extract_text_from_upload(content, file.filename)
        profile = await extract_cv_profile(cv_text)

        return {
            "status": "success",
            "cv_text": cv_text[:5000],
            "profile": profile,
            "summary": format_cv_summary(profile)
        }

    except Exception as e:
        raise HTTPException(500, f"Erreur CV: {str(e)}")


# ─────────────────────────────────────────────
# START SESSION
# ─────────────────────────────────────────────

@router.post("/start")
async def start_session(req: StartSessionRequest, db: Session = Depends(get_db)):

    session_id = str(uuid.uuid4())
    questions = []

    if req.interview_type in ["technical", "full"]:
        tech_q = await generate_technical_questions(
            cv_text=req.cv_text,
            job_title=req.job_title,
            n=req.n_questions
        )
        questions += [{"type": "technical", "question": q} for q in tech_q]

    if req.interview_type in ["hr", "full"]:
        n_hr = req.n_questions
        if req.job_description:
            hr_q = await generate_hr_questions_with_llm(
                job_title=req.job_title,
                job_description=req.job_description,
                n=n_hr
            )
            questions += [{"type": "hr", "question": q} for q in hr_q]
        else:
            hr_q = get_hr_questions(n=n_hr)
            questions += [{"type": "hr", "question": q["question"]} for q in hr_q]

    # Fallback si aucune question générée
    if not questions:
        questions = [
            {"type": "hr", "question": "Présentez-vous en quelques mots."},
            {"type": "hr", "question": "Pourquoi postulez-vous à ce poste ?"},
            {"type": "hr", "question": "Quelles sont vos principales compétences ?"},
            {"type": "hr", "question": "Décrivez un projet dont vous êtes fier."},
            {"type": "hr", "question": "Où vous voyez-vous dans 5 ans ?"},
        ]

    db_session = InterviewSession(
        session_id=session_id,
        user_id=req.user_id or None,
        interview_type=req.interview_type,
        job_title=req.job_title,
        job_description=req.job_description or None,
        cv_text=req.cv_text or None,
        current_question_index=0,
        questions_generated=questions,
        history=[]
    )

    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    return {
        "session_id": session_id,
        "first_question": questions[0]["question"],
        "total_questions": len(questions),
        "interview_type": req.interview_type
    }


# ─────────────────────────────────────────────
# NEXT QUESTION
# ─────────────────────────────────────────────

@router.post("/next")
async def next_question(req: NextQuestionRequest, db: Session = Depends(get_db)):

    # ✅ CORRIGÉ: plus d'import "from flask import session" qui écrasait la variable
    db_session = db.query(InterviewSession).filter(
        InterviewSession.session_id == req.session_id
    ).first()

    if not db_session:
        raise HTTPException(404, "Session introuvable")

    if db_session.is_expired:
        raise HTTPException(410, "Session expirée")

    db_session.history = req.history
    db_session.last_activity = datetime.utcnow()

    idx = db_session.current_question_index + 1
    db_session.current_question_index = idx

    # Questions pré-générées disponibles → retour immédiat (0 délai)
    if idx < len(db_session.questions_generated):
        item = db_session.questions_generated[idx]
        q = item["question"] if isinstance(item, dict) else item
        db.commit()
        return {"question": q, "index": idx, "source": "cached"}

    # Questions dynamiques via Ollama
    q = await generate_next_question(
        history=req.history,
        interview_type=db_session.interview_type,
        job_title=db_session.job_title,
        cv_text=db_session.cv_text or ""
    )

    db.commit()
    return {"question": q, "index": idx, "source": "dynamic"}


# ─────────────────────────────────────────────
# HR QUESTIONS
# ─────────────────────────────────────────────

@router.get("/hr-questions")
def hr_questions(categories: str = "", n: int = 5):
    cats = categories.split(",") if categories else None
    data = get_hr_questions(categories=cats, n=n)
    return {"questions": data, "count": len(data)}


# ─────────────────────────────────────────────
# SESSION GET
# ─────────────────────────────────────────────

@router.get("/session/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):

    db_session = db.query(InterviewSession).filter(
        InterviewSession.session_id == session_id
    ).first()

    if not db_session:
        raise HTTPException(404, "Session introuvable")

    return {
        "session_id": db_session.session_id,
        "user_id": db_session.user_id,
        "job_title": db_session.job_title,
        "interview_type": db_session.interview_type,
        "questions_generated": db_session.questions_generated,
        "history": db_session.history,
        "current_question_index": db_session.current_question_index,
        "is_completed": db_session.is_completed,
        "started_at": db_session.started_at,
        "last_activity": db_session.last_activity,
    }


# ─────────────────────────────────────────────
# COMPLETE SESSION
# ─────────────────────────────────────────────

@router.put("/session/{session_id}/complete")
def complete_session(session_id: str, db: Session = Depends(get_db)):

    db_session = db.query(InterviewSession).filter(
        InterviewSession.session_id == session_id
    ).first()

    if not db_session:
        raise HTTPException(404, "Session introuvable")

    db_session.is_completed = True
    db.commit()

    return {"status": "completed"}