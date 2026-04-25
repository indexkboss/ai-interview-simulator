import React, { useRef, useEffect, useState } from "react";

export default function Interview() {
  const videoRef = useRef(null);
  const [emotion, setEmotion] = useState("...");
  const [loading, setLoading] = useState(false);

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

    } catch (error) {
      console.error("API error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>🎥 AI Interview</h2>

      <div style={{ display: "flex", justifyContent: "center", gap: "30px" }}>
        
        {/* Avatar interviewer */}
        <div>
          <img
            src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png"
            alt="avatar"
            style={{ width: "150px" }}
          />
          <p>Interviewer</p>
          <p><strong>Tell me about yourself</strong></p>
        </div>

        {/* Webcam user */}
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

      <h3>
        Emotion: {loading ? "Analyse..." : emotion}
      </h3>
    </div>
  );
}