import React, {useCallback, useState} from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  Button,
  Divider,
  Portal,
  RadioButton,
  Text,
  TextInput,
} from 'react-native-paper';
import {
  Briefcase,
  ChevronRight,
  Layers,
  LayoutGrid,
  LogOut,
  PieChart,
  RefreshCw,
  User,
  X,
} from 'lucide-react-native';
import {useDispatch} from 'react-redux';
import {logout} from '../store/slices/authSlice';
import {STORAGE_KEYS} from '../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getDBConnection, getSetting, setSetting, clearDatabase} from '../database/db';
import {generateId, getCurrentTimestamp, getRowsArray} from '../utils/helpers';
import {COLORS, FONT_FAMILY, cardShadow} from '../theme/theme';
import {IconBubble} from '../components/KoboUI';
import {BottomSheetModule} from '../components/BottomSheetModule';
import {globalEvents, EVENT_CLOSE_ALL_MODALS} from '../utils/events';
import {LuminousStatus} from '../components/LuminousStatus';

/* ─────────── helper maps for real-time sub-labels ─────────── */
const BALANCE_LABELS = {
  separate: 'Separate Sales & Services',
  combined: 'Combined view',
  services_only: 'Services only',
};

const EXPENSE_LABELS = {
  combined: 'All Expenses',
  split: 'Split Expenses',
};

/* ═══════════════════════════════════════════════════════════════
   Settings Row — matches the "Personal Info" row pattern
   ═══════════════════════════════════════════════════════════════ */
function SettingsRow({icon: Icon, iconTone, title, subtitle, onPress}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.settingsRow}>
      <IconBubble tone={iconTone} size={44}>
        <Icon color={iconTone === 'primary' ? COLORS.primary : iconTone === 'success' ? COLORS.success : COLORS.warning} size={20} />
      </IconBubble>
      <View style={styles.settingsRowText}>
        <Text style={styles.settingsRowTitle}>{title}</Text>
        <Text style={styles.settingsRowSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight color={COLORS.muted} size={20} />
    </TouchableOpacity>
  );
}



/* ═══════════════════════════════════════════════════════════════
   Radio row helper
   ═══════════════════════════════════════════════════════════════ */
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

const ServiceSeparator = () => <Divider />;

/* ═══════════════════════════════════════════════════════════════
   MAIN SETTINGS SCREEN
   ═══════════════════════════════════════════════════════════════ */
