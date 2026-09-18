let items = [];
let currentTab = 'all';
let editingItemId = null;
let db = null;                 // Supabase client, created once the library loads
let pendingImageUrl = null;    // thumbnail captured during a URL import

// ---------------------------------------------------------------
// Startup: load the Supabase library, THEN create the client.
// ---------------------------------------------------------------
const sbScript = document.createElement('script');
sbScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
sbScript.onload = () => {
  try {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    showMessage('Could not connect to the database: ' + e.message, 'error');
    return;
  }
  loadItems();
  handleSharedUrl();
};
sbScript.onerror = () => showMessage('Could not load the Supabase library.', 'error');
document.head.appendChild(sbScript);

// ---------------------------------------------------------------
// Shortcut support: ?url=... pre-fills and runs the import
// ---------------------------------------------------------------
function handleSharedUrl() {
  const shared = new URLSearchParams(window.location.search).get('url');
  if (!shared) return;

  document.getElementById('importUrl').value = shared;
  document.getElementById('importModal').classList.add('active');

  // Clean the address bar so a refresh doesn't re-import
  history.replaceState({}, '', window.location.pathname);

  importFromUrl();
}

// ---------------------------------------------------------------
// Data
// ---------------------------------------------------------------
async function loadItems() {
  if (!db) return;
  try {
    const { data, error } = await db
      .from('wishlist_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    items = data || [];
    renderItems();
    updateStats();
  } catch (error) {
    showMessage('Error loading items: ' + error.message, 'error');
  }
}

async function saveItem(event) {
  event.preventDefault();

  const formMessage = document.getElementById('formMessage');
  formMessage.innerHTML = '';

  if (!db) {
    formMessage.innerHTML = '<div class="error">Database not ready yet — try again in a moment.</div>';
    return;
  }

  const name = document.getElementById('itemName').value.trim();
  const url = document.getElementById('itemUrl').value.trim();
  const price = parseFloat(document.getElementById('itemPrice').value);
  const priority = document.getElementById('itemPriority').value;
  const status = document.getElementById('itemStatus').value;
  const notes = document.getElementById('itemNotes').value.trim();

  if (!name) {
    formMessage.innerHTML = '<div class="error">Item name is required</div>';
    return;
  }

  const row = {
    name,
    url: url || null,
    price: Number.isFinite(price) ? price : null,
    priority,
    status,
    notes: notes || null
  };

  try {
    if (editingItemId) {
      const { error } = await db
        .from('wishlist_items')
        .update(row)
        .eq('id', editingItemId);
      if (error) throw error;
      showMessage('Item updated', 'success');
    } else {
      row.source_image_url = pendingImageUrl || null;
      const { error } = await db.from('wishlist_items').insert([row]);
      if (error) throw error;
      showMessage('Item added', 'success');
    }

    pendingImageUrl = null;
    toggleAddModal();
    loadItems();
  } catch (error) {
    formMessage.innerHTML = '<div class="error">' + error.message + '</div>';
  }
}

async function deleteItem(id) {
  if (!confirm('Delete this item?')) return;
  try {
    const { error } = await db.from('wishlist_items').delete().eq('id', id);
    if (error) throw error;
    showMessage('Item deleted', 'success');
    loadItems();
  } catch (error) {
    showMessage('Error deleting item: ' + error.message, 'error');
  }
}

async function updateItemStatus(id, newStatus) {
  try {
    const { error } = await db
      .from('wishlist_items')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) throw error;
    loadItems();
  } catch (error) {
    showMessage('Error updating status: ' + error.message, 'error');
  }
}

// ---------------------------------------------------------------
// URL import
// ---------------------------------------------------------------
async function importFromUrl() {
  const importUrl = document.getElementById('importUrl').value.trim();
  const importMessage = document.getElementById('importMessage');
  const importBtn = document.getElementById('importBtn');
  importMessage.innerHTML = '';

  if (!importUrl) {
    importMessage.innerHTML = '<div class="error">URL is required</div>';
    return;
  }

  importBtn.disabled = true;
  importBtn.textContent = 'Importing...';

  let data = null;
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: importUrl })
    });
    data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not read that page');
  } catch (error) {
    importMessage.innerHTML = '<div class="error">' + error.message + '</div>';
    importBtn.disabled = false;
    importBtn.textContent = 'Import & Save';
    return;
  }

  // Carry the import modal's choices across to the add form
  const priority = document.getElementById('importPriority').value;
  const notes = document.getElementById('importNotes').value.trim();

  pendingImageUrl = data.image || null;

  toggleImportModal();
  toggleAddModal();

  document.getElementById('itemName').value = data.title || '';
  document.getElementById('itemUrl').value = data.source_url || importUrl;
  document.getElementById('itemPrice').value = data.price || '';
  document.getElementById('itemPriority').value = priority;
  document.getElementById('itemStatus').value = 'Wanted';
  document.getElementById('itemNotes').value = notes;

  if (data.warning || !data.metadata_found) {
    document.getElementById('formMessage').innerHTML =
      '<div class="error">' + (data.warning || 'No product details found — fill them in below.') + '</div>';
  }

  importBtn.disabled = false;
  importBtn.textContent = 'Import & Save';
}

