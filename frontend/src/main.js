import './style.css';

// Configuration
const rawApiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8001';
const API_BASE = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;

// Application State
let state = {
  tenants: [],
  activeTenant: null,
  kbItems: [],
  orders: [],
  chatHistory: [],
  classroomChatHistory: [],
  activeFilter: 'all',
  isPollingOrders: false,
  activePage: 'lms'
};

// Tone Presets
const promptPresets = {
  italian: `You are Luigi, a passionate and friendly Italian chef at our bistro. Speak with a warm, energetic Italian-American flair (use phrases like "Mamma mia!", "Buon appetito!", "Delizioso!"). Recommends our authentic hand-tossed pizzas and homemade pasta. Keep responses concise, appetizing, and hospitable.`,
  french: `You are Jean-Pierre, the sophisticated and highly polished Maitre D' of our fine dining establishment. Speak with formal elegance, exquisite politeness, and a subtle French touch (use phrases like "Bonsoir", "S'il vous plaît", "Excellent choice"). Focus on high-end service, fine wines, and culinary detail.`,
  burger: `You are Jax, a high-energy, casual clerk at our hip burger joint. Speak with modern diner slang ("awesome sauce", "double-patty goodness", "shake it up"). Be enthusiastic, fast-talking, recommend massive burgers, loaded fries, and craft milkshakes. Keep it fun and quick.`,
  cafe: `You are Clara, a warm, gentle, and artistic barista at our cozy cafe. Speak with a peaceful, friendly, and welcoming tone. Recommend specialty espresso drinks, herbal teas, and freshly baked vegan pastries. Focus on creating a relaxing, mindful atmosphere.`
};

// DOM Elements - Navigation & Tenant Select
const selectTenant = document.getElementById('tenant-select');
const btnAddTenant = document.getElementById('btn-add-tenant');
const tenantKeyDisplay = document.getElementById('tenant-key-display');
const btnCopyKey = document.getElementById('btn-copy-key');

// DOM Elements - LMS Sidebar & Tab Switcher
const navTabs = document.querySelectorAll('.nav-tab');
const tabPanes = document.querySelectorAll('.tab-pane');

// DOM Elements - Personality Configuration
const systemPromptText = document.getElementById('system-prompt-text');
const btnSavePrompt = document.getElementById('btn-save-prompt');
const presetCards = document.querySelectorAll('.preset-card');

// DOM Elements - Knowledge Base Configuration
const btnAddKb = document.getElementById('btn-add-kb');
const filterTabs = document.querySelectorAll('.filter-tab');
const kbItemsList = document.getElementById('kb-items-list');

// DOM Elements - Orders Feed
const btnRefreshOrders = document.getElementById('btn-refresh-orders');
const ordersList = document.getElementById('orders-list');
const orderBadge = document.getElementById('order-badge');

// DOM Elements - Storefront Simulator
const simRestName = document.getElementById('sim-rest-name');
const simHeroTagline = document.getElementById('sim-hero-tagline');
const simHeroSub = document.getElementById('sim-hero-sub');
const simMenuList = document.getElementById('sim-menu-list');
const simInfoHours = document.getElementById('sim-info-hours');
const simInfoLocation = document.getElementById('sim-info-location');
const btnSimOrder = document.getElementById('btn-sim-order');

// DOM Elements - Storefront Chat Widget
const chatWidgetTrigger = document.getElementById('chat-widget-trigger');
const chatWidgetBox = document.getElementById('chat-widget-box');
const btnCloseChat = document.getElementById('btn-close-chat');
const chatMessages = document.getElementById('chat-messages');
const chatInputText = document.getElementById('chat-input-text');
const btnSendChat = document.getElementById('btn-send-chat');
const chatBotTitle = document.getElementById('chat-bot-title');
const chatBadge = document.getElementById('chat-badge');

// DOM Elements - Chat Classroom Sandbox Playground
const classroomInputText = document.getElementById('classroom-input-text');
const btnSendClassroomChat = document.getElementById('btn-send-classroom-chat');
const btnResetClassroomChat = document.getElementById('btn-reset-classroom-chat');
const classroomChatMessages = document.getElementById('classroom-chat-messages');
const classroomActivePrompt = document.getElementById('classroom-active-prompt');
const classroomActiveKb = document.getElementById('classroom-active-kb');

