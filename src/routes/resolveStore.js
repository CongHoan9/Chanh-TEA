// src/routes/resolveStore.js
const express = require('express');
const router = express.Router();
const opsRepository = require('../repositories/opsRepository');

// Helper to wrap async handlers
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

/**
 * POST /api/public/resolve-store
 * Body: { location: { lat, lng }, items: [{ product_id, qty }] }
 * Returns the nearest active store that can fulfill the order.
 */
router.post(
  '/',
  asyncRoute(async (req, res) => {
    const { location, items } = req.body;
    const store = await opsRepository.resolveNearestStore(location, items || []);
    if (!store) {
      return res.status(422).json({ success: false, message: 'No active store can serve this location.' });
    }
    res.json({ success: true, data: store });
  })
);

module.exports = router;
