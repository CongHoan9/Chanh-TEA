// src/config/supabase.js
const { createClient } = require('@supabase/supabase-js');
const config = require('./app.config');

if (!config.supabaseUrl || !config.supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
}

// Create a Supabase client instance (public anon key for client‑side use)
const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

module.exports = { supabase };
