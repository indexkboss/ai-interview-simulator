from django.urls import path
from .views import analyze_audio
from .views import analyze_face_api

urlpatterns = [
    path("audio/analyze/", analyze_audio),
    path("face/analyze/", analyze_face_api),
]