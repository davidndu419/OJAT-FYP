import NetInfo from '@react-native-community/netinfo';
import {AppState} from 'react-native';
import {syncInBackground} from './syncService';

let unsubscribeNetworkListener = null;
let wasOffline = true;
let hasInitialNetworkState = false;
let appStateSubscription = null;
let syncInterval = null;
const HEARTBEAT_SYNC_MS = 600000; // 10 minutes

const isOnline = state =>
  Boolean(state.isConnected) && state.isInternetReachable !== false;

export const startNetworkListener = () => {
  if (unsubscribeNetworkListener) {
    return;
  }

  // Initial Sync Check
  syncInBackground();

  // Network State Listener
  unsubscribeNetworkListener = NetInfo.addEventListener(state => {
    const online = isOnline(state);

    if (!hasInitialNetworkState) {
      hasInitialNetworkState = true;
      wasOffline = !online;
      return;
    }

    if (online && wasOffline) {
      console.log('[NetworkListener] Online detected, syncing...');
      syncInBackground();
    }

    wasOffline = !online;
  });

  // App State Listener (Sync when returning to app)
  appStateSubscription = AppState.addEventListener('change', nextAppState => {
    if (nextAppState === 'active') {
      console.log('[NetworkListener] App focused, checking sync...');
      syncInBackground();
    }
  });

  // Periodic Heartbeat Sync
  syncInterval = setInterval(() => {
    console.log('[NetworkListener] Heartbeat sync triggered');
    syncInBackground();
  }, HEARTBEAT_SYNC_MS);

  return () => {
    if (unsubscribeNetworkListener) {
      unsubscribeNetworkListener();
      unsubscribeNetworkListener = null;
    }
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
    wasOffline = true;
    hasInitialNetworkState = false;
  };
};

export const subscribeToNetworkChanges = callback => {
  return NetInfo.addEventListener(state => {
    callback({
      isConnected: Boolean(state.isConnected),
      isInternetReachable: state.isInternetReachable !== false,
      isOnline: isOnline(state),
      type: state.type,
    });
  });
};

export const getCurrentNetworkStatus = async () => {
  const state = await NetInfo.fetch();

  return {
    isConnected: Boolean(state.isConnected),
    isInternetReachable: state.isInternetReachable !== false,
    isOnline: isOnline(state),
    type: state.type,
  };
};
