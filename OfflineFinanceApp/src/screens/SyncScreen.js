import React, {useCallback, useEffect, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CheckCircle2,
  Package,
  ShoppingBag,
  Tags,
  Wallet,
  Wifi,
  Wrench,
} from 'lucide-react-native';
import {ActivityIndicator, Snackbar, Text} from 'react-native-paper';
import {
  getCurrentNetworkStatus,
  subscribeToNetworkChanges,
} from '../services/networkListener';
import {
  getPendingSyncCounts,
  LAST_SUCCESSFUL_SYNC_KEY,
  syncToServer,
} from '../services/syncService';
import {COLORS, FONT_FAMILY} from '../theme/theme';
import {
  IconBubble,
  KoboButton,
  ScreenHeader,
  SurfaceCard,
  type,
} from '../components/KoboUI';

const emptyCounts = {
  products: 0,
  sales: 0,
  expenses: 0,
  services: 0,
  serviceTypes: 0,
};

const syncLabels = {
  products: 'products',
  sales: 'sales',
  expenses: 'expenses',
  services: 'services',
  serviceTypes: 'service types',
};

const formatLastSync = value => {
  if (!value) {
    return 'No successful sync yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No successful sync yet';
  }

  return date.toLocaleString();
};

const getTotalCount = counts =>
  Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);

const formatSyncCounts = synced => {
  const counts = {...emptyCounts, ...(synced || {})};

  return Object.entries(syncLabels)
    .map(([key, label]) => `${label}: ${Number(counts[key] || 0)}`)
    .join(', ');
};

const formatSyncMessage = result => {
  const countSummary = formatSyncCounts(result?.synced);

  if (result?.success) {
    return `Sync complete. ${countSummary}.`;
  }

  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const errorSummary = errors.length > 0 ? ` Errors: ${errors.join(' | ')}` : '';

  return `Sync finished with ${errors.length} error(s). ${countSummary}.${errorSummary}`;
};

