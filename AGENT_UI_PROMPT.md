# AGENT_UI_PROMPT.md — Azelheim UI Implementation Rules

Dokumen ini adalah aturan permanen untuk setiap pekerjaan UI pada aplikasi Azelib.

## 1. Sumber Kebenaran

Baca dan patuhi sumber berikut dengan urutan:

1. `AGENTS.md` — aturan teknis, architecture, library, API, behavior, role, dan Definition of Done.
2. `ANTIGRAVITY_TASK.md` — task, acceptance criteria, regression, status, dan keputusan historis.
3. `bagan.md` — struktur project dan nama file/route existing.
4. `azelheim_style.md` — design system Azelheim.
5. `IMPLEMENTATION.md` — mapping prototype → React Native.
6. `azelheim_preview.html` — referensi utama layout, visual state, dan UI interaction.

`AGENT_UI_PROMPT.md` hanya mengatur pekerjaan UI. Jangan menggunakannya untuk menggantikan aturan teknis di `AGENTS.md`.

---

## 2. Scope Permanen

Semua pekerjaan berdasarkan dokumen ini adalah **UI / presentation / interaction**.

Yang boleh diubah:
- visual styling
- layout dan spacing
- typography
- color
- border dan radius
- icon
- reusable UI component
- visual state
- accessibility/readability yang berhubungan langsung dengan UI
- micro-interaction
- animation UI
- responsive behavior
- keyboard/input interaction

Yang tidak boleh diubah tanpa task eksplisit:
- business logic
- database/schema
- API endpoint
- API contract
- auth/session
- state/data flow
- role/permission logic
- navigation architecture
- data model
- existing route behavior
- nama file existing
- nama route existing

Jika perubahan tidak jelas masuk scope UI, gunakan:

`SCOPE CHECK REQUIRED`

Jangan menebak atau mengerjakan perubahan tersebut otomatis.

---

## 3. File Safety

Pertahankan struktur project existing.

Jangan:
- rename file existing hanya untuk mengikuti nama screen prototype
- delete file existing tanpa task eksplisit
- membuat route baru hanya demi prototype
- membuat database migration untuk kebutuhan styling
- mengubah API contract
- menambah dependency besar tanpa alasan teknis yang jelas

Sebelum coding, tentukan:

`FILES TO CHANGE`

Setelah coding, laporkan:

`FILES CHANGED`

Gunakan file existing sebagai target utama perubahan.

---

## 4. Prototype Rule

`azelheim_preview.html` adalah referensi visual dan interaction.

Gunakan untuk meniru:
- layout
- hierarchy
- spacing
- component composition
- proportions
- typography hierarchy
- card composition
- button treatment
- input treatment
- tabs
- badge
- header
- bottom navigation
- FAB
- dialog presentation
- toast/snackbar presentation
- active/inactive states
- loading/empty states
- dark/light mode
- micro-interaction

Jangan menyalin:
- fake API
- fake sync
- dummy business logic
- browser-only JavaScript
- demo-only state
- hardcoded mock behavior sebagai logic production

Prototype memberi **arah visual**, bukan sumber business logic.

Target implementasi:

`Azelib existing behavior + Azelheim visual system`

---

## 5. Visual Fidelity

Targetkan **high visual fidelity** terhadap `azelheim_preview.html`.

Jangan membuat creative redesign yang menjauh dari prototype.

Jangan menambahkan:
- gradient
- glassmorphism
- neumorphism
- heavy shadow
- 3D illustration
- glossy icon
- neon color tanpa semantic purpose
- dekorasi baru yang tidak dibutuhkan

Pertahankan karakter:
- flat
- editorial
- hairline border
- micro-radius
- whitespace
- technical metadata
- restrained dot-grid
- corner-cross
- monospace labels
- clear visual hierarchy

Jika prototype dan screen existing berbeda:

**pertahankan behavior existing, sesuaikan presentation-nya.**

---

## 6. Responsive UI Requirements

UI tidak boleh bergantung pada fixed pixel dimensions sebagai dasar utama layout.

Gunakan bila relevan:
- `useWindowDimensions()`
- flexbox
- responsive spacing
- percentage sizing
- `minWidth`
- `maxWidth`
- `minHeight`
- `maxHeight`
- content-based sizing
- safe-area-aware layout

Gunakan fixed dp hanya untuk hal yang memang perlu stabil, misalnya:
- border thickness
- icon stroke consistency
- minimum touch target
- elemen kecil yang memang harus konsisten

Jangan membuat layout yang terlihat benar hanya pada satu device.

Target konsistensi antar-device:
- visual hierarchy
- alignment
- proportions
- spacing relationship
- readability
- touch target

Bukan angka pixel mentah.

Jangan memperbaiki device-specific issue dengan offset khusus device tanpa memahami root cause.

---

## 7. Touch Target & Control Sizing

Pisahkan antara:

`VISUAL SIZE`

dan

`TOUCH TARGET SIZE`