// DOM Elements - Modals
const modalTenant = document.getElementById('modal-tenant');
const modalKb = document.getElementById('modal-kb');
const modalCheckout = document.getElementById('modal-checkout');
const modalCloseBtns = document.querySelectorAll('.modal-close');

// DOM Elements - Modal Forms
const btnSubmitTenant = document.getElementById('btn-submit-tenant');
const newTenantName = document.getElementById('new-tenant-name');
const newTenantKey = document.getElementById('new-tenant-key');

const btnSubmitKb = document.getElementById('btn-submit-kb');
const kbItemId = document.getElementById('kb-item-id');
const kbCategory = document.getElementById('kb-category');
const kbTitle = document.getElementById('kb-title');
const kbContent = document.getElementById('kb-content');
const kbModalTitle = document.getElementById('kb-modal-title');

const btnSubmitOrder = document.getElementById('btn-submit-order');
const orderCustName = document.getElementById('order-cust-name');
const orderCustPhone = document.getElementById('order-cust-phone');
const orderCustAddress = document.getElementById('order-cust-address');
const orderCustBox = document.getElementById('order-cust-box');


// Initial Setup & Event Listeners
window.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
});

// Initialize Application
async function initApp() {
  await fetchTenants();
  
  // Start polling orders if tenant is active
  if (!state.isPollingOrders) {
    state.isPollingOrders = true;
    pollOrders();
  }
}

// Event Listeners Registration
function setupEventListeners() {
  // Page Switcher Navigation
  const pageTabs = document.querySelectorAll('.page-tab');
  const pageViews = document.querySelectorAll('.page-view');

  pageTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      pageTabs.forEach(t => t.classList.remove('active'));
      pageViews.forEach(v => v.classList.remove('active'));
      
      tab.classList.add('active');
      const pageId = `page-${tab.dataset.page}`;
      const targetPage = document.getElementById(pageId);
      if (targetPage) {
        targetPage.classList.add('active');
      }
      
      state.activePage = tab.dataset.page;
      
      // Sync layout views when switching pages
      if (state.activePage === 'storefront') {
        renderSimulatorWebsite();
      } else if (state.activePage === 'classroom') {
        syncClassroomView();
      }
    });
  });

  // LMS Sidebar Tab Switcher (Sub-tabs)
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const paneId = `tab-${tab.dataset.tab}`;
      const paneEl = document.getElementById(paneId);
      if (paneEl) {
        paneEl.classList.add('active');
      }
    });
  });

  // Tenant Select Changed
  selectTenant.addEventListener('change', (e) => {
    const tenantId = parseInt(e.target.value);
    const tenant = state.tenants.find(t => t.id === tenantId);
    setActiveTenant(tenant);
  });

  // Prompt Preset Clicking
  presetCards.forEach(card => {
    card.addEventListener('click', () => {
      presetCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const tone = card.dataset.preset;
      if (promptPresets[tone]) {
        systemPromptText.value = promptPresets[tone];
      }
    });
  });

  // Save Prompt
  btnSavePrompt.addEventListener('click', saveSystemPrompt);

  // KB Filters
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeFilter = tab.dataset.filter;
      renderKBCards();
    });
  });

  // Modals Open/Close
  btnAddTenant.addEventListener('click', () => openModal(modalTenant));
  btnAddKb.addEventListener('click', () => {
    if (!state.activeTenant) {
      alert('Please select or create a restaurant first.');
      return;
    }
    // Reset form
    kbItemId.value = '';
    kbCategory.value = 'menu';
    kbTitle.value = '';
    kbContent.value = '';
    kbModalTitle.textContent = 'Add Knowledge Entry';
    openModal(modalKb);
  });
  
  btnSimOrder.addEventListener('click', () => {
    if (!state.activeTenant) {
      alert('Please select or create a restaurant first.');
      return;
    }
    // Pre-populate with mock details for easy testing
    orderCustName.value = "Alice Green";
    orderCustPhone.value = "+1 (555) 382-9472";
    orderCustAddress.value = "456 Oak Avenue, Apt 3B";
    
    // Auto populate cart items based on menu items
    const menuItems = state.kbItems.filter(item => item.category === 'menu');
    if (menuItems.length > 0) {
      const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
      orderCustBox.value = `1x ${randomItem.title}\n1x Diet Soda`;
    } else {
      orderCustBox.value = "1x Gourmet Chef Special\n1x Sparkling Water";
    }
    openModal(modalCheckout);
  });

  modalCloseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(modalTenant);
      closeModal(modalKb);
      closeModal(modalCheckout);
    });
  });

  // Form Submissions
  btnSubmitTenant.addEventListener('click', registerTenant);
  btnSubmitKb.addEventListener('click', saveKBItem);
  btnSubmitOrder.addEventListener('click', placeOrder);
  btnRefreshOrders.addEventListener('click', loadOrders);

  // Storefront Chat Widget Open/Close
  chatWidgetTrigger.addEventListener('click', () => {
    chatWidgetBox.classList.remove('hidden');
    chatWidgetTrigger.classList.add('hidden');
    chatBadge.classList.add('hidden');
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 100);
  });

  btnCloseChat.addEventListener('click', () => {
    chatWidgetBox.classList.add('hidden');
    chatWidgetTrigger.classList.remove('hidden');
  });

  // Storefront Chat Input Listener
  chatInputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
  btnSendChat.addEventListener('click', sendChatMessage);

  // Chat Classroom Sandbox Listeners
  classroomInputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendClassroomMessage();
    }
  });
  btnSendClassroomChat.addEventListener('click', sendClassroomMessage);
  btnResetClassroomChat.addEventListener('click', resetClassroomChat);

  // Copy API Key
  btnCopyKey.addEventListener('click', () => {
    if (state.activeTenant) {
      navigator.clipboard.writeText(state.activeTenant.api_key);
      btnCopyKey.textContent = '✅';
      setTimeout(() => { btnCopyKey.textContent = '📋'; }, 2000);
    }
  });
}

