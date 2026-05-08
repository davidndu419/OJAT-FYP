import React, {useCallback, useMemo, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  Button,
  Card,
  Divider,
  HelperText,
  Menu,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import {format, formatISO, isValid, parseISO} from 'date-fns';
import {getDBConnection} from '../database/db';
import {
  formatCurrency,
  generateId,
  getCurrentTimestamp,
  getRowsArray,
} from '../utils/helpers';

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
  const startOfMonth = formatISO(
    new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
  );
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
        `INSERT INTO expenses (id, category, description, amount, date, synced)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [
          generateId(),
          category,
          description.trim(),
          Number(amount),
          dateValue || getCurrentTimestamp(),
          0,
        ],
      );

      setCategory('');
      setDescription('');
      setAmount('');
      setExpenseDate(formatDateInput(new Date()));
      setMessage('Expense saved successfully.');
      await loadExpenses();
    } catch (error) {
      setErrors({form: 'Unable to save expense. Please try again.'});
    } finally {
      setIsSaving(false);
    }
  };

  const renderExpense = ({item}) => (
    <View style={styles.expenseRow}>
      <View style={styles.expenseDetails}>
        <Text variant="titleSmall" style={styles.expenseTitle}>
          {item.category}
        </Text>
        <Text variant="bodySmall" style={styles.expenseDescription}>
          {item.description}
        </Text>
      </View>
      <View style={styles.expenseMeta}>
        <Text variant="titleSmall" style={styles.expenseAmount}>
          {formatCurrency(item.amount)}
        </Text>
        <Text variant="bodySmall" style={styles.expenseDate}>
          {format(parseISO(item.date), 'MMM d, yyyy')}
        </Text>
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
        <Text variant="headlineSmall" style={styles.title}>
          Expenses
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Track spending locally for offline reporting.
        </Text>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.summaryLabel}>
              Total Expenses This Month
            </Text>
            <Text variant="headlineSmall" style={styles.summaryValue}>
              {formatCurrency(monthlyTotal)}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.formCard}>
          <Card.Content>
            <Menu
              visible={categoryMenuVisible}
              onDismiss={() => setCategoryMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setCategoryMenuVisible(true)}
                  contentStyle={styles.categoryButtonContent}
                  style={[
                    styles.categoryButton,
                    errors.category && styles.errorBorder,
                  ]}>
                  {category || 'Select Category'}
                </Button>
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
            <HelperText type="error" visible={Boolean(errors.category)}>
              {errors.category}
            </HelperText>

            <TextInput
              label="Description"
              value={description}
              onChangeText={value => updateField('description', value)}
              mode="outlined"
              style={styles.input}
              error={Boolean(errors.description)}
            />
            <HelperText type="error" visible={Boolean(errors.description)}>
              {errors.description}
            </HelperText>

            <TextInput
              label="Amount"
              value={amount}
              onChangeText={value => updateField('amount', value)}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
              error={Boolean(errors.amount)}
            />
            <HelperText type="error" visible={Boolean(errors.amount)}>
              {errors.amount}
            </HelperText>

            <View style={styles.datePickerRow}>
              <Button
                mode="contained-tonal"
                onPress={() => shiftDate(-1)}
                compact
                style={styles.dateButton}
                labelStyle={styles.dateButtonLabel}>
                {'<'}
              </Button>
              <TextInput
                label="Date"
                value={expenseDate}
                onChangeText={value => updateField('date', value)}
                mode="outlined"
                style={styles.dateInput}
                error={Boolean(errors.date)}
              />
              <Button
                mode="contained-tonal"
                onPress={() => shiftDate(1)}
                compact
                style={styles.dateButton}
                labelStyle={styles.dateButtonLabel}>
                {'>'}
              </Button>
              <Button
                mode="contained-tonal"
                onPress={() => updateField('date', formatDateInput(new Date()))}
                compact
                style={styles.todayButton}
                labelStyle={styles.todayButtonLabel}>
                Today
              </Button>
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
              onPress={handleSaveExpense}
              loading={isSaving}
              disabled={isSaving}
              style={styles.primaryButton}>
              Save Expense
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.listCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Recent Expenses
            </Text>
            <Text variant="bodySmall" style={styles.sectionSubtitle}>
              Latest expenses saved on this device
            </Text>
          </Card.Content>
          <Divider />
          {recentExpenses.length > 0 ? (
            <FlatList
              data={recentExpenses}
              keyExtractor={item => item.id}
              renderItem={renderExpense}
              scrollEnabled={false}
            />
          ) : (
            <Text variant="bodyMedium" style={styles.emptyText}>
              No expenses recorded yet.
            </Text>
          )}
        </Card>

        {isLoading ? (
          <Text variant="bodySmall" style={styles.loadingText}>
            Refreshing local expenses...
          </Text>
        ) : null}
      </ScrollView>

      <Snackbar
        visible={Boolean(message)}
        onDismiss={() => setMessage('')}
        duration={1800}>
        {message}
      </Snackbar>
    </KeyboardAvoidingView>
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
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 14,
  },
  summaryLabel: {
    color: '#64748b',
    marginBottom: 6,
  },
  summaryValue: {
    color: '#b42318',
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  categoryButton: {
    borderColor: '#6b7280',
    borderRadius: 6,
  },
  categoryButtonContent: {
    justifyContent: 'flex-start',
    minHeight: 52,
  },
  errorBorder: {
    borderColor: '#b42318',
  },
  input: {
    backgroundColor: '#ffffff',
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
  todayButton: {
    borderRadius: 6,
    marginLeft: 2,
  },
  todayButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 4,
  },
  formError: {
    color: '#b42318',
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 6,
    marginTop: 4,
  },
  listCard: {
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
  expenseRow: {
    alignItems: 'center',
    borderBottomColor: '#eef2f7',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  expenseDetails: {
    flex: 1,
    paddingRight: 12,
  },
  expenseTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  expenseDescription: {
    color: '#64748b',
    marginTop: 2,
  },
  expenseMeta: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    color: '#b42318',
    fontWeight: '700',
  },
  expenseDate: {
    color: '#64748b',
    marginTop: 2,
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

export default ExpenseScreen;
