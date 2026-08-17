import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Snackbar, Appbar, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiClient } from '../../lib/api/apiClient';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { Trash2, Printer } from 'lucide-react-native';

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

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(!isNew);
  const [snackMsg, setSnackMsg] = useState('');

  useEffect(() => {
    if (!isNew && id && id !== 'tambah') {
      loadBuku();
    }
  }, [id]);

  const loadBuku = async () => {
    setPageLoading(true);
    try {
      const { data, error } = await supabase
        .from('buku')
        .select(`
          *,
          kategori:kategori_id(nama),
          rak:rak_id(nama)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
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
    if (!namaKat.trim()) return null;
    const { data: existing } = await supabase
      .from('kategori')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('nama', namaKat.trim())
      .single();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from('kategori')
      .insert({ tenant_id: tenantId, nama: namaKat.trim() })
      .select('id')
      .single();

    if (error) throw error;
    return created?.id;
  };

  const getOrCreateRak = async (namaRak: string) => {
    if (!namaRak.trim()) return null;
    const { data: existing } = await supabase
      .from('rak')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('nama', namaRak.trim())
      .single();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from('rak')
      .insert({ tenant_id: tenantId, nama: namaRak.trim() })
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
    if (!isbn.trim() && !kodeLokal.trim()) {
      setKodeLokal(`LOK-${Date.now().toString().slice(-5)}`);
    }

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
        isbn: isbn.trim() || null,
        kode_lokal: kodeLokal.trim() || (isbn.trim() ? null : `LOK-${Date.now().toString().slice(-5)}`),
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

        // Otomatis buat 1 salinan
        await apiClient.buku.salinanGenerate(newBuku.id, 1);
        setSnackMsg('Buku berhasil ditambahkan');
      } else {
        const { error } = await supabase.from('buku').update(payload).eq('id', id);
        if (error) throw error;
        setSnackMsg('Buku berhasil diperbarui');
      }

      setTimeout(() => router.back(), 1000);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal menyimpan buku');
    } finally {
      setLoading(false);
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
          setTimeout(() => router.back(), 1000);
        } catch (e: any) {
          setSnackMsg(e.message || 'Gagal menghapus buku');
        } finally {
          setLoading(false);
        }
      }}
    ]);
  };

  const handleCetakKode = async () => {
    try {
      setLoading(true);
      const res = await apiClient.buku.salinanGenerate(id as string, 1);
      setSnackMsg(`Salinan dibuat. Kode: ${res.salinan?.[0]?.kode_eksemplar || 'OK'}`);
    } catch (e: any) {
      setSnackMsg(e.message || 'Gagal generate salinan');
    } finally {
      setLoading(false);
    }
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
        <Appbar.BackAction onPress={() => router.back()} />
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
          <TextInput label="Kategori" value={kategori} onChangeText={setKategori} mode="outlined" style={[styles.input, { flex: 1, marginRight: 8 }]} />
          <TextInput label="Rak" value={rak} onChangeText={setRak} mode="outlined" style={[styles.input, { flex: 1 }]} />
        </View>

        <TextInput label="Jumlah Halaman" value={jumlahHalaman} onChangeText={setJumlahHalaman} mode="outlined" style={styles.input} keyboardType="numeric" />
        <TextInput label="Sinopsis" value={sinopsis} onChangeText={setSinopsis} mode="outlined" style={styles.input} multiline numberOfLines={4} />

        <Button mode="contained" onPress={handleSimpan} style={styles.simpanBtn} loading={loading} disabled={loading}>
          Simpan
        </Button>

        {!isNew && (
          <Button mode="outlined" onPress={handleCetakKode} style={styles.simpanBtn} icon={() => <Printer size={18} color="#000" />} loading={loading}>
            Cetak Kode Semua Eksemplar
          </Button>
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
  simpanBtn: { marginTop: 16, borderRadius: 8 }
});
