# AGENTS.md — Aplikasi Manajemen Perpustakaan

> File konteks untuk AI coding agent. Pekerjaan dibagi jadi 2 task independen — **TASK A: BACKEND** dan **TASK B: FRONTEND** — dikerjakan terpisah dari kontrak yang sama, baru diintegrasikan di **TASK C** setelah keduanya selesai. Baca §0–§7 (konteks bersama) dulu, baru kerjakan task sesuai penugasan Anda. JANGAN berasumsi di luar yang tertulis — kalau ada celah spesifikasi, tulis `// TODO: konfirmasi product owner` di kode, jangan ditebak.

---

## 0. Cara Pakai File Ini

| Jika Anda ditugaskan... | Baca | Kerjakan | Jangan |
|---|---|---|---|
| **Backend agent** | §1–§7 + **TASK A** + Appendix (kontrak) | Skema Supabase, RLS, Auth, Edge Functions sesuai kontrak Appendix persis | Jangan tulis kode UI/komponen apa pun |
| **Frontend agent** | §1–§7 + **TASK B** + Appendix (kontrak) | Seluruh layar Expo/RN, state, navigasi, konsumsi API **lewat kontrak Appendix** (pakai mock service yang match kontrak, backend belum tentu online) | Jangan buat skema database sendiri, jangan panggil Supabase langsung di luar kontrak |
| **Integrator (setelah A & B "Selesai")** | **TASK C** | Sambungkan frontend↔backend nyata, uji tiap alur di §4 | Jangan ubah kontrak Appendix tanpa update kedua sisi |

Kontrak di **Appendix** adalah **sumber kebenaran tunggal** antara dua task — nama field, tipe data, dan nama endpoint di sana **final**, tidak boleh diubah sepihak oleh salah satu task.

---

## 1. Ringkasan Produk

- **Nama:** Aplikasi Manajemen Perpustakaan (multi-tenant)
- **Target pengguna:** Sekolah & perpustakaan besar
- **Model:** Multi-tenant — satu aplikasi, banyak instansi (tenant), data terpisah per tenant
- **Distribusi:** Gratis, rilis publik Google Play Store
- **Platform:** Android saja untuk rilis awal (versi Web = proyek terpisah, di luar scope ini)
- **Arsitektur data:** Offline-first — semua fitur inti harus tetap jalan tanpa internet, lalu sinkron otomatis ke cloud saat online
- **Core value produk:** Laporan real-time kondisi perpustakaan (stok, peminjaman aktif, buku hilang) untuk Admin/Owner
- **Masalah yang dipecahkan:**
  1. Admin/Owner kesulitan mendapat laporan real-time kondisi perpustakaan
  2. Pengunjung kesulitan menemukan lokasi & ketersediaan buku secara mandiri
- **KPI utama:** Tingkat keberhasilan sinkronisasi offline→online

### Fitur MVP v1 (scope wajib rilis pertama)
1. Manajemen data Buku, Rak, Kategori
2. Generate & cetak kode unik (barcode) per eksemplar buku
3. Katalog publik untuk pengunjung (akses via scan QR Perpustakaan, tanpa login)
4. Sinkronisasi offline ↔ online otomatis
5. Laporan (dasar + export PDF)
6. Peminjaman/pengembalian dengan sistem denda
7. Statistik/chart di Dashboard

---

## 2. Tech Stack (WAJIB DIIKUTI, tidak boleh ganti library tanpa alasan kuat)

| Komponen | Pilihan | Task |
|---|---|---|
| Framework | **Expo** (React Native) + TypeScript | Frontend |
| Navigasi | **Expo Router** (file-based routing) | Frontend |
| UI Kit | **React Native Paper** (Material Design) | Frontend |
| Build | **EAS Build** dengan custom dev client (wajib — ada native module, **tidak jalan di Expo Go biasa**) | Frontend |
| Database lokal (offline) | **op-sqlite** dengan dukungan SQLCipher (enkripsi) | Frontend |
| State management | React Context / Zustand | Frontend |
| Scan barcode/QR | `expo-camera` (barcode scanning bawaan) | Frontend |
| Export laporan PDF | `expo-print` | Frontend |
| Notifikasi push (klien) | `expo-notifications` | Frontend |
| Chart (Dashboard) | `victory-native` | Frontend |
| Backend & Cloud DB | **Supabase** (PostgreSQL + Auth + Realtime) | Backend |
| Business logic kustom | **Supabase Edge Functions** (Deno/TypeScript) | Backend |
| Notifikasi push (server trigger) | Firebase Cloud Messaging (dipicu dari Edge Function) | Backend |
| Lookup ISBN | Proxy ke Google Books API / Open Library API **lewat Edge Function** (jangan dipanggil langsung dari klien, supaya key/rate-limit terkontrol) | Backend |

