import { Save, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { FollowUp, FollowUpType, Priority, Page } from '../types';

interface FollowUpFormProps {
  followUp?: FollowUp | null;
  onSave: (data: Omit<FollowUp, 'id' | 'createdAt' | 'history' | 'followUpCount'>) => void;
  onNavigate: (page: Page) => void;
}

const typeOptions: { value: FollowUpType; label: string; emoji: string }[] = [
  { value: 'devis', label: 'Devis', emoji: '' },
  { value: 'facture', label: 'Facture', emoji: '' },
  { value: 'prospect', label: 'Prospect', emoji: '' },
  { value: 'relance_generale', label: 'Relance générale', emoji: '' },
];

const priorityOptions: { value: Priority; label: string; emoji: string }[] = [
  { value: 'haute', label: 'Haute', emoji: '' },
  { value: 'moyenne', label: 'Moyenne', emoji: '' },
  { value: 'basse', label: 'Basse', emoji: '' },
];

export default function FollowUpForm({ followUp, onSave, onNavigate }: FollowUpFormProps) {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [type, setType] = useState<FollowUpType>('devis');
  const [subject, setSubject] = useState('');
  const [amount, setAmount] = useState('');
  const [priority, setPriority] = useState<Priority>('moyenne');
  const [maxFollowUps, setMaxFollowUps] = useState('3');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (followUp) {
      setClientName(followUp.clientName);
      setClientEmail(followUp.clientEmail);
      setType(followUp.type);
      setSubject(followUp.subject);
      setAmount(followUp.amount?.toString() || '');
      setPriority(followUp.priority);
      setMaxFollowUps(followUp.maxFollowUps.toString());
      setNotes(followUp.notes || '');
    }
  }, [followUp]);

  const handleSubmit = () => {
    if (!clientName.trim() || !subject.trim()) return;
    onSave({
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      type,
      subject: subject.trim(),
      amount: amount ? parseFloat(amount) : undefined,
      status: followUp?.status || 'pending',
      priority,
      maxFollowUps: parseInt(maxFollowUps) || 3,
      notes: notes.trim() || undefined,
      lastFollowUpAt: followUp?.lastFollowUpAt,
      nextFollowUpAt: followUp?.nextFollowUpAt,
    });
  };

  return (
    <div className="page-container">
      <button className="btn-ghost btn-sm" onClick={() => onNavigate('list')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Retour
      </button>

      <h1 className="page-title">{followUp ? 'Modifier' : 'Nouvelle relance'}</h1>
      <p className="page-subtitle">
        {followUp ? 'Modifie les infos de cette relance' : 'Ajoute un client à relancer'}
      </p>

      <div className="glass-card">
        <div className="form-grid">
          {/* Client Name */}
          <div>
            <label className="label-premium">Nom du client *</label>
            <input
              className="input-premium"
              placeholder="Ex: Marie Dupont"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
            />
          </div>

          {/* Client Email */}
          <div>
            <label className="label-premium">Email du client</label>
            <input
              className="input-premium"
              placeholder="marie@exemple.com"
              type="email"
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
            />
          </div>

          {/* Type */}
          <div>
            <label className="label-premium">Type de relance</label>
            <select className="input-premium" value={type} onChange={e => setType(e.target.value as FollowUpType)}>
              {typeOptions.map(o => (
                <option key={o.value} value={o.value}>{o.emoji} {o.label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="label-premium">Priorité</label>
            <select className="input-premium" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              {priorityOptions.map(o => (
                <option key={o.value} value={o.value}>{o.emoji} {o.label}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="form-full">
            <label className="label-premium">Sujet / Description *</label>
            <input
              className="input-premium"
              placeholder="Ex: Devis site web — refonte complète"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="label-premium">Montant ($)</label>
            <input
              className="input-premium"
              placeholder="Ex: 2500"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {/* Max Follow-ups */}
          <div>
            <label className="label-premium">Nombre max de relances</label>
            <select className="input-premium" value={maxFollowUps} onChange={e => setMaxFollowUps(e.target.value)}>
              {[1,2,3,4,5,6,7].map(n => (
                <option key={n} value={n}>{n} relance{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="form-full">
            <label className="label-premium">Notes (optionnel)</label>
            <textarea
              className="input-premium"
              placeholder="Détails supplémentaires, historique, contexte..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Submit */}
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button
            className="btn-premium"
            onClick={handleSubmit}
            style={{ opacity: (!clientName.trim() || !subject.trim()) ? 0.5 : 1 }}
          >
            <Save size={16} /> {followUp ? 'Enregistrer' : 'Créer la relance'}
          </button>
          <button className="btn-ghost" onClick={() => onNavigate('list')}>Annuler</button>
        </div>
      </div>
    </div>
  );
}
