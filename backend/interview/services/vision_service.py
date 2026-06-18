"""
vision_service.py
-----------------
Orchestrateur principal de la chaîne d'analyse visuelle.
Imports directs (sans préfixe 'interview.') → fonctionne depuis backend/interview/
"""

from __future__ import annotations
import time
import os
import sys

# ── Garantit que vision/ et services/ sont trouvables ────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
_INTERVIEW = os.path.dirname(_HERE)   # remonte à interview/
for _p in [_INTERVIEW, _HERE]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from vision.emotion_model import predict_face_emotion
from vision.eye_contact   import analyze_eye_contact
from vision.head_pose     import analyze_head_pose
from vision.posture       import analyze_posture
from vision.stress_vision import compute_vision_stress


def analyze_face(image_path: str) -> dict:
    """Pipeline complet sur une image."""
    t0 = time.perf_counter()

    emotion_data = predict_face_emotion(image_path)
    eye_data     = analyze_eye_contact(image_path)
    head_data    = analyze_head_pose(image_path)
    posture_data = analyze_posture(image_path)

    stress_data = compute_vision_stress(
        emotion_data=emotion_data,
        eye_data=eye_data,
        head_data=head_data,
        posture_data=posture_data,
    )

    return {
        "emotion":            emotion_data,
        "eye_contact":        eye_data,
        "head_pose":          head_data,
        "posture":            posture_data,
        "stress":             stress_data,
        "processing_time_ms": round((time.perf_counter() - t0) * 1000),
    }


def analyze_session(frame_results: list[dict]) -> dict:
    """Agrège les résultats de toute une session."""
    if not frame_results:
        return {"error": "Aucune frame analysée"}

    def _mean(keys):
        vals = []
        for r in frame_results:
            v = r
            for k in keys:
                v = v.get(k, {}) if isinstance(v, dict) else None
                if v is None: break
            if isinstance(v, (int, float)):
                vals.append(float(v))
        return round(sum(vals) / len(vals), 3) if vals else 0.0

    votes = {}
    for r in frame_results:
        emo = r.get("emotion", {}).get("dominant_emotion", "unknown")
        votes[emo] = votes.get(emo, 0) + 1
    dominant = max(votes, key=votes.get)

    avg_stress = _mean(["stress", "stress_score"])
    label = ("low" if avg_stress < 0.30 else
             "moderate" if avg_stress < 0.55 else
             "high" if avg_stress < 0.75 else "very_high")

    return {
        "frames_count":            len(frame_results),
        "global_dominant_emotion": dominant,
        "avg_stress_score":        avg_stress,
        "stress_label":            label,
        "avg_posture_score":       _mean(["posture",    "posture_score"]),
        "avg_eye_contact":         _mean(["eye_contact","eye_contact_score"]),
        "avg_head_stability":      _mean(["head_pose",  "head_stability"]),
        "avg_emotion_stress":      _mean(["emotion",    "emotion_stress"]),
    }