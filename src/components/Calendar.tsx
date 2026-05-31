import { useState, useMemo } from 'react';
import { CalendarDays, Plus, Trash2, Volume2, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import type { Appointment } from '../types';

interface CalendarProps {
  appointments: Appointment[];
  onAdd: (a: Omit<Appointment, 'id' | 'reminded'>) => void;
  onDelete: (id: string) => void;
}

function speakFrench(text: string) {
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'fr-FR';
  const voices = synth.getVoices();
  const frVoice = voices.find(v => v.lang.startsWith('fr'));
  if (frVoice) utter.voice = frVoice;
  utter.rate = 0.95;
  synth.speak(utter);
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
}

function isToday(dateStr: string) {
  const today = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

function isPast(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + 'T00:00:00') < today;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday first
}

export default function Calendar({ appointments, onAdd, onDelete }: CalendarProps) {
  const [showForm, setShowForm] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [form, setForm] = useState({
    clientName: '', clientEmail: '', date: new Date().toISOString().slice(0, 10),
    time: '10:00', duration: 30, subject: '', location: '', notes: '',
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const todayAppts = useMemo(() =>
    appointments.filter(a => a.date === todayStr).sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, todayStr]
  );

  const upcomingAppts = useMemo(() =>
    appointments
      .filter(a => a.date > todayStr)
      .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))
      .slice(0, 10),
    [appointments, todayStr]
  );

  const pastAppts = useMemo(() =>
    appointments
      .filter(a => a.date < todayStr)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
    [appointments, todayStr]
  );

  const apptDates = useMemo(() => {
    const s = new Set<string>();
    appointments.forEach(a => s.add(a.date));
    return s;
  }, [appointments]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });

  const announceOne = (a: Appointment) => {
    speakFrench(`Vous avez un rendez-vous avec ${a.clientName} — ${a.subject} — à ${a.time}`);
  };

  const announceAll = () => {
    if (todayAppts.length === 0) {
      speakFrench('Aucun rendez-vous aujourd\'hui.');
      return;
    }
    const texts = todayAppts.map(a => `Rendez-vous avec ${a.clientName} — ${a.subject} — à ${a.time}`);
    speakFrench(`Vous avez ${todayAppts.length} rendez-vous aujourd'hui. ${texts.join('. ')}`);
  };

  const handleSubmit = () => {
    if (!form.clientName || !form.subject || !form.date || !form.time) return;
    onAdd({
      clientName: form.clientName,
      clientEmail: form.clientEmail || undefined,
      date: form.date,
      time: form.time,
      duration: form.duration,
      subject: form.subject,
      location: form.location || undefined,
      notes: form.notes || undefined,
    });
    setForm({ clientName: '', clientEmail: '', date: todayStr, time: '10:00', duration: 30, subject: '', location: '', notes: '' });
    setShowForm(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
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

  const renderApptCard = (a: Appointment, type: 'today' | 'upcoming' | 'past') => {
    const borderColor = type === 'today' ? '#38bdf8' : type === 'past' ? '#8a96a8' : '#d4af70';
    const glowColor = type === 'today' ? 'rgba(56,189,248,0.08)' : type === 'past' ? 'rgba(255,255,255,0.02)' : 'rgba(212,175,112,0.06)';

    return (
      <div key={a.id} style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 10,
        background: glowColor,
        border: `1px solid rgba(255,255,255,0.06)`,
        borderLeft: `3px solid ${borderColor}`,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: type === 'past' ? '#b8c4d0' : '#e8edf5' }}>{a.clientName}</span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, padding: '1px 6px', borderRadius: 4,
              background: `${borderColor}22`, color: borderColor,
            }}>{a.time} · {a.duration}min</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{a.subject}</div>
          {a.location && (
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={10} /> {a.location}
            </div>
          )}
          {type !== 'today' && (
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{formatDate(a.date)}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => announceOne(a)} className="btn-hud" style={{ padding: '4px 8px', fontSize: '0.75rem' }} title="Annoncer">
            <Volume2 size={13} /> 
          </button>
          <button onClick={() => onDelete(a.id)} className="btn-hud" style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#f87171' }} title="Supprimer">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ height: 1, width: 32, background: 'rgba(56,189,248,0.5)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(56,189,248,0.7)', textTransform: 'uppercase', letterSpacing: 2.5 }}>
              Gestion des rendez-vous
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: -1 }}>
            <CalendarDays size={24} style={{ verticalAlign: -4, marginRight: 10, color: '#38bdf8' }} />
            Calendrier
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-cockpit" onClick={announceAll} style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(56,189,248,0.1))' }}>
            <Volume2 size={14} />  Annoncer tous
          </button>
          <button className="btn-cockpit" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> Nouveau RDV
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="hud-card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
            Ajouter un rendez-vous
          </div>
          <div className="grid-form-2col">
            <div>
              <label style={labelStyle}>Nom du client *</label>
              <input style={inputStyle} value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="Marie Tremblay" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })} placeholder="marie@exemple.com" />
            </div>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" style={inputStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Heure *</label>
              <input type="time" style={inputStyle} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Durée (min)</label>
              <input type="number" style={inputStyle} value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} />
            </div>
            <div>
              <label style={labelStyle}>Sujet *</label>
              <input style={inputStyle} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Présentation devis" />
            </div>
            <div>
              <label style={labelStyle}>Lieu</label>
              <input style={inputStyle} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Bureau / Zoom" />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <input style={inputStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <button className="btn-hud" onClick={() => setShowForm(false)} style={{ color: '#b8c4d0' }}>Annuler</button>
            <button className="btn-cockpit" onClick={handleSubmit}>Ajouter</button>
          </div>
        </div>
      )}

      <div className="grid-calendar">
        {/* Monthly Calendar Grid */}
        <div className="hud-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button className="btn-hud" onClick={prevMonth} style={{ padding: '4px 8px' }}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e8edf5', textTransform: 'capitalize' }}>{monthLabel}</span>
            <button className="btn-hud" onClick={nextMonth} style={{ padding: '4px 8px' }}><ChevronRight size={14} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
            {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(d => (
              <div key={d} style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasAppt = apptDates.has(dateStr);
              const isTodayCell = dateStr === todayStr;

              return (
                <div key={day} style={{
                  padding: '5px 2px', borderRadius: 6, fontSize: '0.78rem', position: 'relative',
                  fontWeight: isTodayCell ? 800 : 400,
                  color: isTodayCell ? '#38bdf8' : hasAppt ? '#d4af70' : 'rgba(255,255,255,0.4)',
                  background: isTodayCell ? 'rgba(56,189,248,0.12)' : 'transparent',
                  border: isTodayCell ? '1px solid rgba(56,189,248,0.3)' : '1px solid transparent',
                }}>
                  {day}
                  {hasAppt && (
                    <div style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: isTodayCell ? '#38bdf8' : '#d4af70',
                      margin: '2px auto 0',
                      boxShadow: `0 0 4px ${isTodayCell ? '#38bdf8' : '#d4af70'}`,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Appointments Lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Today */}
          <div className="hud-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Clock size={14} style={{ color: '#38bdf8' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.35)' }}>
                Aujourd'hui
              </span>
              <span style={{
                marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700,
                background: 'rgba(56,189,248,0.15)', color: '#38bdf8',
                padding: '2px 8px', borderRadius: 6,
              }}>{todayAppts.length} rdv</span>
            </div>
            {todayAppts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 8, opacity: 0.4 }}></div>
                Aucun rendez-vous aujourd'hui
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todayAppts.map(a => renderApptCard(a, 'today'))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          {upcomingAppts.length > 0 && (
            <div className="hud-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <CalendarDays size={14} style={{ color: '#d4af70' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.35)' }}>
                  À venir
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingAppts.map(a => renderApptCard(a, 'upcoming'))}
              </div>
            </div>
          )}

          {/* Past */}
          {pastAppts.length > 0 && (
            <div className="hud-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Clock size={14} style={{ color: '#8a96a8' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.25)' }}>
                  Passés
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pastAppts.map(a => renderApptCard(a, 'past'))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
