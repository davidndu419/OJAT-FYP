import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button, Portal, Text, TextInput} from 'react-native-paper';
import {
  Activity,
  ArrowLeft,
  ArrowUpDown,
  Download,
  Package,
  Receipt,
  Search,
  ShoppingCart,
} from 'lucide-react-native';
import {format, formatISO, isValid, parseISO} from 'date-fns';
import {getDBConnection, getSetting} from '../database/db';
import {exportTransactionStatement} from '../utils/statementExport';
import {formatCurrency, getRowsArray} from '../utils/helpers';
import {COLORS, FONT_FAMILY} from '../theme/theme';
import {IconBubble, gradientStyle, type} from '../components/KoboUI';

const typeFilters = [
  {key: 'all', label: 'All'},
  {key: 'sale', label: 'Sales'},
  {key: 'service', label: 'Services'},
  {key: 'purchase', label: 'Stock Purchases'},
  {key: 'expense', label: 'Expenses'},
];

const periodFilters = [
  {key: 'today', label: 'Today'},
  {key: 'month', label: 'This Month'},
  {key: 'custom', label: 'Custom'},
];

const renderSearchIcon = () => <Search color={COLORS.muted} size={18} />;

const renderDownloadIcon = () => (
  <Download color={COLORS.primaryForeground} size={15} />
);

const formatDateInput = date => format(date, 'yyyy-MM-dd');

const createDateFromInput = value => {
  const date = parseISO(value);

  if (!isValid(date) || formatDateInput(date) !== value) {
    return null;
  }

  return date;
};

const getInitialCustomRange = () => {
  const now = new Date();
  return {
    from: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: formatDateInput(now),
  };
};

const buildPeriodRange = (period, customFrom, customTo) => {
  const now = new Date();

  if (period === 'today') {
    return {
      startDate: formatISO(
        new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      ),
      endDate: formatISO(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        ),
      ),
      label: 'Today',
    };
  }

  if (period === 'month') {
    return {
      startDate: formatISO(new Date(now.getFullYear(), now.getMonth(), 1)),
      endDate: formatISO(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        ),
      ),
      label: format(now, 'MMMM yyyy'),
    };
  }

  const fromDate = createDateFromInput(customFrom);
  const toDate = createDateFromInput(customTo);

  if (!fromDate || !toDate || fromDate > toDate) {
    return null;
  }

  return {
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
    label: `${format(fromDate, 'MMM d, yyyy')} - ${format(
      toDate,
      'MMM d, yyyy',
    )}`,
  };
};

const normalizePaymentMethod = value =>
  String(value || '').toLowerCase() === 'bank' ? 'bank' : 'cash';

const getExpenseKind = expense =>
  String(expense.category || '')
    .trim()
    .toLowerCase() === 'stock purchase'
    ? 'purchase'
    : 'expense';

const getTransactionIcon = kind => {
  if (kind === 'sale') {
    return ShoppingCart;
  }

  if (kind === 'service') {
    return Activity;
  }

  if (kind === 'purchase') {
    return Package;
  }

  return Receipt;
};

const getTransactionTone = kind =>
  kind === 'sale' || kind === 'service' ? 'success' : 'danger';

const getTypeLabel = kind => {
  if (kind === 'sale') {
    return 'Sale';
  }

  if (kind === 'service') {
    return 'Service';
  }

  if (kind === 'purchase') {
    return 'Stock Purchase';
  }

  return 'Expense';
};

const getReadableDate = value => {
  try {
    return format(parseISO(value), 'MMM d, yyyy p');
  } catch (error) {
    return String(value || 'Unknown date');
  }
};

const makeSignedAmount = item => {
  const amount = Number(item.amount || 0);
  return item.direction === 'in' ? amount : -amount;
};

