import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Snackbar, Appbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { mockClient } from '../../../lib/api/mockClient';

export default function DetailBuku() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const isNew = id === 'tambah';

  const [judul, setJudul] = useState('');
  const [penulis, setPenulis] = useState('');
  const [penerbit, setPenerbit] = useState('');
  const [tahun, setTahun] = useState('');
  const [isbn, setIsbn] = useState('');
  const [kategori, setKategori] = useState('');
  const [rak, setRak] = useState('');
  const [sinopsis, setSinopsis] = useState('');
  const [bahasa, setBahasa] = useState('');
  const [jumlahHalaman, setJumlahHalaman] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  const handleScanIsbn = async () => {
    if (!isbn) {
      setSnackMsg("Isi ISBN terlebih dahulu atau buka scanner");
      return;
    }
    setLoading(true);
    try {
      const data = await mockClient.buku.lookupIsbn(isbn);
      setJudul(data.judul || '');
      setPenulis(data.penulis || '');
      setPenerbit(data.penerbit || '');
      setTahun(data.tahun_terbit ? data.tahun_terbit.toString() : '');
      setCoverUrl(data.cover_url || '');
      setSnackMsg("Data ISBN berhasil ditarik");
    } catch (e: any) {
      setSnackMsg(e.message || "Gagal menarik data");
    } finally {
      setLoading(false);
    }
  };

  const handleSimpan = () => {
    if (!judul) {
      setSnackMsg("Judul wajib diisi");
      return;
    }
    // Simulate save
    setSnackMsg("Buku berhasil disimpan (Local Draft)");
    setTimeout(() => {
      router.back();
    }, 1000);
  };

  const handleHapus = () => {
    Alert.alert("Konfirmasi", "Apakah Anda yakin ingin menghapus buku ini?", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => {
        setSnackMsg("Buku dihapus");
        setTimeout(() => router.back(), 1000);
      }}
    ]);
  };

  const handleCetakKode = () => {
    setSnackMsg("Mencetak kode barcode eksemplar...");
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#fff' }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={isNew ? "Tambah Buku" : "Detail Buku"} />
        {!isNew && <Appbar.Action icon="delete" onPress={handleHapus} color="#D32F2F" />}
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {isNew && (
          <View style={styles.scanRow}>
            <TextInput
              label="ISBN (Opsional)"
              value={isbn}
              onChangeText={setIsbn}
              mode="outlined"
              style={styles.flexInput}
            />
            <Button mode="contained" onPress={handleScanIsbn} loading={loading} style={styles.scanBtn}>
              Cari
            </Button>
          </View>
        )}

        <TextInput label="Judul" value={judul} onChangeText={setJudul} mode="outlined" style={styles.input} />
        <TextInput label="Penulis" value={penulis} onChangeText={setPenulis} mode="outlined" style={styles.input} />
        <TextInput label="Penerbit" value={penerbit} onChangeText={setPenerbit} mode="outlined" style={styles.input} />
        
        <View style={styles.row}>
          <TextInput label="Tahun Terbit" value={tahun} onChangeText={setTahun} mode="outlined" style={[styles.input, { flex: 1, marginRight: 8 }]} keyboardType="numeric" />
          <TextInput label="Bahasa" value={bahasa} onChangeText={setBahasa} mode="outlined" style={[styles.input, { flex: 1 }]} />
        </View>

        <View style={styles.row}>
          <TextInput label="Kategori" value={kategori} onChangeText={setKategori} mode="outlined" style={[styles.input, { flex: 1, marginRight: 8 }]} />
          <TextInput label="Rak" value={rak} onChangeText={setRak} mode="outlined" style={[styles.input, { flex: 1 }]} />
        </View>

        <TextInput label="Jumlah Halaman" value={jumlahHalaman} onChangeText={setJumlahHalaman} mode="outlined" style={styles.input} keyboardType="numeric" />
        
        <TextInput label="Sinopsis" value={sinopsis} onChangeText={setSinopsis} mode="outlined" style={styles.input} multiline numberOfLines={4} />

        <Button mode="contained" onPress={handleSimpan} style={styles.simpanBtn}>
          Simpan
        </Button>

        {!isNew && (
          <Button mode="outlined" onPress={handleCetakKode} style={styles.simpanBtn} icon="printer">
            Cetak Kode Semua Eksemplar
          </Button>
        )}
      </ScrollView>

      <Snackbar
        visible={!!snackMsg}
        onDismiss={() => setSnackMsg('')}
        duration={3000}
      >
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  flexInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scanBtn: {
    marginLeft: 8,
    marginTop: 4,
    borderRadius: 8,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
  },
  simpanBtn: {
    marginTop: 16,
    paddingVertical: 6,
    borderRadius: 8,
  }
});
