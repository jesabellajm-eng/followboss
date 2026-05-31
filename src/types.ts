// types.ts — FollowBoss Data Models

export type FollowUpStatus = 'pending' | 'sent' | 'positive' | 'negative' | 'no_reply' | 'expired';
export type FollowUpType = 'devis' | 'facture' | 'prospect' | 'relance_generale';
export type Priority = 'haute' | 'moyenne' | 'basse';

export interface FollowUp {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  type: FollowUpType;
  subject: string;
  amount?: number;
  status: FollowUpStatus;
  priority: Priority;
  createdAt: string;
  lastFollowUpAt?: string;
  nextFollowUpAt?: string;
  followUpCount: number;
  maxFollowUps: number;
  notes?: string;
  history: FollowUpEvent[];
}

export interface FollowUpEvent {
  id: string;
  date: string;
  action: string;
  result?: FollowUpStatus;
  note?: string;
}

export interface DailyReport {
  date: string;
  totalSent: number;
  positive: number;
  negative: number;
  noReply: number;
  pending: number;
  revenueRecovered: number;
}

export interface MorningBriefData {
  greeting: string;
  todayTasks: number;
  urgentItems: number;
  positiveYesterday: number;
  negativeYesterday: number;
  noReplyYesterday: number;
  totalPending: number;
  totalRevenuePending: number;
  topPriority: FollowUp | null;
  motivationalTip: string;
}

export type Page = 'dashboard' | 'list' | 'add' | 'edit' | 'reports' | 'morning-brief' | 'pricing' | 'calendar' | 'invoices' | 'prospects' | 'serena';

export interface Appointment {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  date: string;
  time: string;
  duration: number;
  subject: string;
  location?: string;
  notes?: string;
  reminded: boolean;
}

export interface Invoice {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  invoiceNumber: string;
  amount: number;
  issuedAt: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  notes?: string;
}

export interface Prospect {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  stage: 'nouveau' | 'contacte' | 'qualifie' | 'proposition' | 'gagne' | 'perdu';
  estimatedValue?: number;
  notes?: string;
  createdAt: string;
  lastContactAt?: string;
}
