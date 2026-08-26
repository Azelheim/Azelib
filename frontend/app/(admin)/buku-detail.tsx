import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Printer, Pencil, Trash2, ArrowLeft, Plus, Search } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { apiClient } from '../../lib/api/apiClient';
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

interface SalinanItem {
  id: string;
  nomor_urut: number;
  kode_eksemplar: string;
  status: string;
}

export default function DetailBuku() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useAzelheimTheme();
  const { tenantId, userRole } = useTenant();
  const isViewOnly = userRole === 'staff';
  const isNew = id === 'tambah' || !id;

  const [isEditing, setIsEditing] = useState(isNew);

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

  // Categories & Raks
  const [availableCategories, setAvailableCategories] = useState<{ id: string; nama: string }[]>([]);
  const [availableRaks, setAvailableRaks] = useState<{ id: string; nama: string }[]>([]);

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
      setIsEditing(true);
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
          .order('nomor_urut', { ascending: true }),
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
    if (!isbn.trim()) {
      setSnackMsg('Masukkan ISBN terlebih dahulu');
      return;
    }
    setLoading(true);
    try {
      const result = await apiClient.buku.lookupIsbn(isbn.trim());
      if (result) {
        if (result.judul) setJudul(result.judul);
        if (result.penulis) setPenulis(result.penulis);
        if (result.penerbit) setPenerbit(result.penerbit);
        if (result.tahun_terbit) setTahun(result.tahun_terbit.toString());
        if (result.cover_url) setCoverUrl(result.cover_url);
        setSnackMsg('Data buku ditemukan & diisi otomatis');
      } else {
        setSnackMsg('Buku tidak ditemukan dari ISBN');
      }
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal mencari ISBN');
    } finally {
      setLoading(false);
    }
  };

  const ensureCategory = async (namaKat: string) => {
    if (!namaKat.trim() || !tenantId) return null;
    const trimmed = namaKat.trim();
    const existing = availableCategories.find(
      (k) => k.nama.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('kategori')
      .insert({ tenant_id: tenantId, nama: trimmed })
      .select()
      .single();

    if (!error && data) {
      setAvailableCategories((prev) => [...prev, data]);
      return data.id;
    }
    return null;
  };

  const ensureRak = async (namaRak: string) => {
    if (!namaRak.trim() || !tenantId) return null;
    const trimmed = namaRak.trim();
    const existing = availableRaks.find(
      (r) => r.nama.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('rak')
      .insert({ tenant_id: tenantId, nama: trimmed })
      .select()
      .single();

    if (!error && data) {
      setAvailableRaks((prev) => [...prev, data]);
      return data.id;
    }
    return null;
  };

  const generateLocalCode = async () => {
    const { count } = await supabase
      .from('buku')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const nextNum = (count || 0) + 1;
    return `LOK-${String(nextNum).padStart(5, '0')}`;
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

    setLoading(true);
    try {
      const katId = await ensureCategory(kategori);
      const rakId = await ensureRak(rak);

      let finalKodeLokal = kodeLokal;
      if (!isbn.trim() && !kodeLokal) {
        finalKodeLokal = await generateLocalCode();
      }

      const bookData: any = {
        tenant_id: tenantId,
        judul: judul.trim(),
        penulis: penulis.trim() || null,
        penerbit: penerbit.trim() || null,
        tahun_terbit: tahun ? parseInt(tahun) : null,
        isbn: isbn.trim() || null,
        kode_lokal: finalKodeLokal || null,
        kategori_id: katId,
        rak_id: rakId,
        sinopsis: sinopsis.trim() || null,
        bahasa: bahasa.trim() || null,
        jumlah_halaman: jumlahHalaman ? parseInt(jumlahHalaman) : null,
        cover_url: coverUrl.trim() || null,
      };

      if (isNew) {
        const { data: newBook, error: bookErr } = await supabase
          .from('buku')
          .insert(bookData)
          .select()
          .single();

        if (bookErr) throw bookErr;

        // Generate copies
        const copiesCount = Math.max(1, parseInt(jumlahSalinan) || 1);
        const prefix = bookData.isbn || finalKodeLokal;
        const copyInserts = [];

        for (let i = 1; i <= copiesCount; i++) {
          copyInserts.push({
            buku_id: newBook.id,
            nomor_urut: i,
            kode_eksemplar: `${prefix}-${String(i).padStart(2, '0')}`,
            status: 'tersedia',
          });
        }

        const { error: copyErr } = await supabase.from('salinan').insert(copyInserts);
        if (copyErr) throw copyErr;

        resetForm();
        setSnackMsg('Buku dan salinan berhasil ditambahkan');
      } else {
        const { error: bookErr } = await supabase
          .from('buku')
          .update(bookData)
          .eq('id', id);

        if (bookErr) throw bookErr;
        setSnackMsg('Data buku berhasil diperbarui');
      }

      router.replace('/(admin)/buku');
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal menyimpan data buku');
    } finally {
      setLoading(false);
    }
  };

  const handleTambahSalinan = async () => {
    const count = parseInt(tambahSalinanCount) || 1;
    if (count < 1) return;

    setSalinanLoading(true);
    try {
      const currentMax = salinanList.reduce((max, s) => Math.max(max, s.nomor_urut), 0);
      const prefix = isbn || kodeLokal || `LOK-${id}`;
      const copyInserts = [];

      for (let i = 1; i <= count; i++) {
        const nextNum = currentMax + i;
        copyInserts.push({
          buku_id: id,
          nomor_urut: nextNum,
          kode_eksemplar: `${prefix}-${String(nextNum).padStart(2, '0')}`,
          status: 'tersedia',
        });
      }

      const { data, error } = await supabase
        .from('salinan')
        .insert(copyInserts)
        .select();

      if (error) throw error;
      setSalinanList((prev) => [...prev, ...(data as SalinanItem[])]);
      setTambahSalinanCount('1');
      setSnackMsg(`${count} salinan baru berhasil ditambahkan`);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal menambah salinan');
    } finally {
      setSalinanLoading(false);
    }
  };

  const handleHapus = () => {
    Alert.alert('Konfirmasi Hapus', 'Yakin ingin menghapus buku ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const hasBorrowed = salinanList.some((s) => s.status === 'dipinjam');
            if (hasBorrowed) {
              Alert.alert(
                'Gagal Menghapus',
                'Buku tidak dapat dihapus karena masih ada salinan yang sedang dipinjam.'
              );
              setLoading(false);
              return;
            }

            const { error } = await supabase
              .from('buku')
              .update({ dihapus: true })
              .eq('id', id);

            if (error) throw error;
            router.replace('/(admin)/buku');
          } catch (e: any) {
            console.error(e);
            setSnackMsg(e.message || 'Gagal menghapus buku');
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleCetakKode = async () => {
    if (salinanList.length === 0) {
      setSnackMsg('Belum ada salinan untuk dicetak');
      return;
    }

    try {
      const itemsHtml = salinanList
        .map(
          (s) => `
          <div style="border: 1.5px dashed #000; padding: 10px; margin: 8px; width: 42%; display: inline-block; box-sizing: border-box; text-align: center; border-radius: 4px;">
            <div style="font-size: 11px; font-weight: bold;">${judul}</div>
            <div style="font-family: monospace; font-size: 15px; font-weight: bold; margin: 6px 0;">${s.kode_eksemplar}</div>
            <div style="font-size: 9px; color: #555;">Salinan #${s.nomor_urut} · Status: ${s.status.toUpperCase()}</div>
          </div>
        `
        )
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Kode Eksemplar - ${judul}</title>
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; }
              h2 { text-align: center; margin-bottom: 4px; }
              .sub { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <h2>Kode Eksemplar Buku</h2>
            <div class="sub">${judul} — Total: ${salinanList.length} Salinan</div>
            <div style="text-align: center;">
              ${itemsHtml}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e: any) {
      console.error(e);
      setSnackMsg('Gagal membuat lembar kode eksemplar');
    }
  };

  if (pageLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const totalTersedia = salinanList.filter((s) => s.status === 'tersedia').length;
  const totalSalinan = salinanList.length;

  return (
    <AzelheimScreen extraBottomPadding={60}>
      <View style={styles.topNavRow}>
        <AzelheimIconButton
          icon={<ArrowLeft size={18} color={colors.text} />}
          onPress={() => router.replace('/(admin)/buku')}
          accessibilityLabel="Kembali ke Buku"
        />
      </View>

      <AzelheimSectionHeader
        title={isNew ? 'Tambah Buku' : isEditing ? 'Edit Buku' : 'Detail Buku'}
        code={isNew ? 'BOOK // NEW' : `BOOK // ${String(id || '').slice(0, 6).toUpperCase()}`}
      />

      {/* View Mode */}
      {!isEditing && !isNew ? (
        <>
          {/* Main Book Detail Card */}
          <AzelheimCard style={{ marginBottom: 12 }}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>{judul}</Text>
                <Text style={[styles.author, { color: colors.muted }]}>
                  {penulis || 'Penulis tidak diketahui'}
                </Text>
              </View>
              <AzelheimBadge
                label={`${totalTersedia}/${totalSalinan}`}
                variant={totalTersedia > 0 ? 'green' : 'red'}
              />
            </View>

            <View style={[styles.rule, { borderTopColor: colors.line }]} />

            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: colors.faint }]}>PENERBIT</Text>
                <Text style={[styles.val, { color: colors.text }]}>{penerbit || '-'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: colors.faint }]}>TAHUN</Text>
                <Text style={[styles.val, { color: colors.text }]}>{tahun || '-'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: colors.faint }]}>ISBN</Text>
                <Text style={[styles.valMono, { color: colors.text }]}>{isbn || '-'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: colors.faint }]}>BAHASA</Text>
                <Text style={[styles.val, { color: colors.text }]}>{bahasa || '-'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: colors.faint }]}>KATEGORI</Text>
                <AzelheimBadge label={kategori || 'UMUM'} variant="gray" />
              </View>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: colors.faint }]}>RAK</Text>
                <AzelheimBadge label={`RAK: ${rak || '-'}`} variant="blue" />
              </View>
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={[styles.label, { color: colors.faint }]}>SINOPSIS</Text>
              <Text style={[styles.sinopsis, { color: colors.muted }]}>
                {sinopsis || 'Belum ada sinopsis untuk buku ini.'}
              </Text>
            </View>
          </AzelheimCard>

          {/* Eksemplar Card */}
          <AzelheimCard style={{ marginBottom: 16 }}>
            <View style={styles.cardHead}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Eksemplar</Text>
                <Text style={[styles.cardSub, { color: colors.muted }]}>
                  Kode per salinan · generate bulk
                </Text>
              </View>
              <AzelheimBadge label={`${totalSalinan} UNIT`} variant="gray" />
            </View>

            {salinanList.map((s) => (
              <AzelheimMetaBox
                key={s.id}
                leftText={s.kode_eksemplar}
                rightText={s.status.toUpperCase()}
                style={{ marginTop: 6 }}
              />
            ))}

            <AzelheimButton
              variant="dark"
              title="Cetak Kode"
              icon={<Printer size={18} color={colors.bg} />}
              onPress={handleCetakKode}
              fullWidth
              style={{ marginTop: 12 }}
            />
          </AzelheimCard>

          {/* Action Row */}
          {!isViewOnly && (
            <View style={styles.buttonRow}>
              <AzelheimButton
                variant="light"
                title="Edit Buku"
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
          {isNew && (
            <View style={styles.isbnRow}>
              <AzelheimInput
                label="ISBN (Opsional)"
                placeholder="Scan / Ketik ISBN..."
                value={isbn}
                onChangeText={setIsbn}
                containerStyle={{ flex: 1, marginBottom: 0 }}
                mono
              />
              <AzelheimButton
                variant="dark"
                title="Lookup"
                icon={<Search size={18} color={colors.bg} />}
                onPress={handleScanIsbn}
                loading={loading}
                style={{ minHeight: 40, alignSelf: 'flex-end', marginLeft: 8 }}
              />
            </View>
          )}

          <AzelheimInput
            label="Judul Buku *"
            placeholder="Judul lengkap buku..."
            value={judul}
            onChangeText={setJudul}
          />

          <AzelheimInput
            label="Penulis"
            placeholder="Nama penulis..."
            value={penulis}
            onChangeText={setPenulis}
          />

          <View style={styles.row2}>
            <AzelheimInput
              label="Penerbit"
              placeholder="Penerbit..."
              value={penerbit}
              onChangeText={setPenerbit}
              containerStyle={{ flex: 1 }}
            />
            <AzelheimInput
              label="Tahun"
              placeholder="Contoh: 2024"
              value={tahun}
              onChangeText={setTahun}
              keyboardType="number-pad"
              containerStyle={{ flex: 1 }}
            />
          </View>

          <View style={styles.row2}>
            <AzelheimInput
              label="Kategori"
              placeholder="Contoh: Fiksi"
              value={kategori}
              onChangeText={setKategori}
              containerStyle={{ flex: 1 }}
            />
            <AzelheimInput
              label="Rak *"
              placeholder="Contoh: 01"
              value={rak}
              onChangeText={setRak}
              containerStyle={{ flex: 1 }}
            />
          </View>

          {isNew ? (
            <AzelheimInput
              label="Jumlah Salinan *"
              placeholder="1"
              value={jumlahSalinan}
              onChangeText={setJumlahSalinan}
              keyboardType="number-pad"
            />
          ) : (
            <View style={{ marginVertical: 8 }}>
              <Text style={[styles.label, { color: colors.faint }]}>
                TAMBAH SALINAN EKSEMPLAR
              </Text>
              <View style={styles.row2}>
                <AzelheimInput
                  placeholder="Jumlah..."
                  value={tambahSalinanCount}
                  onChangeText={setTambahSalinanCount}
                  keyboardType="number-pad"
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                />
                <AzelheimButton
                  variant="purple"
                  title="Tambah"
                  icon={<Plus size={14} color={colors.text} />}
                  onPress={handleTambahSalinan}
                  loading={salinanLoading}
                  style={{ height: 42, flex: 1 }}
                />
              </View>
            </View>
          )}

          <AzelheimInput
            label="Sinopsis (Opsional)"
            placeholder="Deskripsi ringkas buku..."
            value={sinopsis}
            onChangeText={setSinopsis}
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
              title={isNew ? 'Simpan Buku' : 'Simpan Perubahan'}
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
  author: {
    fontSize: 12,
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
    fontWeight: '600',
  },
  valMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: '700',
  },
  sinopsis: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  row2: {
    flexDirection: 'row',
    gap: 8,
  },
  isbnRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
});
