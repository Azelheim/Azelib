import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, FAB, Searchbar, Chip, Menu, Button, Snackbar, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { Plus } from 'lucide-react-native';

interface BukuItem {
  id: string;
  judul: string;
  penulis: string | null;
  kategori: { id: string; nama: string } | null;
  rak: { id: string; nama: string } | null;
  salinan: { status: string }[];
  created_at: string;
}

export default function BukuList() {
  const router = useRouter();
  const { tenantId, userRole } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<BukuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackMsg, setSnackMsg] = useState('');
  
  // Sort
  const [sortVisible, setSortVisible] = useState(false);
  const [sortBy, setSortBy] = useState('Terbaru');

  // Filters
  const [kategoriList, setKategoriList] = useState<{id: string; nama: string}[]>([]);
  const [rakList, setRakList] = useState<{id: string; nama: string}[]>([]);
  const [filterKategori, setFilterKategori] = useState<string | null>(null);
  const [filterRak, setFilterRak] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [kategoriMenuVisible, setKategoriMenuVisible] = useState(false);
  const [rakMenuVisible, setRakMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (tenantId) {
        fetchBooks();
        fetchFilters();
      }
    }, [tenantId])
  );

  const fetchFilters = async () => {
    try {
      const [katRes, rakRes] = await Promise.all([
        supabase.from('kategori').select('id, nama').eq('tenant_id', tenantId),
        supabase.from('rak').select('id, nama').eq('tenant_id', tenantId),
      ]);
      if (katRes.data) setKategoriList(katRes.data);
      if (rakRes.data) setRakList(rakRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('buku')
        .select(`
          id, judul, penulis, created_at,
          kategori:kategori_id(id, nama),
          rak:rak_id(id, nama),
          salinan(status)
        `)
        .eq('tenant_id', tenantId)
        .eq('dihapus', false);

      if (error) throw error;
      setBooks((data as any[]) || []);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal memuat daftar buku');
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort
  const filteredAndSortedBooks = useMemo(() => {
    return books
      .filter(b => {
        // Search
        const q = searchQuery.toLowerCase();
        const matchSearch = b.judul.toLowerCase().includes(q) || (b.penulis && b.penulis.toLowerCase().includes(q));
        if (!matchSearch) return false;

        // Filter Kategori
        if (filterKategori && b.kategori?.id !== filterKategori) return false;

        // Filter Rak
        if (filterRak && b.rak?.id !== filterRak) return false;

        // Filter Status
        if (filterStatus) {
          const totalTersedia = b.salinan.filter(s => s.status === 'tersedia').length;
          if (filterStatus === 'tersedia' && totalTersedia === 0) return false;
          if (filterStatus === 'habis' && totalTersedia > 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'Judul A-Z') return a.judul.localeCompare(b.judul);
        if (sortBy === 'Penulis') return (a.penulis || '').localeCompare(b.penulis || '');
        if (sortBy === 'Terbaru') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return 0;
      });
  }, [books, searchQuery, filterKategori, filterRak, filterStatus, sortBy]);

  if (loading && books.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search & Sort */}
      <View style={styles.header}>
        <Searchbar
          placeholder="Cari judul atau penulis..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <Menu
          visible={sortVisible}
          onDismiss={() => setSortVisible(false)}
          anchor={<Button mode="outlined" onPress={() => setSortVisible(true)} style={styles.sortBtn}>{sortBy}</Button>}>
          <Menu.Item onPress={() => { setSortBy('Judul A-Z'); setSortVisible(false); }} title="Judul A-Z" />
          <Menu.Item onPress={() => { setSortBy('Penulis'); setSortVisible(false); }} title="Penulis" />
          <Menu.Item onPress={() => { setSortBy('Terbaru'); setSortVisible(false); }} title="Terbaru" />
        </Menu>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {/* Kategori Menu */}
        <Menu
          visible={kategoriMenuVisible}
          onDismiss={() => setKategoriMenuVisible(false)}
          anchor={
            <Chip 
              selected={!!filterKategori} 
              onPress={() => setKategoriMenuVisible(true)}
              onClose={filterKategori ? () => setFilterKategori(null) : undefined}
              style={styles.chip}>
              {filterKategori ? kategoriList.find(k => k.id === filterKategori)?.nama || 'Kategori' : 'Semua Kategori'}
            </Chip>
          }>
          <Menu.Item onPress={() => { setFilterKategori(null); setKategoriMenuVisible(false); }} title="Semua Kategori" />
          {kategoriList.map(k => (
            <Menu.Item key={k.id} onPress={() => { setFilterKategori(k.id); setKategoriMenuVisible(false); }} title={k.nama} />
          ))}
        </Menu>

        {/* Rak Menu */}
        <Menu
          visible={rakMenuVisible}
          onDismiss={() => setRakMenuVisible(false)}
          anchor={
            <Chip 
              selected={!!filterRak} 
              onPress={() => setRakMenuVisible(true)}
              onClose={filterRak ? () => setFilterRak(null) : undefined}
              style={styles.chip}>
              {filterRak ? rakList.find(r => r.id === filterRak)?.nama || 'Rak' : 'Semua Rak'}
            </Chip>
          }>
          <Menu.Item onPress={() => { setFilterRak(null); setRakMenuVisible(false); }} title="Semua Rak" />
          {rakList.map(r => (
            <Menu.Item key={r.id} onPress={() => { setFilterRak(r.id); setRakMenuVisible(false); }} title={r.nama} />
          ))}
        </Menu>

        {/* Status Menu */}
        <Menu
          visible={statusMenuVisible}
          onDismiss={() => setStatusMenuVisible(false)}
          anchor={
            <Chip 
              selected={!!filterStatus} 
              onPress={() => setStatusMenuVisible(true)}
              onClose={filterStatus ? () => setFilterStatus(null) : undefined}
              style={styles.chip}>
              {filterStatus === 'tersedia' ? 'Tersedia' : filterStatus === 'habis' ? 'Habis Dipinjam' : 'Semua Status'}
            </Chip>
          }>
          <Menu.Item onPress={() => { setFilterStatus(null); setStatusMenuVisible(false); }} title="Semua Status" />
          <Menu.Item onPress={() => { setFilterStatus('tersedia'); setStatusMenuVisible(false); }} title="Tersedia" />
          <Menu.Item onPress={() => { setFilterStatus('habis'); setStatusMenuVisible(false); }} title="Habis Dipinjam" />
        </Menu>
      </View>

      {/* Book List */}
      <FlatList
        data={filteredAndSortedBooks}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const tersedia = item.salinan.filter(s => s.status === 'tersedia').length;
          const total = item.salinan.length;
          return (
            <Card style={styles.card} mode="outlined" onPress={() => router.push({ pathname: '/(admin)/buku-detail', params: { id: item.id } })}>
              <Card.Title 
                title={item.judul} 
                subtitle={item.penulis || '-'} 
                right={() => (
                  <View style={{ marginRight: 16, alignItems: 'flex-end' }}>
                    <Text variant="labelSmall" style={{ color: '#666' }}>Salinan</Text>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{tersedia}/{total}</Text>
                  </View>
                )}
              />
              <Card.Content>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <Chip style={{ backgroundColor: '#F0F0F0' }}>
                    {item.kategori?.nama || 'Tanpa Kategori'}
                  </Chip>
                  {item.rak?.nama ? (
                    <Chip style={{ backgroundColor: '#E8F5E9' }} textStyle={{ color: '#2E7D32' }}>
                      Rak: {item.rak.nama}
                    </Chip>
                  ) : (
                    <Chip style={{ backgroundColor: '#FFF3E0' }} textStyle={{ color: '#E65100', fontWeight: '500' }}>
                      Rak: Belum Ditentukan ⚠️
                    </Chip>
                  )}
                </View>
              </Card.Content>
            </Card>
          );
        }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, color: '#666' }}>Belum ada buku.</Text>}
      />

      {userRole !== 'staff' && (
        <FAB
          icon={() => <Plus size={24} color="#FFF" />}
          style={styles.fab}
          onPress={() => router.push({ pathname: '/(admin)/buku-detail', params: { id: 'tambah' } })}
        />
      )}

      <Snackbar visible={!!snackMsg} onDismiss={() => setSnackMsg('')} duration={3000}>
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', padding: 16, paddingBottom: 8, gap: 8, alignItems: 'center' },
  searchbar: { flex: 1, backgroundColor: '#F8F9FA' },
  sortBtn: { height: 48, justifyContent: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: '#F0F0F0' },
  list: { padding: 16, paddingTop: 8, paddingBottom: 80 },
  card: { marginBottom: 12, backgroundColor: '#FFFFFF' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#000000' }
});
