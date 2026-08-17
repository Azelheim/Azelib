export type MemberRole = 'owner' | 'admin' | 'staff';
export type StatusSalinan = 'tersedia' | 'dipinjam' | 'hilang';
export type StatusPeminjaman = 'aktif' | 'dikembalikan' | 'hilang';

export interface Buku {
  id: string; tenantId: string; isbn: string | null; kodeLokal: string | null;
  judul: string; penulis: string | null; penerbit: string | null; tahunTerbit: number | null;
  kategoriId: string | null; rakId: string | null; sinopsis: string | null;
  bahasa: string | null; jumlahHalaman: number | null; coverUrl: string | null;
  dihapus: boolean;
}

export interface Salinan {
  id: string; bukuId: string; nomorUrut: number; kodeEksemplar: string; status: StatusSalinan;
}

export interface Anggota {
  id: string; tenantId: string; nomorAnggota: string; nama: string;
  kategoriAnggota: string | null; kontak: string | null; alamat: string | null; dihapus: boolean;
}

export interface Peminjaman {
  id: string; tenantId: string; anggotaId: string; tanggalPinjam: string; jatuhTempo: string;
  tanggalKembali: string | null; status: StatusPeminjaman; biayaPenggantian: number | null;
}

export interface DashboardSummary {
  jumlahBuku: number; peminjamAktif: number; bukuDipinjam: number; bukuTerlambat: number;
  totalDendaPeriode: number;
}