Interactive control harus nyaman disentuh. Gunakan baseline sekitar 44dp atau lebih bila memungkinkan dan sesuai kebutuhan platform.

Perbesar container control sebelum memperbesar glyph icon.

Berlaku untuk:
- icon button
- search button
- filter button
- tabs
- bottom navigation item
- FAB
- action button
- small controls

Jangan membuat icon besar tetapi touch area kecil.
Jangan membuat touch area besar tetapi menyebabkan clipping atau overflow.

---

## 8. Header / Top Navigation

Header harus memiliki vertical breathing room.

Pastikan:
- safe area terhitung
- title tidak menempel pada border
- technical metadata memiliki jarak yang cukup
- action group vertically centered
- action group tidak overflow
- icon kanan tidak terpotong
- bottom border tidak terlalu dekat dengan content
- title/version/action group tetap muat pada device lebih sempit

Struktur visual:
- title / brand di kiri
- technical metadata di bawah
- theme / settings / logout di kanan

Jangan menyelesaikan clipping hanya dengan margin acak. Cari root cause pada available width, padding, flex, shrink, safe area, dan alignment.

---

## 9. Bottom Navigation

Urutan wajib tetap:
- Dashboard
- Buku
- Peminjaman
- Anggota
- Laporan

Navigation item harus:
- memakai responsive equal distribution
- punya touch area yang nyaman
- mempunyai icon yang mudah dilihat
- memiliki label yang terbaca
- memiliki jarak icon ↔ label yang cukup
- memiliki active state yang jelas

Jangan menggunakan fixed item width jika menyebabkan overflow.
Jangan mengubah navigation behavior hanya demi kemiripan visual.

---

## 10. Input / Textbox

Input harus compact dan nyaman.

Hindari:
- vertical padding berlebihan
- textbox terlalu tinggi
- input yang terlihat seperti card besar
- fixed height yang memaksa semua device memakai ukuran identik

Gunakan:
- responsive control height
- min/max constraint bila relevan
- padding horizontal yang konsisten
- typography yang mengikuti design system

Input focus state harus terlihat tetapi tetap flat/editorial.
Keyboard avoiding harus selalu diperhitungkan.

---

## 11. Smart Keyboard Auto-Scroll

Keyboard tidak boleh menutupi `TextInput` yang sedang aktif.

Jangan mengandalkan `KeyboardAvoidingView` sederhana yang hanya menggeser seluruh form sedikit.

Behavior yang diharapkan:

`User fokus TextInput`
→ keyboard muncul
→ posisi field aktif diketahui
→ area keyboard diperhitungkan
→ jika field/label terlalu dekat atau tertutup
→ form auto-scroll
→ field aktif tetap terlihat
→ ada breathing room di atas keyboard
→ user dapat langsung mengetik

Target behavior:
- field aktif visible
- label aktif idealnya tetap visible
- jangan berhenti tepat pada batas keyboard
- jangan menggeser seluruh form secara berlebihan
- scroll harus terasa halus
- posisi setelah keyboard ditutup tetap masuk akal
- pindah antar-field tetap nyaman

Gunakan abstraction existing:

`frontend/lib/components/AppKeyboardAvoidingView.tsx`

Bila memungkinkan secara architecture, perbaiki abstraction tersebut secara universal agar semua form mendapatkan behavior yang sama.

Jangan membuat solusi keyboard terpisah per halaman tanpa alasan.

Audit wajib mencakup semua layar yang memiliki input, termasuk minimal:
- Login
- Tenant Setup
- Tambah/Edit Buku
- Peminjaman
- Anggota
- Pengaturan
- Input Token Pengunjung

---

## 12. Micro-Interaction & Animation

Gunakan micro-interaction yang ringan dan konsisten.

Button:
- press scale sekitar `0.94–0.96`
- release dengan spring ringan

Icon Button:
- subtle press scale
- tidak terlalu agresif

Tabs:
- active state transition
- opacity/transform ringan

Bottom Navigation:
- active icon sedikit translateY
- subtle scale
- active label lebih dominan

Theme Toggle:
- rotate transition sekitar `300–350ms`

FAB:
- press scale
- rotate ringan bila relevan

Screen Transition:
- fade
- translateY kecil sekitar `6–8dp`

Input:
- focus state jelas
- tanpa glow berlebihan

Utamakan `react-native-reanimated` sesuai design system.

Animasi utama harus berbasis:
- `transform`
- `opacity`

Hindari:
- looping animation tanpa alasan
- animasi list panjang tanpa virtualisasi
- blur berat
- animation untuk fake backend process
- animation yang mengubah business logic

---

## 13. Safe Area & Clipping

Audit setiap komponen yang memiliki:
- icon
- action button
- header
- bottom navigation
- FAB
- filter
- input

Periksa:
- safe area
- parent width
- horizontal padding
- `flexShrink`
- `flexGrow`
- `overflow`
- right inset
- bottom inset
- Android gesture/navigation area

