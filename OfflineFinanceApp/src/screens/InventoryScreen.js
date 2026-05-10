import React, {useCallback, useMemo, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Package,
  PackagePlus,
  Search,
  X,
} from 'lucide-react-native';
import {Modal, Portal, Text} from 'react-native-paper';
import {format, formatISO, isValid, parseISO} from 'date-fns';
import {getDBConnection} from '../database/db';
import {syncInBackground} from '../services/syncService';
import {
  formatCurrency,
  generateId,
  getCurrentTimestamp,
  getRowsArray,
} from '../utils/helpers';
import {
  appendPurchaseBatch,
  calculateWeightedAverageCost,
  serializePurchaseBatches,
} from '../utils/inventoryAccounting';
import {COLORS, FONT_FAMILY} from '../theme/theme';
import {
  HeroCard,
  IconBubble,
  KoboButton,
  ScreenHeader,
  SurfaceCard,
  gradientStyle,
  type,
} from '../components/KoboUI';
import {LuminousStatus} from '../components/LuminousStatus';
import {BottomSheetModule} from '../components/BottomSheetModule';
import {globalEvents, EVENT_CLOSE_ALL_MODALS} from '../utils/events';

const formatDateInput = date => format(date, 'yyyy-MM-dd');

const createDateFromInput = value => {
  const date = parseISO(value);

  if (!isValid(date) || formatDateInput(date) !== value) {
    return null;
  }

  return date;
};

const createRestockForm = product => ({
  quantity: '',
  unitCost:
    product?.purchase_price !== undefined && product?.purchase_price !== null
      ? String(product.purchase_price)
      : product?.cost_price !== undefined && product?.cost_price !== null
      ? String(product.cost_price)
      : '',
  date: formatDateInput(new Date()),
});

