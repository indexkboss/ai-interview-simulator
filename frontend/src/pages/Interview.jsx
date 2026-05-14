import React, { useRef, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Interview() {
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { interviewType } = location.state || {};

  // 🎯 QUESTIONS
  const hrQuestions = [
    "Tell me about yourself",
    "Why do you want this job?",
    "What are your strengths?",
    "What are your weaknesses?"
  ];

  const technicalQuestions = [
    "Explain OOP concepts",
    "What is a database?",
    "Difference between API and REST?",
    "What is a REST API?"
  ];

  let questions = [];

  if (interviewType === "hr") {
    questions = hrQuestions;
  } else if (interviewType === "technical") {
    questions = technicalQuestions;
  } else {
    questions = [...hrQuestions, ...technicalQuestions];
  }

  // 🎯 STATE
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [emotion, setEmotion] = useState("...");
  const [emotionsHistory, setEmotionsHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🎥 START CAMERA
  useEffect(() => {
    startCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      videoRef.current.srcObject = stream;

      setInterval(() => {
        captureFrame();
      }, 2000);

    } catch (error) {
      console.error("Camera error:", error);
    }
  };

  // 📸 CAPTURE IMAGE
  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL("image/jpeg").split(",")[1];

    sendToBackend(base64);
  };

  // 🤖 SEND TO BACKEND
  const sendToBackend = async (base64) => {
    try {
      setLoading(true);

      const response = await fetch("http://127.0.0.1:8000/api/emotion/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await response.json();

      setEmotion(data.emotion);

      // 📊 STOCKAGE EMOTIONS
      setEmotionsHistory(prev => [...prev, data.emotion]);

    } catch (error) {
      console.error("API error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ➡️ NEXT QUESTION
  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      finishInterview();
    }
  };

  // 🏁 FIN INTERVIEW
  const finishInterview = () => {
    // 📊 Calcul score simple
    const happyCount = emotionsHistory.filter(e => e === "happy").length;
    const neutralCount = emotionsHistory.filter(e => e === "neutral").length;
    const negativeCount = emotionsHistory.length - happyCount - neutralCount;

    const score = emotionsHistory.length
      ? ((happyCount / emotionsHistory.length) * 100).toFixed(2)
      : 0;

    // 👉 envoi vers page report
    navigate("/report", {
      state: {
        emotionsHistory,
        score,
        happyCount,
        neutralCount,
        negativeCount
      }
    });
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>🎥 AI Interview</h2>

      <div style={{ display: "flex", justifyContent: "center", gap: "40px" }}>

        {/* 🤖 AVATAR */}
        <div>
          <img
            src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png"
            alt="avatar"
            style={{ width: "150px" }}
          />
          <p><strong>Interviewer</strong></p>

          <p style={{ maxWidth: "200px" }}>
            {questions[currentQuestion]}
          </p>
        </div>

        {/* 🎥 USER */}
        <div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: "400px",
              borderRadius: "10px",
              border: "2px solid #ccc",
            }}
          />
          <p>You</p>
        </div>

      </div>

      {/* 📊 EMOTION */}
      <h3>
        Emotion: {loading ? "Analyzing..." : emotion}
      </h3>

      {/* ➡️ NEXT */}
      <button
        onClick={nextQuestion}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          fontSize: "16px"
        }}
      >
        Next Question
      </button>

    </div>
  );
}