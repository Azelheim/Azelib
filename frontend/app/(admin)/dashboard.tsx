import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity, Animated } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Activity } from 'lucide-react-native';
import { CartesianChart, Line } from 'victory-native';
import { apiClient } from '../../lib/api/apiClient';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/context/TenantContext';
import { useAzelheimTheme } from '../../lib/theme';
import {
  AzelheimScreen,
  AzelheimSectionHeader,
  AzelheimCard,
  AzelheimBadge,
  AzelheimTabs,
  AzelheimStatCard,
  AzelheimToast,
} from '../../lib/components/azelheim';

interface ChartPoint {
  [key: string]: any;
  day: number;
  label: string;
  value: number;
}

export default function Dashboard() {
  const { colors } = useAzelheimTheme();
  const { tenantId } = useTenant();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [snackMsg, setSnackMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const [chartContext, setChartContext] = useState<'buku' | 'peminjam' | 'denda'>('buku');
  const [chartPeriod, setChartPeriod] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [rawLoans, setRawLoans] = useState<any[]>([]);
  const [activeBookSlide, setActiveBookSlide] = useState(0);

  // Chart Transition Animations
  const chartFadeAnim = useRef(new Animated.Value(1)).current;
  const chartTranslateY = useRef(new Animated.Value(0)).current;

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
      const [summaryData, loansRes] = await Promise.all([
        apiClient.dashboard.summary(tenantId),
        supabase
          .from('peminjaman')
          .select('id, anggota_id, tanggal_pinjam, jatuh_tempo, tanggal_kembali, status, peminjaman_detail(salinan_id)')
          .eq('tenant_id', tenantId),
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

  const handleContextChange = (ctx: 'buku' | 'peminjam' | 'denda') => {
    if (ctx === chartContext) return;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(chartFadeAnim, {
          toValue: 0.15,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(chartTranslateY, {
          toValue: 3,
          duration: 90,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setChartContext(ctx);
      Animated.parallel([
        Animated.timing(chartFadeAnim, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.spring(chartTranslateY, {
          toValue: 0,
          speed: 25,
          bounciness: 2,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handlePeriodChange = (p: 'harian' | 'mingguan' | 'bulanan') => {
    if (p === chartPeriod) return;
    Animated.timing(chartFadeAnim, {
      toValue: 0.15,
      duration: 80,
      useNativeDriver: true,
    }).start(() => {
      setChartPeriod(p);
      Animated.timing(chartFadeAnim, {
        toValue: 1,
        duration: 130,
        useNativeDriver: true,
      }).start();
    });
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
        const matchingLoans = rawLoans.filter((l) => l.tanggal_pinjam === dateStr);

        if (chartContext === 'buku') {
          matchingLoans.forEach((l) => {
            val += (l.peminjaman_detail || []).length;
          });
        } else if (chartContext === 'peminjam') {
          val = matchingLoans.length;
        } else if (chartContext === 'denda') {
          matchingLoans.forEach((l) => {
            if (l.status === 'aktif' && l.jatuh_tempo < dateStr) {
              const daysLate = Math.max(
                0,
                Math.floor(
                  (new Date(dateStr).getTime() - new Date(l.jatuh_tempo).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              );
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
        endD.setDate(today.getDate() - i * 7);
        const startD = new Date(endD);
        startD.setDate(endD.getDate() - 6);

        const startStr = startD.toISOString().split('T')[0];
        const endStr = endD.toISOString().split('T')[0];
        const weekLabel = `M${4 - i}`;

        let val = 0;
        const matchingLoans = rawLoans.filter(
          (l) => l.tanggal_pinjam >= startStr && l.tanggal_pinjam <= endStr
        );

        if (chartContext === 'buku') {
          matchingLoans.forEach((l) => {
            val += (l.peminjaman_detail || []).length;
          });
        } else if (chartContext === 'peminjam') {
          val = matchingLoans.length;
        } else if (chartContext === 'denda') {
          matchingLoans.forEach((l) => {
            if (l.status === 'aktif' && l.jatuh_tempo < endStr) {
              const daysLate = Math.max(
                0,
                Math.floor(
                  (new Date(endStr).getTime() - new Date(l.jatuh_tempo).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              );
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
        const matchingLoans = rawLoans.filter((l) =>
          (l.tanggal_pinjam || '').startsWith(monthYearStr)
        );

        if (chartContext === 'buku') {
          matchingLoans.forEach((l) => {
            val += (l.peminjaman_detail || []).length;
          });
        } else if (chartContext === 'peminjam') {
          val = matchingLoans.length;
        } else if (chartContext === 'denda') {
          matchingLoans.forEach((l) => {
            if (l.status === 'aktif') {
              const daysLate = Math.max(
                0,
                Math.floor(
                  (today.getTime() - new Date(l.jatuh_tempo).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              );
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
    return chartData.every((p) => p.value === 0);
  }, [chartData]);

  if (loading || !summary) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <AzelheimScreen>
      <AzelheimSectionHeader
        title="Metrik Perpustakaan"
        code="SEC // 01"
        icon={<Activity size={16} color={colors.text} />}
      />

      {/* Card #1: Chart */}
      <AzelheimCard style={{ marginBottom: 12 }}>
        <View style={styles.cardHead}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.muted }]}>OVERVIEW</Text>
            <Text style={[styles.cardTitle, { color: colors.text, marginTop: 4 }]}>
              {chartPeriod === 'harian'
                ? 'Pergerakan 7 Hari'
                : chartPeriod === 'mingguan'
                ? 'Pergerakan 4 Minggu'
                : 'Pergerakan 6 Bulan'}
            </Text>
          </View>
          <AzelheimBadge
            label={chartContext.toUpperCase()}
            variant="purple"
          />
        </View>

        {/* Animated Chart Surface */}
        <Animated.View
          style={{
            opacity: chartFadeAnim,
            transform: [{ translateY: chartTranslateY }],
          }}
        >
          <View
            style={[
              styles.chartbox,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <View style={{ height: 110, width: '100%', paddingHorizontal: 4 }}>
              <CartesianChart data={chartData} xKey="day" yKeys={['value'] as const}>
                {({ points }) => (
                  <Line points={points.value} color={colors.text} strokeWidth={2.2} />
                )}
              </CartesianChart>
            </View>
            {isChartEmpty && (
              <Text style={[styles.emptyChartText, { color: colors.faint }]}>
                Belum ada aktivitas {chartContext} pada periode ini.
              </Text>
            )}
          </View>

          {/* X Axis Labels */}
          <View style={styles.axisRow}>
            {chartData.map((item, idx) => (
              <Text key={idx} style={[styles.axisLabel, { color: colors.faint }]}>
                {item.label}
              </Text>
            ))}
          </View>
        </Animated.View>

        {/* Context Tabs */}
        <AzelheimTabs<'buku' | 'peminjam' | 'denda'>
          tabs={[
            { value: 'buku', label: 'Buku' },
            { value: 'peminjam', label: 'Peminjam' },
            { value: 'denda', label: 'Denda' },
          ]}
          activeTab={chartContext}
          onTabChange={handleContextChange}
          style={{ marginTop: 10, marginBottom: 8 }}
        />

        {/* Period Tabs */}
        <AzelheimTabs<'harian' | 'mingguan' | 'bulanan'>
          tabs={[
            { value: 'harian', label: 'Harian' },
            { value: 'mingguan', label: 'Mingguan' },
            { value: 'bulanan', label: 'Bulanan' },
          ]}
          activeTab={chartPeriod}
          onTabChange={handlePeriodChange}
          style={{ marginBottom: 0 }}
        />
      </AzelheimCard>

      {/* Card #2: Total Denda */}
      <AzelheimCard style={{ marginBottom: 12 }}>
        <View style={styles.cardHead}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.muted }]}>DENDA</Text>
            <Text style={[styles.cardTitle, { color: colors.text, marginTop: 3 }]}>
              Total Periode
            </Text>
          </View>
          <View style={styles.kpiRow}>
            <Text style={[styles.kpiBig, { color: colors.danger }]}>
              Rp {summary.total_denda_periode ? summary.total_denda_periode.toLocaleString('id-ID') : '0'}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.muted }]}>30 HARI</Text>
          </View>
        </View>
        <Text style={[styles.cardSub, { color: colors.muted, marginTop: 6 }]}>
          Akumulasi denda dari transaksi yang terlambat.
        </Text>
      </AzelheimCard>

      {/* 2x2 Grid: 4 Metric Cards (Identical Width & Alignment) */}
      <View style={styles.grid2}>
        {/* Metric 01: Toggle Carousel Jumlah Buku vs Jumlah Judul */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setActiveBookSlide((prev) => (prev === 0 ? 1 : 0))}
          style={{ flex: 1 }}
        >
          <AzelheimStatCard
            code={activeBookSlide === 0 ? 'METRIC_01 [1/2]' : 'METRIC_01 [2/2]'}
            label={activeBookSlide === 0 ? 'Jumlah Buku' : 'Jumlah Judul'}
            value={activeBookSlide === 0 ? (summary.jumlah_buku ?? 0) : (summary.jumlah_judul ?? 0)}
            sublabel={activeBookSlide === 0 ? 'Total Salinan • Tap' : 'Judul Unik • Tap'}
            style={{ flex: 1 }}
          />
        </TouchableOpacity>

        {/* Metric 02: Peminjam */}
        <AzelheimStatCard
          code="METRIC_02"
          label="Peminjam"
          value={summary.peminjam_aktif ?? 0}
          sublabel="Aktif saat ini"
          style={{ flex: 1 }}
        />
      </View>

      <View style={[styles.grid2, { marginTop: 8 }]}>
        {/* Metric 03: Buku Dipinjam */}
        <AzelheimStatCard
          code="METRIC_03"
          label="Buku Dipinjam"
          value={summary.buku_dipinjam ?? 0}
          sublabel="Total Salinan"
          style={{ flex: 1 }}
        />

        {/* Metric 04: Terlambat */}
        <AzelheimStatCard
          code="ALERT_04"
          label="Terlambat"
          value={summary.buku_terlambat ?? 0}
          sublabel="Perlu Ditindak"
          isAlert={Boolean(summary.buku_terlambat && summary.buku_terlambat > 0)}
          style={{ flex: 1 }}
        />
      </View>

      <AzelheimToast
        visible={visible}
        message={snackMsg}
        onDismiss={() => setVisible(false)}
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
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  chartbox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 3,
    marginTop: 8,
    paddingTop: 6,
    paddingBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    position: 'absolute',
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
    marginBottom: 4,
  },
  axisLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    textAlign: 'center',
  },
  kpiRow: {
    alignItems: 'flex-end',
  },
  kpiBig: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  kpiLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    fontWeight: '700',
  },
  grid2: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
});
