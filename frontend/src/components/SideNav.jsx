import { useEffect, useState } from "react";
import "./SideNav.css";

const allTips = [
  { icon: "ti-brain", color: "purple", title: "Méthode STAR", sub: "Situation · Tâche · Action · Résultat" },
  { icon: "ti-clock", color: "green", title: "Durée des réponses", sub: "Vise entre 1 et 2 minutes" },
  { icon: "ti-eye", color: "amber", title: "Contact visuel", sub: "Regarde la caméra, pas l'écran" },
  { icon: "ti-chart-bar", color: "pink", title: "Chiffres concrets", sub: "Prouve tes résultats avec des données" },
  { icon: "ti-building", color: "blue", title: "Connais l'entreprise", sub: "Renseigne-toi avant l'entretien" },
  { icon: "ti-list-check", color: "teal", title: "3 exemples prêts", sub: "Un par compétence clé du poste" },
  { icon: "ti-microphone", color: "coral", title: "Parle clairement", sub: "Lentement, articule bien" },
  { icon: "ti-heart-handshake", color: "purple", title: "Sois authentique", sub: "Pas robotique, montre ta personnalité" },
  { icon: "ti-repeat", color: "green", title: "Entraîne-toi", sub: "Répète à voix haute avant le jour J" },
  { icon: "ti-question-mark", color: "amber", title: "Prépare tes questions", sub: "À poser au recruteur en fin d'entretien" },
  { icon: "ti-rocket", color: "blue", title: "Montre ta motivation", sub: "Dès les premières minutes" },
  { icon: "ti-scissors", color: "pink", title: "Sois concis", sub: "Évite les réponses trop longues" },
];

const colorMap = {
  purple: { bg: "#EEEDFE", icon: "#3C3489" },
  blue:   { bg: "#E6F1FB", icon: "#185FA5" },
  green:  { bg: "#EAF3DE", icon: "#3B6D11" },
  amber:  { bg: "#FAEEDA", icon: "#854F0B" },
  pink:   { bg: "#FBEAF0", icon: "#993556" },
  teal:   { bg: "#E1F5EE", icon: "#0F6E56" },
  coral:  { bg: "#FAECE7", icon: "#993C1D" },
};

function getRandomFour(arr) {
  const copy = [...arr];
  const result = [];
  while (result.length < 4 && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

export default function SideNav() {
  const [tips, setTips] = useState([]);

  useEffect(() => {
    setTips(getRandomFour(allTips));
  }, []);

  return (
    <aside className="sidenav">
      <div className="sidenav-header">
        <div className="sidenav-header-icon">
          <i className="ti ti-bulb" aria-hidden="true" />
        </div>
        <div>
          <h3>Interview tips</h3>
          <p>4 conseils pour aujourd'hui</p>
        </div>
      </div>

      <div className="sidenav-content">
        {tips.map((tip, i) => {
          const c = colorMap[tip.color] || colorMap.purple;
          return (
            <div key={i} className="tip-card">
              <div className="tip-icon" style={{ background: c.bg }}>
                <i className={`ti ${tip.icon}`} style={{ color: c.icon }} aria-hidden="true" />
              </div>
              <div className="tip-text">
                <span className="tip-title">{tip.title}</span>
                <span className="tip-sub">{tip.sub}</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}