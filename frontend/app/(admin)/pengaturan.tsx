import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal as RNModal } from 'react-native';
import { Text, Card, Button, TextInput, List, IconButton, Portal, Modal, Snackbar, Divider } from 'react-native-paper';
import { syncWithCloud } from '../../lib/db';

const DUMMY_MEMBERS = [
  { id: '1', nama: 'Budi (Owner)', email: 'budi@email.com', role: 'owner' },
  { id: '2', nama: 'Andi', email: 'andi@email.com', role: 'admin' },
  { id: '3', nama: 'Siti', email: 'siti@email.com', role: 'staff' },
];

export default function Pengaturan() {
  const [batasPinjam, setBatasPinjam] = useState('3');
  const [dendaHari, setDendaHari] = useState('500');
  
  const [showUndang, setShowUndang] = useState(false);
  const [emailUndang, setEmailUndang] = useState('');
  
  const [showQR, setShowQR] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  const handleSimpanPengaturan = () => {
    setSnackMsg('Pengaturan batas pinjam & denda berhasil disimpan');
  };

  const handleSyncManual = async () => {
    setSnackMsg('Memulai sinkronisasi...');
    await syncWithCloud();
    setSnackMsg('Sinkronisasi selesai');
  };

  const handleUndang = () => {
    if (!emailUndang) return;
    setSnackMsg(`Undangan dikirim ke ${emailUndang}`);
    setShowUndang(false);
    setEmailUndang('');
  };

  const handleUbahRole = (nama: string, roleSekarang: string) => {
    if (roleSekarang === 'owner') {
      setSnackMsg('Role Owner tidak dapat diubah dari sini');
      return;
    }
    Alert.alert("Ubah Otoritas", `Ubah peran untuk ${nama}?`, [
      { text: "Batal", style: "cancel" },
      { text: "Jadikan Admin", onPress: () => setSnackMsg(`${nama} menjadi Admin`) },
      { text: "Jadikan Staff", onPress: () => setSnackMsg(`${nama} menjadi Staff`) },
    ]);
  };

  const handleHapusMember = (nama: string) => {
    Alert.alert("Konfirmasi", `Hapus ${nama} dari perpustakaan?`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => setSnackMsg(`${nama} dihapus`) }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* Settings Section */}
      <Card style={styles.card} mode="outlined">
        <Card.Title title="Kebijakan Perpustakaan" />
        <Card.Content>
          <TextInput
            label="Batas Maksimal Peminjaman (Buku)"
            value={batasPinjam}
            onChangeText={setBatasPinjam}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Nominal Denda per Hari (Rp)"
            value={dendaHari}
            onChangeText={setDendaHari}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
          <Button mode="contained" onPress={handleSimpanPengaturan} style={styles.btn}>Simpan Kebijakan</Button>
        </Card.Content>
      </Card>

      {/* QR Code Section */}
      <Card style={styles.card} mode="outlined">
        <Card.Title title="QR Code Perpustakaan" subtitle="Tampilkan kode ini agar pengunjung bisa scan" />
        <Card.Content style={{ alignItems: 'center' }}>
          <Button mode="outlined" icon="qrcode" onPress={() => setShowQR(true)} style={styles.btn}>Tampilkan QR Code</Button>
        </Card.Content>
      </Card>

      {/* Dev Tools Section */}
      <Card style={styles.card} mode="outlined">
        <Card.Title title="Testing & Debugging" subtitle="Alat untuk pengujian Task C" />
        <Card.Content>
          <Button mode="outlined" icon="cloud-sync" onPress={handleSyncManual} style={styles.btn}>Sinkronisasi Manual (Cloud)</Button>
        </Card.Content>
      </Card>

      {/* Member Section */}
      <Card style={styles.card} mode="outlined">
        <Card.Title 
          title="Anggota Staff & Admin" 
          right={(props) => <Button onPress={() => setShowUndang(true)}>Undang</Button>}
        />
        <Card.Content>
          {DUMMY_MEMBERS.map((m, i) => (
            <View key={m.id}>
              <List.Item
                title={m.nama}
                description={`${m.email} • ${m.role.toUpperCase()}`}
                right={props => (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IconButton icon="shield-account" size={20} onPress={() => handleUbahRole(m.nama, m.role)} />
                    {m.role !== 'owner' && <IconButton icon="delete" size={20} iconColor="#D32F2F" onPress={() => handleHapusMember(m.nama)} />}
                  </View>
                )}
              />
              {i < DUMMY_MEMBERS.length - 1 && <Divider />}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Modals */}
      <Portal>
        <Modal visible={showUndang} onDismiss={() => setShowUndang(false)} contentContainerStyle={styles.modalContent}>
          <Text variant="titleLarge" style={{ marginBottom: 16 }}>Undang Staff/Admin Baru</Text>
          <TextInput label="Alamat Email" value={emailUndang} onChangeText={setEmailUndang} mode="outlined" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
          <View style={styles.row}>
            <Button onPress={() => setShowUndang(false)} style={{ flex: 1 }}>Batal</Button>
            <Button mode="contained" onPress={handleUndang} style={{ flex: 1 }}>Kirim</Button>
          </View>
        </Modal>

        <Modal visible={showQR} onDismiss={() => setShowQR(false)} contentContainerStyle={[styles.modalContent, { alignItems: 'center' }]}>
          <Text variant="titleLarge" style={{ marginBottom: 16 }}>QR Code Perpustakaan</Text>
          <View style={styles.qrPlaceholder}>
            <Text>QR CODE</Text>
          </View>
          <Button mode="contained" icon="download" onPress={() => setSnackMsg('QR Code Disimpan')} style={[styles.btn, { width: '100%' }]}>Simpan Gambar</Button>
          <Button onPress={() => setShowQR(false)} style={{ marginTop: 8 }}>Tutup</Button>
        </Modal>
      </Portal>

      <Snackbar visible={!!snackMsg} onDismiss={() => setSnackMsg('')} duration={3000}>
        {snackMsg}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 24, backgroundColor: '#FFFFFF' },
  input: { marginBottom: 16, backgroundColor: '#FFFFFF' },
  btn: { paddingVertical: 6, borderRadius: 8 },
  modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8 },
  row: { flexDirection: 'row', gap: 8 },
  qrPlaceholder: { width: 200, height: 200, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#DDD' }
});
