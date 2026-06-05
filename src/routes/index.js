const express = require('express');
const router = express.Router();
const opsRepository = require('../repositories/opsRepository');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', async (req, res) => {
  try {
    const [products, stores] = await Promise.all([
      opsRepository.listProducts(),
      opsRepository.listStores()
    ]);
    const topProducts = products.slice(0, 10);
    const storeCount = stores ? stores.length : 0;
    res.render('index', { page: 'Main', data: { topProducts, storeCount } });
  } catch (error) {
    console.error(error);
    res.render('index', { page: 'Main', data: { topProducts: [], storeCount: 0 } });
  }
});

router.get('/menu', async (req, res) => {
  try {
    const products = await opsRepository.listProducts();
    
    // Tự động gom nhóm categories từ danh sách products
    const categoryMap = {};
    products.forEach(p => {
      if (!categoryMap[p.category]) {
        categoryMap[p.category] = { name: p.category, products: [] };
      }
      categoryMap[p.category].products.push(p);
    });
    const categories = Object.values(categoryMap);

    res.render('index', { page: 'Menu', data: { categories, products } });
  } catch (error) {
    console.error(error);
    res.render('index', { page: 'Menu', data: { categories: [], products: [] } });
  }
});

router.get('/story', async (req, res) => {
  try {
    const [products, stores] = await Promise.all([
      opsRepository.listProducts(),
      opsRepository.listStores()
    ]);
    res.render('index', { 
      page: 'Story', 
      data: { 
        productCount: products ? products.length : 0, 
        storeCount: stores ? stores.length : 0 
      } 
    });
  } catch (error) {
    console.error(error);
    res.render('index', { page: 'Story', data: { productCount: 0, storeCount: 0 } });
  }
});
router.get('/contact', (req, res) => res.render('index', { page: 'Contact', data: {} }));
router.get('/cart', (req, res) => res.render('index', { page: 'Cart', data: {} }));
router.get('/tracking', (req, res) => res.render('index', { page: 'Tracking', data: {} }));
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const data = { user: req.user };
    
    if (req.user.role === 'system_admin') {
      // Fetch data for admin
      const [summaryData, analyticsData, allOrders] = await Promise.all([
        opsRepository.getAdminSummary(),
        opsRepository.getProductAnalytics(),
        opsRepository.listOrders(req.user)
      ]);
      data.summary = summaryData;
      data.analytics = analyticsData;
      data.orders = allOrders || [];
    } else {
      // Fetch data for store manager/staff
      data.orders = await opsRepository.listOrders(req.user);
    }
    
    res.render('dashboard', { data });
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    res.render('dashboard', { data: { user: req.user, error: error.message } });
  }
});
router.get('/login', (req, res) => {
  res.render('login');
});

module.exports = router;
