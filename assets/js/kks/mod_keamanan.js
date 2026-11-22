/**
 * Domain Keamanan / AVSEC (informasi keamanan sensitif — wajib login, evidence folder Drive terbatas):
 * program pengawasan internal (audit/inspeksi/test 2-bulanan/survey), pelaksanaan + Berita Acara, logbook security,
 * prohibited item, fasilitas keamanan & checklist HHMD, gangguan keamanan, matriks risiko keamanan (A+K+K) & perlakuan.
 */
(() => {
  const { h, sb, check, state, can, today, fmtDate, fmtNum, daysUntil, BULAN, ROMAWI, toast, modal, unitShort, addMonths } = KKS;
  const { badge } = KUI;
  const EV = (module) => ({ domain: 'KEAMANAN', module });

  // ---------- Program pengawasan (grid bulan × minggu) ----------
  async function programPage(c, params, actions) {
    let year = Number(params.year) || new Date().getFullYear();
    const box = h('div');
    const yIn = h('input', { class: 'k-input', type: 'number', value: year, onchange: e => { year = +e.target.value; load(); } });
    c.append(h('div', { class: 'k-intro' }, 'Program Pengawasan Keamanan Penerbangan Internal: Audit 1× (2 tahun sekali internal), Inspeksi 1×, Test 6× (2 bulan sekali), Survey bila ada perubahan Daerah Keamanan. Klik sel untuk menambah rencana; slot otomatis "TERLAKSANA" saat pelaksanaan dicatat.'),
      h('div', { class: 'k-toolbar' }, h('label', { class: 'k-inline' }, 'Tahun ', yIn)), box);
    if (can('SECPROG', 'C')) actions.append(h('button', { class: 'k-btn', onclick: () => genTests() }, '⚡ Buat 6 slot testing (Feb–Des)'));
    actions.append(h('button', { class: 'k-btn', onclick: () => printProgram() }, 'Cetak program'));
    let slots = [];
    async function load() {
      box.innerHTML = '<div class="k-empty">Memuat…</div>';
      slots = check(await KKS.byUnit(sb.from('sec_program_slots').select('*').eq('year', year)).order('month'));
      box.innerHTML = '';
      const units = state.unit === 'ALL' ? state.units.filter(u => slots.some(s => s.unit_id === u.id)) : [KKS.unitById(state.unit)];
      if (!units.length) { box.append(h('div', { class: 'k-empty' }, 'Belum ada program untuk tahun ini.')); }
      units.forEach(u => {
        const t = h('table', { class: 'k-matrix' }, h('thead', {}, h('tr', {}, h('th', {}, 'Kegiatan'), BULAN.map(b => h('th', { colspan: 4 }, b.slice(0, 3)))), h('tr', {}, h('th', {}), Array.from({ length: 12 }).flatMap(() => [1, 2, 3, 4].map(w => h('th', {}, w))))));
        const tb = h('tbody');
        KREF.SEC_KINDS.forEach(kind => tb.append(h('tr', {}, h('th', {}, kind), ...Array.from({ length: 12 }, (_, m) => m + 1).flatMap(m => [1, 2, 3, 4].map(w => {
          const s = slots.find(x => x.unit_id === u.id && x.kind === kind && x.month === m && (x.week || 1) === w);
          return h('td', { class: 'c', style: s ? { background: s.status === 'TERLAKSANA' ? '#86efac' : s.status === 'BATAL' ? '#e2e8f0' : '#bfdbfe', cursor: 'pointer' } : { cursor: can('SECPROG', 'C', u.id) ? 'pointer' : 'default' },
            title: s ? `${s.title || kind} — ${s.status}` : '', onclick: () => s ? slotMenu(s) : (can('SECPROG', 'C', u.id) && addSlot(u.id, kind, m, w)) }, s ? (s.status === 'TERLAKSANA' ? '✓' : '●') : '');
        })))));
        t.append(tb);
        box.append(h('div', { class: 'k-panel' }, h('h3', {}, u.name), h('div', { class: 'k-table-wrap' }, t), h('p', { class: 'k-help' }, '● rencana · ✓ terlaksana · abu-abu batal')));
      });
    }
    async function addSlot(unit, kind, month, week) {
      try { check(await sb.from('sec_program_slots').insert({ unit_id: unit, year, kind, month, week, title: kind === 'TEST' ? 'Pengujian/Testing Keamanan Penerbangan Internal' : kind })); load(); } catch (e) { toast(e.message, 'error'); }
    }
    function slotMenu(s) {
      const m = modal({ title: `${s.kind} — ${BULAN[s.month - 1]} minggu ${s.week || 1} (${unitShort(s.unit_id)})`, body: h('div', {}, h('p', {}, `Status: ${s.status}`)),
        footer: [
          s.status === 'RENCANA' && can('SECPROG', 'C', s.unit_id) ? h('button', { class: 'k-btn k-btn-primary', onclick: () => { m.close(); KCRUD.openForm(actDef, null, { unit_id: s.unit_id, slot_id: s.id, kind: s.kind, date: `${year}-${String(s.month).padStart(2, '0')}-${String(Math.min(28, (s.week || 1) * 7 - 6)).padStart(2, '0')}` }).then(load); } }, 'Catat pelaksanaan') : null,
          can('SECPROG', 'U', s.unit_id) && s.status !== 'BATAL' ? h('button', { class: 'k-btn', onclick: async () => { await sb.from('sec_program_slots').update({ status: 'BATAL' }).eq('id', s.id); m.close(); load(); } }, 'Batalkan') : null,
          can('SECPROG', 'D', s.unit_id) ? h('button', { class: 'k-btn k-btn-danger-o', onclick: async () => { try { check(await sb.from('sec_program_slots').delete().eq('id', s.id)); m.close(); load(); } catch (e) { toast(e.message, 'error'); } } }, 'Hapus slot') : null] });
    }
    async function genTests() {
      if (state.unit === 'ALL') return toast('Pilih satu lokasi dulu.', 'warning');
      const add = [2, 4, 6, 8, 10, 12].filter(m => !slots.some(s => s.unit_id === state.unit && s.kind === 'TEST' && s.month === m)).map(m => ({ unit_id: state.unit, year, kind: 'TEST', month: m, week: 2, title: 'Pengujian/Testing Keamanan Penerbangan Internal' }));
      if (!add.length) return toast('Slot testing sudah lengkap.', 'info');
      try { check(await sb.from('sec_program_slots').insert(add)); toast(`${add.length} slot testing dibuat.`, 'success'); load(); } catch (e) { toast(e.message, 'error'); }
    }
    function printProgram() {
      const u = state.unit === 'ALL' ? 'TRK' : state.unit;
      const head = [h('tr', {}, h('th', { rowspan: 2 }, 'Kegiatan'), h('th', { rowspan: 2 }, 'Frek.'), BULAN.map(b => h('th', { colspan: 4 }, b.toUpperCase()))), h('tr', {}, Array.from({ length: 12 }).flatMap(() => ['I', 'II', 'III', 'IV'].map(w => h('th', {}, w))))];
      const body = h('table', { class: 'p-table small' }, h('thead', {}, head), h('tbody', {}, ['AUDIT', 'INSPEKSI', 'TEST', 'SURVEY'].map(kind => {
        const ss = slots.filter(s => s.unit_id === u && s.kind === kind && s.status !== 'BATAL');
        return h('tr', {}, h('td', {}, kind === 'TEST' ? 'Pengujian (test)' : kind[0] + kind.slice(1).toLowerCase()), h('td', { class: 'center' }, ss.length), ...Array.from({ length: 12 }, (_, m) => m + 1).flatMap(m => [1, 2, 3, 4].map(w => { const s = ss.find(x => x.month === m && (x.week || 1) === w); return h('td', { class: 'center', style: s ? { background: '#bfdbfe' } : null }, s ? (s.status === 'TERLAKSANA' ? '√' : '') : ''); })));
      })));
      KPRINT.doc({ title: `PROGRAM PENGAWASAN KEAMANAN PENERBANGAN INTERNAL TAHUN ${year}`, unit: u, landscape: true, sig: [['Dibuat oleh,', 'Manager KKS'], ['Disetujui,', 'General Manager']], body: [body, h('p', {}, 'Audit: 2 tahun sekali (internal) · Inspeksi: berdasarkan program/penilaian risiko · Test: 2 bulan sekali · Survey: jika ada perubahan/penambahan Daerah Keamanan.')] });
    }
    load();
  }
  KKS.register({ id: 'sec-program', title: 'Program pengawasan keamanan', domain: 'KEAMANAN', icon: '🛡️', perm: 'SECPROG', order: 60, render: programPage });

  // ---------- Pelaksanaan testing/inspeksi/audit + BA ----------
  const actDef = {
    id: 'sec-kegiatan', title: 'Pelaksanaan pengawasan keamanan', table: 'sec_activities', perm: 'SECPROG', domain: 'KEAMANAN', itemName: 'pelaksanaan', order: ['date', false],
    filters: { year: true, yearDate: 'date' }, evidence: EV('SECPROG'), rowLabel: r => `${r.kind} ${fmtDate(r.date)}`,
    intro: 'Catat hasil testing/inspeksi/audit/survey: objek & skenario, metode, hasil, temuan, rekomendasi, inspektur. Sistem mencetak Berita Acara & lembar lampiran; temuan otomatis masuk modul Temuan (bidang KMP).',
    fields: [
      { k: 'slot_id', l: 'Slot program', t: 'ref', ref: { table: 'sec_program_slots', label: r => `${r.year} ${r.kind} ${BULAN[r.month - 1]} mg ${r.week || 1} (${r.status})`, order: ['month', true] } },
      { k: 'kind', l: 'Jenis', t: 'select', opts: KREF.SEC_KINDS, req: true, list: true }, { k: 'date', l: 'Tanggal', t: 'date', def: 'today', req: true, list: true },
      { k: 'objects', l: 'Objek / lokasi', t: 'textarea', list: true, cls: 'wrap' }, { k: 'scenario', l: 'Skenario', t: 'textarea' }, { k: 'method', l: 'Metode', t: 'textarea' },
      { k: 'result', l: 'Hasil', t: 'select', opts: ['BERHASIL (sesuai prosedur)', 'GAGAL (tidak sesuai prosedur)', 'SESUAI', 'TIDAK SESUAI', 'LAINNYA'], list: true },
      { k: 'findings_count', l: 'Jumlah temuan', t: 'number', def: 0, list: true }, { k: 'recommendation', l: 'Temuan & rekomendasi (satu temuan per baris)', t: 'textarea' },
      { k: 'ba_number', l: 'Nomor Berita Acara', list: true, ph: 'BAC.0xx/B/24.01/LPPNPI/KMP.02/<romawi>/<tahun>' },
      { k: 'inspectors', l: 'Inspektur', t: 'textarea' }, { k: 'participants', l: 'Peserta / personel yang diuji', t: 'textarea' }, { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    onSaved: async (r, isNew) => {
      if (r.findings_count > 0 && r.recommendation) {
        const lines = r.recommendation.split('\n').map(s => s.trim()).filter(Boolean);
        let n = 0;
        for (const [i, line] of lines.entries()) { const f = await KMOD.createFinding({ unit_id: r.unit_id, source: 'Testing Keamanan', field: 'KMP', protocol_item: `${r.kind} ${r.date} #${i + 1}`, finding: line, pic: 'Manager KKS', target_date: addMonths(r.date, 2), source_module: 'sec_activities', source_id: r.id }); if (f) n++; }
        if (n) toast(`${n} temuan tercatat di modul Temuan.`, 'info');
      }
    },
    rowActions: [{ label: 'Cetak BA', run: r => printBA(r) }]
  };
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function printBA(r) {
    const d = new Date(r.date + 'T00:00');
    const KIND = { TEST: 'PENGUJIAN/TESTING', AUDIT: 'AUDIT', INSPEKSI: 'INSPEKSI', SURVEY: 'SURVEY', DST: 'DUTY SECURITY TRAINING', 'TABLE TOP': 'TABLE TOP EXERCISE', AWARENESS: 'SECURITY AWARENESS' }[r.kind] || r.kind;
    KPRINT.doc({ title: `BERITA ACARA ${KIND} KEAMANAN PENERBANGAN INTERNAL`, unit: r.unit_id, subtitle: `${KKS.unitName(r.unit_id)}\nNOMOR: ${r.ba_number || '……………………'}`, date: r.date, sig: 'BA',
      body: [h('p', {}, `Pada hari ini ${HARI[d.getDay()]} tanggal ${KKS.fmtDateLong(r.date)} telah dilaksanakan ${KIND.toLowerCase()} keamanan penerbangan internal di ${KKS.unitName(r.unit_id)} oleh Personel Keamanan Penerbangan Internal dengan rincian sebagai berikut:`),
        h('table', { class: 'p-kv' }, ...[['Objek / lokasi', r.objects], ['Skenario', r.scenario], ['Metode', r.method], ['Hasil', r.result], ['Jumlah temuan', r.findings_count], ['Temuan & rekomendasi', r.recommendation], ['Inspektur', r.inspectors], ['Peserta', r.participants]].map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, ': ' + (v ?? '-'))))),
        h('p', {}, 'Demikian Berita Acara ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.')] });
  }
  KKS.register({ id: 'sec-kegiatan', title: 'Testing / inspeksi / audit', domain: 'KEAMANAN', icon: '🔐', perm: 'SECPROG', order: 61, render: KCRUD.page(actDef) });

  // ---------- Logbook & prohibited item ----------
  KKS.register({ id: 'sec-logbook', title: 'Logbook security', domain: 'KEAMANAN', icon: '📓', perm: 'SECLOG', order: 62, render: KCRUD.page({
    id: 'sec-logbook', title: 'Logbook security', table: 'sec_logbook', perm: 'SECLOG', domain: 'KEAMANAN', itemName: 'catatan logbook', order: ['at', false], filters: { period: 'at' }, evidence: EV('SECLOG'),
    fields: [{ k: 'post', l: 'Pos', t: 'list', opts: ['Gedung Tower', 'Gedung APP/Admin', 'Pos GT', 'Pos GR'], def: 'Gedung Tower', req: true, list: true },
      { k: 'at', l: 'Waktu', t: 'datetime', req: true, list: true }, { k: 'shift', l: 'Shift', t: 'select', opts: ['Pagi', 'Siang', 'Malam'], list: true },
      { k: 'entry', l: 'Catatan kejadian / aktivitas', t: 'textarea', req: true, list: true, cls: 'wrap' }, { k: 'officer', l: 'Petugas', def: () => (state.profile || {}).full_name, list: true }],
    presets: () => ({ at: new Date().toISOString() }),
    print: { title: 'LAPORAN SECURITY', sig: 'KEAMANAN' }
  }) });
  KKS.register({ id: 'prohibited', title: 'Logbook prohibited item', domain: 'KEAMANAN', icon: '🚫', perm: 'SECLOG', order: 63, render: KCRUD.page({
    id: 'prohibited', title: 'Log book prohibited item — Daerah Keamanan Terkendali', table: 'prohibited_items', perm: 'SECLOG', domain: 'KEAMANAN', itemName: 'catatan prohibited item', order: ['date', false, 'time_in', false], filters: { period: 'date' },
    fields: [{ k: 'date', l: 'Tanggal', t: 'date', def: 'today', req: true, list: true }, { k: 'time_in', l: 'Jam masuk', t: 'time', list: true }, { k: 'time_out', l: 'Jam keluar', t: 'time', list: true },
      { k: 'person', l: 'Nama personel', req: true, list: true }, { k: 'activity', l: 'Kegiatan', list: true },
      { k: 'item_in', l: 'Prohibited item MASUK (uraian)', list: true }, { k: 'qty_in', l: 'Jml masuk', t: 'number', list: true }, { k: 'item_out', l: 'Prohibited item KELUAR (uraian)', list: true }, { k: 'qty_out', l: 'Jml keluar', t: 'number', list: true },
      { k: 'note', l: 'Keterangan', t: 'textarea', list: true }],
    print: { title: 'LOG BOOK PROHIBITED ITEM DAERAH KEAMANAN TERKENDALI', sig: 'KEAMANAN', landscape: true }
  }) });

  // ---------- Fasilitas & HHMD ----------
  KKS.register({ id: 'sec-fasilitas', title: 'Fasilitas keamanan', domain: 'KEAMANAN', icon: '📹', perm: 'SECFAC', order: 64, render: KCRUD.page({
    id: 'sec-fasilitas', title: 'Fasilitas keamanan', table: 'sec_facilities', perm: 'SECFAC', domain: 'KEAMANAN', itemName: 'fasilitas', order: ['kind', true], evidence: EV('SECFAC'), rowLabel: r => `${r.kind} ${r.brand_type || ''}`,
    rowClass: r => r.cert_until && daysUntil(r.cert_until) < 0 ? 'row-danger' : '',
    fields: [{ k: 'kind', l: 'Peralatan', t: 'list', opts: KREF.SEC_FAC_KINDS, req: true, list: true }, { k: 'brand_type', l: 'Merk / type', list: true }, { k: 'serial', l: 'No. seri' },
      { k: 'year_acq', l: 'Tahun perolehan', t: 'number', list: true }, { k: 'qty', l: 'Jumlah', t: 'number', def: 1, list: true },
      { k: 'cert_from', l: 'Sertifikasi mulai', t: 'date' }, { k: 'cert_until', l: 'Sertifikasi akhir', t: 'date', list: true }, { k: 'condition', l: 'Kondisi', t: 'list', opts: ['Baik', 'Rusak ringan', 'Rusak berat', 'Tidak ada'], list: true },
      { k: 'location', l: 'Lokasi', list: true }, { k: 'note', l: 'Keterangan', t: 'textarea' }],
    rowActions: [{ label: 'Checklist HHMD', show: r => r.kind === 'HHMD', run: r => KKS.go('hhmd', { facility: r.id }) }],
    print: { title: 'DATA FASILITAS KEAMANAN', sig: 'KEAMANAN' }
  }) });
  KKS.register({ id: 'hhmd', title: 'Checklist HHMD', domain: 'KEAMANAN', icon: '🔦', perm: 'SECFAC', order: 65, render: (c, p, a) => KCRUD.page({
    id: 'hhmd', title: 'Checklist pengujian & pemeliharaan HHMD', table: 'hhmd_checks', perm: 'SECFAC', domain: 'KEAMANAN', itemName: 'checklist HHMD', order: ['date', false], filters: { period: 'date' },
    select: '*, sec_facilities(kind, brand_type, location)', query: q => p.facility ? q.eq('facility_id', p.facility) : q, presets: () => p.facility ? { facility_id: p.facility } : {},
    intro: 'Format FKP-P3UK-3: kriteria utama & penunjang, kesimpulan terpenuhi/tidak, petugas pagi/malam, diketahui MKKS.',
    fields: [
      { k: 'facility_id', l: 'HHMD', t: 'ref', req: true, ref: { table: 'sec_facilities', label: r => `${r.kind} ${r.brand_type || ''} — ${r.location || ''}`, filter: q => q.eq('kind', 'HHMD') }, list: true, render: r => r.sec_facilities ? `${r.sec_facilities.brand_type || 'HHMD'} — ${r.sec_facilities.location || ''}` : '' },
      { k: 'date', l: 'Tanggal', t: 'date', def: 'today', req: true, list: true }, { k: 'kind', l: 'Jenis', t: 'select', opts: ['HARIAN', 'MINGGUAN', 'BULANAN', 'TRIWULAN', 'SEMESTER', 'TAHUNAN'], def: 'HARIAN', list: true },
      { k: 'items', l: 'Item yang berfungsi baik', t: 'multi', opts: KREF.HHMD_ITEMS, form: true, list: true, render: r => `${Array.isArray(r.items) ? r.items.length : 0}/${KREF.HHMD_ITEMS.length}` },
      { k: 'conclusion', l: 'Kesimpulan', t: 'select', opts: ['TERPENUHI', 'TIDAK TERPENUHI'], list: true, render: r => r.conclusion ? badge(r.conclusion, r.conclusion === 'TERPENUHI' ? 'ok' : 'bad') : '' },
      { k: 'shift', l: 'Shift', t: 'select', opts: ['Pagi', 'Malam'] }, { k: 'officer', l: 'Petugas', def: () => (state.profile || {}).full_name, list: true }, { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    beforeSave: (v) => { if (!v.conclusion) v.conclusion = (v.items || []).length === KREF.HHMD_ITEMS.length ? 'TERPENUHI' : 'TIDAK TERPENUHI'; return v; },
    print: { title: 'CHECKLIST PENGUJIAN HARIAN HHMD', sig: 'KEAMANAN' }
  })(c, p, a) });

  // ---------- Gangguan keamanan ----------
  KKS.register({ id: 'sec-gangguan', title: 'Gangguan keamanan', domain: 'KEAMANAN', icon: '🚨', perm: 'SECINC', order: 66, render: KCRUD.page({
    id: 'sec-gangguan', title: 'Laporan gangguan keamanan', table: 'sec_incidents', perm: 'SECINC', domain: 'KEAMANAN', itemName: 'gangguan keamanan', order: ['date', false], filters: { year: true, yearDate: 'date' },
    evidence: EV('SECINC'), rowLabel: r => r.kind,
    fields: [{ k: 'date', l: 'Tanggal kejadian', t: 'date', def: 'today', req: true, list: true }, { k: 'location', l: 'Lokasi kejadian', list: true },
      { k: 'service', l: 'Pelayanan navigasi', t: 'select', opts: ['TWR', 'APP', 'AFIS', 'TIBA'], list: true }, { k: 'kind', l: 'Jenis gangguan', t: 'list', opts: KREF.SEC_INCIDENT_KINDS, req: true, list: true },
      { k: 'chronology', l: 'Kronologi singkat', t: 'textarea', list: true, cls: 'wrap' }, { k: 'risk_code', l: 'ID risk', list: true }, { k: 'follow_up', l: 'Tindak lanjut', t: 'textarea' }, { k: 'reporter', l: 'Pelapor', def: () => (state.profile || {}).full_name }],
    print: { title: 'REKAP GANGGUAN KEAMANAN', sig: 'KEAMANAN', landscape: true }
  }) });

  // ---------- Matriks risiko keamanan ----------
  const slBadge = (l) => l ? h('span', { class: 'k-badge sl-' + l }, l) : '';
  KKS.register({ id: 'sec-risiko', title: 'Matriks risiko keamanan', domain: 'KEAMANAN', icon: '🎯', perm: 'SECRISK', order: 67, render: KCRUD.page({
    id: 'sec-risiko', title: 'Matriks daftar risiko keamanan', table: 'sec_risk_assessments', perm: 'SECRISK', domain: 'KEAMANAN', itemName: 'penilaian risiko', order: ['total', false], filters: { year: true, yearCol: 'year' },
    evidence: EV('SECRISK'), rowLabel: r => r.code || r.scenario.slice(0, 40),
    intro: 'Risiko = Ancaman + Kerentanan + Konsekuensi (masing-masing 1–10). 26–30 Tinggi · 20–25 Menengah-Tinggi (tidak dapat ditoleransi) · 14–19 Menengah (ALARP) · 8–13 Menengah-Rendah · 3–7 Rendah (dapat ditoleransi).',
    rowClass: r => r.total >= 20 ? 'row-danger' : r.total >= 14 ? 'row-warn' : '',
    fields: [
      { k: 'year', l: 'Tahun', t: 'number', req: true, def: new Date().getFullYear(), list: true }, { k: 'code', l: 'ID risk', list: true },
      { k: 'scenario_group', l: 'Kelompok skenario', t: 'list', opts: ['I Keamanan sisi darat', 'II Penumpang & bagasi kabin', 'III Kargo & pos', 'IV Fasilitas navigasi', 'V Siber', 'Lainnya'] },
      { k: 'scenario', l: 'Skenario ancaman', t: 'textarea', req: true, list: true, cls: 'wrap' }, { k: 'area', l: 'Area kerentanan', list: true },
      { k: 'current_measures', l: 'Langkah keamanan saat ini', t: 'textarea' }, { k: 'vulnerability_now', l: 'Kerentanan saat ini', t: 'textarea' },
      { k: 'threat', l: 'Ancaman (1–10)', t: 'number', min: 1, max: 10, req: true }, { k: 'vulnerability', l: 'Kerentanan (1–10)', t: 'number', min: 1, max: 10, req: true }, { k: 'consequence', l: 'Konsekuensi (1–10)', t: 'number', min: 1, max: 10, req: true },
      { k: 'total', l: 'Risiko', form: false, list: true, render: r => h('span', {}, h('b', {}, `${r.threat}+${r.vulnerability}+${r.consequence} = ${r.total}`), ' ', slBadge(r.level)) },
      { k: 'acceptance', l: 'Penerimaan', form: false, list: true },
      { k: 'extra_measures', l: 'Langkah keamanan tambahan', t: 'textarea' }, { k: 'owner', l: 'Pemilik risiko', t: 'list', opts: KREF.PIC_LIST, list: true }, { k: 'review_date', l: 'Tanggal kaji ulang', t: 'date' },
      { k: 'treatments', l: 'Rencana perlakuan', t: 'rows', cols: [{ k: 'priority', l: 'Prioritas', w: '80px' }, { k: 'action', l: 'Tindakan', t: 'textarea' }, { k: 'owner', l: 'PJ' }, { k: 'target', l: 'Target', t: 'date' }, { k: 'resources', l: 'Sumber daya' }, { k: 'note', l: 'Ket.' }] },
      { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    headerActions: [{ label: 'Cetak matriks & perlakuan', run: ({ rows }) => KPRINT.doc({ title: 'MATRIKS DAFTAR RISIKO KEAMANAN', landscape: true, sig: [['Dibuat oleh,', 'Manager KKS'], ['Mengetahui,', 'General Manager']],
      body: [KPRINT.tableNode([{ l: 'ID Risk', v: r => r.code || '' }, { l: 'Skenario ancaman', v: r => r.scenario }, { l: 'Area', v: r => r.area || '' }, { l: 'Langkah saat ini', v: r => r.current_measures || '' }, { l: 'A', v: r => r.threat, cls: 'center' }, { l: 'K', v: r => r.vulnerability, cls: 'center' }, { l: 'K', v: r => r.consequence, cls: 'center' }, { l: 'Nilai', v: r => r.total, cls: 'center' }, { l: 'Tingkat', v: r => r.level }, { l: 'Penerimaan', v: r => r.acceptance }, { l: 'Langkah tambahan', v: r => r.extra_measures || '' }, { l: 'Pemilik', v: r => r.owner || '' }, { l: 'Kaji ulang', v: r => fmtDate(r.review_date) }], rows(), { small: true }),
        h('h4', {}, 'Rencana perlakuan'), KPRINT.tableNode([{ l: 'ID Risk', v: x => x.code }, { l: 'Prioritas', v: x => x.priority }, { l: 'Tindakan', v: x => x.action }, { l: 'PJ', v: x => x.owner }, { l: 'Target', v: x => fmtDate(x.target) }, { l: 'Sumber daya', v: x => x.resources }], rows().flatMap(r => (r.treatments || []).map(t => ({ ...t, code: r.code || '' }))), { small: true })] }) }]
  }) });

  KKS.register({ id: 'kegiatan-keamanan', title: 'DST, table top & awareness', domain: 'KEAMANAN', icon: '🎓', perm: 'KEGIATAN', order: 68, render: KMOD.activities('KEAMANAN', 'Kegiatan keamanan (DST, table top, security awareness, rapat komite)') });
})();
