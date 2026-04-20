from django.urls import path
from .views import analyze_answer

urlpatterns = [
    path("analyze/", analyze_answer),
]