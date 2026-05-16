// components/Footer.jsx
const Footer = ({ logoText = "PrepAI", copyrightText = "" }) => {
  return (
    <footer className="footer">
      <div className="navbar-logo">
        <span>⚡</span>{logoText}
      </div>
      <p>
        {copyrightText || `© ${new Date().getFullYear()} ${logoText}. Tous droits réservés.`}
      </p>
    </footer>
  );
};

export default Footer;