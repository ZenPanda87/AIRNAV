/**
 * Domain Keselamatan / SMS: traffic bulanan (impor LAP. DATA OPERASI), occurrence (impor export EFFORT) & klasifikasi ANS,
 * availability CNSA, KPI Safety Rate & Lapman, hazard/HIRA (matriks ICAO 5×5), SAG (isu & BA), safety recommendation,
 * RSA self-assessment, kegiatan keselamatan.
 */
(() => {
  const { h, sb, check, state, can, today, fmtDate, fmtNum, BULAN, ROMAWI, toast, modal, confirmBox, unitShort, unitById, pad } = KKS;
  const { badge } = KUI;

  // ---------- Util impor ----------
  let xlsxP = null;
  const loadXLSX = () => xlsxP || (xlsxP = new Promise((res, rej) => {
    if (window.XLSX) return res(window.XLSX);
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = () => res(window.XLSX); s.onerror = () => { xlsxP = null; rej(new Error('Gagal memuat pustaka Excel. Periksa koneksi internet.')); }; document.head.append(s);
  }));
  const pickFile = (accept) => new Promise((res) => { const i = h('input', { type: 'file', accept }); i.onchange = () => res(i.files[0] || null); i.click(); });
  const norm = (s) => String(s ?? '').toUpperCase().replace(/\s+/g, '');
  const unitFromText = (t) => { const T = String(t || '').toUpperCase().trim(); return state.units.find(u => u.id === T || u.sheet_code === T || u.icao === T || (u.aliases || []).includes(T) || u.short_name.toUpperCase() === T); };

  // ======================= TRAFFIC =======================
  async function importTraffic(reload) {
    const file = await pickFile('.xlsx,.xls');
    if (!file) return;
    try {
      const XLSX = await loadXLSX();
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      let ym = null; const found = [];
      for (const name of wb.SheetNames) {
        const unit = unitFromText(name);
        if (!unit) continue;
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
        if (!ym) {
          const txt = rows.slice(0, 10).flat().join(' ').toUpperCase();
          const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MEI|MAY', 'JUN', 'JUL', 'AGU|AUG', 'SEP', 'OKT|OCT', 'NOV', 'DES|DEC'];
          const mm = txt.match(/(JAN|FEB|MAR|APR|MEI|MAY|JUN|JUL|AGU|AUG|SEP|OKT|OCT|NOV|DES|DEC)[A-Z]*\s*(\d{4})/);
          if (mm) ym = { year: +mm[2], month: MON.findIndex(p => p.split('|').includes(mm[1])) + 1 };
        }
        const hi = rows.findIndex(r => r.some(c => norm(c) === 'D/A/L/O'));
        if (hi < 0) { found.push({ unit, error: 'kolom D/A/L/O tidak ditemukan' }); continue; }
        const head = rows[hi].map(norm);
        const cD = head.indexOf('D/A/L/O'); const cI = head.findIndex(c => c.startsWith('DOMINT'));
        const t = { dom_dep: 0, dom_arr: 0, dom_ovf: 0, int_dep: 0, int_arr: 0, int_ovf: 0, local_cnt: 0, rows: 0 };
        rows.slice(hi + 1).forEach(r => {
          const d = norm(r[cD]).charAt(0); if (!'DAOL'.includes(d) || !d) return;
          const intl = cI >= 0 && norm(r[cI]).startsWith('INT');
          t.rows++;
          if (d === 'D') t[intl ? 'int_dep' : 'dom_dep']++; else if (d === 'A') t[intl ? 'int_arr' : 'dom_arr']++;
          else if (d === 'O') t[intl ? 'int_ovf' : 'dom_ovf']++; else if (d === 'L') t.local_cnt++;
        });
        found.push({ unit, ...t });
      }
      if (!found.length) throw new Error('Tidak ada sheet lokasi (TRK, LNU, TJS, NNX, LBW, LPU, BNG, LYU) di file ini.');
      const yIn = h('input', { class: 'k-input', type: 'number', value: ym ? ym.year : new Date().getFullYear() });
      const mIn = h('select', { class: 'k-input' }, BULAN.map((b, i) => h('option', { value: i + 1, selected: ym && ym.month === i + 1 || null }, b)));
      const ok = found.filter(f => !f.error);
      const save = h('button', { class: 'k-btn k-btn-primary' }, 'Simpan rekap');
      const m = modal({ title: 'Pratinjau impor LAP. DATA OPERASI — ' + file.name, wide: true, body: h('div', {},
        h('div', { class: 'k-toolbar' }, h('label', { class: 'k-inline' }, 'Bulan ', mIn), h('label', { class: 'k-inline' }, 'Tahun ', yIn), h('small', { class: 'k-help' }, ym ? 'Periode terbaca dari judul file.' : 'Periode tidak terbaca — pilih manual.')),
        h('table', { class: 'k-table' }, h('thead', {}, h('tr', {}, ['Lokasi', 'Baris', 'DOM DEP', 'DOM ARR', 'DOM OVF', 'INT DEP', 'INT ARR', 'INT OVF', 'Local', 'TOTAL'].map(x => h('th', {}, x)))),
          h('tbody', {}, found.map(f => f.error ? h('tr', {}, h('td', {}, f.unit.short_name), h('td', { colspan: 9 }, badge(f.error, 'bad'))) :
            h('tr', {}, h('td', {}, f.unit.short_name), ...['rows', 'dom_dep', 'dom_arr', 'dom_ovf', 'int_dep', 'int_arr', 'int_ovf', 'local_cnt'].map(k => h('td', { class: 'center' }, f[k])), h('td', { class: 'center' }, h('b', {}, f.dom_dep + f.dom_arr + f.dom_ovf + f.int_dep + f.int_arr + f.int_ovf)))))),
        h('p', { class: 'k-help' }, 'DEP/ARR/OVF dihitung dari kolom D/A/L/O; DOM/INT dari kolom DOM INT MIL TF (MIL/TF dihitung domestik). Data bulan yang sama akan ditimpa. Kolom AGREGAT diisi manual bila diperlukan (definisi menunggu konfirmasi Unit Operasi).')),
        footer: [h('button', { class: 'k-btn', onclick: () => m.close() }, 'Batal'), save] });
      save.onclick = async () => {
        try {
          save.disabled = true;
          const rows = ok.filter(f => can('TRAFFIC', 'C', f.unit.id)).map(f => ({ unit_id: f.unit.id, year: +yIn.value, month: +mIn.value, dom_dep: f.dom_dep, dom_arr: f.dom_arr, dom_ovf: f.dom_ovf, int_dep: f.int_dep, int_arr: f.int_arr, int_ovf: f.int_ovf, local_cnt: f.local_cnt, source: 'IMPORT ' + file.name.slice(0, 80) }));
          check(await sb.from('traffic_monthly').upsert(rows, { onConflict: 'unit_id,year,month' }));
          toast(`Rekap traffic ${rows.length} lokasi tersimpan.`, 'success'); m.close(); reload();
        } catch (e) { toast(e.message, 'error'); save.disabled = false; }
      };
    } catch (e) { toast(e.message, 'error'); }
  }
  KKS.register({ id: 'traffic', title: 'Traffic bulanan', domain: 'KESELAMATAN', icon: '🛫', perm: 'TRAFFIC', order: 40, render: KCRUD.page({
    id: 'traffic', title: 'Rekap traffic movement bulanan', table: 'traffic_monthly', perm: 'TRAFFIC', domain: 'KESELAMATAN', itemName: 'rekap traffic', order: ['year', false, 'month', false],
    filters: { year: true, yearCol: 'year' },
    intro: 'Unggah file "LAP. DATA OPERASI PERIODE …" dari Unit Operasi — sistem membaca tiap sheet lokasi dan menghitung DEP/ARR/OVF domestik & internasional. Bisa juga diisi/dikoreksi manual.',
    fields: [
      { k: 'year', l: 'Tahun', t: 'number', req: true, def: new Date().getFullYear(), list: true }, { k: 'month', l: 'Bulan', t: 'select', req: true, opts: BULAN.map((b, i) => [i + 1, b]), list: true },
      { k: 'dom_dep', l: 'DOM DEP', t: 'number', def: 0, list: true }, { k: 'dom_arr', l: 'DOM ARR', t: 'number', def: 0, list: true }, { k: 'dom_ovf', l: 'DOM OVF', t: 'number', def: 0, list: true },
      { k: 'int_dep', l: 'INT DEP', t: 'number', def: 0, list: true }, { k: 'int_arr', l: 'INT ARR', t: 'number', def: 0, list: true }, { k: 'int_ovf', l: 'INT OVF', t: 'number', def: 0, list: true },
      { k: 'local_cnt', l: 'Local', t: 'number', def: 0 }, { k: 'total', l: 'TOTAL', form: false, list: true, render: r => h('b', {}, fmtNum(r.total)) },
      { k: 'aggregate', l: 'Agregat', t: 'number', list: true }, { k: 'source', l: 'Sumber', readonly: true }, { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    headerActions: [{ label: '⬆ Impor LAP. DATA OPERASI', perm: 'C', run: ({ reload }) => importTraffic(reload) },
      { label: 'Cetak rekap tahunan', run: async ({ st }) => {
        const y = Number(st.year) || new Date().getFullYear();
        const rows = check(await sb.from('traffic_monthly').select('*').eq('year', y));
        const units = state.units.filter(u => state.unit === 'ALL' || u.id === state.unit);
        const tot = (u, m) => (rows.find(r => r.unit_id === u && r.month === m) || {}).total;
        const body = h('table', { class: 'p-table small' }, h('thead', {}, h('tr', {}, h('th', {}, 'No'), h('th', {}, 'Lokasi'), BULAN.map(b => h('th', {}, b.slice(0, 3).toUpperCase())), h('th', {}, 'TOTAL'))),
          h('tbody', {}, units.map((u, i) => h('tr', {}, h('td', { class: 'num' }, i + 1), h('td', {}, `${u.icao} ${u.short_name}`), Array.from({ length: 12 }, (_, m) => h('td', { class: 'right' }, fmtNum(tot(u.id, m + 1)))), h('td', { class: 'right' }, h('b', {}, fmtNum(rows.filter(r => r.unit_id === u.id).reduce((a, r) => a + r.total, 0)))))),
            h('tr', {}, h('td', { colspan: 2, class: 'right' }, h('b', {}, 'KLASTER')), Array.from({ length: 12 }, (_, m) => h('td', { class: 'right' }, h('b', {}, fmtNum(units.reduce((a, u) => a + (tot(u.id, m + 1) || 0), 0))))), h('td', { class: 'right' }, h('b', {}, fmtNum(rows.filter(r => units.some(u => u.id === r.unit_id)).reduce((a, r) => a + r.total, 0)))))));
        KPRINT.doc({ title: 'REKAPITULASI DATA TRAFFIC MOVEMENT TAHUN ' + y, landscape: true, sig: 'KESELAMATAN', body });
      } }]
  }) });

  // ======================= OCCURRENCE =======================
  async function importEffort(reload) {
    const file = await pickFile('.xls,.xlsx,.html,.htm');
    if (!file) return;
    try {
      let rows = [];
      const text = await file.text();
      if (/<table/i.test(text)) {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const trs = Array.from(doc.querySelectorAll('table tr'));
        rows = trs.map(tr => Array.from(tr.children).map(td => td.textContent.trim()));
      } else {
        const XLSX = await loadXLSX();
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false });
      }
      const hi = rows.findIndex(r => r.map(norm).includes('BRANCH') && r.map(norm).includes('ATSUNIT'));
      if (hi < 0) throw new Error('Format tidak dikenali — harus export EFFORT "REKAPITULASI DATA KESELAMATAN" (24 kolom).');
      const data = rows.slice(hi + 1).filter(r => r.length >= 20 && r[1]);
      const parsed = []; const skipped = {};
      data.forEach(r => {
        const unit = unitFromText(r[2]);
        if (!unit) { skipped[r[2]] = (skipped[r[2]] || 0) + 1; return; }
        let s = String(r[1]).trim(); let dt;
        const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
        if (m1) dt = `${m1[1]}-${m1[2]}-${m1[3]}T${m1[4]}:${m1[5]}:00Z`; else if (m2) dt = `${m2[3]}-${m2[2]}-${m2[1]}T${m2[4]}:${m2[5]}:00Z`; else return;
        const o = { unit_id: unit.id, occurred_at: dt, branch: r[2], ats_unit: r[3], category: r[4], classification: r[5], category2: r[6], ssr: r[7], aircraft_id: r[8], reg: r[9], ac_type: r[10], pic_name: r[11], operator: r[12],
          frules: r[13], fphase: r[14], adep: r[15], ades: r[16], typef: r[17], dta: r[18], itp: r[19], add_info: r[20], weather: r[21], flight: r[22], description: r[23], source: 'EFFORT' };
        o.effort_key = [unit.id, dt.slice(0, 16), norm(o.aircraft_id), norm(o.category)].join('|');
        o.kpi_category = KREF.suggestKpi(o.category);
        parsed.push(o);
      });
      if (!parsed.length) throw new Error('Tidak ada baris kejadian untuk 8 lokasi klaster Tarakan.');
      const keys = parsed.map(p => p.effort_key);
      const existing = new Set(check(await sb.from('occurrences').select('effort_key').in('effort_key', keys)).map(x => x.effort_key));
      const fresh = parsed.filter(p => !existing.has(p.effort_key));
      const save = h('button', { class: 'k-btn k-btn-primary', disabled: !fresh.length || null }, `Simpan ${fresh.length} kejadian baru`);
      const m = modal({ title: 'Pratinjau impor EFFORT — ' + file.name, wide: true, body: h('div', {},
        h('p', {}, `${parsed.length} kejadian terbaca · ${fresh.length} baru · ${parsed.length - fresh.length} sudah ada (dilewati).` + (Object.keys(skipped).length ? ` Di luar klaster dilewati: ${Object.entries(skipped).map(([k, v]) => `${k} (${v})`).join(', ')}.` : '')),
        h('div', { class: 'k-table-wrap', style: { maxHeight: '50vh' } }, h('table', { class: 'k-table' }, h('thead', {}, h('tr', {}, ['Tanggal (UTC)', 'Lokasi', 'Unit', 'Kategori', 'Aircraft', 'Saran KPI', 'Status'].map(x => h('th', {}, x)))),
          h('tbody', {}, parsed.map(p => h('tr', { class: existing.has(p.effort_key) ? '' : 'row-ok' }, h('td', {}, fmtDate(p.occurred_at, true)), h('td', {}, unitShort(p.unit_id)), h('td', {}, p.ats_unit), h('td', {}, p.category), h('td', {}, p.aircraft_id),
            h('td', {}, p.kpi_category ? badge(KREF.KPI_CATEGORY_LABEL[p.kpi_category], 'warn') : ''), h('td', {}, existing.has(p.effort_key) ? 'sudah ada' : 'baru')))))),
        h('p', { class: 'k-help' }, 'Kontribusi ANS default "Tidak" — tandai per kejadian setelah analisis (menu Occurrence → Ubah / tombol ANS). Saran kategori KPI hanya membantu, tetap diverifikasi.')),
        footer: [h('button', { class: 'k-btn', onclick: () => m.close() }, 'Batal'), save] });
      save.onclick = async () => {
        try { save.disabled = true; check(await sb.from('occurrences').upsert(fresh, { onConflict: 'effort_key', ignoreDuplicates: true })); toast(`${fresh.length} kejadian tersimpan.`, 'success'); m.close(); reload(); }
        catch (e) { toast(e.message, 'error'); save.disabled = false; }
      };
    } catch (e) { toast(e.message, 'error'); }
  }
  const occDef = {
    id: 'occurrence', title: 'Occurrence (EFFORT)', table: 'occurrences', perm: 'OCCURRENCE', domain: 'KESELAMATAN', itemName: 'kejadian', order: ['occurred_at', false],
    filters: { period: 'occurred_at', status: { label: 'Kontribusi ANS', opts: ['YA', 'TIDAK'], get: r => r.ans_contribution ? 'YA' : 'TIDAK' } }, evidence: { domain: 'KESELAMATAN', module: 'OCCURRENCE', period: r => r.occurred_at.slice(0, 7) },
    rowLabel: r => `${r.category} ${r.aircraft_id || ''}`,
    intro: 'Unggah file export EFFORT (hasil-export.xls). Duplikat dicegah (tanggal + lokasi + aircraft id + kategori). Tandai kontribusi ANS & kategori KPI lagging: Airprox Cat A/B, Coordination Error (BoC), Readback–Hearback, Facilities Issues.',
    rowClass: r => r.ans_contribution ? 'row-danger' : '',
    fields: [
      { k: 'occurred_at', l: 'Tanggal & jam (UTC)', t: 'datetime', req: true, list: true }, { k: 'ats_unit', l: 'ATS unit', t: 'select', opts: ['APP', 'TWR', 'AFIS'], list: true },
      { k: 'category', l: 'Kategori', t: 'list', opts: KREF.OCC_CATEGORIES, req: true, list: true }, { k: 'classification', l: 'Klasifikasi', t: 'list', opts: ['Other Occurrences', 'Incident', 'Serious Incident', 'Accident'] },
      { k: 'aircraft_id', l: 'Aircraft ID / callsign', list: true }, { k: 'reg', l: 'Registrasi' }, { k: 'ac_type', l: 'Tipe', list: true }, { k: 'operator', l: 'Operator' }, { k: 'pic_name', l: 'PIC' },
      { k: 'frules', l: 'Flight rules', t: 'select', opts: ['IFR', 'VFR'] }, { k: 'fphase', l: 'Fase terbang' }, { k: 'adep', l: 'ADEP', list: true }, { k: 'ades', l: 'ADES', list: true },
      { k: 'weather', l: 'Cuaca' }, { k: 'add_info', l: 'Info tambahan' }, { k: 'description', l: 'Kronologi', t: 'textarea', csv: true },
      { section: 'Klasifikasi KPI' },
      { k: 'ans_contribution', l: 'Kontribusi ANS', t: 'bool', boolLabel: 'Ya, ada kontribusi ANS', list: true, render: r => r.ans_contribution ? badge('ANS: YA', 'bad') : badge('Tidak') },
      { k: 'kpi_category', l: 'Kategori KPI lagging', t: 'select', opts: Object.entries(KREF.KPI_CATEGORY_LABEL), list: true, render: r => r.kpi_category ? KREF.KPI_CATEGORY_LABEL[r.kpi_category] : '' },
      { k: 'source', l: 'Sumber', readonly: true }, { k: 'note', l: 'Catatan analisis', t: 'textarea' }
    ],
    rowActions: [{ label: 'ANS', title: 'Ubah kontribusi ANS', perm: 'U', run: async (r, rl) => { try { check(await sb.from('occurrences').update({ ans_contribution: !r.ans_contribution, kpi_category: !r.ans_contribution ? (r.kpi_category || KREF.suggestKpi(r.category)) : r.kpi_category }).eq('id', r.id)); rl(); } catch (e) { toast(e.message, 'error'); } } }],
    headerActions: [{ label: '⬆ Impor export EFFORT', perm: 'C', run: ({ reload }) => importEffort(reload) }],
    print: { title: 'REKAPITULASI DATA KESELAMATAN', sig: 'KESELAMATAN', landscape: true, fields: ['occurred_at', 'ats_unit', 'category', 'aircraft_id', 'ac_type', 'adep', 'ades', 'ans_contribution', 'kpi_category'] }
  };
  KKS.register({ id: 'occurrence', title: 'Occurrence (EFFORT)', domain: 'KESELAMATAN', icon: '📡', perm: 'OCCURRENCE', order: 41, render: KCRUD.page(occDef) });

  // ======================= AVAILABILITY =======================
  const avgCNSA = (r) => { const v = ['c', 'n', 's', 'a'].map(k => r[k]).filter(x => x !== null && x !== undefined && x >= 0); return v.length ? v.reduce((a, b) => a + Number(b), 0) / v.length : null; };
  KKS.register({ id: 'availability', title: 'Availability CNSA', domain: 'KESELAMATAN', icon: '📶', perm: 'AVAILABILITY', order: 42, render: KCRUD.page({
    id: 'availability', title: 'Availability fasilitas telekomunikasi penerbangan', table: 'availability_monthly', perm: 'AVAILABILITY', domain: 'KESELAMATAN', itemName: 'availability', order: ['year', false, 'month', false],
    filters: { year: true, yearCol: 'year' },
    intro: 'Isi persentase C, N, S, A per lokasi per bulan. Kosongkan bila fasilitas tidak ada (NIL); rata-rata hanya dari nilai yang terisi (≥ 0). Target leading KPI ≥ 99%.',
    fields: [
      { k: 'year', l: 'Tahun', t: 'number', req: true, def: new Date().getFullYear(), list: true }, { k: 'month', l: 'Bulan', t: 'select', req: true, opts: BULAN.map((b, i) => [i + 1, b]), list: true },
      { k: 'c', l: 'C (%)', t: 'number', list: true, dec: 2 }, { k: 'n', l: 'N (%)', t: 'number', list: true, dec: 2 }, { k: 's', l: 'S (%)', t: 'number', list: true, dec: 2 }, { k: 'a', l: 'A (%)', t: 'number', list: true, dec: 2 },
      { k: '_avg', l: 'Rata-rata', form: false, list: true, render: r => { const a = avgCNSA(r); return a === null ? '' : badge(fmtNum(a, 2) + '%', a >= 99 ? 'ok' : 'bad'); } },
      { k: 'status_note', l: 'Status nilai 0', t: 'select', opts: ['NIL', 'UNSERVICEABLE', 'NIL & UNSERVICEABLE'] }, { k: 'note', l: 'Keterangan', t: 'textarea' }
    ]
  }) });

  // ======================= KPI SAFETY RATE & LAPMAN =======================
  async function kpiData(year, uptoMonth) {
    const units = state.unit === 'ALL' ? state.units.map(u => u.id) : [state.unit];
    const [tr, occ, av] = await Promise.all([
      KKS.fetchAll('traffic_monthly', q => q.eq('year', year).in('unit_id', units)),
      KKS.fetchAll('occurrences', q => q.gte('occurred_at', `${year}-01-01`).lt('occurred_at', `${year + 1}-01-01`).in('unit_id', units)),
      KKS.fetchAll('availability_monthly', q => q.eq('year', year).in('unit_id', units))]);
    const targets = (KKS.setting('kpi_targets', {})[year]) || {};
    const months = Array.from({ length: uptoMonth }, (_, i) => i + 1);
    const traffic = (m) => tr.filter(r => r.month === m).reduce((a, r) => a + r.total, 0);
    const events = (key, m) => occ.filter(o => o.ans_contribution && o.kpi_category === key && new Date(o.occurred_at).getUTCMonth() + 1 === m).length;
    const avail = (m) => { const v = av.filter(r => r.month === m).map(avgCNSA).filter(x => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const res = KREF.KPI.map(k => {
      const t = targets[k.key] ?? k.target;
      const per = months.map(m => {
        if (k.key === 'AVAIL') { const v = avail(m); return { m, value: v, ok: v === null ? null : v >= t }; }
        if (t === null) return { m, value: null, ok: null };
        const tf = traffic(m); const ev = events(k.key, m); const rate = tf ? ev / tf * 100000 : 0;
        return { m, events: ev, traffic: tf, value: rate, ok: rate <= t };
      });
      let cum;
      if (k.key === 'AVAIL') { const v = per.map(p => p.value).filter(x => x !== null); cum = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }
      else if (t !== null) { const ev = per.reduce((a, p) => a + p.events, 0), tf = per.reduce((a, p) => a + p.traffic, 0); cum = tf ? ev / tf * 100000 : 0; }
      return { ...k, target: t, per, cum, cumOk: cum === null || cum === undefined ? null : (k.pol === '<=' ? cum <= t : cum >= t) };
    });
    return { res, tr, occ, months, traffic };
  }
  async function kpiPage(c, params, actions) {
    const now = new Date(); let year = now.getFullYear(); let month = now.getMonth() || 12; if (!now.getMonth()) year--;
    const box = h('div');
    const yIn = h('input', { class: 'k-input', type: 'number', value: year, onchange: e => { year = +e.target.value; load(); } });
    const mIn = h('select', { class: 'k-input', onchange: e => { month = +e.target.value; load(); } }, BULAN.map((b, i) => h('option', { value: i + 1, selected: i + 1 === month || null }, b)));
    c.append(h('div', { class: 'k-intro' }, `KPI ${state.unit === 'ALL' ? 'klaster Tarakan (8 lokasi)' : KKS.unitName(state.unit)}. Lagging: rasio = kejadian dengan kontribusi ANS ÷ total traffic × 100.000 (tercapai bila ≤ target). Leading availability: rata-rata C/N/S/A (tercapai bila ≥ target). Tenggat: Lapman tgl 3, KPI tgl 5 (pusat menarik data tgl 6).`),
      h('div', { class: 'k-toolbar' }, h('label', { class: 'k-inline' }, 'Tahun ', yIn), h('label', { class: 'k-inline' }, 's.d. bulan ', mIn)), box);
    actions.append(h('button', { class: 'k-btn', onclick: () => printKpi(false) }, 'Cetak capaian KPI'), h('button', { class: 'k-btn k-btn-primary', onclick: () => printKpi(true) }, 'Cetak Lapman'));
    let D = null;
    const fmtV = (k, v) => v === null || v === undefined ? 'N/A' : k.key === 'AVAIL' ? fmtNum(v, 2) + '%' : fmtNum(v, 2);
    async function load() {
      box.innerHTML = '<div class="k-empty">Menghitung…</div>';
      D = await kpiData(year, month);
      box.innerHTML = '';
      const miss = D.months.filter(m => !D.traffic(m));
      if (miss.length) box.append(h('div', { class: 'k-alert k-alert-warning' }, `Traffic belum ada untuk: ${miss.map(m => BULAN[m - 1]).join(', ')} — rasio bulan tsb dianggap 0.`));
      box.append(h('div', { class: 'k-table-wrap' }, kpiTable(false)));
      const ansOcc = D.occ.filter(o => o.ans_contribution && new Date(o.occurred_at).getUTCMonth() + 1 <= month);
      box.append(h('div', { class: 'k-grid-2', style: { marginTop: '14px' } },
        h('div', { class: 'k-panel' }, h('h3', {}, `Kejadian dengan kontribusi ANS (Jan–${BULAN[month - 1]})`), ansOcc.length ? h('ul', { class: 'k-list' }, ansOcc.map(o => h('li', {}, h('span', {}, `${fmtDate(o.occurred_at)} · ${unitShort(o.unit_id)} · ${o.category} · ${o.aircraft_id || ''}`), badge(KREF.KPI_CATEGORY_LABEL[o.kpi_category] || 'belum dikategorikan', 'bad')))) : h('p', { class: 'k-help' }, 'Nihil.')),
        h('div', { class: 'k-panel' }, h('h3', {}, `Occurrence ${BULAN[month - 1]} ${year} per kategori`), (() => { const l = D.occ.filter(o => new Date(o.occurred_at).getUTCMonth() + 1 === month); const g = {}; l.forEach(o => g[o.category] = (g[o.category] || 0) + 1); return Object.keys(g).length ? h('ul', { class: 'k-list' }, Object.entries(g).sort((a, b) => b[1] - a[1]).map(([k, v]) => h('li', {}, h('span', {}, k), h('b', {}, v)))) : h('p', { class: 'k-help' }, 'Tidak ada data.'); })())));
    }
    function kpiTable(pr) {
      const cls = pr ? 'p-table small' : 'k-matrix';
      return h('table', { class: cls }, h('thead', {}, h('tr', {}, h('th', {}, 'Kode'), h('th', {}, 'Indikator'), h('th', {}, 'Pol.'), h('th', {}, 'Target'), D.months.map(m => h('th', {}, BULAN[m - 1].slice(0, 3))), h('th', {}, 'Kumulatif'), h('th', {}, 'Status'))),
        h('tbody', {}, D.res.map(k => h('tr', {}, h('td', {}, k.code), h('td', {}, k.name), h('td', { class: 'c center' }, k.pol), h('td', { class: 'c center' }, k.target === null ? 'N/A' : k.key === 'AVAIL' ? k.target + '%' : k.target),
          k.per.map(p => h('td', { class: 'c center', title: p.events !== undefined ? `${p.events} kejadian / ${p.traffic} traffic` : '' }, fmtV(k, p.value))),
          h('td', { class: 'c center' }, h('b', {}, fmtV(k, k.cum))), h('td', { class: 'c center' }, k.cumOk === null ? 'N/A' : pr ? (k.cumOk ? 'Tercapai' : 'Tidak tercapai') : badge(k.cumOk ? 'Tercapai' : 'Tidak tercapai', k.cumOk ? 'ok' : 'bad'))))),
        h('tfoot', {}, h('tr', {}, h('td', { colspan: 4 }, 'Total traffic'), D.months.map(m => h('td', { class: 'c center' }, fmtNum(D.traffic(m)))), h('td', { class: 'c center' }, fmtNum(D.months.reduce((a, m) => a + D.traffic(m), 0))), h('td', {}))));
    }
    function printKpi(lapman) {
      if (!D) return;
      const occM = D.occ.filter(o => new Date(o.occurred_at).getUTCMonth() + 1 === month).sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
      const body = [h('h4', {}, `Capaian KPI Safety Rate Januari – ${BULAN[month - 1]} ${year}`), kpiTable(true)];
      if (lapman) body.push(h('h4', {}, `Rekapitulasi data keselamatan bulan ${BULAN[month - 1]} ${year}`),
        KPRINT.tableNode([{ l: 'Tanggal (UTC)', v: o => fmtDate(o.occurred_at, true) }, { l: 'Lokasi', v: o => unitShort(o.unit_id) }, { l: 'Unit', v: o => o.ats_unit }, { l: 'Kategori', v: o => o.category }, { l: 'Aircraft', v: o => `${o.aircraft_id || ''} ${o.ac_type || ''}` }, { l: 'Rute', v: o => `${o.adep || ''}–${o.ades || ''}` }, { l: 'Kontribusi ANS', v: o => o.ans_contribution ? 'YES' : 'NO', cls: 'center' }], occM, { small: true }),
        h('p', {}, `Jumlah kejadian bulan ${BULAN[month - 1]}: ${occM.length}; dengan kontribusi ANS: ${occM.filter(o => o.ans_contribution).length}.`));
      KPRINT.doc({ title: lapman ? `LAPORAN MANAJEMEN BIDANG KESELAMATAN BULAN ${BULAN[month - 1].toUpperCase()} ${year}` : `CAPAIAN KPI SAFETY RATE ${state.unit === 'ALL' ? 'KLASTER TARAKAN' : ''} TAHUN ${year}`,
        subtitle: state.unit === 'ALL' ? 'Perum LPPNPI Cabang Tarakan & Klaster' : null, unit: state.unit === 'ALL' ? 'TRK' : state.unit, landscape: true, sig: 'KESELAMATAN', body });
    }
    load();
  }
  KKS.register({ id: 'kpi', title: 'KPI Safety Rate & Lapman', domain: 'KESELAMATAN', icon: '📈', perm: 'KPI', order: 43, render: kpiPage });

  // ======================= HAZARD / HIRA =======================
  const tolBadge = (t) => t ? h('span', { class: 'k-badge tol-' + t }, t) : '';
  function icaoMatrix() {
    const t = h('table', { class: 'k-riskgrid' }, h('tr', {}, h('th', {}, 'P \\ S'), KREF.ICAO_SEV.map(([s, l]) => h('th', { title: l }, s))));
    KREF.ICAO_PROB.forEach(([p, l]) => t.append(h('tr', {}, h('th', { title: l }, p), KREF.ICAO_SEV.map(([s]) => h('td', { class: 'tol-' + KREF.icaoTol(p, s) }, p + s)))));
    return h('div', { class: 'k-panel' }, h('h3', {}, 'Matriks risiko ICAO 5×5'), h('div', { style: { display: 'flex', gap: '20px', flexWrap: 'wrap' } }, t,
      h('div', { class: 'k-help' }, h('p', {}, 'Probability: 5 Frequent · 4 Occasional · 3 Remote · 2 Improbable · 1 Extremely Improbable'), h('p', {}, 'Severity: A Catastrophic · B Hazardous · C Major · D Minor · E Negligible'),
        h('p', {}, tolBadge('INTOLERABLE'), ' 5A 5B 5C 4A 4B 3A'), h('p', {}, tolBadge('TOLERABLE'), ' 5D 5E 4C 4D 4E 3B 3C 3D 2A 2B 2C 1A'), h('p', {}, tolBadge('ACCEPTABLE'), ' lainnya'))));
  }
  const hazardDef = {
    id: 'hazard', title: 'Hazard & HIRA operasional', table: 'hazards', perm: 'HAZARD', domain: 'KESELAMATAN', itemName: 'hazard', order: ['state', false, 'found_at', false],
    top: (t) => t.append(icaoMatrix()), filters: { status: { k: 'state', label: 'Status', opts: ['OPEN', 'CLOSED'] } },
    evidence: { domain: 'KESELAMATAN', module: 'HAZARD' }, rowLabel: r => r.description.slice(0, 50),
    rowClass: r => r.state === 'OPEN' && (r.rtolerability || r.tolerability) === 'INTOLERABLE' ? 'row-danger' : r.state === 'CLOSED' ? 'row-ok' : '',
    fields: [
      { k: 'code', l: 'ID (dari Divisi SO)', list: true }, { k: 'found_at', l: 'Tanggal', t: 'date', def: 'today', list: true }, { k: 'location', l: 'Lokasi hazard' },
      { k: 'verification', l: 'Verifikasi', t: 'select', opts: ['Unverified', 'Verified'], def: 'Unverified' }, { k: 'state', l: 'Status', t: 'select', opts: ['OPEN', 'CLOSED'], def: 'OPEN', list: true, render: r => badge(r.state, r.state === 'OPEN' ? 'warn' : 'ok') },
      { k: 'description', l: 'Deskripsi hazard', t: 'textarea', req: true, list: true, cls: 'wrap' }, { k: 'source', l: 'Sumber hazard', t: 'list', opts: KREF.HAZARD_SOURCES, list: true },
      { k: 'category', l: 'Kategori', t: 'list', opts: KREF.HAZARD_CATEGORIES }, { k: 'subcategory', l: 'Sub-kategori' }, { k: 'consequence', l: 'Konsekuensi', t: 'textarea' }, { k: 'current_mitigation', l: 'Mitigasi saat ini', t: 'textarea' },
      { section: 'Risk assessment' },
      { k: 'prob', l: 'Probability', t: 'select', opts: KREF.ICAO_PROB.map(([p, l]) => [p, `${p} – ${l}`]), req: true }, { k: 'sev', l: 'Severity', t: 'select', opts: KREF.ICAO_SEV.map(([s, l]) => [s, `${s} – ${l}`]), req: true },
      { k: 'risk_index', l: 'Risk index', form: false, list: true, render: r => h('span', {}, h('b', {}, r.risk_index || ''), ' ', tolBadge(r.tolerability)) },
      { section: 'Risk mitigation' },
      { k: 'barrier_prev', l: 'Barrier preventive (CAP)', t: 'textarea' }, { k: 'barrier_prot', l: 'Barrier protective', t: 'textarea' },
      { k: 'rprob', l: 'Probability residual', t: 'select', opts: KREF.ICAO_PROB.map(([p, l]) => [p, `${p} – ${l}`]) }, { k: 'rsev', l: 'Severity residual', t: 'select', opts: KREF.ICAO_SEV.map(([s, l]) => [s, `${s} – ${l}`]) },
      { k: 'rrisk_index', l: 'Residual', form: false, list: true, render: r => r.rrisk_index ? h('span', {}, h('b', {}, r.rrisk_index), ' ', tolBadge(r.rtolerability)) : '' },
      { k: 'accountability', l: 'Accountability (PIC)', t: 'list', opts: KREF.PIC_LIST, list: true }, { k: 'target_date', l: 'Target', t: 'date' },
      { k: 'recommendation', l: 'Safety recommendation', t: 'textarea' }, { k: 'last_update', l: 'Update terakhir', t: 'textarea' }, { k: 'quarter', l: 'Triwulan monitoring', t: 'select', opts: ['TW I', 'TW II', 'TW III', 'TW IV'] }, { k: 'note', l: 'Keterangan', t: 'textarea' }
    ],
    headerActions: [{ label: 'Cetak HIRA', run: ({ rows }) => KPRINT.table({ title: 'HAZARD IDENTIFICATION & RISK ASSESSMENT (HIRA)', landscape: true, small: true, sig: 'KESELAMATAN', rows: rows(),
      cols: [{ l: 'ID', v: r => r.code || '' }, { l: 'Tanggal', v: r => fmtDate(r.found_at) }, { l: 'Status', v: r => `${r.verification}/${r.state}` }, { l: 'Deskripsi', v: r => r.description }, { l: 'Sumber', v: r => r.source || '' }, { l: 'Kategori', v: r => r.category || '' }, { l: 'Konsekuensi', v: r => r.consequence || '' },
        { l: 'Mitigasi saat ini', v: r => r.current_mitigation || '' }, { l: 'Risk Index', v: r => r.risk_index, cls: 'center' }, { l: 'Tolerability', v: r => r.tolerability, cls: 'center' }, { l: 'Preventive', v: r => r.barrier_prev || '' }, { l: 'Protective', v: r => r.barrier_prot || '' },
        { l: 'Residual', v: r => r.rrisk_index || '', cls: 'center' }, { l: 'Tolerability', v: r => r.rtolerability || '', cls: 'center' }, { l: 'Accountability', v: r => r.accountability || '' }, { l: 'Update', v: r => r.last_update || '' }] }) }]
  };
  KKS.register({ id: 'hazard', title: 'Hazard / HIRA', domain: 'KESELAMATAN', icon: '☢️', perm: 'HAZARD', order: 44, render: KCRUD.page(hazardDef) });

  // ======================= SAG =======================
  const sagDef = {
    id: 'sag', title: 'Safety Action Group (SAG)', table: 'sag_meetings', perm: 'SAG', domain: 'KESELAMATAN', itemName: 'SAG', order: ['date', false], filters: { year: true, yearDate: 'date' },
    evidence: { domain: 'KESELAMATAN', module: 'SAG' }, rowLabel: r => r.number || fmtDate(r.date),
    intro: 'PER.003/LPPNPI/III/2020: SAG minimal 1× per 3 bulan, dipimpin GM. Saat membuka isu, sistem menarik isu terbuka SAG sebelumnya + hazard terbuka + temuan terbuka.',
    presets: () => ({ year: new Date().getFullYear(), quarter: KKS.quarterOf(new Date()) }),
    onFormReady: (form) => {
      const d = form.querySelector('#f_date'), n = form.querySelector('#f_number');
      d && d.addEventListener('change', async () => {
        if (n.value) return;
        const dt = new Date(d.value + 'T00:00'); const y = dt.getFullYear();
        const cnt = check(await sb.from('sag_meetings').select('id', { count: 'exact' }).gte('date', `${y}-01-01`).lte('date', `${y}-12-31`)).length;
        n.value = `${String(cnt + 1).padStart(3, '0')}/SAG/${ROMAWI[dt.getMonth()]}/${y}`;
        form.querySelector('#f_year').value = y; form.querySelector('#f_quarter').value = Math.floor(dt.getMonth() / 3) + 1;
      });
    },
    fields: [
      { k: 'date', l: 'Tanggal', t: 'date', req: true, list: true }, { k: 'number', l: 'Nomor MoM', list: true, help: 'Otomatis: 00n/SAG/<bulan romawi>/<tahun> (saran)' },
      { k: 'year', l: 'Tahun', t: 'number' }, { k: 'quarter', l: 'Triwulan', t: 'select', opts: [[1, 'I'], [2, 'II'], [3, 'III'], [4, 'IV']], list: true },
      { k: 'place', l: 'Tempat', list: true }, { k: 'mode', l: 'Mode', t: 'select', opts: ['Hybrid', 'Luring', 'Daring'], def: 'Hybrid' },
      { k: 'chair', l: 'Pimpinan rapat', def: 'General Manager' }, { k: 'participants', l: 'Peserta', t: 'textarea', def: 'GM (Chairman); MO; MKKS; PT. MT; MAK; perwakilan personel Operasi & Teknik; Safety Officer; Kepala Capem; para Kepala Unit; Ksatria Tarakan' },
      { k: 'srb_ref', l: 'SRB reference number' }, { k: 'ba_number', l: 'Nomor Berita Acara', ph: 'BAC.0xx/G/24/LPPNPI/KMP/<romawi>/<tahun>' },
      { k: 'status', l: 'Status', t: 'select', opts: ['RENCANA', 'SELESAI', 'DISETUJUI'], def: 'RENCANA', list: true, render: r => badge(r.status, r.status === 'RENCANA' ? 'info' : 'ok') },
      { k: 'summary', l: 'Ringkasan / catatan', t: 'textarea' }
    ],
    rowActions: [{ label: 'Isu SAG', run: (r) => KKS.go('sag-isu', { id: r.id }) }]
  };
  KKS.register({ id: 'sag', title: 'SAG', domain: 'KESELAMATAN', icon: '🤝', perm: 'SAG', order: 45, render: KCRUD.page(sagDef) });

  async function sagIssuesPage(c, params, actions) {
    if (!params.id) { c.append(h('div', { class: 'k-alert k-alert-info' }, 'Pilih SAG dari menu SAG → tombol "Isu SAG".')); return; }
    const mtg = check(await sb.from('sag_meetings').select('*').eq('id', params.id).single());
    actions.append(h('button', { class: 'k-btn', onclick: () => KKS.go('sag') }, '← Daftar SAG'));
    const issueDef = {
      id: 'sag-issue', title: 'Isu SAG', table: 'sag_issues', perm: 'SAG', itemName: 'isu', order: ['created_at', true],
      query: q => q.eq('meeting_id', mtg.id), presets: () => ({ unit_id: mtg.unit_id }), beforeSave: (v) => ({ ...v, meeting_id: mtg.id }),
      rowClass: r => r.status === 'TERPENUHI' ? 'row-ok' : '',
      fields: [{ k: 'issue', l: 'Safety issue', t: 'textarea', req: true, list: true, cls: 'wrap' }, { k: 'mitigation', l: 'Mitigation plan', t: 'textarea', list: true, cls: 'wrap' },
        { k: 'pic', l: 'PIC', t: 'list', opts: KREF.PIC_LIST, list: true }, { k: 'target', l: 'Target', list: true },
        { k: 'status', l: 'Status', t: 'select', opts: ['DITINDAKLANJUTI', 'TERPENUHI'], def: 'DITINDAKLANJUTI', list: true, render: r => badge(r.status, r.status === 'TERPENUHI' ? 'ok' : 'warn') }, { k: 'note', l: 'Catatan', t: 'textarea' }],
      headerActions: [
        { label: '⇩ Tarik isu terbuka', perm: 'C', run: async ({ reload, rows }) => {
          const have = rows(); const prevMeet = check(await sb.from('sag_meetings').select('id').eq('unit_id', mtg.unit_id).lt('date', mtg.date).order('date', { ascending: false }).limit(1))[0];
          const add = [];
          if (prevMeet) check(await sb.from('sag_issues').select('*').eq('meeting_id', prevMeet.id).neq('status', 'TERPENUHI')).forEach(i => { if (!have.some(x => x.origin_issue_id === i.id)) add.push({ unit_id: mtg.unit_id, meeting_id: mtg.id, origin_issue_id: i.origin_issue_id || i.id, hazard_id: i.hazard_id, finding_id: i.finding_id, issue: i.issue, mitigation: i.mitigation, pic: i.pic, target: i.target }); });
          check(await sb.from('hazards').select('*').eq('unit_id', mtg.unit_id).eq('state', 'OPEN')).forEach(hz => { if (!have.some(x => x.hazard_id === hz.id) && !add.some(x => x.hazard_id === hz.id)) add.push({ unit_id: mtg.unit_id, meeting_id: mtg.id, hazard_id: hz.id, issue: `[Hazard ${hz.risk_index || ''}] ${hz.description}`, mitigation: hz.barrier_prev, pic: hz.accountability, target: hz.target_date ? fmtDate(hz.target_date) : null }); });
          check(await sb.from('findings').select('*').eq('unit_id', mtg.unit_id).neq('status', 'CLOSED').in('field', ['ATS', 'CNS', 'AFIS', 'SMS', '170', '172'])).forEach(f => { if (!have.some(x => x.finding_id === f.id) && !add.some(x => x.finding_id === f.id)) add.push({ unit_id: mtg.unit_id, meeting_id: mtg.id, finding_id: f.id, issue: `[Temuan ${f.source || ''} ${f.pq_no || ''}] ${f.finding}`, mitigation: f.cap, pic: f.pic, target: f.target_date_new || f.target_date ? fmtDate(f.target_date_new || f.target_date) : null }); });
          if (!add.length) return toast('Tidak ada isu terbuka baru untuk ditarik.', 'info');
          try { check(await sb.from('sag_issues').insert(add)); toast(`${add.length} isu ditarik.`, 'success'); reload(); } catch (e) { toast(e.message, 'error'); }
        } },
        { label: 'Cetak MoM', run: ({ rows }) => printSag(rows(), false) }, { label: 'Cetak Berita Acara', run: ({ rows }) => printSag(rows(), true) }]
    };
    c.append(h('div', { class: 'k-intro' }, `SAG ${mtg.number || ''} — ${KKS.fmtDateLong(mtg.date)} · ${mtg.place || ''} (${mtg.mode})`));
    function printSag(rows, ba) {
      const done = rows.filter(r => r.status === 'TERPENUHI').length;
      const info = h('table', { class: 'p-kv' }, ...[['Location', mtg.place], ['Date', KKS.fmtDateLong(mtg.date)], ['Number', ba ? mtg.ba_number : mtg.number], ['SRB Reference Number', mtg.srb_ref], ['Participants', mtg.participants]].map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, ': ' + (v || '-')))));
      KPRINT.doc({ title: ba ? 'BERITA ACARA SAFETY ACTION GROUP (SAG)' : 'MINUTES OF MEETING SAFETY ACTION GROUP (SAG)', unit: mtg.unit_id, date: mtg.date, landscape: !ba, sig: ba ? [['Dibuat oleh,', 'Manager KKS'], ['Mengetahui,', 'General Manager']] : [['Notulen,', 'Manager KKS'], ['Chairman,', mtg.chair || 'General Manager']],
        body: [info, ba ? h('p', {}, `Pada hari ini telah dilaksanakan Safety Action Group (SAG) triwulan ${ROMAWI[(mtg.quarter || 1) - 1]} tahun ${mtg.year || ''} dengan jumlah isu sebanyak ${rows.length} isu, ${rows.length - done} isu masih ditindaklanjuti dan ${done} isu telah terpenuhi.`) : null,
          KPRINT.tableNode([{ l: 'Safety Issues', v: r => r.issue }, { l: 'Mitigation Plans', v: r => r.mitigation || '' }, { l: 'PIC', v: r => r.pic || '' }, { l: 'Target', v: r => r.target || '' }, { l: 'Status', v: r => r.status }], rows, { small: ba })] });
    }
    await KCRUD.page(issueDef)(c, {}, actions);
  }
  KKS.register({ id: 'sag-isu', title: 'Isu SAG', domain: 'KESELAMATAN', perm: 'SAG', hidden: true, render: sagIssuesPage });

  // ======================= SAFETY RECOMMENDATION, RSA, KEGIATAN =======================
  KKS.register({ id: 'safrec', title: 'Safety recommendation', domain: 'KESELAMATAN', icon: '💡', perm: 'SAFREC', order: 46, render: KCRUD.page({
    id: 'safrec', title: 'Safety recommendation (airprox / RI)', table: 'safety_recommendations', perm: 'SAFREC', domain: 'KESELAMATAN', itemName: 'rekomendasi', order: ['event_date', false],
    filters: { status: { k: 'status', opts: ['OPEN', 'IN PROGRESS', 'CLOSED'] } }, evidence: { domain: 'KESELAMATAN', module: 'SAFREC' }, rowLabel: r => r.event,
    fields: [
      { k: 'period', l: 'Periode (triwulan)', list: true, ph: 'TW IV 2025' }, { k: 'event', l: 'Kejadian (callsign)', req: true, list: true }, { k: 'event_date', l: 'Tanggal kejadian', t: 'date', list: true },
      { k: 'category', l: 'Kategori', t: 'select', opts: ['A', 'B', 'C', 'D', 'E'], list: true }, { k: 'ans_contribution', l: 'Kontribusi ANS', t: 'bool', list: true },
      { k: 'recommendation', l: 'Rekomendasi', t: 'textarea', req: true, list: true, cls: 'wrap' }, { k: 'follow_up', l: 'Tindak lanjut', t: 'textarea', list: true, cls: 'wrap' },
      { k: 'target_date', l: 'Target date', t: 'date', list: true }, { k: 'pic', l: 'PIC', t: 'list', opts: KREF.PIC_LIST, list: true },
      { k: 'status', l: 'Status', t: 'select', opts: ['OPEN', 'IN PROGRESS', 'CLOSED'], def: 'OPEN', list: true, render: r => badge(r.status, r.status === 'CLOSED' ? 'ok' : 'warn') }, { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    print: { title: 'MONITORING TINDAK LANJUT SAFETY RECOMMENDATION', sig: 'KESELAMATAN', landscape: true }
  }) });

  KKS.register({ id: 'rsa', title: 'RSA self-assessment', domain: 'KESELAMATAN', icon: '🧭', perm: 'RSA', order: 47, render: KCRUD.page({
    id: 'rsa', title: 'Routine SMS Assessment (review SMS maturity)', table: 'rsa_items', perm: 'RSA', domain: 'KESELAMATAN', itemName: 'PQ', order: ['pq', true], filters: { year: true, yearCol: 'year' },
    intro: '49 PQ pada 4 komponen ICAO (Safety Policy & Objectives, Safety Risk Management, Safety Assurance, Safety Promotion). Nilai: P (Present), S (Suitable), O (Operating), E (Effective), N/A.',
    fields: [
      { k: 'year', l: 'Tahun', t: 'number', req: true, def: new Date().getFullYear(), list: true }, { k: 'pq', l: 'PQ', req: true, list: true, ph: '1.1.1' },
      { k: 'component', l: 'Komponen', t: 'select', opts: ['1 Safety Policy & Objectives', '2 Safety Risk Management', '3 Safety Assurance', '4 Safety Promotion'], list: true },
      { k: 'element', l: 'Elemen', list: true }, { k: 'indicator', l: 'Indikator', t: 'textarea' },
      { k: 'previous', l: 'Previous RSA (DNP)', t: 'select', opts: ['P', 'S', 'O', 'E', 'N/A'], list: true }, { k: 'current_val', l: 'Current condition', t: 'select', opts: ['P', 'S', 'O', 'E', 'N/A'], list: true },
      { k: 'how', l: 'How it is achieved', t: 'textarea' }, { k: 'justification', l: 'Comments / justification', t: 'textarea' }, { k: 'evidence_url', l: 'Evidence link' }
    ]
  }) });

  KKS.register({ id: 'kegiatan-keselamatan', title: 'Kegiatan keselamatan', domain: 'KESELAMATAN', icon: '📣', perm: 'KEGIATAN', order: 48, render: KMOD.activities('KESELAMATAN', 'Kegiatan keselamatan (safety promotion, postflight, PUTA, dll.)') });
})();
