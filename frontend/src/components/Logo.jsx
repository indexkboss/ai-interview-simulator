import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import './Logo.css';

export default function Logo() {
  return (
    <div className="logo-wrapper">
      <Link to="/" className="logo">
        <img src={logo} alt="PrepAI" className="logo-img" />
      </Link>
    </div>
  );
}