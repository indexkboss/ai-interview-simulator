//C:\Users\Lenovo\OneDrive\Bureau\4IA DATA\PFA\ai simi\ai-interview-simulator\frontend\src\pages\Report.jsx
import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { db } from "../services/firebase";
import { doc, setDoc, collection } from "firebase/firestore";
import Footer from "../components/Footer";
import "./Report.css";

export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const state = location.state || {};
  const {
    answers = [],
    emotionLog = [],
    duration = 0,
    jobTitle = "Entretien",
    interviewType = "hr",   // ✅ reçu depuis Interview.jsx maintenant
    visionStress = 35,
    audioStress = 35
  } = state;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const hasSaved = useRef(false);

  // ✅ BUG 3 CORRIGÉ : calcul emotion summary local (ne dépend pas du backend)
  const emotionSummary = (() => {
    if (!emotionLog || emotionLog.length === 0) return null;
    const counts = {};
    emotionLog.forEach(({ emotion }) => {
      if (emotion) counts[emotion] = (counts[emotion] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  })();

  const dominantEmotion = emotionSummary?.[0]?.[0] || "neutral";

  // Calcul stress label depuis le score
  const stressLabel = visionStress > 70 ? "high" : visionStress > 40 ? "moderate" : "low";

  useEffect(() => {
    const fetchReport = async () => {
      if (!answers || answers.length === 0) {
        setError("Aucune donnée d'entretien reçue.");
        setLoading(false);
        return;
      }

      try {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const response = await fetch("http://localhost:8000/api/report/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            answers: answers,                              // [{ question, answer }]
            emotion_log: emotionLog,
            duration: duration,
            job_title: jobTitle,
            interview_type: interviewType,
            vision_stress_score: (visionStress || 35) / 100,
            audio_stress_score: (audioStress || 35) / 100,
            avg_eye_contact: emotionLog.length > 0 ? 0.75 : 0.5,
            stress_label: stressLabel,
            dominant_valence: dominantEmotion,
            user_id: user?.uid || "",
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Erreur ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const reportData = data.report || data;

        // ✅ BUG 2 CORRIGÉ : on injecte la vraie réponse du candidat dans chaque feedback
        if (reportData.feedback_par_question && answers.length > 0) {
          reportData.feedback_par_question = reportData.feedback_par_question.map((fb, i) => ({
            ...fb,
            // Utilise le texte de question depuis answers si feedback.question est vide/générique
            question: (fb.question && fb.question !== "Q1" && fb.question.length > 5)
              ? fb.question
              : (answers[i]?.question || fb.question),
            // Injecte la vraie réponse du candidat
            reponse_candidat: answers[i]?.answer || "(pas de réponse)",
          }));
        }

        setReport(reportData);
      } catch (err) {
        console.error("Erreur rapport:", err);
        setError("Le service d'analyse a rencontré une erreur.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  // Sauvegarde Firestore
  useEffect(() => {
    const saveSession = async () => {
      if (!report || !user || hasSaved.current) return;
      hasSaved.current = true;
      try {
        const sessionsRef = collection(db, "users", user.uid, "sessions");
        const newDocRef = doc(sessionsRef);
        await setDoc(newDocRef, {
          id: newDocRef.id,
          date: new Date().toISOString(),
          jobTitle,
          interviewType,
          score: report.score_global || 0,
          duration,
          answers,
          emotionLog,
          fullReport: report
        });
        console.log("✅ Session Firestore sauvegardée");
      } catch (err) {
        console.error("Erreur Firestore:", err);
        hasSaved.current = false;
      }
    };
    if (report && !loading) saveSession();
  }, [report, user, loading]);

  // Helpers
  const emotionEmoji = {
    happy: "😊", neutral: "😐", sad: "😔",
    angry: "😤", fearful: "😨", disgusted: "🤢", surprised: "😲"
  };
  const scoreColor = (s) => s >= 75 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";
  const qualityColor = (q) => q >= 7 ? "#22c55e" : q >= 4 ? "#f59e0b" : "#ef4444";

  // ✅ Score global affiché proprement
  const globalScore = report?.score_global ?? 0;

  if (loading) {
    return (
      <div className="report-page">
        <div className="report-container">
          <div className="report-loading">
            <div className="loading-spinner" />
            <h2>Génération du rapport en cours...</h2>
            <p>Analyse de vos réponses, émotions et signaux comportementaux.</p>
          </div>
        </div>
        <Footer logoText="PrepAI" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-page">
        <div className="report-container">
          <div className="report-error">
            <h2>⚠️ Échec de l'analyse</h2>
            <p style={{ color: "#ef4444", marginBottom: "1.5rem" }}>{error}</p>
            <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
              Retour au tableau de bord
            </button>
          </div>
        </div>
        <Footer logoText="PrepAI" />
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="report-page">
      <div className="report-container">

        {/* HEADER */}
        <div className="report-header">
          <div className="report-brand">⚡ PrepAI</div>
          <h1>Rapport d'entretien</h1>
          <p>{jobTitle} — {Math.floor(duration / 60)}min {duration % 60}s</p>
        </div>

        {/* SCORE */}
        <div className="score-card">
          <div className="score-circle" style={{ "--score-color": scoreColor(globalScore) }}>
            <span className="score-value">{globalScore}</span>
            <span className="score-label">/ 100</span>
          </div>
          <div className="score-meta">
            <h2>Score Multimodal Unifié</h2>
            <p>{report.conseil_final || "Consultez vos axes d'amélioration ci-dessous."}</p>
          </div>
        </div>

        {/* TABS */}
        <div className="report-tabs">
          {["overview", "questions", "emotions"].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "overview" ? "📊 Vue globale & Signaux"
                : tab === "questions" ? "💬 Questions"
                : "🎭 Émotions"}
            </button>
          ))}
        </div>


{/* TAB : VUE GLOBALE */}
{activeTab === "overview" && (
  <div className="overview-content">
    <div className="report-card" style={{ marginBottom: "2rem" }}>
      <h3>🎙️ Analyse des Signaux de Comportement & Communication</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
        <div>
          <strong>Fluidité Verbale :</strong>
          <div style={{ background: "#f3f4f6", height: "10px", borderRadius: "5px", margin: "0.5rem 0" }}>
            <div style={{ background: scoreColor(globalScore), height: "100%", width: `${globalScore}%`, borderRadius: "5px" }} />
          </div>
          <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Score: {globalScore}/100</span>
        </div>
        <div>
          <strong>Gestion du Stress :</strong>
          <div style={{ background: "#f3f4f6", height: "10px", borderRadius: "5px", margin: "0.5rem 0" }}>
            {/* ✅ CORRIGÉ: affiche les vraies données stress */}
            <div style={{ background: "#22c55e", height: "100%", width: `${Math.max(0, Math.min(100, 100 - (report.stress_score * 100)))}%`, borderRadius: "5px" }} />
          </div>
          <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
            {/* ✅ AFFICHE LE STRESS_LABEL RÉEL */}
            Stress: {report.stress_label || "Non mesuré"}
          </span>
        </div>
      </div>
    </div>

    <div className="overview-grid">
      <div className="report-card strengths">
        <h3>✅ Points forts</h3>
        <ul>
          {report.points_forts?.length > 0
            ? report.points_forts.map((p, i) => <li key={i}>{p}</li>)
            : <li>Participation à l'entretien</li>}
        </ul>
      </div>
      <div className="report-card improvements">
        <h3>📈 Axes d'amélioration</h3>
        <ul>
          {report.axes_amelioration?.length > 0
            ? report.axes_amelioration.map((a, i) => <li key={i}>{a}</li>)
            : <li>Structurer les réponses avec la méthode STAR</li>}
        </ul>
      </div>
    </div>
  </div>
)}
        {/* TAB : QUESTIONS */}
        {activeTab === "questions" && (
          <div className="questions-feedback">
            {report.feedback_par_question?.length > 0 ? (
              report.feedback_par_question.map((fb, i) => (
                <div key={i} className="question-card">
                  <div className="question-header">
                    <span className="q-number">Q{i + 1}</span>
                    {/* ✅ BUG 2 CORRIGÉ : affiche la vraie question */}
                    <span className="q-text">{fb.question || answers[i]?.question || `Question ${i + 1}`}</span>
                    <span className="q-score" style={{ background: qualityColor(fb.qualite) }}>
                      {fb.qualite}/10
                    </span>
                  </div>
                  <div className="answer-block candidate-answer">
                    <strong>Votre réponse :</strong>
                    {/* ✅ BUG 2 CORRIGÉ : affiche la vraie réponse du candidat */}
                    <p>{fb.reponse_candidat || answers[i]?.answer || "(Aucune réponse enregistrée)"}</p>
                  </div>
                  <div className="feedback-grid">
                    <div className="feedback-block good">
                      <strong>✅ Ce qui était bien</strong>
                      <p>{fb.ce_qui_etait_bien || "—"}</p>
                    </div>
                    <div className="feedback-block missing">
                      <strong>⚠️ Ce qui manquait</strong>
                      <p>{fb.ce_qui_manquait || "—"}</p>
                    </div>
                  </div>
                  <div className="ideal-answer">
                    <strong>💡 Proposition de réponse idéale :</strong>
                    <p>{fb.reponse_ideale || "Utilisez la méthode STAR : Situation, Tâche, Action, Résultat."}</p>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: "center", color: "#6b7280" }}>Aucun feedback disponible.</p>
            )}
          </div>
        )}

        {/* TAB : ÉMOTIONS */}
        {activeTab === "emotions" && (
          <div className="emotions-section">
            <div className="report-card">
              <h3>🎭 Analyse Émotionnelle Globale</h3>
              {/* ✅ BUG 3 CORRIGÉ : analyse calculée localement depuis emotionLog */}
              {emotionSummary && emotionSummary.length > 0 ? (
                <>
                  <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
                    {emotionLog.length} captures analysées — émotion dominante : <strong>{dominantEmotion}</strong>
                  </p>
                  <div className="emotion-timeline-full">
                    {emotionSummary.map(([emotion, count]) => (
                      <div key={emotion} className="emotion-row">
                        <span className="emotion-icon">{emotionEmoji[emotion] || "😐"}</span>
                        <span className="emotion-name">{emotion}</span>
                        <div className="emotion-bar-wrap">
                          <div
                            className="emotion-bar"
                            style={{ width: `${Math.round((count / emotionLog.length) * 100)}%` }}
                          />
                        </div>
                        <span className="emotion-pct">
                          {Math.round((count / emotionLog.length) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                  <p style={{ fontSize: "2rem" }}>📷</p>
                  <p><strong>Aucune donnée émotionnelle capturée.</strong></p>
                  <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
                    Assurez-vous que la caméra est bien active pendant l'entretien et que
                    la librairie <code>face-api.js</code> est chargée sur la page Interview.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="report-actions">
          <button className="btn btn-outline" onClick={() => navigate("/dashboard")}>
            Nouvel entretien
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            📄 Exporter en PDF
          </button>
        </div>

      </div>
      <Footer logoText="PrepAI" />
    </div>
  );
}