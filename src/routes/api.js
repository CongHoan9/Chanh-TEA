const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const cartController = require('../controllers/cartController');
const orderController = require('../controllers/orderController');
const authController = require('../controllers/authController');
const { requireAdmin } = require('../middleware/auth.middleware');

// Products
router.get('/products', productController.getAll);          // Lấy danh sách sản phẩm, có thể lọc theo category và popular
router.get('/products/:id', productController.getOne);      // Lấy chi tiết sản phẩm theo ID
router.get('/categories', productController.getCategories); // Lấy danh sách danh mục sản phẩm

// Cart
router.get('/cart', cartController.getCart);                    // Lấy giỏ hàng hiện tại
router.post('/cart/add', cartController.addItem);               // Thêm sản phẩm vào giỏ hàng
router.put('/cart/update', cartController.updateItem);          // Cập nhật số lượng sản phẩm trong giỏ hàng
router.delete('/cart/remove/:key', cartController.removeItem);  // Xóa sản phẩm khỏi giỏ hàng
router.delete('/cart/clear', cartController.clearCart);         // Xóa toàn bộ giỏ hàng

// Orders
router.post('/orders', orderController.create);                                 // Tạo đơn hàng mới
router.get('/orders/:id', orderController.getOne);                              // Lấy chi tiết đơn hàng theo ID
router.get('/orders', requireAdmin, orderController.getAll);                    // Lấy danh sách tất cả đơn hàng (admin)
router.patch('/orders/:id/status', requireAdmin, orderController.updateStatus); // Cập nhật trạng thái đơn hàng (admin)

// Auth
router.post('/auth/login', authController.login);   // Đăng nhập
router.post('/auth/logout', authController.logout); // Đăng xuất
router.get('/auth/me', authController.me);          // Lấy thông tin người dùng hiện tại (nếu đã đăng nhập)

module.exports = router;
