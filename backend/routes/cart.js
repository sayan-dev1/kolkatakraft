// backend/routes/cart.js
// Server-side cart helpers (cart stored client-side in localStorage for simplicity)

const express = require('express');
const router = express.Router();

// GET /api/cart/validate — validate cart items against live DB stock/prices
router.post('/validate', (req, res) => {
  const { items } = req.body;
  const db = req.app.locals.db;

  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Invalid cart data' });

  const validated = [];
  for (const item of items) {
    const product = db.prepare('SELECT id, name, price, stock, image_url FROM products WHERE id = ?').get(item.productId);
    if (product) {
      validated.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        quantity: Math.min(item.quantity, product.stock),
        availableStock: product.stock
      });
    }
  }

  const total = validated.reduce((sum, i) => sum + i.price * i.quantity, 0);
  res.json({ items: validated, total });
});

module.exports = router;