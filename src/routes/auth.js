// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const db = require('../config/db');

/**
 * POST /auth/login
 * Body: { email, password }
 * Verifies credentials against Supabase auth.users and returns access token.
 * Creates an audit log entry for the login attempt.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required.' });
  }

  try {
    // Use Supabase client to sign in (will verify password and issue JWT)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      // Log failed login attempt
      await db.query(
        `INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [null, null, 'login_failed', 'auth', email, req.ip, req.get('User-Agent')]
      );
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const { user, session } = data;
    
    // Fetch user profile to get the app role
    const profileRes = await db.query(
      `SELECT role, full_name FROM public.profiles WHERE id = $1`,
      [user.id]
    );
    let appRole = 'user';
    let fullName = user.email;
    let storeId = null;
    if (profileRes.rows.length > 0) {
      appRole = profileRes.rows[0].role;
      fullName = profileRes.rows[0].full_name;
    }
    
    // Fetch store_id if they are a store member
    if (appRole !== 'system_admin') {
      const storeRes = await db.query(
        `SELECT store_id FROM public.store_members WHERE user_id = $1 LIMIT 1`,
        [user.id]
      );
      if (storeRes.rows.length > 0) {
        storeId = storeRes.rows[0].store_id;
      }
    }

    // Log successful login
    await db.query(
      `INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
      [user.id, appRole, 'login_success', 'auth', email, req.ip, req.get('User-Agent')]
    );

    // Set HTTP-Only cookie
    res.cookie('token', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return the access token and user info
    return res.json({
      success: true,
      token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        full_name: fullName,
        role: appRole,
        store_id: storeId
      }
    });
  } catch (err) {
    console.error('Login route error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Đăng xuất thành công' });
});

module.exports = router;
