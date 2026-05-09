import React, {useCallback, useState} from 'react';
import {FlatList, ScrollView, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  Button,
  Card,
  Divider,
  RadioButton,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import {getDBConnection, getSetting, setSetting} from '../database/db';
import {generateId, getCurrentTimestamp, getRowsArray} from '../utils/helpers';
import {COLORS, FONT_FAMILY} from '../theme/theme';

const ServiceSeparator = () => <Divider />;

function SettingsScreen() {
  const [serviceTypes, setServiceTypes] = useState([]);
  const [newServiceType, setNewServiceType] = useState('');
  const [balanceDisplay, setBalanceDisplay] = useState('separate');
  const [expenseAllocation, setExpenseAllocation] = useState('combined');
  const [salesPercent, setSalesPercent] = useState('60');
  const [servicesPercent, setServicesPercent] = useState('40');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = await getDBConnection();
      const [serviceTypesResult] = await db.executeSql(
        'SELECT * FROM service_types ORDER BY name ASC;',
      );
      const [
        balanceValue,
        allocationValue,
        salesPercentValue,
        servicesPercentValue,
      ] = await Promise.all([
        getSetting('balance_display'),
        getSetting('expense_allocation'),
        getSetting('sales_expense_percent'),
        getSetting('services_expense_percent'),
      ]);

      setServiceTypes(getRowsArray(serviceTypesResult));
      setBalanceDisplay(balanceValue || 'separate');
      setExpenseAllocation(allocationValue || 'combined');
      setSalesPercent(salesPercentValue || '60');
      setServicesPercent(servicesPercentValue || '40');
      setErrors({});
    } catch (error) {
      setErrors({form: 'Unable to load settings from SQLite.'});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  const handleAddServiceType = async () => {
    const name = newServiceType.trim();
    const duplicate = serviceTypes.some(
      item =>
        String(item.name || '')
          .trim()
          .toLowerCase() === name.toLowerCase(),
    );

    if (!name) {
      setErrors(current => ({
        ...current,
        serviceType: 'Service type name is required.',
      }));
      return;
    }

    if (duplicate) {
      setErrors(current => ({
        ...current,
        serviceType: 'This service type already exists.',
      }));
      return;
    }

    try {
      const db = await getDBConnection();
      await db.executeSql(
        'INSERT INTO service_types (id, name, created_at) VALUES (?, ?, ?);',
        [generateId(), name, getCurrentTimestamp()],
      );
      setNewServiceType('');
      setErrors(current => ({...current, serviceType: '', form: ''}));
      setMessage('Service type added.');
      await loadSettings();
    } catch (error) {
      setErrors(current => ({
        ...current,
        serviceType: 'Unable to add service type.',
      }));
    }
  };

  const handleDeleteServiceType = async id => {
    try {
      const db = await getDBConnection();
      await db.executeSql('DELETE FROM service_types WHERE id = ?;', [id]);
      setMessage('Service type deleted.');
      await loadSettings();
    } catch (error) {
      setErrors(current => ({
        ...current,
        serviceType: 'Unable to delete service type.',
      }));
    }
  };

  const updateBalanceDisplay = async value => {
    setBalanceDisplay(value);
    setErrors(current => ({...current, form: ''}));
    await setSetting('balance_display', value);
    setMessage('Balance display preference saved.');
  };

  const updateExpenseAllocation = async value => {
    setExpenseAllocation(value);
    setErrors(current => ({...current, allocation: '', form: ''}));
    await setSetting('expense_allocation', value);
    setMessage('Profit calculation method saved.');
  };

  const savePercentagesIfValid = async (nextSales, nextServices) => {
    const salesValue = Number(nextSales);
    const servicesValue = Number(nextServices);
    const valid =
      /^\d+(\.\d+)?$/.test(String(nextSales)) &&
      /^\d+(\.\d+)?$/.test(String(nextServices)) &&
      salesValue >= 0 &&
      servicesValue >= 0 &&
      salesValue + servicesValue === 100;

    if (!valid) {
      setErrors(current => ({
        ...current,
        allocation: 'Sales and Services percentages must add up to 100.',
      }));
      return;
    }

    setErrors(current => ({...current, allocation: '', form: ''}));
    await Promise.all([
      setSetting('sales_expense_percent', String(nextSales)),
      setSetting('services_expense_percent', String(nextServices)),
    ]);
    setMessage('Expense split saved.');
  };

  const updateSalesPercent = value => {
    setSalesPercent(value);
    savePercentagesIfValid(value, servicesPercent);
  };

  const updateServicesPercent = value => {
    setServicesPercent(value);
    savePercentagesIfValid(salesPercent, value);
  };

  const renderServiceType = ({item}) => (
    <View style={styles.serviceRow}>
      <View style={styles.serviceText}>
        <Text style={styles.serviceName}>{item.name}</Text>
        <Text style={styles.serviceMeta}>Service income category</Text>
      </View>
      <Button
        mode="outlined"
        textColor={COLORS.danger}
        onPress={() => handleDeleteServiceType(item.id)}>
        Delete
      </Button>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Settings</Text>
        <Text style={styles.title}>Business Setup</Text>
        <Text style={styles.subtitle}>
          Configure service types, balance display, and profit allocation.
        </Text>
      </View>

      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Service Types Management</Text>
          <View style={styles.addRow}>
            <TextInput
              mode="outlined"
              label="New service type"
              value={newServiceType}
              onChangeText={value => {
                setNewServiceType(value);
                setErrors(current => ({...current, serviceType: '', form: ''}));
              }}
              style={styles.addInput}
            />
            <Button
              mode="contained"
              onPress={handleAddServiceType}
              style={styles.addButton}>
              Add
            </Button>
          </View>
          {errors.serviceType ? (
            <Text style={styles.errorText}>{errors.serviceType}</Text>
          ) : null}
          <Divider style={styles.divider} />
          {serviceTypes.length > 0 ? (
            <FlatList
              data={serviceTypes}
              keyExtractor={item => item.id}
              renderItem={renderServiceType}
              scrollEnabled={false}
              ItemSeparatorComponent={ServiceSeparator}
            />
          ) : (
            <Text style={styles.emptyText}>No service types added yet.</Text>
          )}
        </Card.Content>
      </Card>

      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Balance Card Display</Text>
          <RadioButton.Group
            onValueChange={updateBalanceDisplay}
            value={balanceDisplay}>
            <RadioOption
              label="Show Sales and Services separately"
              value="separate"
            />
            <RadioOption
              label="Combine Sales and Services together"
              value="combined"
            />
            <RadioOption label="Show Services only" value="services_only" />
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Profit Calculation Method</Text>
          <RadioButton.Group
            onValueChange={updateExpenseAllocation}
            value={expenseAllocation}>
            <RadioOption
              label="All expenses apply to total business"
              value="combined"
            />
            <RadioOption
              label="Split expenses between Sales and Services"
              value="split"
            />
          </RadioButton.Group>
          {expenseAllocation === 'split' ? (
            <View style={styles.percentPanel}>
              <TextInput
                mode="outlined"
                label="Sales percentage"
                value={salesPercent}
                onChangeText={updateSalesPercent}
                keyboardType="decimal-pad"
                style={styles.percentInput}
              />
              <TextInput
                mode="outlined"
                label="Services percentage"
                value={servicesPercent}
                onChangeText={updateServicesPercent}
                keyboardType="decimal-pad"
                style={styles.percentInput}
              />
              {errors.allocation ? (
                <Text style={styles.errorText}>{errors.allocation}</Text>
              ) : null}
            </View>
          ) : null}
        </Card.Content>
      </Card>

      {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}
      {isLoading ? (
        <Text style={styles.loadingText}>Refreshing settings...</Text>
      ) : null}

      <Snackbar
        visible={Boolean(message)}
        onDismiss={() => setMessage('')}
        duration={1600}>
        {message}
      </Snackbar>
    </ScrollView>
  );
}

function RadioOption({label, value}) {
  return (
    <RadioButton.Item
      label={label}
      value={value}
      labelStyle={styles.radioLabel}
      style={styles.radioItem}
      position="leading"
    />
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
  cardTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  addRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  addInput: {
    backgroundColor: COLORS.surface,
    flex: 1,
  },
  addButton: {
    borderRadius: 8,
  },
  divider: {
    marginVertical: 12,
  },
  serviceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  serviceText: {
    flex: 1,
  },
  serviceName: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  serviceMeta: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 2,
  },
  radioItem: {
    paddingHorizontal: 0,
  },
  radioLabel: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
  },
  percentPanel: {
    backgroundColor: COLORS.primaryPale,
    borderRadius: 8,
    gap: 10,
    marginTop: 10,
    padding: 12,
  },
  percentInput: {
    backgroundColor: COLORS.surface,
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
    marginBottom: 10,
    marginTop: 6,
  },
  loadingText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default SettingsScreen;
