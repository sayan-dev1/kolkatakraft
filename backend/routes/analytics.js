// backend/routes/analytics.js
// Customer analytics dashboard data

const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');

// GET /api/analytics/dashboard — main analytics data
router.get('/dashboard', requireRole('admin'), (req, res) => {
  const db = req.app.locals.db;

  // Most viewed products
  const topProducts = db.prepare(`
    SELECT p.id, p.name, p.category, p.views, p.price,
           COUNT(oi.id) as total_sold,
           COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    GROUP BY p.id ORDER BY p.views DESC LIMIT 10
  `).all();

  // Sales by category
  const salesByCategory = db.prepare(`
    SELECT p.category, COUNT(oi.id) as orders, SUM(oi.quantity) as units_sold,
           SUM(oi.quantity * oi.price) as revenue
    FROM order_items oi JOIN products p ON oi.product_id = p.id
    GROUP BY p.category ORDER BY revenue DESC
  `).all();

  // Daily sales trend (last 30 days)
  const salesTrend = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total_amount) as revenue
    FROM orders WHERE created_at >= date('now', '-30 days') AND status != 'cancelled'
    GROUP BY DATE(created_at) ORDER BY date ASC
  `).all();

  // Sales over time (last 7 days)
  const salesLast7Days = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total_amount) as revenue
    FROM orders WHERE created_at >= date('now', '-7 days') AND status != 'cancelled'
    GROUP BY DATE(created_at) ORDER BY date ASC
  `).all();

  // Repeat customers
  const repeatCustomers = db.prepare(`
    SELECT u.id, u.name, u.email, COUNT(o.id) as order_count, SUM(o.total_amount) as lifetime_value
    FROM orders o JOIN users u ON o.customer_id = u.id
    GROUP BY u.id HAVING order_count > 1 ORDER BY order_count DESC LIMIT 10
  `).all();

  // Page view stats
  const pageStats = db.prepare(`
    SELECT page, COUNT(*) as views FROM page_views
    GROUP BY page ORDER BY views DESC LIMIT 10
  `).all();

  // Total unique sessions (visitor count)
  const uniqueVisitors = db.prepare('SELECT COUNT(DISTINCT session_id) as count FROM page_views').get().count;

  // Cart conversion rate
  const cartAdditions = db.prepare("SELECT COUNT(*) as c FROM cart_actions WHERE action='add'").get().c;
  const checkouts = db.prepare("SELECT COUNT(*) as c FROM cart_actions WHERE action='checkout'").get().c;

  res.json({
    topProducts, salesByCategory, salesTrend, salesLast7Days, repeatCustomers,
    pageStats, uniqueVisitors, cartAdditions, checkouts,
    conversionRate: cartAdditions > 0 ? ((checkouts / cartAdditions) * 100).toFixed(1) : 0
  });
});

// GET /api/analytics/export/csv — export analytics as CSV
router.get('/export/csv', requireRole('admin'), (req, res) => {
  const db = req.app.locals.db;

  const data = db.prepare(`
    SELECT o.id as order_id, u.name as customer, u.email, o.total_amount,
           o.status, o.created_at, p.name as product, p.category,
           oi.quantity, oi.price
    FROM orders o
    JOIN users u ON o.customer_id = u.id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    ORDER BY o.created_at DESC
  `).all();

  const headers = ['order_id', 'customer', 'email', 'total_amount', 'status', 'created_at', 'product', 'category', 'quantity', 'price'];
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="kolkatakraft_analytics.csv"');
  res.send(csv);
});

// POST /api/analytics/track — track cart actions
router.post('/track', (req, res) => {
  const { productId, action, quantity } = req.body;
  const db = req.app.locals.db;
  if (!productId || !action) return res.status(400).json({ error: 'Missing data' });
  db.prepare('INSERT INTO cart_actions (session_id, user_id, product_id, action, quantity) VALUES (?, ?, ?, ?, ?)')
    .run(req.sessionID, req.session.userId || null, parseInt(productId), action, quantity || 1);
  res.json({ ok: true });
});

module.exports = router;