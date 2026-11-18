/**
 * PERUM LPPNPI CABANG TARAKAN & UNIT KERJA BAWAHAN
 * SISTEM REKAPITULASI INVENTARIS ALAT K3
 * File: app.js
 */

// Master List Unit Kerja di Bawah Perum LPPNPI Cabang Tarakan
const UNITS = [
  { id: "TRK", name: "Perum LPPNPI Cabang Tarakan", shortName: "Tarakan", type: "Cabang Utama", badge: "CABANG TARAKAN", prefix: "TRK", city: "Tarakan" },
  { id: "MLN", name: "Perum LPPNPI Cabang Pembantu Malinau", shortName: "Malinau", type: "Cabang Pembantu", badge: "CABANG PEMBANTU MALINAU", prefix: "MLN", city: "Malinau" },
  { id: "NNX", name: "Perum LPPNPI Unit Nunukan", shortName: "Nunukan", type: "Unit", badge: "UNIT NUNUKAN", prefix: "NNX", city: "Nunukan" },
  { id: "TJS", name: "Perum LPPNPI Unit Tanjung Harapan", shortName: "Tanjung Harapan", type: "Unit", badge: "UNIT TANJUNG HARAPAN", prefix: "TJS", city: "Tanjung Selor" },
  { id: "LBW", name: "Perum LPPNPI Unit Long Bawan", shortName: "Long Bawan", type: "Unit", badge: "UNIT LONG BAWAN", prefix: "LBW", city: "Long Bawan" },
  { id: "LPU", name: "Perum LPPNPI Unit Long Apung", shortName: "Long Apung", type: "Unit", badge: "UNIT LONG APUNG", prefix: "LPU", city: "Long Apung" }
];

// Key Storage
const STORAGE_KEY_ITEMS = 'airnav_k3_items_v1';
const STORAGE_KEY_TX = 'airnav_k3_transactions_v1';
const STORAGE_KEY_ACTIVE_UNIT = 'airnav_k3_active_unit_v1';

// Active Unit State (Defaults to 'TRK' or restored from storage)
let activeUnitId = localStorage.getItem(STORAGE_KEY_ACTIVE_UNIT) || 'TRK';

// Initial Data requested by User (Default untuk Perum LPPNPI Cabang Tarakan)
const INITIAL_ITEMS = [
  { id: "K3-001", unitId: "TRK", nama: "ROMPI", satuan: "PCS", stokAwal: 4, minStok: 2, kategori: "APD", lokasi: "Lemari K3", keterangan: "Rompi keselamatan reflektif standar K3" },
  { id: "K3-002", unitId: "TRK", nama: "KARUNG", satuan: "PCS", stokAwal: 2, minStok: 2, kategori: "Perlengkapan Darurat", lokasi: "Lemari K3", keterangan: "Karung pengaman penahan debu/tanggul" },
  { id: "K3-003", unitId: "TRK", nama: "HELM", satuan: "PCS", stokAwal: 5, minStok: 2, kategori: "APD", lokasi: "Lemari K3", keterangan: "Helm keselamatan kerja (Safety Helmet)" },
  { id: "K3-004", unitId: "TRK", nama: "MASKER GAS", satuan: "PCS", stokAwal: 1, minStok: 1, kategori: "APD Khusus", lokasi: "Lemari K3", keterangan: "Masker respirator gas beracun/asap" },
  { id: "K3-005", unitId: "TRK", nama: "KACAMATA SAFETY", satuan: "PCS", stokAwal: 3, minStok: 2, kategori: "APD", lokasi: "Lemari K3", keterangan: "Kacamata pelindung mata (Safety Goggles)" },
  { id: "K3-006", unitId: "TRK", nama: "SEPATU SAFETY", satuan: "PCS", stokAwal: 3, minStok: 2, kategori: "APD", lokasi: "Lemari K3", keterangan: "Sepatu pelindung berujung baja" }
];

// App State
let items = [];
let transactions = [];

// Helper functions for Units
function getUnit(unitId) {
  return UNITS.find(u => u.id === unitId) || UNITS[0];
}

function getUnitName(unitId) {
  if (unitId === 'ALL') return 'Seluruh Unit (Konsolidasi)';
  const u = UNITS.find(x => x.id === unitId);
  return u ? u.name : 'Perum LPPNPI Cabang Tarakan';
}

function getUnitShortName(unitId) {
  if (unitId === 'ALL') return 'Semua Unit';
  const u = UNITS.find(x => x.id === unitId);
  return u ? u.shortName : 'Tarakan';
}

function getUnitCity(unitId) {
  const u = UNITS.find(x => x.id === unitId);
  return u ? u.city : 'Tarakan';
}

// Switch Active Unit Handler
function handleUnitChange(newUnitId) {
  activeUnitId = newUnitId;
  localStorage.setItem(STORAGE_KEY_ACTIVE_UNIT, newUnitId);

  // Sync dropdown in header
  const sel = document.getElementById('select-active-unit');
  if (sel && sel.value !== newUnitId) sel.value = newUnitId;

  // Update brand badge in navbar
  const badge = document.getElementById('header-badge-branch');
  if (badge) {
    if (newUnitId === 'ALL') {
      badge.textContent = 'SELURUH UNIT KERJA';
    } else {
      const u = getUnit(newUnitId);
      badge.textContent = u.badge;
    }
  }

  // Update card titles
  const rekapTitle = document.getElementById('rekap-card-title');
  if (rekapTitle) {
    if (newUnitId === 'ALL') {
      rekapTitle.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>
        Daftar Rekapitulasi Stok Alat K3 - Seluruh Unit (Konsolidasi)
      `;
    } else {
      rekapTitle.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>
        Daftar Rekapitulasi Stok Alat K3 - ${escapeHtml(getUnitName(newUnitId))}
      `;
    }
  }

  // Sync modal new unit input default
  const modalUnit = document.getElementById('modal-new-unit');
  if (modalUnit) {
    modalUnit.value = (newUnitId !== 'ALL') ? newUnitId : 'TRK';
    handleModalUnitChange(modalUnit.value);
  }
  const inlineUnit = document.getElementById('inline-new-unit');
  if (inlineUnit) {
    inlineUnit.value = (newUnitId !== 'ALL') ? newUnitId : 'TRK';
  }

  renderAll();
  showToast(`Beralih ke: ${getUnitName(newUnitId)}`, 'info');
}

