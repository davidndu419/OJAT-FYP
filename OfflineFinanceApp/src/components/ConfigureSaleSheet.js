import React, {useMemo, useState} from 'react';
import {StyleSheet, TouchableOpacity, View, FlatList, TextInput, ScrollView} from 'react-native';
import {Text, Divider, Modal} from 'react-native-paper';
import {X, Search, ChevronLeft, Plus, Minus, AlertCircle, CreditCard, Banknote} from 'lucide-react-native';
import {COLORS, FONT_FAMILY, cardShadow} from '../theme/theme';
import {KoboButton, type} from './KoboUI';
import {formatCurrency} from '../utils/helpers';

export const ConfigureSaleSheet = ({visible, onDismiss, products = [], onConfirm}) => {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Sale config state
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(cats)].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesCat = category === 'All' || p.category === category;
      return matchesSearch && matchesCat;
    });
  }, [products, search, category]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setPrice(String(product.selling_price));
    setQty(1);
    setStep(2);
  };

  const handleClose = () => {
    setStep(1);
    setSearch('');
    setCategory('All');
    setSelectedProduct(null);
    onDismiss();
  };

  const isBelowCost = useMemo(() => {
    if (!selectedProduct) return false;
    const cost = selectedProduct.weighted_average_cost || selectedProduct.cost_price || 0;
    return Number(price) < cost;
  }, [selectedProduct, price]);

  const total = useMemo(() => qty * Number(price), [qty, price]);

  const handleConfirm = () => {
    onConfirm({
      product: selectedProduct,
      quantity: qty,
      price: Number(price),
      paymentMethod,
      total
    });
    handleClose();
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Record Sale</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <X color={COLORS.muted} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={COLORS.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.categoryRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}>
          {categories.map(item => (
            <TouchableOpacity 
              key={item}
              onPress={() => setCategory(item)}
              style={[styles.categoryChip, category === item && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.productList}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map(item => (
            <TouchableOpacity key={item.id} style={styles.productRow} onPress={() => handleSelectProduct(item)}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productStock}>Stock: {item.quantity || 0} left</Text>
              </View>
              <Text style={[styles.productPrice, type.number]}>{formatCurrency(item.selling_price)}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No products found</Text>
        )}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.sheetHeader}>
        <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
          <ChevronLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.sheetTitleSmall}>Configure Sale</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <X color={COLORS.muted} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.selectedProductInfo}>
        <Text style={styles.selectedProductName}>{selectedProduct?.name}</Text>
        <Text style={styles.selectedProductMeta}>
          {selectedProduct?.category} · {selectedProduct?.quantity || 0} available
        </Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Unit Price (₦)</Text>
        <TextInput
          style={[styles.input, isBelowCost && styles.inputWarning]}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholderTextColor={COLORS.muted}
        />
        {isBelowCost && (
          <View style={styles.warningRow}>
            <AlertCircle size={14} color={COLORS.danger} />
            <Text style={styles.warningText}>Selling below cost</Text>
          </View>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Quantity</Text>
        <View style={styles.stepper}>
          <TouchableOpacity 
            style={styles.stepBtn} 
            onPress={() => setQty(Math.max(1, qty - 1))}
          >
            <Minus color={COLORS.primary} size={20} strokeWidth={3} />
          </TouchableOpacity>
          <TextInput
            style={styles.stepperInput}
            value={String(qty)}
            onChangeText={v => setQty(parseInt(v) || 0)}
            keyboardType="number-pad"
            placeholderTextColor={COLORS.muted}
          />
          <TouchableOpacity 
            style={styles.stepBtn} 
            onPress={() => setQty(qty + 1)}
          >
            <Plus color={COLORS.primary} size={20} strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.paymentRow}>
          <TouchableOpacity 
            style={[styles.paymentTab, paymentMethod === 'cash' && styles.paymentTabActive]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Banknote size={18} color={paymentMethod === 'cash' ? COLORS.primary : COLORS.muted} />
            <Text style={[styles.paymentTabText, paymentMethod === 'cash' && styles.paymentTabTextActive]}>Cash</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.paymentTab, paymentMethod === 'bank' && styles.paymentTabActive]}
            onPress={() => setPaymentMethod('bank')}
          >
            <CreditCard size={18} color={paymentMethod === 'bank' ? COLORS.primary : COLORS.muted} />
            <Text style={[styles.paymentTabText, paymentMethod === 'bank' && styles.paymentTabTextActive]}>Bank Transfer</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Grand Total</Text>
        <Text style={[styles.totalValue, type.number]}>{formatCurrency(total)}</Text>
      </View>

      <KoboButton 
        onPress={handleConfirm} 
        style={styles.confirmBtn}
        disabled={qty > (selectedProduct?.quantity || 0) || qty <= 0}
      >
        Confirm Sale
      </KoboButton>
      {qty > (selectedProduct?.quantity || 0) && (
        <Text style={styles.errorText}>Insufficient stock available</Text>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      onDismiss={handleClose}
      contentContainerStyle={styles.sheetCard}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 ? renderStep1() : renderStep2()}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheetCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 'auto',
    maxHeight: '90%',
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  sheetTitleSmall: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  closeBtn: {
    backgroundColor: COLORS.secondary,
    padding: 6,
    borderRadius: 10,
  },
  backBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    color: COLORS.text,
  },
  categoryRow: {
    marginBottom: 20,
  },
  categoryList: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.muted,
  },
  categoryTextActive: {
    color: COLORS.primaryForeground,
  },
  productList: {
    marginBottom: 20,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  productStock: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '800',
  },
  emptyText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 40,
  },
  selectedProductInfo: {
    backgroundColor: COLORS.primaryPale,
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  selectedProductName: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  selectedProductMeta: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: COLORS.primary,
    opacity: 0.7,
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    height: 56,
    paddingHorizontal: 16,
  },
  inputWarning: {
    borderColor: COLORS.danger,
    color: COLORS.danger,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  warningText: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.danger,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    height: 56,
    paddingHorizontal: 8,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  stepperInput: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paymentTabActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  paymentTabText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  paymentTabTextActive: {
    color: COLORS.primary,
  },
  totalBox: {
    backgroundColor: COLORS.primary,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
    ...cardShadow,
  },
  totalLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 32,
    color: COLORS.primaryForeground,
    fontWeight: '800',
  },
  confirmBtn: {
    marginTop: 8,
  },
  errorText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '700',
  },
});

