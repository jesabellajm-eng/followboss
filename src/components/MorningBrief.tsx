import { Volume2, VolumeX, Sun, Coffee, Zap, Target, Mic, MicOff, Copy, Mail, Check, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { FollowUp, FollowUpStatus, MorningBriefData } from '../types';

interface MorningBriefProps {
  followUps: FollowUp[];
  onUpdateStatus?: (id: string, status: FollowUpStatus) => void;
}

type BriefPhase = 'idle' | 'speaking' | 'listening' | 'relance-ready' | 'dismissed';
type TonLevel = 'amical' | 'professionnel' | 'ferme' | 'urgent';

const tonLabels: Record<TonLevel, { label: string; emoji: string; color: string }> = {
  amical: { label: 'Amical', emoji: '', color: '#4ade80' },
  professionnel: { label: 'Pro', emoji: '', color: '#60a5fa' },
  ferme: { label: 'Ferme', emoji: '', color: '#fbbf24' },
  urgent: { label: 'Urgent', emoji: '', color: '#f87171' },
};

function getAutoTone(days: number): TonLevel {
  if (days <= 3) return 'amical';
  if (days <= 7) return 'professionnel';
  if (days <= 14) return 'ferme';
  return 'urgent';
}

const motivationalTips = [
  "80% des ventes se font après la 5ème relance. Continue!",
  "Un suivi régulier augmente tes conversions de 29%.",
  "Les clients respectent la persévérance. Relance avec confiance!",
  "Chaque relance te rapproche d'un OUI. Fonce!",
  "Les meilleurs closers relancent 7 fois en moyenne.",
  "Pas de réponse ≠ Non. C'est souvent = pas le bon moment.",
  "Ta prochaine relance pourrait être celle qui débloque tout.",
  "La discipline de relancer te distingue de 90% des gens.",
];

function buildBriefData(followUps: FollowUp[]): MorningBriefData {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const active = followUps.filter(f => f.status !== 'positive' && f.status !== 'expired');
  const urgent = active.filter(f => f.priority === 'haute');
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

  const yesterdayChanges = followUps.filter(f => f.history.some(h => h.date.startsWith(yesterday)));
  const positiveYesterday = yesterdayChanges.filter(f => f.status === 'positive').length;
  const negativeYesterday = yesterdayChanges.filter(f => f.status === 'negative').length;
  const noReplyYesterday = followUps.filter(f => f.status === 'no_reply').length;

  const totalPending = active.length;
  const totalRevenuePending = active.reduce((s, f) => s + (f.amount || 0), 0);

  const topPriority = urgent.length > 0 ? urgent[0] : active[0] || null;

  const tip = motivationalTips[Math.floor(Math.random() * motivationalTips.length)];

  return {
    greeting,
    todayTasks: active.filter(f => f.status === 'pending' || f.status === 'sent').length,
    urgentItems: urgent.length,
    positiveYesterday,
    negativeYesterday,
    noReplyYesterday,
    totalPending,
    totalRevenuePending,
    topPriority,
    motivationalTip: tip,
  };
}

function getActiveFollowUps(followUps: FollowUp[]): FollowUp[] {
  return followUps.filter(f => f.status !== 'positive' && f.status !== 'expired');
}

function getDaysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = { devis: 'devis', facture: 'facture', prospect: 'prospect', relance_generale: 'relance' };
  return labels[type] || 'relance';
}

