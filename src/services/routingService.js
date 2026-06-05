// src/services/routingService.js
/**
 * Routing Service
 * Provides higher‑level store resolution logic. Currently wraps the repository
 * function `resolveNearestStore`. Future enhancements may add scoring based on
 * store load, inventory, ETA, etc.
 */

const opsRepository = require('../repositories/opsRepository');

/**
 * Resolve the best store for a given location and order items.
 * @param {Object} location - { lat: number, lng: number }
 * @param {Array} items - array of order item objects (product references)
 * @returns {Promise<Object|null>} Store object or null if none available.
 */
async function resolveStore(location, items) {
  // Direct delegation for now – the repository implements the PostGIS logic.
  return await opsRepository.resolveNearestStore(location, items);
}

module.exports = {
  resolveStore,
};
