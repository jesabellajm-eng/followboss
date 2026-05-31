import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './lib/AuthContext';
import * as db from './lib/database';
import type { FollowUp, FollowUpStatus, Page, Appointment, Invoice, Prospect } from './types';
import NavBar from './components/NavBar';
import Dashboard from './components/Dashboard';
import FollowUpForm from './components/FollowUpForm';
import FollowUpList from './components/FollowUpList';
import Reports from './components/Reports';
import MorningBrief from './components/MorningBrief';
import Pricing from './components/Pricing';
import Calendar from './components/Calendar';
import Invoices from './components/Invoices';
import Prospects from './components/Prospects';
import VoiceAssistant from './components/VoiceAssistant';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

type AuthPage = 'login' | 'signup' | 'reset';

export default function App() {
  const { user, loading: authLoading, trialDaysLeft, isPro, signOut } = useAuth();
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const [page, setPage] = useState<Page>('dashboard');
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Load all data from Supabase
  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setDataLoading(true);
      const [fups, appts, invs, prosps] = await Promise.all([
        db.getFollowUps(),
        db.getAppointments(),
        db.getInvoices(),
        db.getProspects(),
      ]);
      setFollowUps(fups);
      setAppointments(appts);
      setInvoices(invs);
      setProspects(prosps);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // ── Follow-Up CRUD ──
  const handleSaveFollowUp = async (data: Omit<FollowUp, 'id' | 'createdAt' | 'history' | 'followUpCount'>) => {
    try {
      if (editingFollowUp) {
        await db.updateFollowUp(editingFollowUp.id, data);
        setFollowUps(prev => prev.map(f => f.id === editingFollowUp.id ? { ...f, ...data } : f));
        setEditingFollowUp(null);
      } else {
        const created = await db.createFollowUp({ ...data, followUpCount: 0 } as any);
        setFollowUps(prev => [created, ...prev]);
      }
      setPage('list');
    } catch (err) { console.error(err); }
  };

  const handleDeleteFollowUp = async (id: string) => {
    try {
      await db.deleteFollowUp(id);
      setFollowUps(prev => prev.filter(f => f.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (id: string, status: FollowUpStatus) => {
    try {
      await db.updateFollowUp(id, { status });
      setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    } catch (err) { console.error(err); }
  };

  // ── Appointment CRUD ──
  const handleAddAppointment = async (data: Omit<Appointment, 'id' | 'reminded'>) => {
    try {
      const created = await db.createAppointment(data);
      setAppointments(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
    } catch (err) { console.error(err); }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await db.deleteAppointment(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err) { console.error(err); }
  };

  // ── Invoice CRUD ──
  const handleAddInvoice = async (data: Omit<Invoice, 'id'>) => {
    try {
      const created = await db.createInvoice(data);
      setInvoices(prev => [created, ...prev]);
    } catch (err) { console.error(err); }
  };

  const handleUpdateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    try {
      await db.updateInvoice(id, { status });
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    } catch (err) { console.error(err); }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await db.deleteFollowUp(id); // reuse delete pattern
      setInvoices(prev => prev.filter(i => i.id !== id));
    } catch (err) { console.error(err); }
  };

  // ── Prospect CRUD ──
  const handleAddProspect = async (data: Omit<Prospect, 'id' | 'createdAt'>) => {
    try {
      const created = await db.createProspect({ ...data, createdAt: new Date().toISOString() });
      setProspects(prev => [created, ...prev]);
    } catch (err) { console.error(err); }
  };

  const handleUpdateProspectStage = async (id: string, stage: Prospect['stage']) => {
    try {
      await db.updateProspect(id, { stage });
      setProspects(prev => prev.map(p => p.id === id ? { ...p, stage } : p));
    } catch (err) { console.error(err); }
  };

  const handleContactProspect = async (id: string) => {
    try {
      const now = new Date().toISOString();
      await db.updateProspect(id, { lastContactAt: now });
      setProspects(prev => prev.map(p => p.id === id ? { ...p, lastContactAt: now } : p));
    } catch (err) { console.error(err); }
  };

  const handleDeleteProspect = async (id: string) => {
    try {
      await db.deleteProspect(id);
      setProspects(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
  };

  // ── Auth loading ──
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#04050a' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ color: '#8a96a8', fontSize: '0.9rem', marginTop: 16 }}>Chargement...</p>
        </div>
      </div>
    );
  }

  // ── Not logged in ──
  if (!user) {
    if (authPage === 'signup') return <SignupPage onSwitchToLogin={() => setAuthPage('login')} />;
    if (authPage === 'reset') return <ResetPasswordPage onSwitchToLogin={() => setAuthPage('login')} />;
    return <LoginPage onSwitchToSignup={() => setAuthPage('signup')} onSwitchToReset={() => setAuthPage('reset')} />;
  }

  // ── Data loading ──
  if (dataLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#04050a' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ color: '#8a96a8', fontSize: '0.9rem', marginTop: 16 }}>Chargement de vos données...</p>
        </div>
      </div>
    );
  }

  // ── Counts ──
  const urgentCount = followUps.filter(f => f.priority === 'haute' && f.status !== 'positive' && f.status !== 'expired').length;
  const devisCount = followUps.filter(f => f.type === 'devis' && f.status !== 'positive' && f.status !== 'expired').length;
  const prospectCount = prospects.filter(p => p.stage !== 'gagne' && p.stage !== 'perdu').length;
  const invoiceCount = invoices.filter(i => i.status === 'overdue').length;

  const navigate = (p: Page) => setPage(p);

  const showTrialBanner = !isPro && trialDaysLeft > 0 && trialDaysLeft <= 7;

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh', background: '#04050a' }}>
      {showTrialBanner && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(251,191,36,0.15), rgba(248,113,113,0.15))',
          borderBottom: '1px solid rgba(251,191,36,0.3)',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '0.82rem',
          color: '#fbbf24',
          fontWeight: 600,
        }}>
          Il vous reste {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} d'essai gratuit
          <button onClick={() => setPage('pricing')} style={{
            marginLeft: 12, background: '#fbbf24', color: '#04050a', border: 'none',
            padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
          }}>
            Voir les plans
          </button>
        </div>
      )}

      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12,
        padding: '6px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(4,5,10,0.8)',
      }}>
        <span style={{ color: '#8a96a8', fontSize: '0.78rem' }}>
          {user.user_metadata?.full_name || user.email}
        </span>
        <button onClick={signOut} style={{
          background: 'none', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6,
          color: '#f87171', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}>
          Déconnexion
        </button>
      </div>

      <NavBar
        currentPage={page}
        onNavigate={navigate}
        urgentCount={urgentCount}
        devisCount={devisCount}
        prospectCount={prospectCount}
        invoiceCount={invoiceCount}
      />

      <main>
        {page === 'dashboard' && <Dashboard followUps={followUps} onNavigate={navigate} />}
        {page === 'list' && (
          <FollowUpList
            followUps={followUps}
            onEdit={(id) => { setEditingFollowUp(followUps.find(f => f.id === id) || null); setPage('edit'); }}
            onDelete={handleDeleteFollowUp}
            onUpdateStatus={handleStatusChange}
            onNavigate={navigate}
          />
        )}
        {page === 'add' && (
          <FollowUpForm onSave={handleSaveFollowUp} onNavigate={navigate} />
        )}
        {page === 'edit' && editingFollowUp && (
          <FollowUpForm
            followUp={editingFollowUp}
            onSave={handleSaveFollowUp}
            onNavigate={navigate}
          />
        )}
        {page === 'reports' && <Reports followUps={followUps} />}
        {page === 'morning-brief' && <MorningBrief followUps={followUps} onUpdateStatus={handleStatusChange} />}
        {page === 'pricing' && <Pricing />}
        {page === 'calendar' && <Calendar appointments={appointments} onAdd={handleAddAppointment} onDelete={handleDeleteAppointment} />}
        {page === 'invoices' && <Invoices invoices={invoices} onAdd={handleAddInvoice} onUpdateStatus={handleUpdateInvoiceStatus} onDelete={handleDeleteInvoice} />}
        {page === 'prospects' && <Prospects prospects={prospects} onAdd={handleAddProspect} onUpdateStage={handleUpdateProspectStage} onContact={handleContactProspect} onDelete={handleDeleteProspect} />}
        {page === 'serena' && (
          <VoiceAssistant
            onNavigate={navigate}
            followUps={followUps}
            invoices={invoices}
            prospects={prospects}
            appointments={appointments}
            onAddAppointment={handleAddAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            fullPage={true}
          />
        )}
      </main>
    </div>
  );
}