// Helpers for Modals
function openModal(modalEl) {
  modalEl.classList.remove('hidden');
}

function closeModal(modalEl) {
  modalEl.classList.add('hidden');
}

// --- LMS ACADEMY PROGRESS AND STATS CALCULATOR ---
function updateTrainingProgress() {
  if (!state.activeTenant) {
    const progressBar = document.getElementById('lms-progress-bar');
    const progressText = document.getElementById('lms-progress-text');
    const statLessons = document.getElementById('stat-lessons');
    const statGrades = document.getElementById('stat-grades');
    
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0% Complete';
    if (statLessons) statLessons.textContent = '0';
    if (statGrades) statGrades.textContent = '0';
    return;
  }
  
  let score = 0;
  
  // 1. Personality prompt configured (25%)
  const currentPrompt = systemPromptText.value ? systemPromptText.value.trim() : '';
  const hasPrompt = currentPrompt.length > 0;
  if (hasPrompt) score += 25;
  
  // 2. KB categories coverage
  const hasMenu = state.kbItems.some(item => item.category === 'menu');
  const hasHours = state.kbItems.some(item => item.category === 'hours');
  const hasLocation = state.kbItems.some(item => item.category === 'locations');
  const hasGeneral = state.kbItems.some(item => item.category === 'general');
  
  if (hasMenu) score += 25;
  if (hasHours) score += 20;
  if (hasLocation) score += 15;
  if (hasGeneral) score += 15;
  
  // Update progress elements in UI
  const progressBar = document.getElementById('lms-progress-bar');
  const progressText = document.getElementById('lms-progress-text');
  
  if (progressBar) {
    progressBar.style.width = `${score}%`;
  }
  if (progressText) {
    progressText.textContent = `${score}% Complete`;
  }
  
  // Update stats counters
  const statLessons = document.getElementById('stat-lessons');
  const statGrades = document.getElementById('stat-grades');
  
  if (statLessons) {
    statLessons.textContent = state.kbItems.length;
  }
  if (statGrades) {
    statGrades.textContent = state.orders.length;
  }
}

