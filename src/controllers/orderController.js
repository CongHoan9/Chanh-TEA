const Order = require('../models/Order');

const orderController = {
  // POST /api/orders
  async create(req, res, next) {
    try {
      const cart = req.session.cart || [];
      if (!cart.length) return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });

      const { name, phone, address, note, paymentMethod } = req.body;
      if (!name || !phone || !address) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin giao hàng' });
      }

      const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
      const order = await Order.create({
        items: cart,
        total,
        customer: { name, phone, address, note },
        paymentMethod: paymentMethod || 'cod'
      });

      req.session.cart = [];
      req.session.lastOrder = order.id;
      res.json({ success: true, message: 'Đặt hàng thành công!', data: { orderId: order.id } });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/orders/:id
  async getOne(req, res, next) {
    try {
      const order = await Order.getById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/orders (admin)
  async getAll(req, res, next) {
    try {
      const orders = await Order.getAll();
      res.json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/orders/:id/status (admin)
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const validStatuses = ['pending', 'confirmed', 'preparing', 'delivering', 'done', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      }
      const order = await Order.updateStatus(req.params.id, status);
      if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = orderController;