function TransactionHistoryScreen({navigation}) {
  const insets = useSafeAreaInsets();
  const initialCustomRange = useMemo(() => getInitialCustomRange(), []);
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState(initialCustomRange.from);
  const [customTo, setCustomTo] = useState(initialCustomRange.to);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFrom, setExportFrom] = useState(initialCustomRange.from);
  const [exportTo, setExportTo] = useState(initialCustomRange.to);
  const [transactions, setTransactions] = useState([]);
  const [business, setBusiness] = useState({
    name: 'OJAT Business',
    tin: 'Not provided',
  });
  const [periodLabel, setPeriodLabel] = useState('This Month');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const range = useMemo(
    () => buildPeriodRange(period, customFrom, customTo),
    [customFrom, customTo, period],
  );

  const loadLedger = useCallback(async () => {
    if (!range) {
      setErrors({date: 'Choose a valid custom period in YYYY-MM-DD format.'});
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const db = await getDBConnection();
      const [
        salesResult,
        servicesResult,
        expensesResult,
        businessName,
        businessTin,
      ] = await Promise.all([
        db.executeSql(
          `SELECT sales.id,
                  sales.product_id,
                  sales.quantity,
                  sales.total,
                  sales.date,
                  COALESCE(sales.payment_method, 'cash') AS payment_method,
                  products.name AS product_name
           FROM sales
           LEFT JOIN products ON products.id = sales.product_id
           WHERE sales.date BETWEEN ? AND ?
           ORDER BY sales.date DESC;`,
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
          `SELECT *
           FROM expenses
           WHERE date BETWEEN ? AND ?
           ORDER BY date DESC;`,
          [range.startDate, range.endDate],
        ),
        getSetting('business_name'),
        getSetting('business_tin'),
      ]);

      const saleRows = getRowsArray(salesResult[0]).map(item => ({
        id: `sale-${item.id}`,
        sourceId: item.id,
        kind: 'sale',
        typeLabel: getTypeLabel('sale'),
        description: item.product_name || 'Deleted product',
        meta: `${Number(item.quantity || 0)} unit${
          Number(item.quantity || 0) === 1 ? '' : 's'
        }`,
        sku: item.product_id,
        amount: Number(item.total || item.amount || 0),
        direction: 'in',
        paymentMethod: normalizePaymentMethod(item.payment_method),
        date: item.date,
      }));
      const serviceRows = getRowsArray(servicesResult[0]).map(item => ({
        id: `service-${item.id}`,
        sourceId: item.id,
        kind: 'service',
        typeLabel: getTypeLabel('service'),
        description: item.service_type || 'Service',
        meta: item.notes || 'Service income',
        sku: '',
        amount: Number(item.amount || 0),
        direction: 'in',
        paymentMethod: normalizePaymentMethod(item.payment_method),
        date: item.date,
      }));
      const expenseRows = getRowsArray(expensesResult[0]).map(item => {
        const kind = getExpenseKind(item);

        return {
          id: `expense-${item.id}`,
          sourceId: item.id,
          kind,
          typeLabel: getTypeLabel(kind),
          description: item.description || item.category || getTypeLabel(kind),
          meta: item.category || getTypeLabel(kind),
          sku: '',
          amount: Number(item.amount || 0),
          direction: 'out',
          paymentMethod: 'cash',
          date: item.date,
        };
      });

      setTransactions([...saleRows, ...serviceRows, ...expenseRows]);
      setBusiness({
        name: businessName || 'OJAT Business',
        tin: businessTin || 'Not provided',
      });
      setPeriodLabel(range.label);
    } catch (error) {
      setTransactions([]);
      setErrors({form: 'Unable to load transaction history from SQLite.'});
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      loadLedger();
    }, [loadLedger]),
  );

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return transactions
      .filter(item => typeFilter === 'all' || item.kind === typeFilter)
      .filter(item => {
        if (!query) {
          return true;
        }

        return [item.description, item.meta, item.sku, item.sourceId]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        const direction = sortOrder === 'desc' ? -1 : 1;
        return (
          (new Date(left.date).getTime() - new Date(right.date).getTime()) *
          direction
        );
      });
  }, [searchQuery, sortOrder, transactions, typeFilter]);

  const closingBalance = useMemo(
    () =>
      filteredTransactions.reduce(
        (total, item) => total + makeSignedAmount(item),
        0,
      ),
    [filteredTransactions],
  );

  const buildExportRows = rows =>
    rows.map(item => {
      const signedAmount = makeSignedAmount(item);

      return {
        ...item,
        dateLabel: getReadableDate(item.date),
        paymentLabel:
          item.paymentMethod === 'bank'
            ? 'Bank'
            : item.kind === 'expense' || item.kind === 'purchase'
            ? 'Cash'
            : 'Cash',
        signedAmountLabel: `${signedAmount >= 0 ? '+' : '-'}${formatCurrency(
          Math.abs(signedAmount),
        )}`,
      };
    });

  const handleExport = async () => {
    setExportFrom(range?.startDate?.slice(0, 10) || initialCustomRange.from);
    setExportTo(range?.endDate?.slice(0, 10) || initialCustomRange.to);
    setExportModalVisible(true);
  };

  const handleConfirmExport = async () => {
    const fromDate = createDateFromInput(exportFrom);
    const toDate = createDateFromInput(exportTo);

    if (!fromDate || !toDate || fromDate > toDate) {
      setErrors(current => ({
        ...current,
        export: 'Choose valid begin and end dates.',
      }));
      return;
    }

    const startDate = formatISO(
      new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()),
    );
    const endDate = formatISO(
      new Date(
        toDate.getFullYear(),
        toDate.getMonth(),
        toDate.getDate(),
        23,
        59,
        59,
        999,
      ),
    );
    const exportTransactions = filteredTransactions.filter(
      item => item.date >= startDate && item.date <= endDate,
    );
    const exportBalance = exportTransactions.reduce(
      (total, item) => total + makeSignedAmount(item),
      0,
    );
    const exportPeriodLabel = `${format(fromDate, 'MMM d, yyyy')} - ${format(
      toDate,
      'MMM d, yyyy',
    )}`;

    setIsExporting(true);
    try {
      await exportTransactionStatement({
        business,
        closingBalance: exportBalance,
        closingBalanceLabel: formatCurrency(exportBalance),
        generatedAtLabel: format(new Date(), 'PP p'),
        periodLabel: exportPeriodLabel,
        transactions: buildExportRows(exportTransactions),
      });
      setExportModalVisible(false);
      setErrors(current => ({...current, export: ''}));
    } finally {
      setIsExporting(false);
    }
  };

  const renderTransaction = ({item}) => {
    const Icon = getTransactionIcon(item.kind);
    const tone = getTransactionTone(item.kind);
    const signedAmount = makeSignedAmount(item);

    return (
      <View style={styles.ledgerRow}>
        <IconBubble tone={tone} size={42}>
          <Icon
            color={tone === 'success' ? COLORS.success : COLORS.danger}
            size={19}
            strokeWidth={2.4}
          />
        </IconBubble>
        <View style={styles.ledgerText}>
          <View style={styles.descriptionRow}>
            <Text numberOfLines={1} style={styles.ledgerTitle}>
              {item.description}
            </Text>
            <Text style={styles.typeLabel}>{item.typeLabel}</Text>
          </View>
          <Text numberOfLines={1} style={styles.ledgerMeta}>
            {item.sku ? `SKU: ${item.sku} | ` : ''}
            {item.meta}
          </Text>
          <View style={styles.rowFooter}>
            <Text style={styles.dateText}>{getReadableDate(item.date)}</Text>
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentBadgeText}>
                {item.paymentMethod === 'bank' ? 'Bank' : 'Cash'}
              </Text>
            </View>
          </View>
        </View>
        <Text
          style={[
            styles.ledgerAmount,
            type.number,
            signedAmount >= 0 ? styles.amountIn : styles.amountOut,
          ]}>
          {signedAmount >= 0 ? '+' : '-'}
          {formatCurrency(Math.abs(signedAmount))}
        </Text>
      </View>
    );
  };

  const listHeader = (
    <View>
      <View style={styles.summaryPanel}>
        <Text style={styles.summaryLabel}>Closing Balance</Text>
        <Text
          style={[
            styles.summaryValue,
            type.number,
            closingBalance >= 0 ? styles.amountIn : styles.amountOut,
          ]}>
          {formatCurrency(closingBalance)}
        </Text>
        <Text style={styles.summaryMeta}>
          {filteredTransactions.length} transaction
          {filteredTransactions.length === 1 ? '' : 's'} | {periodLabel}
        </Text>
      </View>

      <View style={styles.filterBlock}>
        <TextInput
          mode="outlined"
          placeholder="Search description or SKU"
          value={searchQuery}
          onChangeText={setSearchQuery}
          left={<TextInput.Icon icon={renderSearchIcon} />}
          style={styles.searchInput}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {typeFilters.map(item => {
            const active = item.key === typeFilter;
            return (
              <TouchableOpacity
                activeOpacity={0.84}
                key={item.key}
                onPress={() => setTypeFilter(item.key)}
                style={[styles.chip, active && gradientStyle('primary')]}>
                <Text style={[styles.chipText, active && styles.chipTextOn]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.periodCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodRow}>
            {periodFilters.map(item => {
              const active = item.key === period;
              return (
                <TouchableOpacity
                  activeOpacity={0.84}
                  key={item.key}
                  onPress={() => setPeriod(item.key)}
                  style={[
                    styles.periodPill,
                    active && styles.periodPillActive,
                  ]}>
                  <Text
                    style={[
                      styles.periodPillText,
                      active && styles.periodPillTextActive,
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {period === 'custom' ? (
            <View style={styles.customDateRow}>
              <TextInput
                mode="outlined"
                label="From"
                value={customFrom}
                onChangeText={setCustomFrom}
                style={styles.dateInput}
              />
              <TextInput
                mode="outlined"
                label="To"
                value={customTo}
                onChangeText={setCustomTo}
                style={styles.dateInput}
              />
            </View>
          ) : null}
          {errors.date ? (
            <Text style={styles.errorText}>{errors.date}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() =>
            setSortOrder(current => (current === 'desc' ? 'asc' : 'desc'))
          }
          style={styles.sortButton}>
          <ArrowUpDown color={COLORS.primary} size={17} strokeWidth={2.4} />
          <Text style={styles.sortText}>
            {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
          </Text>
        </TouchableOpacity>
      </View>
      {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.84}
          hitSlop={10}
          onPress={() => navigation.goBack()}
          style={styles.iconButton}>
          <ArrowLeft color={COLORS.primary} size={21} strokeWidth={2.4} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Reports</Text>
          <Text style={styles.title}>Transaction History</Text>
        </View>
        <Button
          compact
          mode="contained"
          onPress={handleExport}
          loading={isExporting}
          disabled={isExporting}
          icon={renderDownloadIcon}
          style={styles.exportButton}
          labelStyle={styles.exportButtonText}>
          Export PDF
        </Button>
      </View>

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading ledger...</Text>
        </View>
      ) : null}

      <FlatList
        data={filteredTransactions}
        keyExtractor={item => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Receipt color={COLORS.muted} size={28} />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptyText}>
                Try another period, type filter, or search term.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: Math.max(insets.bottom + 24, 36)},
        ]}
        showsVerticalScrollIndicator={false}
      />

      <Portal>
        {exportModalVisible ? (
          <View style={styles.modalBackdrop}>
            <View style={styles.exportModal}>
              <Text style={styles.exportModalTitle}>Export PDF Statement</Text>
              <Text style={styles.exportModalCopy}>
                Select the begin and end date for the PDF.
              </Text>
              <View style={styles.customDateRow}>
                <TextInput
                  mode="outlined"
                  label="Begin date"
                  value={exportFrom}
                  onChangeText={value => {
                    setExportFrom(value);
                    setErrors(current => ({...current, export: ''}));
                  }}
                  style={styles.dateInput}
                />
                <TextInput
                  mode="outlined"
                  label="End date"
                  value={exportTo}
                  onChangeText={value => {
                    setExportTo(value);
                    setErrors(current => ({...current, export: ''}));
                  }}
                  style={styles.dateInput}
                />
              </View>
              {errors.export ? (
                <Text style={styles.errorText}>{errors.export}</Text>
              ) : null}
              <View style={styles.exportActions}>
                <Button
                  mode="outlined"
                  onPress={() => setExportModalVisible(false)}
                  style={styles.modalButton}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleConfirmExport}
                  loading={isExporting}
                  disabled={isExporting}
                  style={styles.modalButton}>
                  Download PDF
                </Button>
              </View>
            </View>
          </View>
        ) : null}
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
    maxWidth: 448,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  exportButton: {
    borderRadius: 8,
  },
  exportButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 8,
  },
  loadingText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    alignSelf: 'center',
    maxWidth: 448,
    paddingHorizontal: 20,
    width: '100%',
  },
  summaryPanel: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginBottom: 14,
    overflow: 'hidden',
    padding: 18,
  },
  summaryLabel: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    opacity: 0.82,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: COLORS.primaryForeground,
    fontSize: 28,
    marginTop: 6,
  },
  summaryMeta: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
    opacity: 0.82,
  },
  filterBlock: {
    gap: 12,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
  },
  chipRow: {
    gap: 8,
    paddingRight: 2,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  chipText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  chipTextOn: {
    color: COLORS.primaryForeground,
  },
  periodCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  periodRow: {
    gap: 8,
  },
  periodPill: {
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  periodPillActive: {
    backgroundColor: COLORS.primarySoft,
  },
  periodPillText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  periodPillTextActive: {
    color: COLORS.primary,
  },
  customDateRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  dateInput: {
    backgroundColor: COLORS.surface,
    flex: 1,
  },
  sortButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryPale,
    borderColor: COLORS.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  sortText: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  ledgerRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    padding: 12,
  },
  ledgerText: {
    flex: 1,
    minWidth: 0,
  },
  descriptionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ledgerTitle: {
    color: COLORS.text,
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
  },
  typeLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
  },
  ledgerMeta: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 2,
  },
  rowFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  dateText: {
    color: COLORS.muted,
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
  },
  paymentBadge: {
    backgroundColor: COLORS.secondary,
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  paymentBadgeText: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
  },
  ledgerAmount: {
    fontSize: 12,
    minWidth: 88,
    textAlign: 'right',
  },
  amountIn: {
    color: COLORS.success,
  },
  amountOut: {
    color: COLORS.danger,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 8,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.36)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 20,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  exportModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    maxWidth: 448,
    padding: 18,
    width: '100%',
  },
  exportModalTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
  },
  exportModalCopy: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  exportActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalButton: {
    borderRadius: 8,
    flex: 1,
  },
});

export default TransactionHistoryScreen;
