import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView } from 'react-native';
import { Text, Card, FAB, SegmentedButtons, Snackbar, Portal, Modal, Button, TextInput, ActivityIndicator, Menu, Chip, Divider } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { apiClient } from '../../lib/api/apiClient';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { Plus, Calendar, BookOpen, ChevronDown, ChevronUp } from 'lucide-react-native';

export function formatKodeSalinan(nomorUrut: number, totalSalinan: number = 10): string {
  const digits = Math.max(2, String(Math.max(totalSalinan, nomorUrut)).length);
  return `Kode: ${String(nomorUrut).padStart(digits, '0')}`;
}

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
  const [selectedAnggota, setSelectedAnggota] = useState<any>(null);
  const [selectedSalinan, setSelectedSalinan] = useState<string[]>([]);
  const [jatuhTempo, setJatuhTempo] = useState('');
  const [anggotaMenuVisible, setAnggotaMenuVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  // 2-tier book selection & Rak filter
  const [booksWithCopies, setBooksWithCopies] = useState<any[]>([]);
  const [rakList, setRakList] = useState<{ id: string; nama: string }[]>([]);
  const [filterRakLoan, setFilterRakLoan] = useState<string | null>(null);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);

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
      const { count } = await supabase
        .from('anggota')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      const nextNum = (count || 0) + 1;
      const formattedNomor = `ANG-${String(nextNum).padStart(5, '0')}`;

      const { data: newAnggota, error } = await supabase
        .from('anggota')
        .insert({
          tenant_id: tenantId,
          nomor_anggota: formattedNomor,
          nama: quickNama.trim(),
          kategori_anggota: quickKategori,
          kontak: quickKontak.trim(),
          alamat: quickAlamat.trim() || null,
          dihapus: false
        })
        .select()
        .single();

      if (error) throw error;

      setAnggotaList(prev => [...prev, newAnggota]);
      setSelectedAnggota(newAnggota);
      setShowQuickAnggota(false);
      resetQuickAnggotaForm();
      setSnackMsg(`Anggota ${newAnggota.nama} berhasil ditambahkan & dipilih`);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal menambahkan anggota');
    } finally {
      setQuickLoading(false);
    }
  };

  // Tandai Hilang state
  const [showHilang, setShowHilang] = useState(false);
  const [hilangId, setHilangId] = useState<string | null>(null);
  const [biayaPenggantian, setBiayaPenggantian] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useFocusEffect(
    useCallback(() => {
      if (tenantId) {
        fetchPeminjaman();
      } else {
        setLoading(false);
      }
    }, [tenantId])
  );

  const fetchPeminjaman = async () => {
    setLoading(true);
    try {
      const { data: loans, error } = await supabase
        .from('peminjaman')
        .select(`
          id, tanggal_pinjam, jatuh_tempo, tanggal_kembali, status, biaya_penggantian,
          anggota:anggota_id(nama),
          peminjaman_detail(
            salinan:salinan_id(
              buku:buku_id(judul)
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData((loans as any[]) || []);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || "Gagal memuat data peminjaman");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    if (tab === 'aktif') {
      return data.filter(item => item.status === 'aktif' && item.jatuh_tempo >= today);
    }
    if (tab === 'terlambat') {
      return data.filter(item => item.status === 'aktif' && item.jatuh_tempo < today);
    }
    return data.filter(item => item.status !== 'aktif');
  };

  const handleKembalikan = async (id: string) => {
    Alert.alert("Konfirmasi", "Kembalikan buku sekarang?", [
      { text: "Batal", style: "cancel" },
      { text: "Kembalikan", onPress: async () => {
        try {
          await apiClient.peminjaman.kembalikan(id);
          setSnackMsg("Buku berhasil dikembalikan");
          fetchPeminjaman();
        } catch (e: any) {
          setSnackMsg(e.message || "Gagal mengembalikan buku");
        }
      }}
    ]);
  };

  const handleTandaiHilang = async () => {
    if (!hilangId) return;
    if (!biayaPenggantian || isNaN(parseFloat(biayaPenggantian)) || parseFloat(biayaPenggantian) < 0) {
      setSnackMsg("Masukkan biaya penggantian yang valid");
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
  const [maksimalHariPinjam, setMaksimalHariPinjam] = useState(7);

  const openNewModal = async () => {
    try {
      const [anggotaRes, booksRes, salinanRes, allSalinanRes, rakRes, tenantRes] = await Promise.all([
        supabase.from('anggota').select('id, nama, nomor_anggota').eq('tenant_id', tenantId).eq('dihapus', false),
        supabase.from('buku').select('id, judul, rak_id, rak:rak_id(id, nama)').eq('tenant_id', tenantId).eq('dihapus', false),
        supabase.from('salinan').select('id, buku_id, nomor_urut, kode_eksemplar, status').eq('status', 'tersedia'),
        supabase.from('salinan').select('buku_id, nomor_urut'),
        supabase.from('rak').select('id, nama').eq('tenant_id', tenantId),
        supabase.from('tenant').select('batas_maksimal_peminjaman, maksimal_hari_pinjam').eq('id', tenantId).single(),
      ]);

      setAnggotaList(anggotaRes.data || []);
      setRakList(rakRes.data || []);

      if (tenantRes.data?.batas_maksimal_peminjaman) {
        setBatasMaksimal(tenantRes.data.batas_maksimal_peminjaman);
      }
      const days = tenantRes.data?.maksimal_hari_pinjam || 7;
      setMaksimalHariPinjam(days);

      const autoDueDate = new Date();
      autoDueDate.setDate(autoDueDate.getDate() + days);
      const autoDateStr = autoDueDate.toISOString().split('T')[0];

      const allCopies = allSalinanRes.data || [];
      const availableCopies = salinanRes.data || [];

      const grouped = (booksRes.data || []).map((b: any) => {
        const copiesForBook = availableCopies.filter((s: any) => s.buku_id === b.id);
        const totalCopiesCount = allCopies.filter((s: any) => s.buku_id === b.id).length || copiesForBook.length;
        return {
          ...b,
          totalCopiesCount,
          availableCopies: copiesForBook,
        };
      });

      setBooksWithCopies(grouped);
      setFilterRakLoan(null);
      setExpandedBookId(null);
      setSelectedAnggota(null);
      setSelectedSalinan([]);
      setJatuhTempo(autoDateStr);
      setShowNew(true);
    } catch (e) {
      console.error(e);
      setSnackMsg('Gagal memuat data');
    }
  };

  const handleCreatePeminjaman = () => {
    if (!selectedAnggota) { setSnackMsg("Pilih anggota"); return; }
    if (selectedSalinan.length === 0) { setSnackMsg("Pilih buku"); return; }
    if (selectedSalinan.length > batasMaksimal) { setSnackMsg(`Maksimal ${batasMaksimal} buku`); return; }

    Alert.alert("Konfirmasi", "Buat peminjaman?", [
      { text: "Batal", style: "cancel" },
      { text: "Buat", onPress: async () => {
        setCreating(true);
        try {
          await apiClient.peminjaman.create(selectedAnggota.id, selectedSalinan, jatuhTempo, tenantId || undefined);
          setSnackMsg("Peminjaman berhasil");
          setShowNew(false);
          fetchPeminjaman();
        } catch (e: any) {
          setSnackMsg(e.message || "Gagal");
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

  const filteredBooksForLoan = booksWithCopies.filter(b => {
    if (filterRakLoan && b.rak_id !== filterRakLoan) return false;
    return (b.availableCopies || []).length > 0;
  });

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
        style={styles.segmented}
      />

      <FlatList
        data={getFilteredData()}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const bukuList = item.peminjaman_detail.map(d => d.salinan?.buku?.judul || 'Buku').join(', ');
          return (
            <Card style={styles.card} mode="outlined">
              <Card.Title
                title={item.anggota?.nama || 'Anggota'}
                subtitle={bukuList}
                right={() => (
                  <View style={{ marginRight: 16 }}>
                    <Text variant="labelSmall" style={{ color: item.status === 'aktif' && item.jatuh_tempo < today ? '#D32F2F' : '#666' }}>
                      {item.status === 'aktif' ? (item.jatuh_tempo < today ? 'Terlambat' : 'Aktif') : item.status}
                    </Text>
                  </View>
                )}
              />
              <Card.Content>
                <Text variant="bodySmall">Tgl Pinjam: {item.tanggal_pinjam}</Text>
                <Text variant="bodySmall">Jatuh Tempo: {item.jatuh_tempo}</Text>
                {item.tanggal_kembali && <Text variant="bodySmall">Kembali: {item.tanggal_kembali}</Text>}
                {item.biaya_penggantian && <Text variant="bodySmall" style={{ color: '#D32F2F' }}>Ganti Rugi: Rp {item.biaya_penggantian}</Text>}
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

      <Portal>
        <Modal visible={showNew} onDismiss={() => setShowNew(false)} contentContainerStyle={styles.modalContent}>
          <ScrollView>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>Peminjaman Baru</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text variant="labelMedium">Pilih Anggota</Text>
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
                + Anggota Baru
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

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text variant="labelMedium">Pilih Judul Buku (Filter Rak)</Text>
              <Text variant="labelSmall" style={{ color: '#1565C0', fontWeight: 'bold' }}>
                {selectedSalinan.length}/{batasMaksimal} dipilih
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Chip
                  selected={filterRakLoan === null}
                  onPress={() => setFilterRakLoan(null)}
                  style={{ backgroundColor: filterRakLoan === null ? '#0000001A' : '#F0F0F0' }}
                >
                  Semua Rak
                </Chip>
                {rakList.map(r => (
                  <Chip
                    key={r.id}
                    selected={filterRakLoan === r.id}
                    onPress={() => setFilterRakLoan(r.id === filterRakLoan ? null : r.id)}
                    style={{ backgroundColor: filterRakLoan === r.id ? '#0000001A' : '#F0F0F0' }}
                  >
                    {r.nama}
                  </Chip>
                ))}
              </View>
            </ScrollView>

            {filteredBooksForLoan.length === 0 ? (
              <Text style={{ color: '#888', fontStyle: 'italic', marginBottom: 16, textAlign: 'center' }}>
                Tidak ada buku dengan salinan tersedia pada rak ini.
              </Text>
            ) : (
              filteredBooksForLoan.map(b => {
                const isExpanded = expandedBookId === b.id;
                const selectedInThisBook = b.availableCopies.filter((c: any) => selectedSalinan.includes(c.id)).length;
                return (
                  <Card key={b.id} mode="outlined" style={{ marginBottom: 8, borderColor: selectedInThisBook > 0 ? '#1565C0' : '#E0E0E0' }}>
                    <Card.Title
                      title={b.judul}
                      subtitle={`${b.rak?.nama ? `Rak: ${b.rak.nama} • ` : ''}${b.availableCopies.length} salinan tersedia`}
                      right={() => (
                        <Button
                          mode={isExpanded ? 'contained-tonal' : 'text'}
                          compact
                          onPress={() => setExpandedBookId(isExpanded ? null : b.id)}
                        >
                          {isExpanded ? 'Tutup' : selectedInThisBook > 0 ? `${selectedInThisBook} Dipilih` : 'Pilih Salinan'}
                        </Button>
                      )}
                    />
                    {isExpanded && (
                      <Card.Content style={{ paddingTop: 0, paddingBottom: 12 }}>
                        <Divider style={{ marginBottom: 8 }} />
                        <Text variant="labelSmall" style={{ color: '#666', marginBottom: 6 }}>Pilih Salinan (Tap untuk memilih):</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {b.availableCopies.map((c: any) => {
                            const isSelected = selectedSalinan.includes(c.id);
                            const kodeLabel = formatKodeSalinan(c.nomor_urut, b.totalCopiesCount);
                            return (
                              <Chip
                                key={c.id}
                                mode="outlined"
                                selected={isSelected}
                                onPress={() => toggleSalinan(c.id)}
                                style={{ backgroundColor: isSelected ? '#E3F2FD' : '#FFFFFF' }}
                                textStyle={{ color: isSelected ? '#1565C0' : '#000000', fontWeight: isSelected ? 'bold' : 'normal' }}
                              >
                                {kodeLabel} ({c.kode_eksemplar})
                              </Chip>
                            );
                          })}
                        </View>
                      </Card.Content>
                    )}
                  </Card>
                );
              })
            )}

            <View style={{ marginTop: 8, marginBottom: 16 }}>
              <Text variant="labelMedium" style={{ marginBottom: 6 }}>Jatuh Tempo</Text>
              <TextInput
                value={jatuhTempo}
                onChangeText={setJatuhTempo}
                mode="outlined"
                style={{ backgroundColor: '#FFF' }}
                placeholder="YYYY-MM-DD"
                right={<TextInput.Icon icon={() => <Calendar size={20} color="#666" />} />}
              />
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <Chip compact onPress={() => { const d = new Date(); d.setDate(d.getDate() + 3); setJatuhTempo(d.toISOString().split('T')[0]); }}>+3 Hari</Chip>
                <Chip compact onPress={() => { const d = new Date(); d.setDate(d.getDate() + 7); setJatuhTempo(d.toISOString().split('T')[0]); }}>+7 Hari</Chip>
                <Chip compact onPress={() => { const d = new Date(); d.setDate(d.getDate() + 14); setJatuhTempo(d.toISOString().split('T')[0]); }}>+14 Hari</Chip>
                <Chip compact onPress={() => { const d = new Date(); d.setDate(d.getDate() + 30); setJatuhTempo(d.toISOString().split('T')[0]); }}>+30 Hari</Chip>
              </View>
              <Text variant="bodySmall" style={{ color: '#666', marginTop: 6 }}>
                Default dihitung otomatis {maksimalHariPinjam} hari dari hari ini.
              </Text>
            </View>

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
  segmented: { margin: 16 },
  list: { padding: 16 },
  card: { marginBottom: 12, backgroundColor: '#FFFFFF' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#000000' },
  modalContent: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 12, maxHeight: '80%' },
  modalSmall: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 12 },
});
