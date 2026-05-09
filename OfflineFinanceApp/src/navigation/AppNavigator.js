import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import {
  BarChart3,
  LayoutGrid,
  Package,
  RefreshCw,
  Settings,
  ShoppingBag,
  Wallet,
} from 'lucide-react-native';
import AuthNavigator from './AuthNavigator';
import DashboardScreen from '../screens/DashboardScreen';
import InventoryScreen from '../screens/InventoryScreen';
import AddEditProductScreen from '../screens/AddEditProductScreen';
import SalesScreen from '../screens/SalesScreen';
import ExpenseScreen from '../screens/ExpenseScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SyncScreen from '../screens/SyncScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';
import {STORAGE_KEYS} from '../utils/constants';
import {loginSuccess} from '../store/slices/authSlice';
import {COLORS, FONT_FAMILY, glowShadow, softShadow} from '../theme/theme';
import {gradientStyle} from '../components/KoboUI';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const renderKoboTabBar = props => <KoboTabBar {...props} />;

function InventoryStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="InventoryList"
        component={InventoryScreen}
        options={{title: 'Inventory'}}
      />
      <Stack.Screen
        name="AddEditProduct"
        component={AddEditProductScreen}
        options={{
          headerShown: true,
          title: 'Product',
          headerStyle: {backgroundColor: COLORS.background},
          headerShadowVisible: false,
          headerTintColor: COLORS.primary,
          headerTitleStyle: styles.headerTitle,
        }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      tabBar={renderKoboTabBar}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryStack}
        options={{tabBarLabel: 'Stock'}}
      />
      <Tab.Screen name="Sales" component={SalesScreen} />
      <Tab.Screen
        name="Expenses"
        component={ExpenseScreen}
        options={{tabBarLabel: 'Spend'}}
      />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Sync" component={SyncScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const getTabIcon = routeName => {
  const icons = {
    Dashboard: LayoutGrid,
    Inventory: Package,
    Sales: ShoppingBag,
    Expenses: Wallet,
    Reports: BarChart3,
    Sync: RefreshCw,
    Settings,
  };

  return icons[routeName] || LayoutGrid;
};

const stackScreenOptions = {
  headerShown: false,
};

function KoboTabBar({state, descriptors, navigation}) {
  return (
    <View pointerEvents="box-none" style={styles.tabBarWrap}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const options = descriptors[route.key].options;
          const label = options.tabBarLabel || options.title || route.name;
          const Icon = getTabIcon(route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <View key={route.key} style={styles.tabItem}>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={onPress}
                style={styles.tabButton}>
                <View
                  style={[
                    styles.activeTab,
                    isFocused && styles.activeTabOn,
                    isFocused && gradientStyle('primary'),
                  ]}>
                  <Icon
                    color={isFocused ? COLORS.primaryForeground : COLORS.muted}
                    fill={isFocused ? 'currentColor' : 'none'}
                    fillOpacity={isFocused ? 0.2 : 0}
                    size={21}
                    strokeWidth={2.4}
                  />
                </View>
                <View
                  style={[styles.activeDot, isFocused && styles.activeDotOn]}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function AppNavigator() {
  const [appState, setAppState] = useState({ isLoading: true, isOnboardingComplete: null });
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);

  useEffect(() => {
    const checkAuthToken = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        const onboardingStatus = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);

        if (token) {
          dispatch(
            loginSuccess({
              token,
              user: storedUser ? JSON.parse(storedUser) : null,
            }),
          );
        }

        setAppState({
          isLoading: false,
          isOnboardingComplete: onboardingStatus === 'true'
        });
      } catch (error) {
        setAppState({ isLoading: false, isOnboardingComplete: null });
      }
    };

    checkAuthToken();
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE).then(status => {
        setAppState(prev => ({ ...prev, isOnboardingComplete: status === 'true' }));
      });
    }
  }, [isAuthenticated]);

  if (appState.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Stack.Navigator screenOptions={stackScreenOptions}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="TransactionHistory"
            component={TransactionHistoryScreen}
          />
        </Stack.Navigator>
      ) : (
        <AuthNavigator initialRouteName={appState.isOnboardingComplete ? 'Landing' : 'Onboarding'} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
  },
  tabBarWrap: {
    alignItems: 'center',
    bottom: 14,
    left: 0,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 0,
  },
  tabBar: {
    ...softShadow,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    height: 76,
    justifyContent: 'space-between',
    maxWidth: 448,
    paddingHorizontal: 8,
    width: '100%',
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
  },
  tabButton: {
    alignItems: 'center',
    minHeight: 66,
    justifyContent: 'center',
    width: '100%',
  },
  activeTab: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  activeTabOn: {
    ...glowShadow,
  },
  activeDot: {
    backgroundColor: 'transparent',
    borderRadius: 2,
    height: 4,
    marginTop: 4,
    width: 4,
  },
  activeDotOn: {
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
});

export default AppNavigator;
