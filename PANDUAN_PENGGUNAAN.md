# PANDUAN PENGGUNAAN SISTEM REKAPITULASI INVENTARIS ALAT K3
**PERUM LPPNPI CABANG TARAKAN & UNIT KERJA BAWAHAN**

Sistem ini dirancang khusus untuk mempermudah petugas dalam mengelola, merekapitulasi, dan memantau stok alat Keselamatan & Kesehatan Kerja (K3) di lingkungan kerja **Perum LPPNPI Cabang Tarakan** beserta seluruh unit kerja bawahan di wilayah Kalimantan Utara.

---

## 🏢 Daftar Kantor Cabang & Unit Kerja Terdaftar
Sistem telah terintegrasi dengan struktur unit kerja resmi:
1. **Perum LPPNPI Cabang Tarakan** *(Kantor Cabang Utama / Induk)*
2. **Perum LPPNPI Cabang Pembantu Malinau** *(Kantor Cabang Pembantu)*
3. **Perum LPPNPI Unit Nunukan** *(Unit Kerja)*
4. **Perum LPPNPI Unit Tanjung Harapan** *(Unit Kerja - Tanjung Selor)*
5. **Perum LPPNPI Unit Long Bawan** *(Unit Kerja)*
6. **Perum LPPNPI Unit Long Apung** *(Unit Kerja)*

> 💡 **Pilihan Konsolidasi:** Terdapat juga opsi **`Semua Unit (Konsolidasi)`** untuk melihat rekapitulasi gabungan seluruh kantor secara serentak.

---

## 🚀 Cara Menjalankan Aplikasi
Sistem ini dibuat **100% Offline & Mandiri**, tidak memerlukan instalasi server atau internet:
1. Buka folder: `c:\Users\user\Downloads\AIRNAV`
2. Cukup klik ganda (double-click) file **`Buka_Sistem_K3.bat`** atau file **`index.html`**.
3. Aplikasi akan langsung terbuka di browser (Microsoft Edge, Google Chrome, Mozilla Firefox, dll).

---

## 📦 Status Data Awal Alat K3
- **Perum LPPNPI Cabang Tarakan:**
  Sudah terisi dengan 6 daftar alat K3 awal:
  1. **ROMPI**: Stok Awal **4 PCS**
  2. **KARUNG**: Stok Awal **2 PCS**
  3. **HELM**: Stok Awal **5 PCS**
  4. **MASKER GAS**: Stok Awal **1 PCS**
  5. **KACAMATA SAFETY**: Stok Awal **3 PCS**
  6. **SEPATU SAFETY**: Stok Awal **3 PCS**
  *(Total fisik awal: 18 Unit)*

- **Unit Kerja Lainnya (Malinau, Nunukan, Tanjung Harapan, Long Bawan, Long Apung):**
  Saat ini berstatus kosong (0 item). Anda dapat menambahkan sendiri daftar alat K3 masing-masing unit secara bertahap dan manual sesuai inventaris fisik yang ada di lapangan.

---

## 🛠️ Panduan Penggunaan Fitur

### 1. Beralih Antar Kantor / Unit Kerja
- Di bagian header atas terdapat menu dropdown **`Kantor / Unit`**.
- Pilih nama kantor yang ingin Anda kelola (misal: *Perum LPPNPI Unit Nunukan*).
- Seluruh tampilan (tabel stok, kartu statistik, form transaksi, dan laporan cetak) akan otomatis berganti menampilkan data khusus unit tersebut.

---

### 2. Menambahkan Alat K3 Baru untuk Unit Binaan
Anda dapat mendaftarkan alat K3 baru untuk unit manapun dengan dua cara:

- **Cara A (Melalui Tombol `+ Tambah Alat Baru`):**
  1. Klik tombol **`+ Tambah Alat Baru`** di tab Rekap Stok.
  2. Pada form yang muncul, pilih **Kantor / Unit Kerja** tujuan (misal: *Perum LPPNPI Cabang Pembantu Malinau*).
  3. Masukkan **Nama Alat K3** (misal: `BODY HARNESS`, `EAR MUFF`, dll).
  4. Masukkan **Satuan** (contoh: `PCS`, `SET`, `UNIT`).
  5. Masukkan **Stok Awal** dan batas peringatan stok menipis.
  6. Lokasi penyimpanan / keberadaan barang otomatis terisi: `Lemari K3`.
  7. Klik **`Simpan ke Sistem`**.
  8. Sistem akan otomatis membuatkan kode alat ber-prefix unit (contoh: `K3-MLN-001`, `K3-NNX-001`, `K3-TJS-001`, dll).