### 2.1 Design Direction — WAJIB DIIKUTI (Frontend)

Arah visual: **minimalis, vector-based**. Ini bukan preferensi estetika bebas — ikuti aturan konkret berikut, jangan improvisasi ke arah lain (mis. neumorphism, skeuomorphism, gradient ramai, ilustrasi 3D):

| Aspek | Aturan |
|---|---|
| Palet warna | 1 warna primer + skala netral (abu-abu/putih). Tanpa gradient. Warna aksen hanya untuk status (sukses/error/warning) |
| Ikon | Vector line-icon, satu stroke width konsisten — pakai `lucide-react-native` |
| Tipografi | Satu font sans-serif, 2–3 font weight saja, line-height lega |
| Spacing | Grid 8pt konsisten, banyak whitespace, jangan padat |
| Shadow/elevation | Flat — hindari shadow berat; kalau perlu elevasi, pakai border tipis atau shadow sangat halus |
| Sudut elemen | Border-radius konsisten (rounded-minimalis, bukan kotak tajam penuh atau pill berlebihan) |
| Ilustrasi (empty state, dll) | Line-art vector sederhana — bukan foto/ilustrasi ramai/3D |
| Komponen | Tetap pakai **React Native Paper** (§2) — theme ulang warna/shape/elevation-nya sesuai tabel ini, jangan ganti UI kit |

Setup: buat `lib/theme.ts` berisi `MD3Theme` kustom (colors, roundness, elevation override) sesuai tabel di atas, dipakai lewat `PaperProvider` di root layout — satu sumber kebenaran tema, jangan style ad-hoc tersebar per komponen.

---

## 3. Peran & Hak Akses

| Role | Deskripsi | Hak Akses |
|---|---|---|
| **Owner** | 1 per tenant; pembuat perpustakaan atau penerus yang ditunjuk | Setara Admin + kebal dikeluarkan Admin lain; satu-satunya yang boleh mengeluarkan Admin |
| **Admin** | Dinaikkan dari Staff/Kepala Sekolah oleh Owner | Akses penuh: buku, peminjaman, anggota, laporan, pengaturan |
| **Staff / Kepala Sekolah** | Diundang via email oleh Admin/Owner | Default **read-only**; bisa dipromosikan jadi Admin |
| **Pengunjung** | Tanpa login, akses via scan QR Perpustakaan | Hanya lihat katalog publik: Judul, Penulis, Kategori, Rak, Sinopsis, Status |

**Suksesi Owner:** Owner menunjuk calon penerus (`penerus_user_id`). Jika Owner tidak aktif 30 hari (`last_active_at`), kirim notifikasi peringatan H-7, lalu otoritas Owner otomatis pindah ke penerus. (Logic ini = **Backend**, dijalankan sebagai scheduled Edge Function/cron.)

---

## 4. Spesifikasi Halaman (Atomik) — acuan utama Frontend, referensi kontrak data untuk Backend

### 4.1 Halaman Gerbang
- Logo: placeholder/dummy image
- Tagline (teks persis): **"Satu Aplikasi untuk Semua Perpustakaan Anda"**
- Tombol "Login" (icon kunci) → route `/login`
- Tombol "Scan Perpustakaan" (icon QR) → buka kamera scan → route `/pengunjung`
- Toast error scan QR invalid (teks persis): **"QR tidak dikenali, coba lagi"**
- Offline: jika device pernah sync sebelumnya, katalog tetap terbuka dari cache lokal meski tanpa internet

### 4.2 Halaman Login
| Field | Label | Validasi | Pesan Error |
|---|---|---|---|
| Email | "Email" | format email valid | "Format email tidak valid" |
| Password | "Password" | min 8 karakter, kombinasi huruf+angka | "Password minimal 8 karakter, kombinasi huruf dan angka" |
| — | — | kombinasi salah saat login | "Email atau password salah" |

