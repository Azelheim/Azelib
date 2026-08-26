# Azelheim — IMPLEMENTATION.md

> Peta implementasi UI Azelheim untuk proyek **Azelib**.
>
> Dokumen ini menghubungkan tiga hal: `azelheim_style.md` sebagai kontrak visual, `azelheim_preview.html` sebagai referensi layout/interaksi konkret, dan struktur file proyek yang sudah ada sebagai target implementasi.
>
> **Fokus dokumen ini hanya UI/UX:** layout, styling, component composition, visual states, micro-interaction, dan presentational behavior. Business logic, API contract, auth rules, database, dan state/data flow tetap mengikuti `AGENTS.md` serta `ANTIGRAVITY_TASK.md`.

---

## 0. Aturan Emas

### Sumber kebenaran

Gunakan prioritas berikut ketika ada perbedaan:

1. `ANTIGRAVITY_TASK.md` — behavior, acceptance criteria, flow produk.
2. `AGENTS.md` — arsitektur, stack, routing, React Native Paper, API/data contract.
3. `azelheim_style.md` — design system visual.
4. `azelheim_preview.html` — referensi konkret untuk composition, spacing, hierarchy, visual states, dan UI actions.
5. Kode existing — sumber kebenaran untuk nama file, route, state, dan integration point yang benar-benar sudah ada.

`AGENTS.md` mewajibkan inspect codebase terlebih dahulu, mempertahankan arsitektur yang sudah digunakan, dan memasang theme lewat `PaperProvider` sebagai satu sumber tema. fileciteturn5file1L59-L74 fileciteturn5file4L207-L216

### Jangan rename file

**Nama file yang sudah ada di proyek ini dianggap stabil.**

Refactor boleh mengubah isi, struktur komponen internal, atau memindahkan reusable component ke folder baru, tetapi **jangan mengganti nama file route utama berikut hanya karena prototype HTML memakai nama berbeda:**

```text
frontend/app/_layout.tsx
frontend/app/index.tsx
frontend/app/login.tsx
frontend/app/pengunjung.tsx
frontend/app/tenant-setup.tsx
frontend/app/(admin)/_layout.tsx
frontend/app/(admin)/dashboard.tsx
frontend/app/(admin)/buku.tsx
frontend/app/(admin)/buku-detail.tsx
frontend/app/(admin)/peminjaman.tsx
frontend/app/(admin)/anggota.tsx
frontend/app/(admin)/anggota-detail.tsx
frontend/app/(admin)/laporan.tsx
frontend/app/(admin)/pengaturan.tsx
```

Prototype boleh memiliki konsep `gate`, `books`, `settings`, `guest`, dan sebagainya; saat implementasi, semua konsep tersebut **dipetakan ke nama file existing** di atas.

### Prinsip utama

```text
HTML prototype
    ↓
referensi visual + composition + interaction pattern
    ↓
React Native existing routes
    ↓
production business logic tetap utuh
```

Jangan copy mentah:

- dummy data
- fake navigation
- fake sync
- fake validation
- browser-only CSS
- DOM manipulation
- `setTimeout` untuk sinkronisasi produksi
- state prototype yang menggandakan source of truth

Aturan proyek memang melarang workaround seperti fake refresh, duplicate state, force reload, dan sinkronisasi berbasis `setTimeout`. fileciteturn5file1L61-L74

---

# 1. Struktur Implementasi Berdasarkan Bagan Proyek Aktual

Gunakan struktur proyek yang sudah ada sebagai target utama. **Boleh menambah folder komponen/style baru, tetapi jangan mengubah nama file route yang tercantum di bagan.**

