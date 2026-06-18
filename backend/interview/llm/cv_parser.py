"""
llm/cv_parser.py
Parse le CV avec Ollama (llama3.2:3b)
"""

import re
import requests
import json
from pathlib import Path

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2:3b"   # ✅ Remplacé gemma3:4b
TIMEOUT = 30             # ✅ Réduit à 30s


def extract_text_from_pdf(file_path: str) -> str:
    """Extrait texte depuis PDF"""
    try:
        import fitz
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except ImportError:
        raise RuntimeError("PyMuPDF non installé")
    except Exception as e:
        raise RuntimeError(f"Erreur PDF: {e}")


def extract_text_from_upload(content: bytes, filename: str) -> str:
    """Extrait texte depuis upload"""
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            return extract_text_from_pdf(tmp_path)
        finally:
            os.unlink(tmp_path)

    elif ext in [".txt", ".md"]:
        return content.decode("utf-8", errors="ignore")

    else:
        raise ValueError(f"Format non supporté: {ext}")


def _call_ollama(prompt: str) -> str:
    """Appel Ollama optimisé"""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "num_predict": 400,   # ✅ Assez pour le JSON CV
                    "num_ctx": 1500,      # ✅ Contexte moyen
                    "top_k": 10,
                }
            },
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            return response.json().get("response", "").strip()
        else:
            raise Exception(f"Ollama error {response.status_code}")
    
    except requests.exceptions.Timeout:
        print("[OLLAMA TIMEOUT] cv_parser fallback regex")
        return ""
    except Exception as e:
        print(f"[OLLAMA ERROR] {e}")
        return ""


async def extract_cv_profile(cv_text: str) -> dict:
    """Extrait profil depuis CV"""

    prompt = f"""Analyse ce CV. Réponds UNIQUEMENT avec ce JSON valide (rien d'autre):
{{
  "competences_techniques": ["skill1", "skill2"],
  "competences_soft": ["soft1"],
  "annees_experience": 2,
  "formations": ["formation1"],
  "langues": ["français"],
  "postes_precedents": ["poste1"],
  "projets_notables": ["projet1"]
}}

CV: {cv_text[:1500]}"""

    try:
        result = _call_ollama(prompt)

        if result:
            start = result.find("{")
            end = result.rfind("}") + 1

            if start != -1 and end > start:
                return json.loads(result[start:end])

        return _regex_extract(cv_text)

    except Exception as e:
        print(f"[CV Parser Error]: {e}")
        return _regex_extract(cv_text)


def _regex_extract(cv_text: str) -> dict:
    """Extraction basique par regex (fallback fiable)"""
    tech_keywords = [
        "Python", "JavaScript", "React", "Node.js", "FastAPI", "Django",
        "Docker", "AWS", "PostgreSQL", "MongoDB", "Git", "TensorFlow",
        "PyTorch", "SQL", "REST", "Java", "C++", "Machine Learning",
        "TypeScript", "Vue", "Angular", "Redis", "Kubernetes", "Linux"
    ]

    found_skills = [kw for kw in tech_keywords if kw.lower() in cv_text.lower()]
    years = re.findall(r"20[12]\d", cv_text)
    exp_years = 0
    if len(years) >= 2:
        years_int = sorted([int(y) for y in years])
        exp_years = min(years_int[-1] - years_int[0], 20)

    return {
        "competences_techniques": found_skills,
        "competences_soft": [],
        "annees_experience": exp_years,
        "formations": [],
        "langues": ["français"],
        "postes_precedents": [],
        "projets_notables": []
    }


def format_cv_summary(profile: dict) -> str:
    """Formate le résumé CV"""
    parts = []
    if profile.get("competences_techniques"):
        parts.append("Tech: " + ", ".join(profile["competences_techniques"][:5]))
    if profile.get("annees_experience"):
        parts.append(f"Exp: {profile['annees_experience']} ans")
    if profile.get("formations"):
        parts.append("Formations: " + "; ".join(profile["formations"][:2]))
    return "\n".join(parts)