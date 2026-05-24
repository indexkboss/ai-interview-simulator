"""
eye_contact.py
--------------
Détection du contact visuel via MediaPipe FaceMesh.
Compatible mediapipe < 0.10 (solutions) et >= 0.10 (tasks).
"""

import cv2

# ── Détection de la version MediaPipe ────────────────────────────────────────
try:
    import mediapipe as mp
    _mp_face_mesh = mp.solutions.face_mesh
    _OLD_API = True
except AttributeError:
    _OLD_API = False

try:
    from mediapipe.tasks import python as mp_tasks
    from mediapipe.tasks.python import vision as mp_vision
    _NEW_API = True
except ImportError:
    _NEW_API = False


def analyze_eye_contact(image_path: str) -> dict:
    """
    Estime le contact visuel à partir de la position du nez et des yeux.

    Retourne
    --------
    dict : { eye_contact_score: float [0,1] }
    """
    image = cv2.imread(image_path)
    if image is None:
        return {"eye_contact_score": 0.0}

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    if _OLD_API:
        return _analyze_old_api(rgb)
    elif _NEW_API:
        return _analyze_new_api(rgb)
    else:
        return {"eye_contact_score": 0.5, "error": "MediaPipe non disponible"}


def _analyze_old_api(rgb) -> dict:
    with _mp_face_mesh.FaceMesh(
        static_image_mode=True,
        refine_landmarks=True,
        min_detection_confidence=0.5,
    ) as face_mesh:
        results = face_mesh.process(rgb)
        if not results.multi_face_landmarks:
            return {"eye_contact_score": 0.0}

        face = results.multi_face_landmarks[0]
        return _compute_score(face.landmark)


def _analyze_new_api(rgb) -> dict:
    import mediapipe as mp

    BaseOptions = mp_tasks.BaseOptions
    FaceLandmarker = mp_vision.FaceLandmarker
    FaceLandmarkerOptions = mp_vision.FaceLandmarkerOptions
    VisionRunningMode = mp_vision.RunningMode

    import os
    model_candidates = [
        "face_landmarker.task",
        "models/face_landmarker.task",
    ]
    model_path = None
    for p in model_candidates:
        if os.path.exists(p):
            model_path = p
            break

    if not model_path:
        # Fallback : score neutre si modèle absent
        return {"eye_contact_score": 0.5, "error": "Modèle face_landmarker.task introuvable"}

    options = FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=VisionRunningMode.IMAGE,
    )
    with FaceLandmarker.create_from_options(options) as landmarker:
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = landmarker.detect(mp_image)
        if not result.face_landmarks:
            return {"eye_contact_score": 0.0}
        return _compute_score(result.face_landmarks[0])


def _compute_score(landmarks) -> dict:
    """
    Score basé sur :
    - centrage horizontal du nez (landmark 1)
    - centrage vertical du nez
    → 1.0 = regard centré vers la caméra
    """
    nose = landmarks[1]

    # Offset horizontal (centrage X)
    h_offset = abs(nose.x - 0.5)
    # Offset vertical (le visage est souvent en haut du cadre → centre vers 0.4)
    v_offset = abs(nose.y - 0.40)

    score = max(0.0, 1.0 - h_offset * 2.5 - v_offset * 1.5)
    return {"eye_contact_score": round(min(score, 1.0), 3)}