```text
Azelib/
├── AGENTS.md
├── ANTIGRAVITY_TASK.md
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx               ← APP SHELL + PaperProvider + global theme
│   │   ├── index.tsx                 ← GERBANG / ENTRY SCREEN
│   │   ├── login.tsx                 ← LOGIN
│   │   ├── pengunjung.tsx            ← GUEST TOKEN / PUBLIC CATALOG ENTRY
│   │   ├── tenant-setup.tsx          ← PILIH / BUAT PERPUSTAKAAN
│   │   └── (admin)/
│   │       ├── _layout.tsx           ← ADMIN SHELL + 5 TAB NAV
│   │       ├── dashboard.tsx         ← DASHBOARD
│   │       ├── buku.tsx              ← DAFTAR BUKU
│   │       ├── buku-detail.tsx       ← DETAIL / EDIT BUKU
│   │       ├── peminjaman.tsx        ← DAFTAR PEMINJAMAN
│   │       ├── anggota.tsx           ← DAFTAR ANGGOTA
│   │       ├── anggota-detail.tsx    ← DETAIL / EDIT ANGGOTA
│   │       ├── laporan.tsx           ← LAPORAN
│   │       └── pengaturan.tsx        ← PENGATURAN PERPUSTAKAAN
│   │
│   ├── lib/
│   │   ├── theme.ts                 ← PRIMARY THEME ENTRY POINT
│   │   ├── types.ts                 ← JANGAN UBAH KARENA VISUAL
│   │   ├── db.ts                    ← JANGAN UBAH KARENA VISUAL
│   │   ├── session.ts               ← JANGAN UBAH KARENA VISUAL
│   │   ├── supabase.ts              ← JANGAN UBAH KARENA VISUAL
│   │   ├── api/
│   │   │   └── apiClient.ts         ← JANGAN UBAH KARENA VISUAL
│   │   ├── components/
│   │   │   ├── AppKeyboardAvoidingView.tsx
│   │   │   └── azelheim/             ← TAMBAHKAN REUSABLE UI DI SINI
│   │   ├── context/
│   │   │   └── TenantContext.tsx    ← JANGAN UBAH BUSINESS FLOW
│   │   └── qr/
│   │       └── ...                  ← legacy/feature-specific; jangan disentuh untuk styling kecuali layar terkait
│   │
│   ├── assets/
│   ├── scripts/
│   ├── android/
│   ├── app.json
│   ├── eas.json
│   ├── package.json
│   └── ...
│
├── supabase/
└── strix_runs/
```

Struktur tersebut mengikuti bagan proyek yang diberikan dan mempertahankan nama file route existing. fileciteturn6file0L6-L43

---

# 2. Folder Baru yang Disarankan: `frontend/lib/components/azelheim/`

Prototype sebaiknya **tidak** diterjemahkan menjadi style ad-hoc di 13 screen. Buat primitives reusable sehingga satu perubahan visual bisa berlaku ke seluruh aplikasi.

```text
frontend/lib/components/azelheim/
├── AzelheimScreen.tsx
├── AzelheimTopBar.tsx
├── AzelheimGateHeader.tsx
├── AzelheimSectionHeader.tsx
├── AzelheimCard.tsx
├── AzelheimButton.tsx
├── AzelheimIconButton.tsx
├── AzelheimInput.tsx
├── AzelheimSearchField.tsx
├── AzelheimTabs.tsx
├── AzelheimBadge.tsx
├── AzelheimMetaBox.tsx
├── AzelheimStatCard.tsx
├── AzelheimListRow.tsx
├── AzelheimBookRow.tsx
├── AzelheimCodeBox.tsx
├── AzelheimStatusRow.tsx
├── AzelheimDialog.tsx
├── AzelheimToast.tsx
├── AzelheimEmptyState.tsx
├── AzelheimFab.tsx
├── AzelheimBottomNav.tsx
├── AzelheimDotGrid.tsx
└── AzelheimTechnicalLabel.tsx
```

### Pembagian tanggung jawab

| Component | Tanggung jawab |
|---|---|
| `AzelheimScreen` | background, padding, dot-grid, scroll shell |
| `AzelheimTopBar` | title, tenant context, theme/settings/logout actions |
| `AzelheimGateHeader` | logo/brand, version tag, system label, hero title |
| `AzelheimSectionHeader` | uppercase section title + `SEC // xx` |
| `AzelheimCard` | border, radius, surface, corner cross |
| `AzelheimButton` | primary/secondary/destructive action style |
| `AzelheimIconButton` | top bar/icon actions |
| `AzelheimInput` | native text input dengan visual Azelheim |
| `AzelheimSearchField` | search variant |
| `AzelheimTabs` | segmented tabs |
| `AzelheimBadge` | status/category badges |
| `AzelheimMetaBox` | dashed metadata container |
| `AzelheimStatCard` | dashboard metrics |
| `AzelheimListRow` | generic list item |
| `AzelheimBookRow` | book-specific list composition |
| `AzelheimCodeBox` | token/code presentation |
| `AzelheimStatusRow` | status + metadata + action cluster |
| `AzelheimDialog` | confirmation/action dialog styling |
| `AzelheimToast` | snackbar/toast presentation |
| `AzelheimEmptyState` | empty state line-art + concise copy |
| `AzelheimFab` | floating create action |
| `AzelheimBottomNav` | fixed 5-tab admin navigation |
| `AzelheimDotGrid` | subtle screen background ornament |
| `AzelheimTechnicalLabel` | JetBrains Mono micro-labels |

---

# 3. Theme Entry Point — `frontend/lib/theme.ts`

`theme.ts` tetap menjadi **single source of truth** untuk React Native Paper. Jangan menyebar warna Azelheim ke banyak file.

### Map aturan style → file

