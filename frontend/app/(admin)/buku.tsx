import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Menu } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, ArrowUpDown } from 'lucide-react-native';
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

interface BukuItem {
  id: string;
  judul: string;
  penulis: string | null;
  kategori: { id: string; nama: string } | null;
  rak: { id: string; nama: string } | null;
  salinan: { status: string }[];
  created_at: string;
}

export default function BukuList() {
  const router = useRouter();
  const { colors } = useAzelheimTheme();
  const { tenantId, userRole } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<BukuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackMsg, setSnackMsg] = useState('');

  // Sort
  const [sortVisible, setSortVisible] = useState(false);
  const [sortBy, setSortBy] = useState('Terbaru');

  // Filters
  const [kategoriList, setKategoriList] = useState<{ id: string; nama: string }[]>([]);
  const [rakList, setRakList] = useState<{ id: string; nama: string }[]>([]);
  const [filterKategori, setFilterKategori] = useState<string | null>(null);
  const [filterRak, setFilterRak] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [kategoriMenuVisible, setKategoriMenuVisible] = useState(false);
  const [rakMenuVisible, setRakMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (tenantId) {
        fetchBooks();
        fetchFilters();
      }
    }, [tenantId])
  );

  const fetchFilters = async () => {
    try {
      const [katRes, rakRes] = await Promise.all([
        supabase.from('kategori').select('id, nama').eq('tenant_id', tenantId),
        supabase.from('rak').select('id, nama').eq('tenant_id', tenantId),
      ]);
      if (katRes.data) setKategoriList(katRes.data);
      if (rakRes.data) setRakList(rakRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('buku')
        .select(`
          id, judul, penulis, created_at,
          kategori:kategori_id(id, nama),
          rak:rak_id(id, nama),
          salinan(status)
        `)
        .eq('tenant_id', tenantId)
        .eq('dihapus', false);

      if (error) throw error;
      setBooks((data as any[]) || []);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal memuat daftar buku');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedBooks = useMemo(() => {
    return books
      .filter((b) => {
        // Search
        const q = searchQuery.toLowerCase();
        const matchSearch =
          b.judul.toLowerCase().includes(q) ||
          (b.penulis && b.penulis.toLowerCase().includes(q));
        if (!matchSearch) return false;

        // Filter Kategori
        if (filterKategori && b.kategori?.id !== filterKategori) return false;

        // Filter Rak
        if (filterRak && b.rak?.id !== filterRak) return false;

        // Filter Status
        if (filterStatus) {
          const totalTersedia = b.salinan.filter((s) => s.status === 'tersedia').length;
          if (filterStatus === 'tersedia' && totalTersedia === 0) return false;
          if (filterStatus === 'habis' && totalTersedia > 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'Judul A-Z') return a.judul.localeCompare(b.judul);
        if (sortBy === 'Penulis')
          return (a.penulis || '').localeCompare(b.penulis || '');
        if (sortBy === 'Terbaru')
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        return 0;
      });
  }, [books, searchQuery, filterKategori, filterRak, filterStatus, sortBy]);

  const renderBookRow = (item: BukuItem, isLast: boolean) => {
    const tersedia = item.salinan.filter((s) => s.status === 'tersedia').length;
    const total = item.salinan.length;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: '/(admin)/buku-detail',
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
            {item.judul}
          </Text>
          <Text style={[styles.itemSub, { color: colors.muted }]} numberOfLines={1}>
            {item.penulis || 'Penulis tidak diketahui'} · {item.kategori?.nama || '-'} · Rak: {item.rak?.nama || '-'}
          </Text>
        </View>

        <View style={styles.itemMeta}>
          <Text style={[styles.stock, { color: colors.text }]}>
            {tersedia}/{total}
          </Text>
          <Text style={[styles.stockLabel, { color: colors.faint }]}>STOK</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && books.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <AzelheimScreen scrollable={false} extraBottomPadding={80}>
      <AzelheimSectionHeader
        title="Buku"
        code="COLL // 02"
        rightContent={
          <Menu
            visible={sortVisible}
            onDismiss={() => setSortVisible(false)}
            anchor={
              <TouchableOpacity
                onPress={() => setSortVisible(true)}
                style={[
                  styles.sortAnchor,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              >
                <ArrowUpDown size={12} color={colors.text} />
                <Text style={[styles.sortAnchorText, { color: colors.text }]}>
                  {sortBy}
                </Text>
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => {
                setSortBy('Judul A-Z');
                setSortVisible(false);
              }}
              title="Judul A-Z"
            />
            <Menu.Item
              onPress={() => {
                setSortBy('Penulis');
                setSortVisible(false);
              }}
              title="Penulis"
            />
            <Menu.Item
              onPress={() => {
                setSortBy('Terbaru');
                setSortVisible(false);
              }}
              title="Terbaru"
            />
          </Menu>
        }
      />

      {/* Search Bar */}
      <AzelheimSearchField
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Cari judul atau penulis..."
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
            setFilterRak(null);
            setFilterStatus(null);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <AzelheimBadge
            label="SEMUA"
            variant={
              !filterKategori && !filterRak && !filterStatus ? 'purple' : 'gray'
            }
          />
        </TouchableOpacity>

        {/* Kategori Filter Menu */}
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
                    ? `KAT: ${
                        kategoriList.find((k) => k.id === filterKategori)?.nama ||
                        'AKTIF'
                      }`
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
          {kategoriList.map((kat) => (
            <Menu.Item
              key={kat.id}
              onPress={() => {
                setFilterKategori(kat.id);
                setKategoriMenuVisible(false);
              }}
              title={kat.nama}
            />
          ))}
        </Menu>

        {/* Rak Filter Menu */}
        <Menu
          visible={rakMenuVisible}
          onDismiss={() => setRakMenuVisible(false)}
          anchor={
            <TouchableOpacity
              onPress={() => setRakMenuVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <AzelheimBadge
                label={
                  filterRak
                    ? `RAK: ${
                        rakList.find((r) => r.id === filterRak)?.nama || 'AKTIF'
                      }`
                    : 'RAK ▾'
                }
                variant={filterRak ? 'purple' : 'gray'}
              />
            </TouchableOpacity>
          }
        >
          <Menu.Item
            onPress={() => {
              setFilterRak(null);
              setRakMenuVisible(false);
            }}
            title="Semua Rak"
          />
          {rakList.map((r) => (
            <Menu.Item
              key={r.id}
              onPress={() => {
                setFilterRak(r.id);
                setRakMenuVisible(false);
              }}
              title={r.nama}
            />
          ))}
        </Menu>

        {/* Status Filter Menu */}
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
                  filterStatus
                    ? filterStatus.toUpperCase()
                    : 'STATUS ▾'
                }
                variant={filterStatus ? 'purple' : 'gray'}
              />
            </TouchableOpacity>
          }
        >
          <Menu.Item
            onPress={() => {
              setFilterStatus(null);
              setStatusMenuVisible(false);
            }}
            title="Semua Status"
          />
          <Menu.Item
            onPress={() => {
              setFilterStatus('tersedia');
              setStatusMenuVisible(false);
            }}
            title="Tersedia"
          />
          <Menu.Item
            onPress={() => {
              setFilterStatus('habis');
              setStatusMenuVisible(false);
            }}
            title="Habis"
          />
        </Menu>
      </ScrollView>

      {/* Book Items List inside AzelheimCard */}
      <AzelheimCard style={{ flex: 1, padding: 4, marginBottom: 0 }}>
        <FlatList
          data={filteredAndSortedBooks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) =>
            renderBookRow(item, index === filteredAndSortedBooks.length - 1)
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Tidak ada buku yang sesuai.
            </Text>
          }
        />
      </AzelheimCard>

      {/* FAB Add Book */}
      {userRole !== 'staff' && (
        <AzelheimFab
          icon={<Plus size={20} color={colors.bg} />}
          onPress={() =>
            router.push({
              pathname: '/(admin)/buku-detail',
              params: { id: 'tambah' },
            })
          }
          accessibilityLabel="Tambah Buku"
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
  sortAnchor: {
    borderWidth: 1.2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortAnchorText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    fontWeight: '700',
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
  itemMeta: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  stock: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 15,
    fontWeight: '800',
  },
  stockLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 8.5,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 12,
  },
});
