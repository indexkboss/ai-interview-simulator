import { useNavigate } from 'react-router-dom';
import './Landing.css';

const features = [
  {
    icon: '🎙️',
    title: 'Realistic AI Interviews',
    desc: 'Practice with an AI that asks real interview questions tailored to your role and seniority level.',
  },
  {
    icon: '📊',
    title: 'Instant Feedback',
    desc: 'Get detailed analysis on your answers — clarity, structure, confidence, and technical accuracy.',
  },
  {
    icon: '🎯',
    title: 'Role-Specific Prep',
    desc: 'From SWE to Product to Data — we cover hundreds of job roles with curated question banks.',
  },
  {
    icon: '🔁',
    title: 'Unlimited Practice',
    desc: 'Run as many sessions as you need. Every interview is unique, so you\'re never repeating the same questions.',
  },
];

const roles = ['Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer', 'DevOps Engineer', 'Marketing Lead'];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <span>⚡</span>PrepAI
        </div>
        <div className="navbar-links">
          <button className="btn btn-ghost" onClick={() => navigate('/login')}>Log in</button>
          <button className="btn btn-primary" onClick={() => navigate('/signup')}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <span className="badge-dot" />
          AI-Powered Interview Training
        </div>
        <h1 className="hero-title">
          Ace your next<br />
          <span className="hero-highlight">interview</span> with AI
        </h1>
        <p className="hero-sub">
          Practice with a realistic AI interviewer. Get instant, actionable feedback.<br />
          Land the job you actually want.
        </p>
        <div className="hero-cta">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>
            Start practicing free →
          </button>
          <button className="btn btn-outline btn-lg" onClick={() => navigate('/login')}>
            Sign in
          </button>
        </div>

        <div className="hero-roles">
          {roles.map(r => (
            <span key={r} className="role-chip">{r}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="section-label">Why PrepAI</div>
        <h2 className="section-title">Everything you need to prepare</h2>
        <div className="features-grid">
          {features.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner">
        <h2>Ready to land your dream job?</h2>
        <p>Join thousands of candidates who improved their interview skills with PrepAI.</p>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>
          Create free account
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="navbar-logo">
          <span>⚡</span>PrepAI
        </div>
        <p>© {new Date().getFullYear()} PrepAI. All rights reserved.</p>
      </footer>
    </div>
  );
}