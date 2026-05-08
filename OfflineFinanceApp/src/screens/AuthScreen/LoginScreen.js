import React, {useEffect, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {useDispatch} from 'react-redux';
import {Button, HelperText, Text, TextInput} from 'react-native-paper';
import Icon from 'react-native-vector-icons/FontAwesome';
import {
  loginFailure,
  loginStart,
  loginSuccess,
} from '../../store/slices/authSlice';
import {GOOGLE_WEB_CLIENT_ID, STORAGE_KEYS} from '../../utils/constants';
import {googleAuth, loginUser} from '../../services/apiService';

GoogleSignin.configure({
  ...(GOOGLE_WEB_CLIENT_ID ? {webClientId: GOOGLE_WEB_CLIENT_ID} : {}),
  offlineAccess: false,
});

const GoogleButtonIcon = () => <Icon name="google" size={18} color="#ffffff" />;

function LoginScreen({navigation, route}) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState(route.params?.registeredEmail || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    dispatch(loginStart());

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await loginUser({
        email: normalizedEmail,
        password,
      });

      if (![200, 201].includes(response.status)) {
        const message = response?.data?.message || 'Invalid email or password.';
        setErrors({form: message});
        dispatch(loginFailure(message));
        Alert.alert('Login failed', message);
        return;
      }

      const token = response?.data?.token;
      const safeUser = response?.data?.user;

      if (!token || !safeUser) {
        const message =
          'Login succeeded but the server did not return login details.';
        setErrors({form: message});
        dispatch(loginFailure(message));
        Alert.alert('Login failed', message);
        return;
      }

      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(safeUser));

      dispatch(loginSuccess({user: safeUser, token}));
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Login failed. Please try again.';

      console.error('[LoginScreen] Login failed:', error);
      setErrors({form: message});
      dispatch(loginFailure(message));
      Alert.alert('Login failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuthSession = async (token, user) => {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    dispatch(loginSuccess({user, token}));
  };

  const getGoogleIdToken = googleResponse =>
    googleResponse?.idToken || googleResponse?.data?.idToken;

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    dispatch(loginStart());
    setErrors(current => ({...current, form: ''}));

    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const googleResponse = await GoogleSignin.signIn();
      const idToken = getGoogleIdToken(googleResponse);

      if (!idToken) {
        const message =
          'Google did not return an idToken. Check GOOGLE_WEB_CLIENT_ID.';
        setErrors({form: message});
        dispatch(loginFailure(message));
        Alert.alert('Google sign-in failed', message);
        return;
      }

      const response = await googleAuth(idToken);

      if (![200, 201].includes(response.status)) {
        const message =
          response?.data?.message || 'Google sign-in failed. Please try again.';
        setErrors({form: message});
        dispatch(loginFailure(message));
        Alert.alert('Google sign-in failed', message);
        return;
      }

      const token = response?.data?.token;
      const user = response?.data?.user;

      if (!token || !user) {
        const message =
          'Google sign-in succeeded but the server did not return login details.';
        setErrors({form: message});
        dispatch(loginFailure(message));
        Alert.alert('Google sign-in failed', message);
        return;
      }

      await saveAuthSession(token, user);
    } catch (error) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        dispatch(loginFailure(null));
        return;
      }

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Google sign-in failed. Please try again.';

      console.error('[LoginScreen] Google sign-in failed:', error);
      setErrors({form: message});
      dispatch(loginFailure(message));
      Alert.alert('Google sign-in failed', message);
    } finally {
      setIsGoogleLoading(false);
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
          disabled={isLoading || isGoogleLoading}
          style={styles.primaryButton}>
          Login
        </Button>

        <Button
          mode="contained"
          icon={GoogleButtonIcon}
          onPress={handleGoogleSignIn}
          loading={isGoogleLoading}
          disabled={isLoading || isGoogleLoading}
          style={styles.googleButton}
          labelStyle={styles.googleButtonLabel}
          contentStyle={styles.googleButtonContent}>
          Sign in with Google
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
  googleButton: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
    backgroundColor: 'rgba(25, 118, 210, 0.42)',
    shadowColor: '#38bdf8',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 5,
  },
  googleButtonContent: {
    height: 48,
  },
  googleButtonLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 18,
  },
});

export default LoginScreen;
