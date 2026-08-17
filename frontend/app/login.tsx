import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { mockClient } from '../lib/api/mockClient';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      // Mock login logic: For now we simulate success. If they use specific wrong passwords we could mock error.
      if (email === 'salah@email.com') {
        throw new Error('Email atau password salah');
      }
      // Usually we call a mock auth method, e.g. mockClient.auth.signIn
      // For this spec, we just navigate forward to tenant-setup
      router.push('/tenant-setup');
    } catch (e: any) {
      setGeneralError(e.message || 'Email atau password salah');
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
        <Text variant="headlineMedium" style={styles.title}>Masuk</Text>
        
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
          Masuk
        </Button>

        <View style={styles.linksContainer}>
          <Button mode="text" onPress={() => {}}>Buat Akun</Button>
          <Button mode="text" onPress={() => {}}>Lupa Password</Button>
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
    backgroundColor: '#FFFFFF', // flat style
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