| Style rule | File |
|---|---|
| light/dark color tokens | `frontend/lib/theme.ts` |
| Paper colors | `frontend/lib/theme.ts` |
| roundness | `frontend/lib/theme.ts` |
| zero elevation | `frontend/lib/theme.ts` + reusable components |
| typography family | `frontend/lib/theme.ts` / font provider |
| global component defaults | `frontend/lib/theme.ts` |

Style guide mendefinisikan light mode `#FAFAF9`/`#FFFFFF` dan dark mode `#09090B`/`#121215`, plus token semantik seperti purple, green, red, blue, dan danger. fileciteturn5file2L98-L134

### Jangan lakukan

```tsx
<View style={{ backgroundColor: '#F3EEFF' }} />
```

### Gunakan

```tsx
<View style={{ backgroundColor: theme.colors.azPurple }} />
```

Atau wrapper/primitives yang mengambil token langsung dari theme.

---

# 4. Font Setup

Target file:

```text
frontend/app/_layout.tsx
frontend/lib/theme.ts
frontend/package.json
```

Gunakan:

- Plus Jakarta Sans
- JetBrains Mono

Load font di root/provider. Jangan load ulang per screen.

Android text yang perlu konsisten dapat memakai:

```tsx
includeFontPadding: false
```

Style guide memang meminta font tersebut dan `includeFontPadding: false` agar vertical alignment Android stabil. fileciteturn5file2L138-L143 fileciteturn5file0L23-L26

---

# 5. Global Shell — `_layout.tsx`

## `frontend/app/_layout.tsx`

Gunakan untuk:

- `PaperProvider`
- theme provider/context existing
- font loading
- global toast/snackbar host jika arsitektur existing mendukung
- global keyboard-avoiding wrapper/pattern jika memang sudah tersedia

Jangan memasukkan:

- tenant selection logic baru
- API mutation
- business rules
- fake loading

`AGENTS.md` menetapkan root layout + `PaperProvider` sebagai lokasi theme setup dan melarang style ad-hoc tersebar. fileciteturn5file4L207-L216

---

# 6. Gerbang — `frontend/app/index.tsx`

Prototype HTML adalah referensi paling kuat untuk halaman ini.

## Komposisi

```text
AZELHEIM                         v1.0
SYSTEM // LIBRARY ACCESS
────────────────────────────────────

Satu Aplikasi untuk
Semua Perpustakaan Anda

────────────────────────────────────

MASUK
┌─────────────────────────────────┐
│  [key]  LOGIN                   │
│         Kelola perpustakaan     │
└─────────────────────────────────┘

PENGUNJUNG
Katalog tanpa akun
┌─────────────────────────────────┐
│ TOKEN PERPUSTAKAAN              │
│ [ ABC123________________ ]   →  │
└─────────────────────────────────┘
ACCESS // GUEST
```

### Component map

```text
AzelheimScreen
├── AzelheimGateHeader
├── AzelheimTechnicalLabel
├── AzelheimButton
├── AzelheimCard
├── AzelheimInput / AzelheimCodeBox
└── AzelheimTechnicalLabel
```

### UI actions dari prototype

**Pertahankan sebagai visual/interaction pattern:**

- theme toggle bila prototype menampilkannya di preview shell
- press feedback pada Login
- press/focus feedback pada token field
- arrow/submit action untuk token
- toast/snackbar untuk token invalid

**Jangan copy:**

- fake route switching
- fake token validation
- fake library data

### Catatan flow terkini

Flow Pengunjung pada project sudah bergeser ke **input token manual**, bukan scanner kamera. Implementasi visual harus mengikuti state token input, sementara validation tetap memakai logic existing. fileciteturn4file5L276-L309

---

# 7. Login — `frontend/app/login.tsx`

## Layout

```text
header
  ← BACK / AZELHEIM

AUTH // 01
MASUK KE AKUN

[ Email ]
[ Password ]

[ LOGIN → ]

Buat Akun
Lupa Password
```

### Visual rules

- no hero illustration
- no oversized colorful card
- input border 1–1.2px
- radius 4px
- error text compact
- CTA full-width only if composition prototype menunjukkan itu
- technical label above major sections

### Interaction

- focus state: border/text contrast
- submit press scale
- password reveal icon memakai line icon
- keyboard harus tidak menutupi input

Task UI-002 memang mewajibkan keyboard-avoiding juga untuk auth/login dan token input. fileciteturn4file9L534-L547

---

# 8. Pilih/Buat Perpustakaan — `frontend/app/tenant-setup.tsx`

Prototype equivalent:

```text
libraries
```

Tetap gunakan nama file:

```text
frontend/app/tenant-setup.tsx
```

## Composition