function generateRelanceMessage(f: FollowUp, tone: TonLevel): string {
  const nom = f.clientName;
  const sujet = f.subject;
  const montant = f.amount ? `${f.amount.toLocaleString()}$` : '';
  const days = getDaysSince(f.lastFollowUpAt || f.createdAt);

  if (f.type === 'devis') {
    switch (tone) {
      case 'amical':
        return `Bonjour ${nom},\n\nJ'espère que vous allez bien! Je voulais simplement faire un petit suivi pour le devis concernant ${sujet}. Pas de pression, prenez votre temps!\n\nN'hésitez pas si vous avez des questions.\n\nBelle journée!`;
      case 'professionnel':
        return `Bonjour ${nom},\n\nJe me permets de revenir vers vous concernant le devis pour ${sujet}. Avez-vous eu le temps de le consulter?\n\nJe reste disponible pour en discuter à votre convenance.\n\nCordialement`;
      case 'ferme':
        return `Bonjour ${nom},\n\nJe fais suite à mon devis pour ${sujet} envoyé il y a ${days} jours. Je n'ai pas encore reçu de retour de votre part.\n\nPourriez-vous me confirmer si ce projet est toujours d'actualité pour vous? J'ai besoin de planifier mon calendrier.\n\nMerci de votre retour rapide.`;
      case 'urgent':
        return `Bonjour ${nom},\n\nCeci est un dernier suivi concernant le devis pour ${sujet}${montant ? ` (${montant})` : ''}, en attente depuis ${days} jours.\n\nSans retour de votre part d'ici 48h, je considérerai que le projet n'est plus d'actualité et je fermerai ce dossier.\n\nMerci de me revenir rapidement.`;
    }
  }

  if (f.type === 'facture') {
    switch (tone) {
      case 'amical':
        return `Bonjour ${nom},\n\nPetit rappel amical: la facture pour ${sujet}${montant ? ` de ${montant}` : ''} est en attente. C'est peut-être passé sous le radar!\n\nMerci d'avance`;
      case 'professionnel':
        return `Bonjour ${nom},\n\nJe me permets de vous rappeler que la facture concernant ${sujet}${montant ? ` d'un montant de ${montant}` : ''} est en attente de règlement.\n\nPourriez-vous me confirmer sa réception?\n\nMerci d'avance.`;
      case 'ferme':
        return `Bonjour ${nom},\n\nLa facture pour ${sujet}${montant ? ` de ${montant}` : ''} est en retard de ${days} jours. Malgré mes relances précédentes, je n'ai reçu aucun retour.\n\nJe vous demande de procéder au règlement dans les meilleurs délais.\n\nCordialement`;
      case 'urgent':
        return `Bonjour ${nom},\n\nIMPORTANT — La facture pour ${sujet}${montant ? ` de ${montant}` : ''} est impayée depuis ${days} jours.\n\nSans paiement sous 5 jours ouvrables, je devrai malheureusement engager des démarches de recouvrement.\n\nMerci de traiter ce dossier en priorité.`;
    }
  }

  if (f.type === 'prospect') {
    switch (tone) {
      case 'amical':
        return `Bonjour ${nom},\n\nJ'espère que tout va bien de votre côté! Je repensais à notre échange concernant ${sujet} et je me demandais si vous aviez eu le temps d'y réfléchir?\n\nAucune pression, je suis là si besoin!\n\nAu plaisir`;
      case 'professionnel':
        return `Bonjour ${nom},\n\nSuite à notre échange, je voulais savoir si vous aviez eu le temps de réfléchir à ma proposition concernant ${sujet}.\n\nJe serais ravie d'en discuter davantage.\n\nAu plaisir!`;
      case 'ferme':
        return `Bonjour ${nom},\n\nJe reviens vers vous concernant ${sujet}. Cela fait ${days} jours que j'attends votre retour.\n\nAfin de mieux organiser mon planning, pourriez-vous me donner votre décision cette semaine?\n\nMerci!`;
      case 'urgent':
        return `Bonjour ${nom},\n\nDernier message concernant ${sujet}. Je comprends que vous êtes occupé(e), mais j'ai besoin d'une réponse claire pour avancer.\n\nCette offre ne pourra pas rester ouverte indéfiniment. Merci de me revenir au plus tôt.\n\nCordialement`;
    }
  }

  // relance_generale
  switch (tone) {
    case 'amical':
      return `Bonjour ${nom},\n\nJe voulais juste prendre de vos nouvelles et faire un petit suivi concernant ${sujet}. J'espère que tout avance bien!\n\nBonne journée!`;
    case 'professionnel':
      return `Bonjour ${nom},\n\nJe me permets de vous relancer concernant ${sujet}. N'hésitez pas à me contacter si vous avez des questions.\n\nCordialement`;
    case 'ferme':
      return `Bonjour ${nom},\n\nJe vous recontacte au sujet de ${sujet}. Cela fait maintenant ${days} jours sans nouvelles.\n\nMerci de me confirmer l'état d'avancement.`;
    case 'urgent':
      return `Bonjour ${nom},\n\nCeci est ma dernière relance concernant ${sujet} (${days} jours sans réponse).\n\nSans retour de votre part sous 48h, je fermerai ce dossier.\n\nMerci.`;
  }
}

