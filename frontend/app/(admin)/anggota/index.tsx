import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, FAB, Searchbar, Chip, Menu, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';

const DUMMY_ANGGOTA = [
  { id: '1', nama: 'Budi Santoso', kontak: '081234567890', kategori: 'Siswa', statusMeminjam: true },
  { id: '2', nama: 'Andi', kontak: '085612345678', kategori: 'Guru', statusMeminjam: false },
];

export default function AnggotaList() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState('Semua');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Cari anggota..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={{ minHeight: 0 }}
        />
        <Menu
          visible={filterVisible}
          onDismiss={() => setFilterVisible(false)}
          anchor={<Button mode="outlined" onPress={() => setFilterVisible(true)}>{filter}</Button>}>
          <Menu.Item onPress={() => { setFilter('Semua'); setFilterVisible(false); }} title="Semua" />
          <Menu.Item onPress={() => { setFilter('Sedang Meminjam'); setFilterVisible(false); }} title="Sedang Meminjam" />
          <Menu.Item onPress={() => { setFilter('Tidak Meminjam'); setFilterVisible(false); }} title="Tidak Meminjam" />
        </Menu>
      </View>

      <FlatList
        data={DUMMY_ANGGOTA}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card} mode="outlined" onPress={() => router.push(`/(admin)/anggota/${item.id}`)}>
            <Card.Title 
              title={item.nama} 
              subtitle={item.kontak} 
              right={() => (
                <View style={{ marginRight: 16 }}>
                  {item.statusMeminjam ? (
                    <Chip style={{ backgroundColor: '#FFF5E6' }} textStyle={{ color: '#E65100' }}>Meminjam</Chip>
                  ) : (
                    <Chip style={{ backgroundColor: '#E8F5E9' }} textStyle={{ color: '#2E7D32' }}>Tidak Meminjam</Chip>
                  )}
                </View>
              )}
            />
            <Card.Content>
              <Text variant="bodySmall" style={{ color: '#666' }}>Kategori: {item.kategori}</Text>
            </Card.Content>
          </Card>
        )}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/(admin)/anggota/tambah')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchbar: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    elevation: 0,
    height: 40,
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
});
