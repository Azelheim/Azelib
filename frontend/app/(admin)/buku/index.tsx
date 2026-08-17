import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, FAB, Searchbar, Chip, Menu, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';

// Dummy data for visual
const DUMMY_BUKU = [
  { id: '1', judul: 'Laskar Pelangi', penulis: 'Andrea Hirata', kategori: 'Fiksi', salinanTersedia: 3, salinanTotal: 5 },
  { id: '2', judul: 'Clean Code', penulis: 'Robert C. Martin', kategori: 'Teknologi', salinanTersedia: 1, salinanTotal: 2 },
];

export default function BukuList() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter/Sort States
  const [sortVisible, setSortVisible] = useState(false);
  const [sortBy, setSortBy] = useState('Terbaru');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Cari buku..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={{ minHeight: 0 }}
        />
        <Menu
          visible={sortVisible}
          onDismiss={() => setSortVisible(false)}
          anchor={<Button mode="outlined" onPress={() => setSortVisible(true)}>{sortBy}</Button>}>
          <Menu.Item onPress={() => { setSortBy('Judul A-Z'); setSortVisible(false); }} title="Judul A-Z" />
          <Menu.Item onPress={() => { setSortBy('Penulis'); setSortVisible(false); }} title="Penulis" />
          <Menu.Item onPress={() => { setSortBy('Terbaru'); setSortVisible(false); }} title="Terbaru" />
        </Menu>
      </View>

      <View style={styles.filterRow}>
        <Chip mode="outlined" onPress={() => {}}>Kategori: Semua</Chip>
        <Chip mode="outlined" onPress={() => {}}>Rak: Semua</Chip>
        <Chip mode="outlined" onPress={() => {}}>Status: Semua</Chip>
      </View>

      <FlatList
        data={DUMMY_BUKU}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card} mode="outlined" onPress={() => router.push(`/(admin)/buku/${item.id}`)}>
            <Card.Title 
              title={item.judul} 
              subtitle={item.penulis} 
              right={(props) => (
                <View style={{ marginRight: 16, alignItems: 'flex-end' }}>
                  <Text variant="labelSmall" style={{ color: '#666' }}>Salinan</Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.salinanTersedia}/{item.salinanTotal}</Text>
                </View>
              )}
            />
            <Card.Content>
              <Chip style={{ alignSelf: 'flex-start' }}>{item.kategori}</Chip>
            </Card.Content>
          </Card>
        )}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/(admin)/buku/tambah')}
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
  },
  searchbar: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    elevation: 0,
    height: 40,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
