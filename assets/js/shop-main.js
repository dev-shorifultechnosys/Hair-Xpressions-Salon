/* ==========================================================================
   Hair Xpressions — Shop / Cart / Pickup Checkout interaction layer
   --------------------------------------------------------------------------
   This file powers only the retail journey. It does not change the approved
   Home, Services, Our Salon, Gallery or Contact page behavior.

   PRODUCTION CHECKLIST
   - Confirm salon inventory, sizes, pricing and tax rules before launch.
   - Connect submitPickupOrder() to WooCommerce, the salon CRM or another
     secure order endpoint. The static handoff prepares a complete email.
   - Never collect unencrypted card details in front-end JavaScript.
   ========================================================================== */
(() => {
  'use strict';

  /* Keep the V18 storage key so carts created in the prior build still load. */
  const CART_KEY = 'hx-shop-cart-v18';
  const ORDER_KEY = 'hx-shop-last-order-v18';
  const SALON_EMAIL = 'Angietron123@gmail.com';

  /**
   * One catalog source keeps shop cards, cart lines and checkout totals aligned.
   * Confirm the final salon assortment and prices before production launch.
   */
  const catalog = {
    'pm-color-protect-shampoo': { sku:'CPS-075', name:'Color Protect Shampoo', category:'Paul Mitchell • Color Care', size:'2.5 fl. oz.', price:8.00, image:'assets/images/shop/pm-color-protect-shampoo.webp', note:'Daily shampoo for color-treated hair helps protect against color fade and adds shine.' },
    'pm-color-protect-conditioner': { sku:'CPC-075', name:'Color Protect Conditioner', category:'Paul Mitchell • Color Care', size:'2.5 fl. oz.', price:8.00, image:'assets/images/shop/pm-color-protect-conditioner.webp', note:'Daily conditioner helps detangle, strengthen and protect color-treated hair.' },
    'pm-color-locking-spray': { sku:'CPL-250', name:'Color Protect Locking Spray', category:'Paul Mitchell • Leave-in', size:'8.5 fl. oz.', price:19.00, image:'assets/images/shop/pm-color-protect-locking-spray.webp', note:'Leave-in color care helps protect against sun damage and keeps hair looking vibrant.' },
    'pm-awapuhi-intensive': { sku:'AIT-075', name:'Intensive Treatment', category:'Awapuhi Wild Ginger • Repair', size:'2.5 fl. oz.', price:21.00, image:'assets/images/shop/pm-awapuhi-intensive-treatment.webp', note:'Weekly deep-conditioning treatment for dry, damaged or color-treated hair.' },
    'pm-super-skinny-serum': { sku:'SSSR-025', name:'Super Skinny Serum', category:'Paul Mitchell • Styling', size:'0.85 fl. oz.', price:12.00, image:'assets/images/shop/pm-super-skinny-serum.webp', note:'Blowout primer helps reduce drying time, smooth frizz and protect from heat.' },
    'pm-tea-tree-shampoo': { sku:'TTS-075', name:'Tea Tree Special Shampoo', category:'Tea Tree • Scalp Care', size:'2.5 fl. oz.', price:9.50, image:'assets/images/shop/pm-tea-tree-special-shampoo.webp', note:'Invigorating shampoo cleanses the scalp and leaves hair feeling fresh and full of vitality.' },
    'pm-tea-tree-treatment': { sku:'TTST-150', name:'Hair & Scalp Treatment', category:'Tea Tree • Scalp Treatment', size:'5.1 fl. oz.', price:24.00, image:'assets/images/shop/pm-tea-tree-hair-scalp-treatment.webp', note:'Weekly treatment moisturizes hair while conditioning and soothing the scalp.' },
    'pm-detangling-brush': { sku:'PDB', name:'Detangling Brush', category:'Paul Mitchell Tools', size:'Black', price:15.00, image:'assets/images/shop/pm-detangling-brush.webp', note:'Flexible nylon bristles detangle wet or dry hair while helping minimize damage.' }
  };

  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(value);
  const itemLabel = count => `${count} item${count === 1 ? '' : 's'}`;

  function sanitizeCart(raw) {
    return Object.fromEntries(Object.entries(raw || {}).filter(([id, qty]) => catalog[id] && Number(qty) > 0));
  }

  function decodeCartToken(token) {
    if (!token) return null;
    try { return sanitizeCart(JSON.parse(atob(token))); } catch (error) { return null; }
  }

  function encodeCartToken(cart) {
    try { return btoa(JSON.stringify(sanitizeCart(cart))); } catch (error) { return ''; }
  }

  function readCart() {
    /*
     * Query-string state keeps the prototype reliable when opened with file://.
     * On a web server localStorage remains the primary persistent cart store.
     */
    const fromUrl = decodeCartToken(new URLSearchParams(location.search).get('cart'));
    if (fromUrl && Object.keys(fromUrl).length) {
      try { localStorage.setItem(CART_KEY, JSON.stringify(fromUrl)); } catch (error) {}
      return fromUrl;
    }
    try {
      return sanitizeCart(JSON.parse(localStorage.getItem(CART_KEY) || '{}'));
    } catch (error) {
      console.warn('Hair Xpressions cart could not be read; starting a fresh cart.', error);
      return {};
    }
  }

  function syncCommerceLinks(cart) {
    const token = encodeCartToken(cart);
    document.querySelectorAll('a[href]').forEach(link => {
      const raw = link.getAttribute('href');
      if (!raw || raw.startsWith(('#','http:','https:','mailto:','tel:','javascript:'))) return;
      const match = raw.match(/^(shop\.html|cart\.html|checkout\.html)(?:\?[^#]*)?(#.*)?$/);
      if (!match) return;
      const base = match[1];
      const hash = match[2] || '';
      link.setAttribute('href', token ? `${base}?cart=${encodeURIComponent(token)}${hash}` : `${base}${hash}`);
    });
  }

  function saveCart(cart) {
    const clean = sanitizeCart(cart);
    try { localStorage.setItem(CART_KEY, JSON.stringify(clean)); } catch (error) {}
    updateCartBadges(clean);
    syncCommerceLinks(clean);

    /* Keep quantity edits reload-safe on direct-file cart and checkout pages. */
    const page = document.body?.dataset?.page;
    if ((page === 'cart' || page === 'checkout') && history.replaceState) {
      const token = encodeCartToken(clean);
      history.replaceState({}, document.title, token ? `${location.pathname}?cart=${encodeURIComponent(token)}` : location.pathname);
    }
  }

  function cartCount(cart = readCart()) {
    return Object.values(cart).reduce((sum, qty) => sum + Number(qty || 0), 0);
  }

  function cartSubtotal(cart = readCart()) {
    return Object.entries(cart).reduce((sum, [id, qty]) => sum + catalog[id].price * Number(qty), 0);
  }

  function updateCartBadges(cart = readCart()) {
    const count = cartCount(cart);
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count;
      el.hidden = count < 1;
      el.setAttribute('aria-label', `${itemLabel(count)} in cart`);
    });
    syncCommerceLinks(cart);
  }

  function addToCart(id, qty = 1) {
    if (!catalog[id]) return;
    const cart = readCart();
    cart[id] = Math.min(20, Number(cart[id] || 0) + Math.max(1, Number(qty || 1)));
    saveCart(cart);
    showToast(`${catalog[id].name} added to your cart.`);
  }

  function showToast(message) {
    let toast = document.querySelector('.shop-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'shop-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  /** Shop product buttons and category filtering. */
  function initShopPage() {
    document.querySelectorAll('[data-add-product]').forEach(button => {
      button.addEventListener('click', () => addToCart(button.dataset.addProduct));
    });

    const filterButtons = [...document.querySelectorAll('[data-shop-filter]')];
    const cards = [...document.querySelectorAll('[data-product-card]')];
    filterButtons.forEach(button => button.addEventListener('click', () => {
      const filter = button.dataset.shopFilter;
      filterButtons.forEach(item => item.classList.toggle('is-active', item === button));
      filterButtons.forEach(item => item.setAttribute('aria-pressed', item === button ? 'true' : 'false'));
      cards.forEach(card => {
        const matches = filter === 'all' || card.dataset.productCategory === filter;
        card.hidden = !matches;
      });
    }));

    document.querySelectorAll('[data-jump-filter]').forEach(link => {
      link.addEventListener('click', () => {
        const target = filterButtons.find(button => button.dataset.shopFilter === link.dataset.jumpFilter);
        if (target) window.setTimeout(() => target.click(), 80);
      });
    });
  }

  /** Cart page: render lines, live totals, quantity updates and removal. */
  function renderCartPage() {
    const list = document.querySelector('[data-cart-items]');
    if (!list) return;

    const cart = readCart();
    const ids = Object.keys(cart);
    const count = cartCount(cart);
    const empty = document.querySelector('[data-cart-empty]');
    const summary = document.querySelector('[data-cart-summary]');

    if (!ids.length) {
      list.innerHTML = '';
      if (empty) empty.hidden = false;
      if (summary) summary.hidden = true;
      updateCartBadges(cart);
      return;
    }

    if (empty) empty.hidden = true;
    if (summary) summary.hidden = false;

    list.innerHTML = ids.map(id => {
      const product = catalog[id];
      const qty = Number(cart[id]);
      return `<article class="cart-line" data-cart-line="${id}">
        <div class="cart-line-visual"><img src="${product.image}" alt="${product.name}" width="240" height="286"/></div>
        <div class="cart-line-copy"><span>${product.category}</span><h3>${product.name}</h3><p>${product.note}</p><span class="cart-line-size">${product.size} • ${product.sku}</span><button class="cart-remove" type="button" data-remove-product="${id}" aria-label="Remove ${product.name} from cart"><span aria-hidden="true">×</span> Remove</button></div>
        <div class="cart-line-controls"><label for="qty-${id}">Quantity</label><select id="qty-${id}" data-cart-qty="${id}" aria-label="Quantity for ${product.name}">${Array.from({length:10}, (_,i)=>`<option value="${i+1}"${qty===i+1?' selected':''}>${i+1}</option>`).join('')}</select><strong>${money(product.price * qty)}</strong></div>
      </article>`;
    }).join('');

    list.querySelectorAll('[data-cart-qty]').forEach(select => select.addEventListener('change', () => {
      const next = readCart();
      next[select.dataset.cartQty] = Number(select.value);
      saveCart(next);
      renderCartPage();
    }));

    list.querySelectorAll('[data-remove-product]').forEach(button => button.addEventListener('click', () => {
      const next = readCart();
      delete next[button.dataset.removeProduct];
      saveCart(next);
      renderCartPage();
    }));

    document.querySelectorAll('[data-cart-item-label]').forEach(el => el.textContent = itemLabel(count));
    document.querySelectorAll('[data-cart-subtotal]').forEach(el => el.textContent = money(cartSubtotal(cart)));
    document.querySelectorAll('[data-cart-total]').forEach(el => el.textContent = money(cartSubtotal(cart)));
    updateCartBadges(cart);
  }

  function setFieldError(form, fieldName, message = '') {
    const field = form.elements[fieldName];
    const error = form.querySelector(`[data-error-for="${fieldName}"]`);
    if (error) error.textContent = message;
    if (field) field.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  /** Custom validation keeps error messages visible beside the relevant fields. */
  function validateCheckoutForm(form) {
    const checks = [
      ['name', form.elements.name.value.trim() ? '' : 'Please enter your full name.'],
      ['email', form.elements.email.validity.valid ? '' : 'Please enter a valid email address.'],
      ['phone', form.elements.phone.value.replace(/\D/g, '').length >= 7 ? '' : 'Please enter a valid phone number.'],
      ['pickup', form.elements.pickup.value ? '' : 'Please select a pickup preference.'],
      ['consent', form.elements.consent.checked ? '' : 'Please confirm the pickup terms.']
    ];

    checks.forEach(([name, message]) => setFieldError(form, name, message));
    const firstInvalid = checks.find(([, message]) => message);
    if (firstInvalid) {
      form.elements[firstInvalid[0]]?.focus();
      return false;
    }
    return true;
  }

  function buildMailto(order) {
    const subject = encodeURIComponent(`Pickup order ${order.id} — ${order.customer.name}`);
    const lines = order.items.map(item => `${item.qty} x ${item.name} (${item.sku}, ${item.size}) — ${money(item.total)}`);
    const body = encodeURIComponent([
      `New Hair Xpressions pickup order: ${order.id}`,'',
      `Customer: ${order.customer.name}`,
      `Email: ${order.customer.email}`,
      `Phone: ${order.customer.phone}`,
      `Pickup preference: ${order.pickup}`,'',
      'Items:', ...lines,'',
      `Estimated subtotal: ${money(order.subtotal)}`,
      'Pickup: Free',
      'Tax and final amount: Confirmed by salon',
      'Payment: Pay at salon on pickup','',
      `Notes: ${order.notes || 'None'}`
    ].join('\n'));
    return `mailto:${SALON_EMAIL}?subject=${subject}&body=${body}`;
  }

  /**
   * Production integration point.
   * Replace the local save with a POST to the salon order system, returning a
   * confirmed order reference. The local fallback keeps the static prototype
   * fully testable without exposing payment or customer data to third parties.
   */
  async function submitPickupOrder(order) {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch (error) {}
    await new Promise(resolve => window.setTimeout(resolve, 420));
    return { ok:true, orderId:order.id, emailUrl:buildMailto(order) };
  }

  /** Checkout summary, validation, order reference and confirmation state. */
  function initCheckoutPage() {
    const form = document.querySelector('[data-checkout-form]');
    const items = document.querySelector('[data-checkout-items]');
    if (!form || !items) return;

    const cart = readCart();
    const ids = Object.keys(cart);
    const count = cartCount(cart);
    const empty = document.querySelector('[data-checkout-empty]');
    const content = document.querySelector('[data-checkout-content]');

    if (!ids.length) {
      if (empty) empty.hidden = false;
      if (content) content.hidden = true;
      return;
    }

    items.innerHTML = ids.map(id => {
      const p = catalog[id];
      const qty = Number(cart[id]);
      return `<div class="checkout-mini-line"><img src="${p.image}" alt="${p.name}" width="90" height="106"/><div><strong>${p.name}</strong><span>${p.size}</span><span>${qty} × ${money(p.price)}</span></div><b>${money(p.price*qty)}</b></div>`;
    }).join('');
    document.querySelectorAll('[data-checkout-item-label]').forEach(el => el.textContent = itemLabel(count));
    document.querySelectorAll('[data-checkout-subtotal], [data-checkout-total]').forEach(el => el.textContent = money(cartSubtotal(cart)));

    ['name','email','phone','pickup','consent'].forEach(name => {
      const field = form.elements[name];
      if (!field) return;
      const eventName = field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'input';
      field.addEventListener(eventName, () => setFieldError(form, name, ''));
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!validateCheckoutForm(form)) return;

      const submitButton = form.querySelector('.checkout-submit');
      const submitLabel = form.querySelector('[data-submit-label]');
      const status = form.querySelector('[data-checkout-status]');
      submitButton.disabled = true;
      submitButton.classList.add('is-loading');
      submitLabel.textContent = 'Preparing your order…';
      status.textContent = '';

      const data = new FormData(form);
      const orderId = `HX-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${Math.floor(1000+Math.random()*9000)}`;
      const orderItems = ids.map(id => {
        const p = catalog[id];
        const qty = Number(cart[id]);
        return { id, sku:p.sku, name:p.name, size:p.size, qty, unitPrice:p.price, total:p.price * qty, image:p.image };
      });
      const order = {
        id:orderId,
        customer:{name:data.get('name').trim(), email:data.get('email').trim(), phone:data.get('phone').trim()},
        pickup:data.get('pickup'),
        notes:(data.get('notes') || '').trim(),
        subtotal:cartSubtotal(cart),
        items:orderItems,
        created:new Date().toISOString()
      };

      try {
        const result = await submitPickupOrder(order);
        if (!result.ok) throw new Error('Order submission failed.');
        try { localStorage.removeItem(CART_KEY); } catch (error) {}
        updateCartBadges({});
        if (history.replaceState) history.replaceState({}, document.title, location.pathname);
        showOrderSuccess(order, result.emailUrl);
      } catch (error) {
        console.error(error);
        status.textContent = 'We could not prepare the order. Please try again or call the salon.';
        submitButton.disabled = false;
        submitButton.classList.remove('is-loading');
        submitLabel.textContent = 'Place pickup order';
      }
    });
  }

  function showOrderSuccess(order, mailtoUrl) {
    const panel = document.querySelector('[data-order-success]');
    if (!panel) return;
    document.querySelector('[data-checkout-content]')?.setAttribute('hidden', '');
    panel.hidden = false;
    panel.querySelector('[data-order-id]').textContent = order.id;
    panel.querySelector('[data-order-pickup]').textContent = order.pickup;
    panel.querySelector('[data-order-total]').textContent = money(order.subtotal);
    panel.querySelector('[data-order-success-items]').innerHTML = order.items.map(item => `<div><span>${item.qty} × ${item.name}</span><strong>${money(item.total)}</strong></div>`).join('');
    const emailLink = panel.querySelector('[data-order-email]');
    if (emailLink) emailLink.href = mailtoUrl;
    panel.focus({preventScroll:true});
    panel.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateCartBadges();
    if (document.body.dataset.page === 'shop') initShopPage();
    if (document.body.dataset.page === 'cart') renderCartPage();
    if (document.body.dataset.page === 'checkout') initCheckoutPage();
  });
})();
