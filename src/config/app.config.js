require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'default-secret',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  dataPath: {
    products: require('path').join(__dirname, '../../data/products.json'),
    users: require('path').join(__dirname, '../../data/users.json'),
    orders: require('path').join(__dirname, '../../data/orders.json'),
  }
};
