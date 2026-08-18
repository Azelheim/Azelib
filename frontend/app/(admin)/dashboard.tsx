import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, SegmentedButtons, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { apiClient } from '../../lib/api/apiClient';
import { CartesianChart, Line } from 'victory-native';
import { useTenant } from '../../lib/context/TenantContext';
import { supabase } from '../../lib/supabase';

interface ChartPoint {
  [key: string]: any;
  day: number;
  label: string;
  value: number;
}

export default function Dashboard() {
  const { tenantId } = useTenant();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [snackMsg, setSnackMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const [chartContext, setChartContext] = useState<'buku' | 'peminjam' | 'denda'>('buku');
  const [chartPeriod, setChartPeriod] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [rawLoans, setRawLoans] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (tenantId) {
        loadData();
      } else {
        setLoading(false);
      }
    }, [tenantId])
  );

  const loadData = async () => {
    if (!tenantId) return;
    try {
      const [summaryData, loansRes, tarifRes] = await Promise.all([
        apiClient.dashboard.summary(tenantId),
        supabase
          .from('peminjaman')
          .select('id, anggota_id, tanggal_pinjam, jatuh_tempo, tanggal_kembali, status, peminjaman_detail(salinan_id)')
          .eq('tenant_id', tenantId),
        supabase
          .from('tarif_denda_history')
          .select('nominal_per_hari')
          .eq('tenant_id', tenantId)
          .order('berlaku_mulai_tanggal', { ascending: false })
          .limit(1)
          .single()
      ]);

      setSummary(summaryData);
      setRawLoans(loansRes.data || []);
    } catch (e: any) {
      console.error('Failed to load dashboard:', e);
      setSnackMsg('Gagal memuat data dashboard');
      setVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Generate real chart data points based on period and context
  const chartData = useMemo<ChartPoint[]>(() => {
    const today = new Date();
    const result: ChartPoint[] = [];

    if (chartPeriod === 'harian') {
      // 7 hari terakhir (H-6 s/d Hari ini)
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;

        let val = 0;
        const matchingLoans = rawLoans.filter(l => l.tanggal_pinjam === dateStr);

        if (chartContext === 'buku') {
          matchingLoans.forEach(l => {
            val += (l.peminjaman_detail || []).length;
          });
        } else if (chartContext === 'peminjam') {
          val = matchingLoans.length;
        } else if (chartContext === 'denda') {
          // Hitung denda pada hari tersebut untuk pinjaman yang terlambat
          matchingLoans.forEach(l => {
            if (l.status === 'aktif' && l.jatuh_tempo < dateStr) {
              const daysLate = Math.max(0, Math.floor((new Date(dateStr).getTime() - new Date(l.jatuh_tempo).getTime()) / (1000 * 60 * 60 * 24)));
              val += daysLate * 500;
            }
          });
        }

        result.push({ day: 7 - i, label: dayLabel, value: val });
      }
    } else if (chartPeriod === 'mingguan') {
      // 4 minggu terakhir (masing-masing 7 hari)
      for (let i = 3; i >= 0; i--) {
        const endD = new Date(today);
        endD.setDate(today.getDate() - (i * 7));
        const startD = new Date(endD);
        startD.setDate(endD.getDate() - 6);

        const startStr = startD.toISOString().split('T')[0];
        const endStr = endD.toISOString().split('T')[0];
        const weekLabel = `Mgg ${4 - i}`;

        let val = 0;
        const matchingLoans = rawLoans.filter(l => l.tanggal_pinjam >= startStr && l.tanggal_pinjam <= endStr);

        if (chartContext === 'buku') {
          matchingLoans.forEach(l => {
            val += (l.peminjaman_detail || []).length;
          });
        } else if (chartContext === 'peminjam') {
          val = matchingLoans.length;
        } else if (chartContext === 'denda') {
          matchingLoans.forEach(l => {
            if (l.status === 'aktif' && l.jatuh_tempo < endStr) {
              const daysLate = Math.max(0, Math.floor((new Date(endStr).getTime() - new Date(l.jatuh_tempo).getTime()) / (1000 * 60 * 60 * 24)));
              val += daysLate * 500;
            }
          });
        }

        result.push({ day: 4 - i, label: weekLabel, value: val });
      }
    } else {
      // 6 bulan terakhir
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthYearStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const monthLabel = monthNames[d.getMonth()];

        let val = 0;
        const matchingLoans = rawLoans.filter(l => (l.tanggal_pinjam || '').startsWith(monthYearStr));

        if (chartContext === 'buku') {
          matchingLoans.forEach(l => {
            val += (l.peminjaman_detail || []).length;
          });
        } else if (chartContext === 'peminjam') {
          val = matchingLoans.length;
        } else if (chartContext === 'denda') {
          matchingLoans.forEach(l => {
            if (l.status === 'aktif') {
              const daysLate = Math.max(0, Math.floor((today.getTime() - new Date(l.jatuh_tempo).getTime()) / (1000 * 60 * 60 * 24)));
              val += daysLate * 500;
            }
          });
        }

        result.push({ day: 6 - i, label: monthLabel, value: val });
      }
    }

    return result;
  }, [rawLoans, chartContext, chartPeriod]);

  const isChartEmpty = useMemo(() => {
    return chartData.every(p => p.value === 0);
  }, [chartData]);

  if (loading || !summary) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>Ringkasan Perpustakaan</Text>

      {/* 4 Card Kecil */}
      <View style={styles.grid}>
        <Card style={styles.smallCard} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium">Jumlah Buku</Text>
            <Text variant="headlineMedium" style={styles.value}>{summary.jumlah_buku}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.smallCard} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium">Peminjam</Text>
            <Text variant="headlineMedium" style={styles.value}>{summary.peminjam_aktif}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.smallCard} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium">Buku Dipinjam</Text>
            <Text variant="headlineMedium" style={styles.value}>{summary.buku_dipinjam}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.smallCard} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium">Buku Terlambat</Text>
            <Text variant="headlineMedium" style={[styles.value, { color: '#D32F2F' }]}>{summary.buku_terlambat}</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Card Lebar #2: Total Denda */}
      <Card style={styles.wideCard} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium">Total Denda Periode Ini</Text>
          <Text variant="displaySmall" style={styles.dendaValue}>Rp {summary.total_denda_periode.toLocaleString('id-ID')}</Text>
        </Card.Content>
      </Card>

      {/* Card Lebar #1: Line Chart */}
      <Card style={styles.chartCard} mode="outlined">
        <Card.Content>
          <View style={styles.chartHeader}>
            <Text variant="titleMedium">Tren Aktivitas</Text>
            <SegmentedButtons
              value={chartContext}
              onValueChange={val => setChartContext(val as any)}
              buttons={[
                { value: 'buku', label: 'Buku' },
                { value: 'peminjam', label: 'Peminjam' },
                { value: 'denda', label: 'Denda' },
              ]}
              style={styles.contextButtons}
            />
          </View>

          {/* Period Selector */}
          <View style={styles.periodRow}>
            <SegmentedButtons
              value={chartPeriod}
              onValueChange={val => setChartPeriod(val as any)}
              buttons={[
                { value: 'harian', label: 'Harian' },
                { value: 'mingguan', label: 'Mingguan' },
                { value: 'bulanan', label: 'Bulanan' },
              ]}
              density="small"
              style={styles.periodButtons}
            />
          </View>

          {/* Chart View */}
          <View style={styles.chartWrapper}>
            <CartesianChart data={chartData} xKey="day" yKeys={["value"] as const}>
              {({ points }) => (
                <Line points={points.value} color="#000000" strokeWidth={2.5} />
              )}
            </CartesianChart>
          </View>

          {/* X Axis Labels */}
          <View style={styles.labelRow}>
            {chartData.map((item, idx) => (
              <Text key={idx} variant="labelSmall" style={styles.axisLabel}>
                {item.label}
              </Text>
            ))}
          </View>

          {isChartEmpty && (
            <Text variant="bodySmall" style={styles.emptyNote}>
              Belum ada aktivitas {chartContext} pada periode ini.
            </Text>
          )}
        </Card.Content>
      </Card>

      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
      >
        {snackMsg}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  smallCard: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  value: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  wideCard: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  dendaValue: {
    fontWeight: 'bold',
    color: '#D32F2F',
    marginTop: 8,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  contextButtons: {
    width: 240,
  },
  periodRow: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  periodButtons: {
    width: 240,
  },
  chartWrapper: {
    height: 200,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  axisLabel: {
    color: '#666666',
    fontSize: 10,
    textAlign: 'center',
  },
  emptyNote: {
    textAlign: 'center',
    color: '#888888',
    marginTop: 8,
    fontStyle: 'italic',
  }
});

