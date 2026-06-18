  // src/App.jsx (CORRIGÉ)

  import React, { useEffect, useState } from 'react';
  import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
  import { auth } from './services/firebase';
  import { onAuthStateChanged } from 'firebase/auth';

  import Landing from './pages/Landing';
  import Login from './pages/Login';
  import Signup from './pages/Signup';
  import Dashboard from './pages/Dashboard';
  import Interview from './pages/Interview';
  import Report from './pages/Report';
  import History from './pages/History';
  import Profile from './pages/Profile';
  import Contact from './pages/Contact';
  import Home from './pages/Home'

  // ─── COMPOSANT: PROTECTED ROUTE ───
  function ProtectedRoute({ element, isAuthenticated }) {
    // ✅ PLUS DE isLoading ICI! (géré au niveau global)
    
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    return element;
  }

  function App() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        console.log("Auth state changed:", currentUser?.email || "No user");
        setUser(currentUser);
        setIsLoading(false);  // ✅ Après Firebase répond
      });

      return () => unsubscribe();
    }, []);

    // ✅ ÉCRAN DE CHARGEMENT GLOBAL (avant les routes!)
    if (isLoading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          ⏳ Chargement de PrepAI...
        </div>
      );
    }

    // ✅ Après loading, on affiche les routes normalement
    return (
      <Router>
        <Routes>
          {/* ─── PUBLIC ROUTES ─── */}
          <Route 
            path="/" 
            element={user ? <Navigate to="/dashboard" replace /> : <Landing />} 
          />
          
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
          />
          
          <Route 
            path="/signup" 
            element={user ? <Navigate to="/dashboard" replace /> : <Signup />} 
          />
          
          <Route path="/contact" element={<Contact />} />

          {/* ─── PROTECTED ROUTES ─── */}
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute element={<Dashboard />} isAuthenticated={!!user} />} 
          />
          
          <Route 
            path="/interview" 
            element={<ProtectedRoute element={<Interview />} isAuthenticated={!!user} />} 
          />
          
          <Route 
            path="/report" 
            element={<ProtectedRoute element={<Report />} isAuthenticated={!!user} />} 
          />
          
          <Route 
            path="/history" 
            element={<ProtectedRoute element={<History />} isAuthenticated={!!user} />} 
          />
          
          <Route 
            path="/profile" 
            element={<ProtectedRoute element={<Profile />} isAuthenticated={!!user} />} 
          />
        <Route 
  path="/home" 
  element={<ProtectedRoute element={<Home />} isAuthenticated={!!user} />}  // ← <Home /> pas <Dashboard />
/>


          {/* ─── 404 FALLBACK ─── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    );
  }

  export default App;