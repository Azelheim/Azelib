import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, Card, Button, SegmentedButtons, TextInput, Snackbar, Portal, Dialog, Divider, Chip } from 'react-native-paper';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { FileDown, Share2, Save, X, Calendar } from 'lucide-react-native';

export default function Laporan() {
  const { tenantId, tenantNama } = useTenant();
  const [jenisLaporan, setJenisLaporan] = useState('peminjaman');

  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [tanggalMulai, setTanggalMulai] = useState(thirtyDaysAgoStr);
  const [tanggalSelesai, setTanggalSelesai] = useState(todayStr);
  const [snackMsg, setSnackMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Dialog export decision (REPORT-001)
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [generatedPdfUri, setGeneratedPdfUri] = useState<string | null>(null);

  // Period presets
  const applyPreset = (preset: 'hariIni' | '7hari' | '30hari' | 'tahunIni') => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (preset === 'hariIni') {
      setTanggalMulai(today);
      setTanggalSelesai(today);
    } else if (preset === '7hari') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setTanggalMulai(past7);
      setTanggalSelesai(today);
    } else if (preset === '30hari') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setTanggalMulai(past30);
      setTanggalSelesai(today);
    } else if (preset === 'tahunIni') {
      const startYear = `${now.getFullYear()}-01-01`;
      setTanggalMulai(startYear);
      setTanggalSelesai(today);
    }
  };

  const buildPeminjamanHTML = async () => {
    const { data } = await supabase
      .from('peminjaman')
      .select('tanggal_pinjam, jatuh_tempo, tanggal_kembali, status, anggota:anggota_id(nama), peminjaman_detail(salinan:salinan_id(buku:buku_id(judul)))')
      .eq('tenant_id', tenantId)
      .gte('tanggal_pinjam', tanggalMulai)
      .lte('tanggal_pinjam', tanggalSelesai)
      .order('tanggal_pinjam', { ascending: false });

    const rows = (data || []).map((item: any, i: number) => {
      const bukuTitles = item.peminjaman_detail?.map((d: any) => d.salinan?.buku?.judul || '-').join(', ') || '-';
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${item.anggota?.nama || '-'}</td>
          <td>${bukuTitles}</td>
          <td>${item.tanggal_pinjam}</td>
          <td>${item.jatuh_tempo}</td>
          <td>${item.tanggal_kembali || '-'}</td>
          <td>${item.status}</td>
        </tr>
      `;
    }).join('');

    return `
      <h1>Laporan Peminjaman</h1>
      <p><strong>Perpustakaan:</strong> ${tenantNama || '-'}</p>
      <p><strong>Periode:</strong> ${tanggalMulai} s/d ${tanggalSelesai}</p>
      <p><strong>Total Transaksi:</strong> ${(data || []).length}</p>
      <table>
        <thead>
          <tr><th>No</th><th>Peminjam</th><th>Buku</th><th>Tgl Pinjam</th><th>Jatuh Tempo</th><th>Tgl Kembali</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7" style="text-align:center;">Tidak ada transaksi peminjaman pada periode ini</td></tr>'}
        </tbody>
      </table>
    `;
  };

  const buildDendaHTML = async () => {
    const { data } = await supabase
      .from('peminjaman')
      .select('tanggal_pinjam, jatuh_tempo, tanggal_kembali, status, anggota:anggota_id(nama)')
      .eq('tenant_id', tenantId)
      .gte('tanggal_pinjam', tanggalMulai)
      .lte('tanggal_pinjam', tanggalSelesai);

    const { data: tarifData } = await supabase
      .from('tarif_denda_history')
      .select('nominal_per_hari')
      .eq('tenant_id', tenantId)
      .order('berlaku_mulai_tanggal', { ascending: false })
      .limit(1)
      .single();

    const tarifPerHari = tarifData?.nominal_per_hari || 500;
    const today = new Date().toISOString().split('T')[0];

    const overdueItems = (data || []).filter((item: any) => {
      if (item.status === 'aktif' && item.jatuh_tempo < today) return true;
      if (item.tanggal_kembali && item.tanggal_kembali > item.jatuh_tempo) return true;
      return false;
    });

    let totalDendaSemua = 0;

    const rows = overdueItems.map((item: any, i: number) => {
      const jatuhTempo = new Date(item.jatuh_tempo);
      const endDate = item.tanggal_kembali ? new Date(item.tanggal_kembali) : new Date();
      const hariTerlambat = Math.max(0, Math.floor((endDate.getTime() - jatuhTempo.getTime()) / (1000 * 60 * 60 * 24)));
      const denda = hariTerlambat * Number(tarifPerHari);
      totalDendaSemua += denda;

      return `
        <tr>
          <td>${i + 1}</td>
          <td>${item.anggota?.nama || '-'}</td>
          <td>${item.tanggal_pinjam}</td>
          <td>${item.jatuh_tempo}</td>
          <td>${item.tanggal_kembali || 'Belum Kembali'}</td>
          <td>${hariTerlambat} hari</td>
          <td>Rp ${denda.toLocaleString('id-ID')}</td>
        </tr>
      `;
    }).join('');

    return `
      <h1>Laporan Denda Keterlambatan</h1>
      <p><strong>Perpustakaan:</strong> ${tenantNama || '-'}</p>
      <p><strong>Periode:</strong> ${tanggalMulai} s/d ${tanggalSelesai}</p>
      <p><strong>Tarif Denda:</strong> Rp ${Number(tarifPerHari).toLocaleString('id-ID')}/hari/buku</p>
      <p><strong>Total Akumulasi Denda:</strong> Rp ${totalDendaSemua.toLocaleString('id-ID')}</p>
      <table>
        <thead>
          <tr><th>No</th><th>Peminjam</th><th>Tgl Pinjam</th><th>Jatuh Tempo</th><th>Tgl Kembali</th><th>Keterlambatan</th><th>Denda</th></tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7" style="text-align:center;">Tidak ada denda pada periode ini</td></tr>'}
        </tbody>
      </table>
    `;
  };

  const buildBukuHTML = async () => {
    const { data, count } = await supabase
      .from('buku')
      .select('judul, penulis, isbn, kode_lokal, created_at, kategori:kategori_id(nama), rak:rak_id(nama), salinan(status)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('dihapus', false)
      .gte('created_at', `${tanggalMulai}T00:00:00Z`)
      .lte('created_at', `${tanggalSelesai}T23:59:59Z`);

    const rows = (data || []).map((item: any, i: number) => {
      const totalSalinan = item.salinan?.length || 0;
      const tersedia = item.salinan?.filter((s: any) => s.status === 'tersedia').length || 0;
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${item.judul}</td>
          <td>${item.penulis || '-'}</td>
          <td>${item.isbn || item.kode_lokal || '-'}</td>
          <td>${item.kategori?.nama || '-'}</td>
          <td>${item.rak?.nama || '-'}</td>
          <td>${tersedia}/${totalSalinan}</td>
        </tr>
      `;
    }).join('');

    return `
      <h1>Laporan Koleksi & Mutasi Buku</h1>
      <p><strong>Perpustakaan:</strong> ${tenantNama || '-'}</p>
      <p><strong>Periode Registrasi:</strong> ${tanggalMulai} s/d ${tanggalSelesai}</p>
      <p><strong>Jumlah Buku Terdaftar di Periode:</strong> ${count || 0} judul</p>
      <table>
        <thead>
          <tr><th>No</th><th>Judul</th><th>Penulis</th><th>ISBN / Kode</th><th>Kategori</th><th>Rak</th><th>Salinan (Tersedia/Total)</th></tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7" style="text-align:center;">Tidak ada penambahan buku pada periode ini</td></tr>'}
        </tbody>
      </table>
    `;
  };

  const handleExportPDF = async () => {
    if (!tenantId) {
      setSnackMsg('Tenant belum dipilih');
      return;
    }

    if (!tanggalMulai || !tanggalSelesai) {
      setSnackMsg('Tentukan periode awal dan akhir laporan');
      return;
    }

    if (tanggalMulai > tanggalSelesai) {
      setSnackMsg('Tanggal mulai tidak boleh lebih besar dari tanggal selesai');
      return;
    }

    setLoading(true);
    try {
      let bodyContent = '';
      if (jenisLaporan === 'peminjaman') bodyContent = await buildPeminjamanHTML();
      else if (jenisLaporan === 'denda') bodyContent = await buildDendaHTML();
      else bodyContent = await buildBukuHTML();

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
              h1 { text-align: center; margin-bottom: 4px; font-size: 20px; }
              p { margin: 4px 0; font-size: 13px; color: #444; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f7f7f7; font-weight: 600; }
              tr:nth-child(even) { background-color: #fafafa; }
            </style>
          </head>
          <body>${bodyContent}</body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      setGeneratedPdfUri(uri);
      // Buka dialog konfirmasi (REPORT-001) tanpa auto-save / auto-share
      setShowExportDialog(true);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(`Gagal membuat PDF: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSimpanAction = async () => {
    if (!generatedPdfUri) return;
    try {
      setShowExportDialog(false);
      await Sharing.shareAsync(generatedPdfUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Simpan Dokumen Laporan PDF',
      });
      setSnackMsg('Dokumen siap disimpan');
    } catch (e: any) {
      setSnackMsg(`Gagal menyimpan: ${e.message}`);
    }
  };

  const handleShareAction = async () => {
    if (!generatedPdfUri) return;
    try {
      setShowExportDialog(false);
      await Sharing.shareAsync(generatedPdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Bagikan Laporan Perpustakaan',
      });
      setSnackMsg('Berbagi dokumen PDF');
    } catch (e: any) {
      setSnackMsg(`Gagal membagikan: ${e.message}`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="titleMedium" style={styles.label}>Pilih Jenis Laporan</Text>
      <SegmentedButtons
        value={jenisLaporan}
        onValueChange={setJenisLaporan}
        buttons={[
          { value: 'peminjaman', label: 'Peminjaman' },
          { value: 'denda', label: 'Denda' },
          { value: 'buku', label: 'Buku' },
        ]}
        style={styles.segmented}
      />

      <Card mode="outlined" style={styles.card}>
        <Card.Title title="Periode Laporan" left={() => <Calendar size={20} color="#000" />} />
        <Card.Content>
          <View style={styles.presetRow}>
            <Chip onPress={() => applyPreset('hariIni')} style={styles.presetChip}>Hari Ini</Chip>
            <Chip onPress={() => applyPreset('7hari')} style={styles.presetChip}>7 Hari</Chip>
            <Chip onPress={() => applyPreset('30hari')} style={styles.presetChip}>30 Hari</Chip>
            <Chip onPress={() => applyPreset('tahunIni')} style={styles.presetChip}>Tahun Ini</Chip>
          </View>

          <View style={styles.row}>
            <TextInput
              label="Tanggal Mulai (YYYY-MM-DD)"
              value={tanggalMulai}
              onChangeText={setTanggalMulai}
              mode="outlined"
              style={[styles.input, { flex: 1, marginRight: 8 }]}
            />
            <TextInput
              label="Tanggal Selesai (YYYY-MM-DD)"
              value={tanggalSelesai}
              onChangeText={setTanggalSelesai}
              mode="outlined"
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon={() => <FileDown size={18} color="#FFF" />}
        onPress={handleExportPDF}
        style={styles.btn}
        loading={loading}
        disabled={loading}
      >
        Export PDF
      </Button>

      {/* Dialog Pilihan User: Simpan atau Share (REPORT-001) */}
      <Portal>
        <Dialog visible={showExportDialog} onDismiss={() => setShowExportDialog(false)} style={styles.dialog}>
          <Dialog.Title style={{ fontWeight: 'bold', fontSize: 18 }}>Laporan PDF Siap</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
              Laporan {jenisLaporan} untuk periode {tanggalMulai} s/d {tanggalSelesai} berhasil dibuat. Silakan tentukan tindakan:
            </Text>
            <Divider style={{ marginVertical: 8 }} />
          </Dialog.Content>
          <Dialog.Actions style={{ flexDirection: 'column', gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
            <Button
              mode="contained"
              icon={() => <Save size={18} color="#FFF" />}
              onPress={handleSimpanAction}
              style={{ width: '100%', borderRadius: 8 }}
            >
              Simpan ke Perangkat
            </Button>
            <Button
              mode="outlined"
              icon={() => <Share2 size={18} color="#000" />}
              onPress={handleShareAction}
              style={{ width: '100%', borderRadius: 8 }}
            >
              Bagikan (Share)
            </Button>
            <Button
              mode="text"
              onPress={() => setShowExportDialog(false)}
              style={{ width: '100%' }}
            >
              Tutup
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!snackMsg} onDismiss={() => setSnackMsg('')} duration={3000}>
        {snackMsg}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16 },
  label: { marginBottom: 8, fontWeight: 'bold' },
  segmented: { marginBottom: 20 },
  card: { marginBottom: 20, backgroundColor: '#FFFFFF' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  presetChip: { height: 32 },
  row: { flexDirection: 'row' },
  input: { backgroundColor: '#FFFFFF' },
  btn: { paddingVertical: 6, borderRadius: 8 },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 12 },
});

