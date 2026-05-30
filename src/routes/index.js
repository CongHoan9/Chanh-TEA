const express = require('express');
const path = require('path');
const router = express.Router();

const publicDir = path.join(__dirname, '../../public');

const sendOriginalShell = (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
};

router.get('/', sendOriginalShell);
router.get('/menu', sendOriginalShell);
router.get('/story', sendOriginalShell);
router.get('/contact', sendOriginalShell);
router.get('/cart', sendOriginalShell);
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(publicDir, 'Dashboard.html'));
});
router.get('/login', (req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});

module.exports = router;
