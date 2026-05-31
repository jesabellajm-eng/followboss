import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

export default function SignupPage({ onSwitchToLogin }: SignupPageProps) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    const { error: err } = await signUp(email, password, name);
    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.bgOverlay} />
        <div style={styles.card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✓</div>
            <h2 style={{ color: '#e8edf5', fontSize: '1.4rem', fontWeight: 800, marginBottom: 12 }}>
              Compte créé avec succès!
            </h2>
            <p style={{ color: '#8a96a8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
              Vérifiez votre courriel pour confirmer votre compte, puis connectez-vous.
            </p>
            <button onClick={onSwitchToLogin} style={styles.submitBtn}>
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.bgOverlay} />
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <img src="/logo.png" alt="FollowBoss" style={{ height: 60, borderRadius: 12 }} />
        </div>
        <h1 style={styles.title}>Essai gratuit 30 jours</h1>
        <p style={styles.subtitle}>Aucune carte de crédit requise</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Nom complet</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" required style={styles.input} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Courriel</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" required style={styles.input} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 caractères" required style={styles.input} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirmer le mot de passe</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Répétez le mot de passe" required style={styles.input} />
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Création...' : 'Créer mon compte gratuit'}
          </button>
        </form>

        <div style={styles.switchRow}>
          <span style={{ color: '#8a96a8' }}>Déjà un compte?</span>
          <button onClick={onSwitchToLogin} style={styles.switchBtn}>Se connecter</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#04050a', padding: 20, position: 'relative' },
  bgOverlay: { position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, rgba(56,189,248,0.08) 0%, transparent 70%)', pointerEvents: 'none' },
  card: { position: 'relative', width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 20, padding: '40px 32px', backdropFilter: 'blur(24px)' },
  logoWrap: { textAlign: 'center' as const, marginBottom: 24 },
  title: { color: '#e8edf5', fontSize: '1.6rem', fontWeight: 800, textAlign: 'center' as const, margin: 0 },
  subtitle: { color: '#34d399', fontSize: '0.9rem', textAlign: 'center' as const, marginTop: 8, marginBottom: 28, fontWeight: 600 },
  form: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  label: { color: '#b8c4d0', fontSize: '0.82rem', fontWeight: 600, letterSpacing: 0.5 },
  input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 10, padding: '12px 14px', color: '#e8edf5', fontSize: '0.95rem', outline: 'none', fontFamily: 'Inter, sans-serif' },
  error: { background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: '0.85rem' },
  submitBtn: { background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', border: 'none', borderRadius: 12, padding: '14px', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginTop: 4 },
  switchRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, fontSize: '0.85rem' },
  switchBtn: { background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, padding: 0, fontFamily: 'Inter, sans-serif' },
};
