/**
 * Sistem Informasi KKS Terpadu AIRNAV — inti aplikasi
 * (koneksi Supabase, login, peran & hak akses, lokasi aktif, router, utilitas UI)
 */
window.KKS = (() => {
  const cfg = window.APP_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL) {
    document.body.innerHTML = '<p style="padding:2rem;font-family:sans-serif">Library Supabase gagal dimuat atau konfigurasi belum diisi. Periksa koneksi internet lalu muat ulang.</p>';
    throw new Error('Supabase tidak tersedia');
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  const ROLE_LABEL = {
    superadmin: 'Super Admin', admin_kks: 'Admin KKS / MKKS', petugas_k3: 'Petugas K3', avsec: 'Petugas Avsec',
    inspektur_kampen: 'Inspektur Keamanan Internal', teknik: 'Unit Teknik', operasi: 'Unit Operasi',
    kepala_unit: 'Kepala Capem / Kepala Unit', pimpinan: 'GM & Manager'
  };

  const state = {
    user: null, profile: null, roles: [], perms: [], units: [], unit: null,
    modules: {}, groups: [], route: null, settings: {}
  };

  // ---------------- Utilitas ----------------
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const pad = (n) => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const thisPeriod = () => today().slice(0, 7);
  function fmtDate(v, withTime) {
    if (!v) return '';
    const d = new Date(String(v).length === 10 ? v + 'T00:00:00' : v);
    if (isNaN(d)) return String(v);
    const s = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
    return withTime ? `${s} ${pad(d.getHours())}:${pad(d.getMinutes())}` : s;
  }
  function fmtDateLong(v) {
    const d = v ? new Date(String(v).length === 10 ? v + 'T00:00:00' : v) : new Date();
    return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }
  const fmtNum = (v, dec = 0) => (v === null || v === undefined || v === '' || isNaN(v)) ? '' :
    Number(v).toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const fmtRp = (v) => (v === null || v === undefined || v === '') ? '' : 'Rp' + fmtNum(v);
  const periodLabel = (p) => { if (!p) return ''; const [y, m] = p.split('-'); return `${BULAN[+m - 1]} ${y}`; };
  const addMonths = (date, n) => { const d = new Date(date + 'T00:00:00'); d.setMonth(d.getMonth() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const daysUntil = (date) => date ? Math.round((new Date(date + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000) : null;
  const quarterOf = (date) => Math.floor((new Date(date).getMonth()) / 3) + 1;
  const weekOfMonth = (date) => Math.min(4, Math.floor((new Date(String(date).slice(0, 10) + 'T00:00:00').getDate() - 1) / 7) + 1);

  // ---------------- Toast / modal ----------------
  function toast(msg, type = 'info') {
    let box = $('#toast-box');
    if (!box) { box = h('div', { id: 'toast-box' }); document.body.append(box); }
    const t = h('div', { class: `toast toast-${type}` }, msg);
    box.append(t);
    setTimeout(() => t.classList.add('hide'), 3800);
    setTimeout(() => t.remove(), 4300);
  }
  function modal({ title, body, footer, wide, onClose }) {
    const overlay = h('div', { class: 'k-modal-overlay' });
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const box = h('div', { class: 'k-modal' + (wide ? ' wide' : '') },
      h('div', { class: 'k-modal-head' }, h('h3', {}, title), h('button', { class: 'k-icon-btn', type: 'button', title: 'Tutup', onclick: close }, '✕')),
      h('div', { class: 'k-modal-body' }, body),
      footer ? h('div', { class: 'k-modal-foot' }, footer) : null);
    overlay.append(box);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    document.body.append(overlay);
    return { close, box, overlay };
  }
  function confirmBox(message, okLabel = 'Ya, lanjutkan', danger = true) {
    return new Promise((resolve) => {
      let done = false;
      const m = modal({
        title: 'Konfirmasi', body: h('p', {}, message),
        footer: [
          h('button', { class: 'k-btn', type: 'button', onclick: () => { done = true; m.close(); resolve(false); } }, 'Batal'),
          h('button', { class: 'k-btn ' + (danger ? 'k-btn-danger' : 'k-btn-primary'), type: 'button', onclick: () => { done = true; m.close(); resolve(true); } }, okLabel)
        ],
        onClose: () => { if (!done) resolve(false); }
      });
    });
  }
  function promptBox(title, label, value = '') {
    return new Promise((resolve) => {
      const inp = h('textarea', { class: 'k-input', rows: 3 }, value);
      let done = false;
      const m = modal({
        title, body: h('label', { class: 'k-field' }, h('span', {}, label), inp),
        footer: [
          h('button', { class: 'k-btn', type: 'button', onclick: () => { done = true; m.close(); resolve(null); } }, 'Batal'),
          h('button', { class: 'k-btn k-btn-primary', type: 'button', onclick: () => { done = true; m.close(); resolve(inp.value.trim()); } }, 'Simpan')
        ],
        onClose: () => { if (!done) resolve(null); }
      });
      setTimeout(() => inp.focus(), 50);
    });
  }

  function friendly(error) {
    const msg = (error && (error.message || error.error_description)) || String(error);
    if (/row-level security|permission denied|42501/i.test(msg)) return 'Akses ditolak: peran Anda tidak berhak untuk data/lokasi ini.';
    if (/duplicate key|23505/i.test(msg)) return 'Data duplikat: data yang sama sudah ada.';
    if (/violates foreign key|23503/i.test(msg)) return 'Data masih dipakai data lain atau rujukan tidak valid.';
    if (/violates check constraint|23514/i.test(msg)) return 'Isian tidak sesuai ketentuan (cek nilai yang dimasukkan).';
    if (/Failed to fetch|NetworkError/i.test(msg)) return 'Tidak dapat terhubung ke server. Periksa koneksi internet.';
    return msg;
  }
  const check = ({ data, error }) => { if (error) throw new Error(friendly(error)); return data; };

  // ---------------- Data helpers ----------------
  async function fetchAll(table, build) {
    const PAGE = 1000; let all = [];
    for (let from = 0; ; from += PAGE) {
      let q = sb.from(table).select('*');
      if (build) q = build(q);
      const rows = check(await q.range(from, from + PAGE - 1));
      all = all.concat(rows);
      if (rows.length < PAGE) break;
    }
    return all;
  }
  /** Terapkan filter lokasi aktif ke query. */
  function byUnit(q, col = 'unit_id') { return state.unit && state.unit !== 'ALL' ? q.eq(col, state.unit) : q; }

  // ---------------- Hak akses ----------------
  const isSuper = () => state.roles.some(r => r.role === 'superadmin');
  /** can('APAR','C', unitId?) — cerminan fungsi public.can() di database (penegakan sebenarnya di RLS). */
  function can(module, action, unit) {
    if (!state.user) return false;
    if (state.profile && state.profile.active === false) return false;
    if (isSuper()) return true;
    const u = unit === undefined ? (state.unit === 'ALL' ? null : state.unit) : unit;
    return state.roles.some(r => {
      const p = state.perms.find(m => m.role === r.role && m.module === module);
      return p && p.perms.includes(action) && (r.unit_id === null || u === null || r.unit_id === u);
    });
  }
  /** Lokasi yang boleh dipilih pengguna. */
  function allowedUnits() {
    if (isSuper() || state.roles.some(r => r.unit_id === null)) return state.units;
    const ids = new Set(state.roles.map(r => r.unit_id));
    return state.units.filter(u => ids.has(u.id));
  }
  const canAllUnits = () => isSuper() || state.roles.some(r => r.unit_id === null);
  const unitById = (id) => state.units.find(u => u.id === id);
  const unitName = (id) => id === 'ALL' ? 'Seluruh Lokasi (Klaster Tarakan)' : (unitById(id) || {}).name || id;
  const unitShort = (id) => id === 'ALL' ? 'Semua Lokasi' : (unitById(id) || {}).short_name || id;
  const unitCity = (id) => (unitById(id && id !== 'ALL' ? id : 'TRK') || {}).city || 'Tarakan';

  // ---------------- Modul & router ----------------
  const DOMAINS = [
    { id: 'UMUM', label: 'Umum' }, { id: 'K3', label: 'K3 / HSE' }, { id: 'PENGAWASAN', label: 'Pengawasan & Tindak Lanjut' },
    { id: 'KESELAMATAN', label: 'Keselamatan / SMS' }, { id: 'KEAMANAN', label: 'Keamanan / AVSEC' }, { id: 'ADMIN', label: 'Administrasi' }
  ];
  /** Daftarkan halaman. def: { id, title, domain, perm (kode modul hak), icon, render(container), order } */
  function register(def) { state.modules[def.id] = def; }
  function visibleModules() {
    return Object.values(state.modules).filter(m => !m.hidden && (!m.perm || can(m.perm, 'R', null) || (m.perm === 'USERS' && isSuper())))
      .sort((a, b) => (a.order || 50) - (b.order || 50));
  }
  function go(id, params) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    location.hash = '#/' + id + qs;
  }
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [id, qs] = raw.split('?');
    return { id: id || 'dashboard', params: Object.fromEntries(new URLSearchParams(qs || '')) };
  }
  async function renderRoute() {
    if (!state.user) return;
    const { id, params } = parseHash();
    let mod = state.modules[id];
    if (!mod || (mod.perm && !can(mod.perm, 'R', null) && !(mod.perm === 'USERS' && isSuper()))) mod = state.modules.dashboard;
    state.route = { id: mod.id, params };
    $$('.k-nav a').forEach(a => a.classList.toggle('active', a.dataset.id === mod.id));
    const main = $('#k-main');
    main.innerHTML = '';
    const head = h('div', { class: 'k-page-head' },
      h('div', {}, h('div', { class: 'k-crumb' }, (DOMAINS.find(d => d.id === mod.domain) || {}).label || ''), h('h2', {}, mod.title)),
      h('div', { class: 'k-page-actions', id: 'k-page-actions' }));
    const body = h('div', { class: 'k-page-body' });
    main.append(head, body);
    document.title = `${mod.title} — Sistem KKS AIRNAV`;
    $('#k-sidebar').classList.remove('open');
    try { await mod.render(body, params, $('#k-page-actions')); }
    catch (e) { console.error(e); body.append(h('div', { class: 'k-alert k-alert-danger' }, 'Gagal memuat: ' + friendly(e))); }
  }
  function buildNav() {
    const nav = $('#k-nav'); nav.innerHTML = '';
    const mods = visibleModules();
    for (const d of DOMAINS) {
      const list = mods.filter(m => m.domain === d.id);
      if (!list.length) continue;
      nav.append(h('div', { class: 'k-nav-group' }, d.label));
      list.forEach(m => nav.append(h('a', { href: '#/' + m.id, 'data-id': m.id }, h('span', { class: 'k-nav-ico' }, m.icon || '•'), m.title)));
    }
    nav.append(h('div', { class: 'k-nav-group' }, 'Lainnya'),
      h('a', { href: 'index.html' }, h('span', { class: 'k-nav-ico' }, '📦'), 'Inventaris APD (lama)'));
  }

  // ---------------- Pengaturan ----------------
  async function loadSettings() {
    const rows = check(await sb.from('app_settings').select('*'));
    state.settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  }
  function setting(key, fallback) { return state.settings[key] !== undefined ? state.settings[key] : fallback; }
  async function saveSetting(key, value) {
    check(await sb.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }));
    state.settings[key] = value;
  }

  // ---------------- Login ----------------
  async function loadAccess() {
    const uid = state.user.id;
    const [roles, perms, prof, units] = await Promise.all([
      sb.from('user_roles').select('*').eq('user_id', uid),
      sb.from('perm_matrix').select('*'),
      sb.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('units').select('*').eq('active', true).order('sort')
    ]);
    state.roles = check(roles); state.perms = check(perms); state.profile = check(prof); state.units = check(units);
    const allowed = allowedUnits();
    const saved = localStorage.getItem('kks_unit');
    if (saved === 'ALL' && canAllUnits()) state.unit = 'ALL';
    else state.unit = allowed.some(u => u.id === saved) ? saved : (allowed[0] || {}).id || null;
    await loadSettings();
  }
  function renderUnitSelect() {
    const sel = $('#k-unit');
    sel.innerHTML = '';
    if (canAllUnits()) sel.append(h('option', { value: 'ALL' }, '🌐 Semua lokasi (klaster)'));
    allowedUnits().forEach(u => sel.append(h('option', { value: u.id }, `${u.short_name} (${u.icao})`)));
    sel.value = state.unit;
    sel.onchange = () => { state.unit = sel.value; localStorage.setItem('kks_unit', sel.value); renderRoute(); };
  }
  function showApp() {
    $('#k-login').hidden = true; $('#k-app').hidden = false;
    $('#k-user-name').textContent = (state.profile && state.profile.full_name) || state.user.email;
    $('#k-user-role').textContent = state.roles.map(r => ROLE_LABEL[r.role] + (r.unit_id ? ` · ${r.unit_id}` : '')).join(', ') || 'Belum ada peran';
    renderUnitSelect(); buildNav(); renderRoute();
  }
  function showLogin(msg) {
    $('#k-app').hidden = true; $('#k-login').hidden = false;
    if (msg) $('#k-login-msg').textContent = msg;
  }
  /** Beri atribut data-label (judul kolom) pada sel tabel — dipakai tampilan kartu di HP. */
  function labelTables(root = document) {
    root.querySelectorAll('table.k-table:not([data-labeled]), table.k-mcard:not([data-labeled])').forEach(t => {
      const heads = Array.from(t.querySelectorAll('thead tr:last-child th')).map(th => th.textContent.trim());
      if (!heads.length) return;
      t.querySelectorAll('tbody tr').forEach(tr => Array.from(tr.children).forEach((td, i) => { if (!td.hasAttribute('data-label')) td.setAttribute('data-label', heads[i] || ''); }));
      t.setAttribute('data-labeled', '1');
    });
  }
  let labelTimer = null;
  new MutationObserver(() => { clearTimeout(labelTimer); labelTimer = setTimeout(() => labelTables(), 30); })
    .observe(document.documentElement, { childList: true, subtree: true });

  async function start() {
    $('#k-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#k-login-btn'); btn.disabled = true; $('#k-login-msg').textContent = '';
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email: $('#k-email').value.trim(), password: $('#k-pass').value });
        if (error) throw new Error(/Invalid login/i.test(error.message) ? 'Email atau password salah.' : error.message);
        state.user = data.user; await afterLogin();
      } catch (err) { $('#k-login-msg').textContent = err.message; }
      finally { btn.disabled = false; }
    });
    $('#k-logout').addEventListener('click', async () => { await sb.auth.signOut(); state.user = null; showLogin('Anda sudah keluar.'); });
    const backdrop = h('div', { id: 'k-backdrop', onclick: () => $('#k-sidebar').classList.remove('open') });
    document.body.append(backdrop);
    $('#k-menu-btn').addEventListener('click', () => $('#k-sidebar').classList.toggle('open'));
    window.addEventListener('hashchange', renderRoute);
    const { data } = await sb.auth.getSession();
    if (data.session) { state.user = data.session.user; await afterLogin(); } else showLogin();
    $('#k-boot').remove();
  }
  async function afterLogin() {
    try {
      await loadAccess();
      if (state.profile && state.profile.active === false) { await sb.auth.signOut(); state.user = null; return showLogin('Akun dinonaktifkan. Hubungi Super Admin.'); }
      if (!state.roles.length) { await sb.auth.signOut(); state.user = null; return showLogin('Akun belum diberi peran. Hubungi Super Admin.'); }
      showApp();
    } catch (e) { showLogin(friendly(e)); }
  }

  return {
    sb, state, ROLE_LABEL, DOMAINS, BULAN, ROMAWI,
    esc, $, $$, h, pad, today, thisPeriod, fmtDate, fmtDateLong, fmtNum, fmtRp, periodLabel, addMonths, daysUntil, quarterOf, weekOfMonth,
    toast, modal, confirmBox, promptBox, friendly, check, fetchAll, byUnit,
    can, isSuper, allowedUnits, canAllUnits, unitById, unitName, unitShort, unitCity,
    register, go, renderRoute, setting, saveSetting, loadSettings, start
  };
})();