// Sync the left informational panels in the Chat Classroom Sandbox
function syncClassroomView() {
  if (!state.activeTenant) {
    classroomActivePrompt.textContent = 'Please select a restaurant to view configuration.';
    classroomActiveKb.innerHTML = '<p class="empty-list-text">No restaurant selected.</p>';
    return;
  }
  
  // Update prompt view
  const currentPrompt = systemPromptText.value ? systemPromptText.value.trim() : '';
  if (currentPrompt) {
    classroomActivePrompt.textContent = currentPrompt;
  } else {
    classroomActivePrompt.innerHTML = '<span class="empty-list-text" style="color: var(--color-text-muted);">No custom tone configured yet. Using default fallback.</span>';
  }
  
  // Update lessons view
  classroomActiveKb.innerHTML = '';
  if (state.kbItems.length === 0) {
    classroomActiveKb.innerHTML = '<p class="empty-list-text">No custom training data loaded yet.</p>';
  } else {
    state.kbItems.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'classroom-kb-item';
      
      let categoryEmoji = '❓';
      if (item.category === 'menu') categoryEmoji = '🍳';
      else if (item.category === 'hours') categoryEmoji = '⏰';
      else if (item.category === 'locations') categoryEmoji = '📍';
      
      itemEl.innerHTML = `
        <h6>${categoryEmoji} ${escapeHtml(item.title)}</h6>
        <p>${escapeHtml(item.content)}</p>
      `;
      classroomActiveKb.appendChild(itemEl);
    });
  }
}

// --- API ACTIONS & STATE UPDATES ---

// Fetch all tenants
async function fetchTenants() {
  try {
    const res = await fetch(`${API_BASE}/tenants/`);
    if (!res.ok) throw new Error('Failed to fetch tenants');
    
    state.tenants = await res.json();
    
    // Clear select
    selectTenant.innerHTML = '<option value="" disabled>Select a Restaurant...</option>';
    
    if (state.tenants.length === 0) {
      const opt = document.createElement('option');
      opt.value = "";
      opt.textContent = "No Restaurants Registered";
      opt.disabled = true;
      opt.selected = true;
      selectTenant.appendChild(opt);
      
      // Hide displays
      tenantKeyDisplay.classList.add('hidden');
      chatWidgetTrigger.classList.add('hidden');
      updateTrainingProgress();
      return;
    }

    state.tenants.forEach(tenant => {
      const opt = document.createElement('option');
      opt.value = tenant.id;
      opt.textContent = tenant.name;
      selectTenant.appendChild(opt);
    });

    // Auto-select first tenant if none is selected
    if (!state.activeTenant && state.tenants.length > 0) {
      selectTenant.value = state.tenants[0].id;
      setActiveTenant(state.tenants[0]);
    } else if (state.activeTenant) {
      selectTenant.value = state.activeTenant.id;
    }
  } catch (err) {
    console.error('Error fetching tenants:', err);
  }
}

