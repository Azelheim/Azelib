# Azelheim UI Style Guide

> **Implementation contract for the Azelheim visual system**
>
> This document describes the visual language, layout rules, component rules, interaction patterns, and screen structure shown in the Azelheim prototype. It is intended to be used by a frontend developer/AI coding agent when transferring the prototype into the production Expo + React Native application.

---

## 0. Design Intent

**Style name:** Editorial Vector Minimalist / Crisp Micro-Edge

**Character:** utilitarian, editorial, technical, quiet, crisp.

Azelheim should look like a deliberately designed library tool rather than a generic SaaS dashboard. The UI should have personality through typography, geometry, borders, tiny technical labels, and restrained ornament — not through gradients, illustrations, excessive rounded cards, or decorative effects.

### Core principles

1. **Information first.** Functional content always wins over decoration.
2. **Editorial hierarchy.** Large type + whitespace establishes hierarchy; cards are used only when they help group information.
3. **Crisp edges.** Borders are visible and purposeful. Micro-radius is preferred.
4. **Technical details as texture.** Monospace labels such as `SYSTEM // LIBRARY`, `SEC // 01`, `STATUS // AKTIF`, or `TOKEN // 6 CHAR` provide character.
5. **Flat depth.** Avoid blur shadows. Contrast comes from surface changes, borders, and small offset strokes.
6. **One visual language.** Do not mix Material defaults, glassmorphism, neumorphism, colorful SaaS cards, and Azelheim components on the same screen.

The source product specification requires a minimal vector-based direction, one primary color plus neutrals, consistent line icons, 8pt spacing, flat elevation, and restrained rounded geometry. fileciteturn4file2L113-L124

---

# 1. Product Shell

## 1.1 Mobile frame

For prototype/preview purposes:

- Width: approximately 390–420px
- Height: approximately 844–860px
- Outer radius: 22–24px
- Outer border: 2px solid primary border
- Outer shadow: subtle offset shadow only for the preview frame
- Inner application UI: **no large blur shadows**

The real React Native application should not depend on the browser preview frame. The frame is only a presentation device.

## 1.2 Application shell

The application has two distinct shells:

### A. Gate / public entry shell

Used for:

- Gerbang
- Login
- Token Pengunjung
- Public catalog
- Public book detail

Rules:

- No bottom navigation.
- No admin chrome.
- Large editorial spacing.
- Navigation is explicit and minimal.

### B. Admin shell

Used after a library has been selected:

- Dashboard
- Buku
- Detail Buku
- Peminjaman
- Tambah Peminjaman
- Anggota
- Detail Anggota
- Laporan
- Pengaturan Perpustakaan

Admin shell uses:

- top bar
- content area
- bottom navigation with exactly five main tabs
- optional FAB for primary create actions

The application specification defines the five bottom tabs as **Dashboard, Buku, Peminjaman, Anggota, Laporan**. fileciteturn4file0L40-L48

---

# 2. Color System

## 2.1 Light mode — Warm Stone Paper

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FAFAF9` | Main application canvas |
| `card` | `#FFFFFF` | Cards and primary surfaces |
| `surface` | `#F5F5F4` | Secondary surfaces, inputs, metadata |
| `border` | `#1C1917` | Strong structural border |
| `line` | `#E7E5E4` | Divider / subtle border |
| `text` | `#1C1917` | Primary text |
| `muted` | `#78716C` | Secondary text |
| `faint` | `#A8A29E` | Technical captions / tertiary text |
| `purple` | `#F3EEFF` | Active tab / selected state |
| `green` | `#E6F8EE` | Available / active / success |
| `red` | `#FEE2E2` | Overdue / destructive state |
| `blue` | `#E8F2FF` | Member / contextual badge |
| `amber` | `#FEF3C7` | Warning / pending |
| `danger` | `#DC2626` | Destructive text/action |

## 2.2 Dark mode — True OLED Black

