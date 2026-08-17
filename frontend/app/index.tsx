import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Portal, Modal, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Key, QrCode } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';

export default function Gerbang() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [errorVisible, setErrorVisible] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleScanPress = async () => {
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') {
        Alert.alert("Izin Kamera", "Akses kamera dibutuhkan untuk scan QR");
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanning) return; // prevent double scan
    setScanning(true);
    setShowScanner(false);
    
    try {
      // Validate QR against tenant table
      const { data: tenant, error } = await supabase
        .from('tenant')
        .select('id, nama')
        .eq('qr_code_value', data)
        .single();

      if (error || !tenant) {
        setErrorVisible(true);
      } else {
        router.push(`/pengunjung?tenant_id=${tenant.id}&nama=${encodeURIComponent(tenant.nama)}`);
      }
    } catch {
      setErrorVisible(true);
    } finally {
      setScanning(false);
    }
  };

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
          {showScanner && (
            <CameraView 
              style={styles.camera} 
              facing="back"
              onBarcodeScanned={handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            />
          )}
          <Button style={{marginTop: 16}} mode="text" onPress={() => setShowScanner(false)}>Batal</Button>
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
