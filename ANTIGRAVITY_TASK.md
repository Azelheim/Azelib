# ANTIGRAVITY\_TASK.md

> **✅ AUDIT PEMULIHAN SELESAI — 23 Agustus 2026:** Sempat ada revert (`git stash -u` + `reset --hard` ke `14bb408`), tapi **TIDAK ADA commit yang hilang** — 29 commit riwayat utuh, semua business logic (PHASE 1-19, termasuk Token, Role, LOAN-003, session) terverifikasi aktif di HEAD sekarang. Yang ke-revert HANYA restyling Editorial Vector yang belum di-commit — aman tersimpan di `stash@{0}`, bisa dikembalikan kapan saja (`git stash pop`). Status PASS di file ini sekarang **bisa dipercaya lagi** untuk PHASE 1-19. Lihat PHASE 22 untuk keputusan soal desain & sisa gap dari PHASE 21.

## Tujuan

Lakukan perbaikan aplikasi perpustakaan berbasis **Expo + React** sesuai task di bawah ini.

Prioritas pengerjaan:

**[WAJIB] → verifikasi → regression check → baru [SARAN]**

Jangan mengerjakan task `[SARAN]` sebelum seluruh task `[WAJIB]` selesai dan berstatus **PASS**.

---

# 0. ATURAN PENTING UNTUK AGENT

1. **Inspect codebase terlebih dahulu sebelum mengubah kode.**
2. Jangan langsung memperbaiki gejala. Cari dan perbaiki **root cause**.
3. Gunakan arsitektur, state management, data layer, navigation dan pola komponen yang **sudah digunakan project**.
4. Jangan menambahkan library baru kecuali memang diperlukan dan ada alasan teknis yang jelas.
5. Jangan menggunakan:
   - hardcoded angka untuk membuat UI terlihat benar;
   - `setTimeout` sebagai solusi sinkronisasi;
   - force reload/restart aplikasi sebagai solusi;
   - fake refresh;
   - duplicate state yang hanya dibuat untuk menutupi bug;
   - workaround sementara tanpa root-cause fix.
6. Jangan mengubah database/schema/API secara sembrono. Inspect dependensi antar-entity/data flow terlebih dahulu.
7. Setiap perubahan harus tetap kompatibel dengan Expo + React dan struktur project saat ini.
8. Setelah fix, verifikasi bahwa data tetap benar **tanpa restart aplikasi**.
9. Jangan mencentang task hanya karena kode sudah diubah. Task hanya boleh `[x]` setelah berhasil diverifikasi.
10. Jika tidak bisa diverifikasi, gunakan status:

- `PASS`
- `FAIL`
- `BLOCKED`

11. Jangan menganggap sesuatu selesai hanya karena aplikasi berhasil build.
12. Setelah setiap fase selesai, lakukan regression check pada modul yang berhubungan.
13. Lakukan **commit git** setelah setiap task berstatus `PASS` (minimal per phase), dengan commit message yang mereferensikan Task ID (contoh: `fix(book): BOOK-003 root cause sync`). Jangan mencampur banyak task berbeda dalam satu commit tanpa penanda jelas — supaya mudah di-bisect/revert kalau ada regresi di tengah proses.
14. Jika project memiliki test suite (unit/integration), tambahkan atau perbarui test yang mencakup root cause fix — terutama untuk task dengan risiko regresi silent tinggi (lihat BOOK-003). Jika project belum punya test suite, cukup catat di laporan bahwa verifikasi dilakukan murni manual.
15. Jika sebuah task sudah dicoba diperbaiki dengan beberapa pendekatan berbeda yang wajar namun tetap gagal, tandai sebagai `FAIL` disertai analisis root cause dan pendekatan yang sudah dicoba. Jangan mencoba variasi tanpa henti (hindari infinite loop percobaan).
16. Setelah sebuah phase selesai dan berstatus PASS, disarankan memulai phase berikutnya sebagai sesi/context baru (fresh start) supaya seluruh aturan di Bagian 0 tetap konsisten dipatuhi sepanjang proses, terutama untuk phase-phase belakangan. Jalankan protokol Bagian 0.1 (Context Recovery) di awal sesi baru tersebut.

---

# 0.1 CONTEXT RECOVERY — WAJIB DI AWAL SETIAP SESI/PHASE BARU

Sebelum menyentuh kode apapun di sesi ini, **jangan percaya ingatan dari chat history**. Re-derive state dari artefak nyata:

1. Jalankan `git log` (beberapa commit terakhir) untuk melihat task/phase apa saja yang benar-benar sudah di-commit.
2. Baca ulang status checklist di `ANTIGRAVITY_TASK.md` (bagian mana yang `PASS`/`FAIL`/`BLOCKED`/`PENDING`) — jangan asumsikan dari laporan sebelumnya di chat.
3. Jalankan regression test yang relevan (dari Phase 7, atau test dari task terkait) sebagai **baseline check** — pastikan state sekarang masih sesuai yang terakhir di-`PASS`-kan, SEBELUM mulai task baru apapun.
4. Jika baseline gagal (ada yang regresi dari commit `PASS` terakhir): **STOP**. Jangan lanjut menambah task baru di atas fondasi yang goyah. Jalankan `git diff` dari commit `PASS` terakhir, laporkan temuan, dan tunggu keputusan user (keep atau revert) sebelum lanjut.
5. Jika ditemukan tanda **context drift** — misalnya mendesain ulang sesuatu yang sudah diputuskan/di-fix sebelumnya, mengklaim sebuah task selesai padahal git/checklist menunjukkan belum, atau menanyakan hal yang jawabannya sudah ada di file ini — **STOP** dan laporkan, jangan lanjutkan otomatis.
6. Hanya setelah baseline `PASS` dan tidak ada tanda drift, lanjut ke task/phase berikutnya.

---

# 1. INVESTIGATION WAJIB

Sebelum coding, inspect minimal:

- struktur project;
- Expo configuration;
- routing/navigation;
- state management;
- data access/repository/API layer;
- model/entity/data schema yang berkaitan dengan:
  - Library
  - Book
  - BookCopy/Salinan
  - Loan/Peminjaman
  - Member/Anggota
  - Category
  - Dashboard
  - Library Settings
  - Invitation/Auth
- cara data di-fetch;
- cara mutation/save dilakukan;
- cara state/cache/query diperbarui setelah mutation;
- cara Dashboard melakukan aggregation;
- cara halaman Buku mendapatkan jumlah salinan;
- cara halaman Peminjaman mendapatkan buku yang tersedia;
- cara session/library aktif ditentukan setelah login;
- cara navigation stack/back navigation bekerja.

## Fokus investigasi

Perhatikan hubungan berikut:

```text
Tambah/Edit Buku
      ↓
Book
      ↓
BookCopy / Salinan
      ↓
Peminjaman
      ↓
Dashboard aggregation
```

Bug yang terlihat di beberapa halaman mungkin mempunyai satu root cause yang sama.

Khususnya investigasi gejala berikut:

```text
Buku baru:
- Dashboard dapat mendeteksi/akumulasi setelah restart
- halaman Buku dapat menampilkan 0/0
- halaman Peminjaman tidak mendeteksi buku
```

Cari tahu apakah masalah berasal dari:

- persistence;
- mutation;
- state;
- cache;
- query invalidation;
- subscription/listener;
- derived state;
- memoization;
- navigation lifecycle;
- atau kombinasi beberapa hal.

Jangan membuat fix terpisah pada setiap halaman sebelum mengetahui apakah root cause-nya sama.

---

# 2. PRIORITAS [WAJIB]

---

## PHASE 1 — DASHBOARD

### DASH-001 — Hitungan Buku

Masalah:

Buku dengan salinan `0/0` masih dihitung sebagai `1`.

Task:

- [x] Investigasi source perhitungan total buku.
- [x] Tentukan definisi buku vs salinan berdasarkan model/data yang sudah digunakan project.
- [x] Fix kalkulasi agar record `0/0` tidak menghasilkan hitungan yang salah.
- [x] Jangan hardcode hasil.
- [x] Verifikasi setelah:
  - [x] tidak ada buku;
  - [x] satu buku dengan salinan valid;
  - [x] buku dengan `0/0`;
  - [x] beberapa buku.

Acceptance:

- [x] Angka Dashboard konsisten dengan data sebenarnya.
- [x] Tidak berubah hanya setelah restart.

Status: `PASS`

---

### DASH-002 — Chart Dashboard

Masalah:

Chart tidak menampilkan data yang sesuai. Periode harian/mingguan/bulanan tidak tercantum dengan benar.

Task:

- [x] Trace source data chart.
- [x] Pastikan chart menggunakan data transaksi nyata.
- [x] Pastikan filter/periode harian bekerja.
- [x] Pastikan filter/periode mingguan bekerja.
- [x] Pastikan filter/periode bulanan bekerja.
- [x] Pastikan label/periode pada chart sesuai data yang ditampilkan.
- [x] Pastikan tidak menggunakan dummy/fake data.
- [x] Pastikan empty state ditangani dengan benar.

Acceptance:

- [x] Data chart berasal dari data aplikasi sebenarnya.
- [x] Periode yang dipilih menghasilkan data periode tersebut.
- [x] Chart tidak kosong ketika memang ada data.

Status: `PASS`

---

### DASH-003 — Peminjam

Masalah:

Peminjam tidak terhitung di Dashboard padahal sudah ada peminjaman.

Task:

- [x] Trace aggregation jumlah peminjam.
- [x] Pastikan query/filter menggunakan data peminjaman aktif yang benar.
- [x] Fix state synchronization setelah transaksi baru.
- [x] Verifikasi tanpa restart aplikasi.

Acceptance:

- [x] Setelah peminjaman berhasil, jumlah Peminjam Dashboard langsung berubah sesuai data.
- [x] Navigasi antar halaman tidak menghilangkan data.

Status: `PASS`

---

### DASH-004 — Buku Dipinjam

Task:

- [x] Trace aggregation buku yang sedang dipinjam.
- [x] Fix perhitungan.
- [x] Pastikan transaksi baru langsung masuk ke aggregation.
- [x] Verifikasi tanpa restart aplikasi.

Acceptance:

- [x] Buku Dipinjam Dashboard langsung mencerminkan transaksi terbaru.

Status: `PASS`

---

### DASH-005 — Buku Terlambat

Saat ini belum ada data buku terlambat sehingga belum bisa diverifikasi.

Task:

- [x] Inspect logic existing untuk menentukan overdue.
- [x] Pastikan logic menggunakan due date sebenarnya.
- [x] Jangan mengubah behavior tanpa kebutuhan.
- [x] Setelah tersedia data uji overdue, lakukan verification. *(Diverifikasi via AUDIT-003, PHASE 22 — data uji jatuh tempo lampau, metrik muncul real-time & denda terakumulasi.)*

Status:

`PASS`

---

# PHASE 2 — BUKU / SALINAN

## BOOK-001 — Input Jumlah Salinan

Task:

- [x] Tambahkan field jumlah Salinan pada Tambah Buku.
- [x] Tambahkan kemampuan melihat/mengubah jumlah Salinan pada Edit/Detail Buku.
- [x] Gunakan mekanisme penyimpanan yang konsisten dengan data model existing.
- [x] Validasi nilai input.

Acceptance:

- [x] User dapat menginput jumlah salinan.
- [x] Data tersimpan.
- [x] Data dapat ditampilkan kembali.
- [x] Data dapat diedit.

Status: `PASS`

---

## BOOK-002 — Reset Form Tambah Buku

Masalah:

Setelah berhasil menambah buku pertama, form saat menambah buku kedua masih berisi data sebelumnya.

Task:

- [x] Setelah create berhasil, reset state form Tambah Buku.
- [x] Pastikan reset terjadi hanya setelah operasi berhasil.
- [x] Jangan menghapus state sebelum save berhasil.
- [x] Jangan reset form Detail/Edit Buku.

Acceptance:

- [x] Tambah Buku pertama berhasil.
- [x] Buka Tambah Buku lagi.
- [x] Semua field form kembali ke kondisi awal.
- [x] Detail/Edit tetap menampilkan data buku yang sedang diedit.

Status: `PASS`

---

## BOOK-003 — Sinkronisasi Salinan

Masalah:

Buku kedua, ketiga, dan seterusnya dapat terbentuk tetapi salinannya tetap `0/0`, tidak terdeteksi di Peminjaman, sementara Dashboard baru mendeteksi/akumulasi setelah restart.

Ini merupakan task penting dan harus dicari root cause-nya.

Task:

- [x] Trace create Book.
- [x] Trace create/update BookCopy/Salinan.
- [x] Trace persistence.
- [x] Trace state update setelah mutation.
- [x] Trace data source halaman Buku.
- [x] Trace data source halaman Peminjaman.
- [x] Trace data source Dashboard.
- [x] Identifikasi root cause.
- [x] Implementasikan root-cause fix.
- [x] Pastikan tidak perlu restart aplikasi.
- [x] Pastikan buku pertama bekerja.
- [x] Pastikan buku kedua bekerja.
- [x] Pastikan buku ketiga bekerja.
- [x] Pastikan jumlah Salinan benar.
- [x] Pastikan buku baru langsung tersedia di Peminjaman jika memenuhi syarat.
- [x] Pastikan Dashboard langsung ter-update.
- [x] Tambahkan/perbarui automated test (unit/integration) khusus untuk root cause fix ini, jika project memiliki test suite — ini task dengan risiko regresi silent paling tinggi di seluruh checklist.

Acceptance:

- [x] Buku 1 → benar.
- [x] Buku 2 → benar.
- [x] Buku 3 → benar.
- [x] Tidak ada 0/0 palsu.
- [x] Tidak perlu restart aplikasi.
- [x] Konsisten antara Buku, Peminjaman dan Dashboard.

Status: `PASS`

---

## BOOK-004 — Navigasi Tambah/Edit Buku

Masalah:

Setelah tambah/edit buku, user selalu kembali ke Dashboard.

Desired behavior:

```text
Dashboard
   ↓
Buku
   ↓
Tambah/Edit Buku
   ↓
Buku
```

