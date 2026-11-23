/**
 * Panduan interaktif halaman Inventaris APD (index.html) — per tab, tampil sekali per perangkat
 * (pengunjung tanpa login → disimpan di peramban). Tombol "Panduan" di header memutar ulang.
 */
(() => {
  const q = (s) => document.querySelector(s);
  const T = {
    'tab-rekap': [
      { title: 'Selamat datang di Inventaris APD 👋', text: 'Panduan singkat ini muncul sekali di setiap tab. Klik "Lewati" kapan saja; putar ulang lewat tombol ❓.' },
      { sel: '.unit-selector-wrapper', title: 'Pilih kantor / unit', text: 'Data stok mengikuti unit yang dipilih (8 lokasi) atau "Semua Unit" untuk konsolidasi.' },
      { el: () => q('.stat-card') && q('.stat-card').parentElement, title: 'Ringkasan stok', text: 'Jumlah jenis alat, sisa unit, total masuk & keluar unit aktif.' },
      { sel: '#search-master', title: 'Cari & saring', text: 'Cari nama/kode alat; saring status stok (aman, menipis, habis); ekspor ke Excel/CSV.' },
      { sel: '#tab-rekap .table-responsive', title: 'Daftar stok', text: 'Stok awal, masuk, keluar & sisa per alat. Status menipis/habis diberi warna.' },
      { sel: '.nav-tabs', title: 'Tab menu', text: 'Barang Masuk & Keluar (perlu login petugas), Riwayat Mutasi, dan Laporan & Cetak. Di HP, menu ada di bawah layar.' },
      { sel: 'a.btn-kks', title: 'Sistem KKS Terpadu', text: 'Masuk ke sistem lengkap: APAR, P3K, safety patrol, JSA, temuan, KPI, keamanan (wajib login).' },
      { sel: '#btn-login, #admin-user-box', title: 'Login petugas', text: 'Login untuk menambah alat & mencatat barang masuk/keluar.' }
    ],
    'tab-masuk': [
      { sel: '#form-barang-masuk', title: 'Catat barang masuk', text: 'Pilih alat, jumlah, tanggal & sumber (pengadaan/hibah). Stok bertambah otomatis.' },
      { sel: '#tab-masuk .card:nth-of-type(2), #tab-masuk .card + .card', title: '5 penerimaan terakhir', text: 'Cek kembali data yang baru dimasukkan.' }
    ],
    'tab-keluar': [
      { sel: '#form-barang-keluar', title: 'Catat barang keluar', text: 'Pilih alat, jumlah, penerima & keperluan. Sistem menolak bila stok tidak cukup.' }
    ],
    'tab-mutasi': [
      { sel: '#search-tx', title: 'Riwayat mutasi', text: 'Semua barang masuk & keluar tercatat. Cari & saring per jenis/alat, lalu ekspor CSV.' }
    ],
    'tab-laporan': [
      { sel: '#tab-laporan .report-header-block', title: 'Laporan resmi', text: 'Pratinjau laporan rekap inventaris dengan logo, judul, lokasi & tanggal.' },
      { el: () => Array.from(document.querySelectorAll('#tab-laporan button')).find(b => /Cetak/.test(b.textContent)), title: 'Cetak / PDF', text: 'Cetak atau simpan sebagai PDF. Blok tanda tangan petugas & manager ikut tercetak.' }
    ]
  };
  // Tombol tab yang sedang aktif + tombol panduan
  function current() { const a = q('.tab-btn.active'); return a ? a.dataset.tab : 'tab-rekap'; }
  function run(force) { const id = current(); return KTour.run('inv:' + id, T[id] || [], { force }); }
  window.INV_TOUR = { T, replay: () => run(true) };
  document.addEventListener('click', (e) => { const b = e.target.closest('.tab-btn'); if (b) setTimeout(() => run(false), 450); });
  window.addEventListener('load', () => setTimeout(() => { if (!window.KKS_NO_TOUR) run(false); }, 1500));
})();
