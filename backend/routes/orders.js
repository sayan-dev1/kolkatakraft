// backend/routes/orders.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');

// POST /api/orders — place order (checkout)
router.post('/', requireLogin, (req, res) => {
  const { items, shipping_address, payment_method } = req.body;
  const db = req.app.locals.db;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // Calculate total from actual DB prices (prevent client-side price tampering)
  let total = 0;
  for (const item of items) {
    const product = db.prepare('SELECT price, stock FROM products WHERE id = ?').get(item.productId);
    if (!product) return res.status(400).json({ error: `Product ${item.productId} not found` });
    if (product.stock < item.quantity) return res.status(400).json({ error: `Insufficient stock for product ${item.productId}` });
    total += product.price * item.quantity;
  }

  // Create order
  const order = db.prepare(`
    INSERT INTO orders (customer_id, total_amount, status, shipping_address, payment_method)
    VALUES (?, ?, 'confirmed', ?, ?)
  `).run(req.session.userId, total, shipping_address || '', payment_method || 'mock_payment');

  // Add order items + reduce stock
  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
  const reduceStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

  for (const item of items) {
    const product = db.prepare('SELECT price FROM products WHERE id = ?').get(item.productId);
    insertItem.run(order.lastInsertRowid, item.productId, item.quantity, product.price);
    reduceStock.run(item.quantity, item.productId);

    // Track cart checkout action
    db.prepare('INSERT INTO cart_actions (session_id, user_id, product_id, action, quantity) VALUES (?, ?, ?, ?, ?)')
      .run(req.sessionID, req.session.userId, item.productId, 'checkout', item.quantity);
  }

  res.status(201).json({
    message: 'Order placed successfully! 🎉',
    orderId: order.lastInsertRowid,
    total,
    status: 'confirmed'
  });
});

// GET /api/orders/my — customer's own orders
router.get('/my', requireLogin, (req, res) => {
  const db = req.app.locals.db;
  const orders = db.prepare(`
    SELECT o.*, GROUP_CONCAT(p.name, ', ') as product_names
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.customer_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(req.session.userId);

  res.json({ orders });
});

// PUT /api/orders/:id/cancel — cancel order (customer only)
router.put('/:id/cancel', requireLogin, (req, res) => {
  const db = req.app.locals.db;
  const orderId = parseInt(req.params.id);
  
  // Get order and verify ownership
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.customer_id !== req.session.userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Allow cancellation only for pending or confirmed orders
  if (!['pending', 'confirmed'].includes(order.status)) {
    return res.status(400).json({ error: `Cannot cancel order with status: ${order.status}` });
  }
  
  try {
    // Get all items in the order to return stock
    const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(orderId);
    
    // Return stock to inventory
    const returnStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
    for (const item of items) {
      returnStock.run(item.quantity, item.product_id);
    }
    
    // Update order status to cancelled
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', orderId);
    
    res.json({ message: 'Order cancelled successfully', status: 'cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel order: ' + err.message });
  }
});

// GET /api/orders/:id — order detail
router.get('/:id', requireLogin, (req, res) => {
  const db = req.app.locals.db;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.customer_id !== req.session.userId && req.session.userRole !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const items = db.prepare(`
    SELECT oi.*, p.name, p.image_url, u.name as artisan_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON p.artisan_id = u.id
    WHERE oi.order_id = ?
  `).all(order.id);

  res.json({ order, items });
});

module.exports = router;