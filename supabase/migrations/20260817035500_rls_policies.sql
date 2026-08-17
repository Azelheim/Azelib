-- Enable RLS on all tables
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

-- Utility function to get user's tenants bypassing RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION get_user_tenants()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tenant_id FROM tenant_member WHERE user_id = auth.uid();
$$;

-- 1. tenant
-- Anyone can read tenant details (needed for join invitations or public QR check)
CREATE POLICY "Public can read tenant" ON tenant FOR SELECT USING (true);
-- Update restricted to owner
CREATE POLICY "Owner can update tenant" ON tenant FOR UPDATE USING (
    id IN (SELECT tenant_id FROM tenant_member WHERE user_id = auth.uid() AND role = 'owner')
);

-- 2. app_user
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON app_user FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON app_user FOR UPDATE USING (id = auth.uid());

-- 3. tenant_member
-- Members can read other members in the same tenant
CREATE POLICY "Members can read tenant members" ON tenant_member FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenants())
);
-- Users can see their own memberships
CREATE POLICY "Users can read own memberships" ON tenant_member FOR SELECT USING (
    user_id = auth.uid()
);

-- 4. kategori
CREATE POLICY "Public can read kategori" ON kategori FOR SELECT USING (true);
CREATE POLICY "Members can manage kategori" ON kategori FOR ALL USING (
    tenant_id IN (SELECT get_user_tenants())
);

-- 5. rak
CREATE POLICY "Public can read rak" ON rak FOR SELECT USING (true);
CREATE POLICY "Members can manage rak" ON rak FOR ALL USING (
    tenant_id IN (SELECT get_user_tenants())
);

-- 6. buku
CREATE POLICY "Public can read undeleted buku" ON buku FOR SELECT USING (dihapus = FALSE);
CREATE POLICY "Members can read all buku" ON buku FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenants())
);
CREATE POLICY "Members can manage buku" ON buku FOR ALL USING (
    tenant_id IN (SELECT get_user_tenants())
);

-- 7. salinan
CREATE POLICY "Public can read salinan of undeleted buku" ON salinan FOR SELECT USING (
    EXISTS (SELECT 1 FROM buku WHERE buku.id = salinan.buku_id AND buku.dihapus = FALSE)
);
CREATE POLICY "Members can read all salinan" ON salinan FOR SELECT USING (
    EXISTS (SELECT 1 FROM buku WHERE buku.id = salinan.buku_id AND buku.tenant_id IN (SELECT get_user_tenants()))
);
CREATE POLICY "Members can manage salinan" ON salinan FOR ALL USING (
    EXISTS (SELECT 1 FROM buku WHERE buku.id = salinan.buku_id AND buku.tenant_id IN (SELECT get_user_tenants()))
);

-- 8. anggota
CREATE POLICY "Members can read anggota" ON anggota FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenants())
);
CREATE POLICY "Members can manage anggota" ON anggota FOR ALL USING (
    tenant_id IN (SELECT get_user_tenants())
);

-- 9. tarif_denda_history
CREATE POLICY "Members can read tarif_denda_history" ON tarif_denda_history FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenants())
);
CREATE POLICY "Members can manage tarif_denda_history" ON tarif_denda_history FOR ALL USING (
    tenant_id IN (SELECT get_user_tenants())
);

-- 10. peminjaman
CREATE POLICY "Members can read peminjaman" ON peminjaman FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenants())
);
CREATE POLICY "Members can manage peminjaman" ON peminjaman FOR ALL USING (
    tenant_id IN (SELECT get_user_tenants())
);

-- 11. peminjaman_detail
CREATE POLICY "Members can read peminjaman_detail" ON peminjaman_detail FOR SELECT USING (
    EXISTS (SELECT 1 FROM peminjaman WHERE peminjaman.id = peminjaman_detail.peminjaman_id AND peminjaman.tenant_id IN (SELECT get_user_tenants()))
);
CREATE POLICY "Members can manage peminjaman_detail" ON peminjaman_detail FOR ALL USING (
    EXISTS (SELECT 1 FROM peminjaman WHERE peminjaman.id = peminjaman_detail.peminjaman_id AND peminjaman.tenant_id IN (SELECT get_user_tenants()))
);
