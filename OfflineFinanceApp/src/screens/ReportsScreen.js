import React, {useCallback, useMemo, useState} from 'react';
import {Dimensions, ScrollView, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import {BarChart, PieChart} from 'react-native-chart-kit';
import {format, formatISO, isValid, parseISO} from 'date-fns';
import {getDBConnection, getSetting} from '../database/db';
import {formatCurrency, getRowsArray} from '../utils/helpers';
import {COLORS, FONT_FAMILY} from '../theme/theme';

const chartWidth = Math.min(Dimensions.get('window').width - 56, 392);

const chartConfig = {
  backgroundGradientFrom: COLORS.surface,
  backgroundGradientTo: COLORS.surface,
  color: (opacity = 1) => `rgba(31, 58, 95, ${opacity})`,
  decimalPlaces: 0,
  labelColor: (opacity = 1) => `rgba(102, 112, 133, ${opacity})`,
  propsForBackgroundLines: {
    stroke: COLORS.line,
  },
};

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
      new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()),
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

const emptyReport = {
  salesRevenue: 0,
  salesCash: 0,
  salesBank: 0,
  costOfGoodsSold: 0,
  grossProfit: 0,
  salesExpense: 0,
  netSalesProfit: 0,
  serviceRevenue: 0,
  serviceCash: 0,
  serviceBank: 0,
  serviceExpense: 0,
  netServiceProfit: 0,
  totalExpenses: 0,
  totalRevenue: 0,
  totalCash: 0,
  totalBank: 0,
  netProfit: 0,
  bestSellingProduct: 'None',
  mostPopularServiceType: 'None',
  expensesByCategory: [],
  dailySales: [],
  dailyServices: [],
  serviceTypeRevenue: [],
  serviceTransactions: [],
  profitTrend: [],
  allocation: 'combined',
  salesPercent: 60,
  servicesPercent: 40,
};

const toChartData = rows => ({
  labels: rows.map(item => item.label),
  datasets: [{data: rows.map(item => Math.max(0, Number(item.value || 0)))}],
});

const hasChartData = rows => rows.some(item => Number(item.value || 0) > 0);

