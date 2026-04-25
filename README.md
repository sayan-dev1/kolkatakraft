# 🏺 KolkataKraft
### Authentic West Bengal Handicraft E-Commerce Platform (BSc Data Science MVP)

> A hybrid B2C + B2B e-commerce marketplace that connects artisans from West Bengal (Bishnupur, Bankura, Murshidabad) with customers and bulk buyers globally — restoring post-COVID livelihoods through digital commerce.

---

## 📸 Project Overview

KolkataKraft is a full-stack MVP e-commerce platform featuring:
- **B2C**: Customers browse and buy handicrafts (Sarees, Terracotta, Dokra, Kantha Work)
- **B2B**: Wholesalers and exporters submit bulk enquiries with CSV (EDI-style) exports
- **Analytics**: Admin dashboard with sales trends, customer segmentation, and Python analysis scripts
- **3 User Roles**: Customer, Artisan/Seller, Admin

---

## 🗂️ Project Structure

```
kolkatakraft/
├── backend/
│   ├── server.js              # Express server entry point
│   ├── middleware/
│   │   └── auth.js            # Auth/role middleware
│   └── routes/
│       ├── auth.js            # Login, register, profile
│       ├── products.js        # Product CRUD + search
│       ├── orders.js          # Order placement, history
│       ├── b2b.js             # B2B enquiries + CSV export
│       ├── admin.js           # Admin user/order management
│       ├── analytics.js       # Analytics data + CSV export
│       └── cart.js            # Cart validation helpers
├── frontend/
│   ├── index.html             # Single-page application (all pages)
│   ├── css/
│   │   └── style.css          # Complete responsive design system
│   └── js/
│       └── app.js             # SPA router + all UI logic
├── database/
│   ├── init.js                # SQLite schema + seed data
│   └── kolkatakraft.db        # Auto-generated SQLite file
├── analytics/
│   └── analyze_sales.py       # Python CSV analysis script
├── package.json
└── README.md
```

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js 18+ (https://nodejs.org)
- Python 3.8+ (for analytics script, optional)

### 1. Install Dependencies

```bash
cd kolkatakraft
npm install
```

### 2. Start the Server

```bash
npm start
# OR for development with auto-restart:
npm run dev
```

### 3. Open in Browser

```
http://localhost:3000
```

The database is auto-created and seeded with demo data on first run.

---

## 👥 Demo Accounts

| Role     | Email                      | Password    |
|----------|----------------------------|-------------|
| 👑 Admin  | admin@kolkatakraft.com     | admin123    |
| 🧵 Artisan | rekha@artisan.com         | artisan123  |
| 🛍️ Customer | arjun@customer.com      | customer123  |

---

## ✨ Features

### 🛍️ Core E-Commerce
- [x] Product catalog with category filter + search
- [x] Product detail pages with related products
- [x] Shopping cart (localStorage-based, persistent)
- [x] Simulated checkout with mock payment options
- [x] Order history and status tracking

### 👤 User Roles
- [x] **Customer**: Browse, cart, checkout, order history
- [x] **Artisan**: Add/manage products, view sales
- [x] **Admin**: Manage users, products, orders, B2B, analytics

### 🏭 B2B Features
- [x] Bulk enquiry form for wholesalers/exporters
- [x] Admin panel to view and update enquiry status
- [x] CSV export (simulated EDI-compatible format)
- [x] Wholesale pricing display per product

### 📊 Analytics Dashboard
- [x] Unique visitor tracking (cookie/session-based)
- [x] Most viewed products
- [x] Revenue by category (bar charts)
- [x] Repeat customer identification
- [x] Top page views (CRM behavior)
- [x] Cart conversion rate
- [x] CSV export of full order data
- [x] Python analysis script (`analytics/analyze_sales.py`)

### 🔒 Security
- [x] bcrypt password hashing (industry standard)
- [x] Session-based authentication (HTTP-only cookies)
- [x] Input sanitization (XSS/injection prevention)
- [x] Role-based access control (RBAC)
- [x] Server-side price validation (prevents client tampering)
- [x] Simulated HTTPS mention in checkout

### 📱 UI/UX
- [x] Fully responsive (mobile, tablet, desktop)
- [x] Bengali cultural design system (terracotta, indigo, gold palette)
- [x] Single Page Application (no page reloads)
- [x] Toast notifications
- [x] Loading spinners

### 📋 Legal & Compliance
- [x] GST awareness notice in checkout and legal page
- [x] Cookie usage disclosure (privacy policy page)
- [x] Data privacy policy page

### 🔍 SEO
- [x] Complete meta tags (title, description, keywords)
- [x] Open Graph tags for social sharing
- [x] Semantic HTML structure

---

## 🐍 Python Analytics Script

```bash
# Export CSV from Admin Dashboard → Analytics → Export CSV
# Then run:
cd analytics
pip install matplotlib  # optional, for charts
python analyze_sales.py --file ../kolkatakraft_analytics.csv

# Output:
#   - Console report: sales trends, top products, customer segments
#   - JSON report: analytics_report.json
#   - PNG charts: kolkatakraft_analytics_charts.png (if matplotlib installed)
```

---

## 🛠️ Tech Stack

| Layer       | Technology         |
|-------------|-------------------|
| Backend     | Node.js + Express |
| Database    | SQLite (better-sqlite3) |
| Auth        | express-session + bcryptjs |
| Frontend    | HTML5 + CSS3 + Vanilla JS |
| Analytics   | Python 3 + matplotlib |

---

## 🔮 Future Improvements

1. **Real Payment Gateway**: Integrate Razorpay/PayU for actual transactions
2. **Image Upload**: Multer-based product image upload (currently mock)
3. **Email Notifications**: Nodemailer for order confirmation emails
4. **GST Integration**: Certified GST API (ClearTax/Zoho Books)
5. **Advanced Analytics**: Chart.js/D3.js for interactive frontend charts
6. **Search Enhancement**: Full-text search with SQLite FTS5
7. **Mobile App**: React Native wrapper for iOS/Android
8. **Artisan Verification**: KYC document upload and verification workflow
9. **Reviews & Ratings**: Customer review system with moderation
10. **Shipping Integration**: Delhivery/Shiprocket API for real-time tracking
11. **Redis Sessions**: Production session management
12. **HTTPS**: Production deployment with Let's Encrypt SSL
13. **Pagination**: Cursor-based pagination for large product catalogs
14. **Wishlist**: Save products for later feature

---

## 📝 Project Context

This platform was built as a **BSc Data Science academic project** to demonstrate:
- Full-stack web development (Node.js + SQLite + Vanilla JS)
- Business Intelligence (analytics dashboard, Python data analysis)
- Real-world application design (B2C + B2B hybrid model)
- Database design (normalized schema with seed data)
- Security best practices (hashing, RBAC, input sanitization)

**Problem Statement**: Post-COVID, ~40% of West Bengal handicraft artisans lost physical market access. KolkataKraft provides them with a digital storefront, analytics insights, and access to B2B export channels.

---

*Made with ❤️ for West Bengal Artisans | KolkataKraft 2024*