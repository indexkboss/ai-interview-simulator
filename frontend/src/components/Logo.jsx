// src/components/Logo.jsx
import logo from '../assets/logo.png';
import './Logo.css';

export default function Logo() {
  return (
    <div className="logo-wrapper">
      <img src={logo} alt="PrepAI" className="logo-img" />
    </div>
  );
}