function handleModalUnitChange(unitVal) {
  const inLokasi = document.getElementById('modal-new-lokasi');
  if (inLokasi) {
    inLokasi.value = 'Lemari K3';
  }
}

// Initialize
function initApp() {
  loadData();
  setupEventListeners();

  // Apply stored active unit to UI
  const sel = document.getElementById('select-active-unit');
  if (sel) sel.value = activeUnitId;
  const badge = document.getElementById('header-badge-branch');
  if (badge) {
    if (activeUnitId === 'ALL') {
      badge.textContent = 'SELURUH UNIT KERJA';
    } else {
      badge.textContent = getUnit(activeUnitId).badge;
    }
  }

  renderAll();
  populateDropdowns();
  setTodayDateInputs();
}

// Load data from LocalStorage or initialize with defaults
function loadData() {
  const storedItems = localStorage.getItem(STORAGE_KEY_ITEMS);
  const storedTx = localStorage.getItem(STORAGE_KEY_TX);

  if (storedItems) {
    try {
      items = JSON.parse(storedItems);
      // Migrasi: pastikan setiap item memiliki unitId dan keterangan lokasi diseragamkan ke "Lemari K3"
      items.forEach(it => {
        if (!it.unitId) it.unitId = 'TRK';
        it.lokasi = 'Lemari K3';
      });
      saveItems();
    } catch (e) {
      console.error("Error parsing items from localStorage", e);
      items = JSON.parse(JSON.stringify(INITIAL_ITEMS));
    }
  } else {
    items = JSON.parse(JSON.stringify(INITIAL_ITEMS));
    saveItems();
  }

  if (storedTx) {
    try {
      transactions = JSON.parse(storedTx);
      transactions.forEach(t => {
        if (!t.unitId) {
          const matchedItem = items.find(i => i.id === t.barangId);
          t.unitId = matchedItem ? (matchedItem.unitId || 'TRK') : 'TRK';
        }
      });
      saveTransactions();
    } catch (e) {
      console.error("Error parsing transactions from localStorage", e);
      transactions = [];
    }
  } else {
    transactions = [];
    saveTransactions();
  }
}

// Save state to LocalStorage
function saveItems() {
  localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
}

// Compute live stock summary (filtered by unit or ALL)
function getEnrichedItems(unitFilter = activeUnitId) {
  let source = items;
  if (unitFilter && unitFilter !== 'ALL') {
    source = items.filter(i => (i.unitId || 'TRK') === unitFilter);
  }

  return source.map(item => {
    const itemTx = transactions.filter(t => t.barangId === item.id);
    const masuk = itemTx
      .filter(t => t.jenis === 'MASUK')
      .reduce((sum, t) => sum + Number(t.jumlah || 0), 0);
    const keluar = itemTx
      .filter(t => t.jenis === 'KELUAR')
      .reduce((sum, t) => sum + Number(t.jumlah || 0), 0);
    
    const stokAwal = Number(item.stokAwal || 0);
    const sisa = stokAwal + masuk - keluar;
    const minStok = Number(item.minStok || 2);

    let status = 'AMAN';
    if (sisa <= 0) {
      status = 'HABIS';
    } else if (sisa <= minStok) {
      status = 'MENIPIS';
    }

    return {
      ...item,
      unitId: item.unitId || 'TRK',
      stokAwal,
      masuk,
      keluar,
      sisa,
      status
    };
  });
}

// Format Date Helper
function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

// Set Default DateTime to Now in forms
function setTodayDateInputs() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
  
  const inMasuk = document.getElementById('masuk-tanggal');
  const inKeluar = document.getElementById('keluar-tanggal');
  if (inMasuk) inMasuk.value = localISOTime;
  if (inKeluar) inKeluar.value = localISOTime;
}

// Render All Components
function renderAll() {
  renderStats();
  renderMasterTable();
  renderTransactionTables();
  renderReportTable();
  populateDropdowns();
}

// Render Dashboard KPI Cards
function renderStats() {
  const enriched = getEnrichedItems();
  const totalJenis = enriched.length;
  const totalStokSisa = enriched.reduce((sum, i) => sum + i.sisa, 0);
  const totalMasuk = enriched.reduce((sum, i) => sum + i.masuk, 0);
  const totalKeluar = enriched.reduce((sum, i) => sum + i.keluar, 0);
  const totalKritis = enriched.filter(i => i.status !== 'AMAN').length;

  document.getElementById('stat-total-jenis').textContent = totalJenis;
  document.getElementById('stat-total-sisa').textContent = totalStokSisa + ' Unit';
  document.getElementById('stat-total-masuk').textContent = totalMasuk + ' Unit';
  document.getElementById('stat-total-keluar').textContent = totalKeluar + ' Unit';
  
  const badgeKritis = document.getElementById('stat-kritis-badge');
  if (badgeKritis) {
    if (totalKritis > 0) {
      badgeKritis.textContent = `${totalKritis} Alat Perlu Perhatian`;
      badgeKritis.style.display = 'inline-block';
    } else {
      badgeKritis.textContent = `Semua Stok Aman`;
      badgeKritis.style.display = 'inline-block';
    }
  }

  // Update badges on tabs
  const tabBadgeItems = document.getElementById('badge-tab-items');
  if (tabBadgeItems) tabBadgeItems.textContent = totalJenis;
  
  // Count transactions for active unit or all
  const filteredTx = (activeUnitId === 'ALL') 
    ? transactions 
    : transactions.filter(t => (t.unitId || 'TRK') === activeUnitId);
  const tabBadgeTx = document.getElementById('badge-tab-tx');
  if (tabBadgeTx) tabBadgeTx.textContent = filteredTx.length;
}

