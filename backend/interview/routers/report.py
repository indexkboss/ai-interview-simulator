"""
routers/report.py
-----------------
Génère le rapport final d'entretien avec Ollama/Mistral.

POST /api/report/generate  → génère rapport JSON complet

Améliorations v2 :
  - Utilise tous les nouveaux champs vision : posture_label, valence,
    breakdown, head_stability, tilt_angle, shoulder_alignment
  - Prompt restructuré avec section langage corporel détaillée
  - Fallback enrichi avec interprétations réelles des scores
  - Labels stress traduits en français pour le rapport
  - Conseils personnalisés selon le profil émotionnel détecté
"""

import json
import re
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

OLLAMA_URL   = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "mistral"
TIMEOUT      = 300.0


# ─────────────────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class QAItem(BaseModel):
    question: str
    answer: str

class EmotionLogItem(BaseModel):
    time: int
    emotion: str

class PostureData(BaseModel):
    posture_score:      float = 0.5
    posture_label:      str   = "unknown"
    shoulder_alignment: float = 0.5
    head_tilt:          float = 0.5
    forward_lean:       float = 0.5
    spine_alignment:    float = 0.5

class HeadData(BaseModel):
    head_stability:  float = 0.5
    tilt_angle:      float = 0.0
    vertical_angle:  float = 0.0

class StressBreakdown(BaseModel):
    emotion_contribution: float = 0.0
    eye_contribution:     float = 0.0
    head_contribution:    float = 0.0
    posture_contribution: float = 0.0

class ReportRequest(BaseModel):
    answers:             list[QAItem]
    emotion_log:         list[EmotionLogItem] = []
    duration:            int   = 0
    job_title:           str   = ""
    interview_type:      str   = "hr"

    # Scores globaux (moyennes de session)
    vision_stress_score: float = 0.0
    audio_stress_score:  float = 0.0

    # Nouveaux champs vision détaillés
    dominant_valence:    str   = "neutral"   # positive/negative/neutral
    avg_eye_contact:     float = 0.5
    posture:             PostureData  = PostureData()
    head_pose:           HeadData     = HeadData()
    stress_breakdown:    StressBreakdown = StressBreakdown()
    stress_label:        str   = "moderate"  # low/moderate/high/very_high


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _stress_label_fr(label: str) -> str:
    return {
        "low":       "faible",
        "moderate":  "modéré",
        "high":      "élevé",
        "very_high": "très élevé",
    }.get(label, "modéré")


def _posture_label_fr(label: str) -> str:
    return {
        "good":    "bonne",
        "fair":    "acceptable",
        "poor":    "mauvaise",
        "unknown": "non évaluée",
    }.get(label, "acceptable")


def _build_emotion_summary(emotion_log: list[EmotionLogItem]) -> str:
    if not emotion_log:
        return "Non disponible"
    counts: dict[str, int] = {}
    for entry in emotion_log:
        counts[entry.emotion] = counts.get(entry.emotion, 0) + 1
    sorted_e = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return ", ".join(f"{e}: {c} fois" for e, c in sorted_e[:5])