```text
SELECT // LIBRARY

Perpustakaan Anda

┌──────────────────────────────┐
│ Perpustakaan A               │
│ OWNER // ACTIVE          →   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Undangan baru            01  │
└──────────────────────────────┘

[ + BUAT BARU ]
```

### Important

Jangan mengubah flow selection yang sudah ditentukan oleh `LIB-004`/`LIB-005`. UI hanya membungkus state yang sudah benar.

---

# 9. Admin Shell — `frontend/app/(admin)/_layout.tsx`

### Target

```text
TOP BAR
────────────────────────────────
content


bottom nav
DASH  BUKU  PINJAM  ANGGOTA  LAP
```

### Preserve

Urutan bottom navigation **tidak boleh berubah**:

```text
Dashboard
Buku
Peminjaman
Anggota
Laporan
```

Style guide juga menegaskan posisi serta urutan navigation sebagai layout yang dipertahankan. fileciteturn5file7L353-L358

### Component

```text
AzelheimTopBar
AzelheimScreen
AzelheimBottomNav
```

### Active tab

Gunakan:

- textPrimary
- slight icon translateY -2px
- scale 1.15
- purple selection tint hanya bila cocok dengan prototype

Motion rule tersebut berasal dari style guide. fileciteturn5file3L170-L183

---

# 10. Dashboard — `frontend/app/(admin)/dashboard.tsx`

Prototype equivalent:

```text
dashboard
```

## Layout

```text
SECTION // LIBRARY METRICS

┌─────────────────────────────────┐
│ TREN                            │
│ Buku / Peminjam / Denda        │
│                                 │
│      ─╲────╲──╱────             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ TOTAL DENDA                 ... │
│ Rp 125.000                      │
└─────────────────────────────────┘

┌──────────────┐  ┌──────────────┐
│ JUMLAH BUKU  │  │ PEMINJAM     │
│ 240          │  │ 18           │
└──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐
│ DIPINJAM     │  │ TERLAMBAT    │
│ 12           │  │ 03           │
└──────────────┘  └──────────────┘
```

### UI mapping

- large chart card → `AzelheimCard`
- chart context switch → `AzelheimTabs`/segmented control
- monetary metric → `AzelheimStatCard`
- 4 metrics → 2-column grid
- chart line → existing `victory-native` / production data

Style guide hanya mengizinkan sparkline pada Dashboard/Laporan. fileciteturn5file3L162-L166

### Business logic boundary

Jangan mengubah perhitungan dashboard demi menyesuaikan prototype. Misalnya `Buku Terlambat` tetap dihitung real-time sesuai spec backend. fileciteturn4file0L44-L48

---

# 11. Buku — `frontend/app/(admin)/buku.tsx`

Prototype equivalent:

```text
books
```

## Layout

```text
[ SEARCH ]

[ Semua ] [ Kategori ] [ Rak ] [ Status ]

SORT → Judul A-Z

┌─────────────────────────────────┐
│ Pulang                     19/20│
│ Leila S. Chudori               │
│                                  │
│ CAT // ROMANCE   RAK: 02        │
└─────────────────────────────────┘
```

### Rules

- Filter tabs di atas list.
- Search tidak boleh terlihat seperti card besar.
- Stock counter pakai JetBrains Mono.
- Badge kecil, bukan pill besar.
- List harus terasa seperti katalog editorial.

### Existing requirement

Item Buku tetap menampilkan Judul, Penulis, Kategori, dan Salinan `tersedia/total`; filter/sort existing tidak boleh berubah. fileciteturn4file1L59-L66

---

# 12. Detail Buku — `frontend/app/(admin)/buku-detail.tsx`

Prototype equivalent:

```text
bookdetail
```

## Layout

```text
← BUKU                     EDIT

BOOK // DETAIL

Pulang
Leila S. Chudori

┌──────────────────────────────┐
│ COVER / IMAGE AREA           │
└──────────────────────────────┘

METADATA
ISBN          978...
PENERBIT      Kepustakaan
TAHUN         2012
KATEGORI      Romance
RAK           02

SINOPSIS
...

[ CETAK KODE ]
```

### Visual emphasis

- Title > author > metadata.
- Metadata technical.
- destructive delete must remain separate and semantically obvious.
- Do not visually turn every field into its own giant card.

---

# 13. Peminjaman — `frontend/app/(admin)/peminjaman.tsx`

Prototype equivalent:

```text
loan
```

## Layout

```text
[ AKTIF 02 ] [ TERLAMBAT 01 ] [ RIWAYAT ]

┌─────────────────────────────────┐
│ Rumi                            │
│ Pulang — Leila S. Chudori       │
│ STATUS // AKTIF                 │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ PINJAM: 2026-08-18         │ │
│ │ TEMPO: 2026-08-25          │ │
│ └─────────────────────────────┘ │
│                                 │
│ [ KEMBALIKAN ] [ TANDAI HILANG ]│
└─────────────────────────────────┘
```