function ReportsScreen() {
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [activeTab, setActiveTab] = useState('sales');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(emptyReport);

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
      const [
        salesSummaryResult,
        dailySalesResult,
        expensesByCategoryResult,
        expenseTotalResult,
        bestSellingResult,
        serviceSummaryResult,
        dailyServicesResult,
        serviceTypeRevenueResult,
        popularServiceResult,
        serviceTransactionsResult,
        dailyExpensesResult,
        allocationValue,
        salesPercentValue,
        servicesPercentValue,
      ] = await Promise.all([
        db.executeSql(
          `SELECT COALESCE(SUM(sales.total), 0) AS revenue,
                  COALESCE(SUM(CASE WHEN COALESCE(sales.payment_method, 'cash') = 'cash' THEN sales.total ELSE 0 END), 0) AS cash,
                  COALESCE(SUM(CASE WHEN COALESCE(sales.payment_method, 'cash') = 'bank' THEN sales.total ELSE 0 END), 0) AS bank,
                  COALESCE(SUM(COALESCE(products.cost_price, 0) * COALESCE(sales.quantity, 0)), 0) AS cogs
           FROM sales
           LEFT JOIN products ON products.id = sales.product_id
           WHERE sales.date BETWEEN ? AND ?;`,
          [range.startDate, range.endDate],
        ),
        db.executeSql(
          `SELECT substr(date, 1, 10) AS day,
                  COALESCE(SUM(total), 0) AS total
           FROM sales
           WHERE date BETWEEN ? AND ?
           GROUP BY substr(date, 1, 10)
           ORDER BY day ASC;`,
          [range.startDate, range.endDate],
        ),
        db.executeSql(
          `SELECT category,
                  COALESCE(SUM(amount), 0) AS total
           FROM expenses
           WHERE date BETWEEN ? AND ?
           GROUP BY category
           ORDER BY total DESC;`,
          [range.startDate, range.endDate],
        ),
        db.executeSql(
          `SELECT COALESCE(SUM(amount), 0) AS total
           FROM expenses
           WHERE date BETWEEN ? AND ?;`,
          [range.startDate, range.endDate],
        ),
        db.executeSql(
          `SELECT products.name AS product_name,
                  COALESCE(SUM(sales.quantity), 0) AS total_quantity
           FROM sales
           LEFT JOIN products ON products.id = sales.product_id
           WHERE sales.date BETWEEN ? AND ?
           GROUP BY sales.product_id
           ORDER BY total_quantity DESC
           LIMIT 1;`,
          [range.startDate, range.endDate],
        ),
        db.executeSql(
          `SELECT COALESCE(SUM(amount), 0) AS revenue,
                  COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) AS cash,
                  COALESCE(SUM(CASE WHEN payment_method = 'bank' THEN amount ELSE 0 END), 0) AS bank
           FROM services
           WHERE date BETWEEN ? AND ?;`,
          [range.startDate, range.endDate],
        ),
        db.executeSql(
          `SELECT substr(date, 1, 10) AS day,
                  COALESCE(SUM(amount), 0) AS total
           FROM services
           WHERE date BETWEEN ? AND ?
           GROUP BY substr(date, 1, 10)
           ORDER BY day ASC;`,
          [range.startDate, range.endDate],
        ),
        db.executeSql(
          `SELECT service_type,
                  COALESCE(SUM(amount), 0) AS total
           FROM services
           WHERE date BETWEEN ? AND ?
           GROUP BY service_type
           ORDER BY total DESC;`,
          [range.startDate, range.endDate],
        ),
        db.executeSql(
          `SELECT service_type,
                  COUNT(*) AS total_count
           FROM services
           WHERE date BETWEEN ? AND ?
           GROUP BY service_type
           ORDER BY total_count DESC
           LIMIT 1;`,
          [range.startDate, range.endDate],
        ),
        db.executeSql(
          `SELECT *
           FROM services
           WHERE date BETWEEN ? AND ?
           ORDER BY date DESC;`,
          [range.startDate, range.endDate],
        ),
        db.executeSql(
          `SELECT substr(date, 1, 10) AS day,
                  COALESCE(SUM(amount), 0) AS total
           FROM expenses
           WHERE date BETWEEN ? AND ?
           GROUP BY substr(date, 1, 10)
           ORDER BY day ASC;`,
          [range.startDate, range.endDate],
        ),
        getSetting('expense_allocation'),
        getSetting('sales_expense_percent'),
        getSetting('services_expense_percent'),
      ]);

      const salesSummary = salesSummaryResult[0].rows.item(0);
      const serviceSummary = serviceSummaryResult[0].rows.item(0);
      const totalExpenses = Number(
        expenseTotalResult[0].rows.item(0).total || 0,
      );
      const allocation = allocationValue || 'combined';
      const salesPercent = Number(salesPercentValue || 60);
      const servicesPercent = Number(servicesPercentValue || 40);
      const salesRevenue = Number(salesSummary.revenue || 0);
      const salesCash = Number(salesSummary.cash || 0);
      const salesBank = Number(salesSummary.bank || 0);
      const costOfGoodsSold = Number(salesSummary.cogs || 0);
      const grossProfit = salesRevenue - costOfGoodsSold;
      const serviceRevenue = Number(serviceSummary.revenue || 0);
      const serviceCash = Number(serviceSummary.cash || 0);
      const serviceBank = Number(serviceSummary.bank || 0);
      const salesExpense =
        allocation === 'split'
          ? totalExpenses * (salesPercent / 100)
          : totalExpenses;
      const serviceExpense =
        allocation === 'split'
          ? totalExpenses * (servicesPercent / 100)
          : totalExpenses;
      const dailySales = getRowsArray(dailySalesResult[0]).map(item => ({
        label: format(parseISO(item.day), 'MMM d'),
        day: item.day,
        value: Number(item.total || 0),
      }));
      const dailyServices = getRowsArray(dailyServicesResult[0]).map(item => ({
        label: format(parseISO(item.day), 'MMM d'),
        day: item.day,
        value: Number(item.total || 0),
      }));
      const expenseByDay = getRowsArray(dailyExpensesResult[0]).reduce(
        (acc, item) => {
          acc[item.day] = Number(item.total || 0);
          return acc;
        },
        {},
      );
      const revenueByDay = [...dailySales, ...dailyServices].reduce(
        (acc, item) => {
          acc[item.day] = Number(acc[item.day] || 0) + Number(item.value || 0);
          return acc;
        },
        {},
      );
      const profitTrend = Object.keys({...revenueByDay, ...expenseByDay})
        .sort()
        .map(day => ({
          day,
          label: format(parseISO(day), 'MMM d'),
          value:
            Number(revenueByDay[day] || 0) - Number(expenseByDay[day] || 0),
        }));

      setReport({
        salesRevenue,
        salesCash,
        salesBank,
        costOfGoodsSold,
        grossProfit,
        salesExpense,
        netSalesProfit: grossProfit - salesExpense,
        serviceRevenue,
        serviceCash,
        serviceBank,
        serviceExpense,
        netServiceProfit: serviceRevenue - serviceExpense,
        totalExpenses,
        totalRevenue: salesRevenue + serviceRevenue,
        totalCash: salesCash + serviceCash,
        totalBank: salesBank + serviceBank,
        netProfit: salesRevenue + serviceRevenue - totalExpenses,
        bestSellingProduct:
          bestSellingResult[0].rows.length > 0
            ? bestSellingResult[0].rows.item(0).product_name ||
              'Deleted product'
            : 'None',
        mostPopularServiceType:
          popularServiceResult[0].rows.length > 0
            ? popularServiceResult[0].rows.item(0).service_type
            : 'None',
        expensesByCategory: getRowsArray(expensesByCategoryResult[0]),
        dailySales,
        dailyServices,
        serviceTypeRevenue: getRowsArray(serviceTypeRevenueResult[0]),
        serviceTransactions: getRowsArray(serviceTransactionsResult[0]),
        profitTrend,
        allocation,
        salesPercent,
        servicesPercent,
      });
    } catch (error) {
      setReport(emptyReport);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Reports</Text>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>
          Sales, services, expenses, and profit from local SQLite records.
        </Text>
      </View>

      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Date Range</Text>
            {isLoading ? <ActivityIndicator size="small" /> : null}
          </View>
          <View style={styles.dateRow}>
            <TextInput
              mode="outlined"
              label="From"
              value={fromDate}
              onChangeText={value => updateDate('from', value)}
              style={styles.dateInput}
            />
            <TextInput
              mode="outlined"
              label="To"
              value={toDate}
              onChangeText={value => updateDate('to', value)}
              style={styles.dateInput}
            />
          </View>
          {errors.date ? (
            <Text style={styles.errorText}>{errors.date}</Text>
          ) : null}
          {errors.form ? (
            <Text style={styles.errorText}>{errors.form}</Text>
          ) : null}
          <Button
            mode="contained"
            onPress={() => loadReport(fromDate, toDate)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.applyButton}>
            Apply Filter
          </Button>
        </Card.Content>
      </Card>

      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          {value: 'sales', label: 'Sales'},
          {value: 'services', label: 'Services'},
          {value: 'combined', label: 'Combined'},
        ]}
        style={styles.tabs}
      />

      {activeTab === 'sales' ? <SalesReport report={report} /> : null}
      {activeTab === 'services' ? <ServicesReport report={report} /> : null}
      {activeTab === 'combined' ? <CombinedReport report={report} /> : null}
    </ScrollView>
  );
}

