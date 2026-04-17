import { useEffect, useState } from 'react';
import './Navbar.css';
import Logo from '../components/logo'; 
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      
      <Link to="/" className="navbar-logo">
        <Logo />
      </Link>

      <ul className="navbar-links">
        <li>Solutions</li>
        <li>Resources</li>
        <li>Looking for a job?</li>
        <li>Contact</li>
      </ul>

      <div className="navbar-actions">
        <button className="btn btn-ghost" onClick={() => navigate('/login')}>
          Log in
        </button>

        <button className="btn btn-primary" onClick={() => navigate('/signup')}>
          Get started
        </button>
      </div>

    </nav>
  );
}