- Link "Buat Akun" → self-registration (email only) · Link "Lupa Password" → reset via email
- Brute-force protection: kunci akun sementara setelah gagal login berulang (**Backend**: Supabase Auth policy)
- Sesi login berlaku **7 hari**

### 4.3 Halaman Buat/Pilih Perpustakaan
- Tombol "Buat Baru" → form Nama Perpustakaan, Alamat → user jadi **Owner** tenant baru
- Tombol "Gabung" → list undangan tenant yang masuk ke email user (**bukan** input kode manual) → pilih satu untuk bergabung

### 4.4 Shell Admin
- Bottom nav 5 tab: **Dashboard, Buku, Peminjaman, Anggota, Laporan**
- Top nav kiri: nama tenant · kanan: toggle dark/light · icon gerigi (⚙️): "Pengaturan Perpustakaan", "Keluar"

### 4.5 Halaman Dashboard
- Card lebar #1: line chart toggle konteks (Buku / Peminjam / Denda)
- Card lebar #2: angka **Total Denda** per periode filter (bukan chart)
- 4 card kecil: **Jumlah Buku**, **Peminjam** (aktif saat ini), **Buku Dipinjam**, **Buku Terlambat**
- **PENTING:** "Buku Terlambat" dihitung **real-time** (`jatuh_tempo < hari_ini`, status aktif) — bukan disimpan statis, endpoint backend wajib hitung ulang tiap panggil

### 4.6 Halaman Buku (List)
- Item: Judul, Penulis, Kategori, Salinan (format **"tersedia/total"**, mis. "3/5")
- Filter: kombinasi Kategori + Rak + Status · Sort: Judul A-Z / Penulis / Terbaru
- Scan ISBN saat tambah → auto-isi Judul, Penulis, Penerbit, Tahun, Cover; Kategori/Rak/Sinopsis manual

### 4.7 Halaman Detail Buku
- Field: Judul, Penulis, Penerbit, Tahun Terbit, ISBN (opsional), Kategori, Rak, Sinopsis, Bahasa, Jumlah Halaman, Cover (URL saja, tanpa upload manual)
- Kategori & Rak: combobox searchable, auto-create entry baru, no duplicate
- Hapus **diblokir** kalau ada salinan sedang dipinjam (soft-delete)
- Cetak Kode: bulk, generate kode semua eksemplar
- **Kode eksemplar:** `[ISBN|LOK-00001]-[nomor_urut reset per buku]`. Peminjaman: pilih manual ATAU scan kode eksemplar — dua-duanya wajib didukung Frontend.

### 4.8 Halaman Peminjaman
- Tab: **Aktif / Terlambat / Riwayat** · Item: Nama Peminjam, Judul Buku, Tgl Pinjam, Jatuh Tempo, Status
- "+Peminjaman Baru": pilih Anggota (bisa tambah baru inline) → pilih ≥1 buku (manual/scan, dibatasi `batas_maksimal_peminjaman` tenant) → Jatuh Tempo **manual** → dialog konfirmasi
- "Kembalikan": dialog konfirmasi → backend hitung denda otomatis jika terlambat
- "Tandai Hilang": dialog konfirmasi + input Biaya Penggantian manual → status transaksi & eksemplar jadi "hilang"
- Status "Terlambat" = **H+1** dari jatuh tempo

### 4.9 Halaman Anggota
- List: Nama, Kontak + Filter (Kategori Anggota + Status meminjam/tidak)
- Field: Nama, **Nomor Anggota (auto-generate backend, format `ANG-00001`)**, Kategori, Kontak (`08xxxxxxxxxx`), Alamat
- Detail: data lengkap + riwayat peminjaman · Hapus **diblokir** kalau ada peminjaman aktif (soft-delete)

### 4.10 Halaman Laporan
- 3 jenis: Laporan Peminjaman, Laporan Denda (keduanya per periode), Laporan Buku (ringkasan koleksi + mutasi masuk/keluar per periode)
- Semua bisa dikustom filternya, selalu ada filter periode baseline · Export **PDF**

### 4.11 Halaman Mode Pengunjung (tanpa login, pasca-scan)
- Tab: Rak / Semua Buku / Kategori + search bar sticky
- Field ringkas publik (**beda dari field admin**): Judul, Penulis, Kategori, Rak, Sinopsis, Status Ketersediaan — TANPA ISBN/Penerbit/Tahun/Bahasa/Jumlah Halaman
- Tombol keluar → Halaman Gerbang

