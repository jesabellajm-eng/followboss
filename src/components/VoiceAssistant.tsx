import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Appointment, Invoice, Prospect, FollowUp, Page } from '../types';

const GEMINI_API_KEY = 'AIzaSyAD7K_J_2caajMOeYtsgxtMgM8vEcbgF8I';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

interface Props {
  appointments?: Appointment[];
  invoices?: Invoice[];
  prospects?: Prospect[];
  followUps?: FollowUp[];
  onAddAppointment?: (apt: any) => void;
  onDeleteAppointment?: (id: string) => void;
  onNavigate?: (tab: Page) => void;
  fullPage?: boolean;
}

const SYSTEM_PROMPT = `Tu es Serena, l'assistante vocale intelligente de FollowBoss.
Tu es chaleureuse, professionnelle, et naturelle. Tu parles comme une vraie personne, pas un robot.

RÈGLES ABSOLUES:
- Tu VOUVOIES toujours l'utilisateur (vous, votre, vos) — JAMAIS "tu/toi/ton/ta/tes"
- Tu es concise: 1-3 phrases max dans tes réponses
- Tu es sympathique mais professionnelle
- Tu varies tes formulations, ne répète jamais deux fois la même phrase
- Tu utilises des expressions naturelles québécoises quand c'est approprié
- Tu ne dis JAMAIS "en tant qu'IA" ou "je suis un programme" ou "je suis une intelligence artificielle"
- Tu peux faire des blagues légères quand c'est approprié
- Quand tu ne sais pas, tu le dis honnêtement

TES CAPACITÉS:
- Tu peux discuter de tout sujet (business, vie quotidienne, conseils, météo, actualités)
- Tu aides avec la gestion d'agenda, contacts, factures, prospects
- Tu donnes des conseils business aux freelancers et travailleurs autonomes
- Tu connais le contexte FollowBoss: app de suivi client pour freelancers/consultants au Canada

STYLE:
- Naturelle, fluide, empathique
- Comme une collègue brillante et bienveillante
- Enthousiaste sans être excessive
- Orientée solutions`;

