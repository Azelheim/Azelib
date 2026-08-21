import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Text, Button, Portal, Modal, Snackbar, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Key, BookOpen } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/api/apiClient';
import { useTenant } from '../lib/context/TenantContext';
import { getLastActiveTenant } from '../lib/session';

export default function Gerbang() {
  const router = useRouter();
  const { setActiveTenant } = useTenant();
  const [checkingSession, setCheckingSession] = useState(true);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Kondisi B: Sesi akun MASIH valid (belum Keluar Akun)
        const lastTenant = await getLastActiveTenant();
        if (lastTenant?.id) {
          // Buka app -> skip login form -> skip halaman pemilihan -> langsung ke perpustakaan terakhir
          setActiveTenant(lastTenant.id, lastTenant.nama, lastTenant.role);
          router.replace('/(admin)/dashboard');
          return;
        } else {
          // Sesi aktif tapi tidak ada perpustakaan terakhir (misal setelah Keluar Perpustakaan)
          router.replace('/tenant-setup');
          return;
        }
      }
    } catch (e) {
      console.error('Error checking active session:', e);
    } finally {
      setCheckingSession(false);
    }
  };

  const handleTokenSubmit = async () => {
    const trimmed = (tokenInput || '').trim();
    console.log('[TOKEN-005][SUBMIT] Submitting token input:', trimmed);
    if (!trimmed) return;
    if (loading) return;

    setLoading(true);
    setErrorVisible(false);

    try {
      const tenant = await apiClient.tenant.getByToken(trimmed);
      console.log('[TOKEN-005][VALIDATE-SUCCESS] Matched tenant:', tenant);
      if (!tenant || !tenant.id) {
        setErrorVisible(true);
      } else {
        setShowTokenModal(false);
        setTokenInput('');
        router.push(`/pengunjung?tenant_id=${tenant.id}&nama=${encodeURIComponent(tenant.nama || 'Perpustakaan')}`);
      }
    } catch (e: any) {
      console.error('[TOKEN-005][VALIDATE-ERROR] Token error:', e?.message || e);
      setErrorVisible(true);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo Placeholder */}
        <View style={styles.logoPlaceholder}>
          <Text variant="displaySmall" style={styles.logoText}>📖</Text>
        </View>

        <Text variant="titleLarge" style={styles.tagline}>
          Satu Aplikasi untuk Semua Perpustakaan Anda
        </Text>

        <View style={styles.buttonContainer}>
          <Button 
            mode="contained" 
            icon={() => <Key size={20} color="#FFF" />} 
            onPress={() => router.push('/login')}
            style={styles.button}
          >
            Login
          </Button>

          <Button 
            mode="outlined" 
            icon={() => <BookOpen size={20} color="#000" />} 
            onPress={() => setShowTokenModal(true)}
            style={styles.button}
          >
            Mode Pengunjung
          </Button>
        </View>
      </View>

      <Portal>
        <Modal 
          visible={showTokenModal} 
          onDismiss={() => { if (!loading) setShowTokenModal(false); }} 
          contentContainerStyle={styles.modalContent}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 8 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 6, textAlign: 'center' }}>
              Mode Pengunjung
            </Text>
            <Text variant="bodySmall" style={{ color: '#666', textAlign: 'center', marginBottom: 20 }}>
              Masukkan 6 karakter token perpustakaan untuk melihat katalog buku:
            </Text>

            <TextInput
              label="Token Perpustakaan"
              placeholder="Contoh: ABC123"
              value={tokenInput}
              onChangeText={setTokenInput}
              mode="outlined"
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.tokenInput}
              dense
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <Button 
                mode="text" 
                onPress={() => setShowTokenModal(false)}
                disabled={loading}
                style={{ flex: 1 }}
              >
                Batal
              </Button>
              <Button
                mode="contained"
                onPress={handleTokenSubmit}
                loading={loading}
                disabled={!tokenInput.trim() || loading}
                style={{ flex: 1, borderRadius: 8 }}
              >
                Buka Katalog
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      <Snackbar
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        duration={3000}
      >
        Token tidak dikenali, coba lagi
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#F0F0F0',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 48,
  },
  tagline: {
    textAlign: 'center',
    marginBottom: 48,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '85%',
  },
  tokenInput: {
    backgroundColor: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
