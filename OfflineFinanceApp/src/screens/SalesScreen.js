import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {AlertTriangle, ArrowLeft, Check, Info, Search, ShoppingBag, ShoppingCart, Tags} from 'lucide-react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Menu,
  Modal,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import {LuminousStatus} from '../components/LuminousStatus';
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
import {syncInBackground} from '../services/syncService';
import {
  depletePurchaseBatchesFifo,
  serializePurchaseBatches,
} from '../utils/inventoryAccounting';
import {COLORS, FONT_FAMILY} from '../theme/theme';
import {IconBubble, gradientStyle, type} from '../components/KoboUI';
import {BottomSheetModule} from '../components/BottomSheetModule';
import {globalEvents, EVENT_CLOSE_ALL_MODALS} from '../utils/events';

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

const SafeIcon = ({icon: IconComponent, ...props}) => {
  if (!IconComponent) {
    return <View style={{width: props.size || 20, height: props.size || 20}} />;
  }
  return <IconComponent {...props} />;
};

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [saleStep, setSaleStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(productSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);
  const [quantity, setQuantity] = useState('');
  const [actualPrice, setActualPrice] = useState('');
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
                  sales.product_id,
                  sales.quantity,
                  sales.total AS amount,
                  COALESCE(sales.cogs, 0) AS cogs,
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

      const closeAllListener = () => {
        setSaleModalVisible(false);
        setServiceModalVisible(false);
        setMessage('');
      };

      globalEvents.on(EVENT_CLOSE_ALL_MODALS, closeAllListener);

      return () => {
        globalEvents.off(EVENT_CLOSE_ALL_MODALS, closeAllListener);
        setSaleModalVisible(false);
        setServiceModalVisible(false);
        setMessage('');
      };
    }, [loadSalesData]),
  );

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(cats)].sort();
  }, [products]);

  const salesCounts = useMemo(() => {
    const counts = {};
    transactions.forEach(t => {
      if (t.kind === 'sale' && t.product_id) {
        counts[t.product_id] = (counts[t.product_id] || 0) + 1;
      }
    });
    return counts;
  }, [transactions]);

  const filteredProducts = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    
    let result = products;
    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }
    
    if (query) {
      result = result.filter(product =>
        String(product.name || '').toLowerCase().includes(query) ||
        String(product.category || '').toLowerCase().includes(query)
      );
    } else {
      result = [...result].sort((a, b) => {
        const countA = salesCounts[a.id] || 0;
        const countB = salesCounts[b.id] || 0;
        return countB - countA;
      });
      if (selectedCategory === 'All') {
        result = result.slice(0, 4);
      }
    }

    return result;
  }, [debouncedSearch, products, selectedCategory, salesCounts]);

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
      ? Number(quantity || 0) * Number(actualPrice || selectedProduct.selling_price || 0)
      : 0;

  const closeSaleModal = () => {
    setSaleModalVisible(false);
    setProductSearch('');
    setDebouncedSearch('');
    setSelectedProduct(null);
    setQuantity('');
    setActualPrice('');
    setSalePaymentMethod('cash');
    setSaleStep(1);
    setSelectedCategory('All');
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
      const total = soldQuantity * Number(actualPrice || selectedProduct.selling_price || 0);
      const fifoResult = depletePurchaseBatchesFifo(
        selectedProduct,
        soldQuantity,
      );
      const remainingPurchaseBatches = serializePurchaseBatches(
        fifoResult.remainingBatches,
      );

      await new Promise((resolve, reject) => {
        db.transaction(
          tx => {
            tx.executeSql(
              `INSERT INTO sales (
                 id,
                 product_id,
                 quantity,
                 total,
                 cogs,
                 payment_method,
                 date,
                 updated_at,
                 synced
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                generateId(),
                selectedProduct.id,
                soldQuantity,
                total,
                fifoResult.cogs,
                salePaymentMethod,
                saleDate,
                saleDate,
                0,
              ],
            );
            tx.executeSql(
              `UPDATE products
               SET quantity = ?,
                   purchase_batches = ?,
                   updated_at = ?,
                   synced = 0
               WHERE id = ?;`,
              [
                remainingQuantity,
                remainingPurchaseBatches,
                saleDate,
                selectedProduct.id,
              ],
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
      
      // Trigger background sync
      syncInBackground();
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
           updated_at,
           synced
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          generateId(),
          selectedServiceType.name,
          amount,
          servicePaymentMethod,
          serviceDate,
          serviceNotes.trim(),
          serviceDate,
          0,
        ],
      );

      await updateDailyBalance('services', servicePaymentMethod, amount);
      setMessage('Service recorded successfully.');
      closeServiceModal();
      await loadSalesData();
      
      // Trigger background sync
      syncInBackground();
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

  const renderProduct = ({item}) => {
    const isOnlyMatch = filteredProducts.length === 1 && debouncedSearch.trim().length > 0;
    
    return (
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => {
          setSelectedProduct(item);
          setActualPrice(String(item.selling_price || ''));
          setSaleStep(2);
          setErrors(current => ({...current, product: '', form: ''}));
        }}>
        <Card
          mode="outlined"
          style={[
            styles.compactOptionCard,
            isOnlyMatch && styles.selectedOptionCard,
          ]}>
          <Card.Content style={styles.compactOptionContent}>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{item.name}</Text>
              <Text style={styles.optionSubtitle}>
                {item.category || 'SKU'} · Qty {item.quantity || 0} | {formatCurrency(item.selling_price)}
              </Text>
            </View>
            <View style={[styles.compactChip, isOnlyMatch && styles.compactChipSelected]}>
              <Text style={[styles.compactChipText, isOnlyMatch && styles.compactChipTextSelected]}>
                {isOnlyMatch ? 'Selected' : 'Select'}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderTransaction = ({item}) => {
    const isSale = item.kind === 'sale';
    const tag = item.payment_method === 'bank' ? 'Bank' : 'Cash';
    const Icon = isSale ? ShoppingCart : ShoppingBag;
    const tone = isSale ? 'accent' : 'success';

    return (
      <Card
        mode="outlined"
        style={[
          styles.transactionCard,
          isSale ? styles.saleBorder : styles.serviceBorder,
        ]}>
        <Card.Content style={styles.transactionCardContent}>
          <View style={styles.transactionTop}>
            <IconBubble tone={isSale ? 'primary' : 'success'} size={42}>
              <SafeIcon
                icon={isSale ? ShoppingCart : Tags}
                color={isSale ? COLORS.primary : COLORS.success}
                size={19}
                strokeWidth={2.4}
              />
            </IconBubble>
            <View style={styles.transactionText}>
              <Text style={styles.transactionTitle}>
                {item.title || (isSale ? 'Deleted product' : 'Service')}
              </Text>
              <Text style={styles.transactionMeta}>
                {isSale ? `Qty ${item.quantity}` : 'Service'} |{' '}
                {format(parseISO(item.date), 'MMM d, h:mm a')}
              </Text>
            </View>
            <View style={styles.transactionAmountWrap}>
              <Text style={[styles.transactionAmount, type.number]}>
                {formatCurrency(item.amount)}
              </Text>
              <View style={styles.paymentBadge}>
                <Text style={styles.paymentBadgeText}>{tag}</Text>
              </View>
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
            icon={() => <SafeIcon icon={ShoppingCart} size={20} color="#fff" />}
            buttonColor={COLORS.accent}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            onPress={() => setSaleModalVisible(true)}>
            Sale
          </Button>
          <Button
            mode="contained"
            icon={() => <SafeIcon icon={Tags} size={20} color="#fff" />}
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

      <BottomSheetModule
        isOpen={saleModalVisible}
        onClose={closeSaleModal}
        title={saleStep === 1 ? 'Select Product' : 'Configure Sale'}
        scrollable={saleStep === 2}>
        <View>
          {saleStep === 1 ? (
            <View style={styles.stepContainer}>
              {products.length === 0 ? (
                <Text style={styles.emptyText}>
                  Add products in Inventory before recording sales.
                </Text>
              ) : (
                <>
                  <View style={styles.searchWrap}>
                    <Search
                      color={COLORS.muted}
                      size={19}
                      strokeWidth={2.4}
                      style={styles.searchIcon}
                    />
                    <RNTextInput
                      ref={searchInputRef}
                      placeholder="Search product..."
                      placeholderTextColor={COLORS.muted}
                      value={productSearch}
                      onChangeText={value => {
                        setProductSearch(value);
                        setErrors(current => ({...current, product: '', form: ''}));
                      }}
                      style={styles.searchInput}
                    />
                  </View>
                  
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.chipScroll}
                    contentContainerStyle={styles.chipScrollContent}>
                    {categories.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setSelectedCategory(cat)}
                        activeOpacity={0.8}
                        style={[
                          styles.customCategoryChip,
                          selectedCategory === cat && styles.customCategoryChipSelected,
                        ]}>
                        {selectedCategory === cat && (
                          <SafeIcon icon={Check} size={14} color={COLORS.primary} style={{marginRight: 4}} />
                        )}
                        <Text
                          style={[
                            styles.categoryChipText,
                            selectedCategory === cat && styles.categoryChipTextSelected,
                          ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {errors.product ? (
                    <Text style={styles.errorText}>{errors.product}</Text>
                  ) : null}
                  
                  {!debouncedSearch && selectedCategory === 'All' && filteredProducts.length > 0 && (
                     <Text style={styles.sectionEyebrow}>FREQUENTLY SOLD</Text>
                  )}
                  
                  <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item.id}
                    renderItem={renderProduct}
                    scrollEnabled={true}
                    style={styles.productList}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>
                        No matching products found.
                      </Text>
                    }
                  />
                </>
              )}
            </View>
          ) : (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <TouchableOpacity onPress={() => setSaleStep(1)} style={styles.backButton}>
                  <ArrowLeft color={COLORS.text} size={24} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Configure Sale</Text>
              </View>
              
              <Card mode="outlined" style={styles.selectedProductCard}>
                 <Card.Content style={styles.compactOptionContent}>
                   <View style={styles.optionText}>
                     <Text style={styles.optionTitle}>{selectedProduct?.name}</Text>
                     <Text style={styles.optionSubtitle}>
                       Available: {selectedProduct?.quantity || 0} | {formatCurrency(selectedProduct?.selling_price)}
                     </Text>
                   </View>
                 </Card.Content>
              </Card>

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
              <SegmentedButtons
                value={salePaymentMethod}
                onValueChange={setSalePaymentMethod}
                buttons={[
                  {value: 'cash', label: 'Cash'},
                  {value: 'bank', label: 'Bank Transfer'},
                ]}
                style={styles.segmented}
              />

              <Text style={styles.fieldLabel}>Desired Amount</Text>
              <TextInput
                mode="outlined"
                label="Selling Price"
                value={actualPrice}
                onChangeText={value => {
                  setActualPrice(value);
                  setErrors(current => ({
                    ...current,
                    actualPrice: '',
                    form: '',
                  }));
                }}
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder={String(selectedProduct?.selling_price || '')}
              />
              
              {selectedProduct && actualPrice && Number(actualPrice) < Number(selectedProduct.selling_price) ? (
                <View style={styles.warningBox}>
                  <AlertTriangle color={COLORS.warning} size={16} style={{marginRight: 8}} />
                  <Text style={styles.warningText}>
                    Price is lower than default ({formatCurrency(selectedProduct.selling_price)})
                  </Text>
                </View>
              ) : null}

              {selectedProduct && actualPrice && Number(actualPrice) > Number(selectedProduct.selling_price) ? (
                <View style={styles.infoBox}>
                  <Info color={COLORS.primary} size={16} style={{marginRight: 8}} />
                  <Text style={styles.infoText}>
                    Price is higher than default ({formatCurrency(selectedProduct.selling_price)})
                  </Text>
                </View>
              ) : null}
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
              <View style={styles.modalActionsFull}>
                <Button
                  mode="contained"
                  loading={isSaving}
                  disabled={isSaving || !quantity.trim() || Number(quantity) <= 0 || Number(quantity) > Number(selectedProduct?.quantity || 0)}
                  onPress={handleConfirmSale}
                  style={styles.confirmButton}
                  contentStyle={styles.confirmButtonContent}
                >
                  Confirm Sale
                </Button>
              </View>
            </View>
          )}
        </View>
      </BottomSheetModule>

      <BottomSheetModule
        isOpen={serviceModalVisible}
        onClose={closeServiceModal}
        title="Record Service">
        <View>
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
        </View>
      </BottomSheetModule>
      
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
    paddingBottom: 140,
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
  transactionCardContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  transactionAmount: {
    color: COLORS.text,
    fontSize: 15,
  },
  paymentBadge: {
    backgroundColor: COLORS.primaryPale,
    borderRadius: 6,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paymentBadgeText: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
  },
  compactChip: {
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  compactChipSelected: {
    backgroundColor: COLORS.primary,
  },
  compactChipText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  compactChipTextSelected: {
    color: COLORS.primaryForeground,
  },
  customCategoryChip: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    height: 36,
    paddingHorizontal: 14,
  },
  customCategoryChipSelected: {
    backgroundColor: COLORS.primaryPale,
    borderColor: COLORS.primary,
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
  bottomSheetModal: {
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    bottom: 80,
    left: 0,
    maxWidth: 448,
    padding: 18,
    position: 'absolute',
    right: 0,
    width: '100%',
    maxHeight: '85%',
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: COLORS.line,
    borderRadius: 3,
    height: 5,
    marginBottom: 14,
    width: 44,
  },
  stepContainer: {
    flexShrink: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  modalTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 12,
  },
  searchWrap: {
    marginBottom: 12,
    position: 'relative',
  },
  searchIcon: {
    left: 16,
    position: 'absolute',
    top: 16,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    height: 52,
    paddingLeft: 46,
    paddingRight: 16,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  chipScrollContent: {
    gap: 8,
    paddingRight: 20,
  },
  categoryChip: {
    borderRadius: 18,
  },
  categoryChipText: {
    color: COLORS.muted,
  },
  categoryChipTextSelected: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  sectionEyebrow: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 4,
  },
  productList: {
    flexShrink: 1,
  },
  input: {
    backgroundColor: COLORS.surface,
    marginTop: 10,
  },
  compactOptionCard: {
    borderRadius: 8,
    marginTop: 8,
  },
  selectedOptionCard: {
    backgroundColor: COLORS.primaryPale,
    borderColor: COLORS.primary,
  },
  selectedProductCard: {
    backgroundColor: COLORS.primaryPale,
    borderColor: COLORS.primary,
    marginBottom: 8,
  },
  compactOptionContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
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
  modalActionsFull: {
    marginTop: 18,
    width: '100%',
  },
  confirmButton: {
    borderRadius: 8,
  },
  confirmButtonContent: {
    minHeight: 52,
  },
  fieldLabel: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 14,
  },
  warningBox: {
    alignItems: 'center',
    backgroundColor: COLORS.warningPale || '#fffbeb',
    borderRadius: 8,
    flexDirection: 'row',
    marginTop: 10,
    padding: 10,
  },
  warningText: {
    color: COLORS.warning,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
  },
  infoBox: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryPale,
    borderRadius: 8,
    flexDirection: 'row',
    marginTop: 10,
    padding: 10,
  },
  infoText: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
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
