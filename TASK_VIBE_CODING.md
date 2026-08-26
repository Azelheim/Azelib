# 📋 TASK VIBE CODING — Penyelesaian Audit Keamanan & Persiapan Rilis Play Store

Dokumen ini adalah instruksi kerja (*task prompt*) terstruktur untuk dikerjakan secara otonom oleh AI Agent / Vibe Coding Agent. Task ini mencakup **remediasi hasil audit uji penetrasi Strix Security** sekaligus **persiapan rilis aplikasi Azelib ke Google Play Store**.

---

## 🎯 Target Utama (Goal)
1. Menyelesaikan seluruh temuan kerentanan keamanan dari pengujian Strix (`vuln-0001`, `vuln-0002`, `vuln-0003`).
2. Mempersiapkan, memvalidasi, dan mem-build aplikasi **Azelib (Expo React Native Android)** menjadi paket **Android App Bundle (`.aab`)** yang aman dan siap diunggah ke Google Play Console.

---

## 📂 Dokumen Referensi Wajib
* **Laporan Audit Keamanan:** [LAPORAN_UJI_PENETRASI_KEAMANAN.md](file:///d:/Azelib/LAPORAN_UJI_PENETRASI_KEAMANAN.md)
* **Spesifikasi Aplikasi & Kontrak:** [AGENTS.md](file:///d:/Azelib/AGENTS.md)
* **Root Frontend:** `d:/Azelib/frontend`
* **Root Backend Supabase:** `d:/Azelib/supabase`

---

## 🚀 ROADMAP PENGERJAAN (MILESTONES)

```
[Milestone 0: Remediasi Keamanan Strix (Backend & Auth)]
                           ⬇
[Milestone 1: Konfigurasi Manifest & Izin Android (app.json)]
                           ⬇
[Milestone 2: Isolasi Environment & Kunci API Klien]
                           ⬇
[Milestone 3: UI/UX & Flow Hardening (Offline & Dialogs)]
                           ⬇
[Milestone 4: Typecheck, Test & Bundle Export Verification]
                           ⬇
[Milestone 5: Kebijakan Privasi & Dokumen Play Store Console]
```

---

### 📌 MILESTONE 0: Penyelesaian PR Keamanan Strix (`LAPORAN_UJI_PENETRASI_KEAMANAN.md`)

**Tugas:**
1. **Remediasi `vuln-0001` (Blokir Rute `/pg/*`):**
   * Pastikan konfigurasi gateway publik (Kong / Nginx) menolak semua rute `/pg/*` dari internet luar agar layanan `postgres-meta` hanya bisa diakses via internal management network.
2. **Remediasi `vuln-0002` (Rotasi Kunci `JWT_SECRET`):**
   * Siapkan konfigurasi secret produksi dengan string acak entropi tinggi (minimal 64 karakter acak).
   * Pastikan `JWT_SECRET` default (`super-secret-jwt-...`) tidak digunakan di server produksi.
   * Generate ulang pasangan kunci `anon_key` dan `service_role_key` yang baru.
3. **Remediasi `vuln-0003` (Refresh Token Reuse Detection):**
   * Di konfigurasi GoTrue (`supabase/config.toml` / environment variable `GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL` atau `auth.reuse_interval`), aktifkan perlindungan deteksi pemakaian ulang refresh token agar sesi dicabut otomatis jika token lama dipakai kembali.
4. **Pembersihan Akun Pengujian Pentest:**
   * Bersihkan akun dummy hasil pentest (`authtest_a@example.com`, `authtest_b@example.com`, `usera_bola@test.com`, `userb_bola@test.com`, `zz_random_*`) dari tabel `auth.users` dan data dummy di `public.tenant` sebelum dipakai untuk data nyata.

---

### 📌 MILESTONE 1: Konfigurasi Manifest & Izin Android (`frontend/app.json`)

**Tugas:**
1. Periksa file `frontend/app.json` dan pastikan konfigurasi Android sudah standar Play Store:
   - `android.package`: `"com.azelheim.azelib"`
   - `version`: `"1.0.0"`
   - `android.versionCode`: `1`
2. Tambahkan plugin deklarasi izin kamera yang jelas pada `plugins` di `app.json` agar Google Play menyetujui izin kamera untuk scan barcode/QR:
   ```json
   [
     "expo-camera",
     {
       "cameraPermission": "Azelib memerlukan akses kamera untuk memindai kode QR perpustakaan dan barcode ISBN buku."
     }
   ]
   ```
3. Pastikan konfigurasi `adaptiveIcon` (foreground, background, monochrome) dan `splash` screen tidak rusak saat di-build.

---

### 📌 MILESTONE 2: Isolasi Environment & Kunci API Klien

**Tugas:**
1. Periksa manajemen environment di `frontend`:
   - Buat template `.env.example` yang mencantumkan:
     ```env
     EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```
2. Pastikan file `.env` dan `.env.local` sudah masuk ke `.gitignore` agar tidak bocor ke Git repository.
3. Audit kode klien Supabase di `frontend/lib/` untuk memastikan tidak ada pemanggilan URL hardcoded localhost (`127.0.0.1:15421` atau `super-secret-...`) di build produksi.
4. ⚠️ **Golden Rule:** Pastikan `service_role_key` dan kredensial database **TIDAK PERNAH** dimasukkan ke dalam kode frontend mobile.

---

### 📌 MILESTONE 3: UI/UX Polish & Penanganan Alur Kritis (Quality Gate)

**Tugas:**
1. **Mode Pengunjung (Scan QR):**
   * Jika scan QR perpustakaan tidak cocok/salah, pastikan toast error menampilkan pesan persis: `"QR tidak dikenali, coba lagi"`.
   * Jika perangkat dalam kondisi offline tetapi sudah pernah sync sebelumnya, pastikan katalog buku tetap bisa terbuka dari cache lokal.
2. **Dialog Konfirmasi Aksi Kritis:**
   * Pastikan dialog konfirmasi muncul sebelum pengguna melakukan:
     * Hapus Buku / Hapus Anggota
     * Kembalikan Buku (Pengembalian Transaksi)
     * Tandai Buku Hilang
     * Keluar dari Akun (Logout)
3. **Standar Desain & Ikon:**
   * Gunakan `lucide-react-native` untuk semua ikon.
   * Pastikan tema di `lib/theme.ts` konsisten di seluruh layar `(admin)`, `pengunjung.tsx`, dan `login.tsx`.

---

### 📌 MILESTONE 4: Validasi Kode, Typecheck & Test Build

**Tugas:**
1. Jalankan pemeriksaan typecheck TypeScript:
   ```bash
   cd frontend
   npx tsc --noEmit
   ```
   *Perbaiki semua error TypeScript yang muncul hingga 0 error.*
2. Jalankan test otomatis yang ada di `frontend/scripts/`:
   ```bash
   node ./scripts/test-book-sync.test.mjs
   ```
3. Uji coba pembuatan export bundle:
   ```bash
   npx expo export --platform android
   ```
   *Pastikan bundle JS berhasil di-generate tanpa circular dependency error.*

---

### 📌 MILESTONE 5: Dokumen Syarat Google Play Console

**Tugas:**
1. **Buat file `PRIVACY_POLICY.md` di root proyek:**
   * Berisi dokumen Kebijakan Privasi standar bahasa Indonesia & Inggris yang siap di-host (menjelaskan pemakaian Kamera hanya untuk utilitas scan QR/Barcode dan Email untuk identitas akun).
2. **Buat file `PLAYSTORE_METADATA.md`:**
   * Judul Aplikasi: **Azelib - Manajemen Perpustakaan**
   * Deskripsi Singkat (Maks 80 karakter): *"Aplikasi manajemen perpustakaan multi-tenant offline-first untuk sekolah & umum."*
   * Deskripsi Lengkap (Fitur utama, barcode scanner, laporan denda, katalog pengunjung).
   * Format jawaban Data Safety form untuk reviewer Google Play.

---

## 🏁 Kriteria Selesai (Definition of Done)
- [ ] Seluruh remedi PR keamanan Strix (`vuln-0001`, `vuln-0002`, `vuln-0003`) terdokumentasi & siap diterapkan di produksi.
- [ ] `frontend/app.json` terkonfigurasi rapi dengan plugin kamera & permission string.
- [ ] `tsc --noEmit` bersih tanpa error.
- [ ] Bundle export `expo export --platform android` sukses.
- [ ] File `PRIVACY_POLICY.md` dan `PLAYSTORE_METADATA.md` tersedia.
- [ ] Tidak ada hardcoded secret lokal di kodingan frontend.
- [ ] Siap dijalankan perintah `npx eas-cli build --platform android --profile production`.
