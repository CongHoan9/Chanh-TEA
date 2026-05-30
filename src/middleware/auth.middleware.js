const authMiddleware = {
  requireLogin(req, res, next) {
    if (req.session && req.session.user) return next();
    return res.redirect('/login?redirect=' + req.originalUrl);
  },

  requireAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
  },

  setLocals(req, res, next) {
    res.locals.user = req.session ? req.session.user : null;
    res.locals.cart = req.session ? (req.session.cart || []) : [];
    res.locals.cartCount = res.locals.cart.reduce((sum, item) => sum + item.qty, 0);
    next();
  }
};

module.exports = authMiddleware;