### Important

Tombol **Kembalikan** tetap di kiri dan **Tandai Hilang** di kanan, sesuai visual contract existing. fileciteturn5file7L353-L358

Gunakan `AzelheimMetaBox` untuk tanggal.

---

# 14. Form Peminjaman — tetap di `frontend/app/(admin)/peminjaman.tsx`

**Jangan membuat `peminjaman-form.tsx` hanya karena prototype memiliki screen `loanform`.**

Gunakan:

```text
peminjaman.tsx
    ├── list state
    └── modal/sheet/form state
```

atau pola existing project jika sudah berbeda.

### Visual pattern

```text
LOAN // NEW

Anggota
[ Pilih anggota ... ]

Buku
[ Pilih buku ... ]

Tanggal Pinjam
[ ... ]

Jatuh Tempo
[ ... ]

────────────────────────

[ BATAL ]     [ SIMPAN ]
```

Semua field tetap memakai `AzelheimInput`/select pattern.

Jangan mengubah business logic due date hanya untuk meniru prototype.

---

# 15. Anggota — `frontend/app/(admin)/anggota.tsx`

Prototype equivalent:

```text
members
```

## Layout

```text
[ SEARCH ANGGOTA ]

[ SEMUA ] [ MEMINJAM ] [ TIDAK ]

┌─────────────────────────────────┐
│ ANG-00001                       │
│ Agung Prawira                   │
│ Guru                            │
│ 08123456789                 →  │
└─────────────────────────────────┘
```

Use:

- technical member number
- person name as visual primary
- role/category as small badge
- contact secondary

---

# 16. Detail Anggota — `frontend/app/(admin)/anggota-detail.tsx`

Prototype equivalent:

```text
memberdetail
```

## Layout

```text
← ANGGOTA                     EDIT

MEMBER // ANG-00001

Agung Prawira
Guru

CONTACT
0812...
ALAMAT
...

RIWAYAT PEMINJAMAN
┌──────────────────────────────┐
│ Pulang                   ... │
│ STATUS // RETURNED           │
└──────────────────────────────┘
```

Do not change delete/soft-delete behavior. UI only presents the existing state.

---

# 17. Laporan — `frontend/app/(admin)/laporan.tsx`

Prototype equivalent:

```text
reports
```

## Layout

```text
REPORT // 01

[ PEMINJAMAN ] [ DENDA ] [ BUKU ]

PERIODE
[ 01/08/2026 ] — [ 31/08/2026 ]

┌──────────────────────────────┐
│ SUMMARY                      │
│ ...                          │
└──────────────────────────────┘

[ EXPORT PDF ]
```

### Sparkline

Boleh digunakan di laporan summary, tetapi **bukan di setiap card**. fileciteturn5file3L162-L166

### Export action

Visual prototype boleh menampilkan dialog:

```text
EXPORT PDF

[ SIMPAN ]
[ BAGIKAN ]
[ BATAL ]
```

Behavior production tetap mengikuti task export existing. Jangan membuat auto-save atau auto-share. 

---

# 18. Pengaturan — `frontend/app/(admin)/pengaturan.tsx`

Prototype equivalent:

```text
settings
```

## Layout sections

```text
SETTINGS // LIBRARY

PERPUSTAKAAN
┌──────────────────────────────┐
│ Nama                        │
│ Alamat                      │
└──────────────────────────────┘

AKSES PENGUNJUNG
┌──────────────────────────────┐
│ TOKEN // 6 CHAR              │
│                              │
│       ABC123                 │
│                              │
│ [ REFRESH ]                  │
└──────────────────────────────┘

MEMBERS
...

PEMINJAMAN
...

DENDA
...
```

### Token presentation

Gunakan `AzelheimCodeBox`.

State visual:

```text
loading/unverified  → blur/muted + refresh indicator
verified            → clear token
offline             → remain blurred if requirement masih berlaku
staff               → token visible, refresh hidden/disabled
```

Task token memang membedakan permission refresh Owner/Admin vs Staff. fileciteturn4file7L398-L416

---

# 19. Pengunjung — `frontend/app/pengunjung.tsx`

Nama file **tetap `pengunjung.tsx`** walaupun prototype memisahkan konsep token dan guest catalog.

## Mode yang harus ditampung

```text
pengunjung.tsx
├── token entry state
└── guest catalog state
```

Atau gunakan nested internal components jika state machine existing lebih cocok.

### Token state

```text
GUEST ACCESS

Masukkan token perpustakaan

┌──────────────────────────────┐
│ ABC123                  →    │
└──────────────────────────────┘

ACCESS // READ ONLY
```

