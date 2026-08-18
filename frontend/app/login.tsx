import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTenant } from '../lib/context/TenantContext';

export default function Login() {
  const router = useRouter();
  const { setActiveTenant } = useTenant();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const validate = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Format email tidak valid');
      valid = false;
    }

    const hasNumber = /\d/;
    const hasLetter = /[a-zA-Z]/;
    if (password.length < 8 || !hasNumber.test(password) || !hasLetter.test(password)) {
      setPasswordError('Password minimal 8 karakter, kombinasi huruf dan angka');
      valid = false;
    }

    return valid;
  };

  const checkTenantAndNavigate = async (userId: string) => {
    try {
      const { data: memberships, error } = await supabase
        .from('tenant_member')
        .select('tenant_id, role, tenant:tenant_id(id, nama)')
        .eq('user_id', userId);

      if (!error && memberships && memberships.length > 0) {
        if (memberships.length === 1) {
          // Tepat 1 perpustakaan: langsung set dan buka dashboard
          const m = memberships[0];
          const tenantObj = m.tenant as any;
          setActiveTenant(m.tenant_id, tenantObj?.nama || 'Perpustakaan', m.role);
          router.replace('/(admin)/dashboard');
        } else {
          // Memiliki >1 perpustakaan: arahkan ke halaman pilih perpustakaan
          router.replace('/tenant-setup');
        }
      } else {
        // Belum memiliki perpustakaan: arahkan ke halaman buat baru / gabung
        router.replace('/tenant-setup');
      }
    } catch {
      router.replace('/tenant-setup');
    }
  };

  const handleLogin = async () => {
    if (!validate()) return;
    
    setLoading(true);
    setGeneralError('');
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setGeneralError('Pendaftaran berhasil. Silakan cek email/login.');
        setIsRegistering(false);
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
           if (error.message.includes('Invalid login credentials')) {
               throw new Error('Email atau password salah');
           }
           throw error;
        }
        if (authData.user) {
          await checkTenantAndNavigate(authData.user.id);
        }
      }
    } catch (e: any) {
      setGeneralError(e.message || 'Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setGeneralError('Isi email Anda di field di atas terlebih dahulu');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setGeneralError('Link reset password telah dikirim ke email Anda');
    } catch (e: any) {
      setGeneralError(e.message || 'Gagal mengirim reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>{isRegistering ? 'Buat Akun' : 'Masuk'}</Text>
        
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          error={!!emailError}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          error={!!passwordError}
          style={styles.input}
        />
        {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

        <Button 
          mode="contained" 
          onPress={handleLogin} 
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {isRegistering ? 'Daftar' : 'Masuk'}
        </Button>

        <View style={styles.linksContainer}>
          <Button mode="text" onPress={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Sudah Punya Akun?' : 'Buat Akun'}
          </Button>
          {!isRegistering && <Button mode="text" onPress={handleForgotPassword} disabled={loading}>Lupa Password</Button>}
        </View>
      </View>

      <Snackbar
        visible={!!generalError}
        onDismiss={() => setGeneralError('')}
        duration={3000}
      >
        {generalError}
      </Snackbar>
    </KeyboardAvoidingView>
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
    padding: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginBottom: 16,
    marginLeft: 4,
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  linksContainer: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  }
});
