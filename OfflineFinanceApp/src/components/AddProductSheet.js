import React, {useState} from 'react';
import {StyleSheet, TextInput, TouchableOpacity, View, ScrollView} from 'react-native';
import {Text, Divider, Modal} from 'react-native-paper';
import {X} from 'lucide-react-native';
import {COLORS, FONT_FAMILY} from '../theme/theme';
import {KoboButton} from './KoboUI';

export const AddProductSheet = ({visible, onDismiss, onSave}) => {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    minThreshold: '',
  });

  const updateField = (field, value) => {
    setForm(prev => ({...prev, [field]: value}));
  };

  const handleSave = () => {
    onSave(form);
    setForm({
      name: '',
      sku: '',
      category: '',
      costPrice: '',
      sellingPrice: '',
      quantity: '',
      minThreshold: '',
    });
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={styles.sheetCard}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>New Product</Text>
          <TouchableOpacity onPress={onDismiss}>
            <X color={COLORS.muted} size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Product Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Paracetamol 500mg"
            placeholderTextColor={COLORS.muted}
            value={form.name}
            onChangeText={v => updateField('name', v)}
          />

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>SKU</Text>
              <TextInput
                style={styles.input}
                placeholder="SKU-123"
                placeholderTextColor={COLORS.muted}
                value={form.sku}
                onChangeText={v => updateField('sku', v)}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="Medicine"
                placeholderTextColor={COLORS.muted}
                value={form.category}
                onChangeText={v => updateField('category', v)}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Cost Price</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={COLORS.muted}
                keyboardType="decimal-pad"
                value={form.costPrice}
                onChangeText={v => updateField('costPrice', v)}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Selling Price</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={COLORS.muted}
                keyboardType="decimal-pad"
                value={form.sellingPrice}
                onChangeText={v => updateField('sellingPrice', v)}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Initial Qty</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={COLORS.muted}
                keyboardType="number-pad"
                value={form.quantity}
                onChangeText={v => updateField('quantity', v)}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Low Stock Warning</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor={COLORS.muted}
                keyboardType="number-pad"
                value={form.minThreshold}
                onChangeText={v => updateField('minThreshold', v)}
              />
            </View>
          </View>

          <KoboButton onPress={handleSave} style={styles.submitBtn}>
            Create Product
          </KoboButton>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheetCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    marginTop: 'auto',
    maxHeight: '90%',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  form: {
    gap: 16,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.line,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  submitBtn: {
    marginTop: 12,
  },
});
