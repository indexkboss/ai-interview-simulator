import { useState } from 'react';
import './Dashboard.css';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import copyWritingImg from "../assets/copy-writing.png";
import pasteImg from "../assets/paste.png";
import SideNav from '../components/SideNav';
import Footer from '../components/Footer';

// Read file as base64
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Dashboard() {
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
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      let cvBase64 = null;
      let jobFileText = null;

      if (cvFile) cvBase64 = await readFileAsBase64(cvFile);
      if (file && mode === 'upload') {
        if (file.type === 'text/plain') {
          jobFileText = await file.text();
        }
      }

      navigate('/interview', {
        state: {
          mode,
          jobTitle,
          jobDescription,
          jobOfferText: jobOfferText || jobFileText || '',
          interviewType,
          fileName: file?.name || null,
          cvName: cvFile?.name || null,
          cvBase64,
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const interviewTypes = [
    { value: 'hr', label: 'Entretien RH', desc: 'Soft skills, motivation, parcours', icon: '🤝' },
    { value: 'technical', label: 'Entretien Technique', desc: 'Compétences métier spécifiques', icon: '💻' },
    { value: 'full', label: 'Entretien Complet', desc: 'RH + technique (10 questions)', icon: '🎯' },
  ];

  return (
    <>
<div className="dashboard-layout">
  
  <SideNav />
      <div className="dashboard">

        {/* HEADER */}
        <div className="dashboard-header">
          <h1>Interview Hub</h1>
          <p>
            Préparez votre entretien en quelques étapes
          </p>
        </div>

        {/* MODE */}
        <h3 className="section-subtitle">
          1. Comment voulez-vous décrire le poste ?
          {showRequired && <span style={{ color: 'red' }}> *</span>}
          {errors.mode && <span style={{ color: 'red',textAlign: 'center', marginTop: 10 , fontSize: 10}}> {errors.mode}</span>}
        </h3>

        <div className="mode-selection">
          <div className={`mode-card ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>
            <img src={copyWritingImg} alt="a" style={{ width: "22px", height: "20px" }} />
            <strong>Saisie manuelle</strong>
            <p>Titre + description du poste</p>
          </div>

          <div className={`mode-card ${mode === 'paste' ? 'active' : ''}`} onClick={() => setMode('paste')}>
            <img src={pasteImg} alt="b" style={{ width: "22px", height: "20px" }} />
            <strong>Coller l'offre</strong>
            <p>Depuis LinkedIn, email, etc.</p>
          </div>

          <div className={`mode-card ${mode === 'upload' ? 'active' : ''}`} onClick={() => setMode('upload')}>
            📎 <strong>Uploader un fichier</strong>
            <p>PDF / DOC / TXT</p>
          </div>
        </div>

        {/* INTERVIEW TYPE */}
        <h3 className="section-subtitle">
          2. Type d'entretien
          {showRequired && <span style={{ color: 'red' }}> *</span>}
          {errors.interviewType && <span style={{ color: 'red', marginLeft: 6 , fontSize: 10}}> {errors.interviewType}</span>}
        </h3>

        <div className="interview-type-grid">
          {interviewTypes.map(({ value, label, desc, icon }) => (
            <div
              key={value}
              className={`type-card ${interviewType === value ? 'active' : ''}`}
              onClick={() => setInterviewType(value)}
            >
              <span className="type-icon">{icon}</span>
              <div>
                <strong>{label}</strong>
                <p>{desc}</p>
              </div>
              <input
                type="radio"
                checked={interviewType === value}
                onChange={() => setInterviewType(value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ))}
        </div>

        {/* CV */}
        <div className="dashboard-card">
          <h3>
            📄 Votre CV
            {showRequired && interviewType !== 'hr' && (
              <span style={{ color: 'red' }}> *</span>
            )}
            {errors.cv && (
              <span style={{ color: 'red', marginLeft: 6 , fontSize: 10}}>
                {errors.cv}
              </span>
            )}
          </h3>

          <p className="info-text">Formats acceptés : PDF, DOC, DOCX</p>

          <label className="file-upload-label">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCvFile(e.target.files[0])}
              style={{ display: 'none' }}
            />

            {cvFile ? (
              <span className="file-selected">✅ {cvFile.name}</span>
            ) : (
              <span className="file-placeholder">Cliquer pour choisir un fichier</span>
            )}
          </label>
        </div>

        {/* JOB INPUT */}
        {mode === 'manual' && (
          <div className="dashboard-card">
            <h3>
              💼 Titre du poste
              {showRequired && <span style={{ color: 'red' }}> *</span>}
              {errors.jobTitle && (
                <span style={{ color: 'red', marginLeft: 6 , fontSize: 10}}>
                  {errors.jobTitle}
                </span>
              )}
            </h3>

            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="ex: Ingénieur Logiciel Senior"
            />
          </div>
        )}

        {mode === 'paste' && (
          <div className="dashboard-card">
            <h3>
              📋 Coller l'offre d'emploi
              {showRequired && <span style={{ color: 'red' }}> *</span>}
              {errors.jobOffer && (
                <span style={{ color: 'red', marginLeft: 6 , fontSize: 10}}>
                  {errors.jobOffer}
                </span>
              )}
            </h3>

            <textarea
              value={jobOfferText}
              onChange={(e) => setJobOfferText(e.target.value)}
              rows={6}
            />
          </div>
        )}

        {mode === 'upload' && (
          <div className="dashboard-card">
            <h3>
              📎 Fichier de l'offre
              {showRequired && <span style={{ color: 'red' }}> *</span>}
              {errors.file && (
                <span style={{ color: 'red', marginLeft: 6 , fontSize: 10}}>
                  {errors.file}
                </span>
              )}
            </h3>

            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
        )}

        {/* CTA */}
        <div className="dashboard-action">
          <button
            className="btn btn-primary btn-lg"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? '⏳ Préparation...' : '🚀 Démarrer l\'entretien'}
          </button>
        </div>

      </div>
      </div>
<Footer logoText="PrepAI" />
    </>
  );
}