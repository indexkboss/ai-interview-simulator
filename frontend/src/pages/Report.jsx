import { useLocation } from "react-router-dom";

export default function Report() {
  const location = useLocation();
  const { score, happyCount, neutralCount, negativeCount } = location.state || {};

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>📊 Interview Report</h2>

      <p>Score: {score}%</p>
      <p>Happy: {happyCount}</p>
      <p>Neutral: {neutralCount}</p>
      <p>Negative: {negativeCount}</p>
    </div>
  );
}