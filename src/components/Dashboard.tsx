import { TrendingUp, Send, CheckCircle, XCircle, Clock, DollarSign, AlertTriangle, ArrowRight, Zap, Radio } from 'lucide-react';
import type { FollowUp, Page } from '../types';
import { earthBg } from '../earthBg';

interface DashboardProps {
  followUps: FollowUp[];
  onNavigate: (page: Page) => void;
}

export default function Dashboard({ followUps, onNavigate }: DashboardProps) {
  const total = followUps.length;
  const pending = followUps.filter(f => f.status === 'pending').length;
  const sent = followUps.filter(f => f.status === 'sent').length;
  const positive = followUps.filter(f => f.status === 'positive').length;
  const negative = followUps.filter(f => f.status === 'negative').length;
  const noReply = followUps.filter(f => f.status === 'no_reply').length;
  const totalRevenue = followUps.filter(f => f.status !== 'positive' && f.status !== 'expired').reduce((s, f) => s + (f.amount || 0), 0);
  const recoveredRevenue = followUps.filter(f => f.status === 'positive').reduce((s, f) => s + (f.amount || 0), 0);
  const urgent = followUps.filter(f => f.priority === 'haute' && f.status !== 'positive' && f.status !== 'expired').length;
  const successRate = total > 0 ? Math.round((positive / Math.max(positive + negative + noReply, 1)) * 100) : 0;

  const recentActivity = followUps
    .filter(f => f.history.length > 0)
    .flatMap(f => f.history.map(h => ({ ...h, clientName: f.clientName, type: f.type })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const topPriority = followUps
    .filter(f => f.status !== 'positive' && f.status !== 'expired')
    .sort((a, b) => {
      const prio = { haute: 0, moyenne: 1, basse: 2 };
      return prio[a.priority] - prio[b.priority];
    })
    .slice(0, 3);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const timeStr = now.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });

  const stats = [
    { label: 'Relances actives', value: total, sub: `${sent} transmises`, color: '#38bdf8', icon: <Send size={15} /> },
    { label: 'Confirmées', value: positive, sub: `Taux : ${successRate}%`, color: '#38bdf8', icon: <CheckCircle size={15} /> },
    { label: 'Sans suite', value: negative, sub: `${noReply} sans réponse`, color: '#38bdf8', icon: <XCircle size={15} /> },
    { label: 'En attente', value: pending, sub: urgent > 0 ? `${urgent} priorité haute` : 'Aucune urgence', color: '#38bdf8', icon: <Clock size={15} /> },
    { label: 'Revenus récupérés', value: `${recoveredRevenue.toLocaleString('fr-CA')}$`, sub: `${totalRevenue.toLocaleString('fr-CA')}$ en cours`, color: '#38bdf8', icon: <DollarSign size={15} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: '#04050a' }}>

      {/* === FULL PAGE EARTH BACKGROUND === */}
      <img src="/assets/earth-bg.jpg" alt="" style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center right',
        zIndex: 0,
        display: 'block',
      }} />

      {/* Dark overlay — deep space feel, lighter so Earth is visible */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'linear-gradient(135deg, rgba(4,5,15,0.55) 0%, rgba(4,5,15,0.35) 50%, rgba(4,5,15,0.50) 100%)',
      }} />

      {/* HUD Grid overlay — cockpit texture */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2,
        backgroundImage: `
          linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* === CONTENT === */}
      <div style={{ position: 'relative', zIndex: 3 }}>

        {/* ── HUD TOP BAR ── */}
        <div className="hud-top-bar" style={{
          borderBottom: '1px solid rgba(56,189,248,0.12)',
          background: 'rgba(4,5,15,0.6)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#34d399',
                boxShadow: '0 0 8px #34d399',
                display: 'inline-block',
                animation: 'hud-pulse 2s infinite',
              }} />
              <span style={{ fontSize: '0.72rem', color: 'rgba(56,189,248,0.6)', fontWeight: 500, letterSpacing: 1.5, textTransform: 'uppercase' }}>Système actif</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>|</span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(212,175,112,0.5)', fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase' }}>FollowBoss v1.0</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(56,189,248,0.5)', letterSpacing: 1 }}>{dateStr}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(56,189,248,0.8)', letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
          </div>
        </div>

        <div className="page-container">

          {/* ── HERO HEADER ── */}
          <div style={{ paddingTop: 36, paddingBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
              <div>
                {/* Eyebrow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ height: 1, width: 32, background: 'rgba(56,189,248,0.5)' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(56,189,248,0.7)', textTransform: 'uppercase', letterSpacing: 2.5 }}>
                    Centre de commandement
                  </span>
                </div>
                <h1 className="hero-heading" style={{
                  fontWeight: 800, color: '#fff',
                  lineHeight: 1.1, margin: 0, letterSpacing: -1,
                }}>
                  {greeting}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.38)', marginTop: 10, fontSize: '0.92rem', fontWeight: 400 }}>
                  {total === 0
                    ? 'Bienvenue — initiez votre première relance.'
                    : urgent > 0
                    ? `${urgent} relance${urgent > 1 ? 's' : ''} urgente${urgent > 1 ? 's' : ''} requière${urgent > 1 ? 'nt' : ''} votre attention · ${successRate}% de taux de conversion`
                    : `Tout est sous contrôle · ${successRate}% de taux de conversion · ${total} dossiers actifs`}
                </p>
              </div>

              <button className="btn-cockpit" onClick={() => onNavigate('add')}>
                <span style={{ fontSize: '1rem' }}>＋</span>
                Nouvelle relance
              </button>
            </div>
          </div>

          {/* ── STATS GRID — HUD PANELS ── */}
          <div className="grid-stats-5" style={{
            marginBottom: 24,
          }}>
            {stats.map((s, i) => (
              <div key={i} className="hud-panel" style={{ '--panel-color': s.color } as any}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                  <span style={{ color: s.color, opacity: 0.8 }}>{s.icon}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.2 }}>{s.label}</span>
                </div>
                <div style={{
                  fontSize: '2.2rem', fontWeight: 800, color: '#e8edf5',
                  letterSpacing: -1, lineHeight: 1,
                }}>{s.value}</div>
                <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.28)', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.sub}</div>
                {/* Bottom glow line */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, transparent, ${s.color}66, transparent)`,
                  borderRadius: '0 0 14px 14px',
                }} />
              </div>
            ))}
          </div>

          {/* ── TWO COLUMN ── */}
          <div className="grid-2col" style={{ marginBottom: 20 }}>

            {/* Priorités du jour */}
            <div className="hud-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <AlertTriangle size={14} style={{ color: '#fbbf24' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.35)' }}>
                  Priorités du jour
                </span>
                {urgent > 0 && (
                  <span style={{
                    marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700,
                    background: 'rgba(248,113,113,0.15)', color: '#f87171',
                    padding: '2px 8px', borderRadius: 6, letterSpacing: 0.5,
                  }}>{urgent} urgent{urgent > 1 ? 's' : ''}</span>
                )}
              </div>
              {topPriority.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 10, opacity: 0.4 }}>✓</div>
                  Aucune relance en cours
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topPriority.map(f => (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderLeft: `2px solid ${f.priority === 'haute' ? '#f87171' : f.priority === 'moyenne' ? '#fbbf24' : '#34d399'}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>{f.clientName}</span>
                          <span style={{
                            fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                            background: (f.type === 'prospect' ? '#fbbf24' : f.type === 'devis' ? '#f87171' : f.type === 'facture' ? '#60a5fa' : '#4ade80') + '33',
                            color: f.type === 'prospect' ? '#fbbf24' : f.type === 'devis' ? '#f87171' : f.type === 'facture' ? '#60a5fa' : '#4ade80',
                            textTransform: 'uppercase', letterSpacing: 0.5,
                          }}>{f.type === 'devis' ? 'Devis' : f.type === 'facture' ? 'Facture' : f.type === 'prospect' ? 'Prospect' : 'Client'}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{f.subject}</div>
                      </div>
                      {f.amount && <span style={{ fontWeight: 700, color: '#d4af70', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{f.amount}$</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activité récente */}
            <div className="hud-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <TrendingUp size={14} style={{ color: '#38bdf8' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.35)' }}>
                  Activité récente
                </span>
              </div>
              {recentActivity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 10, opacity: 0.4 }}>○</div>
                  Aucune activité enregistrée
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentActivity.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.83rem' }}>
                      <span style={{ color: 'rgba(56,189,248,0.4)', fontSize: '0.7rem', minWidth: 62, fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(a.date).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}
                      </span>
                      <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: '#fff' }}>{a.clientName}</span>
                      <span style={{ color: 'rgba(255,255,255,0.28)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.action}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── QUICK ACCESS ── */}
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap',
            borderTop: '1px solid rgba(56,189,248,0.08)',
            paddingTop: 20,
          }}>
            <button className="btn-hud" onClick={() => onNavigate('morning-brief')}>
              <Zap size={14} style={{ color: '#fbbf24' }} />
              Briefing du matin
            </button>
            <button className="btn-hud" onClick={() => onNavigate('reports')}>
              <Radio size={14} style={{ color: '#38bdf8' }} />
              Rapport du jour
              <ArrowRight size={12} style={{ opacity: 0.5 }} />
            </button>
            <button className="btn-hud" onClick={() => onNavigate('list')}>
              <Send size={14} style={{ color: '#34d399' }} />
              Toutes les relances
              <ArrowRight size={12} style={{ opacity: 0.5 }} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
