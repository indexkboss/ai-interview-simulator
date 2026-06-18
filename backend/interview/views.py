# ==========================================
# interview/views.py (VERSION AMÉLIORÉE)
# ==========================================

import os
import json
import uuid
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views import View

# Imports existants
from .audio.pipeline import process_audio
from .services.vision_service import analyze_face

# Imports modèles
from .models import Interview, InterviewSession

# ==========================================
# 1. ENDPOINTS EXISTANTS (inchangés)
# ==========================================

@csrf_exempt
def analyze_audio(request):
    """Analyse audio pour filler words, stress, features"""
    if request.method == "POST":
        try:
            file = request.FILES["audio"]
            path = f"temp_{file.name}"
            with open(path, "wb") as f:
                for chunk in file.chunks():
                    f.write(chunk)
            
            result = process_audio(path)
            
            if os.path.exists(path):
                os.remove(path)
                
            return JsonResponse(result)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

@csrf_exempt
def analyze_face_api(request):
    """Analyse visuelle: émotions, contact oculaire, posture"""
    if request.method == "POST":
        try:
            file = request.FILES["image"]
            path = f"temp_{file.name}"
            with open(path, "wb") as f:
                for chunk in file.chunks():
                    f.write(chunk)
                    
            result = analyze_face(path)
            
            if os.path.exists(path):
                os.remove(path)
                
            return JsonResponse(result)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

# ==========================================
# 2. ENDPOINT DE SYNTHÈSE (EXISTANT)
# ==========================================

