"""
gemini_service.py
Utilise Ollama local avec llama3.2:3b (léger, rapide sur CPU 8GB RAM)
"""

import requests
import random

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2:3b"   # ✅ Léger et rapide sur i5 / 8GB RAM

FALLBACK_QUESTIONS = [
    "Pouvez-vous vous présenter ?",
    "Quelles sont vos principales compétences ?",
    "Parlez-moi d'un projet que vous avez réalisé.",
    "Comment gérez-vous le travail en équipe ?",
    "Pourquoi avez-vous choisi ce domaine ?",
    "Décrivez un défi que vous avez surmonté.",
    "Comment approchez-vous la résolution de problèmes ?",
    "Quelles sont vos forces et faiblesses ?",
]


def ask_gemini(prompt: str) -> str:
    """
    Appelle Ollama localement avec llama3.2:3b
    Timeout: 30s pour éviter les longues attentes sur CPU
    """
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 150,      # ✅ Limite tokens → rapide
                    "num_ctx": 1024,         # ✅ Contexte réduit → peu de RAM
                    "top_k": 20,
                    "top_p": 0.9,
                }
            },
            timeout=30   # ✅ 30s pour 8GB RAM
        )

        if response.status_code == 200:
            data = response.json()
            result = data.get("response", "").strip()
            if result:
                return result
            return random.choice(FALLBACK_QUESTIONS)

        print(f"[OLLAMA ERROR] Status {response.status_code}")
        return random.choice(FALLBACK_QUESTIONS)

    except requests.exceptions.Timeout:
        print("[OLLAMA TIMEOUT] Modèle trop lent (>30s), fallback activé")
        return random.choice(FALLBACK_QUESTIONS)

    except requests.exceptions.ConnectionError:
        print("[OLLAMA ERROR] Connexion impossible. Vérifiez: ollama serve")
        return random.choice(FALLBACK_QUESTIONS)

    except Exception as e:
        print(f"[OLLAMA ERROR] {str(e)}")
        return random.choice(FALLBACK_QUESTIONS)