#CNN
#from rest_framework.decorators import api_view#
#from rest_framework.response import Response
#import numpy as np
#import tensorflow as tf
#import cv2
#import mediapipe as mp

# Load model
#model = tf.keras.models.load_model("emotion_model.h5")

# emotions mapping
#emotions = {
 #   0: "Angry",
  #  1: "Disgust",
   # 2: "Fear",
    #3: "Happy",
    #4: "Sad",
    #5: "Surprise",
    #6: "Neutral"
#}

# MediaPipe face detector
#mp_face = mp.solutions.face_detection
#face_detector = mp_face.FaceDetection(model_selection=0, min_detection_confidence=0.5)


# -------------------------
# PREPROCESSING MEDIA PIPE
# -------------------------
#def preprocess(image):
 #   file_bytes = np.asarray(bytearray(image.read()), dtype=np.uint8)
  #  img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
##   if img is None:
  #      return None

   # rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    #results = face_detector.process(rgb)

    #if not results.detections:
     #   return None

   # h, w, _ = img.shape

    # prendre premier visage détecté
  #  detection = results.detections[0]
   # box = detection.location_data.relative_bounding_box

    #x1 = int(box.xmin * w)
   # y1 = int(box.ymin * h)
    #x2 = int((box.xmin + box.width) * w)
    #y2 = int((box.ymin + box.height) * h)

    # sécurité (éviter erreurs de crop)
   # x1, y1 = max(0, x1), max(0, y1)
    #x2, y2 = min(w, x2), min(h, y2)

    #face = cv2.cvtColor(img[y1:y2, x1:x2], cv2.COLOR_BGR2GRAY)

    #face = cv2.resize(face, (48, 48))
    #face = face / 255.0
    #face = face.reshape(1, 48, 48, 1)

  #  return face


# -------------------------
# API
# -------------------------
#/'@api_view(['POST'])
#def analyze_image(request):
 #   image = request.FILES.get("image")

  #  if not image:
   #     return Response({"error": "No image provided"}, status=400)

    #img = preprocess(image)

    #if img is None:
     #   return Response({"error": "No face detected"}, status=400)

#    prediction = model.predict(img)

 #   result = int(np.argmax(prediction))
  #  confidence = float(np.max(prediction))

   # return Response({
    #    "emotion": emotions[result],
     #   "confidence": round(confidence, 2),
      #  "all_predictions": prediction.tolist()
    #})


from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from PIL import Image
import base64
import io
import json
import os

from .emotion_model import predict_emotion
from .audio_model import predict_audio_emotion
from .stress_engine_v2 import compute_stress_v2


# -------------------------
# IMAGE EMOTION API
# -------------------------
@csrf_exempt
def emotion_api(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            image_data = data.get("image")

            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

            result = predict_emotion(image)

            return JsonResponse({
                "emotion": result[0]["label"],
                "score": float(result[0]["score"])
            })

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)


# -------------------------
# AUDIO EMOTION API
# -------------------------
@csrf_exempt
def audio_emotion_api(request):
    if request.method == "POST":
        try:
            audio_file = request.FILES.get("audio")

            if not audio_file:
                return JsonResponse({"error": "No audio file"}, status=400)

            temp_path = "temp_audio.wav"

            with open(temp_path, "wb+") as f:
                for chunk in audio_file.chunks():
                    f.write(chunk)

            result = predict_audio_emotion(temp_path)

            os.remove(temp_path)

            return JsonResponse({
                "emotion": result[0]["label"],
                "score": float(result[0]["score"])
            })

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)


# -------------------------
# 🔥 STRESS API (PRO V2)
# -------------------------
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import os




@csrf_exempt
def stress_api(request):
    if request.method == "POST":
        try:
            audio_file = request.FILES.get("audio")

            if not audio_file:
                return JsonResponse({"error": "No audio file"}, status=400)

            temp_path = "temp_audio.wav"

            with open(temp_path, "wb+") as f:
                for chunk in audio_file.chunks():
                    f.write(chunk)

            stress_result = compute_stress_v2(temp_path)

            os.remove(temp_path)

            return JsonResponse(stress_result)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)