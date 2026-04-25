// backend/server.js
// KolkataKraft - Main Express Server
// Entry point for the entire application

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const { initDB } = require('../database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = initDB();
app.locals.db = db; // Make db available to all routes

// ---- MIDDLEWARE ----
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration (cookie-based, no real secret in demo)
app.use(session({
  secret: 'kolkatakraft_secret_2024',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // In production: true with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Track page views for analytics (CRM behavior tracking)
app.use((req, res, next) => {
  // Only track GET requests to actual pages, not API calls or static files
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
    const productMatch = req.path.match(/\/products\/(\d+)/);
    try {
      db.prepare(`
        INSERT INTO page_views (session_id, user_id, page, product_id)
        VALUES (?, ?, ?, ?)
      `).run(
        req.sessionID,
        req.session.userId || null,
        req.path,
        productMatch ? parseInt(productMatch[1]) : null
      );
    } catch (e) { /* Silently ignore tracking errors */ }
  }
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// ---- ROUTES ----
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const b2bRoutes = require('./routes/b2b');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const cartRoutes = require('./routes/cart');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/b2b', b2bRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cart', cartRoutes);

// ---- SPA FALLBACK ----
// Serve index.html for all non-API routes (single page app behavior)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// ---- GLOBAL ERROR HANDLER ----
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║        KolkataKraft Server Started           ║
║   West Bengal Handicraft E-Commerce MVP      ║
╠══════════════════════════════════════════════╣
║  🌐 http://localhost:${PORT}                    ║
║  📦 Database: SQLite (kolkatakraft.db)       ║
║  🔐 Sessions: Active                         ║
╠══════════════════════════════════════════════╣
║  Demo Accounts:                              ║
║  admin@kolkatakraft.com / admin123           ║
║  rekha@artisan.com / artisan123              ║
║  arjun@customer.com / customer123            ║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;