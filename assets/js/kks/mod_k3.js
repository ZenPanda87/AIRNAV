/**
 * Domain K3 / HSE: APAR (daftar, pemeriksaan bulanan, refill), Kotak P3K (daftar & checklist bulanan),
 * Safety patrol (jadwal & checklist 26 item), JSA & Surat Izin Kerja (alur persetujuan), Pengukuran lingkungan,
 * HIRADC K3, Evaluasi Periodik SMK3 triwulan, Kegiatan K3, RAB.
 */
(() => {
  const { h, sb, check, state, can, today, thisPeriod, fmtDate, fmtNum, fmtRp, daysUntil, addMonths, BULAN, ROMAWI, toast, modal, confirmBox, promptBox, unitShort, periodLabel, weekOfMonth, pad } = KKS;
  const { badge } = KUI;

  // ---------- Helper bersama (dipakai modul lain) ----------
  const KMOD = window.KMOD = {
    /** Buat temuan otomatis (mis. dari APAR rusak / skor patrol ≤ 2 / hasil testing keamanan). Hindari duplikat per sumber. */
    async createFinding(f) {
      if (!can('TEMUAN', 'C', f.unit_id)) return null;
      if (f.source_id) {
        let q = sb.from('findings').select('id').eq('source_module', f.source_module).eq('source_id', f.source_id).neq('status', 'CLOSED');
        if (f.protocol_item) q = q.eq('protocol_item', f.protocol_item);
        const ex = check(await q.limit(1));
        if (ex.length) return ex[0];
      }
      return check(await sb.from('findings').insert({ year: new Date().getFullYear(), status: 'OPEN', ...f }).select().single());
    },
    terbilang(n) {
      const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
      n = Math.floor(Math.abs(n));
      if (n < 12) return s[n]; if (n < 20) return KMOD.terbilang(n - 10) + ' belas'; if (n < 100) return KMOD.terbilang(n / 10) + ' puluh ' + KMOD.terbilang(n % 10);
      if (n < 200) return 'seratus ' + KMOD.terbilang(n - 100); if (n < 1000) return KMOD.terbilang(n / 100) + ' ratus ' + KMOD.terbilang(n % 100);
      if (n < 2000) return 'seribu ' + KMOD.terbilang(n - 1000); if (n < 1e6) return KMOD.terbilang(n / 1000) + ' ribu ' + KMOD.terbilang(n % 1000);
      if (n < 1e9) return KMOD.terbilang(n / 1e6) + ' juta ' + KMOD.terbilang(n % 1e6); return KMOD.terbilang(n / 1e9) + ' miliar ' + KMOD.terbilang(n % 1e9);
    },
    /** Pilihan periode bulan + tombol. */
    periodPicker(value, onChange) { return h('label', { class: 'k-inline' }, 'Bulan ', h('input', { class: 'k-input', type: 'month', value, onchange: (e) => onChange(e.target.value) })); },
    needUnit(c) {
      if (state.unit !== 'ALL') return false;
      c.append(h('div', { class: 'k-alert k-alert-info' }, 'Pilih satu lokasi di pojok kanan atas untuk mengisi checklist.'));
      return true;
    },
    /** Halaman kegiatan per domain (Bulan K3, simulasi, safety promotion, DST, dll.) */
    activities(domain, title) {
      return KCRUD.page({
        id: 'kegiatan-' + domain.toLowerCase(), title, table: 'activities', perm: 'KEGIATAN', domain, itemName: 'kegiatan',
        query: (q) => q.eq('domain', domain), presets: () => ({ domain }), order: ['date', false],
        filters: { year: true, yearDate: 'date' },
        beforeSave: (v) => ({ ...v, domain }),
        evidence: { domain: domain === 'PENGAWASAN' ? 'PENGAWASAN' : domain, module: 'KEGIATAN' },
        rowLabel: (r) => r.title,
        fields: [
          { k: 'kind', l: 'Jenis kegiatan', t: 'list', opts: KREF.ACTIVITY_KINDS[domain], req: true, list: true },
          { k: 'title', l: 'Judul / uraian', req: true, list: true, span: 2, cls: 'wrap' },
          { k: 'date', l: 'Tanggal', t: 'date', def: 'today', req: true, list: true }, { k: 'end_date', l: 'Sampai', t: 'date' },
          { k: 'location', l: 'Tempat', list: true }, { k: 'number', l: 'Nomor surat/BA/undangan' },
          { k: 'participants', l: 'Peserta', t: 'textarea' }, { k: 'result', l: 'Hasil / tindak lanjut', t: 'textarea', list: true, cls: 'wrap' }, { k: 'note', l: 'Catatan', t: 'textarea' }
        ],
        print: { title: 'LAPORAN ' + title.toUpperCase(), sig: domain === 'K3' ? 'K3' : domain }
      });
    }
  };

  // ======================= APAR =======================
  const aparExpiry = (a) => a.last_refill ? addMonths(a.last_refill, a.valid_months || 12) : null;
  function aparStatus(a) {
    const exp = aparExpiry(a); const d = daysUntil(exp);
    if (a.condition === 'PERLU TINDAKAN') return badge('Perlu tindakan', 'bad');
    if (exp && d < 0) return badge('Kedaluwarsa', 'bad');
    if (exp && d <= 30) return badge(`Habis ${d} hari`, 'warn');
    return badge('Baik', 'ok');
  }
  const aparDef = {
    id: 'apar', title: 'Daftar APAR', table: 'apar', perm: 'APAR', domain: 'K3', itemName: 'APAR', order: ['code', true],
    intro: 'Daftar Fasilitas APAR K3. Masa berlaku isi default 12 bulan (bisa diatur per tabung). Status kedaluwarsa dihitung otomatis dari tanggal isi ulang terakhir.',
    rowLabel: (r) => r.code, evidence: { domain: 'K3', module: 'APAR' },
    rowClass: (r) => { const d = daysUntil(aparExpiry(r)); return r.condition === 'PERLU TINDAKAN' || (d !== null && d < 0) ? 'row-danger' : (d !== null && d <= 30 ? 'row-warn' : ''); },
    fields: [
      { k: 'code', l: 'No. APAR', req: true, list: true, ph: 'APAR 001' },
      { k: 'building', l: 'Gedung', t: 'list', opts: ['Gedung ADM/APP', 'Gedung Tower', 'Shelter', 'Area luar'], list: true },
      { k: 'location', l: 'Lokasi / ruang', req: true, list: true, span: 2, cls: 'wrap' }, { k: 'room_size', l: 'Ukuran ruang (m)' },
      { k: 'type', l: 'Jenis', t: 'list', opts: KREF.APAR_TYPES, list: true }, { k: 'brand', l: 'Merk' },
      { k: 'capacity_kg', l: 'Kapasitas (kg)', t: 'number', list: true }, { k: 'qty', l: 'Jumlah tabung', t: 'number', def: 1 },
      { k: 'ideal_qty', l: 'Jumlah ideal', t: 'number', def: 1 },
      { k: 'last_refill', l: 'Pengisian terakhir', t: 'date', list: true }, { k: 'valid_months', l: 'Masa berlaku isi (bulan)', t: 'number', def: 12 },
      { k: '_exp', l: 'Berlaku s.d.', form: false, list: true, render: r => fmtDate(aparExpiry(r)) },
      { k: '_st', l: 'Status', form: false, list: true, render: aparStatus },
      { k: 'condition', l: 'Kondisi', t: 'select', opts: ['BAIK', 'PERLU TINDAKAN', 'RUSAK'], def: 'BAIK' },
      { k: 'price_estimate', l: 'Estimasi harga beli', t: 'money' },
      { k: 'mitigation', l: 'Mitigasi (saat ini)', t: 'textarea', def: KREF.APAR_MITIGATION }, { k: 'active', l: 'Aktif', t: 'bool', def: true }, { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    rowActions: [
      { label: 'Kartu', title: 'Kartu pemeriksaan APAR', run: (r) => printAparCard(r) },
      { label: 'Refill/Ganti', perm: 'C', run: async (r, reload) => { if (await KCRUD.openForm(aparServiceDef, null, { apar_id: r.id, unit_id: r.unit_id })) reload(); } }
    ],
    headerActions: [{ label: 'Cetak Daftar Fasilitas APAR', run: ({ rows }) => printAparList(rows()) }]
  };
  function printAparList(rows) {
    const cols = [
      { l: 'No. APAR', v: r => r.code }, { l: 'Lokasi', v: r => [r.building, r.location].filter(Boolean).join(' – ') },
      { l: 'Ukuran Ruang (m)', v: r => r.room_size || '-', cls: 'center' }, { l: 'Waktu Pengisian Terakhir', v: r => fmtDate(r.last_refill), cls: 'center' },
      { l: 'Jenis', v: r => r.type }, { l: 'Kapasitas (Kg)', v: r => fmtNum(r.capacity_kg, 1), cls: 'center' },
      { l: 'Jumlah (Buah)', v: r => r.qty, cls: 'center' }, { l: 'Ideal', v: r => r.ideal_qty, cls: 'center' },
      { l: 'Kebutuhan', v: r => Math.max(0, (r.ideal_qty || 0) - (r.qty || 0)), cls: 'center' }, { l: 'Estimasi Harga', v: r => fmtRp(r.price_estimate), cls: 'right' },
      { l: 'Kondisi', v: r => r.condition, cls: 'center' }, { l: 'Mitigasi', v: r => r.mitigation || '' }
    ];
    KPRINT.table({ title: 'DAFTAR FASILITAS APAR K3', cols, rows, sig: 'K3', landscape: true, small: true });
  }
  async function printAparCard(a) {
    const rows = check(await sb.from('apar_inspections').select('*').eq('apar_id', a.id).order('date', { ascending: false }).limit(12)).reverse();
    const mark = (b) => b ? '✓' : '✗';
    KPRINT.table({
      title: 'KARTU PEMERIKSAAN APAR', unit: a.unit_id, before: h('table', { class: 'p-kv' }, h('tr', {}, h('td', {}, 'No. APAR'), h('td', {}, ': ' + a.code)), h('tr', {}, h('td', {}, 'Lokasi'), h('td', {}, ': ' + [a.building, a.location].filter(Boolean).join(' – '))), h('tr', {}, h('td', {}, 'Jenis / kapasitas'), h('td', {}, `: ${a.type || ''} ${a.capacity_kg ? a.capacity_kg + ' kg' : ''}`))),
      cols: [{ l: 'Tanggal', v: r => fmtDate(r.date), cls: 'center' }, ...KREF.APAR_PARAMS.map(([k, l]) => ({ l, v: r => mark(r[k]), cls: 'center' })),
        { l: 'Hasil', v: r => r.result, cls: 'center' }, { l: 'Petugas', v: r => r.inspector || '' }, { l: 'Keterangan', v: r => r.note || '' }],
      rows, sig: 'K3', landscape: true, after: h('p', { class: 'k-help' }, 'Keterangan: ✓ kondisi baik, ✗ kondisi rusak.')
    });
  }
  KKS.register({ id: 'apar', title: 'APAR', domain: 'K3', icon: '🧯', perm: 'APAR', order: 10, render: KCRUD.page(aparDef) });

  const aparServiceDef = {
    id: 'apar-servis', title: 'Refill / penggantian APAR', table: 'apar_services', perm: 'APAR', domain: 'K3', itemName: 'refill/penggantian', order: ['date', false],
    select: '*, apar(code, location)', evidence: { domain: 'K3', module: 'APAR' }, filters: { year: true, yearDate: 'date' },
    intro: 'Mencatat refill/ganti/baru otomatis memperbarui tanggal pengisian terakhir & kondisi APAR menjadi BAIK.',
    fields: [
      { k: 'apar_id', l: 'APAR', t: 'ref', req: true, ref: { table: 'apar', label: r => `${r.code} — ${r.location}`, order: ['code'] }, list: true, render: r => r.apar ? `${r.apar.code} — ${r.apar.location}` : '' },
      { k: 'kind', l: 'Jenis', t: 'select', opts: ['REFILL', 'GANTI', 'BARU', 'PERBAIKAN'], req: true, list: true },
      { k: 'date', l: 'Tanggal', t: 'date', def: 'today', req: true, list: true }, { k: 'vendor', l: 'Vendor', list: true },
      { k: 'cost', l: 'Biaya', t: 'money', list: true }, { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    print: { title: 'REKAP REFILL / PENGGANTIAN APAR', sig: 'K3' }
  };
  KKS.register({ id: 'apar-servis', title: 'Refill / ganti APAR', domain: 'K3', icon: '🔧', perm: 'APAR', order: 12, render: KCRUD.page(aparServiceDef) });

  // --- Pemeriksaan bulanan APAR ---
  async function aparCheckPage(c, params, actions) {
    if (KMOD.needUnit(c)) return;
    let per = params.period || thisPeriod();
    const box = h('div');
    c.append(h('div', { class: 'k-intro' }, 'Pilih APAR yang belum dicek bulan ini, isi 6 parameter (✓ baik / ✗ rusak), keterangan & foto. Parameter rusak otomatis membuat temuan tindak lanjut.'),
      h('div', { class: 'k-toolbar' }, KMOD.periodPicker(per, (v) => { per = v; load(); })), box);
    actions.append(h('button', { class: 'k-btn', onclick: () => printBook() }, 'Cetak Buku Kontrol APAR'));
    let apar = [], insp = [];
    async function load() {
      box.innerHTML = '<div class="k-empty">Memuat…</div>';
      apar = check(await sb.from('apar').select('*').eq('unit_id', state.unit).eq('active', true).order('code'));
      insp = check(await sb.from('apar_inspections').select('*').eq('unit_id', state.unit).eq('period', per).order('date'));
      const byA = Object.fromEntries(insp.map(i => [i.apar_id, i]));
      box.innerHTML = '';
      const done = apar.filter(a => byA[a.id]).length;
      box.append(h('div', { class: 'k-cards' }, h('div', { class: 'k-card ' + (done === apar.length ? 'ok' : 'warn') }, h('div', { class: 'k-card-label' }, 'Sudah dicek ' + periodLabel(per)), h('div', { class: 'k-card-value' }, `${done}/${apar.length}`))));
      const tb = h('tbody');
      apar.forEach((a, i) => {
        const r = byA[a.id];
        tb.append(h('tr', { class: r ? (r.result === 'BAIK' ? 'row-ok' : 'row-danger') : '' }, h('td', { class: 'num' }, i + 1), h('td', {}, h('b', {}, a.code)), h('td', { class: 'wrap' }, [a.building, a.location].filter(Boolean).join(' – ')),
          h('td', {}, aparStatus(a)), h('td', {}, r ? h('span', {}, badge(r.result, r.result === 'BAIK' ? 'ok' : 'bad'), ' ', fmtDate(r.date)) : badge('Belum dicek', 'warn')),
          h('td', { class: 'k-actions' }, can('APAR', r ? 'U' : 'C') ? h('button', { class: 'k-btn k-btn-sm ' + (r ? '' : 'k-btn-primary'), onclick: () => inspect(a, r) }, r ? 'Ubah' : 'Periksa') : (r ? h('button', { class: 'k-btn k-btn-sm', onclick: () => inspect(a, r) }, 'Lihat') : null))));
      });
      box.append(h('div', { class: 'k-table-wrap' }, h('table', { class: 'k-table' }, h('thead', {}, h('tr', {}, ['No', 'No. APAR', 'Lokasi', 'Status tabung', `Pemeriksaan ${periodLabel(per)}`, 'Aksi'].map(x => h('th', {}, x)))), tb)));
    }
    function inspect(a, r) {
      const def = {
        table: 'apar_inspections', perm: 'APAR', title: 'Pemeriksaan ' + a.code, itemName: 'pemeriksaan ' + a.code, evidence: { domain: 'K3', module: 'APAR', period: (x) => x.period },
        fields: [
          { k: 'date', l: 'Tanggal pemeriksaan', t: 'date', req: true, def: per === thisPeriod() ? 'today' : null },
          { k: 'inspector', l: 'Petugas', def: (state.profile || {}).full_name },
          ...KREF.APAR_PARAMS.map(([k, l]) => ({ k, l, t: 'bool', def: true, boolLabel: 'Baik (✓)' })),
          { k: 'note', l: 'Keterangan', t: 'textarea' }
        ],
        beforeSave: (v) => { if (v.date && v.date.slice(0, 7) !== per) throw new Error(`Tanggal harus di bulan ${periodLabel(per)}.`); return { ...v, apar_id: a.id }; },
        onSaved: async (row) => {
          if (row.result !== 'BAIK') {
            const bad = KREF.APAR_PARAMS.filter(([k]) => !row[k]).map(([, l]) => l).join(', ');
            await KMOD.createFinding({ unit_id: row.unit_id, source: 'Pemeriksaan APAR', field: 'K3', finding: `${a.code} (${a.location}) — kondisi rusak: ${bad}`, recommendation: 'Perbaiki / refill / ganti APAR', pic: 'Manager KKS', target_date: addMonths(row.date, 1), source_module: 'apar_inspections', source_id: row.id });
            toast('Parameter rusak → temuan tindak lanjut dibuat otomatis.', 'warning');
          }
        }
      };
      KCRUD.openForm(def, r || null, { unit_id: a.unit_id }).then(load);
    }
    function printBook() {
      const byA = Object.fromEntries(insp.map(i => [i.apar_id, i]));
      const mark = (r, k) => r ? (r[k] ? '✓' : '✗') : '';
      KPRINT.table({ title: 'BUKU KONTROL PEMERIKSAAN APAR', period: periodLabel(per), landscape: true, sig: 'K3',
        cols: [{ l: 'No. APAR', v: a => a.code }, { l: 'Lokasi', v: a => [a.building, a.location].filter(Boolean).join(' – ') }, { l: 'Tanggal', v: a => fmtDate((byA[a.id] || {}).date), cls: 'center' },
          ...KREF.APAR_PARAMS.map(([k, l]) => ({ l, v: a => mark(byA[a.id], k), cls: 'center' })), { l: 'Paraf/Petugas', v: a => (byA[a.id] || {}).inspector || '' }, { l: 'Keterangan', v: a => (byA[a.id] || {}).note || (byA[a.id] ? '' : 'Belum dicek') }],
        rows: apar, after: h('p', {}, 'Keterangan: ✓ kondisi baik, ✗ kondisi rusak.') });
    }
    load();
  }
  KKS.register({ id: 'apar-cek', title: 'Pemeriksaan APAR bulanan', domain: 'K3', icon: '✅', perm: 'APAR', order: 11, render: aparCheckPage });

  // ======================= P3K =======================
  KKS.register({ id: 'p3k', title: 'Kotak P3K', domain: 'K3', icon: '🩹', perm: 'P3K', order: 13, render: KCRUD.page({
    id: 'p3k', title: 'Kotak P3K', table: 'p3k_boxes', perm: 'P3K', domain: 'K3', itemName: 'kotak P3K', order: ['code', true], rowLabel: r => r.code,
    intro: 'Daftar kotak P3K per lokasi. Isi & jumlah standar tiap kotak (termasuk obat tambahan) diatur di menu "Isi standar kotak P3K".',
    fields: [
      { k: 'code', l: 'Kode kotak', req: true, list: true, ph: 'P3K 01' }, { k: 'location', l: 'Lokasi', req: true, list: true, span: 2 },
      { k: 'type', l: 'Tipe', t: 'select', opts: ['A', 'B', 'C'], def: 'A', list: true }, { k: 'brand', l: 'Merk/model', list: true },
      { k: 'active', l: 'Aktif', t: 'bool', def: true, list: true }, { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    print: { title: 'LOKASI KOTAK P3K', sig: 'K3' }
  }) });

  // --- Isi standar kotak P3K (per lokasi): jumlah bisa disesuaikan, obat/item tambahan bisa ditambah ---
  const P3K_CAT = { Standar: '', Obat: 'info', Tambahan: 'warn' };
  KKS.register({ id: 'p3k-isi', title: 'Isi standar kotak P3K', domain: 'K3', icon: '💊', perm: 'P3K', order: 13.5, render: KCRUD.page({
    id: 'p3k-isi', title: 'Isi standar kotak P3K', table: 'p3k_items', perm: 'P3K', domain: 'K3', itemName: 'isi kotak P3K', order: ['sort', true, 'name', true],
    createLabel: 'Tambah obat / item', rowLabel: r => r.name,
    intro: 'Daftar isi yang dipakai di Checklist P3K bulanan untuk lokasi ini. Awalnya 20 item standar PER.15/MEN/VIII/2008 (Kotak Type A). Ubah "Jumlah standar" sesuai yang dibeli, tambahkan obat atau item lain, atau nonaktifkan item yang tidak dipakai. Centang "Pantau kedaluwarsa" agar checklist menanyakan tanggal kedaluwarsanya.',
    filters: { status: { label: 'Kategori', k: 'category', opts: ['Standar', 'Obat', 'Tambahan'] } },
    presets: () => ({ category: 'Obat', track_expiry: true, sort: 50 }),
    rowClass: r => r.active ? '' : 'row-warn',
    fields: [
      { k: 'sort', l: 'No. urut', t: 'number', def: 50, list: true, help: 'Urutan di form checklist' },
      { k: 'name', l: 'Nama isi / obat', req: true, list: true, span: 2, cls: 'wrap', ph: 'mis. Betadine 30 ml, Paracetamol 500 mg' },
      { k: 'category', l: 'Kategori', t: 'select', opts: ['Standar', 'Obat', 'Tambahan'], def: 'Obat', list: true, render: r => KUI.badge(r.category, P3K_CAT[r.category]) },
      { k: 'std_qty', l: 'Jumlah standar per kotak', t: 'number', min: 0, req: true, def: 1, list: true, help: 'Sesuaikan dengan jumlah yang dibeli / ditetapkan' },
      { k: 'uom', l: 'Satuan', t: 'list', opts: ['buah', 'botol', 'bungkus', 'gulung', 'lembar', 'pasang', 'strip', 'tablet', 'tube', 'sachet', 'pcs'], list: true },
      { k: 'track_expiry', l: 'Pantau kedaluwarsa', t: 'bool', boolLabel: 'Ya, tanyakan tanggal kedaluwarsa saat checklist', list: true },
      { k: 'active', l: 'Dipakai', t: 'bool', def: true, boolLabel: 'Aktif di checklist', list: true, render: r => r.active ? KUI.badge('Aktif', 'ok') : KUI.badge('Nonaktif') },
      { k: 'note', l: 'Keterangan', t: 'textarea', list: true, cls: 'wrap' }
    ],
    headerActions: [{ label: '⧉ Salin daftar dari lokasi lain', perm: 'C', run: async ({ reload }) => {
      if (state.unit === 'ALL') return toast('Pilih lokasi tujuan dulu.', 'warning');
      const opts = state.units.filter(u => u.id !== state.unit);
      const sel = h('select', { class: 'k-input' }, opts.map(u => h('option', { value: u.id }, u.short_name)));
      const go = h('button', { class: 'k-btn k-btn-primary' }, 'Salin');
      const m = modal({ title: 'Salin isi standar P3K', body: h('div', {}, h('p', { class: 'k-help' }, `Item yang belum ada di ${unitShort(state.unit)} akan ditambahkan, dan jumlah standar item yang sudah ada disamakan.`), h('label', { class: 'k-field' }, h('span', {}, 'Dari lokasi'), sel)),
        footer: [h('button', { class: 'k-btn', onclick: () => m.close() }, 'Batal'), go] });
      go.onclick = async () => {
        try {
          const src = check(await sb.from('p3k_items').select('*').eq('unit_id', sel.value));
          const rows = src.map(r => ({ unit_id: state.unit, sort: r.sort, name: r.name, std_qty: r.std_qty, uom: r.uom, category: r.category, track_expiry: r.track_expiry, active: r.active, note: r.note }));
          check(await sb.from('p3k_items').upsert(rows, { onConflict: 'unit_id,name' }));
          toast(`${rows.length} item disalin.`, 'success'); m.close(); reload();
        } catch (e) { toast(e.message, 'error'); }
      };
    } }],
    print: { title: 'DAFTAR ISI STANDAR KOTAK P3K', sig: 'K3', fields: ['sort', 'name', 'category', 'std_qty', 'uom', 'note'] }
  }) });

  /** Isi kotak P3K aktif untuk lokasi (dari tabel p3k_items; cadangan: 20 item standar bawaan). */
  async function p3kItems(unit) {
    const rows = check(await sb.from('p3k_items').select('*').eq('unit_id', unit).eq('active', true).order('sort').order('name'));
    if (rows.length) return rows.map((r, i) => ({ id: r.id, no: i + 1, name: r.name, qty: Number(r.std_qty), uom: r.uom || '', cat: r.category, exp: r.track_expiry }));
    return KREF.P3K_ITEMS.map(([no, name, qty]) => ({ id: 'std-' + no, no, name, qty, uom: '', cat: 'Standar', exp: false }));
  }
  /** Baris checklist lama dicocokkan per id item, lalu per nama. */
  const lineFor = (ex, it) => { const ls = (ex && ex.lines) || []; return ls.find(l => l.iid === it.id) || ls.find(l => String(l.name).toLowerCase() === it.name.toLowerCase()) || null; };
  const expState = (d) => { if (!d) return null; const n = daysUntil(d); return n < 0 ? 'bad' : n <= 60 ? 'warn' : 'ok'; };

  async function p3kCheckPage(c, params, actions) {
    if (KMOD.needUnit(c)) return;
    let per = params.period || thisPeriod();
    let items = await p3kItems(state.unit);
    const box = h('div');
    c.append(h('div', { class: 'k-intro' }, 'Centang (✓) jika tersedia & isi jumlah yang ada. Item kurang dari standar atau obat kedaluwarsa masuk daftar kebutuhan refill. Isi & jumlah standar diatur di menu ', h('a', { href: '#/p3k-isi' }, 'Isi standar kotak P3K'), '.'),
      h('div', { class: 'k-toolbar' }, KMOD.periodPicker(per, (v) => { per = v; load(); })), box);
    actions.append(h('button', { class: 'k-btn', onclick: () => KKS.go('p3k-isi') }, '💊 Atur isi & obat'), h('button', { class: 'k-btn', onclick: () => printNeeds() }, 'Kebutuhan refill'), h('button', { class: 'k-btn', onclick: () => printForm() }, 'Cetak Form Checklist'));
    let boxes = [], checks = [];
    const hasExp = () => items.some(it => it.exp);
    async function load() {
      box.innerHTML = '<div class="k-empty">Memuat…</div>';
      boxes = check(await sb.from('p3k_boxes').select('*').eq('unit_id', state.unit).eq('active', true).order('code'));
      checks = check(await sb.from('p3k_checks').select('*').eq('unit_id', state.unit).eq('period', per));
      box.innerHTML = '';
      if (!boxes.length) return box.append(h('div', { class: 'k-empty' }, 'Belum ada kotak P3K di lokasi ini. Tambahkan di menu Kotak P3K.'));
      const tabs = h('div', { class: 'k-tabs' }); const pane = h('div');
      boxes.forEach((b, i) => {
        const done = checks.find(x => x.box_id === b.id);
        const btn = h('button', { onclick: () => { tabs.querySelectorAll('button').forEach(x => x.classList.remove('active')); btn.classList.add('active'); show(b); } }, `${done ? '✅' : '⬜'} ${b.code} · ${b.location}`);
        tabs.append(btn); if (i === 0) { btn.classList.add('active'); }
      });
      box.append(tabs, pane);
      function show(b) {
        pane.innerHTML = '';
        const ex = checks.find(x => x.box_id === b.id);
        const tb = h('tbody');
        items.forEach(it => {
          const l = lineFor(ex, it) || { available: false, qty: null, note: '', exp: '' };
          const expInp = it.exp ? h('input', { type: 'date', class: 'k-input', 'data-f': 'exp', value: l.exp || '', onchange: (e) => { const s = expState(e.target.value); e.target.style.borderColor = s === 'bad' ? '#ef4444' : s === 'warn' ? '#f97316' : ''; } }) : h('span', { class: 'k-help' }, '—');
          if (it.exp && l.exp) { const s = expState(l.exp); if (s !== 'ok') expInp.style.borderColor = s === 'bad' ? '#ef4444' : '#f97316'; }
          tb.append(h('tr', { 'data-id': it.id }, h('td', { class: 'c' }, it.no), h('td', {}, it.name, it.cat !== 'Standar' ? h('small', { class: 'k-help' }, ` (${it.cat.toLowerCase()})`) : null),
            h('td', { class: 'c' }, `${fmtNum(it.qty)} ${it.uom}`),
            h('td', { class: 'c' }, h('input', { type: 'checkbox', 'data-f': 'available', checked: l.available || null })),
            h('td', { class: 'c' }, h('input', { type: 'number', min: 0, class: 'k-input', 'data-f': 'qty', value: l.qty ?? '' })),
            ...(hasExp() ? [h('td', { class: 'c' }, expInp)] : []),
            h('td', {}, h('input', { class: 'k-input', 'data-f': 'note', value: l.note || '' }))));
        });
        const date = h('input', { type: 'date', class: 'k-input', value: ex ? ex.date : (per === thisPeriod() ? today() : per + '-01') });
        const by = h('input', { class: 'k-input', value: ex ? ex.checked_by || '' : (state.profile || {}).full_name || '' });
        const note = h('input', { class: 'k-input', value: ex ? ex.note || '' : '' });
        const save = h('button', { class: 'k-btn k-btn-primary', disabled: !can('P3K', ex ? 'U' : 'C') || null }, 'Simpan checklist');
        const evBox = h('div');
        const cols = ['No', 'Isi', 'Jumlah standar', 'Tersedia (✓)', 'Jumlah ada', ...(hasExp() ? ['Kedaluwarsa'] : []), 'Keterangan'];
        pane.append(h('div', { class: 'k-form', style: { marginBottom: '10px' } }, h('label', { class: 'k-field' }, h('span', {}, 'Hari/tanggal pemeriksaan'), date), h('label', { class: 'k-field' }, h('span', {}, 'Diperiksa oleh'), by), h('label', { class: 'k-field' }, h('span', {}, 'Catatan'), note)),
          h('div', { class: 'k-table-wrap' }, h('table', { class: 'k-matrix k-mcard' }, h('thead', {}, h('tr', {}, cols.map(x => h('th', {}, x)))), tb)),
          h('div', { class: 'k-toolbar', style: { marginTop: '10px' } }, h('button', { class: 'k-btn', onclick: () => tb.querySelectorAll('tr').forEach(tr => { const it = items.find(x => x.id === tr.dataset.id); tr.querySelector('[data-f=available]').checked = true; const q = tr.querySelector('[data-f=qty]'); if (q.value === '') q.value = it.qty; }) }, 'Tandai semua lengkap'), save),
          h('div', { class: 'k-form-section' }, 'Foto kotak P3K'), evBox);
        if (ex) KEVID.widget(evBox, { unit: b.unit_id, domain: 'K3', module: 'P3K', entity: 'p3k_checks', entityId: ex.id, period: per });
        else evBox.append(h('p', { class: 'k-help' }, 'Simpan checklist dulu untuk menambah foto.'));
        save.onclick = async () => {
          if (date.value.slice(0, 7) !== per) return toast(`Tanggal harus di bulan ${periodLabel(per)}.`, 'error');
          const ls = Array.from(tb.querySelectorAll('tr')).map(tr => {
            const it = items.find(x => x.id === tr.dataset.id); const e = tr.querySelector('[data-f=exp]');
            return { no: it.no, iid: it.id, name: it.name, std: it.qty, uom: it.uom, cat: it.cat,
              available: tr.querySelector('[data-f=available]').checked, qty: tr.querySelector('[data-f=qty]').value === '' ? null : Number(tr.querySelector('[data-f=qty]').value),
              exp: e && e.value ? e.value : null, note: tr.querySelector('[data-f=note]').value };
          });
          const complete = ls.filter(l => l.available && (l.qty === null || l.qty >= l.std) && !(l.exp && daysUntil(l.exp) < 0)).length;
          try {
            save.disabled = true;
            const row = { unit_id: b.unit_id, box_id: b.id, period: per, date: date.value, lines: ls, complete_count: complete, total_count: ls.length, checked_by: by.value, note: note.value };
            check(await sb.from('p3k_checks').upsert(row, { onConflict: 'box_id,period' }));
            const expd = ls.filter(l => l.exp && daysUntil(l.exp) < 0).length;
            toast(`Checklist ${b.code} tersimpan (${complete}/${ls.length} lengkap${expd ? `, ${expd} kedaluwarsa` : ''}).`, expd ? 'warning' : 'success'); load();
          } catch (e) { toast(e.message, 'error'); save.disabled = false; }
        };
      }
      show(boxes[0]);
    }
    function printForm() {
      const headRows = [h('tr', {}, h('th', { rowspan: 2 }, 'No'), h('th', { rowspan: 2 }, 'Isi Kotak P3K'), h('th', { rowspan: 2 }, 'Jumlah'), boxes.map(b => h('th', {}, b.location))),
        h('tr', {}, boxes.map(b => h('th', {}, fmtDate((checks.find(x => x.box_id === b.id) || {}).date) || '-')))];
      const body = h('table', { class: 'p-table small' }, h('thead', {}, headRows), h('tbody', {}, items.map(it => h('tr', {}, h('td', { class: 'num' }, it.no), h('td', {}, it.name + (it.cat !== 'Standar' ? ` (${it.cat.toLowerCase()})` : '')), h('td', { class: 'center' }, `${fmtNum(it.qty)} ${it.uom}`),
        boxes.map(b => { const l = lineFor(checks.find(x => x.box_id === b.id), it); return h('td', { class: 'center' }, l ? (l.available ? '√' + (l.qty !== null && l.qty < it.qty ? ` (${l.qty})` : '') + (l.exp ? ` exp ${fmtDate(l.exp)}` : '') : 'X') : ''); })))));
      KPRINT.doc({ title: 'FORM CHECKLIST BULANAN ISI KOTAK P3K TYPE A', period: periodLabel(per), landscape: boxes.length > 5, sig: 'K3',
        body: [body, h('p', {}, 'Beri tanda (√) jika tersedia dan (X) jika tidak. Angka dalam kurung = jumlah ada bila kurang dari standar; exp = tanggal kedaluwarsa obat.')] });
    }
    /** Rekap kebutuhan refill: kekurangan jumlah, item tidak ada, & obat kedaluwarsa/≤60 hari per kotak. */
    function printNeeds() {
      const rows = [];
      boxes.forEach(b => {
        const ex = checks.find(x => x.box_id === b.id);
        items.forEach(it => {
          const l = lineFor(ex, it);
          if (!l) return;
          const need = !l.available ? it.qty : (l.qty !== null && l.qty < it.qty ? it.qty - l.qty : 0);
          const ed = l.exp ? daysUntil(l.exp) : null;
          if (need > 0 || (ed !== null && ed <= 60)) rows.push({ box: `${b.code} · ${b.location}`, name: it.name, std: it.qty, have: l.available ? (l.qty ?? it.qty) : 0, need: need || (ed !== null && ed < 0 ? it.qty : 0), uom: it.uom, ket: ed === null ? '' : ed < 0 ? `Kedaluwarsa ${fmtDate(l.exp)} — ganti` : `Kedaluwarsa ${fmtDate(l.exp)} (${ed} hari lagi)` });
        });
      });
      if (!checks.length) return toast('Belum ada checklist pada bulan ini.', 'warning');
      const tot = {}; rows.forEach(r => { tot[r.name] = tot[r.name] || { need: 0, uom: r.uom }; tot[r.name].need += r.need; });
      KPRINT.doc({ title: 'KEBUTUHAN REFILL KOTAK P3K', period: periodLabel(per), sig: 'K3',
        body: [rows.length ? KPRINT.tableNode([{ l: 'Kotak', v: r => r.box }, { l: 'Isi / obat', v: r => r.name }, { l: 'Standar', v: r => `${fmtNum(r.std)} ${r.uom}`, cls: 'center' }, { l: 'Ada', v: r => fmtNum(r.have), cls: 'center' }, { l: 'Kebutuhan', v: r => fmtNum(r.need), cls: 'center' }, { l: 'Keterangan', v: r => r.ket }], rows) : h('p', {}, 'Semua kotak lengkap — tidak ada kebutuhan refill.'),
          rows.length ? h('h4', {}, 'Total kebutuhan pembelian') : null,
          rows.length ? KPRINT.tableNode([{ l: 'Isi / obat', v: r => r[0] }, { l: 'Jumlah', v: r => `${fmtNum(r[1].need)} ${r[1].uom}`, cls: 'center' }], Object.entries(tot).filter(([, v]) => v.need > 0)) : null] });
    }
    load();
  }
  KKS.register({ id: 'p3k-cek', title: 'Checklist P3K bulanan', domain: 'K3', icon: '📋', perm: 'P3K', order: 14, render: p3kCheckPage });


  // ======================= SAFETY PATROL =======================
  const patrolDef = {
    id: 'patrol', title: 'Safety patrol', table: 'patrol_schedules', perm: 'PATROL', domain: 'K3', itemName: 'jadwal safety patrol', order: ['date', false],
    filters: { year: true, yearDate: 'date' }, rowLabel: r => fmtDate(r.date),
    intro: 'Pola: koordinator MKKS + 1 anggota Teknik + 1 anggota Operasi, minggu pertama tiap bulan. Skor 0–4 per item; skor ≤ 2 otomatis menjadi temuan.',
    fields: [
      { k: 'date', l: 'Hari/tanggal', t: 'date', req: true, list: true, render: r => `${['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date(r.date + 'T00:00').getDay()]}, ${fmtDate(r.date)}` },
      { k: 'coordinator', l: 'Koordinator', list: true, def: 'Manager KKS' }, { k: 'members', l: 'Anggota (unit — jabatan)', t: 'textarea', list: true, cls: 'wrap', ph: 'Nama (Teknik) — Anggota\nNama (Operasi) — Anggota' },
      { k: 'areas', l: 'Area diperiksa', t: 'multi', opts: KREF.PATROL_AREAS, def: KREF.PATROL_AREAS },
      { k: 'status', l: 'Status', t: 'select', opts: ['RENCANA', 'SELESAI', 'BATAL'], def: 'RENCANA', list: true, render: r => badge(r.status, r.status === 'SELESAI' ? 'ok' : r.status === 'BATAL' ? 'bad' : 'info') },
      { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    beforeSave: (v) => { if (!v.areas || !v.areas.length) v.areas = KREF.PATROL_AREAS; return v; },
    rowActions: [{ label: 'Isi checklist', run: (r) => KKS.go('patrol-isi', { id: r.id }) }, { label: 'Cetak', run: (r) => printPatrol(r) }],
    headerActions: [{ label: 'Cetak jadwal', run: ({ rows, st }) => KPRINT.table({ title: 'RENCANA JADWAL KEGIATAN SAFETY PATROL', period: st.year ? 'Tahun ' + st.year : '', sig: 'K3',
      cols: [{ l: 'Hari/Tanggal', v: r => fmtDate(r.date) }, { l: 'Koordinator', v: r => r.coordinator }, { l: 'Anggota', v: r => r.members || '' }, { l: 'Status', v: r => r.status }], rows: rows().slice().reverse(),
      after: h('p', {}, 'Catatan: koordinator bertanggung jawab atas pelaksanaan; berhalangan lapor ke MKKS; wajib APD (rompi); checklist dikembalikan maks. 17.00 WITA.') }) }]
  };
  KKS.register({ id: 'patrol', title: 'Safety patrol', domain: 'K3', icon: '🦺', perm: 'PATROL', order: 15, render: KCRUD.page(patrolDef) });

  async function printPatrol(s) {
    const res = check(await sb.from('patrol_results').select('*').eq('schedule_id', s.id));
    const areas = s.areas.filter(a => res.some(r => r.area === a));
    if (!areas.length) return toast('Checklist belum diisi.', 'warning');
    const by = Object.fromEntries(res.map(r => [r.area, r]));
    const body = h('table', { class: 'p-table small' },
      h('thead', {}, h('tr', {}, h('th', {}, 'No'), h('th', {}, 'Hal yang diperiksa'), areas.map(a => h('th', {}, a)), h('th', {}, 'Keterangan'))),
      h('tbody', {}, KREF.PATROL_ITEMS.map(([no, name]) => h('tr', {}, h('td', { class: 'num' }, no), h('td', {}, name),
        areas.map(a => { const v = (by[a].scores || {})[no]; return h('td', { class: 'center' }, v === null || v === undefined ? 'N/A' : v); }),
        h('td', {}, areas.map(a => (by[a].notes || {})[no] ? `${a}: ${(by[a].notes || {})[no]}` : '').filter(Boolean).join('; ')))),
        h('tr', {}, h('td', { colspan: 2, class: 'right' }, h('b', {}, 'Total nilai')), areas.map(a => h('td', { class: 'center' }, h('b', {}, `${by[a].total}/${by[a].max_score}`))), h('td', {})),
        h('tr', {}, h('td', { colspan: 2, class: 'right' }, h('b', {}, 'Persentase')), areas.map(a => h('td', { class: 'center' }, h('b', {}, fmtNum(by[a].pct, 1) + '%'))), h('td', {}))));
    KPRINT.doc({ title: 'CHECK LIST SAFETY PATROL', unit: s.unit_id, period: fmtDate(s.date), landscape: true, sig: 'K3',
      body: [h('table', { class: 'p-kv' }, h('tr', {}, h('td', {}, 'Tanggal'), h('td', {}, ': ' + KKS.fmtDateLong(s.date))), h('tr', {}, h('td', {}, 'Pemeriksa'), h('td', {}, ': ' + [s.coordinator, s.members].filter(Boolean).join(', ').replace(/\n/g, ', ')))), body,
        h('p', {}, 'Skor 0–4 sesuai kriteria rubrik; N/A = tidak relevan di area (tidak dihitung).')] });
  }

  async function patrolFillPage(c, params, actions) {
    if (!params.id) { c.append(h('div', { class: 'k-alert k-alert-info' }, 'Pilih jadwal dari menu Safety patrol.')); return; }
    const s = check(await sb.from('patrol_schedules').select('*').eq('id', params.id).single());
    let res = check(await sb.from('patrol_results').select('*').eq('schedule_id', s.id));
    const editable = can('PATROL', 'U', s.unit_id) || can('PATROL', 'C', s.unit_id);
    actions.append(h('button', { class: 'k-btn', onclick: () => KKS.go('patrol') }, '← Jadwal'), h('button', { class: 'k-btn', onclick: () => printPatrol(s) }, 'Cetak checklist'));
    c.append(h('div', { class: 'k-intro' }, `Safety patrol ${unitShort(s.unit_id)} — ${KKS.fmtDateLong(s.date)} · Koordinator: ${s.coordinator || '-'}. Klik angka skor (0–4) atau N/A. Arahkan kursor ke angka untuk melihat kriteria.`));
    const tabs = h('div', { class: 'k-tabs' }); const pane = h('div'); c.append(tabs, pane);
    const drawTabs = (active) => { tabs.innerHTML = ''; s.areas.forEach(a => { const r = res.find(x => x.area === a); tabs.append(h('button', { class: a === active ? 'active' : '', onclick: () => show(a) }, `${r ? '✅' : '⬜'} ${a}${r ? ` (${fmtNum(r.pct, 0)}%)` : ''}`)); }); };
    function show(area) {
      drawTabs(area); pane.innerHTML = '';
      const ex = res.find(x => x.area === area);
      const scores = { ...((ex && ex.scores) || {}) }; const notes = { ...((ex && ex.notes) || {}) };
      const total = h('b'); const recalc = () => { const vals = Object.values(scores).filter(v => v !== null && v !== undefined); const t = vals.reduce((a, b) => a + b, 0); total.textContent = `Total ${t} / ${vals.length * 4} (${vals.length ? fmtNum(t / (vals.length * 4) * 100, 1) : 0}%) · ${KREF.PATROL_ITEMS.length - Object.keys(scores).length} item belum dinilai`; };
      const tb = h('tbody');
      KREF.PATROL_ITEMS.forEach(([no, name, pts, crit]) => {
        const sc = h('div', { class: 'k-score' });
        const setActive = () => sc.querySelectorAll('button').forEach(b => { const v = b.dataset.v === 'na' ? null : Number(b.dataset.v); const on = (no in scores) && scores[no] === v; b.classList.toggle('on', on); b.classList.toggle('low', on && v !== null && v <= 2); });
        [0, 1, 2, 3, 4, 'na'].forEach(v => sc.append(h('button', { type: 'button', 'data-v': v, title: v === 'na' ? 'Tidak relevan di area ini' : `${v}: ${crit[v]}`, disabled: !editable || null, onclick: () => { scores[no] = v === 'na' ? null : v; setActive(); recalc(); } }, v === 'na' ? 'N/A' : v)));
        setActive();
        tb.append(h('tr', {}, h('td', { class: 'c' }, no), h('td', {}, h('b', {}, name), h('br'), h('small', { class: 'k-help' }, pts)), h('td', {}, sc),
          h('td', {}, h('input', { class: 'k-input', value: notes[no] || '', disabled: !editable || null, oninput: (e) => { notes[no] = e.target.value; } }))));
      });
      const inspector = h('input', { class: 'k-input', value: ex ? ex.inspector || '' : (state.profile || {}).full_name || '' });
      const save = h('button', { class: 'k-btn k-btn-primary', disabled: !editable || null }, 'Simpan area ' + area);
      const allFour = h('button', { class: 'k-btn', disabled: !editable || null, onclick: () => { KREF.PATROL_ITEMS.forEach(([no]) => { if (!(no in scores)) scores[no] = 4; }); show(area); } }, 'Isi sisa dengan 4');
      const evBox = h('div');
      pane.append(h('div', { class: 'k-table-wrap' }, h('table', { class: 'k-matrix k-mcard' }, h('thead', {}, h('tr', {}, ['No', 'Hal yang diperiksa / point dicek', 'Skor', 'Keterangan'].map(x => h('th', {}, x)))), tb)),
        h('div', { class: 'k-toolbar', style: { marginTop: '10px' } }, total, h('label', { class: 'k-inline' }, 'Pemeriksa ', inspector), allFour, save), h('div', { class: 'k-form-section' }, 'Foto area ' + area), evBox);
      recalc();
      if (ex) KEVID.widget(evBox, { unit: s.unit_id, domain: 'K3', module: 'PATROL', entity: 'patrol_results', entityId: ex.id, period: s.date.slice(0, 7) });
      else evBox.append(h('p', { class: 'k-help' }, 'Simpan dulu untuk menambah foto.'));
      save.onclick = async () => {
        const missing = KREF.PATROL_ITEMS.filter(([no]) => !(no in scores));
        if (missing.length && !await confirmBox(`${missing.length} item belum dinilai. Simpan sebagian?`, 'Simpan', false)) return;
        const vals = Object.values(scores).filter(v => v !== null && v !== undefined);
        const t = vals.reduce((a, b) => a + b, 0);
        try {
          save.disabled = true;
          const row = check(await sb.from('patrol_results').upsert({ unit_id: s.unit_id, schedule_id: s.id, area, scores, notes, total: t, max_score: vals.length * 4, pct: vals.length ? Math.round(t / (vals.length * 4) * 1000) / 10 : 0, inspector: inspector.value }, { onConflict: 'schedule_id,area' }).select().single());
          let nF = 0;
          for (const [no, v] of Object.entries(scores)) {
            if (v !== null && v <= 2) {
              const it = KREF.PATROL_ITEMS.find(x => x[0] == no);
              const f = await KMOD.createFinding({ unit_id: s.unit_id, source: 'Safety Patrol', field: 'K3', protocol_item: `${area} #${no}`, finding: `Safety patrol ${fmtDate(s.date)} — ${area}: ${it[1]} skor ${v} (${it[3][v]})${notes[no] ? '. ' + notes[no] : ''}`, recommendation: 'Perbaiki hingga memenuhi kriteria skor 4', pic: 'Manager KKS', target_date: addMonths(s.date, 1), source_module: 'patrol_results', source_id: row.id });
              if (f) nF++;
            }
          }
          res = check(await sb.from('patrol_results').select('*').eq('schedule_id', s.id));
          if (res.length >= s.areas.length && s.status !== 'SELESAI' && can('PATROL', 'U', s.unit_id)) { await sb.from('patrol_schedules').update({ status: 'SELESAI' }).eq('id', s.id); s.status = 'SELESAI'; }
          toast(`Area ${area} tersimpan.${nF ? ` ${nF} item skor ≤ 2 tercatat sebagai temuan.` : ''}`, 'success');
          show(area);
        } catch (e) { toast(e.message, 'error'); save.disabled = false; }
      };
    }
    show(s.areas[0]);
  }
  KKS.register({ id: 'patrol-isi', title: 'Isi checklist safety patrol', domain: 'K3', perm: 'PATROL', hidden: true, render: patrolFillPage });

  // ======================= JSA & SURAT IZIN KERJA =======================
  const WP_BADGE = { DRAFT: '', DIAJUKAN: 'warn', DIPERIKSA: 'warn', BERLAKU: 'ok', DITOLAK: 'bad', SELESAI: 'info' };
  const wpValidUntil = (r) => r.ext2_until || r.ext1_until || r.end_at;
  async function setWp(r, patch, msg, reload) { try { check(await sb.from('work_permits').update(patch).eq('id', r.id)); toast(msg, 'success'); reload(); } catch (e) { toast(e.message, 'error'); } }
  const myName = () => (state.profile && state.profile.full_name) || state.user.email;
  const wpDef = {
    id: 'jsawp', title: 'JSA & Surat Izin Kerja', table: 'work_permits', perm: 'JSAWP', domain: 'K3', itemName: 'izin kerja + JSA', order: ['date', false],
    filters: { year: true, yearDate: 'date', status: { k: 'status', opts: ['DRAFT', 'DIAJUKAN', 'DIPERIKSA', 'BERLAKU', 'DITOLAK', 'SELESAI'] } }, rowLabel: r => r.title,
    intro: 'Izin diajukan minimal 12 jam sebelum pekerjaan (ANV Form 051). Alur: Draft → Diajukan → Diperiksa User → Disetujui Fungsi HSE (Berlaku) → Selesai. Perpanjangan maks. 2×. Vendor diwakili teknisi/user (tanpa akun vendor).',
    evidence: { domain: 'K3', module: 'JSAWP' },
    rowClass: r => r.status === 'BERLAKU' && new Date(wpValidUntil(r)) < new Date() ? 'row-danger' : '',
    fields: [
      { section: 'Informasi pekerjaan' },
      { k: 'number', l: 'Nomor izin', list: true }, { k: 'date', l: 'Tanggal pengajuan', t: 'date', def: 'today', req: true, list: true },
      { k: 'title', l: 'Nama proyek / pekerjaan', req: true, list: true, span: 2, cls: 'wrap' },
      { k: 'work_types', l: 'Jenis pekerjaan', t: 'multi', opts: KREF.WP_TYPES },
      { k: 'location', l: 'Lokasi kerja', req: true, list: true }, { k: 'scope', l: 'Ruang lingkup', t: 'textarea' },
      { section: 'Pelaksanaan' },
      { k: 'executor_type', l: 'Pelaksana', t: 'select', opts: ['Vendor', 'Subkontraktor', 'Swakelola Teknik'], def: 'Vendor' },
      { k: 'vendor', l: 'Nama vendor', list: true, showIf: v => v.executor_type !== 'Swakelola Teknik' }, { k: 'pic', l: 'Penanggung jawab', req: true },
      { k: 'members', l: 'Anggota (1–8, satu per baris)', t: 'textarea' }, { k: 'tools', l: 'Peralatan & material (satu per baris)', t: 'textarea' },
      { k: 'start_at', l: 'Mulai', t: 'datetime', req: true, list: true }, { k: 'end_at', l: 'Berlaku sampai', t: 'datetime', req: true, list: true, render: r => fmtDate(wpValidUntil(r), true) + (r.ext2_until ? ' (perp. II)' : r.ext1_until ? ' (perp. I)' : '') },
      { section: 'Bahaya, isolasi, APD & pengaman' },
      { k: 'hazards', l: 'Potensi bahaya', t: 'multi', opts: KREF.WP_HAZARDS }, { k: 'isolations', l: 'Tindakan isolasi', t: 'multi', opts: KREF.WP_ISOLATIONS },
      { k: 'ppe', l: 'APD yang diperlukan', t: 'multi', opts: KREF.WP_PPE }, { k: 'safeguards', l: 'Pengaman', t: 'multi', opts: KREF.WP_SAFEGUARDS },
      { section: 'Job Safety Analysis (JSA)' },
      { k: 'jsa_steps', l: 'Tahapan pekerjaan', t: 'rows', cols: [{ k: 'step', l: 'Tahapan pekerjaan', t: 'textarea' }, { k: 'source', l: 'Sumber bahaya', t: 'textarea' }, { k: 'hazard', l: 'Bahaya', t: 'textarea' }, { k: 'risk', l: 'Risiko', t: 'textarea' }, { k: 'control', l: 'Pengendalian risiko', t: 'textarea' }, { k: 'note', l: 'Ket.', w: '90px' }] },
      { k: 'status', l: 'Status', form: false, list: true, render: r => badge(r.status, WP_BADGE[r.status]) },
      { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    beforeSave: (v, row) => {
      if (!row) {
        const hrs = (new Date(v.start_at) - new Date()) / 36e5;
        if (hrs < 12) toast('Perhatian: diajukan kurang dari 12 jam sebelum pekerjaan.', 'warning');
      }
      if (v.end_at && v.start_at && v.end_at < v.start_at) throw new Error('Tanggal berakhir sebelum tanggal mulai.');
      return v;
    },
    rowActions: [
      { label: 'Ajukan', show: r => ['DRAFT', 'DITOLAK'].includes(r.status) && (can('JSAWP', 'C', r.unit_id) || can('JSAWP', 'U', r.unit_id)), run: (r, rl) => setWp(r, { status: 'DIAJUKAN', reject_reason: null }, 'Izin diajukan.', rl) },
      { label: 'Periksa (User)', show: r => r.status === 'DIAJUKAN' && can('JSAWP', 'U', r.unit_id), run: (r, rl) => setWp(r, { status: 'DIPERIKSA', user_checked_by: myName(), user_checked_at: new Date().toISOString() }, 'Diperiksa oleh User.', rl) },
      { label: 'Setujui HSE', cls: 'k-btn-success', show: r => r.status === 'DIPERIKSA' && can('JSAWP', 'A', r.unit_id), run: (r, rl) => setWp(r, { status: 'BERLAKU', hse_approved_by: myName(), hse_approved_at: new Date().toISOString() }, 'Izin kerja BERLAKU.', rl) },
      { label: 'Tolak', cls: 'k-btn-danger-o', show: r => ['DIAJUKAN', 'DIPERIKSA'].includes(r.status) && (can('JSAWP', 'A', r.unit_id) || can('JSAWP', 'U', r.unit_id)), run: async (r, rl) => { const why = await promptBox('Tolak izin kerja', 'Alasan penolakan'); if (why) setWp(r, { status: 'DITOLAK', reject_reason: why }, 'Izin ditolak.', rl); } },
      { label: 'Perpanjang', show: r => r.status === 'BERLAKU' && !r.ext2_until && can('JSAWP', 'U', r.unit_id), run: async (r, rl) => {
        const inp = h('input', { type: 'datetime-local', class: 'k-input' });
        const m = modal({ title: `Perpanjangan ${r.ext1_until ? 'II' : 'I'}`, body: h('label', { class: 'k-field' }, h('span', {}, 'Berlaku sampai'), inp), footer: [h('button', { class: 'k-btn k-btn-primary', onclick: () => { if (!inp.value) return; m.close(); setWp(r, r.ext1_until ? { ext2_until: new Date(inp.value).toISOString() } : { ext1_until: new Date(inp.value).toISOString() }, 'Izin diperpanjang.', rl); } }, 'Simpan')] });
      } },
      { label: 'Tutup', show: r => r.status === 'BERLAKU' && can('JSAWP', 'U', r.unit_id), run: async (r, rl) => { if (await confirmBox('Tutup izin kerja (pekerjaan selesai)?', 'Tutup', false)) setWp(r, { status: 'SELESAI', closed_at: new Date().toISOString() }, 'Izin ditutup.', rl); } },
      { label: 'Cetak WP', run: r => printWP(r) }, { label: 'Cetak JSA', run: r => printJSA(r) }
    ]
  };
  const chk = (list, all) => h('div', { class: 'p-checks' }, all.map(x => `${(list || []).includes(x) ? '☑' : '☐'} ${x}`).join('    '));
  function printWP(r) {
    const kv = (k, v) => h('tr', {}, h('td', {}, k), h('td', {}, ': ' + (v || '-')));
    KPRINT.doc({ title: 'SURAT IZIN KERJA (PERMIT TO WORK)', unit: r.unit_id, sig: 'WP', subtitle: KKS.unitName(r.unit_id) + ' — ANV Form 051',
      body: [h('table', { class: 'p-kv' }, kv('Nomor', r.number), kv('Tanggal', fmtDate(r.date)), kv('Pekerjaan', r.title), kv('Lokasi', r.location), kv('Ruang lingkup', r.scope),
        kv('Pelaksana', `${r.executor_type || ''} ${r.vendor || ''}`), kv('Penanggung jawab', r.pic), kv('Masa berlaku', `${fmtDate(r.start_at, true)} s.d. ${fmtDate(r.end_at, true)}`),
        kv('Perpanjangan I', fmtDate(r.ext1_until, true)), kv('Perpanjangan II', fmtDate(r.ext2_until, true)), kv('Status', r.status), kv('Diperiksa User', r.user_checked_by ? `${r.user_checked_by} (${fmtDate(r.user_checked_at, true)})` : ''), kv('Disetujui HSE', r.hse_approved_by ? `${r.hse_approved_by} (${fmtDate(r.hse_approved_at, true)})` : '')),
        h('h4', {}, 'Jenis pekerjaan'), chk(r.work_types, KREF.WP_TYPES), h('h4', {}, 'Anggota'), h('p', {}, (r.members || '-').replace(/\n/g, ', ')), h('h4', {}, 'Peralatan'), h('p', {}, (r.tools || '-').replace(/\n/g, ', ')),
        h('h4', {}, 'Potensi bahaya'), chk(r.hazards, KREF.WP_HAZARDS), h('h4', {}, 'Tindakan isolasi'), chk(r.isolations, KREF.WP_ISOLATIONS),
        h('h4', {}, 'APD'), chk(r.ppe, KREF.WP_PPE), h('h4', {}, 'Pengaman'), chk(r.safeguards, KREF.WP_SAFEGUARDS)] });
  }
  function printJSA(r) {
    KPRINT.table({ title: 'JOB SAFETY ANALYSIS (JSA)', unit: r.unit_id, sig: 'JSA', landscape: true,
      before: h('table', { class: 'p-kv' }, ...[['Nomor', r.number], ['Nama proyek/pekerjaan', r.title], ['Nama vendor', r.executor_type === 'Swakelola Teknik' ? 'Swakelola Teknik' : r.vendor], ['Lokasi kerja', r.location], ['Waktu kerja', `${fmtDate(r.start_at, true)} s.d. ${fmtDate(r.end_at, true)}`], ['Alat & material', (r.tools || '').replace(/\n/g, ', ')]].map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, ': ' + (v || '-'))))),
      cols: [{ l: 'Tahapan Pekerjaan', v: x => x.step }, { l: 'Sumber Bahaya', v: x => x.source }, { l: 'Bahaya', v: x => x.hazard }, { l: 'Risiko', v: x => x.risk }, { l: 'Pengendalian Risiko', v: x => x.control }, { l: 'Keterangan', v: x => x.note }],
      rows: r.jsa_steps || [] });
  }
  KKS.register({ id: 'jsawp', title: 'JSA & Izin Kerja', domain: 'K3', icon: '📝', perm: 'JSAWP', order: 16, render: KCRUD.page(wpDef) });

  // ======================= PENGUKURAN LINGKUNGAN =======================
  const ISBB = { '75-100%': [30.6, 28.0, 25.9], '50-75%': [31.4, 29.4, 27.9], '25-50%': [32.4, 31.1, 30.0], '0-25%': [32.4, 31.1, 30.0] };
  const WL = { Ringan: 0, Sedang: 1, Berat: 2 };
  function envResult(v) {
    const notes = [];
    if (v.noise_high != null && v.noise_high > 85) notes.push(`Bising ${v.noise_high} dBA > 85`);
    const tStd = (ISBB[v.work_regime] || ISBB['75-100%'])[WL[v.workload] ?? 0];
    if (v.temp_c != null && v.temp_c > tStd) notes.push(`Suhu ${v.temp_c}°C > ${tStd}`);
    if (v.lux != null && v.lux < (v.lux_std || 300)) notes.push(`Cahaya ${v.lux} lux < ${v.lux_std || 300}`);
    return notes.length ? 'TIDAK SESUAI: ' + notes.join('; ') : 'SESUAI STANDAR';
  }
  KKS.register({ id: 'pengukuran', title: 'Pengukuran lingkungan kerja', domain: 'K3', icon: '🌡️', perm: 'LINGKUNGAN', order: 17, render: KCRUD.page({
    id: 'pengukuran', title: 'Pengukuran suhu, kebisingan & pencahayaan', table: 'env_measurements', perm: 'LINGKUNGAN', domain: 'K3', itemName: 'hasil ukur', order: ['date', false, 'area', true],
    filters: { period: 'date' }, evidence: { domain: 'K3', module: 'LINGKUNGAN' }, rowLabel: r => r.area,
    intro: 'Standar: kebisingan 85 dBA/8 jam (Permenaker 5/2018); suhu ISBB sesuai beban & pengaturan waktu kerja; pencahayaan ruang kerja 300 lux (Permenkes 48/2016), ruang alat 300–750 lux. Hasil dinilai otomatis.',
    rowClass: r => (r.result || '').startsWith('TIDAK') ? 'row-warn' : '',
    fields: [
      { k: 'date', l: 'Tanggal', t: 'date', def: 'today', req: true, list: true },
      { k: 'area', l: 'Titik ukur / lokasi', t: 'list', req: true, list: true, opts: ['Gd.Adm/APP Lt.I Ruang Rapat Sementara', 'Gd.Adm/APP Lt.II Ruang Kontrol APP', 'Gd.Adm/APP Lt.III Ruang Teknik', 'Gd.Adm/APP Lt.III Ruang Alat VHF APP', 'Gd.Tower Lt.I Lobby', 'Gd.Tower Lt.I Ruang Rapat', 'Gd.Tower Lt.I Ruang GM', 'Gd.Tower Lt.I Ruang Administrasi/PUM', 'Gd.Tower Lt.I Ruang Managerial', 'Gd.Tower Lt.I Ruang Teknik', 'Gd.Tower Lt.I Ruang Server Teknik', 'Gd.Tower Lt.I Ruang ARO', 'Gd.Tower Lt.I Ruang Lounge', 'Gd.Tower Lt.II Server CCTV', 'Gd.Tower Lt.III Ruang Baterai', 'Gd.Tower Lt.IV Ruang AMSC', 'Gd.Tower Lt.V Ruang VHF & Recorder', 'Gd.Tower Lt.VI Rest Room', 'Gd.Tower Lt.VII Ruang Kontrol TWR', 'Shelter Radar', 'Shelter VHF-ER', 'Shelter Localizer', 'Shelter GP', 'Shelter DVOR/DME'] },
      { k: 'noise_low', l: 'Bising low (dBA)', t: 'number', list: true }, { k: 'noise_high', l: 'Bising high (dBA)', t: 'number', list: true },
      { k: 'temp_c', l: 'Suhu (°C)', t: 'number', list: true }, { k: 'workload', l: 'Beban kerja', t: 'select', opts: ['Ringan', 'Sedang', 'Berat'], def: 'Ringan' },
      { k: 'work_regime', l: 'Pengaturan waktu kerja', t: 'select', opts: Object.keys(ISBB), def: '75-100%' },
      { k: 'lux', l: 'Pencahayaan (lux)', t: 'number', list: true }, { k: 'lux_std', l: 'Standar lux', t: 'number', def: 300 },
      { k: 'result', l: 'Hasil', form: false, list: true, cls: 'wrap' }, { k: 'recorded_by', l: 'Dicatat oleh', def: () => (state.profile || {}).full_name }, { k: 'note', l: 'Keterangan', t: 'textarea' }
    ],
    beforeSave: (v) => ({ ...v, result: envResult(v) }),
    print: { title: 'PENGUKURAN KEBISINGAN, SUHU RUANG KERJA & PENCAHAYAAN', sig: 'K3', landscape: true }
  }) });

  // ======================= HIRADC K3 =======================
  const lvBadge = (lv) => lv ? h('span', { class: 'k-badge lv-' + lv }, lv) : '';
  function k3Matrix() {
    const t = h('table', { class: 'k-riskgrid' }, h('tr', {}, h('th', {}, 'L \\ S'), [1, 2, 3, 4, 5].map(s => h('th', {}, s))));
    for (let l = 5; l >= 1; l--) t.append(h('tr', {}, h('th', {}, l), [1, 2, 3, 4, 5].map(s => h('td', { class: 'lv-' + KREF.k3Level(l * s) }, l * s))));
    return h('div', { class: 'k-panel' }, h('h3', {}, 'Matriks risiko K3 (L × S)'), h('div', { style: { display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' } }, t,
      h('ul', { class: 'k-list', style: { flex: 1, minWidth: '260px' } }, Object.entries(KREF.K3_LEVELS).map(([k, l]) => h('li', {}, h('span', {}, lvBadge(k), ' ', l), h('small', {}, KREF.K3_ACTION[k]))))),
      h('p', { class: 'k-help' }, 'RFN > 6 (moderate ke atas) → pengendalian dituangkan ke form penetapan pengendalian & OTP, bila perlu dibuat JSA.'));
  }
  KKS.register({ id: 'hiradc', title: 'HIRADC K3', domain: 'K3', icon: '⚠️', perm: 'LINGKUNGAN', order: 18, render: KCRUD.page({
    id: 'hiradc', title: 'HIRADC K3 (Identifikasi AI & HIRA)', table: 'hiradc', perm: 'LINGKUNGAN', domain: 'K3', itemName: 'baris HIRADC', order: ['area', true, 'created_at', true],
    top: (t) => t.append(k3Matrix()), evidence: { domain: 'K3', module: 'LINGKUNGAN' }, rowLabel: r => r.hazard,
    filters: { status: { k: 'level', label: 'Tingkat awal', opts: ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] } },
    fields: [
      { k: 'area', l: 'Area', t: 'list', req: true, list: true, opts: ['Gedung Tower', 'Gedung APP Operasional', 'Gedung VHF-ER', 'Shelter LOCA', 'Shelter DVOR DME', 'Gedung Radar', 'Area Parkir', 'Kegiatan Building Management'] },
      { k: 'date', l: 'Tanggal', t: 'date', def: 'today' }, { k: 'proposed_by', l: 'Proposed by / section' },
      { k: 'activity', l: 'Aktivitas / proses', req: true, list: true, cls: 'wrap' }, { k: 'hazard', l: 'Hazard / aspek LK3', req: true, list: true, cls: 'wrap' },
      { k: 'she', l: 'S/H/E', t: 'select', opts: [['S', 'S – Safety'], ['H', 'H – Health'], ['E', 'E – Environment']], def: 'S', list: true },
      { k: 'potential', l: 'Potensi risiko / dampak', t: 'textarea' }, { k: 'legal_ref', l: 'Peraturan terkait' },
      { k: 'condition', l: 'Kondisi', t: 'select', opts: [['R', 'R – Rutin'], ['NR', 'NR – Non rutin'], ['EM', 'EM – Emergency'], ['N/A', 'N/A']], def: 'R' },
      { k: 'l', l: 'L (likelihood 1–5)', t: 'number', min: 1, max: 5, req: true }, { k: 's', l: 'S (severity 1–5)', t: 'number', min: 1, max: 5, req: true },
      { k: 'rfn', l: 'RFN', form: false, list: true, render: r => `${r.l}×${r.s} = ${r.rfn}` }, { k: 'level', l: 'Tingkat', form: false, list: true, render: r => lvBadge(r.level) },
      { k: 'ecm', l: 'Existing control measures', t: 'textarea' }, { k: 'mitigation', l: 'Mitigation control', t: 'textarea' },
      { k: 'rl', l: 'Residual L', t: 'number', min: 1, max: 5 }, { k: 'rs', l: 'Residual S', t: 'number', min: 1, max: 5 },
      { k: 'rlevel', l: 'Residual', form: false, list: true, render: r => r.rrfn ? h('span', {}, `${r.rrfn} `, lvBadge(r.rlevel)) : '' },
      { k: 'residual_control', l: 'Residual control', t: 'textarea' }, { k: 'accepted', l: 'Diterima', t: 'bool' }, { k: 'finish_date', l: 'Finish date', t: 'date' },
      { k: 'reviewed_at', l: 'Reviewed date', t: 'date' }
    ],
    onSaved: (r, isNew) => { if (r.rfn > 6 && isNew) toast('RFN > 6: tuangkan pengendalian ke form OTP; bila pekerjaan, buat JSA.', 'warning'); },
    headerActions: [{ label: 'Cetak HIRADC resmi', run: ({ rows }) => KPRINT.table({ title: 'IDENTIFIKASI AI & HIRA', subtitle: KKS.unitName(state.unit) + ' — No.Dok 13-K3-IV-FR-LPPNPI Rev 00', landscape: true, small: true, sig: 'HIRADC', rows: rows(),
      cols: [{ l: 'Area', v: r => r.area }, { l: 'Aktivitas', v: r => r.activity }, { l: 'Hazard', v: r => r.hazard }, { l: 'S/H/E', v: r => r.she, cls: 'center' }, { l: 'Potensi risiko', v: r => r.potential }, { l: 'Peraturan', v: r => r.legal_ref },
        { l: 'Kond.', v: r => r.condition, cls: 'center' }, { l: 'L', v: r => r.l, cls: 'center' }, { l: 'S', v: r => r.s, cls: 'center' }, { l: 'RFN', v: r => r.rfn, cls: 'center' }, { l: 'Level', v: r => r.level, cls: 'center' },
        { l: 'ECM', v: r => r.ecm }, { l: 'Mitigasi', v: r => r.mitigation }, { l: 'rL', v: r => r.rl, cls: 'center' }, { l: 'rS', v: r => r.rs, cls: 'center' }, { l: 'rRFN', v: r => r.rrfn, cls: 'center' }, { l: 'Level', v: r => r.rlevel, cls: 'center' }, { l: 'Diterima', v: r => r.accepted == null ? '' : r.accepted ? 'Y' : 'N', cls: 'center' }, { l: 'Finish', v: r => fmtDate(r.finish_date) }] }) }]
  }) });

  // ======================= EVALUASI SMK3 TRIWULAN =======================
  async function smk3Page(c, params, actions) {
    if (KMOD.needUnit(c)) return;
    const now = new Date(); let year = Number(params.year) || now.getFullYear(); let q = Number(params.q) || Math.max(1, Math.floor(now.getMonth() / 3));
    const box = h('div');
    const ySel = h('select', { class: 'k-input', onchange: e => { year = +e.target.value; load(); } }); for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 4; y--) ySel.append(h('option', { value: y, selected: y === year || null }, y));
    const qSel = h('select', { class: 'k-input', onchange: e => { q = +e.target.value; load(); } }, [1, 2, 3, 4].map(x => h('option', { value: x, selected: x === q || null }, 'TW ' + ROMAWI[x - 1])));
    c.append(h('div', { class: 'k-intro' }, 'Evaluasi Periodik Kepatuhan Program SMK3 — 20 butir. Tombol "Isi otomatis dari data" mengambil minggu pelaksanaan JSA/WP, APAR, P3K, safety patrol, rapat tim K3, ketersediaan APD (existing vs ideal) & kejadian. Tenggat kirim: tanggal 10 setelah triwulan berakhir.'),
      h('div', { class: 'k-toolbar' }, h('label', { class: 'k-inline' }, 'Tahun ', ySel), h('label', { class: 'k-inline' }, 'Triwulan ', qSel)), box);
    let ev = null;
    const months = () => [0, 1, 2].map(i => (q - 1) * 3 + i + 1);
    async function load() {
      box.innerHTML = '<div class="k-empty">Memuat…</div>';
      ev = check(await sb.from('smk3_evaluations').select('*').eq('unit_id', state.unit).eq('year', year).eq('quarter', q).maybeSingle());
      draw();
    }
    async function autoFill() {
      const [m1, , m3] = months(); const from = `${year}-${pad(m1)}-01`; const to = m3 === 12 ? `${year + 1}-01-01` : `${year}-${pad(m3 + 1)}-01`;
      const u = state.unit; const wk = (d) => `${new Date(d.slice(0, 10) + 'T00:00').getMonth() + 1 - m1 + 1}-${weekOfMonth(d)}`;
      const g = async (t, col, extra) => { let qq = sb.from(t).select('*').eq('unit_id', u).gte(col, from).lt(col, to); if (extra) qq = extra(qq); return check(await qq); };
      const [wp, apar, p3k, patrol, acts, items, txs] = await Promise.all([
        g('work_permits', 'date', x => x.neq('status', 'DRAFT')), g('apar_inspections', 'date'), g('p3k_checks', 'date'), g('patrol_schedules', 'date', x => x.eq('status', 'SELESAI')),
        g('activities', 'date', x => x.eq('domain', 'K3')), check(await sb.from('items').select('*').eq('unit_id', u)), check(await sb.from('transactions').select('barang_id,jenis,jumlah').eq('unit_id', u))]);
      const prev = (ev && ev.lines && ev.lines.length) ? ev.lines : (check(await sb.from('smk3_evaluations').select('lines').eq('unit_id', u).order('year', { ascending: false }).order('quarter', { ascending: false }).limit(1))[0] || {}).lines || [];
      const prevBy = Object.fromEntries(prev.map(l => [l.no, l]));
      const weeksOf = (rows, col) => Array.from(new Set(rows.map(r => wk(r[col]))));
      const stock = (it) => it.stok_awal + txs.filter(t => t.barang_id === it.id).reduce((a, t) => a + (t.jenis === 'MASUK' ? t.jumlah : -t.jumlah), 0);
      return KREF.SMK3_ITEMS.map(([grp, no, name, subs, src]) => {
        const p = prevBy[no] || {};
        let L = { no, available: p.available ?? true, implemented: p.implemented ?? null, note: p.note || '', weeks: [] };
        if (src === 'jsawp') { L.weeks = weeksOf(wp, 'date'); L.implemented = wp.length > 0; L.available = true; L.note = wp.length ? `${wp.length} pekerjaan ber-JSA/WP` : 'Tidak ada pekerjaan berisiko pada periode ini'; }
        if (src === 'apar') { L.weeks = weeksOf(apar, 'date'); L.implemented = apar.length > 0; L.note = `${new Set(apar.map(a => a.apar_id)).size} APAR diperiksa; ${apar.filter(a => a.result !== 'BAIK').length} perlu tindakan`; }
        if (src === 'p3k') { L.weeks = weeksOf(p3k, 'date'); L.implemented = p3k.length > 0; L.note = `${p3k.length} checklist kotak P3K`; }
        if (src === 'patrol') { L.weeks = weeksOf(patrol, 'date'); L.implemented = patrol.length > 0; L.note = `${patrol.length} kali safety patrol`; }
        if (src === 'rapat') { const r = acts.filter(a => /rapat/i.test(a.kind)); L.weeks = weeksOf(r, 'date'); L.implemented = r.length > 0; L.note = r.length ? `${r.length} rapat` : 'Belum terlaksana'; }
        if (src === 'insiden' || src === 'kecelakaan') { const r = acts.filter(a => src === 'insiden' ? /insiden/i.test(a.kind) : /kecelakaan/i.test(a.kind)); L.weeks = weeksOf(r, 'date'); L.available = null; L.implemented = null; L.note = r.length ? `${r.length} kejadian` : 'Nihil (tidak ada kejadian)'; }
        if (src === 'apd') {
          const short = items.filter(i => i.ideal_qty && stock(i) < i.ideal_qty);
          L.available = items.length > 0; L.implemented = items.length > 0;
          L.note = !items.length ? 'Data APD belum diinput' : short.length ? 'Perlu penambahan pengadaan APD tersebut: ' + short.map(i => `${i.nama} (${stock(i)}/${i.ideal_qty})`).join(', ') : 'Memenuhi';
        }
        return L;
      });
    }
    function draw() {
      box.innerHTML = '';
      const editable = can('SMK3', ev ? 'U' : 'C') && (!ev || ev.status !== 'DISETUJUI');
      const lines = Object.fromEntries(((ev && ev.lines) || []).map(l => [l.no, l]));
      const ms = months();
      const status = ev ? ev.status : 'BELUM DIBUAT';
      box.append(h('div', { class: 'k-toolbar' }, h('b', {}, `Status: `), badge(status, status === 'DISETUJUI' ? 'ok' : status === 'DIAJUKAN' ? 'warn' : 'info'),
        ev && ev.approved_by ? h('small', { class: 'k-help' }, `Disetujui ${ev.approved_by} ${fmtDate(ev.approved_at, true)}`) : null));
      const tb = h('tbody'); let lastGrp = '';
      KREF.SMK3_ITEMS.forEach(([grp, no, name, subs]) => {
        if (grp !== lastGrp) { tb.append(h('tr', {}, h('td', { colspan: 17 }, h('b', {}, grp)))); lastGrp = grp; }
        const l = lines[no] || { available: null, implemented: null, note: '', weeks: [] };
        const yn = (f) => h('select', { class: 'k-input', 'data-f': f, disabled: !editable || null, style: { width: '72px' } }, [['', '—'], ['1', 'Ya'], ['0', 'Tidak']].map(([v, t]) => h('option', { value: v, selected: (l[f] === true && v === '1') || (l[f] === false && v === '0') || (l[f] == null && v === '') || null }, t)));
        tb.append(h('tr', { 'data-no': no }, h('td', { class: 'c' }, no), h('td', {}, h('b', {}, name), subs.length ? h('div', { class: 'k-help' }, subs.join('; ')) : null),
          h('td', { class: 'c' }, yn('available')), h('td', { class: 'c' }, yn('implemented')), h('td', {}, h('textarea', { class: 'k-input', rows: 2, 'data-f': 'note', disabled: !editable || null }, l.note || '')),
          ...[1, 2, 3].flatMap(mi => [1, 2, 3, 4].map(w => h('td', { class: 'c' }, h('input', { type: 'checkbox', 'data-w': `${mi}-${w}`, checked: (l.weeks || []).includes(`${mi}-${w}`) || null, disabled: !editable || null }))))));
      });
      box.append(h('div', { class: 'k-table-wrap' }, h('table', { class: 'k-matrix' }, h('thead', {},
        h('tr', {}, h('th', { rowspan: 2 }, 'No'), h('th', { rowspan: 2 }, 'Jenis pemenuhan'), h('th', { rowspan: 2 }, 'Tersedia'), h('th', { rowspan: 2 }, 'Dilaksanakan'), h('th', { rowspan: 2 }, 'Keterangan'), ms.map(m => h('th', { colspan: 4 }, BULAN[m - 1]))),
        h('tr', {}, ms.flatMap(() => [1, 2, 3, 4].map(w => h('th', {}, 'W' + w))))), tb)));
      const collect = () => Array.from(tb.querySelectorAll('tr[data-no]')).map(tr => {
        const v = (f) => { const x = tr.querySelector(`[data-f=${f}]`).value; return x === '' ? null : x === '1'; };
        return { no: +tr.dataset.no, available: v('available'), implemented: v('implemented'), note: tr.querySelector('[data-f=note]').value, weeks: Array.from(tr.querySelectorAll('[data-w]:checked')).map(x => x.dataset.w) };
      });
      const save = async (st) => {
        try {
          const row = { unit_id: state.unit, year, quarter: q, lines: collect(), status: st || (ev ? ev.status : 'DRAFT') };
          ev = check(await sb.from('smk3_evaluations').upsert(row, { onConflict: 'unit_id,year,quarter' }).select().single());
          toast('Evaluasi SMK3 tersimpan.', 'success'); draw();
        } catch (e) { toast(e.message, 'error'); }
      };
      const bar = h('div', { class: 'k-toolbar', style: { marginTop: '10px' } });
      if (editable) bar.append(h('button', { class: 'k-btn', onclick: async () => { const ls = await autoFill(); ev = { ...(ev || {}), lines: ls, status: ev ? ev.status : 'DRAFT' }; draw(); toast('Terisi otomatis — tinjau lalu simpan.', 'info'); } }, '⚡ Isi otomatis dari data'),
        h('button', { class: 'k-btn k-btn-primary', onclick: () => save() }, 'Simpan'),
        (!ev || ev.status === 'DRAFT') ? h('button', { class: 'k-btn', onclick: () => save('DIAJUKAN') }, 'Simpan & ajukan ke GM') : null);
      if (ev && ev.id && ev.status === 'DIAJUKAN' && can('SMK3', 'A')) bar.append(h('button', { class: 'k-btn k-btn-success', onclick: async () => { try { check(await sb.from('smk3_evaluations').update({ status: 'DISETUJUI', approved_by: myName(), approved_at: new Date().toISOString() }).eq('id', ev.id)); toast('Disetujui.', 'success'); load(); } catch (e) { toast(e.message, 'error'); } } }, 'Setujui (GM)'),
        h('button', { class: 'k-btn k-btn-danger-o', onclick: async () => { try { check(await sb.from('smk3_evaluations').update({ status: 'DRAFT' }).eq('id', ev.id)); load(); } catch (e) { toast(e.message, 'error'); } } }, 'Kembalikan'));
      bar.append(h('button', { class: 'k-btn', onclick: () => printSmk3(ev ? ev.lines : collect()) }, 'Cetak / PDF'));
      box.append(bar);
      if (ev && ev.id) { const evb = h('div'); box.append(h('div', { class: 'k-form-section' }, 'Lampiran / evidence laporan SMK3'), evb); KEVID.widget(evb, { unit: state.unit, domain: 'K3', module: 'SMK3', entity: 'smk3_evaluations', entityId: ev.id, period: `TW${q}-${year}` }); }
    }
    function printSmk3(ls) {
      const by = Object.fromEntries((ls || []).map(l => [l.no, l])); const ms = months(); const ck = (b) => b ? '√' : '';
      let lastGrp = ''; const rows = [];
      KREF.SMK3_ITEMS.forEach(([grp, no, name, subs]) => {
        if (grp !== lastGrp) { rows.push(h('tr', {}, h('td', { colspan: 19 }, h('b', {}, grp)))); lastGrp = grp; }
        const l = by[no] || {};
        rows.push(h('tr', {}, h('td', { class: 'num' }, no), h('td', {}, name, subs.length ? h('div', {}, subs.map(s => '- ' + s).join('\n')) : null),
          h('td', { class: 'center' }, ck(l.available === true)), h('td', { class: 'center' }, ck(l.available === false)), h('td', { class: 'center' }, ck(l.implemented === true)), h('td', { class: 'center' }, ck(l.implemented === false)),
          h('td', {}, l.note || ''), ...[1, 2, 3].flatMap(mi => [1, 2, 3, 4].map(w => h('td', { class: 'center' }, (l.weeks || []).includes(`${mi}-${w}`) ? '√' : '')))));
      });
      const t = h('table', { class: 'p-table small' }, h('thead', {},
        h('tr', {}, h('th', { rowspan: 3 }, 'NO'), h('th', { rowspan: 3 }, 'JENIS PEMENUHAN'), h('th', { colspan: 2 }, 'DOKUMEN/FASILITAS/KEGIATAN'), h('th', { colspan: 2 }, 'IMPLEMENTASI & PENGAWASAN'), h('th', { rowspan: 3 }, 'KETERANGAN'), h('th', { colspan: 12 }, 'PERIODE PELAKSANAAN')),
        h('tr', {}, h('th', { rowspan: 2 }, 'TERSEDIA'), h('th', { rowspan: 2 }, 'TIDAK TERSEDIA'), h('th', { rowspan: 2 }, 'DILAKSANAKAN'), h('th', { rowspan: 2 }, 'TIDAK DILAKSANAKAN'), ms.map(m => h('th', { colspan: 4 }, BULAN[m - 1].toUpperCase()))),
        h('tr', {}, ms.flatMap(() => [1, 2, 3, 4].map(w => h('th', {}, 'W' + w))))), h('tbody', {}, rows));
      KPRINT.doc({ title: `EVALUASI PERIODIK KEPATUHAN PROGRAM SMK3 TRIWULAN ${ROMAWI[q - 1]} TAHUN ${year}`, landscape: true, sig: 'SMK3', body: t, date: q === 4 ? `${year + 1}-01-05` : `${year}-${pad(q * 3 + 1)}-05` });
    }
    load();
  }
  KKS.register({ id: 'smk3', title: 'Evaluasi SMK3 triwulan', domain: 'K3', icon: '📑', perm: 'SMK3', order: 19, render: smk3Page });

  // ======================= KEGIATAN K3 & RAB =======================
  KKS.register({ id: 'kegiatan-k3', title: 'Kegiatan K3', domain: 'K3', icon: '📅', perm: 'KEGIATAN', order: 20, render: KMOD.activities('K3', 'Kegiatan K3 (Bulan K3, simulasi, rapat tim K3, insiden)') });

  const rabTotal = (lines) => (lines || []).reduce((a, l) => a + (Number(l.volume) || 0) * (Number(l.price) || 0), 0);
  KKS.register({ id: 'rab', title: 'RAB K3', domain: 'K3', icon: '💰', perm: 'SMK3', order: 21, render: KCRUD.page({
    id: 'rab', title: 'Rencana Anggaran Biaya (RAB) K3', table: 'rab', perm: 'SMK3', domain: 'K3', itemName: 'RAB', order: ['year', false], filters: { year: true, yearCol: 'year' },
    intro: 'Kolom: Uraian · Volume · Satuan · Harga → Jumlah otomatis. Kebutuhan dapat dilihat dari APAR (ideal − jumlah), P3K (item kurang), dan APD (ideal − existing).',
    fields: [
      { k: 'year', l: 'Tahun', t: 'number', req: true, def: new Date().getFullYear(), list: true }, { k: 'title', l: 'Judul', req: true, list: true, span: 2 },
      { k: 'status', l: 'Status', t: 'select', opts: ['DRAFT', 'DIAJUKAN', 'DISETUJUI', 'TEREALISASI'], def: 'DRAFT', list: true },
      { k: 'lines', l: 'Rincian', t: 'rows', cols: [{ k: 'group', l: 'Grup (A, B, …)', w: '90px' }, { k: 'description', l: 'Uraian' }, { k: 'volume', l: 'Volume', t: 'number', w: '80px' }, { k: 'unit', l: 'Satuan', w: '80px' }, { k: 'price', l: 'Harga', t: 'number', w: '120px' }] },
      { k: 'total', l: 'Total', form: false, list: true, render: r => fmtRp(r.total) }, { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    beforeSave: (v) => ({ ...v, total: rabTotal(v.lines) }),
    rowActions: [{ label: 'Cetak', run: (r) => {
      const groups = {}; (r.lines || []).forEach(l => { (groups[l.group || '-'] = groups[l.group || '-'] || []).push(l); });
      const rows = []; Object.entries(groups).forEach(([g, ls]) => {
        rows.push(h('tr', {}, h('td', { class: 'center' }, h('b', {}, g)), h('td', { colspan: 5 }, h('b', {}, ls[0].description && g !== '-' ? '' : '')), h('td', {})));
        ls.forEach(l => rows.push(h('tr', {}, h('td', {}), h('td', {}, l.description), h('td', { class: 'center' }, fmtNum(l.volume)), h('td', { class: 'center' }, l.unit), h('td', { class: 'right' }, fmtRp(l.price)), h('td', { class: 'right' }, fmtRp((l.volume || 0) * (l.price || 0))), h('td', {}))));
        rows.push(h('tr', {}, h('td', { colspan: 5, class: 'right' }, h('b', {}, 'Total ' + g)), h('td', { class: 'right' }, h('b', {}, fmtRp(rabTotal(ls)))), h('td', {})));
      });
      rows.push(h('tr', {}, h('td', { colspan: 5, class: 'right' }, h('b', {}, 'TOTAL')), h('td', { class: 'right' }, h('b', {}, fmtRp(r.total))), h('td', {})));
      KPRINT.doc({ title: 'RENCANA ANGGARAN BIAYA ' + r.title.toUpperCase(), unit: r.unit_id, period: 'Tahun ' + r.year, sig: [['Dibuat Oleh,', 'Manager KKS']],
        body: [h('table', { class: 'p-table' }, h('thead', {}, h('tr', {}, ['No', 'Uraian', 'Volume', 'Satuan', 'Harga', 'Jumlah', 'Ket.'].map(x => h('th', {}, x)))), h('tbody', {}, rows)),
          h('p', {}, h('i', {}, 'Terbilang: ' + (KMOD.terbilang(r.total || 0).replace(/\s+/g, ' ').trim() || 'nol') + ' rupiah'))] });
    } }]
  }) });
})();
