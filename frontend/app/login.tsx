import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyRound, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAzelheimTheme } from '../lib/theme';
import {
  AzelheimScreen,
  AzelheimSectionHeader,
  AzelheimCard,
  AzelheimInput,
  AzelheimButton,
  AzelheimMetaBox,
  AzelheimToast,
  AzelheimIconButton,
} from '../lib/components/azelheim';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useAzelheimTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const validate = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Format email tidak valid');
      valid = false;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setPasswordError(
        'Password minimal 8 karakter, kombinasi huruf dan angka'
      );
      valid = false;
    }

    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setGeneralError('');
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setGeneralError('Pendaftaran berhasil. Silakan cek email/login.');
        setIsRegistering(false);
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Email atau password salah');
          }
          throw error;
        }
        if (authData.user) {
          router.replace('/tenant-setup');
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
    if (!emailRegex.test(email.trim())) {
      setGeneralError('Isi email Anda di field di atas terlebih dahulu');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setGeneralError('Link reset password telah dikirim ke email Anda');
    } catch (e: any) {
      setGeneralError(e.message || 'Gagal mengirim reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AzelheimScreen>
      <View style={styles.topNavRow}>
        <AzelheimIconButton
          icon={<ArrowLeft size={18} color={colors.text} />}
          onPress={() => router.back()}
          accessibilityLabel="Kembali"
        />
      </View>

      <AzelheimSectionHeader
        title={isRegistering ? 'Daftar' : 'Login'}
        code="AUTH // 01"
      />

      <AzelheimCard style={{ marginBottom: 16 }}>
        <Text style={[styles.eyebrow, { color: colors.muted }]}>
          {isRegistering ? 'BUAT AKUN BARU' : 'WELCOME BACK'}
        </Text>
        <Text style={[styles.mainTitle, { color: colors.text }]}>
          {isRegistering ? 'Daftar ke Azelheim' : 'Masuk ke Azelheim'}
        </Text>
        <Text style={[styles.subText, { color: colors.muted }]}>
          Kelola perpustakaan Anda dari satu tempat.
        </Text>

        <View style={styles.formContent}>
          <AzelheimInput
            label="Email"
            placeholder="nama@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            error={emailError}
          />

          <AzelheimInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={passwordError}
          />

          <AzelheimButton
            variant="dark"
            title={isRegistering ? 'DAFTAR' : 'LOGIN'}
            icon={<KeyRound size={18} color={colors.bg} />}
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            fullWidth
            style={{ marginTop: 6 }}
          />

          <View style={styles.linksRow}>
            <TouchableOpacity
              onPress={() => setIsRegistering(!isRegistering)}
              activeOpacity={0.7}
              style={styles.linkBtn}
            >
              <Text style={[styles.linkText, { color: colors.text }]}>
                {isRegistering ? 'Sudah Punya Akun? Masuk' : 'Buat Akun'}
              </Text>
            </TouchableOpacity>

            {!isRegistering && (
              <TouchableOpacity
                onPress={handleForgotPassword}
                activeOpacity={0.7}
                style={styles.linkBtn}
              >
                <Text style={[styles.linkText, { color: colors.muted }]}>
                  Lupa Password
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </AzelheimCard>

      <AzelheimMetaBox leftText="SESSION" rightText="7 HARI" />

      <AzelheimToast
        visible={!!generalError}
        message={generalError}
        onDismiss={() => setGeneralError('')}
        duration={3500}
      />
    </AzelheimScreen>
  );
}

const styles = StyleSheet.create({
  topNavRow: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginVertical: 4,
  },
  subText: {
    fontSize: 11.5,
    marginBottom: 16,
  },
  formContent: {
    marginTop: 4,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  linkBtn: {
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
