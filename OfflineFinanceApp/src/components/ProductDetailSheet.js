import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native';
import {Text, Divider} from 'react-native-paper';
import {X, Package, ShoppingBag, TrendingUp, ChevronLeft, ChevronRight, Edit3, Plus, Minus, Calendar} from 'lucide-react-native';
import {COLORS, FONT_FAMILY, cardShadow, gradientStyle} from '../theme/theme';
import {KoboButton, IconBubble, type} from './KoboUI';
import {formatCurrency} from '../utils/helpers';
import {BottomSheetModule} from './BottomSheetModule';
import {BottomSheetTextInput} from '@gorhom/bottom-sheet';

export const ProductDetailSheet = ({sheetRef, product, transactions = [], onRestock, onEdit}) => {
  const [mode, setMode] = useState('view'); // 'view' | 'restock' | 'edit'
  
  // Restock form state
  const [restockQty, setRestockQty] = useState(1);
  const [restockCost, setRestockCost] = useState(product?.weighted_average_cost || product?.cost_price || 0);
  const [restockDate, setRestockDate] = useState(new Date());

  // Edit form state
  const [editForm, setEditForm] = useState(product || {});

  const handleClose = () => {
    setMode('view');
    sheetRef.current?.close();
  };

  const margin = useMemo(() => {
    const cost = product?.weighted_average_cost || product?.cost_price || 0;
    const price = product?.selling_price || 0;
    if (price === 0) return 0;
    return ((price - cost) / price) * 100;
  }, [product]);

  const handleRestockSubmit = () => {
    onRestock({
      quantity: restockQty,
      unitCost: restockCost,
      date: restockDate
    });
    setMode('view');
  };

  const handleEditSubmit = () => {
    onEdit(editForm);
    setMode('view');
  };

  const renderViewMode = () => (
    <View>
      <View style={styles.sheetHeader}>
        <View style={styles.sheetTitleWrap}>
          <Text style={styles.sheetEyebrow}>{product?.category || 'General'} · {product?.sku || 'NO-SKU'}</Text>
          <Text style={styles.sheetTitle}>{product?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <X color={COLORS.muted} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroStats}>
        <View style={styles.heroStat}>
          <IconBubble tone="primary" size={40} style={styles.heroIcon}>
            <Package color={COLORS.primary} size={18} />
          </IconBubble>
          <Text style={styles.heroStatLabel}>Quantity</Text>
          <Text style={[styles.heroStatValue, type.number]}>{product?.quantity || 0}</Text>
        </View>
        <View style={styles.heroStat}>
          <IconBubble tone="success" size={40} style={styles.heroIcon}>
            <ShoppingBag color={COLORS.success} size={18} />
          </IconBubble>
          <Text style={styles.heroStatLabel}>Sold Units</Text>
          <Text style={[styles.heroStatValue, type.number]}>{product?.sold_units || 0}</Text>
        </View>
        <View style={styles.heroStat}>
          <IconBubble tone="warning" size={40} style={styles.heroIcon}>
            <TrendingUp color={COLORS.warning} size={18} />
          </IconBubble>
          <Text style={styles.heroStatLabel}>Revenue</Text>
          <Text style={[styles.heroStatValue, type.number]}>{formatCurrency(product?.revenue || 0)}</Text>
        </View>
      </View>

      <View style={styles.gridStats}>
        <View style={styles.gridStat}>
          <Text style={styles.gridStatLabel}>Selling Price</Text>
          <Text style={[styles.gridStatValue, type.number]}>{formatCurrency(product?.selling_price || 0)}</Text>
        </View>
        <View style={styles.gridStat}>
          <Text style={styles.gridStatLabel}>WAC (Cost)</Text>
          <Text style={[styles.gridStatValue, type.number]}>{formatCurrency(product?.weighted_average_cost || product?.cost_price || 0)}</Text>
        </View>
        <View style={styles.gridStat}>
          <Text style={styles.gridStatLabel}>Margin</Text>
          <Text style={[
            styles.gridStatValue, 
            type.number, 
            {color: margin >= 0 ? COLORS.success : COLORS.danger}
          ]}>
            {margin.toFixed(1)}%
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.restockBtn]} 
          onPress={() => setMode('restock')}
        >
          <Plus color={COLORS.primaryForeground} size={18} strokeWidth={3} />
          <Text style={styles.restockBtnText}>Purchase/Restock</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.editBtn} 
          onPress={() => {
            setEditForm(product);
            setMode('edit');
          }}
        >
          <Edit3 color={COLORS.primary} size={18} />
          <Text style={styles.editBtnText}>Edit Product</Text>
        </TouchableOpacity>
      </View>

      <Divider style={styles.divider} />
      
      <Text style={styles.sectionTitle}>Transaction History</Text>
      {transactions.length > 0 ? (
        transactions.map((tx, idx) => (
          <View key={idx} style={styles.txRow}>
            <View style={styles.txIcon}>
              <IconBubble tone={tx.type === 'sale' ? 'success' : 'primary'} size={32}>
                {tx.type === 'sale' ? <ShoppingBag size={14} color={COLORS.success} /> : <Plus size={14} color={COLORS.primary} />}
              </IconBubble>
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txType}>{tx.type === 'sale' ? 'Sale' : 'Restock'}</Text>
              <Text style={styles.txDate}>{tx.date}</Text>
            </View>
            <View style={styles.txAmount}>
              <Text style={[styles.txQty, type.number]}>{tx.type === 'sale' ? '-' : '+'}{tx.quantity}</Text>
              <Text style={styles.txValue}>{formatCurrency(tx.amount)}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No recent transactions</Text>
      )}
    </View>
  );

  const renderRestockMode = () => (
    <View>
      <View style={styles.sheetHeader}>
        <TouchableOpacity onPress={() => setMode('view')} style={styles.backBtn}>
          <ChevronLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <View style={styles.sheetTitleWrapCenter}>
          <Text style={styles.sheetTitleSmall}>Restock Product</Text>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <X color={COLORS.muted} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.restockInfoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Current Stock</Text>
          <Text style={[styles.infoValue, type.number]}>{product?.quantity || 0}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Cost</Text>
          <Text style={[styles.infoValue, type.number]}>{formatCurrency(product?.weighted_average_cost || product?.cost_price || 0)}</Text>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Quantity</Text>
        <View style={styles.stepper}>
          <TouchableOpacity 
            style={styles.stepBtn} 
            onPress={() => setRestockQty(Math.max(1, restockQty - 1))}
          >
            <Minus color={COLORS.primary} size={20} strokeWidth={3} />
          </TouchableOpacity>
          <BottomSheetTextInput
            style={styles.stepperInput}
            value={String(restockQty)}
            onChangeText={v => setRestockQty(parseInt(v) || 0)}
            keyboardType="number-pad"
            inputMode="numeric"
          />
          <TouchableOpacity 
            style={styles.stepBtn} 
            onPress={() => setRestockQty(restockQty + 1)}
          >
            <Plus color={COLORS.primary} size={20} strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Unit Cost (₦)</Text>
        <BottomSheetTextInput
          style={styles.input}
          value={String(restockCost)}
          onChangeText={v => setRestockCost(v)}
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </View>

      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={[styles.totalValue, type.number]}>{formatCurrency(restockQty * Number(restockCost))}</Text>
      </View>

      <View style={styles.dateSelector}>
        <Text style={styles.label}>Purchase Date</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity 
            style={styles.dateNavBtn} 
            onPress={() => {
              const d = new Date(restockDate);
              d.setDate(d.getDate() - 1);
              setRestockDate(d);
            }}
          >
            <ChevronLeft size={18} color={COLORS.primary} />
            <Text style={styles.dateNavText}>Prev Day</Text>
          </TouchableOpacity>
          
          <View style={styles.dateDisplay}>
            <Calendar size={16} color={COLORS.primary} />
            <Text style={styles.dateDisplayText}>{restockDate.toLocaleDateString()}</Text>
          </View>

          <TouchableOpacity 
            style={styles.todayBtn} 
            onPress={() => setRestockDate(new Date())}
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KoboButton onPress={handleRestockSubmit} style={styles.submitBtn}>
        Confirm Restock
      </KoboButton>
    </View>
  );

  const renderEditMode = () => (
    <View>
      <View style={styles.sheetHeader}>
        <TouchableOpacity onPress={() => setMode('view')} style={styles.backBtn}>
          <ChevronLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <View style={styles.sheetTitleWrapCenter}>
          <Text style={styles.sheetTitleSmall}>Edit Product</Text>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <X color={COLORS.muted} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Product Name</Text>
        <BottomSheetTextInput
          style={styles.input}
          value={editForm.name}
          onChangeText={v => setEditForm({...editForm, name: v})}
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>SKU</Text>
            <BottomSheetTextInput
              style={styles.input}
              value={editForm.sku}
              onChangeText={v => setEditForm({...editForm, sku: v})}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>Category</Text>
            <BottomSheetTextInput
              style={styles.input}
              value={editForm.category}
              onChangeText={v => setEditForm({...editForm, category: v})}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Selling Price</Text>
            <BottomSheetTextInput
              style={styles.input}
              value={String(editForm.selling_price)}
              keyboardType="decimal-pad"
              inputMode="decimal"
              onChangeText={v => setEditForm({...editForm, selling_price: v})}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>Low Stock Threshold</Text>
            <BottomSheetTextInput
              style={styles.input}
              value={String(editForm.min_threshold)}
              keyboardType="number-pad"
              inputMode="numeric"
              onChangeText={v => setEditForm({...editForm, min_threshold: v})}
            />
          </View>
        </View>

        <KoboButton onPress={handleEditSubmit} style={styles.submitBtn}>
          Update Product
        </KoboButton>
      </View>
    </View>
  );

  const isOpen = !!product; // Assume open if product is set

  return (
    <BottomSheetModule
      isOpen={isOpen}
      onClose={handleClose}
      useScrollView={true}>
      {mode === 'view' && renderViewMode()}
      {mode === 'restock' && renderRestockMode()}
      {mode === 'edit' && renderEditMode()}
    </BottomSheetModule>
  );
};

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: COLORS.line,
    width: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48, // Added extra padding to ensure buttons aren't cut off
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitleWrap: {
    flex: 1,
  },
  sheetTitleWrapCenter: {
    flex: 1,
    alignItems: 'center',
  },
  sheetEyebrow: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sheetTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  sheetTitleSmall: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  closeBtn: {
    backgroundColor: COLORS.secondary,
    padding: 6,
    borderRadius: 10,
  },
  backBtn: {
    padding: 4,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  heroStat: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 20,
    ...cardShadow,
    alignItems: 'center',
  },
  heroIcon: {
    marginBottom: 8,
  },
  heroStatLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '700',
  },
  heroStatValue: {
    fontSize: 18,
    color: COLORS.text,
    marginTop: 4,
  },
  gridStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  gridStat: {
    flex: 1,
    alignItems: 'center',
  },
  gridStatLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  gridStatValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
  restockBtn: {
    backgroundColor: COLORS.primary,
    flex: 1.5,
  },
  restockBtnText: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 14,
  },
  editBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  editBtnText: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 14,
  },
  divider: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  txIcon: {
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txType: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  txDate: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: COLORS.muted,
  },
  txAmount: {
    alignItems: 'flex-end',
  },
  txQty: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  txValue: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
  },
  emptyText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Restock styles
  restockInfoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryPale,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '800',
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
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
  totalBox: {
    backgroundColor: COLORS.secondary,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  totalLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    color: COLORS.primary,
    fontWeight: '800',
  },
  dateSelector: {
    marginBottom: 32,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateNavText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  dateDisplayText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  todayBtn: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  submitBtn: {
    marginTop: 8,
  },
  // Edit mode styles
  form: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
});
