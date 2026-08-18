import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, Snackbar, Appbar, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../lib/api/apiClient';
import { useTenant } from '../../lib/context/TenantContext';
import { LogOut } from 'lucide-react-native';

interface MemberItem {
  id: string;
  role: string;
  user_id: string;
  app_user?: { nama: string | null; email: string | null } | { nama: string | null; email: string | null }[] | null;
}

export default function Pengaturan() {
  const router = useRouter();
  const { tenantId, tenantNama, userRole, clearTenant } = useTenant();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackMsg, setSnackMsg] = useState('');

  // Settings
  const [batasPinjam, setBatasPinjam] = useState('3');
  const [tarifDenda, setTarifDenda] = useState('500');
  const [qrCodeValue, setQrCodeValue] = useState('');

  // Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (tenantId) {
      loadSettings();
      loadMembers();
    } else {
      setLoading(false);
    }
  }, [tenantId]);

  const loadSettings = async () => {
    if (!tenantId) return;
    try {
      const { data: tenant, error: tErr } = await supabase
        .from('tenant')
        .select('batas_maksimal_peminjaman, qr_code_value')
        .eq('id', tenantId)
        .single();

      if (!tErr && tenant) {
        setBatasPinjam(tenant.batas_maksimal_peminjaman?.toString() || '3');
        setQrCodeValue(tenant.qr_code_value || '');
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

  const handleInvite = async () => {
    if (!tenantId) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setSnackMsg('Format email tidak valid');
      return;
    }
    setInviteLoading(true);
    try {
      await apiClient.tenant.memberInvite(tenantId, inviteEmail.trim(), inviteRole);
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
    const newRole = currentRole === 'admin' ? 'staff' : 'admin';
    Alert.alert('Konfirmasi', `Ubah role menjadi ${newRole}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ubah', onPress: async () => {
        try {
          await apiClient.tenant.memberPromote(tenantId, memberId, newRole);
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

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (userRole !== 'owner') {
      setSnackMsg('Hanya Owner yang dapat mengeluarkan member');
      return;
    }
    Alert.alert('Konfirmasi', `Keluarkan ${memberName} dari perpustakaan?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluarkan', style: 'destructive', onPress: async () => {
        try {
          const { error } = await supabase
            .from('tenant_member')
            .delete()
            .eq('id', memberId);
          if (error) throw error;
          setSnackMsg(`${memberName} dikeluarkan`);
          loadMembers();
        } catch (e: any) {
          setSnackMsg(e.message || 'Gagal mengeluarkan member');
        }
      }},
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        clearTenant();
        router.replace('/');
      }},
    ]);
  };

  const getRoleColor = (role: string) => {
    if (role === 'owner') return '#1565C0';
    if (role === 'admin') return '#E65100';
    return '#2E7D32';
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#fff', height: 48, elevation: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
        <Appbar.BackAction onPress={() => router.replace('/(admin)/dashboard')} />
        <Appbar.Content title="Pengaturan Perpustakaan" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
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
                return (
                  <View key={m.id} style={styles.memberRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{displayName}</Text>
                      <Text variant="bodySmall" style={{ color: '#666' }}>{displayEmail}</Text>
                    </View>
                    <Chip style={{ backgroundColor: getRoleColor(m.role) + '22' }} textStyle={{ color: getRoleColor(m.role), fontSize: 12 }}>
                      {m.role ? m.role.toUpperCase() : 'STAFF'}
                    </Chip>
                    {m.role !== 'owner' && (
                      <View style={{ flexDirection: 'row', marginLeft: 4 }}>
                        {userRole === 'owner' && (
                          <Button compact mode="text" onPress={() => handlePromote(m.id, m.role)}>
                            {m.role === 'admin' ? '→Staff' : '→Admin'}
                          </Button>
                        )}
                        {userRole === 'owner' && (
                          <Button compact mode="text" textColor="#D32F2F" onPress={() => handleRemoveMember(m.id, displayName)}>
                            Hapus
                          </Button>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}

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
                onPress={handleInvite}
                loading={inviteLoading}
                disabled={inviteLoading}
                style={{ alignSelf: 'center', borderRadius: 8 }}
              >
                Undang
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* QR Code */}
        <Card style={styles.card} mode="outlined">
          <Card.Title title="QR Code Perpustakaan" />
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: '#333', marginBottom: 8, fontWeight: '500' }}>
              Kode Unik: {qrCodeValue || '-'}
            </Text>
            <Text variant="bodySmall" style={{ color: '#888' }}>
              Pengunjung dapat scan QR ini untuk langsung mengakses katalog publik perpustakaan tanpa perlu login.
            </Text>
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
                style={{ width: 100, backgroundColor: '#FFF' }}
                dense
              />
              <Text variant="bodyMedium" style={{ flex: 1 }}>buku per anggota</Text>
              <Button mode="contained" onPress={handleSaveBatas} style={{ borderRadius: 8 }}>Simpan</Button>
            </View>
          </Card.Content>
        </Card>

        {/* Tarif Denda */}
        <Card style={styles.card} mode="outlined">
          <Card.Title title="Nominal Denda per Hari" />
          <Card.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="bodyMedium">Rp</Text>
              <TextInput
                value={tarifDenda}
                onChangeText={setTarifDenda}
                mode="outlined"
                keyboardType="numeric"
                style={{ width: 120, backgroundColor: '#FFF' }}
                dense
              />
              <Text variant="bodyMedium" style={{ flex: 1 }}>/hari/buku</Text>
              <Button mode="contained" onPress={handleSaveTarif} style={{ borderRadius: 8 }}>Simpan</Button>
            </View>
            <Text variant="bodySmall" style={{ color: '#888', marginTop: 8 }}>
              Tarif denda berlaku mulai hari ini dan perubahan tidak berlaku retroaktif.
            </Text>
          </Card.Content>
        </Card>

        {/* Keluar */}
        <Button mode="outlined" onPress={handleLogout} textColor="#D32F2F" style={styles.logoutBtn} icon={() => <LogOut size={18} color="#D32F2F" />}>
          Keluar dari Akun
        </Button>
      </ScrollView>

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
});

