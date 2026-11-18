# Sistem Rekapitulasi Inventaris Alat K3
**Perum LPPNPI (AirNav Indonesia) Cabang Tarakan & Unit Kerja Bawahan**

Aplikasi web untuk mencatat, memantau stok, mencatat mutasi barang masuk/keluar, dan membuat laporan resmi inventaris alat Keselamatan & Kesehatan Kerja (K3) di lingkungan Perum LPPNPI Cabang Tarakan beserta unit kerja bawahan di Kalimantan Utara.

🌐 **Alamat aplikasi: <https://airnav-k3.vercel.app>**

Aplikasi dapat dibuka dari **komputer, tablet, maupun HP**. Tampilan otomatis menyesuaikan ukuran layar.

---

## 🔐 Hak Akses

| Pengguna | Yang dapat dilakukan |
|---|---|
| **Pengunjung (tanpa login)** | Melihat rekap stok, riwayat mutasi, laporan, mencetak laporan, dan mengunduh CSV/backup. |
| **Admin (setelah login)** | Semua fitur di atas, **ditambah**: menambah/mengubah/menghapus alat, mencatat barang masuk & keluar, menghapus riwayat, memulihkan (restore) dan mereset data. |

### Cara login sebagai admin
1. Klik tombol **`Login Admin`** (kuning) di pojok kanan atas.
2. Masukkan **email** dan **password** admin yang diberikan oleh pengelola sistem.
3. Klik **`Masuk`**. Tab **Barang Masuk** dan **Barang Keluar** akan muncul.
4. Untuk keluar, klik tombol **`Logout`** di pojok kanan atas.

> Akun admin dibuat oleh pengelola sistem. Pengunjung tidak dapat mendaftar sendiri.

### Indikator status (titik di header)
- 🟢 **Hijau – Tersinkron Cloud**: data tersimpan di server dan sama untuk semua pengguna.
- 🔴 **Merah – Gagal Terhubung**: periksa koneksi internet, lalu muat ulang halaman.
- 🟠 **Oranye – Mode Lokal**: data hanya tersimpan di peramban (browser) perangkat ini.

---

## 🏢 Kantor & Unit Kerja

1. **Perum LPPNPI Cabang Tarakan** *(Kantor Cabang Utama)*
2. **Perum LPPNPI Cabang Pembantu Malinau**
3. **Perum LPPNPI Unit Nunukan**
4. **Perum LPPNPI Unit Tanjung Harapan** *(Tanjung Selor)*
5. **Perum LPPNPI Unit Long Bawan**
6. **Perum LPPNPI Unit Long Apung**

Pilih kantor melalui menu **`Kantor / Unit`** di bagian atas. Seluruh tampilan (tabel stok, statistik, form, dan laporan) otomatis menampilkan data unit tersebut. Pilihan **`Semua Unit (Konsolidasi)`** menampilkan gabungan seluruh kantor.

---

## 🛠️ Panduan Fitur

### 1. Rekap Stok Alat K3
- Menampilkan stok awal, jumlah masuk, jumlah keluar, dan **sisa unit** secara langsung.
- Indikator status:
  - 🟢 **Aman** – stok di atas batas minimal.
  - 🟡 **Menipis** – stok sama dengan/di bawah batas peringatan, perlu pengadaan.
  - 🔴 **Habis** – sisa stok 0.
- Gunakan kolom **pencarian** dan **filter status** untuk menemukan alat dengan cepat.

### 2. Menambah Alat K3 Baru *(admin)*
**Cara A – Tombol `+ Tambah Alat Baru`** di tab Rekap Stok:
1. Pilih **Kantor / Unit Kerja** tujuan.
2. Isi **Nama Alat** (misal `BODY HARNESS`), **Satuan** (`PCS`/`SET`/`UNIT`), **Stok Awal**, dan **batas peringatan stok menipis**.
3. Isi lokasi penyimpanan (bawaan: `Lemari K3`) dan keterangan bila perlu.
4. Klik **`Simpan ke Sistem`**. Kode alat dibuat otomatis sesuai unit (contoh `K3-MLN-001`).