### Catalog state

```text
GUEST // CATALOG

[ SEARCH BUKU ]

[ RAK ] [ SEMUA ] [ KATEGORI ]

┌──────────────────────────────┐
│ Pulang                       │
│ Leila S. Chudori             │
│ Romance · Rak 02             │
│ STATUS // TERSEDIA           │
└──────────────────────────────┘
```

Production behavior harus mengikuti token flow existing: token valid → guest catalog, token salah → error, tidak ada scanner kamera di flow ini. fileciteturn4file5L284-L309

---

# 20. Guest Book Detail — tetap di `frontend/app/pengunjung.tsx`

Jika prototype mempunyai `guestbook`, **jangan membuat `guest-book-detail.tsx`** hanya untuk menyamakan nama.

Gunakan:

- route params/state existing
- conditional detail view
- nested component

Layout:

```text
← KATALOG

Pulang
Leila S. Chudori

ROMANCE · RAK 02

SINOPSIS
...

STATUS // TERSEDIA

[ KELUAR PERPUSTAKAAN ]
```

Public fields tetap mengikuti spec public catalog. fileciteturn4file1L68-L71

---

# 21. Interaction Map dari Prototype → Production UI

| Prototype interaction | Implementasi RN |
|---|---|
| hover | jangan dipaksakan ke mobile; gunakan pressed/focused state |
| active tab | `AzelheimTabs` |
| button press | Reanimated scale 0.94 |
| icon pop | Reanimated scale 1.2 |
| theme rotate | Reanimated rotate 360° |
| FAB rotate | Reanimated rotate + scale |
| screen fade | screen-level transition bila kompatibel dengan Expo Router existing |
| toast | existing Snackbar/Toast host dengan visual Azelheim |
| modal | existing Dialog/Portal dengan theme Azelheim |
| segmented filter | `AzelheimTabs` |
| dashed metadata | `AzelheimMetaBox` |
| code/token | `AzelheimCodeBox` |
| active bottom nav icon | translateY -2 + scale 1.15 |

Motion values tersebut berasal dari style guide. fileciteturn5file3L170-L183

---

# 22. Motion Implementation — `react-native-reanimated`

Gunakan hanya:

- `transform`
- `opacity`

Jangan menganimasi:

- width
- height
- margin
- padding
- layout-dependent properties

### Press

```text
scale → 0.94
```

### Icon

```text
scale → 1.20
```

### Theme toggle

```text
rotate 360°
300–350ms
```

### FAB

```text
rotate 90°
scale 0.90
```

### Screen

```text
opacity 0 → 1
translateY 8 → 0
200–250ms
```

### Navigation icon

```text
translateY -2px
scale 1.15
```

Sesuai style guide. fileciteturn5file3L170-L183

---

# 23. Zero-Shadow Enforcement

Audit seluruh komponen Azelheim:

```text
AzelheimCard
AzelheimButton
AzelheimInput
AzelheimBadge
AzelheimTabs
AzelheimFab
AzelheimBottomNav
```

Target:

```tsx
elevation: 0
shadowOpacity: 0
```

Prototype preview boleh memakai shadow pada **device frame**, tetapi shadow tersebut jangan dibawa ke component production. Style guide secara eksplisit menetapkan zero-shadow pada komponen. fileciteturn5file3L154-L166

---

# 24. Ornament Rules

## Dot grid

Implementasi:

```text
AzelheimScreen
  └── AzelheimDotGrid
```

Rule:

- opacity rendah
- spacing 16–24px
- tidak mengganggu text readability

## Corner cross

Implementasi:

```text
AzelheimCard
  └── +
```

- top-right
- small
- textMuted
- opacity ~0.7

## Technical labels

Gunakan `AzelheimTechnicalLabel`.

Contoh:

```text
SYSTEM // LIBRARY
SEC // 01
METRIC_02
STATUS // AKTIF
RAK: 02
ACCESS // READ ONLY
```

## Dashed meta box

Pakai untuk metadata yang harus visually dipisahkan dari primary action, terutama:

- pinjam
- tempo
- transaction metadata

## Sparkline

Hanya:

- Dashboard
- Laporan

Jangan menambahkan sparkline ke Books, Members, Settings, atau Gate hanya untuk dekorasi. fileciteturn5file3L158-L166

---

# 25. React Native Paper Mapping

`AGENTS.md` menetapkan React Native Paper tetap menjadi UI kit. Jadi Azelheim bukan pengganti UI kit; Azelheim adalah **theme + composition layer** di atas Paper. fileciteturn5file5L253-L264

