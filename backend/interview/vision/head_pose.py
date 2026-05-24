"""
head_pose.py
------------
Analyse de la stabilité et orientation de la tête via MediaPipe FaceMesh.
Compatible mediapipe < 0.10 et >= 0.10.

IMPORTANT : la fonction principale est analyze_head_pose() (pas analyze_eye_contact).
"""

import cv2
import math

# ── Détection version MediaPipe ───────────────────────────────────────────────
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


# Indices landmarks FaceMesh utiles pour l'orientation de la tête
_NOSE_TIP   = 1
_FOREHEAD   = 10
_CHIN       = 152
_LEFT_EYE   = 33
_RIGHT_EYE  = 263


def analyze_head_pose(image_path: str) -> dict:
    """
    Estime la stabilité/orientation de la tête.

    Retourne
    --------
    dict :
        - head_stability  (float) [0,1]  : 1 = tête droite, centrée
        - tilt_angle      (float)        : inclinaison latérale en degrés
        - vertical_angle  (float)        : inclinaison verticale en degrés
        - face_detected   (bool)
    """
    image = cv2.imread(image_path)
    if image is None:
        return _empty("Image non lisible")

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    if _OLD_API:
        return _analyze_old(rgb)
    elif _NEW_API:
        return _analyze_new(rgb)
    return _empty("MediaPipe non disponible")


def _analyze_old(rgb) -> dict:
    with _mp_face_mesh.FaceMesh(
        static_image_mode=True,
        refine_landmarks=True,
        min_detection_confidence=0.5,
    ) as face_mesh:
        results = face_mesh.process(rgb)
        if not results.multi_face_landmarks:
            return _empty("Aucun visage détecté")
        return _compute(results.multi_face_landmarks[0].landmark)


def _analyze_new(rgb) -> dict:
    import mediapipe as mp, os
    BaseOptions = mp_tasks.BaseOptions
    FaceLandmarker = mp_vision.FaceLandmarker
    FaceLandmarkerOptions = mp_vision.FaceLandmarkerOptions
    VisionRunningMode = mp_vision.RunningMode

    for p in ["face_landmarker.task", "models/face_landmarker.task"]:
        if os.path.exists(p):
            options = FaceLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=p),
                running_mode=VisionRunningMode.IMAGE,
            )
            with FaceLandmarker.create_from_options(options) as lm:
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                result = lm.detect(mp_img)
                if not result.face_landmarks:
                    return _empty("Aucun visage détecté")
                return _compute(result.face_landmarks[0])
    return _empty("Modèle face_landmarker.task introuvable")


def _compute(landmarks) -> dict:
    nose     = landmarks[_NOSE_TIP]
    forehead = landmarks[_FOREHEAD]
    chin     = landmarks[_CHIN]
    l_eye    = landmarks[_LEFT_EYE]
    r_eye    = landmarks[_RIGHT_EYE]

    # ── Inclinaison latérale (tilt) : angle de la ligne inter-yeux ───────────
    dx = r_eye.x - l_eye.x
    dy = r_eye.y - l_eye.y
    tilt_angle = abs(math.degrees(math.atan2(dy, dx)))   # 0° = yeux horizontaux

    # ── Inclinaison verticale : axe nez–menton vs vertical ───────────────────
    face_dy = chin.y - forehead.y
    face_dx = chin.x - forehead.x
    vert_angle = abs(math.degrees(math.atan2(face_dx, face_dy)))  # 0° = droit

    # ── Centrage horizontal du nez ────────────────────────────────────────────
    h_offset = abs(nose.x - 0.5)

    # ── Score composite ───────────────────────────────────────────────────────
    tilt_score   = max(0.0, 1.0 - tilt_angle  / 15.0)   # pénalise > 15°
    vert_score   = max(0.0, 1.0 - vert_angle  / 20.0)   # pénalise > 20°
    center_score = max(0.0, 1.0 - h_offset    / 0.25)   # pénalise si trop excentré

    head_stability = round(
        0.40 * tilt_score +
        0.35 * vert_score +
        0.25 * center_score,
        3
    )

    return {
        "head_stability":  min(1.0, head_stability),
        "tilt_angle":      round(tilt_angle, 2),
        "vertical_angle":  round(vert_angle, 2),
        "face_detected":   True,
    }


def _empty(reason: str = "") -> dict:
    return {
        "head_stability": 0.5,
        "tilt_angle":     0.0,
        "vertical_angle": 0.0,
        "face_detected":  False,
        "reason":         reason,
    }