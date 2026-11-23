/**
 * Mesin daftar + formulir generik untuk semua modul.
 * Satu definisi (kolom, jenis isian, filter, aksi) → halaman daftar, form tambah/ubah, hapus, ekspor CSV, cetak PDF.
 */
(() => {
  const { h, esc, sb, check, fmtDate, fmtNum, fmtRp, toast, modal, confirmBox, state, can, unitShort, today } = KKS;

  // ---------- Nilai tampilan ----------
  function display(f, v, row) {
    if (f.render) return f.render(row);
    if (v === null || v === undefined || v === '') return '';
    switch (f.t) {
      case 'date': return fmtDate(v);
      case 'datetime': return fmtDate(v, true);
      case 'bool': return v ? 'Ya' : 'Tidak';
      case 'money': return fmtRp(v);
      case 'number': return fmtNum(v, f.dec || 0);
      case 'multi': return Array.isArray(v) ? v.join(', ') : v;
      case 'select': { const o = (typeof f.opts === 'function' ? f.opts() : f.opts || []).find(o => (Array.isArray(o) ? o[0] : o) === v); return o ? (Array.isArray(o) ? o[1] : o) : v; }
      case 'rows': return Array.isArray(v) ? `${v.length} baris` : '';
      default: return String(v);
    }
  }
  const textOf = (node) => node instanceof Node ? node.textContent : String(node ?? '');

  // ---------- Pembuat input ----------
  const toLocalDT = (v) => { if (!v) return ''; const d = new Date(v); const p = KKS.pad; return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  function optsOf(f) { return (typeof f.opts === 'function' ? f.opts() : f.opts || []).map(o => Array.isArray(o) ? o : [o, o]); }

  function buildInput(f, value, ctx) {
    if (typeof f.def === 'function') f = { ...f, def: f.def() };
    const id = 'f_' + f.k;
    const attrs = { id, name: f.k, class: 'k-input', required: f.req || null, disabled: f.readonly || null, placeholder: f.ph || null };
    switch (f.t) {
      case 'textarea': return h('textarea', { ...attrs, rows: f.rows || 3 }, value ?? '');
      case 'number': case 'money': return h('input', { ...attrs, type: 'number', step: f.step || 'any', min: f.min ?? null, max: f.max ?? null, value: value ?? '' });
      case 'date': return h('input', { ...attrs, type: 'date', value: value ? String(value).slice(0, 10) : (f.def === 'today' ? today() : '') });
      case 'datetime': return h('input', { ...attrs, type: 'datetime-local', value: toLocalDT(value) });
      case 'time': return h('input', { ...attrs, type: 'time', value: value ? String(value).slice(0, 5) : '' });
      case 'bool': return h('label', { class: 'k-check' }, h('input', { type: 'checkbox', id, name: f.k, checked: value === undefined ? !!f.def : !!value, disabled: f.readonly || null }), ' ', f.boolLabel || 'Ya');
      case 'select': {
        const sel = h('select', attrs, f.req ? null : h('option', { value: '' }, '—'));
        optsOf(f).forEach(([v, l]) => sel.append(h('option', { value: v, selected: String(value ?? f.def ?? '') === String(v) || null }, l)));
        if (value && !optsOf(f).some(([v]) => String(v) === String(value))) sel.append(h('option', { value, selected: true }, value));
        return sel;
      }
      case 'list': { // teks bebas + saran
        const dl = 'dl_' + f.k;
        return h('span', {}, h('input', { ...attrs, list: dl, value: value ?? f.def ?? '' }), h('datalist', { id: dl }, optsOf(f).map(([v]) => h('option', { value: v }))));
      }
      case 'multi': {
        const vals = new Set(Array.isArray(value) ? value : (Array.isArray(f.def) ? f.def : []));
        return h('div', { class: 'k-multi', id, 'data-multi': f.k }, optsOf(f).map(([v, l]) =>
          h('label', { class: 'k-check' }, h('input', { type: 'checkbox', value: v, checked: vals.has(v) || null }), ' ', l)));
      }
      case 'ref': {
        const sel = h('select', attrs, h('option', { value: '' }, 'Memuat…'));
        (async () => {
          let q = sb.from(f.ref.table).select(f.ref.select || '*');
          const unit = ctx.unit();
          if (unit && !f.ref.anyUnit) q = q.eq('unit_id', unit);
          if (f.ref.filter) q = f.ref.filter(q);
          if (f.ref.order) q = q.order(f.ref.order[0], { ascending: f.ref.order[1] !== false });
          const rows = check(await q.limit(2000));
          sel.innerHTML = '';
          sel.append(h('option', { value: '' }, f.req ? '— pilih —' : '—'));
          rows.forEach(r => sel.append(h('option', { value: r.id, selected: String(value) === String(r.id) || null }, f.ref.label(r))));
          if (f.onRefLoaded) f.onRefLoaded(rows, sel);
        })().catch(e => { sel.innerHTML = ''; sel.append(h('option', { value: '' }, 'Gagal memuat')); console.error(e); });
        return sel;
      }
      case 'rows': return rowsEditor(f, Array.isArray(value) ? value : (f.def ? JSON.parse(JSON.stringify(f.def)) : []));
      default: return h('input', { ...attrs, type: f.t === 'email' ? 'email' : 'text', value: value ?? f.def ?? '' });
    }
  }

  /** Editor tabel kecil untuk kolom jsonb array (mis. tahapan JSA, baris RAB, perlakuan risiko). */
  function rowsEditor(f, rows) {
    const wrap = h('div', { class: 'k-rows', 'data-rows': f.k });
    const tbody = h('tbody');
    const addRow = (r = {}) => {
      const tr = h('tr');
      f.cols.forEach(c => tr.append(h('td', {}, c.t === 'textarea'
        ? h('textarea', { class: 'k-input', 'data-c': c.k, rows: 2 }, r[c.k] ?? '')
        : h('input', { class: 'k-input', 'data-c': c.k, type: c.t === 'number' ? 'number' : (c.t === 'date' ? 'date' : 'text'), step: 'any', value: r[c.k] ?? '' }))));
      tr.append(h('td', {}, h('button', { type: 'button', class: 'k-icon-btn', title: 'Hapus baris', onclick: () => tr.remove() }, '✕')));
      tbody.append(tr);
    };
    rows.forEach(addRow);
    wrap.append(h('table', { class: 'k-rows-table' }, h('thead', {}, h('tr', {}, f.cols.map(c => h('th', { style: c.w ? { width: c.w } : null }, c.l)), h('th', {}))), tbody),
      h('button', { type: 'button', class: 'k-btn k-btn-sm', onclick: () => addRow() }, '+ Tambah baris'));
    wrap.getValue = () => Array.from(tbody.children).map(tr => {
      const o = {}; tr.querySelectorAll('[data-c]').forEach(inp => {
        const c = f.cols.find(x => x.k === inp.dataset.c);
        o[inp.dataset.c] = c.t === 'number' ? (inp.value === '' ? null : Number(inp.value)) : inp.value;
      }); return o;
    }).filter(o => Object.values(o).some(v => v !== '' && v !== null));
    return wrap;
  }

  function readValue(f, form) {
    if (f.t === 'multi') return Array.from(form.querySelectorAll(`[data-multi="${f.k}"] input:checked`)).map(i => i.value);
    if (f.t === 'rows') { const w = form.querySelector(`[data-rows="${f.k}"]`); return w ? w.getValue() : []; }
    const el = form.querySelector('#f_' + f.k);
    if (!el) return undefined;
    if (f.t === 'bool') return el.checked;
    const v = el.value;
    if (v === '') return null;
    if (f.t === 'number' || f.t === 'money') return Number(v);
    if (f.t === 'datetime') return new Date(v).toISOString();
    return v;
  }

  // ---------- Form ----------
  /**
   * Buka form tambah/ubah. Mengembalikan Promise<row|null>.
   * opts: { def, row, presets, title }
   */
  function openForm(def, row, presets = {}) {
    return new Promise((resolve) => {
      const isNew = !row;
      const data = { ...(presets || {}), ...(row || {}) };
      const form = h('form', { class: 'k-form', novalidate: true });
      let unitSel = null;
      const unitsAllowed = state.units.filter(u => can(def.perm, isNew ? 'C' : 'U', u.id));
      const curUnit = data.unit_id || (state.unit !== 'ALL' ? state.unit : (unitsAllowed[0] || {}).id);
      if (def.unitless !== true) {
        unitSel = h('select', { class: 'k-input', id: 'f_unit_id', required: true, disabled: (!isNew || unitsAllowed.length <= 1) || null });
        (isNew ? unitsAllowed : state.units).forEach(u => unitSel.append(h('option', { value: u.id, selected: u.id === curUnit || null }, `${u.short_name} (${u.icao})`)));
        form.append(h('label', { class: 'k-field' }, h('span', {}, 'Lokasi'), unitSel));
      }
      const ctx = { unit: () => unitSel ? unitSel.value : curUnit, data, isNew };
      const fieldEls = {};
      (def.fields || []).filter(f => f.form !== false && !(isNew && f.editOnly)).forEach(f => {
        if (f.section) { form.append(h('div', { class: 'k-form-section' }, f.section)); return; }
        const input = buildInput(f, data[f.k], ctx);
        const lab = h('label', { class: 'k-field' + (f.span ? ' span-' + f.span : '') + (f.t === 'rows' || f.t === 'multi' || f.t === 'textarea' ? ' span-full' : '') },
          h('span', {}, f.l, f.req ? h('b', { class: 'req' }, ' *') : null), input, f.help ? h('small', { class: 'k-help' }, f.help) : null);
        fieldEls[f.k] = lab;
        form.append(lab);
      });
      const applyShowIf = () => {
        const vals = collect(false);
        (def.fields || []).forEach(f => { if (f.showIf && fieldEls[f.k]) fieldEls[f.k].hidden = !f.showIf(vals); });
      };
      function collect(strict = true) {
        const vals = {};
        (def.fields || []).filter(f => f.form !== false && !f.section && !(isNew && f.editOnly) && !f.readonly).forEach(f => {
          if (fieldEls[f.k] && fieldEls[f.k].hidden) return;
          const v = readValue(f, form);
          if (v !== undefined) vals[f.k] = v;
        });
        if (unitSel) vals.unit_id = unitSel.value;
        if (strict) {
          const missing = (def.fields || []).filter(f => f.req && fieldEls[f.k] && !fieldEls[f.k].hidden && (vals[f.k] === null || vals[f.k] === '' || vals[f.k] === undefined || (Array.isArray(vals[f.k]) && !vals[f.k].length)));
          if (missing.length) throw new Error('Wajib diisi: ' + missing.map(f => f.l).join(', '));
        }
        return vals;
      }
      form.addEventListener('change', applyShowIf);
      if (def.onFormReady) def.onFormReady(form, ctx);
      applyShowIf();

      const extra = def.formExtra ? def.formExtra(row, ctx) : null;
      const evBox = (!isNew && def.evidence) ? h('div', { class: 'k-form-evidence' }) : null;
      const saveBtn = h('button', { class: 'k-btn k-btn-primary', type: 'button' }, isNew ? 'Simpan' : 'Simpan perubahan');
      let saved = null;
      const m = modal({
        title: (isNew ? 'Tambah ' : 'Ubah ') + (def.itemName || def.title),
        wide: def.wideForm !== false,
        body: h('div', {}, form, extra, evBox ? h('div', { class: 'k-form-section' }, 'Evidence (foto / PDF)') : null, evBox,
          isNew && def.evidence ? h('p', { class: 'k-help' }, 'Evidence dapat ditambahkan setelah data disimpan.') : null),
        footer: [h('button', { class: 'k-btn', type: 'button', onclick: () => m.close() }, 'Tutup'), (isNew ? can(def.perm, 'C') : (can(def.perm, 'U') || can(def.perm, 'A'))) ? saveBtn : null],
        onClose: () => resolve(saved)
      });
      if (evBox) KEVID.widget(evBox, evidenceCtx(def, row));
      saveBtn.addEventListener('click', async () => {
        try {
          let vals = collect(true);
          if (def.beforeSave) vals = await def.beforeSave(vals, row, ctx);
          if (!vals) return;
          saveBtn.disabled = true;
          let res;
          if (isNew) res = check(await sb.from(def.table).insert(vals).select().single());
          else { delete vals.unit_id; res = check(await sb.from(def.table).update(vals).eq('id', row.id).select().single()); }
          saved = res;
          if (def.onSaved) await def.onSaved(res, isNew, row);
          toast('Data tersimpan.', 'success');
          if (isNew && def.evidence && def.reopenAfterCreate !== false) { m.close(); openForm(def, res); return; }
          m.close();
        } catch (e) { toast(e.message, 'error'); }
        finally { saveBtn.disabled = false; }
      });
    });
  }

  function evidenceCtx(def, row) {
    const ev = def.evidence;
    return {
      unit: row.unit_id, domain: ev.domain, module: ev.module || def.perm, entity: def.table, entityId: row.id,
      period: ev.period ? ev.period(row) : (row.date || row.created_at || KKS.today()).slice(0, 7),
      label: def.rowLabel ? def.rowLabel(row) : ''
    };
  }

  // ---------- Halaman daftar ----------
  /**
   * def = { id, title, table, perm, fields, order, filters:{period, year, status:{k,opts}, search:[]}, ... }
   * Mengembalikan fungsi render(container, params, actionsEl).
   */
  function page(def) {
    return async function render(container, params, actions) {
      const st = { rows: [], q: '', period: params.period || '', year: params.year || String(new Date().getFullYear()), status: params.status || '' };
      const toolbar = h('div', { class: 'k-toolbar' });
      const tableBox = h('div', { class: 'k-table-wrap' });
      const info = h('div', { class: 'k-table-info' });
      if (def.intro) container.append(h('div', { class: 'k-intro' }, typeof def.intro === 'function' ? def.intro() : def.intro));
      if (def.top) { const t = h('div'); container.append(t); def.top(t, st); }
      container.append(toolbar, tableBox, info);

      // aksi atas
      if (can(def.perm, 'C') && def.noCreate !== true) actions.append(h('button', { class: 'k-btn k-btn-primary', onclick: async () => { if (await (def.create ? def.create(reload) : openForm(def, null, def.presets ? def.presets() : {}))) reload(); } }, '+ ' + (def.createLabel || 'Tambah')));
      (def.headerActions || []).filter(a => !a.perm || can(def.perm, a.perm)).forEach(a => actions.append(h('button', { class: 'k-btn', onclick: () => a.run({ reload, rows: () => filtered(), st }) }, a.label)));
      actions.append(h('button', { class: 'k-btn', onclick: () => exportCsv() }, 'Ekspor CSV'),
        h('button', { class: 'k-btn', onclick: () => printList() }, 'Cetak / PDF'));

      // filter
      const search = h('input', { class: 'k-input k-search', placeholder: 'Cari…', value: st.q, oninput: (e) => { st.q = e.target.value.toLowerCase(); draw(); } });
      toolbar.append(search);
      const F = def.filters || {};
      if (F.period) {
        const inp = h('input', { class: 'k-input', type: 'month', value: st.period, title: 'Filter bulan', onchange: (e) => { st.period = e.target.value; reload(); } });
        toolbar.append(h('label', { class: 'k-inline' }, 'Bulan ', inp), h('button', { class: 'k-btn k-btn-sm', onclick: () => { st.period = ''; inp.value = ''; reload(); } }, 'Semua'));
      }
      if (F.year) {
        const sel = h('select', { class: 'k-input', onchange: (e) => { st.year = e.target.value; reload(); } });
        const y = new Date().getFullYear();
        sel.append(h('option', { value: '' }, 'Semua tahun'));
        for (let i = y + 1; i >= y - 6; i--) sel.append(h('option', { value: i, selected: String(i) === st.year || null }, i));
        toolbar.append(h('label', { class: 'k-inline' }, 'Tahun ', sel));
      }
      if (F.status) {
        const sel = h('select', { class: 'k-input', onchange: (e) => { st.status = e.target.value; draw(); } }, h('option', { value: '' }, 'Semua status'));
        F.status.opts.forEach(o => sel.append(h('option', { value: o, selected: o === st.status || null }, o)));
        toolbar.append(h('label', { class: 'k-inline' }, (F.status.label || 'Status') + ' ', sel));
      }

      const listFields = () => {
        const f = (def.fields || []).filter(f => f.list);
        return state.unit === 'ALL' && def.unitless !== true ? [{ k: 'unit_id', l: 'Lokasi', render: r => unitShort(r.unit_id) }, ...f] : f;
      };
      function filtered() {
        let rows = st.rows;
        if (F.status && st.status) rows = rows.filter(r => (F.status.get ? F.status.get(r) : r[F.status.k]) === st.status);
        if (st.q) rows = rows.filter(r => listFields().some(f => textOf(display(f, r[f.k], r)).toLowerCase().includes(st.q)));
        return rows;
      }
      function draw() {
        const rows = filtered();
        const fl = listFields();
        tableBox.innerHTML = '';
        if (!rows.length) { tableBox.append(h('div', { class: 'k-empty' }, st.rows.length ? 'Tidak ada data yang cocok dengan filter.' : (def.emptyText || 'Belum ada data.'))); info.textContent = ''; return; }
        const tb = h('tbody');
        rows.forEach((r, i) => {
          const tr = h('tr', { class: def.rowClass ? def.rowClass(r) || '' : '' }, h('td', { class: 'num' }, i + 1));
          fl.forEach(f => { const v = display(f, r[f.k], r); tr.append(h('td', { class: f.cls || '' }, v instanceof Node ? v : String(v))); });
          const act = h('td', { class: 'k-actions' });
          (def.rowActions || []).filter(a => (!a.perm || can(def.perm, a.perm, r.unit_id)) && (!a.show || a.show(r))).forEach(a =>
            act.append(h('button', { class: 'k-btn k-btn-sm' + (a.cls ? ' ' + a.cls : ''), title: a.title || a.label, onclick: () => a.run(r, reload) }, a.label)));
          act.append(h('button', { class: 'k-btn k-btn-sm', onclick: async () => { await (def.open ? def.open(r, reload) : openForm(def, r)); reload(); } }, can(def.perm, 'U', r.unit_id) ? 'Ubah' : 'Lihat'));
          if (can(def.perm, 'D', r.unit_id) && def.noDelete !== true) act.append(h('button', { class: 'k-btn k-btn-sm k-btn-danger-o', onclick: () => del(r) }, 'Hapus'));
          tr.append(act);
          tb.append(tr);
        });
        tableBox.append(h('table', { class: 'k-table' },
          h('thead', {}, h('tr', {}, h('th', { class: 'num' }, 'No'), fl.map(f => h('th', {}, f.l)), h('th', {}, 'Aksi'))), tb));
        info.textContent = `${rows.length} data` + (rows.length !== st.rows.length ? ` (dari ${st.rows.length})` : '');
      }
      async function del(r) {
        if (!await confirmBox(`Hapus data ini? ${def.rowLabel ? '(' + def.rowLabel(r) + ')' : ''} Tindakan ini tercatat di log aktivitas.`, 'Ya, hapus')) return;
        try { check(await sb.from(def.table).delete().eq('id', r.id)); toast('Data dihapus.', 'success'); reload(); }
        catch (e) { toast(e.message, 'error'); }
      }
      async function reload() {
        tableBox.innerHTML = '<div class="k-empty">Memuat…</div>';
        try {
          st.rows = await KKS.fetchAll(def.table, (q) => {
            if (def.select) q = sb.from(def.table).select(def.select);
            if (def.unitless !== true) q = KKS.byUnit(q);
            if (F.period && st.period) {
              const [y, m] = st.period.split('-').map(Number);
              const end = m === 12 ? `${y + 1}-01-01` : `${y}-${KKS.pad(m + 1)}-01`;
              q = q.gte(F.period, `${st.period}-01`).lt(F.period, end);
            }
            if (F.year && st.year) q = F.yearCol ? q.eq(F.yearCol, Number(st.year)) : q.gte(F.yearDate, `${st.year}-01-01`).lte(F.yearDate, `${st.year}-12-31T23:59:59`);
            if (def.query) q = def.query(q, st);
            const o = def.order || ['created_at', false];
            q = q.order(o[0], { ascending: o[1] !== false });
            if (o[2]) q = q.order(o[2], { ascending: o[3] !== false });
            return q;
          });
          if (def.afterLoad) st.rows = await def.afterLoad(st.rows, st) || st.rows;
          draw();
        } catch (e) { tableBox.innerHTML = ''; tableBox.append(h('div', { class: 'k-alert k-alert-danger' }, e.message)); }
      }
      function exportCsv() {
        const fl = listFields().concat((def.fields || []).filter(f => !f.list && f.csv));
        const lines = [fl.map(f => f.l)].concat(filtered().map(r => fl.map(f => textOf(display(f, r[f.k], r)))));
        const csv = '﻿' + lines.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
        const a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `${def.id || def.table}_${KKS.today()}.csv` });
        document.body.append(a); a.click(); a.remove();
      }
      function printList() {
        const pc = def.print || {};
        const fl = (pc.fields ? pc.fields.map(k => (def.fields || []).find(f => f.k === k) || { k, l: k }) : listFields());
        const cols = fl.map(f => ({ l: f.l, v: (r) => textOf(display(f, r[f.k], r)), cls: f.pcls }));
        KPRINT.table({
          title: pc.title || def.title.toUpperCase(), subtitle: pc.subtitle,
          period: st.period ? KKS.periodLabel(st.period) : (F.year && st.year ? 'Tahun ' + st.year : ''),
          cols, rows: filtered(), sig: pc.sig || def.domain || 'default', landscape: pc.landscape ?? fl.length > 7
        });
      }
      def._reload = reload;
      await reload();
    };
  }

  window.KCRUD = { page, openForm, display, buildInput, readValue, rowsEditor, evidenceCtx };
})();
