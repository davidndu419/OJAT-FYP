import React, {useCallback, useEffect, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  Snackbar,
  Text,
} from 'react-native-paper';
import {
  getCurrentNetworkStatus,
  subscribeToNetworkChanges,
} from '../services/networkListener';
import {
  getPendingSyncCounts,
  LAST_SUCCESSFUL_SYNC_KEY,
  syncToServer,
} from '../services/syncService';

const emptyCounts = {
  products: 0,
  sales: 0,
  expenses: 0,
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

      if (result.success) {
        setMessage(`Sync complete. ${result.synced} record(s) processed.`);
      } else {
        setMessage(
          `Sync finished with ${result.errors.length} error(s). Unsynced records were kept locally.`,
        );
      }

      await loadSyncInfo();
    } catch (error) {
      console.error('Manual sync failed:', error);
      setMessage('Sync failed. Your offline records are still saved locally.');
    } finally {
      setIsSyncing(false);
    }
  };

  const totalPending =
    pendingCounts.products + pendingCounts.sales + pendingCounts.expenses;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        Sync
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Keep local financial and inventory records aligned with the server.
      </Text>

      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <View>
              <Text variant="labelLarge" style={styles.label}>
                Connectivity
              </Text>
              <Text
                variant="headlineSmall"
                style={[
                  styles.statusText,
                  networkStatus.isOnline
                    ? styles.onlineText
                    : styles.offlineText,
                ]}>
                {networkStatus.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                networkStatus.isOnline
                  ? styles.onlineBadge
                  : styles.offlineBadge,
              ]}>
              <Text
                variant="labelLarge"
                style={[
                  styles.statusBadgeText,
                  networkStatus.isOnline
                    ? styles.onlineBadgeText
                    : styles.offlineBadgeText,
                ]}>
                {networkStatus.type || 'unknown'}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Unsynced Records
            </Text>
            {isLoadingCounts ? (
              <ActivityIndicator size="small" color="#0b6bcb" />
            ) : null}
          </View>

          <View style={styles.countRow}>
            <Text variant="bodyLarge" style={styles.countLabel}>
              Products
            </Text>
            <Text variant="titleMedium" style={styles.countValue}>
              {pendingCounts.products}
            </Text>
          </View>
          <Divider />
          <View style={styles.countRow}>
            <Text variant="bodyLarge" style={styles.countLabel}>
              Sales
            </Text>
            <Text variant="titleMedium" style={styles.countValue}>
              {pendingCounts.sales}
            </Text>
          </View>
          <Divider />
          <View style={styles.countRow}>
            <Text variant="bodyLarge" style={styles.countLabel}>
              Expenses
            </Text>
            <Text variant="titleMedium" style={styles.countValue}>
              {pendingCounts.expenses}
            </Text>
          </View>
          <Divider />
          <View style={styles.totalRow}>
            <Text variant="titleMedium" style={styles.totalLabel}>
              Total pending
            </Text>
            <Text variant="titleMedium" style={styles.totalValue}>
              {totalPending}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.label}>
            Last Successful Sync
          </Text>
          <Text variant="titleMedium" style={styles.lastSyncText}>
            {formatLastSync(lastSync)}
          </Text>

          {!networkStatus.isOnline ? (
            <Text variant="bodySmall" style={styles.offlineHint}>
              Manual sync is available when internet connection is restored.
            </Text>
          ) : null}

          <Button
            mode="contained"
            onPress={handleManualSync}
            loading={isSyncing}
            disabled={!networkStatus.isOnline || isSyncing}
            style={styles.syncButton}>
            Manual Sync
          </Button>
        </Card.Content>
      </Card>

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
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 14,
  },
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#64748b',
    marginBottom: 6,
  },
  statusText: {
    fontWeight: '700',
  },
  onlineText: {
    color: '#047857',
  },
  offlineText: {
    color: '#b42318',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  onlineBadge: {
    backgroundColor: '#ecfdf5',
  },
  offlineBadge: {
    backgroundColor: '#fff1f2',
  },
  statusBadgeText: {
    textTransform: 'capitalize',
  },
  onlineBadgeText: {
    color: '#047857',
  },
  offlineBadgeText: {
    color: '#b42318',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  countRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  countLabel: {
    color: '#334155',
  },
  countValue: {
    color: '#0b6bcb',
    fontWeight: '700',
  },
  totalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  totalLabel: {
    color: '#0f172a',
    fontWeight: '700',
  },
  totalValue: {
    color: '#0f172a',
    fontWeight: '700',
  },
  lastSyncText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  offlineHint: {
    color: '#b45309',
    marginTop: 12,
  },
  syncButton: {
    borderRadius: 6,
    marginTop: 18,
  },
});

export default SyncScreen;
