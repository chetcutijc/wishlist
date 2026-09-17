let items = [];
let currentTab = 'all';
let editingItemId = null;

// Load Supabase client from CDN
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
script.onload = () => {
  supabase_module = window.supabase;
  loadItems();
};
document.head.appendChild(script);

async function loadItems() {
  try {
    const { data, error } = await supabase
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

  const name = document.getElementById('itemName').value.trim();
  const url = document.getElementById('itemUrl').value.trim();
  const price = parseFloat(document.getElementById('itemPrice').value) || null;
  const priority = document.getElementById('itemPriority').value;
  const status = document.getElementById('itemStatus').value;
  const notes = document.getElementById('itemNotes').value.trim();

  if (!name) {
    formMessage.innerHTML = '<div class="error">Item name is required</div>';
    return;
  }

  try {
    if (editingItemId) {
      // Update existing item
      const { error } = await supabase
        .from('wishlist_items')
        .update({ name, url, price, priority, status, notes })
        .eq('id', editingItemId);

      if (error) throw error;
      showMessage('Item updated successfully', 'success');
    } else {
      // Create new item
      const { error } = await supabase
        .from('wishlist_items')
        .insert([{ name, url, price, priority, status, notes }]);

      if (error) throw error;
      showMessage('Item added successfully', 'success');
    }

    toggleAddModal();
    loadItems();
  } catch (error) {
    formMessage.innerHTML = '<div class="error">' + error.message + '</div>';
  }
}

async function deleteItem(id) {
  if (!confirm('Delete this item?')) return;

  try {
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    showMessage('Item deleted', 'success');
    loadItems();
  } catch (error) {
    showMessage('Error deleting item: ' + error.message, 'error');
  }
}

async function importFromUrl() {
  const importUrl = document.getElementById('importUrl').value.trim();
  const importMessage = document.getElementById('importMessage');
  importMessage.innerHTML = '';

  if (!importUrl) {
    importMessage.innerHTML = '<div class="error">URL is required</div>';
    return;
  }

  const importBtn = document.getElementById('importBtn');
  importBtn.disabled = true;
  importBtn.textContent = 'Importing...';

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: importUrl })
    });

    if (!response.ok) throw new Error('Failed to fetch product metadata');

    const data = await response.json();
    
    // Populate the form with imported data
    document.getElementById('itemName').value = data.name || '';
    document.getElementById('itemUrl').value = importUrl;
    document.getElementById('itemPrice').value = data.price || '';
    
    // Switch to add modal with pre-filled data
    toggleImportModal();
    toggleAddModal();

    // Show success message
    showMessage('Product metadata imported. Complete the details and save.', 'success');
  } catch (error) {
    importMessage.innerHTML = '<div class="error">' + error.message + '</div>';
  } finally {
    importBtn.disabled = false;
    importBtn.textContent = 'Import & Save';
  }
}

async function updateItemStatus(id, newStatus) {
  try {
    const { error } = await supabase
      .from('wishlist_items')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) throw error;
    loadItems();
  } catch (error) {
    showMessage('Error updating status: ' + error.message, 'error');
  }
}

function editItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  editingItemId = id;
  document.getElementById('modalTitle').textContent = 'Edit Item';
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemUrl').value = item.url || '';
  document.getElementById('itemPrice').value = item.price || '';
  document.getElementById('itemPriority').value = item.priority;
  document.getElementById('itemStatus').value = item.status;
  document.getElementById('itemNotes').value = item.notes || '';
  document.getElementById('formMessage').innerHTML = '';

  toggleAddModal();
}

function renderItems() {
  const sortBy = document.getElementById('sortBy').value;
  const priorityFilter = document.getElementById('priorityFilter').value;
  
  let filtered = [...items];

  // Apply priority filter
  if (priorityFilter) {
    filtered = filtered.filter(item => item.priority === priorityFilter);
  }

  // Apply tab filter
  if (currentTab !== 'all') {
    filtered = filtered.filter(item => item.status === currentTab.charAt(0).toUpperCase() + currentTab.slice(1));
  }

  // Apply sorting
  switch (sortBy) {
    case 'created-asc':
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case 'priority':
      const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
      filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      break;
    case 'price-desc':
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case 'price-asc':
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case 'name':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default: // created-desc
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
  container.innerHTML = filtered.map(item => createItemCard(item)).join('');
}

function createItemCard(item) {
  const priorityClass = `priority-${item.priority.toLowerCase()}`;
  const statusClass = `status-${item.status.toLowerCase()}`;
  const imageHtml = item.source_image_url 
    ? `<img src="${item.source_image_url}" alt="${item.name}" class="item-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f5f5f5%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'">`
    : '';

  const urlHtml = item.url 
    ? `<a href="${item.url}" target="_blank" class="item-url">${new URL(item.url).hostname}</a>`
    : '';

  const priceHtml = item.price 
    ? `<div class="item-price">$${item.price.toFixed(2)}</div>`
    : '';

  const notesHtml = item.notes 
    ? `<div class="item-notes">${item.notes}</div>`
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

function getNextStatus(currentStatus) {
  const statusFlow = { 'Wanted': 'Monitoring', 'Monitoring': 'Purchased', 'Purchased': 'Wanted' };
  return statusFlow[currentStatus] || 'Wanted';
}

function getStatusButtonText(status) {
  const texts = { 'Wanted': 'Mark Monitoring', 'Monitoring': 'Mark Purchased', 'Purchased': 'Mark Wanted' };
  return texts[status] || 'Update';
}

function updateStats() {
  const total = items.length;
  const wanted = items.filter(i => i.status === 'Wanted').length;
  const monitoring = items.filter(i => i.status === 'Monitoring').length;
  const purchased = items.filter(i => i.status === 'Purchased').length;
  const totalValue = items.reduce((sum, item) => sum + (item.price || 0), 0);

  document.getElementById('totalItems').textContent = total;
  document.getElementById('wantedCount').textContent = wanted;
  document.getElementById('monitoringCount').textContent = monitoring;
  document.getElementById('purchasedCount').textContent = purchased;
  document.getElementById('totalValue').textContent = '$' + totalValue.toFixed(2);
}

function switchTab(tab) {
  currentTab = tab;
  
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  renderItems();
}

function toggleAddModal() {
  const modal = document.getElementById('addModal');
  modal.classList.toggle('active');

  if (!modal.classList.contains('active')) {
    // Reset form when closing
    editingItemId = null;
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
  messageDiv.innerHTML = `<div class="${type}">${text}</div>`;
  setTimeout(() => { messageDiv.innerHTML = ''; }, 4000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modals on background click
document.addEventListener('click', (e) => {
  const addModal = document.getElementById('addModal');
  const importModal = document.getElementById('importModal');

  if (e.target === addModal) toggleAddModal();
  if (e.target === importModal) toggleImportModal();
});
// Auto-import from URL parameter
function checkForImportUrl() {
  if (!supabase_module) {
    // Supabase not loaded yet, try again in 500ms
    setTimeout(checkForImportUrl, 500);
    return;
  }
  
  const params = new URLSearchParams(window.location.search);
  const importUrl = params.get('url');
  
  if (importUrl) {
    document.getElementById('importUrl').value = importUrl;
    toggleImportModal();
  }
}

// Start checking once page is loaded
document.addEventListener('DOMContentLoaded', checkForImportUrl);


