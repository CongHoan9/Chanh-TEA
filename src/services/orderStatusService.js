// src/services/orderStatusService.js
/**
 * Order Status Service
 * Provides a thin wrapper around the repository to encapsulate any future
 * business rules for state transitions (e.g., allowed transitions, notifications).
 */

const opsRepository = require('../repositories/opsRepository');

/**
 * Update the status of an order.
 * @param {Object} profile - opsProfile attached by Supabase auth middleware.
 * @param {string} orderId - UUID of the order.
 * @param {string} status - Desired new status.
 * @param {string} [note] - Optional note for the status change.
 * @returns {Promise<Object|null>} Updated order or null if not found/unauthorized.
 */
async function updateStatus(profile, orderId, status, note) {
  // Currently the repository implements all necessary checks.
  // This function exists for future extensibility.
  return await opsRepository.updateOrderStatus(profile, orderId, status, note);
}

module.exports = {
  updateStatus,
};
