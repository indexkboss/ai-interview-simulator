import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Interview.css";
import AIAvatar from "../components/AIAvatar";

// ─── Configuration des modèles Gemini ─────────────────────────────────────
const MODELS = {
  primary: "gemini-2.0-flash",      // modèle principal
  fallback: "gemini-2.5-flash-lite" // modèle de secours (plus lent mais plus de quota)
};

// ─── Fonction d'appel API avec gestion des quotas ────────────────────────
async function callGeminiWithRetry(prompt, model = MODELS.primary, retries = 3, delay = 1000) {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Clé API Gemini manquante");

  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const wait = retryAfter ? parseInt(retryAfter) * 1000 : delay * attempt;
        console.warn(`Quota atteint pour ${model}, nouvel essai dans ${wait}ms...`);
        await new Promise(resolve => setTimeout(resolve, wait));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error("Réponse vide de l'API");
      return text;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Tentative ${attempt} échouée, nouvelle tentative dans ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Échec après plusieurs tentatives");
}

// ─── askGemini – construit le prompt historique et appelle avec fallback ──
async function askGemini(messages, systemPrompt) {
  let fullPrompt = systemPrompt + "\n\n";
  for (const msg of messages) {
    const role = msg.role === "assistant" ? "Assistant : " : "Candidat : ";
    fullPrompt += role + msg.content + "\n";
  }
  fullPrompt += "Assistant : ";

  try {
    // Tentative avec modèle principal
    return await callGeminiWithRetry(fullPrompt, MODELS.primary);
  } catch (err) {
    console.warn("Modèle principal échoué, tentative avec fallback", err);
    try {
      return await callGeminiWithRetry(fullPrompt, MODELS.fallback);
    } catch (fallbackErr) {
      console.error("Fallback échoué également", fallbackErr);
      throw new Error("Service IA indisponible (quota épuisé). Réessayez plus tard.");
    }
  }
}

