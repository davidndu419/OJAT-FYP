import NetInfo from '@react-native-community/netinfo';
import {syncToServer} from './syncService';

let unsubscribeNetworkListener = null;
let wasOffline = true;
let isSyncing = false;
let hasInitialNetworkState = false;

const isOnline = state =>
  Boolean(state.isConnected) && state.isInternetReachable !== false;

const runAutoSync = async () => {
  if (isSyncing) {
    return;
  }

  isSyncing = true;
  try {
    const result = await syncToServer();

    if (!result.success) {
      console.log('Automatic sync completed with errors:', result.errors);
    }
  } catch (error) {
    console.log('Automatic sync failed:', error);
  } finally {
    isSyncing = false;
  }
};

export const startNetworkListener = () => {
  if (unsubscribeNetworkListener) {
    return unsubscribeNetworkListener;
  }

  unsubscribeNetworkListener = NetInfo.addEventListener(state => {
    const online = isOnline(state);

    if (!hasInitialNetworkState) {
      hasInitialNetworkState = true;
      wasOffline = !online;
      return;
    }

    if (online && wasOffline) {
      runAutoSync();
    }

    wasOffline = !online;
  });

  return () => {
    if (unsubscribeNetworkListener) {
      unsubscribeNetworkListener();
      unsubscribeNetworkListener = null;
      wasOffline = true;
      isSyncing = false;
      hasInitialNetworkState = false;
    }
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
