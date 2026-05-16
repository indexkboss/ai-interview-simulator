import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Report.css";
import Navbar from "../components/Navbar";

// ─── Claude API ───────────────────────────────────────────────────────────────
async function generateReport(answers, emotionLog, duration, jobTitle, interviewType) {
  const answersText = answers
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nRéponse: ${qa.answer}`)
    .join("\n\n");

  const emotionSummary = emotionLog.length
    ? Object.entries(
        emotionLog.reduce((acc, { emotion }) => {
          acc[emotion] = (acc[emotion] || 0) + 1;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .map(([e, c]) => `${e}: ${c} fois`)
        .join(", ")
    : "Non disponible";

  const prompt = `Tu es un expert en recrutement. Analyse cet entretien ${interviewType} pour le poste de "${jobTitle || "poste non précisé"}".

Durée : ${Math.floor(duration / 60)} minutes ${duration % 60} secondes
Émotions détectées : ${emotionSummary}

Questions et réponses :
${answersText}

Génère un rapport JSON structuré UNIQUEMENT (sans backticks ni markdown), avec ce format exact :
{
  "score_global": <0-100>,
  "points_forts": ["...", "...", "..."],
  "axes_amelioration": ["...", "...", "..."],
  "analyse_emotions": "...",
  "feedback_par_question": [
    {
      "question": "...",
      "reponse_candidat": "...",
      "qualite": <0-10>,
      "ce_qui_etait_bien": "...",
      "ce_qui_manquait": "...",
      "reponse_ideale": "..."
    }
  ],
  "conseil_final": "..."
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const raw = data.content?.map((b) => b.text || "").join("") || "{}";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  const { answers = [], emotionLog = [], duration = 0, jobTitle, interviewType } =
    location.state || {};

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const load = async () => {
      try {
        const r = await generateReport(answers, emotionLog, duration, jobTitle, interviewType);
        setReport(r);
      } catch (e) {
        setError("Impossible de générer le rapport. Veuillez réessayer.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (answers.length > 0) {
      load();
    } else {
      setLoading(false);
      setError("Aucune donnée d'entretien disponible.");
    }
  }, []);

  const emotionEmoji = {
    happy: "😊", neutral: "😐", sad: "😔",
    angry: "😤", fearful: "😨", disgusted: "🤢", surprised: "😲",
  };

  const scoreColor = (s) => s >= 75 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";
  const qualityColor = (q) => q >= 7 ? "#22c55e" : q >= 4 ? "#f59e0b" : "#ef4444";

  if (loading) {
    return (
      <div className="report-loading">
        <Navbar />
        <div className="loading-spinner" />
        <h2>Génération du rapport en cours...</h2>
        <p>Claude analyse vos réponses et prépare un feedback détaillé</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-error">
        <Navbar />
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  return (
    <div className="report-page">
      <Navbar />
      <h1>aaaa</h1>
      <div className="report-header">
        <div className="report-brand">⚡ PrepAI</div>
        <h1>Rapport d'entretien</h1>
        <p>{jobTitle || "Entretien"} — {Math.floor(duration / 60)}min {duration % 60}s</p>
      </div>

      {/* Score global */}
      <div className="score-card">
        <div className="score-circle" style={{ "--score-color": scoreColor(report?.score_global) }}>
          <span className="score-value">{report?.score_global}</span>
          <span className="score-label">/ 100</span>
        </div>
        <div className="score-meta">
          <h2>Score global</h2>
          <p>{report?.conseil_final}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="report-tabs">
        {["overview", "questions", "emotions"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "overview" ? "📊 Vue globale" : tab === "questions" ? "💬 Questions" : "🎭 Émotions"}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="overview-grid">
          <div className="report-card strengths">
            <h3>✅ Points forts</h3>
            <ul>
              {report?.points_forts?.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div className="report-card improvements">
            <h3>📈 Axes d'amélioration</h3>
            <ul>
              {report?.axes_amelioration?.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Questions feedback */}
      {activeTab === "questions" && (
        <div className="questions-feedback">
          {report?.feedback_par_question?.map((fb, i) => (
            <div key={i} className="question-card">
              <div className="question-header">
                <span className="q-number">Q{i + 1}</span>
                <span className="q-text">{fb.question}</span>
                <span
                  className="q-score"
                  style={{ background: qualityColor(fb.qualite) }}
                >
                  {fb.qualite}/10
                </span>
              </div>

              <div className="answer-block candidate-answer">
                <strong>Votre réponse :</strong>
                <p>{fb.reponse_candidat || "(Pas de réponse)"}</p>
              </div>

              <div className="feedback-grid">
                <div className="feedback-block good">
                  <strong>✅ Ce qui était bien</strong>
                  <p>{fb.ce_qui_etait_bien}</p>
                </div>
                <div className="feedback-block missing">
                  <strong>⚠️ Ce qui manquait</strong>
                  <p>{fb.ce_qui_manquait}</p>
                </div>
              </div>

              <div className="ideal-answer">
                <strong>💡 Réponse idéale attendue par le recruteur :</strong>
                <p>{fb.reponse_ideale}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Emotions */}
      {activeTab === "emotions" && (
        <div className="emotions-section">
          <div className="report-card">
            <h3>🎭 Analyse émotionnelle</h3>
            <p>{report?.analyse_emotions}</p>
          </div>

          {emotionLog.length > 0 && (
            <div className="report-card">
              <h3>Timeline des émotions</h3>
              <div className="emotion-timeline-full">
                {Object.entries(
                  emotionLog.reduce((acc, { emotion }) => {
                    acc[emotion] = (acc[emotion] || 0) + 1;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([emotion, count]) => (
                    <div key={emotion} className="emotion-row">
                      <span className="emotion-icon">{emotionEmoji[emotion] || "😐"}</span>
                      <span className="emotion-name">{emotion}</span>
                      <div className="emotion-bar-wrap">
                        <div
                          className="emotion-bar"
                          style={{
                            width: `${(count / emotionLog.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="emotion-pct">
                        {Math.round((count / emotionLog.length) * 100)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="report-actions">
        <button className="btn btn-outline" onClick={() => navigate("/dashboard")}>
          Nouvel entretien
        </button>
        <button
          className="btn btn-primary"
          onClick={() => window.print()}
        >
          📄 Exporter PDF
        </button>
      </div>
    </div>
  );
}