-- ==========================================================
-- SKEMA DATABASE LENGKAP & RLS POLICIES — APLIKASI PERPUSTAKAAN AZELIB
-- Jalankan seluruh script ini di Supabase SQL Editor:
-- Dashboard Supabase -> SQL Editor -> New Query -> Paste -> Run
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('owner', 'admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_salinan AS ENUM ('tersedia', 'dipinjam', 'hilang');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_peminjaman AS ENUM ('aktif', 'dikembalikan', 'hilang');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLES

-- TENANT (perpustakaan)
CREATE TABLE IF NOT EXISTS tenant (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama                      VARCHAR(150) NOT NULL,
    alamat                    TEXT,
    qr_code_value             VARCHAR(100) UNIQUE NOT NULL,
    batas_maksimal_peminjaman INTEGER NOT NULL DEFAULT 3,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- APP_USER (sinkron dengan auth.users)
CREATE TABLE IF NOT EXISTS app_user (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       VARCHAR(255) UNIQUE NOT NULL,
    nama        VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TENANT_MEMBER
CREATE TABLE IF NOT EXISTS tenant_member (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    role            member_role NOT NULL DEFAULT 'staff',
    penerus_user_id UUID REFERENCES app_user(id),
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, user_id)
);

-- KATEGORI
CREATE TABLE IF NOT EXISTS kategori (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    nama       VARCHAR(100) NOT NULL,
    UNIQUE (tenant_id, nama)
);

-- RAK
CREATE TABLE IF NOT EXISTS rak (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    nama       VARCHAR(100) NOT NULL,
    UNIQUE (tenant_id, nama)
);

-- BUKU
CREATE TABLE IF NOT EXISTS buku (
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

-- SALINAN EKSEMPLAR
CREATE TABLE IF NOT EXISTS salinan (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buku_id        UUID NOT NULL REFERENCES buku(id) ON DELETE CASCADE,
    nomor_urut     INTEGER NOT NULL,
    kode_eksemplar VARCHAR(50) NOT NULL,
    status         status_salinan NOT NULL DEFAULT 'tersedia',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (buku_id, nomor_urut),
    UNIQUE (kode_eksemplar)
);

-- ANGGOTA
CREATE TABLE IF NOT EXISTS anggota (
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

-- TARIF DENDA HISTORY
CREATE TABLE IF NOT EXISTS tarif_denda_history (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id              UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    nominal_per_hari       NUMERIC(12,2) NOT NULL DEFAULT 500,
    berlaku_mulai_tanggal  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PEMINJAMAN
CREATE TABLE IF NOT EXISTS peminjaman (
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

-- PEMINJAMAN DETAIL
CREATE TABLE IF NOT EXISTS peminjaman_detail (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    peminjaman_id  UUID NOT NULL REFERENCES peminjaman(id) ON DELETE CASCADE,
    salinan_id     UUID NOT NULL REFERENCES salinan(id),
    UNIQUE (peminjaman_id, salinan_id)
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_buku_tenant ON buku(tenant_id) WHERE dihapus = FALSE;
CREATE INDEX IF NOT EXISTS idx_salinan_status ON salinan(status);
CREATE INDEX IF NOT EXISTS idx_anggota_tenant ON anggota(tenant_id) WHERE dihapus = FALSE;
CREATE INDEX IF NOT EXISTS idx_peminjaman_status ON peminjaman(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_peminjaman_jatuh_tempo ON peminjaman(jatuh_tempo) WHERE status = 'aktif';

-- 5. TRIGGER SYNC AUTH.USERS -> PUBLIC.APP_USER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.app_user (id, email, nama)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RLS HELPER FUNCTIONS (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_tenants()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT tenant_id FROM public.tenant_member WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(t_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.tenant_member 
        WHERE tenant_id = t_id 
          AND user_id = auth.uid() 
          AND role IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_owner(t_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.tenant_member 
        WHERE tenant_id = t_id 
          AND user_id = auth.uid() 
          AND role = 'owner'
    );
$$;

-- 7. ENABLE RLS
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE rak ENABLE ROW LEVEL SECURITY;
ALTER TABLE buku ENABLE ROW LEVEL SECURITY;
ALTER TABLE salinan ENABLE ROW LEVEL SECURITY;
ALTER TABLE anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarif_denda_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE peminjaman ENABLE ROW LEVEL SECURITY;
ALTER TABLE peminjaman_detail ENABLE ROW LEVEL SECURITY;

-- 8. POLICIES

-- Tenant
DROP POLICY IF EXISTS "Public can read tenant" ON tenant;
CREATE POLICY "Public can read tenant" ON tenant FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert tenant" ON tenant;
CREATE POLICY "Authenticated can insert tenant" ON tenant FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner can update tenant" ON tenant;
CREATE POLICY "Owner can update tenant" ON tenant FOR UPDATE USING (
    public.is_tenant_owner(id)
);

-- App User
DROP POLICY IF EXISTS "Public or user can read profile" ON app_user;
CREATE POLICY "Public or user can read profile" ON app_user FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON app_user;
CREATE POLICY "Users can insert own profile" ON app_user FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON app_user;
CREATE POLICY "Users can update own profile" ON app_user FOR UPDATE USING (id = auth.uid());

-- Tenant Member (No subquery to avoid infinite recursion)
DROP POLICY IF EXISTS "Members can read tenant members" ON tenant_member;
DROP POLICY IF EXISTS "Read tenant_member" ON tenant_member;
CREATE POLICY "Read tenant_member" ON tenant_member FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert own membership" ON tenant_member;
DROP POLICY IF EXISTS "Insert tenant_member" ON tenant_member;
CREATE POLICY "Insert tenant_member" ON tenant_member FOR INSERT WITH CHECK (
    user_id = auth.uid() OR public.is_tenant_admin(tenant_id)
);

DROP POLICY IF EXISTS "Admins can update membership" ON tenant_member;
DROP POLICY IF EXISTS "Update tenant_member" ON tenant_member;
CREATE POLICY "Update tenant_member" ON tenant_member FOR UPDATE USING (
    public.is_tenant_admin(tenant_id)
);

DROP POLICY IF EXISTS "Owner can delete membership" ON tenant_member;
DROP POLICY IF EXISTS "Delete tenant_member" ON tenant_member;
CREATE POLICY "Delete tenant_member" ON tenant_member FOR DELETE USING (
    public.is_tenant_owner(tenant_id)
);

-- Kategori
DROP POLICY IF EXISTS "Public can read kategori" ON kategori;
CREATE POLICY "Public can read kategori" ON kategori FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members can manage kategori" ON kategori;
CREATE POLICY "Members can manage kategori" ON kategori FOR ALL USING (
    tenant_id IN (SELECT get_user_tenants())
);

-- Rak
DROP POLICY IF EXISTS "Public can read rak" ON rak;
CREATE POLICY "Public can read rak" ON rak FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members can manage rak" ON rak;
CREATE POLICY "Members can manage rak" ON rak FOR ALL USING (
    tenant_id IN (SELECT get_user_tenants())
);

-- Buku
DROP POLICY IF EXISTS "Public can read undeleted buku" ON buku;
CREATE POLICY "Public can read undeleted buku" ON buku FOR SELECT USING (dihapus = FALSE);

DROP POLICY IF EXISTS "Members can read all buku" ON buku;
CREATE POLICY "Members can read all buku" ON buku FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenants())
);

DROP POLICY IF EXISTS "Members can manage buku" ON buku;
CREATE POLICY "Members can manage buku" ON buku FOR ALL USING (
    tenant_id IN (SELECT get_user_tenants())
);

-- Salinan
DROP POLICY IF EXISTS "Public can read salinan" ON salinan;
CREATE POLICY "Public can read salinan" ON salinan FOR SELECT USING (
    EXISTS (SELECT 1 FROM buku WHERE buku.id = salinan.buku_id AND buku.dihapus = FALSE)
);

DROP POLICY IF EXISTS "Members can read all salinan" ON salinan;
CREATE POLICY "Members can read all salinan" ON salinan FOR SELECT USING (
    EXISTS (SELECT 1 FROM buku WHERE buku.id = salinan.buku_id AND buku.tenant_id IN (SELECT get_user_tenants()))
);

DROP POLICY IF EXISTS "Members can manage salinan" ON salinan;
CREATE POLICY "Members can manage salinan" ON salinan FOR ALL USING (
    EXISTS (SELECT 1 FROM buku WHERE buku.id = salinan.buku_id AND buku.tenant_id IN (SELECT get_user_tenants()))
);

-- Anggota
DROP POLICY IF EXISTS "Members can read anggota" ON anggota;
CREATE POLICY "Members can read anggota" ON anggota FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenants())
);

DROP POLICY IF EXISTS "Members can manage anggota" ON anggota;
CREATE POLICY "Members can manage anggota" ON anggota FOR ALL USING (
    tenant_id IN (SELECT get_user_tenants())
);

-- Tarif Denda History
DROP POLICY IF EXISTS "Members can read tarif_denda_history" ON tarif_denda_history;
CREATE POLICY "Members can read tarif_denda_history" ON tarif_denda_history FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenants())
);

DROP POLICY IF EXISTS "Members can manage tarif_denda_history" ON tarif_denda_history;
CREATE POLICY "Members can manage tarif_denda_history" ON tarif_denda_history FOR ALL USING (
    tenant_id IN (SELECT get_user_tenants())
);

-- Peminjaman
DROP POLICY IF EXISTS "Members can read peminjaman" ON peminjaman;
CREATE POLICY "Members can read peminjaman" ON peminjaman FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenants())
);

DROP POLICY IF EXISTS "Members can manage peminjaman" ON peminjaman;
CREATE POLICY "Members can manage peminjaman" ON peminjaman FOR ALL USING (
    tenant_id IN (SELECT get_user_tenants())
);

-- Peminjaman Detail
DROP POLICY IF EXISTS "Members can read peminjaman_detail" ON peminjaman_detail;
CREATE POLICY "Members can read peminjaman_detail" ON peminjaman_detail FOR SELECT USING (
    EXISTS (SELECT 1 FROM peminjaman WHERE peminjaman.id = peminjaman_detail.peminjaman_id AND peminjaman.tenant_id IN (SELECT get_user_tenants()))
);

DROP POLICY IF EXISTS "Members can manage peminjaman_detail" ON peminjaman_detail;
CREATE POLICY "Members can manage peminjaman_detail" ON peminjaman_detail FOR ALL USING (
    EXISTS (SELECT 1 FROM peminjaman WHERE peminjaman.id = peminjaman_detail.peminjaman_id AND peminjaman.tenant_id IN (SELECT get_user_tenants()))
);
