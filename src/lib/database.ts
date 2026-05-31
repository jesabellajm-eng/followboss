import { supabase } from './supabase';
import type { FollowUp, Appointment, Invoice, Prospect, FollowUpEvent } from '../types';

// ── Follow-Ups ──────────────────────────────────────────

export async function getFollowUps(): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('*, follow_up_events(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    ...row,
    clientPhone: row.client_phone,
    clientName: row.client_name,
    clientEmail: row.client_email,
    createdAt: row.created_at,
    lastFollowUpAt: row.last_follow_up_at,
    nextFollowUpAt: row.next_follow_up_at,
    followUpCount: row.follow_up_count,
    maxFollowUps: row.max_follow_ups,
    history: (row.follow_up_events || []).map((e: any) => ({
      id: e.id,
      date: e.event_date,
      action: e.action,
      result: e.result,
      note: e.note,
    })),
  }));
}

export async function createFollowUp(followUp: Omit<FollowUp, 'id' | 'history'>): Promise<FollowUp> {
  const { data, error } = await supabase
    .from('follow_ups')
    .insert({
      client_name: followUp.clientName,
      client_email: followUp.clientEmail,
      client_phone: followUp.clientPhone,
      type: followUp.type,
      subject: followUp.subject,
      amount: followUp.amount,
      status: followUp.status,
      priority: followUp.priority,
      last_follow_up_at: followUp.lastFollowUpAt,
      next_follow_up_at: followUp.nextFollowUpAt,
      follow_up_count: followUp.followUpCount,
      max_follow_ups: followUp.maxFollowUps,
      notes: followUp.notes,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...data, clientName: data.client_name, clientEmail: data.client_email, clientPhone: data.client_phone, createdAt: data.created_at, lastFollowUpAt: data.last_follow_up_at, nextFollowUpAt: data.next_follow_up_at, followUpCount: data.follow_up_count, maxFollowUps: data.max_follow_ups, history: [] };
}

export async function updateFollowUp(id: string, updates: Partial<FollowUp>): Promise<void> {
  const mapped: any = {};
  if (updates.clientName !== undefined) mapped.client_name = updates.clientName;
  if (updates.clientEmail !== undefined) mapped.client_email = updates.clientEmail;
  if (updates.clientPhone !== undefined) mapped.client_phone = updates.clientPhone;
  if (updates.status !== undefined) mapped.status = updates.status;
  if (updates.priority !== undefined) mapped.priority = updates.priority;
  if (updates.subject !== undefined) mapped.subject = updates.subject;
  if (updates.amount !== undefined) mapped.amount = updates.amount;
  if (updates.notes !== undefined) mapped.notes = updates.notes;
  if (updates.lastFollowUpAt !== undefined) mapped.last_follow_up_at = updates.lastFollowUpAt;
  if (updates.nextFollowUpAt !== undefined) mapped.next_follow_up_at = updates.nextFollowUpAt;
  if (updates.followUpCount !== undefined) mapped.follow_up_count = updates.followUpCount;
  
  const { error } = await supabase.from('follow_ups').update(mapped).eq('id', id);
  if (error) throw error;
}

export async function deleteFollowUp(id: string): Promise<void> {
  const { error } = await supabase.from('follow_ups').delete().eq('id', id);
  if (error) throw error;
}

export async function addFollowUpEvent(followUpId: string, event: Omit<FollowUpEvent, 'id'>): Promise<void> {
  const { error } = await supabase.from('follow_up_events').insert({
    follow_up_id: followUpId,
    event_date: event.date,
    action: event.action,
    result: event.result,
    note: event.note,
  });
  if (error) throw error;
}

// ── Appointments ────────────────────────────────────────

export async function getAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    date: row.date,
    time: row.time,
    duration: row.duration,
    subject: row.subject,
    location: row.location,
    notes: row.notes,
    reminded: row.reminded,
  }));
}

export async function createAppointment(appt: Omit<Appointment, 'id' | 'reminded'>): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      client_name: appt.clientName,
      client_email: appt.clientEmail,
      client_phone: appt.clientPhone,
      date: appt.date,
      time: appt.time,
      duration: appt.duration,
      subject: appt.subject,
      location: appt.location,
      notes: appt.notes,
      reminded: false,
    })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, clientName: data.client_name, clientEmail: data.client_email, clientPhone: data.client_phone, date: data.date, time: data.time, duration: data.duration, subject: data.subject, location: data.location, notes: data.notes, reminded: data.reminded };
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw error;
}

// ── Invoices ────────────────────────────────────────────

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('issued_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    invoiceNumber: row.invoice_number,
    amount: row.amount,
    issuedAt: row.issued_at,
    dueDate: row.due_date,
    status: row.status,
    notes: row.notes,
  }));
}

export async function createInvoice(inv: Omit<Invoice, 'id'>): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      client_name: inv.clientName,
      client_email: inv.clientEmail,
      client_phone: inv.clientPhone,
      invoice_number: inv.invoiceNumber,
      amount: inv.amount,
      issued_at: inv.issuedAt,
      due_date: inv.dueDate,
      status: inv.status,
      notes: inv.notes,
    })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, clientName: data.client_name, clientEmail: data.client_email, clientPhone: data.client_phone, invoiceNumber: data.invoice_number, amount: data.amount, issuedAt: data.issued_at, dueDate: data.due_date, status: data.status, notes: data.notes };
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<void> {
  const mapped: any = {};
  if (updates.status !== undefined) mapped.status = updates.status;
  if (updates.notes !== undefined) mapped.notes = updates.notes;
  if (updates.amount !== undefined) mapped.amount = updates.amount;
  const { error } = await supabase.from('invoices').update(mapped).eq('id', id);
  if (error) throw error;
}

// ── Prospects ───────────────────────────────────────────

export async function getProspects(): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    source: row.source,
    stage: row.stage,
    estimatedValue: row.estimated_value,
    notes: row.notes,
    createdAt: row.created_at,
    lastContactAt: row.last_contact_at,
  }));
}

export async function createProspect(p: Omit<Prospect, 'id'>): Promise<Prospect> {
  const { data, error } = await supabase
    .from('prospects')
    .insert({
      name: p.name,
      email: p.email,
      phone: p.phone,
      company: p.company,
      source: p.source,
      stage: p.stage,
      estimated_value: p.estimatedValue,
      notes: p.notes,
      last_contact_at: p.lastContactAt,
    })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, email: data.email, phone: data.phone, company: data.company, source: data.source, stage: data.stage, estimatedValue: data.estimated_value, notes: data.notes, createdAt: data.created_at, lastContactAt: data.last_contact_at };
}

export async function updateProspect(id: string, updates: Partial<Prospect>): Promise<void> {
  const mapped: any = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.email !== undefined) mapped.email = updates.email;
  if (updates.phone !== undefined) mapped.phone = updates.phone;
  if (updates.stage !== undefined) mapped.stage = updates.stage;
  if (updates.notes !== undefined) mapped.notes = updates.notes;
  if (updates.lastContactAt !== undefined) mapped.last_contact_at = updates.lastContactAt;
  const { error } = await supabase.from('prospects').update(mapped).eq('id', id);
  if (error) throw error;
}

export async function deleteProspect(id: string): Promise<void> {
  const { error } = await supabase.from('prospects').delete().eq('id', id);
  if (error) throw error;
}
