import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, SegmentedButtons, TextInput, Snackbar } from 'react-native-paper';
import * as Print from 'expo-print';

export default function Laporan() {
  const [jenisLaporan, setJenisLaporan] = useState('peminjaman');
  const [tanggalMulai, setTanggalMulai] = useState('2023-10-01');
  const [tanggalSelesai, setTanggalSelesai] = useState('2023-10-31');
  const [snackMsg, setSnackMsg] = useState('');

  const handleExportPDF = async () => {
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              h1 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Laporan ${jenisLaporan}</h1>
            <p>Periode: ${tanggalMulai} - ${tanggalSelesai}</p>
            <table>
              <tr><th>No</th><th>Data</th></tr>
              <tr><td>1</td><td>Contoh Data 1</td></tr>
            </table>
          </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html });
      setSnackMsg(`PDF berhasil dibuat: ${uri}`);
    } catch (e: any) {
      setSnackMsg(`Gagal export PDF: ${e.message}`);
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

      <Button mode="contained" icon="file-pdf-box" onPress={handleExportPDF} style={styles.btn}>
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
