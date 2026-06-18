"""
llm/question_generator.py
Génère des questions techniques et RH avec Ollama (llama3.2:3b)
"""

import json
import random
import re
import requests
from pathlib import Path

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2:3b"   # ✅ Remplacé gemma3:4b
TIMEOUT = 30             # ✅ Réduit de 90 à 30s

_DATA_PATH = Path(__file__).parent.parent / "data" / "hr_questions.json"
_HR_DATA = {}
try:
    with open(_DATA_PATH, encoding="utf-8") as f:
        _HR_DATA = json.load(f)
except Exception:
    _HR_DATA = {"categories": {}}


def _call_ollama(prompt: str) -> str:
    """Appel générique Ollama avec options optimisées"""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 200,   # ✅ Limite tokens
                    "num_ctx": 1024,      # ✅ Contexte court
                    "top_k": 20,
                }
            },
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            return response.json().get("response", "") or ""
        else:
            raise Exception(f"Ollama error {response.status_code}")
    
    except requests.exceptions.Timeout:
        print("[OLLAMA TIMEOUT] question_generator fallback")
        return ""
    except Exception as e:
        print(f"[OLLAMA ERROR] {e}")
        return ""


async def generate_technical_questions(cv_text: str, job_title: str, n: int = 5) -> list[str]:
    # Prompt court et direct → réponse plus rapide
    prompt = f"""Recruteur senior. Génère {n} questions techniques courtes pour: {job_title}
CV: {cv_text[:150]}

RÈGLES: une question par ligne, finit par ?, pas de numéro, pas d'intro."""
    
    try:
        result = _call_ollama(prompt)
        questions = [q.strip() for q in result.split('\n') if q.strip() and '?' in q]
        return questions[:n] if questions else _fallback_technical(job_title, n)
    except Exception as e:
        print(f"[Tech Questions Error]: {e}")
        return _fallback_technical(job_title, n)


def get_hr_questions(categories: list[str] | None = None, n: int = 5) -> list[dict]:
    """Retourne des questions RH depuis la base locale"""
    pool = []
    if not _HR_DATA or "categories" not in _HR_DATA:
        return [{"question": "Parlez-moi de vous.", "category": "general"}]
        
    cats = categories or list(_HR_DATA["categories"].keys())
    for cat in cats:
        if cat in _HR_DATA["categories"]:
            for q in _HR_DATA["categories"][cat]:
                pool.append({"question": q, "category": cat})
    random.shuffle(pool)
    return pool[:n]


async def generate_hr_questions_with_llm(job_title: str, job_description: str = "", n: int = 5) -> list[str]:
    """Génère n questions RH"""
    prompt = f"""Recruteur RH. Génère {n} questions RH en français pour: {job_title}
{job_description[:150]}
Une question par ligne. Chaque question finit par ?"""
    
    try:
        result = _call_ollama(prompt)
        questions = [q.strip() for q in result.split('\n') if q.strip() and '?' in q]
        return questions[:n] if questions else [q["question"] for q in get_hr_questions(n=n)]
    except Exception as e:
        print(f"[HR Questions Error]: {e}")
        fallback = get_hr_questions(n=n)
        return [q.get("question", "Parlez-moi de vous.") for q in fallback]


async def generate_next_question(history: list[dict], interview_type: str, job_title: str, cv_text: str = "") -> str:
    """Génère une relance contextuelle"""
    last_answer = ""
    for turn in reversed(history):
        if turn.get("role") == "user":
            last_answer = turn.get("content", "")[:200]
            break

    if not last_answer:
        return "Pouvez-vous me décrire votre parcours ?"

    prompt = f"""Recruteur pour {job_title}.
Candidat: "{last_answer}"
Pose UNE relance courte en français. Juste la question, finit par ?"""

    try:
        result = _call_ollama(prompt)
        lines = [l.strip() for l in result.split('\n') if l.strip() and '?' in l]
        return lines[0] if lines else "Pouvez-vous développer ce point ?"
    except Exception as e:
        print(f"[Next Question Error]: {e}")
        return "Pouvez-vous développer ce point ?"


def _fallback_technical(job_title: str, n: int) -> list[str]:
    generic = [
        f"Quelles sont vos compétences principales pour un poste de {job_title} ?",
        "Comment structurez-vous vos projets techniques ?",
        "Décrivez un projet complexe que vous avez réalisé.",
        "Comment gérez-vous les bugs en production ?",
        "Quelles sont vos bonnes pratiques de sécurité ?"
    ]
    return generic[:n]