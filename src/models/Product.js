const db = require('../config/db');

const categoryLabels = {
  'tra-chanh': 'Trà Chanh',
  'tra-chanh-trai-cay': 'Trà Chanh Trái Cây',
  'tra-sua': 'Trà Sữa Chanh'
};

const mapProduct = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  price: row.price,
  image: row.image,
  description: row.description,
  sizes: row.sizes || [],
  toppings: row.toppings || [],
  popular: row.popular,
  badge: row.badge
});

class Product {
  // Lấy tất cả sản phẩm
  static async getAll() {
    const { rows } = await db.query('SELECT * FROM products ORDER BY id ASC');
    return rows.map(mapProduct);
  }
  // Lấy sản phẩm theo ID
  static async getById(id) {
    const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    return rows[0] ? mapProduct(rows[0]) : null;
  }
  // Lấy sản phẩm theo danh mục
  static async getByCategory(category) {
    const { rows } = await db.query('SELECT * FROM products WHERE category = $1 ORDER BY id ASC', [category]);
    return rows.map(mapProduct);
  }
  // Lấy sản phẩm phổ biến
  static async getPopular() {
    const { rows } = await db.query('SELECT * FROM products WHERE popular = true ORDER BY id ASC');
    return rows.map(mapProduct);
  }
  // Lấy danh sách danh mục
  static async getCategories() {
    const products = await this.getAll();
    const cats = [...new Set(products.map(p => p.category))];
    return cats.map(c => ({ slug: c, label: categoryLabels[c] || c }));
  }
  // Định dạng giá tiền Việt Nam
  static formatPrice(price) {
    return price.toLocaleString('vi-VN') + 'đ';
  }
}

module.exports = Product;