def _build_body_language_summary(req: ReportRequest) -> str:
    """Construit un résumé textuel du langage corporel pour le prompt."""
    lines = []

    # Contact visuel
    eye_pct = int(req.avg_eye_contact * 100)
    if req.avg_eye_contact >= 0.75:
        lines.append(f"Contact visuel : bon ({eye_pct}%) — regardait bien la caméra")
    elif req.avg_eye_contact >= 0.50:
        lines.append(f"Contact visuel : moyen ({eye_pct}%) — regard parfois fuyant")
    else:
        lines.append(f"Contact visuel : faible ({eye_pct}%) — évitait souvent la caméra")

    # Posture
    p = req.posture
    lines.append(
        f"Posture : {_posture_label_fr(p.posture_label)} (score {p.posture_score:.0%}) — "
        f"épaules {'alignées' if p.shoulder_alignment > 0.75 else 'déséquilibrées'}, "
        f"colonne {'droite' if p.spine_alignment > 0.75 else 'voûtée'}"
    )

    # Stabilité tête
    h = req.head_pose
    if h.head_stability >= 0.80:
        lines.append(f"Stabilité tête : bonne ({h.head_stability:.0%}) — tête droite et stable")
    elif h.head_stability >= 0.60:
        lines.append(f"Stabilité tête : moyenne ({h.head_stability:.0%}) — légères oscillations")
    else:
        lines.append(
            f"Stabilité tête : faible ({h.head_stability:.0%}) — "
            f"inclinaison de {h.tilt_angle:.1f}° détectée"
        )

    # Valence émotionnelle
    valence_map = {
        "positive":  "expressions majoritairement positives (sourires, confiance)",
        "negative":  "expressions majoritairement négatives (stress, inconfort visible)",
        "neutral":   "expressions neutres et contrôlées",
        "ambiguous": "expressions mixtes, difficile à interpréter",
    }
    lines.append(f"Valence émotionnelle : {valence_map.get(req.dominant_valence, 'neutre')}")

    # Contribution principale au stress
    bd = req.stress_breakdown
    contributions = {
        "émotions":    bd.emotion_contribution,
        "contact visuel": bd.eye_contribution,
        "mouvement tête": bd.head_contribution,
        "posture":     bd.posture_contribution,
    }
    main_factor = max(contributions, key=contributions.get)
    lines.append(f"Facteur de stress principal : {main_factor}")

    return "\n".join(f"  - {l}" for l in lines)


async def _call_ollama(prompt: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 1200,
            "num_ctx": 3000,
        }
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(OLLAMA_URL, json=payload)
        resp.raise_for_status()
        return resp.json()["response"].strip()


def _build_report_prompt(req: ReportRequest) -> str:
    answers_text = "\n".join(
        f"Q{i+1}: {qa.question[:100]} | R: {qa.answer[:200]}"
        for i, qa in enumerate(req.answers[:5])
    )
    emotion_summary    = _build_emotion_summary(req.emotion_log)
    body_language      = _build_body_language_summary(req)
    duration_str       = f"{req.duration // 60}min {req.duration % 60}s"
    stress_label_fr    = _stress_label_fr(req.stress_label)
    posture_label_fr   = _posture_label_fr(req.posture.posture_label)

    return f"""Tu es un expert en recrutement et psychologie comportementale.
Analyse cet entretien {req.interview_type} pour le poste "{req.job_title}".

=== DONNÉES ENTRETIEN ===
Durée : {duration_str}
Type : {req.interview_type.upper()}
Poste visé : {req.job_title}

=== ANALYSE NON-VERBALE (vision IA) ===
{body_language}
Stress visuel global : {req.vision_stress_score:.0%} ({stress_label_fr})
Stress vocal global  : {req.audio_stress_score:.0%}
Émotions détectées   : {emotion_summary}

=== RÉPONSES DU CANDIDAT ===
{answers_text}

=== INSTRUCTIONS ===
Réponds UNIQUEMENT avec ce JSON valide, sans markdown ni texte avant/après :
{{
  "score_global": <entier 0-100>,
  "points_forts": ["<point fort 1 en français>", "<point fort 2>", "<point fort 3>"],
  "axes_amelioration": ["<axe 1 en français>", "<axe 2>", "<axe 3>"],
  "analyse_langage_corporel": {{
    "resume": "<2-3 phrases sur posture={posture_label_fr}, contact visuel, stabilité tête>",
    "contact_visuel": "<1 phrase d'interprétation>",
    "posture": "<1 phrase d'interprétation>",
    "stabilite": "<1 phrase d'interprétation>",
    "impact_global": "<comment le langage corporel a influencé l'impression générale>"
  }},
  "analyse_stress": {{
    "niveau": "{stress_label_fr}",
    "interpretation": "<2 phrases : causes probables du stress + impact sur la performance>",
    "conseil": "<1 conseil concret pour gérer le stress en entretien>"
  }},
  "feedback_par_question": [
    {{
      "question": "<question>",
      "qualite": <0-10>,
      "ce_qui_etait_bien": "<point positif>",
      "ce_qui_manquait": "<point à améliorer>",
      "reponse_ideale": "<réponse idéale courte>"
    }}
  ],
  "conseil_final": "<3 phrases de conseil personnalisé tenant compte du profil émotionnel et du langage corporel>"
}}"""


