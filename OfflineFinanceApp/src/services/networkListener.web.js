const buildStatus = () => ({
  isConnected: navigator.onLine,
  isInternetReachable: navigator.onLine,
  isOnline: navigator.onLine,
  type: 'web',
});

export const startNetworkListener = () => {
  return () => {};
};

export const subscribeToNetworkChanges = callback => {
  const handler = () => callback(buildStatus());

  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);

  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
};

export const getCurrentNetworkStatus = async () => buildStatus();
