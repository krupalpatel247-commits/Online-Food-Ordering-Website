/* =========================================================
   HARVEST — script.js
   Handles: page navigation, menu rendering & filtering,
   cart (add/remove/qty), totals, checkout, order success.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. MENU DATA
  --------------------------------------------------------- */
  const CATEGORIES = [
    { id: "starters", label: "Starters", emoji: "🥗" },
    { id: "mains", label: "Mains", emoji: "🍛" },
    { id: "bowls", label: "Bowls", emoji: "🥣" },
    { id: "drinks", label: "Drinks", emoji: "🥤" },
    { id: "desserts", label: "Desserts", emoji: "🍮" },
  ];

  const MENU_ITEMS = [
    { id: "s1", name: "Crispy Corn Bites", category: "starters", emoji: "🌽", price: 149, desc: "Sweet corn fritters, flash-fried, chilli-lime dust." },
    { id: "s2", name: "Tomato Bruschetta", category: "starters", emoji: "🍅", price: 179, desc: "Toasted sourdough, vine tomato, basil, forest-green olive oil." },
    { id: "s3", name: "Kiwi Mint Salad", category: "starters", emoji: "🥝", price: 159, desc: "Kiwi, cucumber, mint, lime — a cold-crisp starter." },

    { id: "m1", name: "Forest Veggie Burger", category: "mains", emoji: "🍔", price: 249, desc: "Grilled vegetable patty, smoked cheese, house sauce." },
    { id: "m2", name: "Carrot & Chickpea Curry", category: "mains", emoji: "🥕", price: 229, desc: "Slow-simmered carrot, chickpea, coconut, served with rice." },
    { id: "m3", name: "Sunshine Paneer Tikka", category: "mains", emoji: "🧀", price: 269, desc: "Char-grilled paneer, turmeric marinade, mint chutney." },
    { id: "m4", name: "Garden Margherita Pizza", category: "mains", emoji: "🍕", price: 299, desc: "Wood-fired base, San Marzano tomato, fresh basil." },

    { id: "b1", name: "Harvest Grain Bowl", category: "bowls", emoji: "🌾", price: 219, desc: "Quinoa, roasted carrot, kale, tahini dressing." },
    { id: "b2", name: "Green Goddess Bowl", category: "bowls", emoji: "🥬", price: 239, desc: "Edamame, avocado, broccoli, herb-yoghurt dressing." },

    { id: "d1", name: "Carrot Ginger Shot", category: "drinks", emoji: "🥕", price: 99, desc: "Cold-pressed carrot, ginger, a squeeze of orange." },
    { id: "d2", name: "Tomato Basil Cooler", category: "drinks", emoji: "🍅", price: 109, desc: "Chilled tomato juice, basil, cracked pepper." },
    { id: "d3", name: "Kiwi Lime Fizz", category: "drinks", emoji: "🥝", price: 119, desc: "Kiwi puree, lime, soda, mint leaf." },

    { id: "e1", name: "Citrus Sunshine Tart", category: "desserts", emoji: "🍋", price: 159, desc: "Buttery shell, citrus curd, torched meringue." },
    { id: "e2", name: "Forest Berry Pudding", category: "desserts", emoji: "🫐", price: 179, desc: "Wild berry compote, vanilla mousse, oat crumble." },
  ];

  const DELIVERY_FEE = 40;
  const FREE_DELIVERY_THRESHOLD = 499;
  const TAX_RATE = 0.05;

  /* ---------------------------------------------------------
     2. STATE
  --------------------------------------------------------- */
  let cart = loadCart(); // { itemId: qty }

  function loadCart() {
    try {
      const saved = localStorage.getItem("harvest_cart");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  function saveCart() {
    try {
      localStorage.setItem("harvest_cart", JSON.stringify(cart));
    } catch (e) {
      /* ignore storage errors */
    }
  }

  function getItemById(id) {
    return MENU_ITEMS.find((i) => i.id === id);
  }

  function cartCount() {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  }

  function cartSubtotal() {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = getItemById(id);
      return item ? sum + item.price * qty : sum;
    }, 0);
  }

  /* ---------------------------------------------------------
     3. NAVIGATION
  --------------------------------------------------------- */
  const pages = document.querySelectorAll(".page");
  const navLinks = document.querySelectorAll("[data-nav]");
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");

  function goToPage(pageName) {
    pages.forEach((p) => p.classList.toggle("active", p.dataset.page === pageName));
    navLinks.forEach((link) => {
      if (link.classList.contains("nav-link")) {
        link.classList.toggle("active", link.dataset.nav === pageName);
      }
    });
    mainNav.classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (pageName === "cart") renderCart();
    if (pageName === "checkout") renderCheckoutSummary();
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      goToPage(link.dataset.nav);
    });
  });

  navToggle.addEventListener("click", () => {
    mainNav.classList.toggle("open");
  });

  /* ---------------------------------------------------------
     4. RENDER: HOME CATEGORY ROW
  --------------------------------------------------------- */
  const homeCategoryRow = document.getElementById("homeCategoryRow");
  homeCategoryRow.innerHTML = CATEGORIES.map(
    (c) => `
    <a href="#" class="category-chip" data-nav="menu" data-jump-category="${c.id}">
      <span class="chip-emoji">${c.emoji}</span> ${c.label}
    </a>`
  ).join("");

  homeCategoryRow.querySelectorAll("[data-jump-category]").forEach((chip) => {
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      goToPage("menu");
      setActiveFilter(chip.dataset.jumpCategory);
    });
  });

  /* ---------------------------------------------------------
     5. RENDER: MENU FILTERS + GRID
  --------------------------------------------------------- */
  const menuFilters = document.getElementById("menuFilters");
  const menuGrid = document.getElementById("menuGrid");
  let activeFilter = "all";

  menuFilters.innerHTML =
    `<button class="filter-chip active" data-filter="all">All</button>` +
    CATEGORIES.map((c) => `<button class="filter-chip" data-filter="${c.id}">${c.emoji} ${c.label}</button>`).join("");

  menuFilters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    setActiveFilter(btn.dataset.filter);
  });

  function setActiveFilter(filterId) {
    activeFilter = filterId;
    menuFilters.querySelectorAll(".filter-chip").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === filterId);
    });
    renderMenuGrid();
  }

  function renderMenuGrid() {
    const items = activeFilter === "all" ? MENU_ITEMS : MENU_ITEMS.filter((i) => i.category === activeFilter);

    menuGrid.innerHTML = items
      .map((item) => {
        const qty = cart[item.id] || 0;
        return `
        <article class="menu-card" data-item-id="${item.id}">
          <div class="menu-card-top">
            <span class="menu-card-emoji emoji-${item.category}">${item.emoji}</span>
            <span class="tag tag-${item.category}">${item.category}</span>
          </div>
          <h3 class="menu-card-name">${item.name}</h3>
          <p class="menu-card-desc">${item.desc}</p>
          <div class="menu-card-bottom">
            <span class="menu-card-price">₹${item.price}</span>
            <div class="menu-card-action">${qty > 0 ? qtyStepperHTML(qty) : addButtonHTML()}</div>
          </div>
        </article>`;
      })
      .join("");
  }

  function addButtonHTML() {
    return `<button class="add-btn" data-action="add">+ Add</button>`;
  }

  function qtyStepperHTML(qty) {
    return `
      <div class="qty-stepper">
        <button data-action="decrement" aria-label="Decrease quantity">−</button>
        <span class="qty-value">${qty}</span>
        <button data-action="increment" aria-label="Increase quantity">+</button>
      </div>`;
  }

  menuGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const card = e.target.closest("[data-item-id]");
    const itemId = card.dataset.itemId;
    const action = btn.dataset.action;

    if (action === "add" || action === "increment") {
      cart[itemId] = (cart[itemId] || 0) + 1;
    } else if (action === "decrement") {
      cart[itemId] = Math.max(0, (cart[itemId] || 0) - 1);
      if (cart[itemId] === 0) delete cart[itemId];
    }
    saveCart();
    renderMenuGrid();
    updateCartBadge();
  });

  /* ---------------------------------------------------------
     6. RENDER: CART PAGE
  --------------------------------------------------------- */
  const cartList = document.getElementById("cartList");
  const emptyCartTemplate = document.getElementById("emptyCartTemplate");

  function renderCart() {
    const entries = Object.entries(cart);

    if (entries.length === 0) {
      cartList.innerHTML = "";
      cartList.appendChild(emptyCartTemplate.content.cloneNode(true));
      rebindDataNavLinks(cartList);
    } else {
      cartList.innerHTML = entries
        .map(([id, qty]) => {
          const item = getItemById(id);
          if (!item) return "";
          const lineTotal = item.price * qty;
          return `
          <div class="cart-item" data-item-id="${id}">
            <span class="cart-item-emoji emoji-${item.category}">${item.emoji}</span>
            <div class="cart-item-info">
              <p class="cart-item-name">${item.name}</p>
              <span class="cart-item-unit">₹${item.price} each</span>
            </div>
            <div class="cart-item-controls">
              <div class="qty-stepper">
                <button data-cart-action="decrement" aria-label="Decrease quantity">−</button>
                <span class="qty-value">${qty}</span>
                <button data-cart-action="increment" aria-label="Increase quantity">+</button>
              </div>
            </div>
            <span class="cart-item-line-total">₹${lineTotal}</span>
            <button class="remove-btn" data-cart-action="remove" aria-label="Remove item">✕</button>
          </div>`;
        })
        .join("");
    }

    updateSummary();
  }

  cartList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cart-action]");
    if (!btn) return;
    const row = e.target.closest("[data-item-id]");
    const itemId = row.dataset.itemId;
    const action = btn.dataset.cartAction;

    if (action === "increment") {
      cart[itemId] = (cart[itemId] || 0) + 1;
    } else if (action === "decrement") {
      cart[itemId] = Math.max(0, (cart[itemId] || 0) - 1);
      if (cart[itemId] === 0) delete cart[itemId];
    } else if (action === "remove") {
      delete cart[itemId];
    }
    saveCart();
    renderCart();
    updateCartBadge();
  });

  function rebindDataNavLinks(container) {
    container.querySelectorAll("[data-nav]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        goToPage(link.dataset.nav);
      });
    });
  }

  /* ---------------------------------------------------------
     7. TOTALS (shared by cart + checkout)
  --------------------------------------------------------- */
  function computeTotals() {
    const subtotal = cartSubtotal();
    const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    const tax = Math.round(subtotal * TAX_RATE);
    const total = subtotal + delivery + tax;
    return { subtotal, delivery, tax, total };
  }

  function updateSummary() {
    const { subtotal, delivery, tax, total } = computeTotals();
    document.getElementById("cartSubtotal").textContent = `₹${subtotal}`;
    document.getElementById("cartDelivery").textContent = delivery === 0 ? "Free" : `₹${delivery}`;
    document.getElementById("cartTax").textContent = `₹${tax}`;
    document.getElementById("cartTotal").textContent = `₹${total}`;

    const gap = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
    const note = document.getElementById("freeDeliveryNote");
    if (subtotal === 0) {
      note.style.display = "none";
    } else if (gap === 0) {
      note.style.display = "block";
      note.innerHTML = "🎉 You've unlocked <strong>free delivery</strong>";
    } else {
      note.style.display = "block";
      document.getElementById("freeDeliveryGap").textContent = `₹${gap}`;
    }

    const checkoutBtn = document.getElementById("checkoutBtn");
    checkoutBtn.disabled = subtotal === 0;
  }

  document.getElementById("checkoutBtn").addEventListener("click", () => {
    if (cartCount() > 0) goToPage("checkout");
  });

  /* ---------------------------------------------------------
     8. RENDER: CHECKOUT SUMMARY
  --------------------------------------------------------- */
  function renderCheckoutSummary() {
    const checkoutItems = document.getElementById("checkoutItems");
    const entries = Object.entries(cart);

    checkoutItems.innerHTML = entries
      .map(([id, qty]) => {
        const item = getItemById(id);
        if (!item) return "";
        return `<div class="checkout-item-row"><span>${item.name} × ${qty}</span><span>₹${item.price * qty}</span></div>`;
      })
      .join("");

    const { subtotal, delivery, tax, total } = computeTotals();
    document.getElementById("checkoutSubtotal").textContent = `₹${subtotal}`;
    document.getElementById("checkoutDelivery").textContent = delivery === 0 ? "Free" : `₹${delivery}`;
    document.getElementById("checkoutTax").textContent = `₹${tax}`;
    document.getElementById("checkoutTotal").textContent = `₹${total}`;
  }

  /* ---------------------------------------------------------
     9. CART BADGE
  --------------------------------------------------------- */
  function updateCartBadge() {
    document.getElementById("cartBadge").textContent = cartCount();
  }

  /* ---------------------------------------------------------
     10. CHECKOUT FORM SUBMIT
  --------------------------------------------------------- */
  const checkoutForm = document.getElementById("checkoutForm");
  const successOverlay = document.getElementById("successOverlay");

  checkoutForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (cartCount() === 0) return;

    const orderId = "H-" + Math.floor(1000 + Math.random() * 9000);
    document.getElementById("successOrderId").textContent = `#${orderId}`;
    successOverlay.classList.add("show");

    cart = {};
    saveCart();
    updateCartBadge();
    checkoutForm.reset();
  });

  document.getElementById("successBackBtn").addEventListener("click", () => {
    successOverlay.classList.remove("show");
    goToPage("home");
  });

  /* ---------------------------------------------------------
     11. INIT
  --------------------------------------------------------- */
  function init() {
    renderMenuGrid();
    renderCart();
    updateCartBadge();
    goToPage("home");
  }

  init();
})();
