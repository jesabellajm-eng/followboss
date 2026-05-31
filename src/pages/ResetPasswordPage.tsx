import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

interface ResetPasswordPageProps {
  onSwitchToLogin: () => void;
}

export default function ResetPasswordPage({ onSwitchToLogin }: ResetPasswordPageProps) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await resetPassword(email);
    if (err) setError(err);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#04050a', padding: 20 }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 20, padding: '40px 32px', backdropFilter: 'blur(24px)' }}>
        <h1 style={{ color: '#e8edf5', fontSize: '1.4rem', fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>
          Réinitialiser le mot de passe
        </h1>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#34d399', fontSize: '0.95rem', marginBottom: 20, marginTop: 16 }}>
              Courriel envoyé! Vérifiez votre boîte de réception.
            </p>
            <button onClick={onSwitchToLogin} style={{ background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', border: 'none', borderRadius: 12, padding: '14px 28px', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Retour à la connexion
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
            {error && <div style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: '0.85rem' }}>{error}</div>}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Votre courriel" required style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 10, padding: '12px 14px', color: '#e8edf5', fontSize: '0.95rem', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
            <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', border: 'none', borderRadius: 12, padding: '14px', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
            <button type="button" onClick={onSwitchToLogin} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Retour à la connexion
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