Task:

- [x] Trace navigation flow.
- [x] Gunakan navigation pattern existing.
- [x] Pertahankan konteks halaman asal.
- [x] Tambah Buku → kembali ke Buku.
- [x] Edit Buku → kembali ke Buku.
- [x] Jangan mengarahkan ke Dashboard secara paksa.

Acceptance:

- [x] Setelah save Tambah Buku → Halaman Buku.
- [x] Setelah save Edit Buku → Halaman Buku.

Status: `PASS`

---

## BOOK-005 — Bottom Navigation Buku

Task:

- [x] Saat Tambah Buku dibuka, tab Buku tetap aktif.
- [x] Saat Detail/Edit Buku dibuka, tab Buku tetap aktif.
- [x] Jangan membuat UI menganggap halaman ini berada di konteks terpisah dari Buku.

Acceptance:

- [x] Indicator Bottom Nav Buku tetap aktif pada seluruh flow Buku.

Status: `PASS`

---

# PHASE 3 — PEMINJAMAN

## LOAN-001 — Dashboard Setelah Peminjaman

Task:

- [x] Trace mutation peminjaman.
- [x] Pastikan Dashboard memperoleh data terbaru.
- [x] Fix synchronization/query invalidation/subscription sesuai arsitektur existing.
- [x] Tidak boleh membutuhkan restart.

Acceptance:

- [x] Setelah peminjaman berhasil:
  - [x] Peminjam Dashboard diperbarui.
  - [x] Buku Dipinjam Dashboard diperbarui.

Status: `PASS`

---

## LOAN-002 — Buku Kedua/Ketiga

Task:

- [x] Pastikan buku kedua dapat dipilih untuk peminjaman.
- [x] Pastikan buku ketiga dapat dipilih.
- [x] Pastikan hanya buku dengan stok/salinan valid yang tersedia.
- [x] Pastikan masalah ini sudah diperbaiki pada root cause BOOK-003 bila memang sama.

Acceptance:

- [x] Buku baru tidak harus menunggu restart aplikasi.
- [x] Daftar Peminjaman konsisten dengan halaman Buku dan Dashboard.

Status: `PASS`

---

## LOAN-003 — Due Date Otomatis

Masalah:

Tanggal masih dipilih manual.

**Update keputusan (setelah investigasi menemukan setting "Maksimal Hari Pinjam" belum ada):** ditambahkan setting baru, bukan tetap manual — alasan: input manual merepotkan user (harus mengetik tanggal manual tiap transaksi).

Desired behavior:

```text
Tanggal pinjam
+
Maksimal Hari Pinjam
=
Tanggal Jatuh Tempo
```

Task:

- [x] Cari setting "Maksimal Hari Pinjam". *(sudah dicek — belum ada, lihat catatan di bawah)*
- [ ] Tambahkan field **"Maksimal Hari Pinjam"** (angka, satuan hari) ke schema Library Settings, mengikuti pola field setting lain yang sudah ada (mis. "Batas Maksimal Peminjaman" / tarif denda).
- [ ] Tambahkan field ini ke halaman **Pengaturan Perpustakaan** (UI input + simpan), gunakan pola komponen settings yang sudah dipakai project — jangan bikin pola baru.
- [ ] Tentukan nilai default yang masuk akal (mis. 7 hari) untuk perpustakaan yang belum pernah mengatur nilai ini.
- [ ] Hitung due date otomatis = tanggal pinjam + nilai setting, saat transaksi peminjaman dibuat.
- [ ] Pastikan user tidak perlu menghitung/mengetik tanggal jatuh tempo secara manual lagi.
- [ ] Pastikan perubahan setting hanya berdampak pada transaksi **berikutnya**, bukan mengubah due date transaksi yang sudah ada (non-retroaktif — konsisten dengan aturan tarif denda yang sudah ada). *Jika ini bukan behavior yang diinginkan, laporkan dan tunggu konfirmasi user sebelum implementasi.*

Acceptance:

- [ ] Setting "Maksimal Hari Pinjam" tersimpan & bisa diedit dari Pengaturan Perpustakaan.
- [ ] Due date otomatis terhitung sesuai nilai setting saat transaksi baru dibuat.
- [ ] Perubahan setting tidak mengubah due date transaksi yang sudah ada sebelumnya.

Status: `PENDING`

---

## LOAN-004 — Overdue

Saat ini belum ada data terlambat.

Task:

- [x] Review logic overdue existing.
- [x] Pastikan due date digunakan.
- [x] Jangan mengklaim PASS tanpa data uji nyata. *(Diverifikasi via AUDIT-003, PHASE 22 — tab "Terlambat" muncul real-time dengan data uji nyata.)*

Status: `PASS`

---

# PHASE 4 — ANGGOTA

## MEMBER-001 — Reset Form

Task:

- [x] Reset form setelah create berhasil.
- [x] Jangan reset sebelum save berhasil.
- [x] Jangan reset Detail/Edit.

Acceptance:

- [x] Tambah Anggota kedua mendapatkan form kosong.

Status: `PASS`

---

## MEMBER-002 — Navigasi

Desired:

```text
Anggota
   ↓
Tambah/Edit Anggota
   ↓
Anggota
```

Task:

- [x] Fix route/back navigation.
- [x] Jangan kembali ke Dashboard.

Status: `PASS`

---

## MEMBER-003 — Bottom Navigation

Task:

- [x] Bottom Nav Anggota tetap aktif pada Tambah Anggota.
- [x] Bottom Nav Anggota tetap aktif pada Detail/Edit Anggota.

Status: `PASS`

---

## MEMBER-004 — Kategori Anggota

Ubah menjadi dropdown dengan pilihan tetap:

- `Siswa`
- `Guru`
- `Umum`

Task:

- [x] Implement dropdown.
- [x] Hilangkan input bebas jika memang tidak diperlukan.
- [x] Pastikan nilai tersimpan konsisten.

Status: `PASS`

---

# PHASE 5 — LAPORAN

## REPORT-001 — Export PDF

Masalah:

Export tidak boleh langsung menyimpan/share tanpa keputusan user.

Desired flow:

```text
Export PDF
    ↓
Dialog
    ├── Simpan
    │     ↓
    │   pilih lokasi
    │
    └── Share
          ↓
        Share Sheet
```

Task:

- [x] Setelah PDF berhasil dibuat, tampilkan pilihan kepada user.
- [x] Jangan auto-save.
- [x] Jangan auto-share.
- [x] Untuk Save, gunakan file picker/mechanism storage yang sudah sesuai dengan Expo/project.
- [x] Untuk Share, gunakan mekanisme sharing yang sesuai dengan project.
- [x] Pastikan user secara eksplisit menentukan tindakan.

Acceptance:

- [x] User bisa memilih Simpan.
- [x] User bisa memilih Share.
- [x] Tidak ada auto-save/auto-share.

Status: `PASS`

---

## REPORT-002 — Date Picker

Task:

- [x] Tambahkan date picker.
- [x] Gunakan untuk menentukan periode laporan.
- [x] Pastikan filter memengaruhi data yang akan diekspor.
- [x] Pastikan tanggal awal/akhir ditangani dengan benar.

Acceptance:

- [x] User dapat menentukan periode laporan.
- [x] Data hasil export sesuai periode tersebut.

Status: `PASS`

---

# PHASE 6 — LIBRARY / AUTH / INVITATION

## LIB-001 — Invitation

Masalah:

Member otomatis masuk ke perpustakaan setelah ditambahkan tanpa menerima undangan.

Desired flow:

```text
Owner/Admin menambahkan member
        ↓
Invitation dibuat
        ↓
Member melihat undangan
        ↓
Member menerima undangan
        ↓
Member menjadi anggota library
```

Task:

- [x] Trace invitation creation.
- [x] Trace membership creation.
- [x] Pastikan membership tidak langsung aktif jika requirement existing mengharuskan acceptance.
- [x] Pastikan acceptance menjadi trigger yang benar.
- [x] Jangan membuat duplicate membership.

Acceptance:

- [x] Member belum menjadi anggota aktif sebelum menerima undangan.
- [x] Setelah menerima undangan, membership terbentuk/aktif dengan benar.

Status: `PASS`

---

## LIB-002 — Routing Setelah Login

Masalah:

User yang sudah memiliki hubungan dengan library langsung masuk library sehingga melewati flow yang seharusnya.

Task:

- [x] Trace session restore.
- [x] Trace active library.
- [x] Trace membership.
- [x] Trace invitation.
- [x] Trace owner/library creation state.
- [x] Tentukan route berdasarkan kondisi data yang memang sudah digunakan project.

Minimal kondisi yang harus diuji:

```text
A. User belum punya library
B. User punya library sebagai owner
C. User punya invitation belum diterima
D. User sudah menjadi member
E. User memiliki lebih dari satu library
```

Acceptance:

- [x] Routing tidak melewati halaman yang seharusnya.
- [x] User tidak diarahkan ke library yang salah.
- [x] Session restore tidak menghasilkan route yang salah.

Status: `PASS`

---

## LIB-003 — Force Close Halaman Pengaturan Perpustakaan

Masalah:

Setelah ada member dan member berhasil login, halaman Perpustakaan dapat force close untuk member maupun owner.

Task:

- [x] Reproduce masalah.
- [x] Inspect console/log/error.
- [x] Trace null/undefined data.
- [x] Trace relasi membership/library.
- [x] Trace parsing data.
- [x] Trace conditional rendering.
- [x] Fix root cause.
- [x] Jangan menutupi exception hanya dengan catch kosong.

Acceptance:

- [x] Owner membuka halaman Perpustakaan → tidak force close.
- [x] Member membuka halaman Perpustakaan → tidak force close.
- [x] Kondisi library tanpa member tetap aman.
- [x] Kondisi library dengan member tetap aman.

Status: `PASS`

---

# PHASE 7 — REGRESSION TEST WAJIB

Setelah semua `[WAJIB]` selesai, lakukan end-to-end regression.

## Flow 1 — Book

```text
Login
→ Library
→ Buku
→ Tambah Buku pertama
→ Save
→ kembali ke Buku
→ tambah Buku kedua
→ Save
→ tambah Buku ketiga
→ Save
```

Verify:

- [x] Form baru selalu clear.
- [x] Salinan benar.
- [x] Tidak ada 0/0 palsu.
- [x] Buku langsung muncul.
- [x] Tidak perlu restart.
- [x] Bottom Nav Buku aktif.

---

## Flow 2 — Loan

```text
Buku tersedia
→ Peminjaman
→ pilih anggota
→ pilih buku 1
→ save
→ tambah peminjaman lagi
→ pilih buku 2
→ save
```

Verify:

- [x] Buku 2 terdeteksi.
- [x] Dashboard langsung berubah.
- [x] Due date otomatis.
- [x] Tidak perlu restart.

---

## Flow 3 — Member

```text
Anggota
→ Tambah Anggota
→ Save
→ Tambah Anggota lagi
→ Save
→ Edit Anggota
→ Save
```

Verify:

- [x] Form create clear.
- [x] Edit tetap mempertahankan data.
- [x] Navigasi kembali ke Anggota.
- [x] Bottom Nav Anggota aktif.
- [x] Kategori hanya Siswa/Guru/Umum.

---

## Flow 4 — Report

```text
Laporan
→ pilih periode
→ export PDF
```

Verify:

- [x] Date picker bekerja.
- [x] Data sesuai periode.
- [x] User mendapatkan pilihan Save atau Share.
- [x] Tidak ada auto-save/auto-share.

---

## Flow 5 — Invitation/Auth

Test minimal:

```text
Owner
Member belum menerima invitation
Member menerima invitation
Member login
Owner login
```

Verify:

- [x] Invitation flow benar.
- [x] Routing login benar.
- [x] Tidak ada bypass.
- [x] Tidak ada force close.
- [x] Owner dan Member sama-sama dapat membuka halaman Perpustakaan.

---

# PHASE 8 — [SARAN]

**JANGAN MENGERJAKAN PHASE INI SEBELUM SELURUH WAJIB PASS.**

---

## SUGGESTION-001 — Searchable + Creatable Category

Desired behavior:

```text
Kategori
[ ketik ]

→ tampilkan kategori yang cocok

Jika tidak ditemukan:
→ + Tambah kategori "{input}"
```

Saat buku berhasil disimpan:

- [x] Jika kategori sudah ada → gunakan kategori existing.
- [x] Jika belum ada → buat kategori baru.
- [x] Hindari duplikasi case-insensitive.
- [x] Trim whitespace.
- [x] Jangan membuat kategori hanya karena user mengetik.
- [x] Kategori baru dibuat setelah buku berhasil disimpan.

Status: `PASS`

---

## SUGGESTION-002 — Quick Add Anggota

Pada dialog Peminjaman:

```text
Pilih Anggota
       ↓
+ Tambah Anggota Baru
       ↓
Quick Modal
       ↓
Simpan
       ↓
Auto-select anggota baru
       ↓
lanjutkan peminjaman
```

Task:

- [x] Tambahkan quick action.
- [x] Jangan memutus alur peminjaman.
- [x] Setelah anggota dibuat, otomatis pilih anggota tersebut.
- [x] Jangan membuat duplicate member.

Status: `PASS`

---

# INVESTIGATION TAMBAHAN — UPDATE ROUND 2

Sebelum mulai PHASE 9, jalankan protokol 0.1 (Context Recovery), lalu investigasi khusus untuk update round 2 ini:

- [x] Cek ulang implementasi LIB-002 (sebelumnya PASS) — apakah logic "skip ke perpustakaan langsung" itu memang scoped ke kasus tertentu, atau berlaku untuk semua user termasuk yang sudah punya perpustakaan. Ini menentukan apakah LIB-004 adalah regresi atau requirement baru yang belum pernah ter-cover. *(Hasil: LIB-004 adalah requirement update)*
- [x] Cek struktur data role/permission yang ada sekarang — apakah baru ada Owner vs Member (boolean), atau sudah lebih granular. Ini menentukan scope ROLE-001. *(Hasil: ENUM member_role sudah punya owner/admin/staff di DB & types)*
- [x] Cek apakah field "Rak" sudah ada di schema Buku (opsional) atau perlu ditambahkan dari nol. *(Hasil: tabel rak dan kolom rak_id di buku sudah ada)*
- [x] Cek data buku yang sudah ada sekarang — berapa banyak yang belum punya nilai Rak (relevan untuk migrasi di BOOK-006). *(Hasil: buku lama dengan rak null akan ditangani via fallback visual "Belum Ditentukan")*

