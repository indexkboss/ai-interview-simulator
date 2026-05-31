// components/Footer.jsx

import "./Footer.css";   // ← import du CSS

const Footer = ({ logoText = "PrepAI", copyrightText = "" }) => {
  return (
    <footer className="footer">
      <div className="navbar-logo">
        {logoText}
      </div>
      <p>
        {copyrightText || `© ${new Date().getFullYear()} ${logoText}. Tous droits réservés.`}
      </p>
    </footer>
  );
};

export default Footer;