Tidak boleh ada:
- icon terpotong
- button keluar layar
- text terpotong
- filter menyentuh edge
- FAB tertutup navigation bar

Jangan menggunakan hardcoded offset sebagai patch default.

---

## 14. Reusable UI

Gunakan reusable component/theme bila pola visual muncul di banyak screen.

Contoh:
- `AzelheimScreen`
- `AzelheimHeader`
- `AzelheimCard`
- `AzelheimButton`
- `AzelheimBadge`
- `AzelheimInput`
- `AzelheimTabs`
- `AzelheimSectionHeader`
- `AzelheimMetaBox`
- `AzelheimFab`
- `AzelheimBottomNav`
- `AzelheimDialog`
- `AzelheimToast`

Jika component existing sudah cocok, gunakan dan theme ulang daripada membuat duplicate component.

---

## 15. Screen Mapping

Gunakan file existing dari `bagan.md`.

Mapping utama:
- Gate → `frontend/app/index.tsx`
- Login → `frontend/app/login.tsx`
- Tenant Setup → `frontend/app/tenant-setup.tsx`
- Guest → `frontend/app/pengunjung.tsx`
- Dashboard → `frontend/app/(admin)/dashboard.tsx`
- Buku → `frontend/app/(admin)/buku.tsx`
- Detail Buku → `frontend/app/(admin)/buku-detail.tsx`
- Peminjaman → `frontend/app/(admin)/peminjaman.tsx`
- Anggota → `frontend/app/(admin)/anggota.tsx`
- Detail Anggota → `frontend/app/(admin)/anggota-detail.tsx`
- Laporan → `frontend/app/(admin)/laporan.tsx`
- Pengaturan → `frontend/app/(admin)/pengaturan.tsx`

Prototype screen yang tidak memiliki file satu-per-satu harus dipetakan ke existing screen/state yang paling sesuai.

Jangan rename existing file atau route.

---

## 16. Role & Permission

UI tidak boleh mengubah permission logic.

UI hanya:
- menampilkan action yang memang tersedia
- menyembunyikan atau disable action sesuai permission existing
- menunjukkan state role dengan jelas

Jangan menjadikan UI hiding sebagai security layer.
Jangan mengubah role/permission hanya demi prototype.

---

## 17. Interaction Safety

Boleh mereplikasi interaction prototype yang murni visual:
- press feedback
- tab animation
- active navigation
- theme toggle
- FAB feedback
- screen transition
- focus state
- toast/snackbar presentation
- dialog presentation
- loading/skeleton presentation

Tidak boleh mereplikasi:
- fake API
- fake sync
- fake database mutation
- dummy business logic
- browser-only logic

Gunakan state, API, navigation, dan data layer existing.

---

## 18. Scope Safety

Jika menemukan kebutuhan untuk:
- mengubah database
- mengubah schema
- mengubah API
- mengubah auth/session
- mengubah role/permission
- mengubah navigation architecture
- rename file
- create route baru
- menambah dependency besar
- mengubah business logic

Berhenti pada bagian tersebut dan tulis:

`SCOPE CHECK REQUIRED`

Jelaskan:
- file terkait
- existing behavior
- kebutuhan prototype
- konflik
- usulan minimal yang UI-only

Jangan menebak.

---

## 19. Verification Permanen

Setiap batch UI wajib diverifikasi.

Minimal:
- typecheck
- lint
- relevant tests
- navigation regression
- role/permission regression

Untuk UI yang berhubungan dengan layout/input:
- light mode
- dark mode
- keyboard
- font scaling
- safe area
- device width variation

Jangan menganggap build sukses sebagai bukti selesai.

---

## 20. Visual Comparison

Gunakan metode:

`Prototype → Existing → Implemented`

Bandingkan:
- overall composition
- spacing
- typography
- color
- border
- radius
- icon
- card size
- button size
- alignment
- hierarchy
- navigation
- active state
- loading state
- empty state
- dark mode
- light mode
- interaction feel

Targetnya adalah high visual fidelity, bukan sekadar “terinspirasi”.

---

## 21. Performance

Hindari:
- animation looping tanpa alasan
- animasi list panjang tanpa virtualisasi
- blur berat
- perubahan layout besar saat animation
- dependency baru yang tidak perlu

Prioritaskan `transform` dan `opacity` untuk animation.

---

## 22. Final Report

Setiap pekerjaan UI yang mengikuti prompt ini sebaiknya melaporkan:

### Files Changed

...

### Screens Updated

...

### UI Changes

...

### Interactions Implemented

...

### Business Logic

`Tidak diubah.`

### Architecture

`Tidak diubah.`

### Verification

- Typecheck:
- Lint:
- Tests:
- Navigation:
- Role/Permission:
- Light Mode:
- Dark Mode:
- Keyboard:
- Font Scaling:
- Safe Area:
- Responsive Check:
- Visual Comparison:

### Remaining Visual Gaps

...