function SalesReport({report}) {
  const paymentPie = [
    {
      name: 'Cash',
      population: report.salesCash,
      color: COLORS.success,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    },
    {
      name: 'Bank',
      population: report.salesBank,
      color: COLORS.accent,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    },
  ];

  return (
    <>
      <HighlightCard label="Net Sales Profit" value={report.netSalesProfit} />
      <ChartCard title="Daily Sales">
        {report.dailySales.length > 0 && hasChartData(report.dailySales) ? (
          <BarChart
            data={toChartData(report.dailySales)}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            fromZero
            showValuesOnTopOfBars
            style={styles.chart}
          />
        ) : (
          <Text style={styles.emptyText}>
            No sales found for this date range.
          </Text>
        )}
      </ChartCard>
      <ChartCard title="Sales Payment Split">
        {paymentPie.some(item => item.population > 0) ? (
          <PieChart
            data={paymentPie}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="8"
            absolute
          />
        ) : (
          <Text style={styles.emptyText}>No sales payment data to chart.</Text>
        )}
      </ChartCard>
      <SummaryGrid
        rows={[
          ['Total Sales Revenue', report.salesRevenue],
          ['Cash received from sales', report.salesCash],
          ['Bank received from sales', report.salesBank],
          ['Cost of goods sold', report.costOfGoodsSold],
          ['Gross profit', report.grossProfit],
          ['Allocated expenses', report.salesExpense],
        ]}
      />
      <DetailCard title="Sales Extras">
        <InfoRow
          label="Best selling product"
          value={report.bestSellingProduct}
        />
        <InfoRow
          label="Expense allocation"
          value={
            report.allocation === 'split'
              ? `${report.salesPercent}% of expenses`
              : 'All expenses'
          }
        />
      </DetailCard>
    </>
  );
}

