import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/AuthScreen/LoginScreen';
import RegisterScreen from '../screens/AuthScreen/RegisterScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LandingScreen from '../screens/LandingScreen';
import {COLORS, FONT_FAMILY} from '../theme/theme';

const Stack = createNativeStackNavigator();

function AuthNavigator({initialRouteName = 'Login'}) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        headerStyle: {backgroundColor: COLORS.background},
        headerShadowVisible: false,
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          color: COLORS.text,
          fontFamily: FONT_FAMILY,
          fontWeight: '700',
        },
      }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default AuthNavigator;