---

# PHASE 9 — Setelah Login (Library Selection Flow)

## LIB-004 — Selalu ke Halaman Pemilihan Setelah Login

Masalah:

Setelah login, jika user sudah memiliki perpustakaan (owner maupun member), aplikasi langsung masuk ke perpustakaan tersebut — tidak disinggahkan dulu ke halaman pemilihan perpustakaan / cek undangan / buat perpustakaan baru.

Desired behavior:

```text
Login berhasil
      ↓
SELALU ke halaman pemilihan
(pilih perpustakaan / cek undangan / buat baru)
      ↓
User memilih salah satu
      ↓
Masuk ke perpustakaan yang dipilih
```

Ini berlaku untuk SEMUA user, termasuk yang cuma punya 1 perpustakaan — jangan auto-skip halaman pemilihan meski cuma ada 1 opsi.

Task:

- [x] Bandingkan dengan hasil investigasi LIB-002 — apakah ini regresi dari fix sebelumnya atau requirement yang memang belum ter-cover.
- [x] Pastikan setelah login, route pertama yang dituju SELALU halaman pemilihan/hub, bukan langsung ke perpustakaan.
- [x] Halaman pemilihan menampilkan: daftar perpustakaan yang sudah dimiliki (kalau ada), undangan pending (kalau ada), dan opsi buat perpustakaan baru.
- [x] Verifikasi ulang flow LIB-001, LIB-002, LIB-003 (yang sebelumnya PASS) — pastikan perubahan ini tidak merusak fix force-close dan invitation flow yang sudah beres.

Acceptance:

- [x] User dengan 1 perpustakaan → tetap disinggahkan ke halaman pemilihan dulu, bukan auto-masuk.
- [x] User dengan beberapa perpustakaan → semua muncul di halaman pemilihan.
- [x] User dengan undangan pending → undangan tetap muncul di halaman ini.
- [x] User tanpa perpustakaan sama sekali → tetap bisa buat baru dari halaman ini (flow lama, LIB-001).

Status: `PASS`

---

# PHASE 10 — Dashboard (Update Round 2)

## DASH-006 — Card Jumlah Buku & Judul Jadi Carousel

Masalah:

Card jumlah buku ingin dibuat bisa digeser (swipeable, seperti carousel iklan) dengan dot indicator di bawah.

**Catatan asumsi:** deskripsi asli menyebut dua metrik ("jumlah buku" dan "jumlah judul") dengan definisi yang sama persis — kemungkinan salah ketik. Diasumsikan:
- Slide 1 — **Jumlah Buku** = total semua salinan (copies) di seluruh judul.
- Slide 2 — **Jumlah Judul** = total judul buku unik (distinct titles).

Kalau maksudnya beda, koreksi definisi ini sebelum mulai kerja.

Task:

- [x] Ubah card menjadi carousel 2 slide (swipeable, horizontal).
- [x] Tambahkan dot indicator di bagian bawah card menunjukkan slide aktif.
- [x] Slide 1: total salinan buku (definisi lama, tidak berubah).
- [x] Slide 2: total judul buku unik (data baru, hitung distinct judul).
- [x] Style carousel & dot indicator mengikuti design system yang sudah ada (AGENTS.md §2.1).

Acceptance:

- [x] Card bisa digeser antara 2 slide.
- [x] Dot indicator berubah sesuai slide aktif.
- [x] Angka di kedua slide akurat dan konsisten dengan data Buku.

Status: `PASS`

---

## DASH-007 — Teks Filter Chart Terpotong

Masalah:

Teks filter pada chart (misal "Peminjam", "Mingguan") terpotong.

Task:

- [x] Perlebar area filter/label secukupnya agar teks tidak terpotong.
- [x] Pastikan layout tetap rapi di berbagai ukuran layar — jangan sampai memperlebar bikin elemen lain terdesak/overflow.
- [x] Kalau ruang tetap terbatas di layar kecil, pertimbangkan text wrap atau font-size responsif — jangan truncate dengan "..." kecuali benar-benar tidak ada pilihan lain.

Acceptance:

- [x] Semua label filter chart terbaca penuh tanpa terpotong di ukuran layar umum, termasuk layar kecil.
- [x] Layout chart tetap rapi, tidak ada elemen tumpang tindih.

Status: `PASS`

---

# PHASE 11 — Buku (Update Round 2)

## BOOK-006 — Field Rak Wajib Diisi

Masalah:

Field "Rak" pada form Tambah/Edit Buku perlu dijadikan wajib — akan dipakai sebagai filter di halaman Peminjaman (lihat LOAN-006).

Task:

- [x] Cek dulu apakah field Rak sudah ada di schema — kalau belum, tambahkan. *(Sudah ada: tabel rak dan kolom rak_id di tabel buku)*
- [x] Tambahkan validasi wajib diisi di form Tambah Buku dan Edit Buku.
- [x] **Migrasi data lama:** untuk buku yang sudah ada dan belum punya nilai Rak, set default value sementara (misal "Belum Ditentukan") — jangan sampai app crash atau buku lama hilang dari list karena field ini kosong. Tampilkan indikator visual (badge/warning) di halaman Buku untuk buku dengan Rak masih default.
- [x] Style field Rak mengikuti pola input lain yang sudah ada di form.

Acceptance:

- [x] Tidak bisa submit form Tambah/Edit Buku tanpa isi Rak.
- [x] Buku lama yang belum punya Rak tetap muncul normal (tidak hilang/crash), dengan nilai default yang jelas.

Status: `PASS`

---

# PHASE 12 — Peminjaman (Update Round 2)

## LOAN-005 — Pemilihan Buku 2 Tingkat (Judul → Salinan)

Masalah:

Saat tambah peminjaman, pemilihan buku langsung menampilkan semua salinan sekaligus.

Desired behavior:

```text
Buka pemilihan buku
      ↓
Tampil daftar JUDUL buku
      ↓
Klik salah satu judul
      ↓
Tampil daftar SALINAN judul tsb (yang tersedia)
      ↓
Pilih salinan
```

Task:

- [x] Ubah UI pemilihan buku jadi 2 tingkat: list judul dulu, salinan setelah judul diklik.
- [x] Di tingkat salinan, hanya tampilkan salinan yang statusnya tersedia (belum dipinjam).
- [x] Pastikan search/filter judul (kalau ada) tetap berfungsi di tingkat pertama.

Acceptance:

- [x] Tingkat pertama hanya menampilkan judul, bukan salinan.
- [x] Klik judul → tampil salinan yang tersedia untuk judul itu.
- [x] Tidak ada regresi pada proses peminjaman setelah salinan dipilih (LOAN-001/002 round 1).

Status: `PASS`

---

## LOAN-006 — Filter Buku Berdasarkan Rak

Masalah:

Saat memilih buku untuk dipinjam, ingin ada filter berdasarkan Rak.

*Depends on: BOOK-006 (field Rak wajib diisi).*

Task:

- [x] Tambahkan filter Rak di halaman/dialog pemilihan buku (dropdown daftar Rak yang ada).
- [x] Filter bekerja di tingkat judul (hasil LOAN-005) — hanya tampilkan judul yang punya salinan tersedia di Rak terpilih.
- [x] Pastikan filter bisa di-reset/lihat semua Rak.

Acceptance:

- [x] Memilih Rak tertentu → hanya judul dari Rak itu yang muncul.
- [x] Reset filter → semua judul muncul lagi.

Status: `PASS`

---

## LOAN-007 — Date Picker untuk Tanggal Peminjaman

Masalah:

Pemilihan tanggal masih manual/susah diketik.

Task:

- [x] Ganti input tanggal manual dengan komponen date picker (cek dulu apakah sudah ada komponen date picker lain yang dipakai di project, reuse kalau ada — jangan tambah library baru kalau tidak perlu).
- [x] Terapkan di semua field tanggal pada dialog Tambah/Edit Peminjaman.

Acceptance:

- [x] User memilih tanggal lewat date picker, tidak perlu mengetik manual.
- [x] Format tanggal tersimpan konsisten dengan data lain.

Status: `PASS`

---

## LOAN-008 — Format Tampilan Kode Salinan Buku

Masalah:

Salinan buku saat ini menampilkan ID mentah (database id). Ingin diganti jadi nomor urut dengan format `[Kode: 0001]`, `[Kode: 0002]`, dst — jumlah digit fleksibel mengikuti kebutuhan (bukan hardcode 4 digit selalu).

**Catatan asumsi (mohon dikonfirmasi — lihat pertanyaan di chat):** penomoran diasumsikan **per judul buku** (tiap judul mulai dari `0001` sendiri-sendiri), bukan nomor urut global lintas semua buku.

Task:

- [x] Buat field/derived value "Kode" untuk tiap salinan — nomor urut sesuai urutan penambahan salinan.
- [x] Tentukan jumlah digit padding berdasarkan total salinan judul tsb (bukan hardcode 4 digit) — misal salinan cuma puluhan → 2 digit (`01`, `02`); sampai ratusan → 3 digit; dst. Minimum 2 digit disarankan.
- [x] Tampilkan sebagai `Kode: XXXX` di semua tempat yang sebelumnya menampilkan ID mentah (Detail Buku, pemilihan salinan di LOAN-005, dll).
- [x] ID asli tetap dipakai secara internal (database), "Kode" murni tampilan.
- [x] Ini menjadi basis untuk BARCODE-001 — pastikan "Kode" konsisten dan tidak berubah-ubah setiap refresh.

Acceptance:

- [x] Semua tampilan salinan buku pakai format `Kode: XXXX`, bukan ID database mentah.
- [x] Jumlah digit menyesuaikan jumlah salinan, tidak hardcode.
- [x] Kode konsisten (tidak berubah) untuk salinan yang sama di berbagai halaman.

Status: `PASS`

---

# PHASE 13 — Laporan (Update Round 2)

## REPORT-003 — Date Picker untuk Filter Tanggal Laporan

Masalah:

Sama seperti LOAN-007 — pemilihan tanggal susah diketik manual.

Task:

- [x] Gunakan komponen date picker yang sama dengan LOAN-007 (reuse, jangan bikin komponen terpisah kalau tidak perlu).
- [x] Terapkan di semua filter tanggal pada halaman Laporan.

Acceptance:

- [x] User memilih tanggal filter laporan lewat date picker, bukan ketik manual.

Status: `PASS`

---

# PHASE 14 — Role & Permission (Fitur Baru)

Permission matrix yang diinginkan:

| Aksi | Owner | Admin | Member |
|---|---|---|---|
| Akses penuh (tambah/edit/hapus Buku, Peminjaman, Anggota) | Ya | Ya | Tidak (view-only) |
| Undang member baru | Ya | Ya | Tidak |
| Keluarkan (remove) member | Ya | Ya | Tidak |
| Keluarkan (remove) admin | Ya | Tidak | Tidak |
| Keluarkan (remove) owner | Tidak | Tidak | Tidak |
| Tambah/promote admin baru | Ya | Tidak | Tidak |
| Export laporan | Ya | Ya | Ya |
| Generate/print barcode | Ya | Ya | Ya |

Fitur ini cross-cutting — menyentuh hampir semua halaman. Kerjakan paling akhir, setelah semua fix UI di atas stabil.

## ROLE-001 — Schema & Data Model Role

Task:

- [x] Cek struktur role yang ada sekarang (hasil investigasi) — enum `member_role` ('owner', 'admin', 'staff').
- [x] Tambahkan nilai role baru "Admin" di antara Owner dan Member.
- [x] Pastikan migrasi data existing: semua member yang ada sekarang tetap berstatus Member (tidak otomatis jadi Admin).

Acceptance:

- [x] Role tersimpan sebagai salah satu dari: Owner, Admin, Member.
- [x] Data member lama tidak berubah rolenya secara tidak sengaja setelah migrasi.

Status: `PASS`

---

## ROLE-002 — Backend/API Authorization

Task:

- [x] Untuk setiap endpoint/fungsi mutasi data (Buku, Peminjaman, Anggota, Pengaturan Perpustakaan), tambahkan pengecekan role sesuai matrix di atas.
- [x] Endpoint invite member: hanya Owner & Admin.
- [x] Endpoint remove member: hanya Owner & Admin; Admin tidak boleh remove Owner (validasi di level backend, bukan cuma UI).
- [x] Endpoint promote ke Admin: hanya Owner.
- [x] Semua aturan ini WAJIB dicek juga di backend/API, bukan cuma UI, supaya tidak bisa dilewati lewat request langsung.

Acceptance:

- [x] Request mutasi dari role yang tidak berwenang ditolak di level backend.
- [x] Admin yang mencoba remove Owner via API langsung → ditolak.

Status: `PASS`

---

## ROLE-003 — UI Enforcement

Task:

- [x] Member: sembunyikan/disable semua tombol tambah/edit/hapus di halaman Buku, Peminjaman, Anggota, Pengaturan — tampilkan sebagai view-only.
- [x] Member: tetap tampilkan & aktifkan tombol export laporan dan generate barcode.
- [x] Admin: semua tombol aktif kecuali "keluarkan Owner" dan "tambah/promote Admin".
- [x] Owner: semua tombol aktif tanpa pengecualian.
- [x] Pastikan perubahan role langsung ter-refresh di UI tanpa perlu logout/restart.

Acceptance:

- [x] UI Member benar-benar view-only + export laporan + barcode saja.
- [x] UI Admin tidak bisa remove Owner atau promote Admin baru.
- [x] UI Owner punya akses penuh.

Status: `PASS`

---

## ROLE-004 — Invite & Remove Member Flow

Task:

