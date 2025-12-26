import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL ERROR: Missing Supabase environment variables!');
    console.error('VITE_SUPABASE_URL:', supabaseUrl);
    // Don't log the key for security, but log if it's missing
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Found' : 'Missing');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
