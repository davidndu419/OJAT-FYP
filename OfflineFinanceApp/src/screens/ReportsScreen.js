import React, {useCallback, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, TextInput, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {ChevronLeft, ChevronRight, Star, TrendingUp} from 'lucide-react-native';
import {Text} from 'react-native-paper';
import {format, formatISO, isValid, parseISO, subDays} from 'date-fns';
import {getDBConnection} from '../database/db';
import {formatCurrency, getRowsArray} from '../utils/helpers';
import {COLORS, FONT_FAMILY} from '../theme/theme';
import {HeroCard, IconBubble, KoboButton, ScreenHeader, SurfaceCard, gradientStyle, type} from '../components/KoboUI';

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
    startDate: formatISO(new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())),
    endDate: formatISO(
      new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999),
    ),
  };
};

const buildSevenDays = dailySales => {
  const today = new Date();
  const salesMap = dailySales.reduce((acc, item) => {
    acc[item.day] = Number(item.total || 0);
    return acc;
  }, {});

  return Array.from({length: 7}).map((_, index) => {
    const date = subDays(today, 6 - index);
    const key = formatDateInput(date);
    return {
      label: format(date, 'EEEEE'),
      value: salesMap[key] || 0,
    };
  });
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

  const sevenDays = useMemo(() => buildSevenDays(report.dailySales), [report.dailySales]);
  const maxBar = Math.max(...sevenDays.map(item => item.value), 1);
  const pnlRows = [
    ['Total revenue', formatCurrency(report.totalRevenue)],
    ['Total expenses', formatCurrency(report.totalExpenses)],
    ['Net profit', formatCurrency(report.netProfit), true],
    ['Best selling product', report.bestSellingProduct, false, 'star'],
    ['Most expensive category', report.mostExpensiveCategory],
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="Reports"
        title="Insights"
        subtitle="Analyze sales, expenses, and profitability."
      />

      <SurfaceCard style={styles.filterCard}>
        <Text style={styles.cardTitle}>Date Range</Text>
        <DateField
          label="From"
          value={fromDate}
          onChangeText={value => updateDate('from', value)}
          onBack={() => shiftDate('from', -1)}
          onForward={() => shiftDate('from', 1)}
        />
        <DateField
          label="To"
          value={toDate}
          onChangeText={value => updateDate('to', value)}
          onBack={() => shiftDate('to', -1)}
          onForward={() => shiftDate('to', 1)}
        />
        {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
        {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}
        <KoboButton
          onPress={() => loadReport(fromDate, toDate)}
          loading={isLoading}
          disabled={isLoading}>
          Apply Filter
        </KoboButton>
      </SurfaceCard>

      <HeroCard variant="success" style={styles.profitHero}>
        <View style={styles.heroRow}>
          <TrendingUp color={COLORS.primaryForeground} size={18} />
          <Text style={styles.heroEyebrow}>NET PROFIT</Text>
        </View>
        <Text style={[styles.profitAmount, type.number]}>
          {formatCurrency(report.netProfit)}
        </Text>
        <View style={styles.glassRow}>
          <View style={styles.glassTile}>
            <Text style={styles.glassLabel}>Revenue</Text>
            <Text style={[styles.glassValue, type.number]}>
              {formatCurrency(report.totalRevenue)}
            </Text>
          </View>
          <View style={styles.glassTile}>
            <Text style={styles.glassLabel}>Expenses</Text>
            <Text style={[styles.glassValue, type.number]}>
              {formatCurrency(report.totalExpenses)}
            </Text>
          </View>
        </View>
      </HeroCard>

      <SurfaceCard style={styles.chartCard}>
        <Text style={styles.cardTitle}>Daily Sales</Text>
        <View style={styles.barChart}>
          {sevenDays.map((item, index) => {
            const height = 26 + (item.value / maxBar) * 116;
            const isLast = index === sevenDays.length - 1;
            return (
              <View key={`${item.label}-${index}`} style={styles.barItem}>
                <View
                  style={[
                    styles.bar,
                    {height},
                    isLast ? gradientStyle('primary') : styles.barSoft,
                  ]}
                />
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.chartCard}>
        <Text style={styles.cardTitle}>Expenses by Category</Text>
        {report.expensesByCategory.length > 0 ? (
          report.expensesByCategory.map(item => (
            <View key={item.category} style={styles.categoryRow}>
              <Text style={styles.categoryName}>{item.category}</Text>
              <Text style={[styles.categoryValue, type.number]}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No expenses found for this date range.</Text>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.pnlCard}>
        <Text style={styles.cardTitle}>Profit and Loss</Text>
        {pnlRows.map(row => (
          <View key={row[0]} style={[styles.pnlRow, row[2] && styles.pnlHighlight]}>
            <View style={styles.pnlLabelWrap}>
              {row[3] === 'star' ? (
                <Star color={COLORS.warning} size={17} fill={COLORS.warning} />
              ) : null}
              <Text style={[styles.pnlLabel, row[2] && styles.pnlLabelStrong]}>
                {row[0]}
              </Text>
            </View>
            <Text
              style={[
                styles.pnlValue,
                type.number,
                row[2] && styles.pnlValueStrong,
              ]}>
              {row[1]}
            </Text>
          </View>
        ))}
      </SurfaceCard>
    </ScrollView>
  );
}

function DateField({label, value, onChangeText, onBack, onForward}) {
  return (
    <View style={styles.dateBlock}>
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateRow}>
        <TouchableOpacity activeOpacity={0.84} onPress={onBack} style={styles.dateButton}>
          <ChevronLeft color={COLORS.primary} size={18} />
        </TouchableOpacity>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.dateInput}
          placeholderTextColor={COLORS.muted}
        />
        <TouchableOpacity activeOpacity={0.84} onPress={onForward} style={styles.dateButton}>
          <ChevronRight color={COLORS.primary} size={18} />
        </TouchableOpacity>
      </View>
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
  filterCard: {
    gap: 10,
  },
  cardTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  dateBlock: {
    gap: 5,
  },
  dateLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dateButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
    width: 42,
  },
  dateInput: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    color: COLORS.text,
    flex: 1,
    fontFamily: FONT_FAMILY,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
  },
  profitHero: {
    marginTop: 16,
  },
  heroRow: {
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
  profitAmount: {
    color: COLORS.primaryForeground,
    fontSize: 36,
    marginTop: 12,
  },
  glassRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  glassTile: {
    backgroundColor: COLORS.glass,
    borderRadius: 18,
    flex: 1,
    padding: 12,
  },
  glassLabel: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.82,
  },
  glassValue: {
    color: COLORS.primaryForeground,
    fontSize: 15,
    marginTop: 4,
  },
  chartCard: {
    marginTop: 16,
  },
  barChart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 10,
    height: 178,
    justifyContent: 'space-between',
    paddingTop: 18,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 999,
    width: '70%',
  },
  barSoft: {
    backgroundColor: COLORS.primarySoft,
  },
  barLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
  },
  categoryRow: {
    alignItems: 'center',
    borderTopColor: COLORS.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  categoryName: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  categoryValue: {
    color: COLORS.danger,
    fontSize: 14,
  },
  emptyText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    paddingVertical: 12,
    textAlign: 'center',
  },
  pnlCard: {
    marginTop: 16,
  },
  pnlRow: {
    alignItems: 'center',
    borderTopColor: COLORS.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    gap: 10,
  },
  pnlHighlight: {
    minHeight: 62,
  },
  pnlLabelWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  pnlLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
  },
  pnlLabelStrong: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  pnlValue: {
    color: COLORS.text,
    fontSize: 14,
    textAlign: 'right',
  },
  pnlValueStrong: {
    color: COLORS.primary,
    fontSize: 19,
  },
});

export default ReportsScreen;
