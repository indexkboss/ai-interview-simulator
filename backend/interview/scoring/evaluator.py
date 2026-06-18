# interview/scoring/evaluator.py

class InterviewEvaluator:
    def __init__(self):
        # Coefficients de pondération (Modifiables selon l'importance des critères)
        self.w_verbal = 0.4   # 40% pour le langage et les fillers
        self.w_stress = 0.3   # 30% pour la gestion du stress (audio/visuel)
        self.w_visuel = 0.3   # 30% pour l'attitude (contact visuel)

    def generate_report(self, audio_results, vision_results):
        """
        Analyse les dictionnaires bruts reçus des pipelines Whisper et Mediapipe
        pour en faire un rapport structuré avec une note globale.
        """
        # 1. Analyse du score Verbal (Basé sur ton pipeline audio / fillers)
        # Supposons que process_audio renvoie le nombre de "fillers" détectés
        filler_count = audio_results.get("filler_words_count", 0)
        # Barème : On commence à 100, et on perd 5 points par mot de remplissage détecté
        score_verbal = max(0, 100 - (filler_count * 5))

        # 2. Analyse de la gestion du Stress (Basé sur ton emotion_model ou stress_audio)
        # On extrait un indice de stress (0 = serein, 100 = très stressé)
        stress_index = audio_results.get("stress_index", 20) 
        score_stress = max(0, 100 - stress_index)

        # 3. Analyse du Langage Corporel (Basé sur ton service de vision)
        # Supposons que ton analyse d'image/vidéo donne un ratio de contact visuel (0.0 à 1.0)
        eye_contact_ratio = vision_results.get("eye_contact_ratio", 0.8)
        score_visuel = eye_contact_ratio * 100

        # 4. Calcul de la note globale pondérée (Sur 20 pour le système académique)
        note_sur_100 = (
            (score_verbal * self.w_verbal) +
            (score_stress * self.w_stress) +
            (score_visuel * self.w_visuel)
        )
        note_finale_sur_20 = round((note_sur_100 / 100) * 20, 1)

        # 5. Génération de conseils personnalisés (Feedback)
        feedbacks = []
        if score_verbal < 75:
            feedbacks.append("Essayez de marquer des pauses silencieuses plutôt que d'utiliser des mots de remplissage comme 'euh' ou 'du coup'.")
        if score_stress < 60:
            feedbacks.append("Votre voix montre des signes de nervosité. Ralentissez votre débit de parole.")
        if score_visuel < 70:
            feedbacks.append("Pensez à regarder fixement votre caméra pour simuler un bon contact visuel avec le recruteur.")
        
        if not feedbacks:
            feedbacks.append("Excellente attitude ! Votre élocution et votre posture sont très professionnelles.")

        return {
            "note_globale": note_finale_sur_20,
            "details": {
                "communication_verbale": round(score_verbal, 1),
                "gestion_du_stress": round(score_stress, 1),
                "langage_corporel": round(score_visuel, 1)
            },
            "conseils": feedbacks
        }