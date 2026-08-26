import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, RefreshCw, LogOut, ArrowRight } from 'lucide-react-native';
import { apiClient } from '../lib/api/apiClient';
import { supabase } from '../lib/supabase';
import { useTenant } from '../lib/context/TenantContext';
import { saveLastActiveTenant, logoutAccount } from '../lib/session';
import { useAzelheimTheme } from '../lib/theme';
import {
  AzelheimScreen,
  AzelheimSectionHeader,
  AzelheimCard,
  AzelheimButton,
  AzelheimBadge,
  AzelheimMetaBox,
  AzelheimInput,
  AzelheimToast,
} from '../lib/components/azelheim';

interface LibraryItem {
  tenant_id: string;
  nama: string;
  role: string;
  alamat?: string;
}

export default function TenantSetup() {
  const router = useRouter();
  const { colors } = useAzelheimTheme();
  const { setActiveTenant, clearTenant } = useTenant();
  const [viewMode, setViewMode] = useState<'select' | 'options' | 'create' | 'join'>('options');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [snackMsg, setSnackMsg] = useState('');

  // Existing memberships
  const [userLibraries, setUserLibraries] = useState<LibraryItem[]>([]);

  // Create state
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');

  // Join state
  const [invitations, setInvitations] = useState<any[]>([]);

  useEffect(() => {
    checkUserMemberships();
  }, []);

  const checkUserMemberships = async () => {
    setInitialLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('tenant_member')
          .select('tenant_id, role, tenant:tenant_id(id, nama, alamat)')
          .eq('user_id', user.id);

        if (!error && data && data.length > 0) {
          const libs = data.map((m: any) => ({
            tenant_id: m.tenant_id,
            nama: m.tenant?.nama || 'Perpustakaan',
            role: m.role || 'staff',
            alamat: m.tenant?.alamat || '',
          }));
          setUserLibraries(libs);
          setViewMode('select');
        } else {
          setViewMode('options');
        }
      }
    } catch (e) {
      console.error(e);
      setViewMode('options');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleCreate = async () => {
    if (nama.trim().length < 3) {
      setSnackMsg('Nama Perpustakaan minimal 3 karakter');
      return;
    }
    setLoading(true);
    try {
      const result = await apiClient.tenant.create(nama.trim(), alamat.trim());
      await saveLastActiveTenant({ id: result.tenant_id, nama: nama.trim(), role: 'owner' });
      setActiveTenant(result.tenant_id, nama.trim(), 'owner');
      router.replace('/(admin)/dashboard');
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Terjadi kesalahan saat membuat perpustakaan');
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const data = await apiClient.tenant.invitations();
      setInvitations(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal memuat undangan');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLibrary = async (tenantId: string, namaTenant: string, role: string) => {
    await saveLastActiveTenant({ id: tenantId, nama: namaTenant, role });
    setActiveTenant(tenantId, namaTenant, role);
    router.replace('/(admin)/dashboard');
  };

  const handleJoin = async (tenantId: string, namaTenant: string, role: string) => {
    setLoading(true);
    try {
      await saveLastActiveTenant({ id: tenantId, nama: namaTenant, role });
      setActiveTenant(tenantId, namaTenant, role);
      router.replace('/(admin)/dashboard');
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal bergabung');
    } finally {
      setLoading(false);
    }
  };

  const handleKeluarAkun = () => {
    Alert.alert('Keluar Akun', 'Apakah Anda yakin ingin keluar dari akun Anda?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await logoutAccount();
          clearTenant();
          router.replace('/login');
        },
      },
    ]);
  };

  const getBadgeVariant = (role: string) => {
    if (role === 'owner') return 'green';
    if (role === 'admin') return 'blue';
    return 'gray';
  };

  if (initialLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  // 1. Select Mode
  const renderSelect = () => (
    <>
      <AzelheimSectionHeader title="Pilih Perpustakaan" code="TENANT // HUB" />

      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: colors.muted }]}>
          SELAMAT DATANG KEMBALI
        </Text>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          Pilih tempat{'\n'}kamu bekerja.
        </Text>
      </View>

      {userLibraries.map((lib) => (
        <AzelheimCard
          key={lib.tenant_id}
          onPress={() => handleSelectLibrary(lib.tenant_id, lib.nama, lib.role)}
          style={{ marginBottom: 12 }}
        >
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {lib.nama}
              </Text>
              <Text style={[styles.cardSub, { color: colors.muted }]}>
                {lib.alamat || 'Perpustakaan Terdaftar'}
              </Text>
            </View>
            <AzelheimBadge
              label={lib.role}
              variant={getBadgeVariant(lib.role)}
            />
          </View>
          <AzelheimMetaBox
            leftText="LAST ACCESS"
            rightText="HARI INI"
            style={{ marginTop: 10 }}
          />
        </AzelheimCard>
      ))}

      <View style={styles.buttonRow}>
        <AzelheimButton
          variant="purple"
          title="Buat Baru"
          icon={<Plus size={18} color={colors.text} />}
          onPress={() => setViewMode('create')}
          style={{ flex: 1 }}
        />
        <AzelheimButton
          variant="light"
          title="Undangan"
          onPress={() => {
            setViewMode('join');
            loadInvitations();
          }}
          style={{ flex: 1 }}
        />
      </View>

      <AzelheimButton
        variant="red"
        title="Keluar Akun"
        icon={<LogOut size={18} color={colors.danger} />}
        onPress={handleKeluarAkun}
        fullWidth
        style={{ marginTop: 16 }}
      />
    </>
  );

  // 2. Options Mode (0 libraries)
  const renderOptions = () => (
    <>
      <AzelheimSectionHeader title="Mulai Perpustakaan" code="TENANT // INIT" />

      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: colors.muted }]}>
          MEMULAI AZELHEIM
        </Text>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          Kelola perpustakaan{'\n'}pertama Anda.
        </Text>
      </View>

      <AzelheimCard style={{ marginBottom: 16 }}>
        <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 4 }]}>
          Buat Perpustakaan Baru
        </Text>
        <Text style={[styles.cardSub, { color: colors.muted, marginBottom: 12 }]}>
          Daftarkan sekolah atau instansi Anda dan mulai kelola buku.
        </Text>
        <AzelheimButton
          variant="dark"
          title="Buat Baru"
          icon={<Plus size={18} color={colors.bg} />}
          onPress={() => setViewMode('create')}
          fullWidth
        />
      </AzelheimCard>

      <AzelheimCard style={{ marginBottom: 16 }}>
        <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 4 }]}>
          Gabung Lewat Undangan
        </Text>
        <Text style={[styles.cardSub, { color: colors.muted, marginBottom: 12 }]}>
          Periksa apakah ada undangan masuk ke email Anda.
        </Text>
        <AzelheimButton
          variant="light"
          title="Cek Undangan"
          onPress={() => {
            setViewMode('join');
            loadInvitations();
          }}
          fullWidth
        />
      </AzelheimCard>

      <AzelheimButton
        variant="red"
        title="Keluar Akun"
        icon={<LogOut size={18} color={colors.danger} />}
        onPress={handleKeluarAkun}
        fullWidth
        style={{ marginTop: 8 }}
      />
    </>
  );

  // 3. Create Mode
  const renderCreate = () => (
    <>
      <AzelheimSectionHeader title="Buat Baru" code="TENANT // CREATE" />

      <AzelheimCard style={{ marginBottom: 16 }}>
        <Text style={[styles.eyebrow, { color: colors.muted, marginBottom: 4 }]}>
          PERPUSTAKAAN BARU
        </Text>
        <Text style={[styles.mainTitle, { color: colors.text, marginBottom: 14 }]}>
          Data Perpustakaan
        </Text>

        <AzelheimInput
          label="Nama Perpustakaan"
          placeholder="Contoh: SMA Negeri 1 Jakarta"
          value={nama}
          onChangeText={setNama}
        />

        <AzelheimInput
          label="Alamat (Opsional)"
          placeholder="Jl. Pendidikan No. 12..."
          value={alamat}
          onChangeText={setAlamat}
          multiline
        />

        <View style={styles.buttonRow}>
          <AzelheimButton
            variant="light"
            title="Batal"
            onPress={() =>
              setViewMode(userLibraries.length > 0 ? 'select' : 'options')
            }
            style={{ flex: 1 }}
          />
          <AzelheimButton
            variant="dark"
            title="Simpan & Masuk"
            onPress={handleCreate}
            loading={loading}
            disabled={loading}
            style={{ flex: 1.5 }}
          />
        </View>
      </AzelheimCard>
    </>
  );

  // 4. Join Mode
  const renderJoin = () => (
    <>
      <AzelheimSectionHeader title="Undangan Masuk" code="TENANT // INVITES" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.text} />
        </View>
      ) : invitations.length === 0 ? (
        <AzelheimCard style={{ marginBottom: 16 }}>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: 'center' }]}>
            Tidak Ada Undangan
          </Text>
          <Text
            style={[
              styles.cardSub,
              { color: colors.muted, textAlign: 'center', marginTop: 4 },
            ]}
          >
            Belum ada undangan bergabung ke perpustakaan lain saat ini.
          </Text>
        </AzelheimCard>
      ) : (
        invitations.map((inv) => (
          <AzelheimCard key={inv.tenant_id} style={{ marginBottom: 12 }}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {inv.nama_tenant}
                </Text>
                <Text style={[styles.cardSub, { color: colors.muted }]}>
                  Peran ditawarkan: {inv.role_ditawarkan}
                </Text>
              </View>
              <AzelheimBadge label="PENDING" variant="amber" />
            </View>
            <View style={[styles.buttonRow, { marginTop: 10 }]}>
              <AzelheimButton
                variant="dark"
                title="Gabung"
                icon={<ArrowRight size={18} color={colors.bg} />}
                onPress={() =>
                  handleJoin(
                    inv.tenant_id,
                    inv.nama_tenant,
                    inv.role_ditawarkan
                  )
                }
                style={{ flex: 1 }}
              />
            </View>
          </AzelheimCard>
        ))
      )}

      <View style={styles.buttonRow}>
        <AzelheimButton
          variant="light"
          title="Kembali"
          onPress={() =>
            setViewMode(userLibraries.length > 0 ? 'select' : 'options')
          }
          style={{ flex: 1 }}
        />
        <AzelheimButton
          variant="purple"
          title="Refresh"
          icon={<RefreshCw size={18} color={colors.text} />}
          onPress={loadInvitations}
          style={{ flex: 1 }}
        />
      </View>
    </>
  );

  return (
    <AzelheimScreen>
      {viewMode === 'select' && renderSelect()}
      {viewMode === 'options' && renderOptions()}
      {viewMode === 'create' && renderCreate()}
      {viewMode === 'join' && renderJoin()}

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
    paddingVertical: 32,
  },
  hero: {
    paddingBottom: 14,
  },
  eyebrow: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 6,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
});
