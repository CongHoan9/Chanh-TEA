require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');

const config = require('./config/app.config');
const { setLocals } = require('./middleware/auth.middleware');

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

// Session
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production'
  }
}));

// Set user & cart as locals for all views
app.use(setLocals);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Handlebars view engine
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, '../views/layouts'),
  partialsDir: path.join(__dirname, '../views/partials'),
  helpers: {
    formatPrice: (p) => p.toLocaleString('vi-VN') + 'đ',
    eq: (a, b) => a === b,
    or: (a, b) => a || b,
    json: (obj) => JSON.stringify(obj),
    add: (a, b) => a + b,
    multiply: (a, b) => a * b,
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '../views'));

// Routes
app.use('/', require('./routes/index'));
if (config.databaseUrl) {
  app.use('/api', require('./routes/api'));
} else {
  app.use('/api', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'API disabled because DATABASE_URL is not configured.'
    });
  });
}

// 404
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Không tìm thấy trang', layout: 'main' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
});

app.listen(config.port, () => {
  console.log(`Trà Chanh server chạy tại http://localhost:${config.port}`);
});

module.exports = app;
