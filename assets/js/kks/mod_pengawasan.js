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
  // Rencana & realisasi disimpan sebagai { "bulan-minggu": true } (bulan 1–12, minggu 1–4).
  // realization = centang MANUAL; realisasi otomatis dihitung langsung dari menu sumber (kolom auto_source) → r._auto.
  const wkKey = (d) => { const s = String(d).slice(0, 10); const dt = new Date(s + 'T00:00'); return `${dt.getMonth() + 1}-${KKS.weekOfMonth(s)}`; };

  /** Pilihan menu sumber realisasi otomatis. */
  function autoOpts() {
    const o = [['APAR', 'Pemeriksaan APAR bulanan'], ['P3K', 'Checklist P3K bulanan'], ['PATROL', 'Safety patrol (status SELESAI)'], ['JSAWP', 'JSA & Izin Kerja (diajukan)'],
      ['SAG', 'Rapat SAG'], ['EFFORT', 'Impor occurrence EFFORT'], ['OVERSIGHT', 'Kegiatan pengawasan (audit/inspeksi regulator)']];
    KREF.SEC_KINDS.forEach(k => o.push(['SEC:' + k, `Testing/inspeksi/audit keamanan — ${k}`]));
    Object.entries(KREF.ACTIVITY_KINDS).forEach(([d, ks]) => ks.filter(k => k !== 'Lainnya').forEach(k => o.push([`ACT:${d}:${k}`, `Kegiatan ${d === 'K3' ? 'K3' : d.toLowerCase()} — ${k}`])));
    return o;
  }
  const autoLabel = (code) => (autoOpts().find(o => o[0] === code) || [code, code])[1];

  /** Ambil sekali semua data sumber untuk lokasi & tahun yang tampil, lalu hitung r._auto dan r._realAll per baris. */
  async function loadAuto(rows) {
    if (!rows.length) return rows;
    const units = [...new Set(rows.map(r => r.unit_id))], years = [...new Set(rows.map(r => r.year))];
    const y1 = Math.min(...years), y2 = Math.max(...years);
    const need = new Set(rows.flatMap(r => (r.auto_source || []).map(s => s.split(':')[0])));
    const get = async (on, table, cols, dcol, extra) => {
      if (!need.has(on)) return [];
      let q = sb.from(table).select(cols).in('unit_id', units).gte(dcol, `${y1}-01-01`).lte(dcol, `${y2}-12-31T23:59:59`);
      if (extra) q = extra(q);
      return (await KKS.fetchAll(table, () => q)).filter(r => r[dcol]);
    };
    const [apar, p3k, patrol, wp, sag, occ, ovs, sec, act] = await Promise.all([
      get('APAR', 'apar_inspections', 'unit_id,date', 'date'), get('P3K', 'p3k_checks', 'unit_id,date', 'date'),
      get('PATROL', 'patrol_schedules', 'unit_id,date', 'date', q => q.eq('status', 'SELESAI')), get('JSAWP', 'work_permits', 'unit_id,date', 'date', q => q.neq('status', 'DRAFT')),
      get('SAG', 'sag_meetings', 'unit_id,date', 'date'), get('EFFORT', 'occurrences', 'unit_id,created_at', 'created_at', q => q.eq('source', 'EFFORT')),
      get('OVERSIGHT', 'oversight_events', 'unit_id,start_date', 'start_date'), get('SEC', 'sec_activities', 'unit_id,date,kind', 'date'),
      get('ACT', 'activities', 'unit_id,date,domain,kind', 'date')]);
    const src = { APAR: [apar, 'date'], P3K: [p3k, 'date'], PATROL: [patrol, 'date'], JSAWP: [wp, 'date'], SAG: [sag, 'date'], EFFORT: [occ, 'created_at'], OVERSIGHT: [ovs, 'start_date'] };
    rows.forEach(r => {
      const keys = {}; const inYear = (d) => String(d).slice(0, 4) === String(r.year);
      const mark = (list, col) => list.filter(x => x.unit_id === r.unit_id && inYear(x[col])).forEach(x => { keys[wkKey(x[col])] = true; });
      (r.auto_source || []).forEach(code => {
        const [kind, a, b] = code.split(':');
        if (src[kind]) mark(src[kind][0], src[kind][1]);
        else if (kind === 'SEC') mark(sec.filter(x => x.kind === a), 'date');
        else if (kind === 'ACT') mark(act.filter(x => x.domain === a && String(x.kind || '').trim().toLowerCase() === String(b || '').toLowerCase()), 'date');
      });
      r._auto = keys; r._realAll = { ...(r.realization || {}), ...keys };
    });
    return rows;
  }

  /** Tahun kosong → salin otomatis kegiatan & jadwal rencana dari tahun sebelumnya (realisasi dikosongkan). */
  async function copyFromPrevYear(year, silent) {
    if (!year || !can('PROKER', 'C')) return 0;
    const prev = await KKS.fetchAll('work_programs', q => KKS.byUnit(q).eq('year', year - 1));
    if (!prev.length) { if (!silent) toast(`Tidak ada program kerja tahun ${year - 1} untuk disalin.`, 'warning'); return 0; }
    const have = await KKS.fetchAll('work_programs', q => KKS.byUnit(q).eq('year', year));
    const exists = new Set(have.map(r => r.unit_id + '|' + r.activity.toLowerCase()));
    const add = prev.filter(r => !exists.has(r.unit_id + '|' + r.activity.toLowerCase()) && can('PROKER', 'C', r.unit_id))
      .map(r => ({ unit_id: r.unit_id, year, sort: r.sort, field: r.field, activity: r.activity, frequency: r.frequency, plan: r.plan || {}, realization: {}, auto_source: r.auto_source || [], note: r.note }));
    if (!add.length) { if (!silent) toast('Semua kegiatan tahun lalu sudah ada di tahun ini.', 'info'); return 0; }
    check(await sb.from('work_programs').insert(add));
    toast(`Program kerja ${year} dibuat otomatis dari ${year - 1}: ${add.length} kegiatan (jadwal rencana ikut disalin, bisa diubah lewat "Jadwal").`, 'success');
    return add.length;
  }

  /** Jumlah "kegiatan" = blok minggu berurutan (mis. Review dokumen 8 minggu = 1 kegiatan). Rentang bulan opsional. */
  function blocks(obj, m1 = 1, m2 = 12) {
    let n = 0, prev = false;
    for (let m = m1; m <= m2; m++) for (let w = 1; w <= 4; w++) { const on = !!(obj || {})[`${m}-${w}`]; if (on && !prev) n++; prev = on; }
    return n;
  }
  /** Capaian rencana dalam rentang: blok rencana yang punya realisasi (otomatis/manual) pada bulan yang sama. */
  function achieved(p, m1 = 1, m2 = 12) {
    const plan = p.plan || {}, real = p._realAll || p.realization || {};
    const runs = []; let cur = null;
    for (let m = m1; m <= m2; m++) for (let w = 1; w <= 4; w++) { const k = `${m}-${w}`; if (plan[k]) { if (!cur) { cur = []; runs.push(cur); } cur.push([m, w]); } else cur = null; }
    const isDone = (run) => run.some(([m]) => [1, 2, 3, 4].some(w => real[`${m}-${w}`]));
    const done = runs.filter(isDone).length;
    const now = new Date(), cy = now.getFullYear(), cm = now.getMonth() + 1, cw = KKS.weekOfMonth(KKS.today());
    const future = p.year > cy ? runs.filter(r => !isDone(r)).length : p.year < cy ? 0
      : runs.filter(run => !isDone(run) && (run[0][0] > cm || (run[0][0] === cm && run[0][1] > cw))).length;
    const realBlocks = blocks(real, m1, m2);
    return { plan: runs.length, done, future, due: runs.length - future, real: realBlocks, extra: Math.max(0, realBlocks - done) };
  }
  function planEditor(p, reload) {
    const plan = { ...(p.plan || {}) }; const real = { ...(p.realization || {}) }; const auto = p._auto || {};
    const editable = can('PROKER', 'U', p.unit_id);
    const tb = h('tbody');
    const draw = () => {
      tb.innerHTML = '';
      [['Rencana', plan], ['Realisasi', real]].forEach(([lab, obj]) => tb.append(h('tr', {}, h('th', {}, lab), ...Array.from({ length: 12 }, (_, i) => i + 1).flatMap(m => [1, 2, 3, 4].map(w => {
        const k = `${m}-${w}`; const isAuto = lab === 'Realisasi' && auto[k];
        return h('td', { class: 'c', title: isAuto ? 'Otomatis dari menu terkait' : '', style: lab === 'Rencana' && plan[k] ? { background: '#bfdbfe' } : (lab === 'Realisasi' && (real[k] || isAuto) ? { background: isAuto ? '#86efac' : '#bbf7d0' } : null) },
          isAuto ? h('b', { style: { color: '#047857' } }, '⚡') : h('input', { type: 'checkbox', checked: obj[k] || null, disabled: !editable || null, onchange: (e) => { if (e.target.checked) obj[k] = true; else delete obj[k]; draw(); } }));
      })))));
    };
    draw();
    const save = h('button', { class: 'k-btn k-btn-primary', disabled: !editable || null }, 'Simpan');
    const srcTxt = (p.auto_source || []).length ? 'Realisasi otomatis (⚡) dari: ' + p.auto_source.map(autoLabel).join('; ') + '. ' : 'Belum terhubung ke menu — realisasi dicentang manual (atur "Terhubung ke menu" lewat tombol Ubah). ';
    const m = modal({ title: `${p.activity} — ${p.year}`, wide: true, body: h('div', {}, h('p', { class: 'k-help' }, `Frekuensi ${p.frequency}×/tahun · biru = minggu rencana, hijau = minggu terlaksana. ${srcTxt}Centang manual untuk kegiatan yang tidak tercatat di sistem.`),
      h('div', { class: 'k-table-wrap' }, h('table', { class: 'k-matrix' }, h('thead', {}, h('tr', {}, h('th', {}), BULAN.map(b => h('th', { colspan: 4 }, b.slice(0, 3)))), h('tr', {}, h('th', {}), Array.from({ length: 12 }).flatMap(() => [1, 2, 3, 4].map(w => h('th', {}, w))))), tb))),
      footer: [h('button', { class: 'k-btn', onclick: () => m.close() }, 'Tutup'), save] });
    save.onclick = async () => { try { check(await sb.from('work_programs').update({ plan, realization: real }).eq('id', p.id)); toast('Tersimpan.', 'success'); m.close(); reload(); } catch (e) { toast(e.message, 'error'); } };
  }

  /** Laporan triwulan realisasi timeline program kerja (format mengikuti Program Kerja Unit KKS TRK 2026.xlsx). */
  function quarterReport(rows, year, reload) {
    const q0 = Math.floor(new Date().getMonth() / 3) + 1;
    const qSel = h('select', { class: 'k-input' }, [1, 2, 3, 4].map(q => h('option', { value: q, selected: q === (year == new Date().getFullYear() ? q0 : 4) || null }, `Triwulan ${ROMAWI_TW[q - 1]}`)));
    const go = h('button', { class: 'k-btn k-btn-primary' }, 'Cetak / PDF');
    const m = modal({ title: `Laporan triwulan program kerja ${year}`, body: h('div', { class: 'k-form' },
      h('label', { class: 'k-field' }, h('span', {}, 'Triwulan'), qSel),
      h('p', { class: 'k-help span-full' }, 'Realisasi diambil langsung dari menu yang terhubung (APAR, safety patrol, SAG, testing/audit/inspeksi keamanan, impor EFFORT, kegiatan pengawasan & kegiatan K3/keamanan) ditambah centang manual lewat tombol "Jadwal".')),
      footer: [h('button', { class: 'k-btn', onclick: () => m.close() }, 'Batal'), go] });
    go.onclick = async () => {
      go.disabled = true;
      try {
        const q = +qSel.value, m1 = (q - 1) * 3 + 1, m2 = m1 + 2, ms = [m1, m1 + 1, m2];
        m.close(); printQuarter(rows, year, q, m1, m2, ms);
      } catch (e) { toast(e.message, 'error'); go.disabled = false; }
    };
  }
  const ROMAWI_TW = ['I', 'II', 'III', 'IV'];
  function printQuarter(rows, year, q, m1, m2, ms) {
    const PB = { background: '#bfdbfe' }, DONE = { background: '#86efac' };
    let lastField = ''; let no = 0; const trs = []; let tPlan = 0, tDone = 0, tExtra = 0, tFut = 0;
    rows.forEach(r => {
      if (r.field !== lastField) { trs.push(h('tr', {}, h('td', { colspan: 21 }, h('b', {}, fieldTitle(r.field))))); lastField = r.field; no = 0; }
      const a = achieved(r, m1, m2); tPlan += a.plan; tDone += a.done; tExtra += a.extra; tFut += a.future;
      const tent = !Object.keys(r.plan || {}).length;
      const status = tent ? (a.real ? `Terlaksana ${a.real}× (tentatif)` : 'Tentatif — belum ada kegiatan') :
        !a.plan ? (a.real ? `Terlaksana ${a.real}× di luar rencana` : 'Tidak direncanakan di TW ini') :
        a.done >= a.plan ? 'Terlaksana' + (a.extra ? ` (+${a.extra} di luar rencana)` : '') : (a.done >= a.due && a.future) ? (a.done ? `Sesuai jadwal (${a.done}/${a.plan}), ${a.future} terjadwal` : 'Terjadwal — belum jatuh tempo') : a.done ? `Sebagian (${a.done}/${a.due} jatuh tempo)` + (a.future ? `, ${a.future} terjadwal` : '') : 'Belum terlaksana' + (a.future ? `, ${a.future} terjadwal` : '');
      trs.push(h('tr', {}, h('td', { class: 'num' }, ++no), h('td', {}, r.activity), h('td', { class: 'center' }, r.frequency),
        ...ms.flatMap(m => [1, 2, 3, 4].map(w => { const k = `${m}-${w}`, p = (r.plan || {})[k], d = (r._realAll || r.realization || {})[k]; return h('td', { class: 'center', style: d ? DONE : (p ? PB : null) }, d ? '√' : ''); })),
        h('td', { class: 'center' }, tent ? 'tentatif' : a.plan), h('td', { class: 'center' }, a.done + a.extra), h('td', { class: 'center' }, a.due ? Math.round(Math.min(a.done, a.due) / a.due * 100) + '%' : '-'),
        h('td', {}, status + (r.note ? ` · ${r.note}` : ''))));
    });
    const head = [h('tr', {}, h('th', { rowspan: 2 }, 'No'), h('th', { rowspan: 2 }, 'Kegiatan'), h('th', { rowspan: 2 }, 'Frek./ thn'), ms.map(m => h('th', { colspan: 4 }, BULAN[m - 1].toUpperCase())),
      h('th', { rowspan: 2 }, 'Rencana TW'), h('th', { rowspan: 2 }, 'Realisasi'), h('th', { rowspan: 2 }, 'Capaian'), h('th', { rowspan: 2 }, 'Keterangan')),
      h('tr', {}, ms.flatMap(() => [1, 2, 3, 4].map(w => h('th', {}, w))))];
    const tDue = tPlan - tFut; const pct = tDue ? Math.round(Math.min(tDone, tDue) / tDue * 100) : 0; const todayStr = KKS.today(); const endStr = q === 4 ? `${year + 1}-01-05` : `${year}-${KKS.pad(m2 + 1)}-05`;
    const ringkas = h('table', { class: 'p-kv' }, ...[['Kegiatan direncanakan di TW ini', `${tPlan} kegiatan`], ['Terlaksana sesuai rencana', `${tDone} kegiatan`], ['Terlaksana di luar rencana', `${tExtra} kegiatan`], ...(tFut ? [['Terjadwal (belum jatuh tempo)', `${tFut} kegiatan`]] : []), [tFut ? 'Capaian s.d. tanggal cetak' : 'Capaian triwulan', `${pct}% (${Math.min(tDone, tDue)}/${tDue} kegiatan jatuh tempo)`]].map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, ': ' + v))));
    const late = rows.filter(r => { const a = achieved(r, m1, m2); return a.due && a.done < a.due; }).map(r => r.activity);
    KPRINT.doc({ title: `LAPORAN REALISASI PROGRAM KERJA UNIT KKS TRIWULAN ${ROMAWI_TW[q - 1]} TAHUN ${year}`, landscape: true, sig: 'PENGAWASAN',
      date: todayStr < endStr ? todayStr : endStr,
      body: [ringkas, h('table', { class: 'p-table small' }, h('thead', {}, head), h('tbody', {}, trs)),
        h('p', {}, 'Keterangan warna: biru = minggu rencana; hijau/√ = minggu terlaksana. Capaian = kegiatan rencana yang terlaksana ÷ kegiatan rencana yang sudah jatuh tempo; kegiatan terjadwal setelah tanggal cetak belum dihitung.'),
        late.length ? h('p', {}, h('b', {}, 'Belum/sebagian terlaksana: '), late.join('; ') + '. Mohon dijadwalkan ulang / diberi justifikasi.') : h('p', {}, 'Seluruh kegiatan yang direncanakan pada triwulan ini telah terlaksana.')] });
  }
  const fieldTitle = (f) => ({ K3: '1. KESELAMATAN K3', Keamanan: '2. KEAMANAN PENERBANGAN', Standardisasi: '3. STANDARDISASI' }[f] || f.toUpperCase());

  KKS.register({ id: 'proker', title: 'Program kerja KKS', domain: 'PENGAWASAN', icon: '🗓️', perm: 'PROKER', order: 33, render: KCRUD.page({
    id: 'proker', title: 'Program kerja Unit KKS', table: 'work_programs', perm: 'PROKER', domain: 'PENGAWASAN', itemName: 'program kerja', order: ['sort', true, 'field', true],
    filters: { year: true, yearCol: 'year' },
    intro: 'Sumber 2026: "Program Kerja Unit KKS TRK 2026.xlsx" (19 kegiatan, TTD MKKS 06-01-2026). Rencana per minggu (12 bulan × 4 minggu) & realisasi; realisasi dapat dihitung otomatis dari data. "Laporan triwulan" mencetak timeline rencana vs realisasi + capaian per TW.',
    fields: [
      { k: 'year', l: 'Tahun', t: 'number', req: true, def: new Date().getFullYear(), list: true }, { k: 'field', l: 'Bidang', t: 'list', opts: ['K3', 'Keamanan', 'Standardisasi', 'Keselamatan'], req: true, list: true },
      { k: 'activity', l: 'Kegiatan', req: true, list: true, span: 2, cls: 'wrap' }, { k: 'frequency', l: 'Frekuensi / tahun', t: 'number', def: 1, list: true },
      { k: 'sort', l: 'Urutan', t: 'number', def: 99 },
      { k: '_plan', l: 'Rencana (kegiatan)', form: false, list: true, render: r => Object.keys(r.plan || {}).length ? blocks(r.plan) : 'tentatif' },
      { k: '_real', l: 'Realisasi', form: false, list: true, render: r => blocks(r._realAll || r.realization) },
      { k: '_pct', l: 'Capaian s.d. bulan ini', form: false, list: true, render: r => { const mm = r.year < new Date().getFullYear() ? 12 : new Date().getMonth() + 1; const a = achieved(r, 1, mm); if (!a.due) return h('small', { class: 'k-help' }, a.real ? `${a.real}× terlaksana` : (a.future ? 'terjadwal' : '-')); const d = Math.min(a.done, a.due); const pc = Math.round(d / a.due * 100); return h('div', {}, h('div', { class: 'bar' }, h('i', { style: { width: pc + '%', background: pc < 100 ? '#f97316' : null } })), h('small', {}, `${d}/${a.due} · ${pc}%`)); } },
      { k: 'auto_source', l: 'Terhubung ke menu (realisasi otomatis)', t: 'multi', opts: autoOpts, help: 'Centang menu yang menjadi bukti kegiatan ini. Setiap data yang disimpan di menu tsb otomatis mengisi realisasi pada minggu tanggalnya.' },
      { k: '_src', l: 'Sumber realisasi', form: false, list: true, render: r => (r.auto_source || []).length ? h('small', { title: r.auto_source.map(autoLabel).join('\n') }, '⚡ ' + autoLabel(r.auto_source[0]).replace(/^Kegiatan [^—]+— /, '') + (r.auto_source.length > 1 ? ` +${r.auto_source.length - 1}` : '')) : h('small', { class: 'k-help' }, 'manual') },
      { k: 'note', l: 'Keterangan', t: 'textarea', list: true, cls: 'wrap' }
    ],
    afterLoad: async (rows, st) => {
      if (!rows.length && st.year && Number(st.year) >= new Date().getFullYear() && await copyFromPrevYear(Number(st.year), true)) {
        rows = await KKS.fetchAll('work_programs', q => KKS.byUnit(q).eq('year', Number(st.year)).order('sort').order('field'));
      }
      return loadAuto(rows);
    },
    rowActions: [{ label: 'Jadwal', run: (r, rl) => planEditor(r, rl) }],
    headerActions: [
      { label: '⧉ Salin dari tahun lalu', perm: 'C', run: async ({ st, reload }) => { const y = Number(st.year); if (!y) return toast('Pilih tahun dulu.', 'warning'); if (await copyFromPrevYear(y, false)) reload(); } },
      { label: '📊 Laporan triwulan', run: ({ rows, st, reload }) => { if (!rows().length) return toast('Belum ada program kerja pada tahun ini.', 'warning'); quarterReport(rows(), Number(st.year) || new Date().getFullYear(), reload); } },
      { label: 'Cetak program kerja', run: ({ rows, st }) => {
        const head = [h('tr', {}, h('th', { rowspan: 2 }, 'No'), h('th', { rowspan: 2 }, 'Kegiatan'), h('th', { rowspan: 2 }, 'Frek.'), BULAN.map(b => h('th', { colspan: 4 }, b.slice(0, 3).toUpperCase())), h('th', { rowspan: 2 }, 'Ket.')),
          h('tr', {}, Array.from({ length: 12 }).flatMap(() => [1, 2, 3, 4].map(w => h('th', {}, w))))];
        let lastField = '', no = 0; const trs = [];
        rows().forEach(r => {
          if (r.field !== lastField) { trs.push(h('tr', {}, h('td', { colspan: 52 }, h('b', {}, fieldTitle(r.field))))); lastField = r.field; no = 0; }
          trs.push(h('tr', {}, h('td', { class: 'num' }, ++no), h('td', {}, r.activity), h('td', { class: 'center' }, r.frequency),
            ...Array.from({ length: 12 }, (_, m) => m + 1).flatMap(m => [1, 2, 3, 4].map(w => { const k = `${m}-${w}`; const p = (r.plan || {})[k], d = (r._realAll || r.realization || {})[k]; return h('td', { class: 'center', style: d ? { background: '#86efac' } : (p ? { background: '#bfdbfe' } : null) }, d ? '√' : ''); })), h('td', {}, r.note || '')));
        });
        KPRINT.doc({ title: 'PROGRAM KERJA UNIT KESELAMATAN, KEAMANAN DAN STANDARDISASI', period: 'Tahun ' + (st.year || ''), landscape: true, sig: [['', 'Manager Keselamatan, Keamanan dan Standardisasi']],
          body: [h('table', { class: 'p-table small' }, h('thead', {}, head), h('tbody', {}, trs)), h('p', {}, 'Biru = rencana; hijau/√ = terealisasi.')] });
      } }]
  }) });


  KKS.register({ id: 'kegiatan-pengawasan', title: 'Rapat & monitoring', domain: 'PENGAWASAN', icon: '🗒️', perm: 'KEGIATAN', order: 34, render: KMOD.activities('PENGAWASAN', 'Rapat bulanan & monitoring unit') });
})();
