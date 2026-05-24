"""
llm/cv_parser.py
Extrait le texte d'un CV (PDF ou texte brut) et identifie les compétences clés.
Utilise PyMuPDF pour le PDF et optionnellement le LLM pour l'extraction structurée.
"""

import re
import httpx
from pathlib import Path

OLLAMA_URL   = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "mistral"


# ─────────────────────────────────────────────────────────────────────────────
# EXTRACTION PDF
# ─────────────────────────────────────────────────────────────────────────────

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extrait le texte brut d'un PDF avec PyMuPDF (fitz).
    Installe avec: pip install pymupdf
    """
    try:
        import fitz   # PyMuPDF
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except ImportError:
        raise RuntimeError("PyMuPDF non installé. Lancez: pip install pymupdf")
    except Exception as e:
        raise RuntimeError(f"Erreur lecture PDF: {e}")


def extract_text_from_upload(content: bytes, filename: str) -> str:
    """
    Extrait le texte depuis des bytes (upload FastAPI).
    Gère PDF et texte brut (.txt, .md).
    """
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        # Écriture temporaire pour PyMuPDF
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
        raise ValueError(f"Format non supporté: {ext}. Utilisez PDF, TXT ou MD.")


# ─────────────────────────────────────────────────────────────────────────────
# EXTRACTION STRUCTURÉE VIA LLM
# ─────────────────────────────────────────────────────────────────────────────

async def extract_cv_profile(cv_text: str) -> dict:
    """
    Utilise le LLM pour extraire un profil structuré depuis le texte brut du CV.
    Retourne: {skills, experience_years, education, languages, job_titles}
    """
    prompt = f"""Analyse ce CV et extrait les informations suivantes en JSON strict.
Réponds UNIQUEMENT avec le JSON, sans markdown ni commentaire.

CV:
{cv_text[:4000]}

Format JSON attendu:
{{
  "competences_techniques": ["liste", "des", "technologies"],
  "competences_soft": ["liste", "des", "soft skills"],
  "annees_experience": 0,
  "formations": ["diplôme 1", "diplôme 2"],
  "langues": ["français", "anglais"],
  "postes_precedents": ["titre poste 1", "titre poste 2"],
  "projets_notables": ["description courte projet 1"]
}}
"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(OLLAMA_URL, json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1}
            })
            raw = resp.json()["response"].strip()
            # Nettoyer le JSON si le LLM ajoute du markdown
            raw = re.sub(r"```json|```", "", raw).strip()
            import json
            return json.loads(raw)
    except Exception as e:
        print(f"[CV Parser] LLM extraction failed: {e}, using regex fallback")
        return _regex_extract(cv_text)


def _regex_extract(cv_text: str) -> dict:
    """
    Extraction basique par regex si le LLM est indisponible.
    Détecte les technologies courantes dans le texte.
    """
    tech_keywords = [
        "Python", "JavaScript", "TypeScript", "React", "Vue", "Angular",
        "Node.js", "FastAPI", "Django", "Flask", "Java", "Spring",
        "Docker", "Kubernetes", "AWS", "Azure", "GCP", "PostgreSQL",
        "MySQL", "MongoDB", "Redis", "Git", "CI/CD", "Machine Learning",
        "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn",
        "Pandas", "NumPy", "SQL", "REST", "GraphQL", "Microservices",
        "Linux", "Bash", "C++", "C#", ".NET", "PHP", "Laravel"
    ]

    found_skills = []
    text_lower = cv_text.lower()
    for kw in tech_keywords:
        if kw.lower() in text_lower:
            found_skills.append(kw)

    # Estimation années d'expérience (cherche des dates)
    years = re.findall(r"20[12]\d", cv_text)
    exp_years = 0
    if len(years) >= 2:
        years_int = sorted([int(y) for y in years])
        exp_years = years_int[-1] - years_int[0]

    return {
        "competences_techniques": found_skills,
        "competences_soft": [],
        "annees_experience": min(exp_years, 20),
        "formations": [],
        "langues": ["français"],
        "postes_precedents": [],
        "projets_notables": []
    }


def format_cv_summary(profile: dict) -> str:
    """Formate le profil extrait en texte lisible pour le prompt LLM."""
    parts = []
    if profile.get("competences_techniques"):
        parts.append("Compétences techniques: " + ", ".join(profile["competences_techniques"]))
    if profile.get("competences_soft"):
        parts.append("Soft skills: " + ", ".join(profile["competences_soft"]))
    if profile.get("annees_experience"):
        parts.append(f"Expérience: {profile['annees_experience']} ans")
    if profile.get("formations"):
        parts.append("Formation: " + "; ".join(profile["formations"]))
    if profile.get("postes_precedents"):
        parts.append("Postes: " + ", ".join(profile["postes_precedents"]))
    return "\n".join(parts)
