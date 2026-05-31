import { useState, useMemo } from 'react';
import { UserPlus, Plus, Trash2, ArrowRight, ArrowLeft, Phone, DollarSign, Users, TrendingUp, Target } from 'lucide-react';
import type { Prospect } from '../types';

interface ProspectsProps {
  prospects: Prospect[];
  onAdd: (p: Omit<Prospect, 'id' | 'createdAt'>) => void;
  onUpdateStage: (id: string, stage: Prospect['stage']) => void;
  onContact: (id: string) => void;
  onDelete: (id: string) => void;
}

const stageConfig: Record<Prospect['stage'], { label: string; color: string; order: number }> = {
  nouveau: { label: 'Nouveau', color: '#38bdf8', order: 0 },
  contacte: { label: 'Contacté', color: '#a78bfa', order: 1 },
  qualifie: { label: 'Qualifié', color: '#fbbf24', order: 2 },
  proposition: { label: 'Proposition', color: '#d4af70', order: 3 },
  gagne: { label: 'Gagné', color: '#34d399', order: 4 },
  perdu: { label: 'Perdu', color: '#f87171', order: 5 },
};

const stageOrder: Prospect['stage'][] = ['nouveau', 'contacte', 'qualifie', 'proposition', 'gagne', 'perdu'];
const sources = ['Réseau', 'Web', 'Référence', 'Événement', 'Autre'];

function daysSince(iso: string) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
}

function formatCurrency(n: number) {
  return n.toLocaleString('fr-CA') + '$';
}