| Token | Hex | Use |
|---|---|---|
| `bg` | `#09090B` | Main application canvas |
| `card` | `#121215` | Cards and primary surfaces |
| `surface` | `#18181B` | Secondary surfaces |
| `border` | `#27272A` | Structural border |
| `line` | `#1E1E22` | Divider |
| `text` | `#FAFAFA` | Primary text |
| `muted` | `#A1A1AA` | Secondary text |
| `faint` | `#52525B` | Technical captions |
| `purple` | `#23153D` | Active selection |
| `green` | `#072918` | Success / available |
| `red` | `#380C0C` | Overdue / danger surface |
| `blue` | `#0B2245` | Contextual badge |
| `amber` | `#382506` | Warning surface |
| `danger` | `#EF4444` | Destructive text/action |

These tokens are carried directly from the existing Azelheim style guide. fileciteturn4file8L461-L497

## 2.3 Color rules

- Do not introduce additional brand colors casually.
- No large gradients.
- Status colors are semantic, not decorative.
- Most of the screen should remain neutral.
- Purple is a **selection tint**, not a general accent color.
- Red is reserved for danger, overdue, destructive, or irreversible actions.

---

# 3. Typography

## 3.1 Font families

### Primary UI font

**Plus Jakarta Sans**

Fallback:

- Inter
- system sans-serif

Use for:

- page titles
- book titles
- member names
- descriptions
- buttons
- body copy

### Technical font

**JetBrains Mono**

Fallback:

- Space Mono
- ui-monospace

Use for:

- codes
- IDs
- status labels
- timestamps
- token values
- section codes
- metric labels
- small technical metadata

The original Azelheim guide defines Plus Jakarta Sans for normal UI text and JetBrains Mono for technical data. fileciteturn4file8L501-L506

## 3.2 Type scale

### Hero title

- 32–36px
- weight 800
- line-height around 1.0–1.08
- tight letter-spacing

Used for the Gate headline.

### Screen title

- 17–20px
- weight 800
- line-height ~1.15

### Card title

- 13–15px
- weight 700–800

### Body

- 11–13px
- weight 400–600
- line-height 1.45–1.60

### Technical label

- 8–10px
- JetBrains Mono
- weight 600–800
- uppercase
- letter-spacing 0.5–0.8px

Example:

```text
SYSTEM // LIBRARY ACCESS
REPORT // 05
STATUS // AKTIF
ACCESS // READ ONLY
```

### Numeric metric

- JetBrains Mono
- 22–28px
- weight 800
- tight tracking

---

# 4. Geometry

## 4.1 Global spacing

Use an **8pt base grid**.

Preferred values:

- 4px — micro gap
- 8px — compact gap
- 12px — component padding
- 16px — screen horizontal padding
- 20px — section separation
- 24px — large separation
- 32px — hero spacing

Avoid arbitrary values unless required by a specific native component.

## 4.2 Radius

Azelheim uses **micro-radius**, never oversized rounded cards.

| Component | Radius |
|---|---:|
| Card | 4px |
| Button | 4px |
| Input | 4px |
| Badge | 3px |
| Segmented control | 4px |
| FAB | 4–6px |
| Preview device frame | 22–24px |

Do not use 16px, 20px, 24px component cards unless there is an explicit product reason.

## 4.3 Borders

Standard structural border:

```text
1.2px solid var(--border)
```

Subtle divider:

```text
1px solid var(--line)
```

Dashed metadata box:

```text
1px dashed var(--line)
```

The border is part of the visual identity. Do not remove it just because a component still looks acceptable without it.

---

# 5. Elevation & Shadow

## 5.1 Production rule

**Flat by default.**

For application components:

- `elevation: 0`
- no blur shadow
- no glass shadow
- no neon glow

Use:

- border contrast
- surface contrast
- tiny offset strokes only where appropriate

## 5.2 Prototype frame exception

The browser preview device may use a larger outer shadow so that the device is visually separated from the page background.

That shadow is a **presentation-only effect** and should not be copied to normal cards in the production app.

---

# 6. Background Texture

Azelheim uses a subtle dot-grid.

### Main app

- radial dot
- 1–1.2px dot size
- ~16px spacing inside the app
- low contrast

### Preview canvas

- ~24px spacing
- slightly stronger dot tone

The dot-grid should never compete with content.

It is a texture, not a pattern users should consciously notice.

---

# 7. Technical Ornament

Use ornament sparingly.

## 7.1 Corner cross

Cards may include a small `+` at their top-right corner.

Rules:

