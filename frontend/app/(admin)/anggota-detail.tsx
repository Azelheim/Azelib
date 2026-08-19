import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, Button, Snackbar, Appbar, Card, ActivityIndicator, SegmentedButtons, Menu } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { Trash2 } from 'lucide-react-native';

const KATEGORI_OPTIONS = [
  { value: 'Siswa', label: 'Siswa' },
  { value: 'Guru', label: 'Guru' },
  { value: 'Umum', label: 'Umum' },
];

export default function DetailAnggota() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { tenantId, userRole } = useTenant();
  const isViewOnly = userRole === 'staff';
  const isNew = id === 'tambah' || !id;

  const [nama, setNama] = useState('');
  const [nomorAnggota, setNomorAnggota] = useState('');
  const [kategori, setKategori] = useState('Siswa');
  const [kontak, setKontak] = useState('');
  const [alamat, setAlamat] = useState('');
  const [riwayat, setRiwayat] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(!isNew);
  const [snackMsg, setSnackMsg] = useState('');

  const resetForm = useCallback(() => {
    setNama('');
    setNomorAnggota('');
    setKategori('Siswa');
    setKontak('');
    setAlamat('');
    setRiwayat([]);
  }, []);

  useEffect(() => {
    if (isNew) {
      resetForm();
      setPageLoading(false);
    } else if (id && id !== 'tambah') {
      loadAnggota();
    }
  }, [id, isNew]);

  const loadAnggota = async () => {
    setPageLoading(true);
    try {
      const { data, error } = await supabase
        .from('anggota')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setNama(data.nama || '');
        setNomorAnggota(data.nomor_anggota || '');
        setKategori(data.kategori_anggota || 'Siswa');
        setKontak(data.kontak || '');
        setAlamat(data.alamat || '');
      }

      // Load riwayat peminjaman
      const { data: pinjamData } = await supabase
        .from('peminjaman')
        .select('id, tanggal_pinjam, jatuh_tempo, status, tanggal_kembali')
        .eq('anggota_id', id)
        .order('tanggal_pinjam', { ascending: false })
        .limit(10);

      if (pinjamData) setRiwayat(pinjamData);
    } catch (e) {
      console.error(e);
      setSnackMsg('Gagal memuat data anggota');
    } finally {
      setPageLoading(false);
    }
  };

  const generateNomorAnggota = async () => {
    const { count } = await supabase
      .from('anggota')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const nextNum = (count || 0) + 1;
    return `ANG-${String(nextNum).padStart(5, '0')}`;
  };

  const handleSimpan = async () => {
    if (nama.trim().length < 3) {
      setSnackMsg('Nama minimal 3 karakter');
      return;
    }
    if (kontak.trim() && !/^08\d{8,11}$/.test(kontak.trim())) {
      setSnackMsg('Nomor HP tidak valid (contoh: 08123456789)');
      return;
    }

    setLoading(true);
    try {
      if (isNew) {
        const noAnggota = await generateNomorAnggota();
        const { error } = await supabase.from('anggota').insert({
          tenant_id: tenantId,
          nomor_anggota: noAnggota,
          nama: nama.trim(),
          kategori_anggota: kategori,
          kontak: kontak.trim() || null,
          alamat: alamat.trim() || null,
        });
        if (error) throw error;
        resetForm();
        setSnackMsg('Anggota berhasil ditambahkan');
      } else {
        const { error } = await supabase.from('anggota').update({
          nama: nama.trim(),
          kategori_anggota: kategori,
          kontak: kontak.trim() || null,
          alamat: alamat.trim() || null,
        }).eq('id', id);
        if (error) throw error;
        setSnackMsg('Anggota berhasil diperbarui');
      }
      
      // Selalu kembali ke Halaman Anggota
      router.replace('/(admin)/anggota');
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const handleHapus = () => {
    Alert.alert('Konfirmasi Hapus', 'Yakin ingin menghapus anggota ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        setLoading(true);
        try {
          // Cek apakah ada peminjaman aktif
          const { data: activeLoans } = await supabase
            .from('peminjaman')
            .select('id')
            .eq('anggota_id', id)
            .eq('status', 'aktif');

          if (activeLoans && activeLoans.length > 0) {
            setSnackMsg('Anggota tidak dapat dihapus karena sedang meminjam buku!');
            setLoading(false);
            return;
          }

          // Soft delete
          const { error } = await supabase
            .from('anggota')
            .update({ dihapus: true })
            .eq('id', id);

          if (error) throw error;
          setSnackMsg('Anggota berhasil dihapus');
          router.replace('/(admin)/anggota');
        } catch (e: any) {
          setSnackMsg(e.message || 'Gagal menghapus');
        } finally {
          setLoading(false);
        }
      }},
    ]);
  };

  const handleGoBack = () => {
    router.replace('/(admin)/anggota');
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
        <Appbar.Content title={isNew ? "Tambah Anggota" : "Detail Anggota"} titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
        {!isNew && !isViewOnly && <Appbar.Action icon={() => <Trash2 size={20} color="#D32F2F" />} onPress={handleHapus} />}
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} keyboardShouldPersistTaps="handled">
        {!isNew && (
          <TextInput
            label="Nomor Anggota"
            value={nomorAnggota}
            mode="outlined"
            disabled
            style={styles.input}
          />
        )}
        <TextInput
          label="Nama Lengkap"
          value={nama}
          onChangeText={setNama}
          mode="outlined"
          disabled={isViewOnly}
          style={styles.input}
        />

        {/* Dropdown / Fixed Selector Kategori Anggota (MEMBER-004) */}
        <Text variant="labelMedium" style={styles.label}>Kategori Anggota</Text>
        <SegmentedButtons
          value={kategori}
          onValueChange={setKategori}
          buttons={KATEGORI_OPTIONS}
          style={styles.segmented}
        />

        <TextInput
          label="Nomor HP / Kontak (08xxxxxxxxxx)"
          value={kontak}
          onChangeText={setKontak}
          mode="outlined"
          keyboardType="phone-pad"
          disabled={isViewOnly}
          style={styles.input}
        />
        <TextInput
          label="Alamat"
          value={alamat}
          onChangeText={setAlamat}
          mode="outlined"
          multiline
          numberOfLines={3}
          disabled={isViewOnly}
          style={styles.input}
        />

        {!isViewOnly && (
          <Button mode="contained" onPress={handleSimpan} style={styles.btn} loading={loading} disabled={loading}>
            {isNew ? "Simpan Anggota" : "Perbarui Anggota"}
          </Button>
        )}

        {!isNew && (
          <Card style={styles.riwayatCard} mode="outlined">
            <Card.Title title="Riwayat Peminjaman (10 Terakhir)" />
            <Card.Content>
              {riwayat.length === 0 ? (
                <Text style={{ color: '#666' }}>Belum ada riwayat peminjaman.</Text>
              ) : (
                riwayat.map(r => (
                  <View key={r.id} style={styles.riwayatItem}>
                    <Text variant="bodyMedium">Pinjam: {r.tanggal_pinjam} | Tempo: {r.jatuh_tempo}</Text>
                    <Text variant="bodySmall" style={{ color: r.status === 'aktif' ? '#1565C0' : '#2E7D32' }}>
                      Status: {r.status} {r.tanggal_kembali ? `(Kembali: ${r.tanggal_kembali})` : ''}
                    </Text>
                  </View>
                ))
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

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
  label: { marginBottom: 6, fontWeight: '600', color: '#444' },
  segmented: { marginBottom: 16 },
  btn: { marginTop: 16, borderRadius: 8 },
  riwayatCard: { marginTop: 24, backgroundColor: '#FFFFFF' },
  riwayatItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
});

