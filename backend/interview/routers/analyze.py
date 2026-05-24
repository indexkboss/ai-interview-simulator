"""
routers/analyze.py
Endpoints d'analyse vision + audio.

POST /api/analyze/vision   → image → émotion, posture, contact visuel, stress
POST /api/analyze/audio    → fichier audio → transcription, fillers, stress audio
POST /api/analyze/fusion   → combine scores vision + audio → stress global
"""

import os
import sys
import tempfile
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

router = APIRouter()

_INTERVIEW_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _INTERVIEW_PATH not in sys.path:
    sys.path.insert(0, _INTERVIEW_PATH)


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

async def _save_upload(file: UploadFile, suffix: str) -> str:
    content = await file.read()
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        return tmp.name


def _cleanup(path: str):
    try:
        os.unlink(path)
    except Exception:
        pass


def _demo_vision():
    return {
        "status": "demo",
        "data": {
            "emotion": {
                "dominant_emotion": "neutral",
                "emotion_stress": 0.20,
                "valence": "neutral",
                "confidence": 0.5,
                "face_detected": False,
                "emotions": {}
            },
            "eye_contact":  {"eye_contact_score": 0.75},
            "head_pose":    {"head_stability": 0.80},
            "posture": {
                "posture_score":      0.70,
                "posture_label":      "fair",
                "shoulder_alignment": 0.70,
                "head_tilt":          0.70,
                "forward_lean":       0.70,
                "spine_alignment":    0.70,
                "pose_detected":      False,
            },
            "stress": {
                "stress_score": 0.25,
                "stress_label": "low",
                "breakdown": {},
                "confidence": 0.0,
            },
            "processing_time_ms": 0,
        },
        "message": "Module vision non disponible — données demo"
    }


def _demo_audio():
    return {
        "status": "demo",
        "data": {
            "transcript": "Transcription non disponible en mode démo.",
            "fillers": {"filler_count": 0, "filler_ratio": 0.0, "details": []},
            "features": {"pitch_mean": 150.0, "pitch_variation": 20.0,
                         "energy": 0.05, "duration": 10.0},
            "stress_score": 0.2
        },
        "message": "Module audio non disponible — données demo"
    }


# ─────────────────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class FusionRequest(BaseModel):
    vision_stress: float
    audio_stress: float
    vision_weight: float = 0.5
    audio_weight: float = 0.5


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/vision")
async def analyze_vision(image: UploadFile = File(...)):
    """
    Analyse une frame vidéo.
    Retourne: émotion, posture, contact visuel, stabilité tête, stress_vision.
    """
    ext = "." + image.filename.split(".")[-1] if image.filename else ".jpg"
    path = await _save_upload(image, ext)

    try:
        # ── CORRECTION : la fonction s'appelle analyze_frame (pas analyze_face) ──
        from services.vision_service import analyze_frame
        result = analyze_frame(path)
        return {"status": "success", "data": result}

    except ImportError as e:
        print(f"[VISION IMPORT ERROR]: {e}")
        return _demo_vision()

    except Exception as e:
        print(f"[VISION ERROR]: {type(e).__name__}: {e}")
        raise HTTPException(500, f"Erreur analyse vision: {str(e)}")

    finally:
        _cleanup(path)


@router.post("/audio")
async def analyze_audio(audio: UploadFile = File(...)):
    """
    Analyse un fichier audio.
    Retourne: transcription, fillers détectés, features audio, stress_audio.
    """
    ext = ".wav"
    if audio.filename:
        ext = "." + audio.filename.split(".")[-1]
    path = await _save_upload(audio, ext)

    try:
        from audio.pipeline import process_audio
        result = process_audio(path)
        return {"status": "success", "data": result}

    except ImportError as e:
        print(f"[AUDIO IMPORT ERROR]: {e}")
        return _demo_audio()

    except Exception as e:
        print(f"[AUDIO ERROR]: {type(e).__name__}: {e}")
        raise HTTPException(500, f"Erreur analyse audio: {str(e)}")

    finally:
        _cleanup(path)


@router.post("/fusion")
def compute_stress_fusion(req: FusionRequest):
    """
    Fusionne les scores de stress vision et audio en un score global.
    """
    if not (0 <= req.vision_stress <= 1 and 0 <= req.audio_stress <= 1):
        raise HTTPException(400, "Les scores de stress doivent être entre 0 et 1")

    total_weight = req.vision_weight + req.audio_weight
    v_w = req.vision_weight / total_weight
    a_w = req.audio_weight / total_weight

    global_stress = round(v_w * req.vision_stress + a_w * req.audio_stress, 3)

    if global_stress < 0.30:
        level  = "low"
        advice = "Le candidat semble à l'aise et confiant."
    elif global_stress < 0.55:
        level  = "moderate"
        advice = "Le candidat présente quelques signes de stress, ce qui est normal."
    elif global_stress < 0.75:
        level  = "high"
        advice = "Le candidat montre des signes importants de stress."
    else:
        level  = "very_high"
        advice = "Stress très élevé détecté — le candidat semble très nerveux."

    return {
        "global_stress_score": global_stress,
        "stress_level":  level,
        "interpretation": advice,
        "breakdown": {
            "vision_contribution": round(v_w * req.vision_stress, 3),
            "audio_contribution":  round(a_w * req.audio_stress,  3),
        }
    }