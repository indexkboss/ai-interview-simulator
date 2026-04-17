import { useState } from 'react';
import './Dashboard.css';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';



export default function Dashboard() {
  const [mode, setMode] = useState('manual'); // manual | upload
  const [jobTitle, setJobTitle] = useState('');
  const [interviewType, setInterviewType] = useState('hr');

  return (
    <>
  <Navbar />
    <div className="dashboard">
      
      {/* Header */}
      <div className="dashboard-header">
        <h1>Interview Hub</h1>
        <p>Prepare smarter with AI-powered interviews</p>
      </div>

      {/* MODE SWITCH (no CSS break) */}
      <div className="mode-switch">
        <button
          className={mode === 'manual' ? 'active' : ''}
          onClick={() => setMode('manual')}
        >
          ✍️ Enter Job Details
        </button>

        <button
          className={mode === 'upload' ? 'active' : ''}
          onClick={() => setMode('upload')}
        >
          📄 Upload Job Offer
        </button>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">

        {/* 🎯 Job Title (ONLY manual) */}
        {mode === 'manual' && (
          <div className="dashboard-card">
            <h3>🎯 Job Target</h3>
            <input
              type="text"
              placeholder="e.g. Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
        )}

        {/* 🎙️ Interview Type (ALWAYS visible) */}
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
        </div>

        {/* 📄 Upload CV (ALWAYS visible) */}
        <div className="dashboard-card">
          <h3>📄 Upload CV</h3>
          <input type="file" accept=".pdf,.doc,.docx" />
        </div>

        {/* 💼 Job Description (manual) */}
        {mode === 'manual' && (
          <div className="dashboard-card">
            <h3>💼 Job Description</h3>
            <textarea placeholder="Paste job description here..." />
          </div>
        )}

        {/* 📄 Job Offer Upload (upload mode) */}
        {mode === 'upload' && (
          <div className="dashboard-card">
            <h3>📄 Upload Job Offer</h3>
            <input type="file" accept=".pdf,.doc,.docx" />
          </div>
        )}

      </div>

      {/* CTA */}
      <div className="dashboard-action">
        <button className="btn btn-primary btn-lg">
          🚀 Start Interview
        </button>
      </div>

    </div>
    </>
  );
}