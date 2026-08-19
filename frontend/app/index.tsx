import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Text, Button, Portal, Modal, Snackbar, TextInput, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Key, QrCode } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/api/apiClient';
import { useTenant } from '../lib/context/TenantContext';
import { getLastActiveTenant } from '../lib/session';

export default function Gerbang() {
  const router = useRouter();
  const { setActiveTenant } = useTenant();
  const [checkingSession, setCheckingSession] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [errorVisible, setErrorVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');

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

  const handleScanPress = async () => {
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') {
        // Fallback directly to manual entry modal if camera permission is denied
        setShowScanner(true);
        return;
      }
    }
    setShowScanner(true);
  };

  const processQrData = async (rawCode: string) => {
    const trimmed = (rawCode || '').trim();
    if (!trimmed) return;
    if (scanning) return;
    setScanning(true);
    setShowScanner(false);
    
    try {
      const tenant = await apiClient.tenant.getByQr(trimmed);
      if (!tenant || !tenant.id) {
        setErrorVisible(true);
      } else {
        router.push(`/pengunjung?tenant_id=${tenant.id}&nama=${encodeURIComponent(tenant.nama || 'Perpustakaan')}`);
      }
    } catch (e) {
      console.error('Error validating QR code:', e);
      setErrorVisible(true);
    } finally {
      setScanning(false);
      setManualCode('');
    }
  };

  const handleBarCodeScanned = async (result: any) => {
    const data = typeof result === 'string' ? result : (result?.data || result?.raw || '');
    if (data) {
      await processQrData(data);
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
            icon={() => <QrCode size={20} color="#000" />} 
            onPress={handleScanPress}
            style={styles.button}
          >
            Scan Perpustakaan
          </Button>
        </View>
      </View>

      <Portal>
        <Modal visible={showScanner} onDismiss={() => setShowScanner(false)} contentContainerStyle={styles.modalContent}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
            Scan QR Code Perpustakaan
          </Text>
          
          {permission?.granted && (
            <CameraView 
              style={styles.camera} 
              facing="back"
              onBarcodeScanned={handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            />
          )}

          <Divider style={{ marginVertical: 12 }} />

          <Text variant="labelMedium" style={{ color: '#666', marginBottom: 6 }}>
            Atau masukkan kode QR:
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              placeholder="Contoh: QR-PERPUS-01"
              value={manualCode}
              onChangeText={setManualCode}
              mode="outlined"
              style={{ flex: 1, backgroundColor: '#FFF' }}
              dense
            />
            <Button
              mode="contained"
              onPress={() => processQrData(manualCode)}
              loading={scanning}
              disabled={!manualCode.trim() || scanning}
              style={{ alignSelf: 'center', borderRadius: 8 }}
            >
              Buka
            </Button>
          </View>

          <Button style={{ marginTop: 16 }} mode="text" onPress={() => setShowScanner(false)}>
            Batal
          </Button>
        </Modal>
      </Portal>

      <Snackbar
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        duration={3000}
      >
        QR tidak dikenali, coba lagi
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
    borderRadius: 8,
    height: 400,
  },
  camera: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  }
});
