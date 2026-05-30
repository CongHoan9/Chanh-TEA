const Product = require('../models/Product');

const cartController = {
  // GET /api/cart
  getCart(req, res) {
    const cart = req.session.cart || [];
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    res.json({ success: true, data: { items: cart, total } });
  },

  // POST /api/cart/add
  async addItem(req, res, next) {
    try {
      const { productId, qty = 1, size = 'M', toppings = [] } = req.body;
      const product = await Product.getById(productId);
      if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });

      if (!req.session.cart) req.session.cart = [];
      const cart = req.session.cart;

      const selectedToppings = Array.isArray(toppings) ? toppings : [toppings];
      const key = `${productId}-${size}-${selectedToppings.sort().join(',')}`;
      const existing = cart.find(i => i.key === key);

      if (existing) {
        existing.qty += parseInt(qty);
      } else {
        cart.push({
          key,
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          size,
          toppings: selectedToppings,
          qty: parseInt(qty)
        });
      }

      const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
      const count = cart.reduce((sum, i) => sum + i.qty, 0);
      res.json({ success: true, message: 'Đã thêm vào giỏ hàng', data: { cart, total, count } });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/cart/update
  updateItem(req, res) {
    const { key, qty } = req.body;
    const cart = req.session.cart || [];
    const item = cart.find(i => i.key === key);

    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });

    if (parseInt(qty) <= 0) {
      req.session.cart = cart.filter(i => i.key !== key);
    } else {
      item.qty = parseInt(qty);
      req.session.cart = cart;
    }

    const total = req.session.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const count = req.session.cart.reduce((sum, i) => sum + i.qty, 0);
    res.json({ success: true, data: { cart: req.session.cart, total, count } });
  },

  // DELETE /api/cart/remove/:key
  removeItem(req, res) {
    const { key } = req.params;
    req.session.cart = (req.session.cart || []).filter(i => i.key !== key);
    const total = req.session.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    res.json({ success: true, data: { cart: req.session.cart, total } });
  },

  // DELETE /api/cart/clear
  clearCart(req, res) {
    req.session.cart = [];
    res.json({ success: true, message: 'Đã xóa giỏ hàng' });
  }
};

module.exports = cartController;
