import React, {useCallback, useState} from 'react';
import {FlatList, ScrollView, StyleSheet, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {Button, Card, Divider, List, Text} from 'react-native-paper';
import {getDBConnection} from '../database/db';
import {logout} from '../store/slices/authSlice';
import {STORAGE_KEYS} from '../utils/constants';
import {formatCurrency, getRowsArray} from '../utils/helpers';

const AlertIcon = props => <List.Icon {...props} icon="alert-circle-outline" />;

const getDateRange = () => {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
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
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0,
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
    startOfMonth,
    endOfMonth,
  };
};

function DashboardScreen() {
  const dispatch = useDispatch();
  const [summary, setSummary] = useState({
    todaySales: 0,
    monthSales: 0,
    monthExpenses: 0,
    netProfit: 0,
    lowStockCount: 0,
  });
  const [lowStockItems, setLowStockItems] = useState([]);
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
        `SELECT id, name, quantity, min_threshold
         FROM products
         WHERE COALESCE(quantity, 0) < COALESCE(min_threshold, 0)
         ORDER BY name ASC;`,
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
      setLowStockItems(lowStock);
    } catch (error) {
      setSummary({
        todaySales: 0,
        monthSales: 0,
        monthExpenses: 0,
        netProfit: 0,
        lowStockCount: 0,
      });
      setLowStockItems([]);
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

  const cards = [
    {
      label: 'Total Sales Today',
      value: formatCurrency(summary.todaySales),
      tone: styles.salesValue,
    },
    {
      label: 'Total Sales This Month',
      value: formatCurrency(summary.monthSales),
      tone: styles.salesValue,
    },
    {
      label: 'Total Expenses This Month',
      value: formatCurrency(summary.monthExpenses),
      tone: styles.expenseValue,
    },
    {
      label: 'Net Profit',
      value: formatCurrency(summary.netProfit),
      tone: summary.netProfit >= 0 ? styles.salesValue : styles.expenseValue,
    },
    {
      label: 'Low Stock Items',
      value: String(summary.lowStockCount),
      tone: styles.warningValue,
    },
  ];

  const renderLowStockItem = ({item}) => (
    <List.Item
      title={item.name}
      description={`Current quantity: ${item.quantity}`}
      left={AlertIcon}
      titleStyle={styles.lowStockTitle}
      descriptionStyle={styles.lowStockDescription}
    />
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="headlineSmall" style={styles.title}>
              Dashboard
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Offline summary from local records
            </Text>
          </View>
          <Button mode="outlined" onPress={handleLogout} compact>
            Logout
          </Button>
        </View>

        <View style={styles.cardGrid}>
          {cards.map(card => (
            <Card key={card.label} style={styles.summaryCard}>
              <Card.Content>
                <Text variant="labelLarge" style={styles.cardLabel}>
                  {card.label}
                </Text>
                <Text
                  variant="titleLarge"
                  style={[styles.cardValue, card.tone]}>
                  {card.value}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        <Card style={styles.warningCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Low Stock Warning
            </Text>
            <Text variant="bodySmall" style={styles.sectionSubtitle}>
              Products below their minimum threshold
            </Text>
          </Card.Content>
          <Divider />
          {lowStockItems.length > 0 ? (
            <FlatList
              data={lowStockItems}
              keyExtractor={item => item.id}
              renderItem={renderLowStockItem}
              scrollEnabled={false}
            />
          ) : (
            <Text variant="bodyMedium" style={styles.emptyText}>
              No low stock items found.
            </Text>
          )}
        </Card>

        {isLoading ? (
          <Text variant="bodySmall" style={styles.loadingText}>
            Refreshing local data...
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fb',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: '#0f172a',
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748b',
    marginTop: 2,
  },
  cardGrid: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  cardLabel: {
    color: '#64748b',
    marginBottom: 8,
  },
  cardValue: {
    fontWeight: '700',
  },
  salesValue: {
    color: '#047857',
  },
  expenseValue: {
    color: '#b42318',
  },
  warningValue: {
    color: '#b45309',
  },
  warningCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginTop: 16,
  },
  sectionTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#64748b',
    marginTop: 2,
  },
  lowStockTitle: {
    color: '#b42318',
    fontWeight: '700',
  },
  lowStockDescription: {
    color: '#7f1d1d',
  },
  emptyText: {
    color: '#64748b',
    padding: 16,
    textAlign: 'center',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default DashboardScreen;
