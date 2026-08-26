import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { FileDown, Share2, Printer } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../lib/api/apiClient';
import { useTenant } from '../../lib/context/TenantContext';
import { useAzelheimTheme } from '../../lib/theme';
import {
  AzelheimScreen,
  AzelheimSectionHeader,
  AzelheimCard,
  AzelheimButton,
  AzelheimBadge,
  AzelheimMetaBox,
  AzelheimInput,
  AzelheimTabs,
  AzelheimDialog,
  AzelheimToast,
} from '../../lib/components/azelheim';

export default function Laporan() {
  const { colors } = useAzelheimTheme();
  const { tenantId, tenantNama } = useTenant();
  const [tab, setTab] = useState<'peminjaman' | 'denda' | 'buku'>('peminjaman');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  // Date Range Filter
  const [preset, setPreset] = useState<'bulan_ini' | 'bulan_lalu' | 'tahun_ini' | 'kustom'>('bulan_ini');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Loaded report data
  const [reportData, setReportData] = useState<any>(null);

  // PDF Export Dialog State
  const [showExportModal, setShowExportModal] = useState(false);
  const [generatedPdfUri, setGeneratedPdfUri] = useState<string | null>(null);

  useEffect(() => {
    applyPreset('bulan_ini');
  }, []);

  useEffect(() => {
    if (tenantId && startDate && endDate) {
      loadReport();
    }
  }, [tenantId, tab, startDate, endDate]);

  const applyPreset = (p: 'bulan_ini' | 'bulan_lalu' | 'tahun_ini' | 'kustom') => {
    setPreset(p);
    const today = new Date();
    if (p === 'bulan_ini') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (p === 'bulan_lalu') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (p === 'tahun_ini') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const lastDay = new Date(today.getFullYear(), 11, 31);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    }
  };

  const loadReport = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let data = null;
      try {
        data = await apiClient.laporan.export(tenantId, tab, startDate, endDate);
      } catch {
        if (tab === 'peminjaman') {
          const { data: items } = await supabase
            .from('peminjaman')
            .select(`
              id, tanggal_pinjam, jatuh_tempo, status,
              anggota:anggota_id(nama),
              peminjaman_detail(
                salinan(buku(judul))
              )
            `)
            .eq('tenant_id', tenantId)
            .gte('tanggal_pinjam', startDate)
            .lte('tanggal_pinjam', endDate);

          const formattedItems = (items || []).map((i: any) => ({
            tanggal_pinjam: i.tanggal_pinjam,
            nama_anggota: i.anggota?.nama || 'Anggota',
            judul_buku: i.peminjaman_detail?.[0]?.salinan?.buku?.judul || 'Buku',
            jatuh_tempo: i.jatuh_tempo,
            status: i.status,
          }));

          data = {
            total_peminjaman: formattedItems.length,
            dikembalikan: formattedItems.filter((i) => i.status === 'dikembalikan').length,
            terlambat: formattedItems.filter((i) => i.status === 'aktif' && i.jatuh_tempo < new Date().toISOString().split('T')[0]).length,
            items: formattedItems,
          };
        } else if (tab === 'denda') {
          const { data: items } = await supabase
            .from('peminjaman')
            .select(`
              id, tanggal_kembali, jatuh_tempo, biaya_penggantian, status,
              anggota:anggota_id(nama),
              peminjaman_detail(
                salinan(buku(judul))
              )
            `)
            .eq('tenant_id', tenantId)
            .gte('tanggal_pinjam', startDate)
            .lte('tanggal_pinjam', endDate);

          const dendaItems: any[] = [];
          let totalDenda = 0;

          (items || []).forEach((i: any) => {
            if (i.status === 'dikembalikan' && i.tanggal_kembali && i.tanggal_kembali > i.jatuh_tempo) {
              const diffMs = new Date(i.tanggal_kembali).getTime() - new Date(i.jatuh_tempo).getTime();
              const daysLate = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
              const nominal = daysLate * 500;
              totalDenda += nominal;
              dendaItems.push({
                tanggal_transaksi: i.tanggal_kembali,
                nama_anggota: i.anggota?.nama || 'Anggota',
                judul_buku: i.peminjaman_detail?.[0]?.salinan?.buku?.judul || 'Buku',
                hari_terlambat: daysLate,
                nominal,
              });
            }
          });

          data = {
            total_denda: totalDenda,
            total_transaksi_denda: dendaItems.length,
            items: dendaItems,
          };
        } else if (tab === 'buku') {
          const { data: books } = await supabase
            .from('buku')
            .select(`
              id, judul, penulis,
              kategori:kategori_id(nama),
              rak:rak_id(nama),
              salinan(id, status)
            `)
            .eq('tenant_id', tenantId)
            .eq('dihapus', false);

          let totalSalinan = 0;
          let totalTersedia = 0;

          const formattedBooks = (books || []).map((b: any) => {
            const salinan = b.salinan || [];
            const tersedia = salinan.filter((s: any) => s.status === 'tersedia').length;
            totalSalinan += salinan.length;
            totalTersedia += tersedia;
            return {
              judul: b.judul,
              penulis: b.penulis || '-',
              kategori: b.kategori?.nama || '-',
              rak: b.rak?.nama || '-',
              jumlah_salinan: salinan.length,
              tersedia,
            };
          });

          data = {
            total_judul: formattedBooks.length,
            total_salinan: totalSalinan,
            total_tersedia: totalTersedia,
            items: formattedBooks,
          };
        }
      }
      setReportData(data);
    } catch (e: any) {
      console.error('Error loading report:', e);
      setSnackMsg(e.message || 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  const generateReportHtml = () => {
    const titleMap: Record<string, string> = {
      peminjaman: 'Laporan Peminjaman',
      denda: 'Laporan Denda',
      buku: 'Laporan Koleksi & Mutasi Buku',
    };
    const reportTitle = titleMap[tab];

    let contentHtml = '';
    if (tab === 'peminjaman') {
      const items = reportData?.items || [];
      const rows = items
        .map(
          (i: any) => `
        <tr>
          <td>${i.tanggal_pinjam || '-'}</td>
          <td>${i.nama_anggota || '-'}</td>
          <td>${i.judul_buku || '-'}</td>
          <td>${i.jatuh_tempo || '-'}</td>
          <td>${(i.status || '').toUpperCase()}</td>
        </tr>
      `
        )
        .join('');

      contentHtml = `
        <div class="summary-box">
          <p><strong>Total Peminjaman:</strong> ${reportData?.total_peminjaman ?? 0}</p>
          <p><strong>Buku Dikembalikan:</strong> ${reportData?.dikembalikan ?? 0}</p>
          <p><strong>Buku Terlambat:</strong> ${reportData?.terlambat ?? 0}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tgl Pinjam</th>
              <th>Peminjam</th>
              <th>Judul Buku</th>
              <th>Jatuh Tempo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center;">Tidak ada transaksi</td></tr>'}
          </tbody>
        </table>
      `;
    } else if (tab === 'denda') {
      const items = reportData?.items || [];
      const rows = items
        .map(
          (i: any) => `
        <tr>
          <td>${i.tanggal_transaksi || '-'}</td>
          <td>${i.nama_anggota || '-'}</td>
          <td>${i.judul_buku || '-'}</td>
          <td>${i.hari_terlambat || 0} hari</td>
          <td style="text-align: right;">Rp ${(i.nominal || 0).toLocaleString('id-ID')}</td>
        </tr>
      `
        )
        .join('');

      contentHtml = `
        <div class="summary-box">
          <p><strong>Total Denda Terkumpul:</strong> Rp ${(reportData?.total_denda ?? 0).toLocaleString('id-ID')}</p>
          <p><strong>Total Transaksi Kena Denda:</strong> ${reportData?.total_transaksi_denda ?? 0}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Peminjam</th>
              <th>Buku</th>
              <th>Keterlambatan</th>
              <th style="text-align: right;">Nominal</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center;">Tidak ada transaksi denda</td></tr>'}
          </tbody>
        </table>
      `;
    } else if (tab === 'buku') {
      const items = reportData?.items || [];
      const rows = items
        .map(
          (i: any) => `
        <tr>
          <td>${i.judul || '-'}</td>
          <td>${i.penulis || '-'}</td>
          <td>${i.kategori || '-'}</td>
          <td>${i.rak || '-'}</td>
          <td style="text-align: center;">${i.jumlah_salinan || 0}</td>
          <td style="text-align: center;">${i.tersedia || 0}</td>
        </tr>
      `
        )
        .join('');

      contentHtml = `
        <div class="summary-box">
          <p><strong>Total Judul Buku:</strong> ${reportData?.total_judul ?? 0}</p>
          <p><strong>Total Eksemplar:</strong> ${reportData?.total_salinan ?? 0}</p>
          <p><strong>Salinan Tersedia:</strong> ${reportData?.total_tersedia ?? 0}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Judul</th>
              <th>Penulis</th>
              <th>Kategori</th>
              <th>Rak</th>
              <th style="text-align: center;">Total</th>
              <th style="text-align: center;">Tersedia</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="6" style="text-align:center;">Tidak ada data buku</td></tr>'}
          </tbody>
        </table>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${reportTitle}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; color: #1C1917; }
            .header { border-bottom: 2px solid #1C1917; padding-bottom: 12px; margin-bottom: 20px; }
            .tenant-name { font-size: 20px; font-weight: 800; }
            .report-title { font-size: 16px; font-weight: bold; margin-top: 4px; color: #44403C; }
            .period { font-size: 12px; color: #78716C; margin-top: 4px; font-family: monospace; }
            .summary-box { background-color: #F5F5F4; border: 1px solid #E7E5E4; border-radius: 4px; padding: 12px; margin-bottom: 20px; display: flex; gap: 24px; }
            .summary-box p { margin: 0; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            th, td { border: 1px solid #E7E5E4; padding: 8px 10px; text-align: left; }
            th { background-color: #FAFAF9; font-weight: 700; font-family: monospace; font-size: 11px; text-transform: uppercase; }
            .footer { margin-top: 30px; font-size: 10px; color: #A8A29E; text-align: right; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="tenant-name">${tenantNama || 'Azelheim Library'}</div>
            <div class="report-title">${reportTitle}</div>
            <div class="period">PERIODE: ${startDate} s/d ${endDate}</div>
          </div>
          ${contentHtml}
          <div class="footer">Dicetak otomatis dari Sistem Azelheim · ${new Date().toLocaleString('id-ID')}</div>
        </body>
      </html>
    `;
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const html = generateReportHtml();
      const { uri } = await Print.printToFileAsync({ html });
      setGeneratedPdfUri(uri);
      setShowExportModal(true);
    } catch (e: any) {
      console.error(e);
      setSnackMsg('Gagal menghasilkan file PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleSharePdf = async () => {
    if (!generatedPdfUri) return;
    try {
      await Sharing.shareAsync(generatedPdfUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
      setShowExportModal(false);
    } catch (e: any) {
      console.error(e);
      setSnackMsg('Gagal membagikan PDF');
    }
  };

  const handleDirectPrint = async () => {
    if (!generatedPdfUri) return;
    try {
      await Print.printAsync({ uri: generatedPdfUri });
      setShowExportModal(false);
    } catch (e: any) {
      console.error(e);
      setSnackMsg('Gagal mencetak dokumen');
    }
  };

  return (
    <AzelheimScreen extraBottomPadding={80}>
      <AzelheimSectionHeader title="Laporan" code="REP // 05" />

      {/* Tabs */}
      <AzelheimTabs<'peminjaman' | 'denda' | 'buku'>
        tabs={[
          { value: 'peminjaman', label: 'Peminjaman' },
          { value: 'denda', label: 'Denda' },
          { value: 'buku', label: 'Buku' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
      />

      {/* Period Filter Card */}
      <AzelheimCard style={{ marginBottom: 12 }}>
        <View style={styles.cardHead}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.muted }]}>FILTER PERIODE</Text>
            <Text style={[styles.cardTitle, { color: colors.text, marginTop: 4 }]}>
              {startDate} – {endDate}
            </Text>
          </View>
          <AzelheimBadge label={preset.toUpperCase()} variant="gray" />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillScrollContent}
          style={styles.pillScrollView}
        >
          <TouchableOpacity
            onPress={() => applyPreset('bulan_ini')}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <AzelheimBadge label="Bulan Ini" variant={preset === 'bulan_ini' ? 'purple' : 'gray'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => applyPreset('bulan_lalu')}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <AzelheimBadge label="Bulan Lalu" variant={preset === 'bulan_lalu' ? 'purple' : 'gray'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => applyPreset('tahun_ini')}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <AzelheimBadge label="Tahun Ini" variant={preset === 'tahun_ini' ? 'purple' : 'gray'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPreset('kustom')}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <AzelheimBadge label="Kustom" variant={preset === 'kustom' ? 'purple' : 'gray'} />
          </TouchableOpacity>
        </ScrollView>

        {preset === 'kustom' && (
          <View style={styles.dateInputsRow}>
            <AzelheimInput
              label="Tanggal Mulai"
              placeholder="YYYY-MM-DD"
              value={startDate}
              onChangeText={setStartDate}
              mono
              containerStyle={{ flex: 1 }}
            />
            <AzelheimInput
              label="Tanggal Selesai"
              placeholder="YYYY-MM-DD"
              value={endDate}
              onChangeText={setEndDate}
              mono
              containerStyle={{ flex: 1 }}
            />
          </View>
        )}
      </AzelheimCard>

      {/* Summary & Metrics Card */}
      <AzelheimCard style={{ marginBottom: 16 }}>
        <View style={styles.cardHead}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Ringkasan {tab === 'peminjaman' ? 'Peminjaman' : tab === 'denda' ? 'Denda' : 'Koleksi Buku'}
            </Text>
            <Text style={[styles.cardSub, { color: colors.muted }]}>
              Total aktivitas perpustakaan pada periode terpilih
            </Text>
          </View>
          <AzelheimBadge label={loading ? 'LOADING' : 'READY'} variant={loading ? 'amber' : 'green'} />
        </View>

        {loading ? (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator size="small" color={colors.text} />
          </View>
        ) : tab === 'peminjaman' ? (
          <>
            <AzelheimMetaBox
              leftText="TOTAL TRANSAKSI"
              rightText={String(reportData?.total_peminjaman ?? 0)}
              style={{ marginTop: 10 }}
            />
            <AzelheimMetaBox
              leftText="DIKEMBALIKAN"
              rightText={String(reportData?.dikembalikan ?? 0)}
              style={{ marginTop: 6 }}
            />
            <AzelheimMetaBox
              leftText="TERLAMBAT"
              rightText={String(reportData?.terlambat ?? 0)}
              style={{ marginTop: 6 }}
            />
          </>
        ) : tab === 'denda' ? (
          <>
            <AzelheimMetaBox
              leftText="TOTAL DENDA"
              rightText={`Rp ${(reportData?.total_denda ?? 0).toLocaleString('id-ID')}`}
              style={{ marginTop: 10 }}
            />
            <AzelheimMetaBox
              leftText="TRANSAKSI TERKENA DENDA"
              rightText={String(reportData?.total_transaksi_denda ?? 0)}
              style={{ marginTop: 6 }}
            />
          </>
        ) : (
          <>
            <AzelheimMetaBox
              leftText="TOTAL JUDUL BUKU"
              rightText={String(reportData?.total_judul ?? 0)}
              style={{ marginTop: 10 }}
            />
            <AzelheimMetaBox
              leftText="TOTAL EKSEMPLAR"
              rightText={String(reportData?.total_salinan ?? 0)}
              style={{ marginTop: 6 }}
            />
            <AzelheimMetaBox
              leftText="SALINAN TERSEDIA"
              rightText={String(reportData?.total_tersedia ?? 0)}
              style={{ marginTop: 6 }}
            />
          </>
        )}

        <AzelheimButton
          variant="dark"
          title="Export PDF"
          icon={<FileDown size={18} color={colors.bg} />}
          onPress={handleExportPdf}
          loading={exporting}
          disabled={exporting || loading}
          fullWidth
          style={{ marginTop: 14 }}
        />
      </AzelheimCard>

      {/* PDF Export Decision Dialog */}
      <AzelheimDialog
        visible={showExportModal}
        onDismiss={() => setShowExportModal(false)}
        title="Export PDF"
        code="REP // EXPORT"
        subtitle={`Berkas PDF Laporan ${tab.toUpperCase()} telah siap:`}
      >
        <AzelheimButton
          variant="dark"
          title="Simpan / Bagikan PDF"
          icon={<Share2 size={18} color={colors.bg} />}
          onPress={handleSharePdf}
          fullWidth
          style={{ marginBottom: 8 }}
        />

        <AzelheimButton
          variant="light"
          title="Cetak Langsung (Print)"
          icon={<Printer size={18} color={colors.text} />}
          onPress={handleDirectPrint}
          fullWidth
          style={{ marginBottom: 12 }}
        />

        <AzelheimButton
          variant="ghost"
          title="Tutup"
          onPress={() => setShowExportModal(false)}
          fullWidth
        />
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
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  eyebrow: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.8,
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
  pillScrollView: {
    marginTop: 10,
    maxHeight: 36,
  },
  pillScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
});
