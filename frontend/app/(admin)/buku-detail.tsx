import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Snackbar, Appbar, ActivityIndicator, Card, Chip, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiClient } from '../../lib/api/apiClient';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { Trash2, Plus, Copy } from 'lucide-react-native';

interface SalinanItem {
  id: string;
  nomor_urut: number;
  kode_eksemplar: string;
  status: string;
}

export default function DetailBuku() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { tenantId } = useTenant();
  const isNew = id === 'tambah' || !id;

  const [judul, setJudul] = useState('');
  const [penulis, setPenulis] = useState('');
  const [penerbit, setPenerbit] = useState('');
  const [tahun, setTahun] = useState('');
  const [isbn, setIsbn] = useState('');
  const [kategori, setKategori] = useState('');
  const [rak, setRak] = useState('');
  const [sinopsis, setSinopsis] = useState('');
  const [bahasa, setBahasa] = useState('');
  const [jumlahHalaman, setJumlahHalaman] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [kodeLokal, setKodeLokal] = useState('');
  const [jumlahSalinan, setJumlahSalinan] = useState('1');

  // Existing salinan for Edit/Detail
  const [salinanList, setSalinanList] = useState<SalinanItem[]>([]);
  const [tambahSalinanCount, setTambahSalinanCount] = useState('1');
  const [salinanLoading, setSalinanLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(!isNew);
  const [snackMsg, setSnackMsg] = useState('');

  // Searchable & Creatable Category & Rak
  const [availableCategories, setAvailableCategories] = useState<{ id: string; nama: string }[]>([]);
  const [availableRaks, setAvailableRaks] = useState<{ id: string; nama: string }[]>([]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showRakMenu, setShowRakMenu] = useState(false);

  const resetForm = useCallback(() => {
    setJudul('');
    setPenulis('');
    setPenerbit('');
    setTahun('');
    setIsbn('');
    setKodeLokal('');
    setKategori('');
    setRak('');
    setSinopsis('');
    setBahasa('');
    setJumlahHalaman('');
    setCoverUrl('');
    setJumlahSalinan('1');
    setSalinanList([]);
    setShowCategoryMenu(false);
    setShowRakMenu(false);
  }, []);

  const loadCategoriesAndRaks = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [katRes, rakRes] = await Promise.all([
        supabase.from('kategori').select('id, nama').eq('tenant_id', tenantId).order('nama', { ascending: true }),
        supabase.from('rak').select('id, nama').eq('tenant_id', tenantId).order('nama', { ascending: true }),
      ]);
      if (katRes.data) setAvailableCategories(katRes.data);
      if (rakRes.data) setAvailableRaks(rakRes.data);
    } catch (e) {
      console.error('Error loadCategoriesAndRaks:', e);
    }
  }, [tenantId]);

  useEffect(() => {
    loadCategoriesAndRaks();
    if (isNew) {
      resetForm();
      setPageLoading(false);
    } else if (id && id !== 'tambah') {
      loadBuku();
    }
  }, [id, isNew, loadCategoriesAndRaks]);

  const loadBuku = async () => {
    setPageLoading(true);
    try {
      const [bukuRes, salinanRes] = await Promise.all([
        supabase
          .from('buku')
          .select(`
            *,
            kategori:kategori_id(nama),
            rak:rak_id(nama)
          `)
          .eq('id', id)
          .single(),
        supabase
          .from('salinan')
          .select('*')
          .eq('buku_id', id)
          .order('nomor_urut', { ascending: true })
      ]);

      if (bukuRes.error) throw bukuRes.error;
      if (bukuRes.data) {
        const data = bukuRes.data;
        setJudul(data.judul || '');
        setPenulis(data.penulis || '');
        setPenerbit(data.penerbit || '');
        setTahun(data.tahun_terbit ? data.tahun_terbit.toString() : '');
        setIsbn(data.isbn || '');
        setKodeLokal(data.kode_lokal || '');
        setKategori(data.kategori?.nama || '');
        setRak(data.rak?.nama || '');
        setSinopsis(data.sinopsis || '');
        setBahasa(data.bahasa || '');
        setJumlahHalaman(data.jumlah_halaman ? data.jumlah_halaman.toString() : '');
        setCoverUrl(data.cover_url || '');
      }

      setSalinanList((salinanRes.data as SalinanItem[]) || []);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal memuat detail buku');
    } finally {
      setPageLoading(false);
    }
  };

  const handleScanIsbn = async () => {
    if (!isbn) {
      setSnackMsg('Masukkan ISBN terlebih dahulu');
      return;
    }
    setLoading(true);
    try {
      const result = await apiClient.buku.lookupIsbn(isbn);
      if (result) {
        if (result.judul) setJudul(result.judul);
        if (result.penulis) setPenulis(result.penulis);
        if (result.penerbit) setPenerbit(result.penerbit);
        if (result.tahun_terbit) setTahun(result.tahun_terbit.toString());
        if (result.cover_url) setCoverUrl(result.cover_url);
        setSnackMsg('Data buku ditemukan!');
      }
    } catch (e: any) {
      setSnackMsg(e.message || 'Buku tidak ditemukan dari ISBN');
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateKategori = async (namaKat: string) => {
    if (!namaKat || !namaKat.trim()) return null;
    const cleanKat = namaKat.trim();
    const { data: existing } = await supabase
      .from('kategori')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('nama', cleanKat)
      .single();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from('kategori')
      .insert({ tenant_id: tenantId, nama: cleanKat })
      .select('id')
      .single();

    if (error) throw error;
    return created?.id;
  };

  const getOrCreateRak = async (namaRak: string) => {
    if (!namaRak || !namaRak.trim()) return null;
    const cleanRak = namaRak.trim();
    const { data: existing } = await supabase
      .from('rak')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('nama', cleanRak)
      .single();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from('rak')
      .insert({ tenant_id: tenantId, nama: cleanRak })
      .select('id')
      .single();

    if (error) throw error;
    return created?.id;
  };

  const handleSimpan = async () => {
    if (!judul.trim()) {
      setSnackMsg('Judul buku wajib diisi');
      return;
    }

    if (!rak.trim()) {
      setSnackMsg('Rak wajib diisi');
      return;
    }

    const salinanInt = parseInt(jumlahSalinan);
    if (isNew && (isNaN(salinanInt) || salinanInt < 1)) {
      setSnackMsg('Jumlah salinan minimal 1');
      return;
    }

    const cleanIsbn = isbn.trim() || null;
    const cleanKodeLokal = cleanIsbn ? null : (kodeLokal.trim() || `LOK-${Date.now().toString().slice(-5)}`);

    setLoading(true);
    try {
      const kategoriId = await getOrCreateKategori(kategori);
      const rakId = await getOrCreateRak(rak);

      const payload: any = {
        tenant_id: tenantId,
        judul: judul.trim(),
        penulis: penulis.trim() || null,
        penerbit: penerbit.trim() || null,
        tahun_terbit: tahun ? parseInt(tahun) : null,
        isbn: cleanIsbn,
        kode_lokal: cleanKodeLokal,
        kategori_id: kategoriId,
        rak_id: rakId,
        sinopsis: sinopsis.trim() || null,
        bahasa: bahasa.trim() || null,
        jumlah_halaman: jumlahHalaman ? parseInt(jumlahHalaman) : null,
        cover_url: coverUrl || null,
        updated_at: new Date().toISOString(),
      };

      if (isNew) {
        const { data: newBuku, error } = await supabase.from('buku').insert(payload).select().single();
        if (error) throw error;

        // Generate Salinan copies
        const copyCount = Math.max(1, salinanInt || 1);
        await apiClient.buku.salinanGenerate(newBuku.id, copyCount);

        resetForm();
        setSnackMsg('Buku berhasil ditambahkan');
      } else {
        const { error } = await supabase.from('buku').update(payload).eq('id', id);
        if (error) throw error;
        setSnackMsg('Buku berhasil diperbarui');
      }

      // Selalu navigasi kembali ke Halaman Buku
      router.replace('/(admin)/buku');
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal menyimpan buku');
    } finally {
      setLoading(false);
    }
  };

  const handleTambahSalinan = async () => {
    const count = parseInt(tambahSalinanCount);
    if (isNaN(count) || count < 1) {
      setSnackMsg('Jumlah tambahan minimal 1');
      return;
    }

    setSalinanLoading(true);
    try {
      await apiClient.buku.salinanGenerate(id as string, count);
      setSnackMsg(`${count} salinan berhasil ditambahkan`);
      setTambahSalinanCount('1');
      // Reload salinan list
      const { data } = await supabase
        .from('salinan')
        .select('*')
        .eq('buku_id', id)
        .order('nomor_urut', { ascending: true });
      if (data) setSalinanList(data as SalinanItem[]);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal menambah salinan');
    } finally {
      setSalinanLoading(false);
    }
  };

  const handleHapus = async () => {
    Alert.alert("Konfirmasi Hapus", "Yakin ingin menghapus buku ini?", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: async () => {
        setLoading(true);
        try {
          // Cek apakah ada salinan yang sedang dipinjam
          const { data: salinanDipinjam } = await supabase
            .from('salinan')
            .select('id')
            .eq('buku_id', id)
            .eq('status', 'dipinjam');

          if (salinanDipinjam && salinanDipinjam.length > 0) {
            setSnackMsg('Buku tidak dapat dihapus karena masih ada salinan yang sedang dipinjam!');
            setLoading(false);
            return;
          }

          // Soft delete
          const { error } = await supabase
            .from('buku')
            .update({ dihapus: true, updated_at: new Date().toISOString() })
            .eq('id', id);

          if (error) throw error;
          setSnackMsg('Buku berhasil dihapus');
          router.replace('/(admin)/buku');
        } catch (e: any) {
          setSnackMsg(e.message || 'Gagal menghapus buku');
        } finally {
          setLoading(false);
        }
      }}
    ]);
  };

  const handleGoBack = () => {
    router.replace('/(admin)/buku');
  };

  const getStatusColor = (status: string) => {
    if (status === 'tersedia') return '#2E7D32';
    if (status === 'dipinjam') return '#1565C0';
    return '#D32F2F';
  };

  if (pageLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#fff', height: 48, elevation: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
        <Appbar.BackAction onPress={handleGoBack} />
        <Appbar.Content title={isNew ? "Tambah Buku" : "Detail Buku"} titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
        {!isNew && <Appbar.Action icon={() => <Trash2 size={20} color="#D32F2F" />} onPress={handleHapus} />}
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {isNew && (
          <View style={styles.scanRow}>
            <TextInput label="ISBN (Opsional)" value={isbn} onChangeText={setIsbn} mode="outlined" style={styles.flexInput} />
            <Button mode="contained" onPress={handleScanIsbn} loading={loading} style={styles.scanBtn}>Cari</Button>
          </View>
        )}

        <TextInput label="Judul" value={judul} onChangeText={setJudul} mode="outlined" style={styles.input} />
        <TextInput label="Penulis" value={penulis} onChangeText={setPenulis} mode="outlined" style={styles.input} />
        <TextInput label="Penerbit" value={penerbit} onChangeText={setPenerbit} mode="outlined" style={styles.input} />
        
        <View style={styles.row}>
          <TextInput label="Tahun Terbit" value={tahun} onChangeText={setTahun} mode="outlined" style={[styles.input, { flex: 1, marginRight: 8 }]} keyboardType="numeric" />
          <TextInput label="Bahasa" value={bahasa} onChangeText={setBahasa} mode="outlined" style={[styles.input, { flex: 1 }]} />
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <TextInput
              label="Kategori"
              value={kategori}
              onChangeText={(text) => {
                setKategori(text);
                setShowCategoryMenu(true);
              }}
              onFocus={() => setShowCategoryMenu(true)}
              mode="outlined"
              style={styles.input}
            />
            {showCategoryMenu && kategori.trim().length > 0 && (
              <View style={styles.suggestionsContainer}>
                {availableCategories
                  .filter(c => c.nama.toLowerCase().includes(kategori.trim().toLowerCase()))
                  .map(c => (
                    <Chip
                      key={c.id}
                      style={{ margin: 2 }}
                      onPress={() => {
                        setKategori(c.nama);
                        setShowCategoryMenu(false);
                      }}
                    >
                      {c.nama}
                    </Chip>
                  ))}
                {!availableCategories.some(c => c.nama.trim().toLowerCase() === kategori.trim().toLowerCase()) && (
                  <Chip
                    style={{ margin: 2, backgroundColor: '#E3F2FD' }}
                    textStyle={{ color: '#1565C0', fontWeight: 'bold' }}
                    onPress={() => {
                      setShowCategoryMenu(false);
                    }}
                  >
                    + Tambah kategori "{kategori.trim()}"
                  </Chip>
                )}
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <TextInput
              label="Rak (Wajib)"
              value={rak}
              onChangeText={(text) => {
                setRak(text);
                setShowRakMenu(true);
              }}
              onFocus={() => setShowRakMenu(true)}
              mode="outlined"
              style={styles.input}
            />
            {showRakMenu && rak.trim().length > 0 && (
              <View style={styles.suggestionsContainer}>
                {availableRaks
                  .filter(r => r.nama.toLowerCase().includes(rak.trim().toLowerCase()))
                  .map(r => (
                    <Chip
                      key={r.id}
                      style={{ margin: 2 }}
                      onPress={() => {
                        setRak(r.nama);
                        setShowRakMenu(false);
                      }}
                    >
                      {r.nama}
                    </Chip>
                  ))}
                {!availableRaks.some(r => r.nama.trim().toLowerCase() === rak.trim().toLowerCase()) && (
                  <Chip
                    style={{ margin: 2, backgroundColor: '#E3F2FD' }}
                    textStyle={{ color: '#1565C0', fontWeight: 'bold' }}
                    onPress={() => {
                      setShowRakMenu(false);
                    }}
                  >
                    + Tambah rak "{rak.trim()}"
                  </Chip>
                )}
              </View>
            )}
          </View>
        </View>

        {isNew && (
          <TextInput
            label="Jumlah Salinan (Eksemplar Awal)"
            value={jumlahSalinan}
            onChangeText={setJumlahSalinan}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
        )}

        <TextInput label="Jumlah Halaman" value={jumlahHalaman} onChangeText={setJumlahHalaman} mode="outlined" style={styles.input} keyboardType="numeric" />
        <TextInput label="Sinopsis" value={sinopsis} onChangeText={setSinopsis} mode="outlined" style={styles.input} multiline numberOfLines={4} />

        <Button mode="contained" onPress={handleSimpan} style={styles.simpanBtn} loading={loading} disabled={loading}>
          {isNew ? "Simpan Buku" : "Perbarui Buku"}
        </Button>

        {/* Section: Salinan Eksemplar (Untuk Edit / Detail) */}
        {!isNew && (
          <Card style={styles.salinanCard} mode="outlined">
            <Card.Title
              title={`Salinan Eksemplar (${salinanList.filter(s => s.status === 'tersedia').length}/${salinanList.length} Tersedia)`}
              titleStyle={{ fontSize: 14, fontWeight: 'bold' }}
              left={() => <Copy size={20} color="#000" />}
            />
            <Card.Content>
              {salinanList.length === 0 ? (
                <Text style={{ color: '#888', fontStyle: 'italic', marginBottom: 12 }}>Belum ada eksemplar tercatat.</Text>
              ) : (
                salinanList.map(s => {
                  const digits = Math.max(2, String(Math.max(salinanList.length, s.nomor_urut)).length);
                  const kodeStr = `Kode: ${String(s.nomor_urut).padStart(digits, '0')}`;
                  return (
                    <View key={s.id} style={styles.salinanRow}>
                      <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
                        {kodeStr} <Text style={{ color: '#666', fontSize: 12 }}>({s.kode_eksemplar})</Text>
                      </Text>
                      <Chip
                        style={{ backgroundColor: getStatusColor(s.status) + '1A', height: 28 }}
                        textStyle={{ color: getStatusColor(s.status), fontSize: 11, lineHeight: 14 }}
                      >
                        {s.status}
                      </Chip>
                    </View>
                  );
                })
              )}

              <Divider style={{ marginVertical: 12 }} />

              <Text variant="labelMedium" style={{ fontWeight: '600', marginBottom: 8 }}>Tambah Salinan Baru</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  label="Jumlah"
                  value={tambahSalinanCount}
                  onChangeText={setTambahSalinanCount}
                  mode="outlined"
                  keyboardType="numeric"
                  style={{ width: 80, backgroundColor: '#FFF' }}
                  dense
                />
                <Button
                  mode="contained-tonal"
                  icon={() => <Plus size={16} color="#000" />}
                  onPress={handleTambahSalinan}
                  loading={salinanLoading}
                  disabled={salinanLoading}
                  style={{ flex: 1, borderRadius: 8 }}
                >
                  Tambah Eksemplar
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <Snackbar visible={!!snackMsg} onDismiss={() => setSnackMsg('')} duration={3000}>
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 40 },
  input: { marginBottom: 12, backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row' },
  scanRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  flexInput: { flex: 1, backgroundColor: '#FFFFFF' },
  scanBtn: { borderRadius: 8, height: 50, justifyContent: 'center' },
  simpanBtn: { marginTop: 16, borderRadius: 8 },
  salinanCard: { marginTop: 24, backgroundColor: '#FFFFFF', borderRadius: 8 },
  salinanRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, marginBottom: 8, padding: 4, backgroundColor: '#FAFAFA', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0' },
});