function buildSystemPrompt(state) {
  const { interviewType, jobTitle, jobDescription, jobOfferText, cvName } = state;
  const typeLabel =
    interviewType === "hr"
      ? "RH (soft skills, motivation, parcours)"
      : interviewType === "technical"
      ? "technique (compétences spécifiques au poste)"
      : "complet (RH + technique)";

  return `Tu es un recruteur professionnel qui mène un entretien ${typeLabel} pour le poste de "${jobTitle || "non précisé"}".
${jobDescription ? `Description du poste : ${jobDescription}` : ""}
${jobOfferText ? `Offre d'emploi : ${jobOfferText}` : ""}
${cvName ? `Le candidat a fourni son CV (${cvName}).` : ""}

Règles STRICTES :
- Pose UNE seule question à la fois, courte et précise.
- Chaque question doit être DIFFÉRENTE des précédentes.
- Réponds UNIQUEMENT avec le texte de la question, sans préambule ni numérotation.
- Ne répète JAMAIS une question déjà posée.`;
}

// ─── Composant principal ──────────────────────────────────────────────────
export default function Interview() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionState = location.state || {};
  const { interviewType = "hr", jobTitle = "" } = sessionState;
  const maxQuestions = interviewType === "full" ? 10 : 5;
  const systemPrompt = buildSystemPrompt(sessionState);

  const session = useRef({
    answers: [],
    index: 0,
    currentQuestion: "",
    transcript: "",
    liveTranscript: "",
    emotionLog: [],
    isEnding: false,
    isProcessing: false,
  });

  const [ui, setUi] = useState({
    currentQuestion: "",
    index: 0,
    transcript: "",
    liveTranscript: "",
    isSpeaking: false,
    isListening: false,
    isLoading: false,
    currentEmotion: "neutral",
    emotionLog: [],
    cameraReady: false,
    error: null,
  });
  const patch = (delta) => setUi((prev) => ({ ...prev, ...delta }));

  const timeRef = useRef(0);
  const [displayTime, setDisplayTime] = useState(0);
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const emotionIntervalRef = useRef(null);
  const startListeningRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => {
      timeRef.current += 1;
      setDisplayTime(timeRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            patch({ cameraReady: true });
          };
        }
      })
      .catch((err) => console.error("Caméra:", err));
    return () => {
      videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!window.faceapi) return;
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
    Promise.all([
      window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      window.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ])
      .then(() => {
        emotionIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const det = await window.faceapi
              .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
              .withFaceExpressions();
            if (det?.expressions) {
              const top = Object.entries(det.expressions).sort((a, b) => b[1] - a[1])[0][0];
              session.current.emotionLog.push({ time: timeRef.current, emotion: top });
              patch({ currentEmotion: top, emotionLog: [...session.current.emotionLog] });
            }
          } catch (_) {}
        }, 2000);
      })
      .catch(() => {});
    return () => clearInterval(emotionIntervalRef.current);
  }, []);

  const speak = useCallback((text) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 0.95;

    const doSpeak = () => {
      const voices = speechSynthesis.getVoices();
      const frVoice = voices.find(v => v.lang.startsWith("fr") && v.name.toLowerCase().includes("female")) ||
                      voices.find(v => v.lang.startsWith("fr")) || voices[0];
      if (frVoice) utterance.voice = frVoice;
      utterance.onstart = () => patch({ isSpeaking: true });
      utterance.onend = () => {
        patch({ isSpeaking: false });
        startListeningRef.current?.();
      };
      utterance.onerror = () => {
        patch({ isSpeaking: false });
        startListeningRef.current?.();
      };
      speechSynthesis.speak(utterance);
    };
    speechSynthesis.getVoices().length ? doSpeak() : (speechSynthesis.onvoiceschanged = doSpeak);
  }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognitionRef.current?.abort();
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    recognitionRef.current = rec;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          session.current.transcript += " " + t;
          patch({ transcript: session.current.transcript.trim() });
        } else {
          interim += t;
        }
      }
      session.current.liveTranscript = interim;
      patch({ liveTranscript: interim });
    };
    rec.onerror = () => patch({ isListening: false });
    rec.onend = () => patch({ isListening: false });
    rec.start();
    patch({ isListening: true });
  }, []);

  startListeningRef.current = startListening;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    session.current.liveTranscript = "";
    patch({ isListening: false, liveTranscript: "" });
  }, []);

  const handleNextQuestion = useCallback(async () => {
    const s = session.current;
    if (s.isEnding || s.isProcessing) return;
    s.isProcessing = true;

    stopListening();

    const userAnswer = (s.transcript + " " + s.liveTranscript).trim() || "(pas de réponse)";
    const completedQA = { question: s.currentQuestion, answer: userAnswer };
    s.answers = [...s.answers, completedQA];
    s.index++;
    s.transcript = "";
    s.liveTranscript = "";
    patch({ transcript: "", liveTranscript: "", index: s.index });

    if (s.index >= maxQuestions) {
      s.isEnding = true;
      speechSynthesis.cancel();
      clearInterval(emotionIntervalRef.current);
      navigate("/report", {
        state: {
          answers: s.answers,
          emotionLog: s.emotionLog,
          duration: timeRef.current,
          jobTitle: sessionState.jobTitle,
          interviewType: sessionState.interviewType,
        },
      });
      return;
    }

    patch({ isLoading: true, error: null });
    try {
      const history = s.answers.flatMap((qa) => [
        { role: "assistant", content: qa.question },
        { role: "user", content: qa.answer },
      ]);
      const nextQ = await askGemini(history, systemPrompt);
      s.currentQuestion = nextQ;
      patch({ currentQuestion: nextQ, isLoading: false });
      speak(nextQ);
    } catch (err) {
      console.error(err);
      patch({ error: "L'IA est momentanément indisponible (quota atteint). Veuillez réessayer plus tard." });
      const fallback = "Pouvez-vous me parler d'un défi professionnel que vous avez surmonté ?";
      s.currentQuestion = fallback;
      patch({ currentQuestion: fallback, isLoading: false });
      speak(fallback);
    } finally {
      s.isProcessing = false;
    }
  }, [navigate, speak, stopListening, systemPrompt, sessionState, maxQuestions]);

  useEffect(() => {
    let cancelled = false;
    patch({ isLoading: true });
    askGemini([{ role: "user", content: "Commence l'entretien par la première question." }], systemPrompt)
      .then((q) => {
        if (cancelled) return;
        session.current.currentQuestion = q;
        session.current.index = 0;
        patch({ currentQuestion: q, index: 0, isLoading: false });
        speak(q);
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = "Bonjour, pouvez-vous vous présenter brièvement ?";
        session.current.currentQuestion = fallback;
        patch({ currentQuestion: fallback, isLoading: false });
        speak(fallback);
      });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  const emotionEmoji = {
    happy: "😊", neutral: "😐", sad: "😔",
    angry: "😤", fearful: "😨", disgusted: "🤢", surprised: "😲",
  };

  const { currentQuestion, index, transcript, liveTranscript,
    isSpeaking, isListening, isLoading, currentEmotion, emotionLog, cameraReady, error } = ui;

  return (
    <div className="zoom-container">
      <div className="topbar">
        <div className="brand">⚡ PrepAI Interview Room</div>
        <div className="status">
          {error ? "⚠️ Problème de connexion IA" :
           isLoading ? "⏳ IA réfléchit..." :
           isSpeaking ? "🔊 IA parle..." :
           isListening ? "🎙️ À vous de parler..." : "En attente"}
        </div>
        <div className="topbar-right">
          <div className="emotion-badge">{emotionEmoji[currentEmotion] || "😐"} {currentEmotion}</div>
          <div className="question-counter">{index + 1} / {maxQuestions}</div>
          <div className="timer">⏱ {formatTime(displayTime)}</div>
        </div>
      </div>

      <div className="main">
        <div className="ai-panel">
          <AIAvatar isSpeaking={isSpeaking} />
          <div className={`speech-bubble ${isLoading ? "loading" : ""}`}>
            {error ? error : isLoading ? "En réflexion..." : currentQuestion}
          </div>
          <div className="action-buttons">
            <button className="btn btn-mic" onClick={isListening ? stopListening : startListening} disabled={isSpeaking || isLoading}>
              {isListening ? "⏹ Stop micro" : "🎙️ Parler"}
            </button>
            <button className="btn btn-next" onClick={handleNextQuestion} disabled={isLoading || isSpeaking}>
              {index + 1 >= maxQuestions ? "🏁 Terminer" : "Suivant →"}
            </button>
          </div>
          {(transcript || liveTranscript) && (
            <div className="transcript-box">
              <p className="transcript-final">{transcript}</p>
              <p className="transcript-live">{liveTranscript}</p>
            </div>
          )}
        </div>
        <div className="user-panel">
          <div className="camera-box">
            <video ref={videoRef} autoPlay playsInline muted />
            {!cameraReady && <div className="camera-placeholder">📷 Activation caméra...</div>}
          </div>
          <div className="user-label">Vous (Candidat){isListening && <span className="mic-indicator"> 🔴</span>}</div>
          {emotionLog.length > 0 && (
            <div className="emotion-timeline">
              {emotionLog.slice(-8).map((e, i) => (
                <span key={i} title={e.emotion} className="emotion-dot">
                  {emotionEmoji[e.emotion] || "😐"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}