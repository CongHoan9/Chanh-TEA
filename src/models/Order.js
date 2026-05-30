const db = require('../config/db');

const mapOrder = (row) => ({
  id: row.id,
  items: row.items || [],
  total: row.total,
  customer: row.customer || {},
  paymentMethod: row.payment_method,
  status: row.status,
  createdAt: row.created_at
});

class Order {
  static async getAll() {
    const { rows } = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    return rows.map(mapOrder);
  }

  static async create(orderData) {
    const { rows } = await db.query(
      `INSERT INTO orders (items, total, customer, payment_method)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        JSON.stringify(orderData.items),
        orderData.total,
        JSON.stringify(orderData.customer),
        orderData.paymentMethod || 'cod'
      ]
    );
    return mapOrder(rows[0]);
  }

  static async getById(id) {
    const { rows } = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    return rows[0] ? mapOrder(rows[0]) : null;
  }

  static async updateStatus(id, status) {
    const { rows } = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return rows[0] ? mapOrder(rows[0]) : null;
  }
}

module.exports = Order;
