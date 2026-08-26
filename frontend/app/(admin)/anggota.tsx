import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Menu } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { useAzelheimTheme } from '../../lib/theme';
import {
  AzelheimScreen,
  AzelheimSectionHeader,
  AzelheimCard,
  AzelheimSearchField,
  AzelheimBadge,
  AzelheimFab,
  AzelheimToast,
} from '../../lib/components/azelheim';

interface AnggotaItem {
  id: string;
  nomor_anggota: string;
  nama: string;
  kategori_anggota: string | null;
  kontak: string | null;
  peminjaman?: { id: string; status: string }[];
}

export default function AnggotaList() {
  const router = useRouter();
  const { colors } = useAzelheimTheme();
  const { tenantId, userRole } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<AnggotaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackMsg, setSnackMsg] = useState('');

  // Filters
  const [filterKategori, setFilterKategori] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'semua' | 'meminjam' | 'bebas'>('semua');
  const [kategoriMenuVisible, setKategoriMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (tenantId) {
        fetchMembers();
      } else {
        setLoading(false);
      }
    }, [tenantId])
  );

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('anggota')
        .select(`
          id, nomor_anggota, nama, kategori_anggota, kontak,
          peminjaman(id, status)
        `)
        .eq('tenant_id', tenantId)
        .eq('dihapus', false)
        .order('nama', { ascending: true });

      if (error) throw error;
      setMembers((data as any[]) || []);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal memuat daftar anggota');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch =
        m.nama.toLowerCase().includes(q) ||
        m.nomor_anggota.toLowerCase().includes(q) ||
        (m.kontak && m.kontak.toLowerCase().includes(q));
      if (!matchSearch) return false;

      // Filter Kategori
      if (filterKategori && m.kategori_anggota !== filterKategori) return false;

      // Filter Status Pinjam
      const hasActiveLoan = (m.peminjaman || []).some((p) => p.status === 'aktif');
      if (filterStatus === 'meminjam' && !hasActiveLoan) return false;
      if (filterStatus === 'bebas' && hasActiveLoan) return false;

      return true;
    });
  }, [members, searchQuery, filterKategori, filterStatus]);

  const renderMemberRow = (item: AnggotaItem, isLast: boolean) => {
    const hasActiveLoan = (item.peminjaman || []).some((p) => p.status === 'aktif');

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: '/(admin)/anggota-detail',
            params: { id: item.id },
          })
        }
        style={[
          styles.listItem,
          { borderBottomColor: colors.line, borderBottomWidth: isLast ? 0 : 1 },
        ]}
      >
        <View style={styles.itemMain}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.nama}
          </Text>
          <Text style={[styles.itemSub, { color: colors.muted }]} numberOfLines={1}>
            {item.nomor_anggota} · {item.kategori_anggota || 'Umum'} · {item.kontak || '-'}
          </Text>
        </View>

        <AzelheimBadge
          label={hasActiveLoan ? 'MEMINJAM' : 'BEBAS'}
          variant={hasActiveLoan ? 'purple' : 'gray'}
        />
      </TouchableOpacity>
    );
  };

  if (loading && members.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <AzelheimScreen scrollable={false} extraBottomPadding={80}>
      <AzelheimSectionHeader title="Anggota" code="MEMB // 04" />

      {/* Search Bar */}
      <AzelheimSearchField
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Cari nama, nomor, atau kontak..."
      />

      {/* Filter Pill Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillScrollContent}
        style={styles.pillScrollView}
      >
        <TouchableOpacity
          onPress={() => {
            setFilterKategori(null);
            setFilterStatus('semua');
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <AzelheimBadge
            label="SEMUA"
            variant={!filterKategori && filterStatus === 'semua' ? 'purple' : 'gray'}
          />
        </TouchableOpacity>

        {/* Kategori Menu */}
        <Menu
          visible={kategoriMenuVisible}
          onDismiss={() => setKategoriMenuVisible(false)}
          anchor={
            <TouchableOpacity
              onPress={() => setKategoriMenuVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <AzelheimBadge
                label={
                  filterKategori
                    ? `KAT: ${filterKategori.toUpperCase()}`
                    : 'KATEGORI ▾'
                }
                variant={filterKategori ? 'purple' : 'gray'}
              />
            </TouchableOpacity>
          }
        >
          <Menu.Item
            onPress={() => {
              setFilterKategori(null);
              setKategoriMenuVisible(false);
            }}
            title="Semua Kategori"
          />
          <Menu.Item
            onPress={() => {
              setFilterKategori('Siswa');
              setKategoriMenuVisible(false);
            }}
            title="Siswa"
          />
          <Menu.Item
            onPress={() => {
              setFilterKategori('Guru');
              setKategoriMenuVisible(false);
            }}
            title="Guru"
          />
          <Menu.Item
            onPress={() => {
              setFilterKategori('Staff');
              setKategoriMenuVisible(false);
            }}
            title="Staff"
          />
          <Menu.Item
            onPress={() => {
              setFilterKategori('Umum');
              setKategoriMenuVisible(false);
            }}
            title="Umum"
          />
        </Menu>

        {/* Status Menu */}
        <Menu
          visible={statusMenuVisible}
          onDismiss={() => setStatusMenuVisible(false)}
          anchor={
            <TouchableOpacity
              onPress={() => setStatusMenuVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <AzelheimBadge
                label={
                  filterStatus === 'meminjam'
                    ? 'STATUS: MEMINJAM'
                    : filterStatus === 'bebas'
                    ? 'STATUS: BEBAS'
                    : 'STATUS ▾'
                }
                variant={filterStatus !== 'semua' ? 'purple' : 'gray'}
              />
            </TouchableOpacity>
          }
        >
          <Menu.Item
            onPress={() => {
              setFilterStatus('semua');
              setStatusMenuVisible(false);
            }}
            title="Semua Status"
          />
          <Menu.Item
            onPress={() => {
              setFilterStatus('meminjam');
              setStatusMenuVisible(false);
            }}
            title="Sedang Meminjam"
          />
          <Menu.Item
            onPress={() => {
              setFilterStatus('bebas');
              setStatusMenuVisible(false);
            }}
            title="Bebas Pinjaman"
          />
        </Menu>
      </ScrollView>

      {/* List */}
      <AzelheimCard style={{ flex: 1, padding: 4, marginBottom: 0 }}>
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) =>
            renderMemberRow(item, index === filteredMembers.length - 1)
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Tidak ada anggota yang sesuai.
            </Text>
          }
        />
      </AzelheimCard>

      {/* FAB Add Member */}
      {userRole !== 'staff' && (
        <AzelheimFab
          icon={<Plus size={22} color={colors.bg} />}
          onPress={() =>
            router.push({
              pathname: '/(admin)/anggota-detail',
              params: { id: 'tambah' },
            })
          }
          accessibilityLabel="Tambah Anggota"
        />
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
  pillScrollView: {
    marginBottom: 10,
    maxHeight: 36,
  },
  pillScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 8,
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontWeight: '800',
    fontSize: 12.5,
  },
  itemSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 12,
  },
});
