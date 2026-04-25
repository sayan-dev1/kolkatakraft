// frontend/js/app.js
// KolkataKraft — Single Page Application Core
// All routing, state management, and API communication

'use strict';

// ============================================================
// STATE
// ============================================================
const State = {
  user: null,      // Current logged-in user
  cart: [],        // [{productId, name, price, quantity, image_url}]
  currentPage: 'home',
};

// ============================================================
// API HELPERS
// ============================================================
const API = {
  async request(method, path, body) {
    try {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch('/api' + path, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      throw err;
    }
  },
  get:    (path)       => API.request('GET', path),
  post:   (path, body) => API.request('POST', path, body),
  put:    (path, body) => API.request('PUT', path, body),
  delete: (path)       => API.request('DELETE', path),
};

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function toast(msg, type = 'success') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span style="font-size:1.1rem">${icons[type]}</span><span style="font-size:0.875rem;font-weight:500">${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ============================================================
// ROUTER
// ============================================================
function navigate(page, params = {}) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.add('active');
    State.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateNavActive(page);
  }

  // Load page data
  switch (page) {
    case 'home':     renderHome(); break;
    case 'products': renderProducts(params.category); break;
    case 'product':  renderProductDetail(params.id); break;
    case 'cart':     renderCart(); break;
    case 'checkout': renderCheckout(); break;
    case 'dashboard': renderDashboard(); break;
    case 'auth':     renderAuth(params.tab); break;
    case 'b2b':      renderB2B(); break;
    case 'privacy':  break;
    case 'legal':    break;
  }
}

function updateNavActive(page) {
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
  updateCartBadge();
  updateUserNav();
}

// ============================================================
// CART MANAGEMENT (localStorage)
// ============================================================
function loadCart() {
  try { State.cart = JSON.parse(localStorage.getItem('kk_cart') || '[]'); } catch { State.cart = []; }
}

function saveCart() {
  localStorage.setItem('kk_cart', JSON.stringify(State.cart));
  updateCartBadge();
}

function addToCart(product, quantity = 1) {
  const existing = State.cart.find(i => i.productId === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    State.cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image_url: product.image_url,
      category: product.category,
    });
  }
  saveCart();
  toast(`"${product.name}" added to cart 🛒`);
  // Track analytics
  API.post('/analytics/track', { productId: product.id, action: 'add', quantity }).catch(() => {});
}

function removeFromCart(productId) {
  State.cart = State.cart.filter(i => i.productId !== productId);
  saveCart();
  renderCart();
}

function updateCartQty(productId, qty) {
  const item = State.cart.find(i => i.productId === productId);
  if (item) {
    if (qty <= 0) removeFromCart(productId);
    else { item.quantity = qty; saveCart(); renderCart(); }
  }
}