- monospace
- 8–9px
- low opacity
- muted color

It should feel like a tiny registration mark, not an icon.

## 7.2 Section codes

Every major screen/section can have a code:

```text
SEC // 01
REPORT // 05
LIB // CONFIG
GUEST // READ ONLY
```

Keep these small and secondary.

## 7.3 Technical labels

Prefer technical metadata over decorative slogans.

Good:

```text
TOKEN // 6 CHAR
ACCESS // READ ONLY
SYSTEM // LIBRARY ACCESS
```

Avoid:

```text
The ultimate library experience ✨
Everything you need for a smarter library
```

---

# 8. Component System

## 8.1 Card

### Anatomy

```text
┌─────────────────────────────┐
│ TITLE             STATUS    │
│ Secondary description       +│
│                             │
│ metadata / tags             │
│                             │
│ action row                  │
└─────────────────────────────┘
```

Rules:

- white / dark surface depending on theme
- 1.2px border
- 4px radius
- 12–14px padding
- no blur shadow
- optional top-right `+`

Cards are structural containers, not decorative floating objects.

## 8.2 Button

Height:

- 40–44px

Radius:

- 4px

Border:

- 1.2px solid

### Variants

**Primary:** dark surface + light text

**Secondary:** card surface + dark/light border

**Selection:** purple tint

**Danger:** red tint + danger text

Buttons should have strong labels and minimal iconography.

## 8.3 Input

Height:

- 42–44px

Rules:

- 1.2px border
- 4px radius
- neutral surface
- 11–13px text
- technical inputs may use JetBrains Mono

Focused state:

- preserve the border
- optional tiny offset emphasis
- do not use large blue Material-style glow

## 8.4 Badge

- 3px radius
- 1px border
- 2–3px vertical padding
- 6px horizontal padding
- JetBrains Mono
- uppercase
- 8–10px

Examples:

```text
ACTIVE
OWNER
ADMIN
STAFF
TERSEDIA
19/20
```

## 8.5 Segmented tabs

- 1.2px outer border
- 4px radius
- equal-width cells when appropriate
- active tab uses purple tint
- active text weight 800

Avoid pill-shaped tabs.

## 8.6 Meta box

Used for compact machine-readable information.

Example:

```text
PINJAM: 2026-08-18      TEMPO: 2026-08-25
```

Style:

- subtle surface
- dashed border
- JetBrains Mono
- small text

## 8.7 FAB

- 48 × 48px
- 4–6px radius
- strong border
- dark fill
- placed above bottom navigation
- only for a clear primary creation action

Use a plus icon or action-specific icon; no decorative FABs.

---

# 9. Iconography

Use **Lucide line icons**.

Rules:

- consistent stroke appearance
- 14–18px for UI controls
- 16px is the default
- no filled emoji-style icons in UI
- no glossy icon sets
- icon always supports a text label or obvious function

Examples used by the prototype:

- key
- sun / moon
- settings
- log-out
- layout-dashboard
- book-open
- repeat
- users
- file-text
- copy
- refresh-cw
- search
- filter
- save
- share-2
- arrow-left

---

# 10. Motion

Motion should make the UI feel tactile, not flashy.

## 10.1 Recommended motion

### Button press

- scale to ~0.94
- spring
- quick return

### FAB

- scale ~0.90 on press
- optional 90° icon rotation

### Theme toggle

- rotate icon 360°
- 300–350ms

### Screen transition

- opacity fade
- translateY ~8px
- 200–250ms

### Active nav icon

- translateY -2px
- scale ~1.1–1.15

These interaction patterns are aligned with the existing Azelheim motion guidance. fileciteturn0file1L110-L120

## 10.2 Avoid

- looping animations
- floating cards
- parallax
- spring-heavy page transitions
- animated width/height layout changes
- large blur transitions
- decorative particles

---

# 11. Screen-by-Screen Layout Contract

The current prototype represents these screens:

1. **Gerbang**
2. **Login**
3. **Pilih Perpustakaan**
4. **Dashboard**
5. **Buku**
6. **Detail Buku**
7. **Peminjaman**
8. **Tambah Peminjaman**
9. **Anggota**
10. **Detail Anggota**
11. **Laporan**
12. **Pengaturan Perpustakaan**
13. **Token Pengunjung**
14. **Katalog Pengunjung**
15. **Detail Buku Pengunjung**

