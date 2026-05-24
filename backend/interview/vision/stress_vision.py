"""
stress_vision.py
----------------
Calcul du score de stress visuel global à partir de 4 signaux.

Améliorations vs version initiale :
  - Utilise emotion_stress (continu) au lieu du mapping binaire dominant_emotion
  - Pondération par la confiance de détection (face_detected, pose_detected)
  - Poids réajustés et justifiés (littérature entretiens comportementaux)
  - Retourne un breakdown détaillé pour le rapport final
  - Labels interprétatifs (low / moderate / high / very_high)
"""

from __future__ import annotations


# ── Poids des composantes ─────────────────────────────────────────────────────
# Basé sur : Cohn et al. (2009), Ekman facial action units en contexte professionnel
# + études sur le stress en entretien (Langer et al. 2019)
WEIGHTS = {
    "emotion":  0.40,   # signal le plus discriminant (expressions faciales)
    "eye":      0.20,   # contact visuel : signal social fort
    "head":     0.20,   # stabilité de la tête : agitation / nervosité
    "posture":  0.20,   # posture : indicateur de confiance en soi
}


def compute_vision_stress(
    emotion_data: dict,
    eye_data:     dict,
    head_data:    dict,
    posture_data: dict,
) -> dict:
    """
    Calcule le score de stress visuel global.

    Paramètres
    ----------
    emotion_data  : sortie de emotion_model.predict_face_emotion()
    eye_data      : sortie de eye_contact.analyze_eye_contact()
    head_data     : sortie de head_pose.analyze_head_pose()
    posture_data  : sortie de posture.analyze_posture()

    Retourne
    --------
    dict avec :
        - stress_score  (float) : score global [0, 1]
        - stress_label  (str)   : 'low' | 'moderate' | 'high' | 'very_high'
        - breakdown     (dict)  : contribution de chaque composante
        - confidence    (float) : fiabilité globale de la mesure [0, 1]
    """

    # ── 1. Score émotion ─────────────────────────────────────────────────────
    # Utilise emotion_stress (score continu) si disponible,
    # sinon repli sur le mapping par émotion dominante (rétrocompat)
    if "emotion_stress" in emotion_data:
        emotion_score: float = emotion_data["emotion_stress"]
    else:
        emotion_score = _dominant_to_stress(emotion_data.get("dominant_emotion", "neutral"))

    emotion_confidence: float = float(emotion_data.get("confidence", 0.5))
    emotion_detected:   bool  = emotion_data.get("face_detected", True)

    # ── 2. Score contact visuel ───────────────────────────────────────────────
    eye_score: float = 1.0 - float(eye_data.get("eye_contact_score", 0.5))

    # ── 3. Score stabilité tête ───────────────────────────────────────────────
    stability_score: float = 1.0 - float(head_data.get("head_stability", 0.5))

    # ── 4. Score posture ──────────────────────────────────────────────────────
    posture_score: float = 1.0 - float(posture_data.get("posture_score", 0.5))
    pose_detected: bool  = posture_data.get("pose_detected", True)

    # ── 5. Score composite ────────────────────────────────────────────────────
    raw_stress: float = (
        WEIGHTS["emotion"] * emotion_score  +
        WEIGHTS["eye"]     * eye_score      +
        WEIGHTS["head"]    * stability_score +
        WEIGHTS["posture"] * posture_score
    )
    stress_score = round(min(max(raw_stress, 0.0), 1.0), 3)

    # ── 6. Fiabilité globale ──────────────────────────────────────────────────
    # Pénalise si visage ou pose non détectés
    detection_factor = (
        (1.0 if emotion_detected else 0.5) +
        (1.0 if pose_detected    else 0.5)
    ) / 2.0
    confidence = round(detection_factor * emotion_confidence, 3)

    # ── 7. Label interprétatif ────────────────────────────────────────────────
    label = _stress_label(stress_score)

    return {
        "stress_score": stress_score,
        "stress_label": label,
        "breakdown": {
            "emotion_contribution":  round(WEIGHTS["emotion"] * emotion_score,   3),
            "eye_contribution":      round(WEIGHTS["eye"]     * eye_score,        3),
            "head_contribution":     round(WEIGHTS["head"]    * stability_score,  3),
            "posture_contribution":  round(WEIGHTS["posture"] * posture_score,    3),
        },
        "raw_scores": {
            "emotion_stress":   round(emotion_score,    3),
            "eye_stress":       round(eye_score,        3),
            "head_stress":      round(stability_score,  3),
            "posture_stress":   round(posture_score,    3),
        },
        "confidence": confidence,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

_DOMINANT_STRESS_MAP: dict[str, float] = {
    "angry":    0.90,
    "fear":     0.85,
    "disgust":  0.70,
    "sad":      0.55,
    "surprise": 0.40,
    "neutral":  0.20,
    "happy":    0.05,
}

def _dominant_to_stress(dominant: str) -> float:
    """Repli rétrocompat : mapping émotion dominante → score stress."""
    return _DOMINANT_STRESS_MAP.get(dominant.lower(), 0.30)


def _stress_label(score: float) -> str:
    if score < 0.30:
        return "low"
    elif score < 0.55:
        return "moderate"
    elif score < 0.75:
        return "high"
    else:
        return "very_high"