function InventoryScreen({navigation}) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isPurchaseSheetOpen, setIsPurchaseSheetOpen] = useState(false);
  const [restockForm, setRestockForm] = useState(createRestockForm());
  const [errors, setErrors] = useState({});
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);
  const [message, setMessage] = useState('');
  const [dateRange, setDateRange] = useState('today'); // for consistency
  const [dateModuleOpen, setDateModuleOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = await getDBConnection();
      const [result] = await db.executeSql(
        'SELECT * FROM products ORDER BY name ASC;',
      );
      setProducts(getRowsArray(result));
    } catch (error) {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();

      const closeAllListener = () => {
        setIsActionSheetOpen(false);
        setIsPurchaseSheetOpen(false);
        setDateModuleOpen(false);
        setMessage('');
      };

      globalEvents.on(EVENT_CLOSE_ALL_MODALS, closeAllListener);

      return () => {
        globalEvents.off(EVENT_CLOSE_ALL_MODALS, closeAllListener);
        setIsActionSheetOpen(false);
        setIsPurchaseSheetOpen(false);
        setDateModuleOpen(false);
        setMessage('');
      };
    }, [loadProducts]),
  );

  const counts = useMemo(() => {
    const low = products.filter(
      item => Number(item.quantity || 0) < Number(item.min_threshold || 0),
    ).length;

    const totalValue = products.reduce((acc, item) => {
      const cost = Number(
        item.weighted_average_cost || item.purchase_price || item.cost_price || 0,
      );
      const qty = Number(item.quantity || 0);
      return acc + cost * qty;
    }, 0);

    return {all: products.length, low, ok: products.length - low, totalValue};
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter(product => {
      const isLow =
        Number(product.quantity || 0) < Number(product.min_threshold || 0);
      const matchesFilter =
        filter === 'all' || (filter === 'low' ? isLow : !isLow);
      const matchesSearch =
        !query ||
        String(product.name || '')
          .toLowerCase()
          .includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [filter, products, searchQuery]);

  const navigateToProductForm = product => {
    setIsActionSheetOpen(false);
    setIsPurchaseSheetOpen(false);
    navigation.navigate('AddEditProduct', product ? {product} : undefined);
  };

  const openProductActions = product => {
    setSelectedProduct(product);
    setRestockForm(createRestockForm(product));
    setErrors({});
    setIsActionSheetOpen(true);
  };

  const closeProductActions = () => {
    setIsActionSheetOpen(false);
    setErrors({});
  };

  const openPurchaseSheet = () => {
    setRestockForm(createRestockForm(selectedProduct));
    setErrors({});
    setIsActionSheetOpen(false);
    setIsPurchaseSheetOpen(true);
  };

  const closePurchaseSheet = () => {
    setIsPurchaseSheetOpen(false);
    setErrors({});
  };

  const updateRestockField = (field, value) => {
    setRestockForm(current => ({...current, [field]: value}));
    setErrors(current => ({...current, [field]: '', form: ''}));
  };

  const shiftRestockDate = days => {
    const baseDate = createDateFromInput(restockForm.date) || new Date();
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + days);
    updateRestockField('date', formatDateInput(nextDate));
  };

  const validateRestock = () => {
    const nextErrors = {};
    const quantity = Number(restockForm.quantity || 0);
    const unitCost = Number(restockForm.unitCost || 0);
    const purchaseDate = createDateFromInput(restockForm.date);

    if (!selectedProduct) {
      nextErrors.form = 'Select a product before restocking.';
    }

    if (!restockForm.quantity.trim()) {
      nextErrors.quantity = 'Quantity is required.';
    } else if (!/^\d+$/.test(restockForm.quantity.trim()) || quantity <= 0) {
      nextErrors.quantity =
        'Quantity must be a whole number greater than zero.';
    }

    if (!restockForm.unitCost.trim()) {
      nextErrors.unitCost = 'Unit cost is required.';
    } else if (
      !/^\d+(\.\d+)?$/.test(restockForm.unitCost.trim()) ||
      unitCost <= 0
    ) {
      nextErrors.unitCost =
        'Unit cost must be a valid number greater than zero.';
    }

    if (!restockForm.date.trim()) {
      nextErrors.date = 'Date is required.';
    } else if (!purchaseDate) {
      nextErrors.date = 'Use a valid date in YYYY-MM-DD format.';
    } else if (purchaseDate > new Date()) {
      nextErrors.date = 'Purchase date cannot be in the future.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSavePurchase = async () => {
    if (!validateRestock()) {
      return;
    }

    setIsSavingPurchase(true);
    try {
      const db = await getDBConnection();
      const quantity = Number(restockForm.quantity || 0);
      const unitCost = Number(restockForm.unitCost || 0);
      const totalAmount = quantity * unitCost;
      const parsedDate = createDateFromInput(restockForm.date);
      const now = new Date();
      const purchaseDate = formatISO(
        new Date(
          parsedDate.getFullYear(),
          parsedDate.getMonth(),
          parsedDate.getDate(),
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          now.getMilliseconds(),
        ),
      );
      const updatedAt = getCurrentTimestamp();
      const currentQuantity = Number(selectedProduct.quantity || 0);
      const nextQuantity = currentQuantity + quantity;
      const weightedAverageCost = calculateWeightedAverageCost({
        currentQuantity,
        currentWeightedAverageCost: selectedProduct.weighted_average_cost,
        fallbackUnitCost:
          selectedProduct.purchase_price || selectedProduct.cost_price || 0,
        purchaseQuantity: quantity,
        purchaseUnitCost: unitCost,
      });
      const purchaseBatches = appendPurchaseBatch(selectedProduct, {
        quantity,
        unitCost,
        date: purchaseDate,
      });
      const serializedPurchaseBatches =
        serializePurchaseBatches(purchaseBatches);

      await new Promise((resolve, reject) => {
        db.transaction(
          tx => {
            tx.executeSql(
              `UPDATE products
               SET quantity = ?,
                   cost_price = ?,
                   purchase_price = ?,
                   weighted_average_cost = ?,
                   purchase_batches = ?,
                   updated_at = ?,
                   synced = 0
               WHERE id = ?;`,
              [
                nextQuantity,
                unitCost,
                unitCost,
                weightedAverageCost,
                serializedPurchaseBatches,
                updatedAt,
                selectedProduct.id,
              ],
            );
            tx.executeSql(
              `INSERT INTO expenses (
                 id,
                 category,
                 description,
                 amount,
                 date,
                 synced
               ) VALUES (?, ?, ?, ?, ?, ?);`,
              [
                generateId(),
                'Stock Purchase',
                `Restock: ${selectedProduct.name} (${quantity} units)`,
                totalAmount,
                purchaseDate,
                0,
              ],
            );
          },
          error => reject(error),
          () => resolve(),
        );
      });

      setMessage(`Inventory Updated +${quantity}`);
      setSelectedProduct(current =>
        current
          ? {
              ...current,
              quantity: nextQuantity,
              cost_price: unitCost,
              purchase_price: unitCost,
              weighted_average_cost: weightedAverageCost,
              purchase_batches: serializedPurchaseBatches,
              updated_at: updatedAt,
            }
          : current,
      );
      closePurchaseSheet();
      await loadProducts();
      
      // Trigger background sync
      syncInBackground();
    } catch (error) {
      setErrors({form: 'Unable to save purchase. Please try again.'});
    } finally {
      setIsSavingPurchase(false);
    }
  };

  const filters = [
    {key: 'all', label: 'All', count: counts.all},
    {key: 'low', label: 'Low', count: counts.low},
    {key: 'ok', label: 'OK', count: counts.ok},
  ];
  const restockTotal =
    Number(restockForm.quantity || 0) * Number(restockForm.unitCost || 0);
  const isBackgroundLocked = isActionSheetOpen || isPurchaseSheetOpen;

  const renderProduct = ({item}) => {
    const isLowStock =
      Number(item.quantity || 0) < Number(item.min_threshold || 0);

    return (
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => openProductActions(item)}>
        <SurfaceCard style={styles.productCard}>
          <IconBubble tone={isLowStock ? 'danger' : 'primary'} size={46}>
            <Package
              color={isLowStock ? COLORS.danger : COLORS.primary}
              size={21}
              strokeWidth={2.4}
            />
          </IconBubble>
          <View style={styles.productBody}>
            <View style={styles.productTitleRow}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {item.name}
              </Text>
              {isLowStock ? <Text style={styles.lowBadge}>LOW</Text> : null}
            </View>
            <Text style={styles.productMeta} numberOfLines={1}>
              {item.category || 'SKU'} · Qty {item.quantity || 0}
            </Text>
          </View>
          <View style={styles.priceBlock}>
            <Text style={[styles.price, type.number]}>
              {formatCurrency(item.selling_price)}
            </Text>
            <ChevronRight color={COLORS.muted} size={18} />
          </View>
        </SurfaceCard>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.shell}>
        <ScreenHeader eyebrow="Inventory" title="Stock" />
        <HeroCard style={{marginBottom: 20}}>
          <View style={styles.heroTop}>
            <Text style={styles.heroEyebrow}>Total Inventory Value</Text>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => setDateModuleOpen(true)}
              style={styles.dateSelector}>
              <Calendar color={COLORS.primaryForeground} size={16} />
              <Text style={styles.dateText}>
                {dateRange === 'today' ? 'Today' : dateRange === 'yesterday' ? 'Yesterday' : 'This Month'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.heroAmount, type.number]}>{formatCurrency(counts.totalValue)}</Text>
        </HeroCard>

        <View style={styles.searchWrap}>
          <Search
            color={COLORS.muted}
            size={19}
            strokeWidth={2.4}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search products"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor={COLORS.muted}
          />
        </View>

        <View style={styles.filterGrid}>
          {filters.map(item => {
            const active = item.key === filter;
            return (
              <TouchableOpacity
                activeOpacity={0.84}
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[styles.filterPill, active && gradientStyle('primary')]}>
                <Text
                  style={[styles.filterText, active && styles.filterTextOn]}>
                  {item.label} {item.count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          scrollEnabled={!isBackgroundLocked}
          refreshing={isLoading}
          onRefresh={loadProducts}
          contentContainerStyle={[
            styles.listContent,
            filteredProducts.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No products found.</Text>
          }
        />
      </View>

      <BottomSheetModule
        isOpen={dateModuleOpen}
        onClose={() => setDateModuleOpen(false)}
        title="Select Range">
        <View style={styles.dateOptions}>
          {[
            { label: 'Today', value: 'today' },
            { label: 'Yesterday', value: 'yesterday' },
            { label: 'This Month', value: 'month' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={0.7}
              onPress={() => {
                setDateRange(opt.value);
                setDateModuleOpen(false);
              }}
              style={[
                styles.dateOption,
                dateRange === opt.value && styles.dateOptionSelected
              ]}>
              <Text style={[
                styles.dateOptionText,
                dateRange === opt.value && styles.dateOptionTextSelected
              ]}>
                {opt.label}
              </Text>
              {dateRange === opt.value && <Check color={COLORS.primary} size={20} />}
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetModule>

      <TouchableOpacity
        activeOpacity={0.86}
        style={[styles.addButton, gradientStyle('primary')]}
        onPress={() => navigateToProductForm()}>
        <Text style={styles.addButtonText}>+ Product</Text>
      </TouchableOpacity>

      <BottomSheetModule
        isOpen={isActionSheetOpen}
        onClose={closeProductActions}
        title="Product Details">
        {selectedProduct ? (
          <View>
            <View style={styles.actionStats}>
              <View style={styles.actionStat}>
                <Text style={styles.actionStatLabel}>Stock</Text>
                <Text style={[styles.actionStatValue, type.number]}>
                  {selectedProduct.quantity || 0}
                </Text>
              </View>
              <View style={styles.actionStat}>
                <Text style={styles.actionStatLabel}>WAC</Text>
                <Text style={[styles.actionStatValue, type.number]}>
                  {formatCurrency(
                    selectedProduct.weighted_average_cost ||
                      selectedProduct.purchase_price ||
                      selectedProduct.cost_price ||
                      0,
                  )}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={openPurchaseSheet}
              style={[styles.purchaseButton, gradientStyle('success')]}>
              <PackagePlus
                color={COLORS.primaryForeground}
                size={20}
                strokeWidth={2.4}
              />
              <Text style={styles.purchaseButtonText}>Purchase/Restock</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => navigateToProductForm(selectedProduct)}
              style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit Product Details</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </BottomSheetModule>

      <BottomSheetModule
        isOpen={isPurchaseSheetOpen}
        onClose={closePurchaseSheet}
        title="Purchase / Restock">
        <View>


              <View style={styles.formGrid}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Quantity</Text>
                  <TextInput
                    value={restockForm.quantity}
                    onChangeText={value =>
                      updateRestockField('quantity', value)
                    }
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.muted}
                    style={[
                      styles.sheetInput,
                      errors.quantity && styles.errorBorder,
                    ]}
                  />
                  {errors.quantity ? (
                    <Text style={styles.errorText}>{errors.quantity}</Text>
                  ) : null}
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Unit Cost</Text>
                  <TextInput
                    value={restockForm.unitCost}
                    onChangeText={value =>
                      updateRestockField('unitCost', value)
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={COLORS.muted}
                    style={[
                      styles.sheetInput,
                      errors.unitCost && styles.errorBorder,
                    ]}
                  />
                  {errors.unitCost ? (
                    <Text style={styles.errorText}>{errors.unitCost}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.totalPanel}>
                <View>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={[styles.totalValue, type.number]}>
                    {formatCurrency(restockTotal)}
                  </Text>
                </View>
                <Calendar color={COLORS.primary} size={22} strokeWidth={2.4} />
              </View>

              <Text style={styles.fieldLabel}>Date</Text>
              <View style={styles.datePickerRow}>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => shiftRestockDate(-1)}
                  style={styles.dateButton}>
                  <ChevronLeft color={COLORS.primary} size={18} />
                </TouchableOpacity>
                <TextInput
                  value={restockForm.date}
                  onChangeText={value => updateRestockField('date', value)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.muted}
                  style={[styles.dateInput, errors.date && styles.errorBorder]}
                />
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() =>
                    updateRestockField('date', formatDateInput(new Date()))
                  }
                  style={styles.todayButton}>
                  <Text style={styles.todayText}>Today</Text>
                </TouchableOpacity>
              </View>
              {errors.date ? (
                <Text style={styles.errorText}>{errors.date}</Text>
              ) : null}
              {errors.form ? (
                <Text style={styles.errorText}>{errors.form}</Text>
              ) : null}

              <KoboButton
                onPress={handleSavePurchase}
                loading={isSavingPurchase}
                disabled={isSavingPurchase}
                style={styles.savePurchaseButton}>
                Save Restock
              </KoboButton>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  shell: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 448,
    paddingHorizontal: 20,
    width: '100%',
  },
  searchWrap: {
    marginBottom: 12,
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
  filterGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  filterText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextOn: {
    color: COLORS.primaryForeground,
  },
  listContent: {
    gap: 12,
    paddingBottom: 140,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  productCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  productBody: {
    flex: 1,
  },
  productTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  productTitle: {
    color: COLORS.text,
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
  },
  lowBadge: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 999,
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  productMeta: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 3,
  },
  priceBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    color: COLORS.text,
    fontSize: 13,
  },
  emptyText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    textAlign: 'center',
  },
  addButton: {
    alignItems: 'center',
    borderRadius: 18,
    bottom: 104,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 20,
    position: 'absolute',
    right: 20,
  },
  addButtonText: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  bottomSheet: {
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
  },
  purchaseSheet: {
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
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: COLORS.line,
    borderRadius: 3,
    height: 5,
    marginBottom: 14,
    width: 44,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitleWrap: {
    flex: 1,
  },
  sheetEyebrow: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  actionStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionStat: {
    backgroundColor: COLORS.primaryPale,
    borderRadius: 18,
    flex: 1,
    minHeight: 76,
    padding: 12,
  },
  actionStatLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  actionStatValue: {
    color: COLORS.primary,
    fontSize: 18,
    marginTop: 7,
  },
  purchaseButton: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 18,
  },
  purchaseButtonText: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
  },
  editButton: {
    alignItems: 'center',
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 50,
  },
  editButtonText: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  formGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  formField: {
    flex: 1,
  },
  fieldLabel: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
  },
  sheetInput: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
    width: '100%',
  },
  totalPanel: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryPale,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    padding: 14,
  },
  totalLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  totalValue: {
    color: COLORS.primary,
    fontSize: 24,
    marginTop: 4,
  },
  datePickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dateButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 44,
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
  todayButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  todayText: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  savePurchaseButton: {
    marginTop: 16,
  },
  errorBorder: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 6,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  dateText: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  dateOptions: {
    gap: 8,
    paddingBottom: 20,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderColor: COLORS.line,
    borderWidth: 1,
  },
  dateOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  dateOptionText: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
  },
  dateOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  heroEyebrow: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroAmount: {
    color: COLORS.primaryForeground,
    fontSize: 38,
    fontWeight: '800',
    marginTop: 12,
  },
});

export default InventoryScreen;
