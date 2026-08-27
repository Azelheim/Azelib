-- Migration: Account and User Data Deletion Stored Procedure
-- Purpose: Supports Google Play Account Deletion Policy by providing atomic cascade deletion

CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    t_record RECORD;
BEGIN
    -- 1. Delete all tenants owned by the user (Cascades to buku, salinan, kategori, rak, anggota, peminjaman)
    FOR t_record IN
        SELECT tenant_id FROM public.tenant_member
        WHERE user_id = target_user_id AND role = 'owner'
    LOOP
        DELETE FROM public.tenant WHERE id = t_record.tenant_id;
    END LOOP;

    -- 2. Delete all tenant memberships for this user
    DELETE FROM public.tenant_member WHERE user_id = target_user_id;

    -- 3. Delete from app_user
    DELETE FROM public.app_user WHERE id = target_user_id;

    -- 4. Delete from Supabase auth.users
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
