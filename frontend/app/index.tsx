import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyRound, ArrowUpRight, ArrowRight } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/api/apiClient';
import { useTenant } from '../lib/context/TenantContext';
import { getLastActiveTenant } from '../lib/session';
import { useAzelheimTheme } from '../lib/theme';
import {
  AzelheimScreen,
  AzelheimCard,
  AzelheimButton,
  AzelheimBadge,
  AzelheimMetaBox,
  AzelheimInput,
  AzelheimToast,
} from '../lib/components/azelheim';

export default function Gerbang() {
  const router = useRouter();
  const { colors } = useAzelheimTheme();
  const { setActiveTenant } = useTenant();
  const [checkingSession, setCheckingSession] = useState(true);
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
    if (!trimmed) return;
    if (loading) return;

    setLoading(true);
    setErrorVisible(false);

    try {
      const tenant = await apiClient.tenant.getByToken(trimmed);
      if (!tenant || !tenant.id) {
        setErrorVisible(true);
      } else {
        setTokenInput('');
        router.push(
          `/pengunjung?tenant_id=${tenant.id}&nama=${encodeURIComponent(
            tenant.nama || 'Perpustakaan'
          )}`
        );
      }
    } catch (e: any) {
      console.error('[TOKEN][VALIDATE-ERROR] Token error:', e?.message || e);
      setErrorVisible(true);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <AzelheimScreen contentContainerStyle={styles.content}>
      {/* Brand Box & Tagline */}
      <View
        style={[
          styles.logoBox,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.logoText, { color: colors.text }]}>A</Text>
      </View>

      <Text style={[styles.eyebrow, { color: colors.muted }]}>
        LIBRARY SYSTEM // ENTRY
      </Text>

      <View style={styles.hero}>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          Satu Aplikasi untuk{'\n'}Semua Perpustakaan Anda
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
          Kelola koleksi, peminjaman, anggota, dan laporan dalam satu tempat.
        </Text>
      </View>

      <View style={[styles.rule, { borderTopColor: colors.border }]} />

      {/* Login Card */}
      <Text style={[styles.eyebrow, { color: colors.muted, marginBottom: 8 }]}>
        MASUK SEBAGAI
      </Text>

      <AzelheimCard onPress={() => router.push('/login')} style={{ marginBottom: 20 }}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <View style={styles.cardTitleRow}>
              <KeyRound size={18} color={colors.text} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>LOGIN</Text>
            </View>
            <Text style={[styles.cardSub, { color: colors.muted }]}>
              Kelola perpustakaan sebagai Owner, Admin, atau Staff.
            </Text>
          </View>
          <ArrowUpRight size={19} color={colors.text} />
        </View>

        <AzelheimMetaBox
          leftText="AUTH // 01"
          rightText="MASUK →"
          style={{ marginTop: 10 }}
        />
      </AzelheimCard>

      {/* Guest Section */}
      <Text style={[styles.eyebrow, { color: colors.muted, marginBottom: 8 }]}>
        PENGUNJUNG
      </Text>

      <AzelheimCard style={{ marginBottom: 24 }}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Katalog tanpa akun
            </Text>
            <Text style={[styles.cardSub, { color: colors.muted }]}>
              Masukkan token perpustakaan yang diberikan petugas.
            </Text>
          </View>
          <AzelheimBadge label="READ ONLY" variant="blue" />
        </View>

        <View style={styles.tokenRow}>
          <AzelheimInput
            value={tokenInput}
            onChangeText={setTokenInput}
            placeholder="Contoh: Q7M4K2"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            mono
            containerStyle={{ flex: 1, marginBottom: 0 }}
            onSubmitEditing={handleTokenSubmit}
            returnKeyType="go"
          />
          <AzelheimButton
            variant="dark"
            onPress={handleTokenSubmit}
            loading={loading}
            disabled={!tokenInput.trim() || loading}
            icon={<ArrowRight size={18} color={colors.bg} />}
            style={{ width: 58, minHeight: 40 }}
          />
        </View>

        <Text style={[styles.tiny, { color: colors.faint, marginTop: 8 }]}>
          ACCESS // GUEST · 6 CHAR
        </Text>
      </AzelheimCard>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.tiny, { color: colors.faint }]}>AZELHEIM // 01</Text>
        <Text style={[styles.tiny, { color: colors.faint }]}>PUBLIC BUILD</Text>
      </View>

      <AzelheimToast
        visible={errorVisible}
        message="Token tidak dikenali, coba lagi"
        onDismiss={() => setErrorVisible(false)}
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
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderWidth: 1.4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontWeight: '900',
    fontSize: 20,
  },
  eyebrow: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hero: {
    paddingTop: 10,
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -1.4,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 310,
  },
  rule: {
    borderTopWidth: 1.2,
    marginVertical: 14,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  tiny: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9.5,
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
