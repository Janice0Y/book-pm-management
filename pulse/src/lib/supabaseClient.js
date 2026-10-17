import { createClient } from '@supabase/supabase-js';

/**
 * Shared Supabase client. The anon-key client is safe to ship in the browser —
 * Row Level Security enforces every access on the server, not the client.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
