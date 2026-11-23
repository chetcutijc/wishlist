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
  startAuth();
};
sbScript.onerror = () => showMessage('Could not load the Supabase library.', 'error');
document.head.appendChild(sbScript);

// ---------------------------------------------------------------
// Sign-in. The database only answers to your account, so nothing
// loads until you're logged in. The session is remembered per device.
// ---------------------------------------------------------------
let currentUserId = null;
const APP_URL = window.location.origin + window.location.pathname;

async function startAuth() {
  const { data: { session } } = await db.auth.getSession();
  setUser(session ? session.user : null);
  db.auth.onAuthStateChange((event, s) => {
    setUser(s ? s.user : null);
    if (event === 'PASSWORD_RECOVERY') setTimeout(setNewPassword, 300);
  });

  document.getElementById('authSignIn').onclick = signIn;
  document.getElementById('authPassword').onkeydown = (e) => { if (e.key === 'Enter') signIn(); };
  document.getElementById('authForgot').onclick = async () => {
    const email = document.getElementById('authEmail').value.trim();
    const err = document.getElementById('authErr');
    if (!email) { err.textContent = 'Enter your email above first.'; return; }
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: APP_URL });
    err.textContent = error ? error.message : 'Check your email for a reset link. Open it on this device.';
  };
}

function setUser(user) {
  const newId = user ? user.id : null;
  const changed = newId !== currentUserId;
  currentUserId = newId;
  document.getElementById('authScreen').hidden = !!user;
  document.getElementById('app').hidden = !user;
  if (user && changed) {
    loadItems();
    handleSharedUrl();   // the Shortcut's ?url= waits here until you've signed in
  }
  if (!user) items = [];
}

async function signIn() {
  const err = document.getElementById('authErr');
  err.textContent = '';
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  if (!email || !password) { err.textContent = 'Enter your email and password.'; return; }
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) err.textContent = error.message;
}

async function signOut() {
  await db.auth.signOut();
}

async function setNewPassword() {
  for (;;) {
    const pw = prompt('Choose a new password (at least 8 characters):');
    if (pw == null) return;
    if (pw.length < 8) { alert('At least 8 characters, please.'); continue; }
    const { error } = await db.auth.updateUser({ password: pw });
    if (error) { alert("Couldn't update: " + error.message); continue; }
    showMessage('Password updated', 'success');
    return;
  }
}

// ---------------------------------------------------------------
// View-only share links
// ---------------------------------------------------------------
const SHARE_PAGE = APP_URL.replace(/index\.html$/, '').replace(/\/?$/, '/') + 'share.html';

function shareLink(token) {
  return SHARE_PAGE + '?t=' + token;
}

async function toggleShareModal() {
  const modal = document.getElementById('shareModal');
  modal.classList.toggle('active');
  if (modal.classList.contains('active')) loadShares();
  else document.getElementById('shareMessage').innerHTML = '';
}

async function loadShares() {
  const list = document.getElementById('shareList');
  const { data, error } = await db
    .from('wishlist_shares')
    .select('id,label,token,max_price,created_at')
    .order('created_at', { ascending: false });
  if (error) {
    document.getElementById('shareMessage').innerHTML = '<div class="error">' + escapeHtml(error.message) + '</div>';
    return;
  }
  if (!data.length) {
    list.innerHTML = '<li class="share-empty">No links yet.</li>';
    return;
  }
  list.innerHTML = data.map(s => `
    <li class="share-row">
      <div class="who">
        <strong>${escapeHtml(s.label)}</strong>
        <span>Up to €${Number(s.max_price).toFixed(0)} · made ${new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
      </div>
      <button class="secondary" onclick="copyShare('${s.token}', '${escapeHtml(s.label).replace(/'/g, '&#39;')}')">Copy link</button>
      <button class="delete-btn" onclick="deleteShare('${s.id}')" title="Delete link">×</button>
    </li>`).join('');
}

async function createShare() {
  const labelEl = document.getElementById('shareLabel');
  const maxEl = document.getElementById('shareMax');
  const label = labelEl.value.trim();
  const max = parseFloat(maxEl.value);
  const msg = document.getElementById('shareMessage');
  msg.innerHTML = '';
  if (!label) { msg.innerHTML = '<div class="error">Add a name so you know whose link it is.</div>'; return; }
  if (!Number.isFinite(max) || max <= 0) { msg.innerHTML = '<div class="error">Max price must be above zero.</div>'; return; }

  const { data, error } = await db
    .from('wishlist_shares')
    .insert([{ label, max_price: max }])
    .select('token')
    .single();
  if (error) { msg.innerHTML = '<div class="error">' + escapeHtml(error.message) + '</div>'; return; }

  labelEl.value = '';
  maxEl.value = '100';
  await loadShares();
  copyShare(data.token, label);
}

async function copyShare(token, label) {
  const link = shareLink(token);
  const msg = document.getElementById('shareMessage');
  // Phones: offer the share sheet; elsewhere copy to clipboard
  if (navigator.share) {
    try { await navigator.share({ title: 'My wishlist', url: link }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(link);
    msg.innerHTML = '<div class="success">Link for ' + escapeHtml(label) + ' copied.</div>';
  } catch {
    prompt('Copy this link:', link);
  }
}

async function deleteShare(id) {
  if (!confirm('Delete this link? Anyone using it will lose access.')) return;
  const { error } = await db.from('wishlist_shares').delete().eq('id', id);
  if (error) { document.getElementById('shareMessage').innerHTML = '<div class="error">' + escapeHtml(error.message) + '</div>'; return; }
  loadShares();
}

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
      '<div class="error">' + escapeHtml(data.warning || 'No product details found — fill them in below.') + '</div>';
  }
  // Price missing (common on Amazon): put the cursor straight in the price box
  if (!data.price) document.getElementById('itemPrice').focus();

  importBtn.disabled = false;
  importBtn.textContent = 'Import & Save';
}

// ---------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------
function editItem(id, focusPrice = false) {
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
  if (focusPrice) document.getElementById('itemPrice').focus();
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

  const priceHtml = hasPrice(item)
    ? '<div class="item-price">€' + Number(item.price).toFixed(2) + '</div>'
    : '<button type="button" class="price-missing" onclick="editItem(\'' + item.id + '\', true)">+ Add price</button>';

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

function hasPrice(item) {
  return item.price !== null && item.price !== '' && Number.isFinite(Number(item.price));
}

function updateStats() {
  // Wishlist = everything not yet bought (Wanted + Monitoring)
  const wishlist = items.filter(i => i.status !== 'Purchased');
  const purchased = items.filter(i => i.status === 'Purchased');
  const sum = list => list.reduce((total, item) => total + (hasPrice(item) ? Number(item.price) : 0), 0);
  const missingNote = list => {
    const missing = list.filter(item => !hasPrice(item)).length;
    return missing ? missing + ' of ' + list.length + ' without a price' : '';
  };

  document.getElementById('totalItems').textContent = items.length;
  document.getElementById('wantedCount').textContent = items.filter(i => i.status === 'Wanted').length;
  document.getElementById('monitoringCount').textContent = items.filter(i => i.status === 'Monitoring').length;
  document.getElementById('purchasedCount').textContent = purchased.length;
  document.getElementById('wishlistValue').textContent = '€' + sum(wishlist).toFixed(2);
  document.getElementById('purchasedValue').textContent = '€' + sum(purchased).toFixed(2);
  document.getElementById('wishlistValueNote').textContent = missingNote(wishlist);
  document.getElementById('purchasedValueNote').textContent = missingNote(purchased);
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
  if (e.target === document.getElementById('shareModal')) toggleShareModal();
});
