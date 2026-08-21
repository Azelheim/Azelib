import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { Text, Button, Card, TextInput, Divider, Snackbar, Chip, Appbar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../lib/api/apiClient';
import { useTenant } from '../../lib/context/TenantContext';
import { logoutAccount } from '../../lib/session';
import { RefreshCw, KeyRound, Copy, Share2, LogOut } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface MemberItem {
  id: string;
  role: 'owner' | 'admin' | 'staff';
  user_id: string;
  app_user?: {
    nama: string | null;
    email: string;
  } | {
    nama: string | null;
    email: string;
  }[] | null;
}

export default function Pengaturan() {
  const router = useRouter();
  const { tenantId, tenantNama, userRole, clearTenant, setTokenValue: setGlobalTokenValue } = useTenant();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [batasPinjam, setBatasPinjam] = useState('3');
  const [maksimalHariPinjam, setMaksimalHariPinjam] = useState('7');
  const [tarifDenda, setTarifDenda] = useState('500');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  // Token state
  const [tokenValue, setTokenValue] = useState<string | null>(null);
  const [tokenConfirmed, setTokenConfirmed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (tenantId) {
        loadSettings();
        loadMembers();
      }
    }, [tenantId])
  );

  // Realtime subscription: updates token & settings across devices without restart
  useEffect(() => {
    if (!tenantId) return;

    console.log('[TOKEN-002][REALTIME-SUB-INIT] Initializing channel for tenant:', tenantId);
    const channel = supabase
      .channel(`tenant-settings-${tenantId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tenant', filter: `id=eq.${tenantId}` },
        (payload: any) => {
          console.log('[TOKEN-002][REALTIME-EVENT-RECEIVED] Event UPDATE received payload:', JSON.stringify(payload));
          if (payload?.new) {
            if (payload.new.qr_code_value) {
              console.log('[TOKEN-002][REALTIME-APPLY] Updating tokenValue state to:', payload.new.qr_code_value);
              setTokenValue(payload.new.qr_code_value);
              setGlobalTokenValue(payload.new.qr_code_value);
              setTokenConfirmed(true);
            }
            if (payload.new.batas_maksimal_peminjaman !== undefined && payload.new.batas_maksimal_peminjaman !== null) {
              setBatasPinjam(payload.new.batas_maksimal_peminjaman.toString());
            }
            if (payload.new.maksimal_hari_pinjam !== undefined && payload.new.maksimal_hari_pinjam !== null) {
              setMaksimalHariPinjam(payload.new.maksimal_hari_pinjam.toString());
            }
          }
        }
      )
      .subscribe((status: string, err?: any) => {
        console.log('[TOKEN-002][REALTIME-STATUS] Channel subscription status:', status, 'error:', err);
      });

    return () => {
      console.log('[TOKEN-002][REALTIME-SUB-CLEANUP] Removing channel for tenant:', tenantId);
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const loadSettings = async () => {
    if (!tenantId) return;
    try {
      const { data: tenant, error: tErr } = await supabase
        .from('tenant')
        .select('batas_maksimal_peminjaman, maksimal_hari_pinjam, qr_code_value')
        .eq('id', tenantId)
        .single();

      if (!tErr && tenant) {
        setBatasPinjam(tenant.batas_maksimal_peminjaman?.toString() || '3');
        setMaksimalHariPinjam(tenant.maksimal_hari_pinjam?.toString() || '7');
        let codeVal = tenant.qr_code_value;
        if (!codeVal) {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let genCode = '';
          for (let i = 0; i < 6; i++) {
            genCode += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          codeVal = genCode;
          if (userRole === 'owner' || userRole === 'admin') {
            await supabase.from('tenant').update({ qr_code_value: codeVal }).eq('id', tenantId);
          }
        }
        setTokenValue(codeVal);
        setGlobalTokenValue(codeVal);
        setTokenConfirmed(true);
      } else {
        setTokenConfirmed(false);
      }

      const { data: tarif, error: tarifErr } = await supabase
        .from('tarif_denda_history')
        .select('nominal_per_hari')
        .eq('tenant_id', tenantId)
        .order('berlaku_mulai_tanggal', { ascending: false })
        .limit(1)
        .single();

      if (!tarifErr && tarif) {
        setTarifDenda(tarif.nominal_per_hari?.toString() || '500');
      }
    } catch (e) {
      console.error('Error loadSettings:', e);
      setTokenConfirmed(false);
    }
  };

  const loadMembers = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_member')
        .select('id, role, user_id, app_user:user_id(nama, email)')
        .eq('tenant_id', tenantId);

      if (!error && Array.isArray(data)) {
        setMembers(data as unknown as MemberItem[]);
      } else {
        setMembers([]);
      }
    } catch (e: any) {
      console.error('Error loadMembers:', e);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBatas = async () => {
    if (!tenantId) return;
    const limit = parseInt(batasPinjam);
    if (isNaN(limit) || limit < 1) {
      setSnackMsg('Batas peminjaman minimal 1 buku');
      return;
    }
    try {
      const { error } = await supabase
        .from('tenant')
        .update({ batas_maksimal_peminjaman: limit, updated_at: new Date().toISOString() })
        .eq('id', tenantId);
      if (error) throw error;
      setSnackMsg('Batas peminjaman diperbarui');
    } catch (e: any) {
      setSnackMsg(e.message || 'Gagal menyimpan batas peminjaman');
    }
  };

  const handleSaveMaksimalHariPinjam = async () => {
    if (!tenantId) return;
    const days = parseInt(maksimalHariPinjam);
    if (isNaN(days) || days < 1) {
      setSnackMsg('Maksimal hari pinjam minimal 1 hari');
      return;
    }
    try {
      const { error } = await supabase
        .from('tenant')
        .update({ maksimal_hari_pinjam: days, updated_at: new Date().toISOString() })
        .eq('id', tenantId);
      if (error) throw error;
      setSnackMsg('Maksimal hari pinjam diperbarui');
    } catch (e: any) {
      setSnackMsg(e.message || 'Gagal menyimpan maksimal hari pinjam');
    }
  };

  const handleSaveTarif = async () => {
    if (!tenantId) return;
    const nominal = parseFloat(tarifDenda);
    if (isNaN(nominal) || nominal < 0) {
      setSnackMsg('Tarif denda tidak valid');
      return;
    }
    try {
      await apiClient.tenant.pengaturanTarifDenda(tenantId, nominal);
      setSnackMsg('Tarif denda diperbarui');
    } catch (e: any) {
      try {
        const { error } = await supabase.from('tarif_denda_history').insert({
          tenant_id: tenantId,
          nominal_per_hari: nominal,
        });
        if (error) throw error;
        setSnackMsg('Tarif denda diperbarui');
      } catch (fallbackErr: any) {
        setSnackMsg(fallbackErr.message || 'Gagal menyimpan tarif');
      }
    }
  };

  const handleInviteMember = async () => {
    if (!tenantId) return;
    if (userRole === 'staff') {
      setSnackMsg('Hanya Owner dan Admin yang dapat mengundang anggota');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setSnackMsg('Format email tidak valid');
      return;
    }
    setInviteLoading(true);
    try {
      await apiClient.tenant.memberInvite(tenantId, inviteEmail.trim(), inviteRole, userRole || 'owner');
      setSnackMsg('Undangan berhasil diproses');
      setInviteEmail('');
      loadMembers();
    } catch (e: any) {
      setSnackMsg(e.message || 'Gagal mengirim undangan');
    } finally {
      setInviteLoading(false);
    }
  };

  const handlePromote = (memberId: string, currentRole: string) => {
    if (!tenantId) return;
    if (userRole !== 'owner') {
      setSnackMsg('Hanya Owner yang dapat mengubah role pengelola');
      return;
    }
    const newRole = currentRole === 'admin' ? 'staff' : 'admin';
    Alert.alert('Konfirmasi', `Ubah role menjadi ${newRole === 'admin' ? 'Admin' : 'Member (Staff)'}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ubah', onPress: async () => {
        try {
          await apiClient.tenant.memberPromote(tenantId, memberId, newRole, userRole || 'owner');
          setSnackMsg(`Role berhasil diubah ke ${newRole}`);
          loadMembers();
        } catch (e: any) {
          try {
            const { error } = await supabase
              .from('tenant_member')
              .update({ role: newRole })
              .eq('id', memberId);
            if (error) throw error;
            setSnackMsg(`Role berhasil diubah ke ${newRole}`);
            loadMembers();
          } catch (fallbackErr: any) {
            setSnackMsg(fallbackErr.message || 'Gagal mengubah role');
          }
        }
      }},
    ]);
  };

  const canRemoveMember = (targetRole: string) => {
    if (targetRole === 'owner') return false;
    if (userRole === 'owner') return true;
    if (userRole === 'admin' && targetRole === 'staff') return true;
    return false;
  };

  const handleRemoveMember = (memberId: string, memberName: string, targetRole: string) => {
    if (!canRemoveMember(targetRole)) {
      setSnackMsg('Anda tidak memiliki izin untuk mengeluarkan pengelola ini');
      return;
    }
    Alert.alert('Konfirmasi', `Keluarkan ${memberName} dari perpustakaan?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluarkan', style: 'destructive', onPress: async () => {
        try {
          await apiClient.tenant.memberRemove(tenantId || '', memberId, userRole || 'owner', targetRole);
          setSnackMsg(`${memberName} dikeluarkan`);
          loadMembers();
        } catch (e: any) {
          setSnackMsg(e.message || 'Gagal mengeluarkan member');
        }
      }},
    ]);
  };

  const handleKeluarAkun = () => {
    Alert.alert('Keluar Akun', 'Apakah Anda yakin ingin keluar dari akun Anda?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
        await logoutAccount();
        clearTenant();
        router.replace('/login');
      }},
    ]);
  };

  const handleCopyToken = () => {
    if (!tokenValue) return;
    setSnackMsg(`Token ${tokenValue} siap dibagikan`);
  };

  const handleShareToken = async () => {
    if (!tokenValue) return;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: sans-serif; text-align: center; padding: 40px; color: #111; }
          .card { border: 2px solid #000; border-radius: 16px; padding: 30px; max-width: 420px; margin: 0 auto; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          p { font-size: 13px; color: #555; }
          .token-box { background: #f0f0f0; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${tenantNama || 'Perpustakaan'}</h1>
          <p>Masukkan token ini di aplikasi untuk membuka katalog buku:</p>
          <div class="token-box">${tokenValue}</div>
        </div>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        setSnackMsg(`Token: ${tokenValue}`);
      }
    } catch (e: any) {
      setSnackMsg(e.message || 'Gagal membagikan token');
    }
  };

  const handleRefreshToken = async () => {
    console.log('[TOKEN-003][REFRESH-START] Initiated by role:', userRole, 'tenantId:', tenantId);
    if (!tenantId || (userRole !== 'owner' && userRole !== 'admin')) {
      setSnackMsg('Hanya Owner dan Admin yang dapat memperbarui token');
      return;
    }
    try {
      setTokenConfirmed(false);
      const updated = await apiClient.tenant.refreshToken(tenantId, userRole);
      if (updated?.qr_code_value) {
        setTokenValue(updated.qr_code_value);
        setGlobalTokenValue(updated.qr_code_value);
      }
      setTokenConfirmed(true);
      setSnackMsg('Token perpustakaan berhasil diperbarui');
    } catch (e: any) {
      console.error('[TOKEN-003][REFRESH-ERROR] Error refreshing token:', e);
      setTokenConfirmed(true);
      setSnackMsg(e.message || 'Gagal memperbarui token');
    }
  };

  const getRoleColor = (role: string) => {
    if (role === 'owner') return '#1565C0';
    if (role === 'admin') return '#E65100';
    return '#2E7D32';
  };

  const getRoleLabel = (role: string) => {
    if (role === 'owner') return 'OWNER';
    if (role === 'admin') return 'ADMIN';
    return 'MEMBER';
  };

  const isViewOnly = userRole === 'staff';

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#fff', height: 48, elevation: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
        <Appbar.BackAction onPress={() => router.replace('/(admin)/dashboard')} />
        <Appbar.Content title="Pengaturan Perpustakaan" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Member Section */}
          <Card style={styles.card} mode="outlined">
            <Card.Title title="Daftar Pengelola Perpustakaan" />
            <Card.Content>
              {loading ? (
                <ActivityIndicator style={{ marginVertical: 16 }} />
              ) : (!members || members.length === 0) ? (
                <Text style={{ color: '#666', fontStyle: 'italic' }}>Belum ada member terdaftar.</Text>
              ) : (
                members.map(m => {
                  const appUserObj = Array.isArray(m.app_user) ? m.app_user[0] : m.app_user;
                  const displayName = appUserObj?.nama || appUserObj?.email || (m.user_id ? `User (${m.user_id.slice(0, 6)})` : 'Anggota');
                  const displayEmail = appUserObj?.email || '-';
                  const showRemove = canRemoveMember(m.role);
                  const showPromote = userRole === 'owner' && m.role !== 'owner';

                  return (
                    <View key={m.id} style={styles.memberRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{displayName}</Text>
                        <Text variant="bodySmall" style={{ color: '#666' }}>{displayEmail}</Text>
                      </View>
                      <Chip style={{ backgroundColor: getRoleColor(m.role) + '22' }} textStyle={{ color: getRoleColor(m.role), fontSize: 12 }}>
                        {getRoleLabel(m.role)}
                      </Chip>
                      {(showPromote || showRemove) && (
                        <View style={{ flexDirection: 'row', marginLeft: 4 }}>
                          {showPromote && (
                            <Button compact mode="text" onPress={() => handlePromote(m.id, m.role)}>
                              {m.role === 'admin' ? '→Member' : '→Admin'}
                            </Button>
                          )}
                          {showRemove && (
                            <Button compact mode="text" textColor="#D32F2F" onPress={() => handleRemoveMember(m.id, displayName, m.role)}>
                              Hapus
                            </Button>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}

              {!isViewOnly && (
                <>
                  <Divider style={{ marginVertical: 16 }} />
                  <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 8 }}>Undang Pengelola Baru</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      label="Email"
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      mode="outlined"
                      style={{ flex: 1, backgroundColor: '#FFF' }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      dense
                    />
                    <Button
                      mode="contained"
                      onPress={handleInviteMember}
                      loading={inviteLoading}
                      disabled={inviteLoading || !inviteEmail.trim()}
                      style={{ alignSelf: 'center', borderRadius: 8 }}
                    >
                      Undang
                    </Button>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>

          {/* Token Akses Pengunjung Section */}
          <Card style={styles.card} mode="outlined">
            <Card.Title 
              title="Token Akses Pengunjung" 
              left={() => <KeyRound size={22} color="#1565C0" />}
            />
            <Card.Content>
              <View style={[styles.tokenContainer, !tokenConfirmed && styles.tokenContainerBlur]}>
                {tokenConfirmed && tokenValue ? (
                  <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                    <Text variant="labelMedium" style={{ color: '#666', marginBottom: 4 }}>
                      TOKEN PERPUSTAKAAN
                    </Text>
                    <Text style={styles.tokenText}>
                      {tokenValue}
                    </Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <ActivityIndicator size="small" />
                    <Text variant="bodySmall" style={{ color: '#666', marginTop: 8 }}>
                      Memverifikasi token terkini...
                    </Text>
                  </View>
                )}
              </View>

              <Text variant="bodySmall" style={{ color: '#666', textAlign: 'center', marginBottom: 16 }}>
                Pengunjung dapat memasukkan 6 karakter token ini di halaman awal untuk langsung mengakses katalog buku tanpa perlu login.
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
                <Button
                  mode="contained"
                  icon={() => <Copy size={16} color="#FFF" />}
                  onPress={handleCopyToken}
                  disabled={!tokenConfirmed || !tokenValue}
                  style={{ flex: 1, borderRadius: 8 }}
                >
                  Salin Token
                </Button>
                <Button
                  mode="outlined"
                  icon={() => <Share2 size={16} color="#000" />}
                  onPress={handleShareToken}
                  disabled={!tokenConfirmed || !tokenValue}
                  style={{ flex: 1, borderRadius: 8 }}
                >
                  Bagikan
                </Button>
              </View>

              {!isViewOnly && (
                <Button
                  mode="text"
                  compact
                  icon={() => <RefreshCw size={14} color="#666" />}
                  textColor="#666"
                  onPress={handleRefreshToken}
                  disabled={!tokenConfirmed}
                  style={{ marginTop: 8, alignSelf: 'center' }}
                >
                  Perbarui Token Baru
                </Button>
              )}
            </Card.Content>
          </Card>

          {/* Batas Peminjaman */}
          <Card style={styles.card} mode="outlined">
            <Card.Title title="Batas Maksimal Peminjaman" />
            <Card.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  value={batasPinjam}
                  onChangeText={setBatasPinjam}
                  mode="outlined"
                  keyboardType="numeric"
                  disabled={isViewOnly}
                  style={{ width: 100, backgroundColor: '#FFF' }}
                  dense
                />
                <Text variant="bodyMedium" style={{ flex: 1 }}>buku per anggota</Text>
                {!isViewOnly && (
                  <Button mode="contained" onPress={handleSaveBatas} style={{ borderRadius: 8 }}>Simpan</Button>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* Maksimal Hari Pinjam */}
          <Card style={styles.card} mode="outlined">
            <Card.Title title="Maksimal Hari Pinjam" />
            <Card.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  value={maksimalHariPinjam}
                  onChangeText={setMaksimalHariPinjam}
                  mode="outlined"
                  keyboardType="numeric"
                  disabled={isViewOnly}
                  style={{ width: 100, backgroundColor: '#FFF' }}
                  dense
                />
                <Text variant="bodyMedium" style={{ flex: 1 }}>hari</Text>
                {!isViewOnly && (
                  <Button mode="contained" onPress={handleSaveMaksimalHariPinjam} style={{ borderRadius: 8 }}>Simpan</Button>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* Tarif Denda */}
          <Card style={styles.card} mode="outlined">
            <Card.Title title="Nominal Denda per Hari" />
            <Card.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  value={tarifDenda}
                  onChangeText={setTarifDenda}
                  mode="outlined"
                  keyboardType="numeric"
                  disabled={isViewOnly}
                  style={{ width: 100, backgroundColor: '#FFF' }}
                  dense
                />
                <Text variant="bodyMedium" style={{ flex: 1 }}>rupiah / hari / buku</Text>
                {!isViewOnly && (
                  <Button mode="contained" onPress={handleSaveTarif} style={{ borderRadius: 8 }}>Simpan</Button>
                )}
              </View>
              <Text variant="bodySmall" style={{ color: '#888', marginTop: 8 }}>
                Tarif denda berlaku mulai hari ini dan perubahan tidak berlaku retroaktif.
              </Text>
            </Card.Content>
          </Card>

          {/* Keluar */}
          <Button mode="outlined" onPress={handleKeluarAkun} textColor="#D32F2F" style={styles.logoutBtn} icon={() => <LogOut size={18} color="#D32F2F" />}>
            Keluar Akun
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar visible={!!snackMsg} onDismiss={() => setSnackMsg('')} duration={3000}>
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 16, backgroundColor: '#FFFFFF' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', flexWrap: 'wrap' },
  logoutBtn: { marginTop: 16, borderColor: '#D32F2F', borderRadius: 8 },
  tokenContainer: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  tokenContainerBlur: {
    backgroundColor: '#F3F4F6',
    opacity: 0.7,
  },
  tokenText: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 6,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
});
