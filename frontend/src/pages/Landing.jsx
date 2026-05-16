import { useNavigate } from 'react-router-dom';
import './Landing.css';
import Navbar from '../components/Navbar';
import Logo from '../components/logo';
import Footer from "../components/Footer";


const features = [
  {
    icon: '🎙️',
    title: 'Entretiens IA réalistes',
    desc: 'Entraînez-vous avec une IA qui pose de vraies questions d’entretien adaptées à votre rôle et à votre niveau d’expérience.',
  },
  {
    icon: '📊',
    title: 'Retour instantané',
    desc: 'Obtenez une analyse détaillée de vos réponses — clarté, structure, confiance et précision technique.',
  },
  {
    icon: '🎯',
    title: 'Préparation par rôle',
    desc: 'Du développement au produit en passant par les données — nous couvrons des centaines de rôles avec des banques de questions soigneusement sélectionnées.',
  },
  {
    icon: '🔁',
    title: 'Pratique illimitée',
    desc: 'Effectuez autant de sessions que nécessaire. Chaque entretien est unique, vous ne répéterez jamais les mêmes questions.',
  },
];

const roles = [
  'Ingénieur logiciel',
  'Chef de produit',
  'Data Scientist',
  'Designer UX',
  'Ingénieur DevOps',
  'Responsable marketing',
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <span className="badge-dot" />
          Formation aux entretiens par IA
        </div>
        <h1 className="hero-title">
          Réussissez votre<br />
          <span className="hero-highlight">entretien</span> avec l’IA
        </h1>
        <p className="hero-sub">
          Entraînez-vous avec un interviewer IA réaliste. Obtenez des retours immédiats et exploitables.<br />
          Décrochez le poste que vous méritez.
        </p>
        <div className="hero-cta">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>
            Commencer à s’entraîner gratuitement →
          </button>
          <button className="btn btn-outline btn-lg" onClick={() => navigate('/login')}>
            Se connecter
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
        <div className="section-label">Pourquoi PrepAI</div>
        <h2 className="section-title">Tout ce qu’il vous faut pour vous préparer</h2>
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
        <h2>Prêt à décrocher le job de vos rêves ?</h2>
        <p>Rejoignez des milliers de candidats qui ont amélioré leurs compétences en entretien avec PrepAI.</p>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>
          Créer un compte gratuit
        </button>
      </section>
<Footer logoText="PrepAI" />
    </div>
  );
}