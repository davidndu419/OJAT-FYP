import React, {useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDispatch} from 'react-redux';
import {Button, HelperText, Text, TextInput} from 'react-native-paper';
import {
  loginFailure,
  loginStart,
  loginSuccess,
} from '../../store/slices/authSlice';
import {generateId} from '../../utils/helpers';
import {STORAGE_KEYS} from '../../utils/constants';

const LOCAL_USERS_KEY = 'registered_users';

function LoginScreen({navigation, route}) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState(route.params?.registeredEmail || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (route.params?.registeredEmail) {
      setEmail(route.params.registeredEmail);
    }
  }, [route.params?.registeredEmail]);

  const validateForm = () => {
    const nextErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!emailPattern.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const getRegisteredUsers = async () => {
    const storedUsers = await AsyncStorage.getItem(LOCAL_USERS_KEY);
    return storedUsers ? JSON.parse(storedUsers) : [];
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    dispatch(loginStart());

    try {
      const users = await getRegisteredUsers();
      const normalizedEmail = email.trim().toLowerCase();
      const user = users.find(
        account =>
          account.email === normalizedEmail && account.password === password,
      );

      if (!user) {
        const message = 'Invalid email or password.';
        setErrors({form: message});
        dispatch(loginFailure(message));
        return;
      }

      const token = `offline-token-${generateId()}`;
      const safeUser = {
        fullName: user.fullName,
        email: user.email,
      };

      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(safeUser));

      dispatch(loginSuccess({user: safeUser, token}));
    } catch (error) {
      const message = 'Login failed. Please try again.';
      setErrors({form: message});
      dispatch(loginFailure(message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text variant="headlineMedium" style={styles.title}>
          Welcome Back
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Sign in to continue managing sales, expenses, and inventory offline.
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={value => {
            setEmail(value);
            setErrors(current => ({...current, email: '', form: ''}));
          }}
          mode="outlined"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          error={Boolean(errors.email)}
        />
        <HelperText type="error" visible={Boolean(errors.email)}>
          {errors.email}
        </HelperText>

        <TextInput
          label="Password"
          value={password}
          onChangeText={value => {
            setPassword(value);
            setErrors(current => ({...current, password: '', form: ''}));
          }}
          mode="outlined"
          style={styles.input}
          secureTextEntry
          error={Boolean(errors.password)}
        />
        <HelperText type="error" visible={Boolean(errors.password)}>
          {errors.password}
        </HelperText>

        {errors.form ? (
          <Text variant="bodySmall" style={styles.formError}>
            {errors.form}
          </Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
          style={styles.primaryButton}>
          Login
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">New user?</Text>
          <Button mode="text" onPress={() => navigation.navigate('Register')}>
            Create an account
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fb',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  formError: {
    color: '#b42318',
    marginBottom: 12,
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 6,
  },
  footer: {
    alignItems: 'center',
    marginTop: 18,
  },
});

export default LoginScreen;
