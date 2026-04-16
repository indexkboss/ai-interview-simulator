import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 40 }}>
      <h1>AI Interview Simulator</h1>

      <p>
        Practice real job interviews with AI feedback, voice analysis and video review.
      </p>

      <button onClick={() => navigate("/signup")}>
        Get Started
      </button>

      <button onClick={() => navigate("/login")}>
        Login
      </button>
    </div>
  );
}