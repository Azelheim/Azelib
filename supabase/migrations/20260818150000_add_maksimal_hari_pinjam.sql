-- Migration: Add maksimal_hari_pinjam to tenant table
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS maksimal_hari_pinjam INTEGER NOT NULL DEFAULT 7;
