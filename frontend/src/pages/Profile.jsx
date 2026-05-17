import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import './Profile.css';
import Footer from '../components/Footer';

export default function Profile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName });
      setMessage({ type: 'success', text: 'Nom mis à jour avec succès' });
      setIsEditing(false);
      // Recharger la page pour rafraîchir l'affichage (optionnel)
      window.location.reload();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
          </div>
          <h1>Mon profil</h1>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <div className="profile-card">
          <div className="profile-field">
            <label>Email</label>
            <p>{user?.email}</p>
          </div>

          <div className="profile-field">
            <label>Nom d'affichage</label>
            {isEditing ? (
              <form onSubmit={handleUpdateName} className="edit-name-form">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                />
                <div className="edit-actions">
                  <button type="submit" disabled={loading}>
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="name-display">
                <p>{user?.name || user?.email?.split('@')[0]}</p>
                <button className="btn-edit" onClick={() => setIsEditing(true)}>
                  Modifier
                </button>
              </div>
            )}
          </div>

          <div className="profile-field">
            <label>UID Firebase</label>
            <p className="uid-text">{user?.uid}</p>
          </div>
        </div>
      </div>
    </div>
  );
}