import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, SegmentedButtons, FAB, Portal, Modal, TextInput, Button, Snackbar, Chip } from 'react-native-paper';
import { mockClient } from '../../lib/api/mockClient';

const DUMMY_PEMINJAMAN = [
  { id: '1', namaPeminjam: 'Budi Santoso', judulBuku: 'Laskar Pelangi', tglPinjam: '2023-10-01', jatuhTempo: '2023-10-08', status: 'aktif' },
  { id: '2', namaPeminjam: 'Andi', judulBuku: 'Clean Code', tglPinjam: '2023-10-01', jatuhTempo: '2023-10-05', status: 'terlambat' },
];

export default function PeminjamanList() {
  const [tab, setTab] = useState('aktif');
  const [showModal, setShowModal] = useState(false);
  const [showHilangModal, setShowHilangModal] = useState(false);
  
  // New Loan Form
  const [anggotaId, setAnggotaId] = useState('');
  const [bukuKode, setBukuKode] = useState('');
  const [jatuhTempo, setJatuhTempo] = useState('');

  // Hilang Form
  const [selectedId, setSelectedId] = useState('');
  const [biaya, setBiaya] = useState('');

  const [snackMsg, setSnackMsg] = useState('');

  const filteredData = DUMMY_PEMINJAMAN.filter(p => {
    if (tab === 'aktif') return p.status === 'aktif';
    if (tab === 'terlambat') return p.status === 'terlambat';
    return p.status === 'dikembalikan' || p.status === 'hilang';
  });

  const handleCreate = async () => {
    setShowModal(false);
    setSnackMsg('Peminjaman berhasil dibuat');
  };

  const handleKembalikan = (id: string) => {
    Alert.alert("Konfirmasi", "Kembalikan buku ini?", [
      { text: "Batal", style: "cancel" },
      { text: "Kembalikan", onPress: () => setSnackMsg('Buku dikembalikan') }
    ]);
  };

  const handleTandaiHilang = (id: string) => {
    setSelectedId(id);
    setShowHilangModal(true);
  };

  const submitHilang = () => {
    setShowHilangModal(false);
    setSnackMsg('Status ditandai hilang dengan denda Rp' + biaya);
    setBiaya('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'aktif', label: 'Aktif' },
            { value: 'terlambat', label: 'Terlambat' },
            { value: 'riwayat', label: 'Riwayat' },
          ]}
        />
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card} mode="outlined">
            <Card.Title 
              title={item.judulBuku} 
              subtitle={`Peminjam: ${item.namaPeminjam}`} 
              right={() => <Chip style={{ marginRight: 16 }}>{item.status}</Chip>}
            />
            <Card.Content>
              <Text variant="bodyMedium">Pinjam: {item.tglPinjam}</Text>
              <Text variant="bodyMedium" style={{ color: item.status === 'terlambat' ? '#D32F2F' : '#000' }}>
                Jatuh Tempo: {item.jatuhTempo}
              </Text>
            </Card.Content>
            {(item.status === 'aktif' || item.status === 'terlambat') && (
              <Card.Actions>
                <Button onPress={() => handleTandaiHilang(item.id)} textColor="#D32F2F">Tandai Hilang</Button>
                <Button onPress={() => handleKembalikan(item.id)} mode="contained">Kembalikan</Button>
              </Card.Actions>
            )}
          </Card>
        )}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        label="Peminjaman Baru"
        onPress={() => setShowModal(true)}
      />

      <Portal>
        <Modal visible={showModal} onDismiss={() => setShowModal(false)} contentContainerStyle={styles.modalContent}>
          <Text variant="titleLarge" style={{ marginBottom: 16 }}>Peminjaman Baru</Text>
          <TextInput label="ID Anggota" value={anggotaId} onChangeText={setAnggotaId} mode="outlined" style={styles.input} />
          <TextInput label="Kode Eksemplar / ISBN" value={bukuKode} onChangeText={setBukuKode} mode="outlined" style={styles.input} />
          <TextInput label="Jatuh Tempo (YYYY-MM-DD)" value={jatuhTempo} onChangeText={setJatuhTempo} mode="outlined" style={styles.input} />
          
          <View style={styles.actionRow}>
            <Button onPress={() => setShowModal(false)} style={{ flex: 1 }}>Batal</Button>
            <Button mode="contained" onPress={handleCreate} style={{ flex: 1 }}>Simpan</Button>
          </View>
        </Modal>

        <Modal visible={showHilangModal} onDismiss={() => setShowHilangModal(false)} contentContainerStyle={styles.modalContent}>
          <Text variant="titleLarge" style={{ marginBottom: 16 }}>Tandai Hilang</Text>
          <TextInput label="Biaya Penggantian (Rp)" value={biaya} onChangeText={setBiaya} mode="outlined" keyboardType="numeric" style={styles.input} />
          
          <View style={styles.actionRow}>
            <Button onPress={() => setShowHilangModal(false)} style={{ flex: 1 }}>Batal</Button>
            <Button mode="contained" onPress={submitHilang} style={{ flex: 1 }} buttonColor="#D32F2F">Tandai Hilang</Button>
          </View>
        </Modal>
      </Portal>

      <Snackbar visible={!!snackMsg} onDismiss={() => setSnackMsg('')} duration={3000}>
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  tabContainer: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  list: { padding: 16, paddingBottom: 80 },
  card: { marginBottom: 12, backgroundColor: '#FFFFFF' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#000000' },
  modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8 },
  input: { marginBottom: 12, backgroundColor: '#FFFFFF' },
  actionRow: { flexDirection: 'row', marginTop: 8, gap: 8 }
});
