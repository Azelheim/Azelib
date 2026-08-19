-- 1. Enable Realtime Replication for tenant table so postgres_changes events broadcast to all connected clients
ALTER TABLE tenant REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE tenant;

-- 2. Allow both Owner and Admin to update tenant settings & qr_code_value
DROP POLICY IF EXISTS "Owner can update tenant" ON tenant;
DROP POLICY IF EXISTS "Owner and Admin can update tenant" ON tenant;
CREATE POLICY "Owner and Admin can update tenant" ON tenant FOR UPDATE USING (
    id IN (SELECT tenant_id FROM tenant_member WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
