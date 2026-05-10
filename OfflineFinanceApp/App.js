import React, {useEffect} from 'react';
import {StatusBar, View} from 'react-native';
import {Provider} from 'react-redux';
import {Provider as PaperProvider} from 'react-native-paper';
// Temporarily disabled to fix boot error
// import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {store} from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import {initDatabase} from './src/database/db';
import {startNetworkListener} from './src/services/networkListener';
import {APP_THEME, COLORS} from './src/theme/theme';

// Emergency Fallback: Use standard View if GestureHandler is not linked
const RootContainer = View;

function App() {
  useEffect(() => {
    let stopNetworkListener;

    initDatabase()
      .then(() => {
        stopNetworkListener = startNetworkListener();
      })
      .catch(error => {
        error && console.error('Database initialization failed:', error);
      });

    return () => {
      if (stopNetworkListener) {
        stopNetworkListener();
      }
    };
  }, []);

  return (
    <RootContainer style={{flex: 1}}>
      <Provider store={store}>
        <PaperProvider theme={APP_THEME}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={COLORS.background}
          />
          <AppNavigator />
        </PaperProvider>
      </Provider>
    </RootContainer>
  );
}

export default App;
