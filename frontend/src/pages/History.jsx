import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './History.css';

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
  const fetchHistory = async () => {
    if (!user) {
      console.log("❌ User non connecté");
      setError("Vous devez être connecté pour voir votre historique.");
      setLoading(false);
      return;
    }

    console.log("✅ User connecté:", user.uid);  // ← LOG
    
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_API_URL}/report/history/${user.uid}`;
      console.log("📡 Appel API:", url);  // ← LOG
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log("📊 Réponse status:", response.status);  // ← LOG

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      console.log("📦 Data reçue:", data);  // ← LOG
      
      const sessionsData = data.interviews.map(interview => ({
        id: interview.id,
        jobTitle: interview.job_title,
        interviewType: interview.interview_type,
        score: interview.global_score,
        date: interview.created_at,
        duration: interview.duration_seconds
      }));

      setSessions(sessionsData);
      setError(null);
    } catch (err) {
      console.error("❌ Erreur complète:", err);  // ← LOG
      setError("Impossible de charger l'historique. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  fetchHistory();
}, [user]);
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'hr': return 'RH';
      case 'technical': return 'Technique';
      case 'full': return 'Complet';
      default: return type;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="history-container">
          <div className="loading-spinner" />
          <p style={{ textAlign: 'center' }}>Chargement de l'historique...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="history-container">
          <div className="empty-history">
            <p style={{ color: 'red' }}>{error}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="history-container">
        <div className="history-header">
          <h1>Historique des entretiens</h1>
          <p>Retrouvez tous vos entraînements passés</p>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-history">
            <p>Aucun entretien réalisé pour le moment.</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/dashboard')}
            >
              Commencer un entraînement
            </button>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.map((session) => (
              <div key={session.id} className="session-card">
                <div className="session-info">
                  <div className="session-title">
                    <h3>{session.jobTitle}</h3>
                    <span className="session-type">{getTypeLabel(session.interviewType)}</span>
                  </div>
                  <p className="session-date">{formatDate(session.date)}</p>
                  {session.duration !== undefined && (
                    <p className="session-duration">
                      Durée : {Math.floor(session.duration / 60)}min {session.duration % 60}s
                    </p>
                  )}
                </div>
                <div className="session-score" style={{ color: getScoreColor(session.score) }}>
                  <span className="score-value">{Math.round(session.score)}</span>
                  <span className="score-unit">/100</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="history-page">
      <Navbar />
      {renderContent()}
      <Footer logoText="PrepAI" />
    </div>
  );
}