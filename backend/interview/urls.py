from django.urls import path
from .views import emotion_api

urlpatterns = [
   #path("analyze/", analyze_image),
    path("emotion/", emotion_api),
]