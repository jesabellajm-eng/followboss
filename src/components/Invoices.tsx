import { useState, useMemo } from 'react';
import { Receipt, Plus, Trash2, DollarSign, AlertTriangle, CheckCircle, Send, XCircle } from 'lucide-react';
import type { Invoice } from '../types';

interface InvoicesProps {
  invoices: Invoice[];
  onAdd: (i: Omit<Invoice, 'id'>) => void;
  onUpdateStatus: (id: string, status: Invoice['status']) => void;
  onDelete: (id: string) => void;
}

function daysOverdue(dueDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diff = Math.floor((now.getTime() - due.getTime()) / 86400000);
  return diff;
}

function formatCurrency(n: number) {
  return n.toLocaleString('fr-CA') + '$';
}

function formatDateShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });
}

const statusConfig: Record<Invoice['status'], { label: string; color: string; bg: string }> = {
  overdue: { label: 'En retard', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  pending: { label: 'En attente', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  paid: { label: 'Payée', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  cancelled: { label: 'Annulée', color: '#b8c4d0', bg: 'rgba(122,132,148,0.12)' },
};

export default function Invoices({ invoices, onAdd, onUpdateStatus, onDelete }: InvoicesProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    clientName: '', clientEmail: '', invoiceNumber: '', amount: '',
    issuedAt: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    notes: '', status: 'pending' as Invoice['status'],
  });

  const sorted = useMemo(() => {
    const statusOrder: Record<Invoice['status'], number> = { overdue: 0, pending: 1, paid: 2, cancelled: 3 };
    return [...invoices].sort((a, b) => {
      const oa = statusOrder[a.status] ?? 1;
      const ob = statusOrder[b.status] ?? 1;
      if (oa !== ob) return oa - ob;
      if (a.status === 'overdue' && b.status === 'overdue') return daysOverdue(b.dueDate) - daysOverdue(a.dueDate);
      return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
    });
  }, [invoices]);

  const stats = useMemo(() => {
    const totalDue = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
    const overdueList = invoices.filter(i => i.status === 'overdue');
    const overdueAmount = overdueList.reduce((s, i) => s + i.amount, 0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonth = invoices.filter(i => i.status === 'paid').length; // simplified
    const totalResolved = invoices.filter(i => i.status === 'paid').length;
    const totalAll = invoices.filter(i => i.status !== 'cancelled').length;
    const recoveryRate = totalAll > 0 ? Math.round((totalResolved / totalAll) * 100) : 0;

    return { totalDue, overdueCount: overdueList.length, overdueAmount, paidThisMonth, recoveryRate };
  }, [invoices]);

  const handleRelance = (inv: Invoice) => {
    const days = daysOverdue(inv.dueDate);
    let subject = '';
    let body = '';

    if (days <= 7) {
      subject = `Rappel amical — Facture ${inv.invoiceNumber}`;
      body = `Bonjour ${inv.clientName},\n\nJ'espère que vous allez bien! Je me permets de vous envoyer un petit rappel concernant la facture ${inv.invoiceNumber} d'un montant de ${formatCurrency(inv.amount)}, dont l'échéance était le ${formatDateShort(inv.dueDate)}.\n\nSi le paiement a déjà été effectué, veuillez ignorer ce message.\n\nMerci et bonne journée!`;
    } else if (days <= 14) {
      subject = `Suivi — Facture ${inv.invoiceNumber} en attente`;
      body = `Bonjour ${inv.clientName},\n\nJe reviens vers vous concernant la facture ${inv.invoiceNumber} d'un montant de ${formatCurrency(inv.amount)}. L'échéance était le ${formatDateShort(inv.dueDate)}, soit il y a ${days} jours.\n\nPourriez-vous me confirmer quand le paiement pourra être effectué?\n\nMerci de votre collaboration.`;
    } else {
      subject = `URGENT — Facture ${inv.invoiceNumber} en retard de ${days} jours`;
      body = `Bonjour ${inv.clientName},\n\nMalgré mes relances précédentes, la facture ${inv.invoiceNumber} d'un montant de ${formatCurrency(inv.amount)} reste impayée depuis ${days} jours.\n\nJe vous prie de bien vouloir régulariser cette situation dans les plus brefs délais.\n\nSans retour de votre part sous 48h, je me verrai dans l'obligation de prendre des mesures supplémentaires.\n\nCordialement.`;
    }

    const mailto = `mailto:${inv.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  };

  const handleSubmit = () => {
    if (!form.clientName || !form.invoiceNumber || !form.amount) return;
    onAdd({
      clientName: form.clientName,
      clientEmail: form.clientEmail,
      invoiceNumber: form.invoiceNumber,
      amount: Number(form.amount),
      issuedAt: form.issuedAt,
      dueDate: form.dueDate,
      status: form.status,
      notes: form.notes || undefined,
    });
    setForm({
      clientName: '', clientEmail: '', invoiceNumber: '', amount: '',
      issuedAt: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      notes: '', status: 'pending',
    });
    setShowForm(false);
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
    { label: 'Total dû', value: formatCurrency(stats.totalDue), color: '#d4af70', icon: <DollarSign size={15} /> },
    { label: 'En retard', value: `${stats.overdueCount}`, sub: formatCurrency(stats.overdueAmount), color: '#f87171', icon: <AlertTriangle size={15} /> },
    { label: 'Payées ce mois', value: `${stats.paidThisMonth}`, color: '#34d399', icon: <CheckCircle size={15} /> },
    { label: 'Taux de recouvrement', value: `${stats.recoveryRate}%`, color: '#38bdf8', icon: <Receipt size={15} /> },
  ];

  return (
    <div className="page-container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ height: 1, width: 32, background: 'rgba(56,189,248,0.5)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(56,189,248,0.7)', textTransform: 'uppercase', letterSpacing: 2.5 }}>
              Suivi des factures
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: -1 }}>
            <Receipt size={24} style={{ verticalAlign: -4, marginRight: 10, color: '#d4af70' }} />
            Factures
          </h1>
        </div>
        <button className="btn-cockpit" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Nouvelle facture
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
            {s.sub && <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.28)', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.sub}</div>}
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
            Ajouter une facture
          </div>
          <div className="grid-3col">
            <div>
              <label style={labelStyle}>Nom du client *</label>
              <input style={inputStyle} value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="Jean-Pierre Dubois" />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })} placeholder="jp@exemple.com" />
            </div>
            <div>
              <label style={labelStyle}>Numéro facture *</label>
              <input style={inputStyle} value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="#FAC-2024-100" />
            </div>
            <div>
              <label style={labelStyle}>Montant *</label>
              <input type="number" style={inputStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="1200" />
            </div>
            <div>
              <label style={labelStyle}>Date d'émission</label>
              <input type="date" style={inputStyle} value={form.issuedAt} onChange={e => setForm({ ...form, issuedAt: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Date d'échéance</label>
              <input type="date" style={inputStyle} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="span-2">
              <label style={labelStyle}>Notes</label>
              <input style={inputStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes optionnelles..." />
            </div>
            <div>
              <label style={labelStyle}>Statut</label>
              <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Invoice['status'] })}>
                <option value="pending">En attente</option>
                <option value="overdue">En retard</option>
                <option value="paid">Payée</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <button className="btn-hud" onClick={() => setShowForm(false)} style={{ color: '#b8c4d0' }}>Annuler</button>
            <button className="btn-cockpit" onClick={handleSubmit}>Ajouter</button>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <div className="hud-card">
        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
          Toutes les factures ({invoices.length})
        </div>

        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 10, opacity: 0.4 }}></div>
            Aucune facture enregistrée
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map(inv => {
              const cfg = statusConfig[inv.status];
              const overdueDays = inv.status === 'overdue' ? daysOverdue(inv.dueDate) : 0;

              return (
                <div key={inv.id} className="invoice-row" style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: inv.status === 'overdue' ? 'rgba(248,113,113,0.04)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${inv.status === 'overdue' ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  borderLeft: `3px solid ${cfg.color}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e8edf5' }}>{inv.clientName}</span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{inv.invoiceNumber}</span>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: cfg.bg, color: cfg.color, textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>{cfg.label}</span>
                      {inv.status === 'overdue' && overdueDays > 0 && (
                        <span style={{
                          fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(248,113,113,0.2)', color: '#f87171',
                        }}>+{overdueDays}j de retard</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 5, fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                      <span>Émise : {formatDateShort(inv.issuedAt)}</span>
                      <span>Échéance : {formatDateShort(inv.dueDate)}</span>
                    </div>
                  </div>

                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#d4af70', whiteSpace: 'nowrap' }}>
                    {formatCurrency(inv.amount)}
                  </div>

                  <div className="invoice-actions">
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button onClick={() => onUpdateStatus(inv.id, 'paid')} className="btn-hud" style={{ padding: '5px 10px', fontSize: '0.72rem', color: '#34d399' }} title="Marquer payée">
                        <CheckCircle size={13} /> Payée
                      </button>
                    )}
                    {(inv.status === 'overdue' || inv.status === 'pending') && (
                      <button onClick={() => handleRelance(inv)} className="btn-hud" style={{ padding: '5px 10px', fontSize: '0.72rem', color: '#38bdf8' }} title="Envoyer relance">
                        <Send size={13} /> Relance
                      </button>
                    )}
                    {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                      <button onClick={() => onUpdateStatus(inv.id, 'cancelled')} className="btn-hud" style={{ padding: '5px 10px', fontSize: '0.72rem', color: '#b8c4d0' }} title="Annuler">
                        <XCircle size={13} />
                      </button>
                    )}
                    <button onClick={() => onDelete(inv.id)} className="btn-hud" style={{ padding: '5px 10px', fontSize: '0.72rem', color: '#f87171' }} title="Supprimer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