export default function VoiceAssistant({ 
  appointments = [], 
  invoices = [], 
  prospects = [], 
  followUps = [],
  onAddAppointment, 
  onDeleteAppointment, 
  onNavigate 
}: Props) {
  const [isListening, setIsListening] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState<{role: 'user' | 'serena', text: string}[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<{role: string, parts: {text: string}[]}[]>([]);
  const handsFreeTimeoutRef = useRef<any>(null);
  const isHandsFreeRef = useRef(false);
  const isSpeakingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { isHandsFreeRef.current = isHandsFree; }, [isHandsFree]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  // Scroll to bottom on new messages
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Greeting on mount
  useEffect(() => {
    const hour = new Date().getHours();
    let g: string;
    if (hour < 6) g = "Vous êtes encore debout? Pas de souci, je suis là. Comment puis-je vous aider?";
    else if (hour < 9) g = "Bon matin! Prête à attaquer cette journée avec vous. On regarde votre planning?";
    else if (hour < 12) g = "Bonjour! Comment se passe votre avant-midi? Je suis là pour vous.";
    else if (hour < 14) g = "Bon après-midi! J'espère que vous avez bien mangé. On continue?";
    else if (hour < 17) g = "Bonjour! Belle journée pour avancer sur vos projets. Qu'est-ce qu'on fait?";
    else if (hour < 21) g = "Bonsoir! Comment s'est passée votre journée? Besoin de quelque chose?";
    else g = "Bonsoir! On prépare la journée de demain? Je vous écoute.";
    
    setTimeout(() => {
      setConversation([{ role: 'serena', text: g }]);
      speak(g);
    }, 600);
  }, []);

  // Get best French voice
  const getFrenchVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    const prefs = ['Amelie', 'Marie', 'Virginie', 'Google français', 'Microsoft Sylvie', 'Thomas'];
    for (const p of prefs) {
      const v = voices.find(v => v.name.includes(p) && v.lang.startsWith('fr'));
      if (v) return v;
    }
    return voices.find(v => v.lang.startsWith('fr')) || voices[0];
  }, []);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-CA';
    utterance.rate = 1.15;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    
    const voice = getFrenchVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => { setIsSpeaking(true); isSpeakingRef.current = true; };
    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (isHandsFreeRef.current) {
        handsFreeTimeoutRef.current = setTimeout(() => startListening(), 400);
      }
    };
    utterance.onerror = () => { setIsSpeaking(false); isSpeakingRef.current = false; };

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [getFrenchVoice]);

  // Build context for AI
  const buildContext = (): string => {
    const hour = new Date().getHours();
    const min = new Date().getMinutes();
    const dayNames = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
    const today = dayNames[new Date().getDay()];
    
    let ctx = `[Heure: ${today} ${hour}h${min.toString().padStart(2,'0')}]\n`;
    ctx += `[Agenda: ${appointments.length} RDV`;
    if (appointments.length > 0) {
      const next3 = appointments.slice(0, 3).map(a => `${a.clientName} le ${a.date} à ${a.time}`).join('; ');
      ctx += ` — prochains: ${next3}`;
    }
    ctx += `]\n`;
    ctx += `[Factures: ${invoices.length} total, ${invoices.filter(i => i.status === 'overdue').length} en retard]\n`;
    ctx += `[Prospects: ${prospects.length} total]\n`;
    ctx += `[Relances: ${followUps.length} en cours]\n`;
    return ctx;
  };

  // Check for direct actions (calendar, calls, navigation)
  const checkForActions = (text: string): { handled: boolean; response?: string } => {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Add appointment
    if (lower.includes('ajouter') && (lower.includes('rendez') || lower.includes('rdv'))) {
      const timeMatch = text.match(/(\d{1,2})\s*[h:]\s*(\d{0,2})/i);
      const nameMatch = text.match(/avec\s+(\w+(?:\s+\w+)?)/i);
      
      if (onAddAppointment && nameMatch) {
        const apt: Partial<Appointment> = {
          clientName: nameMatch[1],
          date: new Date().toISOString().split('T')[0],
          time: timeMatch ? `${timeMatch[1].padStart(2,'0')}:${timeMatch[2] || '00'}` : '09:00',
          subject: 'Rendez-vous',
          duration: 60,
          reminded: false,
        };
        
        if (lower.includes('demain')) {
          const d = new Date(); d.setDate(d.getDate() + 1);
          apt.date = d.toISOString().split('T')[0];
        }
        const days: Record<string, number> = { lundi:1, mardi:2, mercredi:3, jeudi:4, vendredi:5, samedi:6, dimanche:0 };
        for (const [day, num] of Object.entries(days)) {
          if (lower.includes(day)) {
            const d = new Date();
            const diff = (num - d.getDay() + 7) % 7 || 7;
            d.setDate(d.getDate() + diff);
            apt.date = d.toISOString().split('T')[0];
            break;
          }
        }
        
        onAddAppointment(apt);
        onNavigate?.('calendar' as Page);
        const responses = [
          `Parfait, j'ai ajouté votre rendez-vous avec ${nameMatch[1]}${timeMatch ? ` à ${timeMatch[1]}h${timeMatch[2]||'00'}` : ''}. Votre calendrier est à jour!`,
          `C'est noté! RDV avec ${nameMatch[1]} bien enregistré. Je vous ai mis sur votre calendrier.`,
          `Rendez-vous ajouté avec ${nameMatch[1]}! Tout est en ordre dans votre agenda.`,
        ];
        return { handled: true, response: responses[Math.floor(Math.random() * responses.length)] };
      }
    }

    // Delete appointment
    if ((lower.includes('supprimer') || lower.includes('annuler') || lower.includes('enlever')) && (lower.includes('rendez') || lower.includes('rdv'))) {
      const nameMatch = text.match(/(?:avec|de)\s+(\w+)/i);
      if (nameMatch && onDeleteAppointment) {
        const apt = appointments.find(a => a.clientName.toLowerCase().includes(nameMatch[1].toLowerCase()));
        if (apt) {
          onDeleteAppointment(apt.id);
          onNavigate?.('calendar' as Page);
          return { handled: true, response: `Rendez-vous avec ${apt.clientName} supprimé. C'est réglé!` };
        }
        return { handled: true, response: `Je n'ai pas trouvé de rendez-vous avec ${nameMatch[1]} dans votre agenda.` };
      }
    }

    // List appointments / planning
    if (lower.includes('planning') || lower.includes('agenda') || lower.includes('mes rendez') || lower.includes('mon horaire')) {
      onNavigate?.('calendar' as Page);
      if (appointments.length === 0) {
        const r = ["Votre agenda est vide pour l'instant. Un bon moment pour prospecter!", "Aucun rendez-vous à l'horizon. On en profite pour contacter des prospects?"];
        return { handled: true, response: r[Math.floor(Math.random() * r.length)] };
      }
      const list = appointments.slice(0, 4).map(a => `${a.clientName} à ${a.time}`).join(', ');
      return { handled: true, response: `Vous avez ${appointments.length} rendez-vous. Les prochains: ${list}.` };
    }

    // Invoices
    if (lower.includes('facture') || lower.includes('paiement')) {
      onNavigate?.('invoices' as Page);
      const overdue = invoices.filter(i => i.status === 'overdue');
      if (overdue.length > 0) {
        const total = overdue.reduce((s, i) => s + i.amount, 0);
        return { handled: true, response: `Vous avez ${overdue.length} facture${overdue.length > 1 ? 's' : ''} en retard pour un total de ${total}$. On s'en occupe?` };
      }
      return { handled: true, response: `Toutes vos factures sont à jour. Bravo, belle gestion!` };
    }

    // Prospects
    if (lower.includes('prospect')) {
      onNavigate?.('prospects' as Page);
      return { handled: true, response: `Vous avez ${prospects.length} prospect${prospects.length > 1 ? 's' : ''} dans votre pipeline. Je vous montre la liste.` };
    }

    // Call contact
    if (lower.includes('appeler') || lower.includes('appelle')) {
      const nameMatch = text.match(/appel(?:er|le|ez)\s+(\w+)/i);
      if (nameMatch) {
        const name = nameMatch[1].toLowerCase();
        const allContacts = [
          ...appointments.map(a => ({ name: a.clientName, phone: a.clientPhone })),
          ...prospects.map(p => ({ name: p.name, phone: p.phone })),
        ];
        const contact = allContacts.find(c => c.name.toLowerCase().includes(name));
        if (contact?.phone) {
          setTimeout(() => window.open(`tel:${contact.phone}`, '_self'), 1500);
          return { handled: true, response: `J'appelle ${contact.name} au ${contact.phone}. Un instant.` };
        }
        return { handled: true, response: `Je n'ai pas de numéro pour ${nameMatch[1]}. Vérifiez dans vos contacts.` };
      }
    }

    // Navigate
    if (lower.includes('tableau de bord') || lower.includes('dashboard')) {
      onNavigate?.('dashboard' as Page);
      return { handled: true, response: `Voilà votre tableau de bord!` };
    }
    if (lower.includes('briefing') || lower.includes('brief du matin')) {
      onNavigate?.('morning-brief' as Page);
      return { handled: true, response: `Voici votre briefing du jour!` };
    }

    return { handled: false };
  };

  // Send to Gemini AI
  const askGemini = async (userMessage: string): Promise<string> => {
    const context = buildContext();

    conversationHistoryRef.current.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    // Keep last 16 messages for context
    if (conversationHistoryRef.current.length > 16) {
      conversationHistoryRef.current = conversationHistoryRef.current.slice(-16);
    }

    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + context }] },
            { role: 'model', parts: [{ text: "Compris, je suis Serena. Je vouvoie, je suis naturelle et chaleureuse." }] },
            ...conversationHistoryRef.current
          ],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 200,
            topP: 0.95,
          }
        })
      });

      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = await res.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiText) throw new Error('No response');

      // Clean up any markdown formatting for speech
      const cleaned = aiText.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '').trim();

      conversationHistoryRef.current.push({
        role: 'model',
        parts: [{ text: cleaned }]
      });

      return cleaned;
    } catch (error) {
      console.error('Gemini error:', error);
      const fallbacks = [
        "Désolée, j'ai eu un petit souci de connexion. Pouvez-vous réessayer?",
        "Hmm, ma connexion a flanché. Réessayez dans un instant!",
        "Petit problème technique de mon côté. Redemandez-moi, je suis prête!",
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
  };

  const processUserInput = async (text: string) => {
    if (!text.trim()) return;

    setConversation(prev => [...prev, { role: 'user', text }]);
    setIsThinking(true);

    const actionResult = checkForActions(text);
    let response: string;

    if (actionResult.handled) {
      response = actionResult.response!;
    } else {
      response = await askGemini(text);
    }

    setIsThinking(false);
    setConversation(prev => [...prev, { role: 'serena', text: response }]);
    speak(response);
  };

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setConversation(prev => [...prev, { role: 'serena', text: "La reconnaissance vocale n'est pas disponible. Utilisez Chrome sur Android." }]);
      return;
    }

    const recognition = new SR();
    recognition.lang = 'fr-CA';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalT = '';
      let interimT = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalT += event.results[i][0].transcript;
        } else {
          interimT += event.results[i][0].transcript;
        }
      }
      setTranscript(interimT || finalT);
      if (finalT) {
        setTranscript('');
        processUserInput(finalT);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (isHandsFreeRef.current && !isSpeakingRef.current) {
        setTimeout(() => startListening(), 600);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'no-speech' && isHandsFreeRef.current) {
        setTimeout(() => startListening(), 800);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); setIsListening(true); } catch(e) {}
  }, []);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch(e) {}
    setIsListening(false);
  }, []);

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      startListening();
    }
  };

  const toggleHandsFree = () => {
    if (isHandsFree) {
      setIsHandsFree(false);
      isHandsFreeRef.current = false;
      stopListening();
      clearTimeout(handsFreeTimeoutRef.current);
      const msg = "Mode mains-libres désactivé.";
      setConversation(prev => [...prev, { role: 'serena', text: msg }]);
    } else {
      setIsHandsFree(true);
      isHandsFreeRef.current = true;
      const msg = "Mode mains-libres activé! Je vous écoute en continu. Parfait pour la route.";
      setConversation(prev => [...prev, { role: 'serena', text: msg }]);
      speak(msg);
    }
  };

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch(e) {}
      window.speechSynthesis.cancel();
      clearTimeout(handsFreeTimeoutRef.current);
    };
  }, []);

  // Load voices
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0e1a 0%, #0d1528 50%, #0a1020 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 16px',
      paddingBottom: '120px',
    }}>
      {/* Avatar */}
      <div style={{
        width: 90, height: 90, borderRadius: '50%',
        background: isSpeaking
          ? 'linear-gradient(135deg, #00D4FF, #50C878, #00D4FF)'
          : isThinking ? 'linear-gradient(135deg, #FFD700, #00D4FF)'
          : 'linear-gradient(135deg, #00D4FF, #0088AA)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 16, marginBottom: 8,
        boxShadow: isSpeaking
          ? '0 0 40px rgba(0,212,255,0.5), 0 0 80px rgba(80,200,120,0.2)'
          : isThinking ? '0 0 30px rgba(255,215,0,0.3)'
          : '0 0 20px rgba(0,212,255,0.2)',
        animation: isSpeaking ? 'serena-pulse 1.5s ease-in-out infinite' : isThinking ? 'serena-pulse 0.8s ease-in-out infinite' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      </div>

      <h2 style={{
        fontSize: '1.3rem', fontWeight: 700, marginBottom: 2,
        background: 'linear-gradient(90deg, #00D4FF, #50C878)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>Serena</h2>
      <p style={{ color: '#8a96a8', fontSize: '0.82rem', marginBottom: 16, height: 18 }}>
        {isThinking ? 'Réflexion...' : isSpeaking ? 'Parle...' : isListening ? 'Je vous écoute...' : 'Assistante IA'}
      </p>

      {/* Conversation */}
      <div style={{
        width: '100%', maxWidth: 500, flex: 1, overflowY: 'auto',
        marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10,
        WebkitOverflowScrolling: 'touch',
      }}>
        {conversation.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            padding: '10px 14px',
            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: msg.role === 'user'
              ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.06)',
            border: msg.role === 'user'
              ? '1px solid rgba(0,212,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
            color: msg.role === 'user' ? '#d0eaff' : '#b8c4d0',
            fontSize: '0.9rem', lineHeight: 1.5,
          }}>
            {msg.text}
          </div>
        ))}
        {transcript && (
          <div style={{
            alignSelf: 'flex-end', maxWidth: '85%',
            padding: '10px 14px', borderRadius: '16px 16px 4px 16px',
            background: 'rgba(0,212,255,0.06)',
            border: '1px dashed rgba(0,212,255,0.25)',
            color: '#6a7a8a', fontSize: '0.9rem', fontStyle: 'italic',
          }}>
            {transcript}...
          </div>
        )}
        {isThinking && (
          <div style={{
            alignSelf: 'flex-start', padding: '10px 14px',
            borderRadius: '16px 16px 16px 4px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#8a96a8', fontSize: '1rem', letterSpacing: 3,
          }}>
            <span className="serena-dot" style={{animationDelay:'0s'}}>●</span>
            <span className="serena-dot" style={{animationDelay:'0.2s'}}>●</span>
            <span className="serena-dot" style={{animationDelay:'0.4s'}}>●</span>
          </div>
        )}
        <div ref={conversationEndRef} />
      </div>

      {/* Hands-free toggle */}
      <button onClick={toggleHandsFree} style={{
        padding: '8px 22px', borderRadius: 30,
        border: isHandsFree ? '1px solid #50C878' : '1px solid rgba(255,255,255,0.12)',
        background: isHandsFree ? 'rgba(80,200,120,0.12)' : 'rgba(255,255,255,0.05)',
        color: isHandsFree ? '#50C878' : '#8a96a8',
        fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', marginBottom: 14,
      }}>
        {isHandsFree ? '● Mains-libres actif' : 'Activer mains-libres'}
      </button>

      {/* Mic button */}
      <button onClick={toggleMic} style={{
        width: 68, height: 68, borderRadius: '50%', border: 'none',
        background: isListening
          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
          : 'linear-gradient(135deg, #00D4FF, #0088CC)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: isListening
          ? '0 0 25px rgba(239,68,68,0.4)' : '0 0 25px rgba(0,212,255,0.3)',
      }}>
        {isListening ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.35 2.18"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </button>
      <p style={{ color: '#6a7a8a', fontSize: '0.72rem', marginTop: 6 }}>
        {isListening ? 'Appuyez pour arrêter' : 'Appuyez pour parler'}
      </p>

      {/* Quick commands */}
      <div style={{
        width: '100%', maxWidth: 500, marginTop: 20,
        padding: '14px', borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <p style={{ color: '#6a7a8a', fontSize: '0.75rem', fontWeight: 600, marginBottom: 8 }}>
          Essayez:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            'Mon planning du jour',
            'Mes factures en retard',
            'Donne-moi un conseil business',
            'Comment ça va Serena?',
            'Aide-moi à prospecter',
          ].map(cmd => (
            <button key={cmd} onClick={() => processUserInput(cmd)} style={{
              padding: '5px 11px', borderRadius: 18,
              border: '1px solid rgba(0,212,255,0.15)',
              background: 'rgba(0,212,255,0.06)',
              color: '#8a96a8', fontSize: '0.75rem', cursor: 'pointer',
            }}>
              {cmd}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes serena-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        .serena-dot {
          display: inline-block;
          animation: serena-blink 1s infinite;
        }
        @keyframes serena-blink {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
