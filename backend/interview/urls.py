# ==========================================
# interview/urls.py (VERSION AMÉLIORÉE)
# ==========================================

from django.urls import path
from . import views

app_name = 'interview'

urlpatterns = [
    # ─── ENDPOINTS EXISTANTS ───
    path('analyze-audio/', views.analyze_audio, name='analyze_audio'),
    path('analyze-face/', views.analyze_face_api, name='analyze_face'),
    path('interview-report/', views.generate_interview_report, name='interview_report'),
    
    # ─── NOUVEAUX ENDPOINTS : HISTORIQUE & DÉTAILS ───
    path('history/', views.interview_history, name='interview_history'),
    path('<int:interview_id>/', views.interview_detail, name='interview_detail'),
    
    # ─── ENDPOINTS DE SESSION (tracking en temps réel) ───
    path('session/create/', views.create_session, name='create_session'),
    path('session/<str:session_id>/update/', views.update_session, name='update_session'),
]