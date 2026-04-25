// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');

// GET /api/admin/users
router.get('/users', requireRole('admin'), (req, res) => {
  const db = req.app.locals.db;
  const users = db.prepare('SELECT id, name, email, role, phone, address, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireRole('admin'), (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id);
  if (id === req.session.userId) return res.status(400).json({ error: 'Cannot delete your own account' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ message: 'User deleted' });
});

// GET /api/admin/orders — all orders
router.get('/orders', requireRole('admin'), (req, res) => {
  const db = req.app.locals.db;
  const orders = db.prepare(`
    SELECT o.*, u.name as customer_name, u.email as customer_email
    FROM orders o JOIN users u ON o.customer_id = u.id
    ORDER BY o.created_at DESC
  `).all();
  res.json({ orders });
});

// PUT /api/admin/orders/:id/status
router.put('/orders/:id/status', requireRole('admin'), (req, res) => {
  const { status } = req.body;
  const db = req.app.locals.db;
  const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, parseInt(req.params.id));
  res.json({ message: 'Order status updated' });
});

// GET /api/admin/stats — dashboard overview stats
router.get('/stats', requireRole('admin'), (req, res) => {
  const db = req.app.locals.db;
  const stats = {
    totalUsers: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    totalCustomers: db.prepare("SELECT COUNT(*) as c FROM users WHERE role='customer'").get().c,
    totalArtisans: db.prepare("SELECT COUNT(*) as c FROM users WHERE role='artisan'").get().c,
    totalProducts: db.prepare('SELECT COUNT(*) as c FROM products').get().c,
    totalOrders: db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
    totalRevenue: db.prepare("SELECT COALESCE(SUM(total_amount),0) as s FROM orders WHERE status != 'cancelled'").get().s,
    pendingB2B: db.prepare("SELECT COUNT(*) as c FROM b2b_enquiries WHERE status='pending'").get().c,
    totalPageViews: db.prepare('SELECT COUNT(*) as c FROM page_views').get().c,
  };
  res.json({ stats });
});

// GET /api/admin/products
router.get('/products', requireRole('admin'), (req, res) => {
  const db = req.app.locals.db;
  const products = db.prepare(`
    SELECT p.*, u.name as artisan_name FROM products p
    JOIN users u ON p.artisan_id = u.id ORDER BY p.created_at DESC
  `).all();
  res.json({ products });
});

module.exports = router;