"""
posture.py
----------
Analyse de la posture corporelle.
Compatible MediaPipe >= 0.10 (nouvelle API) ET ancienne API (solutions).
"""

import cv2
import math

# ── Compatibilité MediaPipe 0.9 et 0.10+ ─────────────────────────────────────
try:
    # Nouvelle API (>= 0.10)
    from mediapipe.tasks import python as mp_tasks
    from mediapipe.tasks.python import vision as mp_vision
    _NEW_API = True
except ImportError:
    _NEW_API = False

try:
    import mediapipe as mp
    _mp_pose = mp.solutions.pose
    _PoseLandmark = mp.solutions.pose.PoseLandmark
    _OLD_API = True
except AttributeError:
    _OLD_API = False

SHOULDER_TILT_THRESHOLD  = 0.04
HEAD_TILT_THRESHOLD      = 0.05
FORWARD_LEAN_THRESHOLD   = 0.06
SPINE_OFFSET_THRESHOLD   = 0.08


def _lm(landmarks, idx):
    lm = landmarks[idx]
    return {"x": lm.x, "y": lm.y, "z": lm.z}


def _score_from_landmarks(lm):
    """Calcule les 4 indicateurs depuis les landmarks MediaPipe."""
    # Indices universels (valables ancienne et nouvelle API)
    L_SHOULDER, R_SHOULDER = 11, 12
    L_EAR,      R_EAR      = 7,  8
    L_HIP,      R_HIP      = 23, 24
    NOSE                   = 0

    ls = _lm(lm, L_SHOULDER); rs = _lm(lm, R_SHOULDER)
    le = _lm(lm, L_EAR);      re = _lm(lm, R_EAR)
    lh = _lm(lm, L_HIP);      rh = _lm(lm, R_HIP)
    nose = _lm(lm, NOSE)

    shoulder_diff   = abs(ls["y"] - rs["y"])
    ear_diff        = abs(le["y"] - re["y"])
    shoulder_z_mid  = (ls["z"] + rs["z"]) / 2
    forward_diff    = abs(nose["z"] - shoulder_z_mid)
    shoulder_x_mid  = (ls["x"] + rs["x"]) / 2
    hip_x_mid       = (lh["x"] + rh["x"]) / 2
    spine_offset    = abs(shoulder_x_mid - hip_x_mid)

    shoulder_alignment = min(1.0, max(0.0, 1.0 - shoulder_diff  / SHOULDER_TILT_THRESHOLD))
    head_tilt          = min(1.0, max(0.0, 1.0 - ear_diff        / HEAD_TILT_THRESHOLD))
    forward_lean       = min(1.0, max(0.0, 1.0 - forward_diff    / FORWARD_LEAN_THRESHOLD))
    spine_alignment    = min(1.0, max(0.0, 1.0 - spine_offset    / SPINE_OFFSET_THRESHOLD))

    posture_score = (
        0.35 * shoulder_alignment +
        0.25 * head_tilt          +
        0.20 * forward_lean       +
        0.20 * spine_alignment
    )
    posture_score = round(min(max(posture_score, 0.0), 1.0), 3)

    label = "good" if posture_score >= 0.75 else "fair" if posture_score >= 0.50 else "poor"

    return {
        "posture_score":      posture_score,
        "posture_label":      label,
        "shoulder_alignment": round(shoulder_alignment, 3),
        "head_tilt":          round(head_tilt, 3),
        "forward_lean":       round(forward_lean, 3),
        "spine_alignment":    round(spine_alignment, 3),
        "details": {
            "shoulder_diff_y": round(shoulder_diff,  4),
            "ear_diff_y":      round(ear_diff,        4),
            "forward_diff_z":  round(forward_diff,    4),
            "spine_offset_x":  round(spine_offset,    4),
        },
        "pose_detected": True,
    }


def analyze_posture(image_path: str) -> dict:
    image = cv2.imread(image_path)
    if image is None:
        return _empty("Image non lisible")

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # ── Ancienne API (mediapipe < 0.10) ───────────────────────────────────────
    if _OLD_API:
        with _mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1,
            min_detection_confidence=0.5,
        ) as pose:
            results = pose.process(rgb)
            if not results.pose_landmarks:
                return _empty("Aucune pose détectée")
            return _score_from_landmarks(results.pose_landmarks.landmark)

    # ── Nouvelle API (mediapipe >= 0.10) ──────────────────────────────────────
    elif _NEW_API:
        import mediapipe as mp
        import numpy as np

        BaseOptions  = mp_tasks.BaseOptions
        PoseLandmarker     = mp_vision.PoseLandmarker
        PoseLandmarkerOptions = mp_vision.PoseLandmarkerOptions
        VisionRunningMode  = mp_vision.RunningMode

        options = PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=_get_model_path()),
            running_mode=VisionRunningMode.IMAGE,
        )
        with PoseLandmarker.create_from_options(options) as landmarker:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result   = landmarker.detect(mp_image)
            if not result.pose_landmarks:
                return _empty("Aucune pose détectée")
            return _score_from_landmarks(result.pose_landmarks[0])

    return _empty("MediaPipe non disponible")


def _get_model_path() -> str:
    """Cherche le modèle pose_landmarker dans les emplacements courants."""
    candidates = [
        "pose_landmarker.task",
        "pose_landmarker_lite.task",
        "models/pose_landmarker.task",
    ]
    for p in candidates:
        if __import__("os").path.exists(p):
            return p
    raise FileNotFoundError(
        "Modèle pose_landmarker.task introuvable. "
        "Télécharge-le : https://storage.googleapis.com/mediapipe-models/"
        "pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
    )


def _empty(reason: str = "") -> dict:
    return {
        "posture_score": 0.5, "posture_label": "unknown",
        "shoulder_alignment": 0.5, "head_tilt": 0.5,
        "forward_lean": 0.5, "spine_alignment": 0.5,
        "details": {}, "pose_detected": False, "reason": reason,
    }