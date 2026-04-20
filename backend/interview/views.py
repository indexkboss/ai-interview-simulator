from rest_framework.decorators import api_view
from rest_framework.response import Response
import numpy as np
import tensorflow as tf
import cv2
import mediapipe as mp

# Load model
model = tf.keras.models.load_model("emotion_model.h5")

# emotions mapping
emotions = {
    0: "Angry",
    1: "Disgust",
    2: "Fear",
    3: "Happy",
    4: "Sad",
    5: "Surprise",
    6: "Neutral"
}

# MediaPipe face detector
mp_face = mp.solutions.face_detection
face_detector = mp_face.FaceDetection(model_selection=0, min_detection_confidence=0.5)


# -------------------------
# PREPROCESSING MEDIA PIPE
# -------------------------
def preprocess(image):
    file_bytes = np.asarray(bytearray(image.read()), dtype=np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    if img is None:
        return None

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    results = face_detector.process(rgb)

    if not results.detections:
        return None

    h, w, _ = img.shape

    # prendre premier visage détecté
    detection = results.detections[0]
    box = detection.location_data.relative_bounding_box

    x1 = int(box.xmin * w)
    y1 = int(box.ymin * h)
    x2 = int((box.xmin + box.width) * w)
    y2 = int((box.ymin + box.height) * h)

    # sécurité (éviter erreurs de crop)
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)

    face = cv2.cvtColor(img[y1:y2, x1:x2], cv2.COLOR_BGR2GRAY)

    face = cv2.resize(face, (48, 48))
    face = face / 255.0
    face = face.reshape(1, 48, 48, 1)

    return face


# -------------------------
# API
# -------------------------
@api_view(['POST'])
def analyze_image(request):
    image = request.FILES.get("image")

    if not image:
        return Response({"error": "No image provided"}, status=400)

    img = preprocess(image)

    if img is None:
        return Response({"error": "No face detected"}, status=400)

    prediction = model.predict(img)

    result = int(np.argmax(prediction))
    confidence = float(np.max(prediction))

    return Response({
        "emotion": emotions[result],
        "confidence": round(confidence, 2),
        "all_predictions": prediction.tolist()
    })