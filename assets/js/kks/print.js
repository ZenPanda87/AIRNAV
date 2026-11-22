/**
 * Mesin cetak laporan PDF format resmi (header logo AirNav, judul, lokasi, tanggal, tabel, blok tanda tangan).
 * Mengikuti gaya "Laporan & Cetak" inventaris: tanpa header/footer peramban (@page margin 0).
 */
(() => {
  const { h, esc, state, unitName, unitCity, fmtDateLong } = KKS;

  function signatories(key) {
    const custom = KKS.setting('signatories', {});
    return custom[key] || KREF.SIGNATORIES[key] || custom.default || KREF.SIGNATORIES.default;
  }

  function header({ title, subtitle, period, unit, date }) {
    const u = unit || state.unit;
    return h('div', { class: 'p-head' },
      h('div', { class: 'p-logo' }, h('img', { src: 'assets/img/logo-airnav-icon.png', alt: 'AirNav Indonesia' }), h('span', {}, 'AirNav Indonesia')),
      h('h1', { class: 'p-title' }, title),
      h('p', { class: 'p-sub' }, subtitle || unitName(u)),
      period ? h('p', { class: 'p-period' }, 'Periode: ' + period) : null,
      h('p', { class: 'p-date' }, `${unitCity(u)}, ${fmtDateLong(date)}`));
  }

  function signBlock(key, names = {}) {
    const list = Array.isArray(key) ? key : signatories(key);
    return h('div', { class: 'p-sign' }, list.map(([label, role], i) =>
      h('div', { class: 'p-sign-box' }, h('p', { class: 'p-sign-label' }, label), h('p', { class: 'p-sign-role' }, role),
        h('div', { class: 'p-sign-space' }), h('div', { class: 'p-sign-name' }, names[i] ? `( ${names[i]} )` : '( ……………………………… )'))));
  }

  /** Cetak isi bebas. opts: { title, subtitle, period, unit, landscape, body: Node|Node[], sig, sigNames, date } */
  function doc(opts) {
    let root = document.getElementById('k-print');
    if (!root) { root = h('div', { id: 'k-print' }); document.body.append(root); }
    root.innerHTML = '';
    root.append(header(opts), h('div', { class: 'p-body' }, opts.body), opts.sig === false ? null : signBlock(opts.sig || 'default', opts.sigNames));
    let pg = document.getElementById('k-page-style');
    if (!pg) { pg = h('style', { id: 'k-page-style' }); document.head.append(pg); }
    pg.textContent = `@page { size: A4 ${opts.landscape ? 'landscape' : 'portrait'}; margin: 0; }`;
    const imgs = Array.from(root.querySelectorAll('img'));
    Promise.all(imgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => setTimeout(() => window.print(), 80));
  }

  /** Tabel sederhana. cols: [{l, v(row), cls}] */
  function tableNode(cols, rows, opts = {}) {
    return h('table', { class: 'p-table' + (opts.small ? ' small' : '') },
      h('thead', {}, opts.headRows || h('tr', {}, h('th', { class: 'num' }, 'No'), cols.map(c => h('th', {}, c.l)))),
      h('tbody', {}, rows.length ? rows.map((r, i) => h('tr', {}, h('td', { class: 'num' }, i + 1), cols.map(c => { const v = c.v(r); return h('td', { class: c.cls || '' }, v instanceof Node ? v : String(v ?? '')); })))
        : h('tr', {}, h('td', { colspan: cols.length + 1, class: 'center' }, 'Tidak ada data'))));
  }
  function table(opts) { doc({ ...opts, body: [opts.before || null, tableNode(opts.cols, opts.rows, opts), opts.after || null] }); }

  window.KPRINT = { doc, table, tableNode, header, signBlock, signatories };
})();
