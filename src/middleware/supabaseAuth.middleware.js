// src/middleware/supabaseAuth.middleware.js
const { supabase } = require('../config/supabase');
const db = require('../config/db');

/**
 * Verify Supabase JWT token from Authorization header.
 * On success, attaches a profile object to `req.opsProfile`:
 *   { id, email, role, storeIds }
 */
async function requireSupabaseAuth(req, res, next) {
  try {
    const authHeader = req.header('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return res.status(401).json({ success: false, message: 'Missing Authorization token.' });
    }

    // Verify token via Supabase client (public anon key works for getUser)
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
    const sbUser = data.user;

    // Load extended profile from our `profiles` table to get role and store memberships
    const { rows } = await db.query(
      `SELECT id, email, role FROM public.profiles WHERE id = $1`,
      [sbUser.id]
    );
    const profile = rows[0];
    if (!profile) {
      return res.status(403).json({ success: false, message: 'User profile not found.' });
    }

    // Resolve store IDs for this profile (store membership)
    const { rows: storeRows } = await db.query(
      `SELECT store_id FROM public.store_members WHERE user_id = $1`,
      [profile.id]
    );
    const storeIds = storeRows.map(r => r.store_id);

    req.opsProfile = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      storeIds: storeIds.length ? storeIds : []
    };
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, message: 'Internal auth error.' });
  }
}

module.exports = { requireSupabaseAuth };
