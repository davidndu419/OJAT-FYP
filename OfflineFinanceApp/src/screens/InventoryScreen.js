import React, {useCallback, useMemo, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Text} from 'react-native-paper';
import {getDBConnection} from '../database/db';
import {formatCurrency, getRowsArray} from '../utils/helpers';

function InventoryScreen({navigation}) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    }, [loadProducts]),
  );

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter(product =>
      product.name.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  const navigateToProductForm = product => {
    navigation.navigate('AddEditProduct', product ? {product} : undefined);
  };

  const renderProduct = ({item}) => {
    const isLowStock =
      Number(item.quantity || 0) < Number(item.min_threshold || 0);

    return (
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => navigateToProductForm(item)}
        style={[styles.productRow, isLowStock && styles.lowStockRow]}>
        <View style={styles.productContent}>
          <View style={styles.productDetails}>
            <Text
              variant="titleMedium"
              style={[styles.productTitle, isLowStock && styles.lowStockText]}>
              {item.name}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.productDescription,
                isLowStock && styles.lowStockText,
              ]}>
              {item.category || 'Uncategorized'} | Qty: {item.quantity} |{' '}
              {formatCurrency(item.selling_price)}
            </Text>
          </View>

          <Text
            variant="titleMedium"
            style={[styles.chevronText, isLowStock && styles.lowStockText]}>
            &gt;
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TextInput
          placeholder="Search products"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          placeholderTextColor="#94a3b8"
        />

        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          refreshing={isLoading}
          onRefresh={loadProducts}
          contentContainerStyle={[
            styles.listContent,
            filteredProducts.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <Text variant="bodyLarge" style={styles.emptyText}>
              No products found.
            </Text>
          }
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.addButton}
        onPress={() => navigateToProductForm()}>
        <Text variant="headlineSmall" style={styles.addButtonSymbol}>
          +
        </Text>
        <Text variant="labelLarge" style={styles.addButtonText}>
          Product
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fb',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderColor: '#d8e0ea',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  listContent: {
    paddingBottom: 96,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  productRow: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  productContent: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productDetails: {
    flex: 1,
    paddingRight: 12,
  },
  lowStockRow: {
    backgroundColor: '#fff1f2',
    borderColor: '#fda4af',
    borderWidth: 1,
  },
  productTitle: {
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 4,
  },
  productDescription: {
    color: '#64748b',
  },
  chevronText: {
    color: '#94a3b8',
    fontWeight: '700',
  },
  lowStockText: {
    color: '#b42318',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#0b6bcb',
    borderRadius: 28,
    bottom: 24,
    elevation: 4,
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: 18,
    position: 'absolute',
    right: 20,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.22,
    shadowRadius: 5,
  },
  addButtonSymbol: {
    color: '#ffffff',
    fontWeight: '700',
    marginRight: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default InventoryScreen;
