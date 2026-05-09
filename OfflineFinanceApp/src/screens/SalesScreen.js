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
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Menu,
  Modal,
  Portal,
  SegmentedButtons,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import {format, formatISO, parseISO} from 'date-fns';
import {
  getDBConnection,
  getSetting,
  getTodayBalance,
  resetBalanceIfNewDay,
  updateDailyBalance,
} from '../database/db';
import {
  formatCurrency,
  generateId,
  getCurrentTimestamp,
  getRowsArray,
} from '../utils/helpers';
import {COLORS, FONT_FAMILY} from '../theme/theme';

const getTodayRange = () => {
  const now = new Date();
  const startOfToday = formatISO(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
  );
  const endOfToday = formatISO(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
  );

  return {startOfToday, endOfToday};
};

const initialBalance = {
  sales_cash: 0,
  sales_bank: 0,
  services_cash: 0,
  services_bank: 0,
};

const preferenceToView = preference => {
  if (preference === 'combined') {
    return 'both';
  }

  if (preference === 'services_only') {
    return 'services';
  }

  return 'sales';
};

const ListGap = () => <View style={styles.listGap} />;

function SalesScreen() {
  const [products, setProducts] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(initialBalance);
  const [balanceView, setBalanceView] = useState('sales');
  const [transactionView, setTransactionView] = useState('both');
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [salePaymentMethod, setSalePaymentMethod] = useState('cash');
  const [serviceAmount, setServiceAmount] = useState('');
  const [servicePaymentMethod, setServicePaymentMethod] = useState('cash');
  const [selectedServiceType, setSelectedServiceType] = useState(null);
  const [serviceNotes, setServiceNotes] = useState('');
  const [serviceTypeMenuVisible, setServiceTypeMenuVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadSalesData = useCallback(async () => {
    setIsLoading(true);
    try {
      await resetBalanceIfNewDay();
      const db = await getDBConnection();
      const {startOfToday, endOfToday} = getTodayRange();

      const [productsResult, serviceTypesResult, salesResult, servicesResult] =
        await Promise.all([
          db.executeSql('SELECT * FROM products ORDER BY name ASC;'),
          db.executeSql('SELECT * FROM service_types ORDER BY name ASC;'),
          db.executeSql(
            `SELECT sales.id,
                  sales.quantity,
                  sales.total AS amount,
                  sales.date,
                  COALESCE(sales.payment_method, 'cash') AS payment_method,
                  products.name AS title,
                  'sale' AS kind
           FROM sales
           LEFT JOIN products ON products.id = sales.product_id
           WHERE sales.date BETWEEN ? AND ?
           ORDER BY sales.date DESC;`,
            [startOfToday, endOfToday],
          ),
          db.executeSql(
            `SELECT id,
                  service_type AS title,
                  amount,
                  payment_method,
                  date,
                  notes,
                  'service' AS kind
           FROM services
           WHERE date BETWEEN ? AND ?
           ORDER BY date DESC;`,
            [startOfToday, endOfToday],
          ),
        ]);

      const todayBalance = await getTodayBalance();
      const displayPreference = await getSetting('balance_display');
      const salesRows = getRowsArray(salesResult[0]);
      const serviceRows = getRowsArray(servicesResult[0]);

      setProducts(getRowsArray(productsResult[0]));
      setServiceTypes(getRowsArray(serviceTypesResult[0]));
      setBalance(todayBalance || initialBalance);
      setBalanceView(preferenceToView(displayPreference));
      setTransactions(
        [...salesRows, ...serviceRows].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      );
      setErrors({});
    } catch (error) {
      setProducts([]);
      setServiceTypes([]);
      setTransactions([]);
      setErrors({form: 'Unable to load local sales and service data.'});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSalesData();
    }, [loadSalesData]),
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter(product =>
      String(product.name || '')
        .toLowerCase()
        .includes(query),
    );
  }, [productSearch, products]);

  const filteredTransactions = useMemo(() => {
    if (transactionView === 'sales') {
      return transactions.filter(item => item.kind === 'sale');
    }

    if (transactionView === 'services') {
      return transactions.filter(item => item.kind === 'service');
    }

    return transactions;
  }, [transactionView, transactions]);

  const saleTotal =
    selectedProduct && quantity.trim()
      ? Number(quantity || 0) * Number(selectedProduct.selling_price || 0)
      : 0;

  const closeSaleModal = () => {
    setSaleModalVisible(false);
    setProductSearch('');
    setSelectedProduct(null);
    setQuantity('');
    setSalePaymentMethod('cash');
    setErrors({});
  };

  const closeServiceModal = () => {
    setServiceModalVisible(false);
    setServiceAmount('');
    setServicePaymentMethod('cash');
    setSelectedServiceType(null);
    setServiceNotes('');
    setServiceTypeMenuVisible(false);
    setErrors({});
  };

  const validateSale = () => {
    const nextErrors = {};
    const soldQuantity = Number(quantity || 0);
    const availableQuantity = Number(selectedProduct?.quantity || 0);

    if (!selectedProduct) {
      nextErrors.product = 'Select a product before confirming sale.';
    }

    if (!quantity.trim()) {
      nextErrors.quantity = 'Quantity sold is required.';
    } else if (!/^\d+$/.test(quantity.trim()) || soldQuantity <= 0) {
      nextErrors.quantity =
        'Quantity must be a whole number greater than zero.';
    } else if (selectedProduct && soldQuantity > availableQuantity) {
      nextErrors.quantity = `Only ${availableQuantity} item(s) available.`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateService = () => {
    const nextErrors = {};

    if (!serviceAmount.trim()) {
      nextErrors.serviceAmount = 'Amount is required.';
    } else if (
      !/^\d+(\.\d+)?$/.test(serviceAmount.trim()) ||
      Number(serviceAmount) <= 0
    ) {
      nextErrors.serviceAmount =
        'Amount must be a valid number greater than zero.';
    }

    if (!selectedServiceType) {
      nextErrors.serviceType = 'Select a service type.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleConfirmSale = async () => {
    if (!validateSale()) {
      return;
    }

    setIsSaving(true);
    try {
      const db = await getDBConnection();
      const soldQuantity = Number(quantity || 0);
      const saleDate = getCurrentTimestamp();
      const remainingQuantity =
        Number(selectedProduct.quantity || 0) - soldQuantity;
      const total = soldQuantity * Number(selectedProduct.selling_price || 0);

      await new Promise((resolve, reject) => {
        db.transaction(
          tx => {
            tx.executeSql(
              `INSERT INTO sales (
                 id,
                 product_id,
                 quantity,
                 total,
                 payment_method,
                 date,
                 synced
               ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
              [
                generateId(),
                selectedProduct.id,
                soldQuantity,
                total,
                salePaymentMethod,
                saleDate,
                0,
              ],
            );
            tx.executeSql(
              `UPDATE products
               SET quantity = ?,
                   updated_at = ?,
                   synced = 0
               WHERE id = ?;`,
              [remainingQuantity, saleDate, selectedProduct.id],
            );
          },
          error => reject(error),
          () => resolve(),
        );
      });

      await updateDailyBalance('sales', salePaymentMethod, total);
      setMessage('Sale recorded successfully.');
      closeSaleModal();
      await loadSalesData();
    } catch (error) {
      setErrors({form: 'Unable to record sale. Please try again.'});
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveService = async () => {
    if (!validateService()) {
      return;
    }

    setIsSaving(true);
    try {
      const amount = Number(serviceAmount);
      const serviceDate = getCurrentTimestamp();
      const db = await getDBConnection();

      await db.executeSql(
        `INSERT INTO services (
           id,
           service_type,
           amount,
           payment_method,
           date,
           notes,
           synced
         ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          generateId(),
          selectedServiceType.name,
          amount,
          servicePaymentMethod,
          serviceDate,
          serviceNotes.trim(),
          0,
        ],
      );

      await updateDailyBalance('services', servicePaymentMethod, amount);
      setMessage('Service recorded successfully.');
      closeServiceModal();
      await loadSalesData();
    } catch (error) {
      setErrors({form: 'Unable to save service. Please try again.'});
    } finally {
      setIsSaving(false);
    }
  };

  const balanceRows = useMemo(() => {
    if (balanceView === 'sales') {
      return [
        {label: 'Sales Cash', value: balance.sales_cash},
        {label: 'Sales Bank', value: balance.sales_bank},
      ];
    }

    if (balanceView === 'services') {
      return [
        {label: 'Services Cash', value: balance.services_cash},
        {label: 'Services Bank', value: balance.services_bank},
      ];
    }

    return [
      {
        label: 'Total Cash',
        value:
          Number(balance.sales_cash || 0) + Number(balance.services_cash || 0),
      },
      {
        label: 'Total Bank',
        value:
          Number(balance.sales_bank || 0) + Number(balance.services_bank || 0),
      },
    ];
  }, [balance, balanceView]);

  const renderProduct = ({item}) => (
    <Card
      mode="outlined"
      style={[
        styles.optionCard,
        selectedProduct?.id === item.id && styles.selectedOptionCard,
      ]}
      onPress={() => {
        setSelectedProduct(item);
        setProductSearch(item.name);
        setErrors(current => ({...current, product: '', form: ''}));
      }}>
      <Card.Content style={styles.optionContent}>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>{item.name}</Text>
          <Text style={styles.optionSubtitle}>
            Qty {item.quantity || 0} | {formatCurrency(item.selling_price)}
          </Text>
        </View>
        <Chip compact selected={selectedProduct?.id === item.id}>
          Select
        </Chip>
      </Card.Content>
    </Card>
  );

  const renderTransaction = ({item}) => {
    const isSale = item.kind === 'sale';
    const tag = item.payment_method === 'bank' ? 'Bank' : 'Cash';

    return (
      <Card
        mode="outlined"
        style={[
          styles.transactionCard,
          isSale ? styles.saleBorder : styles.serviceBorder,
        ]}>
        <Card.Content>
          <View style={styles.transactionTop}>
            <View style={styles.transactionText}>
              <Text style={styles.transactionTitle}>
                {item.title || (isSale ? 'Deleted product' : 'Service')}
              </Text>
              <Text style={styles.transactionMeta}>
                {isSale ? `Qty ${item.quantity}` : 'Service'} |{' '}
                {format(parseISO(item.date), 'p')}
              </Text>
            </View>
            <View style={styles.transactionAmountWrap}>
              <Text style={styles.transactionAmount}>
                {formatCurrency(item.amount)}
              </Text>
              <Chip compact style={styles.paymentChip}>
                {tag}
              </Chip>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Sales</Text>
          <Text style={styles.title}>Sales and Services</Text>
          <Text style={styles.subtitle}>
            Record product sales, service income, and today's offline balance.
          </Text>
        </View>

        <Card mode="contained" style={styles.balanceCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Today's Balance</Text>
            <SegmentedButtons
              value={balanceView}
              onValueChange={setBalanceView}
              buttons={[
                {value: 'sales', label: 'Sales'},
                {value: 'services', label: 'Services'},
                {value: 'both', label: 'Both'},
              ]}
              style={styles.segmented}
            />
            <View style={styles.balanceGrid}>
              {balanceRows.map(item => (
                <View key={item.label} style={styles.balanceTile}>
                  <Text style={styles.balanceLabel}>{item.label}</Text>
                  <Text style={styles.balanceValue}>
                    {formatCurrency(item.value)}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actionRow}>
          <Button
            mode="contained"
            buttonColor={COLORS.accent}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            onPress={() => setSaleModalVisible(true)}>
            Sale
          </Button>
          <Button
            mode="contained"
            buttonColor={COLORS.success}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            onPress={() => setServiceModalVisible(true)}>
            Service
          </Button>
        </View>

        <Card mode="outlined" style={styles.listCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.cardTitle}>Today's Transactions</Text>
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : null}
            </View>
            <SegmentedButtons
              value={transactionView}
              onValueChange={setTransactionView}
              buttons={[
                {value: 'sales', label: 'Sales'},
                {value: 'services', label: 'Services'},
                {value: 'both', label: 'Both'},
              ]}
              style={styles.segmented}
            />
            {filteredTransactions.length > 0 ? (
              <FlatList
                data={filteredTransactions}
                keyExtractor={item => `${item.kind}-${item.id}`}
                renderItem={renderTransaction}
                scrollEnabled={false}
                ItemSeparatorComponent={ListGap}
              />
            ) : (
              <Text style={styles.emptyText}>
                No transactions recorded for this view today.
              </Text>
            )}
            {errors.form ? (
              <Text style={styles.errorText}>{errors.form}</Text>
            ) : null}
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Modal
          visible={saleModalVisible}
          onDismiss={closeSaleModal}
          contentContainerStyle={styles.modalCard}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Record Product Sale</Text>
            {products.length === 0 ? (
              <Text style={styles.emptyText}>
                Add products in Inventory before recording sales.
              </Text>
            ) : (
              <>
                <TextInput
                  mode="outlined"
                  label="Search product"
                  value={productSearch}
                  onChangeText={value => {
                    setProductSearch(value);
                    setSelectedProduct(null);
                    setErrors(current => ({...current, product: '', form: ''}));
                  }}
                  style={styles.input}
                />
                {errors.product ? (
                  <Text style={styles.errorText}>{errors.product}</Text>
                ) : null}
                <FlatList
                  data={filteredProducts}
                  keyExtractor={item => item.id}
                  renderItem={renderProduct}
                  scrollEnabled={false}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      No matching products found.
                    </Text>
                  }
                />
                <TextInput
                  mode="outlined"
                  label="Quantity"
                  value={quantity}
                  onChangeText={value => {
                    setQuantity(value);
                    setErrors(current => ({
                      ...current,
                      quantity: '',
                      form: '',
                    }));
                  }}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                {errors.quantity ? (
                  <Text style={styles.errorText}>{errors.quantity}</Text>
                ) : null}
                <Text style={styles.fieldLabel}>Payment Method</Text>
                <SegmentedButtons
                  value={salePaymentMethod}
                  onValueChange={setSalePaymentMethod}
                  buttons={[
                    {value: 'cash', label: 'Cash'},
                    {value: 'bank', label: 'Bank Transfer'},
                  ]}
                  style={styles.segmented}
                />
                <Card mode="contained" style={styles.totalCard}>
                  <Card.Content>
                    <Text style={styles.balanceLabel}>Calculated Total</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(saleTotal)}
                    </Text>
                  </Card.Content>
                </Card>
                {errors.form ? (
                  <Text style={styles.errorText}>{errors.form}</Text>
                ) : null}
                <View style={styles.modalActions}>
                  <Button mode="outlined" onPress={closeSaleModal}>
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    loading={isSaving}
                    disabled={isSaving}
                    onPress={handleConfirmSale}>
                    Confirm Sale
                  </Button>
                </View>
              </>
            )}
          </ScrollView>
        </Modal>

        <Modal
          visible={serviceModalVisible}
          onDismiss={closeServiceModal}
          contentContainerStyle={styles.modalCard}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Record Service</Text>
            <TextInput
              mode="outlined"
              label="Amount"
              value={serviceAmount}
              onChangeText={value => {
                setServiceAmount(value);
                setErrors(current => ({
                  ...current,
                  serviceAmount: '',
                  form: '',
                }));
              }}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            {errors.serviceAmount ? (
              <Text style={styles.errorText}>{errors.serviceAmount}</Text>
            ) : null}
            <Text style={styles.fieldLabel}>Payment Method</Text>
            <SegmentedButtons
              value={servicePaymentMethod}
              onValueChange={setServicePaymentMethod}
              buttons={[
                {value: 'cash', label: 'Cash'},
                {value: 'bank', label: 'Bank Transfer'},
              ]}
              style={styles.segmented}
            />
            <Text style={styles.fieldLabel}>Service Type</Text>
            {serviceTypes.length === 0 ? (
              <Text style={styles.emptyText}>
                No service types yet. Go to Settings to add some.
              </Text>
            ) : (
              <Menu
                visible={serviceTypeMenuVisible}
                onDismiss={() => setServiceTypeMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setServiceTypeMenuVisible(true)}
                    style={styles.menuButton}>
                    {selectedServiceType?.name || 'Select service type'}
                  </Button>
                }>
                {serviceTypes.map(item => (
                  <Menu.Item
                    key={item.id}
                    title={item.name}
                    onPress={() => {
                      setSelectedServiceType(item);
                      setServiceTypeMenuVisible(false);
                      setErrors(current => ({
                        ...current,
                        serviceType: '',
                        form: '',
                      }));
                    }}
                  />
                ))}
              </Menu>
            )}
            {errors.serviceType ? (
              <Text style={styles.errorText}>{errors.serviceType}</Text>
            ) : null}
            <TextInput
              mode="outlined"
              label="Notes"
              value={serviceNotes}
              onChangeText={setServiceNotes}
              multiline
              style={styles.input}
            />
            <Text style={styles.timestampText}>
              Date/time will be set to {format(new Date(), 'PP p')}
            </Text>
            {errors.form ? (
              <Text style={styles.errorText}>{errors.form}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={closeServiceModal}>
                Cancel
              </Button>
              <Button
                mode="contained"
                loading={isSaving}
                disabled={isSaving || serviceTypes.length === 0}
                onPress={handleSaveService}>
                Save Service
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

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
  balanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginBottom: 16,
  },
  cardTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
  },
  segmented: {
    marginTop: 12,
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  balanceTile: {
    backgroundColor: COLORS.primaryPale,
    borderRadius: 8,
    flex: 1,
    padding: 12,
  },
  balanceLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  balanceValue: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 8,
    flex: 1,
  },
  actionButtonContent: {
    minHeight: 58,
  },
  listCard: {
    borderRadius: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listGap: {
    height: 10,
  },
  transactionCard: {
    borderRadius: 8,
    borderLeftWidth: 5,
    marginTop: 12,
  },
  saleBorder: {
    borderLeftColor: COLORS.accent,
  },
  serviceBorder: {
    borderLeftColor: COLORS.success,
  },
  transactionTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
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
    marginTop: 3,
  },
  transactionAmountWrap: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
  },
  paymentChip: {
    marginTop: 6,
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
    marginTop: 6,
  },
  modalCard: {
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    maxHeight: '88%',
    maxWidth: 448,
    padding: 18,
    width: '92%',
  },
  modalTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    marginTop: 10,
  },
  optionCard: {
    borderRadius: 8,
    marginTop: 8,
  },
  selectedOptionCard: {
    backgroundColor: COLORS.primaryPale,
    borderColor: COLORS.primary,
  },
  optionContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  optionSubtitle: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 2,
  },
  fieldLabel: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 14,
  },
  totalCard: {
    backgroundColor: COLORS.primaryPale,
    borderRadius: 8,
    marginTop: 14,
  },
  totalValue: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 25,
    fontWeight: '800',
    marginTop: 4,
  },
  menuButton: {
    alignItems: 'stretch',
    borderRadius: 8,
    marginTop: 10,
  },
  timestampText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 18,
  },
});

export default SalesScreen;
