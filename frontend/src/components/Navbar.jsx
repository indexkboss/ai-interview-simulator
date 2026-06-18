import { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import Logo from './logo';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

    if (loading) {
    return <nav className="navbar"></nav>;  // Navbar vide mais présent
  }

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div 
        className="navbar-logo" 
        onClick={() => {
          navigate(user ? "/dashboard" : "/");
          setMenuOpen(false);
        }}
        style={{ cursor: "pointer" }}
      >
        <Logo />
      </div>

      <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>

      <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        {user && <li><NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>Tableau de bord</NavLink></li>}
        {!user && <li><NavLink to="/" onClick={() => setMenuOpen(false)}>Accueil</NavLink></li>}
        {user && <li><NavLink to="/home" onClick={() => setMenuOpen(false)}>Home</NavLink></li>}
        {/* {user && <li><NavLink to="/report" onClick={() => setMenuOpen(false)}>Rapport</NavLink></li>} */}
        {user && <li><NavLink to="/history" onClick={() => setMenuOpen(false)}>Historique</NavLink></li>}
        <li><NavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact</NavLink></li>
      </ul>

      <div className="navbar-actions">
        {user ? (
          <div className="user-menu" ref={dropdownRef}>
            <button className="user-avatar" onClick={() => setDropdownOpen(!dropdownOpen)}>
              {user.name?.charAt(0).toUpperCase()}
            </button>
            {dropdownOpen && (
              <div className="user-dropdown show">
                <button onClick={() => navigate('/profile')}>Mon profil</button>
                <button onClick={handleLogout}>Déconnexion</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button className="btn-ghost" onClick={() => navigate('/login')}>Connexion</button>
            <button className="btn-primary" onClick={() => navigate('/signup')}>Commencer</button>
          </>
        )}
      </div>
    </nav>
  );
}