function generateEmailSubject(f: FollowUp): string {
  const typePrefix: Record<string, string> = {
    devis: 'Suivi devis', facture: 'Rappel facture', prospect: 'Suite à notre échange', relance_generale: 'Suivi',
  };
  return `${typePrefix[f.type] || 'Suivi'} — ${f.subject}`;
}

function buildSpeechText(data: MorningBriefData, activeFollowUps: FollowUp[]): string {
  const parts = [
    `${data.greeting}! Voici ton briefing du matin.`,
    `Tu as ${data.todayTasks} relance${data.todayTasks !== 1 ? 's' : ''} à traiter aujourd'hui.`,
  ];
  if (data.urgentItems > 0) {
    parts.push(`Attention, ${data.urgentItems} sont urgentes.`);
  }
  if (data.positiveYesterday > 0 || data.negativeYesterday > 0) {
    parts.push(`Hier: ${data.positiveYesterday} réponse${data.positiveYesterday !== 1 ? 's' : ''} positive${data.positiveYesterday !== 1 ? 's' : ''}, ${data.negativeYesterday} négative${data.negativeYesterday !== 1 ? 's' : ''}.`);
  }
  if (data.totalRevenuePending > 0) {
    parts.push(`${data.totalRevenuePending.toLocaleString()} dollars de revenus en attente.`);
  }

  // List each active follow-up
  activeFollowUps.forEach((f, i) => {
    const days = getDaysSince(f.createdAt);
    const typeLabel = getTypeLabel(f.type);
    const amountPart = f.amount ? ` de ${f.amount.toLocaleString()} dollars` : '';
    parts.push(`Relance numéro ${i + 1}: ${f.clientName}, ${typeLabel}${amountPart}, en attente depuis ${days} jour${days !== 1 ? 's' : ''}.`);
  });

  parts.push('Voulez-vous que je procède aux relances?');
  return parts.join(' ');
}

function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

function openMailto(email: string, subject: string, body: string) {
  window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
}

