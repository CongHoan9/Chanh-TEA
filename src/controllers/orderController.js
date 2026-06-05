// src/controllers/orderController.js
/**
 * Order Controller
 * Handles order-related HTTP requests, delegating to the repository and services.
 * Uses Supabase Auth middleware to access req.opsProfile where applicable.
 */

const opsRepository = require('../repositories/opsRepository');
const routingService = require('../services/routingService');

/**
 * Create a guest order (public endpoint).
 * Expected body: { items: [{productId, quantity}], location: { lat, lng } }
 */
async function createGuestOrder(req, res) {
  try {
    const { items, location } = req.body;
    // Validate payload (basic)
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid order items.' });
    }
    // Resolve nearest store using routing service (which may apply scoring rules)
    const store = await routingService.resolveStore(location, items);
    if (!store) {
      return res.status(422).json({ success: false, message: 'No active store can serve this location.' });
    }
    // Delegate creation to repository, passing resolved store id
    const order = await opsRepository.createGuestOrder({ ...req.body, store_id: store.id });
    return res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error('Error creating guest order:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

/**
 * Retrieve a public order by code (public endpoint).
 */
async function getPublicOrder(req, res) {
  try {
    const { code } = req.params;
    const { phone } = req.query;
    const order = await opsRepository.findPublicOrder(code, phone);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    return res.json({ success: true, data: order });
  } catch (err) {
    console.error('Error fetching public order:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

/**
 * Update order status (store protected endpoint).
 * Expected body: { status: 'prepared' | 'delivered' | ... , note?: string }
 */
async function patchOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const profile = req.opsProfile;
    const order = await opsRepository.updateOrderStatus(profile, id, status, note);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    return res.json({ success: true, data: order });
  } catch (err) {
    console.error('Error updating order status:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

module.exports = {
  createGuestOrder,
  getPublicOrder,
  patchOrderStatus,
};
