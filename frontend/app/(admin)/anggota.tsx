import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, FAB, SegmentedButtons, Chip, Snackbar, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { Plus } from 'lucide-react-native';

interface AnggotaItem {
  id: string;
  nomor_anggota: string;
  nama: string;
  kategori_anggota: string | null;
  kontak: string | null;
  sedangMeminjam?: boolean;
}

export default function AnggotaList() {
  const router = useRouter();
  const { tenantId, userRole } = useTenant();
  const [filterStatus, setFilterStatus] = useState('semua');
  const [anggota, setAnggota] = useState<AnggotaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackMsg, setSnackMsg] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (tenantId) fetchAnggota();
    }, [tenantId])
  );

  const fetchAnggota = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('anggota')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('dihapus', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check active loan per anggota
      const { data: activeLoans } = await supabase
        .from('peminjaman')
        .select('anggota_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'aktif');

      const borrowingIds = new Set((activeLoans || []).map(l => l.anggota_id));

      const processed = (data || []).map(a => ({
        ...a,
        sedangMeminjam: borrowingIds.has(a.id),
      }));

      setAnggota(processed);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal memuat daftar anggota');
    } finally {
      setLoading(false);
    }
  };

  const filteredAnggota = anggota.filter(item => {
    if (filterStatus === 'meminjam') return item.sedangMeminjam;
    if (filterStatus === 'tidak') return !item.sedangMeminjam;
    return true;
  });

  if (loading && anggota.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={filterStatus}
        onValueChange={setFilterStatus}
        buttons={[
          { value: 'semua', label: 'Semua' },
          { value: 'meminjam', label: 'Meminjam' },
          { value: 'tidak', label: 'Tidak Meminjam' },
        ]}
        style={styles.segmented}
      />

      <FlatList
        data={filteredAnggota}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card} mode="outlined" onPress={() => router.push({ pathname: '/(admin)/anggota-detail', params: { id: item.id } })}>
            <Card.Title 
              title={item.nama} 
              subtitle={`${item.nomor_anggota} | ${item.kontak || '-'}`}
              right={() => (
                <Chip style={{ marginRight: 16, backgroundColor: item.sedangMeminjam ? '#E3F2FD' : '#F5F5F5' }}>
                  {item.sedangMeminjam ? 'Meminjam' : 'Bebas Pinjam'}
                </Chip>
              )}
            />
          </Card>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, color: '#666' }}>Belum ada anggota.</Text>}
      />

      {userRole !== 'staff' && (
        <FAB icon={() => <Plus size={24} color="#FFF" />} style={styles.fab} onPress={() => router.push({ pathname: '/(admin)/anggota-detail', params: { id: 'tambah' } })} />
      )}

      <Snackbar visible={!!snackMsg} onDismiss={() => setSnackMsg('')} duration={3000}>
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  segmented: { margin: 16, marginBottom: 8 },
  list: { padding: 16, paddingTop: 8, paddingBottom: 80 },
  card: { marginBottom: 12, backgroundColor: '#FFFFFF' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#000000' }
});
