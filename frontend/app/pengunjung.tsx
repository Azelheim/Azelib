import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  BackHandler,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LogOut, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/api/apiClient';
import { useAzelheimTheme } from '../lib/theme';
import {
  AzelheimScreen,
  AzelheimCard,
  AzelheimButton,
  AzelheimBadge,
  AzelheimSearchField,
  AzelheimTabs,
  AzelheimIconButton,
  AzelheimDialog,
} from '../lib/components/azelheim';

interface BukuPublik {
  id: string;
  judul: string;
  penulis: string | null;
  sinopsis: string | null;
  kategori: { nama: string } | null;
  rak: { nama: string } | null;
  salinan: { status: string }[];
}

export default function Pengunjung() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useAzelheimTheme();
  const tenantId = params.tenant_id as string;
  const namaTenant = params.nama
    ? decodeURIComponent(params.nama as string)
    : 'Perpustakaan';

  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'semua' | 'rak' | 'kategori'>('semua');
  const [selectedBuku, setSelectedBuku] = useState<BukuPublik | null>(null);
  const [books, setBooks] = useState<BukuPublik[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onBackPress = () => {
      handleKeluar();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [tenantId]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      let data: any = null;
      try {
        data = await apiClient.katalog.getBooks(tenantId);
      } catch {
        let query = supabase
          .from('buku')
          .select(
            'id, judul, penulis, sinopsis, kategori:kategori_id(nama), rak:rak_id(nama), salinan(status)'
          )
          .eq('dihapus', false);

        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }

        const res = await query;
        data = res.data;
      }

      if (data) {
        setBooks(data as any[]);
      }
    } catch (e) {
      console.error('Error fetching books:', e);
    } finally {
      setLoading(false);
    }
  };

  const getKetersediaan = (salinan: { status: string }[]) => {
    if (!salinan || salinan.length === 0) return '0/0';
    const tersedia = salinan.filter((s) => s.status === 'tersedia').length;
    return `${tersedia}/${salinan.length}`;
  };

  const isTersedia = (salinan: { status: string }[]) => {
    if (!salinan || salinan.length === 0) return false;
    return salinan.some((s) => s.status === 'tersedia');
  };

  const filtered = useMemo(() => {
    let result = books;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.judul.toLowerCase().includes(q) ||
          (b.penulis && b.penulis.toLowerCase().includes(q))
      );
    }
    return result;
  }, [books, searchQuery]);

  const groupedByKategori = useMemo(() => {
    const groups: Record<string, BukuPublik[]> = {};
    filtered.forEach((b) => {
      const key = b.kategori?.nama || 'Tanpa Kategori';
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const groupedByRak = useMemo(() => {
    const groups: Record<string, BukuPublik[]> = {};
    filtered.forEach((b) => {
      const key = b.rak?.nama || 'Tanpa Rak';
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const handleKeluar = () => {
    router.replace('/');
  };

  const renderBookItem = (item: BukuPublik, isLast: boolean = false) => {
    const stockStr = getKetersediaan(item.salinan);
    const tersedia = isTersedia(item.salinan);

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.7}
        onPress={() => setSelectedBuku(item)}
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
        <AzelheimBadge
          label={stockStr}
          variant={tersedia ? 'green' : 'gray'}
        />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Memuat katalog...
        </Text>
      </View>
    );
  }

  return (
    <AzelheimScreen scrollable={false} extraBottomPadding={20}>
      {/* Header */}
      <View style={[styles.sectionHead, { borderBottomColor: colors.line }]}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Katalog</Text>
          <Text style={[styles.tiny, { color: colors.faint }]}>
            {namaTenant.toUpperCase()}
          </Text>
        </View>
        <AzelheimIconButton
          icon={<LogOut size={18} color={colors.danger} />}
          onPress={handleKeluar}
          accessibilityLabel="Keluar ke Gerbang"
        />
      </View>

      {/* Search Bar */}
      <AzelheimSearchField
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Cari buku atau penulis..."
      />

      {/* Tabs */}
      <AzelheimTabs<'semua' | 'rak' | 'kategori'>
        tabs={[
          { value: 'semua', label: 'Semua Buku' },
          { value: 'rak', label: 'Rak' },
          { value: 'kategori', label: 'Kategori' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
      />

      {/* Content */}
      {tab === 'semua' && (
        <AzelheimCard style={{ flex: 1, padding: 4 }}>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) =>
              renderBookItem(item, index === filtered.length - 1)
            }
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Tidak ada buku ditemukan.
              </Text>
            }
          />
        </AzelheimCard>
      )}

      {tab === 'kategori' && (
        <AzelheimCard style={{ flex: 1, padding: 8 }}>
          <SectionList
            sections={groupedByKategori}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderBookItem(item)}
            renderSectionHeader={({ section: { title } }) => (
              <View style={[styles.groupHeader, { backgroundColor: colors.surface }]}>
                <Text style={[styles.groupHeaderText, { color: colors.text }]}>
                  {title.toUpperCase()}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Tidak ada buku ditemukan.
              </Text>
            }
          />
        </AzelheimCard>
      )}

      {tab === 'rak' && (
        <AzelheimCard style={{ flex: 1, padding: 8 }}>
          <SectionList
            sections={groupedByRak}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderBookItem(item)}
            renderSectionHeader={({ section: { title } }) => (
              <View style={[styles.groupHeader, { backgroundColor: colors.surface }]}>
                <Text style={[styles.groupHeaderText, { color: colors.text }]}>
                  {title.toUpperCase()}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Tidak ada buku ditemukan.
              </Text>
            }
          />
        </AzelheimCard>
      )}

      {/* Guest Book Detail Modal */}
      <AzelheimDialog
        visible={!!selectedBuku}
        onDismiss={() => setSelectedBuku(null)}
        title="Detail Buku"
        code="GUEST // READ ONLY"
      >
        {selectedBuku && (
          <View>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {selectedBuku.judul}
            </Text>
            <Text style={[styles.dialogAuthor, { color: colors.muted }]}>
              {selectedBuku.penulis || 'Penulis tidak diketahui'}
            </Text>

            <View style={styles.badgeRow}>
              {selectedBuku.kategori?.nama ? (
                <AzelheimBadge
                  label={selectedBuku.kategori.nama}
                  variant="gray"
                />
              ) : null}
              {selectedBuku.rak?.nama ? (
                <AzelheimBadge
                  label={`RAK: ${selectedBuku.rak.nama}`}
                  variant="blue"
                />
              ) : null}
              <AzelheimBadge
                label={
                  isTersedia(selectedBuku.salinan) ? 'TERSEDIA' : 'HABIS'
                }
                variant={
                  isTersedia(selectedBuku.salinan) ? 'green' : 'red'
                }
              />
            </View>

            <View style={[styles.rule, { borderTopColor: colors.line }]} />

            <Text style={[styles.sinopsisLabel, { color: colors.text }]}>
              SINOPSIS
            </Text>
            <Text style={[styles.sinopsisText, { color: colors.muted }]}>
              {selectedBuku.sinopsis || 'Belum ada sinopsis untuk buku ini.'}
            </Text>

            <AzelheimButton
              variant="light"
              title="Kembali ke Katalog"
              icon={<ArrowLeft size={14} color={colors.text} />}
              onPress={() => setSelectedBuku(null)}
              fullWidth
              style={{ marginTop: 16 }}
            />

            <Text style={[styles.publicNote, { color: colors.faint }]}>
              PUBLIC CATALOG · NO LOGIN REQUIRED
            </Text>
          </View>
        )}
      </AzelheimDialog>
    </AzelheimScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tiny: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
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
  groupHeader: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginTop: 8,
    marginBottom: 4,
  },
  groupHeaderText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9.5,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 12,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  dialogAuthor: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  rule: {
    borderTopWidth: 1,
    marginVertical: 10,
  },
  sinopsisLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sinopsisText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  publicNote: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 8.5,
    textAlign: 'center',
    marginTop: 12,
  },
});
