import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, SegmentedButtons, ActivityIndicator, Snackbar } from 'react-native-paper';
import { apiClient } from '../../lib/api/apiClient';
import { DashboardSummary } from '../../lib/types';
import { CartesianChart, Line } from 'victory-native';
import { useTenant } from '../../lib/context/TenantContext';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const { tenantId } = useTenant();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [snackMsg, setSnackMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const [chartContext, setChartContext] = useState('buku');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!tenantId) { setLoading(false); return; }
    try {
      const data = await apiClient.dashboard.summary(tenantId);
      setSummary(data);
    } catch (e: any) {
      console.error('API failed, fallback to direct query:', e);
      // Fallback: query Supabase directly
      try {
        const today = new Date().toISOString().split('T')[0];
        const [bukuRes, pinjamRes, terlambatRes] = await Promise.all([
          supabase.from('buku').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('dihapus', false),
          supabase.from('peminjaman').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'aktif'),
          supabase.from('peminjaman').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'aktif').lt('jatuh_tempo', today),
        ]);
        setSummary({
          jumlah_buku: bukuRes.count || 0,
          peminjam_aktif: pinjamRes.count || 0,
          buku_dipinjam: pinjamRes.count || 0,
          buku_terlambat: terlambatRes.count || 0,
          total_denda_periode: 0,
        });
      } catch (fallbackErr) {
        console.error(fallbackErr);
        setSummary({ jumlah_buku: 0, peminjam_aktif: 0, buku_dipinjam: 0, buku_terlambat: 0, total_denda_periode: 0 });
        setSnackMsg('Gagal memuat dashboard');
        setVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const chartData = Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    value: Math.floor(Math.random() * 100) + 10,
  }));

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
              onValueChange={setChartContext}
              buttons={[
                { value: 'buku', label: 'Buku' },
                { value: 'peminjam', label: 'Peminjam' },
                { value: 'denda', label: 'Denda' },
              ]}
              style={{ width: 250 }}
            />
          </View>
          <View style={styles.chartWrapper}>
            <CartesianChart data={chartData} xKey="day" yKeys={["value"]}>
              {({ points }) => (
                <Line points={points.value} color="#000000" strokeWidth={3} />
              )}
            </CartesianChart>
          </View>
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
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  chartWrapper: {
    height: 250,
  }
});
