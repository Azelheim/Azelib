import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, SectionList, BackHandler } from 'react-native';
import { Text, Searchbar, SegmentedButtons, Card, Chip, Appbar, Portal, Modal, Button, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/api/apiClient';
import { LogOut } from 'lucide-react-native';

interface BukuPubilk {
  id: string;
  judul: string;
  penulis: string | null;
  sinopsis: string | null;
  kategori: { nama: string } | null;
  rak: { nama: string } | null;
  salinan: { status: string }[];
}

export default function Pengunjung() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tenantId = params.tenant_id as string;
  const namaTenant = params.nama ? decodeURIComponent(params.nama as string) : 'Perpustakaan';

  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('semua');
  const [selectedBuku, setSelectedBuku] = useState<BukuPubilk | null>(null);
  const [books, setBooks] = useState<BukuPubilk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onBackPress = () => {
      handleKeluar();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [tenantId]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      let data: any = null;
      try {
        data = await apiClient.katalog.getBooks(tenantId);
      } catch {
        let query = supabase
          .from('buku')
          .select('id, judul, penulis, sinopsis, kategori:kategori_id(nama), rak:rak_id(nama), salinan(status)')
          .eq('dihapus', false);
        
        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }

        const res = await query;
        data = res.data;
      }

      if (data) {
        setBooks(data as any[]);
      }
    } catch (e) {
      console.error('Error fetching books:', e);
    } finally {
      setLoading(false);
    }
  };

  const getKetersediaan = (salinan: { status: string }[]) => {
    if (!salinan || salinan.length === 0) return 'Tidak Diketahui';
    const tersedia = salinan.filter(s => s.status === 'tersedia').length;
    return tersedia > 0 ? `Tersedia (${tersedia}/${salinan.length})` : 'Habis Dipinjam';
  };

  const isTersedia = (salinan: { status: string }[]) => {
    if (!salinan || salinan.length === 0) return false;
    return salinan.some(s => s.status === 'tersedia');
  };

  // Filter by search
  const filtered = useMemo(() => {
    let result = books;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.judul.toLowerCase().includes(q) || 
        (b.penulis && b.penulis.toLowerCase().includes(q))
      );
    }
    return result;
  }, [books, searchQuery]);

  // Group by kategori
  const groupedByKategori = useMemo(() => {
    const groups: Record<string, BukuPubilk[]> = {};
    filtered.forEach(b => {
      const key = b.kategori?.nama || 'Tanpa Kategori';
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filtered]);

  // Group by rak
  const groupedByRak = useMemo(() => {
    const groups: Record<string, BukuPubilk[]> = {};
    filtered.forEach(b => {
      const key = b.rak?.nama || 'Tanpa Rak';
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const handleKeluar = () => {
    router.replace('/');
  };

  const renderBookCard = (item: BukuPubilk) => {
    const ketersediaan = getKetersediaan(item.salinan);
    const tersedia = isTersedia(item.salinan);
    return (
      <Card style={styles.card} mode="outlined" onPress={() => setSelectedBuku(item)}>
        <Card.Title 
          title={item.judul} 
          subtitle={item.penulis || 'Penulis tidak diketahui'} 
          right={() => (
            <Chip 
              style={{ marginRight: 16, backgroundColor: tersedia ? '#E8F5E9' : '#FFF5E6' }} 
              textStyle={{ color: tersedia ? '#2E7D32' : '#E65100' }}
            >
              {tersedia ? 'Tersedia' : 'Habis'}
            </Chip>
          )}
        />
        <Card.Content>
          <Text variant="bodySmall" style={{ color: '#666' }}>
            Kategori: {item.kategori?.nama || '-'} | Rak: {item.rak?.nama || '-'}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16, color: '#666' }}>Memuat katalog...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#fff', elevation: 2 }}>
        <Appbar.Content title={namaTenant} subtitle="Katalog Pengunjung" titleStyle={{ fontWeight: 'bold' }} />
        <Button 
          mode="text" 
          textColor="#D32F2F" 
          icon={() => <LogOut size={18} color="#D32F2F" />} 
          onPress={handleKeluar}
        >
          Keluar
        </Button>
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

      {tab === 'semua' && (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => renderBookCard(item)}
          ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada buku ditemukan.</Text>}
        />
      )}

      {tab === 'kategori' && (
        <SectionList
          sections={groupedByKategori}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => renderBookCard(item)}
          renderSectionHeader={({ section: { title } }) => (
            <Text variant="titleMedium" style={styles.sectionHeader}>{title}</Text>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada buku ditemukan.</Text>}
        />
      )}

      {tab === 'rak' && (
        <SectionList
          sections={groupedByRak}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => renderBookCard(item)}
          renderSectionHeader={({ section: { title } }) => (
            <Text variant="titleMedium" style={styles.sectionHeader}>{title}</Text>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada buku ditemukan.</Text>}
        />
      )}

      <Portal>
        <Modal visible={!!selectedBuku} onDismiss={() => setSelectedBuku(null)} contentContainerStyle={styles.modalContent}>
          {selectedBuku && (
            <View>
              <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{selectedBuku.judul}</Text>
              <Text variant="bodyLarge" style={{ color: '#666', marginBottom: 16 }}>{selectedBuku.penulis || '-'}</Text>
              
              <View style={styles.badgeRow}>
                <Chip>{selectedBuku.kategori?.nama || '-'}</Chip>
                <Chip>{selectedBuku.rak?.nama || '-'}</Chip>
                <Chip style={{ backgroundColor: isTersedia(selectedBuku.salinan) ? '#E8F5E9' : '#FFF5E6' }}>
                  {getKetersediaan(selectedBuku.salinan)}
                </Chip>
              </View>

              <Text variant="titleMedium" style={{ marginTop: 16, marginBottom: 8, fontWeight: 'bold' }}>Sinopsis</Text>
              <Text variant="bodyMedium">{selectedBuku.sinopsis || 'Belum ada sinopsis.'}</Text>

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
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionHeader: { fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#333' },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#666' },
});
