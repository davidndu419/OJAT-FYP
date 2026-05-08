import React, {useCallback, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {
  ArrowUpRight,
  Bell,
  CreditCard,
  Package,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react-native';
import {Text} from 'react-native-paper';
import {getDBConnection} from '../database/db';
import {logout} from '../store/slices/authSlice';
import {STORAGE_KEYS} from '../utils/constants';
import {formatCurrency, getRowsArray} from '../utils/helpers';
import {COLORS, FONT_FAMILY} from '../theme/theme';
import {
  HeroCard,
  IconBubble,
  ScreenHeader,
  SurfaceCard,
  gradientStyle,
  type,
} from '../components/KoboUI';

const getDateRange = () => {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ).toISOString();

  return {startOfToday, endOfToday, startOfMonth, endOfMonth};
};

function DashboardScreen({navigation}) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const [summary, setSummary] = useState({
    todaySales: 0,
    monthSales: 0,
    monthExpenses: 0,
    netProfit: 0,
    lowStockCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = await getDBConnection();
      const {startOfToday, endOfToday, startOfMonth, endOfMonth} =
        getDateRange();

      const [todaySalesResult] = await db.executeSql(
        'SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE date BETWEEN ? AND ?;',
        [startOfToday, endOfToday],
      );
      const [monthSalesResult] = await db.executeSql(
        'SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE date BETWEEN ? AND ?;',
        [startOfMonth, endOfMonth],
      );
      const [monthExpensesResult] = await db.executeSql(
        'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date BETWEEN ? AND ?;',
        [startOfMonth, endOfMonth],
      );
      const [lowStockResult] = await db.executeSql(
        `SELECT id FROM products
         WHERE COALESCE(quantity, 0) < COALESCE(min_threshold, 0);`,
      );

      const todaySales = Number(todaySalesResult.rows.item(0).total || 0);
      const monthSales = Number(monthSalesResult.rows.item(0).total || 0);
      const monthExpenses = Number(monthExpensesResult.rows.item(0).total || 0);
      const lowStock = getRowsArray(lowStockResult);

      setSummary({
        todaySales,
        monthSales,
        monthExpenses,
        netProfit: monthSales - monthExpenses,
        lowStockCount: lowStock.length,
      });
    } catch (error) {
      setSummary({
        todaySales: 0,
        monthSales: 0,
        monthExpenses: 0,
        netProfit: 0,
        lowStockCount: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData]),
  );

  const handleLogout = async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
    dispatch(logout());
  };

  const displayName =
    user?.name || user?.fullName || user?.email?.split('@')[0] || 'there';
  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good morning';
    }

    if (hour < 17) {
      return 'Good afternoon';
    }

    return 'Good evening';
  }, []);

  const quickActions = [
    {label: 'Sell', icon: ShoppingBag, route: 'Sales'},
    {label: 'Expense', icon: Wallet, route: 'Expenses'},
    {label: 'Stock', icon: Package, route: 'Inventory'},
  ];

  const stats = [
    {
      label: 'Sales today',
      value: formatCurrency(summary.todaySales),
      icon: ShoppingBag,
      tone: 'success',
      delta: '+ local',
    },
    {
      label: 'Sales this month',
      value: formatCurrency(summary.monthSales),
      icon: CreditCard,
      tone: 'primary',
      delta: 'month',
    },
    {
      label: 'Expenses this month',
      value: formatCurrency(summary.monthExpenses),
      icon: Wallet,
      tone: 'danger',
      delta: 'tracked',
    },
    {
      label: 'Net profit',
      value: formatCurrency(summary.netProfit),
      icon: ArrowUpRight,
      tone: summary.netProfit >= 0 ? 'success' : 'danger',
      highlighted: true,
      delta: summary.netProfit >= 0 ? 'profit' : 'loss',
    },
    {
      label: 'Low stock items',
      value: String(summary.lowStockCount),
      icon: Package,
      tone: 'warning',
      delta: 'watch',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.displayName}>{displayName}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={handleLogout}
            style={styles.bellButton}>
            <Bell color={COLORS.primary} size={21} strokeWidth={2.4} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <HeroCard style={styles.balanceCard}>
          <View style={styles.heroLabelRow}>
            <Sparkles color={COLORS.primaryForeground} size={15} />
            <Text style={styles.heroEyebrow}>TOTAL BALANCE</Text>
          </View>
          <Text style={[styles.heroAmount, type.number]}>
            {formatCurrency(summary.netProfit)}
          </Text>
          <View style={styles.heroDelta}>
            <ArrowUpRight color={COLORS.primaryForeground} size={15} />
            <Text style={styles.heroDeltaText}>+12.4% vs last month</Text>
          </View>
        </HeroCard>

        <View style={styles.quickGrid}>
          {quickActions.map(action => {
            const ActionIcon = action.icon;
            return (
              <TouchableOpacity
                activeOpacity={0.84}
                key={action.label}
                onPress={() => navigation.navigate(action.route)}
                style={styles.quickTile}>
                <IconBubble gradient size={44}>
                  <ActionIcon
                    color={COLORS.primaryForeground}
                    size={20}
                    strokeWidth={2.5}
                  />
                </IconBubble>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScreenHeader eyebrow="Today" title="Pulse" />

        <View style={styles.statsList}>
          {stats.map(item => {
            const StatIcon = item.icon;
            return (
              <SurfaceCard
                key={item.label}
                style={[styles.statCard, item.highlighted && styles.statLift]}>
                <IconBubble
                  gradient={item.highlighted}
                  tone={item.tone}
                  size={46}>
                  <StatIcon
                    color={
                      item.highlighted
                        ? COLORS.primaryForeground
                        : item.tone === 'success'
                        ? COLORS.success
                        : item.tone === 'danger'
                        ? COLORS.danger
                        : item.tone === 'warning'
                        ? COLORS.warning
                        : COLORS.primary
                    }
                    size={21}
                    strokeWidth={2.4}
                  />
                </IconBubble>
                <View style={styles.statBody}>
                  <Text style={styles.statLabel}>{item.label}</Text>
                  <Text style={[styles.statValue, type.number]}>
                    {item.value}
                  </Text>
                </View>
                <View style={styles.deltaChip}>
                  <Text style={styles.deltaText}>{item.delta}</Text>
                </View>
              </SurfaceCard>
            );
          })}
        </View>

        {isLoading ? <Text style={styles.loading}>Refreshing local data...</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 448,
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 30,
    width: '100%',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  greeting: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 13,
  },
  displayName: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginTop: 1,
  },
  bellButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  notificationDot: {
    backgroundColor: COLORS.danger,
    borderRadius: 5,
    height: 8,
    position: 'absolute',
    right: 10,
    top: 9,
    width: 8,
  },
  balanceCard: {
    marginBottom: 18,
    minHeight: 178,
  },
  heroLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heroEyebrow: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heroAmount: {
    color: COLORS.primaryForeground,
    fontSize: 42,
    lineHeight: 54,
    marginTop: 16,
  },
  heroDelta: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.glassStrong,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  heroDeltaText: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  quickTile: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minHeight: 104,
    padding: 12,
  },
  quickLabel: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
  },
  statsList: {
    gap: 12,
  },
  statCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  statLift: {
    borderColor: COLORS.primarySoft,
  },
  statBody: {
    flex: 1,
  },
  statLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    color: COLORS.text,
    fontSize: 20,
    marginTop: 3,
  },
  deltaChip: {
    backgroundColor: COLORS.successSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  deltaText: {
    color: COLORS.success,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
  },
  loading: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    marginTop: 14,
    textAlign: 'center',
  },
});

export default DashboardScreen;
