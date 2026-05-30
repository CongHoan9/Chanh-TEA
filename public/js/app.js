// ── API Helper ──
const api = {
  async get(url) {
    const res = await fetch(url);
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return res.json();
  },
  async put(url, data) {
    const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return res.json();
  },
  async delete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    return res.json();
  }
};

// ── Toast ──
function toast(msg, duration = 2800) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

// ── Format Price ──
function fmtPrice(n) {
  return n.toLocaleString('vi-VN') + 'đ';
}

// ── Navbar ──
window.addEventListener('scroll', () => {
  document.getElementById('navbar')?.classList.toggle('scrolled', scrollY > 20);
});
document.getElementById('menuToggle')?.addEventListener('click', () => {
  document.querySelector('.nav-links')?.classList.toggle('open');
});

// ── Cart State ──
let cartData = { items: [], total: 0, count: 0 };

async function loadCart() {
  const res = await api.get('/api/cart');
  if (res.success) {
    cartData = res.data;
    cartData.count = cartData.items.reduce((s, i) => s + i.qty, 0);
    renderCart();
  }
}

function renderCart() {
  const countEl = document.getElementById('cartCount');
  if (countEl) countEl.textContent = cartData.count;

  const itemsEl = document.getElementById('cartItems');
  if (!itemsEl) return;

  if (!cartData.items.length) {
    itemsEl.innerHTML = '<div class="cart-empty"><span>🧃</span><p>Giỏ hàng trống</p></div>';
    document.getElementById('cartFooter').style.display = 'none';
    return;
  }

  itemsEl.innerHTML = cartData.items.map(item => `
    <div class="cart-item" data-key="${item.key}">
      <div class="ci-img">🍋</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-meta">Size ${item.size}${item.toppings.length ? ' · ' + item.toppings.join(', ') : ''}</div>
        <div class="ci-controls">
          <button class="qty-btn" onclick="updateCart('${item.key}', ${item.qty - 1})">−</button>
          <span class="ci-qty">${item.qty}</span>
          <button class="qty-btn" onclick="updateCart('${item.key}', ${item.qty + 1})">+</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
        <span class="ci-price">${fmtPrice(item.price * item.qty)}</span>
        <button class="ci-remove" onclick="removeFromCart('${item.key}')">🗑</button>
      </div>
    </div>
  `).join('');

  const footer = document.getElementById('cartFooter');
  footer.style.display = 'block';
  document.getElementById('cartTotal').textContent = fmtPrice(cartData.total);
}

// ── Cart Toggle ──
document.getElementById('cartToggle')?.addEventListener('click', () => {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
});
document.getElementById('cartClose')?.addEventListener('click', closeCart);
document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

function closeCart() {
  document.getElementById('cartDrawer')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('open');
}

// ── Quick Add ──
async function quickAdd(id, name, price) {
  const res = await api.post('/api/cart/add', { productId: id, qty: 1, size: 'M' });
  if (res.success) {
    cartData = { items: res.data.cart, total: res.data.total, count: res.data.count };
    renderCart();
    toast(`🍋 Đã thêm ${name} vào giỏ!`);
  }
}

async function updateCart(key, qty) {
  const res = await api.put('/api/cart/update', { key, qty });
  if (res.success) {
    cartData = { items: res.data.cart, total: res.data.total, count: res.data.count };
    renderCart();
  }
}

async function removeFromCart(key) {
  const res = await api.delete(`/api/cart/remove/${encodeURIComponent(key)}`);
  if (res.success) {
    cartData = { items: res.data.cart, total: res.data.total };
    cartData.count = cartData.items.reduce((s, i) => s + i.qty, 0);
    renderCart();
  }
}

// ── Product Modal ──
let currentProduct = null;
let selectedSize = 'M';
let selectedToppings = [];
let qty = 1;

