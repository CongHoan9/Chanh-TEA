const db = require('../config/db');

const mapUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  password: row.password,
  role: row.role,
  createdAt: row.created_at
});

class User {
  static async getByEmail(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ? mapUser(rows[0]) : null;
  }
}

module.exports = User;
