import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import AuthNavigator from './AuthNavigator';
import DashboardScreen from '../screens/DashboardScreen';
import InventoryScreen from '../screens/InventoryScreen';
import AddEditProductScreen from '../screens/AddEditProductScreen';
import SalesScreen from '../screens/SalesScreen';
import ExpenseScreen from '../screens/ExpenseScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SyncScreen from '../screens/SyncScreen';
import {STORAGE_KEYS} from '../utils/constants';
import {loginSuccess} from '../store/slices/authSlice';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function InventoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="InventoryList"
        component={InventoryScreen}
        options={{title: 'Inventory'}}
      />
      <Stack.Screen
        name="AddEditProduct"
        component={AddEditProductScreen}
        options={{title: 'Add/Edit Product'}}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#0b6bcb',
        tabBarInactiveTintColor: '#64748b',
      }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen
        name="Inventory"
        component={InventoryStack}
        options={{headerShown: false}}
      />
      <Tab.Screen name="Sales" component={SalesScreen} />
      <Tab.Screen name="Expenses" component={ExpenseScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Sync" component={SyncScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);

  useEffect(() => {
    const checkAuthToken = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);

        if (token) {
          dispatch(
            loginSuccess({
              token,
              user: storedUser ? JSON.parse(storedUser) : null,
            }),
          );
        }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthToken();
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0b6bcb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f9fb',
  },
});

export default AppNavigator;