function SyncScreen() {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: false,
    type: 'unknown',
  });
  const [pendingCounts, setPendingCounts] = useState(emptyCounts);
  const [lastSync, setLastSync] = useState('');
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const loadSyncInfo = useCallback(async () => {
    setIsLoadingCounts(true);
    try {
      const [counts, storedLastSync] = await Promise.all([
        getPendingSyncCounts(),
        AsyncStorage.getItem(LAST_SUCCESSFUL_SYNC_KEY),
      ]);

      setPendingCounts({
        products: Number(counts.products || 0),
        sales: Number(counts.sales || 0),
        expenses: Number(counts.expenses || 0),
        services: Number(counts.services || 0),
        serviceTypes: Number(counts.serviceTypes || 0),
      });
      setLastSync(storedLastSync || '');
    } catch (error) {
      console.error('Unable to load sync status:', error);
      setPendingCounts(emptyCounts);
      setMessage('Unable to load local sync status.');
    } finally {
      setIsLoadingCounts(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadInitialStatus = async () => {
      try {
        const status = await getCurrentNetworkStatus();

        if (isMounted) {
          setNetworkStatus(status);
        }
      } catch (error) {
        console.error('Unable to read network status:', error);
      }
    };

    loadInitialStatus();
    loadSyncInfo();

    const unsubscribe = subscribeToNetworkChanges(status => {
      setNetworkStatus(status);
    });
    const refreshInterval = setInterval(loadSyncInfo, 30000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [loadSyncInfo]);

  const handleManualSync = async () => {
    if (!networkStatus.isOnline || isSyncing) {
      return;
    }

    setIsSyncing(true);
    setMessage('');

    try {
      const result = await syncToServer();

      setMessage(formatSyncMessage(result));

      await loadSyncInfo();
    } catch (error) {
      console.error('Manual sync failed:', error);
      setMessage('Sync failed. Your offline records are still saved locally.');
    } finally {
      setIsSyncing(false);
    }
  };

  const totalPending = getTotalCount(pendingCounts);
  const rows = [
    {label: 'Products', value: pendingCounts.products, icon: Package},
    {label: 'Sales', value: pendingCounts.sales, icon: ShoppingBag},
    {label: 'Expenses', value: pendingCounts.expenses, icon: Wallet},
    {label: 'Services', value: pendingCounts.services, icon: Wrench},
    {label: 'Service Types', value: pendingCounts.serviceTypes, icon: Tags},
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="Sync"
        title="Cloud Sync"
        subtitle="Keep local records aligned with the server."
      />

      <SurfaceCard style={styles.connectivityCard}>
        <IconBubble
          tone={networkStatus.isOnline ? 'success' : 'danger'}
          size={54}>
          <Wifi
            color={networkStatus.isOnline ? COLORS.success : COLORS.danger}
            size={24}
            strokeWidth={2.4}
          />
        </IconBubble>
        <View style={styles.connectivityText}>
          <Text style={styles.label}>CONNECTIVITY</Text>
          <Text
            style={[
              styles.statusText,
              networkStatus.isOnline ? styles.onlineText : styles.offlineText,
            ]}>
            {networkStatus.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        <View style={styles.webBadge}>
          <Text style={styles.webBadgeText}>{networkStatus.type || 'Web'}</Text>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Unsynced Records</Text>
          {isLoadingCounts ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : null}
        </View>

        {rows.map(item => {
          const RowIcon = item.icon;
          const pending = item.value > 0;
          return (
            <View key={item.label} style={styles.countRow}>
              <IconBubble tone={pending ? 'warning' : 'muted'} size={42}>
                <RowIcon
                  color={pending ? COLORS.warning : COLORS.muted}
                  size={19}
                  strokeWidth={2.4}
                />
              </IconBubble>
              <Text style={styles.countLabel}>{item.label}</Text>
              <Text style={[styles.countValue, type.number]}>{item.value}</Text>
            </View>
          );
        })}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total pending</Text>
          <View style={styles.totalPill}>
            <Text style={[styles.totalValue, type.number]}>{totalPending}</Text>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <View style={styles.lastSyncHeader}>
          <IconBubble tone="success" size={46}>
            <CheckCircle2 color={COLORS.success} size={21} strokeWidth={2.4} />
          </IconBubble>
          <View style={styles.lastSyncTextWrap}>
            <Text style={styles.label}>LAST SYNC</Text>
            <Text style={styles.lastSyncText}>{formatLastSync(lastSync)}</Text>
          </View>
        </View>

        {!networkStatus.isOnline ? (
          <Text style={styles.offlineHint}>
            Manual sync is available when internet connection is restored.
          </Text>
        ) : null}

        <KoboButton
          onPress={handleManualSync}
          loading={isSyncing}
          disabled={!networkStatus.isOnline || isSyncing}
          style={styles.syncButton}>
          Manual Sync
        </KoboButton>
      </SurfaceCard>

      <Snackbar
        visible={Boolean(message)}
        onDismiss={() => setMessage('')}
        duration={3200}>
        {message}
      </Snackbar>
    </ScrollView>
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
  connectivityCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  connectivityText: {
    flex: 1,
  },
  label: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  statusText: {
    fontFamily: FONT_FAMILY,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  onlineText: {
    color: COLORS.success,
  },
  offlineText: {
    color: COLORS.danger,
  },
  webBadge: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  webBadgeText: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  card: {
    marginTop: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
  },
  countRow: {
    alignItems: 'center',
    borderTopColor: COLORS.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
  },
  countLabel: {
    color: COLORS.text,
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  countValue: {
    color: COLORS.primary,
    fontSize: 18,
  },
  totalRow: {
    alignItems: 'center',
    borderTopColor: COLORS.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  totalLabel: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  totalPill: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  totalValue: {
    color: COLORS.primaryForeground,
    fontSize: 14,
  },
  lastSyncHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  lastSyncTextWrap: {
    flex: 1,
  },
  lastSyncText: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
  },
  offlineHint: {
    color: COLORS.warning,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
  },
  syncButton: {
    marginTop: 18,
  },
});

export default SyncScreen;
