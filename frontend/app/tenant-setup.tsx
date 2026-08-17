import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Button, TextInput, Card, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { mockClient } from '../lib/api/mockClient';

export default function TenantSetup() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'options' | 'create' | 'join'>('options');
  const [loading, setLoading] = useState(false);
  
  // Create state
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');

  // Join state
  const [invitations, setInvitations] = useState<any[]>([]);

  const handleCreate = async () => {
    if (nama.length < 3) return; // Simple validation
    setLoading(true);
    try {
      await mockClient.tenant.create(nama, alamat);
      router.push('/(admin)/dashboard'); // Proceed to admin shell
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const data = await mockClient.tenant.invitations();
      setInvitations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (tenantId: string) => {
    // In actual logic, we'd accept the invite
    // For now, proceed to dashboard
    router.push('/(admin)/dashboard');
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
        <Button mode="contained" onPress={handleCreate} loading={loading} style={{flex: 1}}>Buat</Button>
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
            <Card style={styles.card} mode="outlined" onPress={() => handleJoin(item.tenant_id)}>
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
