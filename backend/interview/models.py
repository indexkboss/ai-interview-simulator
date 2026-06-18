# ==========================================
# interview/models.py
# ==========================================
# À ajouter ou remplacer dans ton fichier models.py existant

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Interview(models.Model):
    """
    Enregistre chaque entretien avec ses métadonnées et résultats
    """
    INTERVIEW_TYPES = [
        ('hr', 'HR'),
        ('technical', 'Technique'),
        ('full', 'Complet'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    interview_type = models.CharField(max_length=20, choices=INTERVIEW_TYPES)
    job_title = models.CharField(max_length=200, blank=True)
    job_description = models.TextField(blank=True)
    
    # Questions et réponses (JSON pour flexibilité)
    qa_pairs = models.JSONField(default=list)  # [{"question": "...", "answer": "..."}, ...]
    
    # Résultats comportementaux
    emotion_log = models.JSONField(default=list)  # [{"time": 123, "emotion": "happy"}, ...]
    duration_seconds = models.IntegerField(default=0)
    
    # Scores finaux
    global_score = models.FloatField(default=0.0)
    verbal_score = models.FloatField(default=0.0)
    stress_score = models.FloatField(default=0.0)
    body_language_score = models.FloatField(default=0.0)
    text_quality_score = models.FloatField(default=0.0)
    
    # Feedback et notes
    feedback = models.JSONField(default=list)  # ["feedback 1", "feedback 2", ...]
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.job_title} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class InterviewSession(models.Model):
    """
    Enregistre les sessions temporaires pendant l'entretien
    (utile si tu veux tracker l'état en temps réel)
    """
    session_id = models.CharField(max_length=100, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    interview_type = models.CharField(max_length=20)
    job_title = models.CharField(max_length=200, blank=True)
    
    current_question_index = models.IntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    # État actuel
    session_data = models.JSONField(default=dict)  # Stocke l'état complet si besoin
    
    is_completed = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-started_at']
    
    def __str__(self):
        return f"Session {self.session_id}"