---

# 12. Gerbang

## 12.1 Purpose

Entry point for two audiences:

- library staff/admin
- public visitors

## 12.2 Layout

```text
[ AZELHEIM ]                      [v1.0]
SYSTEM // LIBRARY ACCESS

Satu Aplikasi untuk
Semua Perpustakaan Anda

────────────────────────────────

MASUK

┌───────────────────────────────┐
│  KEY  LOGIN                   │
│       Kelola perpustakaan     │
└───────────────────────────────┘

PENGUNJUNG
Katalog tanpa akun

┌───────────────────────────────┐
│ TOKEN PERPUSTAKAAN             │
│ [ Q7M4K2                 → ]  │
└───────────────────────────────┘

ACCESS // GUEST
```

## 12.3 Rules

- no bottom nav
- no dashboard content
- no promotional illustration
- headline is the visual anchor
- Login is the strongest action
- Guest token is visually secondary
- token route is manual input, not scanner

The legacy QR/scanner flow has been superseded by the text-token guest access flow. fileciteturn3file2L140-L162

---

# 13. Login

Use a focused editorial form.

### Structure

```text
AZELHEIM
AUTH // 01

Masuk
Kelola perpustakaan Anda.

Email
[________________________]

Password
[________________________]

[ LOGIN ]

Buat Akun        Lupa Password
```

Rules:

- no side illustration
- no giant rounded form card
- strong title
- input fields remain compact
- keyboard-avoiding behavior is mandatory

The product spec defines exact labels and validation/error messages for email and password. Do not invent replacement copy when implementing production UI. fileciteturn4file0L25-L34

---

# 14. Choose Library

Purpose:

- choose an existing library
- inspect pending invitation
- create a new library

Layout should look like a compact selection console rather than a marketplace.

Recommended structure:

```text
LIBRARY // SELECT

Perpustakaan Anda

┌───────────────────────────────┐
│ SMA 01                 →      │
│ ADMIN · 328 BUKU              │
└───────────────────────────────┘

Undangan

┌───────────────────────────────┐
│ SMP Harapan            →      │
│ STAFF · UNDANGAN BARU         │
└───────────────────────────────┘

[ + BUAT BARU ]
```

---

# 15. Dashboard

The Dashboard is the information-dense screen, but must still breathe.

## Hierarchy

1. screen header
2. primary chart
3. penalty total
4. four metric cards
5. supporting sections

### Required cards

- Jumlah Buku
- Peminjam
- Buku Dipinjam
- Buku Terlambat

The product specification requires these four metrics plus a large chart and a Total Denda card. fileciteturn4file0L44-L48

### Chart

Use:

- thin monoline
- neutral graph surface
- subtle grid/divider
- contextual toggle between Buku / Peminjam / Denda

Do not use:

- glossy chart gradients
- colorful stacked charts
- heavy shadows

---

# 16. Buku

## List

Each item prioritizes:

1. Judul
2. Penulis
3. Kategori
4. Rak
5. availability count

Example:

```text
Pulang
Leila S. Chudori
ROMANCE · RAK 02

19/20
```

Use compact dividers rather than large independent cards when the list is long.

The source spec defines the availability format as `tersedia/total`, e.g. `3/5`. fileciteturn4file1L59-L66

---

# 17. Detail Buku

Use a strong title and metadata block.

Recommended order:

- title
- author
- category/rack badges
- core metadata
- synopsis
- copy count
- action controls

Actions should be clearly separated from informational content.

---

# 18. Peminjaman

Tabs:

```text
AKTIF | TERLAMBAT | RIWAYAT
```

Each loan row should expose:

- member
- book
- borrow date
- due date
- status

Primary action:

- Kembalikan

Secondary/destructive:

- Tandai Hilang

Decision-required actions must open a confirmation dialog. The interaction spec explicitly requires confirmation for critical actions. fileciteturn2file2L140-L146

---

# 19. Tambah Peminjaman

This is a workflow screen, not a decorative form.

Recommended sequence:

```text
PEMINJAM
↓
BUKU
↓
JATUH TEMPO
↓
RINGKASAN
↓
KONFIRMASI
```

