import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  Copy,
  RefreshCw,
  QrCode,
  UserPlus,
  Power,
  ArrowLeft,
  Download,
  MoreVertical,
} from 'lucide-react-native';
import { apiClient } from '../../lib/api/apiClient';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { clearLastActiveTenant } from '../../lib/session';
import { useAzelheimTheme } from '../../lib/theme';
import {
  AzelheimScreen,
  AzelheimSectionHeader,
  AzelheimCard,
  AzelheimButton,
  AzelheimBadge,
  AzelheimCodeBox,
  AzelheimInput,
  AzelheimDialog,
  AzelheimToast,
  AzelheimIconButton,
} from '../../lib/components/azelheim';

interface MemberItem {
  id: string;
  user_id: string;
  role: string;
  penerus_user_id?: string | null;
  app_user?: {
    id: string;
    email: string;
    nama: string;
  };
}

export default function Pengaturan() {
  const router = useRouter();
  const { colors } = useAzelheimTheme();
  const { tenantId, tenantNama, userRole, clearTenant } = useTenant();
  const isOwner = userRole === 'owner';
  const isStaff = userRole === 'staff';

  const [loading, setLoading] = useState(true);
  const [tokenCode, setTokenCode] = useState('');
  const [qrCodeVal, setQrCodeVal] = useState('');
  const [members, setMembers] = useState<MemberItem[]>([]);

  // Loan Rules
  const [maxBuku, setMaxBuku] = useState('3');
  const [maxHari, setMaxHari] = useState('7');
  const [dendaPerHari, setDendaPerHari] = useState('500');
  const [rulesLoading, setRulesLoading] = useState(false);

  // Invite Dialog State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff');
  const [inviteRoleMenu, setInviteRoleMenu] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Successor Dialog State
  const [showSuccessorModal, setShowSuccessorModal] = useState(false);
  const [selectedSuccessor, setSelectedSuccessor] = useState<string | null>(null);

  // QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);

  // Member Action Menu
  const [activeMemberMenuId, setActiveMemberMenuId] = useState<string | null>(null);

  const [snackMsg, setSnackMsg] = useState('');

  useEffect(() => {
    if (tenantId) {
      loadSettings();
    }
  }, [tenantId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // 1. Tenant info (token, limits, QR)
      const { data: tenantData } = await supabase
        .from('tenant')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantData) {
        setMaxBuku(String(tenantData.batas_maksimal_peminjaman || 3));
        setMaxHari(String(tenantData.maksimal_hari_pinjam || 7));
        const val = tenantData.qr_code_value || '';
        setQrCodeVal(val);
        // Extract 6 chars token
        const cleanToken = val.replace(/^QR-/, '').replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase() || '8F2K9L';
        setTokenCode(cleanToken);
      }

      // 2. Fine rate
      const { data: tarifData } = await supabase
        .from('tarif_denda_history')
        .select('nominal_per_hari')
        .eq('tenant_id', tenantId)
        .order('berlaku_mulai_tanggal', { ascending: false })
        .limit(1)
        .single();

      if (tarifData) {
        setDendaPerHari(String(tarifData.nominal_per_hari || 500));
      }

      // 3. Members list
      const { data: memberData } = await supabase
        .from('tenant_member')
        .select(`
          id, user_id, role, penerus_user_id,
          app_user:user_id(id, email, nama)
        `)
        .eq('tenant_id', tenantId);

      if (memberData) {
        setMembers(memberData as any[]);
        const currentOwner = (memberData as any[]).find((m) => m.role === 'owner');
        if (currentOwner) {
          setSelectedSuccessor(currentOwner.penerus_user_id || null);
        }
      }
    } catch (e: any) {
      console.error(e);
      setSnackMsg('Gagal memuat data pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = async () => {
    await Clipboard.setStringAsync(tokenCode);
    setSnackMsg(`Token ${tokenCode} berhasil disalin`);
  };

  const handleGenerateNewToken = () => {
    if (!tenantId) return;
    Alert.alert(
      'Generate Token Baru',
      'Token pengunjung lama tidak akan bisa digunakan lagi setelah diperbarui. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await apiClient.tenant.refreshToken(tenantId, userRole || 'owner');
              const newToken = res.qr_code_value || '';
              const clean = newToken.replace(/^QR-/, '').slice(0, 6).toUpperCase();
              setTokenCode(clean);
              setQrCodeVal(newToken);
              setSnackMsg('Token pengunjung berhasil diperbarui');
            } catch (e: any) {
              console.error(e);
              setSnackMsg(e.message || 'Gagal generate token');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveRules = async () => {
    if (!tenantId) return;
    setRulesLoading(true);
    try {
      const parsedMaxBuku = parseInt(maxBuku) || 3;
      const parsedMaxHari = parseInt(maxHari) || 7;
      const parsedDenda = parseInt(dendaPerHari) || 500;

      // Update tenant
      await supabase
        .from('tenant')
        .update({
          batas_maksimal_peminjaman: parsedMaxBuku,
          maksimal_hari_pinjam: parsedMaxHari,
        })
        .eq('id', tenantId);

      // Update tarif denda history
      await apiClient.tenant.pengaturanTarifDenda(tenantId, parsedDenda);

      setSnackMsg('Aturan perpustakaan berhasil disimpan');
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal menyimpan aturan');
    } finally {
      setRulesLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!tenantId) return;
    if (!inviteEmail.trim()) {
      setSnackMsg('Masukkan email anggota yang diundang');
      return;
    }
    setInviting(true);
    try {
      await apiClient.tenant.memberInvite(
        tenantId,
        inviteEmail.trim(),
        inviteRole,
        userRole || 'owner'
      );
      setShowInviteModal(false);
      setInviteEmail('');
      loadSettings();
      setSnackMsg(`Undangan berhasil dikirim ke ${inviteEmail.trim()}`);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal mengundang anggota');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'staff') => {
    if (!tenantId) return;
    setActiveMemberMenuId(null);
    try {
      await apiClient.tenant.memberPromote(
        tenantId,
        memberId,
        newRole,
        userRole || 'owner'
      );
      loadSettings();
      setSnackMsg(`Peran berhasil diubah menjadi ${newRole.toUpperCase()}`);
    } catch (e: any) {
      console.error(e);
      setSnackMsg(e.message || 'Gagal mengubah peran');
    }
  };

  const handleRemoveMember = (member: MemberItem) => {
    if (!tenantId) return;
    setActiveMemberMenuId(null);
    Alert.alert(
      'Keluarkan Anggota',
      `Keluarkan ${member.app_user?.nama || member.app_user?.email || 'anggota'} dari perpustakaan ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluarkan',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.tenant.memberRemove(
                tenantId,
                member.id,
                userRole || 'owner',
                member.role
              );
              loadSettings();
              setSnackMsg('Anggota berhasil dikeluarkan');
            } catch (e: any) {
              console.error(e);
              setSnackMsg(e.message || 'Gagal mengeluarkan anggota');
            }
          },
        },
      ]
    );
  };

  const handleSaveSuccessor = async () => {
    if (!tenantId || !selectedSuccessor) return;
    try {
      await apiClient.tenant.ownerDesignateSuccessor(tenantId, selectedSuccessor);
      setShowSuccessorModal(false);
      setSnackMsg('Penerus kepemilikan berhasil disimpan');
    } catch (e: any) {
      console.error(e);
      setSnackMsg('Gagal menetapkan penerus');
    }
  };

  const handleDownloadQr = async () => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>QR Code - ${tenantNama}</title>
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; text-align: center; padding: 40px 20px; }
              .card { border: 2px solid #000; border-radius: 8px; padding: 30px; display: inline-block; width: 80%; max-width: 400px; }
              h1 { margin: 0 0 8px 0; font-size: 24px; }
              .token { font-family: monospace; font-size: 26px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; padding: 10px; border: 2px dashed #000; }
              .sub { color: #555; font-size: 12px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>${tenantNama || 'Azelheim'}</h1>
              <div class="sub">SCAN QR / MASUKKAN TOKEN PENGUNJUNG</div>
              <div class="token">${tokenCode}</div>
              <div class="sub">Tampilkan di meja resepsionis untuk pengunjung perpustakaan</div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      console.error(e);
      setSnackMsg('Gagal membagikan lembar QR');
    }
  };

  const handleKeluarPerpustakaan = () => {
    Alert.alert(
      'Keluar Perpustakaan',
      'Kembali ke halaman pemilihan perpustakaan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await clearLastActiveTenant();
            clearTenant();
            router.replace('/tenant-setup');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <AzelheimScreen extraBottomPadding={80}>
      <View style={styles.topNavRow}>
        <AzelheimIconButton
          icon={<ArrowLeft size={18} color={colors.text} />}
          onPress={() => router.back()}
          accessibilityLabel="Kembali"
        />
      </View>

      <AzelheimSectionHeader title="Pengaturan" code="CONF // 06" />

      {/* Card #1: Token Pengunjung */}
      <AzelheimCard style={{ marginBottom: 12 }}>
        <View style={styles.cardHead}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Token Pengunjung
            </Text>
            <Text style={[styles.cardSub, { color: colors.muted }]}>
              Kode akses publik untuk scan / input
            </Text>
          </View>
          <AzelheimBadge label="ACTIVE" variant="green" />
        </View>

        <AzelheimCodeBox code={tokenCode} style={{ marginTop: 10 }} />

        <View style={styles.buttonRow}>
          <AzelheimButton
            variant="light"
            title="Salin Token"
            icon={<Copy size={18} color={colors.text} />}
            onPress={handleCopyToken}
            style={{ flex: 1 }}
          />
          {!isStaff && (
            <AzelheimButton
              variant="purple"
              title="Generate Baru"
              icon={<RefreshCw size={18} color={colors.text} />}
              onPress={handleGenerateNewToken}
              style={{ flex: 1.2 }}
            />
          )}
        </View>

        <AzelheimButton
          variant="dark"
          title="QR Code Perpustakaan"
          icon={<QrCode size={18} color={colors.bg} />}
          onPress={() => setShowQrModal(true)}
          fullWidth
          style={{ marginTop: 8 }}
        />
      </AzelheimCard>

      {/* Card #2: Anggota & Peran */}
      <AzelheimCard style={{ marginBottom: 12 }}>
        <View style={styles.cardHead}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Anggota & Peran
            </Text>
            <Text style={[styles.cardSub, { color: colors.muted }]}>
              Kelola staf dan hak akses
            </Text>
          </View>
          <AzelheimBadge label={`${members.length} USER`} variant="gray" />
        </View>

        <View style={{ marginTop: 8 }}>
          {members.map((m, idx) => {
            const isMemberOwner = m.role === 'owner';
            const isMemberAdmin = m.role === 'admin';

            return (
              <View
                key={m.id}
                style={[
                  styles.memberRow,
                  {
                    borderBottomColor: colors.line,
                    borderBottomWidth: idx === members.length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>
                    {m.app_user?.nama || 'User'}
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.muted }]}>
                    {m.app_user?.email || '-'} · {m.role.toUpperCase()}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AzelheimBadge
                    label={m.role.toUpperCase()}
                    variant={isMemberOwner ? 'green' : isMemberAdmin ? 'blue' : 'gray'}
                  />

                  {/* Owner Controls */}
                  {isOwner && !isMemberOwner && (
                    <Menu
                      visible={activeMemberMenuId === m.id}
                      onDismiss={() => setActiveMemberMenuId(null)}
                      anchor={
                        <TouchableOpacity
                          onPress={() => setActiveMemberMenuId(m.id)}
                          style={{ padding: 4 }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MoreVertical size={18} color={colors.text} />
                        </TouchableOpacity>
                      }
                    >
                      {isMemberAdmin ? (
                        <Menu.Item
                          onPress={() => handleChangeRole(m.id, 'staff')}
                          title="Ubah ke Staff"
                        />
                      ) : (
                        <Menu.Item
                          onPress={() => handleChangeRole(m.id, 'admin')}
                          title="Promosikan ke Admin"
                        />
                      )}
                      <Menu.Item
                        onPress={() => handleRemoveMember(m)}
                        title="Keluarkan dari Perpustakaan"
                        titleStyle={{ color: colors.danger }}
                      />
                    </Menu>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {!isStaff && (
          <AzelheimButton
            variant="light"
            title="Undang Member"
            icon={<UserPlus size={18} color={colors.text} />}
            onPress={() => setShowInviteModal(true)}
            fullWidth
            style={{ marginTop: 10 }}
          />
        )}

        {isOwner && (
          <AzelheimButton
            variant="ghost"
            title={`Penerus Suksesi: ${
              members.find((m) => m.user_id === selectedSuccessor)?.app_user?.nama || 'Belum Ditunjuk'
            }`}
            onPress={() => setShowSuccessorModal(true)}
            fullWidth
            style={{ marginTop: 6 }}
          />
        )}
      </AzelheimCard>

      {/* Card #3: Aturan Peminjaman */}
      <AzelheimCard style={{ marginBottom: 16 }}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Aturan Peminjaman
        </Text>
        <Text style={[styles.cardSub, { color: colors.muted, marginBottom: 12 }]}>
          Konfigurasi limit dan tarif denda
        </Text>

        <AzelheimInput
          label="Batas Maksimal Buku / Anggota"
          value={maxBuku}
          onChangeText={setMaxBuku}
          keyboardType="number-pad"
          editable={!isStaff}
          mono
        />

        <AzelheimInput
          label="Maksimal Hari Pinjam"
          value={maxHari}
          onChangeText={setMaxHari}
          keyboardType="number-pad"
          editable={!isStaff}
          mono
        />

        <AzelheimInput
          label="Nominal Denda / Hari (Rp)"
          value={dendaPerHari}
          onChangeText={setDendaPerHari}
          keyboardType="number-pad"
          editable={!isStaff}
          mono
        />

        {!isStaff && (
          <AzelheimButton
            variant="dark"
            title="Simpan Aturan"
            onPress={handleSaveRules}
            loading={rulesLoading}
            disabled={rulesLoading}
            fullWidth
            style={{ marginTop: 4 }}
          />
        )}
      </AzelheimCard>

      {/* Keluar Perpustakaan Button */}
      <AzelheimButton
        variant="red"
        title="Keluar Perpustakaan"
        icon={<Power size={18} color={colors.danger} />}
        onPress={handleKeluarPerpustakaan}
        fullWidth
        style={{ marginBottom: 20 }}
      />

      {/* QR Modal Dialog */}
      <AzelheimDialog
        visible={showQrModal}
        onDismiss={() => setShowQrModal(false)}
        title="QR Perpustakaan"
        code="TENANT // QR"
      >
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View
            style={[
              styles.qrCanvas,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <QrCode size={120} color={colors.text} />
          </View>

          <Text style={[styles.dialogTenantName, { color: colors.text }]}>
            {tenantNama || 'Perpustakaan'}
          </Text>

          <AzelheimCodeBox code={tokenCode} style={{ marginVertical: 8, width: '100%' }} />

          <Text style={[styles.qrDialogSub, { color: colors.muted }]}>
            Tampilkan atau cetak QR ini di meja pengunjung untuk akses katalog tanpa login.
          </Text>

          <AzelheimButton
            variant="dark"
            title="Simpan / Cetak Lembar QR"
            icon={<Download size={18} color={colors.bg} />}
            onPress={handleDownloadQr}
            fullWidth
            style={{ marginTop: 14 }}
          />
        </View>
      </AzelheimDialog>

      {/* Invite Member Dialog */}
      <AzelheimDialog
        visible={showInviteModal}
        onDismiss={() => setShowInviteModal(false)}
        title="Undang Member"
        code="MEMBER // INVITE"
      >
        <AzelheimInput
          label="Email Anggota *"
          placeholder="nama@email.com"
          value={inviteEmail}
          onChangeText={setInviteEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 4 }]}>
          PERAN DITAWARKAN
        </Text>
        <Menu
          visible={inviteRoleMenu}
          onDismiss={() => setInviteRoleMenu(false)}
          anchor={
            <TouchableOpacity
              onPress={() => setInviteRoleMenu(true)}
              style={[
                styles.roleSelectBox,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.roleSelectText, { color: colors.text }]}>
                {inviteRole.toUpperCase()}
              </Text>
            </TouchableOpacity>
          }
        >
          <Menu.Item
            onPress={() => {
              setInviteRole('staff');
              setInviteRoleMenu(false);
            }}
            title="STAFF (Read-only)"
          />
          {isOwner && (
            <Menu.Item
              onPress={() => {
                setInviteRole('admin');
                setInviteRoleMenu(false);
              }}
              title="ADMIN (Full Access)"
            />
          )}
        </Menu>

        <View style={[styles.buttonRow, { marginTop: 14 }]}>
          <AzelheimButton
            variant="light"
            title="Batal"
            onPress={() => setShowInviteModal(false)}
            style={{ flex: 1 }}
          />
          <AzelheimButton
            variant="dark"
            title="Kirim Undangan"
            onPress={handleInviteMember}
            loading={inviting}
            disabled={inviting}
            style={{ flex: 1.5 }}
          />
        </View>
      </AzelheimDialog>

      {/* Successor Dialog */}
      <AzelheimDialog
        visible={showSuccessorModal}
        onDismiss={() => setShowSuccessorModal(false)}
        title="Tunjuk Penerus Owner"
        code="OWNER // SUCCESSION"
        subtitle="Jika Anda tidak aktif lebih dari 30 hari, otoritas Owner akan dialihkan ke anggota ini:"
      >
        <ScrollView style={{ maxHeight: 240, marginVertical: 8 }}>
          {members
            .filter((m) => m.role !== 'owner')
            .map((m) => (
              <TouchableOpacity
                key={m.user_id}
                onPress={() => setSelectedSuccessor(m.user_id)}
                style={[
                  styles.successorItem,
                  {
                    borderColor:
                      selectedSuccessor === m.user_id ? colors.purple : colors.line,
                    backgroundColor:
                      selectedSuccessor === m.user_id ? colors.surface : colors.card,
                  },
                ]}
              >
                <Text style={[styles.itemTitle, { color: colors.text }]}>
                  {m.app_user?.nama || 'User'}
                </Text>
                <Text style={[styles.itemSub, { color: colors.muted }]}>
                  {m.app_user?.email} · {m.role.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>

        <View style={styles.buttonRow}>
          <AzelheimButton
            variant="light"
            title="Batal"
            onPress={() => setShowSuccessorModal(false)}
            style={{ flex: 1 }}
          />
          <AzelheimButton
            variant="dark"
            title="Simpan Penerus"
            onPress={handleSaveSuccessor}
            style={{ flex: 1.5 }}
          />
        </View>
      </AzelheimDialog>

      <AzelheimToast
        visible={!!snackMsg}
        message={snackMsg}
        onDismiss={() => setSnackMsg('')}
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
  topNavRow: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 10.5,
    marginTop: 2,
    lineHeight: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  fieldLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  roleSelectBox: {
    height: 42,
    borderWidth: 1.2,
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  roleSelectText: {
    fontSize: 12,
    fontWeight: '700',
  },
  qrCanvas: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogTenantName: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  qrDialogSub: {
    fontSize: 10.5,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 10,
  },
  successorItem: {
    borderWidth: 1.2,
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
});
