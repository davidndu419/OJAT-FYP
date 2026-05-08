import React, {useCallback, useMemo, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  Button,
  Card,
  Divider,
  HelperText,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import {formatISO} from 'date-fns';
import {getDBConnection} from '../database/db';
import {
  formatCurrency,
  generateId,
  getCurrentTimestamp,
  getRowsArray,
} from '../utils/helpers';

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

function SalesScreen() {
  const [products, setProducts] = useState([]);
  const [todaySales, setTodaySales] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [stockWarning, setStockWarning] = useState('');
  const [showProductOptions, setShowProductOptions] = useState(false);

  const loadSalesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = await getDBConnection();
      const {startOfToday, endOfToday} = getTodayRange();

      const [productsResult] = await db.executeSql(
        'SELECT * FROM products ORDER BY name ASC;',
      );
      const [salesResult] = await db.executeSql(
        `SELECT sales.id,
                sales.quantity,
                sales.total,
                sales.date,
                products.name AS product_name
         FROM sales
         LEFT JOIN products ON products.id = sales.product_id
         WHERE sales.date BETWEEN ? AND ?
         ORDER BY sales.date DESC;`,
        [startOfToday, endOfToday],
      );

      setProducts(getRowsArray(productsResult));
      setTodaySales(getRowsArray(salesResult));
    } catch (error) {
      setProducts([]);
      setTodaySales([]);
      setErrors({form: 'Unable to load local sales data.'});
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

  const soldQuantity = Number(quantity || 0);
  const selectedSellingPrice = Number(selectedProduct?.selling_price || 0);
  const calculatedTotal =
    selectedProduct && quantity.trim()
      ? soldQuantity * selectedSellingPrice
      : 0;

  const updateQuantity = value => {
    setQuantity(value);
    setErrors(current => ({...current, quantity: '', form: ''}));
    setStockWarning('');
  };

  const selectProduct = product => {
    setSelectedProduct(product);
    setProductSearch(product.name);
    setShowProductOptions(false);
    setErrors(current => ({...current, product: '', form: ''}));
    setStockWarning('');
  };

  const validateSale = () => {
    const nextErrors = {};
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

  const handleConfirmSale = async () => {
    if (!validateSale()) {
      return;
    }

    setIsSaving(true);
    try {
      const db = await getDBConnection();
      const saleId = generateId();
      const saleDate = getCurrentTimestamp();
      const remainingQuantity =
        Number(selectedProduct.quantity || 0) - soldQuantity;
      const total = soldQuantity * Number(selectedProduct.selling_price || 0);

      await new Promise((resolve, reject) => {
        db.transaction(
          tx => {
            tx.executeSql(
              `INSERT INTO sales (id, product_id, quantity, total, date, synced)
               VALUES (?, ?, ?, ?, ?, ?);`,
              [saleId, selectedProduct.id, soldQuantity, total, saleDate, 0],
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

      if (remainingQuantity < Number(selectedProduct.min_threshold || 0)) {
        setStockWarning(
          `${selectedProduct.name} is below minimum stock. Remaining quantity: ${remainingQuantity}.`,
        );
      } else {
        setStockWarning('');
      }

      setSuccessMessage('Sale recorded successfully.');
      setQuantity('');
      setSelectedProduct(null);
      setProductSearch('');
      await loadSalesData();
    } catch (error) {
      setErrors({form: 'Unable to record sale. Please try again.'});
    } finally {
      setIsSaving(false);
    }
  };

  const renderProductOption = ({item}) => (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={() => selectProduct(item)}
      style={styles.optionRow}>
      <View style={styles.optionText}>
        <Text variant="titleSmall" style={styles.optionTitle}>
          {item.name}
        </Text>
        <Text variant="bodySmall" style={styles.optionSubtitle}>
          Qty: {item.quantity || 0} | {formatCurrency(item.selling_price)}
        </Text>
      </View>
      <Text variant="titleMedium" style={styles.optionChevron}>
        &gt;
      </Text>
    </TouchableOpacity>
  );

  const renderSale = ({item}) => (
    <View style={styles.saleRow}>
      <View style={styles.saleDetails}>
        <Text variant="titleSmall" style={styles.saleTitle}>
          {item.product_name || 'Deleted product'}
        </Text>
        <Text variant="bodySmall" style={styles.saleDescription}>
          Quantity sold: {item.quantity}
        </Text>
      </View>
      <Text variant="titleSmall" style={styles.saleTotal}>
        {formatCurrency(item.total)}
      </Text>
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
          Sales
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Record sales locally and update inventory instantly.
        </Text>

        <Card style={styles.formCard}>
          <Card.Content>
            {products.length === 0 ? (
              <View style={styles.emptyProductBox}>
                <Text variant="titleSmall" style={styles.emptyTitle}>
                  No products available
                </Text>
                <Text variant="bodySmall" style={styles.emptyText}>
                  Add products in Inventory before recording sales.
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  label="Search and select product"
                  value={productSearch}
                  onChangeText={value => {
                    setProductSearch(value);
                    setSelectedProduct(null);
                    setShowProductOptions(true);
                    setErrors(current => ({...current, product: '', form: ''}));
                  }}
                  onFocus={() => setShowProductOptions(true)}
                  mode="outlined"
                  style={styles.input}
                  error={Boolean(errors.product)}
                />
                <HelperText type="error" visible={Boolean(errors.product)}>
                  {errors.product}
                </HelperText>

                {showProductOptions ? (
                  <Card style={styles.dropdownCard}>
                    {filteredProducts.length > 0 ? (
                      <FlatList
                        data={filteredProducts}
                        keyExtractor={item => item.id}
                        renderItem={renderProductOption}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                        style={styles.dropdownList}
                      />
                    ) : (
                      <Text variant="bodyMedium" style={styles.dropdownEmpty}>
                        No matching products found.
                      </Text>
                    )}
                  </Card>
                ) : null}

                {selectedProduct ? (
                  <View style={styles.selectedBox}>
                    <Text variant="titleSmall" style={styles.selectedTitle}>
                      {selectedProduct.name}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={styles.selectedDescription}>
                      Available: {selectedProduct.quantity || 0} | Selling
                      price: {formatCurrency(selectedProduct.selling_price)}
                    </Text>
                  </View>
                ) : null}

                <TextInput
                  label="Quantity sold"
                  value={quantity}
                  onChangeText={updateQuantity}
                  mode="outlined"
                  keyboardType="number-pad"
                  style={styles.input}
                  error={Boolean(errors.quantity)}
                />
                <HelperText type="error" visible={Boolean(errors.quantity)}>
                  {errors.quantity}
                </HelperText>

                <View style={styles.totalBox}>
                  <Text variant="labelLarge" style={styles.totalLabel}>
                    Calculated Total
                  </Text>
                  <Text variant="headlineSmall" style={styles.totalValue}>
                    {formatCurrency(calculatedTotal)}
                  </Text>
                </View>

                {stockWarning ? (
                  <View style={styles.warningBox}>
                    <Text variant="bodyMedium" style={styles.warningText}>
                      {stockWarning}
                    </Text>
                  </View>
                ) : null}

                {errors.form ? (
                  <Text variant="bodySmall" style={styles.formError}>
                    {errors.form}
                  </Text>
                ) : null}

                <Button
                  mode="contained"
                  onPress={handleConfirmSale}
                  loading={isSaving}
                  disabled={isSaving || products.length === 0}
                  style={styles.primaryButton}>
                  Confirm Sale
                </Button>
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.listCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Today's Sales
            </Text>
            <Text variant="bodySmall" style={styles.sectionSubtitle}>
              Sales recorded on this device today
            </Text>
          </Card.Content>
          <Divider />
          {todaySales.length > 0 ? (
            <FlatList
              data={todaySales}
              keyExtractor={item => item.id}
              renderItem={renderSale}
              scrollEnabled={false}
            />
          ) : (
            <Text variant="bodyMedium" style={styles.emptySalesText}>
              No sales recorded today.
            </Text>
          )}
        </Card>

        {isLoading ? (
          <Text variant="bodySmall" style={styles.loadingText}>
            Refreshing local data...
          </Text>
        ) : null}
      </ScrollView>

      <Snackbar
        visible={Boolean(successMessage)}
        onDismiss={() => setSuccessMessage('')}
        duration={1800}>
        {successMessage}
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
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  dropdownCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d8e0ea',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    marginTop: -4,
  },
  dropdownList: {
    maxHeight: 220,
  },
  optionRow: {
    alignItems: 'center',
    borderBottomColor: '#eef2f7',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionText: {
    flex: 1,
    paddingRight: 12,
  },
  optionTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  optionSubtitle: {
    color: '#64748b',
    marginTop: 2,
  },
  optionChevron: {
    color: '#94a3b8',
    fontWeight: '700',
  },
  dropdownEmpty: {
    color: '#64748b',
    padding: 14,
    textAlign: 'center',
  },
  selectedBox: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  selectedTitle: {
    color: '#047857',
    fontWeight: '700',
  },
  selectedDescription: {
    color: '#065f46',
    marginTop: 2,
  },
  totalBox: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  totalLabel: {
    color: '#1d4ed8',
    marginBottom: 4,
  },
  totalValue: {
    color: '#0f172a',
    fontWeight: '700',
  },
  warningBox: {
    backgroundColor: '#fff1f2',
    borderColor: '#fda4af',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  warningText: {
    color: '#b42318',
    fontWeight: '700',
  },
  formError: {
    color: '#b42318',
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 6,
  },
  emptyProductBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  emptyText: {
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
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
  saleRow: {
    alignItems: 'center',
    borderBottomColor: '#eef2f7',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saleDetails: {
    flex: 1,
    paddingRight: 12,
  },
  saleTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  saleDescription: {
    color: '#64748b',
    marginTop: 2,
  },
  saleTotal: {
    color: '#047857',
    fontWeight: '700',
  },
  emptySalesText: {
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

export default SalesScreen;
