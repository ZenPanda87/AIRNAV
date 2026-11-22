/**
 * Domain Pengawasan & Tindak Lanjut: kegiatan pengawasan (DNP, KOBU VII, Dirkampen, SPI, internal),
 * temuan & CAP (siklus OPEN → IN PROGRESS → PROPOSED CLOSED → CLOSED, overdue otomatis, perpanjangan),
 * program kerja KKS tahunan (rencana & realisasi per minggu).
 */
(() => {
  const { h, sb, check, state, can, today, fmtDate, fmtNum, daysUntil, BULAN, toast, modal, confirmBox, unitShort, pad } = KKS;
  const { badge } = KUI;

  // ---------- Kegiatan pengawasan ----------
  KKS.register({ id: 'pengawasan', title: 'Kegiatan pengawasan', domain: 'PENGAWASAN', icon: '🔎', perm: 'TEMUAN', order: 30, render: KCRUD.page({
    id: 'pengawasan', title: 'Kegiatan pengawasan', table: 'oversight_events', perm: 'TEMUAN', domain: 'PENGAWASAN', itemName: 'kegiatan pengawasan', order: ['start_date', false],
    filters: { year: true, yearDate: 'start_date' }, evidence: { domain: 'PENGAWASAN', module: 'TEMUAN' }, rowLabel: r => r.title,
    intro: 'Audit / inspeksi / monitoring dari regulator (DNP, KOBU VII, Dirkampen), SPI, maupun internal (SMK3, keselamatan, kampen, RSA). Laporan hasil disimpan sebagai evidence; temuannya dicatat per PQ.',
    fields: [
      { k: 'organizer', l: 'Penyelenggara', t: 'list', opts: KREF.ORGANIZERS, req: true, list: true }, { k: 'kind', l: 'Jenis', t: 'select', opts: KREF.OVERSIGHT_KINDS, def: 'Audit', list: true },
      { k: 'title', l: 'Judul kegiatan', req: true, list: true, span: 2, cls: 'wrap' }, { k: 'number', l: 'Nomor laporan/surat' },
      { k: 'start_date', l: 'Mulai', t: 'date', list: true }, { k: 'end_date', l: 'Selesai', t: 'date' },
      { k: 'unit_list', l: 'Lokasi yang diperiksa', t: 'multi', opts: () => state.units.map(u => [u.id, u.short_name]), list: true, render: r => (r.unit_list || []).join(', ') },
      { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    rowActions: [{ label: 'Temuan', run: (r) => KKS.go('temuan', { event: r.id }) }]
  }) });

  // ---------- Temuan & CAP ----------
  const target = (r) => r.target_date_new || r.target_date;
  const isOverdue = (r) => r.status !== 'CLOSED' && target(r) && target(r) < today();
  const statusView = (r) => isOverdue(r) ? 'OVERDUE' : r.status;
  const ST_CLS = { OPEN: 'bad', 'IN PROGRESS': 'warn', 'PROPOSED CLOSED': 'info', CLOSED: 'ok', OVERDUE: 'ext' };
  async function addUpdate(r, kind, reload) {
    const prog = h('textarea', { class: 'k-input', rows: 3, placeholder: 'Uraian progres / tindak lanjut' });
    const pct = h('input', { class: 'k-input', type: 'number', min: 0, max: 100, value: kind === 'CLOSE' || kind === 'USUL CLOSE' ? 100 : (r.progress_pct || 0) });
    const nt = h('input', { class: 'k-input', type: 'date' });
    const dt = h('input', { class: 'k-input', type: 'date', value: today() });
    const save = h('button', { class: 'k-btn k-btn-primary' }, 'Simpan');
    const TITLE = { PROGRES: 'Perbarui progres', PERPANJANGAN: 'Ajukan perpanjangan target', 'USUL CLOSE': 'Usulkan status CLOSED', CLOSE: 'Tetapkan CLOSED' };
    const m = modal({ title: TITLE[kind], wide: true, body: h('div', {}, h('p', { class: 'k-help' }, r.finding),
      h('div', { class: 'k-form' }, h('label', { class: 'k-field' }, h('span', {}, 'Tanggal'), dt), h('label', { class: 'k-field' }, h('span', {}, 'Progres (%)'), pct),
        kind === 'PERPANJANGAN' ? h('label', { class: 'k-field' }, h('span', {}, 'Target baru'), nt) : null,
        h('label', { class: 'k-field span-full' }, h('span', {}, kind === 'PERPANJANGAN' ? 'Justifikasi / nomor surat perpanjangan' : 'Uraian'), prog)),
      h('p', { class: 'k-help' }, 'Evidence (foto/dokumen) dapat ditambahkan lewat tombol "Ubah" pada temuan.')),
      footer: [h('button', { class: 'k-btn', onclick: () => m.close() }, 'Batal'), save] });
    save.onclick = async () => {
      if (kind === 'PERPANJANGAN' && !nt.value) return toast('Isi target baru.', 'error');
      try {
        save.disabled = true;
        check(await sb.from('finding_updates').insert({ unit_id: r.unit_id, finding_id: r.id, date: dt.value, kind, progress: prog.value || null, progress_pct: pct.value === '' ? null : +pct.value, new_target: nt.value || null, by_name: (state.profile || {}).full_name }));
        if (kind === 'PERPANJANGAN' && prog.value) await sb.from('findings').update({ justification: prog.value }).eq('id', r.id);
        toast('Tersimpan.', 'success'); m.close(); reload();
      } catch (e) { toast(e.message, 'error'); save.disabled = false; }
    };
  }
  async function history(r) {
    const ups = check(await sb.from('finding_updates').select('*').eq('finding_id', r.id).order('date'));
    modal({ title: 'Riwayat tindak lanjut', wide: true, body: h('div', {}, h('p', {}, h('b', {}, r.pq_no || ''), ' ', r.finding),
      ups.length ? h('table', { class: 'k-table' }, h('thead', {}, h('tr', {}, ['Tanggal', 'Jenis', 'Progres', '%', 'Target baru', 'Oleh'].map(x => h('th', {}, x)))),
        h('tbody', {}, ups.map(u => h('tr', {}, h('td', {}, fmtDate(u.date)), h('td', {}, badge(u.kind, 'info')), h('td', { class: 'wrap' }, u.progress || ''), h('td', {}, u.progress_pct ?? ''), h('td', {}, fmtDate(u.new_target)), h('td', {}, u.by_name || '')))))
        : h('p', { class: 'k-help' }, 'Belum ada pembaruan.')) });
  }
  function temuanPage(c, params, actions) {
    return KCRUD.page({
      id: 'temuan', title: 'Temuan & tindak lanjut (CAP)', table: 'findings', perm: 'TEMUAN', domain: 'PENGAWASAN', itemName: 'temuan', order: ['status', true, 'target_date', true],
      select: '*, oversight_events(title, organizer)',
      query: (q) => params.event ? q.eq('event_id', params.event) : q,
      presets: () => params.event ? { event_id: params.event } : {},
      filters: { status: { label: 'Status', opts: ['OPEN', 'IN PROGRESS', 'PROPOSED CLOSED', 'CLOSED', 'OVERDUE'], get: statusView } },
      evidence: { domain: 'PENGAWASAN', module: 'TEMUAN', period: r => String(r.year || new Date().getFullYear()) }, rowLabel: r => r.pq_no || r.finding.slice(0, 40),
      intro: 'Status: OPEN → IN PROGRESS (otomatis saat ada progres) → PROPOSED CLOSED → CLOSED. OVERDUE otomatis bila lewat target (awal/perubahan). Temuan dari APAR rusak, skor safety patrol ≤ 2, dan hasil testing keamanan masuk otomatis.',
      rowClass: r => isOverdue(r) ? 'row-danger' : r.status === 'CLOSED' ? 'row-ok' : '',
      fields: [
        { k: 'event_id', l: 'Kegiatan pengawasan', t: 'ref', ref: { table: 'oversight_events', anyUnit: true, label: r => `${r.organizer} — ${r.title}`, order: ['start_date', false] }, list: false, csv: true, render: r => r.oversight_events ? `${r.oversight_events.organizer} — ${r.oversight_events.title}` : '' },
        { k: 'source', l: 'Sumber', t: 'list', opts: KREF.ORGANIZERS.concat(['Safety Patrol', 'Pemeriksaan APAR', 'Testing Keamanan']), list: true, render: r => r.source || (r.oversight_events || {}).organizer || '' },
        { k: 'year', l: 'Tahun', t: 'number', def: new Date().getFullYear() }, { k: 'field', l: 'Bidang', t: 'select', opts: KREF.FIELDS, list: true },
        { k: 'pq_no', l: 'No. PQ', list: true }, { k: 'regulation_ref', l: 'Referensi regulasi' }, { k: 'protocol_item', l: 'Protocol item' },
        { k: 'finding', l: 'Temuan yang harus ditindaklanjuti', t: 'textarea', req: true, list: true, cls: 'wrap' }, { k: 'recommendation', l: 'Rekomendasi', t: 'textarea' },
        { k: 'risk_index', l: 'Risk index', ph: 'mis. 3D' }, { k: 'cap', l: 'Corrective Action Plan (CAP)', t: 'textarea', list: true, cls: 'wrap' },
        { k: 'pic', l: 'PIC', t: 'list', opts: KREF.PIC_LIST, list: true },
        { k: 'target_date', l: 'Target date awal', t: 'date' }, { k: 'target_date_new', l: 'Target date perubahan', t: 'date' },
        { k: '_target', l: 'Target', form: false, list: true, render: r => target(r) ? h('span', {}, fmtDate(target(r)), r.target_date_new ? ' (perp.)' : '', r.status !== 'CLOSED' && daysUntil(target(r)) >= 0 && daysUntil(target(r)) <= 30 ? h('small', { class: 'k-help' }, ` · ${daysUntil(target(r))} hari`) : '') : '' },
        { k: 'progress_pct', l: 'Progres (%)', t: 'number', min: 0, max: 100, list: true, render: r => h('div', { title: r.progress || '' }, h('div', { class: 'bar' }, h('i', { style: { width: (r.progress_pct || 0) + '%' } })), h('small', {}, (r.progress_pct || 0) + '%')) },
        { k: 'progress', l: 'Progres s.d. saat ini', t: 'textarea' }, { k: 'justification', l: 'Justifikasi belum selesai', t: 'textarea' },
        { k: 'status', l: 'Status', t: 'select', opts: ['OPEN', 'IN PROGRESS', 'PROPOSED CLOSED', 'CLOSED'], def: 'OPEN', list: true, render: r => badge(statusView(r), ST_CLS[statusView(r)]) },
        { k: 'regulator_status', l: 'Status di dashboard regulator' }, { k: 'closed_at', l: 'Tanggal closed', t: 'date' }, { k: 'note', l: 'Keterangan', t: 'textarea' }
      ],
      rowActions: [
        { label: 'Progres', perm: 'U', show: r => r.status !== 'CLOSED', run: (r, rl) => addUpdate(r, 'PROGRES', rl) },
        { label: 'Perpanjang', perm: 'U', show: r => r.status !== 'CLOSED', run: (r, rl) => addUpdate(r, 'PERPANJANGAN', rl) },
        { label: 'Usul close', perm: 'U', show: r => ['OPEN', 'IN PROGRESS'].includes(r.status), run: (r, rl) => addUpdate(r, 'USUL CLOSE', rl) },
        { label: 'Close', perm: 'A', cls: 'k-btn-success', show: r => r.status === 'PROPOSED CLOSED', run: (r, rl) => addUpdate(r, 'CLOSE', rl) },
        { label: 'Riwayat', run: r => history(r) }
      ],
      headerActions: [{ label: 'Cetak Matriks Progres Tindak Lanjut', run: ({ rows }) => KPRINT.table({
        title: 'MATRIKS PROGRES PEMENUHAN TINDAK LANJUT TEMUAN', landscape: true, small: true, sig: 'PENGAWASAN', rows: rows(),
        cols: [{ l: 'Area', v: r => r.field || '' }, { l: 'Sumber', v: r => r.source || (r.oversight_events || {}).organizer || '' }, { l: 'No. PQ', v: r => r.pq_no || '' }, { l: 'Temuan', v: r => r.finding },
          { l: 'Corrective Actions Plan (CAP)', v: r => r.cap || '' }, { l: 'Target Waktu Pemenuhan', v: r => fmtDate(target(r)) + (r.target_date_new ? ` (awal ${fmtDate(r.target_date)})` : '') },
          { l: 'Progres Pemenuhan', v: r => `${r.progress_pct || 0}% ${r.progress || ''}` }, { l: 'PIC', v: r => r.pic || '' }, { l: 'Status Temuan', v: r => statusView(r) }, { l: 'Status di Dashboard', v: r => r.regulator_status || '' }, { l: 'Usulan Status', v: r => r.status === 'PROPOSED CLOSED' ? 'CLOSED' : '' }]
      }) }]
    })(c, params, actions);
  }
  KKS.register({ id: 'temuan', title: 'Temuan & CAP', domain: 'PENGAWASAN', icon: '🧾', perm: 'TEMUAN', order: 31, render: temuanPage });

  // ---------- Dashboard temuan per lokasi ----------
  KKS.register({ id: 'temuan-dashboard', title: 'Dashboard temuan', domain: 'PENGAWASAN', icon: '📊', perm: 'TEMUAN', order: 32, render: async (c) => {
    const rows = await KKS.fetchAll('findings', q => KKS.byUnit(q));
    const units = state.units.filter(u => rows.some(r => r.unit_id === u.id));
    const cnt = (list, s) => list.filter(r => statusView(r) === s).length;
    const sts = ['OPEN', 'IN PROGRESS', 'PROPOSED CLOSED', 'OVERDUE', 'CLOSED'];
    c.append(h('div', { class: 'k-cards' }, sts.map(s => h('div', { class: 'k-card ' + (s === 'OVERDUE' ? 'bad' : s === 'CLOSED' ? 'ok' : '') }, h('div', { class: 'k-card-label' }, s), h('div', { class: 'k-card-value' }, cnt(rows, s))))),
      h('div', { class: 'k-panel' }, h('h3', {}, 'Status temuan per lokasi'), h('table', { class: 'k-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Lokasi'), sts.map(s => h('th', {}, s)), h('th', {}, 'Total'))),
        h('tbody', {}, units.map(u => { const l = rows.filter(r => r.unit_id === u.id); return h('tr', {}, h('td', {}, u.short_name), sts.map(s => h('td', { class: 'center' }, cnt(l, s) || '')), h('td', { class: 'center' }, h('b', {}, l.length))); })))),
      h('div', { class: 'k-panel' }, h('h3', {}, 'Per bidang'), h('table', { class: 'k-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Bidang'), h('th', {}, 'Terbuka'), h('th', {}, 'Overdue'), h('th', {}, 'Closed'))),
        h('tbody', {}, Array.from(new Set(rows.map(r => r.field || '-'))).map(f => { const l = rows.filter(r => (r.field || '-') === f); return h('tr', {}, h('td', {}, f), h('td', { class: 'center' }, l.filter(r => r.status !== 'CLOSED').length), h('td', { class: 'center' }, cnt(l, 'OVERDUE')), h('td', { class: 'center' }, cnt(l, 'CLOSED'))); })))));
  } });

  // ---------- Program kerja KKS ----------
  /** Hitung realisasi otomatis dari data untuk kegiatan yang dikenali. Mengembalikan {bulan: jumlah}. */
  async function autoRealization(p) {
    const y = p.year, u = p.unit_id, a = p.activity.toLowerCase();
    const months = (rows, col) => rows.reduce((o, r) => { const m = new Date(String(r[col]).slice(0, 10) + 'T00:00').getMonth() + 1; o[m] = (o[m] || 0) + 1; return o; }, {});
    const between = (q, col) => q.eq('unit_id', u).gte(col, `${y}-01-01`).lte(col, `${y}-12-31`);
    if (a.includes('apar')) { const r = check(await between(sb.from('apar_inspections').select('date'), 'date')); const m = months(r, 'date'); Object.keys(m).forEach(k => m[k] = 1); return m; }
    if (a.includes('safety patrol') && p.field === 'K3') return months(check(await between(sb.from('patrol_schedules').select('date').eq('status', 'SELESAI'), 'date')), 'date');
    if (a.includes('safety action group') || a.includes('sag')) return months(check(await between(sb.from('sag_meetings').select('date'), 'date')), 'date');
    if (a.includes('test keamanan')) return months(check(await between(sb.from('sec_activities').select('date').eq('kind', 'TEST'), 'date')), 'date');
    if (a.includes('audit keamanan')) return months(check(await between(sb.from('sec_activities').select('date').eq('kind', 'AUDIT'), 'date')), 'date');
    if (a.includes('inspeksi keamanan')) return months(check(await between(sb.from('sec_activities').select('date').eq('kind', 'INSPEKSI'), 'date')), 'date');
    const kw = a.includes('bulan k3') ? 'Bulan K3' : a.includes('rapat triwulan') ? 'Rapat' : a.includes('dst') ? 'DST' : a.includes('table top') ? 'Table Top' : a.includes('tinjauan') ? 'Tinjauan' : null;
    if (kw) return months(check(await between(sb.from('activities').select('date').ilike('kind', `%${kw}%`), 'date')), 'date');
    return null;
  }
  function planEditor(p, reload) {
    const plan = { ...(p.plan || {}) }; const real = { ...(p.realization || {}) };
    const editable = can('PROKER', 'U', p.unit_id);
    const tb = h('tbody');
    const draw = () => {
      tb.innerHTML = '';
      [['Rencana', plan], ['Realisasi', real]].forEach(([lab, obj]) => tb.append(h('tr', {}, h('th', {}, lab), ...Array.from({ length: 12 }, (_, i) => i + 1).flatMap(m => [1, 2, 3, 4].map(w => {
        const k = `${m}-${w}`;
        return h('td', { class: 'c' }, h('input', { type: 'checkbox', checked: obj[k] || null, disabled: !editable || null, onchange: (e) => { if (e.target.checked) obj[k] = true; else delete obj[k]; } }));
      })))));
    };
    draw();
    const save = h('button', { class: 'k-btn k-btn-primary', disabled: !editable || null }, 'Simpan');
    const auto = h('button', { class: 'k-btn', disabled: !editable || null }, '⚡ Hitung realisasi dari data');
    const m = modal({ title: `${p.activity} — ${p.year}`, wide: true, body: h('div', {}, h('p', { class: 'k-help' }, `Frekuensi ${p.frequency}×/tahun · centang minggu rencana & realisasi.`),
      h('div', { class: 'k-table-wrap' }, h('table', { class: 'k-matrix' }, h('thead', {}, h('tr', {}, h('th', {}), BULAN.map(b => h('th', { colspan: 4 }, b.slice(0, 3)))), h('tr', {}, h('th', {}), Array.from({ length: 12 }).flatMap(() => [1, 2, 3, 4].map(w => h('th', {}, w))))), tb))),
      footer: [auto, h('button', { class: 'k-btn', onclick: () => m.close() }, 'Tutup'), save] });
    auto.onclick = async () => {
      const r = await autoRealization(p);
      if (!r) return toast('Kegiatan ini belum dapat dihitung otomatis — centang manual.', 'warning');
      Object.entries(r).forEach(([mm]) => { if (![1, 2, 3, 4].some(w => real[`${mm}-${w}`])) { const w = [1, 2, 3, 4].find(w => plan[`${mm}-${w}`]) || 1; real[`${mm}-${w}`] = true; } });
      draw(); toast(`Realisasi ditemukan di ${Object.keys(r).length} bulan.`, 'success');
    };
    save.onclick = async () => { try { check(await sb.from('work_programs').update({ plan, realization: real }).eq('id', p.id)); toast('Tersimpan.', 'success'); m.close(); reload(); } catch (e) { toast(e.message, 'error'); } };
  }
  const count = (o) => Object.keys(o || {}).length;
  KKS.register({ id: 'proker', title: 'Program kerja KKS', domain: 'PENGAWASAN', icon: '🗓️', perm: 'PROKER', order: 33, render: KCRUD.page({
    id: 'proker', title: 'Program kerja Unit KKS', table: 'work_programs', perm: 'PROKER', domain: 'PENGAWASAN', itemName: 'program kerja', order: ['field', true, 'activity', true],
    filters: { year: true, yearCol: 'year' },
    intro: 'Rencana per minggu (12 bulan × 4 minggu) dan realisasi. Realisasi APAR, safety patrol, SAG, testing/audit/inspeksi keamanan, Bulan K3, rapat tim K3, DST & table top dapat dihitung otomatis dari data.',
    fields: [
      { k: 'year', l: 'Tahun', t: 'number', req: true, def: new Date().getFullYear(), list: true }, { k: 'field', l: 'Bidang', t: 'list', opts: ['K3', 'Keamanan', 'Standardisasi', 'Keselamatan'], req: true, list: true },
      { k: 'activity', l: 'Kegiatan', req: true, list: true, span: 2, cls: 'wrap' }, { k: 'frequency', l: 'Frekuensi / tahun', t: 'number', def: 1, list: true },
      { k: '_plan', l: 'Rencana (minggu)', form: false, list: true, render: r => count(r.plan) }, { k: '_real', l: 'Realisasi (minggu)', form: false, list: true, render: r => count(r.realization) },
      { k: '_pct', l: 'Capaian', form: false, list: true, render: r => { const p = count(r.plan) || r.frequency || 1; const pc = Math.min(100, Math.round(count(r.realization) / p * 100)); return h('div', {}, h('div', { class: 'bar' }, h('i', { style: { width: pc + '%' } })), h('small', {}, pc + '%')); } },
      { k: 'note', l: 'Keterangan', t: 'textarea', list: true, cls: 'wrap' }
    ],
    rowActions: [{ label: 'Jadwal', run: (r, rl) => planEditor(r, rl) }],
    headerActions: [{ label: 'Cetak program kerja', run: ({ rows, st }) => {
      const head = [h('tr', {}, h('th', { rowspan: 2 }, 'No'), h('th', { rowspan: 2 }, 'Bidang'), h('th', { rowspan: 2 }, 'Kegiatan'), h('th', { rowspan: 2 }, 'Frek.'), BULAN.map(b => h('th', { colspan: 4 }, b.slice(0, 3).toUpperCase())), h('th', { rowspan: 2 }, 'Ket.')),
        h('tr', {}, Array.from({ length: 12 }).flatMap(() => [1, 2, 3, 4].map(w => h('th', {}, w))))];
      const body = h('table', { class: 'p-table small' }, h('thead', {}, head), h('tbody', {}, rows().map((r, i) => h('tr', {}, h('td', { class: 'num' }, i + 1), h('td', {}, r.field), h('td', {}, r.activity), h('td', { class: 'center' }, r.frequency),
        ...Array.from({ length: 12 }, (_, m) => m + 1).flatMap(m => [1, 2, 3, 4].map(w => { const k = `${m}-${w}`; const p = (r.plan || {})[k], d = (r.realization || {})[k]; return h('td', { class: 'center', style: p ? { background: d ? '#86efac' : '#bfdbfe' } : (d ? { background: '#86efac' } : null) }, d ? '√' : ''); })), h('td', {}, r.note || '')))));
      KPRINT.doc({ title: 'PROGRAM KERJA UNIT KESELAMATAN, KEAMANAN DAN STANDARDISASI', period: 'Tahun ' + (st.year || ''), landscape: true, sig: [['Dibuat Oleh,', 'Manager KKS']], body: [body, h('p', {}, 'Biru = rencana; hijau/√ = terealisasi.')] });
    } }]
  }) });

  KKS.register({ id: 'kegiatan-pengawasan', title: 'Rapat & monitoring', domain: 'PENGAWASAN', icon: '🗒️', perm: 'KEGIATAN', order: 34, render: KMOD.activities('PENGAWASAN', 'Rapat bulanan & monitoring unit') });
})();