function ServicesReport({report}) {
  const pieData = report.serviceTypeRevenue.map((item, index) => ({
    name: item.service_type,
    population: Number(item.total || 0),
    color: [COLORS.success, COLORS.accent, COLORS.warning, COLORS.primary][
      index % 4
    ],
    legendFontColor: COLORS.text,
    legendFontSize: 12,
  }));

  return (
    <>
      <HighlightCard
        label="Net Service Profit"
        value={report.netServiceProfit}
      />
      <ChartCard title="Daily Service Revenue">
        {report.dailyServices.length > 0 &&
        hasChartData(report.dailyServices) ? (
          <BarChart
            data={toChartData(report.dailyServices)}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            fromZero
            showValuesOnTopOfBars
            style={styles.chart}
          />
        ) : (
          <Text style={styles.emptyText}>
            No service revenue in this date range.
          </Text>
        )}
      </ChartCard>
      <ChartCard title="Revenue by Service Type">
        {pieData.length > 0 && pieData.some(item => item.population > 0) ? (
          <PieChart
            data={pieData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="8"
            absolute
          />
        ) : (
          <Text style={styles.emptyText}>
            No service type revenue to chart.
          </Text>
        )}
      </ChartCard>
      <SummaryGrid
        rows={[
          ['Total service revenue', report.serviceRevenue],
          ['Cash received from services', report.serviceCash],
          ['Bank received from services', report.serviceBank],
          ['Allocated expenses', report.serviceExpense],
        ]}
      />
      <DetailCard title="Service Highlights">
        <InfoRow
          label="Most popular service type"
          value={report.mostPopularServiceType}
        />
        <InfoRow
          label="Expense allocation"
          value={
            report.allocation === 'split'
              ? `${report.servicesPercent}% of expenses`
              : 'All expenses'
          }
        />
      </DetailCard>
      <ServiceTransactions transactions={report.serviceTransactions} />
    </>
  );
}

function CombinedReport({report}) {
  const revenuePie = [
    {
      name: 'Sales',
      population: report.salesRevenue,
      color: COLORS.accent,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    },
    {
      name: 'Services',
      population: report.serviceRevenue,
      color: COLORS.success,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    },
  ];

  return (
    <>
      <HighlightCard label="Net Business Profit" value={report.netProfit} />
      <ChartCard title="Profit Trend by Day">
        {report.profitTrend.length > 0 && hasChartData(report.profitTrend) ? (
          <BarChart
            data={toChartData(report.profitTrend)}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            fromZero
            showValuesOnTopOfBars
            style={styles.chart}
          />
        ) : (
          <Text style={styles.emptyText}>No profit trend data to chart.</Text>
        )}
      </ChartCard>
      <ChartCard title="Revenue Split">
        {revenuePie.some(item => item.population > 0) ? (
          <PieChart
            data={revenuePie}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="8"
            absolute
          />
        ) : (
          <Text style={styles.emptyText}>No revenue in this date range.</Text>
        )}
      </ChartCard>
      <SummaryGrid
        rows={[
          ['Total Revenue', report.totalRevenue],
          ['Total Cash received', report.totalCash],
          ['Total Bank received', report.totalBank],
          ['Total Expenses', report.totalExpenses],
        ]}
      />
    </>
  );
}

function ChartCard({title, children}) {
  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>{title}</Text>
        {children}
      </Card.Content>
    </Card>
  );
}

