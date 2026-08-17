import { open } from '@op-engineering/op-sqlite';
import { supabase } from './supabase';

// Konfigurasi op-sqlite dengan SQLCipher (enkripsi)
export const db = open({
  name: 'perpustakaan_offline.sqlite',
  encryptionKey: 'super-secret-key', // Hardcoded fallback for MVP
});

// Setup skema awal untuk offline cache
export const initDb = async () => {
  try {
    // We add sync_status and updated_at to all tables for Last Write Wins
    await db.execute(`
      CREATE TABLE IF NOT EXISTS buku (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        isbn TEXT,
        kode_lokal TEXT,
        judul TEXT NOT NULL,
        penulis TEXT,
        penerbit TEXT,
        tahun_terbit INTEGER,
        kategori_id TEXT,
        rak_id TEXT,
        sinopsis TEXT,
        bahasa TEXT,
        jumlah_halaman INTEGER,
        cover_url TEXT,
        dihapus INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'synced',
        updated_at TEXT
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS salinan (
        id TEXT PRIMARY KEY,
        buku_id TEXT NOT NULL,
        nomor_urut INTEGER NOT NULL,
        kode_eksemplar TEXT NOT NULL,
        status TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        updated_at TEXT
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS anggota (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        nomor_anggota TEXT NOT NULL,
        nama TEXT NOT NULL,
        kategori_anggota TEXT,
        kontak TEXT,
        alamat TEXT,
        dihapus INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'synced',
        updated_at TEXT
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS peminjaman (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        anggota_id TEXT NOT NULL,
        tanggal_pinjam TEXT NOT NULL,
        jatuh_tempo TEXT NOT NULL,
        tanggal_kembali TEXT,
        status TEXT NOT NULL,
        biaya_penggantian REAL,
        sync_status TEXT DEFAULT 'synced',
        updated_at TEXT
      );
    `);

    console.log("Database offline initialized with sync schema.");
  } catch (error) {
    console.error("Gagal inisialisasi database offline:", error);
  }
};

export const syncWithCloud = async () => {
  console.log("Starting cloud sync...");
  
  // 1. Push local changes (pending_insert, pending_update) to Supabase
  // For each table, find records where sync_status != 'synced'
  
  // Example for 'buku'
  try {
    const { rows: pendingBuku } = await db.execute(
      `SELECT * FROM buku WHERE sync_status != 'synced'`
    );
    
    if (pendingBuku && pendingBuku.length > 0) {
      for (let i = 0; i < pendingBuku.length; i++) {
        const item = pendingBuku[i];
        const { sync_status, ...data } = item;
        
        // Push to Supabase (using a generic upsert or specific function)
        // This is a simplified LWW push:
        const { error } = await supabase.from('buku').upsert({
          ...data,
          dihapus: data.dihapus === 1,
        });

        if (!error) {
          await db.execute(
            `UPDATE buku SET sync_status = 'synced' WHERE id = ?`,
            [item.id]
          );
        }
      }
    }
  } catch (e) {
    console.error("Sync error (push):", e);
  }

  // 2. Pull remote changes from Supabase (LWW resolution)
  // In a real scenario we'd use a last_sync timestamp.
  try {
    const { data: remoteBuku, error } = await supabase.from('buku').select('*');
    if (!error && remoteBuku) {
      for (const b of remoteBuku) {
        // Check local
        const { rows } = await db.execute(`SELECT updated_at FROM buku WHERE id = ?`, [b.id]);
        if (rows && rows.length > 0) {
          const localItem = rows[0];
          const localDate = new Date((localItem.updated_at as string) || 0).getTime();
          const remoteDate = new Date(b.updated_at || 0).getTime();
          
          if (remoteDate > localDate) {
            // Remote is newer, update local
            await db.execute(
              `UPDATE buku SET judul = ?, updated_at = ?, sync_status = 'synced' WHERE id = ?`,
              [b.judul, b.updated_at, b.id]
            );
          }
        } else {
          // Insert new
          await db.execute(
            `INSERT INTO buku (id, tenant_id, judul, updated_at, sync_status) VALUES (?, ?, ?, ?, 'synced')`,
            [b.id, b.tenant_id, b.judul, b.updated_at]
          );
        }
      }
    }
  } catch (e) {
    console.error("Sync error (pull):", e);
  }

  console.log("Cloud sync finished.");
};