Use clear field grouping and plenty of vertical spacing.

---

# 20. Anggota

List presentation:

```text
NAMA
Kategori / Status
Kontak
```

Use badges for role/category where useful.

Member management should feel like a utility list, not a profile-card gallery.

---

# 21. Detail Anggota

Prioritize:

- name
- member number
- category
- contact
- address
- active loan state
- borrowing history

Use technical metadata for member IDs:

```text
ANG-00001
```

---

# 22. Laporan

The report screen is structured as a control panel.

Recommended hierarchy:

```text
REPORT // 05

TYPE
[ Peminjaman | Denda | Buku ]

PERIODE
[ Dari ] [ Sampai ]

[ TERAPKAN FILTER ]

SUMMARY
42 TRANSAKSI

[ EXPORT PDF ]
```

Export must not automatically save or share. The user must explicitly choose **Simpan** or **Share** after PDF generation. fileciteturn4file4L207-L213

---

# 23. Pengaturan Perpustakaan

Use multiple compact sections.

Recommended section order:

1. Visitor access token
2. Members & roles
3. Transaction rules
4. Account actions

## Token block

Token should be visually prominent but still technical.

Example:

```text
TOKEN PERPUSTAKAAN

Q7M4K2

CASE-INSENSITIVE · 6 CHAR
```

Owner/Admin may refresh token. Staff may view it but cannot regenerate it. fileciteturn4file7L398-L416

---

# 24. Guest Token

This screen is intentionally stripped down.

```text
GUEST ACCESS // TOKEN

Masuk ke
katalog.

Masukkan token yang diberikan oleh
petugas perpustakaan.

TOKEN PERPUSTAKAAN

[     Q7M4K2     ]

[ KEMBALI ]   [ MASUK ]

ACCESS // READ ONLY
```

Rules:

- no admin nav
- no unnecessary illustration
- input is centered and obvious
- case-insensitive token
- keyboard must not cover the input

---

# 25. Guest Catalog

The visitor view is intentionally much simpler than admin view.

Allowed public information:

- Judul
- Penulis
- Kategori
- Rak
- Sinopsis
- availability status

Do not expose admin-only metadata in the public catalog.

The product specification explicitly separates the public catalog fields from admin book fields. fileciteturn4file1L68-L76

## Header

Show:

- `KATALOG`
- tenant/library name
- explicit exit control

No bottom navigation.

---

# 26. Guest Book Detail

Keep the detail intentionally sparse.

Allowed:

- title
- author
- category
- rack
- synopsis
- availability

Do not add admin controls, edit buttons, loan actions, or settings.

---

# 27. Bottom Navigation

Exactly five items:

```text
Dashboard
Buku
Peminjaman
Anggota
Laporan
```

### Rules

- height: about 60px
- flat background
- top border
- active item uses primary text
- active icon moves upward ~2px and scales slightly
- labels remain short

No extra “Home”, “More”, “Profile”, or floating secondary nav unless explicitly added to product requirements.

---

# 28. Top Bar

Admin top bar:

### Left

```text
Azelheim
SYSTEM // CORE_LIB
```

or tenant context depending on screen.

### Right

- theme toggle
- settings
- logout

Use icon-only buttons with a compact hit area.

The product spec defines the top navigation as tenant name on the left and theme/settings actions on the right. fileciteturn4file0L40-L42

---

# 29. Responsive / Native Behavior

The prototype is desktop-browser-hosted, but production implementation is React Native.

### Preserve

- spacing rhythm
- information hierarchy
- card geometry
- typography hierarchy
- visual density
- interaction states

### Adapt natively

- safe area handling
- keyboard avoidance
- touch target size
- ScrollView / FlatList behavior
- native dialogs / bottom sheets
- Android back gesture

Keyboard-avoiding behavior must cover all forms, including auth and guest token input. fileciteturn4file9L534-L547

---

# 30. React Native Implementation Rules

## 30.1 Theme

Create one theme source:

```text
lib/theme.ts
```

Do not scatter raw colors throughout components.

Recommended token structure:

