import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const outDir = 'd:/Azelib/playstore-assets/Screenshots-HD';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const slides = [
  {
    outFile: 'screenshot-1-dashboard.png',
    rawImg: 'Screenshoot/WhatsApp Image 2026-08-28 at 13.28.16 (2).jpeg',
    badge: '01 // METRIK PERPUSTAKAAN',
    title: 'Dashboard <span>Statistik Real-time</span>',
    subtitle: 'Pantau stok koleksi, peminjaman aktif, grafik tren, & akumulasi denda'
  },
  {
    outFile: 'screenshot-2-katalog-buku.png',
    rawImg: 'Screenshoot/WhatsApp Image 2026-08-28 at 13.28.16 (1).jpeg',
    badge: '02 // KATALOG & PENEMPATAN',
    title: 'Katalog Buku <span>&amp; Manajemen Rak</span>',
    subtitle: 'Pencarian instan dengan filter kategori, rak penempatan, & stok eksemplar'
  },
  {
    outFile: 'screenshot-3-peminjaman-baru.png',
    rawImg: 'Screenshoot/WhatsApp Image 2026-08-28 at 14.06.43.jpeg',
    badge: '03 // TRANSAKSI SIRKULASI',
    title: 'Peminjaman Baru <span>Cepat &amp; Praktis</span>',
    subtitle: 'Pilih anggota, tentukan eksemplar buku, & validasi kuota otomatis'
  },
  {
    outFile: 'screenshot-4-sirkulasi-peminjaman.png',
    rawImg: 'Screenshoot/WhatsApp Image 2026-08-28 at 13.28.15.jpeg',
    badge: '04 // STATUS PEMINJAMAN',
    title: 'Monitoring Sirkulasi <span>&amp; Pengembalian</span>',
    subtitle: 'Kelola transaksi Aktif, Terlambat, Riwayat, serta pelaporan buku hilang'
  },
  {
    outFile: 'screenshot-5-manajemen-anggota.png',
    rawImg: 'Screenshoot/WhatsApp Image 2026-08-28 at 13.28.17.jpeg',
    badge: '05 // DATA ANGGOTA',
    title: 'Manajemen Anggota <span>Instansi</span>',
    subtitle: 'Penomoran otomatis format instansi & pemantauan status pinjam aktif'
  },
  {
    outFile: 'screenshot-6-laporan-pdf.png',
    rawImg: 'Screenshoot/WhatsApp Image 2026-08-28 at 13.28.16.jpeg',
    badge: '06 // REKAPITULASI & DOKUMEN',
    title: 'Laporan Sirkulasi <span>&amp; Ekspor PDF</span>',
    subtitle: 'Filter periode fleksibel & cetak dokumen laporan resmi siap dibagikan'
  }
];

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

for (let i = 0; i < slides.length; i++) {
  const s = slides[i];
  const targetPng = path.join(outDir, s.outFile).replace(/\\/g, '/');
  const params = new URLSearchParams({
    badge: s.badge,
    title: s.title,
    subtitle: s.subtitle,
    img: s.rawImg
  });

  const url = `file:///D:/Azelib/playstore-assets/render-showcase.html?${params.toString()}`;
  console.log(`[${i+1}/${slides.length}] Rendering ${s.outFile}...`);

  const cmd = `"${edgePath}" --headless=new --disable-gpu --force-device-scale-factor=1 --window-size=1080,2280 "--screenshot=${targetPng}" "${url}"`;
  execSync(cmd, { stdio: 'inherit' });
}

console.log('All 6 HD screenshots rendered successfully!');
