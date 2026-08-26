import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ScrollView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Menu } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import {
  Plus,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  UserPlus,
  BookOpen,
} from 'lucide-react-native';
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
  AzelheimTabs,
  AzelheimFab,
  AzelheimDialog,
  AzelheimToast,
} from '../../lib/components/azelheim';

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
  const { colors } = useAzelheimTheme();
  const { tenantId, userRole } = useTenant();
  const [tab, setTab] = useState<'aktif' | 'terlambat' | 'riwayat'>('aktif');
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
      setSnackMsg(e.message || 'Gagal memuat data peminjaman');
    } finally {
      setLoading(false);
    }
  };

  const aktifCount = useMemo(
    () => data.filter((i) => i.status === 'aktif' && i.jatuh_tempo >= today).length,
    [data, today]
  );
  const terlambatCount = useMemo(
    () => data.filter((i) => i.status === 'aktif' && i.jatuh_tempo < today).length,
    [data, today]
  );

  const getFilteredData = () => {
    if (tab === 'aktif') {
      return data.filter((item) => item.status === 'aktif' && item.jatuh_tempo >= today);
    }
    if (tab === 'terlambat') {
      return data.filter((item) => item.status === 'aktif' && item.jatuh_tempo < today);
    }
    return data.filter((item) => item.status === 'dikembalikan' || item.status === 'hilang');
  };

  const loadFormData = async () => {
    if (!tenantId) return;
    try {
      const [membersRes, booksRes, raksRes, tenantRes] = await Promise.all([
        supabase.from('anggota').select('*').eq('tenant_id', tenantId).eq('dihapus', false).order('nama', { ascending: true }),
        supabase
          .from('buku')
          .select(`
            id, judul, rak_id,
            salinan(id, nomor_urut, kode_eksemplar, status)
          `)
          .eq('tenant_id', tenantId)
          .eq('dihapus', false)
          .order('judul', { ascending: true }),
        supabase.from('rak').select('id, nama').eq('tenant_id', tenantId).order('nama', { ascending: true }),
        supabase.from('tenant').select('maksimal_hari_pinjam').eq('id', tenantId).single(),
      ]);

      if (membersRes.data) setAnggotaList(membersRes.data);
      if (booksRes.data) setBooksWithCopies(booksRes.data);
      if (raksRes.data) setRakList(raksRes.data);

      const days = tenantRes.data?.maksimal_hari_pinjam || 7;
      const d = new Date();
      d.setDate(d.getDate() + days);
      setJatuhTempo(d.toISOString().split('T')[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const openNewModal = () => {
    setSelectedAnggota(null);
    setSelectedSalinan([]);
    setExpandedBookId(null);
    setFilterRakLoan(null);
    loadFormData();
    setShowNew(true);
  };

  const handleToggleSalinan = (salinanId: string) => {
    setSelectedSalinan((prev) =>
      prev.includes(salinanId)
        ? prev.filter((id) => id !== salinanId)
        : [...prev, salinanId]
    );
  };

  const handleSimpanPeminjaman = async () => {
    if (!selectedAnggota) {
      setSnackMsg('Pilih anggota peminjam terlebih dahulu');
      return;
    }
    if (selectedSalinan.length === 0) {
      setSnackMsg('Pilih minimal 1 eksemplar buku');
      return;
    }
    if (!jatuhTempo) {
      setSnackMsg('Tentukan tanggal jatuh tempo');
      return;
    }

    setCreating(true);
    try {
      await apiClient.peminjaman.create(
        selectedAnggota.id,
        selectedSalinan,
        jatuhTempo,
        tenantId || undefined
      );

      setShowNew(false);
      fetchPeminjaman();
      setSnackMsg('Peminjaman berhasil dibuat');
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal membuat peminjaman');
    } finally {
      setCreating(false);
    }
  };

  const handleKembalikan = (item: PeminjamanItem) => {
    Alert.alert('Konfirmasi Pengembalian', 'Kembalikan seluruh buku pada peminjaman ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Kembalikan',
        onPress: async () => {
          setLoading(true);
          try {
            const res = await apiClient.peminjaman.kembalikan(item.id);
            if (res?.denda && res.denda > 0) {
              Alert.alert('Pengembalian Terlambat', `Buku berhasil dikembalikan. Total denda: Rp ${res.denda.toLocaleString('id-ID')}`);
            } else {
              setSnackMsg('Buku berhasil dikembalikan');
            }
            fetchPeminjaman();
          } catch (e: any) {
            console.error(e);
            setSnackMsg(e.message || 'Gagal mengembalikan buku');
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleTandaiHilangSubmit = async () => {
    if (!hilangId) return;
    const nominal = parseInt(biayaPenggantian) || 0;
    setLoading(true);
    try {
      await apiClient.peminjaman.tandaiHilang(hilangId, nominal);
      setShowHilang(false);
      setHilangId(null);
      setBiayaPenggantian('');
      fetchPeminjaman();
      setSnackMsg('Peminjaman telah ditandai hilang');
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal menandai hilang');
      setLoading(false);
    }
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
          dihapus: false,
        })
        .select()
        .single();

      if (error) throw error;

      setAnggotaList((prev) => [...prev, newAnggota]);
      setSelectedAnggota(newAnggota);
      setShowQuickAnggota(false);
      setQuickNama('');
      setQuickKontak('');
      setQuickAlamat('');
      setSnackMsg(`Anggota ${newAnggota.nama} berhasil ditambahkan`);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal menambahkan anggota');
    } finally {
      setQuickLoading(false);
    }
  };

  const renderLoanCard = (item: PeminjamanItem) => {
    const titles = (item.peminjaman_detail || [])
      .map((d) => d.salinan?.buku?.judul || 'Buku')
      .join(', ');

    const isOverdue = item.status === 'aktif' && item.jatuh_tempo < today;

    // Calculate days overdue
    let lateDays = 0;
    if (isOverdue) {
      const diffMs = new Date(today).getTime() - new Date(item.jatuh_tempo).getTime();
      lateDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    let badgeVar: 'green' | 'red' | 'gray' = 'gray';
    let badgeText = item.status.toUpperCase();
    if (item.status === 'aktif') {
      badgeVar = isOverdue ? 'red' : 'green';
      badgeText = isOverdue ? 'TERLAMBAT' : 'AKTIF';
    } else if (item.status === 'dikembalikan') {
      badgeVar = 'gray';
      badgeText = 'KEMBALI';
    } else if (item.status === 'hilang') {
      badgeVar = 'red';
      badgeText = 'HILANG';
    }

    return (
      <AzelheimCard key={item.id} style={{ marginBottom: 12 }}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {item.anggota?.nama || 'Anggota'}
            </Text>
            <Text style={[styles.cardSub, { color: colors.muted }]}>
              {titles || 'Detail buku tidak ditemukan'}
            </Text>
          </View>
          <AzelheimBadge label={badgeText} variant={badgeVar} />
        </View>

        <AzelheimMetaBox
          leftText={`PINJAM: ${item.tanggal_pinjam}`}
          rightText={`TEMPO: ${item.jatuh_tempo}`}
          style={{ marginTop: 9 }}
        />

        {isOverdue && (
          <Text style={[styles.lateNotice, { color: colors.danger }]}>
            +{lateDays} HARI · DENDA BERJALAN
          </Text>
        )}

        {item.status === 'aktif' && userRole !== 'staff' && (
          <View style={[styles.buttonRow, { marginTop: 8 }]}>
            <AzelheimButton
              variant="light"
              title="Kembalikan"
              icon={<Check size={16} color={colors.text} />}
              onPress={() => handleKembalikan(item)}
              style={{ flex: 1 }}
            />
            <AzelheimButton
              variant="red"
              title="Hilang"
              icon={<AlertTriangle size={16} color={colors.danger} />}
              onPress={() => {
                setHilangId(item.id);
                setShowHilang(true);
              }}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </AzelheimCard>
    );
  };

  const filteredList = getFilteredData();

  if (loading && data.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <AzelheimScreen scrollable={false} extraBottomPadding={80}>
      <AzelheimSectionHeader title="Peminjaman" code="LOAN // 03" />

      {/* Tabs */}
      <AzelheimTabs<'aktif' | 'terlambat' | 'riwayat'>
        tabs={[
          { value: 'aktif', label: 'Aktif', count: aktifCount },
          { value: 'terlambat', label: 'Terlambat', count: terlambatCount },
          { value: 'riwayat', label: 'Riwayat' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
      />

      {/* List */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderLoanCard(item)}
        ListEmptyComponent={
          <AzelheimCard style={{ padding: 20 }}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Tidak ada data peminjaman pada tab ini.
            </Text>
          </AzelheimCard>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* FAB */}
      {userRole !== 'staff' && (
        <AzelheimFab
          icon={<Plus size={22} color={colors.bg} />}
          onPress={openNewModal}
          accessibilityLabel="Tambah Peminjaman"
        />
      )}

      {/* New Loan Modal Dialog */}
      <AzelheimDialog
        visible={showNew}
        onDismiss={() => setShowNew(false)}
        title="Peminjaman Baru"
        code="LOAN // CREATE"
      >
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          {/* Anggota Selector */}
          <Text style={[styles.fieldLabel, { color: colors.text }]}>ANGGOTA *</Text>
          <View style={styles.selectorRow}>
            <Menu
              visible={anggotaMenuVisible}
              onDismiss={() => setAnggotaMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setAnggotaMenuVisible(true)}
                  style={[
                    styles.selectBox,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                >
                  <Text style={[styles.selectBoxText, { color: selectedAnggota ? colors.text : colors.faint }]}>
                    {selectedAnggota ? `${selectedAnggota.nama} (${selectedAnggota.nomor_anggota})` : 'Pilih Anggota...'}
                  </Text>
                  <ChevronDown size={16} color={colors.text} />
                </TouchableOpacity>
              }
            >
              {anggotaList.map((a) => (
                <Menu.Item
                  key={a.id}
                  onPress={() => {
                    setSelectedAnggota(a);
                    setAnggotaMenuVisible(false);
                  }}
                  title={`${a.nama} (${a.nomor_anggota})`}
                />
              ))}
            </Menu>

            <AzelheimButton
              variant="purple"
              icon={<UserPlus size={18} color={colors.text} />}
              onPress={() => setShowQuickAnggota(true)}
              style={{ width: 44, minHeight: 40 }}
            />
          </View>

          {/* Book Copy Selector */}
          <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 12 }]}>
            PILIH BUKU & SALINAN ({selectedSalinan.length} DIPILIH) *
          </Text>

          {/* Rak filter inside loan dialog */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => setFilterRakLoan(null)}
              activeOpacity={0.7}
              style={{ marginRight: 6 }}
            >
              <AzelheimBadge
                label="SEMUA RAK"
                variant={filterRakLoan === null ? 'purple' : 'gray'}
              />
            </TouchableOpacity>
            {rakList.map((r) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => setFilterRakLoan(r.id)}
                activeOpacity={0.7}
                style={{ marginRight: 6 }}
              >
                <AzelheimBadge
                  label={r.nama}
                  variant={filterRakLoan === r.id ? 'purple' : 'gray'}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 2-Tier Book Selection List */}
          {booksWithCopies
            .filter((b) => !filterRakLoan || b.rak_id === filterRakLoan)
            .map((buku) => {
              const availableCopies = (buku.salinan || []).filter(
                (s: any) => s.status === 'tersedia'
              );
              const isExpanded = expandedBookId === buku.id;

              return (
                <View
                  key={buku.id}
                  style={[
                    styles.bookPickerGroup,
                    { borderColor: colors.line, backgroundColor: colors.surface },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setExpandedBookId(isExpanded ? null : buku.id)}
                    style={styles.bookPickerHead}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bookPickerTitle, { color: colors.text }]}>
                        {buku.judul}
                      </Text>
                      <Text style={[styles.bookPickerSub, { color: colors.muted }]}>
                        {availableCopies.length} salinan tersedia
                      </Text>
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={16} color={colors.text} />
                    ) : (
                      <ChevronDown size={16} color={colors.text} />
                    )}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.copyListWrap}>
                      {availableCopies.length === 0 ? (
                        <Text style={[styles.emptyCopyText, { color: colors.faint }]}>
                          Semua salinan sedang dipinjam
                        </Text>
                      ) : (
                        availableCopies.map((copy: any) => {
                          const isSelected = selectedSalinan.includes(copy.id);
                          return (
                            <TouchableOpacity
                              key={copy.id}
                              onPress={() => handleToggleSalinan(copy.id)}
                              style={[
                                styles.copyChip,
                                {
                                  borderColor: isSelected ? colors.border : colors.line,
                                  backgroundColor: isSelected ? colors.purple : colors.card,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.copyChipText,
                                  { color: colors.text, fontWeight: isSelected ? '800' : '600' },
                                ]}
                              >
                                {copy.kode_eksemplar} ({formatKodeSalinan(copy.nomor_urut)})
                              </Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })}

          {/* Due Date Input */}
          <AzelheimInput
            label="Jatuh Tempo *"
            placeholder="YYYY-MM-DD"
            value={jatuhTempo}
            onChangeText={setJatuhTempo}
            mono
            containerStyle={{ marginTop: 12 }}
          />

          <AzelheimMetaBox
            leftText="BATAS MAKSIMAL"
            rightText="3 BUKU / ANGGOTA"
            style={{ marginBottom: 12 }}
          />

          <View style={styles.buttonRow}>
            <AzelheimButton
              variant="light"
              title="Batal"
              onPress={() => setShowNew(false)}
              style={{ flex: 1 }}
            />
            <AzelheimButton
              variant="dark"
              title="Simpan Peminjaman"
              onPress={handleSimpanPeminjaman}
              loading={creating}
              disabled={creating}
              style={{ flex: 1.5 }}
            />
          </View>
        </ScrollView>
      </AzelheimDialog>

      {/* Quick Add Anggota Dialog */}
      <AzelheimDialog
        visible={showQuickAnggota}
        onDismiss={() => setShowQuickAnggota(false)}
        title="Tambah Anggota Cepat"
        code="MEMBER // QUICK"
      >
        <AzelheimInput
          label="Nama Lengkap *"
          placeholder="Nama peminjam..."
          value={quickNama}
          onChangeText={setQuickNama}
        />
        <AzelheimInput
          label="Nomor Kontak / WA *"
          placeholder="08123456789..."
          value={quickKontak}
          onChangeText={setQuickKontak}
          keyboardType="phone-pad"
          mono
        />
        <View style={styles.buttonRow}>
          <AzelheimButton
            variant="light"
            title="Batal"
            onPress={() => setShowQuickAnggota(false)}
            style={{ flex: 1 }}
          />
          <AzelheimButton
            variant="dark"
            title="Simpan Anggota"
            onPress={handleQuickAddAnggota}
            loading={quickLoading}
            style={{ flex: 1.5 }}
          />
        </View>
      </AzelheimDialog>

      {/* Tandai Hilang Dialog */}
      <AzelheimDialog
        visible={showHilang}
        onDismiss={() => setShowHilang(false)}
        title="Tandai Buku Hilang"
        code="LOAN // LOST"
        subtitle="Masukkan nominal biaya penggantian buku (Rp):"
      >
        <AzelheimInput
          label="Biaya Penggantian (Rp)"
          placeholder="50000"
          value={biayaPenggantian}
          onChangeText={setBiayaPenggantian}
          keyboardType="number-pad"
          mono
        />
        <View style={styles.buttonRow}>
          <AzelheimButton
            variant="light"
            title="Batal"
            onPress={() => setShowHilang(false)}
            style={{ flex: 1 }}
          />
          <AzelheimButton
            variant="red"
            title="Tandai Hilang"
            onPress={handleTandaiHilangSubmit}
            style={{ flex: 1.5 }}
          />
        </View>
      </AzelheimDialog>

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
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  lateNotice: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 12,
  },
  fieldLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  selectBox: {
    flex: 1,
    height: 42,
    borderWidth: 1.2,
    borderRadius: 4,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectBoxText: {
    fontSize: 12,
  },
  bookPickerGroup: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  bookPickerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookPickerTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  bookPickerSub: {
    fontSize: 10,
    marginTop: 1,
  },
  copyListWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  copyChip: {
    borderWidth: 1,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  copyChipText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyCopyText: {
    fontSize: 10.5,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
});
