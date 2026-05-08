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
import {
  Check,
  ChevronRight,
  Minus,
  Plus,
  Search,
  ShoppingBag,
} from 'lucide-react-native';
import {Snackbar, Text} from 'react-native-paper';
import {format, formatISO, parseISO} from 'date-fns';
import {getDBConnection} from '../database/db';
import {
  formatCurrency,
  generateId,
  getCurrentTimestamp,
  getRowsArray,
} from '../utils/helpers';
import {COLORS, FONT_FAMILY} from '../theme/theme';
import {
  IconBubble,
  KoboButton,
  ScreenHeader,
  SurfaceCard,
  type,
} from '../components/KoboUI';

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
      nextErrors.quantity = 'Quantity must be a whole number greater than zero.';
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
      activeOpacity={0.82}
      onPress={() => selectProduct(item)}
      style={styles.optionRow}>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{item.name}</Text>
        <Text style={styles.optionSubtitle}>
          Qty {item.quantity || 0} · {formatCurrency(item.selling_price)}
        </Text>
      </View>
      <ChevronRight color={COLORS.primary} size={18} />
    </TouchableOpacity>
  );

  const renderSale = ({item}) => (
    <View style={styles.saleRow}>
      <IconBubble tone="success" size={42}>
        <ShoppingBag color={COLORS.success} size={19} strokeWidth={2.4} />
      </IconBubble>
      <View style={styles.saleDetails}>
        <Text style={styles.saleTitle}>{item.product_name || 'Deleted product'}</Text>
        <Text style={styles.saleDescription}>
          Qty {item.quantity} · {format(parseISO(item.date), 'p')}
        </Text>
      </View>
      <Text style={[styles.saleTotal, type.number]}>
        +{formatCurrency(item.total)}
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
        <ScreenHeader
          eyebrow="Sales"
          title="Record Sale"
          subtitle="Record sales locally and update inventory instantly."
        />

        <SurfaceCard style={styles.formCard}>
          {products.length === 0 ? (
            <View style={styles.emptyProductBox}>
              <Text style={styles.emptyTitle}>No products available</Text>
              <Text style={styles.emptyText}>
                Add products in Inventory before recording sales.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.inputWrap}>
                <Search color={COLORS.muted} size={18} style={styles.inputIcon} />
                <TextInput
                  placeholder="Search and select product"
                  value={productSearch}
                  onChangeText={value => {
                    setProductSearch(value);
                    setSelectedProduct(null);
                    setShowProductOptions(true);
                    setErrors(current => ({...current, product: '', form: ''}));
                  }}
                  onFocus={() => setShowProductOptions(true)}
                  style={styles.input}
                  placeholderTextColor={COLORS.muted}
                />
              </View>
              {errors.product ? <Text style={styles.errorText}>{errors.product}</Text> : null}

              {showProductOptions ? (
                <View style={styles.dropdownCard}>
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
                    <Text style={styles.dropdownEmpty}>No matching products found.</Text>
                  )}
                </View>
              ) : null}

              {selectedProduct ? (
                <View style={styles.selectedBox}>
                  <Text style={styles.selectedTitle}>{selectedProduct.name}</Text>
                  <Text style={styles.selectedDescription}>
                    Available {selectedProduct.quantity || 0} · Selling price{' '}
                    {formatCurrency(selectedProduct.selling_price)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.quantityRow}>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() =>
                    updateQuantity(String(Math.max(0, Number(quantity || 0) - 1)))
                  }
                  style={styles.quantityButton}>
                  <Minus color={COLORS.primary} size={18} />
                </TouchableOpacity>
                <TextInput
                  placeholder="Quantity"
                  value={quantity}
                  onChangeText={updateQuantity}
                  keyboardType="number-pad"
                  style={styles.quantityInput}
                  placeholderTextColor={COLORS.muted}
                />
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => updateQuantity(String(Number(quantity || 0) + 1))}
                  style={styles.quantityButton}>
                  <Plus color={COLORS.primary} size={18} />
                </TouchableOpacity>
              </View>
              {errors.quantity ? <Text style={styles.errorText}>{errors.quantity}</Text> : null}

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>CALCULATED TOTAL</Text>
                <Text style={[styles.totalValue, type.number]}>
                  {formatCurrency(calculatedTotal)}
                </Text>
              </View>

              {stockWarning ? <Text style={styles.warningText}>{stockWarning}</Text> : null}
              {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}

              <KoboButton
                onPress={handleConfirmSale}
                loading={isSaving}
                disabled={isSaving || products.length === 0}>
                Confirm Sale
              </KoboButton>
            </>
          )}
        </SurfaceCard>

        <SurfaceCard style={styles.listCard}>
          <View style={styles.sectionHead}>
            <Check color={COLORS.success} size={20} strokeWidth={2.4} />
            <Text style={styles.sectionTitle}>Today's Sales</Text>
          </View>
          {todaySales.length > 0 ? (
            <FlatList
              data={todaySales}
              keyExtractor={item => item.id}
              renderItem={renderSale}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>No sales recorded today.</Text>
          )}
        </SurfaceCard>

        {isLoading ? <Text style={styles.loadingText}>Refreshing local data...</Text> : null}
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
  formCard: {
    gap: 10,
  },
  inputWrap: {
    justifyContent: 'center',
  },
  inputIcon: {
    left: 16,
    position: 'absolute',
    zIndex: 1,
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
    paddingLeft: 44,
  },
  dropdownCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownList: {
    maxHeight: 220,
  },
  optionRow: {
    alignItems: 'center',
    borderBottomColor: COLORS.line,
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
  dropdownEmpty: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    padding: 14,
    textAlign: 'center',
  },
  selectedBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 18,
    padding: 12,
  },
  selectedTitle: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  selectedDescription: {
    color: COLORS.primaryDark,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 2,
  },
  quantityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  quantityButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  quantityInput: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    color: COLORS.text,
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
    minHeight: 52,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  totalBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 22,
    padding: 16,
  },
  totalLabel: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  totalValue: {
    color: COLORS.text,
    fontSize: 30,
    marginTop: 4,
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
  },
  warningText: {
    backgroundColor: COLORS.warningSoft,
    borderRadius: 14,
    color: COLORS.warning,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    padding: 10,
  },
  emptyProductBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  emptyText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    paddingVertical: 16,
    textAlign: 'center',
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
  saleRow: {
    alignItems: 'center',
    borderTopColor: COLORS.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 70,
    paddingVertical: 12,
  },
  saleDetails: {
    flex: 1,
  },
  saleTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  saleDescription: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 2,
  },
  saleTotal: {
    color: COLORS.success,
    fontSize: 14,
  },
  loadingText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default SalesScreen;