// Register a new tenant
async function registerTenant() {
  const name = newTenantName.value.trim();
  const apiKey = newTenantKey.value.trim();
  
  if (!name) {
    alert('Please enter a restaurant name.');
    return;
  }

  try {
    const payload = { name };
    if (apiKey) payload.api_key = apiKey;

    const res = await fetch(`${API_BASE}/tenants/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || 'Failed to create restaurant');
    }

    const newTenant = await res.json();
    closeModal(modalTenant);
    newTenantName.value = '';
    newTenantKey.value = '';
    
    // Reload tenants and set active
    await fetchTenants();
    const loadedTenant = state.tenants.find(t => t.id === newTenant.id);
    if (loadedTenant) {
      setActiveTenant(loadedTenant);
      selectTenant.value = loadedTenant.id;
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// Set active tenant and update UI
async function setActiveTenant(tenant) {
  if (!tenant) return;
  state.activeTenant = tenant;
  
  // Show key
  tenantKeyDisplay.classList.remove('hidden');
  tenantKeyDisplay.querySelector('code').textContent = tenant.api_key;
  
  // Update Simulator Heading & Details
  simRestName.textContent = tenant.name;
  chatBotTitle.textContent = `${tenant.name} Bot`;
  
  // Reset Storefront Chat UI
  state.chatHistory = [];
  chatMessages.innerHTML = `
    <div class="msg bot-msg">
      <p>Welcome to <strong>${tenant.name}</strong>! How can I assist you with your dining experience or orders today?</p>
      <span class="msg-time">Just now</span>
    </div>
  `;
  chatWidgetTrigger.classList.remove('hidden');
  chatBadge.classList.add('hidden');

  // Reset Classroom Chat UI
  resetClassroomChat();

  // Load Prompt, KB items and orders
  await loadSystemPrompt();
  await loadKBItems();
  await loadOrders();
}

// Get system prompt for active tenant
async function loadSystemPrompt() {
  if (!state.activeTenant) return;
  try {
    const res = await fetch(`${API_BASE}/system-prompt/`, {
      headers: { 'X-API-Key': state.activeTenant.api_key }
    });
    if (!res.ok) throw new Error('Failed to load system prompt');
    
    const data = await res.json();
    systemPromptText.value = data.prompt_text;
    
    // Highlight matching preset if applicable
    presetCards.forEach(card => card.classList.remove('active'));
    for (const [key, value] of Object.entries(promptPresets)) {
      if (data.prompt_text.trim() === value.trim()) {
        document.querySelector(`.preset-card[data-preset="${key}"]`)?.classList.add('active');
        break;
      }
    }
    
    // Sync views
    updateTrainingProgress();
    syncClassroomView();
  } catch (err) {
    console.error('Error loading system prompt:', err);
  }
}

// Save system prompt
async function saveSystemPrompt() {
  if (!state.activeTenant) return;
  const promptText = systemPromptText.value.trim();
  
  try {
    const res = await fetch(`${API_BASE}/system-prompt/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': state.activeTenant.api_key
      },
      body: JSON.stringify({ prompt_text: promptText })
    });
    
    if (!res.ok) throw new Error('Failed to save system prompt');
    
    alert('AI Personality updated successfully!');
    
    // Sync views
    updateTrainingProgress();
    syncClassroomView();
  } catch (err) {
    alert(`Error saving personality: ${err.message}`);
  }
}

// Load KB items for active tenant
async function loadKBItems() {
  if (!state.activeTenant) return;
  try {
    const res = await fetch(`${API_BASE}/kb/`, {
      headers: { 'X-API-Key': state.activeTenant.api_key }
    });
    if (!res.ok) throw new Error('Failed to load knowledge base');
    
    state.kbItems = await res.json();
    renderKBCards();
    renderSimulatorWebsite();
    
    // Sync views
    updateTrainingProgress();
    syncClassroomView();
  } catch (err) {
    console.error('Error loading KB items:', err);
  }
}

