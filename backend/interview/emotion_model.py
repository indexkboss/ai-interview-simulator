# modele 1 (pas tro precis donc non)
#from transformers import pipeline

# modèle émotion (image)
#emotion_model = pipeline(
 #   "image-classification",
  ##)

#def predict_emotion(image):
 #   results = emotion_model(image)
  #  return results

# expmle modele 2 
from transformers import pipeline

emotion_model = pipeline(
    "image-classification",
    model="trpakov/vit-face-expression"
)

def predict_emotion(image):
    return emotion_model(image)