@csrf_exempt
def generate_interview_report(request):
    """
    Reçoit les données brutes, calcule les scores, et les sauvegarde en BD
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            
            # Extraction des données
            audio_results = data.get("audio_results", {})
            vision_results = data.get("vision_results", {})
            text_score = data.get("text_score", 0)
            
            # Extraction des métadonnées
            interview_type = data.get("interview_type", "hr")
            job_title = data.get("job_title", "")
            job_description = data.get("job_description", "")
            qa_pairs = data.get("qa_pairs", [])
            emotion_log = data.get("emotion_log", [])
            duration_seconds = data.get("duration_seconds", 0)
            
            # ─── CALCULS DES SCORES ───
            filler_count = audio_results.get("filler_words_count", 0)
            stress_index = audio_results.get("stress_index", 20)
            eye_contact_ratio = vision_results.get("eye_contact_ratio", 1.0)
            
            # Scores comportementaux (0-100)
            score_verbal = max(0, 100 - (filler_count * 5))
            score_stress = max(0, 100 - stress_index)
            score_visuel = eye_contact_ratio * 100
            
            # Score comportemental pondéré
            behavioral_score = (score_verbal * 0.4) + (score_stress * 0.3) + (score_visuel * 0.3)
            
            # Score global final
            final_score = (behavioral_score * 0.5) + (text_score * 0.5)
            
            # ─── GÉNÉRATION DES FEEDBACKS ───
            feedbacks = []
            if score_verbal < 75:
                feedbacks.append(f"Tics verbaux repérés ({filler_count} au total). Essayez de réduire l'usage de mots de remplissage (euh, du coup).")
            if score_stress < 60:
                feedbacks.append("Votre niveau de stress vocal est élevé. Entraînez-vous à contrôler votre respiration.")
            if score_visuel < 70:
                feedbacks.append("Le contact visuel avec la caméra était insuffisant. Pensez à lever les yeux plus souvent.")
            if text_score < 50:
                feedbacks.append("Le contenu de vos réponses manque de profondeur technique ou de structure.")
            
            if not feedbacks:
                feedbacks.append("Excellente performance tant sur la forme que sur le fond !")
            
            # ─── SAUVEGARDE EN BASE DE DONNÉES ───
            user = request.user if request.user.is_authenticated else None
            interview = Interview.objects.create(
                user=user,
                interview_type=interview_type,
                job_title=job_title,
                job_description=job_description,
                qa_pairs=qa_pairs,
                emotion_log=emotion_log,
                duration_seconds=duration_seconds,
                global_score=round(final_score, 1),
                verbal_score=round(score_verbal, 1),
                stress_score=round(score_stress, 1),
                body_language_score=round(score_visuel, 1),
                text_quality_score=round(text_score, 1),
                feedback=feedbacks,
            )
            
            # ─── RÉPONSE ───
            report_data = {
                "status": "success",
                "interview_id": interview.id,
                "created_at": interview.created_at.isoformat(),
                "global_score": interview.global_score,
                "metrics": {
                    "verbal_communication": interview.verbal_score,
                    "stress_management": interview.stress_score,
                    "body_language": interview.body_language_score,
                    "text_quality": interview.text_quality_score
                },
                "filler_words_count": filler_count,
                "constructive_feedback": feedbacks
            }
            
            return JsonResponse(report_data, status=201)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Méthode non autorisée"}, status=405)


# ==========================================
# 3. NOUVEAUX ENDPOINTS : HISTORIQUE & RÉCUPÉRATION
# ==========================================

@login_required
def interview_history(request):
    """
    GET: Récupère l'historique des entretiens de l'utilisateur
    """
    if request.method == "GET":
        try:
            interviews = Interview.objects.filter(user=request.user).values(
                'id', 'job_title', 'interview_type', 'global_score', 
                'created_at', 'duration_seconds'
            )
            
            return JsonResponse({
                "status": "success",
                "interviews": list(interviews)
            }, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Méthode non autorisée"}, status=405)


@login_required
def interview_detail(request, interview_id):
    """
    GET: Récupère les détails complets d'un entretien
    """
    if request.method == "GET":
        try:
            interview = Interview.objects.get(id=interview_id, user=request.user)
            
            return JsonResponse({
                "status": "success",
                "interview": {
                    "id": interview.id,
                    "job_title": interview.job_title,
                    "interview_type": interview.interview_type,
                    "qa_pairs": interview.qa_pairs,
                    "emotion_log": interview.emotion_log,
                    "duration_seconds": interview.duration_seconds,
                    "global_score": interview.global_score,
                    "metrics": {
                        "verbal": interview.verbal_score,
                        "stress": interview.stress_score,
                        "body_language": interview.body_language_score,
                        "text_quality": interview.text_quality_score,
                    },
                    "feedback": interview.feedback,
                    "created_at": interview.created_at.isoformat(),
                }
            }, status=200)
        except Interview.DoesNotExist:
            return JsonResponse({"error": "Entretien non trouvé"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Méthode non autorisée"}, status=405)


# ==========================================
# 4. ENDPOINTS DE SESSION (temporaire en temps réel)
# ==========================================

@csrf_exempt
def create_session(request):
    """
    POST: Crée une nouvelle session d'entretien
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            session_id = str(uuid.uuid4())
            user = request.user if request.user.is_authenticated else None
            
            session = InterviewSession.objects.create(
                session_id=session_id,
                user=user,
                interview_type=data.get("interview_type", "hr"),
                job_title=data.get("job_title", ""),
                session_data=data
            )
            
            return JsonResponse({
                "status": "success",
                "session_id": session_id
            }, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Méthode non autorisée"}, status=405)


@csrf_exempt
def update_session(request, session_id):
    """
    PUT: Met à jour la session en cours (optionnel, pour tracking)
    """
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            session = InterviewSession.objects.get(session_id=session_id)
            
            session.current_question_index = data.get("current_question_index", session.current_question_index)
            session.session_data = data.get("session_data", session.session_data)
            session.save()
            
            return JsonResponse({
                "status": "success",
                "message": "Session mise à jour"
            }, status=200)
        except InterviewSession.DoesNotExist:
            return JsonResponse({"error": "Session non trouvée"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Méthode non autorisée"}, status=405)