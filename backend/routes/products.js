// backend/routes/products.js
// Product catalog — CRUD, filtering, search

const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'`]/g, '').trim().substring(0, 500);
}

// GET /api/products — list all products with optional filters
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { category, search, limit = 20, offset = 0 } = req.query;

  let query = `
    SELECT p.*, u.name as artisan_name, u.address as artisan_location
    FROM products p
    JOIN users u ON p.artisan_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (category && category !== 'All') {
    query += ' AND p.category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${sanitize(search)}%`, `%${sanitize(search)}%`);
  }

  query += ' ORDER BY p.views DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const products = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM products').get().c;

  res.json({ products, total });
});

// GET /api/products/categories
router.get('/categories', (req, res) => {
  const db = req.app.locals.db;
  const cats = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
  res.json({ categories: ['All', ...cats.map(c => c.category)] });
});

// GET /api/products/:id — single product detail + increment views
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id);

  if (isNaN(id)) return res.status(400).json({ error: 'Invalid product ID' });

  // Increment view count
  db.prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(id);

  const product = db.prepare(`
    SELECT p.*, u.name as artisan_name, u.address as artisan_location, u.phone as artisan_phone
    FROM products p JOIN users u ON p.artisan_id = u.id
    WHERE p.id = ?
  `).get(id);

  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Related products (same category)
  const related = db.prepare(`
    SELECT p.*, u.name as artisan_name FROM products p
    JOIN users u ON p.artisan_id = u.id
    WHERE p.category = ? AND p.id != ? LIMIT 4
  `).all(product.category, id);

  res.json({ product, related });
});

// POST /api/products — artisan adds product
router.post('/', requireRole('artisan', 'admin'), (req, res) => {
  const { name, description, price, bulk_price, min_bulk_qty, category, stock, image_url } = req.body;
  const db = req.app.locals.db;

  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }

  const result = db.prepare(`
    INSERT INTO products (name, description, price, bulk_price, min_bulk_qty, category, artisan_id, stock, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sanitize(name), sanitize(description || ''), parseFloat(price),
    bulk_price ? parseFloat(bulk_price) : null,
    min_bulk_qty ? parseInt(min_bulk_qty) : 10,
    sanitize(category), req.session.userId,
    stock ? parseInt(stock) : 100,
    sanitize(image_url || '/frontend/images/placeholder.jpg')
  );

  res.status(201).json({ message: 'Product added successfully', id: result.lastInsertRowid });
});

// PUT /api/products/:id — artisan edits product
router.put('/:id', requireRole('artisan', 'admin'), (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id);
  const { name, description, price, bulk_price, min_bulk_qty, category, stock, image_url } = req.body;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Artisans can only edit their own products
  if (req.session.userRole === 'artisan' && product.artisan_id !== req.session.userId) {
    return res.status(403).json({ error: 'You can only edit your own products' });
  }

  db.prepare(`
    UPDATE products SET name=?, description=?, price=?, bulk_price=?, min_bulk_qty=?, category=?, stock=?, image_url=?
    WHERE id=?
  `).run(
    sanitize(name), sanitize(description || ''), parseFloat(price),
    bulk_price ? parseFloat(bulk_price) : null,
    parseInt(min_bulk_qty || 10), sanitize(category),
    parseInt(stock || 100), sanitize(image_url || product.image_url), id
  );

  res.json({ message: 'Product updated successfully' });
});

// DELETE /api/products/:id
router.delete('/:id', requireRole('artisan', 'admin'), (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (req.session.userRole === 'artisan' && product.artisan_id !== req.session.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ message: 'Product deleted' });
});

// GET /api/products/artisan/my — artisan's own products
router.get('/artisan/my', requireRole('artisan', 'admin'), (req, res) => {
  const db = req.app.locals.db;
  const products = db.prepare('SELECT * FROM products WHERE artisan_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.json({ products });
});

module.exports = router;