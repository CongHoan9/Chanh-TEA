const { supabase } = require('../config/supabase');

async function authMiddleware(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    if (req.path.startsWith('/api')) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    return res.redirect('/');
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid token');
    }

    // Pass token or user down if needed. For now just set req.user
    req.user = user;
    next();
  } catch (error) {
    if (req.path.startsWith('/api')) {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
    res.clearCookie('token');
    return res.redirect('/');
  }
}

module.exports = authMiddleware;
