// database/init.js
// Initializes SQLite database with all required tables and seed data

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'kolkatakraft.db');

function initDB() {
  const db = new Database(DB_PATH);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // --- USERS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('customer', 'artisan', 'admin')),
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // --- PRODUCTS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      bulk_price REAL,
      min_bulk_qty INTEGER DEFAULT 10,
      category TEXT NOT NULL,
      artisan_id INTEGER NOT NULL,
      image_url TEXT DEFAULT '/frontend/images/placeholder.jpg',
      stock INTEGER DEFAULT 100,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(artisan_id) REFERENCES users(id)
    )
  `);

  // --- ORDERS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'confirmed' CHECK(status IN ('pending','confirmed','shipped','delivered','cancelled')),
      payment_method TEXT DEFAULT 'mock_payment',
      shipping_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES users(id)
    )
  `);

  // --- ORDER ITEMS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  // --- B2B ENQUIRIES TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS b2b_enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      product_category TEXT,
      quantity INTEGER,
      message TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','reviewed','accepted','rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // --- ANALYTICS / PAGE VIEWS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      user_id INTEGER,
      page TEXT NOT NULL,
      product_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // --- CART ACTIONS TABLE (CRM behavior tracking) ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS cart_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      user_id INTEGER,
      product_id INTEGER NOT NULL,
      action TEXT CHECK(action IN ('add','remove','checkout')),
      quantity INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // --- SEED DATA ---
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const hash = (pw) => bcrypt.hashSync(pw, 10);

    // Seed users
    const insertUser = db.prepare(
      'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)'
    );

    insertUser.run('Admin KolkataKraft', 'admin@kolkatakraft.com', hash('admin123'), 'admin', '9000000001', 'Kolkata, West Bengal');
    insertUser.run('Rekha Devi', 'rekha@artisan.com', hash('artisan123'), 'artisan', '9000000002', 'Bishnupur, West Bengal');
    insertUser.run('Madan Pal', 'madan@artisan.com', hash('artisan123'), 'artisan', '9000000003', 'Bankura, West Bengal');
    insertUser.run('Sunita Mondal', 'sunita@artisan.com', hash('artisan123'), 'artisan', '9000000004', 'Murshidabad, West Bengal');
    insertUser.run('Arjun Sen', 'arjun@customer.com', hash('customer123'), 'customer', '9000000005', 'Salt Lake, Kolkata');
    insertUser.run('Priya Bose', 'priya@customer.com', hash('customer123'), 'customer', '9000000006', 'Park Street, Kolkata');
    insertUser.run('Rahul Das', 'rahul@customer.com', hash('customer123'), 'customer', '9000000007', 'Howrah, West Bengal');

    // Seed products
    const insertProduct = db.prepare(`
      INSERT INTO products (name, description, price, bulk_price, min_bulk_qty, category, artisan_id, image_url, stock, views)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const products = [
  ['Bankura Horse Sculpture', 'Hand-crafted terracotta horse sculpture from Bankura, depicting traditional Bengali folk art with intricate detailing and natural clay finish.', 1200, 950, 10, 'Terracotta Decor', 3, '/images/terracotta1.jpg', 60, 150],
  ['Terracotta Wall Mask', 'Decorative terracotta wall mask with tribal motifs, kiln-fired and hand-painted, perfect for home or office decor.', 800, 650, 15, 'Terracotta Decor', 3, '/images/terracotta2.jpg', 80, 120],
  ['Handmade Clay Hanging Lamp', 'Eco-friendly clay hanging lamp with traditional patterns, includes bulb holder and natural rope for hanging.', 1500, 1200, 8, 'Terracotta Decor', 3, '/images/terracotta3.jpg', 40, 90],
  ['Rustic Terracotta Planter', 'Large terracotta planter with rustic finish, ideal for indoor plants, hand-molded and naturally glazed.', 600, 480, 20, 'Terracotta Decor', 3, '/images/terracotta4.jpg', 100, 200],

  ['Dokra Tribal Musician Figurine', 'Lost-wax cast Dokra metal figurine of a tribal musician, showcasing ancient bell-metal craftsmanship from Bankura.', 2200, 1800, 5, 'Dokra Metal Art', 3, '/images/dokra1.jpg', 30, 80],
  ['Dokra Bull Sculpture', 'Handcrafted Dokra bull sculpture in brass alloy, oxidized finish representing tribal heritage and strength.', 1800, 1450, 10, 'Dokra Metal Art', 3, '/images/dokra2.jpg', 50, 110],
  ['Dokra Pen Stand', 'Elegant Dokra pen stand with tribal designs, perfect for desks, made using traditional casting techniques.', 700, 560, 25, 'Dokra Metal Art', 3, '/images/dokra3.jpg', 70, 60],
  ['Dokra Wall Hanging Plate', 'Decorative Dokra wall plate with intricate patterns, oxidized brass finish, ideal for wall decor.', 1300, 1050, 12, 'Dokra Metal Art', 3, '/images/dokra4.jpg', 45, 95],

  ['Kalighat Style Wall Painting', 'Hand-painted Kalighat style wall art on canvas, depicting Bengali folk scenes with vibrant colors and traditional motifs.', 2500, 2000, 6, 'Folk & Hand-Painted Art', 2, '/images/painting1.jpg', 25, 70],
  ['Pattachitra Art Panel', 'Traditional Pattachitra art panel on palm leaf, showcasing mythological stories with natural dyes and fine brushwork.', 1800, 1450, 8, 'Folk & Hand-Painted Art', 2, '/images/painting2.jpg', 35, 85],
  ['Hand-Painted Wooden Storage Box', 'Wooden storage box hand-painted with folk art designs, perfect for keeping small items organized.', 900, 720, 15, 'Folk & Hand-Painted Art', 2, '/images/box1.jpg', 55, 100],

  ['Kantha Embroidered Cushion Cover', 'Hand-embroidered Kantha cushion cover with running stitch patterns, made from soft cotton fabric.', 1200, 960, 10, 'Kantha Home Decor', 4, '/images/kantha1.jpg', 40, 130],
  ['Kantha Wall Hanging', 'Beautiful Kantha wall hanging with intricate embroidery, ideal for home decor and cultural display.', 1600, 1280, 8, 'Kantha Home Decor', 4, '/images/kantha2.jpg', 30, 75],
  ['Kantha Table Runner', 'Hand-stitched Kantha table runner with floral motifs, perfect for dining tables and festive occasions.', 1000, 800, 12, 'Kantha Home Decor', 4, '/images/kantha3.jpg', 50, 90],

  ['Bamboo Hanging Lamp', 'Eco-friendly bamboo hanging lamp with woven design, includes LED bulb holder for modern lighting.', 1100, 880, 10, 'Bamboo & Wooden Crafts', 2, '/images/bamboo1.jpg', 60, 140],
  ['Hand-Carved Wooden Mask', 'Intricately carved wooden mask depicting folk characters, handcrafted from sustainable wood.', 750, 600, 20, 'Bamboo & Wooden Crafts', 2, '/images/wood1.jpg', 80, 110],
  ['Wooden Folk Toy Set', 'Set of traditional wooden folk toys, hand-carved and painted, perfect for children and collectors.', 500, 400, 30, 'Bamboo & Wooden Crafts', 2, '/images/toy1.jpg', 90, 160],
  ['Bamboo Storage Basket', 'Woven bamboo storage basket with natural finish, ideal for organizing household items.', 400, 320, 40, 'Bamboo & Wooden Crafts', 2, '/images/basket1.jpg', 120, 180],

  ['Handmade Clay Aroma Diffuser', 'Terracotta aroma diffuser with essential oil holder, handmade and perfect for home fragrance.', 550, 440, 25, 'Artisan Utility Products', 3, '/images/diffuser1.jpg', 70, 50],
  ['Eco-Friendly Soap Holder', 'Handcrafted clay soap holder with drainage design, eco-friendly and functional for bathrooms.', 300, 240, 50, 'Artisan Utility Products', 3, '/images/holder1.jpg', 150, 40],
  ['Handmade Paper Journal', 'Journal made from handmade paper with folk art cover, ideal for writing and sketching.', 450, 360, 30, 'Artisan Utility Products', 4, '/images/journal1.jpg', 80, 65],
  ['Artisan Desk Organizer', 'Wooden desk organizer with compartments, hand-carved and perfect for office use.', 800, 640, 15, 'Artisan Utility Products', 2, '/images/organizer1.jpg', 60, 55],
  ['Decorative Incense Holder', 'Clay incense holder with traditional designs, handmade and suitable for home rituals.', 250, 200, 60, 'Artisan Utility Products', 3, '/images/incense1.jpg', 200, 30],
];

    products.forEach(p => insertProduct.run(...p));

    // Seed some orders
    const insertOrder = db.prepare('INSERT INTO orders (customer_id, total_amount, status, shipping_address) VALUES (?, ?, ?, ?)');
    const insertOrderItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');

    const o1 = insertOrder.run(5, 5350, 'delivered', 'Salt Lake, Kolkata - 700064');
    insertOrderItem.run(o1.lastInsertRowid, 1, 1, 4500);
    insertOrderItem.run(o1.lastInsertRowid, 7, 1, 850); // wait, saree3=2800, let me fix prices

    const o2 = insertOrder.run(6, 4050, 'shipped', 'Park Street, Kolkata - 700016');
    insertOrderItem.run(o2.lastInsertRowid, 3, 2, 850);
    insertOrderItem.run(o2.lastInsertRowid, 5, 1, 1800);
    insertOrderItem.run(o2.lastInsertRowid, 6, 1, 550);

    const o3 = insertOrder.run(7, 2400, 'confirmed', 'Howrah - 711101');
    insertOrderItem.run(o3.lastInsertRowid, 8, 1, 2400);

    const o4 = insertOrder.run(5, 3200, 'delivered', 'Salt Lake, Kolkata - 700064');
    insertOrderItem.run(o4.lastInsertRowid, 2, 1, 3200);

    // Seed B2B enquiries
    const insertB2B = db.prepare(`
      INSERT INTO b2b_enquiries (company_name, contact_person, email, phone, product_category, quantity, message, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertB2B.run('Global Crafts Exports Ltd', 'Mr. Singh', 'singh@globalcrafts.com', '9876543210', 'Dokra', 500, 'Interested in bulk Dokra figurines for export to UK markets. Please share catalog and pricing.', 'reviewed');
    insertB2B.run('Heritage Home Decor', 'Ms. Sharma', 'sharma@heritage.in', '9876543211', 'Terracotta', 200, 'Need terracotta items for our chain of home decor stores across South India.', 'pending');
    insertB2B.run('Ethnic Bazaar Online', 'Raj Kumar', 'raj@ethnicbazaar.com', '9876543212', 'Saree', 150, 'Looking to source authentic Bengali sarees for our e-commerce platform. MOQ 50 pieces per design.', 'accepted');

    // Seed page views analytics
    const insertView = db.prepare('INSERT INTO page_views (session_id, user_id, page, product_id) VALUES (?, ?, ?, ?)');
    const sessions = ['sess_a1b2', 'sess_c3d4', 'sess_e5f6', 'sess_g7h8', 'sess_i9j0'];
    const pages = ['/', '/products', '/products/3', '/products/5', '/products/1'];
    for (let i = 0; i < 50; i++) {
      insertView.run(
        sessions[i % 5],
        (i % 3 === 0) ? 5 : (i % 3 === 1) ? 6 : null,
        pages[i % 5],
        (i % 5 >= 2) ? (i % 5) : null
      );
    }

    console.log('✅ Database seeded successfully!');
  }

  return db;
}

module.exports = { initDB, DB_PATH };