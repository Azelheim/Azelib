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
  
  const tables = ['buku', 'salinan', 'anggota', 'peminjaman'];

  for (const table of tables) {
    // 1. Push local changes
    try {
      const { rows: pending } = await db.execute(`SELECT * FROM ${table} WHERE sync_status != 'synced'`);
      if (pending && pending.length > 0) {
        for (let i = 0; i < pending.length; i++) {
          const item = pending[i];
          const { sync_status, ...data } = item;
          
          if (data.dihapus !== undefined) data.dihapus = data.dihapus === 1;
          
          const { error } = await supabase.from(table).upsert(data);
          if (!error) {
            await db.execute(`UPDATE ${table} SET sync_status = 'synced' WHERE id = ?`, [item.id]);
          }
        }
      }
    } catch (e) {
      console.error(`Sync error (push) for ${table}:`, e);
    }

    // 2. Pull remote changes
    try {
      // In production, you would use a last_sync_at timestamp to only fetch new data
      const { data: remoteData, error } = await supabase.from(table).select('*');
      if (!error && remoteData) {
        for (const r of remoteData) {
          const { rows } = await db.execute(`SELECT updated_at FROM ${table} WHERE id = ?`, [r.id]);
          const remoteDate = new Date(r.updated_at || 0).getTime();

          const rData = { ...r };
          if (rData.dihapus !== undefined) rData.dihapus = rData.dihapus ? 1 : 0;

          if (rows && rows.length > 0) {
            const localDate = new Date((rows[0].updated_at as string) || 0).getTime();
            if (remoteDate > localDate) {
              const keys = Object.keys(rData);
              const values = Object.values(rData) as any[];
              const setClause = keys.map(k => `${k} = ?`).join(', ');
              
              await db.execute(
                `UPDATE ${table} SET ${setClause}, sync_status = 'synced' WHERE id = ?`,
                [...values, r.id]
              );
            }
          } else {
            const keys = Object.keys(rData);
            const values = Object.values(rData) as any[];
            const placeholders = keys.map(() => '?').join(', ');
            
            await db.execute(
              `INSERT INTO ${table} (${keys.join(', ')}, sync_status) VALUES (${placeholders}, 'synced')`,
              [...values]
            );
          }
        }
      }
    } catch (e) {
      console.error(`Sync error (pull) for ${table}:`, e);
    }
  }

  console.log("Cloud sync finished.");
};
