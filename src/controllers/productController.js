const Product = require('../models/Product');

const productController = {
  // GET /api/products
  async getAll(req, res, next) {
    try {
      const { category, popular } = req.query;
      let products = category ? await Product.getByCategory(category) : await Product.getAll();
      if (popular === 'true') products = products.filter(p => p.popular);
      res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/products/:id
  async getOne(req, res, next) {
    try {
      const product = await Product.getById(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/categories
  async getCategories(req, res, next) {
    try {
      res.json({ success: true, data: await Product.getCategories() });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = productController;
