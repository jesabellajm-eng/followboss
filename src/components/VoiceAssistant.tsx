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

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

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
      const rest = 10 + u;
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
  return `${numToFr(rounded)} dollar${rounded > 1 ? 's' : ''}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return pick(['Vous êtes matinale! ', 'Debout si tôt? Bravo! ', '']);
  if (h < 12) return pick(['Bon matin! ', 'Belle matinée! ', 'Bonjour! ']);
  if (h < 17) return pick(['Bon après-midi! ', 'Bonjour! ', '']);
  if (h < 21) return pick(['Bonsoir! ', 'Belle soirée! ', '']);
  return pick(['Bonsoir! ', 'Encore au travail? Vous êtes dévouée! ', '']);
}

/* ── Navigation commands ─────────────────────────────────── */

const NAV_COMMANDS: Array<{ keywords: string[]; page: Page; responses: string[] }> = [
  { keywords: ['tableau de bord', 'accueil', 'dashboard', 'retour', 'page principale', 'début'],
    page: 'dashboard',
    responses: ['Je vous ramène au tableau de bord!', 'Retour à l\'accueil, c\'est parti!', 'On retourne au tableau de bord.'] },
  { keywords: ['calendrier', 'nouveau rendez-vous'],
    page: 'calendar',
    responses: ['J\'ouvre votre calendrier!', 'Voici votre calendrier de rendez-vous.', 'C\'est parti, je vous montre le calendrier!'] },
  { keywords: ['facture', 'factures', 'montre-moi les factures', 'paiement'],
    page: 'invoices',
    responses: ['Voici vos factures!', 'J\'affiche vos factures tout de suite.', 'On regarde les factures ensemble.'] },
  { keywords: ['prospect', 'prospects', 'pipeline', 'nouveau client', 'clients potentiels', 'montre-moi les prospects'],
    page: 'prospects',
    responses: ['J\'ouvre votre pipeline de prospects!', 'Voici vos prospects.', 'On jette un coup d\'oeil au pipeline!'] },
  { keywords: ['ajouter', 'nouvelle relance', 'créer', 'nouveau suivi', 'ajouter une relance', 'créer une relance'],
    page: 'add',
    responses: ['J\'ouvre le formulaire pour vous!', 'Parfait, ajoutons une nouvelle relance.', 'C\'est parti, on crée une relance!'] },
  { keywords: ['mes relances', 'liste', 'toutes les relances', 'voir les relances'],
    page: 'list',
    responses: ['Voici toutes vos relances!', 'J\'affiche la liste de vos relances.', 'On regarde vos relances.'] },
  { keywords: ['rapport', 'statistiques', 'rapport du jour', 'stats', 'résultats'],
    page: 'reports',
    responses: ['Voici votre rapport du jour!', 'J\'ouvre les statistiques pour vous.', 'On regarde les chiffres ensemble!'] },
  { keywords: ['briefing', 'briefing du matin', 'matin'],
    page: 'morning-brief',
    responses: ['Je lance votre briefing!', 'Voici votre briefing du matin!', 'C\'est l\'heure du briefing!'] },
  { keywords: ['tarifs', 'prix', 'plans', 'abonnement', 'pricing', 'forfait'],
    page: 'pricing',
    responses: ['Voici les plans et tarifs!', 'J\'affiche les tarifs pour vous.'] },
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

  useEffect(() => { handsFreeRef.current = handsFree; }, [handsFree]);

  /* ── Voice selection — warm female French voice ──── */
  useEffect(() => {
    function pickVoice() {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      const frVoices = voices.filter(v => v.lang.startsWith('fr'));
      if (!frVoices.length) return;

      const warmNames = ['amelie', 'chloe', 'lea', 'marie', 'audrey', 'virginie', 'sara', 'anna', 'elsa', 'denise', 'sylvie'];
      const maleNames = ['thomas', 'nicolas', 'luc', 'pierre', 'jacques', 'henri', 'paul'];

      let best: SpeechSynthesisVoice | null = null;
      let bestScore = -1;

      for (const voice of frVoices) {
        let score = 0;
        const n = voice.name.toLowerCase();

        if (n.includes('microsoft') && n.includes('online') && n.includes('natural')) score += 15;
        else if (n.includes('microsoft') && n.includes('online')) score += 12;
        if (n.includes('google')) score += 10;
        if (warmNames.some(w => n.includes(w))) score += 8;
        if (/female|femme/i.test(n)) score += 6;
        if (maleNames.some(c => n.includes(c))) score -= 15;
        if (/\bmale\b/i.test(n) && !/female/i.test(n)) score -= 12;
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
    utter.rate = 0.92;
    utter.pitch = 1.05;
    if (selectedVoiceRef.current) utter.voice = selectedVoiceRef.current;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => { setSpeaking(false); onDone?.(); };
    utter.onerror = () => { setSpeaking(false); onDone?.(); };
    window.speechSynthesis.speak(utter);
  }, []);

  /* ── Conversational logic ───────────────────────────── */
  const processCommand = useCallback((text: string) => {
    const lower = text.toLowerCase().trim();

    const reply = (msg: string, navPage?: Page, delay?: number) => {
      setResponse(msg);
      speak(msg, () => {
        if (handsFreeRef.current) {
          setTimeout(() => startListeningInner(), 400);
        }
      });
      if (navPage) setTimeout(() => onNavigate(navPage), delay ?? 600);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (!handsFreeRef.current) {
        hideTimeoutRef.current = setTimeout(() => setShowBubble(false), 6000);
      }
    };

    // ── Exit / Stop ──
    if (/\b(merci|au revoir|stop|bonne nuit|à demain|à plus|ciao)\b/.test(lower)) {
      setHandsFree(false);
      handsFreeRef.current = false;
      reply(pick([
        'Avec plaisir! Passez une excellente journée!',
        'De rien! Je suis toujours là si vous avez besoin. Bonne continuation!',
        'C\'est un plaisir de vous aider! À bientôt!',
        'Parfait! N\'hésitez pas à me rappeler quand vous voulez. Bonne journée!',
        'À votre service! Bonne fin de journée!',
      ]));
      hideTimeoutRef.current = setTimeout(() => setShowBubble(false), 4000);
      return;
    }

    // ── Greetings ──
    if (/\b(bonjour|salut|hey|hello|coucou|allo)\b/.test(lower) && !/briefing/.test(lower)) {
      const greeting = getTimeGreeting();
      reply(pick([
        `${greeting}C'est Serena! Qu'est-ce que je peux faire pour vous aujourd'hui?`,
        `${greeting}Ravie de vous retrouver! Comment puis-je vous aider?`,
        `${greeting}Serena à votre service! Que souhaitez-vous faire?`,
        `${greeting}Comment allez-vous? Dites-moi comment je peux vous aider!`,
      ]));
      return;
    }

    // ── How are you / personal ──
    if (/\b(comment (ça va|vas-tu|allez)|ça va)\b/.test(lower)) {
      reply(pick([
        'Je vais très bien, merci de demander! Et vous, comment se passe votre journée?',
        'Toujours en pleine forme pour vous aider! Qu\'est-ce que je peux faire pour vous?',
        'Super bien! Prête à vous donner un coup de main. Que souhaitez-vous savoir?',
      ]));
      return;
    }

    // ── Thanks ──
    if (/\b(merci beaucoup|super|génial|parfait|excellent|bravo|cool)\b/.test(lower) && lower.length < 30) {
      reply(pick([
        'Ça me fait plaisir! Autre chose que je peux faire pour vous?',
        'Avec plaisir! N\'hésitez pas si vous avez d\'autres questions.',
        'Content que ça vous aide! Quoi d\'autre?',
      ]));
      return;
    }

    // ── What can you do ──
    if (/\b(que (peux|sais)-tu|quoi faire|tes fonctions|aide|help|comment ça marche)\b/.test(lower)) {
      reply('Je peux vous aider avec plein de choses! Consultez vos rendez-vous, vos factures, vos relances ou vos prospects. Je peux aussi ajouter ou supprimer des rendez-vous, appeler un contact, ou vous faire un résumé de votre journée. Dites-moi ce dont vous avez besoin!');
      return;
    }

    // ── Summary / Brief ──
    if (/\b(résumé|comment ça va les affaires|briefing|brief|résume|bilan|situation)\b/.test(lower) && !/briefing du matin|matin/.test(lower)) {
      const activeFollowUps = followUps.filter(f => !['positive', 'expired'].includes(f.status));
      const overdueInvoices = invoices.filter(i => i.status === 'overdue');
      const overdueTotal = overdueInvoices.reduce((s, i) => s + i.amount, 0);
      const today = todayStr();
      const todayAppts = appointments.filter(a => a.date === today);
      const activeProspects = prospects.filter(p => !['gagne', 'perdu'].includes(p.stage));

      const parts: string[] = [];
      
      if (todayAppts.length > 0) {
        parts.push(`${numToFr(todayAppts.length)} rendez-vous aujourd'hui`);
      } else {
        parts.push('aucun rendez-vous aujourd\'hui');
      }
      
      if (activeFollowUps.length > 0) {
        parts.push(`${numToFr(activeFollowUps.length)} relance${activeFollowUps.length > 1 ? 's' : ''} en cours`);
      }
      
      if (overdueInvoices.length > 0) {
        parts.push(`${numToFr(overdueInvoices.length)} facture${overdueInvoices.length > 1 ? 's' : ''} en retard pour un total de ${formatMoney(overdueTotal)}`);
      } else {
        parts.push('aucune facture en retard');
      }
      
      if (activeProspects.length > 0) {
        parts.push(`${numToFr(activeProspects.length)} prospect${activeProspects.length > 1 ? 's' : ''} actif${activeProspects.length > 1 ? 's' : ''}`);
      }

      const intro = pick([
        'Voici votre résumé!',
        'Alors, faisons le point!',
        'Voici où vous en êtes.',
      ]);
      
      const outro = pick([
        'Voulez-vous que je vous montre quelque chose en détail?',
        'Souhaitez-vous approfondir un de ces points?',
        'Dites-moi si vous voulez en savoir plus sur un sujet en particulier.',
      ]);

      reply(`${intro} Vous avez ${parts.join(', ')}. ${outro}`);
      return;
    }

    // ── Follow-up queries ──
    if (/\b(relances?\s*urgente|urgent)\b/.test(lower)) {
      const urgent = followUps.filter(f => f.priority === 'haute' && !['positive', 'expired'].includes(f.status));
      if (urgent.length === 0) {
        reply(pick([
          'Bonne nouvelle, aucune relance urgente en ce moment! Tout roule.',
          'Rien d\'urgent côté relances! Vous êtes bien organisée.',
          'Zéro urgence côté relances! Profitez-en.',
        ]));
      } else {
        const names = urgent.slice(0, 3).map(f => `${f.clientName}${f.amount ? ' pour ' + formatMoney(f.amount) : ''}`).join(', ');
        reply(`Attention, vous avez ${numToFr(urgent.length)} relance${urgent.length > 1 ? 's' : ''} urgente${urgent.length > 1 ? 's' : ''}. ${names}. Voulez-vous que je vous montre les détails?`);
      }
      return;
    }

    if (/\b(combien de relances|mes relances|relances)\b/.test(lower) && !/voir|toutes|liste/.test(lower)) {
      const active = followUps.filter(f => !['positive', 'expired'].includes(f.status));
      if (active.length === 0) {
        reply(pick([
          'Vous n\'avez aucune relance active pour le moment. Tout est à jour!',
          'Aucune relance en cours! Votre suivi est impeccable.',
        ]));
      } else {
        const byStatus: Record<string, number> = {};
        active.forEach(f => { byStatus[f.status] = (byStatus[f.status] || 0) + 1; });
        const statusLabels: Record<string, string> = { pending: 'en attente', sent: 'envoyées', no_reply: 'sans réponse', negative: 'négatives' };
        const details = Object.entries(byStatus).map(([s, c]) => `${numToFr(c)} ${statusLabels[s] || s}`).join(', ');
        reply(`Vous avez ${numToFr(active.length)} relance${active.length > 1 ? 's' : ''} active${active.length > 1 ? 's' : ''}. ${details}. Voulez-vous que je vous amène à la liste?`);
      }
      return;
    }

    if (/\b(qui dois-je relancer|qui relancer)\b/.test(lower)) {
      const toFollow = followUps.filter(f => ['sent', 'pending', 'no_reply'].includes(f.status));
      if (toFollow.length === 0) {
        reply(pick([
          'Personne à relancer pour le moment! Tout est à jour, bravo!',
          'Aucun client à relancer. Votre suivi est au top!',
        ]));
      } else {
        const names = toFollow.slice(0, 4).map(f => f.clientName).join(', ');
        reply(`Vous devriez relancer ${numToFr(toFollow.length)} client${toFollow.length > 1 ? 's' : ''}. Notamment ${names}. Voulez-vous que je vous montre la liste complète?`);
      }
      return;
    }

    // ── Invoice queries ──
    if (/\b(factures?\s*en\s*retard|impayé|impayés)\b/.test(lower)) {
      const overdue = invoices.filter(i => i.status === 'overdue');
      if (overdue.length === 0) {
        reply(pick([
          'Excellente nouvelle! Aucune facture en retard. Vos clients sont à jour!',
          'Zéro facture en retard! Tout est en ordre de ce côté.',
        ]));
      } else {
        const total = overdue.reduce((s, i) => s + i.amount, 0);
        const names = overdue.slice(0, 3).map(i => i.clientName).join(', ');
        reply(`Vous avez ${numToFr(overdue.length)} facture${overdue.length > 1 ? 's' : ''} en retard pour un total de ${formatMoney(total)}. ${pick(['Les clients concernés sont', 'Il s\'agit de'])} ${names}. Voulez-vous envoyer une relance?`);
      }
      return;
    }

    if (/\b(combien on me doit|argent|total dû|montant dû|combien me doit)\b/.test(lower)) {
      const owed = invoices.filter(i => i.status === 'overdue' || i.status === 'pending');
      const total = owed.reduce((s, i) => s + i.amount, 0);
      if (total === 0) {
        reply('Personne ne vous doit d\'argent en ce moment! Tout est réglé.');
      } else {
        reply(`On vous doit un total de ${formatMoney(total)} sur ${numToFr(owed.length)} facture${owed.length > 1 ? 's' : ''}. Voulez-vous voir le détail?`);
      }
      return;
    }

    // ── Prospect queries ──
    if (/\b(nouveaux?\s*prospect|nouveau\s*prospect)\b/.test(lower)) {
      const newP = prospects.filter(p => p.stage === 'nouveau');
      if (newP.length === 0) {
        reply('Pas de nouveau prospect pour le moment. On garde l\'oeil ouvert!');
      } else {
        const names = newP.slice(0, 3).map(p => p.name).join(', ');
        reply(`Vous avez ${numToFr(newP.length)} nouveau${newP.length > 1 ? 'x' : ''} prospect${newP.length > 1 ? 's' : ''}! ${names}. Voulez-vous voir le pipeline?`);
      }
      return;
    }

    if (/\b(mes prospects|pipeline|prospect)\b/.test(lower) && !/montre|voir|ouvr/.test(lower)) {
      const active = prospects.filter(p => !['gagne', 'perdu'].includes(p.stage));
      if (active.length === 0) {
        reply('Votre pipeline est vide pour le moment. C\'est le moment d\'aller chercher de nouveaux clients!');
      } else {
        const totalValue = active.reduce((s, p) => s + (p.estimatedValue || 0), 0);
        const byStage: Record<string, number> = {};
        active.forEach(p => { byStage[p.stage] = (byStage[p.stage] || 0) + 1; });
        const stageLabels: Record<string, string> = { nouveau: 'nouveaux', contacte: 'contactés', qualifie: 'qualifiés', proposition: 'en proposition' };
        const details = Object.entries(byStage).map(([s, c]) => `${numToFr(c)} ${stageLabels[s] || s}`).join(', ');
        reply(`Votre pipeline compte ${numToFr(active.length)} prospect${active.length > 1 ? 's' : ''} actif${active.length > 1 ? 's' : ''}. ${details}. La valeur estimée totale est de ${formatMoney(totalValue)}. Souhaitez-vous voir les détails?`);
      }
      return;
    }

    // ── Appointment queries ──
    if (/\b(rendez-vous aujourd|agenda|mon planning|planning)\b/.test(lower) && !/nouveau|calendrier/.test(lower)) {
      const today = todayStr();
      const todayAppts = appointments.filter(a => a.date === today);
      if (todayAppts.length === 0) {
        reply(pick([
          'Aucun rendez-vous prévu aujourd\'hui! Votre journée est libre.',
          'Journée libre aujourd\'hui, aucun rendez-vous au programme!',
          'Rien au calendrier aujourd\'hui. Profitez-en!',
        ]));
      } else {
        const list = todayAppts.slice(0, 3).map(a => `${a.time} avec ${a.clientName}`).join(', ');
        reply(`Vous avez ${numToFr(todayAppts.length)} rendez-vous aujourd'hui. ${list}. Voulez-vous voir votre calendrier complet?`);
      }
      return;
    }

    if (/\b(prochain rendez-vous|prochain rdv|prochaine réunion)\b/.test(lower)) {
      const now = new Date();
      const upcoming = appointments
        .filter(a => new Date(`${a.date}T${a.time}`) > now)
        .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
      if (upcoming.length === 0) {
        reply('Aucun rendez-vous à venir pour le moment.');
      } else {
        const next = upcoming[0];
        const dayName = new Date(next.date + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
        reply(`Votre prochain rendez-vous est ${dayName} à ${next.time} avec ${next.clientName}. Le sujet: ${next.subject}.`);
      }
      return;
    }

    // ── Calendar management: ADD appointment ──
    if (/\b(ajoute|nouveau|créer?|planifi|prend|book|fixe|met)\b.*\b(rendez-vous|rdv|rencontre|meeting)\b/.test(lower) ||
        /\b(rendez-vous|rdv)\b.*\b(avec)\b/.test(lower) && /\b(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|après-demain|aujourd)\b/.test(lower)) {
      
      const nameMatch = lower.match(/avec\s+([a-zàâäéèêëïîôùûüÿç\-]+(?:\s+[a-zàâäéèêëïîôùûüÿç\-]+)?)/i);
      const clientName = nameMatch ? nameMatch[1].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
      
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
      
      const today = new Date();
      let targetDate = new Date(today);
      
      if (/demain/.test(lower)) {
        targetDate.setDate(today.getDate() + 1);
      } else if (/après-demain|après demain/.test(lower)) {
        targetDate.setDate(today.getDate() + 2);
      } else if (/aujourd/.test(lower)) {
        // today
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
            targetDate.setDate(today.getDate() + daysAhead);
            break;
          }
        }
        const dateNumMatch = lower.match(/le\s+(\d{1,2})/);
        if (dateNumMatch) {
          const dayOfMonth = parseInt(dateNumMatch[1]);
          targetDate.setDate(dayOfMonth);
          if (targetDate < today) targetDate.setMonth(targetDate.getMonth() + 1);
        }
      }
      
      const dateStr = targetDate.toISOString().slice(0, 10);
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      
      const subjectMatch = lower.match(/(?:pour|sujet|concernant|à propos)\s+(.+?)(?:\s+(?:à|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|après)|$)/);
      const subject = subjectMatch 
        ? subjectMatch[1].charAt(0).toUpperCase() + subjectMatch[1].slice(1) 
        : 'Rendez-vous';
      
      if (!clientName) {
        reply(pick([
          'Avec qui souhaitez-vous prendre rendez-vous? Dites-moi le nom!',
          'Bien sûr! Dites-moi avec qui et je m\'occupe du reste.',
          'Je veux bien vous aider! Avec qui est le rendez-vous?',
        ]));
        return;
      }
      
      let duration = 30;
      const durationMatch = lower.match(/(\d+)\s*min/);
      if (durationMatch) duration = parseInt(durationMatch[1]);
      else if (/une heure|1\s*h(?![\d])/.test(lower)) duration = 60;
      else if (/deux heures|2\s*h(?![\d])/.test(lower)) duration = 120;
      
      const locationMatch = lower.match(/(?:chez|au|à|lieu)\s+(.+?)(?:\s+(?:pour|à|demain)|$)/);
      const location = locationMatch ? locationMatch[1] : undefined;
      
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
      
      reply(pick([
        `C'est noté! Rendez-vous avec ${clientName} le ${formattedDate} à ${timeStr}. Je vous montre le calendrier!`,
        `Parfait! J'ai ajouté votre rendez-vous avec ${clientName}, ${formattedDate} à ${timeStr}. C'est fait!`,
        `Rendez-vous confirmé avec ${clientName}! ${formattedDate} à ${timeStr}. Je vous ouvre le calendrier.`,
      ]), 'calendar', 2000);
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
          const dayName = new Date(found.date + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
          reply(pick([
            `C'est fait! Le rendez-vous avec ${found.clientName} du ${dayName} à ${found.time} est supprimé.`,
            `Rendez-vous avec ${found.clientName} annulé! ${dayName} à ${found.time}, c'est retiré de votre calendrier.`,
          ]), 'calendar', 2000);
        } else {
          reply(`Je n'ai pas trouvé de rendez-vous avec ${nameMatch[1]}. Voulez-vous que je vous montre le calendrier pour vérifier?`);
        }
      } else {
        const now = new Date();
        const upcoming = appointments
          .filter(a => new Date(`${a.date}T${a.time}`) > now)
          .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
        
        if (upcoming.length > 0) {
          const next = upcoming[0];
          onDeleteAppointment(next.id);
          reply(`Le prochain rendez-vous avec ${next.clientName} a été annulé.`);
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
          
          reply(pick([
            `C'est fait! Le rendez-vous avec ${found.clientName} est maintenant le ${formattedNewDate} à ${newTimeStr}.`,
            `Parfait, j'ai déplacé votre rendez-vous avec ${found.clientName} au ${formattedNewDate} à ${newTimeStr}!`,
          ]), 'calendar', 2000);
        } else {
          reply(`Je n'ai pas trouvé de rendez-vous avec ${nameMatch[1]}. Voulez-vous vérifier dans le calendrier?`);
        }
      } else {
        reply('Avec qui est le rendez-vous que vous souhaitez déplacer? Dites-moi le nom!');
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
        reply(pick([
          'Aucun rendez-vous cette semaine! Votre agenda est complètement libre.',
          'Semaine tranquille! Rien au calendrier pour les prochains jours.',
        ]));
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
        const fu = followUps.find(f => f.clientName.toLowerCase().includes(searchName));
        const inv = invoices.find(i => i.clientName.toLowerCase().includes(searchName));
        const prsp = prospects.find(p => p.name.toLowerCase().includes(searchName));
        const appt = appointments.find(a => a.clientName.toLowerCase().includes(searchName));
        
        const contactName = fu?.clientName || inv?.clientName || prsp?.name || appt?.clientName;
        const contactPhone = fu?.clientPhone || inv?.clientPhone || prsp?.phone || appt?.clientPhone;
        
        if (contactName && contactPhone) {
          reply(`${contactName}! Son numéro est le ${contactPhone}. Je lance l'appel pour vous!`);
          setTimeout(() => { window.open(`tel:${contactPhone.replace(/[^+\d]/g, '')}`, '_self'); }, 2500);
        } else if (contactName) {
          reply(`J'ai trouvé ${contactName} dans vos contacts, mais je n'ai pas son numéro de téléphone malheureusement.`);
        } else {
          reply(`Je n'ai pas trouvé de contact du nom de "${searchName}" dans votre répertoire.`);
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
          if (contactPhone) info += `Son téléphone: ${contactPhone}. `;
          if (contactEmail) info += `Son email: ${contactEmail}. `;
          if (!contactPhone && !contactEmail) info += `Je n'ai aucune coordonnée pour cette personne.`;
          if (contactPhone) info += `Voulez-vous que je l'appelle?`;
          reply(info);
        } else {
          reply(`Je n'ai pas trouvé de contact du nom de "${searchName}".`);
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
          reply(`Relance pour ${fu.clientName}, sujet: ${fu.subject}. Je vous amène au briefing pour gérer ça!`, 'morning-brief', 1200);
        } else {
          reply(`Je n'ai pas trouvé de client nommé "${name}" dans vos relances. Voulez-vous vérifier la liste?`);
        }
        return;
      }
    }

    // ── Navigation commands ──
    for (const cmd of NAV_COMMANDS) {
      if (cmd.keywords.some(kw => lower.includes(kw))) {
        reply(pick(cmd.responses), cmd.page);
        return;
      }
    }

    // ── Smart fallback ──
    // Try to understand partial intent
    if (/\b(combien|nombre|total)\b/.test(lower)) {
      reply('Vous voulez savoir combien de quoi exactement? Je peux vous dire le nombre de relances, factures, prospects ou rendez-vous.');
      return;
    }

    if (/\b(montre|affiche|voir|ouvr)\b/.test(lower)) {
      reply('Que souhaitez-vous voir? Votre calendrier, vos factures, vos relances ou vos prospects?');
      return;
    }

    if (/\b(quand|quelle heure|à quelle)\b/.test(lower)) {
      reply('Vous cherchez une information sur un rendez-vous? Dites-moi "mon planning" ou "prochain rendez-vous" pour que je vérifie!');
      return;
    }

    reply(pick([
      'Hmm, je n\'ai pas bien saisi. Essayez de me dire ce que vous cherchez, comme "mon résumé", "mes factures" ou "ajoute un rendez-vous"!',
      'Pardon, je n\'ai pas compris. Vous pouvez me demander un résumé, consulter vos relances, vos factures ou votre planning!',
      'Désolée, je n\'ai pas capté! Essayez quelque chose comme "résumé", "factures en retard" ou "prochain rendez-vous".',
      'Je n\'ai pas bien entendu. Dites-moi par exemple "bonjour" pour commencer, ou demandez-moi directement ce dont vous avez besoin!',
    ]));
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
        setResponse('Microphone non autorisé. Veuillez permettre l\'accès au micro dans vos paramètres.');
        speak('Veuillez autoriser l\'accès au microphone dans vos paramètres.');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setResponse(pick(['Oups, petite erreur! Réessayez.', 'Je n\'ai rien capté. Essayez encore!']));
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    try {
      recognition.start();
    } catch {
      setListening(false);
      setResponse('Impossible de démarrer le micro. Vérifiez vos permissions.');
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
            {listening ? 'Je vous écoute...' : speaking ? 'Je vous réponds...' : 'Votre assistante vocale'}
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
            Essayez de dire...
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              '"Bonjour Serena!"',
              '"Donne-moi mon résumé"',
              '"Ajoute un rendez-vous demain à 14h avec..."',
              '"Quelles sont mes factures en retard?"',
              '"Appelle [nom du contact]"',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: 'white',
              boxShadow: '0 0 8px rgba(6,182,212,0.4)',
              flexShrink: 0,
            }}>S</div>

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
              {listening ? 'Je vous écoute...' : speaking ? 'Serena répond...' : 'Serena'}
            </span>
          </div>

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
            {response || 'Serena — Votre assistante vocale'}
          </div>

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

      {/* Floating mic button */}
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