function DetailCard({title, children}) {
  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>{title}</Text>
        {children}
      </Card.Content>
    </Card>
  );
}

function ServiceTransactions({transactions}) {
  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>Service Transactions</Text>
        {transactions.length > 0 ? (
          transactions.map(item => (
            <View key={item.id} style={styles.transactionRow}>
              <View style={styles.transactionText}>
                <Text style={styles.transactionTitle}>{item.service_type}</Text>
                <Text style={styles.transactionMeta}>
                  {item.payment_method === 'bank' ? 'Bank' : 'Cash'} |{' '}
                  {format(parseISO(item.date), 'MMM d, p')}
                </Text>
              </View>
              <Text style={styles.transactionAmount}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No service transactions found.</Text>
        )}
      </Card.Content>
    </Card>
  );
}

function SummaryGrid({rows}) {
  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content>
        {rows.map(([label, value], index) => (
          <View key={label}>
            {index > 0 ? <Divider /> : null}
            <InfoRow label={label} value={formatCurrency(value)} strong />
          </View>
        ))}
      </Card.Content>
    </Card>
  );
}

function HighlightCard({label, value}) {
  return (
    <Card mode="contained" style={styles.highlightCard}>
      <Card.Content>
        <Text style={styles.highlightLabel}>{label}</Text>
        <Text style={styles.highlightValue}>{formatCurrency(value)}</Text>
      </Card.Content>
    </Card>
  );
}

function InfoRow({label, value, strong}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, strong && styles.infoValueStrong]}>
        {value}
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
    width: '100%',
  },
  header: {
    paddingBottom: 16,
    paddingTop: 30,
  },
  eyebrow: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateInput: {
    backgroundColor: COLORS.surface,
    flex: 1,
  },
  applyButton: {
    borderRadius: 8,
    marginTop: 12,
  },
  tabs: {
    marginBottom: 16,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 48,
  },
  infoLabel: {
    color: COLORS.muted,
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
  },
  infoValue: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    textAlign: 'right',
  },
  infoValueStrong: {
    color: COLORS.primary,
  },
  highlightCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginBottom: 16,
  },
  highlightLabel: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  highlightValue: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  chart: {
    borderRadius: 8,
    marginTop: 8,
  },
  transactionRow: {
    alignItems: 'center',
    borderTopColor: COLORS.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
  },
  transactionText: {
    flex: 1,
  },
  transactionTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  transactionMeta: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    color: COLORS.success,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  emptyText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    lineHeight: 20,
    paddingVertical: 14,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 8,
  },
});

export default ReportsScreen;
