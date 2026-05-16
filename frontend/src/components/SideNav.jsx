import { useEffect, useState } from "react";
import "./SideNav.css";

const allTips = [
  "💡 Prépare 3 exemples concrets avant l'entretien",
  "🧠 Utilise la méthode STAR pour répondre",
  "⏱️ Garde tes réponses entre 1 et 2 minutes",
  "👀 Maintiens un bon contact visuel",
  "🎯 Renseigne-toi sur l'entreprise avant l'entretien",
  "🗣️ Parle clairement et lentement",
  "❌ Évite les réponses trop longues",
  "💪 Montre ta motivation dès le début",
  "📊 Prépare des chiffres pour prouver tes résultats",
  "🤝 Sois authentique, pas robotique",
  "🔁 Entraîne-toi à voix haute",
  "🧩 Prépare des questions à poser à la fin"
];

function getRandomFour(arr) {
  const copy = [...arr];
  const result = [];

  while (result.length < 4 && copy.length > 0) {
    const index = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(index, 1)[0]);
  }

  return result;
}

export default function SideNav() {
  const [tips, setTips] = useState([]);

  useEffect(() => {
    setTips(getRandomFour(allTips)); // 🔥 change uniquement au mount
  }, []);

  return (
    <aside className="sidenav">
      <div className="sidenav-header">
        <h3>💡 Interview Tips</h3>
        <p>Conseils pour réussir</p>
      </div>

      <div className="sidenav-content">
        {tips.map((tip, i) => (
          <div key={i} className="tip-card">
            {tip}
          </div>
        ))}
      </div>
    </aside>
  );
}