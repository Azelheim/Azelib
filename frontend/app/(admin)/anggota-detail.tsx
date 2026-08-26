import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pencil, Trash2, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { useAzelheimTheme } from '../../lib/theme';
import {
  AzelheimScreen,
  AzelheimSectionHeader,
  AzelheimCard,
  AzelheimButton,
  AzelheimBadge,
  AzelheimMetaBox,
  AzelheimInput,
  AzelheimToast,
  AzelheimIconButton,
} from '../../lib/components/azelheim';

export default function DetailAnggota() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useAzelheimTheme();
  const { tenantId, userRole } = useTenant();
  const isViewOnly = userRole === 'staff';
  const isNew = id === 'tambah' || !id;

  const [isEditing, setIsEditing] = useState(isNew);

  const [nama, setNama] = useState('');
  const [nomorAnggota, setNomorAnggota] = useState('');
  const [kategori, setKategori] = useState('Siswa');
  const [kontak, setKontak] = useState('');
  const [alamat, setAlamat] = useState('');

  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [activeLoansCount, setActiveLoansCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(!isNew);
  const [snackMsg, setSnackMsg] = useState('');

  useEffect(() => {
    if (isNew) {
      generateNomorAnggota();
      setIsEditing(true);
      setPageLoading(false);
    } else if (id && id !== 'tambah') {
      loadAnggota();
    }
  }, [id, isNew]);

  const generateNomorAnggota = async () => {
    if (!tenantId) return;
    try {
      const { count } = await supabase
        .from('anggota')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      const nextNum = (count || 0) + 1;
      setNomorAnggota(`ANG-${String(nextNum).padStart(5, '0')}`);
    } catch (e) {
      console.error(e);
      setNomorAnggota('ANG-00001');
    }
  };

  const loadAnggota = async () => {
    setPageLoading(true);
    try {
      const [anggotaRes, riwayatRes] = await Promise.all([
        supabase.from('anggota').select('*').eq('id', id).single(),
        supabase
          .from('peminjaman')
          .select(`
            id, tanggal_pinjam, jatuh_tempo, tanggal_kembali, status,
            peminjaman_detail(
              salinan(
                nomor_urut,
                kode_eksemplar,
                buku(judul)
              )
            )
          `)
          .eq('anggota_id', id)
          .order('created_at', { ascending: false }),
      ]);

      if (anggotaRes.error) throw anggotaRes.error;
      if (anggotaRes.data) {
        setNama(anggotaRes.data.nama || '');
        setNomorAnggota(anggotaRes.data.nomor_anggota || '');
        setKategori(anggotaRes.data.kategori_anggota || 'Siswa');
        setKontak(anggotaRes.data.kontak || '');
        setAlamat(anggotaRes.data.alamat || '');
      }

      const loans = (riwayatRes.data as any[]) || [];
      setRiwayat(loans);
      const activeCount = loans.filter((l) => l.status === 'aktif').length;
      setActiveLoansCount(activeCount);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal memuat detail anggota');
    } finally {
      setPageLoading(false);
    }
  };

  const handleSimpan = async () => {
    if (nama.trim().length < 3) {
      setSnackMsg('Nama minimal 3 karakter');
      return;
    }
    const phoneRegex = /^08\d{8,11}$/;
    if (!phoneRegex.test(kontak.trim())) {
      setSnackMsg('Nomor HP tidak valid (contoh: 08123456789)');
      return;
    }

    setLoading(true);
    try {
      const anggotaData = {
        tenant_id: tenantId,
        nomor_anggota: nomorAnggota,
        nama: nama.trim(),
        kategori_anggota: kategori,
        kontak: kontak.trim(),
        alamat: alamat.trim() || null,
      };

      if (isNew) {
        const { error } = await supabase.from('anggota').insert(anggotaData);
        if (error) throw error;
        setSnackMsg('Anggota berhasil ditambahkan');
      } else {
        const { error } = await supabase
          .from('anggota')
          .update(anggotaData)
          .eq('id', id);
        if (error) throw error;
        setSnackMsg('Data anggota berhasil diperbarui');
      }

      router.replace('/(admin)/anggota');
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal menyimpan data anggota');
    } finally {
      setLoading(false);
    }
  };

  const handleHapus = () => {
    Alert.alert('Konfirmasi Hapus', 'Yakin ingin menghapus anggota ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          if (activeLoansCount > 0) {
            Alert.alert(
              'Gagal Menghapus',
              'Anggota tidak dapat dihapus karena masih memiliki peminjaman aktif.'
            );
            return;
          }

          setLoading(true);
          try {
            const { error } = await supabase
              .from('anggota')
              .update({ dihapus: true })
              .eq('id', id);

            if (error) throw error;
            router.replace('/(admin)/anggota');
          } catch (e: any) {
            console.error(e);
            setSnackMsg(e.message || 'Gagal menghapus anggota');
            setLoading(false);
          }
        },
      },
    ]);
  };

  if (pageLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <AzelheimScreen extraBottomPadding={60}>
      <View style={styles.topNavRow}>
        <AzelheimIconButton
          icon={<ArrowLeft size={18} color={colors.text} />}
          onPress={() => router.replace('/(admin)/anggota')}
          accessibilityLabel="Kembali ke Anggota"
        />
      </View>

      <AzelheimSectionHeader
        title={isNew ? 'Tambah Anggota' : isEditing ? 'Edit Anggota' : 'Detail Anggota'}
        code={isNew ? 'MEMB // NEW' : `MEMB // ${String(nomorAnggota || id || '').slice(0, 8).toUpperCase()}`}
      />

      {/* View Mode */}
      {!isEditing && !isNew ? (
        <>
          <AzelheimCard style={{ marginBottom: 12 }}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>{nama}</Text>
                <Text style={[styles.nomorText, { color: colors.muted }]}>
                  {nomorAnggota}
                </Text>
              </View>
              <AzelheimBadge
                label={activeLoansCount > 0 ? `MEMINJAM ${activeLoansCount} BUKU` : 'BEBAS PINJAM'}
                variant={activeLoansCount > 0 ? 'purple' : 'gray'}
              />
            </View>

            <View style={[styles.rule, { borderTopColor: colors.line }]} />

            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: colors.faint }]}>KATEGORI</Text>
                <AzelheimBadge label={kategori || 'Siswa'} variant="gray" />
              </View>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: colors.faint }]}>KONTAK</Text>
                <Text style={[styles.valMono, { color: colors.text }]}>{kontak || '-'}</Text>
              </View>
              <View style={[styles.gridItem, { width: '100%', marginTop: 8 }]}>
                <Text style={[styles.label, { color: colors.faint }]}>ALAMAT</Text>
                <Text style={[styles.val, { color: colors.muted }]}>
                  {alamat || 'Tidak ada alamat tercatat.'}
                </Text>
              </View>
            </View>
          </AzelheimCard>

          {/* Loan History Card */}
          <AzelheimCard style={{ marginBottom: 16 }}>
            <View style={styles.cardHead}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Riwayat Peminjaman
                </Text>
                <Text style={[styles.cardSub, { color: colors.muted }]}>
                  Catatan sirkulasi anggota
                </Text>
              </View>
              <AzelheimBadge label={`${riwayat.length} TRANSAKSI`} variant="gray" />
            </View>

            {riwayat.length === 0 ? (
              <Text style={[styles.emptySub, { color: colors.faint, marginTop: 10 }]}>
                Belum ada catatan peminjaman.
              </Text>
            ) : (
              riwayat.map((loan) => {
                const bookTitles = (loan.peminjaman_detail || [])
                  .map((d: any) => `${d.salinan?.buku?.judul || 'Buku'} (#${d.salinan?.nomor_urut || '01'})`)
                  .join(', ');

                return (
                  <AzelheimMetaBox
                    key={loan.id}
                    leftText={bookTitles || 'Peminjaman'}
                    rightText={loan.status.toUpperCase()}
                    style={{ marginTop: 6 }}
                  />
                );
              })
            )}
          </AzelheimCard>

          {/* Action Buttons */}
          {!isViewOnly && (
            <View style={styles.buttonRow}>
              <AzelheimButton
                variant="light"
                title="Edit"
                icon={<Pencil size={18} color={colors.text} />}
                onPress={() => setIsEditing(true)}
                style={{ flex: 1 }}
              />
              <AzelheimButton
                variant="red"
                title="Hapus"
                icon={<Trash2 size={18} color={colors.danger} />}
                onPress={handleHapus}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </>
      ) : (
        /* Edit / Create Form */
        <AzelheimCard style={{ marginBottom: 16 }}>
          <AzelheimInput
            label="Nomor Anggota (Auto)"
            value={nomorAnggota}
            editable={false}
            mono
          />

          <AzelheimInput
            label="Nama Lengkap *"
            placeholder="Nama lengkap anggota..."
            value={nama}
            onChangeText={setNama}
          />

          <AzelheimInput
            label="Kategori Anggota"
            placeholder="Siswa / Guru / Staff / Umum"
            value={kategori}
            onChangeText={setKategori}
          />

          <AzelheimInput
            label="Nomor Kontak / WhatsApp *"
            placeholder="08123456789..."
            value={kontak}
            onChangeText={setKontak}
            keyboardType="phone-pad"
            mono
          />

          <AzelheimInput
            label="Alamat (Opsional)"
            placeholder="Alamat tempat tinggal..."
            value={alamat}
            onChangeText={setAlamat}
            multiline
          />

          <View style={styles.buttonRow}>
            {!isNew && (
              <AzelheimButton
                variant="light"
                title="Batal"
                onPress={() => setIsEditing(false)}
                style={{ flex: 1 }}
              />
            )}
            <AzelheimButton
              variant="dark"
              title={isNew ? 'Simpan Anggota' : 'Simpan Perubahan'}
              onPress={handleSimpan}
              loading={loading}
              disabled={loading}
              style={{ flex: 1.5 }}
            />
          </View>
        </AzelheimCard>
      )}

      <AzelheimToast
        visible={!!snackMsg}
        message={snackMsg}
        onDismiss={() => setSnackMsg('')}
        duration={3000}
      />
    </AzelheimScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topNavRow: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  nomorText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  rule: {
    borderTopWidth: 1,
    marginVertical: 12,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  gridItem: {
    width: '50%',
    paddingRight: 6,
  },
  label: {
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  val: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  valMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  emptySub: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
});
