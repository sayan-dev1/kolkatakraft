// backend/routes/auth.js
// Handles user registration, login, logout, and profile

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');

// Input sanitization - basic XSS/injection prevention
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'`]/g, '').trim().substring(0, 255);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    // Input validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }
    if (!['customer', 'artisan'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role selected' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const db = req.app.locals.db;

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(sanitize(email));
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db.prepare(`
      INSERT INTO users (name, email, password, role, phone, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sanitize(name), sanitize(email), hashedPassword, role, sanitize(phone || ''), sanitize(address || ''));

    // Auto-login after registration
    req.session.userId = result.lastInsertRowid;
    req.session.userRole = role;
    req.session.userName = sanitize(name);

    res.status(201).json({
      message: 'Account created successfully!',
      user: { id: result.lastInsertRowid, name: sanitize(name), role, email: sanitize(email) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = req.app.locals.db;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(sanitize(email));

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Set session
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    res.json({
      message: 'Login successful!',
      user: { id: user.id, name: user.name, role: user.role, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', message: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me — returns current session user
router.get('/me', requireLogin, (req, res) => {
  const db = req.app.locals.db;
  const user = db.prepare('SELECT id, name, email, role, phone, address, created_at FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// PUT /api/auth/profile — update profile
router.put('/profile', requireLogin, (req, res) => {
  const { name, phone, address } = req.body;
  const db = req.app.locals.db;
  db.prepare('UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?')
    .run(sanitize(name), sanitize(phone || ''), sanitize(address || ''), req.session.userId);
  req.session.userName = sanitize(name);
  res.json({ message: 'Profile updated successfully' });
});

module.exports = router;