function cartTotal() {
  return State.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

function updateCartBadge() {
  const count = State.cart.reduce((s, i) => s + i.quantity, 0);
  const badge = document.querySelector('.cart-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// ============================================================
// AUTH
// ============================================================
async function checkAuth() {
  try {
    const data = await API.get('/auth/me');
    State.user = data.user;
  } catch {
    State.user = null;
  }
  updateUserNav();
}

function updateUserNav() {
  const navExtra = document.getElementById('nav-extra');
  if (!navExtra) return;
  if (State.user) {
    navExtra.innerHTML = `
      <li><span class="nav-user-chip">👤 ${State.user.name.split(' ')[0]}</span></li>
      <li><a data-page="dashboard" onclick="navigate('dashboard')">Dashboard</a></li>
      <li><button onclick="logout()">Logout</button></li>
    `;
  } else {
    navExtra.innerHTML = `
      <li><a onclick="navigate('auth', {tab:'login'})">Login</a></li>
      <li><a onclick="navigate('auth', {tab:'register'})" style="background:var(--red-clay);color:#fff;padding:7px 14px;border-radius:6px">Sign Up</a></li>
    `;
  }
}

async function logout() {
  await API.post('/auth/logout');
  State.user = null;
  updateUserNav();
  toast('Logged out successfully', 'info');
  navigate('home');
}

// ============================================================
// RENDER: HOME
// ============================================================
async function renderHome() {
  try {
    const { products } = await API.get('/products?limit=8');
    const grid = document.getElementById('home-featured-grid');
    if (grid) grid.innerHTML = products.map(productCard).join('');
  } catch (err) {
    console.error('Home render error:', err);
  }
}

// ============================================================
// RENDER: PRODUCTS PAGE
// ============================================================
let productsState = { category: 'All', search: '', offset: 0 };

async function renderProducts(initialCategory) {
  if (initialCategory) productsState.category = initialCategory;
  const { products, total } = await API.get(
    `/products?category=${encodeURIComponent(productsState.category)}&search=${encodeURIComponent(productsState.search)}&limit=12`
  );
  const { categories } = await API.get('/products/categories');

  document.getElementById('products-pills').innerHTML = categories.map(cat =>
    `<button class="pill ${cat === productsState.category ? 'active' : ''}" onclick="filterCategory('${cat}')">${cat}</button>`
  ).join('');

  const grid = document.getElementById('products-grid');
  grid.innerHTML = products.length
    ? products.map(productCard).join('')
    : '<div style="text-align:center;padding:60px;color:var(--muted)">No products found. Try a different filter.</div>';

  document.getElementById('products-count').textContent = `Showing ${products.length} of ${total} products`;
}

function filterCategory(cat) {
  productsState.category = cat;
  renderProducts();
}

function searchProducts() {
  productsState.search = document.getElementById('products-search').value;
  renderProducts();
}

function productCard(p) {
  const emoji = categoryEmoji(p.category);
  return `
    <div class="product-card" onclick="navigate('product', {id: ${p.id}})">
      <div class="product-card-img">
        ${p.image_url && !p.image_url.includes('placeholder')
          ? `<img src="${p.image_url}" alt="${p.name}" onerror="this.parentElement.innerHTML='<span style=font-size:4rem>${emoji}</span>'">`
          : `<span style="font-size:4rem">${emoji}</span>`}
        <span class="product-badge">${p.category}</span>
      </div>
      <div class="product-card-body">
        <div class="product-category-tag">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-artisan">by ${p.artisan_name} · ${(p.artisan_location || '').split(',')[0]}</div>
        <div class="product-price-row">
          <div>
            <span class="product-price">₹${p.price.toLocaleString('en-IN')}</span>
            ${p.bulk_price ? `<div class="product-bulk-price">Bulk: ₹${p.bulk_price.toLocaleString('en-IN')} (min ${p.min_bulk_qty})</div>` : ''}
          </div>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); quickAddToCart(${p.id})">+ Cart</button>
        </div>
      </div>
    </div>
  `;
}

function categoryEmoji(cat) {
  const map = { 'Saree': '🥻', 'Terracotta': '🏺', 'Dokra': '🔔', 'Kantha Work': '🧵' };
  return map[cat] || '🎨';
}

async function quickAddToCart(id) {
  try {
    const { product } = await API.get(`/products/${id}`);
    addToCart(product);
  } catch { toast('Failed to add to cart', 'error'); }
}

// ============================================================
// RENDER: PRODUCT DETAIL
// ============================================================
async function renderProductDetail(id) {
  const page = document.getElementById('page-product');
  page.innerHTML = `<div class="container section"><div class="spinner"></div></div>`;

  try {
    const { product, related } = await API.get(`/products/${id}`);
    const emoji = categoryEmoji(product.category);

    page.innerHTML = `
      <div class="container section">
        <div style="margin-bottom:16px">
          <a onclick="navigate('products')" style="color:var(--red-clay);cursor:pointer;font-size:0.875rem">← Back to Products</a>
        </div>
        <div class="product-detail-grid">
          <div class="product-detail-img">
            ${product.image_url && !product.image_url.includes('placeholder')
              ? `<img src="${product.image_url}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='<span style=font-size:6rem>${emoji}</span>'">`
              : `<span style="font-size:6rem">${emoji}</span>`}
          </div>
          <div>
            <div class="product-category-tag" style="font-size:0.8rem;margin-bottom:8px">${product.category}</div>
            <h1 style="font-family:var(--font-display);font-size:1.8rem;font-weight:700;margin-bottom:8px;color:var(--charcoal)">${product.name}</h1>
            <div style="font-size:0.875rem;color:var(--muted);margin-bottom:16px">
              Crafted by <strong>${product.artisan_name}</strong> · ${product.artisan_location || 'West Bengal'}
            </div>
            <div style="font-size:2rem;font-weight:700;color:var(--indigo);margin-bottom:8px">₹${product.price.toLocaleString('en-IN')}</div>
            ${product.bulk_price ? `
              <div class="info-banner">
                🏭 Bulk price: <strong>₹${product.bulk_price.toLocaleString('en-IN')}</strong> for min ${product.min_bulk_qty} units.
                <a onclick="navigate('b2b')" style="color:var(--indigo);font-weight:600;cursor:pointer;margin-left:4px">Enquire →</a>
              </div>` : ''}
            <p style="color:var(--muted);line-height:1.8;margin-bottom:24px">${product.description}</p>
            <div style="margin-bottom:16px">
              <label style="font-size:0.85rem;font-weight:600;margin-bottom:6px;display:block">Quantity</label>
              <div class="qty-control">
                <button class="qty-btn" onclick="changeDetailQty(-1)">−</button>
                <span id="detail-qty" style="font-weight:600;min-width:30px;text-align:center">1</span>
                <button class="qty-btn" onclick="changeDetailQty(1)">+</button>
              </div>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <button class="btn btn-primary btn-lg" onclick="addDetailToCart(${product.id})">🛒 Add to Cart</button>
              <button class="btn btn-secondary btn-lg" onclick="navigate('cart')">View Cart</button>
            </div>
            <div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--border)">
              <div style="display:flex;gap:24px;flex-wrap:wrap">
                <div style="font-size:0.8rem;color:var(--muted)">👁️ ${product.views} views</div>
                <div style="font-size:0.8rem;color:var(--muted)">📦 ${product.stock} in stock</div>
                <div style="font-size:0.8rem;color:var(--success)">✅ Authentic Handicraft</div>
              </div>
            </div>
          </div>
        </div>
        ${related.length ? `
          <div style="margin-top:60px">
            <h2 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:24px">Related Products</h2>
            <div class="products-grid">${related.map(productCard).join('')}</div>
          </div>` : ''}
      </div>
    `;

    // Store current product for add-to-cart
    page._product = product;
  } catch (err) {
    page.innerHTML = `<div class="container section" style="text-align:center;padding:80px"><div style="font-size:3rem">😕</div><p>Product not found</p><button class="btn btn-primary" onclick="navigate('products')" style="margin-top:16px">Browse Products</button></div>`;
  }
}

let detailQty = 1;
function changeDetailQty(delta) {
  detailQty = Math.max(1, detailQty + delta);
  const el = document.getElementById('detail-qty');
  if (el) el.textContent = detailQty;
}

async function addDetailToCart(id) {
  const page = document.getElementById('page-product');
  if (page._product) addToCart(page._product, detailQty);
  else await quickAddToCart(id);
}

// ============================================================
// RENDER: CART
// ============================================================
function renderCart() {
  const container = document.getElementById('cart-content');
  if (!container) return;

  if (State.cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:80px 20px">
        <div style="font-size:4rem;margin-bottom:16px">🛒</div>
        <h2 style="font-family:var(--font-display);margin-bottom:8px">Your cart is empty</h2>
        <p style="color:var(--muted);margin-bottom:24px">Discover authentic West Bengal handicrafts</p>
        <button class="btn btn-primary btn-lg" onclick="navigate('products')">Browse Products</button>
      </div>
    `;
    document.getElementById('cart-summary').style.display = 'none';
    return;
  }

  const itemsHtml = State.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">
        ${item.image_url && !item.image_url.includes('placeholder')
          ? `<img src="${item.image_url}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover">`
          : `<span>${categoryEmoji(item.category)}</span>`}
      </div>
      <div>
        <div style="font-weight:600;font-size:0.9rem;margin-bottom:2px">${item.name}</div>
        <div style="font-size:0.8rem;color:var(--muted);margin-bottom:8px">₹${item.price.toLocaleString('en-IN')} each</div>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateCartQty(${item.productId}, ${item.quantity - 1})">−</button>
          <span style="font-weight:600;min-width:28px;text-align:center">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQty(${item.productId}, ${item.quantity + 1})">+</button>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;color:var(--indigo);margin-bottom:8px">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
        <button onclick="removeFromCart(${item.productId})" style="background:none;color:var(--danger);font-size:0.8rem;cursor:pointer;border:none">Remove</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = itemsHtml;

  const summary = document.getElementById('cart-summary');
  summary.style.display = 'block';
  document.getElementById('cart-subtotal').textContent = `₹${cartTotal().toLocaleString('en-IN')}`;
  document.getElementById('cart-total').textContent = `₹${cartTotal().toLocaleString('en-IN')}`;
}

// ============================================================
// RENDER: CHECKOUT
// ============================================================
function renderCheckout() {
  if (State.cart.length === 0) { navigate('cart'); return; }
  const summary = document.getElementById('checkout-items-summary');
  if (summary) {
    summary.innerHTML = State.cart.map(i =>
      `<div style="display:flex;justify-content:space-between;font-size:0.875rem;padding:6px 0;border-bottom:1px solid var(--border)">
        <span>${i.name} × ${i.quantity}</span>
        <span style="font-weight:600">₹${(i.price * i.quantity).toLocaleString('en-IN')}</span>
      </div>`
    ).join('') +
    `<div style="display:flex;justify-content:space-between;font-size:1rem;font-weight:700;padding-top:12px;color:var(--indigo)">
      <span>Total</span><span>₹${cartTotal().toLocaleString('en-IN')}</span>
    </div>`;
  }
}

async function placeOrder() {
  if (!State.user) { toast('Please login to place an order', 'error'); navigate('auth', {tab:'login'}); return; }

  const address = document.getElementById('checkout-address').value.trim();
  const payment = document.getElementById('checkout-payment').value;

  if (!address) { toast('Please enter a shipping address', 'error'); return; }

  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const data = await API.post('/orders', {
      items: State.cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
      shipping_address: address,
      payment_method: payment,
    });

    State.cart = [];
    saveCart();

    // Show success
    document.getElementById('checkout-form').style.display = 'none';
    document.getElementById('order-success').style.display = 'block';
    document.getElementById('order-id-display').textContent = `#${data.orderId}`;
    document.getElementById('order-total-display').textContent = `₹${data.total.toLocaleString('en-IN')}`;

  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
}

// ============================================================
// RENDER: AUTH (Login / Register)
// ============================================================
function renderAuth(tab = 'login') {
  // Switch tabs
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Signing in...';

  try {
    const data = await API.post('/auth/login', { email, password });
    State.user = data.user;
    updateUserNav();
    toast(`Welcome back, ${data.user.name}! 🙏`);
    navigate('dashboard');
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false; btn.textContent = 'Sign In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name     = document.getElementById('reg-name').value;
  const email    = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const role     = document.getElementById('reg-role').value;
  const phone    = document.getElementById('reg-phone').value;
  const address  = document.getElementById('reg-address').value;
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Creating account...';

  try {
    const data = await API.post('/auth/register', { name, email, password, role, phone, address });
    State.user = data.user;
    updateUserNav();
    toast(`Account created! Welcome to KolkataKraft 🎉`);
    navigate('dashboard');
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false; btn.textContent = 'Create Account';
  }
}

// ============================================================
// RENDER: DASHBOARD
// ============================================================
async function renderDashboard() {
  if (!State.user) { navigate('auth', {tab:'login'}); return; }

  const role = State.user.role;

  // Update sidebar
  document.getElementById('dash-user-name').textContent = State.user.name;
  document.getElementById('dash-user-role').textContent = role;

  // Show role-specific nav items
  document.querySelectorAll('.dash-nav-item').forEach(el => {
    const roles = el.dataset.roles ? el.dataset.roles.split(',') : [];
    el.style.display = roles.length === 0 || roles.includes(role) ? 'flex' : 'none';
  });

  // Load default tab
  loadDashTab('profile');
}

async function loadDashTab(tab) {
  document.querySelectorAll('.dash-nav-item').forEach(i => i.classList.toggle('active', i.dataset.tab === tab));
  const content = document.getElementById('dash-content');
  content.innerHTML = '<div class="spinner"></div>';

  try {
    switch (tab) {
      case 'profile':    await renderDashProfile(content); break;
      case 'orders':     await renderDashOrders(content); break;
      case 'products':   await renderDashProducts(content); break;
      case 'add-product': renderDashAddProduct(content); break;
      case 'analytics':  await renderDashAnalytics(content); break;
      case 'users':      await renderAdminUsers(content); break;
      case 'admin-orders': await renderAdminOrders(content); break;
      case 'b2b-enquiries': await renderAdminB2B(content); break;
    }
  } catch (err) {
    content.innerHTML = `<div style="color:var(--danger);padding:20px">Error loading: ${err.message}</div>`;
  }
}

async function renderDashProfile(el) {
  const { user } = await API.get('/auth/me');
  el.innerHTML = `
    <div class="card">
      <h2 class="card-title">👤 My Profile</h2>
      <form onsubmit="updateProfile(event)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input class="form-control" id="prof-name" value="${user.name}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-control" value="${user.email}" disabled style="background:var(--cream);color:var(--muted)">
          </div>
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input class="form-control" id="prof-phone" value="${user.phone || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Role</label>
            <input class="form-control" value="${user.role}" disabled style="background:var(--cream);color:var(--muted);text-transform:capitalize">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <textarea class="form-control" id="prof-address" rows="2">${user.address || ''}</textarea>
        </div>
        <div style="margin-top:4px;padding:12px;background:var(--cream);border-radius:var(--radius-sm);font-size:0.8rem;color:var(--muted)">
          Member since: ${new Date(user.created_at).toLocaleDateString('en-IN', {year:'numeric',month:'long',day:'numeric'})}
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:16px">💾 Save Changes</button>
      </form>
    </div>
  `;
}

async function updateProfile(e) {
  e.preventDefault();
  try {
    await API.put('/auth/profile', {
      name: document.getElementById('prof-name').value,
      phone: document.getElementById('prof-phone').value,
      address: document.getElementById('prof-address').value,
    });
    State.user.name = document.getElementById('prof-name').value;
    updateUserNav();
    toast('Profile updated successfully!');
  } catch (err) { toast(err.message, 'error'); }
}

async function renderDashOrders(el) {
  const { orders } = await API.get('/orders/my');
  if (!orders.length) {
    el.innerHTML = `<div class="card" style="text-align:center;padding:60px">
      <div style="font-size:3rem;margin-bottom:12px">📦</div>
      <p style="color:var(--muted)">No orders yet. <a onclick="navigate('products')" style="color:var(--red-clay);cursor:pointer">Start shopping!</a></p>
    </div>`;
    return;
  }
  el.innerHTML = `
    <div class="card">
      <h2 class="card-title">📦 My Orders</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Order #</th><th>Products</th><th>Amount</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><strong>#${o.id}</strong></td>
                <td style="max-width:200px;font-size:0.82rem">${o.product_names || '-'}</td>
                <td style="font-weight:700;color:var(--indigo)">₹${o.total_amount.toLocaleString('en-IN')}</td>
                <td><span class="badge badge-${o.status}">${o.status}</span></td>
                <td style="font-size:0.82rem;color:var(--muted)">${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  ${['pending', 'confirmed'].includes(o.status) 
                    ? `<button class="btn btn-ghost btn-sm" onclick="cancelOrder(${o.id})">Cancel</button>`
                    : `<span style="color:var(--muted);font-size:0.82rem">—</span>`}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order? Stock will be returned.')) return;
  try {
    await API.put(`/orders/${orderId}/cancel`, {});
    toast('Order cancelled successfully!');
    loadDashTab('orders');
  } catch (err) { toast(err.message, 'error'); }
}

async function renderDashProducts(el) {
  const { products } = await API.get('/products/artisan/my');
  el.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 class="card-title" style="margin-bottom:0">🧵 My Products</h2>
        <button class="btn btn-primary btn-sm" onclick="loadDashTab('add-product')">+ Add Product</button>
      </div>
      ${!products.length ? `<p style="color:var(--muted)">No products yet. Add your first product!</p>` : `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Views</th><th>Action</th></tr></thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td style="font-weight:600">${p.name}</td>
                  <td>${p.category}</td>
                  <td>₹${p.price.toLocaleString('en-IN')}</td>
                  <td>${p.stock}</td>
                  <td>👁️ ${p.views}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick="deleteProduct(${p.id})">Delete</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`}
    </div>
  `;
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await API.delete(`/products/${id}`);
    toast('Product deleted');
    loadDashTab('products');
  } catch (err) { toast(err.message, 'error'); }
}

function renderDashAddProduct(el) {
  const categories = ['Saree', 'Terracotta', 'Dokra', 'Kantha Work', 'Other'];
  el.innerHTML = `
    <div class="card">
      <h2 class="card-title">➕ Add New Product</h2>
      <form onsubmit="submitProduct(event)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Product Name *</label>
            <input class="form-control" id="np-name" required placeholder="e.g. Baluchari Banarasi Saree">
          </div>
          <div class="form-group">
            <label class="form-label">Category *</label>
            <select class="form-control" id="np-cat" required>
              ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Price (₹) *</label>
            <input class="form-control" id="np-price" type="number" required min="1" placeholder="1500">
          </div>
          <div class="form-group">
            <label class="form-label">Bulk Price (₹)</label>
            <input class="form-control" id="np-bulk-price" type="number" min="1" placeholder="1200">
          </div>
          <div class="form-group">
            <label class="form-label">Min Bulk Qty</label>
            <input class="form-control" id="np-bulk-qty" type="number" value="10" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Stock</label>
            <input class="form-control" id="np-stock" type="number" value="50" min="0">
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Description</label>
            <textarea class="form-control" id="np-desc" rows="3" placeholder="Describe your craft — materials, technique, story..."></textarea>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="submit" class="btn btn-primary">Publish Product</button>
          <button type="button" class="btn btn-ghost" onclick="loadDashTab('products')">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

async function submitProduct(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Publishing...';
  try {
    await API.post('/products', {
      name: document.getElementById('np-name').value,
      category: document.getElementById('np-cat').value,
      price: document.getElementById('np-price').value,
      bulk_price: document.getElementById('np-bulk-price').value,
      min_bulk_qty: document.getElementById('np-bulk-qty').value,
      stock: document.getElementById('np-stock').value,
      description: document.getElementById('np-desc').value,
    });
    toast('Product published successfully! 🎉');
    loadDashTab('products');
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false; btn.textContent = 'Publish Product';
  }
}

// ============================================================
// ANALYTICS DASHBOARD
// ============================================================
async function renderDashAnalytics(el) {
  const data = await API.get('/analytics/dashboard');

  const maxRevenue = Math.max(...data.salesByCategory.map(c => c.revenue || 0), 1);

  el.innerHTML = `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px">
        <h2 style="font-family:var(--font-display);font-size:1.4rem;font-weight:700">📊 Customer Analytics</h2>
        <div style="display:flex;gap:10px">
          <a href="/api/analytics/export/csv" class="btn btn-ghost btn-sm">📥 Export CSV</a>
          <a href="/api/b2b/export/csv" class="btn btn-ghost btn-sm">📥 B2B CSV</a>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-num">${data.uniqueVisitors}</div>
          <div class="stat-label">Unique Visitors</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🛒</div>
          <div class="stat-num">${data.cartAdditions}</div>
          <div class="stat-label">Cart Additions</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-num">${data.checkouts}</div>
          <div class="stat-label">Checkouts</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-num">${data.conversionRate}%</div>
          <div class="stat-label">Conversion Rate</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-bottom:24px">
        <div class="chart-container">
          <div class="chart-title">🏆 Top Products by Views</div>
          <div class="mini-chart-bar">
            ${data.topProducts.slice(0,6).map(p => `
              <div class="bar-row">
                <div class="bar-label" title="${p.name}">${p.name.substring(0,18)}${p.name.length > 18 ? '…' : ''}</div>
                <div class="bar-track"><div class="bar-fill" style="width:${(p.views / data.topProducts[0].views * 100)}%"></div></div>
                <div class="bar-val">${p.views}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="chart-container">
          <div class="chart-title">💰 Revenue by Category</div>
          <div class="mini-chart-bar">
            ${data.salesByCategory.map(c => `
              <div class="bar-row">
                <div class="bar-label">${c.category}</div>
                <div class="bar-track"><div class="bar-fill" style="width:${(c.revenue / maxRevenue * 100)}%;background:linear-gradient(90deg,var(--red-clay),var(--gold))"></div></div>
                <div class="bar-val">₹${(c.revenue/1000).toFixed(1)}k</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="chart-container">
          <div class="chart-title">📅 Sales over time (last 7 days)</div>
          <div class="mini-chart-bar">
            ${data.salesLast7Days.length ? data.salesLast7Days.map(day => {
              const maxDayRevenue = Math.max(...data.salesLast7Days.map(d => d.revenue || 0), 1);
              const date = new Date(day.date).toLocaleDateString('en-IN', {month:'short', day:'numeric'});
              return `
                <div class="bar-row">
                  <div class="bar-label">${date}</div>
                  <div class="bar-track"><div class="bar-fill" style="width:${(day.revenue / maxDayRevenue * 100)}%;background:linear-gradient(90deg,var(--indigo),var(--gold))"></div></div>
                  <div class="bar-val">₹${(day.revenue/1000).toFixed(1)}k</div>
                </div>
              `;
            }).join('') : '<div style="text-align:center;padding:20px;color:var(--muted)">No sales data for last 7 days</div>'}
          </div>
        </div>
      </div>

      ${data.repeatCustomers.length ? `
        <div class="chart-container" style="margin-bottom:24px">
          <div class="chart-title">🔁 Repeat Customers</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Lifetime Value</th></tr></thead>
              <tbody>
                ${data.repeatCustomers.map(c => `
                  <tr>
                    <td>${c.name}</td>
                    <td style="color:var(--muted);font-size:0.82rem">${c.email}</td>
                    <td><strong>${c.order_count}</strong> orders</td>
                    <td style="font-weight:700;color:var(--indigo)">₹${c.lifetime_value.toLocaleString('en-IN')}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}

      <div class="chart-container">
        <div class="chart-title">📄 Top Pages</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Page</th><th>Views</th></tr></thead>
            <tbody>
              ${data.pageStats.map(p => `
                <tr><td>${p.page}</td><td>${p.views}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// ADMIN PANELS
// ============================================================
async function renderAdminUsers(el) {
  const { users } = await API.get('/admin/users');
  const { stats } = await API.get('/admin/stats');

  el.innerHTML = `
    <div>
      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-num">${stats.totalUsers}</div><div class="stat-label">Total Users</div></div>
        <div class="stat-card"><div class="stat-icon">🛍️</div><div class="stat-num">${stats.totalCustomers}</div><div class="stat-label">Customers</div></div>
        <div class="stat-card"><div class="stat-icon">🧵</div><div class="stat-num">${stats.totalArtisans}</div><div class="stat-label">Artisans</div></div>
        <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-num">₹${(stats.totalRevenue/1000).toFixed(1)}k</div><div class="stat-label">Total Revenue</div></div>
      </div>
      <div class="card">
        <h2 class="card-title">👥 All Users</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Joined</th><th>Action</th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><strong>${u.name}</strong></td>
                  <td style="font-size:0.82rem;color:var(--muted)">${u.email}</td>
                  <td><span class="badge badge-confirmed" style="text-transform:capitalize">${u.role}</span></td>
                  <td style="font-size:0.82rem">${u.phone || '-'}</td>
                  <td style="font-size:0.82rem;color:var(--muted)">${new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                  <td>${u.id !== State.user.id ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">Delete</button>` : '<span style="color:var(--muted);font-size:0.8rem">You</span>'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

async function deleteUser(id) {
  if (!confirm('Delete this user? This cannot be undone.')) return;
  try {
    await API.delete(`/admin/users/${id}`);
    toast('User deleted');
    loadDashTab('users');
  } catch (err) { toast(err.message, 'error'); }
}

async function renderAdminOrders(el) {
  const { orders } = await API.get('/admin/orders');
  el.innerHTML = `
    <div class="card">
      <h2 class="card-title">📦 All Orders</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th><th>Update</th></tr></thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><strong>#${o.id}</strong></td>
                <td><div>${o.customer_name}</div><div style="font-size:0.75rem;color:var(--muted)">${o.customer_email}</div></td>
                <td style="font-weight:700;color:var(--indigo)">₹${o.total_amount.toLocaleString('en-IN')}</td>
                <td><span class="badge badge-${o.status}">${o.status}</span></td>
                <td style="font-size:0.82rem;color:var(--muted)">${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <select onchange="updateOrderStatus(${o.id}, this.value)" class="form-control" style="padding:4px 8px;font-size:0.8rem;width:auto">
                    ${['pending','confirmed','shipped','delivered','cancelled'].map(s =>
                      `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`
                    ).join('')}
                  </select>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function updateOrderStatus(id, status) {
  try {
    await API.put(`/admin/orders/${id}/status`, { status });
    toast(`Order #${id} → ${status}`);
  } catch (err) { toast(err.message, 'error'); }
}

async function renderAdminB2B(el) {
  const { enquiries } = await API.get('/b2b/enquiries');
  el.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 class="card-title" style="margin-bottom:0">🏭 B2B Enquiries</h2>
        <a href="/api/b2b/export/csv" class="btn btn-ghost btn-sm">📥 Export CSV</a>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Company</th><th>Contact</th><th>Category</th><th>Qty</th><th>Status</th><th>Date</th><th>Update</th></tr></thead>
          <tbody>
            ${enquiries.map(e => `
              <tr>
                <td><strong>${e.company_name}</strong><div style="font-size:0.75rem;color:var(--muted)">${e.email}</div></td>
                <td>${e.contact_person}<div style="font-size:0.75rem;color:var(--muted)">${e.phone || ''}</div></td>
                <td>${e.product_category || '-'}</td>
                <td>${e.quantity || '-'}</td>
                <td><span class="badge badge-${e.status}">${e.status}</span></td>
                <td style="font-size:0.82rem;color:var(--muted)">${new Date(e.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <select onchange="updateB2BStatus(${e.id}, this.value)" class="form-control" style="padding:4px 8px;font-size:0.8rem;width:auto">
                    ${['pending','reviewed','accepted','rejected'].map(s =>
                      `<option value="${s}" ${s === e.status ? 'selected' : ''}>${s}</option>`
                    ).join('')}
                  </select>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function updateB2BStatus(id, status) {
  try {
    await API.put(`/b2b/enquiries/${id}`, { status });
    toast('Enquiry status updated');
  } catch (err) { toast(err.message, 'error'); }
}

// ============================================================
// B2B ENQUIRY FORM
// ============================================================
function renderB2B() {}

async function submitB2BEnquiry(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Submitting...';
  try {
    await API.post('/b2b/enquiry', {
      company_name:   document.getElementById('b2b-company').value,
      contact_person: document.getElementById('b2b-contact').value,
      email:          document.getElementById('b2b-email').value,
      phone:          document.getElementById('b2b-phone').value,
      product_category: document.getElementById('b2b-category').value,
      quantity:       document.getElementById('b2b-qty').value,
      message:        document.getElementById('b2b-message').value,
    });
    toast('Enquiry submitted! We\'ll contact you within 48 hours. 🙏');
    e.target.reset();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Submit Enquiry';
  }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  loadCart();
  updateCartBadge();
  await checkAuth();

  // Set up navigation
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      const page = el.dataset.page;
      const params = el.dataset.params ? JSON.parse(el.dataset.params) : {};
      navigate(page, params);
    });
  });

  // Mobile menu
  document.getElementById('hamburger')?.addEventListener('click', () => {
    const nav = document.getElementById('mobile-nav');
    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
  });

  // Start on home
  navigate('home');
});

// Expose to HTML onclick handlers
window.navigate = navigate;
window.addToCart = addToCart;
window.quickAddToCart = quickAddToCart;
window.removeFromCart = removeFromCart;
window.updateCartQty = updateCartQty;
window.placeOrder = placeOrder;
window.logout = logout;
window.filterCategory = filterCategory;
window.searchProducts = searchProducts;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.renderAuth = renderAuth;
window.loadDashTab = loadDashTab;
window.updateProfile = updateProfile;
window.submitProduct = submitProduct;
window.deleteProduct = deleteProduct;
window.deleteUser = deleteUser;
window.updateOrderStatus = updateOrderStatus;
window.updateB2BStatus = updateB2BStatus;
window.submitB2BEnquiry = submitB2BEnquiry;
window.changeDetailQty = changeDetailQty;
window.addDetailToCart = addDetailToCart;