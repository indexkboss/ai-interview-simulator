from django.urls import path
from .views import emotion_api, audio_emotion_api, stress_api

urlpatterns = [
    path("emotion/", emotion_api),
    path("audio/", audio_emotion_api),
    path("stress/", stress_api),
]