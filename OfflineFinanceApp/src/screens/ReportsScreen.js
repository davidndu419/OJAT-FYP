import React, {useCallback, useMemo, useState} from 'react';
import {Dimensions, ScrollView, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  Button,
  Card,
  DataTable,
  HelperText,
  Text,
  TextInput,
} from 'react-native-paper';
import {BarChart, PieChart} from 'react-native-chart-kit';
import {format, formatISO, isValid, parseISO} from 'date-fns';
import {getDBConnection} from '../database/db';
import {formatCurrency, getRowsArray} from '../utils/helpers';

const chartColors = [
  '#0b6bcb',
  '#047857',
  '#b45309',
  '#b42318',
  '#7c3aed',
  '#0f766e',
  '#be123c',
];

const formatDateInput = date => format(date, 'yyyy-MM-dd');

const createDateFromInput = value => {
  const date = parseISO(value);

  if (!isValid(date) || formatDateInput(date) !== value) {
    return null;
  }

  return date;
};

const getDefaultRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    from: formatDateInput(start),
    to: formatDateInput(now),
  };
};

const buildRange = (fromInput, toInput) => {
  const fromDate = createDateFromInput(fromInput);
  const toDate = createDateFromInput(toInput);

  if (!fromDate || !toDate || fromDate > toDate) {
    return null;
  }

  return {
    fromDate,
    toDate,
    startDate: formatISO(
      new Date(
        fromDate.getFullYear(),
        fromDate.getMonth(),
        fromDate.getDate(),
        0,
        0,
        0,
        0,
      ),
    ),
    endDate: formatISO(
      new Date(
        toDate.getFullYear(),
        toDate.getMonth(),
        toDate.getDate(),
        23,
        59,
        59,
        999,
      ),
    ),
  };
};

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: opacity => `rgba(11, 107, 203, ${opacity})`,
  decimalPlaces: 0,
  labelColor: opacity => `rgba(15, 23, 42, ${opacity})`,
  propsForBackgroundLines: {
    stroke: '#e5e7eb',
  },
};

