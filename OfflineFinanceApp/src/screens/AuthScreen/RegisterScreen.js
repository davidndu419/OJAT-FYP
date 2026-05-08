import React, {useState} from 'react';
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
import {
  Button,
  HelperText,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/FontAwesome';
import {googleAuth, registerUser} from '../../services/apiService';
import {loginSuccess} from '../../store/slices/authSlice';
import {GOOGLE_WEB_CLIENT_ID, STORAGE_KEYS} from '../../utils/constants';

const LOCAL_USERS_KEY = 'registered_users';

GoogleSignin.configure({
  ...(GOOGLE_WEB_CLIENT_ID ? {webClientId: GOOGLE_WEB_CLIENT_ID} : {}),
  offlineAccess: false,
});

const GoogleButtonIcon = () => <Icon name="google" size={18} color="#ffffff" />;

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function RegisterScreen({navigation}) {
  const dispatch = useDispatch();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const updateField = (field, value) => {
    setForm(current => ({...current, [field]: value}));
    setErrors(current => ({...current, [field]: ''}));
  };

  const validateForm = () => {
    const nextErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!emailPattern.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.';
    } else if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your password.';
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords must match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const getRegisteredUsers = async () => {
    const storedUsers = await AsyncStorage.getItem(LOCAL_USERS_KEY);
    return storedUsers ? JSON.parse(storedUsers) : [];
  };

  const saveAuthSession = async (token, user) => {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    dispatch(loginSuccess({user, token}));
  };

  const getGoogleIdToken = googleResponse =>
    googleResponse?.idToken || googleResponse?.data?.idToken;

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const normalizedEmail = form.email.trim().toLowerCase();
      const response = await registerUser({
        name: form.fullName.trim(),
        email: normalizedEmail,
        password: form.password,
      });

      if (![200, 201].includes(response.status)) {
        const message =
          response?.data?.message || 'Registration failed. Please try again.';
        Alert.alert('Registration failed', message);
        setErrors({form: message});
        return;
      }

      const token = response?.data?.token;
      const serverUser = response?.data?.user;

      if (!token || !serverUser) {
        const message =
          'Registration succeeded but the server did not return login details.';
        Alert.alert('Registration failed', message);
        setErrors({form: message});
        return;
      }

      const users = await getRegisteredUsers();
      const emailExists = users.some(user => user.email === normalizedEmail);

      const nextUsers = emailExists
        ? users
        : [
            ...users,
            {
              fullName: form.fullName.trim(),
              email: normalizedEmail,
            },
          ];

      await AsyncStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(nextUsers));

      await saveAuthSession(token, serverUser);
      setSuccessVisible(true);
      setForm(initialForm);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Registration failed. Please try again.';

      console.error('[RegisterScreen] Registration failed:', error);
      Alert.alert('Registration failed', message);
      setErrors({form: message});
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
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
        Alert.alert('Google sign-in failed', message);
        setErrors({form: message});
        return;
      }

      const response = await googleAuth(idToken);

      if (![200, 201].includes(response.status)) {
        const message =
          response?.data?.message || 'Google sign-in failed. Please try again.';
        Alert.alert('Google sign-in failed', message);
        setErrors({form: message});
        return;
      }

      const token = response?.data?.token;
      const user = response?.data?.user;

      if (!token || !user) {
        const message =
          'Google sign-in succeeded but the server did not return login details.';
        Alert.alert('Google sign-in failed', message);
        setErrors({form: message});
        return;
      }

      await saveAuthSession(token, user);
      setSuccessVisible(true);
    } catch (error) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Google sign-in failed. Please try again.';

      console.error('[RegisterScreen] Google sign-in failed:', error);
      Alert.alert('Google sign-in failed', message);
      setErrors({form: message});
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
          Create Account
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Register your offline finance and inventory workspace.
        </Text>

        <TextInput
          label="Full name"
          value={form.fullName}
          onChangeText={value => updateField('fullName', value)}
          mode="outlined"
          style={styles.input}
          error={Boolean(errors.fullName)}
        />
        <HelperText type="error" visible={Boolean(errors.fullName)}>
          {errors.fullName}
        </HelperText>

        <TextInput
          label="Email"
          value={form.email}
          onChangeText={value => updateField('email', value)}
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
          value={form.password}
          onChangeText={value => updateField('password', value)}
          mode="outlined"
          style={styles.input}
          secureTextEntry
          error={Boolean(errors.password)}
        />
        <HelperText type="error" visible={Boolean(errors.password)}>
          {errors.password}
        </HelperText>

        <TextInput
          label="Confirm password"
          value={form.confirmPassword}
          onChangeText={value => updateField('confirmPassword', value)}
          mode="outlined"
          style={styles.input}
          secureTextEntry
          error={Boolean(errors.confirmPassword)}
        />
        <HelperText type="error" visible={Boolean(errors.confirmPassword)}>
          {errors.confirmPassword}
        </HelperText>

        {errors.form ? (
          <Text variant="bodySmall" style={styles.formError}>
            {errors.form}
          </Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={isSaving}
          disabled={isSaving || isGoogleLoading}
          style={styles.primaryButton}>
          Register
        </Button>

        <Button
          mode="contained"
          icon={GoogleButtonIcon}
          onPress={handleGoogleSignIn}
          loading={isGoogleLoading}
          disabled={isSaving || isGoogleLoading}
          style={styles.googleButton}
          labelStyle={styles.googleButtonLabel}
          contentStyle={styles.googleButtonContent}>
          Sign in with Google
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">Already have an account?</Text>
          <Button mode="text" onPress={() => navigation.navigate('Login')}>
            Login
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={700}>
        Registration successful.
      </Snackbar>
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

export default RegisterScreen;