// Render KB cards in dashboard
function renderKBCards() {
  kbItemsList.innerHTML = '';
  
  const filtered = state.kbItems.filter(item => {
    if (state.activeFilter === 'all') return true;
    return item.category === state.activeFilter;
  });

  if (filtered.length === 0) {
    kbItemsList.innerHTML = `
      <div class="empty-state">
        <span>📂</span>
        <p>No knowledge base entries in this category. Click "+ Add Entry" to create one!</p>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = `kb-card kb-${item.category}`;
    card.innerHTML = `
      <div class="kb-card-header">
        <h3>${escapeHtml(item.title)}</h3>
        <span class="kb-badge">${item.category}</span>
      </div>
      <div class="kb-card-content">${escapeHtml(item.content)}</div>
      <div class="kb-card-actions">
        <button class="btn-card-action edit-kb-btn" data-id="${item.id}" title="Edit">✏️</button>
        <button class="btn-card-action delete-kb-btn" data-id="${item.id}" title="Delete">🗑️</button>
      </div>
    `;
    
    // Bind buttons
    card.querySelector('.edit-kb-btn').addEventListener('click', () => editKBItemForm(item));
    card.querySelector('.delete-kb-btn').addEventListener('click', () => deleteKBItem(item.id));
    
    kbItemsList.appendChild(card);
  });
}

// Populate edit modal
function editKBItemForm(item) {
  kbItemId.value = item.id;
  kbCategory.value = item.category;
  kbTitle.value = item.title;
  kbContent.value = item.content;
  kbModalTitle.textContent = 'Edit Knowledge Entry';
  openModal(modalKb);
}

// Save (create or update) KB item
async function saveKBItem() {
  if (!state.activeTenant) return;
  
  const id = kbItemId.value;
  const category = kbCategory.value;
  const title = kbTitle.value.trim();
  const content = kbContent.value.trim();
  
  if (!title || !content) {
    alert('Please enter a title and content.');
    return;
  }

  try {
    let url = `${API_BASE}/kb/`;
    let method = 'POST';
    
    if (id) {
      url = `${API_BASE}/kb/${id}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': state.activeTenant.api_key
      },
      body: JSON.stringify({ title, content, category })
    });

    if (!res.ok) throw new Error('Failed to save knowledge base item');

    closeModal(modalKb);
    await loadKBItems();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// Delete KB item
