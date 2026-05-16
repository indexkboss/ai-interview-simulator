import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Interview.css";
import AIAvatar from "../components/AIAvatar";

// ─── Claude API ───────────────────────────────────────────────────────────────
async function askClaude(messages, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.map((b) => b.text || "").join("").trim() || "";
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

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Interview() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionState = location.state || {};
  const { interviewType = "hr" } = sessionState;
  const maxQuestions = interviewType === "full" ? 10 : 6;
  const systemPrompt = buildSystemPrompt(sessionState);

  /*
   * ARCHITECTURE : toute la logique métier vit dans `session` (une ref mutable).
   * Le state React `ui` n'existe que pour provoquer des re-renders d'affichage.
   * Résultat : handleNextQuestion lit TOUJOURS des données fraîches,
   * zéro stale-closure possible.
   */
  const session = useRef({
    answers: [],          // { question: string, answer: string }[]
    index: 0,             // numéro de la question courante (0-based)
    currentQuestion: "",
    transcript: "",       // texte vocal final accumulé
    liveTranscript: "",   // texte vocal interim (en cours de reconnaissance)
    emotionLog: [],       // { time, emotion }[]
    isEnding: false,      // navigation en cours → ignorer tout
    isProcessing: false,  // verrou anti-double-clic
  });

  // State React — uniquement pour le rendu
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
  });
  const patch = (delta) => setUi((prev) => ({ ...prev, ...delta }));

  // Timer — ref pour éviter la stale closure dans setInterval
  const timeRef = useRef(0);
  const [displayTime, setDisplayTime] = useState(0);

  // DOM refs
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const emotionIntervalRef = useRef(null);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      timeRef.current += 1;
      setDisplayTime(timeRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  // ── Camera ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          patch({ cameraReady: true });
        };
      })
      .catch((err) => console.error("Caméra:", err));

    return () => {
      videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Détection d'émotions (face-api) ───────────────────────────────────────
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

  // ── TTS ────────────────────────────────────────────────────────────────────
  // speak est stable (useCallback sans dépendances) — elle accède à startListening
  // via la ref speakRef pour éviter les dépendances circulaires.
  const startListeningRef = useRef(null);

  const speak = useCallback((text) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 0.95;

    const doSpeak = () => {
      const voices = speechSynthesis.getVoices();
      const frVoice =
        voices.find((v) => v.lang.startsWith("fr") && v.name.toLowerCase().includes("female")) ||
        voices.find((v) => v.lang.startsWith("fr")) ||
        voices[0];
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

    if (speechSynthesis.getVoices().length > 0) {
      doSpeak();
    } else {
      speechSynthesis.onvoiceschanged = doSpeak;
    }
  }, []);

  // ── Reconnaissance vocale ──────────────────────────────────────────────────
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

  // Enregistrer startListening dans la ref pour que speak() puisse l'appeler
  startListeningRef.current = startListening;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    session.current.liveTranscript = "";
    patch({ isListening: false, liveTranscript: "" });
  }, []);

  // ── Question suivante ──────────────────────────────────────────────────────
  const handleNextQuestion = useCallback(async () => {
    const s = session.current;

    // Verrous : on ignore si navigation en cours ou déjà en train de traiter
    if (s.isEnding || s.isProcessing) return;
    s.isProcessing = true;

    stopListening();

    // === Lire DEPUIS LA REF (jamais depuis les params de useCallback) ===
    const userAnswer = (s.transcript + " " + s.liveTranscript).trim() || "(pas de réponse)";
    const completedQA = { question: s.currentQuestion, answer: userAnswer };

    // Mettre à jour la ref en premier
    s.answers = [...s.answers, completedQA];
    s.index = s.index + 1;
    s.transcript = "";
    s.liveTranscript = "";

    // Puis mettre à jour l'affichage
    patch({ transcript: "", liveTranscript: "", index: s.index });

    // Fin de l'entretien ?
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
          interviewType,
        },
      });
      return; // isProcessing reste true : on ne reviendra jamais ici
    }

    // Demander la prochaine question à Claude
    patch({ isLoading: true });
    try {
      // Historique complet depuis la ref — toujours à jour
      const history = s.answers.flatMap((qa) => [
        { role: "assistant", content: qa.question },
        { role: "user", content: qa.answer },
      ]);

      const nextQ = await askClaude(history, systemPrompt);

      s.currentQuestion = nextQ;
      patch({ currentQuestion: nextQ, isLoading: false });
      speak(nextQ);
    } catch (err) {
      console.error("Claude API:", err);
      const fallback = "P";//ouvez-vous me parler d'un défi professionnel que vous avez surmonté ?
      s.currentQuestion = fallback;
      patch({ currentQuestion: fallback, isLoading: false });
      speak(fallback);
    } finally {
      s.isProcessing = false;
    }
  }, [navigate, speak, stopListening, systemPrompt, interviewType, maxQuestions, sessionState.jobTitle]);

  // ── Première question au montage ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    patch({ isLoading: true });

    askClaude(
      [{ role: "user", content: "Commence l'entretien par la première question." }],
      systemPrompt
    )
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rendu ──────────────────────────────────────────────────────────────────
  const emotionEmoji = {
    happy: "😊", neutral: "😐", sad: "😔",
    angry: "😤", fearful: "😨", disgusted: "🤢", surprised: "😲",
  };

  const {
    currentQuestion, index, transcript, liveTranscript,
    isSpeaking, isListening, isLoading, currentEmotion, emotionLog, cameraReady,
  } = ui;

  return (
    <div className="zoom-container">
      {/* TOP BAR */}
      <div className="topbar">
        <div className="brand">⚡ PrepAI Interview Room</div>
        <div className="status">
          {isLoading ? "⏳ IA réfléchit..."
            : isSpeaking ? "🔊 IA parle..."
            : isListening ? "🎙️ À vous de parler..."
            : "En attente"}
        </div>
        <div className="topbar-right">
          <div className="emotion-badge">
            {emotionEmoji[currentEmotion] || "😐"} {currentEmotion}
          </div>
          <div className="question-counter">
            {index + 1} / {maxQuestions}
          </div>
          <div className="timer">⏱ {formatTime(displayTime)}</div>
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        {/* AI PANEL */}
        <div className="ai-panel">
          <AIAvatar isSpeaking={isSpeaking} />

          <div className={`speech-bubble ${isLoading ? "loading" : ""}`}>
            {isLoading ? (
              <span className="loading-dots">
                En réflexion<span>.</span><span>.</span><span>.</span>
              </span>
            ) : (
              currentQuestion
            )}
          </div>

          <div className="action-buttons">
            <button
              className="btn btn-mic"
              onClick={isListening ? stopListening : startListening}
              disabled={isSpeaking || isLoading}
            >
              {isListening ? "⏹ Stop micro" : "🎙️ Parler"}
            </button>
            <button
              className="btn btn-next"
              onClick={handleNextQuestion}
              disabled={isLoading || isSpeaking}
            >
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

        {/* USER PANEL */}
        <div className="user-panel">
          <div className="camera-box">
            <video ref={videoRef} autoPlay playsInline muted />
            {!cameraReady && (
              <div className="camera-placeholder">📷 Activation caméra...</div>
            )}
          </div>
          <div className="user-label">
            Vous (Candidat){isListening && <span className="mic-indicator"> 🔴</span>}
          </div>
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