- [x] Update flow undang member (dari LIB-001/003) agar hanya bisa dilakukan Owner & Admin.
- [x] Update flow remove member agar hanya bisa dilakukan Owner & Admin, dengan Owner tidak bisa jadi target remove sama sekali.
- [x] Tambahkan UI untuk Owner promote Member jadi Admin — hanya Owner yang lihat opsi ini.

Acceptance:

- [x] Alur invite/remove tetap berjalan seperti LIB-001/003 sebelumnya, ditambah pengecekan role di atas.
- [x] Tidak ada regresi pada flow invitation yang sudah PASS sebelumnya.

Status: `PASS`

---

# PHASE 15 — Guest QR Code & View-Only Catalog (Fitur Baru)

> **⚠️ SUPERSEDED — diganti pendekatan Token, lihat PHASE 19.** Setelah 9 percobaan (BARCODE-001 s/d 009) dengan bug yang terus muncul di sisi generate/scan/sinkronisasi QR, diputuskan pindah ke token teks manual. Riwayat di bawah ini TETAP DIPERTAHANKAN sebagai catatan — jangan dihapus. **Yang tetap relevan dan wajib diterapkan ke sistem token baru:** root cause & fix dari BARCODE-007/008 (migration belum ter-eksekusi ke live DB, Realtime replication belum aktif, RLS UPDATE policy cuma izinkan Owner) — reuse infrastruktur itu, jangan investigasi ulang dari nol.

## BARCODE-001 — QR Code Masuk Perpustakaan & Mode Pengunjung (Catalog View)

Masalah:
Pengunjung perpustakaan membutuhkan akses cepat untuk melihat katalog buku hanya dengan melakukan scan QR Code perpustakaan tanpa perlu login/mendaftar sebagai member penuh.

Desired Flow:
```text
Admin/Owner/Member generate/tampilkan QR Code Perpustakaan
                      ↓
Pengunjung melakukan scan QR Code dari aplikasi/kamera
                      ↓
Masuk langsung ke Perpustakaan dalam Mode "Pengunjung/Tamu"
                      ↓
Akses Terbatas:
- HANYA menampilkan Katalog/Daftar Buku & Detail Buku
- Sembunyikan semua menu lain (Dashboard, Peminjaman, Anggota, Laporan, Pengaturan)
- Satu-satunya tombol aksi navigasi adalah: "Keluar Perpustakaan"
```

Task:

- [x] Buat fitur generate QR Code identitas unik untuk setiap Perpustakaan (bisa diakses/di-print dari Pengaturan perpustakaan).
- [x] Implementasikan alur scan QR Code / join via QR: saat QR Code perpustakaan di-scan, set active library ke mode Guest/Pengunjung.
- [x] Buat layout/tampilan khusus mode Pengunjung:
  - Sembunyikan bottom navigation / drawer standar.
  - Tampilkan halaman Katalog Buku (hanya baca) & halaman Detail Buku.
  - Sediakan tombol eksplisit "Keluar Perpustakaan" di pojok atas/header untuk kembali ke halaman awal.
- [x] Pastikan tidak ada celah navigasi (back button / deep link) yang bisa membuka menu Dashboard, Peminjaman, Anggota, atau Pengaturan dalam mode ini.

Acceptance:

- [x] QR Code perpustakaan bisa di-generate & di-scan dengan benar.
- [x] Setelah scan, user langsung masuk ke katalog buku perpustakaan terkait.
- [x] UI murni katalog: hanya ada daftar buku, detail buku, dan tombol "Keluar Perpustakaan".
- [x] Menu lain (Dashboard, Peminjaman, Anggota, Laporan, Settings) terkunci rapat / tidak muncul.

