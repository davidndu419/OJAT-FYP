import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {Provider} from 'react-redux';
import {Provider as PaperProvider} from 'react-native-paper';
import {store} from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import {initDatabase} from './src/database/db';
import {startNetworkListener} from './src/services/networkListener';
import {APP_THEME, COLORS} from './src/theme/theme';

function App() {
  useEffect(() => {
    let stopNetworkListener;

    initDatabase()
      .then(() => {
        stopNetworkListener = startNetworkListener();
      })
      .catch(error => {
        console.error('Database initialization failed:', error);
      });

    return () => {
      if (stopNetworkListener) {
        stopNetworkListener();
      }
    };
  }, []);

  return (
    <Provider store={store}>
      <PaperProvider theme={APP_THEME}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
        />
        <AppNavigator />
      </PaperProvider>
    </Provider>
  );
}

export default App;