- **Cara B (Langsung Saat Mencatat Barang Masuk):**
  1. Buka tab **Barang Masuk**.
  2. Pada dropdown pilihan alat K3, pilih opsi paling atas: **`➕ [ALAT BARU BELUM TERDAFTAR...]`**.
  3. Kotak pendaftaran kilat akan muncul. Pilih unit kerja dan ketikkan nama alat baru beserta jumlah masuknya (keberadaan otomatis diatur ke `Lemari K3`).
  4. Klik **`Simpan Barang Masuk`**. Master alat baru dan transaksi penerimaan langsung tersimpan sekaligus!

---

### 3. Mencatat Barang Masuk (Penerimaan / Restock)
1. Buka tab **`Barang Masuk`**.
2. Pilih nama alat K3 yang diterima.
3. Masukkan jumlah unit masuk.
4. Masukkan tanggal penerimaan, nama pengirim/vendor, dan keterangan tambahan.
5. Klik **`Simpan Barang Masuk`**.
6. Sistem akan otomatis:
   - Menambahkan stok alat tersebut.
   - Menghitung ulang **Sisa Unit** secara real-time.
   - Menyimpan bukti transaksi ke **Riwayat Mutasi**.

---

### 4. Mencatat Barang Keluar (Distribusi / Penggunaan Lapangan)
1. Buka tab **`Barang Keluar`**.
2. Pilih nama alat K3 yang dikeluarkan/dipinjam.
3. Sistem akan otomatis menampilkan sisa unit yang tersedia di Lemari K3 unit terkait.
4. Masukkan jumlah pengeluaran.
   > **Validasi Aman:** Sistem secara otomatis menolak input jika jumlah yang dikeluarkan melebihi stok yang ada di Lemari K3, mencegah stok bernilai negatif.
5. Masukkan nama penerima/petugas lapangan, keperluan/lokasi kerja, dan tanggal.
6. Klik **`Simpan Pengeluaran Barang`**.
7. Sisa unit langsung berkurang secara otomatis.

---

### 5. Memantau Status Stok & Riwayat Mutasi
- **Tab Rekap Stok Alat K3:**
  - Dilengkapi indikator visual:
    - 🟢 **Hijau (Aman)**: Stok di atas batas minimal.
    - 🟡 **Kuning (Menipis)**: Stok mendekati batas aman, perlu pengadaan segera.
    - 🔴 **Merah (Habis)**: Sisa stok 0 unit.
  - Dilengkapi kolom pencarian cepat serta filter status.
- **Tab Riwayat Mutasi:**
  - Audit trail lengkap mencatat seluruh riwayat masuk dan keluar per unit kerja.
  - Dapat difilter per jenis transaksi maupun per alat.
  - Terdapat tombol hapus mutasi jika terjadi salah catat (sisa stok akan otomatis dikalkulasi ulang).

---

### 6. Cetak Laporan Resmi & Cadangan Data (Backup/Restore)
- **Cetak Laporan / PDF:**
  - Buka tab **`Laporan & Cetak`**.
  - Klik tombol **`Cetak Laporan / PDF`** (atau tekan `Ctrl + P`).
  - Dokumen otomatis diformat dengan Kop Resmi instansi, nama kantor unit yang dipilih, tabel rekapitulasi, tanggal dinamis, dan kolom tanda tangan resmi:
    - *Dibuat Oleh: Petugas Pengelola K3 (Unit terkait)*
    - *Mengetahui: Manager Operasi & Teknik Perum LPPNPI Cabang Tarakan*
- **Ekspor Excel / CSV:**
  - Klik tombol **`Ekspor CSV`** untuk mengunduh rekap stok atau riwayat transaksi ke format file Excel.
- **Cadangkan (Backup JSON) & Pulihkan (Restore):**
  - Klik **`Cadangkan (Backup JSON)`** untuk mengamankan seluruh database (semua unit) ke dalam 1 file cadangan.
  - Gunakan tombol **`Pulihkan (Restore)`** kapan saja untuk memulihkan data jika berganti komputer atau laptop.