```ts
export const azelheimLight = {
  bg: '#FAFAF9',
  card: '#FFFFFF',
  surface: '#F5F5F4',
  border: '#1C1917',
  line: '#E7E5E4',
  text: '#1C1917',
  muted: '#78716C',
  faint: '#A8A29E',
  purple: '#F3EEFF',
  green: '#E6F8EE',
  red: '#FEE2E2',
  blue: '#E8F2FF',
  amber: '#FEF3C7',
  danger: '#DC2626',
};
```

Mirror with dark tokens.

## 30.2 Component inventory

Build reusable primitives before repeating visual patterns:

```text
AzelheimScreen
AzelheimTopBar
AzelheimSectionHeader
AzelheimCard
AzelheimButton
AzelheimInput
AzelheimBadge
AzelheimTabs
AzelheimMetaBox
AzelheimStatCard
AzelheimListRow
AzelheimBottomNav
AzelheimFab
AzelheimToast
AzelheimDialog
```

Do not create near-duplicate components with slightly different colors/radii.

## 30.3 React Native Paper

Keep React Native Paper as the underlying UI kit where required by the existing application architecture, but override its theme/shape/elevation to match this guide rather than accepting default Material styling.

The project specification explicitly requires React Native Paper and a centralized `lib/theme.ts`. fileciteturn4file6L342-L351

## 30.4 Icons

Use:

```text
lucide-react-native
```

Keep icon sizing consistent with the component system.

---

# 31. Anti-Slop Checklist

Before approving a new screen, verify:

- [ ] No gradient background.
- [ ] No huge rounded cards.
- [ ] No excessive pills.
- [ ] No glossy/3D illustrations.
- [ ] No random colors.
- [ ] No generic SaaS hero section.
- [ ] No giant drop shadows.
- [ ] No unnecessary decorative icon clusters.
- [ ] No copy-heavy marketing language.
- [ ] Technical labels are used intentionally.
- [ ] Borders and spacing match the system.
- [ ] The most important action is visually obvious.
- [ ] Light and dark mode preserve the same hierarchy.
- [ ] The screen still looks recognizably Azelheim with content removed.

---

# 32. Content / Copy Rules

## Prefer

- short labels
- direct verbs
- technical descriptors
- factual status
- compact helper text

Examples:

```text
LOGIN
BUKU
PEMINJAMAN
SIMPAN PENGATURAN
TOKEN PERPUSTAKAAN
ACCESS // READ ONLY
STATUS // AKTIF
```

## Avoid

- marketing fluff
- fake urgency
- excessive emoji
- “magic” language
- generic AI-style phrases
- repeated explanatory paragraphs

The application specification already defines many exact labels and errors. Those production strings should remain the source of truth; this style guide should not override them. fileciteturn4file0L25-L38

---

# 33. What This Guide Does Not Change

This document is a **visual implementation guide**.

It does not change:

- database schema
- API contract
- authentication logic
- business rules
- role permissions
- invitation rules
- loan calculations
- report calculations
- routing requirements
- data persistence behavior

When a visual decision conflicts with the functional specification, preserve the functional contract.

The project instructions explicitly say UI implementation must follow the existing architecture and exact API/data contracts rather than inventing new behavior. fileciteturn2file0L11-L20

---

# 34. Definition of Done — Visual Migration

A production screen can be considered visually migrated when:

- [ ] The screen uses the centralized Azelheim theme.
- [ ] No ad-hoc color values are introduced without a documented reason.
- [ ] Typography follows the hierarchy.
- [ ] Geometry follows the micro-radius system.
- [ ] Borders/dividers follow the visual system.
- [ ] No heavy shadow/gradient/slop patterns remain.
- [ ] Dark mode has been checked.
- [ ] Touch/keyboard behavior has been checked.
- [ ] Screen hierarchy matches the prototype.
- [ ] Existing product behavior remains unchanged.

---

# 35. Reference Prototype

The browser prototype used for this guide is:

```text
azelheim_preview.html
```

Use the prototype as the visual reference for:

- page composition
- spacing rhythm
- information hierarchy
- component arrangement
- light/dark behavior
- interaction affordances

Use the product task/specification files as the source of truth for:

- exact product behavior
- routes
- labels/error messages
- permissions
- backend/API behavior
- acceptance criteria

The prototype is a **visual reference**, not a replacement for the application's business logic or architecture.