### 4.12 Pengaturan Perpustakaan (dari ikon gerigi)
- **Member:** list Nama/Email/Role + tombol otoritas (Member/Admin) + Hapus (**hanya Owner**). Undang via email — sudah punya akun → langsung tambah; belum → kirim undangan self-register.
- **QR Code Perpustakaan:** kode **sama persis** dengan tombol "Scan Perpustakaan" di Gerbang + tombol Simpan Gambar. Permanen kecuali tenant dihapus.
- **Batas Maksimal Peminjaman** & **Nominal Denda per Hari** (default Rp500/hari/buku, **perubahan tidak retroaktif**): input angka per tenant.
- **Tidak ada** Ekspor/Impor manual, **tidak ada** Backup/Restore manual — sudah tercakup sync cloud otomatis.

---

## 5. Skema Database — **milik TASK A (Backend)**, Frontend cukup pakai tipe di Appendix

```sql
-- TENANT (perpustakaan)
CREATE TABLE tenant (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama                      VARCHAR(150) NOT NULL,
    alamat                    TEXT,
    qr_code_value             VARCHAR(100) UNIQUE NOT NULL,
    batas_maksimal_peminjaman INTEGER NOT NULL DEFAULT 3,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app_user (
    id          UUID PRIMARY KEY, -- = auth.users.id (Supabase Auth, password auto-hash)
    email       VARCHAR(255) UNIQUE NOT NULL,
    nama        VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE member_role AS ENUM ('owner', 'admin', 'staff');

CREATE TABLE tenant_member (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    role            member_role NOT NULL DEFAULT 'staff',
    penerus_user_id UUID REFERENCES app_user(id),
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, user_id)
);

CREATE TABLE kategori (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    nama       VARCHAR(100) NOT NULL,
    UNIQUE (tenant_id, nama)
);

CREATE TABLE rak (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    nama       VARCHAR(100) NOT NULL,
    UNIQUE (tenant_id, nama)
);

CREATE TABLE buku (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    isbn            VARCHAR(20),
    kode_lokal      VARCHAR(20),
    judul           VARCHAR(255) NOT NULL,
    penulis         VARCHAR(255),
    penerbit        VARCHAR(255),
    tahun_terbit    SMALLINT,
    kategori_id     UUID REFERENCES kategori(id),
    rak_id          UUID REFERENCES rak(id),
    sinopsis        TEXT,
    bahasa          VARCHAR(50),
    jumlah_halaman  INTEGER,
    cover_url       TEXT,
    dihapus         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT identitas_buku_check CHECK (isbn IS NOT NULL OR kode_lokal IS NOT NULL)
);

CREATE TYPE status_salinan AS ENUM ('tersedia', 'dipinjam', 'hilang');

CREATE TABLE salinan (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buku_id        UUID NOT NULL REFERENCES buku(id) ON DELETE CASCADE,
    nomor_urut     INTEGER NOT NULL,
    kode_eksemplar VARCHAR(50) NOT NULL,
    status         status_salinan NOT NULL DEFAULT 'tersedia',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (buku_id, nomor_urut),
    UNIQUE (kode_eksemplar)
);

CREATE TABLE anggota (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    nomor_anggota    VARCHAR(20) NOT NULL,
    nama             VARCHAR(100) NOT NULL,
    kategori_anggota VARCHAR(50),
    kontak           VARCHAR(20),
    alamat           TEXT,
    dihapus          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, nomor_anggota)
);

CREATE TABLE tarif_denda_history (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id              UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    nominal_per_hari       NUMERIC(12,2) NOT NULL DEFAULT 500,
    berlaku_mulai_tanggal  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE status_peminjaman AS ENUM ('aktif', 'dikembalikan', 'hilang');

CREATE TABLE peminjaman (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    anggota_id         UUID NOT NULL REFERENCES anggota(id),
    tanggal_pinjam     DATE NOT NULL DEFAULT CURRENT_DATE,
    jatuh_tempo        DATE NOT NULL,
    tanggal_kembali    DATE,
    status             status_peminjaman NOT NULL DEFAULT 'aktif',
    biaya_penggantian  NUMERIC(12,2),
    dibuat_oleh        UUID REFERENCES app_user(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE peminjaman_detail (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    peminjaman_id  UUID NOT NULL REFERENCES peminjaman(id) ON DELETE CASCADE,
    salinan_id     UUID NOT NULL REFERENCES salinan(id),
    UNIQUE (peminjaman_id, salinan_id)
);

CREATE INDEX idx_buku_tenant ON buku(tenant_id) WHERE dihapus = FALSE;
CREATE INDEX idx_salinan_status ON salinan(status);
CREATE INDEX idx_anggota_tenant ON anggota(tenant_id) WHERE dihapus = FALSE;
CREATE INDEX idx_peminjaman_status ON peminjaman(tenant_id, status);
CREATE INDEX idx_peminjaman_jatuh_tempo ON peminjaman(jatuh_tempo) WHERE status = 'aktif';
```