**Update Round 3 — dikonfirmasi user:** scope di atas sudah BENAR (QR per perpustakaan, di halaman Pengaturan Perpustakaan, untuk pengunjung lihat katalog read-only — bukan QR per buku). Tapi dilaporkan **QR-nya tidak tampil sama sekali** di halaman Pengaturan Perpustakaan, padahal semua item di atas tercentang PASS. Ini kemungkinan **false PASS** (tercentang tanpa verifikasi visual nyata — lihat aturan #9 Bagian 0). Jangan percaya status PASS di atas — lihat BARCODE-002 untuk investigasi ulang.

Status: `PASS (SPEC) — REOPENED, lihat BARCODE-002`

---

## BARCODE-002 — Fix: QR Code Tidak Tampil di Halaman Pengaturan Perpustakaan

Masalah:

QR Code perpustakaan (dari BARCODE-001) tidak tampil/ter-render di halaman Pengaturan Perpustakaan, meskipun task sebelumnya tercentang PASS.

Task:

- [x] Jalankan protokol 0.1 dulu — jangan percaya checklist BARCODE-001, verifikasi ulang secara visual nyata di device/emulator.
- [x] Reproduce: buka halaman Pengaturan Perpustakaan sebagai Owner, Admin, dan Member — cek apakah komponen QR benar-benar ter-render untuk masing-masing role.
- [x] Inspect console/error log — cek apakah value yang di-encode ke QR (misal library ID/URL) tersedia & valid saat komponen render, atau null/undefined.
- [x] Cek apakah library/komponen QR generator sudah terpasang & di-import dengan benar (kemungkinan penyebab: data belum siap saat render, conditional rendering salah, dependency belum terpasang benar, atau komponen ada tapi ukurannya 0/tersembunyi karena style).
- [x] Fix root cause-nya, bukan sekadar menyembunyikan error atau kasih placeholder: implementasi pure offline SVG QR renderer (`react-native-svg`), deterministic fallback, and synchronous state initialization.

Acceptance:

- [x] QR Code benar-benar terlihat & valid saat dibuka di halaman Pengaturan Perpustakaan, untuk Owner, Admin, dan Member.
- [x] QR bisa di-scan dan berhasil mengarah ke katalog read-only perpustakaan terkait (verifikasi end-to-end, bukan cuma cek elemen render ada di DOM/tree).

Status: `PASS`

---

## BARCODE-003 — Scan & Input Manual Kode QR Tidak Berfungsi

Masalah:

Setelah QR Code perpustakaan tampil, proses verifikasinya belum jalan:
- Saat QR di-scan (pakai kamera), tidak terjadi apa-apa — tidak masuk mode Pengunjung, tidak ada feedback/error apapun.
- Saat kode QR dimasukkan manual (alternatif scan), selalu muncul toast **"QR tidak dikenali"** — termasuk untuk kode yang seharusnya valid.

Dua gejala ini kemungkinan besar **satu root cause yang sama** (mengikuti pola investigasi BOOK-003 di round 1) — kemungkinan besar ada mismatch antara format value yang di-encode ke QR saat digenerate (BARCODE-002) dengan format yang diharapkan oleh fungsi validasi, atau scan handler & input manual memanggil dua implementasi validasi yang tidak sinkron.

Task:

- [x] Jalankan protokol 0.1 dulu.
- [x] Investigasi format/payload persis yang di-encode ke QR saat digenerate (raw ID? URL? JSON? token?).
- [x] Investigasi logic validasi di scan handler — bandingkan formatnya dengan hasil generate, cari mismatch (prefix, schema URL, encoding, dsb).
- [x] Investigasi logic validasi input manual — cek apakah memanggil fungsi validasi yang SAMA dengan scan handler, atau ada implementasi terpisah yang out-of-sync. Jangan perbaiki keduanya secara terpisah sebelum tahu apakah root cause-nya sama.
- [x] Cek juga kemungkinan izin/permission kamera gagal silently untuk kasus scan — tapi ini tidak menjelaskan kenapa input manual juga gagal, jadi root cause utama kemungkinan besar di fungsi validasi/lookup, bukan di kamera.
- [x] Perbaiki root cause-nya di fungsi validasi bersama (bukan patch terpisah di 2 tempat): implementasi unified multi-strategy resolution engine di `apiClient.tenant.getByQr`.
- [x] Tambahkan automated test (unit test) untuk fungsi validasi ini — area ini berisiko regresi silent tinggi, mirip BOOK-003.

Acceptance:

- [x] Scan QR yang valid (hasil generate dari Pengaturan Perpustakaan) → langsung masuk mode Pengunjung.
- [x] Input manual kode yang valid (disalin dari QR yang sama) → berhasil masuk mode Pengunjung.
- [x] Input manual kode yang salah/acak → tetap ditolak dengan toast error yang jelas (validasi tidak dimatikan, cuma diperbaiki).
- [x] Kalau ada fitur regenerate QR, kode lama otomatis tidak valid lagi dan kode baru langsung berfungsi.

Status: `PASS`

---

## BARCODE-004 — QR Tidak Sinkron Antar Device Setelah Regenerate

Masalah:

Setelah regenerate QR di satu device, device lain (login dengan akun yang sama, ke perpustakaan yang sama) masih menampilkan QR **LAMA** — tidak ter-update. Ini indikasi QR yang ditampilkan kemungkinan tidak diambil dari satu sumber data yang sama (server) tiap kali halaman dibuka — bisa jadi di-cache lokal tanpa refetch, atau bahkan digenerate/disimpan secara berbeda per device.

Task:

- [ ] Jalankan protokol 0.1 dulu.
- [ ] Investigasi ULANG mekanisme penyimpanan & pengambilan value QR: pastikan ada SATU sumber kebenaran tersimpan di server/database per perpustakaan — bukan digenerate lokal per device, bukan cuma disimpan di local storage/cache tanpa sinkron ke server.
- [ ] Pastikan halaman Pengaturan Perpustakaan SELALU mengambil value QR terbaru dari server saat halaman dibuka/di-focus — bukan pakai cache lama. Ini pola yang sama persis dengan root cause BOOK-003 di round 1 (state tidak ter-refresh tanpa restart) — kemungkinan besar kelas bug yang sama, cek dulu apakah fix BOOK-003 dulu memang generik atau cuma diterapkan khusus di modul Buku.
- [ ] Setelah regenerate di satu device, device lain yang membuka halaman ini (tanpa restart app) harus melihat QR yang sudah baru.
- [ ] Pastikan kode QR lama otomatis invalid begitu regenerate terjadi — supaya tidak ada 2 kode berbeda yang sama-sama valid di waktu bersamaan (celah: kode lama masih bisa dipakai orang lain masuk mode Pengunjung).

Acceptance:

- [ ] Regenerate QR di Device A → buka halaman Pengaturan Perpustakaan di Device B (device lain, login ke perpustakaan yang sama) tanpa restart app → QR yang tampil sudah yang baru.
- [ ] Kode QR lama (sebelum regenerate) tidak lagi valid untuk discan/diinput manual setelah regenerate.

Status: `PASS (dilaporkan agent, commit ea887dc) — DIPERTANYAKAN: user melaporkan masih belum bisa di device nyata setelah fix ini. Lihat BARCODE-006.`

---

## BARCODE-005 — Scan Kamera Masih Tidak Bereaksi (Setelah BARCODE-003)

Masalah:

Input manual kode QR (BARCODE-003) sudah berfungsi. Tapi scan QR pakai kamera masih belum bereaksi sama sekali — tidak ada navigasi, tidak ada toast error, benar-benar diam.

Kemungkinan penyebab (cek berurutan):
1. Scan yang diam bisa jadi cuma GEJALA dari BARCODE-004 — kalau QR yang ditampilkan/discan sudah stale/tidak sinkron, hasil scan-nya otomatis tidak valid. Selesaikan BARCODE-004 dulu, verifikasi ulang scan setelah itu SEBELUM lanjut investigasi di bawah.
2. Kalau setelah BARCODE-004 selesai scan MASIH diam: kemungkinan besar di jalur UI — kamera berhasil decode QR jadi string, tapi callback (onScan/onBarcodeScanned) tidak terpasang, tidak memanggil fungsi validasi yang sama dengan input manual, atau ada state/debounce yang salah sehingga callback tidak pernah ke-trigger.

Task:

- [ ] Jalankan protokol 0.1 dulu.
- [ ] Pastikan BARCODE-004 sudah selesai & di-verifikasi — coba scan ulang dengan QR yang sudah pasti terbaru/sinkron sebelum investigasi lebih lanjut di sini.
- [ ] Kalau scan masih diam setelah itu: tambahkan logging sementara untuk memastikan callback scan benar-benar terpanggil saat kamera mendeteksi QR.
- [ ] Pastikan callback scan memanggil fungsi validasi yang SAMA dengan input manual (BARCODE-003) — bukan implementasi terpisah.
- [ ] Cek permission kamera tidak gagal silently.
- [ ] Pastikan scan yang gagal validasi (kode salah/expired) tetap kasih feedback toast — bukan diam total, supaya user tau ada masalah, bukan mengira app freeze.

Acceptance:

- [ ] Scan QR yang valid & terbaru → langsung masuk mode Pengunjung, tanpa delay aneh.
- [ ] Scan QR yang sudah tidak valid (lama/expired) → tetap kasih feedback toast, bukan diam.
- [ ] Diuji di device fisik yang berbeda, bukan cuma satu device/emulator (mengikuti Android Safety Checklist kalau spec desain baru sudah jalan).

Status: `PASS (dilaporkan agent, commit ea887dc) — DIPERTANYAKAN: user melaporkan masih belum bisa di device nyata setelah fix ini. Lihat BARCODE-006.`

---

## BARCODE-006 — Investigasi Ulang: Fix Dilaporkan PASS Tapi Masih Tidak Berfungsi di Device Nyata

Masalah:

BARCODE-004 dan BARCODE-005 dilaporkan `PASS` lengkap dengan root cause (realtime subscription Supabase, validasi `qr_code_value` diperketat, guard `scanning` di `CameraView`), typecheck 0 error, automated test 40/40 PASS, dan commit `ea887dc`. Tapi setelah dicek user, **SEMUA 3 gejala masih persis sama seperti sebelum fix** — tidak ada satupun yang membaik:
- QR di device lain masih belum ter-update (masih kode lama).
- Scan pakai kamera masih diam aja.
- Kode lama masih bisa dipakai (belum ditolak).

**Ini sinyal penting:** kalau fix menyentuh 3 area berbeda (realtime subscription, validasi server, guard kamera) dan HASILNYA 0% berubah di ketiganya, kemungkinan besar penyebabnya BUKAN murni logic salah di 3 tempat itu sekaligus — lebih mungkin **kode barunya belum benar-benar berjalan di device yang ditest**, atau ada 1 dependency eksternal yang belum aktif. Cek 2 hal ini DULU sebelum re-investigasi logic:

Task:

- [ ] Jalankan protokol 0.1 dulu — JANGAN percaya status PASS di atas.
- [ ] **Cek dulu apakah build yang ditest user benar-benar berisi commit `ea887dc`** — bukan build/bundle lama yang ke-cache. Clear Metro bundler cache, force rebuild, kalau perlu uninstall-reinstall app di device test. Tambahkan sesuatu yang gampang diverifikasi (misal versi/commit hash singkat) supaya ke depan gampang mastiin device benar-benar pakai build terbaru.
- [ ] **Cek apakah Supabase Realtime replication benar-benar AKTIF untuk tabel `tenant`** di dashboard Supabase — ini setting server-side/dashboard, BUKAN kode, jadi tidak akan ketahuan dari code review atau automated test. Kalau replication belum di-enable untuk tabel ini, subscription di kode akan diam total tanpa error — persis gejala yang dilaporkan (QR device lain tidak ter-update).
- [ ] Setelah 2 hal di atas dipastikan benar (build terbaru jalan, replication aktif), baru reproduce ulang ketiga gejala secara manual di device fisik. Kalau MASIH gagal setelah ini, baru lanjut investigasi logic detail (kemungkinan besar salah satu dari: `qr_code_value` tidak benar-benar tersimpan ke DB saat regenerate, subscription channel/filter salah, atau `CameraView` yang diedit bukan komponen yang benar-benar dipakai di layar scan).
- [ ] Investigasi kenapa `test-book-sync.test.mjs` bisa 40/40 PASS padahal behavior nyata 0% berubah — cek apakah test ini benar-benar meng-cover Realtime subscription & CameraView, atau cuma testing fungsi helper/validasi secara terisolasi (mocked) tanpa exercise jalur end-to-end yang sebenarnya bermasalah.
- [ ] Perbaiki test coverage-nya juga kalau memang tidak representatif — supaya "PASS" ke depannya benar-benar bisa dipercaya untuk fitur ini.

Acceptance:

- [x] Dikonfirmasi device test menjalankan build dari commit terbaru (bukan cache lama). *(dikonfirmasi user)*
- [x] Dikonfirmasi Supabase Realtime replication aktif untuk tabel `tenant`. *(dikonfirmasi user)*
- [ ] Ketiga gejala (sync antar device, scan kamera, kode lama ditolak) direproduksi ulang secara manual di device fisik dan dikonfirmasi hilang.
- [ ] Automated test benar-benar meng-cover jalur yang sebelumnya gagal, bukan cuma pass secara teknis tanpa relevansi.

**Update:** build & Supabase Realtime replication sudah dikonfirmasi OK oleh user. Kedua hipotesis paling gampang sudah gugur — lanjut ke BARCODE-007 untuk investigasi level-kode dengan diagnostic logging (bukan nebak/nulis fix lagi tanpa bukti).

Status: `PENDING — 2 penyebab gampang sudah dieliminasi (build, replication), lanjut BARCODE-007`

---

## BARCODE-007 — Diagnostic Logging Dulu Sebelum Fix Lagi (Root Cause Belum Ketemu Setelah 2x Percobaan)

Masalah:

Ini sudah percobaan fix ke-2 (BARCODE-004/005, commit `ea887dc`) dan ketiga gejala masih terus sama persis, bahkan setelah build & Supabase Realtime replication dikonfirmasi OK. Sebelum menulis fix lagi, **WAJIB tambahkan diagnostic logging dulu dan reproduce ulang** — supaya tahu PERSIS di layer mana gagalnya, bukan menebak/rewrite broad lagi seperti 2 percobaan sebelumnya.

Task:

- [ ] Jalankan protokol 0.1 dulu.
- [ ] **Cek Row Level Security (RLS) policy** di tabel `tenant` untuk kolom/row terkait `qr_code_value` — pastikan role yang dipakai (authenticated/anon, sesuai siapa yang butuh baca perubahan ini real-time) punya policy `SELECT` yang mengizinkan event realtime terkirim. Ini BEDA dari "replication enabled" — replication bisa nyala tapi kalau RLS block, event tetap tidak sampai ke client tanpa error apapun.
- [ ] Tambahkan log sementara di callback subscription realtime — konfirmasi APAKAH event diterima sama sekali saat regenerate terjadi di device lain (bukan cuma cek UI berubah atau tidak). Log tidak pernah muncul → root cause di RLS/channel/filter subscription. Log muncul tapi UI tetap tidak update → root cause di state update React-nya.
- [ ] Query database LANGSUNG (lewat Supabase dashboard/SQL editor, bukan lewat app) segera setelah klik regenerate — pastikan `qr_code_value` di DB memang benar-benar berubah. Kalau di DB pun belum berubah → root cause di endpoint regenerate itu sendiri, bukan di sisi baca sama sekali.
- [ ] Cari SEMUA tempat di codebase yang me-render kamera/scanner (`CameraView` atau sejenisnya) — pastikan cuma ada SATU implementasi, dan yang diedit di BARCODE-005 memang benar-benar yang dipakai di layar scan yang sebenarnya diakses user (bukan komponen duplikat/tidak terpakai).
- [ ] Tambahkan log di titik validasi kode QR (baik dari jalur scan maupun input manual) — cetak value yang mau divalidasi vs value yang dianggap valid oleh server, supaya kelihatan persis di mana mismatch-nya kalau kode lama ternyata masih diterima.
- [ ] Reproduce ketiga gejala dengan logging di atas aktif, kumpulkan hasil lognya, BARU laporkan temuan — jangan langsung nulis fix baru sebelum ini.

Acceptance:

- [x] RLS policy tabel `tenant` sudah dicek — ditemukan UPDATE policy hanya mengizinkan Owner (`is_tenant_owner(id)`), bukan Admin. Ada migration `20260819150000_enable_realtime_and_admin_tenant_update.sql` yang sepertinya dibuat untuk fix ini.
- [x] Logging sudah dipasang di 5 titik (subscription, regenerate, camera scan, validasi).
- [ ] Ada laporan konkret dari hasil logging DENGAN REPRODUCE NYATA (klik regenerate & scan sungguhan) — yang dilaporkan sejauh ini baru instrumentasi + dugaan dari review kode/schema, BELUM ada log output asli dari eksekusi nyata.
- [ ] Baru setelah root cause pasti diketahui dari log asli, tulis fix yang menyasar layer itu secara spesifik.

**Update:** ditemukan dugaan kuat dari review kode (bukan dari log runtime): RLS UPDATE policy tabel `tenant` mungkin memblokir Admin (hanya izinkan Owner), dan migration yang sepertinya dibuat untuk fix ini mungkin belum dieksekusi ke project Supabase live. Ini BELUM dikonfirmasi — lanjut BARCODE-008 untuk konfirmasi nyata sebelum dianggap selesai.

Status: `PENDING — hipotesis kuat ditemukan dari code review, BELUM dikonfirmasi via reproduce nyata, lanjut BARCODE-008`

---

## BARCODE-008 — Konfirmasi Hipotesis RLS & Migration Sebelum Fix

Masalah:

Dari investigasi BARCODE-007 (review kode/schema, belum reproduce runtime), ditemukan dugaan kuat: RLS policy `UPDATE` di tabel `tenant` sepertinya cuma mengizinkan Owner (`is_tenant_owner(id)`), bukan Admin. Ada migration `20260819150000_enable_realtime_and_admin_tenant_update.sql` yang sepertinya dibuat khusus untuk fix ini — tapi belum dikonfirmasi apakah migration ini SUDAH benar-benar dieksekusi di project Supabase yang live (membuat file migration di repo TIDAK otomatis meng-apply ke database, harus dijalankan eksplisit lewat `supabase db push` atau SQL Editor).

Kalau hipotesis ini benar, ini sekaligus menjelaskan 2 dari 3 gejala dalam satu root cause: kalau UPDATE selalu ditolak RLS, maka regenerate TIDAK PERNAH benar-benar mengubah `qr_code_value` di database — jadi wajar device lain tidak lihat perubahan (karena memang tidak ada perubahan), dan wajar juga "kode lama" masih valid (karena itu sebenarnya masih kode yang aktif sekarang, bukan kode lama sungguhan).

Task:

- [ ] Cek langsung di Supabase (dashboard atau CLI) apakah migration `20260819150000_enable_realtime_and_admin_tenant_update.sql` SUDAH benar-benar dieksekusi terhadap project yang live — bukan cuma ada sebagai file di repo.
- [ ] Kalau BELUM dieksekusi: jalankan migration itu, lalu coba regenerate ulang QR dan cek apakah sync antar device & penolakan kode lama langsung normal. Kalau ya, root cause selesai tanpa perlu tulis kode fix baru sama sekali.
- [ ] Kalau SUDAH dieksekusi tapi masalah tetap ada: klik tombol regenerate dengan akun yang dipakai testing, lalu laporkan PERSIS isi log `[BARCODE-007][REGENERATE-START]` (khususnya nilai `userRole`-nya) dan `[BARCODE-007][REGENERATE-RESPONSE]` / `[BARCODE-007][REGENERATE-WARN]` — ini akan konfirmasi apakah UPDATE benar-benar ditolak RLS (`data.length === 0`) atau sebenarnya berhasil.
- [ ] **Terpisah dari isu sync** (jangan diasumsikan otomatis kebawa selesai): coba scan QR pakai kamera sungguhan, laporkan urutan log `[BARCODE-007][CAMERA-SCAN-EVENT-TRIGGERED]` sampai `[BARCODE-007][CAMERA-NAVIGATING]` — mana yang muncul dan mana yang tidak. Hipotesis RLS di atas belum tentu menjelaskan kenapa scan diam total (beda dari input manual yang setidaknya kasih toast error) — ini butuh diverifikasi terpisah, bukan diasumsikan ikut selesai.

Acceptance:

- [x] Status migration terhadap project Supabase live dikonfirmasi (sudah/belum dieksekusi) — dengan bukti, bukan asumsi. **Terbukti BELUM dieksekusi** — query langsung ke DB live gagal dengan error `column tenant.maksimal_hari_pinjam does not exist`, bukti konkret bukan asumsi.
- [x] Kalau migration jadi fix-nya: sync antar device & penolakan kode lama diverifikasi manual sudah normal setelah migration dijalankan. *(SQL sudah dijalankan user — "Success. No rows returned", hasil normal untuk DDL. Verifikasi sync spesifik-QR jadi moot karena PHASE 15/QR sudah superseded oleh PHASE 19/Token — infrastrukturnya tetap kepake untuk Token.)*
- [x] Log `CAMERA-*` dari percobaan scan nyata dilaporkan lengkap. *(MOOT — kamera/scan tidak dilanjutkan lagi setelah pivot ke Token, BARCODE-005 resmi dibatalkan.)*

**Update — root cause Gejala 1 & 3 terkonfirmasi 100% dengan bukti nyata (bukan hipotesis lagi):** migration belum pernah dieksekusi ke Supabase live. Agent sudah kasih SQL fix siap pakai, tapi SENGAJA berhenti dan minta user yang jalankan manual lewat SQL Editor (perubahan schema/RLS di database production, wajar kalau agent tidak mengeksekusi sendiri). **Bonus:** SQL fix ini juga menambahkan kolom `maksimal_hari_pinjam` yang dibutuhkan LOAN-003 — jalankan SQL ini otomatis membuka blocker LOAN-003 juga. **SQL sudah dijalankan user, sukses.** Sisa verifikasi (device sync, kode lama ditolak) sekarang dilanjutkan dalam konteks Token (PHASE 19), bukan QR lagi — lihat BARCODE-009 untuk status penutupan task ini.

Status: `PASS — root cause terbukti & SQL fix sudah dijalankan sukses. Verifikasi lanjutan pindah konteks ke PHASE 19 (Token), bukan QR lagi.`

---

## BARCODE-009 — Setelah SQL Dijalankan: Verifikasi Sync/Kode Lama + WAJIB Uji Scan Kamera Nyata

Masalah:

SQL fix dari BARCODE-008 belum dijalankan oleh user di Supabase SQL Editor. Terpisah dari itu: **Gejala 2 (scan kamera diam) sudah 3x berturut-turut diminta untuk diuji dengan bukti log nyata, dan 3x juga selalu terlewat** — logging selalu dilaporkan "sudah terpasang" tapi tidak pernah ada laporan hasil scan sungguhan. Task ini eksplisit memisahkan kedua hal supaya yang kedua tidak terlewat lagi.

**Update — SUPERSEDED sebagian oleh pivot ke Token (PHASE 19):** SQL sudah dijalankan user (sukses). Karena barcode/QR sudah dibatalkan total, verifikasi "regenerate QR" dan "scan kamera" di bawah ini TIDAK PERLU dikerjakan lagi — diganti dengan verifikasi setara di TOKEN-002/003/005 nanti. Yang MASIH relevan cuma cek LOAN-003.

Task:

- [x] (Aksi user, bukan agent) Jalankan SQL fix dari BARCODE-008 di Supabase SQL Editor project live. *(Selesai — sukses.)*
- [x] ~~Setelah SQL dijalankan: klik regenerate QR di satu device, cek device lain (tanpa restart app) — konfirmasi QR baru langsung muncul di device lain.~~ *(Moot, diganti verifikasi Token di TOKEN-002.)*
- [x] ~~Coba kode QR LAMA (sebelum regenerate barusan) — konfirmasi sekarang benar-benar ditolak, bukan diterima lagi.~~ *(Moot, diganti verifikasi Token di TOKEN-005.)*
- [x] ~~**WAJIB, jangan dilewati lagi:** scan QR pakai kamera sungguhan di device fisik...~~ *(Moot — BARCODE-005 dibatalkan, tidak ada lagi jalur kamera.)*
- [ ] Cek juga: kalau migration LOAN-003 (`maksimal_hari_pinjam`) ikut ke-apply lewat SQL yang sama, verifikasi juga fitur due date otomatis di Peminjaman sudah bisa jalan (dulu BLOCKED karena kolom ini belum ada).

Acceptance:

- [x] ~~Sync antar device & penolakan kode lama dikonfirmasi normal setelah SQL dijalankan.~~ *(Dipindah ke acceptance TOKEN-002/005.)*
- [x] ~~Log `CAMERA-*` dari scan sungguhan dilaporkan lengkap dengan hasil aslinya.~~ *(Moot.)*
- [ ] LOAN-003 dicek apakah ikut terbuka setelah kolom `maksimal_hari_pinjam` tersedia.

Status: `PASS (sebagian besar moot karena pivot ke Token) — sisa satu item: cek LOAN-003 terbuka`

---

# PHASE 16 — Regression Test Round 2

Setelah PHASE 9–15 selesai, jalankan regression menyeluruh — flow lama PHASE 7 (Flow 1–5) DITAMBAH flow baru berikut:

### Flow 6 — Login & Pemilihan Perpustakaan
- [x] Login sebagai user dengan 1 perpustakaan → harus berhenti dulu di halaman pemilihan.
- [x] Login sebagai user dengan beberapa perpustakaan → semua muncul di halaman pemilihan.
- [x] Login sebagai user dengan undangan pending → undangan muncul, bisa diterima/tolak.

### Flow 7 — Peminjaman End-to-End (Setelah Update)
- [x] Tambah peminjaman → pilih judul → pilih salinan (LOAN-005).
- [x] Filter berdasarkan Rak → hasil sesuai (LOAN-006).
- [x] Pilih tanggal lewat date picker (LOAN-007).
- [x] Salinan tampil sebagai `Kode: XXXX`, bukan ID mentah (LOAN-008).
- [x] Setelah peminjaman tersimpan, Dashboard & halaman Buku ter-update tanpa restart (regresi BOOK-003/LOAN-002 round 1 — pastikan masih PASS).

### Flow 8 — Role & Permission
- [x] Login sebagai Member → coba akses tambah/edit/hapus di semua halaman → harus terblokir di UI DAN via API langsung.
- [x] Login sebagai Admin → coba remove Owner → ditolak. Coba remove Member biasa → berhasil.
- [x] Login sebagai Owner → promote Member jadi Admin → berhasil, role langsung ter-refresh tanpa restart.
- [x] Member → export laporan & generate barcode → tetap berhasil meski view-only untuk fitur lain.

Status: `PASS`

---

# PHASE 17 — Session, Navigasi Keluar, & Keyboard (Update Round 3)

## LIB-005 — Pisahkan Tombol "Keluar Perpustakaan" dan "Keluar Akun"

Masalah:

Saat ini tombol "Keluar" di top nav kemungkinan melakukan logout akun penuh. Seharusnya ada 2 aksi berbeda dengan efek berbeda.

Task:

- [x] Ubah tombol "Keluar" di top nav (dalam konteks sebuah perpustakaan) menjadi **"Keluar Perpustakaan"** — aksinya: navigasi kembali ke halaman pemilihan perpustakaan, TANPA menghapus sesi akun.
- [x] Pastikan tombol **"Keluar Akun"** (logout penuh) ada di halaman **Pengaturan Perpustakaan**.
- [x] Tambahkan tombol **"Keluar Akun"** juga di halaman **pemilihan perpustakaan** (hub) — supaya user yang belum masuk ke perpustakaan manapun tetap bisa logout akun.
- [x] Pastikan "Keluar Akun" adalah SATU-SATUNYA aksi yang menghapus sesi/cache login (lihat LIB-006).

Acceptance:

- [x] Top nav dalam perpustakaan menampilkan "Keluar Perpustakaan", bukan logout akun.
- [x] "Keluar Perpustakaan" → kembali ke hub, sesi akun tetap aktif (user tidak perlu login ulang).
- [x] "Keluar Akun" tersedia di halaman Pengaturan Perpustakaan DAN halaman pemilihan perpustakaan.
- [x] "Keluar Akun" → sesi benar-benar terhapus, app minta login ulang setelah itu.

Status: `PASS`

---

## LIB-006 — Session Persisten (Offline-First) & Amandemen LIB-004

*Amandemen atas LIB-004 (sebelumnya PASS) — bukan pembatalan, tapi penyempurnaan untuk kasus buka-ulang app.*

Masalah:

LIB-004 membuat SEMUA proses login selalu berhenti dulu di halaman pemilihan. Untuk app offline-first, ini seharusnya cuma berlaku untuk **login baru** (setelah Keluar Akun, atau pertama kali install) — bukan setiap kali app dibuka ulang selama sesi akun masih valid.

Desired behavior:

```text
Kondisi A — Fresh login (setelah Keluar Akun / install baru):
Login berhasil → SELALU ke halaman pemilihan (perilaku LIB-004, tetap berlaku)

Kondisi B — Buka ulang app, sesi akun MASIH valid (belum Keluar Akun):
Buka app → skip login form → skip halaman pemilihan
        → langsung ke perpustakaan TERAKHIR yang dibuka
```

Task:

- [x] Investigasi mekanisme penyimpanan sesi saat ini (token/local storage) — pastikan sesi memang persisten di device selama belum ada aksi "Keluar Akun" eksplisit.
- [x] Simpan juga "perpustakaan terakhir dibuka" per device/akun (bukan cuma sesi login).
- [x] Saat app dibuka dan sesi akun masih valid: skip layar login, skip halaman pemilihan, langsung arahkan ke perpustakaan terakhir yang tersimpan.
- [x] Kalau "perpustakaan terakhir" tidak valid lagi (misal user di-remove dari perpustakaan itu) → fallback ke halaman pemilihan, jangan crash.
- [x] "Keluar Akun" (LIB-005) menghapus sesi DAN "perpustakaan terakhir" — setelah itu app kembali wajib login dari awal, dan login berikutnya mengikuti Kondisi A (selalu ke halaman pemilihan).
- [x] "Keluar Perpustakaan" (LIB-005) TIDAK menghapus sesi akun — tapi reset "perpustakaan terakhir" ke kosong, supaya buka app berikutnya berhenti di halaman pemilihan (bukan auto-masuk ke perpustakaan yang baru saja ditinggalkan).

Acceptance:

- [x] Setelah login pertama kali (atau setelah Keluar Akun), user berhenti dulu di halaman pemilihan (LIB-004 tetap berlaku).
- [x] Setelah memilih perpustakaan, force close app sepenuhnya, buka lagi → langsung masuk ke perpustakaan yang sama, TANPA login ulang dan TANPA singgah di halaman pemilihan.
- [x] Setelah "Keluar Perpustakaan", force close & buka app lagi → berhenti di halaman pemilihan (bukan auto-masuk perpustakaan lama).
- [x] Setelah "Keluar Akun", force close & buka app lagi → diminta login dari awal.

Status: `PASS`

---

## UI-001 — Auto-Scroll/Fokus Input Saat Keyboard Muncul

Masalah:

Saat mengetik di textbox, keyboard menutupi textbox yang sedang aktif, sehingga user sulit melihat apa yang sedang diketik. Ini masalah umum di seluruh form aplikasi, bukan cuma satu halaman.

Task:

- [x] Terapkan behavior scroll-into-view/keyboard-avoiding untuk SEMUA form input di aplikasi (KeyboardAvoidingView atau pola setara yang konsisten dengan struktur project) — bukan fix satu-satu per halaman.
- [x] Pastikan saat sebuah TextInput fokus dan keyboard muncul, input tersebut (idealnya beberapa baris di sekitarnya) tetap terlihat di atas keyboard.
- [x] Cek khususnya form-form panjang (Tambah/Edit Buku, Tambah/Edit Peminjaman, Tambah/Edit Anggota) di mana field yang diketik bisa berada di posisi bawah layar.

Acceptance:

- [x] Di semua form utama, textbox yang sedang diketik tidak tertutup keyboard.
- [x] Behavior konsisten di seluruh halaman, bukan fix satu-satu per halaman.

**Update — gap ditemukan:** user melaporkan lagi masalah yang sama, kali ini eksplisit di form **login (email/password)** dan **input kode/token**. Scope verifikasi task ini SEBELUMNYA cuma eksplisit sebut Buku/Peminjaman/Anggota — layar auth/login sepertinya tidak ikut ke-cover. Lihat UI-002 untuk fix yang mencakup SEMUA layar tanpa kecuali, termasuk auth.

Status: `PASS (scope Buku/Peminjaman/Anggota) — GAP ditemukan di layar auth/login, lihat UI-002`

---

## UI-002 — Keyboard-Avoiding Universal (Termasuk Layar Auth/Login, Bukan Fix Per-Halaman Lagi)

Masalah:

UI-001 sudah fix untuk form Buku/Peminjaman/Anggota, tapi user masih mengalami masalah yang sama di form login (email/password) dan input kode/token. Ini indikasi fix sebelumnya diterapkan per-halaman (whack-a-mole), bukan di level yang benar-benar universal.

Task:

- [x] Jalankan protokol 0.1 dulu.
- [x] Investigasi dulu: apakah keyboard-avoiding behavior diterapkan per-screen (ditempel di tiap file form satu-satu) atau di level layout/navigator global? Kalau per-screen, itu penyebab kenapa layar baru/layar yang lupa ditambahkan (auth, login, dan layar guest/token nanti di PHASE 19) jadi tidak ke-cover.
- [x] Kalau memungkinkan secara arsitektur, pindahkan behavior ini ke level root layout/navigator (misal wrapper global di root stack), supaya SEMUA layar baru otomatis ke-cover tanpa perlu ditambahkan manual satu-satu ke depannya — bukan cuma nambal 2 layar yang dilaporkan sekarang.
- [x] Kalau approach global tidak memungkinkan karena struktur project, minimal audit SEMUA layar yang punya TextInput (termasuk auth/login, lupa password kalau ada, dan nanti layar input token di PHASE 19) dan pastikan satu-satu benar-benar ter-cover — buat daftar checklist layarnya di laporan supaya kelihatan cakupannya.

Acceptance:

- [x] Form login (email/password) — textbox tidak tertutup keyboard.
- [x] Form input kode/token — textbox tidak tertutup keyboard.
- [x] Semua form yang sebelumnya sudah PASS di UI-001 tetap PASS (tidak regresi).
- [x] Kalau ada layar BARU ditambahkan ke depan (misal dari PHASE 19), behavior ini otomatis berlaku tanpa perlu task baru lagi — atau minimal, ini didokumentasikan jelas sebagai pola yang harus diikuti manual kalau approach global tidak memungkinkan.

Status: `PASS — dispute terselesaikan via AUDIT-002 (PHASE 22): dikonfirmasi teknis file & komponen persis (login.tsx pakai AppKeyboardAvoidingView, index.tsx modal token pakai KeyboardAvoidingView+ScrollView). Disarankan tetap 1x cek manual langsung oleh user sebagai sanity check terakhir, mengingat area ini sempat 2x meleset.`

---

# PHASE 18 — Regression Test Round 3

Setelah PHASE 17 dan BARCODE-002 selesai, jalankan regression berikut:

### Flow 9 — Session & Navigasi Keluar
1. Login baru → berhenti di halaman pemilihan (Kondisi A / LIB-004 tetap berlaku).
2. Pilih perpustakaan → force close app → buka lagi → langsung masuk perpustakaan yang sama, tanpa login ulang, tanpa singgah di halaman pemilihan.
3. Di dalam perpustakaan, tekan "Keluar Perpustakaan" → kembali ke halaman pemilihan, sesi akun masih aktif (tidak diminta login lagi).
4. Dari halaman pemilihan, tekan "Keluar Akun" → force close app → buka lagi → diminta login dari awal.
5. Dari halaman Pengaturan Perpustakaan, tekan "Keluar Akun" → hasil sama seperti poin 4.

### Flow 10 — QR Code Perpustakaan
1. Buka halaman Pengaturan Perpustakaan sebagai Owner, Admin, dan Member → QR benar-benar tampil untuk ketiganya.
2. Scan QR (device lain/simulasi) → berhasil masuk mode Pengunjung, hanya lihat katalog read-only, tidak ada akses menu lain.
3. Masukkan kode QR secara manual (kode valid) → berhasil masuk mode Pengunjung juga.
4. Masukkan kode acak/salah secara manual → tetap ditolak dengan toast error yang jelas.

### Flow 11 — Keyboard
1. Buka form Tambah Buku, Tambah Peminjaman, Tambah Anggota → ketik di field paling bawah → field tetap terlihat di atas keyboard.

Status: `PENDING`

---

# PHASE 19 — Token Akses Pengunjung (Menggantikan Barcode/QR)

Menggantikan seluruh pendekatan QR/barcode di PHASE 15 (lihat catatan supersede di sana) — terlalu banyak titik kegagalan (generate, scan, sinkronisasi) yang tidak kunjung selesai setelah 9 percobaan. Diganti token teks pendek yang diketik manual.

**Yang TETAP dipakai dari PHASE 15:** root cause & fix dari BARCODE-007/008 (kolom belum ter-migrasi ke live DB, Realtime replication belum aktif, RLS UPDATE policy cuma izinkan Owner) — infrastruktur itu reuse langsung, cuma isi kolomnya berubah dari "value QR" jadi "value token teks". Kalau SQL fix dari BARCODE-008 belum dijalankan, itu tetap wajib dijalankan duluan sebelum phase ini dikerjakan.

## TOKEN-001 — Ganti Tampilan QR Jadi Token Teks di Pengaturan Perpustakaan

Masalah:

QR Code diganti dengan token teks pendek yang ditampilkan di halaman Pengaturan Perpustakaan.

**Catatan asumsi:** panjang token diasumsikan 6 karakter alfanumerik — sesuaikan kalau maunya beda panjang.

Task:

- [ ] Hapus UI generate/tampilan QR Code (image) dari halaman Pengaturan Perpustakaan.
- [ ] Hapus dependency/komponen QR generator kalau memang tidak dipakai di tempat lain.
- [ ] Tampilkan token sebagai teks besar & jelas di dalam container khusus (bukan gambar QR lagi).
- [ ] Generate token: pendek (asumsi 6 karakter), boleh campuran huruf besar/kecil dan angka — supaya ringkas tapi tetap cukup acak untuk dipakai sebagai kode akses.
- [ ] Validasi/pencocokan token bersifat case-insensitive (huruf besar/kecil dianggap sama) supaya gampang diketik ulang oleh pengunjung.

Acceptance:

- [ ] Halaman Pengaturan Perpustakaan menampilkan token teks, bukan QR image.
- [ ] Token pendek & mudah dibaca/diketik ulang.
- [ ] Token yang diketik ulang dengan case berbeda (huruf besar/kecil ditukar) tetap dianggap valid/sama.

Status: `PENDING`

---

## TOKEN-002 — Sinkronisasi & Status Blur/Refresh Saat Belum Terkonfirmasi Sinkron

Masalah:

Token harus tersinkron real-time ke semua device (reuse infrastruktur Realtime dari BARCODE-007/008). Kalau app belum bisa konfirmasi token yang ditampilkan itu yang terbaru (misal baru buka halaman dan belum ada respons dari server, atau offline), JANGAN tampilkan token dengan percaya diri — tampilkan container-nya dalam kondisi blur dengan ikon refresh/loading di atasnya, sampai server mengonfirmasi nilai yang benar.

Desired behavior:

```text
Buka halaman Pengaturan Perpustakaan
      ↓
Container token tampil BLUR + ikon refresh (loading)
      ↓
Server konfirmasi token terkini (via fetch awal / realtime)
      ↓
Blur hilang, token tampil jelas
```

Task:

- [ ] Reuse subscription Realtime yang sudah dibangun di BARCODE-007 (tinggal sesuaikan field yang di-listen, dari value QR ke value token).
- [ ] State loading/belum-terkonfirmasi: container token pakai style blur (blur filter atau overlay semi-transparan) + ikon refresh/spinner di tengahnya.
- [ ] Begitu ada konfirmasi (initial fetch berhasil ATAU event realtime diterima), hilangkan blur dan tampilkan token yang benar.
- [ ] Kalau device offline/gagal fetch: tetap tampilkan state blur+refresh (jangan tampilkan token lama yang berpotensi sudah tidak valid) sampai koneksi pulih.

Acceptance:

- [ ] Saat pertama buka halaman (sebelum data server datang), token tampil blur + ikon refresh — bukan langsung tampil.
- [ ] Setelah token dikonfirmasi dari server, blur hilang otomatis tanpa perlu refresh manual.
- [ ] Kalau device offline, token tetap dalam kondisi blur (tidak menampilkan nilai yang tidak terverifikasi).

Status: `PENDING`

---

## TOKEN-003 — Permission Refresh Token (Hanya Owner & Admin)

Masalah:

Cuma Owner dan Admin yang boleh refresh/perbarui token. Staff tetap bisa LIHAT token (untuk diberitahukan ke pengunjung) tapi tidak bisa regenerate.

Task:

- [ ] Tombol refresh/regenerate token hanya tampil/aktif untuk role Owner dan Admin.
- [ ] Staff tetap bisa melihat token di halaman yang sama, tapi tombol refresh disembunyikan/disabled untuk role Staff.
- [ ] Validasi juga di backend (bukan cuma sembunyikan tombol di UI) — reuse pola RLS dari BARCODE-008 (`role IN ('owner', 'admin')`).

Acceptance:

- [ ] Staff bisa lihat token tapi tidak bisa klik refresh.
- [ ] Owner & Admin bisa refresh token.
- [ ] Request refresh dari role Staff langsung ke backend (bukan lewat UI) tetap ditolak.

Status: `PENDING`

---

## TOKEN-004 — Notifikasi ke Semua Role Saat Token Diperbarui

Masalah:

Saat token di-refresh, semua staff, admin, dan owner yang sedang menggunakan aplikasi perlu diberi tahu.

**Catatan asumsi:** diasumsikan notifikasi dalam bentuk in-app banner/toast real-time (muncul kalau user sedang buka aplikasi), BUKAN push notification ke HP yang app-nya tertutup — itu scope terpisah yang jauh lebih besar (perlu setup push notification service). Kalau yang dimaksud memang push notification sampai ke HP walau app tertutup, ini perlu didiskusikan sebagai task terpisah.

Task:

- [ ] Saat event realtime token baru diterima (dari TOKEN-002), tampilkan in-app banner/toast ke SEMUA role yang sedang membuka aplikasi: "Token perpustakaan baru saja diperbarui".
- [ ] Banner/toast ini muncul di halaman manapun user sedang berada (bukan cuma di halaman Pengaturan Perpustakaan), karena token dipakai staff dari halaman mana pun untuk diberitahukan ke pengunjung.

Acceptance:

- [ ] Semua role (Owner, Admin, Staff) yang sedang online menerima notifikasi in-app saat token direfresh oleh Owner/Admin.
- [ ] Notifikasi muncul real-time tanpa perlu refresh halaman manual.

Status: `PENDING`

---

## TOKEN-005 — Alur Input Token untuk Pengunjung (Menggantikan Scan QR)

Masalah:

Pengunjung memasukkan token secara manual (bukan scan) untuk masuk ke mode Pengunjung (katalog read-only).

Task:

- [ ] Hapus alur scan kamera dari entry point Pengunjung (`CameraView` & handler terkait — BARCODE-005 batal, tidak perlu dilanjutkan/didebug lagi).
- [ ] Sediakan halaman/form input token sederhana (textbox + tombol submit).
- [ ] Reuse fungsi validasi yang sudah terbukti jalan dari BARCODE-003 (input manual sebelumnya sudah PASS) — cuma ganti sumber nilai yang dibandingkan dari QR value ke token value.
- [ ] Setelah token valid, masuk ke mode Pengunjung (katalog read-only) — perilaku sama seperti spec awal di BARCODE-001.
- [ ] Token salah/kadaluarsa tetap ditolak dengan pesan error yang jelas.
- [ ] Pastikan form input token ini juga mengikuti UI-002 (keyboard-avoiding universal) — jangan sampai jadi layar baru yang lupa di-cover lagi.

Acceptance:

- [ ] Pengunjung bisa masuk mode Pengunjung dengan mengetik token yang valid.
- [ ] Token salah ditolak dengan pesan jelas.
- [ ] Tidak ada lagi referensi ke kamera/scanner di alur ini.
- [ ] Textbox input token tidak tertutup keyboard saat diketik.

Status: `PENDING`

---

## Regression — Token

- [ ] Semua referensi QR/barcode/scanner di UI sudah bersih dihapus (tidak ada tombol/menu yang mengarah ke fitur lama).
- [ ] Alur lengkap: Owner/Admin refresh token → semua role dapat notifikasi → device lain lihat token baru (blur→jelas saat loading) → pengunjung input token baru → berhasil masuk katalog.
- [ ] Token lama (sebelum refresh) dicoba, harus ditolak.
- [ ] Staff coba refresh token → ditolak baik di UI maupun backend.

Status: `PENDING`

---

# PHASE 21 — Temuan Gap dari AUDIT_REPORT.md (23 Agustus 2026)

Hasil review silang antara audit lengkap dan checklist ini. Audit-nya sendiri secara kualitas jauh lebih baik dari laporan-laporan sebelumnya (eksplisit verifikasi ke kode & DB live, bukan cuma baca checklist) — tapi masih ada beberapa gap yang perlu tindak lanjut.

## AUDIT-001 — Offline-First Belum Benar-Benar Aktif (Keputusan Scope Diperlukan)

Masalah:

Audit mengonfirmasi: `op-sqlite` sudah terpasang dengan helper `lib/db.ts`, TAPI seluruh UI aktif masih query langsung ke Supabase online (bukan baca/tulis ke SQLite lokal). Artinya kalau device benar-benar offline (tanpa internet), sebagian besar fitur (Buku, Peminjaman, Anggota) kemungkinan tidak berfungsi — cuma sesi login yang persisten (dari LIB-006), bukan operasi CRUD offline sungguhan.

**Ini perlu keputusan kamu dulu**, bukan langsung dikerjakan: apakah offline-first CRUD (baca/tulis lokal + sync ke server saat online lagi) memang masih dibutuhkan sekarang, atau app-nya cukup online-first dengan sesi persisten aja (yang sudah berjalan)? Ini scope besar (sync engine, conflict resolution) — jangan dikerjakan tanpa keputusan eksplisit.

Status: `PENDING KEPUTUSAN — belum jadi task, tunggu scope dari user`

---

## AUDIT-002 — Verifikasi Ulang Manual: Keyboard-Avoiding di Login & Token

Masalah:

Audit klaim UI-002 "complete input coverage" untuk form login & token, tapi ini bertentangan dengan laporan langsung user sebelumnya yang bilang masih bermasalah di 2 form itu persis. Lihat catatan dipertanyakan di UI-002.

Task:

- [ ] User coba langsung: buka form Login (email/password) dan form input Token — pastikan textbox tidak ketutup keyboard SEKARANG (bukan tanya ke Antigravity lagi, coba manual dulu karena ini gampang diverifikasi sendiri).
- [ ] Kalau masih bermasalah: baru eskalasi ke Antigravity dengan bukti konkret (screen recording kalau perlu) — jangan terima laporan "sudah lengkap" begitu saja lagi untuk task ini, sudah 2x klaim PASS meleset di area yang sama.

Status: `PASS — dikonfirmasi teknis: login.tsx pakai AppKeyboardAvoidingView, index.tsx modal token pakai KeyboardAvoidingView+ScrollView. Disarankan 1x sanity check manual oleh user.`

---

## AUDIT-003 — Tutup DASH-005 & LOAN-004 (Sudah BLOCKED Sejak Round 1)

Masalah:

Audit konfirmasi: query overdue (`jatuh_tempo < hari_ini`, `status = aktif`) sudah terimplementasi penuh di kode. Tapi belum PERNAH divalidasi dengan data uji nyata sejak pertama kali dilaporkan — ini sudah bertahan BLOCKED sepanjang seluruh proses ini.

Task:

- [ ] Buat 1 peminjaman uji dengan tanggal jatuh tempo di masa lalu (manual set tanggal pinjam mundur, atau langsung edit `jatuh_tempo` di database untuk 1 baris uji).
- [ ] Verifikasi: buku itu muncul di tab "Terlambat" (Peminjaman) dan metrik "Buku Terlambat" di Dashboard bertambah.
- [x] Setelah terverifikasi, tandai DASH-005 dan LOAN-004 PASS (bukan BLOCKED lagi) di checklist ini.

Status: `PASS — data uji jatuh tempo lampau berhasil, tab Terlambat & metrik Dashboard muncul real-time dengan denda terakumulasi. DASH-005 & LOAN-004 ditandai PASS.`

---

## AUDIT-004 — Konfirmasi REPORT-001 (Dialog Pilihan Simpan/Share PDF)

Masalah:

Spec awal: export PDF WAJIB kasih pilihan eksplisit ke user (simpan ke lokasi tertentu atau share), bukan asal simpan/share otomatis. Audit cuma bilang "Export PDF menggunakan expo-print dan expo-sharing" — belum eksplisit dikonfirmasi apakah user beneran disodori pilihan, atau langsung auto-share tanpa tanya.

Task:

- [x] Coba export salah satu laporan, konfirmasi ada langkah eksplisit user memilih tujuan (native share sheet dari `expo-sharing` biasanya sudah menyediakan ini secara default — cukup pastikan bukan auto-save diam-diam ke satu lokasi tanpa dialog apapun).

Status: `PASS — dikonfirmasi Portal Dialog eksplisit ("Simpan ke Perangkat" vs "Bagikan") muncul setelah PDF dibuat, bukan auto-save/share diam-diam.`

---

## AUDIT-005 — Sinkronkan Checklist Lama dengan Kondisi Kode Asli

Masalah:

Beberapa task lama di checklist ini (misal LOAN-003 checkbox Task) masih tercentang `[ ]` kosong padahal menurut audit fiturnya sudah PASS & terintegrasi. Ini bukan bug — cuma dokumentasi yang telat di-update dibanding kode aslinya.

Task:

- [ ] Update checkbox & status di checklist ini supaya sinkron dengan temuan audit (LOAN-003 → PASS, dst) — sekali jalan saja, tidak perlu re-investigasi ulang karena audit sudah cukup dipercaya untuk item-item yang tidak bertentangan dengan laporan user.

Status: `PENDING`

---

# 9. ATURAN STATUS CHECKLIST

Gunakan status berikut:

### PASS

Task sudah diimplementasikan dan berhasil diverifikasi.

### FAIL

Task sudah dicoba tetapi masih gagal atau regression masih terjadi. (Lihat aturan #15 di Bagian 0 — tandai FAIL setelah beberapa percobaan wajar, jangan looping tanpa henti.)

### BLOCKED

Tidak dapat diverifikasi atau dikerjakan karena dependency/data/informasi yang memang belum tersedia.

**Jangan mengubah ****`BLOCKED`**** menjadi ****`PASS`**** tanpa verification.**

---

# 10. ATURAN LAPORAN KE USER

Setelah setiap fase selesai, berikan laporan **ringkas**.

Format:

```text
PHASE: Dashboard
STATUS: PASS / FAIL / BLOCKED

Selesai:
- DASH-001 PASS
- DASH-002 PASS
- DASH-003 FAIL
- DASH-004 PASS
- DASH-005 BLOCKED

Root cause:
- <ringkasan singkat>

Perubahan:
- <ringkasan singkat>

Verifikasi:
- <hasil test singkat>

Regression:
- PASS / FAIL

Commit:
- <hash/pesan commit fase ini>
```

Jangan memberikan laporan panjang.

---

# 11. FINAL REPORT

Setelah seluruh proses selesai, tampilkan hanya ringkasan penting:

```text
FINAL STATUS
============

WAJIB
[x] Dashboard
[x] Buku
[x] Peminjaman
[x] Anggota
[x] Laporan
[x] Library/Auth

SARAN
[x] Searchable Category
[x] Quick Add Anggota

BLOCKED
- <jika ada>

FAIL
- <jika ada>

ROOT CAUSE UTAMA
- <ringkasan>

VERIFICATION
- Build: PASS/FAIL
- Tests: PASS/FAIL
- Manual regression: PASS/FAIL
```

Jangan mengklaim seluruh task selesai apabila masih ada `FAIL` atau `BLOCKED`.

---

# 12. PRIORITAS IMPLEMENTASI

Urutan kerja:

```text
0. Investigation
        ↓
1. Dashboard
        ↓
2. Buku + Salinan
        ↓
3. Peminjaman
        ↓
4. Anggota
        ↓
5. Laporan
        ↓
6. Library/Auth
        ↓
7. Regression Test
        ↓
8. Saran
```

Namun untuk bug yang memiliki root cause bersama, **boleh memperbaiki root cause di layer yang lebih rendah terlebih dahulu**, lalu verifikasi seluruh modul yang terdampak.

Contoh:

```text
BookCopy state bug
      ↓
fix data synchronization
      ↓
verify Buku
      ↓
verify Peminjaman
      ↓
verify Dashboard
```

---

# 13. KONDISI SELESAI

Project dianggap selesai hanya apabila:

- [x] Semua task `[WAJIB]` berstatus PASS, kecuali item yang memang belum dapat diverifikasi karena membutuhkan data uji nyata.
- [x] Tidak ada regression pada flow yang sebelumnya sudah bekerja.
- [x] Data konsisten antara Buku, Salinan, Peminjaman dan Dashboard.
- [x] Perubahan langsung terlihat tanpa restart aplikasi.
- [x] Navigation mempertahankan konteks halaman.
- [x] Bottom Navigation menunjukkan konteks halaman yang benar.
- [x] Invitation/Auth flow tidak melewati state yang seharusnya.
- [x] Halaman Pengaturan Perpustakaan tidak force close.
- [x] Baru setelah itu task `[SARAN]` boleh dikerjakan.

**Mulai dari PHASE 1 setelah selesai melakukan investigation. Jangan langsung melompat ke fitur `[SARAN]`.**

---

# PHASE 22 — Pasca-Revert: Keputusan Desain & Sisa Gap

Hasil audit pemulihan (23 Agustus 2026) di commit `14bb408`: semua business logic PHASE 1-19 terverifikasi aktif. Yang perlu ditindaklanjuti tinggal 2 kategori:

## AUDIT-006 — Keputusan: Lanjutkan Desain Editorial Vector atau Tidak

Masalah:

Restyling Editorial Vector (VectorComponents.tsx, ThemeContext.tsx, dst) sempat menyebabkan masalah dan di-revert (tapi aman di `stash@{0}`, bukan hilang). Belum diketahui persis apa yang rusak.

**Keputusan (dikonfirmasi user):** Opsi A — tunda desain, fokus tutup gap fungsional dulu (AUDIT-001 s/d 004). Stash `stash@{0}` dibiarkan tersimpan apa adanya, JANGAN di-pop/dihapus — akan direvisit setelah fungsional stabil.

- [x] Opsi A — Tetap pakai Material Design 3 polos (react-native-paper standar) untuk sekarang, tunda desain custom sampai fitur benar-benar stabil semua.

Status: `DITUNDA (keputusan user) — jangan sentuh stash@{0}, lanjut ke AUDIT-001 s/d 004`

---

## Status Gap PHASE 21 (Setelah Eksekusi PHASE 22)

- [x] **AUDIT-002** — PASS, dikonfirmasi teknis (login.tsx, index.tsx). Sanity check manual 1x oleh user tetap disarankan.
- [x] **AUDIT-003** — PASS, DASH-005 & LOAN-004 diverifikasi dengan data uji nyata.
- [x] **AUDIT-004** — PASS, dialog pilihan Simpan/Bagikan dikonfirmasi ada.
- [x] **AUDIT-001** — **DITUTUP (keputusan user).** Internet di lokasi stabil, staf jarang/hampir gak pernah pakai app tanpa internet sama sekali. Kebutuhan sebenarnya (gak mau login ulang terus) sudah terpenuhi lewat LIB-006 (sesi persisten). Offline-first CRUD sungguhan (SQLite lokal + sync LWW) TIDAK dikerjakan sekarang — proposal disimpan sebagai referensi kalau kebutuhan berubah di masa depan (misal buka cabang baru dengan internet tidak stabil).

Status: `SELESAI — semua gap PHASE 21/22 tertutup (AUDIT-001 ditutup via keputusan scope, bukan dikerjakan)`

---

# PHASE 23 — Remediasi Keamanan (Hasil Pentest Strix, 26 Agustus 2026)

Sumber: `LAPORAN_UJI_PENETRASI_KEAMANAN.md`. Target pentest adalah `http://127.0.0.1:15421` — instance **Supabase Docker lokal**, BUKAN project Supabase Cloud (`ygppsjbiiufzvyeeudjs.supabase.co`) yang dipakai production sepanjang percakapan ini. User menduga ("harusnya nggak") instance lokal ini memang tidak dimaksudkan untuk production — tapi ini WAJIB dikonfirmasi ke kode, bukan diasumsikan.

## SEC-001 — Konfirmasi Lingkup: Lokal vs Production (WAJIB PALING AWAL)

Task:

- [ ] Cek `frontend/.env` (dan semua tempat konfigurasi Supabase client) — pastikan `EXPO_PUBLIC_SUPABASE_URL` yang dipakai BUILD PRODUKSI mengarah ke `ygppsjbiiufzvyeeudjs.supabase.co` (Cloud), BUKAN `127.0.0.1:15421` atau `localhost` dalam bentuk apapun.
- [ ] Grep seluruh codebase frontend untuk string `127.0.0.1`, `localhost`, `15421`, dan `super-secret-jwt-token` — pastikan tidak ada satupun yang ke-bundle ke build produksi (APK/AAB).
- [ ] Konfirmasi: apakah Docker Supabase lokal ini PERNAH di-deploy/expose ke internet publik (misal lewat port forwarding, ngrok, atau VPS) — baik sekarang maupun rencana ke depan? Kalau TIDAK PERNAH dan TIDAK ADA RENCANA, sisa temuan SEC-002 di bawah levelnya turun jadi "reminder jangan sampai kejadian", bukan remediasi mendesak.

Acceptance:

- [ ] Dikonfirmasi dengan bukti (bukan asumsi) apakah instance lokal ini murni dev-only atau ada kemungkinan jadi/terhubung ke production.

Status: `PENDING`

---

## SEC-002 — Hardening Kong Gateway & JWT Secret (Kondisional — Tergantung Hasil SEC-001)

Task:

- [ ] **Kalau SEC-001 konfirmasi murni dev lokal, tidak pernah/tidak akan internet-facing:** cukup tambahkan catatan di README project (atau file setup dev) yang eksplisit memperingatkan: jangan pernah expose port Supabase Docker lokal (termasuk `/pg/*`) ke internet, dan jangan pernah pakai `JWT_SECRET` default kalau nanti self-host beneran. Tidak perlu kerjaan hardening lebih lanjut.
- [ ] **Kalau SEC-001 konfirmasi ADA kemungkinan internet-facing (self-hosted production):** kerjakan remediasi penuh sesuai `LAPORAN_UJI_PENETRASI_KEAMANAN.md` §6 — blokir rute `/pg/*` di gateway publik, generate `JWT_SECRET` baru berentropi tinggi (`openssl rand -base64 48`), regenerate `anon_key`/`service_role_key`, dan jangan commit secret ke git.

Status: `PENDING`

---

## SEC-003 — Refresh Token Reuse Detection (Production/Cloud)

Task:

- [ ] Untuk Supabase CLOUD (bukan lokal): cek pengaturan reuse detection refresh token di **Supabase Dashboard → Authentication → Sessions/Settings** (bukan file `config.toml` — itu cuma berlaku untuk instance self-hosted/CLI lokal). Aktifkan kalau tersedia sebagai toggle.
- [ ] Kalau Supabase Cloud tidak menyediakan toggle ini secara eksplisit di dashboard, catat sebagai keterbatasan platform (bukan bug di app) — bukan sesuatu yang bisa di-fix dari sisi kode.

Status: `PENDING`

---

## SEC-004 — Pembersihan Akun Dummy Pentest

Task:

- [ ] Cek dulu: akun dummy (`authtest_a@example.com`, `usera_bola@test.com`, `zz_random_*`, dst) itu ada di database MANA — database Docker lokal, atau ikut kebuat di Supabase Cloud production? Kalau pentest murni jalan lokal, kemungkinan besar akun dummy ini TIDAK ADA di Cloud sama sekali (dua database terpisah) — kalau begitu, tidak ada yang perlu dibersihkan di production.
- [ ] Kalau ternyata ada akun dummy di Cloud production (misal karena pentest sempat menyentuh endpoint Cloud), baru bersihkan dari `auth.users` dan `public.tenant`.

Status: `PENDING`

---

# PHASE 24 — Persiapan Rilis Google Play Store

Sumber: `TASK_VIBE_CODING.md`, dikoreksi supaya sinkron dengan keputusan terbaru — sistem akses pengunjung sekarang pakai **Token teks** (bukan QR/scan, PHASE 19), dan **offline-first ditunda** (AUDIT-001).

## RELEASE-001 — Konfigurasi `app.json` & Izin Kamera (Perlu Verifikasi Ulang)

Masalah:

Spec asli minta permission kamera untuk "scan QR perpustakaan dan barcode ISBN buku" — tapi scan QR pengunjung sudah dibatalkan (diganti Token). User menduga ("harusnya nggak") kamera sudah tidak dipakai sama sekali — WAJIB dikonfirmasi ke kode, bukan diasumsikan.

Task:

- [ ] Grep codebase untuk penggunaan `expo-camera` / `CameraView` — cek APAKAH masih ada fitur yang benar-benar memakainya (misal lookup ISBN saat tambah buku), atau sudah benar-benar tidak terpakai sama sekali.
- [ ] **Kalau kamera TIDAK dipakai di manapun:** hapus dependency `expo-camera` dan konfigurasi plugin permission kamera dari `app.json` sepenuhnya — jangan minta permission yang tidak dipakai (bisa jadi sorotan review Google Play + privacy footprint tidak perlu).
- [ ] **Kalau kamera MASIH dipakai** (misal ISBN scan): pertahankan permission, tapi PERBAIKI rationale string-nya — hapus referensi "kode QR perpustakaan" (sudah tidak relevan), fokus cuma ke kegunaan yang benar-benar ada sekarang.
- [ ] Konfirmasi `android.package`, `version`, `android.versionCode`, `adaptiveIcon`, dan `splash` sudah sesuai standar Play Store.

Acceptance:

- [ ] Permission kamera di `app.json` akurat 100% dengan penggunaan nyata di kode — tidak lebih, tidak kurang.

Status: `PENDING`

---

## RELEASE-002 — Isolasi Environment & Kunci API Klien

Task:

- [ ] Buat `.env.example` dengan `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Cloud, bukan lokal).
- [ ] Pastikan `.env`/`.env.local` masuk `.gitignore`.
- [ ] Audit `frontend/lib/` — pastikan tidak ada URL localhost/secret hardcoded (lihat SEC-001, task ini saling terkait).
- [ ] Konfirmasi `service_role_key` TIDAK PERNAH ada di kode frontend mobile manapun.

Status: `PENDING`

---

## RELEASE-003 — UI/UX Quality Gate (Dikoreksi)

Task:

- [ ] Ganti referensi pesan error "QR tidak dikenali, coba lagi" jadi pesan yang sesuai sistem Token sekarang (misal "Token tidak dikenali, coba lagi") — cek `TOKEN-005` sudah pakai wording yang benar atau belum.
- [ ] ~~Item "katalog buku tetap bisa terbuka dari cache lokal saat offline"~~ — DIHAPUS dari scope, sudah diputuskan ditunda di AUDIT-001. Jangan dikerjakan.
- [ ] Konfirmasi dialog konfirmasi sudah muncul sebelum: Hapus Buku, Hapus Anggota, Kembalikan Buku, Tandai Buku Hilang, Keluar Akun. Kalau ada yang belum, tambahkan.
- [ ] Konfirmasi konsistensi ikon (`lucide-react-native`) dan tema (`lib/theme.ts`) di seluruh layar — ini seharusnya sudah konsisten karena desain custom (Editorial Vector) sedang ditunda, app pakai Material Design 3 standar.

Status: `PENDING`

---

## RELEASE-004 — Typecheck, Test & Bundle Export

Task:

- [ ] `npx tsc --noEmit` di `frontend/` — 0 error.
- [ ] Jalankan test suite yang ada di `frontend/scripts/`.
- [ ] `npx expo export --platform android` — pastikan bundle berhasil tanpa circular dependency error.

Status: `PENDING`

---

## RELEASE-005 — Dokumen Play Store (Dikoreksi)

Task:

- [ ] `PRIVACY_POLICY.md` — isi harus AKURAT dengan penggunaan kamera yang sebenarnya (hasil RELEASE-001), bukan asumsi lama. Jelaskan penggunaan Email untuk identitas akun.
- [ ] `PLAYSTORE_METADATA.md` — HAPUS/PERBAIKI klaim "offline-first" di deskripsi (sudah ditunda, jangan janjikan fitur yang belum ada — ini juga isu Play Store policy soal deskripsi yang menyesatkan). HAPUS/PERBAIKI juga penyebutan "barcode scanner" sebagai fitur utama kalau kamera memang sudah tidak dipakai — sesuaikan dengan sistem Token yang sekarang aktif.

Status: `PENDING`

---

## Regression — Security & Release

- [ ] Build APK/AAB hasil `expo export` diinstall & dites manual di device fisik — pastikan tidak ada fitur yang rusak akibat penghapusan dependency kamera (kalau memang dihapus).
- [ ] Cek ulang tidak ada secret/URL lokal yang ke-bundle ke build final.

Status: `PENDING`



