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
  app_user: { nama: string | null; email: string } | null;
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

  useEffect(() => {
    if (tenantId) {
      loadSettings();
      loadMembers();
    }
  }, [tenantId]);

  const loadSettings = async () => {
    try {
      const { data: tenant } = await supabase
        .from('tenant')
        .select('batas_maksimal_peminjaman, qr_code_value')
        .eq('id', tenantId)
        .single();

      if (tenant) {
        setBatasPinjam(tenant.batas_maksimal_peminjaman?.toString() || '3');
        setQrCodeValue(tenant.qr_code_value || '');
      }

      const { data: tarif } = await supabase
        .from('tarif_denda_history')
        .select('nominal_per_hari')
        .eq('tenant_id', tenantId)
        .order('berlaku_mulai_tanggal', { ascending: false })
        .limit(1)
        .single();

      if (tarif) {
        setTarifDenda(tarif.nominal_per_hari?.toString() || '500');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_member')
        .select('id, role, user_id, app_user:user_id(nama, email)')
        .eq('tenant_id', tenantId);

      if (!error && data) {
        setMembers(data as any[]);
      }
    } catch (e) {
      console.error(e);
      setSnackMsg('Gagal memuat data member');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBatas = async () => {
    try {
      const { error } = await supabase
        .from('tenant')
        .update({ batas_maksimal_peminjaman: parseInt(batasPinjam) || 3, updated_at: new Date().toISOString() })
        .eq('id', tenantId);
      if (error) throw error;
      setSnackMsg('Batas peminjaman diperbarui');
    } catch (e: any) {
      setSnackMsg(e.message || 'Gagal menyimpan');
    }
  };

  const handleSaveTarif = async () => {
    try {
      await apiClient.tenant.pengaturanTarifDenda(tenantId!, parseFloat(tarifDenda) || 500);
      setSnackMsg('Tarif denda diperbarui');
    } catch (e: any) {
      // Fallback: insert directly
      try {
        const { error } = await supabase.from('tarif_denda_history').insert({
          tenant_id: tenantId,
          nominal_per_hari: parseFloat(tarifDenda) || 500,
        });
        if (error) throw error;
        setSnackMsg('Tarif denda diperbarui');
      } catch (fallbackErr: any) {
        setSnackMsg(fallbackErr.message || 'Gagal menyimpan tarif');
      }
    }
  };

  const handleInvite = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setSnackMsg('Format email tidak valid');
      return;
    }
    try {
      await apiClient.tenant.memberInvite(tenantId!, inviteEmail, inviteRole);
      setSnackMsg('Undangan berhasil dikirim');
      setInviteEmail('');
      loadMembers();
    } catch (e: any) {
      setSnackMsg(e.message || 'Gagal mengirim undangan');
    }
  };

  const handlePromote = (memberId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'staff' : 'admin';
    Alert.alert('Konfirmasi', `Ubah role menjadi ${newRole}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ubah', onPress: async () => {
        try {
          await apiClient.tenant.memberPromote(tenantId!, memberId, newRole);
          setSnackMsg(`Role berhasil diubah ke ${newRole}`);
          loadMembers();
        } catch (e: any) {
          // Fallback
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
    return '#666';
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#fff', height: 48, elevation: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Pengaturan Perpustakaan" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Member Section */}
        <Card style={styles.card} mode="outlined">
          <Card.Title title="Member" />
          <Card.Content>
            {loading ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : members.length === 0 ? (
              <Text style={{ color: '#666' }}>Belum ada member.</Text>
            ) : (
              members.map(m => (
                <View key={m.id} style={styles.memberRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge">{m.app_user?.nama || m.app_user?.email || '-'}</Text>
                    <Text variant="bodySmall" style={{ color: '#666' }}>{m.app_user?.email}</Text>
                  </View>
                  <Chip style={{ backgroundColor: getRoleColor(m.role) + '22' }} textStyle={{ color: getRoleColor(m.role) }}>
                    {m.role}
                  </Chip>
                  {m.role !== 'owner' && (
                    <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                      <Button compact mode="text" onPress={() => handlePromote(m.id, m.role)}>
                        {m.role === 'admin' ? '→Staff' : '→Admin'}
                      </Button>
                      {userRole === 'owner' && (
                        <Button compact mode="text" textColor="#D32F2F" onPress={() => handleRemoveMember(m.id, m.app_user?.nama || m.app_user?.email || '-')}>
                          Hapus
                        </Button>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}

            <Divider style={{ marginVertical: 16 }} />
            <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 8 }}>Undang Member</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                label="Email"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                mode="outlined"
                style={{ flex: 1, backgroundColor: '#FFF' }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Button mode="contained" onPress={handleInvite} style={{ alignSelf: 'center', borderRadius: 8 }}>
                Undang
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* QR Code */}
        <Card style={styles.card} mode="outlined">
          <Card.Title title="QR Code Perpustakaan" />
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: '#666', marginBottom: 8 }}>
              Nilai QR: {qrCodeValue || '-'}
            </Text>
            <Text variant="bodySmall" style={{ color: '#999' }}>
              Pengunjung dapat scan QR ini untuk mengakses katalog perpustakaan.
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
              />
              <Text variant="bodyMedium">buku per anggota</Text>
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
              />
              <Text variant="bodyMedium">/hari/buku</Text>
              <Button mode="contained" onPress={handleSaveTarif} style={{ borderRadius: 8 }}>Simpan</Button>
            </View>
            <Text variant="bodySmall" style={{ color: '#999', marginTop: 8 }}>Perubahan tidak retroaktif.</Text>
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
