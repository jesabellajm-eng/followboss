const { createClient } = require('@supabase/supabase-js');

// This won't work for DDL. Let me use pg directly.
const { Client } = require('pg');

module.exports = async function handler(req, res) {
  // Simple auth check
  if (req.query.key !== 'followboss2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  
  if (!connectionString) {
    return res.status(500).json({ error: 'No POSTGRES_URL found in env' });
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();

    const sql = `
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Subscriptions
      CREATE TABLE IF NOT EXISTS subscriptions (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        plan text NOT NULL DEFAULT 'trial',
        status text NOT NULL DEFAULT 'active',
        stripe_customer_id text,
        stripe_subscription_id text,
        current_period_end timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE(user_id)
      );

      -- Follow-Ups
      CREATE TABLE IF NOT EXISTS follow_ups (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
        client_name text NOT NULL,
        client_email text NOT NULL DEFAULT '',
        client_phone text,
        type text NOT NULL DEFAULT 'relance_generale',
        subject text NOT NULL DEFAULT '',
        amount numeric,
        status text NOT NULL DEFAULT 'pending',
        priority text NOT NULL DEFAULT 'moyenne',
        last_follow_up_at timestamptz,
        next_follow_up_at timestamptz,
        follow_up_count integer NOT NULL DEFAULT 0,
        max_follow_ups integer NOT NULL DEFAULT 5,
        notes text,
        created_at timestamptz DEFAULT now()
      );

      -- Follow-Up Events
      CREATE TABLE IF NOT EXISTS follow_up_events (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        follow_up_id uuid REFERENCES follow_ups(id) ON DELETE CASCADE NOT NULL,
        event_date timestamptz NOT NULL DEFAULT now(),
        action text NOT NULL,
        result text,
        note text,
        created_at timestamptz DEFAULT now()
      );

      -- Appointments
      CREATE TABLE IF NOT EXISTS appointments (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
        client_name text NOT NULL,
        client_email text,
        client_phone text,
        date text NOT NULL,
        time text NOT NULL,
        duration integer NOT NULL DEFAULT 30,
        subject text NOT NULL DEFAULT '',
        location text,
        notes text,
        reminded boolean NOT NULL DEFAULT false,
        created_at timestamptz DEFAULT now()
      );

      -- Invoices
      CREATE TABLE IF NOT EXISTS invoices (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
        client_name text NOT NULL,
        client_email text NOT NULL DEFAULT '',
        client_phone text,
        invoice_number text NOT NULL,
        amount numeric NOT NULL DEFAULT 0,
        issued_at text NOT NULL,
        due_date text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        notes text,
        created_at timestamptz DEFAULT now()
      );

      -- Prospects
      CREATE TABLE IF NOT EXISTS prospects (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
        name text NOT NULL,
        email text NOT NULL DEFAULT '',
        phone text,
        company text,
        source text NOT NULL DEFAULT 'Web',
        stage text NOT NULL DEFAULT 'nouveau',
        estimated_value numeric,
        notes text,
        last_contact_at timestamptz,
        created_at timestamptz DEFAULT now()
      );

      -- RLS
      ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
      ALTER TABLE follow_up_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
      ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

      -- Policies (use IF NOT EXISTS equivalent with DO block)
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own subscription') THEN
          CREATE POLICY "Users read own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own subscription') THEN
          CREATE POLICY "Users insert own subscription" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users CRUD own follow_ups') THEN
          CREATE POLICY "Users CRUD own follow_ups" ON follow_ups FOR ALL USING (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users CRUD own follow_up_events') THEN
          CREATE POLICY "Users CRUD own follow_up_events" ON follow_up_events FOR ALL
            USING (EXISTS (SELECT 1 FROM follow_ups WHERE follow_ups.id = follow_up_events.follow_up_id AND follow_ups.user_id = auth.uid()));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users CRUD own appointments') THEN
          CREATE POLICY "Users CRUD own appointments" ON appointments FOR ALL USING (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users CRUD own invoices') THEN
          CREATE POLICY "Users CRUD own invoices" ON invoices FOR ALL USING (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users CRUD own prospects') THEN
          CREATE POLICY "Users CRUD own prospects" ON prospects FOR ALL USING (auth.uid() = user_id);
        END IF;
      END $$;

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_follow_ups_user ON follow_ups(user_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
      CREATE INDEX IF NOT EXISTS idx_prospects_user ON prospects(user_id);
      CREATE INDEX IF NOT EXISTS idx_follow_up_events_fup ON follow_up_events(follow_up_id);
    `;

    await client.query(sql);
    await client.end();

    return res.status(200).json({ 
      success: true, 
      message: 'All 6 tables created successfully!',
      tables: ['subscriptions', 'follow_ups', 'follow_up_events', 'appointments', 'invoices', 'prospects']
    });
  } catch (error) {
    await client.end().catch(() => {});
    return res.status(500).json({ error: error.message });
  }
};
