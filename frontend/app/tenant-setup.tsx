import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Button, TextInput, Card, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { apiClient } from '../lib/api/apiClient';
import { supabase } from '../lib/supabase';
import { useTenant } from '../lib/context/TenantContext';

export default function TenantSetup() {
  const router = useRouter();
  const { setActiveTenant } = useTenant();
  const [viewMode, setViewMode] = useState<'options' | 'create' | 'join'>('options');
  const [loading, setLoading] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  
  // Create state
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');

  // Join state
  const [invitations, setInvitations] = useState<any[]>([]);

  const handleCreate = async () => {
    if (nama.trim().length < 3) {
      setSnackMsg('Nama Perpustakaan minimal 3 karakter');
      return;
    }
    setLoading(true);
    try {
      const result = await apiClient.tenant.create(nama, alamat);
      // Result: { tenant_id, qr_code_value }
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

  const handleJoin = async (tenantId: string, namaTenant: string, role: string) => {
    setLoading(true);
    try {
      // Accept invitation — the backend should handle this via the invitation flow
      // For now, we set the active tenant and navigate
      setActiveTenant(tenantId, namaTenant, role);
      router.replace('/(admin)/dashboard');
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal bergabung');
    } finally {
      setLoading(false);
    }
  };

  const renderOptions = () => (
    <View style={styles.optionsContainer}>
      <Text variant="headlineSmall" style={styles.title}>Mulai Mengelola Perpustakaan</Text>
      <Button mode="contained" onPress={() => setViewMode('create')} style={styles.button}>
        Buat Baru
      </Button>
      <Button mode="outlined" onPress={() => { setViewMode('join'); loadInvitations(); }} style={styles.button}>
        Gabung
      </Button>
    </View>
  );

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
        <Button mode="text" onPress={() => setViewMode('options')} style={{flex: 1}}>Batal</Button>
        <Button mode="contained" onPress={handleCreate} loading={loading} disabled={loading} style={{flex: 1}}>Buat</Button>
      </View>
    </View>
  );

  const renderJoin = () => (
    <View style={styles.formContainer}>
      <Text variant="titleLarge" style={styles.subtitle}>Undangan Bergabung</Text>
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 32 }} />
      ) : invitations.length === 0 ? (
        <Text style={styles.emptyText}>Tidak ada undangan saat ini.</Text>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.tenant_id}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => handleJoin(item.tenant_id, item.nama_tenant, item.role_ditawarkan)}>
              <Card.Title title={item.nama_tenant} subtitle={`Peran: ${item.role_ditawarkan}`} />
            </Card>
          )}
        />
      )}
      <Button mode="text" onPress={() => setViewMode('options')} style={{ marginTop: 16 }}>Kembali</Button>
    </View>
  );

  return (
    <View style={styles.container}>
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
    marginBottom: 48,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    marginBottom: 24,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    marginBottom: 16,
    paddingVertical: 6,
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
