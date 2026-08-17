import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Searchbar, SegmentedButtons, Card, Chip, Appbar, Portal, Modal, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';

const DUMMY_KATALOG = [
  { id: '1', judul: 'Laskar Pelangi', penulis: 'Andrea Hirata', kategori: 'Fiksi', rak: 'Rak A1', sinopsis: 'Cerita anak Belitung...', ketersediaan: 'Tersedia' },
  { id: '2', judul: 'Clean Code', penulis: 'Robert C. Martin', kategori: 'Teknologi', rak: 'Rak T2', sinopsis: 'Buku panduan software...', ketersediaan: 'Habis Dipinjam' },
];

export default function Pengunjung() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('semua');
  const [selectedBuku, setSelectedBuku] = useState<any>(null);

  const handleKeluar = () => {
    router.replace('/');
  };

  const filteredData = DUMMY_KATALOG.filter(buku => {
    if (tab === 'semua') return true;
    // dummy filter logic
    return true; 
  });

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#fff', elevation: 2 }}>
        <Appbar.Content title="Katalog Perpustakaan" />
        <Appbar.Action icon="logout" onPress={handleKeluar} />
      </Appbar.Header>

      <View style={styles.stickyHeader}>
        <Searchbar
          placeholder="Cari judul, penulis..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'semua', label: 'Semua Buku' },
            { value: 'kategori', label: 'Kategori' },
            { value: 'rak', label: 'Rak' },
          ]}
          style={{ marginTop: 12 }}
        />
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card} mode="outlined" onPress={() => setSelectedBuku(item)}>
            <Card.Title 
              title={item.judul} 
              subtitle={item.penulis} 
              right={() => (
                <Chip style={{ marginRight: 16, backgroundColor: item.ketersediaan === 'Tersedia' ? '#E8F5E9' : '#FFF5E6' }} textStyle={{ color: item.ketersediaan === 'Tersedia' ? '#2E7D32' : '#E65100' }}>
                  {item.ketersediaan}
                </Chip>
              )}
            />
            <Card.Content>
              <Text variant="bodySmall" style={{ color: '#666' }}>Kategori: {item.kategori} | Rak: {item.rak}</Text>
            </Card.Content>
          </Card>
        )}
      />

      <Portal>
        <Modal visible={!!selectedBuku} onDismiss={() => setSelectedBuku(null)} contentContainerStyle={styles.modalContent}>
          {selectedBuku && (
            <View>
              <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{selectedBuku.judul}</Text>
              <Text variant="bodyLarge" style={{ color: '#666', marginBottom: 16 }}>{selectedBuku.penulis}</Text>
              
              <View style={styles.badgeRow}>
                <Chip>{selectedBuku.kategori}</Chip>
                <Chip>{selectedBuku.rak}</Chip>
                <Chip style={{ backgroundColor: selectedBuku.ketersediaan === 'Tersedia' ? '#E8F5E9' : '#FFF5E6' }}>{selectedBuku.ketersediaan}</Chip>
              </View>

              <Text variant="titleMedium" style={{ marginTop: 16, marginBottom: 8, fontWeight: 'bold' }}>Sinopsis</Text>
              <Text variant="bodyMedium">{selectedBuku.sinopsis}</Text>

              <Button mode="contained" onPress={() => setSelectedBuku(null)} style={{ marginTop: 24, borderRadius: 8 }}>Tutup</Button>
            </View>
          )}
        </Modal>
      </Portal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  stickyHeader: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 1 },
  searchbar: { backgroundColor: '#F5F5F5', elevation: 0 },
  list: { padding: 16 },
  card: { marginBottom: 12, backgroundColor: '#FFFFFF' },
  modalContent: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 12 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
});
