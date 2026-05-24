"""
llm/question_generator.py
Génère des questions techniques depuis un CV et des questions RH depuis dataset.
Utilise Ollama (Mistral) avec paramètres optimisés pour réponse rapide.
"""

import json
import random
import re
import httpx
from pathlib import Path

# ── Configuration Ollama ──────────────────────────────────────────────────────
OLLAMA_URL   = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "mistral"
TIMEOUT      = 300.0  # 5 minutes max

# ── Dataset RH ───────────────────────────────────────────────────────────────
_DATA_PATH = Path(__file__).parent.parent / "data" / "hr_questions.json"
with open(_DATA_PATH, encoding="utf-8") as f:
    _HR_DATA = json.load(f)


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

async def _call_ollama(prompt: str) -> str:
    """Appel async à Ollama avec paramètres optimisés pour réponse rapide."""
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 150,   # court = rapide
            "num_ctx": 512        # contexte réduit = rapide
        }
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(OLLAMA_URL, json=payload)
        resp.raise_for_status()
        result = resp.json()["response"].strip()
        print(f"[OLLAMA RAW RESPONSE]:\n{result}\n")
        return result


def _clean_list(raw: str) -> list[str]:
    """Extrait une liste de questions depuis une réponse LLM brute."""
    lines = raw.splitlines()
    questions = []
    for line in lines:
        line = re.sub(r"^[\d\.\-\*\)\s]+", "", line).strip()
        if len(line) > 10 and "?" in line:
            questions.append(line)
    print(f"[PARSED QUESTIONS]: {questions}")
    return questions[:5]


# ─────────────────────────────────────────────────────────────────────────────
# API PUBLIQUE
# ─────────────────────────────────────────────────────────────────────────────

async def generate_technical_questions(
    cv_text: str,
    job_title: str,
    n: int = 5
) -> list[str]:
    """Génère n questions techniques depuis le CV via Ollama/Mistral."""
    prompt = f"List {n} technical interview questions in French for a {job_title} with skills: {cv_text[:200]}. Format: numbered list only, each ending with ?."

    try:
        raw = await _call_ollama(prompt)
        questions = _clean_list(raw)
        if not questions:
            print("[LLM] Parsing vide → fallback")
            return _fallback_technical(job_title, n)
        return questions
    except Exception as e:
        print(f"[LLM ERROR]: {type(e).__name__}: {e}")
        return _fallback_technical(job_title, n)


def get_hr_questions(
    categories: list[str] | None = None,
    n: int = 5
) -> list[dict]:
    """Retourne n questions RH tirées du dataset local."""
    pool = []
    cats = categories or list(_HR_DATA["categories"].keys())
    for cat in cats:
        if cat in _HR_DATA["categories"]:
            for q in _HR_DATA["categories"][cat]:
                pool.append({"question": q, "category": cat})
    random.shuffle(pool)
    return pool[:n]


async def generate_hr_questions_with_llm(
    job_title: str,
    job_description: str = "",
    n: int = 5
) -> list[str]:
    """Génère des questions RH via Ollama ou dataset en fallback."""
    prompt = f"List {n} HR interview questions in French for a {job_title} position. Format: numbered list only, each ending with ?."

    try:
        raw = await _call_ollama(prompt)
        questions = _clean_list(raw)
        if questions:
            return questions
    except Exception as e:
        print(f"[LLM HR ERROR]: {type(e).__name__}: {e}")

    # Fallback dataset local
    return [q["question"] for q in get_hr_questions(n=n)]


async def generate_next_question(
    history: list[dict],
    interview_type: str,
    job_title: str,
    cv_text: str = ""
) -> str:
    """Génère la prochaine question contextuelle selon l'historique."""
    # Dernière réponse du candidat seulement
    last_answer = ""
    for turn in reversed(history):
        if turn["role"] == "user":
            last_answer = turn["content"][:200]
            break

    type_map = {
        "hr":        "HR (motivation, soft skills)",
        "technical": "technical (code, algorithms)",
        "full":      "HR or technical"
    }
    interview_style = type_map.get(interview_type, "general")

    prompt = f"You are interviewing for {job_title}. Candidate said: '{last_answer}'. Ask one short {interview_style} follow-up question in French ending with ?."

    try:
        result = await _call_ollama(prompt)
        # Prendre seulement la première ligne si réponse longue
        lines = [l.strip() for l in result.splitlines() if l.strip() and "?" in l]
        return lines[0] if lines else result
    except Exception as e:
        print(f"[LLM NEXT ERROR]: {type(e).__name__}: {e}")
        fallbacks = {
            "hr":        "Pouvez-vous me donner un exemple concret de cette compétence ?",
            "technical": "Comment implémenteriez-vous cela dans un projet réel ?",
            "full":      "Qu'avez-vous appris de cette expérience ?"
        }
        return fallbacks.get(interview_type, "Pouvez-vous développer davantage ?")


# ─────────────────────────────────────────────────────────────────────────────
# FALLBACKS STATIQUES
# ─────────────────────────────────────────────────────────────────────────────

def _fallback_technical(job_title: str, n: int) -> list[str]:
    """Questions techniques génériques si Ollama est indisponible."""
    generic = [
        f"Quelle est votre expérience avec les outils principaux pour {job_title} ?",
        "Décrivez l'architecture d'un projet complexe que vous avez réalisé.",
        "Comment gérez-vous le versioning et la collaboration sur du code ?",
        "Expliquez comment vous déboguez un problème difficile en production.",
        "Comment assurez-vous la qualité et la maintenabilité de votre code ?",
        "Parlez-moi d'une optimisation de performance que vous avez réalisée.",
        "Comment abordez-vous la sécurité dans vos développements ?"
    ]
    return generic[:n]