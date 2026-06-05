// src/middleware/auditLogMiddleware.js
/**
 * Audit Log Middleware
 * Captures critical actions (e.g., order status changes) and records them.
 * For now, logs to console and optionally stores in Supabase table `audit_logs`.
 */

const { supabase } = require('../config/supabase'); // Supabase client instance

module.exports = async function auditLog(req, res, next) {
  // Capture relevant info before the handler runs
  const start = Date.now();
  const originalJson = res.json;
  // Wrap res.json to capture response data
  res.json = async function (payload) {
    const duration = Date.now() - start;
    const userId = req.opsProfile?.id || null;
    const action = `${req.method} ${req.originalUrl}`;
    const details = {
      userId,
      action,
      requestBody: req.body,
      response: payload,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    };
    // Log to console (for dev)
    console.log('AUDIT LOG:', details);
    // Optionally insert into Supabase if table exists
    if (supabase) {
      try {
        await supabase.from('audit_logs').insert(details);
      } catch (e) {
        console.error('Failed to write audit log to Supabase:', e.message);
      }
    }
    // Call original json
    return originalJson.call(this, payload);
  };
  next();
};
