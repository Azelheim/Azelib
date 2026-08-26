# Bagan Struktur Proyek Azelib

Struktur pohon proyek **Aplikasi Manajemen Perpustakaan** (multi-tenant, offline-first). Tersusun atas 3 area besar: **Frontend** (Expo/React Native), **Backend** (Supabase), dan artefak pendukung.

```
Azelib/
├── AGENTS.md                          # Kontrak kerja + spesifikasi TASK A/B/C
├── ANTIGRAVITY_TASK.md                # Catatan tugas tambahan (di luar scope utama)
├── .gitignore
│
├── frontend/                          # ══ TASK B: Frontend (Expo + React Native + TS) ══
│   ├── app/                           # Expo Router (file-based routing)
│   │   ├── _layout.tsx                # Root layout (PaperProvider, tema, navigasi)
│   │   ├── index.tsx                  # Halaman Gerbang (login / scan QR)
│   │   ├── login.tsx                  # Halaman Login
│   │   ├── pengunjung.tsx             # Mode Pengunjung (tanpa login, pasca-scan)
│   │   ├── tenant-setup.tsx           # Buat / Pilih Perpustakaan
│   │   └── (admin)/                   # Shell Admin (bottom nav 5 tab)
│   │       ├── _layout.tsx            # Layout tab: Dashboard, Buku, Peminjaman, Anggota, Laporan
│   │       ├── dashboard.tsx          # Dashboard (chart tren, total denda, 4 kartu)
│   │       ├── buku.tsx               # Daftar Buku (filter + sort)
│   │       ├── buku-detail.tsx        # Detail Buku + cetak kode eksemplar
│   │       ├── peminjaman.tsx         # Peminjaman (Aktif / Terlambat / Riwayat)
│   │       ├── anggota.tsx            # Daftar Anggota
│   │       ├── anggota-detail.tsx     # Detail Anggota + riwayat pinjam
│   │       ├── laporan.tsx            # Laporan (peminjaman/denda/buku + export PDF)
│   │       └── pengaturan.tsx         # Pengaturan Perpustakaan (member, QR, tarif)
│   │
│   ├── lib/
│   │   ├── theme.ts                   # MD3Theme kustom (Design Direction §2.1)
│   │   ├── types.ts                   # TypeScript interface = kontrak Appendix
│   │   ├── db.ts                      # op-sqlite local-first store (offline)
│   │   ├── session.ts                 # Manajemen sesi login (7 hari)
│   │   ├── supabase.ts                # Inisialisasi klien Supabase
│   │   ├── api/
│   │   │   └── apiClient.ts           # Panggilan endpoint backend (kontrak Appendix)
│   │   ├── components/
│   │   │   └── AppKeyboardAvoidingView.tsx
│   │   ├── context/
│   │   │   └── TenantContext.tsx      # State tenant aktif
│   │   └── qr/
│   │       ├── qrcode.ts              # Util generate/parse QR perpustakaan
│   │       └── QRCodeSvg.tsx          # Render QR sebagai SVG
│   │
│   ├── assets/
│   │   ├── icon.png
│   │   ├── expo.icon/                 # Konfigurasi icon app
│   │   └── images/                    # Logo, splash, tab icons, dll
│   │
│   ├── scripts/
│   │   ├── reset-project.js
│   │   └── test-book-sync.test.mjs    # Test sinkronisasi buku (offline→online)
│   │
│   ├── android/                       # Native Android (EAS custom dev client)
│   │   ├── app/
│   │   │   ├── build.gradle
│   │   │   ├── proguard-rules.pro
│   │   │   ├── debug.keystore
│   │   │   └── src/
│   │   │       ├── debug/AndroidManifest.xml
│   │   │       ├── debugOptimized/AndroidManifest.xml
│   │   │       └── main/
│   │   │           ├── AndroidManifest.xml
│   │   │           ├── java/com/anonymous/frontend/
│   │   │           │   ├── MainActivity.kt
│   │   │           │   └── MainApplication.kt
│   │   │           └── res/           # drawable, mipmap, values (launcher & splash)
│   │   ├── build.gradle
│   │   ├── settings.gradle
│   │   ├── gradle.properties
│   │   ├── local.properties
│   │   ├── gradlew / gradlew.bat
│   │   └── gradle/                    # gradle wrapper
│   │
│   ├── app.json                       # Konfigurasi Expo app
│   ├── eas.json                       # EAS Build config
│   ├── package.json                   # Dependensi & script
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── expo-env.d.ts
│   ├── .env                           # Env (kredensial Supabase lokal)
│   ├── .gitignore
│   ├── CLAUDE.md
│   ├── AGENTS.md
│   ├── README.md
│   └── LICENSE
│
├── supabase/                          # ══ TASK A: Backend (Supabase) ══
│   ├── config.toml                    # Konfigurasi project Supabase lokal
│   ├── schema_and_rls.sql             # Skema DB + RLS (versi ringkas/patokan)
│   │
│   ├── migrations/                    # Migrasi database (terurut)
│   │   ├── 20260817035415_init_schema.sql
│   │   ├── 20260817035500_rls_policies.sql
│   │   ├── 20260817040249_init_schema.sql
│   │   ├── 20260817040311_rls_policities.sql
│   │   ├── 20260818150000_add_maksimal_hari_pinjam.sql
│   │   └── 20260819150000_enable_realtime_and_admin_tenant_update.sql
│   │
│   ├── functions/                     # Edge Functions (Deno/TypeScript)
│   │   ├── deno.json                  # Workspace Deno
│   │   ├── tsconfig.json
│   │   ├── deno.d.ts
│   │   ├── _shared/                   # Kode bersama antar function
│   │   │   ├── denda.ts               # Logika kalkulasi denda (split tarif)
│   │   │   ├── denda.test.ts          # Unit test kalkulasi denda
│   │   │   └── utils.ts               # Helper umum
│   │   ├── auth/                      # /auth/self-register
│   │   │   ├── index.ts
│   │   │   ├── deno.json
│   │   │   └── .npmrc
│   │   ├── tenant/                    # /tenant/create, invitations, member, owner
│   │   │   ├── index.ts
│   │   │   ├── deno.json
│   │   │   └── .npmrc
│   │   ├── buku/                      # /buku/lookup-isbn, /buku/{id}/salinan/generate
│   │   │   ├── index.ts
│   │   │   ├── deno.json
│   │   │   └── .npmrc
│   │   ├── peminjaman/                # /peminjaman, kembalikan, tandai-hilang, tarif-denda
│   │   │   ├── index.ts
│   │   │   ├── deno.json
│   │   │   └── .npmrc
│   │   ├── dashboard/                 # /dashboard/{tenant_id}/summary
│   │   │   ├── index.ts
│   │   │   ├── deno.json
│   │   │   └── .npmrc
│   │   ├── laporan/                   # /laporan/{tenant_id}/export (PDF)
│   │   │   ├── index.ts
│   │   │   ├── deno.json
│   │   │   └── .npmrc
│   │   └── cron/                      # Scheduled: suksesi Owner otomatis (H-7 & 30 hari)
│   │       ├── index.ts
│   │       ├── deno.json
│   │       └── .npmrc
│   │
│   ├── snippets/                      # SQL snippets lokal Supabase
│   ├── .branches/                     # Branching database (Supabase local)
│   └── .temp/                         # Artefak runtime lokal (diabaikan git)
│
└── strix_runs/                        # Hasil scan AI (Strix) — laporan & log
    ├── host-docker-internal-15421_2c8e/
    │   ├── findings.sarif
    │   ├── run.json
    │   └── strix.log
    └── host-docker-internal-15421_fa25/
        ├── findings.sarif
        ├── run.json
        └── strix.log
```

## Catatan

- **`frontend/node_modules/`** (dependensi npm) dan **`frontend/android/build`, `.gradle`, `.kotlin`** (artefak build) diabaikan pada bagan.
- Direktori tersembunyi editor/tooling (**`.git/`, `.idea/`, `.vscode/`, `.expo/`, `.claude/`**) juga tidak dimasukkan.
- **Frontend** mengikuti kontrak **Appendix** di `AGENTS.md` (nama field/endpoint final), dengan local-first store (`lib/db.ts`) yang disinkronkan ke backend Supabase.
- **Backend** = Supabase (PostgreSQL + RLS) + Edge Functions (Deno) untuk seluruh business logic kustom (auth, tenant, buku/ISBN, peminjaman, denda, dashboard, laporan, cron suksesi owner).
