const bcrypt = require('bcryptjs');
const User = require('../models/User');

const authController = {
  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });

      const user = await User.getByEmail(email);
      if (!user) return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });

      req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      res.json({ success: true, message: 'Đăng nhập thành công', data: req.session.user });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/logout
  logout(req, res) {
    req.session.destroy(() => res.json({ success: true, message: 'Đã đăng xuất' }));
  },

  // GET /api/auth/me
  me(req, res) {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    res.json({ success: true, data: req.session.user });
  }
};

module.exports = authController;
