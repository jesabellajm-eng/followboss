import { Search, Filter, Send, CheckCircle, XCircle, Clock, Trash2, Edit, RotateCw } from 'lucide-react';
import { useState } from 'react';
import type { FollowUp, FollowUpStatus, FollowUpType, Page } from '../types';

interface FollowUpListProps {
  followUps: FollowUp[];
  onUpdateStatus: (id: string, status: FollowUpStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onNavigate: (page: Page) => void;
}

const statusLabels: Record<FollowUpStatus, string> = {
  pending: '⏳ En attente',
  sent: 'Envoyée',
  positive: 'Positif',
  negative: 'Négatif',
  no_reply: 'Sans réponse',
  expired: 'Expirée',
};

const typeLabels: Record<FollowUpType, string> = {
  devis: 'Devis',
  facture: 'Facture',
  prospect: 'Prospect',
  relance_generale: 'Général',
};

function getTypeColor(type: FollowUpType): string {
  switch(type) {
    case 'prospect': return '#fbbf24';
    case 'relance_generale': return '#4ade80';
    case 'devis': return '#f87171';
    case 'facture': return '#60a5fa';
  }
}

export default function FollowUpList({ followUps, onUpdateStatus, onDelete, onEdit, onNavigate }: FollowUpListProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = followUps.filter(f => {
    const matchSearch = !search || f.clientName.toLowerCase().includes(search.toLowerCase()) || f.subject.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || f.status === filterStatus;
    const matchType = filterType === 'all' || f.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Mes relances</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>{followUps.length} relance{followUps.length !== 1 ? 's' : ''} au total</p>
        </div>
        <button className="btn-premium" onClick={() => onNavigate('add')}>
          <span>＋</span> Ajouter
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              className="input-premium"
              style={{ paddingLeft: 36 }}
              placeholder="Rechercher un client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select className="input-premium" style={{ width: 'auto', minWidth: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Tous les statuts</option>
              <option value="pending">⏳ En attente</option>
              <option value="sent">Envoyée</option>
              <option value="positive">Positif</option>
              <option value="negative">Négatif</option>
              <option value="no_reply">Sans réponse</option>
            </select>
            <select className="input-premium" style={{ width: 'auto', minWidth: 130 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">Tous types</option>
              <option value="devis">Devis</option>
              <option value="facture">Facture</option>
              <option value="prospect">Prospect</option>
              <option value="relance_generale">Général</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>Aucune relance trouvée</p>
          <p style={{ fontSize: '0.9rem' }}>{followUps.length === 0 ? 'Commence par ajouter ta première relance!' : 'Essaie de modifier tes filtres'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(f => (
            <div key={f.id} className="glass-card" style={{ padding: 16, borderLeft: `3px solid ${getTypeColor(f.type)}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                {/* Priority dot */}
                <div style={{ paddingTop: 6 }}>
                  <span className={`priority-dot ${f.priority}`} />
                </div>

                {/* Main info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{f.clientName}</span>
                    <span className={`badge badge-${f.status}`}>{statusLabels[f.status]}</span>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 600,
                      color: '#fff',
                      background: getTypeColor(f.type) + '33',
                      border: `1px solid ${getTypeColor(f.type)}55`,
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}>{typeLabels[f.type]}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{f.subject}</p>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {f.amount && <span> {f.amount.toLocaleString()}$</span>}
                    <span> {f.followUpCount}/{f.maxFollowUps} relances</span>
                    <span>Créé: {new Date(f.createdAt).toLocaleDateString('fr-CA')}</span>
                    {f.lastFollowUpAt && <span>Dernier contact: {new Date(f.lastFollowUpAt).toLocaleDateString('fr-CA')}</span>}
                    {!f.lastFollowUpAt && <span style={{ color: '#fbbf24' }}>Jamais contacté</span>}
                  </div>
                </div>

                {/* Amount badge */}
                {f.amount && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#60a5fa' }}>{f.amount.toLocaleString()}$</div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {f.status !== 'positive' && f.status !== 'expired' && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--glass-border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-ghost btn-sm" style={{ color: '#4ade80' }} onClick={() => onUpdateStatus(f.id, 'positive')}>
                    <CheckCircle size={14} /> Positif
                  </button>
                  <button className="btn-ghost btn-sm" style={{ color: '#f87171' }} onClick={() => onUpdateStatus(f.id, 'negative')}>
                    <XCircle size={14} /> Négatif
                  </button>
                  <button className="btn-ghost btn-sm" style={{ color: '#fbbf24' }} onClick={() => onUpdateStatus(f.id, 'no_reply')}>
                    <Clock size={14} /> Sans réponse
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => onUpdateStatus(f.id, 'sent')}>
                    <Send size={14} /> Relancer
                  </button>
                  <div style={{ flex: 1 }} />
                  <button className="btn-ghost btn-sm" onClick={() => onEdit(f.id)}>
                    <Edit size={14} />
                  </button>
                  <button className="btn-ghost btn-sm" style={{ color: '#f87171' }} onClick={() => onDelete(f.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              {(f.status === 'positive' || f.status === 'expired') && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--glass-border)', display: 'flex', gap: 8 }}>
                  <button className="btn-ghost btn-sm" onClick={() => onUpdateStatus(f.id, 'pending')}>
                    <RotateCw size={14} /> Réactiver
                  </button>
                  <div style={{ flex: 1 }} />
                  <button className="btn-ghost btn-sm" style={{ color: '#f87171' }} onClick={() => onDelete(f.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
