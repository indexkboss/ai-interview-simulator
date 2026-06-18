import mediapipe as mp
import cv2
import numpy as np

class FaceAnalyzer:
    def __init__(self, model_path="face_landmarker.task"):
        # Initialisation du modèle Mediapipe Face Landmarker
        BaseOptions = mp.tasks.BaseOptions
        FaceLandmarker = mp.tasks.vision.FaceLandmarker
        FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
        VisionRunningMode = mp.tasks.vision.RunningMode

        self.options = FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=model_path),
            running_mode=VisionRunningMode.VIDEO,
            output_face_blendshapes=True
        )
        self.landmarker = FaceLandmarker.create_from_options(self.options)

    def analyze_frame(self, frame, timestamp_ms):
        """
        Analyse une image (frame) de la vidéo de l'étudiant.
        """
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
        result = self.landmarker.detect_for_video(mp_image, timestamp_ms)
        
        if not result.face_landmarks:
            return {"eye_contact": False, "smiling": False, "blink": False}

        # 1. Logique pour le Contact Visuel (Analyse de la position des iris)
        # On regarde la distance entre les repères des yeux et de l'iris
        eye_contact = self._check_eye_contact(result.face_landmarks[0])

        # 2. Logique pour le stress / expressions via les Blendshapes (détecte les sourires ou sourcils froncés)
        smiling = False
        if result.face_blendshapes:
            for blendshape in result.face_blendshapes[0]:
                if blendshape.category_name == "jawOpen" and blendshape.score > 0.5:
                    # Exemple de détection d'ouverture de bouche / parole
                    pass
                if blendshape.category_name == "mouthSmileLeft" and blendshape.score > 0.3:
                    smiling = True

        return {
            "eye_contact": eye_contact,
            "smiling": smiling
        }

    def _check_eye_contact(self, landmarks):
        # Implémente un calcul géométrique simple (ex: centre de l'iris par rapport aux coins de l'œil)
        # Retourne True si l'étudiant regarde l'écran, False s'il fuit le regard
        return True