// Render Master Stock Table
function renderMasterTable() {
  const tbody = document.getElementById('master-table-body');
  if (!tbody) return;

  const searchQuery = (document.getElementById('search-master')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filter-status-master')?.value || 'ALL';

  let enriched = getEnrichedItems();

  // Filter
  if (searchQuery) {
    enriched = enriched.filter(i => 
      i.nama.toLowerCase().includes(searchQuery) || 
      i.id.toLowerCase().includes(searchQuery) ||
      (i.lokasi && i.lokasi.toLowerCase().includes(searchQuery)) ||
      (i.kategori && i.kategori.toLowerCase().includes(searchQuery)) ||
      (getUnitName(i.unitId).toLowerCase().includes(searchQuery))
    );
  }

  if (statusFilter !== 'ALL') {
    enriched = enriched.filter(i => i.status === statusFilter);
  }

  if (enriched.length === 0) {
    const isFiltered = searchQuery || statusFilter !== 'ALL';
    const unitName = getUnitName(activeUnitId);
    
    tbody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="empty-state" style="padding: 2.5rem 1rem;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <h3>${isFiltered ? 'Tidak Ada Alat K3 yang Sesuai' : `Belum Ada Data Alat K3 di ${escapeHtml(unitName)}`}</h3>
            <p>${isFiltered ? 'Silakan sesuaikan kata kunci pencarian atau filter status.' : `Inventaris alat K3 untuk <strong>${escapeHtml(unitName)}</strong> belum pernah diinput.<br>Silakan klik tombol di bawah untuk mulai menambahkan alat K3 unit ini.`}</p>
            ${!isFiltered ? `
              <button class="btn btn-primary" onclick="openModal('modal-add-item')" style="margin-top: 1rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                + Tambah Alat Baru (${escapeHtml(getUnitShortName(activeUnitId))})
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = enriched.map((item, idx) => {
    let statusBadge = '';
    let stockClass = '';
    if (item.status === 'AMAN') {
      statusBadge = '<span class="badge badge-safe">● Aman</span>';
      stockClass = 'safe';
    } else if (item.status === 'MENIPIS') {
      statusBadge = '<span class="badge badge-warning">▲ Menipis</span>';
      stockClass = 'warning';
    } else {
      statusBadge = '<span class="badge badge-empty">✕ Habis</span>';
      stockClass = 'empty';
    }

    const unitBadgeHtml = (activeUnitId === 'ALL') 
      ? `<span class="badge-unit" style="margin-left: 0.35rem;">${escapeHtml(getUnitShortName(item.unitId))}</span>` 
      : '';

    return `
      <tr>
        <td style="text-align: center; color: var(--text-muted);">${idx + 1}</td>
        <td><span class="badge-code">${item.id}</span></td>
        <td>
          <div style="font-weight: 700; color: var(--primary); font-size: 0.95rem; display: flex; align-items: center; gap: 0.3rem;">
            ${escapeHtml(item.nama)} ${unitBadgeHtml}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(item.lokasi || 'Lemari K3')}</div>
        </td>
        <td style="text-align: center;"><span class="badge-code">${escapeHtml(item.satuan || 'PCS')}</span></td>
        <td style="text-align: center; font-weight: 600;">${item.stokAwal}</td>
        <td style="text-align: center; color: var(--success); font-weight: 700;">+${item.masuk}</td>
        <td style="text-align: center; color: var(--danger); font-weight: 700;">-${item.keluar}</td>
        <td style="text-align: center;">
          <span class="stock-pill ${stockClass}">${item.sisa}</span>
        </td>
        <td style="text-align: center;">${statusBadge}</td>
        <td style="text-align: center; white-space: nowrap;">
          <button class="btn btn-sm btn-outline" style="color: var(--danger); border-color: #fca5a5;" onclick="confirmDeleteItem('${item.id}')" title="Hapus Alat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Hapus
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Populate Select Dropdowns in In/Out forms
function populateDropdowns() {
  const enriched = getEnrichedItems();
  
  const selectMasuk = document.getElementById('masuk-barang-id');
  const selectKeluar = document.getElementById('keluar-barang-id');
  const filterTxBarang = document.getElementById('filter-tx-barang');

  let optionsHtml = '';
  if (activeUnitId === 'ALL') {
    // Group options by unit
    optionsHtml = UNITS.map(u => {
      const uItems = enriched.filter(i => (i.unitId || 'TRK') === u.id);
      if (uItems.length === 0) return '';
      return `
        <optgroup label="${escapeHtml(u.name)}">
          ${uItems.map(i => `<option value="${i.id}">${escapeHtml(i.nama)} (Sisa: ${i.sisa} ${i.satuan})</option>`).join('')}
        </optgroup>
      `;
    }).join('');
  } else {
    optionsHtml = enriched.map(i => 
      `<option value="${i.id}">${escapeHtml(i.nama)} (Sisa: ${i.sisa} ${i.satuan})</option>`
    ).join('');
  }

  if (selectMasuk) {
    selectMasuk.innerHTML = `
      <option value="">-- Pilih Alat K3 yang Masuk --</option>
      <option value="__NEW__" style="color: #0284c7; font-weight: bold;">➕ [ALAT BARU BELUM TERDAFTAR...]</option>
      ${optionsHtml}
    `;
  }

  if (selectKeluar) {
    selectKeluar.innerHTML = `
      <option value="">-- Pilih Alat K3 yang Dikeluarkan --</option>
      ${optionsHtml}
    `;
  }

  if (filterTxBarang) {
    filterTxBarang.innerHTML = `
      <option value="ALL">Semua Alat K3</option>
      ${enriched.map(i => `<option value="${i.id}">${escapeHtml(i.nama)}${activeUnitId === 'ALL' ? ` [${getUnitShortName(i.unitId)}]` : ''}</option>`).join('')}
    `;
  }
}

// Update current stock notice when item is chosen in Keluar/Masuk form
function updateStockNotice(formType) {
  const enriched = getEnrichedItems();
  if (formType === 'keluar') {
    const barangId = document.getElementById('keluar-barang-id').value;
    const box = document.getElementById('keluar-stock-notice');
    if (!barangId) {
      box.style.display = 'none';
      return;
    }
    const item = enriched.find(i => i.id === barangId);
    if (item) {
      box.style.display = 'flex';
      box.innerHTML = `
        <span>Sisa Unit Tersedia di Lemari K3: <strong>${item.sisa} ${escapeHtml(item.satuan)}</strong> (Stok Awal: ${item.stokAwal}, Total Masuk: +${item.masuk}, Total Keluar: -${item.keluar})</span>
        <span class="badge ${item.sisa > item.minStok ? 'badge-safe' : (item.sisa > 0 ? 'badge-warning' : 'badge-empty')}">${item.status}</span>
      `;
      // Max attribute for quantity
      const qtyInput = document.getElementById('keluar-jumlah');
      if (qtyInput) {
        qtyInput.max = item.sisa;
      }
    }
  } else if (formType === 'masuk') {
    const barangId = document.getElementById('masuk-barang-id').value;
    const box = document.getElementById('masuk-stock-notice');
    const newBarangSection = document.getElementById('section-new-barang-inline');

    if (barangId === '__NEW__') {
      if (box) box.style.display = 'none';
      if (newBarangSection) newBarangSection.style.display = 'block';
      return;
    } else {
      if (newBarangSection) newBarangSection.style.display = 'none';
    }

    if (!barangId) {
      if (box) box.style.display = 'none';
      return;
    }

    const item = enriched.find(i => i.id === barangId);
    if (item && box) {
      box.style.display = 'flex';
      box.innerHTML = `
        <span>Stok Saat Ini: <strong>${item.sisa} ${escapeHtml(item.satuan)}</strong> | Keberadaan: ${escapeHtml(item.lokasi || 'Lemari K3')}</span>
        <span class="badge badge-masuk">Penerimaan Barang</span>
      `;
    }
  }
}

// Render Transaction History Tables
function renderTransactionTables() {
  const tbodyAll = document.getElementById('tx-all-table-body');
  const tbodyMasukRecent = document.getElementById('tx-masuk-recent-body');
  const tbodyKeluarRecent = document.getElementById('tx-keluar-recent-body');

  const filterJenis = document.getElementById('filter-tx-jenis')?.value || 'ALL';
  const filterBarang = document.getElementById('filter-tx-barang')?.value || 'ALL';
  const searchTx = (document.getElementById('search-tx')?.value || '').toLowerCase().trim();

  // Filter transactions by activeUnitId
  let filteredTx = [...transactions];
  if (activeUnitId !== 'ALL') {
    filteredTx = filteredTx.filter(t => (t.unitId || 'TRK') === activeUnitId);
  }

  // Sort descending by date
  filteredTx.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  // Render recent 5 on Masuk page
  if (tbodyMasukRecent) {
    const recentMasuk = filteredTx.filter(t => t.jenis === 'MASUK').slice(0, 5);
    if (recentMasuk.length === 0) {
      tbodyMasukRecent.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">Belum ada riwayat barang masuk (${escapeHtml(getUnitShortName(activeUnitId))})</td></tr>`;
    } else {
      tbodyMasukRecent.innerHTML = recentMasuk.map((t, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge-code">${formatDate(t.tanggal)}</span></td>
          <td style="font-weight:700;">${escapeHtml(t.namaBarang)}</td>
          <td style="color: var(--success); font-weight:700;">+${t.jumlah} ${escapeHtml(t.satuan)}</td>
          <td>${escapeHtml(t.petugas || '-')}</td>
          <td>${escapeHtml(t.keterangan || '-')}</td>
        </tr>
      `).join('');
    }
  }

  // Render recent 5 on Keluar page
  if (tbodyKeluarRecent) {
    const recentKeluar = filteredTx.filter(t => t.jenis === 'KELUAR').slice(0, 5);
    if (recentKeluar.length === 0) {
      tbodyKeluarRecent.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">Belum ada riwayat barang keluar (${escapeHtml(getUnitShortName(activeUnitId))})</td></tr>`;
    } else {
      tbodyKeluarRecent.innerHTML = recentKeluar.map((t, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge-code">${formatDate(t.tanggal)}</span></td>
          <td style="font-weight:700;">${escapeHtml(t.namaBarang)}</td>
          <td style="color: var(--danger); font-weight:700;">-${t.jumlah} ${escapeHtml(t.satuan)}</td>
          <td>${escapeHtml(t.petugas || '-')} (${escapeHtml(t.keperluan || '-')})</td>
          <td>${escapeHtml(t.keterangan || '-')}</td>
        </tr>
      `).join('');
    }
  }

  // Render All Transactions Tab
  if (tbodyAll) {
    let list = filteredTx;
    if (filterJenis !== 'ALL') {
      list = list.filter(t => t.jenis === filterJenis);
    }
    if (filterBarang !== 'ALL') {
      list = list.filter(t => t.barangId === filterBarang);
    }
    if (searchTx) {
      list = list.filter(t => 
        (t.namaBarang && t.namaBarang.toLowerCase().includes(searchTx)) ||
        (t.petugas && t.petugas.toLowerCase().includes(searchTx)) ||
        (t.keperluan && t.keperluan.toLowerCase().includes(searchTx)) ||
        (t.keterangan && t.keterangan.toLowerCase().includes(searchTx)) ||
        (getUnitName(t.unitId).toLowerCase().includes(searchTx))
      );
    }

    if (list.length === 0) {
      tbodyAll.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h3>Belum Ada Riwayat Mutasi</h3>
              <p>Transaksi barang masuk atau keluar untuk <strong>${escapeHtml(getUnitName(activeUnitId))}</strong> akan otomatis tercatat di sini.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbodyAll.innerHTML = list.map((t, idx) => {
      const isMasuk = t.jenis === 'MASUK';
      const badge = isMasuk 
        ? '<span class="badge badge-masuk">↓ Masuk</span>'
        : '<span class="badge badge-keluar">↑ Keluar</span>';
      const qtyClass = isMasuk ? 'style="color: var(--success); font-weight: 800;"' : 'style="color: var(--danger); font-weight: 800;"';
      const qtyPrefix = isMasuk ? '+' : '-';

      const unitBadgeHtml = (activeUnitId === 'ALL')
        ? `<span class="badge-unit" style="margin-left: 0.35rem;">${escapeHtml(getUnitShortName(t.unitId))}</span>`
        : '';

      return `
        <tr>
          <td style="text-align: center; color: var(--text-muted);">${idx + 1}</td>
          <td><span class="badge-code">${formatDate(t.tanggal)}</span></td>
          <td style="text-align: center;">${badge}</td>
          <td style="font-weight: 700; color: var(--primary);">
            ${escapeHtml(t.namaBarang)} ${unitBadgeHtml}
          </td>
          <td style="text-align: center;" ${qtyClass}>${qtyPrefix}${t.jumlah} ${escapeHtml(t.satuan)}</td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(t.petugas || '-')}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(t.keperluan || 'Operasional K3')}</div>
          </td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(t.keterangan || '-')}</td>
          <td style="text-align: center;">
            <button class="btn btn-sm btn-outline" style="color: var(--danger); border-color: #fca5a5;" onclick="confirmDeleteTx('${t.id}')" title="Hapus Riwayat">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// Render Report Preview Table
function renderReportTable() {
  const tbody = document.getElementById('report-table-body');
  if (!tbody) return;

  const enriched = getEnrichedItems();
  const printDateSpan = document.getElementById('print-date-display');
  const cityName = (activeUnitId === 'ALL') ? 'Tarakan' : getUnitCity(activeUnitId);
  if (printDateSpan) {
    const now = new Date();
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    printDateSpan.textContent = `${cityName}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  // Update subtitles on report
  const printUnitTitle = document.getElementById('print-unit-title');
  if (printUnitTitle) {
    printUnitTitle.textContent = (activeUnitId === 'ALL') 
      ? 'KONSOLIDASI SELURUH UNIT KERJA' 
      : getUnitName(activeUnitId).toUpperCase();
  }

  const reportUnitSubtitle = document.getElementById('report-unit-subtitle');
  if (reportUnitSubtitle) {
    reportUnitSubtitle.textContent = (activeUnitId === 'ALL')
      ? 'PERUM LPPNPI - KONSOLIDASI SELURUH UNIT KERJA'
      : getUnitName(activeUnitId).toUpperCase();
  }

  const reportCardSubtitle = document.getElementById('report-card-subtitle');
  if (reportCardSubtitle) {
    reportCardSubtitle.textContent = `Format siap cetak resmi untuk pelaporan manajemen ${getUnitName(activeUnitId)}.`;
  }

  const signPetugasUnit = document.getElementById('sign-petugas-unit');
  if (signPetugasUnit) {
    signPetugasUnit.textContent = (activeUnitId === 'ALL') ? 'Perum LPPNPI Cabang Tarakan' : getUnitName(activeUnitId);
  }

  const signPetugasTitle = document.getElementById('sign-petugas-title');
  if (signPetugasTitle) {
    signPetugasTitle.textContent = (activeUnitId === 'ALL') 
      ? 'Petugas Pengelola K3 Cabang Tarakan' 
      : `Petugas Pengelola K3 ${getUnitShortName(activeUnitId)}`;
  }

  if (enriched.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada data inventaris alat K3 untuk dicetak (${escapeHtml(getUnitName(activeUnitId))})</td></tr>`;
    return;
  }

  tbody.innerHTML = enriched.map((item, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="text-align: center; font-family: monospace;">${item.id}</td>
      <td style="font-weight: bold;">
        ${escapeHtml(item.nama)}
        ${activeUnitId === 'ALL' ? `<span style="font-size:0.75rem; color:#0369a1; font-weight:normal;"> (${escapeHtml(getUnitShortName(item.unitId))})</span>` : ''}
      </td>
      <td style="text-align: center;">${escapeHtml(item.satuan)}</td>
      <td style="text-align: center;">${item.stokAwal}</td>
      <td style="text-align: center;">${item.masuk}</td>
      <td style="text-align: center;">${item.keluar}</td>
      <td style="text-align: center; font-weight: bold; font-size: 1.05em;">${item.sisa}</td>
      <td style="text-align: center;">${item.status}</td>
      <td>${escapeHtml(item.lokasi || 'Lemari K3')}</td>
    </tr>
  `).join('');
}

// =================== ACTIONS & EVENTS ===================

// Handle Tambah Alat Baru (Modal or Direct)
function handleAddNewItem(formData, isInline = false) {
  const targetUnit = formData.unitId || (activeUnitId !== 'ALL' ? activeUnitId : 'TRK');
  const rawNama = formData.nama ? formData.nama.trim().toUpperCase() : '';
  const satuan = formData.satuan ? formData.satuan.trim().toUpperCase() : 'PCS';
  const stokAwal = Math.max(0, parseInt(formData.stokAwal, 10) || 0);
  const minStok = Math.max(1, parseInt(formData.minStok, 10) || 2);
  const kategori = formData.kategori ? formData.kategori.trim() : 'Alat K3';
  const lokasi = formData.lokasi ? formData.lokasi.trim() : 'Lemari K3';
  const keterangan = formData.keterangan ? formData.keterangan.trim() : '';

  if (!rawNama) {
    showToast('Nama alat K3 wajib diisi!', 'danger');
    return null;
  }

  // Check if exists in the same unit
  const existing = items.find(i => 
    i.nama.toLowerCase() === rawNama.toLowerCase() && 
    (i.unitId || 'TRK') === targetUnit
  );
  if (existing) {
    showToast(`Alat "${rawNama}" sudah ada di ${getUnitName(targetUnit)} dengan Kode ${existing.id}!`, 'warning');
    return isInline ? existing : null;
  }

  // Generate ID with unit prefix
  const unitObj = getUnit(targetUnit);
  const prefix = `K3-${unitObj.prefix}-`;
  let maxNum = 0;
  items.forEach(i => {
    if (i.id && i.id.startsWith(prefix)) {
      const num = parseInt(i.id.replace(prefix, ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    } else if (targetUnit === 'TRK') {
      const match = i.id && i.id.match(/^K3-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  const newId = `${prefix}${String(maxNum + 1).padStart(3, '0')}`;

  const newItem = {
    id: newId,
    unitId: targetUnit,
    nama: rawNama,
    satuan: satuan,
    stokAwal: stokAwal,
    minStok: minStok,
    kategori: kategori,
    lokasi: lokasi,
    keterangan: keterangan,
    createdAt: new Date().toISOString()
  };

  items.push(newItem);
  saveItems();

  // If item was added for a unit different from current active (and not ALL), switch to that unit
  if (activeUnitId !== 'ALL' && activeUnitId !== targetUnit) {
    handleUnitChange(targetUnit);
  } else {
    renderAll();
  }

  showToast(`Berhasil menambahkan alat K3: ${rawNama} (${newId}) untuk ${getUnitShortName(targetUnit)}`, 'success');
  return newItem;
}

// Handle Form Submit: Barang Masuk
function handleSubmitBarangMasuk(e) {
  e.preventDefault();
  let barangId = document.getElementById('masuk-barang-id').value;
  const tanggal = document.getElementById('masuk-tanggal').value || new Date().toISOString();
  const jumlah = parseInt(document.getElementById('masuk-jumlah').value, 10);
  const petugas = document.getElementById('masuk-pengirim').value.trim() || 'Logistik LPPNPI';
  const keterangan = document.getElementById('masuk-keterangan').value.trim();

  if (!barangId) {
    showToast('Pilih alat K3 terlebih dahulu!', 'danger');
    return;
  }

  if (isNaN(jumlah) || jumlah <= 0) {
    showToast('Jumlah barang masuk harus lebih dari 0!', 'danger');
    return;
  }

  // If user selected "__NEW__" to input new item on the fly
  if (barangId === '__NEW__') {
    const inlineUnit = document.getElementById('inline-new-unit')?.value || (activeUnitId !== 'ALL' ? activeUnitId : 'TRK');
    const inlineNama = document.getElementById('inline-new-nama').value.trim().toUpperCase();
    const inlineSatuan = document.getElementById('inline-new-satuan').value.trim().toUpperCase() || 'PCS';
    const inlineKategori = document.getElementById('inline-new-kategori').value.trim() || 'Alat K3 Baru';
    
    if (!inlineNama) {
      showToast('Harap masukkan Nama Alat K3 Baru!', 'danger');
      return;
    }

    const newItem = handleAddNewItem({
      unitId: inlineUnit,
      nama: inlineNama,
      satuan: inlineSatuan,
      stokAwal: 0, // Recorded via the incoming transaction
      kategori: inlineKategori,
      keterangan: 'Ditambahkan langsung saat barang masuk'
    }, true);

    if (!newItem) return;
    barangId = newItem.id;
  }

  const targetItem = items.find(i => i.id === barangId);
  if (!targetItem) {
    showToast('Alat K3 tidak ditemukan!', 'danger');
    return;
  }

  const newTx = {
    id: 'TX-IN-' + Date.now(),
    tanggal: tanggal,
    jenis: 'MASUK',
    unitId: targetItem.unitId || 'TRK',
    barangId: targetItem.id,
    namaBarang: targetItem.nama,
    satuan: targetItem.satuan,
    jumlah: jumlah,
    petugas: petugas,
    keperluan: 'Penerimaan / Pengadaan Barang',
    keterangan: keterangan
  };

  transactions.push(newTx);
  saveTransactions();
  renderAll();
  
  // Reset Form
  document.getElementById('form-barang-masuk').reset();
  setTodayDateInputs();
  document.getElementById('masuk-stock-notice').style.display = 'none';
  const inlineSec = document.getElementById('section-new-barang-inline');
  if (inlineSec) inlineSec.style.display = 'none';

  showToast(`Sukses mencatat ${jumlah} ${targetItem.satuan} ${targetItem.nama} masuk (${getUnitShortName(targetItem.unitId)})!`, 'success');
}

// Handle Form Submit: Barang Keluar
function handleSubmitBarangKeluar(e) {
  e.preventDefault();
  const barangId = document.getElementById('keluar-barang-id').value;
  const tanggal = document.getElementById('keluar-tanggal').value || new Date().toISOString();
  const jumlah = parseInt(document.getElementById('keluar-jumlah').value, 10);
  const penerima = document.getElementById('keluar-penerima').value.trim();
  const keperluan = document.getElementById('keluar-keperluan').value.trim() || 'Operasional Lapangan';
  const keterangan = document.getElementById('keluar-keterangan').value.trim();

  if (!barangId) {
    showToast('Pilih alat K3 yang dikeluarkan!', 'danger');
    return;
  }

  if (isNaN(jumlah) || jumlah <= 0) {
    showToast('Jumlah barang keluar harus lebih dari 0!', 'danger');
    return;
  }

  if (!penerima) {
    showToast('Nama petugas / unit penerima wajib diisi!', 'danger');
    return;
  }

  const enrichedAll = getEnrichedItems('ALL');
  const targetItem = enrichedAll.find(i => i.id === barangId);

  if (!targetItem) {
    showToast('Alat K3 tidak ditemukan!', 'danger');
    return;
  }

  // Stock check validation
  if (jumlah > targetItem.sisa) {
    showToast(`Stok tidak mencukupi! Sisa saat ini hanya ${targetItem.sisa} ${targetItem.satuan}. Pengeluaran ${jumlah} ${targetItem.satuan} ditolak.`, 'danger');
    return;
  }

  const newTx = {
    id: 'TX-OUT-' + Date.now(),
    tanggal: tanggal,
    jenis: 'KELUAR',
    unitId: targetItem.unitId || 'TRK',
    barangId: targetItem.id,
    namaBarang: targetItem.nama,
    satuan: targetItem.satuan,
    jumlah: jumlah,
    petugas: penerima,
    keperluan: keperluan,
    keterangan: keterangan
  };

  transactions.push(newTx);
  saveTransactions();
  renderAll();

  // Reset Form
  document.getElementById('form-barang-keluar').reset();
  setTodayDateInputs();
  document.getElementById('keluar-stock-notice').style.display = 'none';

  showToast(`Sukses mencatat pengeluaran ${jumlah} ${targetItem.satuan} ${targetItem.nama} untuk ${penerima}!`, 'success');
}

// Delete item
function confirmDeleteItem(itemId) {
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  const countTx = transactions.filter(t => t.barangId === itemId).length;
  let confirmMsg = `Yakin ingin menghapus alat K3 "${item.nama}" (${item.id}) milik ${getUnitName(item.unitId)}?`;
  if (countTx > 0) {
    confirmMsg += `\n\nPerhatian: Ada ${countTx} riwayat mutasi terkait alat ini yang juga akan dihapus.`;
  }

  if (confirm(confirmMsg)) {
    items = items.filter(i => i.id !== itemId);
    transactions = transactions.filter(t => t.barangId !== itemId);
    saveItems();
    saveTransactions();
    renderAll();
    showToast(`Alat "${item.nama}" berhasil dihapus.`, 'warning');
  }
}

// Delete transaction
function confirmDeleteTx(txId) {
  const tx = transactions.find(t => t.id === txId);
  if (!tx) return;

  if (confirm(`Hapus catatan transaksi ${tx.jenis} sebanyak ${tx.jumlah} ${tx.satuan} ${tx.namaBarang}? Stok sisa akan otomatis dihitung ulang.`)) {
    transactions = transactions.filter(t => t.id !== txId);
    saveTransactions();
    renderAll();
    showToast('Transaksi berhasil dihapus dan stok diperbarui.', 'success');
  }
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });
  // Refresh dates if switching to in/out
  if (tabId === 'tab-masuk' || tabId === 'tab-keluar') {
    setTodayDateInputs();
  }
}

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  if (modalId === 'modal-add-item') {
    const modalUnit = document.getElementById('modal-new-unit');
    if (modalUnit) {
      modalUnit.value = (activeUnitId !== 'ALL') ? activeUnitId : 'TRK';
      handleModalUnitChange(modalUnit.value);
    }
  }

  modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
  } else if (type === 'danger') {
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  } else {
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
  }

  toast.innerHTML = `
    <div>${iconSvg}</div>
    <div style="flex:1;">${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Export to CSV Helper
function exportStockToCSV() {
  const enriched = getEnrichedItems();
  const headers = ["No", "Kantor / Unit", "Kode Barang", "Nama Alat K3", "Satuan", "Stok Awal", "Total Masuk", "Total Keluar", "Sisa Stok", "Status", "Lokasi", "Keterangan"];
  
  const rows = enriched.map((i, idx) => [
    idx + 1,
    `"${getUnitName(i.unitId)}"`,
    `"${i.id}"`,
    `"${i.nama}"`,
    `"${i.satuan}"`,
    i.stokAwal,
    i.masuk,
    i.keluar,
    i.sisa,
    `"${i.status}"`,
    `"${i.lokasi || ''}"`,
    `"${(i.keterangan || '').replace(/"/g, '""')}"`
  ]);

  let csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.map(e => e.join(";")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const unitTag = (activeUnitId === 'ALL') ? 'Semua_Unit' : getUnitShortName(activeUnitId).replace(/\s+/g, '_');
  a.download = `Rekap_Alat_K3_LPPNPI_${unitTag}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('File CSV Rekap Stok berhasil diunduh!', 'success');
}

function exportTransactionsToCSV() {
  let list = [...transactions];
  if (activeUnitId !== 'ALL') {
    list = list.filter(t => (t.unitId || 'TRK') === activeUnitId);
  }

  if (list.length === 0) {
    showToast('Belum ada transaksi untuk diekspor!', 'warning');
    return;
  }
  const headers = ["No", "Kantor / Unit", "ID Transaksi", "Tanggal", "Jenis", "Kode Alat", "Nama Alat K3", "Jumlah", "Satuan", "Petugas / Penerima", "Keperluan", "Keterangan"];
  
  const sortedTx = list.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  const rows = sortedTx.map((t, idx) => [
    idx + 1,
    `"${getUnitName(t.unitId)}"`,
    `"${t.id}"`,
    `"${formatDate(t.tanggal)}"`,
    `"${t.jenis}"`,
    `"${t.barangId}"`,
    `"${t.namaBarang}"`,
    t.jumlah,
    `"${t.satuan}"`,
    `"${(t.petugas || '').replace(/"/g, '""')}"`,
    `"${(t.keperluan || '').replace(/"/g, '""')}"`,
    `"${(t.keterangan || '').replace(/"/g, '""')}"`
  ]);

  let csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.map(e => e.join(";")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const unitTag = (activeUnitId === 'ALL') ? 'Semua_Unit' : getUnitShortName(activeUnitId).replace(/\s+/g, '_');
  a.download = `Riwayat_Mutasi_K3_LPPNPI_${unitTag}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('File CSV Mutasi Transaksi berhasil diunduh!', 'success');
}

// Backup JSON (Consolidated all units)
function backupData() {
  const data = {
    exportedAt: new Date().toISOString(),
    branch: "Perum LPPNPI Cabang Tarakan & Unit Kerja Bawahan",
    units: UNITS,
    items: items,
    transactions: transactions
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Backup_K3_LPPNPI_Tarakan_MultiUnit_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Cadangan database JSON seluruh unit berhasil disimpan!', 'success');
}

// Restore JSON
function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Format file cadangan tidak sesuai.');
      }
      if (confirm('Apakah Anda yakin ingin memulihkan data dari cadangan ini? Data yang ada saat ini akan digantikan.')) {
        items = data.items;
        // Pastikan unitId ada di setiap item
        items.forEach(it => {
          if (!it.unitId) it.unitId = 'TRK';
        });
        transactions = Array.isArray(data.transactions) ? data.transactions : [];
        transactions.forEach(t => {
          if (!t.unitId) {
            const matchedItem = items.find(i => i.id === t.barangId);
            t.unitId = matchedItem ? (matchedItem.unitId || 'TRK') : 'TRK';
          }
        });
        saveItems();
        saveTransactions();
        renderAll();
        showToast('Data inventaris K3 berhasil dipulihkan!', 'success');
      }
    } catch (err) {
      alert('Gagal membaca file cadangan: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // Reset input
}

// Reset to Default Initial Data
function resetToDefault() {
  if (confirm('PERINGATAN: Apakah Anda yakin ingin mereset seluruh data kembali ke daftar 6 alat K3 awal Perum LPPNPI Cabang Tarakan? Seluruh data alat unit lain dan riwayat mutasi akan dibersihkan.')) {
    items = JSON.parse(JSON.stringify(INITIAL_ITEMS));
    transactions = [];
    activeUnitId = 'TRK';
    localStorage.setItem(STORAGE_KEY_ACTIVE_UNIT, 'TRK');
    saveItems();
    saveTransactions();
    
    const sel = document.getElementById('select-active-unit');
    if (sel) sel.value = 'TRK';
    const badge = document.getElementById('header-badge-branch');
    if (badge) badge.textContent = getUnit('TRK').badge;

    renderAll();
    showToast('Sistem telah direset ke data awal Tarakan.', 'info');
  }
}

// Utility: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Event Listeners setup
function setupEventListeners() {
  // Navigation tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Search & Filter
  const searchMaster = document.getElementById('search-master');
  if (searchMaster) searchMaster.addEventListener('input', renderMasterTable);
  const filterMaster = document.getElementById('filter-status-master');
  if (filterMaster) filterMaster.addEventListener('change', renderMasterTable);

  const searchTx = document.getElementById('search-tx');
  if (searchTx) searchTx.addEventListener('input', renderTransactionTables);
  const filterJenis = document.getElementById('filter-tx-jenis');
  if (filterJenis) filterJenis.addEventListener('change', renderTransactionTables);
  const filterBarang = document.getElementById('filter-tx-barang');
  if (filterBarang) filterBarang.addEventListener('change', renderTransactionTables);

  // Forms
  const formMasuk = document.getElementById('form-barang-masuk');
  if (formMasuk) formMasuk.addEventListener('submit', handleSubmitBarangMasuk);
  const formKeluar = document.getElementById('form-barang-keluar');
  if (formKeluar) formKeluar.addEventListener('submit', handleSubmitBarangKeluar);

  // Modal Tambah Item Baru
  const formNewItemModal = document.getElementById('form-new-item-modal');
  if (formNewItemModal) {
    formNewItemModal.addEventListener('submit', (e) => {
      e.preventDefault();
      const unitId = document.getElementById('modal-new-unit')?.value || 'TRK';
      const nama = document.getElementById('modal-new-nama').value;
      const satuan = document.getElementById('modal-new-satuan').value;
      const stokAwal = document.getElementById('modal-new-stokawal').value;
      const minStok = document.getElementById('modal-new-minstok').value;
      const kategori = document.getElementById('modal-new-kategori').value;
      const lokasi = document.getElementById('modal-new-lokasi').value;
      const keterangan = document.getElementById('modal-new-keterangan').value;

      const res = handleAddNewItem({ unitId, nama, satuan, stokAwal, minStok, kategori, lokasi, keterangan });
      if (res) {
        formNewItemModal.reset();
        closeModal('modal-add-item');
      }
    });
  }



  // Stock Notice Listeners
  const selectMasuk = document.getElementById('masuk-barang-id');
  if (selectMasuk) selectMasuk.addEventListener('change', () => updateStockNotice('masuk'));
  const selectKeluar = document.getElementById('keluar-barang-id');
  if (selectKeluar) selectKeluar.addEventListener('change', () => updateStockNotice('keluar'));

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
}

// Run on page load
document.addEventListener('DOMContentLoaded', initApp);
