import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView } from 'react-native';
import { Text, Card, FAB, SegmentedButtons, Snackbar, Portal, Modal, Button, TextInput, ActivityIndicator, Menu, Chip } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { apiClient } from '../../lib/api/apiClient';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { Plus } from 'lucide-react-native';

interface PeminjamanItem {
  id: string;
  tanggal_pinjam: string;
  jatuh_tempo: string;
  tanggal_kembali: string | null;
  status: string;
  biaya_penggantian: number | null;
  anggota: { nama: string } | null;
  peminjaman_detail: { salinan: { buku: { judul: string } } }[];
}

export default function Peminjaman() {
  const { tenantId } = useTenant();
  const [tab, setTab] = useState('aktif');
  const [data, setData] = useState<PeminjamanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackMsg, setSnackMsg] = useState('');

  // Modal new
  const [showNew, setShowNew] = useState(false);
  const [anggotaList, setAnggotaList] = useState<any[]>([]);
  const [salinanList, setSalinanList] = useState<any[]>([]);
  const [selectedAnggota, setSelectedAnggota] = useState<any>(null);
  const [selectedSalinan, setSelectedSalinan] = useState<string[]>([]);
  const [jatuhTempo, setJatuhTempo] = useState('');
  const [anggotaMenuVisible, setAnggotaMenuVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  // Quick Add Anggota state
  const [showQuickAnggota, setShowQuickAnggota] = useState(false);
  const [quickNama, setQuickNama] = useState('');
  const [quickKategori, setQuickKategori] = useState<'Siswa' | 'Guru' | 'Umum'>('Siswa');
  const [quickKontak, setQuickKontak] = useState('');
  const [quickAlamat, setQuickAlamat] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  const resetQuickAnggotaForm = () => {
    setQuickNama('');
    setQuickKategori('Siswa');
    setQuickKontak('');
    setQuickAlamat('');
  };

  const handleQuickAddAnggota = async () => {
    if (quickNama.trim().length < 3) {
      setSnackMsg('Nama minimal 3 karakter');
      return;
    }
    const phoneRegex = /^08\d{8,11}$/;
    if (!phoneRegex.test(quickKontak.trim())) {
      setSnackMsg('Nomor HP tidak valid (contoh: 08123456789)');
      return;
    }

    setQuickLoading(true);
    try {
      // Auto-generate nomor_anggota
      const { count } = await supabase
        .from('anggota')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      const nextNum = (count || 0) + 1;
      const nomor_anggota = `ANG-${String(nextNum).padStart(5, '0')}`;

      const { data: newAnggota, error } = await supabase
        .from('anggota')
        .insert({
          tenant_id: tenantId,
          nomor_anggota,
          nama: quickNama.trim(),
          kategori_anggota: quickKategori,
          kontak: quickKontak.trim(),
          alamat: quickAlamat.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh list
      const { data: refreshedList } = await supabase
        .from('anggota')
        .select('id, nama')
        .eq('tenant_id', tenantId)
        .eq('dihapus', false);

      if (refreshedList) setAnggotaList(refreshedList);

      // Auto-select the newly added member
      setSelectedAnggota(newAnggota);
      setShowQuickAnggota(false);
      resetQuickAnggotaForm();
      setSnackMsg(`Anggota ${newAnggota.nama} berhasil ditambahkan dan dipilih`);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal menambahkan anggota');
    } finally {
      setQuickLoading(false);
    }
  };

  // Modal hilang
  const [showHilang, setShowHilang] = useState(false);
  const [hilangId, setHilangId] = useState('');
  const [biayaPenggantian, setBiayaPenggantian] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (tenantId) fetchPeminjaman();
    }, [tenantId, tab])
  );

  const fetchPeminjaman = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('peminjaman')
        .select('id, tanggal_pinjam, jatuh_tempo, tanggal_kembali, status, biaya_penggantian, anggota:anggota_id(nama), peminjaman_detail(salinan:salinan_id(buku:buku_id(judul)))')
        .eq('tenant_id', tenantId)
        .order('tanggal_pinjam', { ascending: false });

      const { data: result, error } = await query;
      if (!error && result) setData(result as any[]);
    } catch (e) {
      console.error(e);
      setSnackMsg('Gagal memuat data peminjaman');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredData = data.filter(item => {
    if (tab === 'aktif') return item.status === 'aktif' && item.jatuh_tempo >= today;
    if (tab === 'terlambat') return item.status === 'aktif' && item.jatuh_tempo < today;
    if (tab === 'riwayat') return item.status !== 'aktif';
    return true;
  });

  const handleKembalikan = (id: string) => {
    Alert.alert("Konfirmasi", "Kembalikan peminjaman ini?", [
      { text: "Batal", style: "cancel" },
      { text: "Kembalikan", onPress: async () => {
        try {
          await apiClient.peminjaman.kembalikan(id);
          setSnackMsg("Peminjaman dikembalikan");
          fetchPeminjaman();
        } catch (e: any) {
          setSnackMsg(e.message || "Gagal mengembalikan");
        }
      }}
    ]);
  };

  const handleTandaiHilang = async () => {
    if (!biayaPenggantian) {
      setSnackMsg("Masukkan biaya penggantian");
      return;
    }
    try {
      await apiClient.peminjaman.tandaiHilang(hilangId, parseFloat(biayaPenggantian));
      setSnackMsg("Ditandai hilang");
      setShowHilang(false);
      setBiayaPenggantian('');
      fetchPeminjaman();
    } catch (e: any) {
      setSnackMsg(e.message || "Gagal menandai hilang");
    }
  };

  const [batasMaksimal, setBatasMaksimal] = useState(3);

  const openNewModal = async () => {
    try {
      const [anggotaRes, salinanRes, tenantRes] = await Promise.all([
        supabase.from('anggota').select('id, nama').eq('tenant_id', tenantId).eq('dihapus', false),
        supabase.from('salinan').select('id, kode_eksemplar, status, buku:buku_id(id, judul, tenant_id, dihapus)').eq('status', 'tersedia'),
        supabase.from('tenant').select('batas_maksimal_peminjaman').eq('id', tenantId).single(),
      ]);
      setAnggotaList(anggotaRes.data || []);
      const validSalinan = (salinanRes.data || []).filter((s: any) => 
        s.buku && s.buku.tenant_id === tenantId && !s.buku.dihapus
      );
      setSalinanList(validSalinan);
      if (tenantRes.data?.batas_maksimal_peminjaman) {
        setBatasMaksimal(tenantRes.data.batas_maksimal_peminjaman);
      }
      setSelectedAnggota(null);
      setSelectedSalinan([]);
      setJatuhTempo('');
      setShowNew(true);
    } catch (e) {
      console.error(e);
      setSnackMsg('Gagal memuat data');
    }
  };

  const handleCreatePeminjaman = () => {
    if (!selectedAnggota) {
      setSnackMsg("Pilih anggota terlebih dahulu");
      return;
    }
    if (selectedSalinan.length === 0) {
      setSnackMsg("Pilih minimal 1 buku");
      return;
    }
    if (selectedSalinan.length > batasMaksimal) {
      setSnackMsg(`Maksimal peminjaman adalah ${batasMaksimal} buku`);
      return;
    }
    if (!jatuhTempo || !/^\d{4}-\d{2}-\d{2}$/.test(jatuhTempo)) {
      setSnackMsg("Isi tanggal jatuh tempo dengan format YYYY-MM-DD");
      return;
    }
    if (jatuhTempo < today) {
      setSnackMsg("Tanggal jatuh tempo tidak boleh sebelum hari ini");
      return;
    }

    Alert.alert("Konfirmasi", `Buat peminjaman untuk ${selectedAnggota.nama}?\n${selectedSalinan.length} buku dipilih\nJatuh tempo: ${jatuhTempo}`, [
      { text: "Batal", style: "cancel" },
      { text: "Buat", onPress: async () => {
        setCreating(true);
        try {
          await apiClient.peminjaman.create(selectedAnggota.id, selectedSalinan, jatuhTempo, tenantId || undefined);
          setSnackMsg("Peminjaman berhasil dibuat");
          setShowNew(false);
          fetchPeminjaman();
        } catch (e: any) {
          setSnackMsg(e.message || "Gagal membuat peminjaman");
        } finally {
          setCreating(false);
        }
      }}
    ]);
  };

  const toggleSalinan = (id: string) => {
    setSelectedSalinan(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getStatusColor = (item: PeminjamanItem) => {
    if (item.status === 'dikembalikan') return '#2E7D32';
    if (item.status === 'hilang') return '#D32F2F';
    if (item.jatuh_tempo < today) return '#E65100';
    return '#1565C0';
  };

  const getStatusLabel = (item: PeminjamanItem) => {
    if (item.status === 'dikembalikan') return 'Dikembalikan';
    if (item.status === 'hilang') return 'Hilang';
    if (item.jatuh_tempo < today) return 'Terlambat';
    return 'Aktif';
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'aktif', label: 'Aktif' },
          { value: 'terlambat', label: 'Terlambat' },
          { value: 'riwayat', label: 'Riwayat' },
        ]}
        style={{ margin: 16 }}
      />

      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const bukuTitles = item.peminjaman_detail?.map(d => (d.salinan as any)?.buku?.judul || '-').join(', ') || '-';
          return (
            <Card style={styles.card} mode="outlined">
              <Card.Title 
                title={item.anggota?.nama || '-'}
                subtitle={bukuTitles}
                right={() => (
                  <Chip style={{ marginRight: 16, backgroundColor: getStatusColor(item) + '22' }} textStyle={{ color: getStatusColor(item) }}>
                    {getStatusLabel(item)}
                  </Chip>
                )}
              />
              <Card.Content>
                <Text variant="bodySmall" style={{ color: '#666' }}>
                  Pinjam: {item.tanggal_pinjam} | Tempo: {item.jatuh_tempo}
                </Text>
              </Card.Content>
              {item.status === 'aktif' && (
                <Card.Actions>
                  <Button onPress={() => handleKembalikan(item.id)}>Kembalikan</Button>
                  <Button onPress={() => { setHilangId(item.id); setShowHilang(true); }} textColor="#D32F2F">Tandai Hilang</Button>
                </Card.Actions>
              )}
            </Card>
          );
        }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, color: '#666' }}>Tidak ada data.</Text>}
      />

      <FAB icon={() => <Plus size={24} color="#FFF" />} style={styles.fab} onPress={openNewModal} />

      {/* Modal: New Peminjaman */}
      <Portal>
        <Modal visible={showNew} onDismiss={() => setShowNew(false)} contentContainerStyle={styles.modalContent}>
          <ScrollView>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>Peminjaman Baru</Text>

            {/* Anggota picker with Quick Add */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text variant="labelMedium">Anggota</Text>
              <Button
                mode="text"
                compact
                icon={() => <Plus size={14} color="#1565C0" />}
                textColor="#1565C0"
                onPress={() => {
                  resetQuickAnggotaForm();
                  setShowQuickAnggota(true);
                }}
              >
                + Tambah Anggota Baru
              </Button>
            </View>

            <Menu
              visible={anggotaMenuVisible}
              onDismiss={() => setAnggotaMenuVisible(false)}
              anchor={
                <Button mode="outlined" onPress={() => setAnggotaMenuVisible(true)} style={{ marginBottom: 16 }}>
                  {selectedAnggota ? `${selectedAnggota.nama} (${selectedAnggota.nomor_anggota || ''})` : 'Pilih Anggota'}
                </Button>
              }>
              {anggotaList.map(a => (
                <Menu.Item key={a.id} onPress={() => { setSelectedAnggota(a); setAnggotaMenuVisible(false); }} title={`${a.nama} (${a.nomor_anggota || ''})`} />
              ))}
            </Menu>

            {/* Salinan list */}
            <Text variant="labelMedium" style={{ marginBottom: 8 }}>Pilih Buku (tap untuk memilih)</Text>
            {salinanList.map(s => (
              <Chip
                key={s.id}
                mode="outlined"
                selected={selectedSalinan.includes(s.id)}
                onPress={() => toggleSalinan(s.id)}
                style={{ marginBottom: 8 }}
              >
                {(s.buku as any)?.judul || '-'} ({s.kode_eksemplar})
              </Chip>
            ))}

            <TextInput
              label="Jatuh Tempo (YYYY-MM-DD)"
              value={jatuhTempo}
              onChangeText={setJatuhTempo}
              mode="outlined"
              style={{ marginTop: 16, marginBottom: 16, backgroundColor: '#FFF' }}
            />

            <Button mode="contained" onPress={handleCreatePeminjaman} loading={creating} disabled={creating} style={{ borderRadius: 8 }}>
              Buat Peminjaman
            </Button>
            <Button mode="text" onPress={() => setShowNew(false)} style={{ marginTop: 8 }}>
              Batal
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Modal: Quick Add Anggota */}
      <Portal>
        <Modal visible={showQuickAnggota} onDismiss={() => setShowQuickAnggota(false)} contentContainerStyle={styles.modalContent}>
          <ScrollView>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>Tambah Anggota Baru</Text>
            
            <TextInput
              label="Nama Anggota"
              value={quickNama}
              onChangeText={setQuickNama}
              mode="outlined"
              style={{ marginBottom: 12, backgroundColor: '#FFF' }}
            />

            <Text variant="labelMedium" style={{ marginBottom: 6 }}>Kategori Anggota</Text>
            <SegmentedButtons
              value={quickKategori}
              onValueChange={(val) => setQuickKategori(val as any)}
              buttons={[
                { value: 'Siswa', label: 'Siswa' },
                { value: 'Guru', label: 'Guru' },
                { value: 'Umum', label: 'Umum' },
              ]}
              style={{ marginBottom: 12 }}
            />

            <TextInput
              label="Nomor HP (contoh: 08123456789)"
              value={quickKontak}
              onChangeText={setQuickKontak}
              mode="outlined"
              keyboardType="phone-pad"
              style={{ marginBottom: 12, backgroundColor: '#FFF' }}
            />

            <TextInput
              label="Alamat (Opsional)"
              value={quickAlamat}
              onChangeText={setQuickAlamat}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={{ marginBottom: 16, backgroundColor: '#FFF' }}
            />

            <Button
              mode="contained"
              onPress={handleQuickAddAnggota}
              loading={quickLoading}
              disabled={quickLoading}
              style={{ borderRadius: 8 }}
            >
              Simpan & Pilih
            </Button>
            <Button mode="text" onPress={() => setShowQuickAnggota(false)} style={{ marginTop: 8 }}>
              Batal
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Modal: Tandai Hilang */}
      <Portal>
        <Modal visible={showHilang} onDismiss={() => setShowHilang(false)} contentContainerStyle={styles.modalSmall}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>Tandai Hilang</Text>
          <TextInput
            label="Biaya Penggantian (Rp)"
            value={biayaPenggantian}
            onChangeText={setBiayaPenggantian}
            mode="outlined"
            keyboardType="numeric"
            style={{ marginBottom: 16, backgroundColor: '#FFF' }}
          />
          <Button mode="contained" onPress={handleTandaiHilang} style={{ borderRadius: 8 }}>Konfirmasi</Button>
          <Button mode="text" onPress={() => setShowHilang(false)} style={{ marginTop: 8 }}>Batal</Button>
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
  list: { padding: 16 },
  card: { marginBottom: 12, backgroundColor: '#FFFFFF' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#000000' },
  modalContent: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 12, maxHeight: '80%' },
  modalSmall: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 12 },
});