| Paper | Azelheim wrapper |
|---|---|
| `Button` | `AzelheimButton` |
| `IconButton` | `AzelheimIconButton` |
| `TextInput` | `AzelheimInput` |
| `SegmentedButtons` / custom row | `AzelheimTabs` |
| `Card` | `AzelheimCard` |
| `Badge` / View | `AzelheimBadge` |
| `Dialog` | `AzelheimDialog` |
| `Snackbar` | `AzelheimToast` |
| `FAB` | `AzelheimFab` |

Jangan membuat primitive visual baru hanya karena komponen Paper belum terlihat seperti prototype. Wrap dan theme ulang komponen yang sudah dipakai project terlebih dahulu.

---

# 26. Apa yang Dipindahkan dari HTML Prototype

## Boleh dipindahkan

- hierarchy
- spacing
- border treatment
- colors
- typography roles
- card composition
- tab placement
- button grouping
- metadata grouping
- code/token presentation
- pressed/active visual states
- theme toggle presentation
- toast/dialog visual composition
- FAB placement
- bottom navigation composition
- dot-grid
- corner cross
- technical labels
- screen transition feel

## Jangan dipindahkan mentah

- HTML DOM structure
- browser-only CSS
- CSS gradients jika bukan bagian design contract
- fake data
- fake chart data
- fake auth
- fake token validation
- fake persistence
- fake sync
- `onclick` navigation
- `setTimeout`-based business synchronization

---

# 27. File-by-File Migration Checklist

## Root

- [ ] `frontend/app/_layout.tsx` — pasang theme/provider/font/global UI shell tanpa mengubah routing business behavior.

## Entry/Auth

- [ ] `frontend/app/index.tsx` — implement Gate composition dari prototype.
- [ ] `frontend/app/login.tsx` — implement Auth UI.
- [ ] `frontend/app/tenant-setup.tsx` — implement library selection/create visual.
- [ ] `frontend/app/pengunjung.tsx` — implement token + guest catalog visual state.

## Admin shell

- [ ] `frontend/app/(admin)/_layout.tsx` — implement top bar + bottom nav.
- [ ] `frontend/app/(admin)/dashboard.tsx` — implement chart/metrics composition.
- [ ] `frontend/app/(admin)/buku.tsx` — implement catalog list/filter composition.
- [ ] `frontend/app/(admin)/buku-detail.tsx` — implement detail composition.
- [ ] `frontend/app/(admin)/peminjaman.tsx` — implement tabs, loan cards, action row, form state.
- [ ] `frontend/app/(admin)/anggota.tsx` — implement member list/filter composition.
- [ ] `frontend/app/(admin)/anggota-detail.tsx` — implement member detail composition.
- [ ] `frontend/app/(admin)/laporan.tsx` — implement report controls and export UI.
- [ ] `frontend/app/(admin)/pengaturan.tsx` — implement settings sections/token UI.

## Reusable UI

- [ ] buat `frontend/lib/components/azelheim/`
- [ ] implement primitives
- [ ] ganti repeated ad-hoc styles screen-by-screen dengan primitives
- [ ] pastikan primitives mengambil theme tokens, bukan hardcoded copies

## Theme / motion

- [ ] `frontend/lib/theme.ts`
- [ ] font loading
- [ ] `react-native-reanimated` interactions
- [ ] zero shadow audit
- [ ] dark mode audit

---

# 28. Urutan Implementasi yang Aman

Jangan redesign 13 screen sekaligus.

### Batch 1 — Foundation

```text
1. theme.ts
2. font loading
3. AzelheimScreen
4. AzelheimCard
5. AzelheimButton
6. AzelheimInput
7. AzelheimBadge
8. AzelheimTechnicalLabel
9. AzelheimTopBar
10. AzelheimBottomNav
```

### Batch 2 — Gate + Auth

```text
index.tsx
login.tsx
tenant-setup.tsx
pengunjung.tsx
```

### Batch 3 — Admin shell

```text
(admin)/_layout.tsx
dashboard.tsx
buku.tsx
peminjaman.tsx
anggota.tsx
```

### Batch 4 — Detail + settings

```text
buku-detail.tsx
anggota-detail.tsx
laporan.tsx
pengaturan.tsx
```

### Batch 5 — Visual QA

Bandingkan setiap screen production dengan `azelheim_preview.html`.

---

# 29. Visual QA Checklist

Per screen, cek:

### Structure

- [ ] Header height/placement terasa sama.
- [ ] Content start position sama.
- [ ] Bottom nav tetap 5 item.
- [ ] FAB tetap di atas bottom nav jika screen tersebut membutuhkan FAB.

### Typography

- [ ] Headline hierarchy sama.
- [ ] Monospace hanya untuk technical data.
- [ ] Tidak ada text yang terlalu padat.

