import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Button, TextInput, Card, ActivityIndicator, Snackbar, Chip, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { apiClient } from '../lib/api/apiClient';
import { supabase } from '../lib/supabase';
import { useTenant } from '../lib/context/TenantContext';
import { Building2, Plus, Mail, ArrowRight } from 'lucide-react-native';

interface LibraryItem {
  tenant_id: string;
  nama: string;
  role: string;
}

export default function TenantSetup() {
  const router = useRouter();
  const { setActiveTenant } = useTenant();
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
      const result = await apiClient.tenant.create(nama, alamat);
      setActiveTenant(result.tenant_id, nama, 'owner');
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

  const handleSelectLibrary = (tenantId: string, namaTenant: string, role: string) => {
    setActiveTenant(tenantId, namaTenant, role);
    router.replace('/(admin)/dashboard');
  };

  const handleJoin = async (tenantId: string, namaTenant: string, role: string) => {
    setLoading(true);
    try {
      setActiveTenant(tenantId, namaTenant, role);
      router.replace('/(admin)/dashboard');
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal bergabung');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === 'owner') return '#1565C0';
    if (role === 'admin') return '#E65100';
    return '#2E7D32';
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 1. Select Mode: User has 1 or more libraries
  const renderSelect = () => (
    <View style={styles.formContainer}>
      <Text variant="headlineSmall" style={styles.title}>Pilih Perpustakaan</Text>
      <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 20, color: '#666' }}>
        Pilih perpustakaan yang ingin Anda kelola atau masuki:
      </Text>

      <FlatList
        data={userLibraries}
        keyExtractor={(item) => item.tenant_id}
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            mode="outlined"
            onPress={() => handleSelectLibrary(item.tenant_id, item.nama, item.role)}
          >
            <Card.Title
              title={item.nama}
              titleStyle={{ fontWeight: 'bold' }}
              left={() => <Building2 size={24} color="#000" />}
              right={() => (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                  <Chip style={{ backgroundColor: getRoleBadgeColor(item.role) + '1A', marginRight: 8 }}>
                    {item.role.toUpperCase()}
                  </Chip>
                  <ArrowRight size={20} color="#666" />
                </View>
              )}
            />
          </Card>
        )}
      />

      <Divider style={{ marginVertical: 16 }} />

      <View style={{ flexDirection: 'column', gap: 10 }}>
        <Button
          mode="contained"
          icon={() => <Plus size={18} color="#FFF" />}
          onPress={() => setViewMode('create')}
          style={styles.button}
        >
          Buat Perpustakaan Baru
        </Button>
        <Button
          mode="outlined"
          icon={() => <Mail size={18} color="#000" />}
          onPress={() => { setViewMode('join'); loadInvitations(); }}
          style={styles.button}
        >
          Cek Undangan Lain
        </Button>
      </View>
    </View>
  );

  // 2. Options Mode: 0 libraries
  const renderOptions = () => (
    <View style={styles.optionsContainer}>
      <Text variant="headlineSmall" style={styles.title}>Mulai Mengelola Perpustakaan</Text>
      <Button mode="contained" onPress={() => setViewMode('create')} style={styles.button}>
        Buat Baru
      </Button>
      <Button mode="outlined" onPress={() => { setViewMode('join'); loadInvitations(); }} style={styles.button}>
        Gabung Undangan
      </Button>
    </View>
  );

  // 3. Create Mode
  const renderCreate = () => (
    <View style={styles.formContainer}>
      <Text variant="titleLarge" style={styles.subtitle}>Buat Perpustakaan Baru</Text>
      <TextInput
        label="Nama Perpustakaan"
        value={nama}
        onChangeText={setNama}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Alamat"
        value={alamat}
        onChangeText={setAlamat}
        mode="outlined"
        style={styles.input}
        multiline
        numberOfLines={3}
      />
      <View style={styles.actionRow}>
        <Button
          mode="text"
          onPress={() => setViewMode(userLibraries.length > 0 ? 'select' : 'options')}
          style={{ flex: 1 }}
        >
          Batal
        </Button>
        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={{ flex: 1 }}
        >
          Buat
        </Button>
      </View>
    </View>
  );

  // 4. Join Mode
  const renderJoin = () => (
    <View style={styles.formContainer}>
      <Text variant="titleLarge" style={styles.subtitle}>Undangan Bergabung</Text>
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 32 }} />
      ) : invitations.length === 0 ? (
        <Text style={styles.emptyText}>Tidak ada undangan masuk saat ini.</Text>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.tenant_id}
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              mode="outlined"
              onPress={() => handleJoin(item.tenant_id, item.nama_tenant, item.role_ditawarkan)}
            >
              <Card.Title
                title={item.nama_tenant}
                subtitle={`Peran yang ditawarkan: ${item.role_ditawarkan}`}
                right={() => <Button mode="contained-tonal">Gabung</Button>}
              />
            </Card>
          )}
        />
      )}
      <Button
        mode="text"
        onPress={() => setViewMode(userLibraries.length > 0 ? 'select' : 'options')}
        style={{ marginTop: 16 }}
      >
        Kembali
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      {viewMode === 'select' && renderSelect()}
      {viewMode === 'options' && renderOptions()}
      {viewMode === 'create' && renderCreate()}
      {viewMode === 'join' && renderJoin()}
      <Snackbar
        visible={!!snackMsg}
        onDismiss={() => setSnackMsg('')}
        duration={3000}
      >
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    justifyContent: 'center',
  },
  optionsContainer: {
    alignItems: 'center',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    marginBottom: 24,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    paddingVertical: 4,
    borderRadius: 8,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666',
  }
});

