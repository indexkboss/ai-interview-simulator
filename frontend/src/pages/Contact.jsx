import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "@formspree/react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer"; // ← import du footer réutilisable
import "./Contact.css";
import githubIcon from "../assets/github.png";

const Contact = () => {
  const navigate = useNavigate();
  
  console.log("Variable d'environnement :", import.meta.env.VITE_FORMSPREE_ID);
  const formspreeId = import.meta.env.VITE_FORMSPREE_ID;
  const [state, handleSubmit] = useForm(formspreeId);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [submitStatus, setSubmitStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    if (!formspreeId) {
      console.error("L'identifiant Formspree est manquant ! Vérifiez votre fichier .env.");
      setConfigError(true);
      setErrorMessage("Erreur de configuration du formulaire. Veuillez réessayer plus tard.");
    } else {
      console.log("Identifiant Formspree chargé avec succès :", formspreeId);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    setSubmitStatus(null);
    setErrorMessage("");

    if (!formData.name.trim()) {
      setErrorMessage("Veuillez entrer votre nom.");
      setSubmitStatus("error");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setErrorMessage("Veuillez entrer une adresse email valide.");
      setSubmitStatus("error");
      return;
    }

    if (formData.message.trim().length < 10) {
      setErrorMessage("Le message doit contenir au moins 10 caractères.");
      setSubmitStatus("error");
      return;
    }

    try {
      await handleSubmit(e);
    } catch (error) {
      console.error("Erreur lors de l'envoi :", error);
      setErrorMessage("Échec de l'envoi du message. Veuillez réessayer.");
      setSubmitStatus("error");
    }
  };

  useEffect(() => {
    if (state.succeeded) {
      setSubmitStatus("success");
      setFormData({
        name: "",
        email: "",
        message: "",
      });
    }
    
    if (state.errors) {
      console.error("Erreurs Formspree :", state.errors);
      
      let message = "Une erreur est survenue lors de l'envoi de votre message.";
      
      if (state.errors.response?.data?.error) {
        message = state.errors.response.data.error;
      } else if (state.errors.getFormErrors) {
        const formErrors = state.errors.getFormErrors();
        if (formErrors.length > 0) {
          message = formErrors[0].message;
        }
      }
      
      setErrorMessage(message);
      setSubmitStatus("error");
    }
  }, [state.succeeded, state.errors]);

  useEffect(() => {
    if (submitStatus) {
      const timer = setTimeout(() => {
        setSubmitStatus(null);
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [submitStatus]);

  const scrollToSection = (sectionId) => {
    if (window.location.pathname !== '/') {
      navigate("/", { state: { sectionId } });
      return;
    }
    
    const element = document.getElementById(sectionId);
    if (element) {
      const navbarHeight = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Icônes pour les deux personnes
  const contactIcons = [
    // === Khadija ===
    {
      person: "Khadija",
      label: "GitHub (Khadija)",
      url: "https://github.com/indexkboss",
      icon: <img src={githubIcon} alt="GitHub" style={{ width: "24px", height: "24px" }} />
    },
    {
      person: "Khadija",
      label: "LinkedIn (Khadija)",
      url: "https://www.linkedin.com/in/khadijabossony",
      icon: <span style={{ fontSize: "24px" }}>🔗</span>,
    },
    {
      person: "Khadija",
      label: "Email (Khadija)",
      url: "mailto:bossonykhadijae@gmail.com",
      icon: <span style={{ fontSize: "24px" }}>📧</span>,
    },
    {
      person: "Khadija",
      label: "Téléphone (Khadija)",
      onClick: () => (window.location.href = "tel:+212679101440"),
      icon: <span style={{ fontSize: "24px" }}>📞</span>,
    },
    // === Kenza ===
    {
      person: "Kenza",
      label: "GitHub (Kenza)",
      url: "https://github.com/TAZIKenza",
      icon: <img src={githubIcon} alt="GitHub" style={{ width: "24px", height: "24px" }} />
    },
    {
      person: "Kenza",
      label: "LinkedIn (Kenza)",
      url: "https://www.linkedin.com/in/kenzatazi04/",
      icon: <span style={{ fontSize: "24px" }}>🔗</span>,
    },
    {
      person: "Kenza",
      label: "Email (Kenza)",
      url: "mailto:kenzatazi91@gmail.com",
      icon: <span style={{ fontSize: "24px" }}>📧</span>,
    },
    {
      person: "Kenza",
      label: "Téléphone (Kenza)",
      onClick: () => (window.location.href = "tel:+212626662536"),
      icon: <span style={{ fontSize: "24px" }}>📞</span>,
    },
  ];

  if (configError) {
    return (
      <div className="contact-page-new">
        <div style={{ 
          textAlign: 'center', 
          padding: '50px 20px',
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h2 style={{ color: '#ff6b6b', marginBottom: '20px' }}>
            Formulaire de contact temporairement indisponible
          </h2>
          <p style={{ marginBottom: '30px', fontSize: '1.1rem' }}>
            Veuillez nous écrire directement à :
          </p>
          <a 
            href="mailto:bossonykhadijae@gmail.com"
            style={{
              display: 'inline-block',
              padding: '12px 30px',
              background: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '25px',
              fontSize: '1.1rem',
              transition: 'all 0.3s ease'
            }}
          >
            bossonykhadijae@gmail.com
          </a>
        </div>
        <Footer logoText="PrepAI" /> {/* Utilisation du Footer réutilisable */}
      </div>
    );
  }

  return (
    <div className="contact-page-new">

      <motion.div
        className="contact-header-new"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>Contactez-nous</h1>
        <p>Une question ? Nous serions ravis d'avoir de vos nouvelles !</p>
      </motion.div>

      <motion.div
        className="split-card-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="split-card">
          <div className="split-card-left">
            <h3>Connectez-vous avec nous</h3>
            <p>Retrouvez-nous sur les réseaux sociaux ou contactez-nous directement</p>

            <div style={{ marginBottom: "24px" }}>
              <h4 style={{ color: "#0f172a", marginBottom: "12px" }}>Khadija BOSSONY</h4>
              <div className="icons-grid">
                {contactIcons.filter(i => i.person === "Khadija").map((item, index) =>
                  item.url ? (
                    <motion.a
                      key={index}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="icon-item"
                      whileHover={{ y: -3, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="icon-circle">{item.icon}</div>
                      <span className="icon-label">{item.label.replace(" (Khadija)", "")}</span>
                    </motion.a>
                  ) : (
                    <motion.button
                      key={index}
                      onClick={item.onClick}
                      className="icon-item"
                      whileHover={{ y: -3, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="icon-circle">{item.icon}</div>
                      <span className="icon-label">{item.label.replace(" (Khadija)", "")}</span>
                    </motion.button>
                  )
                )}
              </div>
            </div>

            <div>
              <h4 style={{ color: "#0f172a", marginBottom: "12px" }}>Kenza TAZI</h4>
              <div className="icons-grid">
                {contactIcons.filter(i => i.person === "Kenza").map((item, index) =>
                  item.url ? (
                    <motion.a
                      key={index}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="icon-item"
                      whileHover={{ y: -3, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="icon-circle">{item.icon}</div>
                      <span className="icon-label">{item.label.replace(" (Kenza)", "")}</span>
                    </motion.a>
                  ) : (
                    <motion.button
                      key={index}
                      onClick={item.onClick}
                      className="icon-item"
                      whileHover={{ y: -3, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="icon-circle">{item.icon}</div>
                      <span className="icon-label">{item.label.replace(" (Kenza)", "")}</span>
                    </motion.button>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="split-card-right">
            <h3>Envoyez-nous un message</h3>
            <p>Nous vous répondrons dans les 24 heures</p>

            <form onSubmit={onSubmit} className="split-form">
              <div className="split-form-group">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder=" "
                />
                <label htmlFor="name">Votre nom</label>
              </div>

              <div className="split-form-group">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder=" "
                />
                <label htmlFor="email">Adresse email</label>
              </div>

              <div className="split-form-group">
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder=" "
                  rows="3"
                />
                <label htmlFor="message">Votre message</label>
              </div>

              <input type="hidden" name="_replyto" value={formData.email} />
              <input type="hidden" name="_subject" value={`Nouveau message de ${formData.name}`} />

              <motion.button
                type="submit"
                className="split-submit-btn"
                disabled={state.submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {state.submitting ? (
                  <span className="sending">Envoi en cours...</span>
                ) : (
                  <>Envoyer le message</>
                )}
              </motion.button>

              {submitStatus === "success" && (
                <motion.div
                  className="success-message-split"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span style={{ fontSize: "18px", marginRight: "8px" }}>✅</span>
                  <span className="span-message-succ">
                    Message envoyé avec succès ! Nous vous répondrons très bientôt.
                  </span>
                </motion.div>
              )}

              {submitStatus === "error" && (
                <motion.div
                  className="error-message-split"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span style={{ fontSize: "18px", marginRight: "8px" }}>⚠️</span>
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </form>
          </div>
        </div>
      </motion.div>

      <Footer logoText="PrepAI" /> {/* Footer réutilisable */}
    </div>
  );
};

export default Contact;