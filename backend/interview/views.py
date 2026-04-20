from rest_framework.decorators import api_view
from rest_framework.response import Response
import numpy as np
from PIL import Image
import tensorflow as tf

model = tf.keras.models.load_model("emotion_model.h5")
# charger modèle


# mapping émotions
emotions = {
    0: "Angry",
    1: "Disgust",
    2: "Fear",
    3: "Happy",
    4: "Sad",
    5: "Surprise",
    6: "Neutral"
}

def preprocess(image):
    img = Image.open(image).convert('L')
    img = img.resize((48,48))
    img = np.array(img) / 255.0
    img = img.reshape(1,48,48,1)
    return img

@api_view(['POST'])
def analyze_image(request):
    image = request.FILES.get("image")

    if not image:
        return Response({"error": "No image provided"}, status=400)

    img = preprocess(image)
    prediction = model.predict(img)
    result = int(np.argmax(prediction))

    return Response({
        "emotion": emotions[result]
    })