# Sistem Rekapitulasi Inventaris Alat K3
**Perum LPPNPI (AirNav Indonesia) Cabang Tarakan & Unit Kerja Bawahan**

Aplikasi web mandiri (*standalone client-side*) untuk pencatatan, pemantauan stok, mutasi barang masuk/keluar, serta pelaporan resmi inventaris alat Keselamatan & Kesehatan Kerja (K3) pada Perum LPPNPI Cabang Tarakan dan unit kerja terkait di Kalimantan Utara.

---

## 📁 Struktur Direktori & File

```text
AIRNAV/
├── .vscode/                     # Konfigurasi workspace Visual Studio Code
│   └── launch.json              # Profil debugging browser ke localhost:8080
├── assets/                      # Asset web aplikasi
│   ├── css/
│   │   └── style.css            # Desain tampilan UI, responsif, dan layout cetak
│   └── js/
│       └── app.js               # Logika sistem inventaris, mutasi, multi-unit, backup
├── bahan/                       # Dokumen acuan / bahan referensi mentah (diabaikan oleh git)
│   ├── Checklist LPPNPI 2024 revisi.xlsx
│   └── K3AIRNAV.pdf
├── .gitignore                   # Aturan pengabaian git (mengabaikan folder bahan, xlsx, pdf, dll)
├── Buka_Sistem_K3.bat           # Pintasan langsung membuka aplikasi di browser utama
├── index.html                   # Halaman utama aplikasi sistem inventaris K3
├── Jalankan_Server_Lokal.bat    # Script peluncur server HTTP lokal (port 8080)
├── PANDUAN_PENGGUNAAN.md        # Panduan teknis operasional lengkap untuk pengguna
├── README.md                    # Dokumentasi umum proyek & struktur folder
└── server.ps1                   # Web server HTTP ringan berbasis PowerShell
```

---

## 🚀 Cara Menjalankan Aplikasi

### Opsi 1: Menjalankan Server Lokal (Disarankan)
1. Klik ganda file **`Jalankan_Server_Lokal.bat`**.
2. Aplikasi akan otomatis membuka browser di: [http://localhost:8080/](http://localhost:8080/).
3. Biarkan jendela terminal tetap berjalan selama menggunakan server lokal.

### Opsi 2: Membuka Langsung Tanpa Server (100% Offline)
1. Klik ganda file **`Buka_Sistem_K3.bat`** atau file **`index.html`**.
2. Aplikasi akan langsung berjalan di peramban tanpa memerlukan koneksi jaringan apa pun.

---

## 🔒 Privasi & Penyimpanan Data
- Seluruh data transaksi dan stok tersimpan secara lokal di peramban pengguna (*LocalStorage*).
- Gunakan fitur **Cadangkan (Backup JSON)** pada tab *Laporan & Cetak* secara berkala untuk mencadangkan database.
- File bahan acuan mentah seperti `.xlsx` dan `.pdf` ditempatkan di folder `bahan/` dan dikecualikan dari repositori melalui `.gitignore`.
