/**
 * Isi panduan interaktif (onboarding) Sistem KKS — per halaman, tampil otomatis sekali per akun
 * (status disimpan di tabel user_onboarding → sinkron antar perangkat). Tombol ❓ Panduan memutar ulang.
 * FEATURES: daftar fitur baru → disorot sekali untuk pengguna lama. Tambahkan entri baru di sini setiap rilis.
 */
(() => {
  const { sb, state } = KKS;
  const $ = (s) => document.querySelector(s);
  const inMain = (t, scope = '#k-main') => () => Array.from(document.querySelectorAll(`${scope} button, ${scope} a.k-btn`)).find(b => b.textContent.trim().includes(t));
  const head = (title, text) => ({ sel: '.k-page-head', title, text, place: 'bottom' });
  const intro = { sel: '.k-intro', title: 'Keterangan halaman', text: 'Kotak biru ini merangkum aturan & standar yang dipakai di halaman ini.' };
  const add = (text, label = 'Tombol Tambah') => ({ sel: '#k-page-actions .k-btn-primary', title: label, text });
  const toolbar = (text) => ({ sel: '.k-toolbar', title: 'Cari & saring', text: text || 'Ketik kata kunci untuk mencari, atau pakai filter bulan/tahun/status untuk menyaring daftar.' });
  const row = (text) => ({ optional: true, sel: '.k-table tbody tr', title: 'Satu baris = satu data', text: text || 'Setiap baris menampilkan ringkasan data. Warna latar membantu: merah = perlu tindakan, kuning = segera, hijau = beres.' });
  const actions = (text) => ({ optional: true, sel: '.k-table tbody tr .k-actions', title: 'Tombol aksi', text });
  const print = (text) => ({ el: inMain('Cetak / PDF', '#k-page-actions'), title: 'Ekspor & cetak', text: text || '"Ekspor CSV" untuk dibuka di Excel; "Cetak / PDF" mencetak daftar dengan kop & blok tanda tangan resmi (pilih "Simpan sebagai PDF" di jendela cetak).' });
  const btn = (t, title, text, scope) => ({ el: inMain(t, scope), title, text });

  /** Panduan per halaman (id modul → langkah). */
  const T = {
    dashboard: [
      head('Dashboard', 'Ringkasan kondisi lokasi aktif: angka dihitung langsung dari data yang diinput semua petugas.'),
      { sel: '.k-cards', title: 'Kartu ringkasan', text: 'Oranye = perlu dikerjakan bulan ini, merah = terlambat/kedaluwarsa, hijau = aman. Ketuk kartu untuk membuka halamannya.' },
      { sel: '.k-grid-2 .k-panel', title: 'Perlu tindakan', text: 'Daftar pekerjaan yang tertunda (APAR belum dicek, temuan overdue, izin kerja menunggu, testing keamanan, sertifikat habis). Klik "Buka →" untuk langsung mengerjakan.' },
      { el: () => document.querySelectorAll('.k-grid-2 .k-panel')[1], title: 'Kalender tenggat', text: 'Pengingat tenggat pelaporan: Lapman tgl 3, KPI tgl 5, SMK3 tgl 10 setelah triwulan, SAG tiap triwulan.' }
    ],
    lokasi: [head('Lokasi (8)', 'Daftar 8 lokasi klaster Tarakan beserta kode ICAO & kode sheet traffic. Nama kota dipakai di tanggal laporan.'), row(), actions('Ubah nama/kota bila ada perubahan. Lokasi tidak dihapus — cukup dinonaktifkan.')],
    area: [head('Gedung, lantai & ruang', 'Master ruang tiap lokasi, dipakai untuk APAR, P3K, HIRADC & pengukuran.'), add('Tambah gedung/lantai/ruang baru beserta ukurannya.'), toolbar(), row()],
    personel: [head('Personel', 'Data personel (nama & jabatan saja — tanpa NIK/KTP/rekening).'), add('Tambah personel, tandai bila Avsec atau Inspektur Keamanan Internal.'), toolbar(), actions('"Sertifikat" membuka daftar diklat/lisensi orang tsb.')],
    sertifikat: [head('Sertifikat, lisensi & diklat', 'Masa berlaku dipantau otomatis: merah = sudah habis, kuning = habis ≤ 90 hari (muncul juga di Dashboard).'), add('Tambah sertifikat: pilih personel, jenis (K3, lisensi, rating, IELP, medex, avsec), tanggal berlaku.'), row(), actions('"Ubah" juga tempat mengunggah scan sertifikat (evidence).')],
    pengguna: [head('Pengguna & peran', 'Kelola akun login. Satu orang boleh punya beberapa peran; lokasi "Semua" = 8 lokasi, Kepala Unit cukup lokasinya sendiri.'), add('Buat akun: email, password awal (min. 8 karakter), nama, jabatan, lalu peran & lokasi.', 'Tambah pengguna'), { sel: '.k-table tbody tr', title: 'Daftar akun', text: 'Terlihat peran, lokasi, status aktif & waktu login terakhir. "Ubah" untuk ganti peran, reset password, menonaktifkan, atau menghapus akun.' }],
    pengaturan: [head('Pengaturan', 'Diubah oleh Admin KKS: berlaku untuk semua pengguna.'), { sel: '.k-page-body .k-panel', title: 'Penandatangan laporan', text: 'Label & jabatan pada blok tanda tangan setiap jenis laporan PDF. Nama dibiarkan kosong untuk TTD basah.' }, { el: () => document.querySelectorAll('.k-page-body .k-panel')[1], title: 'Target KPI', text: 'Target KPI Safety Rate tahun berjalan (lagging ≤ target, availability ≥ target).' }, { el: inMain('Ulangi semua panduan'), title: 'Ulangi panduan', text: 'Tampilkan lagi semua panduan halaman untuk akun Anda.' }],
    log: [head('Log aktivitas', 'Siapa menambah/mengubah/menghapus apa & kapan. Data yang dihapus tersimpan salinannya untuk audit.')],

    apar: [head('APAR', 'Daftar Fasilitas APAR. Status kedaluwarsa dihitung otomatis dari tanggal isi ulang + masa berlaku (default 12 bulan).'), add('Daftarkan tabung baru: nomor (mis. APAR 016), gedung, lokasi, jenis, kapasitas, tanggal isi ulang.'), toolbar(), row('Merah = kedaluwarsa / perlu tindakan, kuning = habis ≤ 30 hari.'), actions('"Kartu" mencetak Kartu Pemeriksaan APAR, "Refill/Ganti" mencatat isi ulang (tanggal isi ulang otomatis diperbarui), "Ubah" untuk data & foto.'), btn('Cetak Daftar Fasilitas', 'Cetak Daftar Fasilitas APAR', 'Format resmi lampiran 6.x laporan SMK3 (jumlah, ideal, kebutuhan, kondisi, mitigasi).', '#k-page-actions')],
    'apar-servis': [head('Refill / ganti APAR', 'Riwayat isi ulang, penggantian, pembelian baru & perbaikan APAR beserta biaya — bahan RAB.'), add('Pilih APAR, jenis (REFILL/GANTI/BARU/PERBAIKAN), tanggal, vendor & biaya.'), toolbar(), print()],
    'apar-cek': [head('Pemeriksaan APAR bulanan', 'Setiap bulan semua APAR diperiksa 6 parameter. Parameter rusak otomatis menjadi temuan tindak lanjut.'), { sel: '.k-page-body input[type=month]', title: 'Pilih bulan', text: 'Default bulan berjalan. Ganti untuk melihat/mengisi bulan lain.' }, { sel: '.k-cards', title: 'Progres bulan ini', text: 'Berapa tabung sudah dicek dari total.' }, { el: () => document.querySelector('.k-table tbody tr .k-actions .k-btn'), title: 'Periksa', text: 'Klik "Periksa" → centang 6 parameter (selang, isi/tekanan, tabung, pin & segel, handle, tidak terhalang) → simpan → tambahkan foto.' }, btn('Cetak Buku Kontrol', 'Buku Kontrol APAR', 'Cetak checklist bulanan semua APAR (✓ baik, ✗ rusak).', '#k-page-actions')],
    p3k: [head('Kotak P3K', 'Daftar kotak P3K per lokasi (standar PER.15/MEN/VIII/2008, Type A).'), add('Tambah kotak baru: kode & lokasi.'), row()],
    'p3k-cek': [head('Checklist P3K bulanan', '20 item standar + item tambahan (diatur di Pengaturan). Isi tiap kotak setiap bulan.'), { sel: '.k-tabs', title: 'Pilih kotak', text: '✅ = sudah dicek bulan ini, ⬜ = belum. Geser ke samping bila kotaknya banyak.' }, { sel: '.k-mcard tbody tr', title: 'Isi per item', text: 'Centang bila tersedia & isi jumlah yang ada. Item kurang dari standar masuk kebutuhan refill.' }, btn('Tandai semua lengkap', 'Pintasan', 'Centang semua & isi jumlah standar sekaligus, lalu koreksi yang kurang saja.'), btn('Simpan checklist', 'Simpan', 'Simpan checklist kotak ini. Setelah tersimpan, foto kotak bisa ditambahkan di bawahnya.'), btn('Cetak Form', 'Cetak form resmi', 'Form Checklist Bulanan Isi Kotak P3K Type A untuk semua kotak dalam satu halaman.', '#k-page-actions')],
    patrol: [head('Safety patrol', 'Jadwal patrol bulanan: koordinator MKKS + anggota Teknik + anggota Operasi.'), add('Buat jadwal: tanggal, koordinator, anggota, area yang diperiksa.'), toolbar(), actions('"Isi checklist" membuka penilaian 26 item per area; "Cetak" mencetak checklist resmi.'), btn('Cetak jadwal', 'Cetak jadwal', 'Rencana Jadwal Kegiatan Safety Patrol periode berjalan.', '#k-page-actions')],
    'patrol-isi': [head('Isi checklist safety patrol', 'Nilai 26 item untuk setiap area.'), { sel: '.k-tabs', title: 'Area', text: 'Pindah area di sini. Persentase nilai tampil setelah disimpan.' }, { sel: '.k-score', title: 'Skor 0–4', text: 'Ketuk angka (arahkan kursor/tahan untuk melihat kriteria). N/A = tidak relevan. Skor ≤ 2 otomatis menjadi temuan.' }, btn('Isi sisa dengan 4', 'Pintasan', 'Isi item yang belum dinilai dengan skor 4, lalu koreksi yang bermasalah.'), btn('Simpan area', 'Simpan', 'Simpan area ini; jadwal otomatis berstatus SELESAI bila semua area sudah dinilai.')],
    jsawp: [head('JSA & Surat Izin Kerja', 'Alur: Draft → Diajukan → Diperiksa User → Disetujui HSE (Berlaku) → Selesai. Ajukan minimal 12 jam sebelum pekerjaan.'), add('Isi informasi pekerjaan, pelaksana, bahaya, isolasi, APD, pengaman & tahapan JSA dalam satu form.', 'Ajukan izin kerja'), toolbar('Saring berdasarkan status untuk melihat izin yang menunggu persetujuan.'), actions('Tombol muncul sesuai status & peran: Ajukan, Periksa (User), Setujui HSE, Tolak, Perpanjang (maks. 2×), Tutup, Cetak WP, Cetak JSA.')],
    pengukuran: [head('Pengukuran lingkungan kerja', 'Hasil dinilai otomatis: bising > 85 dBA, suhu > ISBB (beban & waktu kerja), cahaya < standar lux → TIDAK SESUAI.'), add('Isi titik ukur, hasil kebisingan low/high, suhu, pencahayaan.'), toolbar(), print()],
    hiradc: [head('HIRADC K3', 'Identifikasi bahaya & penilaian risiko per area. RFN = L × S, tingkat otomatis Low/Medium/High/Extreme.'), { sel: '.k-page-body .k-panel', title: 'Matriks risiko', text: 'Panduan warna & tindakan per tingkat. RFN > 6 → pengendalian dituangkan ke OTP / JSA.' }, add('Tambah baris: area, aktivitas, hazard, L & S awal, pengendalian, L & S residual.'), btn('Cetak HIRADC', 'Cetak format resmi', 'Form 13-K3-IV-FR-LPPNPI dengan TTD Ahli K3 – MKKS – GM.', '#k-page-actions')],
    smk3: [head('Evaluasi SMK3 triwulan', '20 butir evaluasi kepatuhan, tenggat kirim tgl 10 setelah triwulan.'), { sel: '.k-page-body .k-toolbar', title: 'Pilih periode', text: 'Tahun & triwulan yang dievaluasi.' }, btn('Isi otomatis', 'Isi otomatis dari data', 'Mengisi minggu pelaksanaan JSA/WP, APAR, P3K, safety patrol, rapat K3, kecukupan APD & kejadian dari data yang sudah diinput.'), { sel: '.k-table-wrap', title: 'Matriks 20 butir', text: 'Tinjau Tersedia/Dilaksanakan, keterangan & centang minggu W1–W4. Geser ke samping di HP.' }, btn('Simpan & ajukan', 'Simpan & ajukan', 'Simpan draft, lalu ajukan ke GM. GM menyetujui dari halaman yang sama.'), btn('Cetak / PDF', 'Cetak', 'Format resmi lanskap untuk dikirim ke pusat.')],
    'kegiatan-k3': [head('Kegiatan K3', 'Bulan K3, simulasi APAR/gempa/ERP, rapat tim K3, sosialisasi, insiden & kecelakaan kerja.'), add('Catat kegiatan: jenis, judul, tanggal, peserta, hasil. Foto/absensi lewat "Ubah".'), toolbar(), print()],
    rab: [head('RAB K3', 'Rencana anggaran K3 per tahun.'), add('Isi rincian: grup, uraian, volume, satuan, harga — jumlah & total dihitung otomatis.'), actions('"Cetak" menghasilkan RAB resmi lengkap dengan terbilang.')],

    pengawasan: [head('Kegiatan pengawasan', 'Audit/inspeksi/monitoring dari DNP, KOBU VII, Dirkampen, SPI & internal.'), add('Catat kegiatan: penyelenggara, jenis, judul, tanggal, lokasi yang diperiksa. Laporan hasil diunggah sebagai evidence.'), actions('"Temuan" membuka daftar temuan kegiatan tsb.')],
    temuan: [head('Temuan & CAP', 'Siklus OPEN → IN PROGRESS → PROPOSED CLOSED → CLOSED. OVERDUE otomatis bila lewat target.'), add('Catat temuan per PQ: referensi, temuan, risk index, CAP, PIC, target.'), toolbar('Saring status (mis. OVERDUE) untuk fokus pada yang terlambat.'), actions('Progres (perbarui %), Perpanjang (target baru + justifikasi), Usul close, Close (Admin), Riwayat. Evidence lewat "Ubah".'), btn('Cetak Matriks', 'Matriks progres', 'Format Matriks Progres Pemenuhan Tindak Lanjut untuk pusat/regulator.', '#k-page-actions')],
    'temuan-dashboard': [head('Dashboard temuan', 'Rekap status temuan per lokasi & per bidang.'), { sel: '.k-cards', title: 'Status', text: 'Jumlah OPEN, IN PROGRESS, PROPOSED CLOSED, OVERDUE, CLOSED.' }],
    proker: [head('Program kerja KKS', 'Rencana & realisasi kegiatan tahunan per minggu.'), add('Tambah kegiatan, bidang & frekuensi.'), actions('"Jadwal" membuka grid 12 bulan × 4 minggu: centang rencana & realisasi, atau "Hitung realisasi dari data".'), btn('Cetak program', 'Cetak', 'Program kerja lanskap: biru = rencana, hijau = terealisasi.', '#k-page-actions')],
    'kegiatan-pengawasan': [head('Rapat & monitoring', 'Rapat bulanan, inspeksi & monitoring ke unit.'), add('Catat kegiatan & hasilnya.')],

    traffic: [head('Traffic bulanan', 'Rekap DEP/ARR/OVF domestik & internasional per lokasi — dasar perhitungan KPI.'), btn('Impor LAP', 'Impor LAP. DATA OPERASI', 'Unggah file Excel dari Unit Operasi; tiap sheet lokasi dihitung otomatis, tampil pratinjau sebelum disimpan.', '#k-page-actions'), add('Atau isi/koreksi rekap secara manual.', 'Tambah manual'), btn('Cetak rekap', 'Rekap tahunan', 'Rekapitulasi traffic movement 12 bulan per lokasi & klaster.', '#k-page-actions')],
    occurrence: [head('Occurrence (EFFORT)', 'Kejadian keselamatan dari export EFFORT; duplikat otomatis dicegah.'), btn('Impor export EFFORT', 'Impor EFFORT', 'Unggah hasil-export.xls; pratinjau menunjukkan kejadian baru vs yang sudah ada.', '#k-page-actions'), toolbar('Saring bulan & kontribusi ANS.'), actions('"ANS" menandai kontribusi ANS (dihitung di KPI lagging); kategori KPI diatur lewat "Ubah".')],
    availability: [head('Availability CNSA', 'Persentase C, N, S, A per lokasi per bulan. Kosongkan bila fasilitas tidak ada.'), add('Isi availability bulan berjalan.')],
    kpi: [head('KPI Safety Rate & Lapman', 'Lagging = kejadian ANS ÷ traffic × 100.000 (≤ target). Leading = rata-rata availability (≥ 99%).'), { sel: '.k-page-body .k-toolbar', title: 'Periode', text: 'Pilih tahun & bulan terakhir (kumulatif Januari s.d. bulan tsb).' }, { sel: '.k-table-wrap', title: 'Tabel KPI', text: 'Nilai per bulan, kumulatif & status Tercapai/Tidak. Arahkan kursor ke angka untuk melihat jumlah kejadian/traffic.' }, btn('Cetak Lapman', 'Cetak Lapman', 'Laporan Manajemen bulanan: tabel KPI + rekap occurrence bulan tsb.', '#k-page-actions')],
    hazard: [head('Hazard / HIRA', 'Hazard operasional dengan matriks ICAO 5×5 — risk index & tolerability otomatis.'), { sel: '.k-page-body .k-panel', title: 'Matriks ICAO', text: 'Intolerable (merah), Tolerable (kuning), Acceptable (hijau).' }, add('Catat hazard: deskripsi, sumber, kategori, probability & severity, barrier/CAP, residual, PIC.'), btn('Cetak HIRA', 'Cetak HIRA', 'Format HIRA ESI untuk monitoring triwulan Divisi SO.', '#k-page-actions')],
    sag: [head('SAG', 'Safety Action Group minimal 1× per triwulan (PER.003/LPPNPI/III/2020).'), add('Buat SAG: pilih tanggal → nomor MoM disarankan otomatis.'), actions('"Isu SAG" membuka daftar isu: tarik isu terbuka, perbarui status, cetak MoM & Berita Acara.')],
    'sag-isu': [head('Isu SAG', 'Safety issue – mitigation plan – PIC – target – status.'), btn('Tarik isu terbuka', 'Tarik isu otomatis', 'Mengambil isu belum terpenuhi dari SAG sebelumnya + hazard terbuka + temuan terbuka.', '#k-page-actions'), btn('Cetak Berita Acara', 'MoM & Berita Acara', 'Cetak Minutes of Meeting & Berita Acara (jumlah isu total/ditindaklanjuti/terpenuhi otomatis).', '#k-page-actions')],
    safrec: [head('Safety recommendation', 'Rekomendasi dari airprox/RI & tindak lanjutnya.'), add('Catat rekomendasi, PIC & target.'), print()],
    rsa: [head('RSA self-assessment', 'Review SMS maturity 49 PQ (P/S/O/E).'), add('Isi per PQ: nilai sebelumnya & saat ini, cara pencapaian, justifikasi, link evidence.')],
    'kegiatan-keselamatan': [head('Kegiatan keselamatan', 'Safety promotion, briefing, campaign, postflight, PUTA/drone, wildlife, RST.'), add('Catat kegiatan & dokumentasi.')],

    'sec-program': [head('Program pengawasan keamanan', 'Grid bulan × minggu: Audit, Inspeksi, Test (2 bulanan), Survey, DST, Table Top, Awareness.'), btn('Buat 6 slot testing', 'Slot testing otomatis', 'Membuat jadwal testing Feb, Apr, Jun, Agu, Okt, Des untuk lokasi aktif.', '#k-page-actions'), { sel: '.k-matrix', title: 'Klik sel', text: 'Sel kosong → tambah rencana. Sel ● → catat pelaksanaan / batalkan. ✓ hijau = terlaksana.' }, btn('Cetak program', 'Cetak program', 'Program Pengawasan Keamanan Penerbangan Internal tahunan.', '#k-page-actions')],
    'sec-kegiatan': [head('Testing / inspeksi / audit', 'Hasil pelaksanaan pengawasan keamanan internal.'), add('Isi objek, skenario, metode, hasil, temuan (satu per baris) & inspektur. Temuan otomatis masuk modul Temuan.'), actions('"Cetak BA" menghasilkan Berita Acara resmi.')],
    'sec-logbook': [head('Logbook security', 'Catatan harian pos security Gedung Tower / APP.'), add('Isi pos, waktu, shift & catatan.'), print()],
    prohibited: [head('Logbook prohibited item', 'Barang terlarang masuk/keluar Daerah Keamanan Terkendali.'), add('Catat tanggal, jam, personel, kegiatan & item masuk/keluar.'), print()],
    'sec-fasilitas': [head('Fasilitas keamanan', 'HHMD, WTMD, CCTV, HT, pagar, access door — sertifikasi & kondisi.'), add('Tambah fasilitas.'), actions('"Checklist HHMD" untuk pengujian harian/mingguan HHMD.')],
    hhmd: [head('Checklist HHMD', 'Format FKP-P3UK-3: centang item yang berfungsi, kesimpulan otomatis.'), add('Isi checklist pengujian.')],
    'sec-gangguan': [head('Gangguan keamanan', 'Laporan kejadian (pencurian, sabotase, masuk area tidak sah, ancaman bom, dll).'), add('Laporkan: tanggal, lokasi, layanan, jenis, kronologi, ID risk. Foto via "Ubah" (folder terbatas).')],
    'sec-risiko': [head('Matriks risiko keamanan', 'Risiko = Ancaman + Kerentanan + Konsekuensi (1–10 masing-masing).'), add('Isi skenario, nilai A/K/K, langkah tambahan & rencana perlakuan — tingkat & penerimaan otomatis.'), btn('Cetak matriks', 'Cetak', 'Matriks Daftar Risiko + Rencana Perlakuan.', '#k-page-actions')],
    'kegiatan-keamanan': [head('DST, table top & awareness', 'Kegiatan pelatihan & sosialisasi keamanan.'), add('Catat kegiatan & peserta.')]
  };

  /** Panduan pembuka (sekali per akun, sebelum panduan halaman pertama). */
  const WELCOME = [
    { title: 'Selamat datang di Sistem KKS Terpadu 👋', text: 'Panduan singkat ini muncul sekali di setiap halaman yang pertama kali Anda buka. Klik "Lewati" kapan saja; putar ulang lewat tombol ❓ Panduan.' },
    { sel: '#k-unit', title: 'Lokasi aktif', text: 'Semua data & laporan mengikuti lokasi yang dipilih di sini. Admin bisa memilih "Semua lokasi (klaster)".' },
    { sel: '#k-nav', mobileSel: '#k-menu-btn', title: 'Menu', text: 'Menu dikelompokkan per bidang: Umum, K3, Pengawasan, Keselamatan, Keamanan, Administrasi. Di HP, menu dibuka dengan tombol ☰.' },
    { sel: '#k-help', title: 'Tombol Panduan', text: 'Putar ulang panduan halaman yang sedang dibuka kapan saja.' },
    { sel: '#k-logout', title: 'Keluar', text: 'Selalu keluar bila memakai komputer/HP bersama.' }
  ];

  /** Fitur baru — tambahkan entri di sini setiap rilis (id unik, page = id modul atau '*'). */
  const FEATURES = [
    { id: '2026-11-mobile', page: 'dashboard', sel: '#k-help', title: 'Tampilan HP & panduan baru', text: 'Daftar data kini tampil sebagai kartu di HP, dan setiap halaman punya panduan interaktif. Ketuk ❓ untuk memutar ulang.' }
  ];

  // ---------- Penyimpanan status per akun (Supabase), cadangan localStorage ----------
  KTour.setStore({
    async load() {
      const local = JSON.parse(localStorage.getItem('ktour_kks_' + (state.user && state.user.id)) || '{}');
      try { const { data } = await sb.from('user_onboarding').select('seen').eq('user_id', state.user.id).maybeSingle(); return { ...local, ...((data && data.seen) || {}) }; }
      catch { return local; }
    },
    async save(seen) {
      localStorage.setItem('ktour_kks_' + state.user.id, JSON.stringify(seen));
      await sb.from('user_onboarding').upsert({ user_id: state.user.id, seen, updated_at: new Date().toISOString() });
    }
  });

  const waitFor = (sel, ms = 4000) => new Promise(res => { const t0 = Date.now(); (function tick() { const el = typeof sel === 'function' ? sel() : document.querySelector(sel); if (el || Date.now() - t0 > ms) return res(el); setTimeout(tick, 150); })(); });

  async function pageTour(id, force) {
    const steps = T[id];
    if (!steps) return;
    await waitFor('#k-main .k-page-body > *');
    await new Promise(r => setTimeout(r, 500));
    if (KKS.state.route && KKS.state.route.id !== id) return;
    await KTour.run('kks:page:' + id, steps, { force });
  }
  let running = false;
  async function onRoute(id) {
    if (running || window.KKS_NO_TOUR) return;
    running = true;
    try {
      if (!(await KTour.isSeen('kks:welcome'))) {
        await new Promise(r => setTimeout(r, 600));
        const how = await KTour.run('kks:welcome', WELCOME);
        for (const f of FEATURES) await KTour.mark('feat:' + f.id); // pengguna baru: fitur lama tidak perlu disorot
        if (how === 'off') return;
      }
      await pageTour(id);
      for (const f of FEATURES.filter(f => f.page === id || f.page === '*')) { await waitFor(f.sel, 1500); await KTour.feature(f); }
    } finally { running = false; }
  }
  document.addEventListener('kks:route', (e) => onRoute(e.detail.id));

  window.KKS_TOURS = { T, WELCOME, FEATURES, replay: (id) => pageTour(id || (KKS.state.route || {}).id, true), welcome: () => KTour.run('kks:welcome', WELCOME, { force: true }) };
})();
