// backend/routes/b2b.js
// B2B wholesale enquiry management

const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'`]/g, '').trim().substring(0, 1000);
}

// POST /api/b2b/enquiry — submit bulk enquiry (public)
router.post('/enquiry', (req, res) => {
  const { company_name, contact_person, email, phone, product_category, quantity, message } = req.body;
  const db = req.app.locals.db;

  if (!company_name || !contact_person || !email) {
    return res.status(400).json({ error: 'Company name, contact person, and email are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  db.prepare(`
    INSERT INTO b2b_enquiries (company_name, contact_person, email, phone, product_category, quantity, message)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    sanitize(company_name), sanitize(contact_person), sanitize(email),
    sanitize(phone || ''), sanitize(product_category || ''),
    quantity ? parseInt(quantity) : null, sanitize(message || '')
  );

  res.status(201).json({ message: 'Enquiry submitted! We\'ll contact you within 48 hours.' });
});

// GET /api/b2b/enquiries — admin view all enquiries
router.get('/enquiries', requireRole('admin'), (req, res) => {
  const db = req.app.locals.db;
  const enquiries = db.prepare('SELECT * FROM b2b_enquiries ORDER BY created_at DESC').all();
  res.json({ enquiries });
});

// PUT /api/b2b/enquiries/:id — update status
router.put('/enquiries/:id', requireRole('admin'), (req, res) => {
  const { status } = req.body;
  const db = req.app.locals.db;
  const valid = ['pending', 'reviewed', 'accepted', 'rejected'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE b2b_enquiries SET status = ? WHERE id = ?').run(status, parseInt(req.params.id));
  res.json({ message: 'Enquiry status updated' });
});

// GET /api/b2b/export/csv — export enquiries as CSV (simulated EDI)
router.get('/export/csv', requireRole('admin'), (req, res) => {
  const db = req.app.locals.db;
  const enquiries = db.prepare('SELECT * FROM b2b_enquiries ORDER BY created_at DESC').all();

  const headers = ['id', 'company_name', 'contact_person', 'email', 'phone', 'product_category', 'quantity', 'message', 'status', 'created_at'];
  const csvRows = [
    headers.join(','),
    ...enquiries.map(e => headers.map(h => `"${(e[h] || '').toString().replace(/"/g, '""')}"`).join(','))
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="b2b_enquiries_kolkatakraft.csv"');
  res.send(csvRows.join('\n'));
});

module.exports = router;