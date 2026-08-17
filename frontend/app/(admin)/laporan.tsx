import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, SegmentedButtons, TextInput, Snackbar, ActivityIndicator } from 'react-native-paper';
import * as Print from 'expo-print';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { FileDown } from 'lucide-react-native';

export default function Laporan() {
  const { tenantId, tenantNama } = useTenant();
  const [jenisLaporan, setJenisLaporan] = useState('peminjaman');
  const [tanggalMulai, setTanggalMulai] = useState('2024-01-01');
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().split('T')[0]);
  const [snackMsg, setSnackMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const buildPeminjamanHTML = async () => {
    const { data } = await supabase
      .from('peminjaman')
      .select('tanggal_pinjam, jatuh_tempo, tanggal_kembali, status, anggota:anggota_id(nama)')
      .eq('tenant_id', tenantId)
      .gte('tanggal_pinjam', tanggalMulai)
      .lte('tanggal_pinjam', tanggalSelesai)
      .order('tanggal_pinjam', { ascending: false });

    const rows = (data || []).map((item: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.anggota?.nama || '-'}</td>
        <td>${item.tanggal_pinjam}</td>
        <td>${item.jatuh_tempo}</td>
        <td>${item.tanggal_kembali || '-'}</td>
        <td>${item.status}</td>
      </tr>
    `).join('');

    return `
      <h1>Laporan Peminjaman</h1>
      <p>Perpustakaan: ${tenantNama || '-'}</p>
      <p>Periode: ${tanggalMulai} - ${tanggalSelesai}</p>
      <table>
        <tr><th>No</th><th>Peminjam</th><th>Tgl Pinjam</th><th>Jatuh Tempo</th><th>Tgl Kembali</th><th>Status</th></tr>
        ${rows || '<tr><td colspan="6">Tidak ada data</td></tr>'}
      </table>
    `;
  };

  const buildDendaHTML = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('peminjaman')
      .select('tanggal_pinjam, jatuh_tempo, tanggal_kembali, status, anggota:anggota_id(nama)')
      .eq('tenant_id', tenantId)
      .eq('status', 'aktif')
      .lt('jatuh_tempo', today);

    const { data: tarifData } = await supabase
      .from('tarif_denda_history')
      .select('nominal_per_hari')
      .eq('tenant_id', tenantId)
      .order('berlaku_mulai_tanggal', { ascending: false })
      .limit(1)
      .single();

    const tarifPerHari = tarifData?.nominal_per_hari || 500;

    const rows = (data || []).map((item: any, i: number) => {
      const jatuhTempo = new Date(item.jatuh_tempo);
      const sekarang = new Date();
      const hariTerlambat = Math.max(0, Math.floor((sekarang.getTime() - jatuhTempo.getTime()) / (1000 * 60 * 60 * 24)));
      const denda = hariTerlambat * Number(tarifPerHari);
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${item.anggota?.nama || '-'}</td>
          <td>${item.jatuh_tempo}</td>
          <td>${hariTerlambat} hari</td>
          <td>Rp ${denda.toLocaleString('id-ID')}</td>
        </tr>
      `;
    }).join('');

    return `
      <h1>Laporan Denda</h1>
      <p>Perpustakaan: ${tenantNama || '-'}</p>
      <p>Tarif denda: Rp ${Number(tarifPerHari).toLocaleString('id-ID')}/hari/buku</p>
      <table>
        <tr><th>No</th><th>Peminjam</th><th>Jatuh Tempo</th><th>Terlambat</th><th>Denda</th></tr>
        ${rows || '<tr><td colspan="5">Tidak ada denda</td></tr>'}
      </table>
    `;
  };

  const buildBukuHTML = async () => {
    const { data, count } = await supabase
      .from('buku')
      .select('judul, penulis, kategori:kategori_id(nama), rak:rak_id(nama), salinan(status)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('dihapus', false);

    const rows = (data || []).map((item: any, i: number) => {
      const totalSalinan = item.salinan?.length || 0;
      const tersedia = item.salinan?.filter((s: any) => s.status === 'tersedia').length || 0;
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${item.judul}</td>
          <td>${item.penulis || '-'}</td>
          <td>${item.kategori?.nama || '-'}</td>
          <td>${item.rak?.nama || '-'}</td>
          <td>${tersedia}/${totalSalinan}</td>
        </tr>
      `;
    }).join('');

    return `
      <h1>Laporan Buku</h1>
      <p>Perpustakaan: ${tenantNama || '-'}</p>
      <p>Total koleksi: ${count || 0} judul</p>
      <table>
        <tr><th>No</th><th>Judul</th><th>Penulis</th><th>Kategori</th><th>Rak</th><th>Salinan (Tersedia/Total)</th></tr>
        ${rows || '<tr><td colspan="6">Tidak ada buku</td></tr>'}
      </table>
    `;
  };

  const handleExportPDF = async () => {
    if (!tenantId) {
      setSnackMsg('Tenant belum dipilih');
      return;
    }
    setLoading(true);
    try {
      let bodyContent = '';
      if (jenisLaporan === 'peminjaman') bodyContent = await buildPeminjamanHTML();
      else if (jenisLaporan === 'denda') bodyContent = await buildDendaHTML();
      else bodyContent = await buildBukuHTML();

      const html = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              h1 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>${bodyContent}</body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html });
      setSnackMsg(`PDF berhasil dibuat: ${uri}`);
    } catch (e: any) {
      setSnackMsg(`Gagal export PDF: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="titleMedium" style={styles.label}>Jenis Laporan</Text>
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
        <Card.Title title="Filter Periode" />
        <Card.Content>
          <View style={styles.row}>
            <TextInput label="Mulai (YYYY-MM-DD)" value={tanggalMulai} onChangeText={setTanggalMulai} mode="outlined" style={[styles.input, { flex: 1, marginRight: 8 }]} />
            <TextInput label="Selesai (YYYY-MM-DD)" value={tanggalSelesai} onChangeText={setTanggalSelesai} mode="outlined" style={[styles.input, { flex: 1 }]} />
          </View>
        </Card.Content>
      </Card>

      <Button mode="contained" icon={() => <FileDown size={18} color="#FFF" />} onPress={handleExportPDF} style={styles.btn} loading={loading} disabled={loading}>
        Export PDF
      </Button>

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
  segmented: { marginBottom: 24 },
  card: { marginBottom: 24, backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row' },
  input: { backgroundColor: '#FFFFFF' },
  btn: { paddingVertical: 6, borderRadius: 8 }
});
