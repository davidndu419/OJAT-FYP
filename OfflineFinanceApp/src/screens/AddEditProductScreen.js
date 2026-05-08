import React, {useMemo, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  Button,
  HelperText,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import {getDBConnection} from '../database/db';
import {generateId, getCurrentTimestamp} from '../utils/helpers';
import {COLORS, FONT_FAMILY} from '../theme/theme';

const createInitialForm = product => ({
  name: product?.name ? String(product.name) : '',
  category: product?.category ? String(product.category) : '',
  costPrice:
    product?.cost_price !== undefined && product?.cost_price !== null
      ? String(product.cost_price)
      : '',
  sellingPrice:
    product?.selling_price !== undefined && product?.selling_price !== null
      ? String(product.selling_price)
      : '',
  quantity:
    product?.quantity !== undefined && product?.quantity !== null
      ? String(product.quantity)
      : '',
  minThreshold:
    product?.min_threshold !== undefined && product?.min_threshold !== null
      ? String(product.min_threshold)
      : '',
});

function AddEditProductScreen({navigation, route}) {
  const product = route.params?.product;
  const isEditing = Boolean(product?.id);
  const initialForm = useMemo(() => createInitialForm(product), [product]);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const updateField = (field, value) => {
    setForm(current => ({...current, [field]: value}));
    setErrors(current => ({...current, [field]: '', form: ''}));
  };

  const isDecimalNumber = value => /^\d+(\.\d+)?$/.test(value.trim());
  const isWholeNumber = value => /^\d+$/.test(value.trim());

  const validateForm = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Product name is required.';
    }

    if (!form.category.trim()) {
      nextErrors.category = 'Category is required.';
    }

    if (!form.costPrice.trim()) {
      nextErrors.costPrice = 'Cost price is required.';
    } else if (!isDecimalNumber(form.costPrice)) {
      nextErrors.costPrice = 'Cost price must be a valid number.';
    }

    if (!form.sellingPrice.trim()) {
      nextErrors.sellingPrice = 'Selling price is required.';
    } else if (!isDecimalNumber(form.sellingPrice)) {
      nextErrors.sellingPrice = 'Selling price must be a valid number.';
    }

    if (!form.quantity.trim()) {
      nextErrors.quantity = 'Quantity is required.';
    } else if (!isWholeNumber(form.quantity)) {
      nextErrors.quantity = 'Quantity must be a whole number.';
    }

    if (!form.minThreshold.trim()) {
      nextErrors.minThreshold = 'Minimum threshold is required.';
    } else if (!isWholeNumber(form.minThreshold)) {
      nextErrors.minThreshold = 'Minimum threshold must be a whole number.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const db = await getDBConnection();
      const productId = isEditing ? product.id : generateId();
      const updatedAt = getCurrentTimestamp();
      const productValues = [
        productId,
        form.name.trim(),
        form.category.trim(),
        Number(form.costPrice),
        Number(form.sellingPrice),
        Number(form.quantity),
        Number(form.minThreshold),
        updatedAt,
        0,
      ];

      if (isEditing) {
        await db.executeSql(
          `UPDATE products
           SET name = ?,
               category = ?,
               cost_price = ?,
               selling_price = ?,
               quantity = ?,
               min_threshold = ?,
               updated_at = ?,
               synced = 0
           WHERE id = ?;`,
          [
            productValues[1],
            productValues[2],
            productValues[3],
            productValues[4],
            productValues[5],
            productValues[6],
            productValues[7],
            productId,
          ],
        );
      } else {
        await db.executeSql(
          `INSERT INTO products
           (id, name, category, cost_price, selling_price, quantity, min_threshold, updated_at, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          productValues,
        );
      }

      setMessage(
        isEditing
          ? 'Product updated successfully.'
          : 'Product saved successfully.',
      );
      setTimeout(() => {
        navigation.goBack();
      }, 650);
    } catch (error) {
      setErrors({form: 'Unable to save product. Please try again.'});
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async () => {
    try {
      const db = await getDBConnection();
      await db.executeSql('DELETE FROM products WHERE id = ?;', [product.id]);
      setMessage('Product deleted successfully.');
      setTimeout(() => {
        navigation.goBack();
      }, 650);
    } catch (error) {
      setErrors({form: 'Unable to delete product. Please try again.'});
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete product',
      'This product will be removed from local inventory.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: deleteProduct},
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={styles.title}>
          {isEditing ? 'Edit Product' : 'Add Product'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Inventory changes are saved locally first.
        </Text>

        <TextInput
          label="Product name"
          value={form.name}
          onChangeText={value => updateField('name', value)}
          mode="outlined"
          style={styles.input}
          error={Boolean(errors.name)}
        />
        <HelperText type="error" visible={Boolean(errors.name)}>
          {errors.name}
        </HelperText>

        <TextInput
          label="Category"
          value={form.category}
          onChangeText={value => updateField('category', value)}
          mode="outlined"
          style={styles.input}
          error={Boolean(errors.category)}
        />
        <HelperText type="error" visible={Boolean(errors.category)}>
          {errors.category}
        </HelperText>

        <TextInput
          label="Cost price"
          value={form.costPrice}
          onChangeText={value => updateField('costPrice', value)}
          mode="outlined"
          style={styles.input}
          keyboardType="decimal-pad"
          error={Boolean(errors.costPrice)}
        />
        <HelperText type="error" visible={Boolean(errors.costPrice)}>
          {errors.costPrice}
        </HelperText>

        <TextInput
          label="Selling price"
          value={form.sellingPrice}
          onChangeText={value => updateField('sellingPrice', value)}
          mode="outlined"
          style={styles.input}
          keyboardType="decimal-pad"
          error={Boolean(errors.sellingPrice)}
        />
        <HelperText type="error" visible={Boolean(errors.sellingPrice)}>
          {errors.sellingPrice}
        </HelperText>

        <TextInput
          label="Quantity"
          value={form.quantity}
          onChangeText={value => updateField('quantity', value)}
          mode="outlined"
          style={styles.input}
          keyboardType="number-pad"
          error={Boolean(errors.quantity)}
        />
        <HelperText type="error" visible={Boolean(errors.quantity)}>
          {errors.quantity}
        </HelperText>

        <TextInput
          label="Minimum threshold"
          value={form.minThreshold}
          onChangeText={value => updateField('minThreshold', value)}
          mode="outlined"
          style={styles.input}
          keyboardType="number-pad"
          error={Boolean(errors.minThreshold)}
        />
        <HelperText type="error" visible={Boolean(errors.minThreshold)}>
          {errors.minThreshold}
        </HelperText>

        {errors.form ? (
          <Text variant="bodySmall" style={styles.formError}>
            {errors.form}
          </Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          style={styles.primaryButton}>
          Save Product
        </Button>

        {isEditing ? (
          <Button
            mode="outlined"
            onPress={handleDelete}
            textColor={COLORS.danger}
            style={styles.deleteButton}>
            Delete Product
          </Button>
        ) : null}
      </ScrollView>

      <Snackbar
        visible={Boolean(message)}
        onDismiss={() => setMessage('')}
        duration={650}>
        {message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  title: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    marginBottom: 18,
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.surface,
  },
  formError: {
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 8,
    marginTop: 8,
  },
  deleteButton: {
    borderColor: COLORS.danger,
    borderRadius: 8,
    marginTop: 12,
  },
});

export default AddEditProductScreen;