# ─────────────────────────────────────────────────────────────────────────────
# FALLBACK ENRICHI
# ─────────────────────────────────────────────────────────────────────────────

def _fallback_report(req: ReportRequest) -> dict:
    """
    Rapport de secours si Ollama est indisponible.
    Utilise les scores réels pour générer des interprétations pertinentes.
    """
    stress_fr    = _stress_label_fr(req.stress_label)
    posture_fr   = _posture_label_fr(req.posture.posture_label)
    eye_pct      = int(req.avg_eye_contact * 100)
    stability_pct= int(req.head_pose.head_stability * 100)

    # ── Points forts basés sur les scores réels ───────────────────────────────
    points_forts = []
    if req.avg_eye_contact >= 0.70:
        points_forts.append(f"Bon contact visuel maintenu ({eye_pct}%) — signe de confiance")
    if req.posture.posture_label in ["good", "fair"]:
        points_forts.append(f"Posture {posture_fr} ({req.posture.posture_score:.0%}) — présentation soignée")
    if req.head_pose.head_stability >= 0.75:
        points_forts.append(f"Stabilité de la tête bonne ({stability_pct}%) — calme apparent")
    if req.dominant_valence == "positive":
        points_forts.append("Expressions positives dominantes — attitude engageante")
    if req.vision_stress_score < 0.40:
        points_forts.append("Niveau de stress contenu — bonne maîtrise émotionnelle")
    if len(req.answers) > 0:
        points_forts.append("A répondu à toutes les questions posées")
    if not points_forts:
        points_forts = ["Participation active", "Réponses fournies à toutes les questions"]

    # ── Axes d'amélioration basés sur les scores réels ────────────────────────
    axes = []
    if req.avg_eye_contact < 0.65:
        axes.append(f"Améliorer le contact visuel (actuellement {eye_pct}%) — regarder la caméra plus directement")
    if req.posture.posture_label == "poor":
        axes.append("Travailler la posture — se tenir droit, épaules alignées")
    if req.posture.shoulder_alignment < 0.70:
        axes.append("Aligner les épaules — éviter de se pencher d'un côté")
    if req.head_pose.head_stability < 0.65:
        axes.append(f"Réduire les mouvements de tête (inclinaison de {req.head_pose.tilt_angle:.1f}° détectée)")
    if req.vision_stress_score >= 0.55:
        axes.append("Travailler sur la gestion du stress avant l'entretien (respiration, préparation)")
    if req.dominant_valence == "negative":
        axes.append("Travailler sur les expressions faciales — sourire davantage, paraître plus à l'aise")
    if not axes:
        axes = ["Développer des exemples concrets (méthode STAR)", "Structurer davantage les réponses"]

    # ── Analyse langage corporel ──────────────────────────────────────────────
    contact_visuel_msg = (
        f"Contact visuel {eye_pct}% — {'bien maintenu, signe de confiance.' if eye_pct >= 70 else 'à améliorer, éviter de regarder ailleurs que la caméra.'}"
    )
    posture_msg = (
        f"Posture {posture_fr} avec un score de {req.posture.posture_score:.0%}. "
        + ("Les épaules sont bien alignées." if req.posture.shoulder_alignment > 0.75 else "Un déséquilibre des épaules est notable.")
    )
    stabilite_msg = (
        f"Tête {'stable' if req.head_pose.head_stability >= 0.75 else 'instable'} "
        f"({stability_pct}%), inclinaison de {req.head_pose.tilt_angle:.1f}°."
    )

    # ── Stress ────────────────────────────────────────────────────────────────
    stress_conseil = {
        "low":      "Continuez ainsi ! Votre calme est un atout majeur en entretien.",
        "moderate": "Pratiquez des exercices de respiration avant l'entretien pour réduire le stress résiduel.",
        "high":     "Préparez l'entretien à l'avance avec des simulations pour réduire l'anxiété situationnelle.",
        "very_high":"Consultez des techniques de gestion du stress (cohérence cardiaque, visualisation positive).",
    }.get(req.stress_label, "Travaillez sur la gestion du stress avec des simulations régulières.")

    return {
        "score_global": max(30, min(85, int(
            50
            + (req.avg_eye_contact - 0.5) * 30
            + (req.posture.posture_score - 0.5) * 20
            - req.vision_stress_score * 15
        ))),
        "points_forts": points_forts[:3],
        "axes_amelioration": axes[:3],
        "analyse_langage_corporel": {
            "resume": (
                f"Le candidat présente une posture {posture_fr} avec un contact visuel de {eye_pct}%. "
                f"La stabilité de la tête est {'bonne' if req.head_pose.head_stability >= 0.75 else 'à améliorer'}. "
                f"Les expressions sont majoritairement {req.dominant_valence}."
            ),
            "contact_visuel": contact_visuel_msg,
            "posture":        posture_msg,
            "stabilite":      stabilite_msg,
            "impact_global": (
                "Le langage corporel renforce positivement l'impression générale."
                if req.posture.posture_score >= 0.65 and req.avg_eye_contact >= 0.65
                else "Le langage corporel nécessite quelques ajustements pour renforcer la confiance perçue."
            ),
        },
        "analyse_stress": {
            "niveau":        stress_fr,
            "interpretation": (
                f"Le stress visuel est {stress_fr} ({req.vision_stress_score:.0%}), "
                f"principalement lié aux {'expressions émotionnelles' if req.stress_breakdown.emotion_contribution > 0.15 else 'signaux corporels'}. "
                f"Le stress vocal est de {req.audio_stress_score:.0%}."
            ),
            "conseil": stress_conseil,
        },
        "feedback_par_question": [
            {
                "question":        qa.question,
                "qualite":         5,
                "ce_qui_etait_bien": "Réponse fournie et structurée.",
                "ce_qui_manquait":   "Analyse détaillée non disponible (Ollama hors ligne).",
                "reponse_ideale":    "Utilisez la méthode STAR : Situation, Tâche, Action, Résultat.",
            }
            for qa in req.answers
        ],
        "conseil_final": (
            f"Votre profil émotionnel ({req.dominant_valence}) et votre posture {posture_fr} "
            f"constituent {'une bonne base' if req.posture.posture_score >= 0.65 else 'un axe de travail important'}. "
            f"Concentrez-vous sur {axes[0].lower() if axes else 'la structuration de vos réponses'}. "
            f"Continuez à vous entraîner avec des simulations d'entretien pour gagner en naturel et en confiance."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_report(req: ReportRequest):
    """Génère le rapport final d'entretien via Ollama."""
    if not req.answers:
        raise HTTPException(400, "Aucune réponse d'entretien fournie")

    prompt = _build_report_prompt(req)

    try:
        raw = await _call_ollama(prompt)
        print(f"[OLLAMA REPORT RAW]:\n{raw[:500]}\n")

        raw = re.sub(r"```json|```", "", raw).strip()

        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            raise ValueError("Aucun JSON trouvé dans la réponse Ollama")

        report_data = json.loads(match.group())
        return {
            "status": "success",
            "source": "ollama",
            "report": report_data,
        }

    except httpx.ConnectError:
        print("[REPORT] Ollama non disponible → fallback enrichi")
        return {
            "status":  "fallback",
            "source":  "ollama_offline",
            "message": "Ollama non disponible. Lancez : ollama serve",
            "report":  _fallback_report(req),
        }
    except (json.JSONDecodeError, ValueError) as e:
        print(f"[REPORT PARSE ERROR]: {e}")
        return {
            "status":  "fallback",
            "source":  "parse_error",
            "message": str(e),
            "report":  _fallback_report(req),
        }
    except Exception as e:
        print(f"[REPORT ERROR]: {type(e).__name__}: {e}")
        return {
            "status":  "fallback",
            "source":  "error",
            "message": str(e),
            "report":  _fallback_report(req),
        }