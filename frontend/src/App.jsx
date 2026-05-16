import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import './App.css';
import './pages/Auth.css';

import Landing from './pages/Landing';
import Login   from './pages/Login';
import Signup  from './pages/Signup';

import Dashboard from './pages/Dashboard';

import Interview from './pages/Interview';
import Report from './pages/Report';
import Contact from './pages/Contact';


export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/"        element={<Landing />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/signup"  element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/contact" element={<Contact />} />

          
          <Route path="/interview" element={<Interview />} />
          <Route path="/report" element={<Report />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}