function ReportsScreen() {
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState({
    dailySales: [],
    expensesByCategory: [],
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    bestSellingProduct: 'None',
    mostExpensiveCategory: 'None',
  });

  const chartWidth = Math.max(Dimensions.get('window').width - 48, 300);

  const loadReport = useCallback(async (fromInput, toInput) => {
    const range = buildRange(fromInput, toInput);

    if (!range) {
      setErrors({
        date: 'Use valid From and To dates in YYYY-MM-DD format. From cannot be after To.',
      });
      return;
    }

    setErrors({});
    setIsLoading(true);
    try {
      const db = await getDBConnection();

      const [dailySalesResult] = await db.executeSql(
        `SELECT substr(date, 1, 10) AS day,
                COALESCE(SUM(total), 0) AS total
         FROM sales
         WHERE date BETWEEN ? AND ?
         GROUP BY substr(date, 1, 10)
         ORDER BY day ASC;`,
        [range.startDate, range.endDate],
      );
      const [expensesByCategoryResult] = await db.executeSql(
        `SELECT category,
                COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE date BETWEEN ? AND ?
         GROUP BY category
         ORDER BY total DESC;`,
        [range.startDate, range.endDate],
      );
      const [revenueResult] = await db.executeSql(
        `SELECT COALESCE(SUM(total), 0) AS total
         FROM sales
         WHERE date BETWEEN ? AND ?;`,
        [range.startDate, range.endDate],
      );
      const [expenseTotalResult] = await db.executeSql(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE date BETWEEN ? AND ?;`,
        [range.startDate, range.endDate],
      );
      const [bestSellingResult] = await db.executeSql(
        `SELECT products.name AS product_name,
                COALESCE(SUM(sales.quantity), 0) AS total_quantity
         FROM sales
         LEFT JOIN products ON products.id = sales.product_id
         WHERE sales.date BETWEEN ? AND ?
         GROUP BY sales.product_id
         ORDER BY total_quantity DESC
         LIMIT 1;`,
        [range.startDate, range.endDate],
      );
      const [expensiveCategoryResult] = await db.executeSql(
        `SELECT category,
                COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE date BETWEEN ? AND ?
         GROUP BY category
         ORDER BY total DESC
         LIMIT 1;`,
        [range.startDate, range.endDate],
      );

      const dailySales = getRowsArray(dailySalesResult);
      const expensesByCategory = getRowsArray(expensesByCategoryResult);
      const totalRevenue = Number(revenueResult.rows.item(0).total || 0);
      const totalExpenses = Number(expenseTotalResult.rows.item(0).total || 0);
      const bestSellingProduct =
        bestSellingResult.rows.length > 0
          ? bestSellingResult.rows.item(0).product_name || 'Deleted product'
          : 'None';
      const mostExpensiveCategory =
        expensiveCategoryResult.rows.length > 0
          ? expensiveCategoryResult.rows.item(0).category
          : 'None';

      setReport({
        dailySales,
        expensesByCategory,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        bestSellingProduct,
        mostExpensiveCategory,
      });
    } catch (error) {
      setReport({
        dailySales: [],
        expensesByCategory: [],
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        bestSellingProduct: 'None',
        mostExpensiveCategory: 'None',
      });
      setErrors({form: 'Unable to load report data from SQLite.'});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReport(fromDate, toDate);
    }, [fromDate, loadReport, toDate]),
  );

  const updateDate = (field, value) => {
    setErrors(current => ({...current, date: '', form: ''}));

    if (field === 'from') {
      setFromDate(value);
    } else {
      setToDate(value);
    }
  };

  const shiftDate = (field, days) => {
    const input = field === 'from' ? fromDate : toDate;
    const parsedDate = createDateFromInput(input) || new Date();
    const nextDate = new Date(parsedDate);
    nextDate.setDate(parsedDate.getDate() + days);
    updateDate(field, formatDateInput(nextDate));
  };

  const hasSalesData = report.dailySales.length > 0;
  const hasExpenseData = report.expensesByCategory.length > 0;
  const hasAnyData =
    hasSalesData ||
    hasExpenseData ||
    report.totalRevenue > 0 ||
    report.totalExpenses > 0;

  const barChartData = {
    labels: report.dailySales.map(item => format(parseISO(item.day), 'MMM d')),
    datasets: [
      {
        data: report.dailySales.map(item => Number(item.total || 0)),
      },
    ],
  };

  const pieChartData = report.expensesByCategory.map((item, index) => ({
    name: item.category,
    population: Number(item.total || 0),
    color: chartColors[index % chartColors.length],
    legendFontColor: '#334155',
    legendFontSize: 12,
  }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        Reports
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Analyze local sales, expenses, and profitability.
      </Text>

      <Card style={styles.filterCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Date Range
          </Text>

          <View style={styles.dateBlock}>
            <Text variant="labelLarge" style={styles.dateLabel}>
              From
            </Text>
            <View style={styles.datePickerRow}>
              <Button
                mode="contained-tonal"
                onPress={() => shiftDate('from', -1)}
                compact
                style={styles.dateButton}
                labelStyle={styles.dateButtonLabel}>
                {'<'}
              </Button>
              <TextInput
                value={fromDate}
                onChangeText={value => updateDate('from', value)}
                mode="outlined"
                style={styles.dateInput}
                error={Boolean(errors.date)}
              />
              <Button
                mode="contained-tonal"
                onPress={() => shiftDate('from', 1)}
                compact
                style={styles.dateButton}
                labelStyle={styles.dateButtonLabel}>
                {'>'}
              </Button>
            </View>
          </View>

          <View style={styles.dateBlock}>
            <Text variant="labelLarge" style={styles.dateLabel}>
              To
            </Text>
            <View style={styles.datePickerRow}>
              <Button
                mode="contained-tonal"
                onPress={() => shiftDate('to', -1)}
                compact
                style={styles.dateButton}
                labelStyle={styles.dateButtonLabel}>
                {'<'}
              </Button>
              <TextInput
                value={toDate}
                onChangeText={value => updateDate('to', value)}
                mode="outlined"
                style={styles.dateInput}
                error={Boolean(errors.date)}
              />
              <Button
                mode="contained-tonal"
                onPress={() => shiftDate('to', 1)}
                compact
                style={styles.dateButton}
                labelStyle={styles.dateButtonLabel}>
                {'>'}
              </Button>
            </View>
          </View>

          <HelperText type="error" visible={Boolean(errors.date)}>
            {errors.date}
          </HelperText>

          {errors.form ? (
            <Text variant="bodySmall" style={styles.formError}>
              {errors.form}
            </Text>
          ) : null}

          <Button
            mode="contained"
            onPress={() => loadReport(fromDate, toDate)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.primaryButton}>
            Apply Filter
          </Button>
        </Card.Content>
      </Card>

      {!hasAnyData ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No report data found
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Record sales or expenses within this date range to view charts.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <>
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Daily Sales
              </Text>
              {hasSalesData ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={barChartData}
                    width={Math.max(chartWidth, report.dailySales.length * 72)}
                    height={240}
                    chartConfig={chartConfig}
                    fromZero
                    showValuesOnTopOfBars
                    style={styles.chart}
                  />
                </ScrollView>
              ) : (
                <Text variant="bodyMedium" style={styles.emptyText}>
                  No sales found for this date range.
                </Text>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Expenses by Category
              </Text>
              {hasExpenseData ? (
                <PieChart
                  data={pieChartData}
                  width={chartWidth}
                  height={230}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="8"
                  absolute
                />
              ) : (
                <Text variant="bodyMedium" style={styles.emptyText}>
                  No expenses found for this date range.
                </Text>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.tableCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Profit and Loss
              </Text>
            </Card.Content>
            <DataTable>
              <DataTable.Row>
                <DataTable.Cell>Total Revenue</DataTable.Cell>
                <DataTable.Cell numeric>
                  {formatCurrency(report.totalRevenue)}
                </DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell>Total Expenses</DataTable.Cell>
                <DataTable.Cell numeric>
                  {formatCurrency(report.totalExpenses)}
                </DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell>Net Profit</DataTable.Cell>
                <DataTable.Cell numeric>
                  <Text
                    style={[
                      styles.netProfit,
                      report.netProfit < 0 && styles.netLoss,
                    ]}>
                    {formatCurrency(report.netProfit)}
                  </Text>
                </DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell>Best Selling Product</DataTable.Cell>
                <DataTable.Cell numeric>
                  {report.bestSellingProduct}
                </DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell>Most Expensive Category</DataTable.Cell>
                <DataTable.Cell numeric>
                  {report.mostExpensiveCategory}
                </DataTable.Cell>
              </DataTable.Row>
            </DataTable>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fb',
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  title: {
    color: '#0f172a',
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 16,
    marginTop: 4,
  },
  filterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  sectionTitle: {
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 10,
  },
  dateBlock: {
    marginBottom: 10,
  },
  dateLabel: {
    color: '#475569',
    marginBottom: 4,
  },
  datePickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  dateInput: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  dateButton: {
    borderRadius: 6,
    minWidth: 42,
    marginHorizontal: 2,
  },
  dateButtonLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 0,
  },
  formError: {
    color: '#b42318',
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 6,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginTop: 16,
  },
  emptyTitle: {
    color: '#0f172a',
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: '#64748b',
    paddingVertical: 12,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginTop: 16,
  },
  chart: {
    borderRadius: 8,
    marginTop: 8,
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginTop: 16,
    overflow: 'hidden',
  },
  netProfit: {
    color: '#047857',
    fontWeight: '700',
  },
  netLoss: {
    color: '#b42318',
  },
});

export default ReportsScreen;
