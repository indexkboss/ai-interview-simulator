import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import copyWritingImg from "../assets/copy-writing.png";
import pasteImg from "../assets/paste.png";
import SideNav from '../components/SideNav';
import Footer from '../components/Footer';
import './Dashboard.css';

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showRequired, setShowRequired] = useState(false);
  const [mode, setMode] = useState(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobOfferText, setJobOfferText] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [file, setFile] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [loadingStart, setLoadingStart] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      setStatsLoading(true);
      try {
        const sessionsRef = collection(db, "users", user.uid, "sessions");
        const q = query(sessionsRef, orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const sessionsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dateObj: new Date(doc.data().date)
        }));
        setSessions(sessionsData);
      } catch (err) {
        console.error(err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchSessions();
  }, [user]);

  const filteredSessions = sessions.filter(session => {
    if (filterType !== 'all' && session.interviewType !== filterType) return false;
    if (filterPeriod !== 'all') {
      const now = new Date();
      const diffDays = (now - session.dateObj) / (1000 * 60 * 60 * 24);
      if (filterPeriod === 'week' && diffDays > 7) return false;
      if (filterPeriod === 'month' && diffDays > 30) return false;
      if (filterPeriod === 'year' && diffDays > 365) return false;
    }
    return true;
  });

  const total = filteredSessions.length;
  const avgScore = total > 0 ? Math.round(filteredSessions.reduce((sum, s) => sum + (s.score || 0), 0) / total) : 0;
  const lastScore = filteredSessions[0]?.score || null;
  const scoreColor = (score) => {
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getLast7Days = () => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const sessionOfDay = filteredSessions.find(s => s.dateObj.toISOString().split('T')[0] === dateStr);
      result.push({ date: dateStr, score: sessionOfDay?.score || 0 });
    }
    return result;
  };
  const scoreTrend = getLast7Days();

  const typeDistribution = [
    { name: 'RH', value: sessions.filter(s => s.interviewType === 'hr').length, color: '#6c63ff' },
    { name: 'Technique', value: sessions.filter(s => s.interviewType === 'technical').length, color: '#f59e0b' },
    { name: 'Complet', value: sessions.filter(s => s.interviewType === 'full').length, color: '#22c55e' }
  ].filter(t => t.value > 0);

  const scoresByType = [
    { type: 'RH', avg: sessions.filter(s => s.interviewType === 'hr').reduce((sum, s) => sum + (s.score || 0), 0) / (sessions.filter(s => s.interviewType === 'hr').length || 1) },
    { type: 'Technique', avg: sessions.filter(s => s.interviewType === 'technical').reduce((sum, s) => sum + (s.score || 0), 0) / (sessions.filter(s => s.interviewType === 'technical').length || 1) },
    { type: 'Complet', avg: sessions.filter(s => s.interviewType === 'full').reduce((sum, s) => sum + (s.score || 0), 0) / (sessions.filter(s => s.interviewType === 'full').length || 1) }
  ];

  const recentSessions = filteredSessions.slice(0, 3);
  const formatDate = (dateObj) => dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleStart = async () => {
    setShowRequired(true);
    let newErrors = {};
    if (!interviewType) newErrors.interviewType = "Le type d'entretien est requis";
    if (!mode) newErrors.mode = 'Veuillez choisir une méthode';
    if (interviewType !== 'hr' && !cvFile) newErrors.cv = 'Le CV est requis pour ce type d\'entretien';
    if (mode === 'manual' && !jobTitle) newErrors.jobTitle = 'Le titre du poste est requis';
    if (mode === 'paste' && !jobOfferText) newErrors.jobOffer = "L'offre d'emploi est requise";
    if (mode === 'upload' && !file) newErrors.file = 'Le fichier est requis';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoadingStart(true);
    try {
      let cvBase64 = null;
      let jobFileText = null;
      if (cvFile) cvBase64 = await readFileAsBase64(cvFile);
      if (file && mode === 'upload' && file.type === 'text/plain') {
        jobFileText = await file.text();
      }
      navigate('/interview', {
        state: {
          mode, jobTitle, jobDescription,
          jobOfferText: jobOfferText || jobFileText || '',
          interviewType, fileName: file?.name || null,
          cvName: cvFile?.name || null, cvBase64,
        },
      });
    } catch (e) { console.error(e); }
    finally { setLoadingStart(false); }
  };

  const interviewTypes = [
    { value: 'hr', label: 'Entretien RH', desc: 'Soft skills, motivation, parcours', icon: '🤝' },
    { value: 'technical', label: 'Entretien Technique', desc: 'Compétences métier spécifiques', icon: '💻' },
    { value: 'full', label: 'Entretien Complet', desc: 'RH + technique (10 questions)', icon: '🎯' },
  ];

  // Affichage pendant le chargement des statistiques (même structure)
  if (statsLoading) {
    return (
      <>
        <div className="dashboard-layout">
          <SideNav />
          <div className="dashboard">
            <div className="loading-spinner" />
            <p style={{ textAlign: 'center', marginTop: '20px' }}>Chargement des statistiques...</p>
          </div>
        </div>
        <Footer logoText="PrepAI" />
      </>
    );
  }

  return (
    <>
      <div className="dashboard-layout">
        <SideNav />
        <div className="dashboard">
          <div className="dashboard-header">
            <h1>Tableau de bord</h1>
            <p>Bonjour {user?.name || user?.email?.split('@')[0]} 👋</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon">🎯</div><div><h3>Total entretiens</h3><p className="stat-number">{total}</p></div></div>
            <div className="stat-card"><div className="stat-icon">📊</div><div><h3>Score moyen</h3><p className="stat-number">{avgScore}/100</p></div></div>
            <div className="stat-card"><div className="stat-icon">🏆</div><div><h3>Dernier score</h3><p className="stat-number" style={{ color: scoreColor(lastScore) }}>{lastScore ?? '—'}</p></div></div>
          </div>

          <div className="filters-bar">
            <div className="filter-group">
              <label>Type :</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">Tous</option>
                <option value="hr">RH</option>
                <option value="technical">Technique</option>
                <option value="full">Complet</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Période :</label>
              <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
                <option value="all">Tout</option>
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
                <option value="year">365 derniers jours</option>
              </select>
            </div>
          </div>

          <div className="charts-row">
            <div className="chart-card">
              <h3>📈 Évolution des scores (7 derniers jours)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#6c63ff" fill="#6c63ff" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3>🥧 Répartition par type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={typeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {typeDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="charts-row">
            <div className="chart-card">
              <h3>📊 Score moyen par type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoresByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#6c63ff" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3>📋 Derniers rapports</h3>
              {recentSessions.length === 0 ? <p className="empty-text">Aucun entretien récent</p> : (
                <div className="recent-list">
                  {recentSessions.map(s => (
                    <div key={s.id} className="recent-item" onClick={() => navigate('/report', { state: { sessionId: s.id } })}>
                      <div><strong>{s.jobTitle}</strong><span className="recent-date">{formatDate(s.dateObj)}</span></div>
                      <span className="recent-score" style={{ color: scoreColor(s.score) }}>{s.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="config-section">
            <h2>🚀 Nouvel entretien</h2>
            <h3 className="section-subtitle">1. Mode de description {errors.mode && <span className="error-text">{errors.mode}</span>}</h3>
            <div className="mode-selection">
              <div className={`mode-card ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>
                <img src={copyWritingImg} alt="manuel" style={{ width: "22px" }} />
                <strong>Saisie manuelle</strong><p>Titre + description</p>
              </div>
              <div className={`mode-card ${mode === 'paste' ? 'active' : ''}`} onClick={() => setMode('paste')}>
                <img src={pasteImg} alt="coller" style={{ width: "22px" }} />
                <strong>Coller l'offre</strong><p>Depuis LinkedIn, email, etc.</p>
              </div>
              <div className={`mode-card ${mode === 'upload' ? 'active' : ''}`} onClick={() => setMode('upload')}>
                📎 <strong>Uploader un fichier</strong><p>PDF / DOC / TXT</p>
              </div>
            </div>

            <h3 className="section-subtitle">2. Type d'entretien {errors.interviewType && <span className="error-text">{errors.interviewType}</span>}</h3>
            <div className="interview-type-grid">
              {interviewTypes.map(t => (
                <div key={t.value} className={`type-card ${interviewType === t.value ? 'active' : ''}`} onClick={() => setInterviewType(t.value)}>
                  <span className="type-icon">{t.icon}</span>
                  <div><strong>{t.label}</strong><p>{t.desc}</p></div>
                  <input type="radio" checked={interviewType === t.value} onChange={() => setInterviewType(t.value)} onClick={(e) => e.stopPropagation()} />
                </div>
              ))}
            </div>

            <div className="dashboard-card">
              <h3>📄 Votre CV {showRequired && interviewType !== 'hr' && <span style={{ color: 'red' }}>*</span>}{errors.cv && <span className="error-text">{errors.cv}</span>}</h3>
              <p className="info-text">Formats acceptés : PDF, DOC, DOCX</p>
              <label className="file-upload-label">
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCvFile(e.target.files[0])} style={{ display: 'none' }} />
                {cvFile ? <span className="file-selected">✅ {cvFile.name}</span> : <span className="file-placeholder">Cliquer pour choisir un fichier</span>}
              </label>
            </div>

            {mode === 'manual' && (
              <div className="dashboard-card">
                <h3>💼 Titre du poste {showRequired && <span style={{ color: 'red' }}>*</span>}{errors.jobTitle && <span className="error-text">{errors.jobTitle}</span>}</h3>
                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="ex: Ingénieur Logiciel Senior" />
              </div>
            )}
            {mode === 'paste' && (
              <div className="dashboard-card">
                <h3>📋 Offre d'emploi {showRequired && <span style={{ color: 'red' }}>*</span>}{errors.jobOffer && <span className="error-text">{errors.jobOffer}</span>}</h3>
                <textarea value={jobOfferText} onChange={(e) => setJobOfferText(e.target.value)} rows={6} />
              </div>
            )}
            {mode === 'upload' && (
              <div className="dashboard-card">
                <h3>📎 Fichier de l'offre {showRequired && <span style={{ color: 'red' }}>*</span>}{errors.file && <span className="error-text">{errors.file}</span>}</h3>
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFile(e.target.files[0])} />
              </div>
            )}

            <div className="dashboard-action">
              <button className="btn-primary btn-lg" onClick={handleStart} disabled={loadingStart}>
                {loadingStart ? '⏳ Préparation...' : '🚀 Démarrer l\'entretien'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer logoText="PrepAI" />
    </>
  );
}