**Aturan implementasi krusial (Backend wajib patuhi):**
1. `buku_terlambat` = `COUNT(peminjaman) WHERE status='aktif' AND jatuh_tempo < CURRENT_DATE` — hitung ulang tiap query, jangan simpan statis.
2. Denda = `SUM(hari_terlambat_pada_periode_tarif * nominal_per_hari)` merujuk `tarif_denda_history` yang berlaku pada rentang tanggal — **split** jika tarif berubah di tengah periode terlambat.
3. Semua query `buku`/`anggota` **WAJIB** filter `dihapus = FALSE`, kecuali laporan/arsip riwayat.
4. RLS Supabase: isolasi ketat per `tenant_id` — user hanya boleh baca/tulis data tenant tempat dia jadi member (cek lewat `tenant_member`).

---

## 6. Validasi Input (berlaku 2 sisi: Frontend validasi UX, Backend validasi ulang sebagai source of truth)

| Field | Aturan | Pesan Error (teks persis) |
|---|---|---|
| Password | Min 8 karakter, kombinasi huruf+angka | "Password minimal 8 karakter, kombinasi huruf dan angka" |
| Email | Format standar `x@y.z` | "Format email tidak valid" |
| Nama | Min 3, maks 100 karakter | "Nama minimal 3 karakter" |
| ISBN | Opsional; jika diisi harus 10/13 digit | — |
| No. HP / Kontak | Wajib awalan "08", panjang 10–13 digit | "Nomor HP tidak valid (contoh: 08123456789)" |

**Keamanan:** brute-force protection (Backend, Supabase Auth policy) · sesi login 7 hari · database lokal dienkripsi SQLCipher (Frontend, op-sqlite) · Kontak/Alamat anggota **tidak** disamarkan.

---

## 7. Logika Interaksi & State (terutama Frontend, tapi Backend harus support lewat response yang sesuai)

- Loading: <1 detik tanpa indikator · 1–3 detik skeleton · >3 detik/proses berat spinner+teks ("Menyinkronkan data...")
- Error non-kritis: toast/snackbar, bukan modal (kecuali error kritis: gagal login)
- Keputusan penting (hapus, submit transaksi, tandai hilang, keluarkan admin): **selalu dialog konfirmasi**
- Konflik sync offline: **Last Write Wins** berdasar `updated_at`, tanpa UI resolusi manual
- Offline tapi pernah sync sebelumnya → katalog tetap bisa diakses dari cache lokal

---

## 8. Quality Gate / Anti-Slop — WAJIB DIPATUHI SEBELUM LAPOR "SELESAI"

Ini bukan saran, ini syarat kelulusan tiap task. Melaporkan "TASK A SELESAI" / "TASK B SELESAI" tanpa memenuhi ini = task dianggap **belum** selesai, terlepas dari apa pun yang diklaim.

### 8.1 Dokumentasi resmi wajib dicek dulu (KEDUA task, bukan cuma Frontend)
- **Frontend:** Context7 MCP untuk 8 library di TASK B (lihat §TASK B) sebelum menulis integrasi apa pun terhadapnya.
- **Backend:** Context7 MCP atau dokumentasi resmi terbaru untuk: Supabase Edge Functions runtime (`Deno.serve`), `@supabase/supabase-js` v2 API sisi server, Supabase Auth API, RLS policy syntax — sebelum menulis Edge Function/policy apa pun. Syntax ini sering berubah antar versi; jangan andalkan ingatan pelatihan.

