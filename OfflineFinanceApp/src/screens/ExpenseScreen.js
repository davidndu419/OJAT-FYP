import React, {useCallback, useMemo, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {ChevronDown, ChevronLeft, ChevronRight, Save, Wallet} from 'lucide-react-native';
import {Menu, Text} from 'react-native-paper';
import {format, formatISO, isValid, parseISO} from 'date-fns';
import {getDBConnection} from '../database/db';
import {
  formatCurrency,
  generateId,
  getCurrentTimestamp,
  getRowsArray,
} from '../utils/helpers';
import {syncInBackground} from '../services/syncService';
import {COLORS, FONT_FAMILY} from '../theme/theme';
import {HeroCard, IconBubble, KoboButton, ScreenHeader, SurfaceCard, type} from '../components/KoboUI';
import {LuminousStatus} from '../components/LuminousStatus';

const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Transport',
  'Stock Purchase',
  'Miscellaneous',
];

const formatDateInput = date => format(date, 'yyyy-MM-dd');

const getMonthRange = () => {
  const now = new Date();
  const startOfMonth = formatISO(new Date(now.getFullYear(), now.getMonth(), 1));
  const endOfMonth = formatISO(
    new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  );

  return {startOfMonth, endOfMonth};
};

const createDateFromInput = value => {
  const date = parseISO(value);

  if (!isValid(date) || formatDateInput(date) !== value) {
    return null;
  }

  return date;
};

