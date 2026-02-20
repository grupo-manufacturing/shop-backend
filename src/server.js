require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5001;

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
const origins = allowedOrigins.length ? allowedOrigins : ['https://grupo.in', 'https://www.grupo.in', 'http://localhost:3000'];

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origins.includes(origin)) return cb(null, true);
    console.warn(`[CORS] Blocked: ${origin}`);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
}));
app.use(compression({ filter: (req, res) => req.headers['x-no-compression'] ? false : compression.filter(req, res), level: 6, threshold: 1024 }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (req, res) => res.status(200).json({
  status: 'OK', message: 'Grupo Shop Backend is running!',
  timestamp: new Date().toISOString(), environment: process.env.NODE_ENV || 'development'
}));

app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/upload', require('./routes/upload'));

app.get('/', (req, res) => res.json({
  message: 'Welcome to Grupo Shop API', version: '1.0.0',
  description: 'Product catalog & order management for Grupo Store',
  timestamp: new Date().toISOString(),
  endpoints: { products: '/api/products', orders: '/api/orders', health: '/health' }
}));

app.listen(PORT, () => {
  console.log(`Grupo Shop Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  const db = require('./services/database');
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  setInterval(async () => {
    try {
      const cancelled = await db.cancelExpiredOrders();
      if (cancelled.length) {
        console.log(`[cleanup] Cancelled ${cancelled.length} expired order(s):`, cancelled.map(o => o.order_number).join(', '));
      }
    } catch (e) {
      console.error('[cleanup] Failed to cancel expired orders:', e.message);
    }
  }, CLEANUP_INTERVAL);
});

module.exports = app;