### 8.2 Verifikasi wajib — jalankan nyata, tempel hasil aktualnya (bukan klaim/ringkasan)
- **Backend:** `deno check **/*.ts` (atau setara), `deno test`, dan hasil pemanggilan nyata tiap endpoint di Appendix (curl/Postman) — sertakan status code & response body sungguhan.
- **Frontend:** `tsc --noEmit`, `eslint .`, dan hasil test kalau ada. Kalau ada error, **perbaiki dulu** — jangan lapor selesai dengan error dibiarkan.
- Kalau satu perintah gagal dijalankan (mis. env belum lengkap), tulis eksplisit apa yang gagal dan kenapa. Jangan diam-diam di-skip.

### 8.3 Larangan eksplisit
- Dilarang meninggalkan kode placeholder/dummy/mock di luar `mockClient.ts` yang memang untuk itu
- Dilarang membuat fungsi/komponen/tabel yang tidak diminta di §1–7 "sekalian saja" — ide tambahan ditulis sebagai catatan terpisah, jangan langsung diimplementasikan
- Dilarang menyalin boilerplate generik yang nama field/endpoint-nya cuma "mirip" Appendix, harus persis
- Dilarang melonggarkan/menghapus validasi atau RLS policy demi "biar cepat jalan dulu"
- Dilarang menulis kode yang terlihat seperti berfungsi padahal isinya `TODO` / `throw new Error("not implemented")` tanpa menandainya jelas sebagai belum selesai

### 8.4 Checklist self-verifikasi (jawab eksplisit di laporan, bukan cuma centang tanpa detail)
- [ ] Semua nama field/endpoint yang saya buat persis sama dengan Appendix? (sebutkan kalau ada yang beda + alasannya)
- [ ] Typecheck & lint bersih? (tempel output aktualnya)
- [ ] Semua test lulus (kalau ada)? (tempel output aktualnya)
- [ ] Ada bagian yang saya asumsikan karena spec kurang jelas? (sebutkan semua, jangan disembunyikan)
- [ ] Ada kode yang saya tulis tapi belum pernah saya jalankan/test sama sekali? (sebutkan)

---

# TASK A — BACKEND

**Scope:** Supabase project (schema §5, RLS policy, Auth config) + Edge Functions untuk semua business logic kustom di Appendix. **Tidak menyentuh kode UI sama sekali.**

**Langkah:**
1. Jalankan DDL §5 di Supabase SQL Editor
2. Buat RLS policy per tabel: akses dibatasi ketat oleh `tenant_id` via join ke `tenant_member` milik `auth.uid()`; khusus katalog publik (dipakai Mode Pengunjung) buka read-only tanpa auth untuk `buku`/`salinan`/`kategori`/`rak` yang `dihapus = FALSE`
3. Konfigurasi Supabase Auth: email+password, aktifkan rate-limit/lockout (brute-force protection §6)
4. Implementasikan **setiap endpoint di Appendix** sebagai Edge Function — nama, path, request/response **harus match persis**, termasuk teks pesan error
5. Buat scheduled function (cron) harian: cek `tenant_member` dengan `role='owner'` dan `last_active_at` > 23 hari lalu → kirim notifikasi H-7; > 30 hari → jalankan suksesi otomatis ke `penerus_user_id`
6. Tulis unit test untuk kalkulasi denda (kasus: tarif berubah di tengah periode terlambat — wajib ter-split benar)

**Definition of Done:** semua endpoint Appendix bisa dipanggil via Postman/curl dan mengembalikan response sesuai kontrak; RLS teruji (user tenant A tidak bisa baca data tenant B); migrations tersimpan di `supabase/migrations/`; **dan lulus seluruh syarat §8 (Quality Gate/Anti-Slop)**.

---

# TASK B — FRONTEND

**Scope:** Seluruh aplikasi Expo/React Native sesuai §4. **Tidak membuat skema database sendiri; tidak memanggil Supabase langsung untuk logic kustom** (loan creation, denda, laporan, dll) — semua lewat endpoint di Appendix.

**WAJIB — gunakan Context7 MCP sebelum menulis kode yang memakai library berikut**, karena API-nya sering berubah antar-versi dan pengetahuan bawaan bisa usang: `expo-router`, `expo-camera`, `expo-print`, `expo-notifications`, `op-sqlite`, `react-native-paper`, `victory-native`, `@supabase/supabase-js`. Query Context7 untuk versi terbaru tiap library sebelum mengimplementasikan integrasinya — jangan andalkan ingatan pelatihan untuk syntax API-nya.

