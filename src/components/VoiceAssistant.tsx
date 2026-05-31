import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, X, Headphones } from 'lucide-react';
import type { Page, FollowUp, Invoice, Prospect, Appointment } from '../types';

interface SerenaProps {
  onNavigate: (page: Page) => void;
  followUps: FollowUp[];
  invoices: Invoice[];
  prospects: Prospect[];
  appointments: Appointment[];
  onAddAppointment: (data: Omit<Appointment, 'id' | 'reminded'>) => void;
  onDeleteAppointment: (id: string) => void;
  fullPage?: boolean;
}

/* ── Helpers ─────────────────────────────────────────────── */

const ONES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function numToFr(n: number): string {
  if (n === 0) return 'zéro';
  if (n < 0) return 'moins ' + numToFr(-n);
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) {
      const base = t === 7 ? 'soixante' : 'quatre-vingt';
      const rest = (t === 7 ? 10 : 10) + u;
      return rest < 20 ? `${base}-${ONES[rest]}` : `${base}-${numToFr(rest)}`;
    }
    if (u === 0) return t === 8 ? 'quatre-vingts' : TENS[t];
    if (u === 1 && t !== 8) return `${TENS[t]} et un`;
    return `${TENS[t]}-${ONES[u]}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const prefix = h === 1 ? 'cent' : `${ONES[h]} cent${rest === 0 && h > 1 ? 's' : ''}`;
    return rest === 0 ? prefix : `${prefix} ${numToFr(rest)}`;
  }
  if (n < 1000000) {
    const k = Math.floor(n / 1000);
    const rest = n % 1000;
    const prefix = k === 1 ? 'mille' : `${numToFr(k)} mille`;
    return rest === 0 ? prefix : `${prefix} ${numToFr(rest)}`;
  }
  const m = Math.floor(n / 1000000);
  const rest = n % 1000000;
  const prefix = m === 1 ? 'un million' : `${numToFr(m)} millions`;
  return rest === 0 ? prefix : `${prefix} ${numToFr(rest)}`;
}

function formatMoney(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'zéro dollar';
  const fr = numToFr(rounded);
  return `${fr} dollar${rounded > 1 ? 's' : ''}`;
}

function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/* ── Navigation commands ─────────────────────────────────── */

const NAV_COMMANDS: Array<{ keywords: string[]; page: Page; response: string }> = [
  { keywords: ['tableau de bord', 'accueil', 'dashboard', 'retour', 'page principale', 'début'], page: 'dashboard', response: 'Retour au tableau de bord.' },
  { keywords: ['calendrier', 'nouveau rendez-vous'], page: 'calendar', response: 'Ouverture du calendrier des rendez-vous.' },
  { keywords: ['facture', 'factures', 'montre-moi les factures', 'paiement'], page: 'invoices', response: 'Affichage des factures.' },
  { keywords: ['prospect', 'prospects', 'pipeline', 'nouveau client', 'clients potentiels', 'montre-moi les prospects'], page: 'prospects', response: 'Ouverture du pipeline de prospects.' },
  { keywords: ['ajouter', 'nouvelle relance', 'créer', 'nouveau suivi', 'ajouter une relance', 'créer une relance'], page: 'add', response: 'Ouverture du formulaire. Ajoutons une nouvelle relance.' },
  { keywords: ['mes relances', 'liste', 'toutes les relances', 'voir les relances'], page: 'list', response: 'Affichage de toutes vos relances.' },
  { keywords: ['rapport', 'statistiques', 'rapport du jour', 'stats', 'résultats'], page: 'reports', response: 'Ouverture du rapport du jour.' },
  { keywords: ['briefing', 'briefing du matin', 'matin'], page: 'morning-brief', response: 'Lancement du briefing du matin.' },
  { keywords: ['tarifs', 'prix', 'plans', 'abonnement', 'pricing', 'forfait'], page: 'pricing', response: 'Affichage des plans et tarifs.' },
];

/* ── Component ───────────────────────────────────────────── */

const VoiceAssistant: React.FC<SerenaProps> = ({
  onNavigate,
  followUps,
  invoices,
  prospects,
  appointments,
  onAddAppointment,
  onDeleteAppointment,
  fullPage = false,
}) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [supported, setSupported] = useState(true);
  const [handsFree, setHandsFree] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const recognitionRef = useRef<any>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handsFreeRef = useRef(false);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Keep ref in sync
  useEffect(() => { handsFreeRef.current = handsFree; }, [handsFree]);

  /* ── Voice selection ────────────────────────────────── */
  useEffect(() => {
    function pickVoice() {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      // Score each French voice — prefer warm, friendly female voices
      const frVoices = voices.filter(v => v.lang.startsWith('fr'));
      if (!frVoices.length) return;

      const warmNames = ['amelie', 'chloe', 'lea', 'marie', 'audrey', 'virginie', 'sara', 'anna', 'elsa', 'denise', 'sylvie'];
      const maleNames = ['thomas', 'nicolas', 'luc', 'pierre', 'jacques', 'henri', 'paul'];

      let best: SpeechSynthesisVoice | null = null;
      let bestScore = -1;

      for (const voice of frVoices) {
        let score = 0;
        const n = voice.name.toLowerCase();

        // Microsoft Online Natural voices = most human-sounding
        if (n.includes('microsoft') && n.includes('online') && n.includes('natural')) score += 15;
        else if (n.includes('microsoft') && n.includes('online')) score += 12;
        // Google voices = natural on Android/Chrome
        if (n.includes('google')) score += 10;
        // Warm female names
        if (warmNames.some(w => n.includes(w))) score += 8;
        // Female tag
        if (/female|femme/i.test(n)) score += 6;
        // Avoid male voices entirely
        if (maleNames.some(c => n.includes(c))) score -= 15;
        if (/\bmale\b/i.test(n) && !/female/i.test(n)) score -= 12;
        // fr-FR slightly preferred (smoother)
        if (voice.lang === 'fr-FR') score += 2;

        if (score > bestScore) { bestScore = score; best = voice; }
      }
      if (best) selectedVoiceRef.current = best;
    }

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  /* ── Init ───────────────────────────────────────────── */
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSupported(false);
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
      window.speechSynthesis.cancel();
    };
  }, []);

  /* ── Speak ──────────────────────────────────────────── */
  const speak = useCallback((text: string, onDone?: () => void) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-FR';
    utter.rate = 0.88;  // Plus calme, posé — comme une vraie assistante
    utter.pitch = 1.08; // Légèrement plus aigu = plus chaleureux et sympathique
    if (selectedVoiceRef.current) utter.voice = selectedVoiceRef.current;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => {
      setSpeaking(false);
      onDone?.();
    };
    utter.onerror = () => {
      setSpeaking(false);
      onDone?.();
    };
    window.speechSynthesis.speak(utter);
  }, []);

  /* ── Conversational logic ───────────────────────────── */
  const processCommand = useCallback((text: string) => {
    const lower = text.toLowerCase().trim();

    const reply = (msg: string, navPage?: Page, delay?: number) => {
      setResponse(msg);
      speak(msg, () => {
        if (handsFreeRef.current) {
          // Auto-restart listening after speaking
          setTimeout(() => startListeningInner(), 400);
        }
      });
      if (navPage) setTimeout(() => onNavigate(navPage), delay ?? 600);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (!handsFreeRef.current) {
        hideTimeoutRef.current = setTimeout(() => setShowBubble(false), 5000);
      }
    };

    // ── Exit / Stop ──
    if (/\b(merci|au revoir|stop|merci serena|bonne nuit)\b/.test(lower)) {
      setHandsFree(false);
      handsFreeRef.current = false;
      reply('Avec plaisir! Je suis là si vous avez besoin. Passe une belle journée!');
      hideTimeoutRef.current = setTimeout(() => setShowBubble(false), 4000);
      return;
    }

    // ── Greetings ──
    if (/\b(bonjour|salut|hey|hello|coucou)\b/.test(lower) && !/briefing/.test(lower)) {
      reply('Hey! C\'est Serena. Qu\'est-ce que je peux faire pour toi aujourd\'hui?');
      return;
    }

    // ── Summary / Brief ──
    if (/\b(résumé|comment ça va|briefing|brief|résume|bilan)\b/.test(lower) && !/briefing du matin|matin/.test(lower)) {
      const activeFollowUps = followUps.filter(f => !['positive', 'expired'].includes(f.status));
      const overdueInvoices = invoices.filter(i => i.status === 'overdue');
      const overdueTotal = overdueInvoices.reduce((s, i) => s + i.amount, 0);
      const today = todayStr();
      const todayAppts = appointments.filter(a => a.date === today);
      const activeProspects = prospects.filter(p => !['gagne', 'perdu'].includes(p.stage));

      const msg = `Voici ton résumé. Vous avez ${numToFr(activeFollowUps.length)} relance${activeFollowUps.length > 1 ? 's' : ''} active${activeFollowUps.length > 1 ? 's' : ''}, ${numToFr(overdueInvoices.length)} facture${overdueInvoices.length > 1 ? 's' : ''} en retard pour ${formatMoney(overdueTotal)}, ${numToFr(todayAppts.length)} rendez-vous aujourd'hui, et ${numToFr(activeProspects.length)} prospect${activeProspects.length > 1 ? 's' : ''} dans le pipeline. Voulez-vous que je vous montre les détails?`;
      reply(msg);
      return;
    }

    // ── Follow-up queries ──
    if (/\b(relances?\s*urgente|urgent)\b/.test(lower)) {
      const urgent = followUps.filter(f => f.priority === 'haute' && !['positive', 'expired'].includes(f.status));
      if (urgent.length === 0) {
        reply('Bonne nouvelle! Aucune relance urgente en ce moment.');
      } else {
        const names = urgent.slice(0, 3).map(f => `${f.clientName}${f.amount ? ' pour ' + formatMoney(f.amount) : ''}`).join(', ');
        reply(`Vous avez ${numToFr(urgent.length)} relance${urgent.length > 1 ? 's' : ''} urgente${urgent.length > 1 ? 's' : ''}. ${names}. Voulez-vous que je vous montre les détails?`);
      }
      return;
    }

    if (/\b(combien de relances|mes relances|relances)\b/.test(lower) && !/voir|toutes|liste/.test(lower)) {
      const active = followUps.filter(f => !['positive', 'expired'].includes(f.status));
      const byStatus: Record<string, number> = {};
      active.forEach(f => { byStatus[f.status] = (byStatus[f.status] || 0) + 1; });
      const statusLabels: Record<string, string> = { pending: 'en attente', sent: 'envoyées', no_reply: 'sans réponse', negative: 'négatives' };
      const details = Object.entries(byStatus).map(([s, c]) => `${numToFr(c)} ${statusLabels[s] || s}`).join(', ');
      reply(`Vous avez ${numToFr(active.length)} relance${active.length > 1 ? 's' : ''} active${active.length > 1 ? 's' : ''}. ${details}. Voulez-vous que je vous montre les détails?`);
      return;
    }

    if (/\b(qui dois-je relancer|qui relancer)\b/.test(lower)) {
      const toFollow = followUps.filter(f => ['sent', 'pending', 'no_reply'].includes(f.status));
      if (toFollow.length === 0) {
        reply('Personne à relancer pour le moment. Tout est à jour!');
      } else {
        const names = toFollow.slice(0, 4).map(f => f.clientName).join(', ');
        reply(`Vous devez relancer ${numToFr(toFollow.length)} client${toFollow.length > 1 ? 's' : ''}. Notamment ${names}. Voulez-vous que je vous montre la liste?`);
      }
      return;
    }

    // ── Invoice queries ──
    if (/\b(factures?\s*en\s*retard|impayé|impayés)\b/.test(lower)) {
      const overdue = invoices.filter(i => i.status === 'overdue');
      if (overdue.length === 0) {
        reply('Aucune facture en retard. Tout est en ordre!');
      } else {
        const total = overdue.reduce((s, i) => s + i.amount, 0);
        const names = overdue.slice(0, 3).map(i => i.clientName).join(', ');
        reply(`Vous avez ${numToFr(overdue.length)} facture${overdue.length > 1 ? 's' : ''} en retard pour un total de ${formatMoney(total)}. Clients concernés: ${names}. Voulez-vous que je vous montre les détails?`);
      }
      return;
    }

    if (/\b(combien on me doit|argent|total dû|montant dû)\b/.test(lower)) {
      const owed = invoices.filter(i => i.status === 'overdue' || i.status === 'pending');
      const total = owed.reduce((s, i) => s + i.amount, 0);
      reply(`On vous doit un total de ${formatMoney(total)} sur ${numToFr(owed.length)} facture${owed.length > 1 ? 's' : ''}. Voulez-vous voir le détail?`);
      return;
    }

    // ── Prospect queries ──
    if (/\b(nouveaux?\s*prospect|nouveau\s*prospect)\b/.test(lower)) {
      const newP = prospects.filter(p => p.stage === 'nouveau');
      if (newP.length === 0) {
        reply('Pas de nouveau prospect pour le moment.');
      } else {
        const names = newP.slice(0, 3).map(p => p.name).join(', ');
        reply(`Vous avez ${numToFr(newP.length)} nouveau${newP.length > 1 ? 'x' : ''} prospect${newP.length > 1 ? 's' : ''}. ${names}. Voulez-vous que je vous montre le pipeline?`);
      }
      return;
    }

    if (/\b(mes prospects|pipeline|prospect)\b/.test(lower) && !/montre|voir|ouvr/.test(lower)) {
      const active = prospects.filter(p => !['gagne', 'perdu'].includes(p.stage));
      const totalValue = active.reduce((s, p) => s + (p.estimatedValue || 0), 0);
      const byStage: Record<string, number> = {};
      active.forEach(p => { byStage[p.stage] = (byStage[p.stage] || 0) + 1; });
      const stageLabels: Record<string, string> = { nouveau: 'nouveaux', contacte: 'contactés', qualifie: 'qualifiés', proposition: 'en proposition' };
      const details = Object.entries(byStage).map(([s, c]) => `${numToFr(c)} ${stageLabels[s] || s}`).join(', ');
      reply(`Vous avez ${numToFr(active.length)} prospect${active.length > 1 ? 's' : ''} actif${active.length > 1 ? 's' : ''}: ${details}. Valeur estimée totale: ${formatMoney(totalValue)}. Voulez-vous que je vous montre les détails?`);
      return;
    }

    // ── Appointment queries ──
    if (/\b(rendez-vous aujourd|agenda|mon planning|planning)\b/.test(lower) && !/nouveau|calendrier/.test(lower)) {
      const today = todayStr();
      const todayAppts = appointments.filter(a => a.date === today);
      if (todayAppts.length === 0) {
        reply('Aucun rendez-vous prévu aujourd\'hui. Votre journée est libre!');
      } else {
        const list = todayAppts.slice(0, 3).map(a => `${a.time} avec ${a.clientName}`).join(', ');
        reply(`Vous avez ${numToFr(todayAppts.length)} rendez-vous aujourd'hui. ${list}. Voulez-vous voir votre calendrier?`);
      }
      return;
    }

    if (/\b(prochain rendez-vous|prochain rdv|prochaine réunion)\b/.test(lower)) {
      const now = new Date();
      const upcoming = appointments
        .filter(a => new Date(`${a.date}T${a.time}`) > now)
        .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
      if (upcoming.length === 0) {
        reply('Aucun rendez-vous à venir.');
      } else {
        const next = upcoming[0];
        reply(`Votre prochain rendez-vous est le ${next.date} à ${next.time} avec ${next.clientName}, sujet: ${next.subject}.`);
      }
      return;
    }

    // ── Calendar management: ADD appointment ──
    // Patterns: "ajoute un rendez-vous avec Marie demain à 14h", "rendez-vous avec Pierre lundi 10h"
    // "nouveau rdv avec Sophie après-demain 9h30 pour présentation devis"
    if (/\b(ajoute|nouveau|créer?|planifi|prend|book|fixe|met)\b.*\b(rendez-vous|rdv|rencontre|meeting)\b/.test(lower) ||
        /\b(rendez-vous|rdv)\b.*\b(avec)\b/.test(lower) && /\b(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|après-demain|aujourd)\b/.test(lower)) {
      
      // Extract client name after "avec"
      const nameMatch = lower.match(/avec\s+([a-zàâäéèêëïîôùûüÿç\-]+(?:\s+[a-zàâäéèêëïîôùûüÿç\-]+)?)/i);
      const clientName = nameMatch ? nameMatch[1].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
      
      // Extract time
      let hour = 10, minute = 0;
      const timeMatch = lower.match(/(\d{1,2})\s*[h:]\s*(\d{0,2})/);
      if (timeMatch) {
        hour = parseInt(timeMatch[1]);
        minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      } else if (/midi/.test(lower)) {
        hour = 12;
      } else if (/\b(matin)\b/.test(lower)) {
        hour = 9;
      } else if (/\b(après-midi|après midi)\b/.test(lower)) {
        hour = 14;
      }
      
      // Extract date
      const today = new Date();
      let targetDate = new Date(today);
      
      if (/demain/.test(lower)) {
        targetDate.setDate(today.getDate() + 1);
      } else if (/après-demain|après demain/.test(lower)) {
        targetDate.setDate(today.getDate() + 2);
      } else if (/aujourd/.test(lower)) {
        // today
      } else {
        // Day of week
        const dayNames: Record<string, number> = {
          'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4,
          'vendredi': 5, 'samedi': 6, 'dimanche': 0,
        };
        for (const [name, dayNum] of Object.entries(dayNames)) {
          if (lower.includes(name)) {
            const currentDay = today.getDay();
            let daysAhead = dayNum - currentDay;
            if (daysAhead <= 0) daysAhead += 7;
            targetDate.setDate(today.getDate() + daysAhead);
            break;
          }
        }
        // Check for specific date like "le 15" or "15 juin"
        const dateNumMatch = lower.match(/le\s+(\d{1,2})/);
        if (dateNumMatch) {
          const dayOfMonth = parseInt(dateNumMatch[1]);
          targetDate.setDate(dayOfMonth);
          if (targetDate < today) targetDate.setMonth(targetDate.getMonth() + 1);
        }
      }
      
      const dateStr = targetDate.toISOString().slice(0, 10);
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      
      // Extract subject (after "pour" or "sujet")
      const subjectMatch = lower.match(/(?:pour|sujet|concernant|à propos)\s+(.+?)(?:\s+(?:à|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|après)|$)/);
      const subject = subjectMatch 
        ? subjectMatch[1].charAt(0).toUpperCase() + subjectMatch[1].slice(1) 
        : 'Rendez-vous';
      
      if (!clientName) {
        reply('Avec qui souhaitez-vous prendre rendez-vous? Par exemple: ajoute un rendez-vous avec Marie demain à 14 heures.');
        return;
      }
      
      // Extract duration if mentioned
      let duration = 30;
      const durationMatch = lower.match(/(\d+)\s*min/);
      if (durationMatch) duration = parseInt(durationMatch[1]);
      else if (/une heure|1\s*h(?![\d])/.test(lower)) duration = 60;
      else if (/deux heures|2\s*h(?![\d])/.test(lower)) duration = 120;
      
      // Extract location
      const locationMatch = lower.match(/(?:chez|au|à|lieu)\s+(.+?)(?:\s+(?:pour|à|demain)|$)/);
      const location = locationMatch ? locationMatch[1] : undefined;
      
      // Look up client email from existing data
      const existingClient = [...followUps, ...invoices].find(
        item => item.clientName.toLowerCase().includes(clientName.toLowerCase())
      );
      const clientEmail = existingClient ? existingClient.clientEmail : '';
      
      const formattedDate = targetDate.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
      
      onAddAppointment({
        clientName,
        clientEmail,
        date: dateStr,
        time: timeStr,
        duration,
        subject,
        location,
      });
      
      reply(`C'est noté! Rendez-vous ajouté avec ${clientName}, ${formattedDate} à ${timeStr}, durée ${numToFr(duration)} minutes. ${subject}. Voulez-vous que je vous montre le calendrier?`, 'calendar', 2000);
      return;
    }

    // ── Calendar management: DELETE appointment ──
    if (/\b(supprime|annule|enlève|retire|cancel)\b.*\b(rendez-vous|rdv|rencontre|meeting)\b/.test(lower)) {
      const nameMatch = lower.match(/(?:avec|de)\s+([a-zàâäéèêëïîôùûüÿç\-]+(?:\s+[a-zàâäéèêëïîôùûüÿç\-]+)?)/i);
      
      if (nameMatch) {
        const searchName = nameMatch[1].toLowerCase();
        const found = appointments.find(a => a.clientName.toLowerCase().includes(searchName));
        
        if (found) {
          onDeleteAppointment(found.id);
          reply(`Le rendez-vous avec ${found.clientName} le ${found.date} à ${found.time} a été supprimé. Voulez-vous voir le calendrier?`, 'calendar', 2000);
        } else {
          reply(`Je n'ai pas trouvé de rendez-vous avec ${nameMatch[1]}. Voulez-vous que je vous montre le calendrier?`);
        }
      } else {
        // No name specified - delete next upcoming
        const now = new Date();
        const upcoming = appointments
          .filter(a => new Date(`${a.date}T${a.time}`) > now)
          .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
        
        if (upcoming.length > 0) {
          const next = upcoming[0];
          onDeleteAppointment(next.id);
          reply(`Le prochain rendez-vous avec ${next.clientName} le ${next.date} à ${next.time} a été annulé.`);
        } else {
          reply('Aucun rendez-vous à venir à supprimer.');
        }
      }
      return;
    }

    // ── Calendar management: MOVE/MODIFY appointment ──
    if (/\b(déplace|reporte|change|modifie|bouge|repousse|avance)\b.*\b(rendez-vous|rdv|rencontre|meeting)\b/.test(lower)) {
      const nameMatch = lower.match(/(?:avec|de)\s+([a-zàâäéèêëïîôùûüÿç\-]+(?:\s+[a-zàâäéèêëïîôùûüÿç\-]+)?)/i);
      
      if (nameMatch) {
        const searchName = nameMatch[1].toLowerCase();
        const found = appointments.find(a => a.clientName.toLowerCase().includes(searchName));
        
        if (found) {
          // Parse new time/date
          let newDate = new Date();
          const today = new Date();
          
          if (/demain/.test(lower)) {
            newDate.setDate(today.getDate() + 1);
          } else if (/après-demain|après demain/.test(lower)) {
            newDate.setDate(today.getDate() + 2);
          } else {
            const dayNames: Record<string, number> = {
              'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4,
              'vendredi': 5, 'samedi': 6, 'dimanche': 0,
            };
            for (const [name, dayNum] of Object.entries(dayNames)) {
              if (lower.includes(name)) {
                const currentDay = today.getDay();
                let daysAhead = dayNum - currentDay;
                if (daysAhead <= 0) daysAhead += 7;
                newDate.setDate(today.getDate() + daysAhead);
                break;
              }
            }
          }
          
          let hour = parseInt(found.time.split(':')[0]);
          let minute = parseInt(found.time.split(':')[1]);
          const timeMatch = lower.match(/(\d{1,2})\s*[h:]\s*(\d{0,2})/);
          if (timeMatch) {
            hour = parseInt(timeMatch[1]);
            minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          }
          
          const newDateStr = newDate.toISOString().slice(0, 10);
          const newTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          const formattedNewDate = newDate.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
          
          // Delete old + add new
          onDeleteAppointment(found.id);
          onAddAppointment({
            clientName: found.clientName,
            clientEmail: found.clientEmail,
            date: newDateStr,
            time: newTimeStr,
            duration: found.duration,
            subject: found.subject,
            location: found.location,
            notes: found.notes,
          });
          
          reply(`Rendez-vous avec ${found.clientName} déplacé au ${formattedNewDate} à ${newTimeStr}. C'est fait!`, 'calendar', 2000);
        } else {
          reply(`Je n'ai pas trouvé de rendez-vous avec ${nameMatch[1]}.`);
        }
      } else {
        reply('Avec qui est le rendez-vous que vous souhaitez déplacer?');
      }
      return;
    }

    // ── Calendar: what's coming up / this week ──
    if (/\b(cette semaine|semaine|prochains jours|jours à venir)\b/.test(lower) && /\b(rendez-vous|rdv|agenda|planning|quoi)\b/.test(lower)) {
      const today = new Date();
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7);
      const todayS = today.toISOString().slice(0, 10);
      const weekEndS = weekEnd.toISOString().slice(0, 10);
      
      const thisWeek = appointments
        .filter(a => a.date >= todayS && a.date <= weekEndS)
        .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date));
      
      if (thisWeek.length === 0) {
        reply('Aucun rendez-vous cette semaine. Votre agenda est libre!');
      } else {
        const list = thisWeek.slice(0, 5).map(a => {
          const dayName = new Date(a.date + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'long' });
          return `${dayName} à ${a.time} avec ${a.clientName}`;
        }).join('. ');
        reply(`Vous avez ${numToFr(thisWeek.length)} rendez-vous cette semaine. ${list}. Souhaitez-vous modifier quelque chose?`);
      }
      return;
    }

    // ── Action: appeler un contact ──
    if (/\b(appelle|appeler|téléphone|phone|call|numéro)\b/.test(lower)) {
      const nameMatch = lower.match(/(?:appelle|appeler|téléphone|phone|call|numéro)\s*(?:à|de|du|le|la)?\s*(.+)/);
      if (nameMatch) {
        const searchName = nameMatch[1].trim().replace(/^(le|la|du|de)\s+/, '');
        // Search across all data sources for the contact
        const fu = followUps.find(f => f.clientName.toLowerCase().includes(searchName));
        const inv = invoices.find(i => i.clientName.toLowerCase().includes(searchName));
        const prsp = prospects.find(p => p.name.toLowerCase().includes(searchName));
        const appt = appointments.find(a => a.clientName.toLowerCase().includes(searchName));
        
        const contactName = fu?.clientName || inv?.clientName || prsp?.name || appt?.clientName;
        const contactPhone = fu?.clientPhone || inv?.clientPhone || prsp?.phone || appt?.clientPhone;
        
        if (contactName && contactPhone) {
          reply(`${contactName}, numéro: ${contactPhone}. J'ouvre l'appel maintenant.`);
          setTimeout(() => { window.open(`tel:${contactPhone.replace(/[^+\d]/g, '')}`, '_self'); }, 2000);
        } else if (contactName) {
          reply(`J'ai trouvé ${contactName} mais je n'ai pas son numéro de téléphone. Voulez-vous lui envoyer un email?`);
        } else {
          reply(`Je n'ai pas trouvé de contact nommé "${searchName}" dans votre répertoire.`);
        }
        return;
      }
    }

    // ── Action: numéro d'un contact ──
    if (/\b(quel est le numéro|numéro de|coordonnées|contact de)\b/.test(lower)) {
      const nameMatch = lower.match(/(?:numéro de|contact de|coordonnées de|quel est le numéro de)\s*(.+)/);
      if (nameMatch) {
        const searchName = nameMatch[1].trim().replace(/^(le|la|du|de)\s+/, '');
        const fu = followUps.find(f => f.clientName.toLowerCase().includes(searchName));
        const inv = invoices.find(i => i.clientName.toLowerCase().includes(searchName));
        const prsp = prospects.find(p => p.name.toLowerCase().includes(searchName));
        const appt = appointments.find(a => a.clientName.toLowerCase().includes(searchName));
        
        const contactName = fu?.clientName || inv?.clientName || prsp?.name || appt?.clientName;
        const contactPhone = fu?.clientPhone || inv?.clientPhone || prsp?.phone || appt?.clientPhone;
        const contactEmail = fu?.clientEmail || inv?.clientEmail || prsp?.email || appt?.clientEmail;
        
        if (contactName) {
          let info = `${contactName}. `;
          if (contactPhone) info += `Téléphone: ${contactPhone}. `;
          if (contactEmail) info += `Email: ${contactEmail}. `;
          if (!contactPhone && !contactEmail) info += `Aucune coordonnée enregistrée.`;
          info += contactPhone ? ` Tu veux que je l'appelle?` : '';
          reply(info);
        } else {
          reply(`Je n'ai pas trouvé de contact nommé "${searchName}".`);
        }
        return;
      }
    }

    // ── Action: relance client ──
    if (/\b(relance\s+\w+)\b/.test(lower)) {
      const match = lower.match(/relance\s+(.+)/);
      if (match) {
        const name = match[1].trim();
        const fu = followUps.find(f => f.clientName.toLowerCase().includes(name));
        if (fu) {
          reply(`Relance pour ${fu.clientName}. ${fu.subject}. Je vous amène au briefing.`, 'morning-brief', 1200);
        } else {
          reply(`Je n'ai pas trouvé de client nommé ${name} dans vos relances.`);
        }
        return;
      }
    }

    // ── Navigation commands ──
    for (const cmd of NAV_COMMANDS) {
      if (cmd.keywords.some(kw => lower.includes(kw))) {
        reply(cmd.response, cmd.page);
        return;
      }
    }

    // ── Fallback ──
    reply('J\'ai pas bien compris! Vous pouvez me demander un résumé, vos relances, factures, prospects ou rendez-vous.');
  }, [followUps, invoices, prospects, appointments, onNavigate, onAddAppointment, onDeleteAppointment, speak]);

  /* ── Start listening ────────────────────────────────── */
  const startListeningInner = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setShowBubble(true);
      setTranscript('');
      setResponse("Je vous écoute...");
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript(final || interim);
      if (final) processCommand(final);
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      if (event.error === 'not-allowed') {
        setResponse('Microphone refusé. Veuillez autoriser l\'accès au micro.');
        speak('Veuillez autoriser l\'accès au microphone.');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setResponse('Erreur de reconnaissance. Réessayez.');
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    try {
      recognition.start();
    } catch {
      setListening(false);
      setResponse('Impossible de démarrer le micro.');
    }
  }, [processCommand, speak]);

  const startListening = useCallback(() => {
    startListeningInner();
  }, [startListeningInner]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
    if (handsFreeRef.current) {
      setHandsFree(false);
      handsFreeRef.current = false;
    }
  }, []);

  const toggleHandsFree = useCallback(() => {
    setHandsFree(prev => {
      const next = !prev;
      handsFreeRef.current = next;
      if (next && !listening) {
        startListeningInner();
      }
      return next;
    });
  }, [listening, startListeningInner]);

  if (!supported) return null;

  /* ── Full-page Serena view ───────────────────────────── */
  if (fullPage) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: 24,
      }}>
        {/* Avatar */}
        <div style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: listening
            ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
            : 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 60%, #38bdf8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: listening
            ? '0 0 60px rgba(239,68,68,0.4), 0 0 120px rgba(239,68,68,0.15)'
            : '0 0 60px rgba(6,182,212,0.35), 0 0 120px rgba(56,189,248,0.1)',
          animation: listening ? 'pulse-ring 1.5s infinite' : speaking ? 'handsfree-ring 2s infinite' : 'none',
          transition: 'all 0.4s ease',
        }}>
          <span style={{
            fontSize: '2.8rem',
            fontWeight: 700,
            color: 'white',
            letterSpacing: 2,
            textShadow: '0 2px 12px rgba(0,0,0,0.3)',
          }}>S</span>
        </div>

        {/* Name + Status */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: '1.6rem',
            fontWeight: 700,
            color: '#e8edf5',
            margin: 0,
            letterSpacing: 1,
          }}>Serena</h2>
          <p style={{
            fontSize: '0.85rem',
            color: listening ? '#ef4444' : speaking ? '#06b6d4' : '#8a96a8',
            margin: '6px 0 0',
            fontWeight: 600,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}>
            {listening ? 'À l\'écoute...' : speaking ? 'En train de parler...' : 'Assistante vocale'}
          </p>
        </div>

        {/* Sound wave when speaking */}
        {speaking && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 32 }}>
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{
                width: 4,
                borderRadius: 2,
                background: 'linear-gradient(to top, #06b6d4, #38bdf8)',
                animation: `wave-bar 0.8s ease-in-out ${i * 0.08}s infinite alternate`,
              }} />
            ))}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(56,189,248,0.15)',
            borderRadius: 12,
            padding: '12px 20px',
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
          }}>
            <span style={{ color: '#8a96a8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              Vous avez dit
            </span>
            <p style={{ color: '#b8c4d0', fontSize: '0.95rem', fontStyle: 'italic', margin: '6px 0 0' }}>
              &quot;{transcript}&quot;
            </p>
          </div>
        )}

        {/* Response */}
        {response && (
          <div style={{
            background: 'rgba(6,182,212,0.06)',
            border: '1px solid rgba(6,182,212,0.2)',
            borderRadius: 12,
            padding: '14px 20px',
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
          }}>
            <span style={{ color: '#06b6d4', fontSize: '0.75rem', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              Serena
            </span>
            <p style={{ color: '#e8edf5', fontSize: '0.95rem', margin: '6px 0 0', lineHeight: 1.5 }}>
              {response}
            </p>
          </div>
        )}

        {/* Large mic button */}
        <button
          onClick={listening ? stopListening : startListening}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: listening
              ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
              : 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
            border: listening
              ? '3px solid rgba(239,68,68,0.7)'
              : '3px solid rgba(56,189,248,0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: listening
              ? '0 0 40px rgba(239,68,68,0.4)'
              : '0 4px 30px rgba(56,189,248,0.4)',
            transition: 'all 0.3s ease',
            animation: listening ? 'pulse-ring 1.5s infinite' : 'none',
            marginTop: 8,
          }}
        >
          {listening ? <MicOff size={32} color="white" /> : <Mic size={32} color="white" />}
        </button>

        <span style={{
          fontSize: '0.8rem',
          color: listening ? '#ef4444' : '#8a96a8',
          fontWeight: 600,
          letterSpacing: 1,
        }}>
          {listening ? 'Appuyez pour arrêter' : 'Appuyez pour parler'}
        </span>

        {/* Hands-free toggle */}
        <button
          onClick={toggleHandsFree}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: handsFree ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${handsFree ? 'rgba(6,182,212,0.35)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10,
            padding: '10px 20px',
            cursor: 'pointer',
            color: handsFree ? '#06b6d4' : '#8a96a8',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          <Headphones size={18} />
          Mode mains-libres {handsFree ? 'ON' : 'OFF'}
        </button>

        {/* Quick commands hint */}
        <div style={{
          marginTop: 8,
          padding: '16px 20px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          maxWidth: 400,
          width: '100%',
        }}>
          <p style={{ color: '#8a96a8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px', textAlign: 'center' }}>
            Commandes vocales
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'Ajouter un rendez-vous demain à 14h avec...',
              'Lister mon planning de demain',
              'Supprimer le rendez-vous de...',
              'Appelez [nom du contact]',
            ].map((cmd, i) => (
              <p key={i} style={{ color: '#b8c4d0', fontSize: '0.8rem', margin: 0, paddingLeft: 12, borderLeft: '2px solid rgba(6,182,212,0.2)' }}>
                {cmd}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Bubble */}
      {showBubble && (
        <div style={{
          position: 'fixed',
          bottom: 90,
          right: 20,
          maxWidth: 340,
          background: 'rgba(4,5,10,0.97)',
          border: `1px solid ${listening ? 'rgba(239,68,68,0.4)' : 'rgba(56,189,248,0.35)'}`,
          borderRadius: 16,
          padding: '14px 18px 14px 14px',
          backdropFilter: 'blur(24px)',
          zIndex: 9999,
          boxShadow: listening
            ? '0 0 30px rgba(239,68,68,0.2)'
            : '0 0 30px rgba(56,189,248,0.15)',
          transition: 'border-color 0.3s',
        }}>
          <button
            onClick={() => setShowBubble(false)}
            style={{
              position: 'absolute', top: 8, right: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(232,237,245,0.4)', padding: 2, lineHeight: 1,
            }}
          >
            <X size={12} />
          </button>

          {/* Header with avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {/* Avatar */}
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: 'white',
              boxShadow: '0 0 8px rgba(6,182,212,0.4)',
              flexShrink: 0,
            }}>S</div>

            {/* Status indicator */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: listening ? '#ef4444' : speaking ? '#06b6d4' : '#38bdf8',
              boxShadow: listening ? '0 0 8px #ef4444' : '0 0 8px #38bdf8',
              animation: listening ? 'blink-dot 1s infinite' : speaking ? 'speaking-wave 0.6s infinite' : 'none',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '0.7rem',
              color: 'rgba(232,237,245,0.5)',
              letterSpacing: 1,
              textTransform: 'uppercase',
              textShadow: '0 0 12px rgba(6,182,212,0.3)',
            }}>
              {listening ? 'À l\'écoute...' : speaking ? 'Serena parle...' : 'Serena'}
            </span>
          </div>

          {/* Speaking wave indicator */}
          {speaking && (
            <div style={{ display: 'flex', gap: 2, marginBottom: 8, alignItems: 'center', height: 16 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  width: 3, borderRadius: 2,
                  background: 'rgba(6,182,212,0.6)',
                  animation: `wave-bar 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                }} />
              ))}
            </div>
          )}

          {transcript && (
            <div style={{
              color: 'rgba(232,237,245,0.65)',
              fontSize: '0.78rem',
              marginBottom: 8,
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}>
              &quot;{transcript}&quot;
            </div>
          )}

          <div style={{
            color: '#e8edf5',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            fontWeight: 500,
          }}>
            {response || 'Serena — Assistante FollowBoss'}
          </div>

          {/* Hands-free toggle */}
          <button
            onClick={toggleHandsFree}
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: handsFree ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${handsFree ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              color: handsFree ? '#06b6d4' : 'rgba(232,237,245,0.5)',
              fontSize: '0.72rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <Headphones size={14} />
            Mode mains-libres {handsFree ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {/* Floating mic button with label */}
      <div style={{
        position: 'fixed',
        bottom: 30,
        right: 16,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{
          fontSize: '0.65rem',
          color: listening ? '#ef4444' : '#38bdf8',
          letterSpacing: 1,
          textTransform: 'uppercase',
          fontWeight: 700,
          textShadow: '0 1px 6px rgba(0,0,0,0.8)',
        }}>
          {listening ? 'Stop' : 'Serena'}
        </span>
        <button
          onClick={listening ? stopListening : startListening}
          title={listening ? 'Arrêter l\'écoute' : 'Parler à Serena'}
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: listening
              ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
              : 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
            border: listening
              ? '3px solid rgba(239,68,68,0.7)'
              : '3px solid rgba(56,189,248,0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: listening
              ? '0 0 0 0 rgba(239,68,68,0.4), 0 0 24px rgba(239,68,68,0.3)'
              : handsFree
                ? '0 0 0 0 rgba(6,182,212,0.5), 0 4px 24px rgba(56,189,248,0.4)'
                : '0 4px 24px rgba(56,189,248,0.4), 0 0 16px rgba(56,189,248,0.2)',
            transition: 'all 0.3s ease',
            animation: listening
              ? 'pulse-ring 1.5s infinite'
              : handsFree
                ? 'handsfree-ring 2s infinite'
                : 'none',
          }}
        >
          {listening
            ? <MicOff size={26} color="white" />
            : <Mic size={26} color="white" />
          }
        </button>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          70% { box-shadow: 0 0 0 16px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        @keyframes handsfree-ring {
          0% { box-shadow: 0 0 0 0 rgba(6,182,212,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(6,182,212,0); }
          100% { box-shadow: 0 0 0 0 rgba(6,182,212,0); }
        }
        @keyframes blink-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes speaking-wave {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        @keyframes wave-bar {
          0% { height: 4px; }
          100% { height: 14px; }
        }
      `}</style>
    </>
  );
};

export default VoiceAssistant;