const MorningBrief: React.FC<MorningBriefProps> = ({ followUps, onUpdateStatus }) => {
  const [briefData, setBriefData] = useState<MorningBriefData | null>(null);
  const [phase, setPhase] = useState<BriefPhase>('idle');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [voiceText, setVoiceText] = useState('');
  const [toneOverrides, setToneOverrides] = useState<Record<string, TonLevel>>({});

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);

  const activeFollowUps = getActiveFollowUps(followUps);

  useEffect(() => {
    setBriefData(buildBriefData(followUps));
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    } else {
      setSpeechSupported(false);
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionSupported(false);
    }
  }, [followUps]);

  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    const voices = synthRef.current.getVoices();
    const frVoice = voices.find(v => v.lang.startsWith('fr'));
    if (frVoice) utterance.voice = frVoice;
    utterance.onend = () => { if (onEnd) onEnd(); };
    utterance.onerror = () => { if (onEnd) onEnd(); };
    synthRef.current.speak(utterance);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      setVoiceText(transcript);

      const positiveResponses = ['oui', 'ouais', 'vas-y', 'go', 'procède', 'envoie', 'ok', 'yes', 'allez', "d'accord"];
      const negativeResponses = ['non', 'pas maintenant', 'plus tard', 'annule', 'stop', 'arrête'];

      if (positiveResponses.some(r => transcript.includes(r))) {
        speakText('Parfait! Je prépare vos messages de relance.', () => {
          setPhase('relance-ready');
        });
      } else if (negativeResponses.some(r => transcript.includes(r))) {
        speakText('Pas de problème. Vos relances vous attendent quand vous serez prête.', () => {
          setPhase('dismissed');
        });
      } else {
        // Unrecognized — treat as negative
        speakText("Je n'ai pas compris. Vos relances restent disponibles.", () => {
          setPhase('dismissed');
        });
      }
    };

    recognition.onerror = () => {
      setPhase('dismissed');
    };

    recognition.onend = () => {
      // If still in listening phase after end without result, dismiss
    };

    recognitionRef.current = recognition;
    recognition.start();
    setPhase('listening');
  }, [speakText]);

  const startBriefing = useCallback(() => {
    if (!synthRef.current || !briefData) return;
    setPhase('speaking');
    const text = buildSpeechText(briefData, activeFollowUps);
    speakText(text, () => {
      if (recognitionSupported) {
        startListening();
      } else {
        setPhase('relance-ready');
      }
    });
  }, [briefData, activeFollowUps, speakText, recognitionSupported, startListening]);

  const stopAll = useCallback(() => {
    synthRef.current?.cancel();
    try { recognitionRef.current?.stop(); } catch {}
    setPhase('idle');
  }, []);

  const handleCopy = useCallback((id: string, text: string) => {
    copyToClipboard(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const handleSend = useCallback((f: FollowUp) => {
    const days = getDaysSince(f.lastFollowUpAt || f.createdAt);
    const tone = toneOverrides[f.id] || getAutoTone(days);
    const subject = generateEmailSubject(f);
    const body = generateRelanceMessage(f, tone);
    openMailto(f.clientEmail, subject, body);
  }, [toneOverrides]);

  const toggleDone = useCallback((id: string) => {
    setDoneIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (onUpdateStatus) onUpdateStatus(id, 'sent');
      }
      return next;
    });
  }, [onUpdateStatus]);

  const showRelanceCards = useCallback(() => {
    setPhase('relance-ready');
  }, []);

  if (!briefData) return null;

  return (
    <div className="page-container">
      <h1 className="page-title">Morning Brief</h1>
      <p className="page-subtitle">Ton assistant vocal interactif te résume la journée</p>

      {/* Voice Button */}
      <div className="morning-gradient" style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <Coffee size={40} style={{ color: '#818cf8', marginBottom: 8 }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{briefData.greeting}!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: 8 }}>
            {new Date().toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {speechSupported ? (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {phase === 'idle' || phase === 'dismissed' ? (
              <>
                <button
                  className="btn-premium"
                  onClick={startBriefing}
                  style={{ padding: '16px 32px', fontSize: '1rem', borderRadius: 16 }}
                >
                  <Volume2 size={20} />
                  Écouter le briefing
                </button>
                {activeFollowUps.length > 0 && (
                  <button
                    className="btn-ghost"
                    onClick={showRelanceCards}
                    style={{ padding: '16px 24px', fontSize: '0.9rem', borderRadius: 16 }}
                  >
                    Voir les relances
                  </button>
                )}
              </>
            ) : phase === 'speaking' ? (
              <button
                className="btn-premium speaking"
                onClick={stopAll}
                style={{ padding: '16px 32px', fontSize: '1rem', borderRadius: 16 }}
              >
                <VolumeX size={20} />
                Arrêter
              </button>
            ) : phase === 'listening' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '2px solid #38bdf8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'pulse 1.5s infinite',
                }}>
                  <Mic size={36} style={{ color: '#38bdf8' }} />
                </div>
                <p style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.95rem' }}>
                  En attente de votre réponse...
                </p>
                {voiceText && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Entendu: «{voiceText}»
                  </p>
                )}
                <button className="btn-ghost" onClick={stopAll} style={{ fontSize: '0.85rem' }}>
                  <MicOff size={14} /> Annuler
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Synthèse vocale non disponible
            </p>
            {activeFollowUps.length > 0 && (
              <button className="btn-ghost" onClick={showRelanceCards} style={{ padding: '12px 24px', fontSize: '0.9rem', borderRadius: 16 }}>
                Voir les relances
              </button>
            )}
          </div>
        )}
      </div>

      {/* Relance Action Cards */}
      {phase === 'relance-ready' && activeFollowUps.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={20} style={{ color: '#38bdf8' }} />
            Messages de relance prêts
            <span style={{
              fontSize: '0.75rem', background: 'rgba(56,189,248,0.15)', color: '#38bdf8',
              padding: '2px 10px', borderRadius: 12, fontWeight: 600,
            }}>
              {activeFollowUps.length}
            </span>
          </h2>

          {activeFollowUps.map((f) => {
            const days = getDaysSince(f.lastFollowUpAt || f.createdAt);
            const autoTone = getAutoTone(days);
            const currentTone = toneOverrides[f.id] || autoTone;
            const toneInfo = tonLabels[currentTone];
            const message = generateRelanceMessage(f, currentTone);
            const isDone = doneIds.has(f.id);
            const isCopied = copiedId === f.id;

            return (
              <div
                key={f.id}
                className="glass-card"
                style={{
                  marginBottom: 16,
                  borderColor: isDone ? 'rgba(52,211,153,0.4)' : `${toneInfo.color}33`,
                  boxShadow: isDone
                    ? '0 0 20px rgba(52,211,153,0.1)'
                    : `0 0 20px ${toneInfo.color}15`,
                  opacity: isDone ? 0.7 : 1,
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <button
                    onClick={() => toggleDone(f.id)}
                    style={{
                      background: isDone ? '#34d399' : 'transparent',
                      border: isDone ? '2px solid #34d399' : '2px solid rgba(255,255,255,0.2)',
                      borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s ease', flexShrink: 0,
                    }}
                  >
                    {isDone && <Check size={16} style={{ color: '#fff' }} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', textDecoration: isDone ? 'line-through' : 'none' }}>
                        {f.clientName}
                      </span>
                      <span className={`priority-dot ${f.priority}`} />
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                        background: (f.type === 'prospect' ? '#fbbf24' : f.type === 'devis' ? '#f87171' : f.type === 'facture' ? '#60a5fa' : '#4ade80') + '33',
                        color: f.type === 'prospect' ? '#fbbf24' : f.type === 'devis' ? '#f87171' : f.type === 'facture' ? '#60a5fa' : '#4ade80',
                        textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>{f.type === 'devis' ? 'Devis' : f.type === 'facture' ? 'Facture' : f.type === 'prospect' ? 'Prospect' : 'Client'}</span>
                      {f.amount && (
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa' }}>
                          {f.amount.toLocaleString()}$
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                      {f.subject} · <span style={{ color: days > 7 ? '#f87171' : '#fbbf24' }}>{days}j sans réponse</span>
                    </p>
                  </div>
                  {isDone && <CheckCircle2 size={24} style={{ color: '#34d399', flexShrink: 0 }} />}
                </div>

                {/* Tone Selector */}
                {!isDone && (
                  <>
                    <div style={{
                      display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 4 }}>Ton:</span>
                      {(Object.keys(tonLabels) as TonLevel[]).map((t) => {
                        const info = tonLabels[t];
                        const isActive = t === currentTone;
                        return (
                          <button
                            key={t}
                            onClick={() => setToneOverrides(prev => ({ ...prev, [f.id]: t }))}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 20,
                              fontSize: '0.75rem',
                              fontWeight: isActive ? 700 : 500,
                              border: isActive ? `2px solid ${info.color}` : '1px solid rgba(255,255,255,0.1)',
                              background: isActive ? `${info.color}20` : 'transparent',
                              color: isActive ? info.color : 'var(--text-muted)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {info.emoji} {info.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Auto-detected tone badge */}
                    {!toneOverrides[f.id] && (
                      <div style={{
                        fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        Auto-détecté: {toneInfo.emoji} {toneInfo.label} ({days}j de retard)
                      </div>
                    )}

                    {/* Message preview */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${toneInfo.color}15`,
                      borderRadius: 12, padding: 16, marginBottom: 12,
                      fontSize: '0.88rem', lineHeight: 1.7,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-line',
                    }}>
                      {message}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn-ghost"
                        onClick={() => handleCopy(f.id, message)}
                        style={{
                          fontSize: '0.85rem', padding: '8px 16px',
                          color: isCopied ? '#34d399' : undefined,
                          borderColor: isCopied ? 'rgba(52,211,153,0.4)' : undefined,
                        }}
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        {isCopied ? 'Copié ✓' : 'Copier'}
                      </button>
                      <button
                        className="btn-premium"
                        onClick={() => handleSend(f)}
                        style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      >
                        <Mail size={14} />
                        Envoyer
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Summary when all done */}
          {doneIds.size === activeFollowUps.length && activeFollowUps.length > 0 && (
            <div className="glass-card" style={{
              textAlign: 'center', padding: 24,
              background: 'linear-gradient(135deg, rgba(52,211,153,0.1), rgba(56,189,248,0.1))',
              borderColor: 'rgba(52,211,153,0.3)',
            }}>
              <CheckCircle2 size={48} style={{ color: '#34d399', margin: '0 auto 12px' }} />
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#34d399' }}>
                Toutes les relances sont traitées!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 8 }}>
                Excellent travail! Continue comme ça.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Brief Stats — show always except when in relance-ready phase */}
      {phase !== 'relance-ready' && (
        <>
          <div className="brief-stat-row" style={{ marginBottom: 20 }}>
            <div className="brief-stat">
              <Zap size={20} style={{ color: '#fbbf24', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24' }}>{briefData.todayTasks}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>À traiter</div>
            </div>
            <div className="brief-stat">
              <Target size={20} style={{ color: '#f87171', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f87171' }}>{briefData.urgentItems}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Urgentes</div>
            </div>
            <div className="brief-stat">
              <Sun size={20} style={{ color: '#4ade80', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#4ade80' }}>{briefData.positiveYesterday}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>+ hier</div>
            </div>
            <div className="brief-stat">
              <div style={{ fontSize: '1.2rem', marginBottom: 8 }}></div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#60a5fa' }}>{briefData.totalRevenuePending.toLocaleString()}$</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>En attente</div>
            </div>
          </div>

          {/* Yesterday recap */}
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Récap d'hier</h3>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <span> <strong style={{ color: '#4ade80' }}>{briefData.positiveYesterday}</strong> positif{briefData.positiveYesterday !== 1 ? 's' : ''}</span>
              <span> <strong style={{ color: '#f87171' }}>{briefData.negativeYesterday}</strong> négatif{briefData.negativeYesterday !== 1 ? 's' : ''}</span>
              <span> <strong style={{ color: '#fbbf24' }}>{briefData.noReplyYesterday}</strong> sans réponse</span>
            </div>
          </div>

          {/* Top Priority */}
          {briefData.topPriority && (
            <div className="glass-card" style={{ marginBottom: 20, borderColor: 'rgba(239,68,68,0.3)' }}>
              <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Priorité #1 du jour</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`priority-dot ${briefData.topPriority.priority}`} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{briefData.topPriority.clientName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{briefData.topPriority.subject}</div>
                </div>
                {briefData.topPriority.amount && (
                  <div style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.2rem', color: '#60a5fa' }}>
                    {briefData.topPriority.amount.toLocaleString()}$
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Motivational tip */}
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.08))', borderColor: 'rgba(34,197,94,0.2)' }}>
            <p style={{ fontSize: '1rem', lineHeight: 1.6, textAlign: 'center' }}>
              {briefData.motivationalTip}
            </p>
          </div>

          {/* Text version */}
          <div className="glass-card" style={{ marginTop: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Version texte du briefing</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {buildSpeechText(briefData, activeFollowUps)}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default MorningBrief;