**Langkah:**
1. Setup project Expo Router + folder struktur sesuai daftar rute §4 (satu file per halaman)
2. Buat `lib/theme.ts` sesuai **Design Direction §2.1** dan pasang lewat `PaperProvider` — kerjakan ini sebelum membangun halaman, supaya semua layar konsisten sejak awal
3. Buat `lib/types.ts` — definisikan TypeScript interface persis sesuai Appendix (field name, tipe, nullable) — ini kontrak yang tidak berubah
4. Buat `lib/api/mockClient.ts` — implementasi mock dari semua endpoint Appendix (return data dummy sesuai shape kontrak) — dipakai selama Backend belum tersedia/terintegrasi, supaya Frontend bisa dikembangkan & ditest independen
5. Bangun tiap halaman §4 dengan label, field, dan pesan error **persis seperti tertulis** — jangan parafrase teks UI — dan ikuti Design Direction §2.1 di setiap komponen (jangan style ad-hoc yang menyimpang dari theme)
6. Implementasikan `op-sqlite` sebagai local-first store: semua tulis lokal dulu (tandai `pending_sync`), lalu sync ke backend nyata saat online (placeholder pemanggilan endpoint Appendix)
7. Validasi input sisi klien sesuai §6 (server tetap validasi ulang, klien untuk UX cepat saja)

**Definition of Done:** seluruh layar §4 bisa dinavigasi end-to-end memakai `mockClient`, tanpa backend nyata; semua teks label/error sesuai spesifikasi; `lib/types.ts` cocok 100% dengan Appendix; seluruh layar konsisten dengan Design Direction §2.1 (bukan campuran gaya); **dan lulus seluruh syarat §8 (Quality Gate/Anti-Slop)**.

---

# TASK C — INTEGRASI (mulai setelah A & B sama-sama "Selesai")

1. Ganti `lib/api/mockClient.ts` dengan implementasi nyata yang memanggil Edge Functions Backend (URL, header auth Supabase)
2. Uji tiap alur end-to-end: Gerbang → Login → Buat/Gabung Perpustakaan → Dashboard → tiap 5 tab → Pengaturan → Mode Pengunjung
3. Uji kasus offline: matikan network, pastikan op-sqlite tetap berfungsi, nyalakan lagi, pastikan sync jalan dan konflik ter-resolve Last Write Wins
4. Uji RLS: pastikan user tenant A tidak bisa lihat data tenant B dari sisi klien
5. Uji suksesi Owner otomatis (percepat waktu di environment staging)

---

## Appendix — Kontrak API (SUMBER KEBENARAN TUNGGAL, jangan diubah sepihak)

