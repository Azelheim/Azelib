import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Snackbar, Appbar, Card } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function DetailAnggota() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const isNew = id === 'tambah';

  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('');
  const [kontak, setKontak] = useState('');
  const [alamat, setAlamat] = useState('');

  const [snackMsg, setSnackMsg] = useState('');

  const handleSimpan = () => {
    if (!nama || nama.length < 3) {
      setSnackMsg("Nama minimal 3 karakter");
      return;
    }
    const kontakRegex = /^08\d{8,11}$/;
    if (!kontakRegex.test(kontak)) {
      setSnackMsg("Nomor HP tidak valid (contoh: 08123456789)");
      return;
    }
    
    setSnackMsg("Data anggota berhasil disimpan");
    setTimeout(() => {
      router.back();
    }, 1000);
  };

  const handleHapus = () => {
    Alert.alert("Konfirmasi", "Apakah Anda yakin ingin menghapus anggota ini?", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => {
        setSnackMsg("Anggota dihapus");
        setTimeout(() => router.back(), 1000);
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#fff' }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={isNew ? "Tambah Anggota" : "Detail Anggota"} />
        {!isNew && <Appbar.Action icon="delete" onPress={handleHapus} color="#D32F2F" />}
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {!isNew && (
          <View style={{ marginBottom: 16 }}>
            <Text variant="labelMedium" style={{ color: '#666' }}>Nomor Anggota</Text>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>ANG-00001</Text>
          </View>
        )}

        <TextInput label="Nama Lengkap" value={nama} onChangeText={setNama} mode="outlined" style={styles.input} />
        <TextInput label="Kategori (mis: Siswa, Guru)" value={kategori} onChangeText={setKategori} mode="outlined" style={styles.input} />
        <TextInput label="Nomor HP (08...)" value={kontak} onChangeText={setKontak} mode="outlined" keyboardType="phone-pad" style={styles.input} />
        <TextInput label="Alamat" value={alamat} onChangeText={setAlamat} mode="outlined" multiline numberOfLines={3} style={styles.input} />

        <Button mode="contained" onPress={handleSimpan} style={styles.simpanBtn}>
          Simpan
        </Button>

        {!isNew && (
          <Card style={styles.historyCard} mode="outlined">
            <Card.Title title="Riwayat Peminjaman" />
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: '#666' }}>Belum ada riwayat.</Text>
            </Card.Content>
          </Card>
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
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  simpanBtn: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 24,
  },
  historyCard: {
    backgroundColor: '#FAFAFA',
    marginTop: 16,
  }
});
