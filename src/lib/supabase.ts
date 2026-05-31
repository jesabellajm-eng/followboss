import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qdmspxpwdmirlvfkopix.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkbXNweHB3ZG1pcmx2ZmtvcGl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwODM4MTgsImV4cCI6MjA5NTY1OTgxOH0.H0bektunTvsX6AvsycfvpU-QdGs5raFP822psg1NQjk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
