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

      {/* <ul className="navbar-links">
          <li></li>
        <li></li>
        <li>Solutions</li>
        <li>scores</li>
        
        <li>Contact</li>
        <li>mode</li>
        <li></li>

        <li></li>
      </ul> */}

      <ul className="navbar-links">
        <li></li>
  <li><Link to="/">Home</Link></li>
  <li><Link to="/solutions">Solutions</Link></li>
  <li><Link to="/scores">Scores</Link></li>
  <li><Link to="/contact">Contact</Link></li>
  <li><Link to="/mode">Mode</Link></li>
  <li></li>
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