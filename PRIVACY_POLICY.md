# Kebijakan Privasi (Privacy Policy) — Azelib

**Terakhir diperbarui:** 27 Agustus 2026

Azelib ("Aplikasi") adalah sistem manajemen perpustakaan modern berbasis multi-tenant yang dikembangkan untuk membantu sekolah, universitas, dan instansi mengelola koleksi buku, anggota, sirkulasi peminjaman, serta laporan perpustakaan.

Kami berkomitmen untuk melindungi privasi dan keamanan data pengguna kami. Kebijakan Privasi ini menjelaskan bagaimana data dikumpulkan, digunakan, disimpan, dan dilindungi saat Anda menggunakan aplikasi Azelib.

---

## 1. Data yang Dikumpulkan

### a. Data Akun Pengguna (Admin, Petugas, Anggota)
- **Alamat Email:** Digunakan sebagai identitas unik autentikasi untuk masuk (login) ke dalam sistem perpustakaan.
- **Nama Pengguna / Nama Anggota:** Digunakan untuk pencatatan keanggotaan dan sirkulasi peminjaman buku.
- **Nomor Kontak / WhatsApp (Opsional):** Digunakan untuk keperluan administrasi dan pencatatan data anggota perpustakaan.

### b. Data Perpustakaan (Multi-Tenant)
- **Nama & Alamat Perpustakaan:** Digunakan untuk identitas instansi penyewa (tenant).
- **Data Koleksi Buku, Kategori, & Rak:** Judul buku, penulis, penerbit, nomor klasifikasi/rak, dan status salinan buku.
- **Data Transaksi:** Tanggal peminjaman, tanggal jatuh tempo, tanggal pengembalian, status denda, dan riwayat sirkulasi.
- **Token Akses Pengunjung:** Kode alfanumerik 6-karakter acak yang dihasilkan sistem untuk memudahkan pengunjung umum melihat katalog publik perpustakaan tanpa perlu membuat akun atau login.

---

## 2. Izin Perangkat (Device Permissions)

- **Akses Kamera:** Aplikasi Azelib **TIDAK** meminta atau menggunakan izin kamera (`android.permission.CAMERA`). Seluruh pencarian dan input buku, token akses, serta pencatatan peminjaman dilakukan secara digital melalui antarmuka aplikasi.
- **Akses Internet (`INTERNET`):** Digunakan untuk sinkronisasi data sirkulasi perpustakaan secara real-time ke cloud database (Supabase).
- **Akses Penyimpanan Eksternal / Berbagi Dokumen:** Digunakan secara lokal ketika pengguna (Admin/Petugas) memilih untuk mencetak atau membagikan berkas Laporan Perpustakaan (format PDF) menggunakan fitur berbagi bawaan sistem operasi (Android Share Sheet).

---

## 3. Penggunaan Data

Data yang dikumpulkan hanya digunakan untuk:
1. Menyediakan layanan manajemen operasional perpustakaan.
2. Memverifikasi identitas pengguna dan hak akses (Owner, Admin, Staff).
3. Menghitung status peminjaman, keterlambatan, dan denda sirkulasi secara akurat.
4. Menyediakan katalog publik bagi pengunjung melalui sistem Token Akses.
5. Menghasilkan laporan statistik dan ekspor dokumen PDF perpustakaan.

Kami **tidak pernah** menjual, menyewakan, atau membagikan data pribadi atau data perpustakaan Anda kepada pihak ketiga untuk keperluan periklanan atau pemasaran.

---

## 4. Penyimpanan dan Keamanan Data

- Data disimpan di infrastruktur cloud database terenkripsi (Supabase Cloud) dengan proteksi Row Level Security (RLS) ketat per instansi (tenant).
- Akses antar perpustakaan terisolasi secara menyeluruh sehingga data satu perpustakaan tidak dapat diakses oleh perpustakaan lain.
- Kunci autentikasi lokal disimpan secara aman pada perangkat menggunakan penyimpanan terenkripsi (`expo-secure-store`).

---

## 5. Penghapusan Data dan Hak Pengguna

Pengguna memiliki hak untuk:
- Memperbarui atau mengubah data perpustakaan dan anggota kapan saja melalui menu aplikasi.
- Meminta penghapusan akun atau data perpustakaan dengan menghubungi Administrator instansi terkait atau melalui kontak pengembang di bawah ini.

---

## 6. Kontak Pengembang

Jika Anda memiliki pertanyaan, saran, atau permintaan terkait Kebijakan Privasi ini, silakan hubungi kami melalui:
- **Email:** `azelheims@gmail.com`
- **Pengembang:** Azelheim Team
