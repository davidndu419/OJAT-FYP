import React, {useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {useDispatch} from 'react-redux';
import {
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react-native';
import Svg, {Path} from 'react-native-svg';
import {Text} from 'react-native-paper';
import {LuminousStatus} from '../../components/LuminousStatus';
import {googleAuth, registerUser} from '../../services/apiService';
import {clearDatabase} from '../../database/db';
import {loginSuccess} from '../../store/slices/authSlice';
import {GOOGLE_WEB_CLIENT_ID, STORAGE_KEYS} from '../../utils/constants';
import {COLORS, FONT_FAMILY} from '../../theme/theme';
import {HeroCard, IconBubble, SurfaceCard, gradientStyle} from '../../components/KoboUI';

const LOCAL_USERS_KEY = 'registered_users';

GoogleSignin.configure({
  ...(GOOGLE_WEB_CLIENT_ID ? {webClientId: GOOGLE_WEB_CLIENT_ID} : {}),
  offlineAccess: false,
});

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

function RegisterScreen({navigation}) {
  const dispatch = useDispatch();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const updateField = (field, value) => {
    setForm(current => ({...current, [field]: value}));
    setErrors(current => ({...current, [field]: '', form: ''}));
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
    // Clear any leftover data from previous sessions
    try {
      await clearDatabase();
    } catch (dbError) {
      console.error('[RegisterScreen] Failed to clear database:', dbError);
    }

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

      if (Platform.OS === 'web') {
        const token = `web-preview-token-${Date.now()}`;
        const serverUser = {
          id: normalizedEmail,
          name: form.fullName.trim(),
          email: normalizedEmail,
        };
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
        return;
      }

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
        <View style={styles.brandRow}>
          <Image 
            source={require('../../assets/images/app_icon.png')} 
            style={{width: 42, height: 42}} 
            resizeMode="contain" 
          />
          <Text style={styles.wordmark}>OJAT</Text>
        </View>

        <HeroCard style={styles.hero}>
          <Text style={styles.heroEyebrow}>GET STARTED</Text>
          <Text style={styles.heroTitle}>Create your workspace</Text>
          <Text style={styles.heroSubtitle}>
            Start tracking stock, sales, expenses, and profit from one vibrant offline desk with OJAT.
          </Text>
        </HeroCard>

        <SurfaceCard style={styles.formCard}>
          <FloatField
            label="Full name"
            icon={User}
            value={form.fullName}
            onChangeText={value => updateField('fullName', value)}
            error={errors.fullName}
          />
          <FloatField
            label="Email"
            icon={Mail}
            value={form.email}
            onChangeText={value => updateField('email', value)}
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.email}
          />
          <FloatField
            label="Password"
            icon={Lock}
            value={form.password}
            onChangeText={value => updateField('password', value)}
            secureTextEntry
            error={errors.password}
          />
          <FloatField
            label="Confirm password"
            icon={ShieldCheck}
            value={form.confirmPassword}
            onChangeText={value => updateField('confirmPassword', value)}
            secureTextEntry
            error={errors.confirmPassword}
          />

          {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleRegister}
            disabled={isSaving || isGoogleLoading}
            style={[styles.primaryButton, gradientStyle('primary')]}>
            <Text style={styles.primaryButtonText}>
              {isSaving ? 'Creating...' : 'Create account'}
            </Text>
            <ArrowRight color={COLORS.primaryForeground} size={19} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={handleGoogleSignIn}
            disabled={isSaving || isGoogleLoading}
            style={styles.googleButton}>
            <GoogleG />
            <Text style={styles.googleButtonText}>
              {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            By creating an account, you agree to keep your workspace records accurate.
          </Text>
        </SurfaceCard>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LuminousStatus
        visible={successVisible}
        message="Registration successful."
        onDismiss={() => setSuccessVisible(false)}
        type="success"
      />
    </KeyboardAvoidingView>
  );
}

function FloatField({label, icon: FieldIcon, error, ...inputProps}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        <FieldIcon color={COLORS.muted} size={19} style={styles.inputIcon} />
        <TextInput
          {...inputProps}
          placeholder={label}
          placeholderTextColor={COLORS.muted}
          style={styles.input}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 448,
    padding: 20,
    width: '100%',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  wordmark: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  hero: {
    marginBottom: 16,
  },
  heroEyebrow: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 9,
  },
  heroSubtitle: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    lineHeight: 21,
    marginTop: 6,
    opacity: 0.82,
  },
  formCard: {
    gap: 12,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inputWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputIcon: {
    marginLeft: 15,
  },
  input: {
    color: COLORS.text,
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
  },
  formError: {
    color: COLORS.danger,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonText: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
  },
  googleButtonText: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  terms: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
  },
  footerLink: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
});

export default RegisterScreen;
