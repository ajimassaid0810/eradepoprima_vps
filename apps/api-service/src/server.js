const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const Redis = require('ioredis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// 1. SECURITY MIDDLEWARES
// =============================================================================
app.use(helmet());
app.disable('x-powered-by');

// CORS configuration (Izinkan domain sendiri)
const allowedOrigins = [
  `https://${process.env.DOMAIN_NAME || 'example.com'}`,
  `https://www.${process.env.DOMAIN_NAME || 'example.com'}`,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan server-to-server / non-browser requests
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true
}));

// Body parser dengan payload limit ketat (cegah DOS via oversized payload)
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Express Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 300, // Batas 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', apiLimiter);

// =============================================================================
// 2. DATABASE & REDIS CONNECTION POOLS (INTERNAL ONLY)
// =============================================================================
const pgPool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'app_production',
  user: process.env.DB_USER || 'app_dbuser',
  password: process.env.DB_PASSWORD || 'secret',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

let redisClient = null;
if (process.env.REDIS_HOST) {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 2,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    lazyConnect: true
  });
  redisClient.connect().catch((err) => {
    console.warn('[REDIS] Initial connection notice:', err.message);
  });
}

// =============================================================================
// 3. HEALTH & API ENDPOINTS
// =============================================================================
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let redisStatus = 'disconnected';

  try {
    const dbRes = await pgPool.query('SELECT 1');
    if (dbRes.rows) dbStatus = 'connected';
  } catch (err) {
    dbStatus = `error (${err.message})`;
  }

  if (redisClient) {
    try {
      const ping = await redisClient.ping();
      if (ping === 'PONG') redisStatus = 'connected';
    } catch (err) {
      redisStatus = `error (${err.message})`;
    }
  }

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus
    }
  });
});

app.get('/api/v1/info', (req, res) => {
  res.json({
    app: 'PT Era Depo Prima - Central API Gateway',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    endpoints: [
      { path: '/health', method: 'GET', description: 'System healthcheck' },
      { path: '/api/v1/info', method: 'GET', description: 'API Service Metadata' },
      { path: '/api/v1/contact', method: 'POST', description: 'Submit contact/inquiry message' }
    ]
  });
});

// =============================================================================
// POST /api/v1/contact - Simpan pesan/inquiry ke Database PostgreSQL Pusat
// =============================================================================
app.post('/api/v1/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      status: 'error',
      message: 'Nama, email, dan pesan wajib diisi.'
    });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    const insertQuery = `
      INSERT INTO contact_messages (name, email, subject, message, ip_address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at;
    `;
    const result = await pgPool.query(insertQuery, [
      name.trim(),
      email.trim(),
      subject ? subject.trim() : 'Inquiry Umum',
      message.trim(),
      clientIp
    ]);

    // Catat log audit ke tabel audit_logs
    try {
      await pgPool.query(
        `INSERT INTO audit_logs (action, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4)`,
        [
          'CONTACT_FORM_SUBMITTED',
          JSON.stringify({ message_id: result.rows[0].id, email: email.trim() }),
          clientIp,
          req.headers['user-agent'] || ''
        ]
      );
    } catch (auditErr) {
      console.warn('[AUDIT LOG WARNING]', auditErr.message);
    }

    res.status(201).json({
      status: 'success',
      message: 'Pesan Anda berhasil diterima oleh tim PT Era Depo Prima.',
      data: {
        id: result.rows[0].id,
        created_at: result.rows[0].created_at
      }
    });
  } catch (err) {
    console.error('[DB CONTACT ERROR]', err);
    res.status(500).json({
      status: 'error',
      message: 'Gagal menyimpan pesan ke database. Silakan coba lagi nanti.'
    });
  }
});

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Resource not found' });
});

// Global Error Handler (No stacktrace leakage in production)
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// =============================================================================
// 4. SERVER START & GRACEFUL SHUTDOWN
// =============================================================================
const server = app.listen(PORT, () => {
  console.log(`[API SERVICE] Running securely on port ${PORT} in ${process.env.NODE_ENV || 'production'} mode`);
});

const gracefulShutdown = (signal) => {
  console.log(`[API SERVICE] Received ${signal}, closing server gracefully...`);
  server.close(async () => {
    try {
      await pgPool.end();
      if (redisClient) redisClient.disconnect();
      console.log('[API SERVICE] All connections closed cleanly.');
      process.exit(0);
    } catch (e) {
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
