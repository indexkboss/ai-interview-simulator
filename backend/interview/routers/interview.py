"""
routers/interview.py
Endpoints pour démarrer et gérer une session d'entretien.

POST /api/interview/start          → démarre une session, génère la 1ère question
POST /api/interview/next           → génère la question suivante (contextuelle)
POST /api/interview/upload-cv      → upload CV PDF, retourne profil extrait
GET  /api/interview/hr-questions   → retourne questions RH depuis dataset
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import uuid

from llm.question_generator import (
    generate_technical_questions,
    get_hr_questions,
    generate_hr_questions_with_llm,
    generate_next_question
)
from llm.cv_parser import extract_text_from_upload, extract_cv_profile, format_cv_summary

router = APIRouter()

# ── Sessions en mémoire (remplacer par Redis/DB en prod) ──────────────────
_sessions: dict[str, dict] = {}


# ─────────────────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    job_title: str
    interview_type: str = "hr"           # "hr" | "technical" | "full"
    job_description: str = ""
    cv_text: str = ""                    # texte CV déjà extrait (optionnel)
    n_questions: int = 5


class NextQuestionRequest(BaseModel):
    session_id: str
    history: list[dict]                  # [{"role": "assistant"|"user", "content": "..."}]


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    """
    Upload d'un CV PDF/TXT.
    Retourne: texte extrait + profil structuré (compétences, expérience, etc.)
    """
    if not file.filename:
        raise HTTPException(400, "Fichier manquant")

    allowed = [".pdf", ".txt", ".md"]
    ext = "." + file.filename.split(".")[-1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Format non supporté. Utilisez: {', '.join(allowed)}")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:    # 5 MB max
        raise HTTPException(413, "Fichier trop volumineux (max 5 MB)")

    try:
        cv_text = extract_text_from_upload(content, file.filename)
        profile = await extract_cv_profile(cv_text)
        return {
            "status": "success",
            "cv_text": cv_text[:5000],    # tronqué pour éviter surcharge
            "profile": profile,
            "summary": format_cv_summary(profile)
        }
    except Exception as e:
        raise HTTPException(500, f"Erreur traitement CV: {str(e)}")


@router.post("/start")
async def start_session(req: StartSessionRequest):
    """
    Démarre une nouvelle session d'entretien.
    Génère un lot de questions adaptées au type et au CV.
    """
    session_id = str(uuid.uuid4())

    # Génération questions selon type
    questions = []

    if req.interview_type in ["technical", "full"]:
        tech_q = await generate_technical_questions(
            cv_text=req.cv_text,
            job_title=req.job_title,
            n=req.n_questions if req.interview_type == "technical" else req.n_questions // 2
        )
        questions.extend([{"type": "technical", "question": q} for q in tech_q])

    if req.interview_type in ["hr", "full"]:
        n_hr = req.n_questions if req.interview_type == "hr" else req.n_questions // 2 + req.n_questions % 2
        if req.job_description:
            hr_q = await generate_hr_questions_with_llm(
                job_title=req.job_title,
                job_description=req.job_description,
                n=n_hr
            )
            questions.extend([{"type": "hr", "question": q} for q in hr_q])
        else:
            hr_raw = get_hr_questions(n=n_hr)
            questions.extend([{"type": "hr", "question": q["question"]} for q in hr_raw])

    # Mélanger hr et tech pour "full"
    if req.interview_type == "full":
        import random
        random.shuffle(questions)

    # Stocker la session
    _sessions[session_id] = {
        "session_id": session_id,
        "job_title": req.job_title,
        "interview_type": req.interview_type,
        "cv_text": req.cv_text,
        "questions": questions,
        "current_index": 0,
        "history": []
    }

    first_question = questions[0]["question"] if questions else "Pouvez-vous vous présenter ?"

    return {
        "session_id": session_id,
        "first_question": first_question,
        "total_questions": len(questions),
        "interview_type": req.interview_type
    }


@router.post("/next")
async def next_question(req: NextQuestionRequest):
    """
    Génère la prochaine question en tenant compte du contexte (réponse précédente).
    Deux modes:
      - Si questions pré-générées restantes → retourne la suivante du lot
      - Sinon → génère dynamiquement avec LLM selon l'historique
    """
    session = _sessions.get(req.session_id)
    if not session:
        raise HTTPException(404, "Session introuvable ou expirée")

    session["history"] = req.history
    idx = session["current_index"] + 1
    session["current_index"] = idx

    # Questions pré-générées disponibles
    if idx < len(session["questions"]):
        q = session["questions"][idx]["question"]
        return {"question": q, "index": idx, "source": "pregenerated"}

    # Plus de questions pré-générées → génération contextuelle
    q = await generate_next_question(
        history=req.history,
        interview_type=session["interview_type"],
        job_title=session["job_title"],
        cv_text=session.get("cv_text", "")
    )
    return {"question": q, "index": idx, "source": "dynamic"}


@router.get("/hr-questions")
def get_hr_questions_endpoint(
    categories: str = "",
    n: int = 5
):
    """
    Retourne des questions RH depuis le dataset local.
    categories: liste séparée par virgules (motivation,parcours,soft_skills,...)
    """
    cats = [c.strip() for c in categories.split(",")] if categories else None
    questions = get_hr_questions(categories=cats, n=n)
    return {"questions": questions, "count": len(questions)}