**Cara B – Langsung saat mencatat Barang Masuk:**
1. Di tab **Barang Masuk**, pilih opsi **`➕ [ALAT BARU BELUM TERDAFTAR...]`**.
2. Isi unit, nama alat, satuan, kategori, dan jumlah masuk.
3. Klik **`Simpan Barang Masuk`**. Alat baru dan transaksinya tersimpan sekaligus.

### 3. Mengubah / Menghapus Alat *(admin)*
- Klik **`Ubah`** pada baris alat untuk memperbaiki nama, satuan, stok awal, batas stok, kategori, lokasi, atau keterangan. Nama baru otomatis ikut diperbarui di riwayat mutasi.
- Klik **`Hapus`** untuk menghapus alat. **Seluruh riwayat mutasi alat tersebut ikut terhapus.**

### 4. Mencatat Barang Masuk *(admin)*
1. Buka tab **Barang Masuk**, pilih alat, isi jumlah, tanggal, pengirim/vendor, dan keterangan.
2. Klik **`Simpan Barang Masuk`**. Stok bertambah dan transaksi tercatat di Riwayat Mutasi.

### 5. Mencatat Barang Keluar *(admin)*
1. Buka tab **Barang Keluar** dan pilih alat. Sisa stok yang tersedia akan ditampilkan.
2. Isi jumlah, nama penerima/petugas (wajib), keperluan/lokasi kerja, dan tanggal.
3. Klik **`Simpan Pengeluaran Barang`**.

> **Validasi stok:** sistem menolak pengeluaran yang melebihi sisa stok, termasuk bila dua admin menginput bersamaan, sehingga stok tidak pernah minus.

### 6. Riwayat Mutasi
- Menampilkan seluruh transaksi masuk/keluar per unit, dapat difilter per jenis dan per alat, serta dicari berdasarkan petugas/keperluan.
- Admin dapat menghapus transaksi yang salah catat; sisa stok dihitung ulang otomatis. Transaksi masuk tidak bisa dihapus bila akan membuat stok minus.

### 7. Laporan, Ekspor & Cadangan Data
- **Cetak Laporan / PDF**: buka tab **Laporan & Cetak**, klik **`Cetak Laporan / PDF`** (atau `Ctrl + P`). Laporan berisi kop instansi, nama unit, tabel rekap, tanggal, dan kolom tanda tangan (*Petugas Pengelola K3* & *Manager Safety*).
- **Ekspor CSV**: unduh rekap stok atau riwayat mutasi untuk dibuka di Excel.
- **Cadangkan (Backup JSON)**: menyimpan seluruh data semua unit ke satu file. Lakukan secara berkala.
- **Pulihkan (Restore)** *(admin)*: mengganti **seluruh** data dengan isi file backup.
- **Reset ke Awal** *(admin)*: menghapus semua data dan kembali ke 6 alat awal Cabang Tarakan. Harus mengetik `RESET` untuk konfirmasi.

---

## 📱 Tips Penggunaan di HP
- Navigasi tab berada di **bagian bawah layar**.
- Tabel ditampilkan dalam bentuk **kartu** agar mudah dibaca tanpa menggeser layar.
- Agar dapat dibuka seperti aplikasi, pilih menu peramban **“Tambahkan ke Layar Utama” / “Add to Home Screen”**.

---

## ❓ Pertanyaan Umum

**Data tidak berubah setelah admin lain menginput?**
Data dimuat ulang otomatis saat Anda kembali ke tab peramban. Anda juga dapat memuat ulang halaman (refresh).

**Muncul pesan “Akses ditolak” atau “Silakan login sebagai admin”?**
Sesi login sudah berakhir. Silakan login ulang.

**Muncul banner “Ditemukan data versi offline di peramban ini”?**
Perangkat ini pernah memakai versi offline lama. Admin dapat menekan **`Unggah ke Cloud`** untuk memindahkan data tersebut ke server, atau **`Abaikan`** untuk menghapusnya dari peramban.

**Lupa password admin?**
Hubungi pengelola sistem untuk mengatur ulang password.