// ---------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------
function editItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  editingItemId = id;
  pendingImageUrl = null;
  document.getElementById('modalTitle').textContent = 'Edit Item';
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemUrl').value = item.url || '';
  document.getElementById('itemPrice').value = item.price || '';
  document.getElementById('itemPriority').value = item.priority;
  document.getElementById('itemStatus').value = item.status;
  document.getElementById('itemNotes').value = item.notes || '';
  document.getElementById('formMessage').innerHTML = '';

  document.getElementById('addModal').classList.add('active');
}

function renderItems() {
  const sortBy = document.getElementById('sortBy').value;
  const priorityFilter = document.getElementById('priorityFilter').value;

  let filtered = [...items];

  if (priorityFilter) {
    filtered = filtered.filter(item => item.priority === priorityFilter);
  }

  if (currentTab !== 'all') {
    const want = currentTab.charAt(0).toUpperCase() + currentTab.slice(1);
    filtered = filtered.filter(item => item.status === want);
  }

  const priorityOrder = { High: 0, Medium: 1, Low: 2 };
  switch (sortBy) {
    case 'created-asc':
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case 'priority':
      filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      break;
    case 'price-desc':
      filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      break;
    case 'price-asc':
      filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
      break;
    case 'name':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const container = document.getElementById('itemsContainer');
  const emptyState = document.getElementById('emptyAll');

  if (filtered.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  container.innerHTML = filtered.map(createItemCard).join('');
}

function hostnameOf(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

function createItemCard(item) {
  const priorityClass = 'priority-' + String(item.priority).toLowerCase();
  const statusClass = 'status-' + String(item.status).toLowerCase();

  const imageHtml = item.source_image_url
    ? '<img src="' + item.source_image_url + '" alt="" class="item-image" onerror="this.style.display=\'none\'">'
    : '';

  const urlHtml = item.url
    ? '<a href="' + item.url + '" target="_blank" class="item-url">' + escapeHtml(hostnameOf(item.url)) + '</a>'
    : '';

  const priceValue = Number(item.price);
  const priceHtml = Number.isFinite(priceValue) && item.price !== null
    ? '<div class="item-price">€' + priceValue.toFixed(2) + '</div>'
    : '';

  const notesHtml = item.notes
    ? '<div class="item-notes">' + escapeHtml(item.notes) + '</div>'
    : '';

  return `
    <div class="item-card">
      ${imageHtml}
      <div class="item-body">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-meta">
          <span class="badge ${priorityClass}">${item.priority}</span>
          <span class="badge ${statusClass}">${item.status}</span>
        </div>
        ${priceHtml}
        ${urlHtml}
        ${notesHtml}
        <div class="item-actions">
          <button class="secondary" onclick="editItem('${item.id}')">Edit</button>
          <button onclick="updateItemStatus('${item.id}', '${getNextStatus(item.status)}')">
            ${getStatusButtonText(item.status)}
          </button>
          <button class="delete-btn" onclick="deleteItem('${item.id}')">×</button>
        </div>
      </div>
    </div>
  `;
}

function getNextStatus(status) {
  return { Wanted: 'Monitoring', Monitoring: 'Purchased', Purchased: 'Wanted' }[status] || 'Wanted';
}

function getStatusButtonText(status) {
  return { Wanted: 'Mark Monitoring', Monitoring: 'Mark Purchased', Purchased: 'Mark Wanted' }[status] || 'Update';
}

function updateStats() {
  const totalValue = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  document.getElementById('totalItems').textContent = items.length;
  document.getElementById('wantedCount').textContent = items.filter(i => i.status === 'Wanted').length;
  document.getElementById('monitoringCount').textContent = items.filter(i => i.status === 'Monitoring').length;
  document.getElementById('purchasedCount').textContent = items.filter(i => i.status === 'Purchased').length;
  document.getElementById('totalValue').textContent = '€' + totalValue.toFixed(2);
}

// ---------------------------------------------------------------
// UI
// ---------------------------------------------------------------
function switchTab(tab) {
  currentTab = tab;
  const order = ['all', 'wanted', 'monitoring', 'purchased'];
  const buttons = document.querySelectorAll('.tab');
  buttons.forEach(b => b.classList.remove('active'));
  const index = order.indexOf(tab);
  if (buttons[index]) buttons[index].classList.add('active');
  renderItems();
}

function toggleAddModal() {
  const modal = document.getElementById('addModal');
  modal.classList.toggle('active');

  if (!modal.classList.contains('active')) {
    editingItemId = null;
    pendingImageUrl = null;
    document.getElementById('modalTitle').textContent = 'Add Item';
    document.getElementById('itemForm').reset();
    document.getElementById('formMessage').innerHTML = '';
  }
}

function toggleImportModal() {
  const modal = document.getElementById('importModal');
  modal.classList.toggle('active');

  if (!modal.classList.contains('active')) {
    document.getElementById('importUrl').value = '';
    document.getElementById('importNotes').value = '';
    document.getElementById('importMessage').innerHTML = '';
  }
}

function showMessage(text, type) {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  messageDiv.innerHTML = '<div class="' + type + '">' + text + '</div>';
  setTimeout(() => { messageDiv.innerHTML = ''; }, 5000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : text;
  return div.innerHTML;
}

document.addEventListener('click', (e) => {
  if (e.target === document.getElementById('addModal')) toggleAddModal();
  if (e.target === document.getElementById('importModal')) toggleImportModal();
});
