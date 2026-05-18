import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth'; // ← import du hook
import './index.css';
import './App.css';
import './pages/Auth.css';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Interview from './pages/Interview';
import Report from './pages/Report';
import Contact from './pages/Contact';
import Navbar from './components/Navbar';
import Profile from './pages/Profile';
import History from './pages/History';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';

//redirection pour la racine
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null; // ou un loader
  return user ? <Navigate to="/dashboard" replace /> : <Landing />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />  
      <div className="app">
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/home" element={<Home />} />
          <Route path="/report" element={<Report />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}