function SettingsScreen({navigation}) {
  /* ── state ─────────────────────────────────────────────── */
  const [serviceTypes, setServiceTypes] = useState([]);
  const [newServiceType, setNewServiceType] = useState('');
  const [balanceDisplay, setBalanceDisplay] = useState('separate');
  const [expenseAllocation, setExpenseAllocation] = useState('combined');
  const [salesPercent, setSalesPercent] = useState('60');
  const [servicesPercent, setServicesPercent] = useState('40');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /* module visibility */
  const [serviceModuleOpen, setServiceModuleOpen] = useState(false);
  const [balanceModuleOpen, setBalanceModuleOpen] = useState(false);
  const [profitModuleOpen, setProfitModuleOpen] = useState(false);
  const [businessModuleOpen, setBusinessModuleOpen] = useState(false);
 
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
 
  const dispatch = useDispatch();

  /* ── data loading ──────────────────────────────────────── */
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
        businessNameValue,
        businessAddressValue,
        businessPhoneValue,
      ] = await Promise.all([
        getSetting('balance_display'),
        getSetting('expense_allocation'),
        getSetting('sales_expense_percent'),
        getSetting('services_expense_percent'),
        getSetting('business_name'),
        getSetting('business_address'),
        getSetting('business_phone'),
      ]);

      setServiceTypes(getRowsArray(serviceTypesResult));
      setBalanceDisplay(balanceValue || 'separate');
      setExpenseAllocation(allocationValue || 'combined');
      setSalesPercent(salesPercentValue || '60');
      setServicesPercent(servicesPercentValue || '40');
      setBusinessName(businessNameValue || '');
      setBusinessAddress(businessAddressValue || '');
      setBusinessPhone(businessPhoneValue || '');
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

      const closeAllListener = () => {
        setServiceModuleOpen(false);
        setBalanceModuleOpen(false);
        setProfitModuleOpen(false);
        setBusinessModuleOpen(false);
        setMessage('');
      };

      globalEvents.on(EVENT_CLOSE_ALL_MODALS, closeAllListener);

      return () => {
        globalEvents.off(EVENT_CLOSE_ALL_MODALS, closeAllListener);
        setServiceModuleOpen(false);
        setBalanceModuleOpen(false);
        setProfitModuleOpen(false);
        setBusinessModuleOpen(false);
        setMessage('');
      };
    }, [loadSettings]),
  );

  /* ── handlers: service types ───────────────────────────── */
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
      const now = getCurrentTimestamp();
      await db.executeSql(
        'INSERT INTO service_types (id, name, created_at, updated_at) VALUES (?, ?, ?, ?);',
        [generateId(), name, now, now],
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

  /* ── handlers: balance display ─────────────────────────── */
  const updateBalanceDisplay = async value => {
    setBalanceDisplay(value);
    setErrors(current => ({...current, form: ''}));
    await setSetting('balance_display', value);
    setMessage('Balance display preference saved.');
  };
 
  /* ── handlers: business info ─────────────────────────── */
  const handleSaveBusinessInfo = async () => {
    if (!businessName.trim()) {
      setErrors(current => ({...current, business: 'Business name is required.'}));
      return;
    }
 
    try {
      await Promise.all([
        setSetting('business_name', businessName.trim()),
        setSetting('business_address', businessAddress.trim()),
        setSetting('business_phone', businessPhone.trim()),
      ]);
      setErrors(current => ({...current, business: ''}));
      setMessage('Business information updated.');
      setBusinessModuleOpen(false);
    } catch (error) {
      setErrors(current => ({...current, business: 'Unable to save business info.'}));
    }
  };
 
  /* ── handlers: logout ────────────────────────────────── */
  const handleLogout = async () => {
    try {
      await clearDatabase();
    } catch (dbError) {
      console.error('[SettingsScreen] Failed to clear database:', dbError);
    }
 
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
    dispatch(logout());
  };

  /* ── handlers: profit calculation ──────────────────────── */
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

  /* ── derived sub-labels ────────────────────────────────── */
  const serviceSubLabel =
    serviceTypes.length > 0
      ? `${serviceTypes.length} service type${serviceTypes.length !== 1 ? 's' : ''} configured`
      : 'Customize your service offerings';

  const balanceSubLabel = `Currently: ${BALANCE_LABELS[balanceDisplay] || 'Separate Sales & Services'}`;

  const profitSubLabel = `Currently: ${EXPENSE_LABELS[expenseAllocation] || 'All Expenses'}`;

  /* ── service type list renderer ────────────────────────── */
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

  /* ═══════════════════════════ RENDER ═══════════════════════ */
  return (
    <View style={styles.screenRoot}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* ── Header ────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Settings</Text>
          <Text style={styles.title}>Business Setup</Text>
          <Text style={styles.subtitle}>
            Configure service types, balance display, and profit allocation.
          </Text>
        </View>

        {/* ── Business Configuration section ────────────── */}
        <Text style={styles.sectionLabel}>BUSINESS CONFIGURATION</Text>
        <View style={styles.listCard}>
          <SettingsRow
            icon={Layers}
            iconTone="primary"
            title="Service Types"
            subtitle={serviceSubLabel}
            onPress={() => setServiceModuleOpen(true)}
          />
          <Divider style={styles.rowDivider} />
          <SettingsRow
            icon={LayoutGrid}
            iconTone="success"
            title="Balance Display"
            subtitle={balanceSubLabel}
            onPress={() => setBalanceModuleOpen(true)}
          />
          <Divider style={styles.rowDivider} />
          <SettingsRow
            icon={PieChart}
            iconTone="warning"
            title="Profit Calculation"
            subtitle={profitSubLabel}
            onPress={() => setProfitModuleOpen(true)}
          />
          <Divider style={styles.rowDivider} />
          <SettingsRow
            icon={RefreshCw}
            iconTone="success"
            title="Cloud Sync"
            subtitle="Manage data backups and cloud connectivity"
            onPress={() => navigation.navigate('Sync')}
          />
        </View>

        {/* ── Business Profile section ───────────────────── */}
        <Text style={styles.sectionLabel}>BUSINESS PROFILE</Text>
        <View style={styles.listCard}>
          <SettingsRow
            icon={Briefcase}
            iconTone="primary"
            title="Business Info"
            subtitle={businessName || 'Configure your business details'}
            onPress={() => setBusinessModuleOpen(true)}
          />
        </View>
 
        <Text style={styles.sectionLabel}>SESSION</Text>
        <View style={styles.listCard}>
          <SettingsRow
            icon={LogOut}
            iconTone="danger"
            title="Logout"
            subtitle="Securely sign out and clear local cache"
            onPress={handleLogout}
          />
        </View>

        {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}
        {isLoading ? (
          <Text style={styles.loadingText}>Refreshing settings...</Text>
        ) : null}
      </ScrollView>

      <BottomSheetModule
        isOpen={serviceModuleOpen}
        onClose={() => setServiceModuleOpen(false)}
        title="Service Types">
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
          <View>
            {serviceTypes.map(item => (
              <View key={item.id}>
                {renderServiceType({item})}
                <ServiceSeparator />
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No service types added yet.</Text>
        )}
      </BottomSheetModule>

      <BottomSheetModule
        isOpen={balanceModuleOpen}
        onClose={() => setBalanceModuleOpen(false)}
        title="Balance Display">
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
      </BottomSheetModule>

      <BottomSheetModule
        isOpen={profitModuleOpen}
        onClose={() => setProfitModuleOpen(false)}
        title="Profit Calculation">
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
      </BottomSheetModule>

      <BottomSheetModule
        isOpen={businessModuleOpen}
        onClose={() => setBusinessModuleOpen(false)}
        title="Business Profile">
        <View style={styles.formPanel}>
          <TextInput
            mode="outlined"
            label="Business Name"
            value={businessName}
            onChangeText={setBusinessName}
            style={styles.formInput}
          />
          <TextInput
            mode="outlined"
            label="Business Address"
            value={businessAddress}
            onChangeText={setBusinessAddress}
            multiline
            numberOfLines={2}
            style={styles.formInput}
          />
          <TextInput
            mode="outlined"
            label="Phone Number"
            value={businessPhone}
            onChangeText={setBusinessPhone}
            keyboardType="phone-pad"
            style={styles.formInput}
          />
          {errors.business ? (
            <Text style={styles.errorText}>{errors.business}</Text>
          ) : null}
          <Button
            mode="contained"
            onPress={handleSaveBusinessInfo}
            style={styles.saveButton}>
            Save Changes
          </Button>
        </View>
      </BottomSheetModule>

      {/* ═══════════ STATUS POPUP ═══════════ */}
      <LuminousStatus
        visible={Boolean(message)}
        message={message}
        onDismiss={() => setMessage('')}
        type="success"
      />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  /* Screen root */
  screenRoot: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 448,
    paddingBottom: 140,
    paddingHorizontal: 20,
    width: '100%',
  },

  /* Header */
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

  /* Section label */
  sectionLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 8,
    marginTop: 20,
    textTransform: 'uppercase',
  },

  /* List card (container for rows) */
  listCard: {
    ...cardShadow,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },

  /* Settings Row */
  settingsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingsRowText: {
    flex: 1,
  },
  settingsRowTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
  },
  settingsRowSub: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 2,
  },
  rowDivider: {
    marginLeft: 74,
  },

  /* Bottom-sheet module */
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheetContainer: {
    bottom: 80,
    left: 0,
    position: 'absolute',
    right: 0,
    alignItems: 'center',
  },
  sheetCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: 480,
    maxWidth: 448,
    width: '100%',
    ...cardShadow,
    elevation: 12,
    shadowOpacity: 0.18,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sheetTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
  },
  sheetClose: {
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  sheetDivider: {
    marginHorizontal: 20,
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },

  /* Service types module internals */
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

  /* Radio options */
  radioItem: {
    paddingHorizontal: 0,
  },
  radioLabel: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
  },

  /* Percent split panel */
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

  /* Form panel (for business info) */
  formPanel: {
    gap: 12,
    paddingVertical: 10,
  },
  formInput: {
    backgroundColor: COLORS.surface,
  },
  saveButton: {
    borderRadius: 8,
    marginTop: 8,
    paddingVertical: 4,
  },

  /* Misc */
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
