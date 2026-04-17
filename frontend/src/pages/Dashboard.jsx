import { useState } from 'react';
import './Dashboard.css';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const [mode, setMode] = useState(null); 
  // 'manual' | 'paste' | 'upload'

  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobOfferText, setJobOfferText] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [file, setFile] = useState(null);
  const [cvFile, setCvFile] = useState(null);

  const [submitted, setSubmitted] = useState(false);

  const [errors, setErrors] = useState({});

 const handleStart = () => {
  setSubmitted(true); // 👈 ADD THIS

  let newErrors = {};

  if (!interviewType) {
    newErrors.interviewType = 'Interview type is required';
  }

  if (!mode) {
    newErrors.mode = 'Please select a method';
  }

  if (interviewType !== 'hr' && !cvFile) {
    newErrors.cv = 'CV is required for this interview';
  }

  if (mode === 'manual') {
    if (!jobTitle) {
      newErrors.jobTitle = 'Job title is required';
    }
  }

  if (mode === 'paste') {
    if (!jobOfferText) {
      newErrors.jobOffer = 'Job offer is required';
    }
  }

  if (mode === 'upload') {
    if (!file) {
      newErrors.file = 'File is required';
    }
  }

  setErrors(newErrors);

  if (Object.keys(newErrors).length > 0) return;

  navigate('/interview-room', {
    state: {
      mode,
      jobTitle,
      jobDescription,
      jobOfferText,
      interviewType,
      fileName: file?.name || null,
      cvName: cvFile?.name || null,
    },
  });
};

  return (
    <>
      <Navbar />

      <div className="dashboard">

        {/* HEADER */}
        <div className="dashboard-header">
          <h1>Interview Hub</h1>
          <p>Choose how you want to prepare your interview</p>
        </div>

        {/* MODE SELECTION */}
        <div className="mode-selection">

          <div
            className={`mode-card ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            ✍️ Manual Input
            <p>Job title + description</p>
          </div>

          <div
            className={`mode-card ${mode === 'paste' ? 'active' : ''}`}
            onClick={() => setMode('paste')}
          >
            📋 Paste Job Offer
            <p>From LinkedIn, email, etc.</p>
          </div>

          <div
            className={`mode-card ${mode === 'upload' ? 'active' : ''}`}
            onClick={() => setMode('upload')}
          >
            📄 Upload File
            <p>PDF / DOC / TXT</p>
          </div>

        </div>
{errors.mode && (
  <p className="error" style={{ textAlign: 'center', marginTop: 10 }}>
    {errors.mode}
  </p>
)}
{submitted && !mode && (
  <p className="info-text">
    choose how you want to start:
    specific job offer (paste or upload)
    <br/>Or generate an interview from a job title
  </p>
)}
        {/* GRID */}
        <div className="dashboard-grid">

          {/* INTERVIEW TYPE */}
          <div className="dashboard-card">
            <h3>🎙️ Interview Type</h3>

            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="hr"
                  checked={interviewType === 'hr'}
                  onChange={(e) => setInterviewType(e.target.value)}
                />
                HR Interview
              </label>

              <label>
                <input
                  type="radio"
                  value="technical"
                  checked={interviewType === 'technical'}
                  onChange={(e) => setInterviewType(e.target.value)}
                />
                Technical Interview
              </label>

              <label>
                <input
                  type="radio"
                  value="full"
                  checked={interviewType === 'full'}
                  onChange={(e) => setInterviewType(e.target.value)}
                />
                Full Interview
              </label>
            </div>
            {errors.interviewType && (
  <p className="error">{errors.interviewType}</p>
)}
          </div>

<div className="dashboard-card">
<h3>
  📄 Upload CV{' '}
  {interviewType !== 'hr' && (
    <span style={{ color: 'red' }}>*</span>
  )}
</h3>  <input
    type="file"
    accept=".pdf,.doc,.docx"
    onChange={(e) => setCvFile(e.target.files[0])}
  />
  {cvFile && <p>Selected: {cvFile.name}</p>}
  {errors.cv && <p className="error" style={{ color: 'red' }}>{errors.cv}</p>}
</div>

          {/* MANUAL MODE */}
          {mode === 'manual' && (
            <>
              <div className="dashboard-card">
                <h3>🎯 Job Title <span className="required" style={{ color: 'red' }}>*</span></h3>
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}

                  placeholder="e.g. Software Engineer"
                />
              </div>

              <div className="dashboard-card">
                <h3>💼 Job Description</h3>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste job description..."
                />
              </div>
            </>
          )}

          {/* PASTE MODE */}
          {mode === 'paste' && (
            <div className="dashboard-card">
              <h3>📋 Paste Job Offer<span className="required" style={{ color: 'red' }}>*</span></h3>
              <textarea
                value={jobOfferText}
                onChange={(e) => setJobOfferText(e.target.value)}
                placeholder="Paste LinkedIn job offer, email, etc..."
              />
            </div>
          )}

          {/* UPLOAD MODE */}
          {mode === 'upload' && (
            <div className="dashboard-card">
              <h3>📄 Upload File<span className="required" style={{ color: 'red' }}>*</span></h3>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setFile(e.target.files[0])}
              />
              {file && <p>Selected: {file.name}</p>}
            </div>
          )}

        </div>

        {/* CTA */}
        <div className="dashboard-action">
          <button className="btn btn-primary btn-lg" onClick={handleStart}>
            🚀 Start Interview
          </button>
        </div>

      </div>
    </>
  );
}