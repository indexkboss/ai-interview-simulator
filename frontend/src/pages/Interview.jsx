import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./Interview.css";
import AIAvatar from "./AIAvatar";

export default function Interview() {
  const videoRef = useRef(null);
  const location = useLocation();

  const { interviewType } = location.state || {};

  const questions =
    interviewType === "technical"
      ? [
          "Explain object oriented programming concepts.",
          "What is REST API?",
          "What is a database?",
        ]
      : [
          "Tell me about yourself.",
          "Why do you want this job?",
          "What are your strengths?",
        ];

  const [index, setIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  /* =========================
     TIMER
  ========================= */
  useEffect(() => {
    const t = setInterval(() => setTime((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* =========================
     CAMERA
  ========================= */
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => video.play();
        }
      } catch (err) {
        console.error(err);
      }
    };

    startCamera();
  }, []);

  /* =========================
     TEXT TO SPEECH
  ========================= */
  const speak = (text) => {
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    const voices = speechSynthesis.getVoices();
    utterance.voice =
      voices.find((v) => v.lang.includes("en")) || voices[0];

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (questions[index]) speak(questions[index]);
  }, [index]);

  const nextQuestion = () => {
    if (index < questions.length - 1) {
      setIndex((p) => p + 1);
    }
  };

  const formatTime = () => {
    const m = Math.floor(time / 60);
    const s = time % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="zoom-container">

      {/* TOP BAR */}
      <div className="topbar">
        <div className="brand">⚡ PrepAI Interview Room</div>

        <div className="status">
          {isSpeaking ? "AI speaking..." : "Waiting for answer"}
        </div>

        <div className="timer">⏱ {formatTime()}</div>
      </div>

      {/* MAIN */}
      <div className="main">

        {/* AI PANEL */}
        <div className="ai-panel">

          <AIAvatar isSpeaking={isSpeaking} />

          <div className="speech-bubble">
            {questions[index]}
          </div>

          <button className="btn" onClick={nextQuestion}>
            Next Question
          </button>

        </div>

        {/* USER PANEL */}
        <div className="user-panel">

          <div className="camera-box">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
            />
          </div>

          <div className="user-label">You (Candidate)</div>

        </div>

      </div>
    </div>
  );
}