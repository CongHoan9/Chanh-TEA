// src/routes/opsApi.js
const express = require('express');
const router = express.Router();

const opsRepository = require('../repositories/opsRepository');
const { requireSupabaseAuth } = require('../middleware/supabaseAuth.middleware');
const auditLog = require('../middleware/auditLogMiddleware');
const orderStatusService = require('../services/orderStatusService');
const orderController = require('../controllers/orderController');

// Simple role check middleware
function checkRole(allowedRoles) {
  return (req, res, next) => {
    const profile = req.opsProfile;
    if (!profile || !allowedRoles.includes(profile.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }
    next();
  };
}

// Helper to wrap async handlers
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.get('/health', (req, res) => {
  res.json({ success: true, mode: 'database', database: true });
});

// ===== Public endpoints =====
router.get('/public/products', asyncRoute(async (req, res) => {
  const products = await opsRepository.listProducts();
  res.json({ success: true, data: products });
}));

router.get('/public/regions', asyncRoute(async (req, res) => {
  const regions = await opsRepository.listRegions();
  res.json({ success: true, data: regions });
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

router.post('/public/orders', asyncRoute(orderController.createGuestOrder));
router.get('/public/orders/:code', asyncRoute(orderController.getPublicOrder));

// ===== Store protected routes =====
router.use('/store', requireSupabaseAuth, checkRole(['store_manager', 'store_staff', 'courier', 'system_admin']));
router.get('/store/orders', asyncRoute(async (req, res) => {
  const orders = await opsRepository.listOrders(req.opsProfile);
  res.json({ success: true, data: orders });
}));

router.patch('/store/orders/:id/status', auditLog, asyncRoute(async (req, res) => {
  const order = await orderStatusService.updateStatus(req.opsProfile, req.params.id, req.body.status, req.body.note);
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

// ===== Admin routes (system_admin only) =====
router.use('/admin', requireSupabaseAuth, checkRole(['system_admin']));

router.get('/admin/summary', asyncRoute(async (req, res) => {
  const data = await opsRepository.getAdminSummary();
  res.json({ success: true, data });
}));

router.get('/admin/regions-stores-report', asyncRoute(async (req, res) => {
  const data = await opsRepository.getAdminRegionReport();
  res.json({ success: true, data });
}));

router.get('/admin/stores', asyncRoute(async (req, res) => {
  const stores = await opsRepository.listStores();
  res.json({ success: true, data: stores });
}));

router.post('/admin/stores', asyncRoute(async (req, res) => {
  const store = await opsRepository.createStore(req.body, req.opsProfile);
  res.json({ success: true, data: store });
}));

router.put('/admin/stores/:id', asyncRoute(async (req, res) => {
  const store = await opsRepository.updateAdminStore(req.params.id, req.body);
  res.json({ success: true, data: store });
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

router.get('/admin/analytics/branches', asyncRoute(async (req, res) => {
  const data = await opsRepository.getBranchRanking();
  res.json({ success: true, data });
}));

router.get('/admin/analytics/products', asyncRoute(async (req, res) => {
  const data = await opsRepository.getProductAnalytics();
  res.json({ success: true, data });
}));

module.exports = router;