async function deleteKBItem(id) {
  if (!state.activeTenant) return;
  if (!confirm('Are you sure you want to delete this entry?')) return;
  
  try {
    const res = await fetch(`${API_BASE}/kb/${id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': state.activeTenant.api_key }
    });
    if (!res.ok) throw new Error('Failed to delete KB item');
    
    await loadKBItems();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// Render dynamic details in the desktop storefront mockup
function renderSimulatorWebsite() {
  // Menu Category
  const menuItems = state.kbItems.filter(item => item.category === 'menu');
  simMenuList.innerHTML = '';
  
  if (menuItems.length === 0) {
    simMenuList.innerHTML = '<p class="sim-menu-empty">Add items marked as "Menu" in your Knowledge Base to display them on this website.</p>';
  } else {
    menuItems.forEach(item => {
      const menuEl = document.createElement('div');
      menuEl.className = 'store-menu-item';
      
      // Parse out price from content (e.g. "$14.95 - Mozzarella" or "$14.95")
      let price = '';
      let desc = item.content;
      
      const priceMatch = item.content.match(/^(\$\d+(?:\.\d{2})?)\s*[-:]?\s*(.*)$/);
      if (priceMatch) {
        price = priceMatch[1];
        desc = priceMatch[2];
      } else {
        const priceAnywhere = item.content.match(/\$\d+(?:\.\d{2})?/);
        if (priceAnywhere) {
          price = priceAnywhere[0];
        }
      }
      
      menuEl.innerHTML = `
        <div class="store-menu-name-desc">
          <h5>${escapeHtml(item.title)}</h5>
          <p>${escapeHtml(desc)}</p>
        </div>
        <div class="store-menu-price">${price}</div>
      `;
      simMenuList.appendChild(menuEl);
    });
  }

  // Hours Category
  const hoursItem = state.kbItems.find(item => item.category === 'hours');
  simInfoHours.textContent = hoursItem ? hoursItem.content : 'No hours set.';
  
  // Location Category
  const locationItem = state.kbItems.find(item => item.category === 'locations');
  simInfoLocation.textContent = locationItem ? locationItem.content : 'No location set.';
}

// Load orders from database
async function loadOrders() {
  if (!state.activeTenant) return;
  try {
    const res = await fetch(`${API_BASE}/orders/`, {
      headers: { 'X-API-Key': state.activeTenant.api_key }
    });
    if (!res.ok) throw new Error('Failed to load orders');
    
    const newOrders = await res.json();
    const newPendingCount = newOrders.filter(o => o.status === 'pending').length;
    
    state.orders = newOrders;
    renderOrders();
    
    // Update badge
    if (newPendingCount > 0) {
      orderBadge.textContent = newPendingCount;
      orderBadge.classList.remove('hidden');
    } else {
      orderBadge.classList.add('hidden');
    }
    
    // Update training progress
    updateTrainingProgress();
  } catch (err) {
    console.error('Error loading orders:', err);
  }
}

// Polling orders every 5 seconds
async function pollOrders() {
  while (true) {
    if (state.activeTenant) {
      await loadOrders();
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// Render orders list in Admin Dashboard
function renderOrders() {
  ordersList.innerHTML = '';
  
  if (state.orders.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-state">
        <span>🛒</span>
        <p>No customer orders placed yet. Simulate an order on the storefront preview!</p>
      </div>
    `;
    return;
  }

  state.orders.forEach(order => {
    const orderDate = new Date(order.created_at);
    const dateStr = orderDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-card-header">
        <div class="order-id-date">
          <span class="order-id">Order #${order.id}</span>
          <span class="order-date">${dateStr}</span>
        </div>
        <span class="order-status-pill ${order.status}">${order.status.replace('_', ' ')}</span>
      </div>
      
      <div class="order-details-grid">
        <div class="detail-label">Name:</div>
        <div class="detail-value">${escapeHtml(order.customer_name)}</div>
        
        <div class="detail-label">Phone:</div>
        <div class="detail-value">${escapeHtml(order.customer_phone)}</div>
        
        <div class="detail-label">Address:</div>
        <div class="detail-value">${escapeHtml(order.customer_address)}</div>
      </div>
      
      <div class="order-box">
        ${escapeHtml(order.order_items)}
      </div>
      
      <div class="order-actions-row">
        <button class="btn-status-act accept-act" data-id="${order.id}" ${order.status === 'accepted' ? 'disabled' : ''}>Accept Order</button>
        <button class="btn-status-act reject-act" data-id="${order.id}" ${order.status === 'rejected' ? 'disabled' : ''}>Reject</button>
        <button class="btn-status-act outofstock-act" data-id="${order.id}" ${order.status === 'out_of_stock' ? 'disabled' : ''}>Out of Stock</button>
      </div>
    `;
    
    // Bind buttons
    card.querySelector('.accept-act').addEventListener('click', () => updateOrderStatus(order.id, 'accepted'));
    card.querySelector('.reject-act').addEventListener('click', () => updateOrderStatus(order.id, 'rejected'));
    card.querySelector('.outofstock-act').addEventListener('click', () => updateOrderStatus(order.id, 'out_of_stock'));
    
    ordersList.appendChild(card);
  });
}

// Update order status call
async function updateOrderStatus(orderId, status) {
  if (!state.activeTenant) return;
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': state.activeTenant.api_key
      },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update order status');
    
    await loadOrders();
  } catch (err) {
    alert(`Error updating order status: ${err.message}`);
  }
}

// Customer Checkout simulation
async function placeOrder() {
  if (!state.activeTenant) return;
  
  const name = orderCustName.value.trim();
  const phone = orderCustPhone.value.trim();
  const address = orderCustAddress.value.trim();
  const orderBox = orderCustBox.value.trim();
  
  if (!name || !phone || !address || !orderBox) {
    alert('Please fill out all order details.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/orders/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': state.activeTenant.api_key
      },
      body: JSON.stringify({
        customer_name: name,
        customer_phone: phone,
        customer_address: address,
        order_items: orderBox
      })
    });
    
    if (!res.ok) throw new Error('Checkout failed');
    
    closeModal(modalCheckout);
    alert('Order placed successfully! Check the Orders Feed on the dashboard.');
    
    await loadOrders();
    
    // Trigger notification badge in simulator if chat is closed
    if (chatWidgetBox.classList.contains('hidden')) {
      chatBadge.textContent = "1";
      chatBadge.classList.remove('hidden');
    }
  } catch (err) {
    alert(`Checkout error: ${err.message}`);
  }
}

// --- CHAT SANDBOX SIMULATOR (STOREFRONT) ---

// Send message to chatbot API
async function sendChatMessage() {
  if (!state.activeTenant) return;
  
  const messageText = chatInputText.value.trim();
  if (!messageText) return;
  
  chatInputText.value = '';
  appendChatMessage('user', messageText);
  const typingBubble = appendTypingIndicator();
  
  try {
    const history = state.chatHistory.slice(-10).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
    
    const res = await fetch(`${API_BASE}/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': state.activeTenant.api_key
      },
      body: JSON.stringify({
        message: messageText,
        history: history
      })
    });
    
    typingBubble.remove();

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || 'Failed to fetch bot response');
    }
    
    const data = await res.json();
    appendChatMessage('bot', data.response);
  } catch (err) {
    typingBubble.remove();
    appendChatMessage('bot', `⚠️ Error: ${err.message}. Please check that your ANTHROPIC_API_KEY environment variable is configured properly.`);
  }
}