export default function Prospects({ prospects, onAdd, onUpdateStage, onContact, onDelete }: ProspectsProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', source: 'Web',
    stage: 'nouveau' as Prospect['stage'], estimatedValue: '', notes: '',
  });

  const stats = useMemo(() => {
    const total = prospects.length;
    const pipelineValue = prospects.filter(p => p.stage !== 'perdu' && p.stage !== 'gagne').reduce((s, p) => s + (p.estimatedValue || 0), 0);
    const won = prospects.filter(p => p.stage === 'gagne').length;
    const lost = prospects.filter(p => p.stage === 'perdu').length;
    const conversionRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = prospects.filter(p => new Date(p.createdAt) >= monthStart).length;
    return { total, pipelineValue, conversionRate, newThisMonth };
  }, [prospects]);

  const prospectsByStage = useMemo(() => {
    const map: Record<Prospect['stage'], Prospect[]> = {
      nouveau: [], contacte: [], qualifie: [], proposition: [], gagne: [], perdu: [],
    };
    prospects.forEach(p => map[p.stage].push(p));
    return map;
  }, [prospects]);

  const handleSubmit = () => {
    if (!form.name || !form.email) return;
    onAdd({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      company: form.company || undefined,
      source: form.source,
      stage: form.stage,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      notes: form.notes || undefined,
      lastContactAt: undefined,
    });
    setForm({ name: '', email: '', phone: '', company: '', source: 'Web', stage: 'nouveau', estimatedValue: '', notes: '' });
    setShowForm(false);
  };

  const moveStage = (id: string, direction: 'next' | 'prev') => {
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return;
    const currentIdx = stageOrder.indexOf(prospect.stage);
    const newIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (newIdx >= 0 && newIdx < stageOrder.length) {
      onUpdateStage(id, stageOrder[newIdx]);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid rgba(56,189,248,0.15)', background: 'rgba(4,5,15,0.6)',
    color: '#e8edf5', fontSize: '0.85rem', outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'block',
  };

  const statItems = [
    { label: 'Total prospects', value: `${stats.total}`, color: '#38bdf8', icon: <Users size={15} /> },
    { label: 'Valeur pipeline', value: formatCurrency(stats.pipelineValue), color: '#d4af70', icon: <DollarSign size={15} /> },
    { label: 'Taux de conversion', value: `${stats.conversionRate}%`, color: '#34d399', icon: <TrendingUp size={15} /> },
    { label: 'Nouveaux ce mois', value: `${stats.newThisMonth}`, color: '#a78bfa', icon: <Target size={15} /> },
  ];

  return (
    <div className="page-container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ height: 1, width: 32, background: 'rgba(56,189,248,0.5)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(56,189,248,0.7)', textTransform: 'uppercase', letterSpacing: 2.5 }}>
              Pipeline de ventes
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: -1 }}>
            <UserPlus size={24} style={{ verticalAlign: -4, marginRight: 10, color: '#34d399' }} />
            Prospects
          </h1>
        </div>
        <button className="btn-cockpit" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Nouveau prospect
        </button>
      </div>

      {/* Stats */}
      <div className="grid-stats-4" style={{ marginBottom: 24 }}>
        {statItems.map((s, i) => (
          <div key={i} className="hud-panel" style={{ '--panel-color': s.color } as any}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <span style={{ color: s.color, opacity: 0.8 }}>{s.icon}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.2 }}>{s.label}</span>
            </div>
            <div style={{
              fontSize: '2.2rem', fontWeight: 800, color: s.color,
              letterSpacing: -1, lineHeight: 1,
              textShadow: `0 0 20px ${s.color}55`,
            }}>{s.value}</div>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${s.color}66, transparent)`,
              borderRadius: '0 0 14px 14px',
            }} />
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="hud-card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
            Ajouter un prospect
          </div>
          <div className="grid-3col">
            <div>
              <label style={labelStyle}>Nom *</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Alexandre Côté" />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="alex@exemple.com" />
            </div>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="514-555-0123" />
            </div>
            <div>
              <label style={labelStyle}>Entreprise</label>
              <input style={inputStyle} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Agence Pixel" />
            </div>
            <div>
              <label style={labelStyle}>Source</label>
              <select style={inputStyle} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Valeur estimée</label>
              <input type="number" style={inputStyle} value={form.estimatedValue} onChange={e => setForm({ ...form, estimatedValue: e.target.value })} placeholder="5000" />
            </div>
            <div className="span-3">
              <label style={labelStyle}>Notes</label>
              <input style={inputStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes optionnelles..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <button className="btn-hud" onClick={() => setShowForm(false)} style={{ color: '#b8c4d0' }}>Annuler</button>
            <button className="btn-cockpit" onClick={handleSubmit}>Ajouter</button>
          </div>
        </div>
      )}

      {/* Pipeline Columns */}
      <div className="grid-pipeline">
        {stageOrder.map(stage => {
          const cfg = stageConfig[stage];
          const items = prospectsByStage[stage];
          const totalValue = items.reduce((s, p) => s + (p.estimatedValue || 0), 0);

          return (
            <div key={stage} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: 10,
              minWidth: 160,
              borderTop: `2px solid ${cfg.color}`,
            }}>
              {/* Column Header */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: 1 }}>{cfg.label}</span>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                    background: `${cfg.color}22`, color: cfg.color,
                  }}>{items.length}</span>
                </div>
                {totalValue > 0 && (
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{formatCurrency(totalValue)}</div>
                )}
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(p => (
                  <div key={p.id} style={{
                    padding: '10px 10px', borderRadius: 8,
                    background: 'rgba(4,5,15,0.5)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#e8edf5', marginBottom: 3 }}>{p.name}</div>
                    {p.company && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>{p.company}</div>}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      {p.estimatedValue && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#d4af70' }}>{formatCurrency(p.estimatedValue)}</span>
                      )}
                      <span style={{
                        fontSize: '0.58rem', fontWeight: 600, padding: '1px 5px', borderRadius: 3,
                        background: 'rgba(56,189,248,0.1)', color: 'rgba(56,189,248,0.7)',
                      }}>{p.source}</span>
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>
                      Créé il y a {daysSince(p.createdAt)}j
                      {p.lastContactAt && ` · Contact il y a ${daysSince(p.lastContactAt)}j`}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {stage !== 'nouveau' && stage !== 'perdu' && (
                        <button onClick={() => moveStage(p.id, 'prev')} className="btn-hud" style={{ padding: '2px 6px', fontSize: '0.62rem' }} title="Reculer">
                          <ArrowLeft size={10} />
                        </button>
                      )}
                      {stage !== 'gagne' && stage !== 'perdu' && (
                        <button onClick={() => moveStage(p.id, 'next')} className="btn-hud" style={{ padding: '2px 6px', fontSize: '0.62rem', color: '#34d399' }} title="Avancer">
                          <ArrowRight size={10} /> Avancer
                        </button>
                      )}
                      {stage !== 'gagne' && stage !== 'perdu' && (
                        <button onClick={() => onContact(p.id)} className="btn-hud" style={{ padding: '2px 6px', fontSize: '0.62rem', color: '#38bdf8' }} title="Contacter">
                          <Phone size={10} />
                        </button>
                      )}
                      {stage !== 'perdu' && stage !== 'gagne' && (
                        <button onClick={() => onUpdateStage(p.id, 'perdu')} className="btn-hud" style={{ padding: '2px 6px', fontSize: '0.62rem', color: '#f87171' }} title="Perdre">
                          ✕
                        </button>
                      )}
                      <button onClick={() => onDelete(p.id)} className="btn-hud" style={{ padding: '2px 6px', fontSize: '0.62rem', color: '#b8c4d0' }} title="Supprimer">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.15)' }}>
                    Aucun
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
