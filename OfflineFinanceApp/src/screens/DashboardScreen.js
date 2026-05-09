import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {
  Activity,
  ArrowUpRight,
  Package,
  ShoppingBag,
  Sparkles,
  TrendingDown,
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
  const startOfYesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  ).toISOString();
  const endOfYesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
    23,
    59,
    59,
    999,
  ).toISOString();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ).toISOString();

  return {
    startOfToday,
    endOfToday,
    startOfYesterday,
    endOfYesterday,
    startOfMonth,
    endOfMonth,
  };
};

const calcChange = (current, previous) => {
  if (!previous || previous === 0) {
    return current > 0 ? {percent: 100, direction: 'up'} : null;
  }

  const percent = ((current - previous) / Math.abs(previous)) * 100;
  return {
    percent: Math.abs(Math.round(percent * 10) / 10),
    direction: percent >= 0 ? 'up' : 'down',
  };
};

function DashboardScreen({navigation}) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const [summary, setSummary] = useState({
    todaySales: 0,
    todayServices: 0,
    todayExpenses: 0,
    todayNetProfit: 0,
    yesterdaySales: 0,
    yesterdayServices: 0,
    yesterdayExpenses: 0,
    yesterdayNetProfit: 0,
    inventoryValue: 0,
    lowStockCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = await getDBConnection();
      const {startOfToday, endOfToday, startOfYesterday, endOfYesterday} =
        getDateRange();

      const [todaySalesResult] = await db.executeSql(
        'SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE date BETWEEN ? AND ?;',
        [startOfToday, endOfToday],
      );
      const [todayServicesResult] = await db.executeSql(
        'SELECT COALESCE(SUM(amount), 0) AS total FROM services WHERE date BETWEEN ? AND ?;',
        [startOfToday, endOfToday],
      );
      const [todayExpensesResult] = await db.executeSql(
        'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date BETWEEN ? AND ?;',
        [startOfToday, endOfToday],
      );
      const [yesterdaySalesResult] = await db.executeSql(
        'SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE date BETWEEN ? AND ?;',
        [startOfYesterday, endOfYesterday],
      );
      const [yesterdayServicesResult] = await db.executeSql(
        'SELECT COALESCE(SUM(amount), 0) AS total FROM services WHERE date BETWEEN ? AND ?;',
        [startOfYesterday, endOfYesterday],
      );
      const [yesterdayExpensesResult] = await db.executeSql(
        'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date BETWEEN ? AND ?;',
        [startOfYesterday, endOfYesterday],
      );
      const [lowStockResult] = await db.executeSql(
        `SELECT id FROM products
         WHERE COALESCE(quantity, 0) < COALESCE(min_threshold, 0);`,
      );
      const [inventoryValueResult] = await db.executeSql(
        `SELECT COALESCE(SUM(COALESCE(weighted_average_cost, purchase_price, cost_price, 0) * COALESCE(quantity, 0)), 0) AS total
         FROM products;`,
      );

      const todaySales = Number(todaySalesResult.rows.item(0).total || 0);
      const todayServices = Number(todayServicesResult.rows.item(0).total || 0);
      const todayExpenses = Number(todayExpensesResult.rows.item(0).total || 0);
      const yesterdaySales = Number(
        yesterdaySalesResult.rows.item(0).total || 0,
      );
      const yesterdayServices = Number(
        yesterdayServicesResult.rows.item(0).total || 0,
      );
      const yesterdayExpenses = Number(
        yesterdayExpensesResult.rows.item(0).total || 0,
      );
      const inventoryValue = Number(
        inventoryValueResult.rows.item(0).total || 0,
      );
      const lowStock = getRowsArray(lowStockResult);
      const todayNetProfit = todaySales + todayServices - todayExpenses;
      const yesterdayNetProfit =
        yesterdaySales + yesterdayServices - yesterdayExpenses;

      setSummary({
        todaySales,
        todayServices,
        todayExpenses,
        todayNetProfit,
        yesterdaySales,
        yesterdayServices,
        yesterdayExpenses,
        yesterdayNetProfit,
        inventoryValue,
        lowStockCount: lowStock.length,
      });
    } catch (error) {
      setSummary({
        todaySales: 0,
        todayServices: 0,
        todayExpenses: 0,
        todayNetProfit: 0,
        yesterdaySales: 0,
        yesterdayServices: 0,
        yesterdayExpenses: 0,
        yesterdayNetProfit: 0,
        inventoryValue: 0,
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

  useEffect(() => {
    const interval = setInterval(loadDashboardData, 60000);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

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
      label: 'Sales',
      value: formatCurrency(summary.todaySales),
      icon: ShoppingBag,
      tone: 'success',
      change: calcChange(summary.todaySales, summary.yesterdaySales),
    },
    {
      label: 'Services',
      value: formatCurrency(summary.todayServices),
      icon: Activity,
      tone: 'primary',
      change: calcChange(summary.todayServices, summary.yesterdayServices),
    },
    {
      label: 'Expenses',
      value: formatCurrency(summary.todayExpenses),
      icon: Wallet,
      tone: 'danger',
      change: calcChange(summary.todayExpenses, summary.yesterdayExpenses),
    },
    {
      label: 'Net profit',
      value: formatCurrency(summary.todayNetProfit),
      icon: ArrowUpRight,
      tone: summary.todayNetProfit >= 0 ? 'success' : 'danger',
      change: calcChange(summary.todayNetProfit, summary.yesterdayNetProfit),
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
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <HeroCard style={styles.balanceCard}>
          <View style={styles.heroLabelRow}>
            <Sparkles color={COLORS.primaryForeground} size={15} />
            <Text style={styles.heroEyebrow}>TOTAL BALANCE</Text>
          </View>
          <Text style={[styles.heroAmount, type.number]}>
            {formatCurrency(summary.todayNetProfit)}
          </Text>
          <ComparisonChip
            change={calcChange(
              summary.todayNetProfit,
              summary.yesterdayNetProfit,
            )}
            glass
          />
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

        <View style={styles.statsGrid}>
          {stats.map(item => (
            <DailyMetricCard key={item.label} item={item} />
          ))}
        </View>

        <SurfaceCard style={styles.inventoryCard}>
          <View>
            <Text style={styles.statLabel}>Inventory value</Text>
            <Text style={[styles.inventoryValue, type.number]}>
              {formatCurrency(summary.inventoryValue)}
            </Text>
          </View>
          <IconBubble tone="primary" size={42}>
            <Package color={COLORS.primary} size={19} strokeWidth={2.4} />
          </IconBubble>
        </SurfaceCard>

        {isLoading ? (
          <Text style={styles.loading}>Refreshing local data...</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DailyMetricCard({item}) {
  const StatIcon = item.icon;
  const amountTone =
    item.tone === 'danger'
      ? COLORS.danger
      : item.tone === 'success'
      ? COLORS.success
      : COLORS.text;

  return (
    <SurfaceCard style={styles.dailyCard}>
      <View style={styles.dailyCardHead}>
        <Text style={styles.statLabel}>{item.label}</Text>
        <StatIcon
          color={
            item.tone === 'danger'
              ? COLORS.danger
              : item.tone === 'success'
              ? COLORS.success
              : COLORS.primary
          }
          size={18}
          strokeWidth={2.5}
        />
      </View>
      <Text style={[styles.dailyValue, type.number, {color: amountTone}]}>
        {item.value}
      </Text>
      <ComparisonChip change={item.change} />
    </SurfaceCard>
  );
}

function ComparisonChip({change, glass = false}) {
  if (!change) {
    return null;
  }

  const isUp = change.direction === 'up';
  const Icon = isUp ? ArrowUpRight : TrendingDown;

  return (
    <View
      style={[
        styles.comparisonChip,
        isUp ? styles.comparisonUp : styles.comparisonDown,
        glass && styles.comparisonGlass,
      ]}>
      <Icon
        color={
          glass
            ? COLORS.primaryForeground
            : isUp
            ? COLORS.success
            : COLORS.danger
        }
        size={12}
        strokeWidth={2.7}
      />
      <Text
        style={[
          styles.comparisonText,
          isUp ? styles.comparisonTextUp : styles.comparisonTextDown,
          glass && styles.comparisonTextGlass,
        ]}>
        {isUp ? '+' : '-'}
        {change.percent}% vs prev
      </Text>
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
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.danger,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  logoutText: {
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  dailyCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 108,
    padding: 14,
  },
  dailyCardHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dailyValue: {
    fontSize: 21,
    marginTop: 10,
  },
  comparisonChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    marginTop: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  comparisonUp: {
    backgroundColor: COLORS.successSoft,
  },
  comparisonDown: {
    backgroundColor: COLORS.dangerSoft,
  },
  comparisonGlass: {
    backgroundColor: COLORS.glassStrong,
  },
  comparisonText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
  },
  comparisonTextUp: {
    color: COLORS.success,
  },
  comparisonTextDown: {
    color: COLORS.danger,
  },
  comparisonTextGlass: {
    color: COLORS.primaryForeground,
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
  inventoryCard: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 14,
  },
  statLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
  },
  inventoryValue: {
    color: COLORS.text,
    fontSize: 22,
    marginTop: 3,
  },
  loading: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    marginTop: 14,
    textAlign: 'center',
  },
});

export default DashboardScreen;