// Append bubble to chat window
function appendChatMessage(sender, text) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const msgEl = document.createElement('div');
  msgEl.className = `msg ${sender === 'user' ? 'user-msg' : 'bot-msg'}`;
  msgEl.innerHTML = `
    <p>${escapeHtml(text)}</p>
    <span class="msg-time">${time}</span>
  `;
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  state.chatHistory.push({ sender, text });
}

// Typing Indicator for storefront
function appendTypingIndicator() {
  const bubble = document.createElement('div');
  bubble.className = 'typing-bubble';
  bubble.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}

// --- CHAT CLASSROOM SANDBOX PLAYGROUND ---

// Send message to classroom sandbox chatbot API
async function sendClassroomMessage() {
  if (!state.activeTenant) return;
  
  const messageText = classroomInputText.value.trim();
  if (!messageText) return;
  
  classroomInputText.value = '';
  appendClassroomChatMessage('user', messageText);
  const typingBubble = appendClassroomTypingIndicator();
  
  try {
    const history = state.classroomChatHistory.slice(-10).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
    
    const res = await fetch(`${API_BASE}/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': state.activeTenant.api_key
      },
      body: JSON.stringify({
        message: messageText,
        history: history
      })
    });
    
    typingBubble.remove();

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || 'Failed to fetch bot response');
    }
    
    const data = await res.json();
    appendClassroomChatMessage('bot', data.response);
  } catch (err) {
    typingBubble.remove();
    appendClassroomChatMessage('bot', `⚠️ Error: ${err.message}. Please check that your ANTHROPIC_API_KEY environment variable is configured properly.`);
  }
}

// Append bubble to classroom sandbox chat window
function appendClassroomChatMessage(sender, text) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const msgEl = document.createElement('div');
  msgEl.className = `classroom-msg ${sender === 'user' ? 'user-msg' : 'bot-msg'}`;
  msgEl.innerHTML = `
    <p>${escapeHtml(text)}</p>
    <span class="msg-time">${time}</span>
  `;
  classroomChatMessages.appendChild(msgEl);
  classroomChatMessages.scrollTop = classroomChatMessages.scrollHeight;
  
  state.classroomChatHistory.push({ sender, text });
}

// Typing Indicator for classroom sandbox
function appendClassroomTypingIndicator() {
  const bubble = document.createElement('div');
  bubble.className = 'typing-bubble classroom-msg bot-msg';
  bubble.style.maxWidth = '100px';
  bubble.style.padding = '12px 14px';
  bubble.style.borderTopLeftRadius = '0';
  bubble.style.display = 'inline-flex';
  bubble.style.alignSelf = 'flex-start';
  bubble.innerHTML = '<span></span><span></span><span></span>';
  classroomChatMessages.appendChild(bubble);
  classroomChatMessages.scrollTop = classroomChatMessages.scrollHeight;
  return bubble;
}

// Clear classroom chat history and display initial greeting
function resetClassroomChat() {
  state.classroomChatHistory = [];
  if (classroomChatMessages) {
    const restaurantName = state.activeTenant ? state.activeTenant.name : 'your Restaurant';
    classroomChatMessages.innerHTML = `
      <div class="classroom-msg bot-msg">
        <p>Welcome to the Chat Classroom! I am ready to test my training for <strong>${escapeHtml(restaurantName)}</strong>. Ask me about our menu, hours, or order details.</p>
        <span class="msg-time">Just now</span>
      </div>
    `;
  }
}

// --- UTILITIES ---

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
