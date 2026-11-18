/**
 * Lapisan data: Supabase (mode cloud) atau localStorage (mode lokal/offline).
 * Seluruh fungsi bersifat async dan memakai format camelCase seperti app.js.
 */
const DB = (() => {
  const LS_ITEMS = 'airnav_k3_items_v1';
  const LS_TX = 'airnav_k3_transactions_v1';
  const PAGE = 1000;

  const cfg = window.APP_CONFIG || {};
  const hasCloud = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const libMissing = hasCloud && !window.supabase;
  const client = hasCloud && !libMissing
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      })
    : null;

  const LOCAL = !hasCloud;
  const ensureClient = () => {
    if (!client) throw new Error('Library Supabase gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.');
  };

  let user = null;
  let admin = false;

  // ---------- Mapping baris DB <-> objek aplikasi ----------
  const toIso = (v) => {
    if (!v) return new Date().toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  };

  const itemFromRow = (r) => ({
    id: r.id, unitId: r.unit_id, nama: r.nama, satuan: r.satuan,
    stokAwal: r.stok_awal, minStok: r.min_stok, kategori: r.kategori,
    lokasi: r.lokasi, keterangan: r.keterangan, createdAt: r.created_at
  });
  const itemToRow = (i) => ({
    id: i.id, unit_id: i.unitId || 'TRK', nama: String(i.nama || '').toUpperCase(),
    satuan: i.satuan || 'PCS', stok_awal: Number(i.stokAwal) || 0,
    min_stok: i.minStok === undefined || i.minStok === null || i.minStok === '' ? 2 : Number(i.minStok),
    kategori: i.kategori || null, lokasi: i.lokasi || 'Lemari K3',
    keterangan: i.keterangan || null, created_at: i.createdAt ? toIso(i.createdAt) : undefined
  });
  const txFromRow = (r) => ({
    id: r.id, tanggal: r.tanggal, jenis: r.jenis, unitId: r.unit_id, barangId: r.barang_id,
    namaBarang: r.nama_barang, satuan: r.satuan, jumlah: r.jumlah, petugas: r.petugas,
    keperluan: r.keperluan, keterangan: r.keterangan
  });
  const txToRow = (t) => ({
    id: t.id, tanggal: toIso(t.tanggal), jenis: t.jenis, unit_id: t.unitId || 'TRK',
    barang_id: t.barangId, nama_barang: t.namaBarang, satuan: t.satuan || 'PCS',
    jumlah: Number(t.jumlah), petugas: t.petugas || null, keperluan: t.keperluan || null,
    keterangan: t.keterangan || null
  });

  // ---------- Error helper ----------
  function friendlyError(error) {
    if (!error) return null;
    const msg = error.message || String(error);
    if (/Stok tidak mencukupi/i.test(msg)) return new Error(msg);
    if (error.code === '23505') return new Error('Data duplikat: nama/kode alat sudah terdaftar di unit tersebut.');
    if (error.code === '42501' || /row-level security|permission denied/i.test(msg)) {
      return new Error('Akses ditolak. Silakan login sebagai admin.');
    }
    if (/Failed to fetch|NetworkError/i.test(msg)) return new Error('Tidak dapat terhubung ke server. Periksa koneksi internet.');
    return new Error(msg);
  }
  const check = ({ data, error }) => {
    if (error) throw friendlyError(error);
    return data;
  };

  // ---------- Mode lokal ----------
  const local = {
    read(key) {
      try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
    },
    write(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
    items() { return this.read(LS_ITEMS); },
    txs() { return this.read(LS_TX) || []; }
  };

  async function fetchAll(table, order) {
    let all = [];
    for (let from = 0; ; from += PAGE) {
      const rows = check(await client.from(table).select('*').order(order.col, { ascending: order.asc })
        .range(from, from + PAGE - 1));
      all = all.concat(rows);
      if (rows.length < PAGE) break;
    }
    return all;
  }

  async function refreshAdminFlag() {
    if (!client || !user) { admin = false; return; }
    const { data, error } = await client.rpc('is_admin');
    admin = !error && data === true;
  }

  return {
    get mode() { return hasCloud ? 'cloud' : 'local'; },
    get user() { return user; },
    /** Boleh mengubah data? Mode lokal selalu boleh. */
    get canWrite() { return !hasCloud || admin; },
    get isAdmin() { return admin; },

    async init(onAuthChange) {
      if (!client) return;
      const { data } = await client.auth.getSession();
      user = data.session ? data.session.user : null;
      await refreshAdminFlag();
      client.auth.onAuthStateChange((event, session) => {
        if (event !== 'SIGNED_OUT' && event !== 'SIGNED_IN') return;
        const newUser = session ? session.user : null;
        if ((newUser && newUser.id) === (user && user.id)) return; // tidak ada perubahan
        user = newUser;
        // Jangan await panggilan Supabase langsung di callback ini (bisa deadlock)
        setTimeout(async () => {
          await refreshAdminFlag();
          if (onAuthChange) onAuthChange(event);
        }, 0);
      });
    },

    async signIn(email, password) {
      if (!client) throw new Error('Supabase belum dikonfigurasi.');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(/Invalid login/i.test(error.message) ? 'Email atau password salah.' : error.message);
      }
      user = data.user;
      await refreshAdminFlag();
      if (!admin) {
        await client.auth.signOut();
        user = null;
        throw new Error('Akun ini tidak memiliki hak akses admin.');
      }
      return user;
    },

    async signOut() {
      if (client) await client.auth.signOut();
      user = null;
      admin = false;
    },

    /** Muat seluruh data. Mengembalikan { items, transactions }. */
    async loadAll(initialItems) {
      if (LOCAL) {
        let items = local.items();
        if (!Array.isArray(items)) {
          items = JSON.parse(JSON.stringify(initialItems));
          local.write(LS_ITEMS, items);
        }
        items.forEach(it => { if (!it.unitId) it.unitId = 'TRK'; if (!it.lokasi) it.lokasi = 'Lemari K3'; });
        const transactions = local.txs();
        transactions.forEach(t => {
          if (!t.unitId) {
            const m = items.find(i => i.id === t.barangId);
            t.unitId = m ? (m.unitId || 'TRK') : 'TRK';
          }
        });
        return { items, transactions };
      }
      ensureClient();
      const [itemRows, txRows] = await Promise.all([
        fetchAll('items', { col: 'created_at', asc: true }),
        fetchAll('transactions', { col: 'tanggal', asc: false })
      ]);
      return { items: itemRows.map(itemFromRow), transactions: txRows.map(txFromRow) };
    },

    async addItem(item) {
      if (LOCAL) {
        const items = local.items() || [];
        items.push(item);
        local.write(LS_ITEMS, items);
        return item;
      }
      const row = itemToRow(item);
      return itemFromRow(check(await client.from('items').insert(row).select().single()));
    },

    async updateItem(id, patch) {
      if (LOCAL) {
        const items = local.items() || [];
        const idx = items.findIndex(i => i.id === id);
        if (idx < 0) throw new Error('Alat tidak ditemukan.');
        items[idx] = { ...items[idx], ...patch };
        local.write(LS_ITEMS, items);
        // sinkronkan nama/satuan pada riwayat
        const txs = local.txs().map(t => t.barangId === id
          ? { ...t, namaBarang: items[idx].nama, satuan: items[idx].satuan } : t);
        local.write(LS_TX, txs);
        return items[idx];
      }
      const full = itemToRow({ id, ...patch });
      const row = {};
      ['nama', 'satuan', 'stok_awal', 'min_stok', 'kategori', 'lokasi', 'keterangan'].forEach(k => { row[k] = full[k]; });
      const updated = itemFromRow(check(await client.from('items').update(row).eq('id', id).select().single()));
      check(await client.from('transactions')
        .update({ nama_barang: updated.nama, satuan: updated.satuan }).eq('barang_id', id));
      return updated;
    },

    async deleteItem(id) {
      if (LOCAL) {
        local.write(LS_ITEMS, (local.items() || []).filter(i => i.id !== id));
        local.write(LS_TX, local.txs().filter(t => t.barangId !== id));
        return;
      }
      check(await client.from('items').delete().eq('id', id)); // transaksi ikut terhapus (cascade)
    },

    async addTx(tx) {
      if (LOCAL) {
        const txs = local.txs();
        txs.push(tx);
        local.write(LS_TX, txs);
        return tx;
      }
      return txFromRow(check(await client.from('transactions').insert(txToRow(tx)).select().single()));
    },

    async deleteTx(id) {
      if (LOCAL) {
        local.write(LS_TX, local.txs().filter(t => t.id !== id));
        return;
      }
      check(await client.from('transactions').delete().eq('id', id));
    },

    /** Impor data (restore / reset / unggah data lokal). replace=true menghapus data lama. */
    async importAll(items, transactions, replace) {
      if (LOCAL) {
        if (replace) {
          local.write(LS_ITEMS, items);
          local.write(LS_TX, transactions);
        } else {
          const curItems = local.items() || [];
          const curTx = local.txs();
          items.forEach(i => { if (!curItems.some(c => c.id === i.id)) curItems.push(i); });
          transactions.forEach(t => { if (!curTx.some(c => c.id === t.id)) curTx.push(t); });
          local.write(LS_ITEMS, curItems);
          local.write(LS_TX, curTx);
        }
        return;
      }
      check(await client.rpc('import_data', {
        p_items: items.map(itemToRow),
        p_transactions: transactions.map(txToRow),
        p_replace: Boolean(replace)
      }));
    },

    /** Data lama dari versi offline yang masih tersimpan di peramban ini. */
    getLegacyLocalData() {
      if (!client) return null;
      const items = local.items();
      if (!Array.isArray(items) || items.length === 0) return null;
      return { items, transactions: local.txs() };
    },
    clearLegacyLocalData() {
      localStorage.removeItem(LS_ITEMS);
      localStorage.removeItem(LS_TX);
    }
  };
})();
