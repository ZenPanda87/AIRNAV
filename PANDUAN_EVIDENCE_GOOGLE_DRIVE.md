# Panduan menyambungkan evidence ke Google Drive akun kantor

Evidence (foto/PDF) di Sistem KKS Terpadu disimpan di **Google Drive akun kantor**. Supabase hanya menyimpan link & data file.

```
Browser petugas ──(login AIRNAV)──► Supabase Edge Function "evidence" ──(token rahasia)──► Google Apps Script (akun kantor) ──► Google Drive
```

Petugas **tidak perlu** akun Google. Token rahasia hanya ada di 2 tempat: Script properties Apps Script & secret Supabase — **tidak** di GitHub / browser.

Lama pengerjaan ± 15 menit, dilakukan sekali oleh pemegang akun Google kantor.

---

## 1. Buat token rahasia

Di PowerShell (komputer mana saja):

```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | % {[char]$_})
```

Salin hasilnya (48 karakter). Simpan sementara — dipakai di langkah 2 dan 4.

## 2. Buat Apps Script di akun kantor

1. Login ke Google dengan **akun kantor** (@airnavindonesia.co.id) yang akan menjadi pemilik folder evidence.
2. Buka <https://script.google.com> → **New project** → beri nama `AIRNAV KKS Evidence`.
3. Hapus isi `Code.gs`, lalu **tempel seluruh isi file `apps-script/Code.gs`** dari folder web AIRNAV. Simpan (Ctrl+S).
4. Klik ⚙️ **Project Settings** → bagian **Script properties** → **Add script property**:
   - `TOKEN` = token dari langkah 1
   - (opsional) `ROOT_FOLDER_ID` = ID folder di **Shared Drive** unit bila ingin folder dimiliki organisasi.
     ID folder adalah bagian URL setelah `/folders/`. Kosongkan bila cukup di My Drive akun kantor.
5. Kembali ke editor → pilih fungsi **`setup`** → **Run** → izinkan akses Google Drive (Review permissions → pilih akun kantor → Allow).
   Di *Execution log* muncul alamat folder `AIRNAV-KKS-Evidence`.

## 3. Deploy sebagai Web App

1. **Deploy → New deployment** → ikon ⚙️ → pilih **Web app**.
2. Description: `v1` · **Execute as: Me** (akun kantor) · **Who has access: Anyone**.
   > "Anyone" diperlukan agar server Supabase bisa memanggil. Tanpa token yang benar, script menolak semua permintaan.
3. **Deploy** → salin **Web app URL** (berakhiran `/exec`).

> Bila muncul pesan bahwa organisasi tidak mengizinkan, berarti admin Google Workspace kantor membatasi Apps Script / akses "Anyone". Minta TI pusat mengizinkan, atau beri tahu saya untuk mencari alternatif.

## 4. Isi secret di Supabase

1. Buka <https://supabase.com/dashboard/project/zdwseuyakwnknmuejppk/functions/secrets>.
2. Tambahkan dua secret:
   - `APPS_SCRIPT_URL` = Web app URL dari langkah 3
   - `APPS_SCRIPT_TOKEN` = token dari langkah 1
3. Simpan. Tidak perlu deploy ulang fungsi.

## 5. Uji

1. Buka web AIRNAV → **Sistem KKS** → login.
2. Buka **APAR → Ubah** salah satu APAR → bagian *Evidence* → **Pilih foto/PDF**.
3. Bila berhasil, file muncul di daftar dan di Drive: `AIRNAV-KKS-Evidence/<tahun>/<lokasi>/K3/APAR/<periode>/`.

## Aturan yang berlaku otomatis

| Hal | Aturan |
|---|---|
| Foto | dikompres di HP/laptop ±1600 px, JPEG 70% (±300 KB) |
| PDF | maks. 10 MB |
| Duplikat | file identik (SHA-256) pada data yang sama ditolak |
| Folder K3, Keselamatan, Pengawasan | bisa dibuka lewat link oleh akun @airnavindonesia.co.id (tombol **Salin link**) |
| Folder Keamanan | **terbatas** — hanya bisa dibuka lewat web AIRNAV oleh peran yang berhak |
| Hapus | hanya pengunggah (≤ 24 jam) atau Admin KKS; file **dipindah** ke `_Arsip_Dihapus`, tidak langsung hilang |
| Sinyal lemah | file ditahan di antrean browser dan diunggah ulang otomatis saat online |

## Bila mengganti token / URL

- Ganti `TOKEN` di Script properties **dan** `APPS_SCRIPT_TOKEN` di Supabase dengan nilai yang sama.
- Bila mengubah kode Apps Script: **Deploy → Manage deployments → Edit → Version: New version** (URL tetap sama).
