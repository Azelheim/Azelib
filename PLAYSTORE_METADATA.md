# Metadata Google Play Store — Azelib

## 1. Informasi Aplikasi Dasar
- **Nama Aplikasi (App Title):** Azelib - Manajemen Perpustakaan
- **Nama Paket (Package Name):** `com.azelheim.azelib`
- **Kategori (Category):** Pendidikan / Produktivitas (Education / Productivity)
- **Target Audiens:** Sekolah, Madrasah, Perguruan Tinggi, Komunitas, & Perpustakaan Umum
- **Model Lisensi:** Gratis (Free)

---

## 2. Deskripsi Singkat (Short Description — Maksimal 80 Karakter)
```text
Kelola koleksi buku, sirkulasi peminjaman, anggota, & laporan perpustakaan mudah.
```
*(Panjang: 80 karakter)*

---

## 3. Deskripsi Lengkap (Full Description — Maksimal 4000 Karakter)

```text
Azelib adalah solusi aplikasi manajemen perpustakaan modern berbasis multi-tenant yang dirancang khusus untuk mempermudah sekolah, universitas, instansi, dan perpustakaan komunitas dalam mengelola seluruh operasional perpustakaan secara rapi, cepat, dan transparan.

Dengan arsitektur multi-tenant, satu instansi dapat mengelola perpustakaannya secara mandiri dengan data yang terisolasi aman di cloud database.

FITUR UTAMA AZELIB:

1. MANAJEMEN KOLEKSI BUKU & RAK
- Pencatatan katalog buku lengkap: Judul, Penulis, Penerbit, Tahun Terbit, Kategori, dan Penempatan Rak.
- Pengelolaan eksemplar/salinan buku secara otomatis dengan kode salinan unik per buku.
- Pencarian dan filter buku fleksibel berdasarkan Kategori, Rak, dan status ketersediaan.

2. SIRKULASI PEMINJAMAN & PENGEMBALIAN REAL-TIME
- Transaksi peminjaman cepat dengan validasi batas maksimal pinjam per anggota.
- Otomasi batas waktu jatuh tempo dan perhitungan denda keterlambatan sirkulasi.
- Tab status peminjaman terorganisir: Aktif, Terlambat, dan Riwayat.
- Fitur pelaporan penggantian buku hilang dengan pencatatan nominal penggantian.

3. MANAJEMEN ANGGOTA PERPUSTAKAAN
- Pendaftaran anggota dengan nomor anggota otomatis (auto-numbering format instansi).
- Klasifikasi kategori anggota: Siswa, Guru, Staff, atau Umum.
- Riwayat peminjaman terintegrasi per profil anggota.

4. MODE PENGUNJUNG TANPA LOGIN (SISTEM TOKEN)
- Pengunjung umum dapat mencari dan melihat ketersediaan buku di katalog perpustakaan tanpa perlu membuat akun atau login.
- Akses instan cukup dengan memasukkan 6-karakter Token Akses Perpustakaan.

5. DASHBOARD STATISTIK & LAPORAN LENGKAP
- Ringkasan metrik real-time: Total Koleksi Buku, Peminjam Aktif, Buku Sedang Dipinjam, dan Buku Terlambat.
- Grafik visual dinamika sirkulasi perpustakaan.
- Rekapitulasi total denda per periode waktu.
- Ekspor Laporan Peminjaman, Laporan Denda, dan Mutasi Buku langsung ke dokumen PDF siap cetak atau dibagikan.

6. HAK AKSES & KEAMANAN MULTI-TENANT
- Pembagian peran pengguna yang jelas: Owner (Pemilik), Admin, dan Staff.
- Keamanan data terisolasi dengan Row Level Security (RLS) di Cloud Database.
- Desain antarmuka minimalis, responsif, dan nyaman digunakan sehari-hari.

Azelib hadir untuk mendigitalisasi perpustakaan Anda menjadi lebih modern, efisien, dan mudah diakses oleh seluruh anggota dan pengunjung.

Unduh Azelib sekarang dan rasakan kemudahan pengelolaan perpustakaan dalam genggaman Anda!
```

---

## 4. Rincian Teknis & Izin Aplikasi (App Permissions)
- **Target SDK:** Android 15 / 16 (API Level 35+)
- **Min SDK:** Android 7.0 (API Level 24)
- **Izin yang Diminta:**
  - `android.permission.INTERNET` (Sinkronisasi cloud database)
  - `android.permission.ACCESS_NETWORK_STATE` (Pendeteksi koneksi jaringan)
- **Izin Kamera:** **Tidak diminta** (`android.permission.CAMERA` dihapus sepenuhnya).

---

## 5. Kontak Dukungan Pengembang
- **Email Pengembang:** `azelheims@gmail.com`
- **Tautan Kebijakan Privasi:** https://azelheim.github.io/privacy-policy (atau file `PRIVACY_POLICY.md`)