### Geometry

- [ ] Card radius 4–6px.
- [ ] Button radius ~4px.
- [ ] Border terlihat jelas.
- [ ] Tidak ada giant rounded card.

### Color

- [ ] Neutral dominates.
- [ ] Status colors semantik.
- [ ] Tidak ada gradient baru.

### Interaction

- [ ] Press feedback ada.
- [ ] Active tab jelas.
- [ ] Theme toggle terasa sama.
- [ ] Toast/dialog mengikuti composition prototype.

### Android

- [ ] keyboard tidak menutupi input.
- [ ] font besar tidak merusak layout.
- [ ] gesture navigation tidak menutupi bottom controls.
- [ ] dark mode tetap terbaca.

Style guide meminta pengujian Android fisik untuk dark mode, font besar, keyboard, dan gesture nav bar. fileciteturn5file0L15-L26

---

# 30. Anti-Slop Gate

Sebelum menyatakan UI migration selesai, jawab semua:

- [ ] Tidak ada gradient generik.
- [ ] Tidak ada glassmorphism.
- [ ] Tidak ada 16–24px card radius tanpa alasan.
- [ ] Tidak ada shadow blur berat.
- [ ] Tidak ada ikon glossy.
- [ ] Tidak ada decorative illustration yang tidak punya fungsi.
- [ ] Tidak ada warna neon.
- [ ] Tidak ada style ad-hoc yang bertentangan dengan theme.
- [ ] Tidak ada duplicate UI primitives yang sebenarnya sudah tersedia di `components/azelheim`.
- [ ] Nama file route existing tetap dipertahankan.
- [ ] Business logic tidak berubah hanya demi mengikuti prototype.
- [ ] UI actions dari prototype diterjemahkan menjadi production interaction, bukan fake behavior.

Style guide memang secara eksplisit menyebut larangan gradient, large radius, glossy 3D icon, dan neon tanpa semantik. fileciteturn5file7L342-L351

---

# 31. Verification / Definition of Done

Setelah implementasi:

1. Jalankan baseline test sesuai `ANTIGRAVITY_TASK.md` sebelum perubahan.
2. Implementasikan UI batch demi batch.
3. Jalankan `tsc --noEmit`.
4. Jalankan `eslint .` sesuai project.
5. Jalankan regression flow existing.
6. Verifikasi tidak ada route/business regression.
7. Commit perubahan UI secara terpisah dari perubahan business logic.

`AGENTS.md` mewajibkan verifikasi nyata dan menyatakan bahwa build sukses saja tidak cukup untuk menyatakan task selesai. fileciteturn5file6L300-L325

### Recommended commit grouping

```text
style(theme): add Azelheim design tokens
style(ui): add Azelheim reusable primitives
style(gate): migrate entry screen to Azelheim UI
style(admin): migrate admin shell and navigation
style(books): migrate books screens to Azelheim UI
style(loans): migrate loan screens to Azelheim UI
style(members): migrate member screens to Azelheim UI
style(reports): migrate reports and settings UI
style(guest): migrate guest/token UI
```

Jangan campurkan business bug fix ke commit style hanya karena file yang sama tersentuh.

---

# 32. Final Rule

**Prototype HTML memberi tahu developer "bagaimana tampilannya".**

**`style.md` menjelaskan "aturan visual di balik tampilan itu".**

**Struktur proyek `Azelib` menentukan "file mana yang harus disentuh".**

**`AGENTS.md` + `ANTIGRAVITY_TASK.md` menentukan "apa yang tidak boleh rusak".**

Jangan rename route utama hanya demi mencocokkan nama prototype. Map prototype ke file existing seperti tabel berikut:

| Prototype concept | Existing file |
|---|---|
| Gate | `frontend/app/index.tsx` |
| Login | `frontend/app/login.tsx` |
| Library selection | `frontend/app/tenant-setup.tsx` |
| Guest / Token / Catalog | `frontend/app/pengunjung.tsx` |
| Admin Shell | `frontend/app/(admin)/_layout.tsx` |
| Dashboard | `frontend/app/(admin)/dashboard.tsx` |
| Books | `frontend/app/(admin)/buku.tsx` |
| Book Detail | `frontend/app/(admin)/buku-detail.tsx` |
| Loans | `frontend/app/(admin)/peminjaman.tsx` |
| Members | `frontend/app/(admin)/anggota.tsx` |
| Member Detail | `frontend/app/(admin)/anggota-detail.tsx` |
| Reports | `frontend/app/(admin)/laporan.tsx` |
| Settings | `frontend/app/(admin)/pengaturan.tsx` |

Dengan mapping ini, prototype bisa berkembang secara visual tanpa memaksa struktur route production ikut berubah.