```json
{
  "base_url": "https://<project>.supabase.co/functions/v1",
  "endpoints": [
    {
      "path": "/auth/self-register", "method": "POST",
      "request": { "email": "string", "password": "string" },
      "response_sukses": { "user_id": "uuid", "message": "Akun berhasil dibuat" },
      "response_gagal": [
        { "code": 400, "message": "Format email tidak valid" },
        { "code": 400, "message": "Password minimal 8 karakter, kombinasi huruf dan angka" },
        { "code": 409, "message": "Email sudah terdaftar" }
      ]
    },
    {
      "path": "/tenant/create", "method": "POST",
      "request": { "nama": "string", "alamat": "string" },
      "response_sukses": { "tenant_id": "uuid", "qr_code_value": "string" }
    },
    {
      "path": "/tenant/invitations", "method": "GET",
      "response_sukses": [{ "tenant_id": "uuid", "nama_tenant": "string", "role_ditawarkan": "staff|admin" }]
    },
    {
      "path": "/tenant/{tenant_id}/member/invite", "method": "POST",
      "request": { "email": "string", "role": "staff|admin" },
      "response_sukses": { "status": "ditambahkan_langsung|undangan_terkirim" }
    },
    {
      "path": "/tenant/{tenant_id}/member/{member_id}/promote", "method": "PATCH",
      "request": { "role": "staff|admin" }
    },
    {
      "path": "/tenant/{tenant_id}/owner/designate-successor", "method": "POST",
      "request": { "penerus_user_id": "uuid" }
    },
    {
      "path": "/buku/lookup-isbn/{isbn}", "method": "GET",
      "response_sukses": { "judul": "string", "penulis": "string", "penerbit": "string", "tahun_terbit": "number", "cover_url": "string|null" },
      "response_gagal": [{ "code": 404, "message": "ISBN tidak ditemukan, isi manual atau pakai kode lokal" }]
    },
    {
      "path": "/buku/{buku_id}/salinan/generate", "method": "POST",
      "request": { "jumlah_eksemplar": "number" },
      "response_sukses": { "salinan": [{ "id": "uuid", "kode_eksemplar": "string" }] }
    },
    {
      "path": "/peminjaman", "method": "POST",
      "request": { "anggota_id": "uuid", "salinan_ids": ["uuid"], "jatuh_tempo": "date" },
      "response_gagal": [
        { "code": 400, "message": "Melebihi batas maksimal peminjaman" },
        { "code": 400, "message": "Salinan tidak tersedia" }
      ]
    },
    { "path": "/peminjaman/{id}/kembalikan", "method": "PATCH" },
    {
      "path": "/peminjaman/{id}/tandai-hilang", "method": "PATCH",
      "request": { "biaya_penggantian": "number" }
    },
    {
      "path": "/tenant/{tenant_id}/pengaturan/tarif-denda", "method": "POST",
      "request": { "nominal_per_hari": "number" }
    },
    {
      "path": "/dashboard/{tenant_id}/summary", "method": "GET",
      "response_sukses": {
        "jumlah_buku": "number", "peminjam_aktif": "number", "buku_dipinjam": "number",
        "buku_terlambat": "number",
        "chart_tren": "{buku|peminjam|denda}: [{tanggal, nilai}]",
        "total_denda_periode": "number"
      }
    },
    {
      "path": "/laporan/{tenant_id}/export", "method": "GET",
      "query_params": { "jenis": "peminjaman|denda|buku", "dari_tanggal": "date", "sampai_tanggal": "date" },
      "response_sukses": { "file_url": "string (PDF)" }
    }
  ]
}
```

### TypeScript types (Frontend `lib/types.ts` HARUS identik dengan ini)

```typescript
export type MemberRole = 'owner' | 'admin' | 'staff';
export type StatusSalinan = 'tersedia' | 'dipinjam' | 'hilang';
export type StatusPeminjaman = 'aktif' | 'dikembalikan' | 'hilang';

export interface Buku {
  id: string; tenantId: string; isbn: string | null; kodeLokal: string | null;
  judul: string; penulis: string | null; penerbit: string | null; tahunTerbit: number | null;
  kategoriId: string | null; rakId: string | null; sinopsis: string | null;
  bahasa: string | null; jumlahHalaman: number | null; coverUrl: string | null;
  dihapus: boolean;
}

export interface Salinan {
  id: string; bukuId: string; nomorUrut: number; kodeEksemplar: string; status: StatusSalinan;
}

export interface Anggota {
  id: string; tenantId: string; nomorAnggota: string; nama: string;
  kategoriAnggota: string | null; kontak: string | null; alamat: string | null; dihapus: boolean;
}

export interface Peminjaman {
  id: string; tenantId: string; anggotaId: string; tanggalPinjam: string; jatuhTempo: string;
  tanggalKembali: string | null; status: StatusPeminjaman; biayaPenggantian: number | null;
}

export interface DashboardSummary {
  jumlahBuku: number; peminjamAktif: number; bukuDipinjam: number; bukuTerlambat: number;
  totalDendaPeriode: number;
}
```

---

## Larangan / Jangan Diasumsikan Beda (berlaku kedua task)

- Web version: **di luar scope**
- Tidak ada fitur Ekspor/Impor manual maupun Backup/Restore manual
- Tidak ada upload gambar cover manual — hanya URL dari API ISBN
- Kategori & Rak: combobox searchable, auto-create entry baru, no duplicate
- Kode eksemplar reset nomor urut per buku, digabung ISBN/kode lokal untuk keunikan global
- Owner ≠ role terpisah secara permission — otoritasnya = Admin, bedanya hanya kekebalan dari dikeluarkan Admin lain
- Nomor Anggota SELALU auto-generate sistem, tidak pernah diketik manual admin
- Kontrak Appendix tidak boleh diubah sepihak oleh Frontend maupun Backend — perubahan harus disepakati ulang sebelum TASK C
- UI tidak boleh menyimpang dari Design Direction §2.1 (mis. menambah gradient, shadow berat, ilustrasi 3D/ramai) tanpa persetujuan eksplisit
