# ANTIGRAVITY\_TASK.md

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
- [ ] Jangan mengubah behavior tanpa kebutuhan.
- [ ] Setelah tersedia data uji overdue, lakukan verification.

Status:

`BLOCKED — menunggu data uji buku terlambat`

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
- [ ] Jangan mengklaim PASS tanpa data uji nyata.

Status: `BLOCKED — menunggu data uji`

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

- [ ] Cek struktur role yang ada sekarang (hasil investigasi) — kemungkinan besar baru ada Owner/Member.
- [ ] Tambahkan nilai role baru "Admin" di antara Owner dan Member.
- [ ] Pastikan migrasi data existing: semua member yang ada sekarang tetap berstatus Member (tidak otomatis jadi Admin).

Acceptance:

- [ ] Role tersimpan sebagai salah satu dari: Owner, Admin, Member.
- [ ] Data member lama tidak berubah rolenya secara tidak sengaja setelah migrasi.

Status: `PENDING`

---

## ROLE-002 — Backend/API Authorization

Task:

- [ ] Untuk setiap endpoint/fungsi mutasi data (Buku, Peminjaman, Anggota, Pengaturan Perpustakaan), tambahkan pengecekan role sesuai matrix di atas.
- [ ] Endpoint invite member: hanya Owner & Admin.
- [ ] Endpoint remove member: hanya Owner & Admin; Admin tidak boleh remove Owner (validasi di level backend, bukan cuma UI).
- [ ] Endpoint promote ke Admin: hanya Owner.
- [ ] Semua aturan ini WAJIB dicek juga di backend/API, bukan cuma UI, supaya tidak bisa dilewati lewat request langsung.

Acceptance:

- [ ] Request mutasi dari role yang tidak berwenang ditolak di level backend.
- [ ] Admin yang mencoba remove Owner via API langsung → ditolak.

Status: `PENDING`

---

## ROLE-003 — UI Enforcement

Task:

- [ ] Member: sembunyikan/disable semua tombol tambah/edit/hapus di halaman Buku, Peminjaman, Anggota, Pengaturan — tampilkan sebagai view-only.
- [ ] Member: tetap tampilkan & aktifkan tombol export laporan dan generate barcode.
- [ ] Admin: semua tombol aktif kecuali "keluarkan Owner" dan "tambah/promote Admin".
- [ ] Owner: semua tombol aktif tanpa pengecualian.
- [ ] Pastikan perubahan role langsung ter-refresh di UI tanpa perlu logout/restart.

Acceptance:

- [ ] UI Member benar-benar view-only + export laporan + barcode saja.
- [ ] UI Admin tidak bisa remove Owner atau promote Admin baru.
- [ ] UI Owner punya akses penuh.

Status: `PENDING`

---

## ROLE-004 — Invite & Remove Member Flow

Task:

- [ ] Update flow undang member (dari LIB-001/003) agar hanya bisa dilakukan Owner & Admin.
- [ ] Update flow remove member agar hanya bisa dilakukan Owner & Admin, dengan Owner tidak bisa jadi target remove sama sekali.
- [ ] Tambahkan UI untuk Owner promote Member jadi Admin — hanya Owner yang lihat opsi ini.

Acceptance:

- [ ] Alur invite/remove tetap berjalan seperti LIB-001/003 sebelumnya, ditambah pengecekan role di atas.
- [ ] Tidak ada regresi pada flow invitation yang sudah PASS sebelumnya.

Status: `PENDING`

---

# PHASE 15 — Barcode (Fitur Baru)

## BARCODE-001 — Generate & Print Barcode Salinan Buku

**Status: menunggu konfirmasi scope — lihat pertanyaan di chat.** Task di bawah berdasarkan asumsi awal, sesuaikan setelah dikonfirmasi.

Masalah:

Belum ada barcode yang bisa di-print untuk discan — kemungkinan besar terkait pemilihan salinan buku saat Peminjaman, berbasis "Kode" dari LOAN-008.

Task (asumsi awal):

- [ ] Generate barcode/QR code yang meng-encode "Kode" salinan buku dari LOAN-008.
- [ ] Sediakan halaman/tombol untuk print barcode — per salinan atau batch per judul.
- [ ] Tambahkan fitur scan barcode di halaman Peminjaman untuk langsung memilih salinan (mempercepat LOAN-005), kalau device support kamera/scanner.
- [ ] Sesuai role matrix: tombol generate/print barcode tetap terlihat & aktif untuk Member.

Acceptance:

- [ ] Barcode ter-generate dan valid untuk di-scan.
- [ ] Hasil print rapi dan barcode terbaca scanner umum.
- [ ] Member tetap bisa akses fitur ini.

Status: `PENDING`

---

# PHASE 16 — Regression Test Round 2

Setelah PHASE 9–15 selesai, jalankan regression menyeluruh — flow lama PHASE 7 (Flow 1–5) DITAMBAH flow baru berikut:

### Flow 6 — Login & Pemilihan Perpustakaan
1. Login sebagai user dengan 1 perpustakaan → harus berhenti dulu di halaman pemilihan.
2. Login sebagai user dengan beberapa perpustakaan → semua muncul di halaman pemilihan.
3. Login sebagai user dengan undangan pending → undangan muncul, bisa diterima/tolak.

### Flow 7 — Peminjaman End-to-End (Setelah Update)
1. Tambah peminjaman → pilih judul → pilih salinan (LOAN-005).
2. Filter berdasarkan Rak → hasil sesuai (LOAN-006).
3. Pilih tanggal lewat date picker (LOAN-007).
4. Salinan tampil sebagai `Kode: XXXX`, bukan ID mentah (LOAN-008).
5. Setelah peminjaman tersimpan, Dashboard & halaman Buku ter-update tanpa restart (regresi BOOK-003/LOAN-002 round 1 — pastikan masih PASS).

### Flow 8 — Role & Permission
1. Login sebagai Member → coba akses tambah/edit/hapus di semua halaman → harus terblokir di UI DAN via API langsung.
2. Login sebagai Admin → coba remove Owner → ditolak. Coba remove Member biasa → berhasil.
3. Login sebagai Owner → promote Member jadi Admin → berhasil, role langsung ter-refresh tanpa restart.
4. Member → export laporan & generate barcode → tetap berhasil meski view-only untuk fitur lain.

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


