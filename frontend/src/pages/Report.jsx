import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { db } from "../services/firebase";
import { doc, setDoc, collection } from "firebase/firestore";
import "./Report.css";

// ─── Configuration des modèles ──────────────────────────────────────────
const MODELS = {
  primary: "gemini-2.0-flash",
  fallback: "gemini-2.5-flash-lite"
};

async function callGeminiWithRetry(prompt, model = MODELS.primary, retries = 3, delay = 1000) {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Clé API Gemini manquante");

  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 2000 },
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
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Tentative ${attempt} échouée, nouvelle tentative dans ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Échec après plusieurs tentatives");
}

async function generateReport(answers, emotionLog, duration, jobTitle, interviewType) {
  const answersText = answers
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nR: ${qa.answer}`)
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

Durée : ${Math.floor(duration / 60)}min ${duration % 60}s
Émotions : ${emotionSummary}

Q/R :
${answersText}

Génère UNIQUEMENT ce JSON (sans markdown) :
{
  "score_global": 0-100,
  "points_forts": ["..."],
  "axes_amelioration": ["..."],
  "analyse_emotions": "...",
  "feedback_par_question": [
    {
      "question": "...",
      "reponse_candidat": "...",
      "qualite": 0-10,
      "ce_qui_etait_bien": "...",
      "ce_qui_manquait": "...",
      "reponse_ideale": "..."
    }
  ],
  "conseil_final": "..."
}`;

  try {
    return await callGeminiWithRetry(prompt, MODELS.primary);
  } catch (err) {
    console.warn("Modèle principal échoué, tentative fallback", err);
    return await callGeminiWithRetry(prompt, MODELS.fallback);
  }
}

export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state || {};
  const { answers = [], emotionLog = [], duration = 0, jobTitle, interviewType } = state;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Génération du rapport
  useEffect(() => {
    const load = async () => {
      if (!answers || answers.length === 0) {
        setError("Aucune réponse d'entretien trouvée.");
        setLoading(false);
        return;
      }
      try {
        const r = await generateReport(answers, emotionLog, duration, jobTitle, interviewType);
        setReport(r);
      } catch (e) {
        console.error(e);
        setError("Impossible de générer le rapport : quotas API dépassés ou service indisponible. Veuillez réessayer plus tard.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [answers, emotionLog, duration, jobTitle, interviewType]);

  // Sauvegarde automatique dans Firestore une fois le rapport obtenu
  useEffect(() => {
    const saveSession = async () => {
      if (!report || !user) return;
      try {
        const sessionsRef = collection(db, "users", user.uid, "sessions");
        const newDocRef = doc(sessionsRef);
        await setDoc(newDocRef, {
          id: newDocRef.id,
          date: new Date().toISOString(),
          jobTitle: jobTitle || "Poste non spécifié",
          interviewType: interviewType || "inconnu",
          score: report.score_global,
          duration: duration,
          answers: answers,      // optionnel
          emotionLog: emotionLog // optionnel
        });
        console.log("Session sauvegardée avec succès");
      } catch (err) {
        console.error("Erreur lors de la sauvegarde de la session:", err);
      }
    };
    if (report && !loading) {
      saveSession();
    }
  }, [report, user, jobTitle, interviewType, duration, answers, emotionLog, loading]);

  const emotionEmoji = {
    happy: "😊", neutral: "😐", sad: "😔",
    angry: "😤", fearful: "😨", disgusted: "🤢", surprised: "😲",
  };
  const scoreColor = (s) => s >= 75 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";
  const qualityColor = (q) => q >= 7 ? "#22c55e" : q >= 4 ? "#f59e0b" : "#ef4444";

  if (loading) {
    return (
      <div className="report-loading" style={{ textAlign: "center", padding: "4rem" }}>
        <div className="loading-spinner" />
        <h2>Génération du rapport...</h2>
        <p>L'IA analyse vos réponses. Cela peut prendre quelques secondes.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-error" style={{ textAlign: "center", padding: "4rem" }}>
        <h2>⚠️ Une erreur est survenue</h2>
        <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>Retour</button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="report-page">
      <div className="report-header">
        <div className="report-brand">⚡ PrepAI</div>
        <h1>Rapport d'entretien</h1>
        <p>{jobTitle || "Entretien"} — {Math.floor(duration / 60)}min {duration % 60}s</p>
      </div>

      <div className="score-card">
        <div className="score-circle" style={{ "--score-color": scoreColor(report.score_global) }}>
          <span className="score-value">{report.score_global}</span>
          <span className="score-label">/ 100</span>
        </div>
        <div className="score-meta">
          <h2>Score global</h2>
          <p>{report.conseil_final}</p>
        </div>
      </div>

      <div className="report-tabs">
        {["overview", "questions", "emotions"].map((tab) => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
            {tab === "overview" ? "📊 Vue globale" : tab === "questions" ? "💬 Questions" : "🎭 Émotions"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="overview-grid">
          <div className="report-card strengths"><h3>✅ Points forts</h3><ul>{report.points_forts?.map((p,i)=><li key={i}>{p}</li>)}</ul></div>
          <div className="report-card improvements"><h3>📈 Axes d'amélioration</h3><ul>{report.axes_amelioration?.map((a,i)=><li key={i}>{a}</li>)}</ul></div>
        </div>
      )}

      {activeTab === "questions" && (
        <div className="questions-feedback">
          {report.feedback_par_question?.map((fb,i)=>(
            <div key={i} className="question-card">
              <div className="question-header"><span className="q-number">Q{i+1}</span><span className="q-text">{fb.question}</span><span className="q-score" style={{background: qualityColor(fb.qualite)}}>{fb.qualite}/10</span></div>
              <div className="answer-block candidate-answer"><strong>Votre réponse :</strong><p>{fb.reponse_candidat || "(Pas de réponse)"}</p></div>
              <div className="feedback-grid"><div className="feedback-block good"><strong>✅ Ce qui était bien</strong><p>{fb.ce_qui_etait_bien}</p></div><div className="feedback-block missing"><strong>⚠️ Ce qui manquait</strong><p>{fb.ce_qui_manquait}</p></div></div>
              <div className="ideal-answer"><strong>💡 Réponse idéale :</strong><p>{fb.reponse_ideale}</p></div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "emotions" && (
        <div className="emotions-section">
          <div className="report-card"><h3>🎭 Analyse émotionnelle</h3><p>{report.analyse_emotions}</p></div>
          {emotionLog.length > 0 && (
            <div className="report-card"><h3>Répartition des émotions</h3>
              <div className="emotion-timeline-full">
                {Object.entries(emotionLog.reduce((acc,{emotion})=>{acc[emotion]=(acc[emotion]||0)+1; return acc;},{})).sort((a,b)=>b[1]-a[1]).map(([emotion,count])=>(
                  <div key={emotion} className="emotion-row"><span className="emotion-icon">{emotionEmoji[emotion]||"😐"}</span><span className="emotion-name">{emotion}</span><div className="emotion-bar-wrap"><div className="emotion-bar" style={{width:`${(count/emotionLog.length)*100}%`}}/></div><span className="emotion-pct">{Math.round((count/emotionLog.length)*100)}%</span></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="report-actions">
        <button className="btn btn-outline" onClick={() => navigate("/dashboard")}>Nouvel entretien</button>
        <button className="btn btn-primary" onClick={() => window.print()}>📄 Exporter PDF</button>
      </div>
    </div>
  );
}