function openProductModal(product) {
  currentProduct = product;
  selectedSize = product.sizes[0] || 'M';
  selectedToppings = [];
  qty = 1;

  document.getElementById('pm-name').textContent = product.name;
  document.getElementById('pm-desc').textContent = product.description;

  document.getElementById('pm-sizes').innerHTML = product.sizes.map(s =>
    `<button class="size-opt ${s === selectedSize ? 'selected' : ''}" onclick="selectSize('${s}', this)">${s}</button>`
  ).join('');

  document.getElementById('pm-toppings').innerHTML = product.toppings.map(t =>
    `<button class="topping-opt" onclick="toggleTopping('${t}', this)">${t}</button>`
  ).join('');

  document.getElementById('pm-qty').textContent = qty;
  updatePmTotal();
  document.getElementById('productModal').classList.add('open');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
}

function selectSize(size, el) {
  selectedSize = size;
  document.querySelectorAll('.size-opt').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  updatePmTotal();
}

function toggleTopping(topping, el) {
  if (selectedToppings.includes(topping)) {
    selectedToppings = selectedToppings.filter(t => t !== topping);
    el.classList.remove('selected');
  } else {
    selectedToppings.push(topping);
    el.classList.add('selected');
  }
}

function changeQty(delta) {
  qty = Math.max(1, qty + delta);
  document.getElementById('pm-qty').textContent = qty;
  updatePmTotal();
}

function updatePmTotal() {
  if (currentProduct) {
    document.getElementById('pm-total').textContent = fmtPrice(currentProduct.price * qty);
  }
}

async function addToCartFromModal() {
  if (!currentProduct) return;
  const res = await api.post('/api/cart/add', {
    productId: currentProduct.id,
    qty,
    size: selectedSize,
    toppings: selectedToppings
  });
  if (res.success) {
    cartData = { items: res.data.cart, total: res.data.total, count: res.data.count };
    renderCart();
    closeProductModal();
    toast(`🍋 Đã thêm ${currentProduct.name} (${selectedSize}) vào giỏ!`);
  }
}

document.getElementById('productModal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeProductModal();
});

// ── Checkout ──
function openCheckout() {
  if (!cartData.items.length) return toast('Giỏ hàng trống!');
  closeCart();
  document.getElementById('checkoutModal').classList.add('open');
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('open');
}

document.getElementById('checkoutModal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeCheckout();
});

async function submitOrder() {
  const name = document.getElementById('co-name')?.value.trim();
  const phone = document.getElementById('co-phone')?.value.trim();
  const address = document.getElementById('co-address')?.value.trim();
  const note = document.getElementById('co-note')?.value.trim();
  const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;

  if (!name || !phone || !address) return toast('Vui lòng điền đầy đủ thông tin!');

  const res = await api.post('/api/orders', { name, phone, address, note, paymentMethod });
  if (res.success) {
    closeCheckout();
    cartData = { items: [], total: 0, count: 0 };
    renderCart();
    toast(`✅ Đặt hàng thành công! Mã đơn: #${res.data.orderId}`);
  } else {
    toast(res.message || 'Đặt hàng thất bại, thử lại!');
  }
}

// ── Auth ──
async function doLogin() {
  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-pass')?.value;
  const errEl = document.getElementById('auth-error');

  const res = await api.post('/api/auth/login', { email, password });
  if (res.success) {
    window.location.href = '/';
  } else {
    errEl.textContent = res.message;
    errEl.style.display = 'block';
  }
}

async function logout() {
  await api.post('/api/auth/logout', {});
  window.location.href = '/';
}

// ── Contact form ──
function sendContact() {
  const name = document.getElementById('cf-name')?.value.trim();
  const email = document.getElementById('cf-email')?.value.trim();
  const msg = document.getElementById('cf-msg')?.value.trim();
  if (!name || !email || !msg) return toast('Vui lòng điền đầy đủ!');
  document.getElementById('cf-success').style.display = 'block';
  document.getElementById('cf-name').value = '';
  document.getElementById('cf-email').value = '';
  document.getElementById('cf-msg').value = '';
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
});
