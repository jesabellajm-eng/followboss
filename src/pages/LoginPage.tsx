import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

interface LoginPageProps {
  onSwitchToSignup: () => void;
  onSwitchToReset: () => void;
}

export default function LoginPage({ onSwitchToSignup, onSwitchToReset }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgOverlay} />
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <img src="/logo.png" alt="FollowBoss" style={{ height: 60, borderRadius: 12 }} />
        </div>
        <h1 style={styles.title}>Bon retour</h1>
        <p style={styles.subtitle}>Connectez-vous pour accéder à votre espace</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          
          <div style={styles.field}>
            <label style={styles.label}>Courriel</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              required
              style={styles.input}
            />
          </div>

          <button
            type="button"
            onClick={onSwitchToReset}
            style={styles.forgotLink}
          >
            Mot de passe oublié?
          </button>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={styles.switchRow}>
          <span style={{ color: '#8a96a8' }}>Pas encore de compte?</span>
          <button onClick={onSwitchToSignup} style={styles.switchBtn}>
            Créer un compte gratuit
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#04050a',
    padding: 20,
    position: 'relative',
  },
  bgOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'radial-gradient(ellipse at 50% 30%, rgba(56,189,248,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(56,189,248,0.15)',
    borderRadius: 20,
    padding: '40px 32px',
    backdropFilter: 'blur(24px)',
  },
  logoWrap: {
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  title: {
    color: '#e8edf5',
    fontSize: '1.6rem',
    fontWeight: 800,
    textAlign: 'center' as const,
    margin: 0,
  },
  subtitle: {
    color: '#8a96a8',
    fontSize: '0.9rem',
    textAlign: 'center' as const,
    marginTop: 8,
    marginBottom: 28,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 18,
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  label: {
    color: '#b8c4d0',
    fontSize: '0.82rem',
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  input: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(56,189,248,0.15)',
    borderRadius: 10,
    padding: '12px 14px',
    color: '#e8edf5',
    fontSize: '0.95rem',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  },
  error: {
    background: 'rgba(248,113,113,0.12)',
    border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#f87171',
    fontSize: '0.85rem',
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    color: '#38bdf8',
    fontSize: '0.82rem',
    cursor: 'pointer',
    textAlign: 'right' as const,
    padding: 0,
    fontFamily: 'Inter, sans-serif',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
    border: 'none',
    borderRadius: 12,
    padding: '14px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    marginTop: 4,
  },
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    fontSize: '0.85rem',
  },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: '#38bdf8',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontWeight: 600,
    padding: 0,
    fontFamily: 'Inter, sans-serif',
  },
};
