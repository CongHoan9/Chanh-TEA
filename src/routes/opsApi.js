const express = require('express');
const router = express.Router();

const opsRepository = require('../repositories/opsRepository');
const { requireOpsAuth, requireCommand } = require('../middleware/opsAuth.middleware');

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.get('/health', (req, res) => {
  res.json({ success: true, mode: 'database', database: true });
});

router.get('/public/products', asyncRoute(async (req, res) => {
  const products = await opsRepository.listProducts();
  res.json({ success: true, data: products });
}));

router.get('/public/stores', asyncRoute(async (req, res) => {
  const stores = await opsRepository.listStores();
  res.json({ success: true, data: stores });
}));

router.post('/public/resolve-store', asyncRoute(async (req, res) => {
  const store = await opsRepository.resolveNearestStore(req.body.location || req.body, req.body.items || []);
  if (!store) {
    return res.status(422).json({ success: false, message: 'No active store can serve this location.' });
  }
  res.json({ success: true, data: store });
}));

router.post('/public/orders', asyncRoute(async (req, res) => {
  const order = await opsRepository.createGuestOrder(req.body || {});
  res.status(201).json({ success: true, data: order });
}));

router.get('/public/orders/:code', asyncRoute(async (req, res) => {
  const order = await opsRepository.findPublicOrder(req.params.code, req.query.phone);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  res.json({ success: true, data: order });
}));

router.use('/store', requireOpsAuth);
router.get('/store/orders', asyncRoute(async (req, res) => {
  const orders = await opsRepository.listOrders(req.opsProfile);
  res.json({ success: true, data: orders });
}));

router.patch('/store/orders/:id/status', asyncRoute(async (req, res) => {
  const order = await opsRepository.updateOrderStatus(req.opsProfile, req.params.id, req.body.status, req.body.note);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  res.json({ success: true, data: order });
}));

router.get('/store/products', asyncRoute(async (req, res) => {
  const products = await opsRepository.listStoreProducts(req.opsProfile);
  res.json({ success: true, data: products });
}));

router.get('/store/users', asyncRoute(async (req, res) => {
  const users = await opsRepository.listStoreUsers(req.opsProfile);
  res.json({ success: true, data: users });
}));

router.get('/store/summary', asyncRoute(async (req, res) => {
  const data = await opsRepository.getStoreSummary(req.opsProfile);
  res.json({ success: true, data });
}));

router.use('/admin', requireOpsAuth, requireCommand);
router.get('/admin/stores', asyncRoute(async (req, res) => {
  const stores = await opsRepository.listStores();
  res.json({ success: true, data: stores });
}));

router.get('/admin/orders', asyncRoute(async (req, res) => {
  const orders = await opsRepository.listOrders(req.opsProfile);
  res.json({ success: true, data: orders });
}));

router.get('/admin/users', asyncRoute(async (req, res) => {
  const users = await opsRepository.listStoreUsers(req.opsProfile);
  res.json({ success: true, data: users });
}));

router.get('/admin/audit-logs', asyncRoute(async (req, res) => {
  const logs = await opsRepository.listAuditLogs();
  res.json({ success: true, data: logs });
}));

router.get('/admin/products', asyncRoute(async (req, res) => {
  const products = await opsRepository.listProducts();
  res.json({ success: true, data: products });
}));

module.exports = router;
