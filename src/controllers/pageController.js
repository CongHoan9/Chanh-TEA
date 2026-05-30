const Product = require('../models/Product');

const pageController = {
  async home(req, res, next) {
    try {
      const popular = await Product.getPopular();
      const categories = await Product.getCategories();
      res.render('pages/home', {
        title: 'Trà Chanh - Vị Thanh Mát Nguyên Chất',
        popular,
        categories,
        layout: 'main'
      });
    } catch (err) {
      next(err);
    }
  },

  async menu(req, res, next) {
    try {
      const { category } = req.query;
      const categories = await Product.getCategories();
      const products = category ? await Product.getByCategory(category) : await Product.getAll();
      res.render('pages/menu', {
        title: 'Menu - Trà Chanh',
        products,
        categories,
        activeCategory: category || 'all',
        layout: 'main'
      });
    } catch (err) {
      next(err);
    }
  },

  story(req, res) {
    res.render('pages/story', {
      title: 'Câu Chuyện - Trà Chanh',
      layout: 'main'
    });
  },

  contact(req, res) {
    res.render('pages/contact', {
      title: 'Liên Hệ - Trà Chanh',
      layout: 'main'
    });
  },

  login(req, res) {
    if (req.session.user) return res.redirect('/');
    res.render('pages/login', {
      title: 'Đăng Nhập - Trà Chanh',
      layout: 'minimal',
      redirect: req.query.redirect || '/'
    });
  }
};

module.exports = pageController;
