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
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