function ExpenseScreen() {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(formatDateInput(new Date()));
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [errors, setErrors] = useState({});
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = await getDBConnection();
      const {startOfMonth, endOfMonth} = getMonthRange();

      const [expensesResult] = await db.executeSql(
        'SELECT * FROM expenses ORDER BY date DESC LIMIT 25;',
      );
      const [monthlyTotalResult] = await db.executeSql(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE date BETWEEN ? AND ?;`,
        [startOfMonth, endOfMonth],
      );

      setRecentExpenses(getRowsArray(expensesResult));
      setMonthlyTotal(Number(monthlyTotalResult.rows.item(0).total || 0));
    } catch (error) {
      setRecentExpenses([]);
      setMonthlyTotal(0);
      setErrors({form: 'Unable to load local expenses.'});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses]),
  );

  const parsedExpenseDate = useMemo(
    () => createDateFromInput(expenseDate),
    [expenseDate],
  );

  const updateField = (field, value) => {
    setErrors(current => ({...current, [field]: '', form: ''}));

    if (field === 'category') {
      setCategory(value);
    } else if (field === 'description') {
      setDescription(value);
    } else if (field === 'amount') {
      setAmount(value);
    } else if (field === 'date') {
      setExpenseDate(value);
    }
  };

  const shiftDate = days => {
    const baseDate = parsedExpenseDate || new Date();
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + days);
    updateField('date', formatDateInput(nextDate));
  };

  const validateExpense = () => {
    const nextErrors = {};

    if (!category) {
      nextErrors.category = 'Category is required.';
    }

    if (!description.trim()) {
      nextErrors.description = 'Description is required.';
    }

    if (!amount.trim()) {
      nextErrors.amount = 'Amount is required.';
    } else if (!/^\d+(\.\d+)?$/.test(amount.trim()) || Number(amount) <= 0) {
      nextErrors.amount = 'Amount must be a valid number greater than zero.';
    }

    if (!expenseDate.trim()) {
      nextErrors.date = 'Date is required.';
    } else if (!parsedExpenseDate) {
      nextErrors.date = 'Use a valid date in YYYY-MM-DD format.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveExpense = async () => {
    if (!validateExpense()) {
      return;
    }

    setIsSaving(true);
    try {
      const db = await getDBConnection();
      const dateValue = formatISO(
        new Date(
          parsedExpenseDate.getFullYear(),
          parsedExpenseDate.getMonth(),
          parsedExpenseDate.getDate(),
          new Date().getHours(),
          new Date().getMinutes(),
          new Date().getSeconds(),
          new Date().getMilliseconds(),
        ),
      );

      await db.executeSql(
        `INSERT INTO expenses (id, category, description, amount, date, updated_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          generateId(),
          category,
          description.trim(),
          Number(amount),
          dateValue || getCurrentTimestamp(),
          getCurrentTimestamp(),
          0,
        ],
      );

      setCategory('');
      setDescription('');
      setAmount('');
      setExpenseDate(formatDateInput(new Date()));
      setMessage('Expense saved successfully.');
      await loadExpenses();
      
      // Trigger background sync
      syncInBackground();
    } catch (error) {
      setErrors({form: 'Unable to save expense. Please try again.'});
    } finally {
      setIsSaving(false);
    }
  };

  const renderExpense = ({item}) => (
    <View style={styles.expenseRow}>
      <IconBubble tone="danger" size={42}>
        <Wallet color={COLORS.danger} size={19} strokeWidth={2.4} />
      </IconBubble>
      <View style={styles.expenseDetails}>
        <Text style={styles.expenseTitle}>{item.category}</Text>
        <Text style={styles.expenseDescription}>{item.description}</Text>
      </View>
      <View style={styles.expenseMeta}>
        <Text style={[styles.expenseAmount, type.number]}>
          -{formatCurrency(item.amount)}
        </Text>
        <Text style={styles.expenseDate}>{format(parseISO(item.date), 'MMM d, h:mm a')}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <ScreenHeader
          eyebrow="Expenses"
          title="Spend"
          subtitle="Track spending locally for offline reporting."
        />

        <HeroCard variant="sunrise" style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL EXPENSES THIS MONTH</Text>
          <Text style={[styles.summaryValue, type.number]}>
            {formatCurrency(monthlyTotal)}
          </Text>
        </HeroCard>

        <SurfaceCard style={styles.formCard}>
          <Menu
            visible={categoryMenuVisible}
            onDismiss={() => setCategoryMenuVisible(false)}
            anchor={
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => setCategoryMenuVisible(true)}
                style={[
                  styles.categoryButton,
                  errors.category && styles.errorBorder,
                ]}>
                <Text style={styles.categoryText}>
                  {category || 'Select Category'}
                </Text>
                <ChevronDown color={COLORS.primary} size={18} />
              </TouchableOpacity>
            }>
            {EXPENSE_CATEGORIES.map(item => (
              <Menu.Item
                key={item}
                onPress={() => {
                  updateField('category', item);
                  setCategoryMenuVisible(false);
                }}
                title={item}
              />
            ))}
          </Menu>
          {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}

          <TextInput
            placeholder="Description"
            value={description}
            onChangeText={value => updateField('description', value)}
            style={styles.input}
            placeholderTextColor={COLORS.muted}
          />
          {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}

          <TextInput
            placeholder="Amount"
            value={amount}
            onChangeText={value => updateField('amount', value)}
            keyboardType="decimal-pad"
            style={styles.input}
            placeholderTextColor={COLORS.muted}
          />
          {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}

          <View style={styles.datePickerRow}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => shiftDate(-1)}
              style={styles.dateButton}>
              <ChevronLeft color={COLORS.primary} size={18} />
            </TouchableOpacity>
            <TextInput
              placeholder="Date"
              value={expenseDate}
              onChangeText={value => updateField('date', value)}
              style={styles.dateInput}
              placeholderTextColor={COLORS.muted}
            />
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => shiftDate(1)}
              style={styles.dateButton}>
              <ChevronRight color={COLORS.primary} size={18} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => updateField('date', formatDateInput(new Date()))}
              style={styles.todayButton}>
              <Text style={styles.todayText}>Today</Text>
            </TouchableOpacity>
          </View>
          {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
          {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}

          <KoboButton
            onPress={handleSaveExpense}
            loading={isSaving}
            disabled={isSaving}>
            Save Expense
          </KoboButton>
        </SurfaceCard>

        <SurfaceCard style={styles.listCard}>
          <View style={styles.sectionHead}>
            <Save color={COLORS.primary} size={20} strokeWidth={2.4} />
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
          </View>
          {recentExpenses.length > 0 ? (
            <FlatList
              data={recentExpenses}
              keyExtractor={item => item.id}
              renderItem={renderExpense}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <IconBubble tone="muted" size={50}>
                <Wallet color={COLORS.muted} size={22} />
              </IconBubble>
              <Text style={styles.emptyText}>No expenses recorded yet.</Text>
            </View>
          )}
        </SurfaceCard>

        {isLoading ? <Text style={styles.loadingText}>Refreshing local expenses...</Text> : null}
      </ScrollView>

      <LuminousStatus
        visible={Boolean(message)}
        message={message}
        onDismiss={() => setMessage('')}
        type="success"
      />
    </KeyboardAvoidingView>
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
    paddingBottom: 100,
    paddingHorizontal: 20,
    width: '100%',
  },
  summaryCard: {
    marginBottom: 16,
    minHeight: 132,
    justifyContent: 'center',
  },
  summaryLabel: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  summaryValue: {
    color: COLORS.primaryForeground,
    fontSize: 34,
    marginTop: 8,
  },
  formCard: {
    gap: 10,
  },
  categoryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  categoryText: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  errorBorder: {
    borderColor: COLORS.danger,
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  datePickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  dateInput: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    color: COLORS.text,
    flex: 1,
    fontFamily: FONT_FAMILY,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  dateButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    height: 46,
    justifyContent: 'center',
    width: 42,
  },
  todayButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    height: 46,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  todayText: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
  },
  listCard: {
    marginTop: 16,
    paddingBottom: 4,
  },
  sectionHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
  },
  expenseRow: {
    alignItems: 'center',
    borderTopColor: COLORS.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingVertical: 12,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  expenseDescription: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 2,
  },
  expenseMeta: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    color: COLORS.danger,
    fontSize: 14,
  },
  expenseDate: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    marginTop: 10,
    textAlign: 'center',
  },
  loadingText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default ExpenseScreen;
