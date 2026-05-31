import { Calendar, TrendingUp, DollarSign, Target } from 'lucide-react';
import type { FollowUp } from '../types';

interface ReportsProps {
  followUps: FollowUp[];
}

export default function Reports({ followUps }: ReportsProps) {
  const now = new Date();

  // Today's stats
  const todayStr = now.toISOString().split('T')[0];
  const todayEvents = followUps.flatMap(f => f.history.filter(h => h.date.startsWith(todayStr)));
  const todaySent = todayEvents.filter(e => e.action.includes('Relance')).length;
  const todayPositive = followUps.filter(f => f.status === 'positive' && f.history.some(h => h.date.startsWith(todayStr))).length;
  const todayNegative = followUps.filter(f => f.status === 'negative' && f.history.some(h => h.date.startsWith(todayStr))).length;
  const todayNoReply = followUps.filter(f => f.status === 'no_reply').length;

  // Week stats
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekPositive = followUps.filter(f => f.status === 'positive' && f.history.some(h => new Date(h.date) >= weekAgo)).length;
  const weekRevenue = followUps.filter(f => f.status === 'positive' && f.history.some(h => new Date(h.date) >= weekAgo)).reduce((s, f) => s + (f.amount || 0), 0);

  // Overall
  const totalPositive = followUps.filter(f => f.status === 'positive').length;
  const totalNegative = followUps.filter(f => f.status === 'negative').length;
  const totalNoReply = followUps.filter(f => f.status === 'no_reply').length;
  const totalPending = followUps.filter(f => f.status === 'pending' || f.status === 'sent').length;
  const totalCompleted = totalPositive + totalNegative + totalNoReply;
  const successRate = totalCompleted > 0 ? Math.round((totalPositive / totalCompleted) * 100) : 0;
  const totalRecovered = followUps.filter(f => f.status === 'positive').reduce((s, f) => s + (f.amount || 0), 0);
  const totalPendingRevenue = followUps.filter(f => f.status !== 'positive' && f.status !== 'expired').reduce((s, f) => s + (f.amount || 0), 0);

  // Per type breakdown
  const types = ['devis', 'facture', 'prospect', 'relance_generale'] as const;
  const typeLabels: Record<string, string> = { devis: 'Devis', facture: 'Factures', prospect: 'Prospects', relance_generale: 'Général' };
  const typeStats = types.map(t => {
    const items = followUps.filter(f => f.type === t);
    const pos = items.filter(f => f.status === 'positive').length;
    return { type: t, label: typeLabels[t], total: items.length, positive: pos, rate: items.length > 0 ? Math.round((pos / items.length) * 100) : 0 };
  }).filter(t => t.total > 0);

  return (
    <div className="page-container">
      <h1 className="page-title">Rapports & Compte-rendus</h1>
      <p className="page-subtitle">Analyse détaillée de tes relances</p>

      {/* Today's Report */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Calendar size={20} style={{ color: '#818cf8' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Rapport du jour</h2>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {now.toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <div style={{ textAlign: 'center', padding: 16, borderRadius: 12, background: 'var(--glass)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#818cf8' }}>{todaySent}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Relances envoyées</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, borderRadius: 12, background: 'var(--glass)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#4ade80' }}>{todayPositive}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Réponses positives</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, borderRadius: 12, background: 'var(--glass)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f87171' }}>{todayNegative}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Réponses négatives</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, borderRadius: 12, background: 'var(--glass)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24' }}>{todayNoReply}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Sans réponse</div>
          </div>
        </div>

        {/* Daily summary sentence */}
        <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.15)' }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
            <strong>Résumé:</strong> Aujourd'hui, <strong>{todaySent}</strong> relance{todaySent !== 1 ? 's' : ''} envoyée{todaySent !== 1 ? 's' : ''},{' '}
            <strong style={{ color: '#4ade80' }}>{todayPositive}</strong> réponse{todayPositive !== 1 ? 's' : ''} positive{todayPositive !== 1 ? 's' : ''},
            {' '}<strong style={{ color: '#f87171' }}>{todayNegative}</strong> négative{todayNegative !== 1 ? 's' : ''},
            {' '}et <strong style={{ color: '#fbbf24' }}>{todayNoReply}</strong> toujours sans réponse.
            {totalPending > 0 && <> Il reste <strong>{totalPending}</strong> relance{totalPending !== 1 ? 's' : ''} à traiter.</>}
          </p>
        </div>
      </div>

      {/* This Week */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <TrendingUp size={20} style={{ color: '#4ade80' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Cette semaine</h2>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Convertis</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>{weekPositive}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Revenus récupérés</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' }}>{weekRevenue.toLocaleString()}$</div>
          </div>
        </div>
      </div>

      {/* Performance Globale */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Target size={20} style={{ color: '#f59e0b' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Performance globale</h2>
        </div>

        {/* Success rate bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Taux de succès</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: successRate >= 50 ? '#4ade80' : successRate >= 25 ? '#fbbf24' : '#f87171' }}>{successRate}%</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: 'var(--glass)', overflow: 'hidden' }}>
            <div className="chart-bar" style={{ width: `${successRate}%`, height: '100%', background: successRate >= 50 ? 'linear-gradient(90deg, #22c55e, #4ade80)' : successRate >= 25 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)' }} />
          </div>
        </div>

        {/* Revenue */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ padding: 16, borderRadius: 12, background: 'var(--glass)' }}>
            <DollarSign size={18} style={{ color: '#4ade80', marginBottom: 4 }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>{totalRecovered.toLocaleString()}$</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Revenus récupérés</div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, background: 'var(--glass)' }}>
            <DollarSign size={18} style={{ color: '#fbbf24', marginBottom: 4 }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{totalPendingRevenue.toLocaleString()}$</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>En attente</div>
          </div>
        </div>

        {/* Distribution */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Positifs', count: totalPositive, color: '#4ade80' },
            { label: 'Négatifs', count: totalNegative, color: '#f87171' },
            { label: 'Sans réponse', count: totalNoReply, color: '#fbbf24' },
            { label: 'En cours', count: totalPending, color: '#818cf8' },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, minWidth: 100, padding: 12, borderRadius: 10, background: 'var(--glass)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: item.color }}>{item.count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per type */}
      {typeStats.length > 0 && (
        <div className="glass-card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>Par type de relance</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {typeStats.map(t => (
              <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ minWidth: 110, fontSize: '0.9rem' }}>{t.label}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--glass)', overflow: 'hidden' }}>
                  <div className="chart-bar" style={{ width: `${t.rate}%`, height: '100%' }} />
                </div>
                <span style={{ minWidth: 80, fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>{t.positive}/{t.total} ({t.rate}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
