/**
 * services/interviewAPI.js
 * 
 * Remplace les appels Gemini directs du frontend.
 * Tous les appels passent maintenant par le backend FastAPI.
 * 
 * Usage dans Interview.jsx :
 *   import { startSession, getNextQuestion } from '../services/interviewAPI'
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// ─── Helper fetch avec gestion d'erreurs ─────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD CV
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload un fichier CV (PDF/TXT) et retourne le profil extrait.
 * @param {File} file - Fichier CV
 * @returns {{ cv_text, profile, summary }}
 */
export async function uploadCV(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/interview/upload-cv`, {
    method: "POST",
    body: formData,   // PAS de Content-Type ici, le browser le gère
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur upload CV");
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Démarre une session d'entretien et génère les questions initiales.
 * @param {{ jobTitle, interviewType, jobDescription, cvText, nQuestions }} params
 * @returns {{ session_id, first_question, total_questions }}
 */
export async function startSession({
  jobTitle,
  interviewType = "hr",
  jobDescription = "",
  cvText = "",
  nQuestions = 5,
}) {
  return apiFetch("/interview/start", {
    method: "POST",
    body: JSON.stringify({
      job_title: jobTitle,
      interview_type: interviewType,
      job_description: jobDescription,
      cv_text: cvText,
      n_questions: nQuestions,
    }),
  });
}

/**
 * Obtient la prochaine question selon l'historique de l'entretien.
 * @param {{ sessionId, history }} params
 * @returns {{ question, index, source }}
 */
export async function getNextQuestion({ sessionId, history }) {
  return apiFetch("/interview/next", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      history,
    }),
  });
}

/**
 * Retourne des questions RH depuis le dataset backend.
 * @param {{ categories?, n? }} params
 * @returns {{ questions: [{question, category}] }}
 */
export async function getHRQuestions({ categories = "", n = 5 } = {}) {
  const params = new URLSearchParams({ categories, n: String(n) });
  return apiFetch(`/interview/hr-questions?${params}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSE VISION + AUDIO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envoie une frame vidéo (Blob/File) pour analyse vision.
 * @param {Blob} imageBlob
 * @returns {{ data: { emotion, eye_contact, head_pose, posture, vision_stress_score } }}
 */
export async function analyzeFrame(imageBlob) {
  const formData = new FormData();
  formData.append("image", imageBlob, "frame.jpg");

  const res = await fetch(`${BASE_URL}/analyze/vision`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Erreur analyse vision");
  return res.json();
}

/**
 * Envoie un fichier audio pour analyse (transcription + stress).
 * @param {Blob} audioBlob
 * @returns {{ data: { transcript, fillers, features, stress_score } }}
 */
export async function analyzeAudio(audioBlob) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.wav");

  const res = await fetch(`${BASE_URL}/analyze/audio`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Erreur analyse audio");
  return res.json();
}

/**
 * Fusionne les scores vision + audio en score global.
 * @param {{ visionStress, audioStress }} params
 * @returns {{ global_stress_score, stress_level, interpretation }}
 */
export async function computeStressFusion({ visionStress = 0, audioStress = 0 }) {
  return apiFetch("/analyze/fusion", {
    method: "POST",
    body: JSON.stringify({
      vision_stress: visionStress,
      audio_stress: audioStress,
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RAPPORT FINAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère le rapport final via LLM backend (remplace Gemini dans Report.jsx).
 * @param {{ answers, emotionLog, duration, jobTitle, interviewType, visionStress, audioStress }} params
 * @returns {{ status, report: { score_global, points_forts, ... } }}
 */
export async function generateReport({
  sessionId = `session_${Date.now()}`,
  answers,
  emotionLog = [],
  duration = 0,
  jobTitle = "",
  interviewType = "hr",
  visionStress = 0,
  audioStress = 0,
}) {
  return apiFetch("/report/generate", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      answers,
      emotion_log: emotionLog,
      duration,
      job_title: jobTitle,
      interview_type: interviewType,
      vision_stress_score: visionStress,
      audio_stress_score: audioStress,
    }),
  });
}
