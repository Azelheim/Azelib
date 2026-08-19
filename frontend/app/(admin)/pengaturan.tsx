import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Text, Card, Button, TextInput, Snackbar, Appbar, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../lib/api/apiClient';
import { useTenant } from '../../lib/context/TenantContext';
import { logoutAccount } from '../../lib/session';
import { QRCodeSvg, getQrSvgHtml } from '../../lib/qr/QRCodeSvg';
import { LogOut, QrCode, Printer, Share2, RefreshCw } from 'lucide-react-native';

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
  const [maksimalHariPinjam, setMaksimalHariPinjam] = useState('7');
  const [tarifDenda, setTarifDenda] = useState('500');
  const [qrCodeValue, setQrCodeValue] = useState('');

  // Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Auto-refresh settings and members whenever Pengaturan screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (tenantId) {
        loadSettings();
        loadMembers();
      } else {
        setLoading(false);
      }
    }, [tenantId])
  );

  // Realtime subscription: updates QR code & settings across devices without restart
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`tenant-settings-${tenantId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tenant', filter: `id=eq.${tenantId}` },
        (payload: any) => {
          if (payload?.new) {
            if (payload.new.qr_code_value) {
              setQrCodeValue(payload.new.qr_code_value);
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
      .subscribe();

    return () => {
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
          const cleanName = (tenantNama || 'LIB').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
          codeVal = `QR-${cleanName || 'PERPUS'}-${tenantId.slice(0, 6).toUpperCase()}`;
          if (userRole === 'owner' || userRole === 'admin') {
            await supabase.from('tenant').update({ qr_code_value: codeVal }).eq('id', tenantId);
          }
        }
        setQrCodeValue(codeVal);
      } else {
        const cleanName = (tenantNama || 'LIB').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        setQrCodeValue(`QR-${cleanName || 'PERPUS'}-${tenantId.slice(0, 6).toUpperCase()}`);
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
      const cleanName = (tenantNama || 'LIB').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      setQrCodeValue(`QR-${cleanName || 'PERPUS'}-${tenantId.slice(0, 6).toUpperCase()}`);
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

  const handleInvite = async () => {
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

  const handlePrintQR = async () => {
    if (!qrCodeValue) return;
    const qrSvgString = getQrSvgHtml(qrCodeValue, 240);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            text-align: center;
            padding: 40px;
            color: #111;
          }
          .card {
            border: 2px solid #000;
            border-radius: 16px;
            padding: 32px 24px;
            max-width: 420px;
            margin: 0 auto;
          }
          h1 {
            font-size: 22px;
            margin-bottom: 4px;
            color: #000;
          }
          p.subtitle {
            font-size: 14px;
            color: #555;
            margin-top: 0;
            margin-bottom: 20px;
          }
          .qr-container {
            margin: 16px auto;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .code-box {
            background-color: #f5f5f5;
            border: 1px dashed #999;
            padding: 10px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 15px;
            font-weight: bold;
            margin-top: 14px;
            letter-spacing: 1px;
          }
          .instructions {
            font-size: 12px;
            color: #666;
            margin-top: 18px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${tenantNama || 'Perpustakaan'}</h1>
          <p class="subtitle">Katalog Digital Pengunjung</p>
          <div class="qr-container">
            ${qrSvgString}
          </div>
          <div class="code-box">${qrCodeValue}</div>
          <p class="instructions">Scan QR ini melalui aplikasi untuk membuka katalog koleksi buku tanpa login.</p>
        </div>
      </body>
      </html>
    `;

    try {
      await Print.printAsync({ html });
    } catch (e: any) {
      try {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } else {
          setSnackMsg('QR Code siap dicetak');
        }
      } catch (err: any) {
        setSnackMsg(err.message || 'Gagal mencetak QR');
      }
    }
  };

  const handleShareQR = async () => {
    if (!qrCodeValue) return;
    const qrSvgString = getQrSvgHtml(qrCodeValue, 240);
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
          .qr-container { margin: 16px auto; display: flex; justify-content: center; }
          .code-box { background: #f0f0f0; padding: 8px; border-radius: 6px; font-family: monospace; font-weight: bold; margin-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${tenantNama || 'Perpustakaan'}</h1>
          <p>Scan QR untuk melihat katalog buku</p>
          <div class="qr-container">
            ${qrSvgString}
          </div>
          <div class="code-box">${qrCodeValue}</div>
        </div>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        setSnackMsg('Sharing tidak tersedia pada perangkat ini');
      }
    } catch (e: any) {
      setSnackMsg(e.message || 'Gagal membagikan QR');
    }
  };

  const handleRegenerateQR = async () => {
    if (!tenantId || (userRole !== 'owner' && userRole !== 'admin')) return;
    const cleanName = (tenantNama || 'LIB').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const newCode = `QR-${cleanName || 'PERPUS'}-${Date.now().toString(36).toUpperCase()}`;
    try {
      const { error } = await supabase
        .from('tenant')
        .update({ qr_code_value: newCode, updated_at: new Date().toISOString() })
        .eq('id', tenantId);
      if (error) throw error;
      setQrCodeValue(newCode);
      setSnackMsg('QR Code perpustakaan berhasil diperbarui');
    } catch (e: any) {
      console.error('Error regenerate QR:', e);
      setSnackMsg(e.message || 'Gagal memperbarui QR Code');
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
                    onPress={handleInvite}
                    loading={inviteLoading}
                    disabled={inviteLoading}
                    style={{ alignSelf: 'center', borderRadius: 8 }}
                  >
                    Undang
                  </Button>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* QR Code */}
        <Card style={styles.card} mode="outlined">
          <Card.Title 
            title="QR Code Perpustakaan" 
            left={() => <QrCode size={22} color="#1565C0" />}
          />
          <Card.Content>
            {qrCodeValue ? (
              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <View style={styles.qrImageWrapper}>
                  <QRCodeSvg value={qrCodeValue} size={180} />
                </View>
                <Chip style={{ marginTop: 12, backgroundColor: '#F0F0F0' }} textStyle={{ fontWeight: 'bold', letterSpacing: 0.5 }}>
                  {qrCodeValue}
                </Chip>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <ActivityIndicator size="small" />
                <Text variant="bodySmall" style={{ color: '#888', marginTop: 8 }}>
                  Memuat QR Code...
                </Text>
              </View>
            )}

            <Text variant="bodySmall" style={{ color: '#666', textAlign: 'center', marginBottom: 16 }}>
              Pengunjung dapat scan QR ini untuk langsung mengakses katalog publik perpustakaan tanpa perlu login.
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
              <Button
                mode="contained"
                icon={() => <Printer size={16} color="#FFF" />}
                onPress={handlePrintQR}
                disabled={!qrCodeValue}
                style={{ flex: 1, borderRadius: 8 }}
              >
                Cetak QR
              </Button>
              <Button
                mode="outlined"
                icon={() => <Share2 size={16} color="#000" />}
                onPress={handleShareQR}
                disabled={!qrCodeValue}
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
                onPress={handleRegenerateQR}
                style={{ marginTop: 8, alignSelf: 'center' }}
              >
                Regenerasi QR Code Baru
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
  qrImageWrapper: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
  },
});

