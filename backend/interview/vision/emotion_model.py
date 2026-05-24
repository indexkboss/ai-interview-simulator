"""
emotion_model.py
----------------
Détection d'émotions faciales via DeepFace (backend: opencv).

Améliorations vs version initiale :
  - Score de stress émotionnel continu (0-1) au lieu de valeurs binaires
  - Pondération par la confiance de chaque émotion (distribution softmax réelle)
  - Détection de la valence affective (positif / négatif / neutre)
  - Gestion robuste des cas d'échec (pas de visage, image corrompue)
  - Compatible avec un pipeline multi-frames (moyenne glissante en dehors)
"""

from deepface import DeepFace
import numpy as np

# ── Mapping émotion → score de stress (0 = calme, 1 = très stressé) ──────────
# Basé sur le modèle circomplexe de Russell (valence × arousal)
EMOTION_STRESS_WEIGHT: dict[str, float] = {
    "angry":    0.90,   # arousal élevé, valence négative
    "fear":     0.85,   # arousal élevé, valence très négative
    "disgust":  0.70,   # arousal moyen-élevé, valence négative
    "sad":      0.55,   # arousal faible, valence négative
    "surprise": 0.40,   # arousal élevé mais valence ambiguë
    "neutral":  0.20,   # arousal faible, valence neutre
    "happy":    0.05,   # arousal moyen, valence positive
}

# ── Valence : utile pour le rapport final ────────────────────────────────────
EMOTION_VALENCE: dict[str, str] = {
    "angry":    "negative",
    "fear":     "negative",
    "disgust":  "negative",
    "sad":      "negative",
    "surprise": "ambiguous",
    "neutral":  "neutral",
    "happy":    "positive",
}


def predict_face_emotion(image_path: str) -> dict:
    """
    Analyse l'émotion faciale sur une image statique.

    Paramètres
    ----------
    image_path : str
        Chemin vers l'image (jpg, png, etc.)

    Retourne
    --------
    dict avec les clés :
        - dominant_emotion  (str)  : émotion la plus probable
        - emotions          (dict) : distribution complète en %
        - emotion_stress    (float): score de stress émotionnel [0, 1]
        - valence           (str)  : 'positive' | 'neutral' | 'negative' | 'ambiguous'
        - confidence        (float): confiance sur l'émotion dominante [0, 1]
        - face_detected     (bool)
    """
    try:
        result = DeepFace.analyze(
            img_path=image_path,
            actions=["emotion"],
            enforce_detection=False,
            detector_backend="opencv",   # rapide, stable
            silent=True,
        )

        face = result[0]
        dominant: str = face["dominant_emotion"]
        raw_emotions: dict[str, float] = face["emotion"]   # valeurs en %

        # ── Normalisation → probabilités [0, 1] ──────────────────────────────
        total = sum(raw_emotions.values()) or 1.0
        probs: dict[str, float] = {k: v / total for k, v in raw_emotions.items()}

        # ── Score de stress continu : somme pondérée sur toute la distribution
        # Évite le problème du seuil binaire (ex: fear=49% ignorée sinon)
        emotion_stress: float = sum(
            probs.get(emo, 0.0) * weight
            for emo, weight in EMOTION_STRESS_WEIGHT.items()
        )

        confidence: float = probs.get(dominant, 0.0)

        return {
            "dominant_emotion": dominant,
            "emotions": {k: round(v, 4) for k, v in probs.items()},
            "emotion_stress": round(emotion_stress, 3),
            "valence": EMOTION_VALENCE.get(dominant, "neutral"),
            "confidence": round(confidence, 3),
            "face_detected": True,
        }

    except Exception as e:
        # Aucun visage détecté ou image invalide → valeurs neutres par défaut
        return {
            "dominant_emotion": "unknown",
            "emotions": {},
            "emotion_stress": 0.3,   # valeur neutre conservatrice
            "valence": "neutral",
            "confidence": 0.0,
            "face_detected": False,
            "error": str(e),
        }


def aggregate_emotion_over_frames(frame_results: list[dict]) -> dict:
    """
    Agrège les résultats émotion sur plusieurs frames (usage vidéo/temps réel).

    Paramètres
    ----------
    frame_results : list[dict]
        Liste de résultats issus de predict_face_emotion()

    Retourne
    --------
    dict agrégé avec moyenne des scores et émotion dominante globale
    """
    valid = [r for r in frame_results if r.get("face_detected")]
    if not valid:
        return {"dominant_emotion": "unknown", "emotion_stress": 0.3, "face_detected": False}

    # Moyenne des scores de stress
    avg_stress = float(np.mean([r["emotion_stress"] for r in valid]))

    # Émotion dominante : celle avec la probabilité moyenne maximale
    emotion_keys = list(EMOTION_STRESS_WEIGHT.keys())
    avg_probs: dict[str, float] = {}
    for emo in emotion_keys:
        vals = [r["emotions"].get(emo, 0.0) for r in valid if r["emotions"]]
        avg_probs[emo] = float(np.mean(vals)) if vals else 0.0

    dominant = max(avg_probs, key=avg_probs.get) if avg_probs else "neutral"

    return {
        "dominant_emotion": dominant,
        "emotions": {k: round(v, 4) for k, v in avg_probs.items()},
        "emotion_stress": round(avg_stress, 3),
        "valence": EMOTION_VALENCE.get(dominant, "neutral"),
        "face_detected": True,
        "frames_analyzed": len(valid),
    }