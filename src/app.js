require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');

const config = require('./config/app.config');

const app = express();

if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Security & Logging
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/', require('./routes/index'));
app.use('/api', require('./routes/opsApi'));

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy API endpoint.' });
  }
  res.status(404).sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Lỗi máy chủ nội bộ' });
});

app.listen(config.port, () => {
  console.log(`Trà Chanh server chạy tại http://localhost:${config.port}`);
});

module.exports = app;
