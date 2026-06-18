// frontend/src/pages/Interview.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Interview.css";
import AIAvatar from "../components/AIAvatar";


async function askBackendGemini(prompt) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/interview/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error("Backend error");
  const data = await res.json();
  return data.response;
}

function buildSystemPrompt(state) {
  const { interviewType, jobTitle, jobDescription, cvSummary } = state;
  const typeLabel = interviewType === "hr" ? "RH" : interviewType === "technical" ? "technique" : "complet";
  return `Tu es recruteur senior. Entretien ${typeLabel} pour: ${jobTitle || "un poste"}.
${cvSummary ? `Candidat: ${cvSummary.substring(0, 100)}` : ""}
RÈGLES: Une seule question en français. Naturelle et professionnelle. Juste la question, rien d'autre.`;
}

export default function Interview() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionState = location.state || {};

  useEffect(() => {
    if (!location.state || !location.state.interviewType) {
      navigate('/dashboard', { replace: true });
    }
  }, [location.state, navigate]);

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
    loadingMessage: "L'IA réfléchit...",
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

  const loadingMessages = [
    "L'IA réfléchit à votre question...",
    "Analyse de votre réponse...",
    "Préparation de la prochaine question...",
    "Traitement en cours...",
  ];
  const loadingMsgIndex = useRef(0);
  const loadingIntervalRef = useRef(null);

  const startLoadingMessages = () => {
    loadingMsgIndex.current = 0;
    patch({ isLoading: true, loadingMessage: loadingMessages[0] });
    loadingIntervalRef.current = setInterval(() => {
      loadingMsgIndex.current = (loadingMsgIndex.current + 1) % loadingMessages.length;
      patch({ loadingMessage: loadingMessages[loadingMsgIndex.current] });
    }, 3000);
  };

  const stopLoadingMessages = () => {
    clearInterval(loadingIntervalRef.current);
    patch({ isLoading: false });
  };

  // TIMER
  useEffect(() => {
    const t = setInterval(() => {
      timeRef.current += 1;
      setDisplayTime(timeRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // CAMERA
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
      .catch((err) => {
        console.error("Erreur caméra:", err);
        patch({ error: "Impossible d'accéder à la caméra." });
      });
    return () => {
      videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // EMOTIONS
  // EMOTIONS - ✅ ATTENDRE QUE FACE-API SOIT CHARGÉ
useEffect(() => {
  // Attendre que face-api soit disponible
  const checkFaceAPI = () => {
    if (!window.faceapi) {
      console.log("[FACE-API] Chargement en cours...");
      setTimeout(checkFaceAPI, 500);
      return;
    }

    console.log("✅ [FACE-API] Chargé! Chargement des modèles...");
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
    
    Promise.all([
      window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      window.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]).then(() => {
      console.log("✅ [FACE-API] Modèles chargés! Capture émotions active.");
      emotionIntervalRef.current = setInterval(async () => {
        if (!videoRef.current?.srcObject) return;
        try {
          const det = await window.faceapi
            .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();
          if (det?.expressions) {
            const emotions = Object.entries(det.expressions).sort((a, b) => b[1] - a[1]);
            const topEmotion = emotions[0][0];
            const confidence = emotions[0][1];
            if (confidence > 0.3) {
              session.current.emotionLog.push({
                time: timeRef.current,
                emotion: topEmotion,
                confidence,
              });
              patch({
                currentEmotion: topEmotion,
                emotionLog: [...session.current.emotionLog],
              });
              console.log(`[EMOTION] ${topEmotion} (${confidence.toFixed(2)})`);
            }
          }
        } catch (e) {
          // Erreur de détection, continue quand même
        }
      }, 2000);
    }).catch(err => {
      console.error("[FACE-API] Erreur chargement modèles:", err);
    });
  };

  checkFaceAPI();

  return () => {
    if (emotionIntervalRef.current) clearInterval(emotionIntervalRef.current);
  };
}, []);

  // TTS
  const speak = useCallback((text) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 0.95;
    utterance.onstart = () => patch({ isSpeaking: true });
    utterance.onend = () => {
      patch({ isSpeaking: false });
      startListeningRef.current?.();
    };
    speechSynthesis.speak(utterance);
  }, []);

  // STT
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
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
        } else {
          interim += t;
        }
      }
      patch({ transcript: session.current.transcript, liveTranscript: interim });
    };
    rec.start();
    patch({ isListening: true });
  }, []);

  startListeningRef.current = startListening;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    patch({ isListening: false, liveTranscript: "" });
  }, []);

  // ✅ CORRIGÉ : navigate passe maintenant jobTitle + interviewType
  const handleNextQuestion = useCallback(async () => {
    const s = session.current;
    if (s.isProcessing) return;
    s.isProcessing = true;
    stopListening();

    const answer = (s.transcript + " " + s.liveTranscript).trim() || "(pas de réponse)";
    s.answers.push({ question: s.currentQuestion, answer });
    s.index++;
    s.transcript = "";
    s.liveTranscript = "";
    patch({ transcript: "", liveTranscript: "", index: s.index });

    if (s.index >= maxQuestions) {
      // ✅ BUG 1 CORRIGÉ : on passe jobTitle et interviewType
      navigate("/report", {
        state: {
          answers: s.answers,
          emotionLog: s.emotionLog,
          duration: timeRef.current,
          jobTitle: jobTitle,             // ✅ AJOUTÉ
          interviewType: interviewType,   // ✅ AJOUTÉ
        },
      });
      return;
    }

    startLoadingMessages();

    try {
      const lastQA = s.answers.slice(-2).map(
        (qa) => `Q: ${qa.question}\nR: ${qa.answer}`
      ).join("\n");
      const prompt = `${systemPrompt}\n\nDerniers échanges:\n${lastQA}\n\nProchaine question:`;
      const nextQ = await askBackendGemini(prompt);
      s.currentQuestion = nextQ;
      stopLoadingMessages();
      patch({ currentQuestion: nextQ });
      speak(nextQ);
    } catch (err) {
      const fallback = "Pouvez-vous décrire une expérience importante ?";
      s.currentQuestion = fallback;
      stopLoadingMessages();
      patch({ currentQuestion: fallback });
      speak(fallback);
    }

    s.isProcessing = false;
  }, [navigate, speak, stopListening, systemPrompt, maxQuestions, jobTitle, interviewType]);

  // FIRST QUESTION
  useEffect(() => {
    let cancelled = false;
    (async () => {
      startLoadingMessages();
      try {
        const q = await askBackendGemini(
          `${systemPrompt}\nCommence l'entretien. Pose la première question:`
        );
        if (cancelled) return;
        session.current.currentQuestion = q;
        stopLoadingMessages();
        patch({ currentQuestion: q });
        speak(q);
      } catch {
        const fallback = "Présentez-vous en quelques mots.";
        stopLoadingMessages();
        patch({ currentQuestion: fallback });
        speak(fallback);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const {
    currentQuestion, index, transcript, liveTranscript,
    isSpeaking, isListening, isLoading, loadingMessage,
    currentEmotion, cameraReady, error,
  } = ui;

  return (
    <div className="zoom-container">
      <div className="topbar">
        <div className="brand">⚡ PrepAI Interview Room</div>
        <div className="timer">{formatTime(displayTime)}</div>
        <div className="status">
          {isLoading ? `⏳ ${loadingMessage}` : isSpeaking ? "🔊 L'IA parle..." : isListening ? "🎤 En écoute..." : "⏸ En attente"}
        </div>
        <div className="progress">
          Question {Math.min(index + 1, maxQuestions)} / {maxQuestions}
        </div>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="main">
        <div className="ai-panel">
          <AIAvatar isSpeaking={isSpeaking} />
          <div className={`speech-bubble ${isLoading ? "loading" : ""}`}>
            {isLoading ? (
              <span className="loading-text">
                <span className="dot-anim">●</span> {loadingMessage}
              </span>
            ) : (
              currentQuestion || "Initialisation..."
            )}
          </div>
          <div className="controls">
            <button
              className={`btn-mic ${isListening ? "active" : ""}`}
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading || isSpeaking}
            >
              {isListening ? "⏹ Arrêter" : "🎤 Parler"}
            </button>
            <button
              className="btn-next"
              onClick={handleNextQuestion}
              disabled={isLoading}
            >
              {index + 1 >= maxQuestions ? "🏁 Terminer" : "➡ Suivant"}
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
          <video ref={videoRef} autoPlay muted />
          {!cameraReady && <div className="camera-loading">📷 Caméra...</div>}
          <div className="emotion-badge">
            {currentEmotion !== "neutral" ? `😊 ${currentEmotion}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}