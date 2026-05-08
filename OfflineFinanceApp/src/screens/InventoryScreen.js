import React, {useCallback, useMemo, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {ChevronRight, Package, Search} from 'lucide-react-native';
import {Text} from 'react-native-paper';
import {getDBConnection} from '../database/db';
import {formatCurrency, getRowsArray} from '../utils/helpers';
import {COLORS, FONT_FAMILY} from '../theme/theme';
import {IconBubble, ScreenHeader, SurfaceCard, gradientStyle, type} from '../components/KoboUI';

function InventoryScreen({navigation}) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
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

  const counts = useMemo(() => {
    const low = products.filter(
      item => Number(item.quantity || 0) < Number(item.min_threshold || 0),
    ).length;

    return {all: products.length, low, ok: products.length - low};
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter(product => {
      const isLow =
        Number(product.quantity || 0) < Number(product.min_threshold || 0);
      const matchesFilter =
        filter === 'all' || (filter === 'low' ? isLow : !isLow);
      const matchesSearch =
        !query || String(product.name || '').toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [filter, products, searchQuery]);

  const navigateToProductForm = product => {
    navigation.navigate('AddEditProduct', product ? {product} : undefined);
  };

  const filters = [
    {key: 'all', label: 'All', count: counts.all},
    {key: 'low', label: 'Low', count: counts.low},
    {key: 'ok', label: 'OK', count: counts.ok},
  ];

  const renderProduct = ({item}) => {
    const isLowStock =
      Number(item.quantity || 0) < Number(item.min_threshold || 0);

    return (
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => navigateToProductForm(item)}>
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
                style={[
                  styles.filterPill,
                  active && gradientStyle('primary'),
                ]}>
                <Text style={[styles.filterText, active && styles.filterTextOn]}>
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

      <TouchableOpacity
        activeOpacity={0.86}
        style={[styles.addButton, gradientStyle('primary')]}
        onPress={() => navigateToProductForm()}>
        <Text style={styles.addButtonText}>+ Product</Text>
      </TouchableOpacity>
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
    paddingBottom: 124,
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
});

export default InventoryScreen;
