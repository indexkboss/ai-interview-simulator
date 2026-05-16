import { useEffect, useState } from 'react';
import './Navbar.css';
import Logo from '../components/logo'; 
import { Link, useNavigate } from 'react-router-dom';

export default function NavbarConnected() {
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
      
        <Logo />
   

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
  <li><Link to="/solutions">Rapports</Link></li>
  <li><Link to="/scores">Settings</Link></li>
  <li><Link to="/contact">Contact</Link></li>
  <li><Link to="/mode">Review</Link></li> {/* user peut laisser un commentaire*/}
  <li></li>
</ul>


    </nav>
  );
}